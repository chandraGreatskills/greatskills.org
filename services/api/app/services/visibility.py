"""Who may see what on another member's profile.

Every read of someone else's profile goes through here, so the rules live in
one place and the routes can't drift apart. Defaults follow the profile
visibility mockup (docs/mockups/profile-visibility.html), cut back to what the
data model supports today:

- public (logged out, or email not yet verified): name, headline, photo,
  location, education, a short About, top three skills, and experience titles
  and companies only.
- member (verified, not connected) and connection: the full profile minus
  anything private.
- never shown to anyone but the owner: resumes, Open to Work, account email.
  Open to Work is meant for verified recruiters only, and there are no
  verified recruiters yet, so for now nobody else sees it.

Admins get the member view. Wider admin access waits for the reason-and-audit
log, so there is no unlogged back door in the meantime.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connection import Connection
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import EducationOut, ExperienceViewOut, ProfileViewOut

Relation = Literal["public", "member", "connection", "self"]

PUBLIC_BIO_CHARS = 200
PUBLIC_SKILLS = 3


async def relation_to(
    db: AsyncSession, viewer: User | None, owner_id: UUID
) -> Relation | None:
    """How the viewer relates to the profile owner. None means one of them has
    blocked the other, and the profile should look like it doesn't exist."""
    if viewer is None:
        return "public"
    if viewer.id == owner_id:
        return "self"

    rows = await db.scalars(
        select(Connection.status).where(
            or_(
                (Connection.requester_id == viewer.id) & (Connection.addressee_id == owner_id),
                (Connection.requester_id == owner_id) & (Connection.addressee_id == viewer.id),
            )
        )
    )
    statuses = set(rows)
    if "blocked" in statuses:
        return None
    if not viewer.is_verified:
        return "public"
    if "accepted" in statuses:
        return "connection"
    return "member"


def build_view(profile: Profile, rel: Relation) -> ProfileViewOut:
    """Shape a profile for a viewer who isn't its owner."""
    if rel == "self":
        raise ValueError("owners read their own profile through /profiles/me")

    if rel == "public":
        bio = profile.bio or None
        cut = bool(bio and len(bio) > PUBLIC_BIO_CHARS)
        if cut:
            bio = bio[:PUBLIC_BIO_CHARS].rsplit(" ", 1)[0] + "..."
        skills = list(profile.skills or [])
        return ProfileViewOut(
            viewer="public",
            id=profile.id,
            handle=profile.handle,
            full_name=profile.full_name,
            headline=profile.headline,
            avatar_url=profile.avatar_url,
            member_type=profile.member_type,
            location=profile.location,
            bio=bio,
            bio_truncated=cut,
            skills=skills[:PUBLIC_SKILLS],
            skills_truncated=len(skills) > PUBLIC_SKILLS,
            experiences=[
                ExperienceViewOut(id=e.id, title=e.title, company=e.company)
                for e in profile.experiences
            ],
            education=[EducationOut.model_validate(e) for e in profile.education],
        )

    return ProfileViewOut(
        viewer=rel,
        id=profile.id,
        user_id=profile.user_id,
        handle=profile.handle,
        full_name=profile.full_name,
        headline=profile.headline,
        avatar_url=profile.avatar_url,
        member_type=profile.member_type,
        location=profile.location,
        industry=profile.industry,
        bio=profile.bio,
        skills=list(profile.skills or []),
        interests=list(profile.interests or []),
        open_to_mentor=profile.open_to_mentor,
        experiences=[
            ExperienceViewOut(
                id=e.id,
                title=e.title,
                company=e.company,
                location=e.location,
                start_year=e.start_year,
                end_year=e.end_year,
                description=e.description,
            )
            for e in profile.experiences
        ],
        education=[EducationOut.model_validate(e) for e in profile.education],
    )
