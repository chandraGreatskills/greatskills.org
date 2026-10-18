from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NewsletterSubscriber(Base):
    """Someone who asked for updates through a signup box on the marketing site.
    created_at doubles as the record of when they gave consent."""

    __tablename__ = "newsletter_subscribers"

    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    # page they signed up on, e.g. "/programs"
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # subscribed | unsubscribed
    status: Mapped[str] = mapped_column(String(20), default="subscribed", index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
