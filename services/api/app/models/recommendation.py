from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Recommendation(Base):
    """A written recommendation from one member for another, like a reference
    from a professor or manager. Only connections can write one, and it shows
    on the recipient's profile only after they accept it.

    One per author and recipient: writing again replaces the earlier text and
    sends it back to the recipient for approval."""

    __tablename__ = "recommendations"
    __table_args__ = (UniqueConstraint("author_id", "recipient_id", name="uq_recommendation_pair"),)

    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    recipient_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # taught | managed | worked_with | mentored | studied_with | reported_to
    relationship_kind: Mapped[str] = mapped_column(String(20))
    body: Mapped[str] = mapped_column(Text)
    # pending | shown | hidden
    status: Mapped[str] = mapped_column(String(10), default="pending", index=True)
    shown_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
