"""Demo data from the simulation engine. Each test pins one rule: who sees
demo rows under each setting, that demo and real accounts never touch, and
that the engine's endpoints stay locked and leave real data alone."""

import pytest

from app.core.config import settings
from app.services.email import DEV_OUTBOX
from tests.test_affiliations import _admin, _join

PREFIX = "/api/v1"
SIM = {"x-sim-token": "test-sim-token"}
PASSWORD = "demo-password-1"


@pytest.fixture(autouse=True)
def _empty_outbox():
    DEV_OUTBOX.clear()


async def _sim_accounts(client, *people, tag="world-a", verified=True):
    body = [
        {"email": email, "password": PASSWORD, "full_name": name, "member_type": "student",
         "verified": verified, "tag": tag}
        for email, name in people
    ]
    r = await client.post(f"{PREFIX}/sim/accounts", json=body, headers=SIM)
    assert r.status_code == 200, r.text
    return r.json()


async def _sign_in(browser, email):
    c = browser()
    r = await c.post(f"{PREFIX}/auth/login", json={"email": email, "password": PASSWORD}, headers=SIM)
    assert r.status_code == 200, r.text
    return c


async def _set_mode(admin, mode):
    r = await admin.put(f"{PREFIX}/admin/settings/demo", json={"mode": mode})
    assert r.status_code == 200, r.text
    return r.json()


async def _world(client, browser):
    """One real member, one admin, and a demo student with a demo opening."""
    real, _ = await _join(browser, "real@lakeview.edu", "Real Student")
    admin = await _admin(browser)
    [demo] = await _sim_accounts(client, ("ava@northfield.sim.example", "Ava Demo"))
    d = await _sign_in(browser, "ava@northfield.sim.example")
    r = await d.post(f"{PREFIX}/opportunities", json={"title": "Demo research assistant", "kind": "research"})
    assert r.status_code == 201, r.text
    assert r.json()["is_demo"] is True
    return real, admin, d, demo, r.json()["id"]


async def _names(c):
    r = await c.get(f"{PREFIX}/members")
    assert r.status_code == 200, r.text
    return {m["full_name"]: m["is_demo"] for m in r.json()}


async def _titles(c):
    return {o["title"] for o in (await c.get(f"{PREFIX}/opportunities")).json()}


async def test_sim_endpoints_need_the_token(client):
    r = await client.post(f"{PREFIX}/sim/accounts", json=[])
    assert r.status_code == 404
    r = await client.post(f"{PREFIX}/sim/accounts", json=[], headers={"x-sim-token": "wrong"})
    assert r.status_code == 404


async def test_sim_accounts_must_use_demo_addresses(client):
    r = await client.post(
        f"{PREFIX}/sim/accounts",
        json=[{"email": "someone@gmail.com", "password": PASSWORD, "full_name": "X", "tag": "t"}],
        headers=SIM,
    )
    assert r.status_code == 422
    r = await client.post(
        f"{PREFIX}/sim/organizations",
        json={"name": "Real U", "org_type": "academia", "domains": ["realu.edu"], "tag": "t"},
        headers=SIM,
    )
    assert r.status_code == 422


async def test_sim_accounts_are_idempotent(client):
    first = await _sim_accounts(client, ("ava@northfield.sim.example", "Ava Demo"))
    again = await _sim_accounts(client, ("ava@northfield.sim.example", "Ava Demo"))
    assert first[0]["created"] is True and again[0]["created"] is False
    assert first[0]["id"] == again[0]["id"]


async def test_off_hides_demo_data_from_everyone(client, browser):
    real, admin, _, _, opp_id = await _world(client, browser)
    for c in (real, admin, client):
        assert "Demo research assistant" not in await _titles(c)
        assert (await c.get(f"{PREFIX}/opportunities/{opp_id}")).status_code == 404
    assert "Ava Demo" not in await _names(real)
    assert "Ava Demo" not in await _names(admin)
    assert (await real.get(f"{PREFIX}/profiles/ava-demo")).status_code == 404


async def test_admins_mode_shows_admins_only(client, browser):
    real, admin, _, _, _ = await _world(client, browser)
    await _set_mode(admin, "admins")
    assert (await _names(admin)).get("Ava Demo") is True
    assert "Ava Demo" not in await _names(real)
    assert "Demo research assistant" in await _titles(admin)
    assert "Demo research assistant" not in await _titles(real)


async def test_everyone_mode_shows_demo_with_badge(client, browser):
    real, admin, _, _, _ = await _world(client, browser)
    out = await _set_mode(admin, "everyone")
    assert out["members"] == 1 and out["opportunities"] == 1
    assert (await _names(real)).get("Ava Demo") is True
    assert (await _names(real)).get("Site Admin") is False
    assert "Demo research assistant" in await _titles(client)
    view = await client.get(f"{PREFIX}/profiles/ava-demo")
    assert view.status_code == 200 and view.json()["is_demo"] is True


async def test_real_members_cannot_contact_demo_accounts(client, browser):
    real, admin, _, demo, opp_id = await _world(client, browser)
    await _set_mode(admin, "everyone")
    r = await real.post(f"{PREFIX}/connections", json={"addressee_id": demo["id"]})
    assert r.status_code == 403
    r = await real.post(f"{PREFIX}/opportunities/{opp_id}/apply", json={})
    assert r.status_code == 403


async def test_demo_accounts_see_their_world_but_not_real_people(client, browser):
    real, _, d, _, _ = await _world(client, browser)
    [ben] = await _sim_accounts(client, ("ben@northfield.sim.example", "Ben Demo"))
    names = await _names(d)
    assert names.get("Ben Demo") is True
    assert "Demo research assistant" in await _titles(d)
    me = (await real.get(f"{PREFIX}/auth/me")).json()
    r = await d.post(f"{PREFIX}/connections", json={"addressee_id": me["id"]})
    assert r.status_code == 403
    r = await d.post(f"{PREFIX}/connections", json={"addressee_id": ben["id"]})
    assert r.status_code == 201


async def test_demo_role_verifies_through_the_dev_mailbox(client, browser):
    r = await client.post(
        f"{PREFIX}/sim/organizations",
        json={"name": "Northfield State University", "org_type": "academia",
              "domains": ["northfield.sim.example"], "tag": "world-a"},
        headers=SIM,
    )
    assert r.status_code == 200 and r.json()["status"] == "approved"
    await _sim_accounts(client, ("ava@northfield.sim.example", "Ava Demo"))
    d = await _sign_in(browser, "ava@northfield.sim.example")
    r = await d.post(f"{PREFIX}/affiliations", json={"kind": "student", "email": "ava@northfield.sim.example"})
    assert r.status_code == 201, r.text

    mail = (await client.get(f"{PREFIX}/sim/mailbox", params={"to": "ava@northfield.sim.example"}, headers=SIM)).json()
    assert len(mail) == 1
    token = mail[0]["text"].split("token=")[1].split()[0]
    r = await d.post(f"{PREFIX}/affiliations/confirm", json={"token": token})
    assert r.status_code == 200 and r.json()["status"] == "verified"


async def test_real_member_cannot_claim_a_demo_domain(client, browser):
    await client.post(
        f"{PREFIX}/sim/organizations",
        json={"name": "Northfield State University", "org_type": "academia",
              "domains": ["northfield.sim.example"], "tag": "world-a"},
        headers=SIM,
    )
    real, _ = await _join(browser, "real@lakeview.edu", "Real Student")
    r = await real.post(f"{PREFIX}/affiliations", json={"kind": "student", "email": "x@northfield.sim.example"})
    assert r.status_code == 400


async def test_wipe_by_tag_leaves_other_tags_and_real_data(client, browser):
    real, admin, _, _, _ = await _world(client, browser)
    await _sim_accounts(client, ("cy@southport.sim.example", "Cy Demo"), tag="world-b")
    r = await client.delete(f"{PREFIX}/sim/data", params={"tag": "world-a"}, headers=SIM)
    assert r.status_code == 200, r.text
    assert r.json()["counts"]["members"] == 1
    assert r.json()["counts"]["opportunities"] == 1
    await _set_mode(admin, "everyone")
    names = await _names(real)
    assert "Ava Demo" not in names and "Cy Demo" in names and "Site Admin" in names


async def test_demo_accounts_cannot_sign_in_on_production(client, monkeypatch):
    await _sim_accounts(client, ("ava@northfield.sim.example", "Ava Demo"))
    monkeypatch.setattr(settings, "environment", "production")
    r = await client.post(f"{PREFIX}/auth/login", json={"email": "ava@northfield.sim.example", "password": PASSWORD})
    assert r.status_code == 403


async def test_demo_mail_is_captured_not_sent(client):
    await _sim_accounts(client, ("ava@northfield.sim.example", "Ava Demo"), verified=False)
    r = await client.post(f"{PREFIX}/auth/login", json={"email": "ava@northfield.sim.example", "password": PASSWORD}, headers=SIM)
    assert r.status_code == 200
    r = await client.post(f"{PREFIX}/auth/resend-verification")
    assert r.status_code in (200, 202, 204), r.text
    assert any(m["to"] == "ava@northfield.sim.example" for m in DEV_OUTBOX)
