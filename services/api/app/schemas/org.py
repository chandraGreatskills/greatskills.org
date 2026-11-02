from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.profile import MemberMini


class OrgCard(BaseModel):
    """An organization in a list: directory, followed, search."""

    id: UUID
    name: str
    slug: str
    org_type: str
    tagline: str | None = None
    location: str | None = None
    logo_url: str | None = None
    followers: int = 0
    following: bool = False
    is_demo: bool = False


class OrgOpening(BaseModel):
    id: UUID
    title: str
    kind: str
    location: str | None = None
    remote: bool = False
    closes_at: datetime | None = None
    created_at: datetime


class OrgPerson(BaseModel):
    person: MemberMini
    # student | faculty | recruiter
    kind: str


class OrgPageOut(OrgCard):
    description: str | None = None
    website: str | None = None
    # Verified members of this organization may edit its page.
    can_edit: bool = False
    staff_count: int = 0
    student_count: int = 0
    openings: list[OrgOpening] = []
    # Verified people, for signed-in viewers only.
    people: list[OrgPerson] = []


class OrgUpdate(BaseModel):
    tagline: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=160)
    website: HttpUrl | None = None
