"""Sponsored cards and Great Skills updates.

Sponsored cards are managed only by Great Skills admins, are always labeled
Sponsored, and are targeted by role alone (students, employers, campus
staff and so on). Views and clicks are counted in aggregate; nothing about
an individual member is recorded or shared with the sponsor."""

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import select, update

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.api.routes.home import _verified, roles_for
from app.models.post import Promotion, SiteUpdate
from app.models.profile import Profile
from app.services.storage import storage
from app.services.uploads import image_ext

router = APIRouter(tags=["promotions"])

Audience = Literal["all", "student", "seeker", "mentor", "employer", "campus"]


class PromotionOut(BaseModel):
    id: UUID
    sponsor: str
    title: str
    body: str
    image_url: str | None = None
    cta: str
    placement: str
    # Why the viewer sees it, in plain words.
    why: str


class PromotionAdmin(PromotionOut):
    link_url: str
    audience: str
    active: bool
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    impressions: int
    clicks: int


class PromotionIn(BaseModel):
    sponsor: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=1, max_length=400)
    link_url: HttpUrl
    cta: str = Field(default="Learn more", min_length=1, max_length=40)
    placement: Literal["rail", "feed"] = "rail"
    audience: Audience = "all"
    active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class UpdateIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    body: str | None = Field(default=None, max_length=400)
    link: HttpUrl | None = None
    published: bool = True


class UpdateOut(BaseModel):
    id: UUID
    title: str
    body: str | None = None
    link: str | None = None
    published: bool
    created_at: datetime


WHY = {
    "all": "Shown to all members",
    "student": "Shown to students",
    "seeker": "Shown to job seekers",
    "mentor": "Shown to mentors",
    "employer": "Shown to people who hire",
    "campus": "Shown to university staff",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _out(p: Promotion) -> PromotionOut:
    return PromotionOut(
        id=p.id, sponsor=p.sponsor, title=p.title, body=p.body, image_url=p.image_url, cta=p.cta,
        placement=p.placement, why=WHY.get(p.audience, WHY["all"]),
    )


def _admin(p: Promotion) -> PromotionAdmin:
    return PromotionAdmin(
        **_out(p).model_dump(), link_url=p.link_url, audience=p.audience, active=p.active,
        starts_at=p.starts_at, ends_at=p.ends_at, impressions=p.impressions, clicks=p.clicks,
    )


# --- For members ---

@router.get("/promotions", response_model=list[PromotionOut])
async def promotions(current: CurrentUser, db: DbSession, placement: Literal["rail", "feed"] = "rail"):
    """Sponsored cards for this member's roles, and counts one view each."""
    profile = await db.scalar(select(Profile).where(Profile.user_id == current.id))
    roles = roles_for(current, profile, await _verified(db, current.id)) if profile else []
    now = _now()
    rows = list(await db.scalars(
        select(Promotion).where(
            Promotion.active.is_(True), Promotion.placement == placement,
            Promotion.audience.in_(["all", *roles]),
            (Promotion.starts_at.is_(None)) | (Promotion.starts_at <= now),
            (Promotion.ends_at.is_(None)) | (Promotion.ends_at > now),
        ).order_by(Promotion.impressions).limit(2 if placement == "rail" else 3)
    ))
    if rows:
        await db.execute(update(Promotion).where(Promotion.id.in_([r.id for r in rows])).values(impressions=Promotion.impressions + 1))
        await db.commit()
    return [_out(r) for r in rows]


@router.post("/promotions/{promo_id}/click")
async def click(promo_id: UUID, current: CurrentUser, db: DbSession):
    """Counts a click and returns where to go. The sponsor learns only the total."""
    p = await db.get(Promotion, promo_id)
    if p is None or not p.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    p.clicks += 1
    await db.commit()
    return {"url": p.link_url}


@router.get("/updates", response_model=list[UpdateOut])
async def updates(current: CurrentUser, db: DbSession, limit: int = Query(4, ge=1, le=20)):
    rows = await db.scalars(
        select(SiteUpdate).where(SiteUpdate.published.is_(True)).order_by(SiteUpdate.created_at.desc()).limit(limit)
    )
    return [UpdateOut.model_validate(r, from_attributes=True) for r in rows]


# --- For admins ---

@router.get("/admin/promotions", response_model=list[PromotionAdmin])
async def list_promotions(_: AdminUser, db: DbSession):
    return [_admin(p) for p in await db.scalars(select(Promotion).order_by(Promotion.created_at.desc()))]


@router.post("/admin/promotions", response_model=PromotionAdmin, status_code=201)
async def create_promotion(payload: PromotionIn, _: AdminUser, db: DbSession):
    data = payload.model_dump()
    data["link_url"] = str(data["link_url"])
    p = Promotion(**data)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _admin(p)


@router.patch("/admin/promotions/{promo_id}", response_model=PromotionAdmin)
async def edit_promotion(promo_id: UUID, payload: PromotionIn, _: AdminUser, db: DbSession):
    p = await db.get(Promotion, promo_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    for k, v in payload.model_dump().items():
        setattr(p, k, str(v) if k == "link_url" else v)
    await db.commit()
    return _admin(p)


@router.post("/admin/promotions/{promo_id}/image", response_model=PromotionAdmin)
async def promotion_image(promo_id: UUID, _: AdminUser, db: DbSession, file: UploadFile = File(...)):
    p = await db.get(Promotion, promo_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    data = await file.read()
    old = p.image_url
    p.image_url = await storage.save(data, image_ext(data), "promos")
    await db.commit()
    if old and old.startswith("/uploads/promos/"):
        await storage.delete(old)
    return _admin(p)


@router.delete("/admin/promotions/{promo_id}", status_code=204)
async def delete_promotion(promo_id: UUID, _: AdminUser, db: DbSession):
    p = await db.get(Promotion, promo_id)
    if p:
        if p.image_url and p.image_url.startswith("/uploads/promos/"):
            await storage.delete(p.image_url)
        await db.delete(p)
        await db.commit()


@router.get("/admin/updates", response_model=list[UpdateOut])
async def list_updates(_: AdminUser, db: DbSession):
    return [UpdateOut.model_validate(r, from_attributes=True) for r in await db.scalars(select(SiteUpdate).order_by(SiteUpdate.created_at.desc()))]


@router.post("/admin/updates", response_model=UpdateOut, status_code=201)
async def create_update(payload: UpdateIn, current: AdminUser, db: DbSession):
    u = SiteUpdate(title=payload.title, body=payload.body, link=str(payload.link) if payload.link else None,
                   published=payload.published, created_by=current.id)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return UpdateOut.model_validate(u, from_attributes=True)


@router.delete("/admin/updates/{update_id}", status_code=204)
async def delete_update(update_id: UUID, _: AdminUser, db: DbSession):
    u = await db.get(SiteUpdate, update_id)
    if u:
        await db.delete(u)
        await db.commit()
