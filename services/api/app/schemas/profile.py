from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExperienceIn(BaseModel):
    title: str
    company: str
    location: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    description: str | None = None


class ExperienceOut(ExperienceIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class EducationIn(BaseModel):
    school: str
    degree: str | None = None
    field: str | None = None
    start_year: int | None = None
    end_year: int | None = None


class EducationOut(EducationIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    filename: str
    file_url: str
    size_bytes: int
    is_primary: bool


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = None
    location: str | None = None
    industry: str | None = None
    skills: list[str] | None = None
    interests: list[str] | None = None
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
