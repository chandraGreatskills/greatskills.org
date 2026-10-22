"""Demo data: who sees the synthetic members, organizations and openings the
local simulation engine creates.

One admin setting decides it:

- off: nobody sees demo rows. The default, so a fresh database or a missing
  setting never shows them.
- admins: admins see them, for checking a demo before showing it.
- everyone: shown to all, always with a Demo badge so nobody mistakes a
  demo student or job for a real one.

Demo accounts themselves always see the demo world, so the engine can run
against a local database with the setting off.

Demo and real accounts never touch: no connection requests or applications
across the line, in either direction. Every route that lists or acts on
members or openings asks this module, so the rule can't drift between them.
"""

from __future__ import annotations

from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, delete, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connection import Connection
from app.models.opportunity import Application, Opportunity
from app.models.organization import Affiliation, Organization, OrgDomain
from app.models.profile import Education, Experience, Profile, Resume
from app.models.session import AuthSession, PasswordReset
from app.models.setting import SiteSetting
from app.models.user import User

DemoMode = Literal["off", "admins", "everyone"]
MODES: tuple[DemoMode, ...] = ("off", "admins", "everyone")
KEY = "demo_data"


async def demo_mode(db: AsyncSession) -> DemoMode:
    row = await db.scalar(select(SiteSetting).where(SiteSetting.key == KEY))
    mode = (row.value or {}).get("mode") if row else None
    return mode if mode in MODES else "off"


async def set_demo_mode(db: AsyncSession, mode: DemoMode) -> None:
    row = await db.scalar(select(SiteSetting).where(SiteSetting.key == KEY))
    if row is None:
        db.add(SiteSetting(key=KEY, value={"mode": mode}))
    else:
        row.value = {"mode": mode}


async def shows_demo(db: AsyncSession, viewer: User | None) -> bool:
    if viewer is not None and viewer.is_synthetic:
        return True
    mode = await demo_mode(db)
    if mode == "everyone":
        return True
    return mode == "admins" and viewer is not None and viewer.role == "admin"


async def visible(db: AsyncSession, viewer: User | None, flag: ColumnElement[bool]) -> ColumnElement[bool]:
    """A where-clause for a list query: every row when this viewer may see
    demo data, real rows only otherwise. flag is the table's is_synthetic."""
    return true() if await shows_demo(db, viewer) else flag.is_(False)


def same_world(actor: User, target_is_synthetic: bool) -> None:
    """Refuse an action that would cross between demo and real accounts."""
    if actor.is_synthetic != target_is_synthetic:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This is a demo profile, shown to give a feel for the network. It can't take requests or applications."
            if target_is_synthetic
            else "Demo accounts can't contact real members.",
        )


async def wipe(db: AsyncSession, tag: str | None = None) -> tuple[dict[str, int], list[str]]:
    """Delete demo rows, every one or one sim_tag's worth, and everything
    hanging off them. Real rows are never selected: each delete starts from
    is_synthetic. Returns counts, plus the uploaded files to remove once the
    caller has committed."""

    def tagged(model):
        cond = model.is_synthetic.is_(True)
        return cond & (model.sim_tag == tag) if tag else cond

    users = select(User.id).where(tagged(User))
    profiles = select(Profile.id).where(Profile.user_id.in_(users))
    opps = select(Opportunity.id).where(tagged(Opportunity))
    orgs = select(Organization.id).where(tagged(Organization))

    files = list(await db.scalars(select(Resume.file_url).where(Resume.profile_id.in_(profiles))))
    files += [
        url for url in await db.scalars(select(Profile.avatar_url).where(Profile.id.in_(profiles))) if url
    ]

    counts: dict[str, int] = {}

    async def run(name, stmt):
        counts[name] = (await db.execute(stmt)).rowcount or 0

    await run("applications", delete(Application).where(
        or_(Application.applicant_id.in_(users), Application.opportunity_id.in_(opps))))
    await run("connections", delete(Connection).where(
        or_(Connection.requester_id.in_(users), Connection.addressee_id.in_(users))))
    await run("affiliations", delete(Affiliation).where(
        or_(Affiliation.user_id.in_(users), Affiliation.org_id.in_(orgs))))
    for model in (Resume, Experience, Education):
        await db.execute(delete(model).where(model.profile_id.in_(profiles)))
    await run("opportunities", delete(Opportunity).where(tagged(Opportunity)))
    await db.execute(delete(Profile).where(Profile.user_id.in_(users)))
    for model in (AuthSession, PasswordReset):
        await db.execute(delete(model).where(model.user_id.in_(users)))
    await db.execute(delete(OrgDomain).where(OrgDomain.org_id.in_(orgs)))
    await run("organizations", delete(Organization).where(tagged(Organization)))
    await run("members", delete(User).where(tagged(User)))
    return counts, files
