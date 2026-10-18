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


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
