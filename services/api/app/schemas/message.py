from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.profile import MemberMini


class StartIn(BaseModel):
    to_user_id: UUID
    body: str = Field(min_length=1, max_length=5000)
    # When an employer writes to someone who applied to this opening.
    opportunity_id: UUID | None = None


class SendIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class FileIn(BaseModel):
    starred: bool | None = None
    archived: bool | None = None


class MessageOut(BaseModel):
    id: UUID
    sender_id: UUID
    body: str
    created_at: datetime
    unsent: bool = False
    mine: bool = False
    # The other person has opened the conversation since this was sent.
    seen: bool = False
    can_unsend: bool = False


class ConversationOut(BaseModel):
    id: UUID
    other: MemberMini
    # active | request (waiting for someone to accept) | declined
    status: str
    # For a request: True when the viewer is the one being asked.
    incoming_request: bool = False
    last_message: str | None = None
    last_message_mine: bool = False
    last_message_at: datetime | None = None
    unread: int = 0
    starred: bool = False
    archived: bool = False
    opportunity_title: str | None = None
    is_demo: bool = False


class ThreadOut(ConversationOut):
    messages: list[MessageOut] = []
    # Whether the viewer can send right now, and why not if they can't.
    can_send: bool = True
    reason: str | None = None


Box = Literal["all", "unread", "requests", "starred", "archived"]
