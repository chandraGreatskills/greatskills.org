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
    kind: str = "employment"
    location: str | None = None
    remote: bool = False
    description: str | None = None
    skills_wanted: list[str] = []
    org_id: UUID | None = None


class OpportunityOut(OpportunityIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    posted_by: UUID
    status: str


class ApplicationIn(BaseModel):
    cover_note: str | None = None
    resume_id: UUID | None = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    opportunity_id: UUID
    applicant_id: UUID
    status: str
    cover_note: str | None = None
