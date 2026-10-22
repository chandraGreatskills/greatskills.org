"""Endpoints for the local simulation engine, which fills a development
database with demo universities, employers and students and then uses the
site through the normal API, like people would.

Mounted only in development with SIM_TOKEN set, and every call must carry
that token. Everything made here is flagged is_synthetic and lives on .example
addresses, which never receive mail, so none of it can be mistaken for a real
member or reach a real inbox."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.api.abuse import is_sim
from app.api.deps import DbSession
from app.core.security import hash_password
from app.models.opportunity import Opportunity
from app.models.organization import Organization, OrgDomain
from app.models.profile import Profile
from app.models.user import User
from app.schemas.sim import SimAccountIn, SimAccountOut, SimMail, SimOrgIn, SimOrgOut, SimWipeOut
from app.services import affiliations as aff
from app.services import demo
from app.services.email import DEV_OUTBOX
from app.services.storage import storage
from app.utils import unique_handle


def _require_sim(request: Request) -> None:
    if not is_sim(request):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


router = APIRouter(prefix="/sim", tags=["sim"], dependencies=[Depends(_require_sim)])


@router.post("/accounts", response_model=list[SimAccountOut])
async def create_accounts(payload: list[SimAccountIn], db: DbSession):
    """Create demo accounts, or return the ones that already exist, so the
    engine can rerun a world without duplicates."""
    if len(payload) > 500:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At most 500 accounts per call")
    out = []
    for a in payload:
        user = await db.scalar(select(User).where(User.email == a.email))
        if user is not None:
            if not user.is_synthetic:
                raise HTTPException(status.HTTP_409_CONFLICT, f"{a.email} belongs to a real account")
            handle = await db.scalar(select(Profile.handle).where(Profile.user_id == user.id))
            out.append(SimAccountOut(id=user.id, email=user.email, handle=handle or "", created=False))
            continue
        user = User(
            email=a.email,
            password_hash=hash_password(a.password),
            is_verified=a.verified,
            role="admin" if a.admin else "member",
            is_synthetic=True,
            sim_tag=a.tag,
        )
        db.add(user)
        await db.flush()
        handle = await unique_handle(db, a.full_name)
        db.add(Profile(user_id=user.id, handle=handle, full_name=a.full_name, member_type=a.member_type))
        await db.flush()
        out.append(SimAccountOut(id=user.id, email=user.email, handle=handle, created=True))
    await db.commit()
    return out


@router.post("/organizations", response_model=SimOrgOut)
async def create_organization(payload: SimOrgIn, db: DbSession):
    """A demo university or employer that owns its .example email domains, so
    demo members can verify a role there through the normal flow."""
    for domain in payload.domains:
        org = await aff.org_for_domain(db, domain)
        if org is not None:
            if not org.is_synthetic:
                raise HTTPException(status.HTTP_409_CONFLICT, f"{domain} belongs to a real organization")
            return SimOrgOut(id=org.id, name=org.name, slug=org.slug, status=org.status, created=False)
    org = Organization(
        name=payload.name,
        slug=await aff.unique_slug(db, payload.name),
        org_type=payload.org_type,
        status="approved" if payload.approved else "pending",
        website=payload.website,
        location=payload.location,
        description=payload.description,
        is_synthetic=True,
        sim_tag=payload.tag,
    )
    db.add(org)
    await db.flush()
    for domain in payload.domains:
        db.add(OrgDomain(org_id=org.id, domain=domain))
    await db.commit()
    return SimOrgOut(id=org.id, name=org.name, slug=org.slug, status=org.status, created=True)


@router.get("/mailbox", response_model=list[SimMail])
async def mailbox(to: str = Query(max_length=320), after: int = Query(0, ge=0)):
    """Mail sent to one demo address, oldest first. `after` skips that many,
    so the engine can poll for only what's new."""
    to = to.strip().lower()
    return [m for m in DEV_OUTBOX if m["to"] == to][after:]


@router.get("/status")
async def sim_status(db: DbSession):
    """Demo rows per tag, and the current demo setting."""
    out: dict[str, dict[str, int]] = {}
    for name, model in (("members", User), ("organizations", Organization), ("opportunities", Opportunity)):
        rows = await db.execute(
            select(model.sim_tag, func.count()).where(model.is_synthetic.is_(True)).group_by(model.sim_tag)
        )
        for tag, n in rows:
            out.setdefault(tag or "", {})[name] = n
    return {"demo_mode": await demo.demo_mode(db), "tags": out}


@router.delete("/data", response_model=SimWipeOut)
async def wipe_data(db: DbSession, tag: str | None = Query(None, max_length=64)):
    """Delete demo data: one tag's worth, or all of it with no tag."""
    counts, files = await demo.wipe(db, tag)
    await db.commit()
    for key in files:
        await storage.delete(key)
    return SimWipeOut(counts=counts)
