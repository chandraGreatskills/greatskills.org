import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

ACCESS = "access"
VERIFY = "verify"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# Checked against when the email isn't registered, so a wrong address takes as
# long as a wrong password and response time doesn't reveal who has an account.
_DUMMY_HASH = pwd_context.hash("not-a-real-password-" + secrets.token_hex(8))


def burn_password_check(plain: str) -> None:
    pwd_context.verify(plain, _DUMMY_HASH)


# Short list of passwords that show up first in every breach dump. Length
# matters more than character rules (NIST SP 800-63B), so there are no
# "must contain a symbol" rules, just a floor and a block on the obvious.
_COMMON = {
    "password", "password1", "password123", "12345678", "123456789", "1234567890",
    "qwerty123", "qwertyuiop", "iloveyou", "11111111", "00000000", "abc12345",
    "admin123", "welcome1", "welcome123", "letmein1", "sunshine1", "football1",
    "princess1", "baseball1", "passw0rd", "p@ssw0rd", "changeme", "greatskills",
    "greatskills1", "greatskills123", "india123", "student1", "student123",
}


def password_problem(password: str, email: str) -> str | None:
    """Why this password is refused, or None if it's acceptable."""
    low = password.lower()
    local = email.split("@", 1)[0].lower()
    if len(password) < 8:
        return "Use at least 8 characters"
    if low in _COMMON or len(set(password)) < 4:
        return "That password is too easy to guess"
    if low == email.lower() or (len(local) >= 4 and local in low):
        return "Don't use your email address in your password"
    return None


def new_secret() -> str:
    """A random, URL-safe token for refresh tokens and reset links."""
    return secrets.token_urlsafe(32)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


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


def create_access_token(subject: str, session_id: str) -> str:
    # sid ties the token to a session row, so revoking the row kills the token.
    return _create_token(
        subject, ACCESS, timedelta(minutes=settings.access_token_ttl_min), sid=session_id
    )


def email_fingerprint(email: str) -> str:
    """Short one-way digest of an address. JWT payloads are readable by anyone
    holding the link, so tokens carry this rather than the address itself."""
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()[:16]


def create_verify_token(subject: str, email: str) -> str:
    # Single-purpose: get_current_user rejects anything but ACCESS, so this
    # cannot be used to log in. The fingerprint voids the link if the address
    # changes before it is clicked.
    return _create_token(
        subject,
        VERIFY,
        timedelta(hours=settings.verify_token_ttl_hours),
        eh=email_fingerprint(email),
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
