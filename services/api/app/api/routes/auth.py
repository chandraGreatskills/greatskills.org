import logging
from uuid import UUID

import jwt
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    REFRESH,
    VERIFY,
    create_access_token,
    create_refresh_token,
    create_verify_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair, VerifyEmailIn
from app.schemas.user import MeOut
from app.services.email import send_verification_email
from app.utils import unique_handle

logger = logging.getLogger("greatskills.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


async def _send_verification(user: User) -> None:
    # Callers have already committed, so a mail failure must not fail the request.
    try:
        await send_verification_email(user.email, create_verify_token(str(user.id), user.email))
    except Exception:
        logger.exception("Verification email failed for user %s", user.id)


def _tokens(user: User) -> TokenPair:
    sub = str(user.id)
    return TokenPair(
        access_token=create_access_token(sub),
        refresh_token=create_refresh_token(sub),
    )


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(payload: RegisterIn, db: DbSession):
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()  # get user.id

    handle = await unique_handle(db, payload.full_name)
    profile = Profile(
        user_id=user.id,
        handle=handle,
        full_name=payload.full_name,
        member_type=payload.member_type,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(user)

    await _send_verification(user)
    return _tokens(user)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginIn, db: DbSession):
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    return _tokens(user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshIn, db: DbSession):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != REFRESH:
            raise ValueError
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    user = await db.get(User, UUID(data["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return _tokens(user)


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailIn, db: DbSession):
    try:
        data = decode_token(payload.token)
        if data.get("type") != VERIFY:
            raise ValueError
        user = await db.get(User, UUID(data["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")

    if not user or not user.is_active or user.email != data.get("email"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")
    if not user.is_verified:
        user.is_verified = True
        await db.commit()
    return {"verified": True}


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification(current: CurrentUser):
    if not current.is_verified:
        await _send_verification(current)


@router.get("/me", response_model=MeOut)
async def me(current: CurrentUser, db: DbSession):
    # eager-load the full profile graph (async needs explicit loading)
    user = await db.scalar(
        select(User)
        .where(User.id == current.id)
        .options(
            selectinload(User.profile).selectinload(Profile.experiences),
            selectinload(User.profile).selectinload(Profile.education),
            selectinload(User.profile).selectinload(Profile.resumes),
        )
    )
    return user
