"""Posts: who can read them, who can post for an organization, and who can
delete what."""

from tests.test_affiliations import _approved_org, _claim, _confirm, outbox  # noqa: F401
from tests.test_network import _pair, _send
from tests.test_privacy import PREFIX, _join


async def _connect(a, b, me_b):
    c = await _send(a, me_b)
    await b.post(f"{PREFIX}/connections/{c['id']}/respond?accept=true")


async def _bodies(c, q=""):
    return [p["body"] for p in (await c.get(f"{PREFIX}/posts{q}")).json()]


async def test_members_and_connections_visibility(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    stranger, _ = await _join(browser, "s@example.com", "Sam Stranger")
    await a.post(f"{PREFIX}/posts", json={"body": "Hello everyone"})
    await a.post(f"{PREFIX}/posts", json={"body": "Just my network", "visibility": "connections"})

    assert await _bodies(stranger) == ["Hello everyone"]
    await _connect(a, b, me_b)
    # Same-second posts: order isn't defined in the test database.
    assert sorted(await _bodies(b)) == ["Hello everyone", "Just my network"]
    assert sorted(await _bodies(a, f"?author={me_a['id']}")) == ["Hello everyone", "Just my network"]
    assert (await client.get(f"{PREFIX}/posts")).status_code == 401


async def test_unverified_cannot_post_and_rate_of_text(client, browser):
    u, _ = await _join(browser, "n@example.com", "New Person", verify=False)
    assert (await u.post(f"{PREFIX}/posts", json={"body": "hi"})).status_code == 403
    v, _ = await _join(browser, "v@example.com", "Vee")
    assert (await v.post(f"{PREFIX}/posts", json={"body": ""})).status_code == 422
    assert (await v.post(f"{PREFIX}/posts", json={"body": "x" * 3001})).status_code == 422


async def test_posting_as_an_organization_needs_verified_staff(client, browser, outbox):  # noqa: F811
    await _approved_org("Lakeview", "lakeview.edu", "academia")
    from sqlalchemy import select
    from app.db.base import SessionLocal
    from app.models.organization import Organization
    async with SessionLocal() as db:
        slug = await db.scalar(select(Organization.slug))
    prof, _ = await _join(browser, "k@example.com", "Prof Kay")
    body = {"body": "Career fair on Friday", "org_slug": slug, "visibility": "connections"}
    assert (await prof.post(f"{PREFIX}/posts", json=body)).status_code == 403
    _, t = await _claim(prof, outbox, "faculty", "kay@lakeview.edu")
    await _confirm(client, t)
    r = await prof.post(f"{PREFIX}/posts", json=body)
    assert r.status_code == 201 and r.json()["org"]["slug"] == slug and r.json()["visibility"] == "members"
    reader, _ = await _join(browser, "r@example.com", "Ray Reader")
    assert await _bodies(reader, f"?org={slug}") == ["Career fair on Friday"]


async def test_likes_comments_and_deletes(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    c, _ = await _join(browser, "c@example.com", "Cee")
    pid = (await a.post(f"{PREFIX}/posts", json={"body": "Hello"})).json()["id"]
    assert (await b.put(f"{PREFIX}/posts/{pid}/like")).status_code == 204
    assert (await b.put(f"{PREFIX}/posts/{pid}/like")).status_code == 204
    cid = (await b.post(f"{PREFIX}/posts/{pid}/comments", json={"body": "Nice"})).json()["id"]
    p = (await a.get(f"{PREFIX}/posts")).json()[0]
    assert p["likes"] == 1 and p["comments"] == 1 and p["can_delete"] is True

    assert (await c.delete(f"{PREFIX}/posts/{pid}/comments/{cid}")).status_code == 403
    assert (await c.delete(f"{PREFIX}/posts/{pid}")).status_code == 403
    assert (await a.delete(f"{PREFIX}/posts/{pid}/comments/{cid}")).status_code == 204  # post author moderates
    assert (await a.delete(f"{PREFIX}/posts/{pid}")).status_code == 204
    assert await _bodies(b) == []


async def test_connections_only_post_is_hidden_from_strangers_everywhere(client, browser):
    a, _, _, _ = await _pair(browser)
    s, _ = await _join(browser, "s@example.com", "Sam Stranger")
    pid = (await a.post(f"{PREFIX}/posts", json={"body": "Private", "visibility": "connections"})).json()["id"]
    assert (await s.put(f"{PREFIX}/posts/{pid}/like")).status_code == 404
    assert (await s.get(f"{PREFIX}/posts/{pid}/comments")).status_code == 404
    assert (await s.post(f"{PREFIX}/posts/{pid}/comments", json={"body": "hi"})).status_code == 404
