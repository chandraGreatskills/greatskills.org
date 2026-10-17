from uuid import UUID

import jwt
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair
from app.schemas.user import MeOut
from app.services.email import send_verification_email
from app.utils import unique_handle

router = APIRouter(prefix="/auth", tags=["auth"])


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

    # dev: prints a verification link to the console
    await send_verification_email(user.email, create_access_token(str(user.id)))
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
