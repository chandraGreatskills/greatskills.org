from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.profile import MemberMini

Relationship = Literal["taught", "managed", "worked_with", "mentored", "studied_with", "reported_to"]


class RecommendationIn(BaseModel):
    recipient_id: UUID
    relationship_kind: Relationship
    body: str = Field(min_length=50, max_length=3000)


class RecommendationOut(BaseModel):
    """One recommendation, with the other person: the author on received
    ones, the recipient on given ones."""

    id: UUID
    relationship_kind: str
    body: str
    status: str
    created_at: datetime
    updated_at: datetime
    person: MemberMini


class MyRecommendationsOut(BaseModel):
    received: list[RecommendationOut]
    given: list[RecommendationOut]
