from __future__ import annotations

from uuid import UUID

from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Opportunity(Base):
    """A job, internship, research position, or academic opening."""

    __tablename__ = "opportunities"

    org_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    posted_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(200), index=True)
    # employment | internship | research | academic | fellowship
    kind: Mapped[str] = mapped_column(String(20), default="employment", index=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    remote: Mapped[bool] = mapped_column(default=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills_wanted: Mapped[list[str]] = mapped_column(JSON, default=list)
    # open | closed
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("opportunity_id", "applicant_id", name="uq_application"),
    )

    opportunity_id: Mapped[UUID] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), index=True
    )
    applicant_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # submitted | reviewed | shortlisted | rejected | accepted
    status: Mapped[str] = mapped_column(String(20), default="submitted", index=True)
    cover_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )
