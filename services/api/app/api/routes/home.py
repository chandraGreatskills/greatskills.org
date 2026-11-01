"""The home page, shaped for who is looking: a student sees their applications
and openings matched to their skills, a recruiter sees their roles and new
applicants, career services see their students' placement, and so on.

One request returns everything that page needs, so each home loads in a
single round trip."""

from collections import Counter
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession
from app.models.connection import Connection
from app.models.opportunity import Application, Opportunity
from app.models.organization import Affiliation, Organization
from app.models.profile import Profile
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.home import HomeApplication, HomeOpening, HomeOut, HomePerson, HomeRole, Stat
from app.services import demo, network

router = APIRouter(prefix="/home", tags=["home"])

IN_REVIEW = ("reviewed", "shortlisted")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _open_now():
    return (Opportunity.status == "open") & (
        Opportunity.closes_at.is_(None) | (Opportunity.closes_at > _now())
    )


def _lower(items) -> set[str]:
    return {s.strip().lower() for s in items or [] if s and s.strip()}


async def _verified(db, user_id: UUID) -> list[tuple[str, Organization]]:
    rows = await db.execute(
        select(Affiliation.kind, Organization)
        .join(Organization, Organization.id == Affiliation.org_id)
        .where(Affiliation.user_id == user_id, Affiliation.status == "verified", Organization.status == "approved")
        .order_by(Affiliation.verified_at)
    )
    return [(k, o) for k, o in rows]


def roles_for(user: User, profile: Profile, verified: list[tuple[str, Organization]]) -> list[HomeRole]:
    """Every home this member can switch between, the most specific first.
    Verified roles win over the self-described member type."""
    kinds = {k for k, _ in verified}
    roles: list[HomeRole] = []
    if "recruiter" in kinds or profile.member_type == "industry":
        roles.append("employer")
    if "faculty" in kinds or profile.member_type == "academia":
        roles.append("campus")
    if profile.member_type == "mentor" or profile.open_to_mentor:
        roles.append("mentor")
    if "student" in kinds or profile.member_type == "student":
        roles.append("student")
    if profile.member_type == "member" or not roles:
        roles.append("seeker")
    if user.role == "admin":
        roles.insert(0, "admin")
    return list(dict.fromkeys(roles))


async def _opening(db, o: Opportunity, mine: set[str] = frozenset()) -> HomeOpening:
    org = await db.get(Organization, o.org_id) if o.org_id else None
    return HomeOpening(
        id=o.id, title=o.title, kind=o.kind, org_name=org.name if org else None, location=o.location,
        remote=o.remote, closes_at=o.closes_at, created_at=o.created_at, is_demo=o.is_synthetic,
        matched_skills=[s for s in o.skills_wanted or [] if s.strip().lower() in mine][:4],
    )


async def _applications(db, where, limit=6, with_person=False) -> list[HomeApplication]:
    rows = (
        await db.execute(
            select(Application, Opportunity)
            .join(Opportunity, Opportunity.id == Application.opportunity_id)
            .where(where)
            .order_by(Application.created_at.desc())
            .limit(limit)
        )
    ).all()
    people = await network.minis(db, {a.applicant_id for a, _ in rows}) if with_person else {}
    out = []
    for a, o in rows:
        org = await db.get(Organization, o.org_id) if o.org_id else None
        out.append(HomeApplication(
            id=a.id, opportunity_id=o.id, title=o.title, org_name=org.name if org else None,
            status=a.status, created_at=a.created_at, person=people.get(a.applicant_id),
        ))
    return out


async def _people(db, current, where, score, limit=5, note=None) -> list[HomePerson]:
    """Members matching `where`, ranked by `score(profile)` (zero drops out
    unless nothing scores), as small cards with a short note."""
    rows = list(
        await db.scalars(
            select(Profile)
            .join(User, User.id == Profile.user_id)
            .where(User.is_active.is_(True), Profile.user_id != current.id, where)
            .where(await demo.visible(db, current, User.is_synthetic))
            .limit(300)
        )
    )
    ranked = sorted(rows, key=lambda p: -score(p))
    if any(score(p) > 0 for p in ranked):
        ranked = [p for p in ranked if score(p) > 0]
    minis = await network.minis(db, [p.user_id for p in ranked[:limit]])
    return [HomePerson(person=minis[p.user_id], note=note(p) if note else None) for p in ranked[:limit] if p.user_id in minis]


async def _learner(db, current, profile, role) -> HomeOut:
    mine = _lower(profile.skills)
    city = (profile.location or "").split(",")[0].strip().lower()
    counts = Counter(
        s for (s,) in (await db.execute(select(Application.status).where(Application.applicant_id == current.id))).all()
    )
    applied_to = select(Application.opportunity_id).where(Application.applicant_id == current.id)
    candidates = list(
        await db.scalars(
            select(Opportunity)
            .where(_open_now(), Opportunity.id.not_in(applied_to), Opportunity.posted_by != current.id)
            .where(await demo.visible(db, current, Opportunity.is_synthetic))
            .order_by(Opportunity.created_at.desc())
            .limit(200)
        )
    )

    def fit(o: Opportunity) -> int:
        skills = len(_lower(o.skills_wanted) & mine)
        near = 1 if city and (o.remote or city in (o.location or "").lower()) else 0
        kind = 1 if role == "student" and o.kind in ("internship", "research") else 0
        return 3 * skills + near + kind

    candidates.sort(key=lambda o: -fit(o))
    mentors = await _people(
        db, current, Profile.open_to_mentor.is_(True),
        score=lambda p: len(_lower(p.skills) & mine) + 1,
        limit=4,
        note=lambda p: ", ".join(s for s in p.skills or [] if s.lower() in mine)[:60] or (p.headline or "")[:60],
    )
    return HomeOut(
        role=role, roles=[],
        stats=[
            Stat(label="Applied", value=sum(counts.values())),
            Stat(label="In review", value=sum(counts[s] for s in IN_REVIEW)),
            Stat(label="Offers", value=counts["accepted"]),
        ],
        openings=[await _opening(db, o, mine) for o in candidates[:5]],
        applications=await _applications(db, Application.applicant_id == current.id),
        people=mentors,
        people_title="Mentors who can help",
    )


async def _employer(db, current, verified) -> HomeOut:
    org_ids = [o.id for k, o in verified if k == "recruiter"]
    org_name = next((o.name for k, o in verified if k == "recruiter"), None)
    mine_q = or_(Opportunity.posted_by == current.id, Opportunity.org_id.in_(org_ids)) if org_ids else (Opportunity.posted_by == current.id)
    opps = list(await db.scalars(select(Opportunity).where(mine_q).order_by(Opportunity.created_at.desc()).limit(50)))
    ids = [o.id for o in opps]
    per = {}
    if ids:
        for oid, status, n in (await db.execute(
            select(Application.opportunity_id, Application.status, func.count())
            .where(Application.opportunity_id.in_(ids)).group_by(Application.opportunity_id, Application.status)
        )).all():
            per.setdefault(oid, Counter())[status] += n
    total = sum((c for c in per.values()), Counter())

    openings = []
    for o in sorted(opps, key=lambda o: (o.status != "open", -sum(per.get(o.id, Counter()).values())))[:6]:
        h = await _opening(db, o)
        h.applicants = sum(per.get(o.id, Counter()).values())
        h.new_applicants = per.get(o.id, Counter())["submitted"]
        openings.append(h)

    wanted = set().union(*(_lower(o.skills_wanted) for o in opps)) if opps else set()
    # Open to Work is shown to verified recruiters only, so only they get a
    # talent list filtered by it. Everyone else gets a skills match.
    where = Profile.open_to_work.is_(True) if org_ids else Profile.member_type.in_(("student", "member"))
    talent = await _people(
        db, current, where, score=lambda p: len(_lower(p.skills) & wanted), limit=5,
        note=lambda p: ", ".join(s for s in p.skills or [] if s.lower() in wanted)[:60] or (p.headline or "")[:60],
    )
    return HomeOut(
        role="employer", roles=[], org_name=org_name,
        stats=[
            Stat(label="Open roles", value=sum(1 for o in opps if o.status == "open")),
            Stat(label="Applicants", value=sum(total.values())),
            Stat(label="New to review", value=total["submitted"]),
            Stat(label="Shortlisted", value=total["shortlisted"]),
        ],
        openings=openings,
        applications=await _applications(db, Application.opportunity_id.in_(ids) & (Application.status == "submitted"), with_person=True) if ids else [],
        people=talent,
        people_title="Open to work and matching your roles" if org_ids else "People with the skills you hire for",
    )


async def _campus(db, current, verified) -> HomeOut:
    org = next((o for k, o in verified if k == "faculty"), None)
    if org is None:
        return HomeOut(role="campus", roles=[], people_title="Verify your university role to see your students")
    students = list(await db.scalars(
        select(Affiliation.user_id).where(
            Affiliation.org_id == org.id, Affiliation.kind == "student", Affiliation.status == "verified"
        )
    ))
    counts = {}
    if students:
        for uid, status in (await db.execute(
            select(Application.applicant_id, Application.status).where(Application.applicant_id.in_(students))
        )).all():
            counts.setdefault(uid, set()).add(status)
    applied = set(counts)
    idle = [u for u in students if u not in applied]
    minis = await network.minis(db, idle[:6])
    org_openings = list(await db.scalars(
        select(Opportunity).where(Opportunity.org_id == org.id).order_by(Opportunity.created_at.desc()).limit(5)
    ))
    return HomeOut(
        role="campus", roles=[], org_name=org.name,
        stats=[
            Stat(label="Verified students", value=len(students)),
            Stat(label="Have applied", value=len(applied)),
            Stat(label="In review", value=sum(1 for s in counts.values() if s & set(IN_REVIEW))),
            Stat(label="Offers", value=sum(1 for s in counts.values() if "accepted" in s)),
        ],
        openings=[await _opening(db, o) for o in org_openings],
        applications=await _applications(db, Application.applicant_id.in_(students), with_person=True) if students else [],
        people=[HomePerson(person=minis[u], note="No applications yet") for u in idle[:6] if u in minis],
        people_title="Students who haven't applied yet",
    )


async def _mentor(db, current, profile) -> HomeOut:
    linked = network.accepted_with(current.id)
    learners = await _people(
        db, current, Profile.user_id.in_(linked) & Profile.member_type.in_(("student", "member")),
        score=lambda p: len(_lower(p.skills) & _lower(profile.skills)) + 1, limit=6,
        note=lambda p: (p.headline or "")[:70],
    )
    written = await db.scalar(select(func.count()).select_from(Recommendation).where(Recommendation.author_id == current.id))
    return HomeOut(
        role="mentor", roles=[],
        stats=[
            Stat(label="Connections you can help", value=len(learners)),
            Stat(label="Recommendations written", value=written or 0),
        ],
        people=learners,
        people_title="Students and job seekers in your network",
    )


async def _admin(db, current) -> HomeOut:
    pending = await db.scalar(select(func.count()).select_from(Organization).where(Organization.status == "pending"))
    members = await db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True)))
    opening = await db.scalar(select(func.count()).select_from(Opportunity).where(_open_now()))
    apps = await db.scalar(select(func.count()).select_from(Application))
    links = await db.scalar(select(func.count()).select_from(Connection).where(Connection.status == "accepted"))
    return HomeOut(
        role="admin", roles=[],
        stats=[
            Stat(label="Organizations to review", value=pending or 0),
            Stat(label="Members", value=members or 0),
            Stat(label="Open opportunities", value=opening or 0),
            Stat(label="Applications", value=apps or 0),
            Stat(label="Connections", value=links or 0),
        ],
    )


@router.get("", response_model=HomeOut)
async def home(current: CurrentUser, db: DbSession, as_role: HomeRole | None = Query(None, alias="as")):
    profile = await db.scalar(select(Profile).where(Profile.user_id == current.id))
    verified = await _verified(db, current.id)
    roles = roles_for(current, profile, verified)
    role = as_role if as_role in roles else roles[0]
    if role == "employer":
        out = await _employer(db, current, verified)
    elif role == "campus":
        out = await _campus(db, current, verified)
    elif role == "mentor":
        out = await _mentor(db, current, profile)
    elif role == "admin":
        out = await _admin(db, current)
    else:
        out = await _learner(db, current, profile, role)
    out.roles = roles
    return out
