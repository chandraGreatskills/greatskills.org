"""Rich posts (photos, video links, articles), sponsored cards and Great
Skills updates."""

from sqlalchemy import update

from app.db.base import SessionLocal
from app.models.user import User
from tests.test_privacy import PNG, PREFIX, _join


async def _admin(browser):
    a, _ = await _join(browser, "admin@example.com", "Ad Min")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.email == "admin@example.com").values(role="admin"))
        await db.commit()
    return a


async def test_photos_video_and_articles(client, browser):
    u, _ = await _join(browser, "ana@example.com", "Ana Rao")
    img = (await u.post(f"{PREFIX}/posts/images", files={"file": ("p.png", PNG, "image/png")})).json()["url"]
    assert (await client.get(img)).status_code == 200
    bad = await u.post(f"{PREFIX}/posts/images", files={"file": ("x.html", b"<html>", "image/png")})
    assert bad.status_code == 415

    p = (await u.post(f"{PREFIX}/posts", json={"body": "Demo day", "images": [img], "video_url": "https://youtu.be/dQw4w9WgXcQ"})).json()
    assert p["images"] == [img] and p["video_url"] == "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    assert (await u.post(f"{PREFIX}/posts", json={"body": "x", "video_url": "https://evil.example/v"})).status_code == 422
    assert (await u.post(f"{PREFIX}/posts", json={"body": "x", "images": ["https://evil.example/a.png"]})).status_code == 422
    assert (await u.post(f"{PREFIX}/posts", json={"body": "x", "images": [img] * 5})).status_code == 422
    assert (await u.post(f"{PREFIX}/posts", json={"body": "y" * 3001})).status_code == 422

    assert (await u.post(f"{PREFIX}/posts", json={"kind": "article", "body": "Long text"})).status_code == 422
    art = (await u.post(f"{PREFIX}/posts", json={"kind": "article", "title": "What I learned", "body": "z" * 8000})).json()
    assert art["kind"] == "article" and art["title"] == "What I learned"
    assert (await u.get(f"{PREFIX}/posts/{art['id']}")).json()["title"] == "What I learned"


async def test_promotions_are_admin_only_and_targeted_by_role(client, browser):
    a = await _admin(browser)
    student, _ = await _join(browser, "s@example.com", "Sam Student")  # member_type student
    ad = {"sponsor": "Acme", "title": "Free resume clinic", "body": "Saturday on campus", "link_url": "https://acme.example/clinic",
          "audience": "employer"}
    assert (await student.post(f"{PREFIX}/admin/promotions", json=ad)).status_code == 404
    pid = (await a.post(f"{PREFIX}/admin/promotions", json=ad)).json()["id"]
    assert (await student.get(f"{PREFIX}/promotions")).json() == []  # not for students

    await a.patch(f"{PREFIX}/admin/promotions/{pid}", json={**ad, "audience": "student"})
    seen = (await student.get(f"{PREFIX}/promotions")).json()
    assert seen[0]["title"] == "Free resume clinic" and seen[0]["why"] == "Shown to students"
    assert "link_url" not in seen[0] and "impressions" not in seen[0]
    assert (await student.post(f"{PREFIX}/promotions/{pid}/click")).json()["url"] == "https://acme.example/clinic"
    stats = (await a.get(f"{PREFIX}/admin/promotions")).json()[0]
    assert stats["impressions"] == 1 and stats["clicks"] == 1
    assert (await a.post(f"{PREFIX}/admin/promotions", json={**ad, "link_url": "javascript:alert(1)"})).status_code == 422


async def test_site_updates(client, browser):
    a = await _admin(browser)
    m, _ = await _join(browser, "m@example.com", "Mo")
    assert (await m.post(f"{PREFIX}/admin/updates", json={"title": "Hi"})).status_code == 404
    await a.post(f"{PREFIX}/admin/updates", json={"title": "Spring cohort opens", "body": "Applications open Monday"})
    await a.post(f"{PREFIX}/admin/updates", json={"title": "Draft", "published": False})
    assert [u["title"] for u in (await m.get(f"{PREFIX}/updates")).json()] == ["Spring cohort opens"]


async def test_plus_request_and_grant(client, browser):
    a = await _admin(browser)
    m, me = await _join(browser, "m@example.com", "Mo Member")
    assert (await m.get(f"{PREFIX}/auth/me")).json()["is_plus"] is False
    assert (await m.post(f"{PREFIX}/plus/request")).status_code == 204
    assert (await m.get(f"{PREFIX}/auth/me")).json()["plus_requested"] is True
    assert (await a.get(f"{PREFIX}/notifications")).json()[0]["kind"] == "plus_request"
    assert (await m.get(f"{PREFIX}/admin/plus")).status_code == 404
    row = (await a.get(f"{PREFIX}/admin/plus")).json()[0]
    assert row["person"]["full_name"] == "Mo Member" and row["is_plus"] is False
    assert (await a.post(f"{PREFIX}/admin/plus/{me['id']}?on=true")).status_code == 204
    mine = (await m.get(f"{PREFIX}/auth/me")).json()
    assert mine["is_plus"] is True and mine["plus_requested"] is False
