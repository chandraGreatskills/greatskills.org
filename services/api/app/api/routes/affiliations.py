"""A member's verified roles: add one, confirm it from the emailed link,
resend the link, add one from the sign-up email, mark a student role as
graduated, or remove it."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from sqlalchemy import select

from app.api.abuse import client_ip, is_sim, over_limit
from app.api.deps import CurrentUser, DbSession, VerifiedUser
from app.core.config import settings
from app.core.security import new_secret, sha256
from app.models.organization import Affiliation, Organization, OrgDomain
from app.models.profile import Profile
from app.schemas.affiliation import (
    AffiliationIn,
    AffiliationOut,
    ConfirmAffiliationIn,
    FromAccountIn,
    RoleSuggestionOut,
)
from app.services.notify import ROLE_WORD, notify
from app.services import affiliations as aff
from app.services.disposable import MESSAGE as DISPOSABLE_MESSAGE
from app.services.disposable import is_disposable
from app.services.email import send_affiliation_email

router = APIRouter(prefix="/affiliations", tags=["affiliations"])

ACTIVE = ("email_sent", "awaiting_org", "verified")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    # SQLite hands back naive datetimes; Postgres keeps the zone.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _out(row: Affiliation, org: Organization) -> AffiliationOut:
    return AffiliationOut(
        id=row.id, kind=row.kind, email=row.email, status=row.status, org_name=org.name, org_slug=org.slug,
        org_status=org.status, verified_by=row.verified_by, verified_at=row.verified_at,
        created_at=row.created_at,
    )


def _slow_down() -> HTTPException:
    return HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Wait a while and try again.")


def _new_link(row: Affiliation) -> str:
    token = new_secret()
    row.token_hash = sha256(token)
    row.token_expires_at = _now() + timedelta(hours=settings.affiliation_token_ttl_hours)
    return token


async def _name(db, user_id: UUID) -> str | None:
    # Looked up before the response goes out: background tasks run after the
    # request's database session has closed.
    return await db.scalar(select(Profile.full_name).where(Profile.user_id == user_id))


@router.get("/me", response_model=list[AffiliationOut])
async def my_affiliations(current: CurrentUser, db: DbSession):
    rows = (
        await db.execute(
            select(Affiliation, Organization)
            .join(Organization, Organization.id == Affiliation.org_id)
            .where(Affiliation.user_id == current.id)
            .order_by(Affiliation.created_at)
        )
    ).all()
    return [_out(a, o) for a, o in rows]


@router.post("", response_model=AffiliationOut, status_code=201)
async def add_affiliation(
    payload: AffiliationIn, current: VerifiedUser, background: BackgroundTasks, db: DbSession
):
    if await over_limit("affiliation-add", str(current.id), 5):
        raise _slow_down()

    email = payload.email.strip().lower()
    domain = aff.email_domain(email)
    if aff.is_free_mail(domain):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Use your school or work email. Personal addresses like Gmail can't show where you study or work.",
        )
    if settings.block_disposable_email and is_disposable(domain):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, DISPOSABLE_MESSAGE)

    want_type = aff.ORG_TYPE_FOR[payload.kind]
    org = await aff.org_for_domain(db, domain)
    if org is not None:
        if org.is_synthetic != current.is_synthetic:
            # A demo organization's made-up domain, or a demo account trying a
            # real one. Either way it proves nothing.
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This address can't be used to verify a role.")
        if org.status == "rejected":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"{org.name} wasn't approved as an organization here, so roles there can't be verified. "
                "You can keep using Great Skills under your own name. If you think this is a mistake, "
                "write to us through the Contact page on the Great Skills website.",
            )
        if org.org_type != want_type:
            wrong = "a company" if org.org_type == "industry" else "a school or university"
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"This address belongs to {wrong}. Pick the role that matches it.",
            )
        mine = await db.scalar(
            select(Affiliation.id).where(
                Affiliation.user_id == current.id, Affiliation.org_id == org.id,
                Affiliation.kind == payload.kind, Affiliation.status.in_(ACTIVE),
            )
        )
        if mine:
            raise HTTPException(status.HTTP_409_CONFLICT, "You've already added this role.")
        other = {"student": "alumni", "alumni": "student"}.get(payload.kind)
        if other and await db.scalar(
            select(Affiliation.id).where(
                Affiliation.user_id == current.id, Affiliation.org_id == org.id,
                Affiliation.kind == other, Affiliation.status.in_(ACTIVE),
            )
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "You already have a student role here. Mark it as graduated instead."
                if other == "student" else "You're already verified as alumni here.",
            )
    else:
        if not payload.org_name or not payload.org_name.strip():
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "We don't know this email domain yet. Add the name of your school or company so our team can review it.",
            )
        org = Organization(
            name=payload.org_name.strip(),
            slug=await aff.unique_slug(db, payload.org_name),
            org_type=want_type,
            status="approved" if settings.org_auto_approve else "pending",
            created_by=current.id,
            is_synthetic=current.is_synthetic,
            sim_tag=current.sim_tag,
        )
        db.add(org)
        await db.flush()
        db.add(OrgDomain(org_id=org.id, domain=domain))

    # One proved address, one account. Unconfirmed claims by someone else
    # don't block it, or a stranger could squat on a colleague's address.
    taken = await db.scalar(
        select(Affiliation.id).where(
            Affiliation.email == email, Affiliation.user_id != current.id,
            Affiliation.email_confirmed_at.is_not(None), Affiliation.status.in_(ACTIVE),
        )
    )
    if taken:
        raise HTTPException(status.HTTP_409_CONFLICT, "This address is already linked to another account.")

    row = Affiliation(user_id=current.id, org_id=org.id, kind=payload.kind, email=email, status="email_sent")
    token = _new_link(row)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    background.add_task(send_affiliation_email, email, token, row.kind, org.name, await _name(db, current.id))
    return _out(row, org)


# Roles a sign-up address can prove on its own, by organization type.
ACCOUNT_KINDS = {"academia": ["student", "alumni", "faculty"], "industry": ["recruiter"]}


async def _account_offer(db, current) -> tuple[Organization | None, list[str]]:
    """The approved organization behind the member's own sign-up email and the
    roles they could still add there. Pending organizations are left to the
    Add a role form, so a one-click button can't fill the review queue."""
    domain = aff.email_domain(current.email)
    if aff.is_free_mail(domain) or is_disposable(domain):
        return None, []
    org = await aff.org_for_domain(db, domain)
    if org is None or org.status != "approved":
        return None, []
    taken = await db.scalar(
        select(Affiliation.id).where(
            Affiliation.email == current.email, Affiliation.user_id != current.id,
            Affiliation.email_confirmed_at.is_not(None), Affiliation.status.in_(ACTIVE),
        )
    )
    if taken:
        return None, []
    have = set(
        await db.scalars(
            select(Affiliation.kind).where(
                Affiliation.user_id == current.id, Affiliation.org_id == org.id,
                Affiliation.status.in_(ACTIVE),
            )
        )
    )
    # Student and alumni at the same school can't both stand.
    if have & {"student", "alumni"}:
        have |= {"student", "alumni"}
    return org, [k for k in ACCOUNT_KINDS.get(org.org_type, []) if k not in have]


@router.get("/suggestion", response_model=RoleSuggestionOut | None)
async def role_suggestion(current: VerifiedUser, db: DbSession):
    org, kinds = await _account_offer(db, current)
    if org is None or not kinds:
        return None
    return RoleSuggestionOut(org_name=org.name, org_type=org.org_type, kinds=kinds)


@router.post("/from-account", response_model=AffiliationOut, status_code=201)
async def add_from_account(payload: FromAccountIn, current: VerifiedUser, db: DbSession):
    """The sign-up email was confirmed when the member joined, so it proves
    the role without a second link. Only for approved organizations."""
    if await over_limit("affiliation-add", str(current.id), 5):
        raise _slow_down()
    org, kinds = await _account_offer(db, current)
    if org is None or payload.kind not in kinds:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Your sign-up email can't confirm this role. Use Add a role with your school or work email.",
        )
    now = _now()
    row = Affiliation(
        user_id=current.id, org_id=org.id, kind=payload.kind, email=current.email,
        status="verified", email_confirmed_at=now, verified_at=now, verified_by="account_email",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _out(row, org)


@router.post("/confirm")
async def confirm_affiliation(payload: ConfirmAffiliationIn, request: Request, db: DbSession):
    """Opened from the emailed link, often on another device (a work laptop),
    so it doesn't need the member to be signed in. The token is the proof."""
    if not is_sim(request) and await over_limit("affiliation-confirm", client_ip(request), 30):
        raise _slow_down()
    bad = HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired. Ask for a new one from your profile.")
    row = await db.scalar(select(Affiliation).where(Affiliation.token_hash == sha256(payload.token)))
    if row is None or row.status != "email_sent" or row.token_expires_at is None:
        raise bad
    if _aware(row.token_expires_at) <= _now():
        raise bad

    taken = await db.scalar(
        select(Affiliation.id).where(
            Affiliation.email == row.email, Affiliation.user_id != row.user_id,
            Affiliation.email_confirmed_at.is_not(None), Affiliation.status.in_(ACTIVE),
        )
    )
    if taken:
        raise HTTPException(status.HTTP_409_CONFLICT, "This address is already linked to another account.")

    org = await db.get(Organization, row.org_id)
    now = _now()
    row.token_hash = None
    row.token_expires_at = None
    row.email_confirmed_at = now
    if org.status == "approved":
        row.status = "verified"
        row.verified_at = now
        notify(db, row.user_id, "role_verified", f"You're verified as {ROLE_WORD.get(row.kind, row.kind)} at {org.name}", "/profile")
    elif org.status == "pending":
        row.status = "awaiting_org"
    else:
        row.status = "rejected"
    await db.commit()
    return {"status": row.status, "kind": row.kind, "org_name": org.name}


@router.post("/{aff_id}/resend", status_code=status.HTTP_204_NO_CONTENT)
async def resend_link(aff_id: UUID, current: VerifiedUser, background: BackgroundTasks, db: DbSession):
    if await over_limit("affiliation-resend", str(current.id), 5):
        raise _slow_down()
    row = await db.get(Affiliation, aff_id)
    if not row or row.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if row.status != "email_sent":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This address is already confirmed.")
    org = await db.get(Organization, row.org_id)
    token = _new_link(row)
    await db.commit()
    background.add_task(send_affiliation_email, row.email, token, row.kind, org.name, await _name(db, current.id))


@router.post("/{aff_id}/graduate", response_model=AffiliationOut)
async def mark_graduated(aff_id: UUID, current: CurrentUser, db: DbSession):
    """Turns a verified student role into alumni. No new email: the school
    address was proved while they studied, and graduates often lose it."""
    row = await db.get(Affiliation, aff_id)
    if not row or row.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if row.kind != "student" or row.status != "verified":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only a verified student role can be marked as graduated.")
    clash = await db.scalar(
        select(Affiliation.id).where(
            Affiliation.user_id == current.id, Affiliation.org_id == row.org_id,
            Affiliation.kind == "alumni", Affiliation.status.in_(ACTIVE),
        )
    )
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an alumni role here.")
    row.kind = "alumni"
    await db.commit()
    await db.refresh(row)
    return _out(row, await db.get(Organization, row.org_id))


@router.delete("/{aff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_affiliation(aff_id: UUID, current: CurrentUser, db: DbSession):
    row = await db.get(Affiliation, aff_id)
    if not row or row.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.delete(row)
    await db.commit()
