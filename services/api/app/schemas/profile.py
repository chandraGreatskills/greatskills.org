from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_serializer

from app.schemas.affiliation import VerifiedRoleOut


class ExperienceIn(BaseModel):
    title: str = Field(max_length=160)
    company: str = Field(max_length=160)
    location: str | None = Field(default=None, max_length=120)
    start_year: int | None = Field(default=None, ge=1950, le=2100)
    end_year: int | None = Field(default=None, ge=1950, le=2100)
    description: str | None = Field(default=None, max_length=5000)


class ExperienceOut(ExperienceIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class EducationIn(BaseModel):
    school: str = Field(max_length=160)
    degree: str | None = Field(default=None, max_length=160)
    field: str | None = Field(default=None, max_length=160)
    start_year: int | None = Field(default=None, ge=1950, le=2100)
    end_year: int | None = Field(default=None, ge=1950, le=2100)


class EducationOut(EducationIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class ResumeOut(BaseModel):
    # No file URL: resumes are only downloadable through an authenticated
    # endpoint, never as a static link that could be forwarded or guessed.
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    filename: str
    size_bytes: int
    is_primary: bool


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=120)
    industry: str | None = Field(default=None, max_length=120)
    skills: list[str] | None = Field(default=None, max_length=50)
    interests: list[str] | None = Field(default=None, max_length=50)
    open_to_work: bool | None = None
    open_to_mentor: bool | None = None


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    handle: str
    full_name: str
    headline: str | None = None
    bio: str | None = None
    location: str | None = None
    industry: str | None = None
    avatar_url: str | None = None
    member_type: str
    skills: list[str] = []
    interests: list[str] = []
    open_to_work: bool = False
    open_to_mentor: bool = False
    experiences: list[ExperienceOut] = []
    education: list[EducationOut] = []
    resumes: list[ResumeOut] = []


class MemberMini(BaseModel):
    """Just enough to show someone as a small photo with a name."""

    user_id: UUID
    handle: str
    full_name: str
    avatar_url: str | None = None
    headline: str | None = None


class ProfileCardOut(BaseModel):
    """The directory card: enough to recognize someone and send a request,
    nothing more. user_id is what connection requests address."""

    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    handle: str
    full_name: str
    headline: str | None = None
    avatar_url: str | None = None
    member_type: str
    location: str | None = None
    # Checked roles only (school or work email plus an approved organization).
    verified_roles: list[VerifiedRoleOut] = []
    # A demo member from the simulation engine; the portal shows a Demo badge.
    is_demo: bool = False
    # Where the viewer stands with this member, so the card shows the right
    # button: Connect, Pending, Accept or Message.
    connection: Literal["none", "sent", "received", "connected"] = "none"
    connection_id: UUID | None = None
    # Common ground with the viewer, to explain a suggestion: how many
    # connections they share (with up to three of them to show), verified
    # schools or employers in common, and skills both list.
    mutual_connections: int = 0
    mutual_sample: list["MemberMini"] = []
    shared_orgs: list[str] = []
    shared_skills: list[str] = []
    shared_interests: list[str] = []
    # The city, when the viewer lives in the same one.
    shared_city: str | None = None


class ExperienceViewOut(BaseModel):
    # Logged-out visitors get title and company only, so the rest is optional.
    id: UUID
    title: str
    company: str
    location: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    description: str | None = None


class ProfileViewOut(BaseModel):
    """Someone else's profile, already cut down to what this viewer may see.
    Fields the viewer can't see are absent or empty, never filled and hidden
    by the browser."""

    # public | member | connection
    viewer: Literal["public", "member", "connection"]
    id: UUID
    user_id: UUID | None = None
    handle: str
    full_name: str
    headline: str | None = None
    avatar_url: str | None = None
    member_type: str
    location: str | None = None
    industry: str | None = None
    bio: str | None = None
    bio_truncated: bool = False
    skills: list[str] = []
    skills_truncated: bool = False
    interests: list[str] = []
    open_to_mentor: bool = False
    verified_roles: list[VerifiedRoleOut] = []
    is_demo: bool = False
    # Only filled in for verified recruiters. For everyone else the key is
    # left out of the response entirely, not sent as null.
    open_to_work: bool | None = None
    experiences: list[ExperienceViewOut] = []
    education: list[EducationOut] = []
    # Same meaning as on the directory card. Left at "none" for logged-out
    # visitors and for an owner previewing their own page.
    connection: Literal["none", "sent", "received", "connected"] = "none"
    connection_id: UUID | None = None
    # How far the viewer is from this member: 1st (connected), 2nd (they
    # share a connection) or 3rd+. None for logged-out visitors.
    degree: Literal["1st", "2nd", "3rd+"] | None = None
    connection_count: int | None = None
    mutual_connections: int = 0
    mutual_sample: list[MemberMini] = []

    @model_serializer(mode="wrap")
    def _omit_hidden(self, handler):
        data = handler(self)
        if self.open_to_work is None:
            data.pop("open_to_work", None)
        return data
