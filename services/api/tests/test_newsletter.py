import pytest
from sqlalchemy import select

from app.db.base import SessionLocal
from app.models.newsletter import NewsletterSubscriber

URL = "/api/v1/newsletter"


async def _rows():
    async with SessionLocal() as s:
        return (await s.scalars(select(NewsletterSubscriber))).all()


@pytest.fixture
def notified(monkeypatch):
    import app.api.routes.newsletter as routes

    calls = []

    async def fake(sub):
        calls.append(sub.email)

    monkeypatch.setattr(routes, "send_signup_notification", fake)
    return calls


@pytest.mark.asyncio
async def test_signup_saved_with_source_and_notified(client, notified):
    r = await client.post(URL, json={"email": "Lee@Example.com", "source": "/programs"})
    assert r.status_code == 201
    [row] = await _rows()
    assert (row.email, row.source, row.status) == ("lee@example.com", "/programs", "subscribed")
    assert notified == ["lee@example.com"]


@pytest.mark.asyncio
async def test_duplicate_signup_is_quiet_and_not_duplicated(client, notified):
    for _ in range(2):
        assert (await client.post(URL, json={"email": "lee@example.com"})).status_code == 201
    assert len(await _rows()) == 1
    assert notified == ["lee@example.com"]  # told once, not twice


@pytest.mark.asyncio
async def test_unsubscribed_person_can_resubscribe(client, notified):
    await client.post(URL, json={"email": "lee@example.com"})
    async with SessionLocal() as s:
        row = await s.scalar(select(NewsletterSubscriber))
        row.status = "unsubscribed"
        await s.commit()
    await client.post(URL, json={"email": "lee@example.com"})
    [row] = await _rows()
    assert row.status == "subscribed"


@pytest.mark.asyncio
async def test_honeypot_and_bad_email(client, notified):
    assert (await client.post(URL, json={"email": "bot@example.com", "website": "x"})).status_code == 201
    assert (await client.post(URL, json={"email": "nope"})).status_code == 422
    assert await _rows() == [] and notified == []
