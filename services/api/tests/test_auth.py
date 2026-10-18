import pytest

PREFIX = "/api/v1"


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_login_me_flow(client):
    # register
    r = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": "jane@example.com",
            "password": "supersecret1",
            "full_name": "Jane Doe",
            "member_type": "student",
        },
    )
    assert r.status_code == 201, r.text
    # tokens travel in httpOnly cookies, never in the body
    assert "access_token" not in r.json()
    assert client.cookies.get("gs_access") and client.cookies.get("gs_csrf")

    # duplicate email rejected
    r2 = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "jane@example.com", "password": "supersecret1", "full_name": "J"},
    )
    assert r2.status_code == 409

    # login
    r3 = await client.post(
        f"{PREFIX}/auth/login",
        json={"email": "jane@example.com", "password": "supersecret1"},
    )
    assert r3.status_code == 200

    # bad password
    r4 = await client.post(
        f"{PREFIX}/auth/login",
        json={"email": "jane@example.com", "password": "wrong"},
    )
    assert r4.status_code == 401

    # me
    r5 = await client.get(f"{PREFIX}/auth/me")
    assert r5.status_code == 200
    body = r5.json()
    assert body["email"] == "jane@example.com"
    assert body["profile"]["handle"] == "jane-doe"

    # unauthenticated me
    client.cookies.clear()
    r6 = await client.get(f"{PREFIX}/auth/me")
    assert r6.status_code == 401


@pytest.mark.asyncio
async def test_profile_update_and_public_view(client):
    reg = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "ash@example.com", "password": "supersecret1", "full_name": "Ash Patel"},
    )
    assert reg.status_code == 201
    upd = await client.patch(
        f"{PREFIX}/profiles/me",
        json={"headline": "Data Scientist", "skills": ["python", "ml"], "open_to_work": True},
    )
    assert upd.status_code == 200
    assert upd.json()["headline"] == "Data Scientist"
    assert upd.json()["skills"] == ["python", "ml"]

    # public profile by handle, no auth needed
    client.cookies.clear()
    pub = await client.get(f"{PREFIX}/profiles/ash-patel")
    assert pub.status_code == 200
    assert pub.json()["headline"] == "Data Scientist"


@pytest.mark.asyncio
async def test_opportunities_flow(client):
    reg = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "rec@example.com", "password": "supersecret1", "full_name": "Rita Rec"},
    )
    assert reg.status_code == 201
    created = await client.post(
        f"{PREFIX}/opportunities",
        json={"title": "Junior Data Scientist", "kind": "employment", "remote": True},
    )
    assert created.status_code == 201

    listing = await client.get(f"{PREFIX}/opportunities")
    assert listing.status_code == 200
    assert any(o["title"] == "Junior Data Scientist" for o in listing.json())


@pytest.mark.asyncio
async def test_register_succeeds_in_production_without_email_backend(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "environment", "production")
    r = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "prod@example.com", "password": "s3cret-pass", "full_name": "Prod User"},
    )
    assert r.status_code == 201
    assert r.json()["email"] == "prod@example.com"


async def _register(client, monkeypatch, email="ver@example.com"):
    import app.api.routes.auth as auth_routes

    sent = []

    async def fake_send(to, token, full_name=None):
        sent.append((to, token))

    monkeypatch.setattr(auth_routes, "send_verification_email", fake_send)
    r = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": email, "password": "supersecret1", "full_name": "Ver User"},
    )
    assert r.status_code == 201
    return client.cookies.get("gs_access"), sent


@pytest.mark.asyncio
async def test_verify_email_flow(client, monkeypatch):
    access, sent = await _register(client, monkeypatch)
    assert len(sent) == 1
    token = sent[0][1]

    assert (await client.get(f"{PREFIX}/auth/me")).json()["is_verified"] is False
    r = await client.post(f"{PREFIX}/auth/verify-email", json={"token": token})
    assert r.status_code == 200
    assert (await client.get(f"{PREFIX}/auth/me")).json()["is_verified"] is True

    # clicking the link twice is harmless
    assert (await client.post(f"{PREFIX}/auth/verify-email", json={"token": token})).status_code == 200


@pytest.mark.asyncio
async def test_verify_token_cannot_log_in_and_access_token_cannot_verify(client, monkeypatch):
    access, sent = await _register(client, monkeypatch)
    verify = sent[0][1]

    client.cookies.clear()
    client.cookies.set("gs_access", verify)
    r = await client.get(f"{PREFIX}/auth/me")
    assert r.status_code == 401
    r = await client.post(f"{PREFIX}/auth/verify-email", json={"token": access})
    assert r.status_code == 400
    r = await client.post(f"{PREFIX}/auth/verify-email", json={"token": "garbage"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_resend_only_when_unverified(client, monkeypatch):
    access, sent = await _register(client, monkeypatch)

    assert (await client.post(f"{PREFIX}/auth/resend-verification")).status_code == 204
    assert len(sent) == 2
    await client.post(f"{PREFIX}/auth/verify-email", json={"token": sent[0][1]})
    await client.post(f"{PREFIX}/auth/resend-verification")
    assert len(sent) == 2


@pytest.mark.asyncio
async def test_smtp_send_in_production(monkeypatch):
    from app.core.config import settings
    from app.services import email as email_service

    delivered = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            delivered.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def login(self, user, password):
            delivered.append(("login", user))

        def send_message(self, msg):
            delivered.append(("send", msg["To"], msg["From"], msg))

    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_user", "no-reply@example.com")
    monkeypatch.setattr(settings, "smtp_password", "x")
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", FakeSMTP)

    await email_service.send_verification_email(
        "member@example.com", "TOKEN123", "<b>Ana</b> Lee"
    )

    assert delivered[0] == ("connect", "smtp.example.com", 465)
    kind, to, sender, msg = delivered[-1]
    assert (kind, to, sender) == ("send", "member@example.com", "no-reply@example.com")
    link = "https://achievers.greatskills.org/verify?token=TOKEN123"
    text = msg.get_body(preferencelist=("plain",)).get_content()
    html = msg.get_body(preferencelist=("html",)).get_content()
    assert link in text and "Hi <b>Ana</b>," in text
    assert link in html and "Confirm my email" in html
    # names are member-supplied: must be escaped in the HTML part
    assert "<b>" not in html


def test_verify_token_does_not_expose_email():
    import base64
    import json

    from app.core.security import create_verify_token

    token = create_verify_token("user-id", "Private@Example.com")
    payload = token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    assert "email" not in claims
    assert "example.com" not in json.dumps(claims).lower()
