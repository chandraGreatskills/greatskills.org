from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.profile import ProfileCardOut


# --- Connections ---
class ConnectionRequestIn(BaseModel):
    addressee_id: UUID
    message: str | None = Field(default=None, max_length=300)


class ConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    requester_id: UUID
    addressee_id: UUID
    status: str
    message: str | None = None


class NetworkItemOut(BaseModel):
    """One person in the member's network, with the link between them."""

    id: UUID  # the connection
    message: str | None = None
    created_at: datetime
    member: ProfileCardOut


class NetworkSummaryOut(BaseModel):
    connections: int
    received: int
    sent: int


# --- Opportunities ---
Kind = Literal["employment", "internship", "research", "academic", "fellowship"]


class OpportunityIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    kind: Kind = "employment"
    location: str | None = Field(default=None, max_length=160)
    remote: bool = False
    description: str | None = Field(default=None, max_length=10000)
    skills_wanted: list[str] = Field(default=[], max_length=30)
    pay: str | None = Field(default=None, max_length=120)
    eligibility: str | None = Field(default=None, max_length=300)
    closes_at: datetime | None = None
    org_id: UUID | None = None


class OpportunityUpdate(BaseModel):
    """What a poster may change after posting. Moving the organization isn't
    here: repost under the other organization instead."""

    title: str | None = Field(default=None, min_length=3, max_length=200)
    kind: Kind | None = None
    location: str | None = Field(default=None, max_length=160)
    remote: bool | None = None
    description: str | None = Field(default=None, max_length=10000)
    skills_wanted: list[str] | None = Field(default=None, max_length=30)
    pay: str | None = Field(default=None, max_length=120)
    eligibility: str | None = Field(default=None, max_length=300)
    closes_at: datetime | None = None
    status: Literal["open", "closed"] | None = None


class OrgBrief(BaseModel):
    name: str
    slug: str
    logo_url: str | None = None
    # approved organizations only reach here, so this is about the poster
    verified: bool = True


class PosterBrief(BaseModel):
    full_name: str
    handle: str
    avatar_url: str | None = None


class OpportunityOut(BaseModel):
    id: UUID
    title: str
    kind: str  # rows saved before the kind list was enforced still read back
    location: str | None = None
    remote: bool = False
    description: str | None = None
    skills_wanted: list[str] = []
    pay: str | None = None
    eligibility: str | None = None
    closes_at: datetime | None = None
    org_id: UUID | None = None
    posted_by: UUID
    status: str
    created_at: datetime
    is_demo: bool = False
    # Open right now: status open and the closing date not passed.
    is_open: bool = True
    org: OrgBrief | None = None
    poster: PosterBrief | None = None
    applicants: int = 0
    # The viewer's own relation to it.
    mine: bool = False
    saved: bool = False
    applied_status: str | None = None


class ApplicationIn(BaseModel):
    cover_note: str | None = Field(default=None, max_length=5000)
    resume_id: UUID | None = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    opportunity_id: UUID
    applicant_id: UUID
    status: str
    cover_note: str | None = None


class MyApplicationOut(BaseModel):
    id: UUID
    status: str
    cover_note: str | None = None
    created_at: datetime
    updated_at: datetime
    opportunity: OpportunityOut


class ApplicantOut(BaseModel):
    """One application as the poster sees it."""

    id: UUID
    status: str
    cover_note: str | None = None
    created_at: datetime
    has_resume: bool
    resume_filename: str | None = None
    member: ProfileCardOut


class ApplicationStatusIn(BaseModel):
    status: Literal["reviewed", "shortlisted", "rejected", "accepted"]
