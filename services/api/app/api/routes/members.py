from typing import Literal

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.api.deps import DbSession, VerifiedUser
from app.models.connection import Connection
from app.models.profile import Education, Profile
from app.models.user import User
from app.schemas.profile import MemberMini, ProfileCardOut
from app.services.visibility import relation_to
from app.services import demo, network
from app.services.affiliations import verified_roles

router = APIRouter(prefix="/members", tags=["members"])

DISCOVER_POOL = 500

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

    stmt = stmt.order_by(Profile.created_at.desc(), Profile.id)
    if scope == "discover":
        # Suggestions are ranked by how much the member has in common with
        # each person, so the whole candidate pool is scored before paging.
        # Capped, which is plenty until the network is large enough to need
        # a precomputed suggestions table.
        rows = (await db.execute(stmt.limit(DISCOVER_POOL))).all()
        roles = await verified_roles(db, [p.user_id for p, _ in rows])
        common = await common_ground(db, current.id, rows, roles)
        rows.sort(key=lambda r: -common[r[0].user_id].pop("_score"))
        rows = rows[offset : offset + limit]
    else:
        rows = (await db.execute(stmt.limit(limit).offset(offset))).all()
        roles = await verified_roles(db, [p.user_id for p, _ in rows])
        common = await common_ground(db, current.id, rows, roles)
        for c in common.values():
            c.pop("_score")
    ids = [p.user_id for p, _ in rows]
    links = await network.states(db, current.id, ids)
    return [
        card(p, synthetic, roles.get(p.user_id, []), links.get(p.user_id)).model_copy(update=common.get(p.user_id, {}))
        for p, synthetic in rows
    ]


def _city(location: str | None) -> str | None:
    # "Hyderabad, India" and "hyderabad" are the same place.
    return location.split(",")[0].strip().lower() or None if location else None


async def _schools(db, user_ids) -> dict:
    """Schools from each member's education, lowercased, for matching."""
    out: dict = {}
    if user_ids:
        found = await db.execute(
            select(Profile.user_id, Education.school)
            .join(Education, Education.profile_id == Profile.id)
            .where(Profile.user_id.in_(user_ids))
        )
        for uid, school in found:
            out.setdefault(uid, {})[school.strip().lower()] = school.strip()
    return out


async def common_ground(db, viewer_id: UUID, rows, roles: dict) -> dict:
    """Why the viewer might know each member: shared connections, schools or
    employers in common (verified roles and education), the same city, and
    skills or interests both list. "_score" ranks suggestions; callers drop
    it before responding."""
    ids = [p.user_id for p, _ in rows]
    shared = await network.mutuals(db, viewer_id, ids)
    minis = await network.minis(db, {u for people in shared.values() for u in people[:3]})
    mine = await verified_roles(db, [viewer_id])
    my_orgs = {r["org_slug"]: r["org_name"] for r in mine.get(viewer_id, [])}
    me = (await db.execute(
        select(Profile.skills, Profile.interests, Profile.location).where(Profile.user_id == viewer_id)
    )).first()
    my_skills = {s.lower() for s in (me.skills if me else None) or []}
    my_interests = {s.lower() for s in (me.interests if me else None) or []}
    my_city = _city(me.location) if me else None
    schools = await _schools(db, [viewer_id, *ids])
    my_places = {**schools.get(viewer_id, {}), **{n.lower(): n for n in my_orgs.values()}}

    out = {}
    for p, _ in rows:
        people = shared.get(p.user_id, [])
        theirs = {r["org_name"].lower(): r["org_name"] for r in roles.get(p.user_id, [])}
        theirs.update(schools.get(p.user_id, {}))
        orgs = sorted({my_places[k] for k in theirs if k in my_places})
        skills = [s for s in (p.skills or []) if s.lower() in my_skills][:3]
        interests = [s for s in (p.interests or []) if s.lower() in my_interests][:3]
        city = p.location.split(",")[0].strip() if my_city and _city(p.location) == my_city else None
        out[p.user_id] = {
            "mutual_connections": len(people),
            "mutual_sample": [minis[u] for u in people[:3] if u in minis],
            "shared_orgs": orgs,
            "shared_skills": skills,
            "shared_interests": interests,
            "shared_city": city,
            "_score": 3 * len(people) + 3 * len(orgs) + len(skills) + len(interests) + (1 if city else 0),
        }
    return out


@router.get("/{user_id}/mutual", response_model=list[MemberMini])
async def mutual_connections(user_id: UUID, current: VerifiedUser, db: DbSession):
    """Everyone the viewer and this member are both connected to. Only people
    the viewer is already connected to come back, so nothing new is revealed."""
    if await relation_to(db, current, user_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    shared = (await network.mutuals(db, current.id, [user_id])).get(user_id, [])
    minis = await network.minis(db, shared)
    return sorted((minis[u] for u in shared if u in minis), key=lambda m: m.full_name)


def card(p: Profile, synthetic: bool, roles: list, link=None) -> ProfileCardOut:
    state, conn_id = link or ("none", None)
    return ProfileCardOut(
        **ProfileCardOut.model_validate(p).model_dump(
            exclude={"verified_roles", "is_demo", "connection", "connection_id", "mutual_connections",
                     "mutual_sample", "shared_orgs", "shared_skills", "shared_interests", "shared_city"}
        ),
        verified_roles=roles,
        is_demo=synthetic,
        connection=state,
        connection_id=conn_id,
    )
