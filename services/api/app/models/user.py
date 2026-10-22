from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.profile import Profile


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(String(20), default="member")  # member | admin

    # Demo accounts made by the local simulation engine. They never sign in on
    # production and only show when the admin's demo setting allows it (see
    # app/services/demo.py). sim_tag names the world or run that made them, so
    # one run can be wiped without touching another.
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sim_tag: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    profile: Mapped["Profile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
