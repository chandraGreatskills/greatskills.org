from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.opportunity import Application, Opportunity
from app.models.organization import Organization
from app.models.profile import Profile, Resume
from app.services.affiliations import has_verified
from app.schemas.social import (
    ApplicationIn,
    ApplicationOut,
    OpportunityIn,
    OpportunityOut,
)

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.get("", response_model=list[OpportunityOut])
async def list_opportunities(
    db: DbSession,
    kind: str | None = None,
    q: str | None = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
):
    stmt = select(Opportunity).where(Opportunity.status == "open")
    if kind:
        stmt = stmt.where(Opportunity.kind == kind)
    if q:
        stmt = stmt.where(Opportunity.title.ilike(f"%{q}%"))
    stmt = stmt.order_by(Opportunity.created_at.desc()).limit(limit).offset(offset)
    rows = await db.scalars(stmt)
    return list(rows)


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
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Posting for an organization needs a verified role there")
        org = await db.get(Organization, payload.org_id)
        if not org or org.status != "approved":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    opp = Opportunity(posted_by=current.id, **payload.model_dump())
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return opp


@router.get("/{opp_id}", response_model=OpportunityOut)
async def get_opportunity(opp_id: UUID, db: DbSession):
    opp = await db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return opp


@router.post("/{opp_id}/apply", response_model=ApplicationOut, status_code=201)
async def apply(opp_id: UUID, payload: ApplicationIn, current: CurrentUser, db: DbSession):
    opp = await db.get(Opportunity, opp_id)
    if not opp or opp.status != "open":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Opportunity not open")

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
    await db.commit()
    await db.refresh(app_row)
    return app_row
