"""Organization pages: universities and companies on Great Skills.

Only approved organizations have a page. Their verified staff (faculty and
recruiters) can edit it; members follow it to keep up with its openings.
Logged-out visitors see the page and its openings but not its people."""

from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.models.opportunity import Opportunity
from app.models.organization import Affiliation, Organization, OrgFollow
from app.models.user import User
from app.schemas.org import OrgCard, OrgOpening, OrgPageOut, OrgPerson, OrgUpdate
from app.services import demo, network
from app.services.storage import storage
from app.services.uploads import image_ext

router = APIRouter(prefix="/orgs", tags=["organizations"])

STAFF = ("faculty", "recruiter")


def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_") + "%"


async def _followers(db, org_ids) -> dict:
    if not org_ids:
        return {}
    rows = await db.execute(
        select(OrgFollow.org_id, func.count()).where(OrgFollow.org_id.in_(org_ids)).group_by(OrgFollow.org_id)
    )
    return dict(rows.all())


async def _following(db, viewer, org_ids) -> set:
    if viewer is None or not org_ids:
        return set()
    return set(await db.scalars(
        select(OrgFollow.org_id).where(OrgFollow.user_id == viewer.id, OrgFollow.org_id.in_(org_ids))
    ))


async def _cards(db, viewer, orgs) -> list[OrgCard]:
    ids = [o.id for o in orgs]
    counts, mine = await _followers(db, ids), await _following(db, viewer, ids)
    return [
        OrgCard(
            id=o.id, name=o.name, slug=o.slug, org_type=o.org_type, tagline=o.tagline, location=o.location,
            logo_url=o.logo_url, followers=counts.get(o.id, 0), following=o.id in mine, is_demo=o.is_synthetic,
        )
        for o in orgs
    ]


async def _can_edit(db, viewer, org) -> bool:
    if viewer is None:
        return False
    if viewer.role == "admin":
        return True
    return (await db.scalar(
        select(Affiliation.id).where(
            Affiliation.user_id == viewer.id, Affiliation.org_id == org.id,
            Affiliation.kind.in_(STAFF), Affiliation.status == "verified",
        ).limit(1)
    )) is not None


async def _visible_org(db, viewer, slug: str) -> Organization:
    """The organization, or 404 if this viewer shouldn't see it. Pending and
    rejected organizations have no public page."""
    org = await db.scalar(select(Organization).where(Organization.slug == slug))
    if org is None or (org.is_synthetic and not await demo.shows_demo(db, viewer)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    if org.status != "approved" and not (viewer and viewer.role == "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return org


@router.get("", response_model=list[OrgCard])
async def directory(
    viewer: OptionalUser,
    db: DbSession,
    q: str | None = Query(None, max_length=100),
    org_type: str | None = Query(None, alias="type"),
    limit: int = Query(30, ge=1, le=100),
):
    stmt = select(Organization).where(Organization.status == "approved").where(
        await demo.visible(db, viewer, Organization.is_synthetic)
    )
    if q:
        stmt = stmt.where(or_(Organization.name.ilike(_like(q), escape="\\"), Organization.tagline.ilike(_like(q), escape="\\")))
    if org_type in ("academia", "industry", "nonprofit", "government"):
        stmt = stmt.where(Organization.org_type == org_type)
    orgs = list(await db.scalars(stmt.order_by(Organization.name).limit(limit)))
    cards = await _cards(db, viewer, orgs)
    return sorted(cards, key=lambda c: (-c.followers, c.name))


@router.get("/following", response_model=list[OrgCard])
async def following(current: CurrentUser, db: DbSession):
    orgs = list(await db.scalars(
        select(Organization)
        .join(OrgFollow, OrgFollow.org_id == Organization.id)
        .where(OrgFollow.user_id == current.id, Organization.status == "approved")
        .order_by(Organization.name)
    ))
    return await _cards(db, current, orgs)


@router.get("/{slug}", response_model=OrgPageOut)
async def page(slug: str, viewer: OptionalUser, db: DbSession):
    org = await _visible_org(db, viewer, slug)
    card = (await _cards(db, viewer, [org]))[0]
    now = datetime.now(timezone.utc)
    openings = list(await db.scalars(
        select(Opportunity)
        .where(Opportunity.org_id == org.id, Opportunity.status == "open")
        .where(Opportunity.closes_at.is_(None) | (Opportunity.closes_at > now))
        .where(await demo.visible(db, viewer, Opportunity.is_synthetic))
        .order_by(Opportunity.created_at.desc()).limit(20)
    ))
    verified = (
        select(Affiliation.user_id, Affiliation.kind)
        .join(User, User.id == Affiliation.user_id)
        .where(Affiliation.org_id == org.id, Affiliation.status == "verified", User.is_active.is_(True))
        .where(await demo.visible(db, viewer, User.is_synthetic))
    )
    rows = (await db.execute(verified)).all()
    staff = [u for u, k in rows if k in STAFF]
    students = [u for u, k in rows if k == "student"]
    people = []
    if viewer is not None:
        # Staff first, then students; a short list, the full one belongs in search.
        chosen = [(u, k) for u, k in rows if k in STAFF][:8] + [(u, k) for u, k in rows if k == "student"][:8]
        minis = await network.minis(db, [u for u, _ in chosen])
        people = [OrgPerson(person=minis[u], kind=k) for u, k in chosen if u in minis]
    return OrgPageOut(
        **card.model_dump(),
        description=org.description, website=org.website,
        can_edit=await _can_edit(db, viewer, org),
        staff_count=len(staff), student_count=len(students),
        openings=[
            OrgOpening(id=o.id, title=o.title, kind=o.kind, location=o.location, remote=o.remote,
                       closes_at=o.closes_at, created_at=o.created_at)
            for o in openings
        ],
        people=people,
    )


async def _editable(db, current, slug) -> Organization:
    org = await _visible_org(db, current, slug)
    if not await _can_edit(db, current, org):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only verified staff of this organization can edit its page")
    return org


@router.patch("/{slug}", response_model=OrgPageOut)
async def update(slug: str, payload: OrgUpdate, current: CurrentUser, db: DbSession):
    org = await _editable(db, current, slug)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, field, (str(value) if field == "website" and value else value) or None)
    await db.commit()
    return await page(slug, current, db)


@router.post("/{slug}/logo", response_model=OrgPageOut)
async def upload_logo(slug: str, current: CurrentUser, db: DbSession, file: UploadFile = File(...)):
    org = await _editable(db, current, slug)
    data = await file.read()
    ext = image_ext(data)
    old = org.logo_url
    org.logo_url = await storage.save(data, ext, "logos")
    await db.commit()
    if old and old.startswith("/uploads/logos/"):
        await storage.delete(old)
    return await page(slug, current, db)


@router.put("/{slug}/follow", status_code=204)
async def follow(slug: str, current: CurrentUser, db: DbSession):
    org = await _visible_org(db, current, slug)
    if not await db.scalar(select(OrgFollow.id).where(OrgFollow.user_id == current.id, OrgFollow.org_id == org.id)):
        db.add(OrgFollow(user_id=current.id, org_id=org.id))
        await db.commit()


@router.delete("/{slug}/follow", status_code=204)
async def unfollow(slug: str, current: CurrentUser, db: DbSession):
    org = await _visible_org(db, current, slug)
    row = await db.scalar(select(OrgFollow).where(OrgFollow.user_id == current.id, OrgFollow.org_id == org.id))
    if row:
        await db.delete(row)
        await db.commit()
