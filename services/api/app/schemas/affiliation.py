from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Kind = Literal["student", "faculty", "recruiter"]


class VerifiedRoleOut(BaseModel):
    """A badge as other members see it. No email, no dates."""

    kind: Kind
    org_name: str
    org_slug: str


class AffiliationIn(BaseModel):
    kind: Kind
    email: EmailStr
    # Only used when the email domain isn't known yet, to name the new
    # organization for admin review.
    org_name: str | None = Field(default=None, min_length=2, max_length=200)


class ConfirmAffiliationIn(BaseModel):
    token: str = Field(max_length=200)


class AffiliationOut(BaseModel):
    """The member's own view of one of their roles."""

    model_config = ConfigDict(from_attributes=True)
    id: UUID
    kind: Kind
    email: str
    status: str
    org_name: str
    org_status: str
    verified_at: datetime | None = None
    created_at: datetime


class OrgReviewOut(BaseModel):
    """An organization in the admin review queue."""

    id: UUID
    name: str
    slug: str
    org_type: str
    status: str
    domains: list[str]
    created_at: datetime
    # Members who proved an address on this domain and are waiting on approval.
    waiting: int
    # Requested by: kept to the member's name so admins can sanity-check
    # without opening the account.
    requested_by: str | None = None


class AdminAffiliationOut(BaseModel):
    id: UUID
    kind: Kind
    email: str
    status: str
    member_name: str
    member_handle: str
    created_at: datetime
