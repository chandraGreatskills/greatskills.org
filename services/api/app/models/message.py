from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Conversation(Base):
    """A private conversation between two members.

    Between connections it starts "active". A verified recruiter, faculty
    member or mentor may write to someone they aren't connected to; that
    starts as a "request" the recipient accepts or declines, and the sender
    can't send more until they do."""

    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("pair_key", name="uq_conversation_pair"),)

    # The two user ids, sorted and joined, so a pair has exactly one conversation.
    pair_key: Mapped[str] = mapped_column(String(80))
    # active | request | declined
    status: Mapped[str] = mapped_column(String(10), default="active", index=True)
    started_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # The opening it's about, when an employer writes to an applicant.
    opportunity_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True
    )
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)


class ConversationMember(Base):
    """One person's side of a conversation: what they've read, and how they
    filed it."""

    __tablename__ = "conversation_members"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conversation_member"),)

    conversation_id: Mapped[UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    starred: Mapped[bool] = mapped_column(Boolean, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_conversation_created", "conversation_id", "created_at"),)

    conversation_id: Mapped[UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"))
    sender_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    # Unsent by the sender: the text is cleared and the row stays as a marker.
    unsent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Notification(Base):
    """Something that happened that a member should know about."""

    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # connection_request | connection_accepted | recommendation | recommendation_shown
    # | post_like | post_comment | new_applicant | application_status | role_verified
    kind: Mapped[str] = mapped_column(String(30))
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    text: Mapped[str] = mapped_column(String(300))
    link: Mapped[str] = mapped_column(String(300))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
