from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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


# --- Opportunities ---
class OpportunityIn(BaseModel):
    title: str = Field(max_length=200)
    kind: Literal["employment", "internship", "research", "academic", "fellowship"] = "employment"
    location: str | None = Field(default=None, max_length=160)
    remote: bool = False
    description: str | None = Field(default=None, max_length=10000)
    skills_wanted: list[str] = Field(default=[], max_length=30)
    org_id: UUID | None = None


class OpportunityOut(OpportunityIn):
    model_config = ConfigDict(from_attributes=True)
    kind: str  # rows saved before the kind list was enforced still read back
    id: UUID
    posted_by: UUID
    status: str


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
