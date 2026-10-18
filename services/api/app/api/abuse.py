"""Shared protection for public, unauthenticated forms."""

from fastapi import Request

from app.core.config import settings


def client_ip(request: Request) -> str | None:
    # nginx sets X-Real-IP; fall back to the socket peer in development.
    return request.headers.get("x-real-ip") or (request.client.host if request.client else None)


async def over_limit(bucket: str, ip: str | None, per_hour: int) -> bool:
    """Best-effort per-IP throttle in Redis. If Redis is unreachable, allow."""
    if not ip or per_hour <= 0:
        return False
    try:
        import redis.asyncio as redis

        r = redis.from_url(settings.redis_url, socket_timeout=1)
        try:
            key = f"{bucket}:{ip}"
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, 3600)
            return count > per_hour
        finally:
            await r.aclose()
    except Exception:
        return False
