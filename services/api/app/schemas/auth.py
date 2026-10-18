from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    # Strength is checked in the route (password_problem) so the message is
    # specific instead of a generic validation error.
    password: str = Field(max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    # Self-described and shown as such. It never grants a verified badge or
    # extra access; those come from school or work email checks.
    member_type: Literal["member", "student", "academia", "industry", "mentor"] = "member"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class VerifyEmailIn(BaseModel):
    token: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(max_length=200)
    new_password: str = Field(max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    last_seen_at: datetime | None = None
    user_agent: str | None = None
    current: bool = False
