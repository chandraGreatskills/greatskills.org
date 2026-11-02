"""Creating notifications. Callers add them to the same transaction as the
action that caused them, so a notification never exists for something that
didn't happen."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Notification


def notify(db: AsyncSession, user_id: UUID, kind: str, text: str, link: str, actor_id: UUID | None = None) -> None:
    """Queue a notification. Nobody is notified about their own actions."""
    if actor_id is not None and actor_id == user_id:
        return
    db.add(Notification(user_id=user_id, kind=kind, text=text[:300], link=link[:300], actor_id=actor_id))


async def name_of(db: AsyncSession, user_id: UUID) -> str:
    from sqlalchemy import select

    from app.models.profile import Profile

    return await db.scalar(select(Profile.full_name).where(Profile.user_id == user_id)) or "Someone"


async def handle_of(db: AsyncSession, user_id: UUID) -> str:
    from sqlalchemy import select

    from app.models.profile import Profile

    return await db.scalar(select(Profile.handle).where(Profile.user_id == user_id)) or ""


# How a verified role reads in a sentence: "verified as a student at ...".
ROLE_WORD = {"student": "a student", "faculty": "faculty", "recruiter": "hiring"}
