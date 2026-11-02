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
    is_plus: bool = False
    can_upload_video: bool = False
    plus_requested: bool = False
    # True for demo accounts from the simulation engine (development only:
    # they can't sign in on production).
    is_synthetic: bool = False


class MeOut(UserOut):
    profile: ProfileOut | None = None
