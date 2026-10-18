"""Verified roles: who is really a student, faculty member or recruiter where.

A self-described member_type never earns a badge. A badge needs two things:
the member clicked a link sent to an address on the organization's email
domain, and the organization itself is approved. Everything that grants
trust (badges, posting for an organization, seeing Open to Work) asks this
module, so the rule can't drift between routes.
"""

from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Affiliation, Organization, OrgDomain

KINDS = ("student", "faculty", "recruiter")

# Which kind of organization each role belongs to. A student or professor
# claim on a company's domain (or the reverse) is refused.
ORG_TYPE_FOR = {"student": "academia", "faculty": "academia", "recruiter": "industry"}

# Anyone can open an account at these, so an address here proves nothing
# about where someone studies or works.
FREE_MAIL = {
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "yahoo.co.uk",
    "yahoo.ca", "ymail.com", "rocketmail.com", "outlook.com", "outlook.in", "hotmail.com",
    "hotmail.co.uk", "live.com", "live.in", "msn.com", "icloud.com", "me.com", "mac.com",
    "aol.com", "proton.me", "protonmail.com", "pm.me", "zoho.com", "zohomail.in",
    "yandex.com", "yandex.ru", "gmx.com", "gmx.net", "mail.com", "rediffmail.com",
    "tutanota.com", "tuta.io", "fastmail.com", "hey.com", "qq.com", "163.com",
}


def email_domain(email: str) -> str:
    return email.rsplit("@", 1)[-1].strip().lower().rstrip(".")


def is_free_mail(domain: str) -> bool:
    return domain in FREE_MAIL


def _candidates(domain: str) -> list[str]:
    """cs.mail.lakeview.edu -> [cs.mail.lakeview.edu, mail.lakeview.edu, lakeview.edu].
    Stops before the last label, so a bare "edu" never matches."""
    parts = domain.split(".")
    return [".".join(parts[i:]) for i in range(len(parts) - 1)]


async def org_for_domain(db: AsyncSession, domain: str) -> Organization | None:
    """The organization that owns this email domain or a parent of it. The
    longest (most specific) registered domain wins."""
    rows = (
        await db.execute(
            select(OrgDomain.domain, Organization)
            .join(Organization, Organization.id == OrgDomain.org_id)
            .where(OrgDomain.domain.in_(_candidates(domain)))
        )
    ).all()
    if not rows:
        return None
    return max(rows, key=lambda r: len(r[0]))[1]


async def unique_slug(db: AsyncSession, name: str) -> str:
    base = (slugify(name) or "organization")[:110]
    slug, n = base, 1
    while await db.scalar(select(Organization.id).where(Organization.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


async def verified_roles(db: AsyncSession, user_ids: list[UUID]) -> dict[UUID, list[dict]]:
    """Badges for many members in one query: {user_id: [{kind, org_name, org_slug}]}."""
    out: dict[UUID, list[dict]] = defaultdict(list)
    if not user_ids:
        return out
    rows = (
        await db.execute(
            select(Affiliation.user_id, Affiliation.kind, Organization.name, Organization.slug)
            .join(Organization, Organization.id == Affiliation.org_id)
            .where(
                Affiliation.user_id.in_(user_ids),
                Affiliation.status == "verified",
                Organization.status == "approved",
            )
            .order_by(Affiliation.verified_at)
        )
    ).all()
    for uid, kind, name, slug in rows:
        out[uid].append({"kind": kind, "org_name": name, "org_slug": slug})
    return out


async def has_verified(
    db: AsyncSession, user_id: UUID, kinds: tuple[str, ...], org_id: UUID | None = None
) -> bool:
    stmt = (
        select(Affiliation.id)
        .join(Organization, Organization.id == Affiliation.org_id)
        .where(
            Affiliation.user_id == user_id,
            Affiliation.kind.in_(kinds),
            Affiliation.status == "verified",
            Organization.status == "approved",
        )
    )
    if org_id is not None:
        stmt = stmt.where(Affiliation.org_id == org_id)
    return (await db.scalar(stmt.limit(1))) is not None
