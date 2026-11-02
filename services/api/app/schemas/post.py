from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.profile import MemberMini


class PostIn(BaseModel):
    body: str = Field(min_length=1, max_length=3000)
    visibility: Literal["members", "connections"] = "members"
    # Post as this organization; the author must be verified staff there.
    org_slug: str | None = Field(default=None, max_length=120)


class PostOrg(BaseModel):
    name: str
    slug: str
    logo_url: str | None = None
    org_type: str


class PostOut(BaseModel):
    id: UUID
    body: str
    visibility: str
    created_at: datetime
    author: MemberMini
    org: PostOrg | None = None
    likes: int = 0
    liked: bool = False
    comments: int = 0
    can_delete: bool = False
    is_demo: bool = False


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class CommentOut(BaseModel):
    id: UUID
    body: str
    created_at: datetime
    author: MemberMini
    can_delete: bool = False
