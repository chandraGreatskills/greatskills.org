"""The bell: a member's notifications."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, update

from app.api.deps import CurrentUser, DbSession
from app.models.message import Notification
from app.schemas.profile import MemberMini
from app.services import network

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: UUID
    kind: str
    text: str
    link: str
    created_at: datetime
    read: bool
    actor: MemberMini | None = None


@router.get("", response_model=list[NotificationOut])
async def mine(current: CurrentUser, db: DbSession, limit: int = Query(30, ge=1, le=100), unread: bool = False):
    stmt = select(Notification).where(Notification.user_id == current.id)
    if unread:
        stmt = stmt.where(Notification.read_at.is_(None))
    rows = list(await db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit)))
    actors = await network.minis(db, {n.actor_id for n in rows if n.actor_id})
    return [
        NotificationOut(id=n.id, kind=n.kind, text=n.text, link=n.link, created_at=n.created_at,
                        read=n.read_at is not None, actor=actors.get(n.actor_id))
        for n in rows
    ]


@router.get("/unread-count")
async def unread_count(current: CurrentUser, db: DbSession):
    n = await db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == current.id, Notification.read_at.is_(None)
    ))
    return {"unread": n or 0}


@router.post("/read-all", status_code=204)
async def read_all(current: CurrentUser, db: DbSession):
    await db.execute(update(Notification).where(
        Notification.user_id == current.id, Notification.read_at.is_(None)
    ).values(read_at=datetime.now(timezone.utc)))
    await db.commit()


@router.post("/{note_id}/read", status_code=204)
async def read_one(note_id: UUID, current: CurrentUser, db: DbSession):
    n = await db.get(Notification, note_id)
    if n is None or n.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        await db.commit()
