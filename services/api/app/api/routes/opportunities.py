from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import and_, func, or_, select

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.api.routes.members import _like, card
from app.db.base import utcnow
from app.models.opportunity import Application, Opportunity, SavedOpportunity
from app.models.organization import Affiliation, Organization
from app.models.profile import Profile, Resume
from app.models.user import User
from app.services.notify import name_of, notify
from app.services import demo
from app.services.affiliations import has_verified, verified_roles
from app.services.storage import storage
from app.services.uploads import DOC_TYPES
from app.schemas.social import (
    ApplicantOut,
    ApplicationIn,
    ApplicationOut,
    ApplicationStatusIn,
    MyApplicationOut,
    OpportunityIn,
    OpportunityOut,
    OpportunityUpdate,
    OrgBrief,
    PosterBrief,
)

router = APIRouter(prefix="/opportunities", tags=["opportunities"])

CLOSING_SOON = timedelta(days=7)


def _aware(dt: datetime | None) -> datetime | None:
    """SQLite hands timestamps back without a zone; they are stored as UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _open_now():
    """Open means not closed by the poster and not past its closing date, so
    expired openings drop out on their own with no job to close them."""
    return (Opportunity.status == "open") & (
        Opportunity.closes_at.is_(None) | (Opportunity.closes_at > utcnow())
    )


def _is_open(opp: Opportunity) -> bool:
    closes = _aware(opp.closes_at)
    return opp.status == "open" and (closes is None or closes > utcnow())


async def _enrich(db, viewer, opps: list[Opportunity]) -> list[OpportunityOut]:
    """Add who posted it, for which organization, how many have applied, and
    where the viewer stands (saved, applied, their own)."""
    if not opps:
        return []
    ids = [o.id for o in opps]
    org_ids = {o.org_id for o in opps if o.org_id}
    orgs = {
        o.id: o
        for o in await db.scalars(
            select(Organization).where(Organization.id.in_(org_ids), Organization.status == "approved")
        )
    } if org_ids else {}
    posters = {
        p.user_id: p
        for p in await db.scalars(select(Profile).where(Profile.user_id.in_({o.posted_by for o in opps})))
    }
    counts = dict(
        (await db.execute(
            select(Application.opportunity_id, func.count())
            .where(Application.opportunity_id.in_(ids))
            .group_by(Application.opportunity_id)
        )).all()
    )
    saved: set[UUID] = set()
    applied: dict[UUID, str] = {}
    if viewer is not None:
        saved = set(
            await db.scalars(
                select(SavedOpportunity.opportunity_id).where(
                    SavedOpportunity.user_id == viewer.id, SavedOpportunity.opportunity_id.in_(ids)
                )
            )
        )
        applied = dict(
            (await db.execute(
                select(Application.opportunity_id, Application.status).where(
                    Application.applicant_id == viewer.id, Application.opportunity_id.in_(ids)
                )
            )).all()
        )

    out = []
    for o in opps:
        org = orgs.get(o.org_id)
        poster = posters.get(o.posted_by)
        out.append(
            OpportunityOut(
                id=o.id,
                title=o.title,
                kind=o.kind,
                location=o.location,
                remote=o.remote,
                description=o.description,
                skills_wanted=list(o.skills_wanted or []),
                pay=o.pay,
                eligibility=o.eligibility,
                closes_at=_aware(o.closes_at),
                org_id=o.org_id,
                posted_by=o.posted_by,
                status=o.status,
                created_at=_aware(o.created_at),
                is_demo=o.is_synthetic,
                is_open=_is_open(o),
                org=OrgBrief(name=org.name, slug=org.slug, logo_url=org.logo_url) if org else None,
                poster=PosterBrief(full_name=poster.full_name, handle=poster.handle, avatar_url=poster.avatar_url)
                if poster else None,
                applicants=counts.get(o.id, 0),
                mine=viewer is not None and o.posted_by == viewer.id,
                saved=o.id in saved,
                applied_status=applied.get(o.id),
            )
        )
    return out


async def _visible(db, viewer, opp_id: UUID) -> Opportunity:
    opp = await db.get(Opportunity, opp_id)
    if not opp or (opp.is_synthetic and not await demo.shows_demo(db, viewer)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return opp


async def _managed(db, current, opp_id: UUID) -> Opportunity:
    """An opening the current member may edit: their own, or any for admins.
    Anyone else gets a plain 404."""
    opp = await db.get(Opportunity, opp_id)
    if not opp or (opp.posted_by != current.id and current.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return opp


def _check_closing(closes_at: datetime | None) -> datetime | None:
    closes_at = _aware(closes_at)
    if closes_at is not None and closes_at <= utcnow():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The closing date has already passed")
    return closes_at


async def _why_not_org(db, user_id: UUID, org_id: UUID) -> str:
    """Say why someone can't post for an organization yet and what to do,
    based only on their own role there. Someone with no role at all learns
    nothing about the organization's review."""
    row = (await db.execute(
        select(Affiliation.status, Organization.name, Organization.status)
        .join(Organization, Organization.id == Affiliation.org_id)
        .where(
            Affiliation.user_id == user_id,
            Affiliation.org_id == org_id,
            Affiliation.kind.in_(("recruiter", "faculty")),
        )
        .order_by(Affiliation.created_at.desc())
        .limit(1)
    )).first()
    own_name = "You can post it under your own name now by leaving the organization off."
    if row is None:
        return (
            "Posting for an organization needs a verified faculty or recruiter role there. "
            "Add one under Verified roles on your profile using your school or work email. " + own_name
        )
    aff_status, name, org_status = row
    if aff_status == "email_sent":
        return f"Open the confirmation link we sent to your {name} email, then post again. {own_name}"
    if aff_status == "awaiting_org" or org_status == "pending":
        return (
            f"{name} is still waiting for our team to approve it, so posts can't carry its name yet. "
            f"{own_name} You can post for {name} once it's approved."
        )
    return f"Your role at {name} isn't verified, so you can't post for it. {own_name}"


@router.get("", response_model=list[OpportunityOut])
async def list_opportunities(
    db: DbSession,
    viewer: OptionalUser,
    kind: str | None = None,
    q: str | None = Query(None, max_length=100),
    location: str | None = Query(None, max_length=100),
    remote: bool | None = None,
    paid: bool | None = None,
    closing_soon: bool = False,
    saved: bool = False,
    mine: bool = False,
    sort: Literal["newest", "closing"] = "newest",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, le=5000),
):
    """Openings, newest first. mine=true lists the viewer's own postings,
    closed and expired included; everything else lists open ones only."""
    if (saved or mine) and viewer is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to see this")
    stmt = select(Opportunity).where(await demo.visible(db, viewer, Opportunity.is_synthetic))
    stmt = stmt.where(Opportunity.posted_by == viewer.id) if mine else stmt.where(_open_now())
    if kind:
        stmt = stmt.where(Opportunity.kind == kind)
    if q:
        like = _like(q)
        stmt = stmt.where(
            or_(Opportunity.title.ilike(like, escape="\\"), Opportunity.description.ilike(like, escape="\\"))
        )
    if location:
        stmt = stmt.where(Opportunity.location.ilike(_like(location), escape="\\"))
    if remote is not None:
        stmt = stmt.where(Opportunity.remote.is_(remote))
    if paid:
        stmt = stmt.where(Opportunity.pay.is_not(None) & (Opportunity.pay != ""))
    if closing_soon:
        stmt = stmt.where(Opportunity.closes_at.is_not(None), Opportunity.closes_at <= utcnow() + CLOSING_SOON)
    if saved:
        stmt = stmt.join(
            SavedOpportunity,
            and_(SavedOpportunity.opportunity_id == Opportunity.id, SavedOpportunity.user_id == viewer.id),
        )
    if sort == "closing":
        stmt = stmt.order_by(Opportunity.closes_at.is_(None), Opportunity.closes_at, Opportunity.id)
    else:
        stmt = stmt.order_by(Opportunity.created_at.desc(), Opportunity.id)
    rows = list(await db.scalars(stmt.limit(limit).offset(offset)))
    return await _enrich(db, viewer, rows)


@router.get("/count")
async def count_open(db: DbSession, viewer: OptionalUser, kind: str | None = None) -> dict[str, int]:
    """How many openings are open, for the home page. The list endpoint pages,
    so counting what it returned would undercount."""
    stmt = select(func.count()).select_from(Opportunity).where(
        _open_now(), await demo.visible(db, viewer, Opportunity.is_synthetic)
    )
    if kind:
        stmt = stmt.where(Opportunity.kind == kind)
    return {"open": await db.scalar(stmt) or 0}


@router.get("/applications/mine", response_model=list[MyApplicationOut])
async def my_applications(current: CurrentUser, db: DbSession):
    """Everything the member applied to, newest first, with its status."""
    rows = (await db.execute(
        select(Application, Opportunity)
        .join(Opportunity, Opportunity.id == Application.opportunity_id)
        .where(Application.applicant_id == current.id)
        .order_by(Application.created_at.desc())
    )).all()
    opps = {o.id: o for o in await _enrich(db, current, [o for _, o in rows])}
    return [
        MyApplicationOut(
            id=a.id,
            status=a.status,
            cover_note=a.cover_note,
            created_at=_aware(a.created_at),
            updated_at=_aware(a.updated_at),
            opportunity=opps[o.id],
        )
        for a, o in rows
    ]


@router.post("", response_model=OpportunityOut, status_code=201)
async def create_opportunity(payload: OpportunityIn, current: CurrentUser, db: DbSession):
    # Posting under an organization's name needs a verified recruiter or
    # faculty role there (confirmed work or school email, approved
    # organization), so no one can post a job that appears to come from a
    # university or employer they don't belong to. Admins may post for any
    # approved organization.
    if payload.org_id is not None:
        if current.role != "admin" and not await has_verified(
            db, current.id, ("recruiter", "faculty"), payload.org_id
        ):
            raise HTTPException(status.HTTP_403_FORBIDDEN, await _why_not_org(db, current.id, payload.org_id))
        org = await db.get(Organization, payload.org_id)
        if not org or org.status != "approved":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    closes_at = _check_closing(payload.closes_at)

    # The same poster listing the same title twice is almost always a double
    # submit or a copy-paste; edit or close the first one instead.
    title = payload.title.strip()
    dup = await db.scalar(
        select(Opportunity.id).where(
            Opportunity.posted_by == current.id,
            func.lower(Opportunity.title) == title.lower(),
            _open_now(),
        )
    )
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an open listing with this title")

    opp = Opportunity(
        posted_by=current.id,
        is_synthetic=current.is_synthetic,
        sim_tag=current.sim_tag,
        **payload.model_dump(exclude={"title", "closes_at"}),
        title=title,
        closes_at=closes_at,
    )
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return (await _enrich(db, current, [opp]))[0]


@router.get("/{opp_id}", response_model=OpportunityOut)
async def get_opportunity(opp_id: UUID, viewer: OptionalUser, db: DbSession):
    """One opening, closed ones included, so saved links and past
    applications still open to a page that says it has closed."""
    opp = await _visible(db, viewer, opp_id)
    return (await _enrich(db, viewer, [opp]))[0]


@router.patch("/{opp_id}", response_model=OpportunityOut)
async def update_opportunity(opp_id: UUID, payload: OpportunityUpdate, current: CurrentUser, db: DbSession):
    """Edit, close or reopen an opening. Poster or admin only."""
    opp = await _managed(db, current, opp_id)
    changes = payload.model_dump(exclude_unset=True)
    if "closes_at" in changes:
        changes["closes_at"] = _check_closing(changes["closes_at"])
    if "title" in changes:
        changes["title"] = changes["title"].strip()
    for field, value in changes.items():
        setattr(opp, field, value)
    await db.commit()
    await db.refresh(opp)
    return (await _enrich(db, current, [opp]))[0]


@router.put("/{opp_id}/save", status_code=204)
async def save_opportunity(opp_id: UUID, current: CurrentUser, db: DbSession):
    await _visible(db, current, opp_id)
    exists = await db.scalar(
        select(SavedOpportunity.id).where(
            SavedOpportunity.user_id == current.id, SavedOpportunity.opportunity_id == opp_id
        )
    )
    if not exists:
        db.add(SavedOpportunity(user_id=current.id, opportunity_id=opp_id))
        await db.commit()


@router.delete("/{opp_id}/save", status_code=204)
async def unsave_opportunity(opp_id: UUID, current: CurrentUser, db: DbSession):
    row = await db.scalar(
        select(SavedOpportunity).where(
            SavedOpportunity.user_id == current.id, SavedOpportunity.opportunity_id == opp_id
        )
    )
    if row:
        await db.delete(row)
        await db.commit()


@router.post("/{opp_id}/apply", response_model=ApplicationOut, status_code=201)
async def apply(opp_id: UUID, payload: ApplicationIn, current: CurrentUser, db: DbSession):
    opp = await db.get(Opportunity, opp_id)
    if not opp or not _is_open(opp) or (opp.is_synthetic and not await demo.shows_demo(db, current)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Opportunity not open")
    demo.same_world(current, opp.is_synthetic)
    if opp.posted_by == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't apply to your own listing")

    dup = await db.scalar(
        select(Application).where(
            (Application.opportunity_id == opp_id)
            & (Application.applicant_id == current.id)
        )
    )
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already applied")

    if payload.resume_id is not None:
        # Only your own resume can go with your application.
        owned = await db.scalar(
            select(Resume.id)
            .join(Profile, Profile.id == Resume.profile_id)
            .where(Resume.id == payload.resume_id, Profile.user_id == current.id)
        )
        if not owned:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")

    app_row = Application(
        opportunity_id=opp_id,
        applicant_id=current.id,
        cover_note=payload.cover_note,
        resume_id=payload.resume_id,
    )
    db.add(app_row)
    notify(db, opp.posted_by, "new_applicant", f"{await name_of(db, current.id)} applied to {opp.title}",
           f"/opportunities/{opp.id}", current.id)
    await db.commit()
    await db.refresh(app_row)
    return app_row


@router.get("/{opp_id}/applications", response_model=list[ApplicantOut])
async def applicants(opp_id: UUID, current: CurrentUser, db: DbSession):
    """Who applied, for the poster. Each applicant chose to send this poster
    their note and resume, so the poster sees those and the directory card,
    not the rest of the profile."""
    await _managed(db, current, opp_id)
    rows = (await db.execute(
        select(Application, Profile, User.is_synthetic, Resume.filename)
        .join(Profile, Profile.user_id == Application.applicant_id)
        .join(User, User.id == Application.applicant_id)
        .outerjoin(Resume, Resume.id == Application.resume_id)
        .where(Application.opportunity_id == opp_id)
        .order_by(Application.created_at.desc())
    )).all()
    roles = await verified_roles(db, [p.user_id for _, p, _, _ in rows])
    return [
        ApplicantOut(
            id=a.id,
            status=a.status,
            cover_note=a.cover_note,
            created_at=_aware(a.created_at),
            has_resume=filename is not None,
            resume_filename=filename,
            member=card(p, synthetic, roles.get(p.user_id, [])),
        )
        for a, p, synthetic, filename in rows
    ]


async def _application(db, current, opp_id: UUID, app_id: UUID) -> Application:
    await _managed(db, current, opp_id)
    app_row = await db.get(Application, app_id)
    if not app_row or app_row.opportunity_id != opp_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return app_row


@router.patch("/{opp_id}/applications/{app_id}", response_model=ApplicationOut)
async def set_application_status(
    opp_id: UUID, app_id: UUID, payload: ApplicationStatusIn, current: CurrentUser, db: DbSession
):
    app_row = await _application(db, current, opp_id, app_id)
    app_row.status = payload.status
    opp = await db.get(Opportunity, opp_id)
    word = {"reviewed": "was viewed", "shortlisted": "was shortlisted", "accepted": "was accepted",
            "rejected": "wasn't taken forward"}.get(payload.status, "was updated")
    notify(db, app_row.applicant_id, "application_status", f"Your application to {opp.title} {word}",
           f"/opportunities/{opp_id}", current.id)
    await db.commit()
    await db.refresh(app_row)
    return app_row


@router.get("/{opp_id}/applications/{app_id}/resume")
async def applicant_resume(opp_id: UUID, app_id: UUID, current: CurrentUser, db: DbSession):
    """The resume an applicant attached, for the poster only. Served the same
    way as the owner's own download: an attachment, never cached."""
    app_row = await _application(db, current, opp_id, app_id)
    resume = await db.get(Resume, app_row.resume_id) if app_row.resume_id else None
    data = await storage.open_private(resume.file_url) if resume else None
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No resume attached")
    ext = "." + resume.file_url.rsplit(".", 1)[-1].lower()
    return Response(
        content=data,
        media_type=DOC_TYPES.get(ext, "application/octet-stream"),
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(resume.filename)}",
            "Cache-Control": "private, no-store",
        },
    )
