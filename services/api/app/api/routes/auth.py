import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.api.abuse import client_ip, over_limit
from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.security import (
    VERIFY,
    burn_password_check,
    create_verify_token,
    decode_token,
    email_fingerprint,
    hash_password,
    new_secret,
    password_problem,
    sha256,
    verify_password,
)
from app.db.base import SessionLocal
from app.models.profile import Profile
from app.models.session import AuthSession, PasswordReset
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    SessionOut,
    VerifyEmailIn,
)
from app.schemas.user import MeOut
from app.services import sessions
from app.services.email import (
    send_password_changed_email,
    send_password_reset_email,
    send_verification_email,
)
from app.utils import unique_handle

logger = logging.getLogger("greatskills.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


async def _send_verification(user: User, full_name: str | None = None) -> None:
    # Callers have already committed, so a mail failure must not fail the request.
    try:
        await send_verification_email(
            user.email, create_verify_token(str(user.id), user.email), full_name
        )
    except Exception:
        logger.exception("Verification email failed for user %s", user.id)


async def _send_changed(email: str, name: str | None) -> None:
    try:
        await send_password_changed_email(email, name)
    except Exception:
        logger.exception("Password-changed email failed")


def _slow_down() -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Wait a while and try again."
    )


def _weak(password: str, email: str) -> None:
    problem = password_problem(password, email)
    if problem:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)


async def _me(db, user_id: UUID) -> User:
    # eager-load the full profile graph (async needs explicit loading)
    return await db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.profile).selectinload(Profile.experiences),
            selectinload(User.profile).selectinload(Profile.education),
            selectinload(User.profile).selectinload(Profile.resumes),
        )
    )


async def _name(db, user_id: UUID) -> str | None:
    return await db.scalar(select(Profile.full_name).where(Profile.user_id == user_id))


@router.post("/register", response_model=MeOut, status_code=201)
async def register(payload: RegisterIn, request: Request, response: Response, db: DbSession):
    if await over_limit("register", client_ip(request), settings.register_rate_per_hour):
        raise _slow_down()
    email = payload.email.lower()
    _weak(payload.password, email)
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    await db.flush()  # get user.id

    handle = await unique_handle(db, payload.full_name)
    db.add(Profile(
        user_id=user.id,
        handle=handle,
        full_name=payload.full_name,
        member_type=payload.member_type,
    ))
    await sessions.start(db, user.id, request, response)
    await db.commit()

    await _send_verification(user, payload.full_name)
    return await _me(db, user.id)


@router.post("/login", response_model=MeOut)
async def login(payload: LoginIn, request: Request, response: Response, db: DbSession):
    # Two buckets: per address (guessing one member's password from many IPs)
    # and per IP (trying many members from one machine).
    email = payload.email.lower()
    if await over_limit("login-ip", client_ip(request), settings.login_rate_per_ip_hour) or \
            await over_limit("login-email", email_fingerprint(email), settings.login_rate_per_email_hour):
        raise _slow_down()

    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        burn_password_check(payload.password)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    await sessions.start(db, user.id, request, response)
    await db.commit()
    return await _me(db, user.id)


@router.post("/refresh", status_code=status.HTTP_204_NO_CONTENT)
async def refresh(request: Request, response: Response, db: DbSession):
    session = await sessions.renew(db, request, response)
    user = await db.get(User, session.user_id)
    if not user or not user.is_active:
        await sessions.revoke(db, session.id, "admin")
        await db.commit()
        sessions.clear_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    await db.commit()
    response.status_code = status.HTTP_204_NO_CONTENT


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, db: DbSession):
    # Works from the refresh cookie too, so an expired access token can't
    # leave a session behind.
    sessions.check_csrf(request)
    refresh = request.cookies.get(sessions.REFRESH_COOKIE)
    if refresh:
        s = await db.scalar(select(AuthSession).where(AuthSession.refresh_hash == sha256(refresh)))
        if s:
            await sessions.revoke(db, s.id, "logout")
            await db.commit()
    sessions.clear_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(current: CurrentUser, response: Response, db: DbSession):
    await sessions.revoke_all(db, current.id, "logout_all")
    await db.commit()
    sessions.clear_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(current: CurrentUser, request: Request, db: DbSession):
    now = datetime.now(timezone.utc)
    rows = await db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == current.id, AuthSession.revoked_at.is_(None))
        .order_by(AuthSession.last_seen_at.desc())
    )
    out = []
    for s in rows:
        exp = s.expires_at if s.expires_at.tzinfo else s.expires_at.replace(tzinfo=timezone.utc)
        if exp <= now:
            continue
        item = SessionOut.model_validate(s)
        item.current = s.id == request.state.session_id
        out.append(item)
    return out


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(session_id: UUID, current: CurrentUser, db: DbSession):
    s = await db.get(AuthSession, session_id)
    if not s or s.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await sessions.revoke(db, s.id, "logout")
    await db.commit()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordIn, current: CurrentUser, request: Request, background: BackgroundTasks, db: DbSession
):
    if await over_limit("change-pw", str(current.id), 10):
        raise _slow_down()
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is wrong")
    _weak(payload.new_password, current.email)
    current.password_hash = hash_password(payload.new_password)
    # Everyone else holding this account is signed out; this browser stays in.
    await sessions.revoke_all(db, current.id, "password_change", keep=request.state.session_id)
    await db.commit()
    background.add_task(_send_changed, current.email, await _name(db, current.id))


async def _issue_reset(email: str, ip: str | None) -> None:
    """Runs after the response is sent, in its own database session, so the
    reply to /forgot-password is the same and takes the same time whether or
    not the address has an account."""
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == email))
        if not user or not user.is_active:
            return
        now = datetime.now(timezone.utc)
        # Only the newest link works.
        await db.execute(
            update(PasswordReset)
            .where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))
            .values(used_at=now)
        )
        token = new_secret()
        db.add(PasswordReset(
            user_id=user.id,
            token_hash=sha256(token),
            expires_at=now + timedelta(minutes=settings.password_reset_ttl_min),
            ip=ip,
        ))
        await db.commit()
        try:
            await send_password_reset_email(user.email, token, await _name(db, user.id))
        except Exception:
            logger.exception("Password reset email failed for user %s", user.id)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: ForgotPasswordIn, request: Request, background: BackgroundTasks):
    email = payload.email.lower()
    ip = client_ip(request)
    if await over_limit("forgot-ip", ip, 10):
        raise _slow_down()
    # Silently cap links per address so the form can't be used to flood an inbox.
    if not await over_limit("forgot-email", email_fingerprint(email), 3):
        background.add_task(_issue_reset, email, ip)
    return {"detail": "If that address has an account, a reset link is on its way."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: ResetPasswordIn, request: Request, background: BackgroundTasks, db: DbSession):
    if await over_limit("reset-ip", client_ip(request), 20):
        raise _slow_down()
    bad = HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired. Ask for a new one.")
    row = await db.scalar(select(PasswordReset).where(PasswordReset.token_hash == sha256(payload.token)))
    now = datetime.now(timezone.utc)
    if row is None or row.used_at is not None:
        raise bad
    exp = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if exp <= now:
        raise bad
    user = await db.get(User, row.user_id)
    if not user or not user.is_active:
        raise bad
    _weak(payload.new_password, user.email)

    user.password_hash = hash_password(payload.new_password)
    # The link arrived by email, so following it proves the address too.
    user.is_verified = True
    row.used_at = now
    await sessions.revoke_all(db, user.id, "password_reset")
    await db.commit()
    background.add_task(_send_changed, user.email, await _name(db, user.id))


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailIn, db: DbSession):
    try:
        data = decode_token(payload.token)
        if data.get("type") != VERIFY:
            raise ValueError
        user = await db.get(User, UUID(data["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")

    if not user or not user.is_active or email_fingerprint(user.email) != data.get("eh"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")
    if not user.is_verified:
        user.is_verified = True
        await db.commit()
    return {"verified": True}


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification(current: CurrentUser, db: DbSession):
    if await over_limit("resend", str(current.id), 5):
        raise _slow_down()
    if not current.is_verified:
        await _send_verification(current, await _name(db, current.id))


@router.get("/me", response_model=MeOut)
async def me(current: CurrentUser, db: DbSession):
    return await _me(db, current.id)
