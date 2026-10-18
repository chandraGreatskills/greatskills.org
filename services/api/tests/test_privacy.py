"""Who can see what. Each test pins one rule from the profile visibility
design, so a later change that loosens a rule fails here first."""

import io
import zipfile
from uuid import UUID

import pytest
from sqlalchemy import select

from app.core.security import create_verify_token
from app.db.base import SessionLocal
from app.models.connection import Connection
from app.models.user import User

PREFIX = "/api/v1"
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
LONG_BIO = "Turns messy operational data into decisions people use. " * 10


async def _join(client, email, name, verify=True):
    r = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": email, "password": "supersecret1", "full_name": name, "member_type": "student"},
    )
    assert r.status_code == 201, r.text
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = (await client.get(f"{PREFIX}/auth/me", headers=h)).json()
    if verify:
        token = create_verify_token(me["id"], email)
        assert (await client.post(f"{PREFIX}/auth/verify-email", json={"token": token})).status_code == 200
    return h, me


async def _owner_with_data(client):
    h, me = await _join(client, "ana@example.com", "Ana Rao")
    await client.patch(
        f"{PREFIX}/profiles/me",
        headers=h,
        json={"bio": LONG_BIO, "skills": ["Python", "SQL", "ML", "Power BI"], "open_to_work": True,
              "interests": ["forecasting"]},
    )
    await client.post(
        f"{PREFIX}/profiles/me/experiences",
        headers=h,
        json={"title": "Analytics Intern", "company": "Brightline", "start_year": 2026,
              "description": "Built a churn dashboard"},
    )
    r = await client.post(f"{PREFIX}/profiles/me/resume", headers=h,
                          files={"file": ("cv.pdf", PDF, "application/pdf")})
    assert r.status_code == 201, r.text
    return h, me, r.json()


async def test_logged_out_view_is_minimal(client):
    _, me, _ = await _owner_with_data(client)
    r = await client.get(f"{PREFIX}/profiles/{me['profile']['handle']}")
    assert r.status_code == 200
    body = r.json()
    assert body["viewer"] == "public"
    assert body["bio_truncated"] and len(body["bio"]) <= 210
    assert body["skills"] == ["Python", "SQL", "ML"] and body["skills_truncated"]
    exp = body["experiences"][0]
    assert exp["title"] == "Analytics Intern" and exp["description"] is None and exp["start_year"] is None
    assert body["user_id"] is None and body["interests"] == []
    for leaked in ("resumes", "open_to_work", "email"):
        assert leaked not in body


async def test_unverified_member_gets_public_view(client):
    _, me, _ = await _owner_with_data(client)
    h2, _ = await _join(client, "new@example.com", "New Person", verify=False)
    body = (await client.get(f"{PREFIX}/profiles/{me['profile']['handle']}", headers=h2)).json()
    assert body["viewer"] == "public"


async def test_member_and_connection_views_hide_private_fields(client):
    _, me, _ = await _owner_with_data(client)
    h2, _ = await _join(client, "ravi@example.com", "Ravi Iyer")
    body = (await client.get(f"{PREFIX}/profiles/{me['profile']['handle']}", headers=h2)).json()
    assert body["viewer"] == "member"
    assert body["bio"] == LONG_BIO and len(body["skills"]) == 4
    assert body["experiences"][0]["description"] == "Built a churn dashboard"
    for leaked in ("resumes", "open_to_work", "email"):
        assert leaked not in body


async def test_connect_uses_user_id_and_connection_view(client):
    h1, me1, _ = await _owner_with_data(client)
    h2, me2 = await _join(client, "ravi@example.com", "Ravi Iyer")
    r = await client.post(f"{PREFIX}/connections", headers=h2, json={"addressee_id": me1["id"]})
    assert r.status_code == 201, r.text
    await client.post(f"{PREFIX}/connections/{r.json()['id']}/respond?accept=true", headers=h1)
    body = (await client.get(f"{PREFIX}/profiles/{me1['profile']['handle']}", headers=h2)).json()
    assert body["viewer"] == "connection"
    # a settled request can't be answered again
    again = await client.post(f"{PREFIX}/connections/{r.json()['id']}/respond?accept=false", headers=h1)
    assert again.status_code == 404


async def test_connect_to_unknown_member_is_404(client):
    h, me = await _join(client, "ravi@example.com", "Ravi Iyer")
    # a profile id is not a user id; this used to be accepted silently
    r = await client.post(f"{PREFIX}/connections", headers=h, json={"addressee_id": me["profile"]["id"]})
    assert r.status_code == 404


async def test_blocked_profile_looks_missing(client):
    _, me1, _ = await _owner_with_data(client)
    h2, me2 = await _join(client, "ravi@example.com", "Ravi Iyer")
    async with SessionLocal() as db:
        db.add(Connection(requester_id=UUID(me1["id"]), addressee_id=UUID(me2["id"]), status="blocked"))
        await db.commit()
    r = await client.get(f"{PREFIX}/profiles/{me1['profile']['handle']}", headers=h2)
    assert r.status_code == 404
    cards = (await client.get(f"{PREFIX}/members", headers=h2)).json()
    assert all(c["user_id"] != me1["id"] for c in cards)


async def test_directory_returns_cards_only_and_needs_verified_email(client):
    await _owner_with_data(client)
    h2, _ = await _join(client, "ravi@example.com", "Ravi Iyer")
    cards = (await client.get(f"{PREFIX}/members", headers=h2)).json()
    assert len(cards) == 1
    assert set(cards[0]) == {"id", "user_id", "handle", "full_name", "headline", "avatar_url",
                             "member_type", "location"}
    h3, _ = await _join(client, "new@example.com", "New Person", verify=False)
    assert (await client.get(f"{PREFIX}/members", headers=h3)).status_code == 403
    assert (await client.get(f"{PREFIX}/members")).status_code == 401


async def test_directory_wildcards_are_literal(client):
    await _owner_with_data(client)
    h2, _ = await _join(client, "ravi@example.com", "Ravi Iyer")
    assert (await client.get(f"{PREFIX}/members?q=%25", headers=h2)).json() == []


async def test_resume_is_not_served_statically(client):
    h, me, resume = await _owner_with_data(client)
    assert "file_url" not in resume
    async with SessionLocal() as db:
        from app.models.profile import Resume
        key = (await db.scalar(select(Resume.file_url)))
    assert not key.startswith("/uploads")
    assert (await client.get(f"/uploads/{key}")).status_code == 404


async def test_resume_download_is_owner_only(client):
    h, me, resume = await _owner_with_data(client)
    url = f"{PREFIX}/profiles/me/resumes/{resume['id']}/file"
    r = await client.get(url, headers=h)
    assert r.status_code == 200 and r.content == PDF
    assert r.headers["content-disposition"].startswith("attachment")
    assert r.headers["x-content-type-options"] == "nosniff"
    h2, _ = await _join(client, "ravi@example.com", "Ravi Iyer")
    assert (await client.get(url, headers=h2)).status_code == 404
    assert (await client.get(url)).status_code == 401


async def test_resume_delete_removes_file(client):
    h, me, resume = await _owner_with_data(client)
    assert (await client.delete(f"{PREFIX}/profiles/me/resumes/{resume['id']}", headers=h)).status_code == 204
    assert (await client.get(f"{PREFIX}/profiles/me/resumes/{resume['id']}/file", headers=h)).status_code == 404


async def test_uploads_are_checked_by_content(client):
    h, _ = await _join(client, "ana@example.com", "Ana Rao")
    html = b"<html><script>alert(1)</script></html>"
    r = await client.post(f"{PREFIX}/profiles/me/avatar", headers=h,
                          files={"file": ("me.png", html, "image/png")})
    assert r.status_code == 415
    r = await client.post(f"{PREFIX}/profiles/me/resume", headers=h,
                          files={"file": ("cv.pdf", html, "application/pdf")})
    assert r.status_code == 415
    # an image named .html is stored as .png, so it can never be served as a page
    r = await client.post(f"{PREFIX}/profiles/me/avatar", headers=h,
                          files={"file": ("x.html", PNG, "text/html")})
    assert r.status_code == 200 and r.json()["avatar_url"].endswith(".png")


async def test_macro_word_files_are_refused(client):
    h, _ = await _join(client, "ana@example.com", "Ana Rao")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", "<w/>")
        z.writestr("word/vbaProject.bin", "macro")
    r = await client.post(f"{PREFIX}/profiles/me/resume", headers=h,
                          files={"file": ("cv.docx", buf.getvalue(), "application/octet-stream")})
    assert r.status_code == 415


async def test_cannot_apply_with_someone_elses_resume(client):
    _, _, resume = await _owner_with_data(client)
    h2, _ = await _join(client, "ravi@example.com", "Ravi Iyer")
    opp = (await client.post(f"{PREFIX}/opportunities", headers=h2, json={"title": "Analyst"})).json()
    r = await client.post(f"{PREFIX}/opportunities/{opp['id']}/apply", headers=h2,
                          json={"resume_id": resume["id"]})
    assert r.status_code == 404


async def test_members_cannot_post_as_an_organization(client):
    h, _ = await _join(client, "ana@example.com", "Ana Rao")
    r = await client.post(f"{PREFIX}/opportunities", headers=h,
                          json={"title": "Lecturer", "org_id": "00000000-0000-0000-0000-000000000001"})
    assert r.status_code == 403


async def test_self_declared_role_is_limited_to_known_values(client):
    r = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "x@example.com", "password": "supersecret1", "full_name": "X", "member_type": "admin"},
    )
    assert r.status_code == 422
    async with SessionLocal() as db:
        assert await db.scalar(select(User).where(User.email == "x@example.com")) is None


async def test_production_refuses_default_secret():
    from app.core.config import Settings

    def prod(**kw):
        # _env_file=None: judge only what's passed, not a developer's local .env
        return Settings(_env_file=None, environment="production", **kw)

    with pytest.raises(RuntimeError):
        prod(database_url="postgresql+asyncpg://h/db").check_production()
    with pytest.raises(RuntimeError):
        prod(jwt_secret="x" * 40).check_production()
    prod(jwt_secret="x" * 40, database_url="postgresql+asyncpg://h/db").check_production()
