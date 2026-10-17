from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.profile import ProfileOut


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    is_active: bool
    is_verified: bool
    role: str


class MeOut(UserOut):
    profile: ProfileOut | None = None
