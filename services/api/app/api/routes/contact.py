import logging

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.api.abuse import client_ip, over_limit
from app.api.deps import DbSession
from app.core.config import settings
from app.models.contact import ContactInquiry
from app.schemas.contact import ContactIn
from app.services.email import send_contact_notification

logger = logging.getLogger("greatskills.contact")

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit(payload: ContactIn, request: Request, db: DbSession):
    if payload.website:
        # Honeypot tripped: look successful so the bot moves on, store nothing.
        return {"ok": True}

    ip = client_ip(request)
    if await over_limit("contact", ip, settings.contact_rate_per_hour):
        return JSONResponse(
            {"detail": "Too many messages from your network. Please try again in an hour."},
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    inquiry = ContactInquiry(
        name=payload.name.strip(),
        email=payload.email.lower(),
        phone=(payload.phone or "").strip() or None,
        country=(payload.country or "").strip() or None,
        message=(payload.message or "").strip() or None,
        source=payload.source,
        ip=ip,
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
    )
    db.add(inquiry)
    await db.commit()
    await db.refresh(inquiry)

    # Saved first, so a mail failure never loses the inquiry.
    try:
        await send_contact_notification(inquiry)
    except Exception:
        logger.exception("Inquiry %s saved, but the notification email failed", inquiry.id)
    return {"ok": True}
