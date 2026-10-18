from pydantic import BaseModel, EmailStr, Field


class NewsletterIn(BaseModel):
    email: EmailStr
    source: str | None = Field(default=None, max_length=120)
    # Honeypot: hidden from people, filled in by bots. Anything here = spam.
    website: str = ""
