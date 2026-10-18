from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContactInquiry(Base):
    """A message sent from a public form on the marketing site."""

    __tablename__ = "contact_inquiries"

    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), index=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # which form it came from, e.g. "connect"
    source: Mapped[str] = mapped_column(String(40), default="connect", index=True)
    # new | replied | closed
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
