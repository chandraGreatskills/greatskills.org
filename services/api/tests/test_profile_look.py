"""Cover images and pronouns: gallery covers for everyone, uploaded covers
for verified members only, pronouns for signed-in viewers."""

from tests.test_affiliations import _approved_org, _claim, _confirm, outbox  # noqa: F401
from tests.test_privacy import PNG, PREFIX, _join


async def test_gallery_cover_and_pronouns(client, browser):
    u, me = await _join(browser, "ana@example.com", "Ana Rao")
    r = await u.patch(f"{PREFIX}/profiles/me", json={"cover": "g:aurora", "pronouns": " she/her "})
    assert r.status_code == 200 and r.json()["cover"] == "g:aurora" and r.json()["pronouns"] == "she/her"
    assert (await u.patch(f"{PREFIX}/profiles/me", json={"cover": "g:nope"})).status_code == 422
    assert (await u.patch(f"{PREFIX}/profiles/me", json={"cover": "/uploads/covers/x.png"})).status_code == 422

    handle = me["profile"]["handle"]
    other, _ = await _join(browser, "ravi@example.com", "Ravi Iyer")
    seen = (await other.get(f"{PREFIX}/profiles/{handle}")).json()
    assert seen["cover"] == "g:aurora" and seen["pronouns"] == "she/her"
    public = (await client.get(f"{PREFIX}/profiles/{handle}")).json()
    assert public["cover"] == "g:aurora" and public["pronouns"] is None


async def test_uploaded_cover_needs_a_verified_role(client, browser, outbox):  # noqa: F811
    await _approved_org("Lakeview State", "lakeview.edu", "academia")
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    upload = {"file": ("cover.png", PNG, "image/png")}
    assert (await u.post(f"{PREFIX}/profiles/me/cover", files=upload)).status_code == 403

    _, token = await _claim(u, outbox, "student", "ana@lakeview.edu")
    await _confirm(client, token)
    r = await u.post(f"{PREFIX}/profiles/me/cover", files=upload)
    assert r.status_code == 200, r.text
    url = r.json()["cover"]
    assert url.startswith("/uploads/covers/") and url.endswith(".png")
    assert (await client.get(url)).status_code == 200

    assert (await u.post(f"{PREFIX}/profiles/me/cover", files={"file": ("x.html", b"<html>", "image/png")})).status_code == 415
    assert (await u.delete(f"{PREFIX}/profiles/me/cover")).json()["cover"] is None
    assert (await client.get(url)).status_code == 404
