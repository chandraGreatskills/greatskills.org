from typing import Literal

from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.api.deps import DbSession, VerifiedUser
from app.models.connection import Connection
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileCardOut
from app.services import demo, network
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
    scope: Literal["all", "discover"] = "all",
):
    """Directory search. Returns cards only; the full profile goes through
    /profiles/{handle} and its visibility rules.

    There is deliberately no Open to Work filter: that flag is for verified
    recruiters only, and until recruiter verification exists a filter would
    let any member list everyone who is job hunting. Postgres full-text search
    replaces the ilike filter at scale.

    scope=discover leaves out people the member is already connected to or
    has a pending request with, for suggestions. Each card says where the
    member stands with that person and how many connections they share."""
    blocked = select(Connection.addressee_id).where(
        (Connection.requester_id == current.id) & (Connection.status == "blocked")
    ).union(
        select(Connection.requester_id).where(
            (Connection.addressee_id == current.id) & (Connection.status == "blocked")
        )
    )
    stmt = (
        select(Profile, User.is_synthetic)
        .join(User, User.id == Profile.user_id)
        .where(User.is_active.is_(True), Profile.user_id != current.id)
        .where(Profile.user_id.not_in(blocked))
        .where(await demo.visible(db, current, User.is_synthetic))
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
    if scope == "discover":
        stmt = stmt.where(Profile.user_id.not_in(network.linked_with(current.id)))
    if member_type in MEMBER_TYPES:
        stmt = stmt.where(Profile.member_type == member_type)

    stmt = stmt.order_by(Profile.created_at.desc(), Profile.id).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    ids = [p.user_id for p, _ in rows]
    roles = await verified_roles(db, ids)
    links = await network.states(db, current.id, ids)
    mutual = await network.mutual_counts(db, current.id, ids)
    samples = {}
    if mutual:
        sample_ids = {s for _, s in mutual.values()}
        samples = {
            uid: (name, avatar)
            for uid, name, avatar in (
                await db.execute(
                    select(Profile.user_id, Profile.full_name, Profile.avatar_url).where(
                        Profile.user_id.in_(sample_ids)
                    )
                )
            ).all()
        }
    out = []
    for p, synthetic in rows:
        count, sample = mutual.get(p.user_id, (0, None))
        name, avatar = samples.get(sample, (None, None))
        c = card(p, synthetic, roles.get(p.user_id, []), links.get(p.user_id), count)
        c.mutual_name, c.mutual_avatar = name, avatar
        out.append(c)
    return out


def card(p: Profile, synthetic: bool, roles: list, link=None, mutual: int = 0) -> ProfileCardOut:
    state, conn_id = link or ("none", None)
    return ProfileCardOut(
        **ProfileCardOut.model_validate(p).model_dump(
            exclude={"verified_roles", "is_demo", "connection", "connection_id", "mutual_connections",
                     "mutual_name", "mutual_avatar"}
        ),
        mutual_connections=mutual,
        verified_roles=roles,
        is_demo=synthetic,
        connection=state,
        connection_id=conn_id,
    )
