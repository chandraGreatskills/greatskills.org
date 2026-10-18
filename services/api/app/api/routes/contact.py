import logging

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.api.deps import DbSession
from app.core.config import settings
from app.models.contact import ContactInquiry
from app.schemas.contact import ContactIn
from app.services.email import send_contact_notification

logger = logging.getLogger("greatskills.contact")

router = APIRouter(prefix="/contact", tags=["contact"])


def _client_ip(request: Request) -> str | None:
    # nginx sets X-Real-IP; fall back to the socket peer in development.
    return request.headers.get("x-real-ip") or (request.client.host if request.client else None)


async def _over_limit(ip: str | None) -> bool:
    """Best-effort per-IP throttle in Redis. If Redis is unreachable, allow."""
    if not ip or settings.contact_rate_per_hour <= 0:
        return False
    try:
        import redis.asyncio as redis

        r = redis.from_url(settings.redis_url, socket_timeout=1)
        try:
            key = f"contact:{ip}"
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, 3600)
            return count > settings.contact_rate_per_hour
        finally:
            await r.aclose()
    except Exception:
        return False


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit(payload: ContactIn, request: Request, db: DbSession):
    if payload.website:
        # Honeypot tripped: look successful so the bot moves on, store nothing.
        return {"ok": True}

    ip = _client_ip(request)
    if await _over_limit(ip):
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
