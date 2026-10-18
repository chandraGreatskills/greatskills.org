"""Sessions, sign-out and password reset. Each test pins a promise made to
members: signing out really ends access, a stolen token gets cut off, and a
reset link works once."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, update

import app.api.routes.auth as auth_routes
from app.db.base import SessionLocal
from app.models.session import AuthSession, PasswordReset
from app.models.user import User

PREFIX = "/api/v1"
PW = "supersecret1"


@pytest.fixture
def mail(monkeypatch):
    """Capture the emails the auth routes send."""
    box = {"reset": [], "changed": []}

    async def reset(to, token, full_name=None):
        box["reset"].append((to, token))

    async def changed(to, full_name=None):
        box["changed"].append(to)

    monkeypatch.setattr(auth_routes, "send_password_reset_email", reset)
    monkeypatch.setattr(auth_routes, "send_password_changed_email", changed)
    return box


async def _signup(c, email="ana@example.com"):
    r = await c.post(f"{PREFIX}/auth/register", json={"email": email, "password": PW, "full_name": "Ana Rao"})
    assert r.status_code == 201, r.text
    return r


async def _signin(c, email="ana@example.com", password=PW):
    return await c.post(f"{PREFIX}/auth/login", json={"email": email, "password": password})


async def test_cookies_are_locked_down(client):
    r = await _signup(client)
    cookies = {h.split("=", 1)[0]: h for h in r.headers.get_list("set-cookie")}
    assert "HttpOnly" in cookies["gs_access"]
    assert "HttpOnly" in cookies["gs_refresh"] and "Path=/api/v1/auth" in cookies["gs_refresh"]
    # the page script has to read this one to copy it into the header
    assert "HttpOnly" not in cookies["gs_csrf"]
    for c in cookies.values():
        assert "SameSite=lax" in c or "samesite=lax" in c.lower()


async def test_changes_without_csrf_header_are_blocked(client):
    await _signup(client)
    r = await client.patch(f"{PREFIX}/profiles/me", json={"headline": "x"}, headers={"x-csrf-token": "wrong"})
    assert r.status_code == 403
    assert (await client.patch(f"{PREFIX}/profiles/me", json={"headline": "x"})).status_code == 200
    # reads don't need it
    assert (await client.get(f"{PREFIX}/auth/me", headers={"x-csrf-token": "wrong"})).status_code == 200


async def test_logout_ends_a_copied_access_token(client, browser):
    await _signup(client)
    stolen = client.cookies.get("gs_access")
    assert (await client.post(f"{PREFIX}/auth/logout")).status_code == 204

    thief = browser()
    thief.cookies.set("gs_access", stolen)
    assert (await thief.get(f"{PREFIX}/auth/me")).status_code == 401


async def test_refresh_rotates_and_a_replayed_token_kills_the_session(client, browser):
    await _signup(client)
    old_refresh = client.cookies.get("gs_refresh")
    assert (await client.post(f"{PREFIX}/auth/refresh")).status_code == 204
    assert client.cookies.get("gs_refresh") != old_refresh

    # Pretend the rotation happened a while ago, then replay the old token.
    async with SessionLocal() as db:
        await db.execute(update(AuthSession).values(rotated_at=datetime.now(timezone.utc) - timedelta(minutes=5)))
        await db.commit()
    thief = browser()
    thief.cookies.set("gs_refresh", old_refresh, path="/api/v1/auth")
    thief.cookies.set("gs_csrf", "t")
    r = await thief.post(f"{PREFIX}/auth/refresh", headers={"x-csrf-token": "t"})
    assert r.status_code == 401
    # ...and the real member is signed out too, because we can't tell who is who
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 401
    async with SessionLocal() as db:
        assert (await db.scalar(select(AuthSession.revoke_reason))) == "reuse"


async def test_two_tabs_refreshing_at_once_is_not_treated_as_theft(client, browser):
    await _signup(client)
    old_refresh, csrf = client.cookies.get("gs_refresh"), client.cookies.get("gs_csrf")
    assert (await client.post(f"{PREFIX}/auth/refresh")).status_code == 204
    other_tab = browser()
    other_tab.cookies.set("gs_refresh", old_refresh, path="/api/v1/auth")
    other_tab.cookies.set("gs_csrf", csrf)
    assert (await other_tab.post(f"{PREFIX}/auth/refresh")).status_code == 204
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 200


async def test_sign_out_everywhere_and_session_list(client, browser):
    await _signup(client)
    laptop = browser()
    assert (await _signin(laptop)).status_code == 200
    listed = (await client.get(f"{PREFIX}/auth/sessions")).json()
    assert len(listed) == 2 and sum(s["current"] for s in listed) == 1
    assert "ip" not in listed[0]

    other = next(s for s in listed if not s["current"])
    assert (await client.delete(f"{PREFIX}/auth/sessions/{other['id']}")).status_code == 204
    assert (await laptop.get(f"{PREFIX}/auth/me")).status_code == 401

    assert (await _signin(laptop)).status_code == 200
    assert (await laptop.post(f"{PREFIX}/auth/logout-all")).status_code == 204
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 401


async def test_change_password_signs_out_other_devices(client, browser, mail):
    await _signup(client)
    phone = browser()
    await _signin(phone)
    bad = await client.post(f"{PREFIX}/auth/change-password", json={"current_password": "nope", "new_password": "a-new-long-pass"})
    assert bad.status_code == 400
    r = await client.post(f"{PREFIX}/auth/change-password", json={"current_password": PW, "new_password": "a-new-long-pass"})
    assert r.status_code == 204
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 200
    assert (await phone.get(f"{PREFIX}/auth/me")).status_code == 401
    assert mail["changed"] == ["ana@example.com"]
    assert (await _signin(browser(), password="a-new-long-pass")).status_code == 200


async def test_forgot_password_answers_the_same_for_unknown_addresses(client, mail):
    await _signup(client)
    known = await client.post(f"{PREFIX}/auth/forgot-password", json={"email": "ana@example.com"})
    unknown = await client.post(f"{PREFIX}/auth/forgot-password", json={"email": "nobody@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert [to for to, _ in mail["reset"]] == ["ana@example.com"]


async def test_reset_link_works_once_and_ends_every_session(client, browser, mail):
    await _signup(client)
    await client.post(f"{PREFIX}/auth/forgot-password", json={"email": "ANA@example.com"})
    token = mail["reset"][0][1]

    weak = await client.post(f"{PREFIX}/auth/reset-password", json={"token": token, "new_password": "password"})
    assert weak.status_code == 422
    r = await client.post(f"{PREFIX}/auth/reset-password", json={"token": token, "new_password": "brand-new-pass"})
    assert r.status_code == 204
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 401
    again = await client.post(f"{PREFIX}/auth/reset-password", json={"token": token, "new_password": "another-pass-1"})
    assert again.status_code == 400
    assert (await _signin(browser(), password=PW)).status_code == 401
    assert (await _signin(browser(), password="brand-new-pass")).status_code == 200
    assert mail["changed"] == ["ana@example.com"]
    async with SessionLocal() as db:
        # only the hash is kept
        assert (await db.scalar(select(PasswordReset.token_hash))) != token


async def test_only_the_newest_reset_link_works_and_links_expire(client, mail):
    await _signup(client)
    for _ in range(2):
        await client.post(f"{PREFIX}/auth/forgot-password", json={"email": "ana@example.com"})
    first, second = mail["reset"][0][1], mail["reset"][1][1]
    assert (await client.post(f"{PREFIX}/auth/reset-password", json={"token": first, "new_password": "brand-new-pass"})).status_code == 400

    async with SessionLocal() as db:
        await db.execute(update(PasswordReset).values(expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)))
        await db.commit()
    assert (await client.post(f"{PREFIX}/auth/reset-password", json={"token": second, "new_password": "brand-new-pass"})).status_code == 400


async def test_weak_passwords_are_refused_at_sign_up(client):
    for pw in ("short1", "password123", "aaaaaaaaaa", "ana.rao.secure"):
        r = await client.post(f"{PREFIX}/auth/register",
                              json={"email": "ana.rao@example.com", "password": pw, "full_name": "Ana"})
        assert r.status_code == 422, pw


async def test_disabled_account_loses_access_immediately(client):
    await _signup(client)
    async with SessionLocal() as db:
        await db.execute(update(User).values(is_active=False))
        await db.commit()
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 401
    assert (await client.post(f"{PREFIX}/auth/refresh")).status_code == 401
