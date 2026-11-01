from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.profile import MemberMini

HomeRole = Literal["student", "seeker", "mentor", "employer", "campus", "admin"]


class HomeOpening(BaseModel):
    id: UUID
    title: str
    kind: str
    org_name: str | None = None
    location: str | None = None
    remote: bool = False
    closes_at: datetime | None = None
    created_at: datetime
    is_demo: bool = False
    # Why it's suggested: skills the viewer has that the opening wants.
    matched_skills: list[str] = []
    # For the poster's own openings.
    applicants: int = 0
    new_applicants: int = 0


class HomeApplication(BaseModel):
    id: UUID
    opportunity_id: UUID
    title: str
    org_name: str | None = None
    status: str
    created_at: datetime
    # The applicant, on an employer's home.
    person: MemberMini | None = None


class HomePerson(BaseModel):
    person: MemberMini
    # One short reason: "Python, SQL" or "No applications yet".
    note: str | None = None


class Stat(BaseModel):
    label: str
    value: int


class HomeOut(BaseModel):
    """Everything one home page needs, shaped for the viewer's role."""

    role: HomeRole
    roles: list[HomeRole]
    # The organization the role belongs to, when there is one.
    org_name: str | None = None
    stats: list[Stat] = []
    openings: list[HomeOpening] = []
    applications: list[HomeApplication] = []
    people: list[HomePerson] = []
    people_title: str | None = None
