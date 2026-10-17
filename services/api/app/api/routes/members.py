from fastapi import APIRouter, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.profile import Profile
from app.schemas.profile import ProfileOut

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=list[ProfileOut])
async def search_members(
    current: CurrentUser,
    db: DbSession,
    q: str | None = None,
    member_type: str | None = None,
    open_to_work: bool | None = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
):
    """Directory search for connecting members with each other, industry, and
    academia. Postgres full-text search replaces the ilike filter at scale."""
    stmt = select(Profile).options(
        selectinload(Profile.experiences),
        selectinload(Profile.education),
        selectinload(Profile.resumes),
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Profile.full_name.ilike(like),
                Profile.headline.ilike(like),
                Profile.industry.ilike(like),
            )
        )
    if member_type:
        stmt = stmt.where(Profile.member_type == member_type)
    if open_to_work is not None:
        stmt = stmt.where(Profile.open_to_work == open_to_work)

    stmt = stmt.order_by(Profile.created_at.desc()).limit(limit).offset(offset)
    rows = await db.scalars(stmt)
    return list(rows)
