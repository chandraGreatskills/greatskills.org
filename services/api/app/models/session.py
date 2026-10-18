from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuthSession(Base):
    """One signed-in browser. Access tokens name their session, and every
    request checks it is still live, so signing out (or "sign out everywhere",
    or a password reset) takes effect at once instead of when tokens expire.

    Refresh tokens are random strings stored only as SHA-256 hashes, and they
    rotate on every use. Presenting a refresh token that was already rotated
    away means someone copied it, so the whole session is revoked."""

    __tablename__ = "auth_sessions"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    refresh_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # The hash the current one replaced, kept to spot a stolen token coming back.
    prev_refresh_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # logout | logout_all | password_change | password_reset | reuse | admin
    revoke_reason: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # Shown to the member in their session list so they can spot a stranger.
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)


class PasswordReset(Base):
    """A single-use reset link. Only the hash is stored, so a database leak
    doesn't hand out working reset links."""

    __tablename__ = "password_resets"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
