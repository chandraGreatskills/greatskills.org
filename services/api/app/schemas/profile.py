from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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
    experiences: list[ExperienceViewOut] = []
    education: list[EducationOut] = []
