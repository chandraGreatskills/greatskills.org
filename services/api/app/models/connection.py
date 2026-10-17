from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Connection(Base):
    """Member-to-member link (the social graph). Directed request that becomes
    a mutual connection once accepted."""

    __tablename__ = "connections"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_connection_pair"),
    )

    requester_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    addressee_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # pending | accepted | declined | blocked
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    message: Mapped[str | None] = mapped_column(String(300), nullable=True)
