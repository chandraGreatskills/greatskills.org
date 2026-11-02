"""Achievers Plus: the paid tier. There's no billing yet, so members ask for
it and an admin switches it on. Plus buys help (resume feedback, mentor
sessions); it never changes how a member is ranked or treated in hiring."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select

from app.api.deps import AdminUser, DbSession, VerifiedUser
from app.models.user import User
from app.schemas.profile import MemberMini
from app.services import network
from app.services.notify import name_of, notify

router = APIRouter(tags=["plus"])


class PlusMember(BaseModel):
    person: MemberMini
    email: str
    is_plus: bool
    requested_at: datetime | None = None


@router.post("/plus/request", status_code=204)
async def request_plus(current: VerifiedUser, db: DbSession):
    if current.is_plus or current.plus_requested_at:
        return
    current.plus_requested_at = datetime.now(timezone.utc)
    who = await name_of(db, current.id)
    for admin_id in await db.scalars(select(User.id).where(User.role == "admin", User.is_active.is_(True))):
        notify(db, admin_id, "plus_request", f"{who} asked for Achievers Plus", "/admin", current.id)
    await db.commit()


@router.get("/admin/plus", response_model=list[PlusMember])
async def plus_members(_: AdminUser, db: DbSession):
    users = list(await db.scalars(
        select(User).where(or_(User.is_plus.is_(True), User.plus_requested_at.is_not(None)))
        .order_by(User.plus_requested_at.desc().nulls_last())
    ))
    minis = await network.minis(db, [u.id for u in users])
    return [
        PlusMember(person=minis[u.id], email=u.email, is_plus=u.is_plus, requested_at=u.plus_requested_at)
        for u in users if u.id in minis
    ]


@router.post("/admin/plus/{user_id}", status_code=204)
async def set_plus(user_id: UUID, _: AdminUser, db: DbSession, on: bool = Query(...)):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    user.is_plus = on
    user.plus_requested_at = None
    if on:
        notify(db, user.id, "plus_on", "Achievers Plus is on for your account. Resume feedback and mentor sessions are unlocked.", "/plus")
    await db.commit()


# --- Video creators: the members allowed to upload video files ---

class CreatorIn(BaseModel):
    email: str


@router.get("/admin/video-creators", response_model=list[PlusMember])
async def video_creators(_: AdminUser, db: DbSession):
    users = list(await db.scalars(select(User).where(User.can_upload_video.is_(True))))
    minis = await network.minis(db, [u.id for u in users])
    return [PlusMember(person=minis[u.id], email=u.email, is_plus=u.is_plus) for u in users if u.id in minis]


@router.post("/admin/video-creators", status_code=204)
async def add_video_creator(payload: CreatorIn, _: AdminUser, db: DbSession):
    user = await db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No member with that email")
    user.can_upload_video = True
    notify(db, user.id, "video_on", "You can now upload videos to your posts.", "/")
    await db.commit()


@router.delete("/admin/video-creators/{user_id}", status_code=204)
async def remove_video_creator(user_id: UUID, _: AdminUser, db: DbSession):
    user = await db.get(User, user_id)
    if user:
        user.can_upload_video = False
        await db.commit()
