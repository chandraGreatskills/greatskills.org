"""Organization pages: who can see, edit and follow them."""

from sqlalchemy import update

from app.db.base import SessionLocal
from app.models.organization import Organization
from tests.test_affiliations import _approved_org, _claim, _confirm, outbox  # noqa: F401
from tests.test_privacy import PNG, PREFIX, _join


async def _slug(org_id):
    async with SessionLocal() as db:
        return (await db.get(Organization, org_id)).slug


async def test_public_page_hides_people_and_pending_orgs(client, browser, outbox):  # noqa: F811
    oid = await _approved_org("Lakeview State", "lakeview.edu", "academia")
    slug = await _slug(oid)
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    _, t = await _claim(u, outbox, "student", "ana@lakeview.edu")
    await _confirm(client, t)

    public = (await client.get(f"{PREFIX}/orgs/{slug}")).json()
    assert public["name"] == "Lakeview State" and public["student_count"] == 1 and public["people"] == []
    seen = (await u.get(f"{PREFIX}/orgs/{slug}")).json()
    assert [p["person"]["full_name"] for p in seen["people"]] == ["Ana Rao"] and seen["can_edit"] is False

    async with SessionLocal() as db:
        await db.execute(update(Organization).where(Organization.id == oid).values(status="pending"))
        await db.commit()
    assert (await client.get(f"{PREFIX}/orgs/{slug}")).status_code == 404
    assert all(c["slug"] != slug for c in (await client.get(f"{PREFIX}/orgs")).json())


async def test_only_verified_staff_edit(client, browser, outbox):  # noqa: F811
    slug = await _slug(await _approved_org("Brightline", "brightline.example", "industry"))
    member, _ = await _join(browser, "m@example.com", "Mo Member")
    assert (await member.patch(f"{PREFIX}/orgs/{slug}", json={"tagline": "Hi"})).status_code == 403

    rec, _ = await _join(browser, "r@example.com", "Rae Recruiter")
    _, t = await _claim(rec, outbox, "recruiter", "rae@brightline.example")
    await _confirm(client, t)
    r = await rec.patch(f"{PREFIX}/orgs/{slug}", json={"tagline": "Analytics that ship", "website": "https://brightline.example"})
    assert r.status_code == 200 and r.json()["tagline"] == "Analytics that ship" and r.json()["can_edit"] is True
    assert (await rec.patch(f"{PREFIX}/orgs/{slug}", json={"website": "javascript:alert(1)"})).status_code == 422

    logo = await rec.post(f"{PREFIX}/orgs/{slug}/logo", files={"file": ("l.png", PNG, "image/png")})
    assert logo.status_code == 200 and logo.json()["logo_url"].startswith("/uploads/logos/")
    assert (await client.get(logo.json()["logo_url"])).status_code == 200
    bad = await rec.post(f"{PREFIX}/orgs/{slug}/logo", files={"file": ("x.html", b"<html>", "image/png")})
    assert bad.status_code == 415


async def test_follow_and_following_list(client, browser):
    slug = await _slug(await _approved_org("Brightline", "brightline.example", "industry"))
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    assert (await client.put(f"{PREFIX}/orgs/{slug}/follow")).status_code == 401
    assert (await u.put(f"{PREFIX}/orgs/{slug}/follow")).status_code == 204
    assert (await u.put(f"{PREFIX}/orgs/{slug}/follow")).status_code == 204  # twice is fine
    page = (await u.get(f"{PREFIX}/orgs/{slug}")).json()
    assert page["followers"] == 1 and page["following"] is True
    assert [c["slug"] for c in (await u.get(f"{PREFIX}/orgs/following")).json()] == [slug]
    await u.delete(f"{PREFIX}/orgs/{slug}/follow")
    assert (await u.get(f"{PREFIX}/orgs/{slug}")).json()["followers"] == 0
