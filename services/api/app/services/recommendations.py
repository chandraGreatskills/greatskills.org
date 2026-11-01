"""Reading recommendations with the other person attached."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recommendation import Recommendation
from app.schemas.recommendation import RecommendationOut
from app.services import network


async def listed(
    db: AsyncSession, user_id: UUID, side: str, statuses: tuple[str, ...]
) -> list[RecommendationOut]:
    """Recommendations a member received (side="received") or wrote
    (side="given"), newest first, limited to the given statuses."""
    mine = Recommendation.recipient_id if side == "received" else Recommendation.author_id
    rows = list(
        await db.scalars(
            select(Recommendation)
            .where(mine == user_id, Recommendation.status.in_(statuses))
            .order_by(Recommendation.updated_at.desc())
        )
    )
    other = (lambda r: r.author_id) if side == "received" else (lambda r: r.recipient_id)
    people = await network.minis(db, {other(r) for r in rows})
    return [
        RecommendationOut(
            id=r.id, relationship_kind=r.relationship_kind, body=r.body, status=r.status,
            created_at=r.created_at, updated_at=r.updated_at, person=people[other(r)],
        )
        for r in rows
        if other(r) in people
    ]
