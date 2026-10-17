from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Organization(Base):
    """Industry employer or academic institution that posts opportunities."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    # industry | academia | nonprofit | government
    org_type: Mapped[str] = mapped_column(String(20), default="industry")
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
