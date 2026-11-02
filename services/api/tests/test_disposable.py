"""Throwaway inboxes can't open an account or prove a role. Real personal
addresses (Gmail, Outlook) keep working, so a graduate without a school
email can still join."""

import pytest

from app.core.config import settings
from app.core.security import create_verify_token
from app.services.disposable import is_disposable

PREFIX = "/api/v1"


def _signup(email):
    return {"email": email, "password": "supersecret1", "full_name": "Test Person", "member_type": "student"}


def test_list_matches_known_throwaways_and_their_subdomains():
    assert is_disposable("mailinator.com")
    assert is_disposable("inbox.mailinator.com")
    assert is_disposable("MAILINATOR.COM.")
    assert not is_disposable("gmail.com")
    assert not is_disposable("outlook.com")
    assert not is_disposable("lakeview.edu")
    # A bare top-level label never matches on its own.
    assert not is_disposable("com")


@pytest.mark.asyncio
@pytest.mark.parametrize("email", ["bot@mailinator.com", "bot@x.guerrillamail.com", "Bot@10MinuteMail.com"])
async def test_signup_refuses_throwaway_inbox(client, email):
    r = await client.post(f"{PREFIX}/auth/register", json=_signup(email))
    assert r.status_code == 400
    assert "address you'll keep" in r.json()["detail"]
    assert not client.cookies.get("gs_access")


@pytest.mark.asyncio
async def test_refusal_does_not_reveal_whether_an_account_exists(client):
    # The throwaway check runs before the duplicate check, so probing with a
    # throwaway address says nothing about who is registered.
    r = await client.post(f"{PREFIX}/auth/register", json=_signup("someone@mailinator.com"))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_personal_email_still_signs_up(client):
    r = await client.post(f"{PREFIX}/auth/register", json=_signup("recent.grad@gmail.com"))
    assert r.status_code == 201, r.text


@pytest.mark.asyncio
async def test_block_can_be_switched_off(client, monkeypatch):
    monkeypatch.setattr(settings, "block_disposable_email", False)
    r = await client.post(f"{PREFIX}/auth/register", json=_signup("tester@mailinator.com"))
    assert r.status_code == 201, r.text


@pytest.mark.asyncio
async def test_role_email_refuses_throwaway_inbox(browser):
    u = browser()
    r = await u.post(f"{PREFIX}/auth/register", json=_signup("member@gmail.com"))
    assert r.status_code == 201, r.text
    token = create_verify_token(r.json()["id"], "member@gmail.com")
    assert (await u.post(f"{PREFIX}/auth/verify-email", json={"token": token})).status_code == 200

    r = await u.post(
        f"{PREFIX}/affiliations",
        json={"kind": "student", "email": "me@mailinator.com", "org_name": "Fake College"},
    )
    assert r.status_code == 400
    assert "address you'll keep" in r.json()["detail"]
