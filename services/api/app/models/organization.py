from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
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
    # pending | approved | rejected. A member's first school or work email from
    # an unknown domain creates the organization as pending; nobody gets a
    # verified badge from it until an admin approves it.
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class OrgDomain(Base):
    """An email domain that belongs to an organization, e.g. lakeview.edu.
    Addresses on a subdomain (cs.lakeview.edu) count as the same domain."""

    __tablename__ = "org_domains"

    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    domain: Mapped[str] = mapped_column(String(253), unique=True, index=True)


class Affiliation(Base):
    """A member's claim to be a student, faculty member or recruiter at an
    organization, proved by clicking a link sent to their school or work
    address. Only a verified affiliation shows a badge or unlocks posting for
    the organization.

    Status moves: email_sent -> awaiting_org (address proved, organization
    still pending) -> verified. An admin can reject the organization (rejected)
    or withdraw a verification (revoked). A member removing their own role
    deletes the row."""

    __tablename__ = "affiliations"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    # student | faculty | recruiter
    kind: Mapped[str] = mapped_column(String(20))
    # Kept so the member and admins can see which address proved it. Never
    # shown to anyone else.
    email: Mapped[str] = mapped_column(String(320), index=True)
    status: Mapped[str] = mapped_column(String(20), default="email_sent", index=True)
    # The emailed link is single-use and stored only as a hash, like
    # password resets.
    token_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
