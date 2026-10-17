from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

ACCESS = "access"
REFRESH = "refresh"
VERIFY = "verify"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(
    subject: str, token_type: str, expires: timedelta, **claims: Any
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires,
        "jti": uuid4().hex,
        **claims,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    return _create_token(
        subject, ACCESS, timedelta(minutes=settings.access_token_ttl_min)
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject, REFRESH, timedelta(days=settings.refresh_token_ttl_days)
    )


def create_verify_token(subject: str, email: str) -> str:
    # Single-purpose: get_current_user rejects anything but ACCESS, so this
    # cannot be used to log in. The email claim voids the link if the address
    # changes before it is clicked.
    return _create_token(
        subject,
        VERIFY,
        timedelta(hours=settings.verify_token_ttl_hours),
        email=email,
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
