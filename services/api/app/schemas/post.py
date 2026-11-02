from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.profile import MemberMini


class PostIn(BaseModel):
    # Posts are short; articles can be long (the route enforces which).
    body: str = Field(min_length=1, max_length=20000)
    kind: Literal["post", "article"] = "post"
    title: str | None = Field(default=None, max_length=200)
    # Paths returned by POST /posts/images, at most four.
    images: list[str] = Field(default=[], max_length=4)
    # A YouTube or Vimeo link; anything else is refused.
    video_url: str | None = Field(default=None, max_length=300)
    # An uploaded video from POST /posts/videos (approved video creators only).
    video_id: UUID | None = None
    visibility: Literal["members", "connections"] = "members"
    # Post as this organization; the author must be verified staff there.
    org_slug: str | None = Field(default=None, max_length=120)


class PostOrg(BaseModel):
    name: str
    slug: str
    logo_url: str | None = None
    org_type: str


class VideoOut(BaseModel):
    id: UUID
    # processing | ready | failed
    status: str
    url: str | None = None
    poster: str | None = None
    error: str | None = None


class PostOut(BaseModel):
    id: UUID
    body: str
    kind: str = "post"
    title: str | None = None
    images: list[str] = []
    video_url: str | None = None
    video: VideoOut | None = None
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
