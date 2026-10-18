import os
import tempfile

# Uploads go to a throwaway folder, never the real uploads/ directory.
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="gs-test-uploads-")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENVIRONMENT"] = "development"
# No Redis in tests: the contact-form throttle must fail open.
os.environ["REDIS_URL"] = "redis://127.0.0.1:1/0"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base, engine
from app.main import app


def _browser() -> AsyncClient:
    """A client that behaves like the portal: keeps cookies, and copies the
    CSRF cookie into the X-CSRF-Token header the way the page script does."""
    c = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def add_csrf(request):
        token = c.cookies.get("gs_csrf")
        if token and "x-csrf-token" not in request.headers:
            request.headers["x-csrf-token"] = token

    c.event_hooks["request"] = [add_csrf]
    return c


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with _browser() as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def browser(client):
    """Factory for extra signed-in people in one test: each gets its own
    cookie jar, like separate browsers."""
    opened = []

    def make() -> AsyncClient:
        c = _browser()
        opened.append(c)
        return c

    yield make
    for c in opened:
        await c.aclose()
