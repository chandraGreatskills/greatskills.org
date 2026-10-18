"""Admin review of organizations and verified roles. Every endpoint needs an
admin account and answers 404 to anyone else."""

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select, update

from app.api.deps import AdminUser, DbSession
from app.models.organization import Affiliation, Organization, OrgDomain
from app.models.profile import Profile
from app.schemas.affiliation import AdminAffiliationOut, OrgReviewOut

router = APIRouter(prefix="/admin", tags=["admin"])


async def _org_out(db, org: Organization) -> OrgReviewOut:
    domains = list(await db.scalars(select(OrgDomain.domain).where(OrgDomain.org_id == org.id).order_by(OrgDomain.domain)))
    waiting = await db.scalar(
        select(func.count()).select_from(Affiliation).where(
            Affiliation.org_id == org.id, Affiliation.status == "awaiting_org"
        )
    )
    requested_by = None
    if org.created_by:
        requested_by = await db.scalar(select(Profile.full_name).where(Profile.user_id == org.created_by))
    return OrgReviewOut(
        id=org.id, name=org.name, slug=org.slug, org_type=org.org_type, status=org.status,
        domains=domains, created_at=org.created_at, waiting=waiting or 0, requested_by=requested_by,
    )


async def _org(db, org_id: UUID) -> Organization:
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return org


@router.get("/organizations", response_model=list[OrgReviewOut])
async def list_organizations(
    _: AdminUser,
    db: DbSession,
    status_filter: Literal["pending", "approved", "rejected"] = Query("pending", alias="status"),
    limit: int = Query(50, ge=1, le=200),
):
    orgs = await db.scalars(
        select(Organization).where(Organization.status == status_filter)
        .order_by(Organization.created_at).limit(limit)
    )
    return [await _org_out(db, o) for o in orgs]


@router.post("/organizations/{org_id}/approve", response_model=OrgReviewOut)
async def approve_organization(org_id: UUID, _: AdminUser, db: DbSession):
    org = await _org(db, org_id)
    org.status = "approved"
    # Everyone who already proved an address here gets their badge now.
    await db.execute(
        update(Affiliation)
        .where(Affiliation.org_id == org.id, Affiliation.status == "awaiting_org")
        .values(status="verified", verified_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return await _org_out(db, org)


@router.post("/organizations/{org_id}/reject", response_model=OrgReviewOut)
async def reject_organization(org_id: UUID, _: AdminUser, db: DbSession):
    org = await _org(db, org_id)
    org.status = "rejected"
    await db.execute(
        update(Affiliation)
        .where(Affiliation.org_id == org.id, Affiliation.status.in_(("email_sent", "awaiting_org", "verified")))
        .values(status="rejected", token_hash=None, token_expires_at=None)
    )
    await db.commit()
    return await _org_out(db, org)


@router.get("/organizations/{org_id}/affiliations", response_model=list[AdminAffiliationOut])
async def organization_members(org_id: UUID, _: AdminUser, db: DbSession):
    await _org(db, org_id)
    rows = (
        await db.execute(
            select(Affiliation, Profile.full_name, Profile.handle)
            .join(Profile, Profile.user_id == Affiliation.user_id)
            .where(Affiliation.org_id == org_id)
            .order_by(Affiliation.created_at)
        )
    ).all()
    return [
        AdminAffiliationOut(
            id=a.id, kind=a.kind, email=a.email, status=a.status,
            member_name=name, member_handle=handle, created_at=a.created_at,
        )
        for a, name, handle in rows
    ]


@router.post("/affiliations/{aff_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_affiliation(aff_id: UUID, _: AdminUser, db: DbSession):
    row = await db.get(Affiliation, aff_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    row.status = "revoked"
    row.token_hash = None
    row.token_expires_at = None
    await db.commit()
