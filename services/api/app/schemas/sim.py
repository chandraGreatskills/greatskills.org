from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.services.email import is_demo_address

Tag = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9._-]*$")


def _demo_domain(value: str) -> str:
    value = value.strip().lower().rstrip(".")
    if not value.endswith(".example"):
        raise ValueError("demo data must use a .example domain")
    return value


class SimAccountIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    member_type: Literal["member", "student", "academia", "industry", "mentor"] = "member"
    admin: bool = False
    # False leaves the email unconfirmed, so the engine can walk the real
    # verification flow through the dev mailbox.
    verified: bool = True
    tag: str = Tag

    @field_validator("email")
    @classmethod
    def _demo_email(cls, v: str) -> str:
        if not is_demo_address(v):
            raise ValueError("demo accounts must use a .example address")
        return v.lower()


class SimAccountOut(BaseModel):
    id: UUID
    email: str
    handle: str
    created: bool


class SimOrgIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    org_type: Literal["industry", "academia", "nonprofit", "government"]
    domains: list[str] = Field(min_length=1, max_length=5)
    # False leaves it pending, for the engine's admin agent to review.
    approved: bool = True
    website: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    tag: str = Tag

    @field_validator("domains")
    @classmethod
    def _demo_domains(cls, v: list[str]) -> list[str]:
        return [_demo_domain(d) for d in v]


class SimOrgOut(BaseModel):
    id: UUID
    name: str
    slug: str
    status: str
    created: bool


class SimMail(BaseModel):
    to: str
    subject: str
    text: str


class SimWipeOut(BaseModel):
    counts: dict[str, int]
