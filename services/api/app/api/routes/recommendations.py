"""Write, accept, hide and remove recommendations. Writing one needs an
accepted connection; it appears on the recipient's profile only after they
accept it."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.abuse import over_limit
from app.api.deps import CurrentUser, DbSession, VerifiedUser
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.recommendation import MyRecommendationsOut, RecommendationIn
from app.services import network
from app.services.recommendations import listed

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/me", response_model=MyRecommendationsOut)
async def my_recommendations(current: CurrentUser, db: DbSession):
    """Everything the member received (including ones waiting for their
    approval) and everything they wrote."""
    every = ("pending", "shown", "hidden")
    return MyRecommendationsOut(
        received=await listed(db, current.id, "received", every),
        given=await listed(db, current.id, "given", every),
    )


@router.post("", status_code=201)
async def write(payload: RecommendationIn, current: VerifiedUser, db: DbSession):
    if payload.recipient_id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't recommend yourself")
    if await over_limit("recommend", str(current.id), 20):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Wait a while and try again.")
    state = (await network.states(db, current.id, [payload.recipient_id])).get(payload.recipient_id)
    if not state or state[0] != "connected":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can recommend your connections only")
    recipient = await db.get(User, payload.recipient_id)
    if recipient is None or not recipient.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    row = await db.scalar(
        select(Recommendation).where(
            Recommendation.author_id == current.id, Recommendation.recipient_id == payload.recipient_id
        )
    )
    if row is None:
        row = Recommendation(author_id=current.id, recipient_id=payload.recipient_id,
                             is_synthetic=current.is_synthetic)
        db.add(row)
    # A rewrite goes back to the recipient for approval.
    row.relationship_kind = payload.relationship_kind
    row.body = payload.body.strip()
    row.status = "pending"
    row.shown_at = None
    await db.commit()
    return {"id": str(row.id), "status": row.status}


@router.post("/{rec_id}/respond")
async def respond(rec_id: UUID, current: CurrentUser, db: DbSession, show: bool = Query(...)):
    row = await db.get(Recommendation, rec_id)
    if not row or row.recipient_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    row.status = "shown" if show else "hidden"
    row.shown_at = datetime.now(timezone.utc) if show else None
    await db.commit()
    return {"id": str(row.id), "status": row.status}


@router.delete("/{rec_id}", status_code=204)
async def remove(rec_id: UUID, current: CurrentUser, db: DbSession):
    """The author can withdraw it, and the recipient can delete it."""
    row = await db.get(Recommendation, rec_id)
    if not row or current.id not in (row.author_id, row.recipient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.delete(row)
    await db.commit()
