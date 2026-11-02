from __future__ import annotations

from uuid import UUID

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Post(Base):
    """An update in the feed. Written by a member, optionally on behalf of an
    organization they're verified staff at (a campus or company update)."""

    __tablename__ = "posts"
    # The feed sorts by newest first.
    __table_args__ = (Index("ix_posts_created_at", "created_at"),)

    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    org_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    body: Mapped[str] = mapped_column(Text)
    # post | article (an article has a title and opens on its own page)
    kind: Mapped[str] = mapped_column(String(10), default="post")
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Up to four uploaded photos, as /uploads/posts/... paths.
    images: Mapped[list[str]] = mapped_column(JSON, default=list)
    # A YouTube or Vimeo embed address, normalized when the post is saved.
    video_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # Or an uploaded video (approved video creators only).
    video_id: Mapped[UUID | None] = mapped_column(ForeignKey("post_videos.id", ondelete="SET NULL"), nullable=True)
    # members: every signed-in member | connections: the author's connections only
    visibility: Mapped[str] = mapped_column(String(12), default="members", index=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_like"),)

    post_id: Mapped[UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class PostComment(Base):
    __tablename__ = "post_comments"

    post_id: Mapped[UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)


class Promotion(Base):
    """A sponsored card, managed by Great Skills admins. Always labeled
    Sponsored, targeted by role only (never by personal data), and counted
    only in aggregate."""

    __tablename__ = "promotions"

    sponsor: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(String(400))
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link_url: Mapped[str] = mapped_column(String(500))
    cta: Mapped[str] = mapped_column(String(40), default="Learn more")
    # rail: the right column on home | feed: between posts
    placement: Mapped[str] = mapped_column(String(10), default="rail", index=True)
    # all | student | seeker | mentor | employer | campus
    audience: Mapped[str] = mapped_column(String(10), default="all")
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)


class SiteUpdate(Base):
    """A short Great Skills news item for the home page."""

    __tablename__ = "site_updates"

    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str | None] = mapped_column(String(400), nullable=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by: Mapped["UUID | None"] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class PostVideo(Base):
    """An uploaded video, converted in the background to a web-friendly MP4
    with a poster frame. Only members on the admin-approved list of video
    creators can upload one."""

    __tablename__ = "post_videos"

    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # processing | ready | failed
    status: Mapped[str] = mapped_column(String(12), default="processing")
    file_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    poster_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(String(200), nullable=True)
