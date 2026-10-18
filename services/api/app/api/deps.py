from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import ACCESS, decode_token
from app.db.base import get_db
from app.models.user import User
from app.services import sessions
from app.services.sessions import ACCESS_COOKIE

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(request: Request, db: DbSession) -> User:
    """The signed-in member, from the access cookie. Also confirms the session
    behind the token is still live, so a revoked session stops working on its
    very next request, and blocks forged cross-site changes."""
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != ACCESS:
            raise ValueError("wrong token type")
        user_id = UUID(payload["sub"])
        session_id = UUID(payload["sid"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    if await sessions.live_session(db, session_id, user_id) is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session ended. Sign in again.")
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    sessions.check_csrf(request)
    request.state.session_id = session_id
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_optional_user(request: Request, db: DbSession) -> User | None:
    """For pages that anonymous visitors can also open. A missing or bad token
    means "treat as public", never an error, so a stale token can't lock anyone
    out of a page they could see logged out."""
    if not request.cookies.get(ACCESS_COOKIE):
        return None
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


async def get_verified_user(current: CurrentUser) -> User:
    # Browsing other members needs a confirmed email, so a throwaway sign-up
    # can't be used to page through the directory.
    if not current.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Verify your email to browse members")
    return current


VerifiedUser = Annotated[User, Depends(get_verified_user)]
