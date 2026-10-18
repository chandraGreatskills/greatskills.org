import pytest
from sqlalchemy import select

from app.db.base import SessionLocal
from app.models.contact import ContactInquiry

URL = "/api/v1/contact"


async def _rows():
    async with SessionLocal() as s:
        return (await s.scalars(select(ContactInquiry))).all()


@pytest.fixture
def notified(monkeypatch):
    import app.api.routes.contact as contact_routes

    calls = []

    async def fake(inquiry):
        calls.append(inquiry)

    monkeypatch.setattr(contact_routes, "send_contact_notification", fake)
    return calls


@pytest.mark.asyncio
async def test_inquiry_is_saved_and_notified(client, notified):
    r = await client.post(URL, json={
        "name": "  Ravi K  ", "email": "Ravi@Example.com", "phone": "+1 555 0100",
        "country": "Canada", "message": "Interested in the Data AI Scientist program.",
    }, headers={"X-Real-IP": "203.0.113.7"})
    assert r.status_code == 201

    rows = await _rows()
    assert len(rows) == 1
    row = rows[0]
    assert (row.name, row.email, row.country, row.status, row.ip) == (
        "Ravi K", "ravi@example.com", "Canada", "new", "203.0.113.7")
    assert len(notified) == 1 and notified[0].id == row.id


@pytest.mark.asyncio
async def test_honeypot_stores_nothing(client, notified):
    r = await client.post(URL, json={"name": "Bot", "email": "bot@example.com", "website": "spam.example"})
    assert r.status_code == 201
    assert await _rows() == [] and notified == []


@pytest.mark.asyncio
async def test_invalid_input_rejected(client, notified):
    assert (await client.post(URL, json={"name": "", "email": "x@example.com"})).status_code == 422
    assert (await client.post(URL, json={"name": "A", "email": "not-an-email"})).status_code == 422
    assert (await client.post(URL, json={"name": "A", "email": "a@example.com", "message": "x" * 5001})).status_code == 422
    assert await _rows() == []


@pytest.mark.asyncio
async def test_mail_failure_still_saves(client, monkeypatch):
    import app.api.routes.contact as contact_routes

    async def boom(inquiry):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(contact_routes, "send_contact_notification", boom)
    r = await client.post(URL, json={"name": "Ana", "email": "ana@example.com"})
    assert r.status_code == 201
    assert len(await _rows()) == 1


@pytest.mark.asyncio
async def test_rate_limit_blocks_after_limit(client, notified, monkeypatch):
    import app.api.routes.contact as contact_routes

    counts = {}

    async def fake_over_limit(bucket, ip, per_hour):
        counts[ip] = counts.get(ip, 0) + 1
        return counts[ip] > 2

    monkeypatch.setattr(contact_routes, "over_limit", fake_over_limit)
    body = {"name": "Ana", "email": "ana@example.com"}
    codes = [(await client.post(URL, json=body, headers={"X-Real-IP": "198.51.100.1"})).status_code for _ in range(3)]
    assert codes == [201, 201, 429]


@pytest.mark.asyncio
async def test_notification_email_content(monkeypatch):
    from app.core.config import settings
    from app.services import email as email_service

    sent = {}

    async def fake_send(to, subject, text, html=None, reply_to=None):
        sent.update(to=to, subject=subject, text=text, html=html, reply_to=reply_to)

    monkeypatch.setattr(settings, "notify_to", "team@example.com")
    monkeypatch.setattr(email_service, "send_email", fake_send)
    inquiry = ContactInquiry(name="<Ana>", email="ana@example.com", message="Hi\nthere", source="connect")
    await email_service.send_contact_notification(inquiry)

    assert sent["to"] == "team@example.com" and sent["reply_to"] == "ana@example.com"
    assert "New inquiry: <Ana>" == sent["subject"]
    assert "Hi\nthere" in sent["text"]
    assert "<Ana>" not in sent["html"] and "&lt;Ana&gt;" in sent["html"]
