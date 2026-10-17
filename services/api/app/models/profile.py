from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Profile(Base):
    __tablename__ = "profiles"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    # Public URL slug, e.g. achievers.greatskills.org/in/jane-doe
    handle: Mapped[str] = mapped_column(String(60), unique=True, index=True)

    full_name: Mapped[str] = mapped_column(String(120))
    headline: Mapped[str | None] = mapped_column(String(200), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # member | student | academia | industry | mentor
    member_type: Mapped[str] = mapped_column(String(20), default="member")

    # Simple string lists kept as JSON for now; searchable via FTS later.
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)

    open_to_work: Mapped[bool] = mapped_column(default=False)
    open_to_mentor: Mapped[bool] = mapped_column(default=False)

    user: Mapped["User"] = relationship(back_populates="profile")
    experiences: Mapped[list["Experience"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    education: Mapped[list["Education"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    resumes: Mapped[list["Resume"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )


class Experience(Base):
    __tablename__ = "experiences"

    profile_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    company: Mapped[str] = mapped_column(String(160))
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    start_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    profile: Mapped["Profile"] = relationship(back_populates="experiences")


class Education(Base):
    __tablename__ = "education"

    profile_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    school: Mapped[str] = mapped_column(String(160))
    degree: Mapped[str | None] = mapped_column(String(160), nullable=True)
    field: Mapped[str | None] = mapped_column(String(160), nullable=True)
    start_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    profile: Mapped["Profile"] = relationship(back_populates="education")


class Resume(Base):
    __tablename__ = "resumes"

    profile_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(500))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(default=False)

    profile: Mapped["Profile"] = relationship(back_populates="resumes")
