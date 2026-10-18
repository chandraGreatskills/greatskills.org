from pydantic import BaseModel, EmailStr, Field


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    country: str | None = Field(default=None, max_length=80)
    message: str | None = Field(default=None, max_length=5000)
    source: str = Field(default="connect", max_length=40)
    # Honeypot: hidden from people, filled in by bots. Anything here = spam.
    website: str = ""
