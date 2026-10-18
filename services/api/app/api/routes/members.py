from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.api.deps import DbSession, VerifiedUser
from app.models.connection import Connection
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileCardOut
from app.services.affiliations import verified_roles

router = APIRouter(prefix="/members", tags=["members"])

MEMBER_TYPES = {"member", "student", "academia", "industry", "mentor"}


def _like(q: str) -> str:
    # Treat % and _ in a search as literal characters, not wildcards.
    return "%" + q.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_") + "%"


@router.get("", response_model=list[ProfileCardOut])
async def search_members(
    current: VerifiedUser,
    db: DbSession,
    q: str | None = Query(None, max_length=100),
    member_type: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0, le=1000),
):
    """Directory search. Returns cards only; the full profile goes through
    /profiles/{handle} and its visibility rules.

    There is deliberately no Open to Work filter: that flag is for verified
    recruiters only, and until recruiter verification exists a filter would
    let any member list everyone who is job hunting. Postgres full-text search
    replaces the ilike filter at scale."""
    blocked = select(Connection.addressee_id).where(
        (Connection.requester_id == current.id) & (Connection.status == "blocked")
    ).union(
        select(Connection.requester_id).where(
            (Connection.addressee_id == current.id) & (Connection.status == "blocked")
        )
    )
    stmt = (
        select(Profile)
        .join(User, User.id == Profile.user_id)
        .where(User.is_active.is_(True), Profile.user_id != current.id)
        .where(Profile.user_id.not_in(blocked))
    )
    if q:
        like = _like(q)
        stmt = stmt.where(
            or_(
                Profile.full_name.ilike(like, escape="\\"),
                Profile.headline.ilike(like, escape="\\"),
                Profile.industry.ilike(like, escape="\\"),
            )
        )
    if member_type in MEMBER_TYPES:
        stmt = stmt.where(Profile.member_type == member_type)

    stmt = stmt.order_by(Profile.created_at.desc(), Profile.id).limit(limit).offset(offset)
    profiles = list(await db.scalars(stmt))
    roles = await verified_roles(db, [p.user_id for p in profiles])
    return [
        ProfileCardOut(**ProfileCardOut.model_validate(p).model_dump(exclude={"verified_roles"}), verified_roles=roles.get(p.user_id, []))
        for p in profiles
    ]
