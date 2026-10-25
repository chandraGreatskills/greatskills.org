from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
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
    # Free text so it reads the way people write it: "Rs 15,000 a month".
    pay: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Who can apply, e.g. "Final-year B.Tech, CSE or ECE".
    eligibility: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # After this moment the opening counts as closed without anyone having to
    # close it. None means open until the poster closes it.
    closes_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    # open | closed
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    # Posted by a demo account; same rules as User.
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sim_tag: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)


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


class SavedOpportunity(Base):
    """An opening a member bookmarked to come back to."""

    __tablename__ = "saved_opportunities"
    __table_args__ = (
        UniqueConstraint("user_id", "opportunity_id", name="uq_saved_opportunity"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    opportunity_id: Mapped[UUID] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), index=True
    )
