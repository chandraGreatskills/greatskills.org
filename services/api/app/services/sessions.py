"""Signed-in sessions carried in cookies.

Three cookies:
- gs_access: short-lived signed token naming the session. httpOnly, so page
  scripts (including any injected ones) can't read it.
- gs_refresh: random string that renews the access token. httpOnly, and only
  sent to /api/v1/auth, so it never travels with ordinary requests.
- gs_csrf: random string the portal copies into an X-CSRF-Token header on
  every change. Another site can make the browser send our cookies but can't
  read this one, so it can't forge the header (the double-submit pattern).

Before this, tokens sat in localStorage where any script on the page could
read them, and a copied refresh token worked for 30 days with no way to stop
it.
"""

from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.abuse import client_ip
from app.core.config import settings
from app.core.security import create_access_token, new_secret, sha256
from app.models.session import AuthSession

ACCESS_COOKIE = "gs_access"
REFRESH_COOKIE = "gs_refresh"
CSRF_COOKIE = "gs_csrf"
CSRF_HEADER = "x-csrf-token"
REFRESH_PATH = f"{settings.api_v1_prefix}/auth"

# Two tabs that both notice an expired token will both refresh with the same
# token. The second one inside this window is a race, not a theft.
REUSE_GRACE = timedelta(seconds=30)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    # SQLite hands back naive datetimes; treat them as UTC.
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _cookie(response: Response, name: str, value: str, max_age: int, path: str, http_only: bool) -> None:
    response.set_cookie(
        name, value, max_age=max_age, path=path, httponly=http_only,
        secure=not settings.is_dev, samesite="lax",
    )


def _set_access(response: Response, session: AuthSession) -> None:
    token = create_access_token(str(session.user_id), str(session.id))
    _cookie(response, ACCESS_COOKIE, token, settings.access_token_ttl_min * 60, "/", True)


def _set_refresh(response: Response, refresh: str) -> None:
    age = settings.refresh_token_ttl_days * 86400
    _cookie(response, REFRESH_COOKIE, refresh, age, REFRESH_PATH, True)
    _cookie(response, CSRF_COOKIE, new_secret(), age, "/", False)


def clear_cookies(response: Response) -> None:
    for name, path in ((ACCESS_COOKIE, "/"), (REFRESH_COOKIE, REFRESH_PATH), (CSRF_COOKIE, "/")):
        response.delete_cookie(name, path=path, secure=not settings.is_dev, samesite="lax")


def _expiry(created: datetime) -> datetime:
    return min(
        _now() + timedelta(days=settings.refresh_token_ttl_days),
        created + timedelta(days=settings.session_max_days),
    )


async def start(db: AsyncSession, user_id: UUID, request: Request, response: Response) -> AuthSession:
    """Open a session for a member who just proved who they are."""
    # Housekeeping: drop this member's sessions that ended over a month ago.
    cutoff = _now() - timedelta(days=30)
    await db.execute(
        delete(AuthSession).where(
            AuthSession.user_id == user_id,
            or_(AuthSession.expires_at < cutoff, AuthSession.revoked_at < cutoff),
        )
    )
    refresh = new_secret()
    now = _now()
    session = AuthSession(
        user_id=user_id,
        refresh_hash=sha256(refresh),
        expires_at=_expiry(now),
        last_seen_at=now,
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
        ip=client_ip(request),
    )
    session.created_at = now
    db.add(session)
    await db.flush()
    _set_access(response, session)
    _set_refresh(response, refresh)
    return session


async def renew(db: AsyncSession, request: Request, response: Response) -> AuthSession:
    """Swap the refresh cookie for a new access token and a new refresh token."""
    check_csrf(request)
    refresh = request.cookies.get(REFRESH_COOKIE)
    if not refresh:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    h = sha256(refresh)
    now = _now()

    session = await db.scalar(select(AuthSession).where(AuthSession.refresh_hash == h))
    if session is None:
        old = await db.scalar(select(AuthSession).where(AuthSession.prev_refresh_hash == h))
        if old is not None and old.revoked_at is None:
            rotated = _aware(old.rotated_at)
            if rotated and now - rotated <= REUSE_GRACE and _aware(old.expires_at) > now:
                # Lost a race with another tab: give this tab a fresh access
                # token and leave the newer refresh cookie the browser holds.
                _set_access(response, old)
                return old
            # An old token came back after it was replaced: someone has a copy.
            old.revoked_at, old.revoke_reason = now, "reuse"
            await db.commit()
        clear_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session ended. Sign in again.")

    if session.revoked_at is not None or _aware(session.expires_at) <= now:
        clear_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session ended. Sign in again.")

    new = new_secret()
    session.prev_refresh_hash = session.refresh_hash
    session.refresh_hash = sha256(new)
    session.rotated_at = now
    session.last_seen_at = now
    session.expires_at = _expiry(_aware(session.created_at) or now)
    _set_access(response, session)
    _set_refresh(response, new)
    return session


async def live_session(db: AsyncSession, session_id: UUID, user_id: UUID) -> AuthSession | None:
    s = await db.get(AuthSession, session_id)
    if s is None or s.user_id != user_id or s.revoked_at is not None:
        return None
    if _aware(s.expires_at) <= _now():
        return None
    return s


async def revoke(db: AsyncSession, session_id: UUID, reason: str) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.id == session_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=_now(), revoke_reason=reason)
    )


async def revoke_all(db: AsyncSession, user_id: UUID, reason: str, keep: UUID | None = None) -> None:
    stmt = update(AuthSession).where(
        AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)
    )
    if keep is not None:
        stmt = stmt.where(AuthSession.id != keep)
    await db.execute(stmt.values(revoked_at=_now(), revoke_reason=reason))


def check_csrf(request: Request) -> None:
    """Reject a cookie-authenticated change that didn't come from our pages."""
    if request.method in SAFE_METHODS:
        return
    cookie = request.cookies.get(CSRF_COOKIE) or ""
    header = request.headers.get(CSRF_HEADER) or ""
    if not cookie or not hmac.compare_digest(cookie, header):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Request blocked. Reload the page and try again.")
