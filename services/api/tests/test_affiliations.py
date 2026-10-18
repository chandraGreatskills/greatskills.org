"""Verified roles. Each test pins one rule: what proves a role, what a badge
unlocks, and what an admin decision does to it."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, update

from app.api.routes import affiliations as aff_routes
from app.core.config import settings
from app.core.security import create_verify_token
from app.db.base import SessionLocal
from app.models.organization import Affiliation, Organization, OrgDomain
from app.models.user import User

PREFIX = "/api/v1"


@pytest.fixture
def outbox(monkeypatch):
    """Catches role emails so a test can click the link inside them."""
    sent = []

    async def capture(to, token, kind, org_name, full_name=None):
        sent.append({"to": to, "token": token, "kind": kind, "org_name": org_name})

    monkeypatch.setattr(aff_routes, "send_affiliation_email", capture)
    return sent


async def _join(browser, email, name, verify=True):
    u = browser()
    r = await u.post(
        f"{PREFIX}/auth/register",
        json={"email": email, "password": "supersecret1", "full_name": name, "member_type": "student"},
    )
    assert r.status_code == 201, r.text
    me = r.json()
    if verify:
        token = create_verify_token(me["id"], email)
        assert (await u.post(f"{PREFIX}/auth/verify-email", json={"token": token})).status_code == 200
    return u, me


async def _admin(browser):
    a, me = await _join(browser, "admin@greatskills.org", "Site Admin")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.email == "admin@greatskills.org").values(role="admin"))
        await db.commit()
    return a


async def _approved_org(name, domain, org_type):
    async with SessionLocal() as db:
        org = Organization(name=name, slug=name.lower().replace(" ", "-"), org_type=org_type, status="approved")
        db.add(org)
        await db.flush()
        db.add(OrgDomain(org_id=org.id, domain=domain))
        await db.commit()
        return org.id


async def _claim(u, outbox, kind, email, org_name=None):
    body = {"kind": kind, "email": email}
    if org_name:
        body["org_name"] = org_name
    r = await u.post(f"{PREFIX}/affiliations", json=body)
    return r, (outbox[-1]["token"] if r.status_code == 201 else None)


async def _confirm(client, token):
    return await client.post(f"{PREFIX}/affiliations/confirm", json={"token": token})


async def _badges(viewer, handle):
    r = await viewer.get(f"{PREFIX}/profiles/{handle}")
    assert r.status_code == 200, r.text
    return r.json()["verified_roles"]


async def test_personal_email_is_refused(client, browser, outbox):
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    for addr in ("ana.rao@gmail.com", "ana@yahoo.co.in", "ana@outlook.com", "ana@rediffmail.com"):
        r, _ = await _claim(u, outbox, "student", addr, "Some School")
        assert r.status_code == 400, addr
    assert outbox == []


async def test_account_email_must_be_verified_first(client, browser, outbox):
    u, _ = await _join(browser, "ana@example.com", "Ana Rao", verify=False)
    r, _ = await _claim(u, outbox, "student", "ana@lakeview.edu", "Lakeview State")
    assert r.status_code == 403


async def test_new_school_waits_for_admin_then_badge_appears(client, browser, outbox):
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    handle = me["profile"]["handle"]

    r, _ = await _claim(u, outbox, "student", "ana@lakeview.edu")
    assert r.status_code == 400  # unknown domain needs a name for review

    r, token = await _claim(u, outbox, "student", "Ana@Lakeview.edu", "Lakeview State University")
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "email_sent" and r.json()["org_status"] == "pending"
    assert outbox[-1]["to"] == "ana@lakeview.edu"

    c = await _confirm(client, token)
    assert c.json()["status"] == "awaiting_org"
    assert await _badges(client, handle) == []  # proved address, unapproved org: no badge

    a = await _admin(browser)
    queue = (await a.get(f"{PREFIX}/admin/organizations")).json()
    assert [o["name"] for o in queue] == ["Lakeview State University"]
    assert queue[0]["domains"] == ["lakeview.edu"] and queue[0]["waiting"] == 1
    assert queue[0]["requested_by"] == "Ana Rao"
    assert (await a.post(f"{PREFIX}/admin/organizations/{queue[0]['id']}/approve")).status_code == 200

    badges = await _badges(client, handle)  # logged out sees badges too
    assert badges == [{"kind": "student", "org_name": "Lakeview State University",
                       "org_slug": "lakeview-state-university"}]
    mine = (await u.get(f"{PREFIX}/affiliations/me")).json()
    assert mine[0]["status"] == "verified" and mine[0]["verified_at"]


async def test_approved_org_verifies_on_click_including_subdomains(client, browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    r, token = await _claim(u, outbox, "student", "ana@cs.lakeview.edu", "ignored name")
    assert r.status_code == 201 and r.json()["org_name"] == "Lakeview State"
    assert (await _confirm(client, token)).json()["status"] == "verified"
    assert await _badges(client, me["profile"]["handle"]) != []

    # The badge also rides on directory cards.
    v, _ = await _join(browser, "ravi@example.com", "Ravi Iyer")
    card = next(c for c in (await v.get(f"{PREFIX}/members")).json() if c["full_name"] == "Ana Rao")
    assert card["verified_roles"][0]["org_name"] == "Lakeview State"


async def test_bare_suffix_never_matches(client, browser, outbox):
    await _approved_org("Edu Root", "edu", "academia")  # nonsense row; must not catch everything
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    r, _ = await _claim(u, outbox, "student", "ana@lakeview.edu", "Lakeview State")
    assert r.json()["org_name"] == "Lakeview State" and r.json()["org_status"] == "pending"


async def test_role_must_match_organization_type(client, browser, outbox):
    await _approved_org("Brightline Analytics", "brightline.example", "industry")
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    r, _ = await _claim(u, outbox, "student", "ana@brightline.example")
    assert r.status_code == 400
    r, _ = await _claim(u, outbox, "recruiter", "ana@brightline.example")
    assert r.status_code == 201


async def test_link_is_single_use_and_expires(client, browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    _, token = await _claim(u, outbox, "student", "ana@lakeview.edu")
    assert (await _confirm(client, token)).status_code == 200
    assert (await _confirm(client, token)).status_code == 400
    assert (await _confirm(client, "made-up-token")).status_code == 400

    _, token2 = await _claim(u, outbox, "faculty", "ana.ta@lakeview.edu")
    async with SessionLocal() as db:
        await db.execute(
            update(Affiliation).where(Affiliation.kind == "faculty")
            .values(token_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))
        )
        await db.commit()
    assert (await _confirm(client, token2)).status_code == 400


async def test_one_proved_address_one_account(client, browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    a, _ = await _join(browser, "ana@example.com", "Ana Rao")
    b, _ = await _join(browser, "bob@example.com", "Bob Stone")

    # Bob's unconfirmed claim doesn't stop Ana, who really owns the address.
    _, bob_token = await _claim(b, outbox, "student", "ana@lakeview.edu")
    r, ana_token = await _claim(a, outbox, "student", "ana@lakeview.edu")
    assert r.status_code == 201
    assert (await _confirm(client, ana_token)).status_code == 200

    # Once Ana has proved it, Bob can neither claim nor confirm it.
    r, _ = await _claim(b, outbox, "faculty", "ana@lakeview.edu")
    assert r.status_code == 409
    assert (await _confirm(client, bob_token)).status_code == 409


async def test_rejecting_org_removes_badges_and_blocks_new_claims(client, browser, outbox):
    org_id = await _approved_org("Fake Corp", "fake.example", "industry")
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    _, token = await _claim(u, outbox, "recruiter", "ana@fake.example")
    await _confirm(client, token)
    assert await _badges(client, me["profile"]["handle"]) != []

    a = await _admin(browser)
    assert (await a.post(f"{PREFIX}/admin/organizations/{org_id}/reject")).status_code == 200
    assert await _badges(client, me["profile"]["handle"]) == []
    r, _ = await _claim(u, outbox, "recruiter", "other@fake.example")
    assert r.status_code == 400


async def test_admin_can_revoke_one_role(client, browser, outbox):
    org_id = await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    _, token = await _claim(u, outbox, "student", "ana@lakeview.edu")
    await _confirm(client, token)

    a = await _admin(browser)
    rows = (await a.get(f"{PREFIX}/admin/organizations/{org_id}/affiliations")).json()
    assert rows[0]["email"] == "ana@lakeview.edu" and rows[0]["member_name"] == "Ana Rao"
    assert (await a.post(f"{PREFIX}/admin/affiliations/{rows[0]['id']}/revoke")).status_code == 204
    assert await _badges(client, me["profile"]["handle"]) == []


async def test_admin_endpoints_look_missing_to_members(client, browser, outbox):
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    assert (await u.get(f"{PREFIX}/admin/organizations")).status_code == 404
    assert (await client.get(f"{PREFIX}/admin/organizations")).status_code == 401


async def test_posting_for_an_org_needs_a_verified_role_there(client, browser, outbox):
    bright = await _approved_org("Brightline Analytics", "brightline.example", "industry")
    other = await _approved_org("Other Co", "other.example", "industry")
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    job = {"title": "Junior Data Analyst", "kind": "employment"}

    assert (await u.post(f"{PREFIX}/opportunities", json={**job, "org_id": str(bright)})).status_code == 403

    _, token = await _claim(u, outbox, "recruiter", "ana@brightline.example")
    assert (await u.post(f"{PREFIX}/opportunities", json={**job, "org_id": str(bright)})).status_code == 403
    await _confirm(client, token)
    assert (await u.post(f"{PREFIX}/opportunities", json={**job, "org_id": str(bright)})).status_code == 201
    assert (await u.post(f"{PREFIX}/opportunities", json={**job, "org_id": str(other)})).status_code == 403


async def test_open_to_work_shows_only_to_verified_recruiters(client, browser, outbox):
    await _approved_org("Brightline Analytics", "brightline.example", "industry")
    owner, me = await _join(browser, "ana@example.com", "Ana Rao")
    await owner.patch(f"{PREFIX}/profiles/me", json={"open_to_work": True})
    handle = me["profile"]["handle"]

    member, _ = await _join(browser, "ravi@example.com", "Ravi Iyer")
    assert "open_to_work" not in (await member.get(f"{PREFIX}/profiles/{handle}")).json()
    assert "open_to_work" not in (await client.get(f"{PREFIX}/profiles/{handle}")).json()

    recruiter, _ = await _join(browser, "dev@example.com", "Dev Lal")
    _, token = await _claim(recruiter, outbox, "recruiter", "dev@brightline.example")
    assert "open_to_work" not in (await recruiter.get(f"{PREFIX}/profiles/{handle}")).json()  # not yet confirmed
    await _confirm(client, token)
    assert (await recruiter.get(f"{PREFIX}/profiles/{handle}")).json()["open_to_work"] is True


async def test_member_can_remove_own_role_only(client, browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    other, _ = await _join(browser, "ravi@example.com", "Ravi Iyer")
    r, token = await _claim(u, outbox, "student", "ana@lakeview.edu")
    await _confirm(client, token)
    aff_id = r.json()["id"]

    assert (await other.delete(f"{PREFIX}/affiliations/{aff_id}")).status_code == 404
    assert (await u.delete(f"{PREFIX}/affiliations/{aff_id}")).status_code == 204
    assert await _badges(client, me["profile"]["handle"]) == []


async def test_auto_approve_setting_verifies_new_orgs_on_click(client, browser, outbox, monkeypatch):
    monkeypatch.setattr(settings, "org_auto_approve", True)
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    _, token = await _claim(u, outbox, "student", "ana@newschool.edu", "New School")
    assert (await _confirm(client, token)).json()["status"] == "verified"
    assert await _badges(client, me["profile"]["handle"]) != []


async def test_resend_replaces_the_old_link(client, browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    r, old = await _claim(u, outbox, "student", "ana@lakeview.edu")
    assert (await u.post(f"{PREFIX}/affiliations/{r.json()['id']}/resend")).status_code == 204
    new = outbox[-1]["token"]
    assert new != old
    assert (await _confirm(client, old)).status_code == 400
    assert (await _confirm(client, new)).status_code == 200
    async with SessionLocal() as db:
        row = await db.scalar(select(Affiliation))
        assert row.token_hash is None  # nothing usable left behind
