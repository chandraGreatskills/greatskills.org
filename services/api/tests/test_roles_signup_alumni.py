"""The sign-up shortcut and alumni roles. Each test pins one rule about what
the account email can prove and what graduating changes."""

from sqlalchemy import update

from app.db.base import SessionLocal
from app.models.organization import Organization
from tests.test_affiliations import PREFIX, _approved_org, _badges, _join, outbox  # noqa: F401


async def test_school_signup_gets_one_click_student_role(client, browser):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, me = await _join(browser, "ana@cs.lakeview.edu", "Ana Rao")

    s = (await u.get(f"{PREFIX}/affiliations/suggestion")).json()
    assert s == {"org_name": "Lakeview State", "org_type": "academia", "kinds": ["student", "alumni", "faculty"]}

    r = await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "verified" and r.json()["verified_by"] == "account_email"
    assert await _badges(client, me["profile"]["handle"]) == [
        {"kind": "student", "org_name": "Lakeview State", "org_slug": "lakeview-state", "verified_by": "account_email"}
    ]
    # Student is taken, and alumni can't stand beside it.
    assert (await u.get(f"{PREFIX}/affiliations/suggestion")).json()["kinds"] == ["faculty"]
    assert (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "alumni"})).status_code == 400


async def test_no_shortcut_before_email_is_confirmed(browser):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "ana@lakeview.edu", "Ana Rao", verify=False)
    assert (await u.get(f"{PREFIX}/affiliations/suggestion")).status_code == 403
    assert (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).status_code == 403


async def test_no_shortcut_for_personal_or_unapproved_domains(browser, outbox):
    u, _ = await _join(browser, "ana@gmail.com", "Ana Rao")
    assert (await u.get(f"{PREFIX}/affiliations/suggestion")).json() is None
    assert (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).status_code == 400

    # A pending school must go through the form and the review queue.
    v, _ = await _join(browser, "ben@newcollege.edu", "Ben Iyer")
    r = await v.post(f"{PREFIX}/affiliations", json={"kind": "student", "email": "ben@newcollege.edu", "org_name": "New College"})
    assert r.status_code == 201
    w, _ = await _join(browser, "cara@newcollege.edu", "Cara Das")
    assert (await w.get(f"{PREFIX}/affiliations/suggestion")).json() is None
    assert (await w.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).status_code == 400


async def test_shortcut_role_must_match_organization_type(browser):
    await _approved_org("Acme Labs", "acme.com", "industry")
    u, _ = await _join(browser, "dev@acme.com", "Dev Shah")
    assert (await u.get(f"{PREFIX}/affiliations/suggestion")).json()["kinds"] == ["recruiter"]
    assert (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).status_code == 400
    assert (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "recruiter"})).status_code == 201


async def test_rejected_organization_offers_nothing(browser):
    org_id = await _approved_org("Lakeview State", "lakeview.edu", "academia")
    async with SessionLocal() as db:
        await db.execute(update(Organization).where(Organization.id == org_id).values(status="rejected"))
        await db.commit()
    u, _ = await _join(browser, "ana@lakeview.edu", "Ana Rao")
    assert (await u.get(f"{PREFIX}/affiliations/suggestion")).json() is None


async def test_graduating_keeps_the_badge_as_alumni(client, browser):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, me = await _join(browser, "ana@lakeview.edu", "Ana Rao")
    row = (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).json()

    r = await u.post(f"{PREFIX}/affiliations/{row['id']}/graduate")
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "alumni" and r.json()["status"] == "verified"
    assert [b["kind"] for b in await _badges(client, me["profile"]["handle"])] == ["alumni"]
    # Already alumni: nothing left to graduate.
    assert (await u.post(f"{PREFIX}/affiliations/{row['id']}/graduate")).status_code == 400


async def test_only_your_own_verified_student_role_can_graduate(browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "ana@lakeview.edu", "Ana Rao")
    row = (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).json()
    other, _ = await _join(browser, "eve@example.com", "Eve Mallory")
    assert (await other.post(f"{PREFIX}/affiliations/{row['id']}/graduate")).status_code == 404

    # An unconfirmed student claim can't be turned into an alumni badge.
    v, _ = await _join(browser, "ben@example.com", "Ben Iyer")
    pending = (await v.post(f"{PREFIX}/affiliations", json={"kind": "student", "email": "ben@lakeview.edu"})).json()
    assert pending["status"] == "email_sent"
    assert (await v.post(f"{PREFIX}/affiliations/{pending['id']}/graduate")).status_code == 400


async def test_alumni_can_verify_with_a_school_email(browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "grad@gmail.com", "Grad Person")
    r = await u.post(f"{PREFIX}/affiliations", json={"kind": "alumni", "email": "grad@alumni.lakeview.edu"})
    assert r.status_code == 201, r.text
    c = await u.post(f"{PREFIX}/affiliations/confirm", json={"token": outbox[-1]["token"]})
    assert c.json()["status"] == "verified" and c.json()["kind"] == "alumni"
    # Alumni beside a student role at the same school is refused.
    r = await u.post(f"{PREFIX}/affiliations", json={"kind": "student", "email": "grad2@lakeview.edu"})
    assert r.status_code == 409


async def test_alumni_badge_does_not_unlock_posting_for_the_school(browser, outbox):
    org_id = await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "ana@lakeview.edu", "Ana Rao")
    row = (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).json()
    await u.post(f"{PREFIX}/affiliations/{row['id']}/graduate")
    r = await u.post(
        f"{PREFIX}/opportunities",
        json={"title": "Research assistant", "description": "Help in the lab.", "org_id": str(org_id)},
    )
    assert r.status_code == 403


async def test_account_email_already_proved_by_someone_else_offers_nothing(browser, outbox):
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    # Another account proved ana@lakeview.edu first through the form.
    x, _ = await _join(browser, "x@example.com", "First Claimant")
    await x.post(f"{PREFIX}/affiliations", json={"kind": "student", "email": "ana@lakeview.edu"})
    await x.post(f"{PREFIX}/affiliations/confirm", json={"token": outbox[-1]["token"]})
    # Signing up with that address later doesn't hand out a second badge.
    u, _ = await _join(browser, "ana@lakeview.edu", "Ana Rao")
    assert (await u.get(f"{PREFIX}/affiliations/suggestion")).json() is None
    assert (await u.post(f"{PREFIX}/affiliations/from-account", json={"kind": "student"})).status_code == 400
