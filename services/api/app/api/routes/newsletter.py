import logging

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.abuse import client_ip, over_limit
from app.api.deps import DbSession
from app.core.config import settings
from app.models.newsletter import NewsletterSubscriber
from app.schemas.newsletter import NewsletterIn
from app.services.email import send_signup_notification

logger = logging.getLogger("greatskills.newsletter")

router = APIRouter(prefix="/newsletter", tags=["newsletter"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def subscribe(payload: NewsletterIn, request: Request, db: DbSession):
    if payload.website:
        return {"ok": True}  # honeypot: look successful, store nothing

    ip = client_ip(request)
    if await over_limit("newsletter", ip, settings.contact_rate_per_hour):
        return JSONResponse(
            {"detail": "Too many signups from your network. Please try again in an hour."},
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    email = payload.email.lower()
    existing = await db.scalar(select(NewsletterSubscriber).where(NewsletterSubscriber.email == email))
    if existing:
        # Same answer either way, so the form can't be used to test who is subscribed.
        if existing.status != "subscribed":
            existing.status = "subscribed"
            await db.commit()
        return {"ok": True}

    sub = NewsletterSubscriber(
        email=email,
        source=payload.source,
        ip=ip,
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    try:
        await send_signup_notification(sub)
    except Exception:
        logger.exception("Subscriber %s saved, but the notification email failed", sub.id)
    return {"ok": True}
