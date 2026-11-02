"""Native video: only approved creators can upload; uploads are converted to
a web-friendly MP4 with a poster; size, type and length are enforced."""

import shutil
from pathlib import Path

import pytest
from sqlalchemy import update

from app.core.config import settings
from app.db.base import SessionLocal
from app.models.user import User
from tests.test_privacy import PREFIX, _join

CLIP = (Path(__file__).parent / "fixtures" / "clip.mp4").read_bytes()
needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


async def _creator(browser, email="v@example.com"):
    u, me = await _join(browser, email, "Vee Creator")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.email == email).values(can_upload_video=True))
        await db.commit()
    return u, me


async def test_only_approved_creators_upload(client, browser):
    u, _ = await _join(browser, "n@example.com", "No Video")
    r = await u.post(f"{PREFIX}/posts/videos", files={"file": ("c.mp4", CLIP, "video/mp4")})
    assert r.status_code == 403 and "YouTube" in r.json()["detail"]


@needs_ffmpeg
async def test_upload_converts_and_attaches(client, browser):
    u, _ = await _creator(browser)
    r = await u.post(f"{PREFIX}/posts/videos", files={"file": ("c.mov", CLIP, "video/quicktime")})
    assert r.status_code == 201, r.text
    vid = r.json()["id"]
    v = (await u.get(f"{PREFIX}/posts/videos/{vid}")).json()  # background work has finished by now
    assert v["status"] == "ready" and v["url"].endswith(".mp4") and v["poster"].endswith(".jpg")
    part = await client.get(v["url"], headers={"Range": "bytes=0-99"})
    assert part.status_code == 206 and len(part.content) == 100  # seeking works

    p = (await u.post(f"{PREFIX}/posts", json={"body": "Demo day highlights", "video_id": vid})).json()
    assert p["video"]["status"] == "ready" and p["video"]["url"] == v["url"]
    both = await u.post(f"{PREFIX}/posts", json={"body": "x", "video_id": vid, "video_url": "https://youtu.be/dQw4w9WgXcQ"})
    assert both.status_code == 422

    other, _ = await _join(browser, "o@example.com", "Oz Other")
    assert (await other.get(f"{PREFIX}/posts/videos/{vid}")).status_code == 404


async def test_rejects_non_video_and_oversize(client, browser, monkeypatch):
    u, _ = await _creator(browser)
    r = await u.post(f"{PREFIX}/posts/videos", files={"file": ("x.mp4", b"<html>not a video</html>", "video/mp4")})
    assert r.status_code == 415
    monkeypatch.setattr(settings, "max_video_mb", 0)
    r = await u.post(f"{PREFIX}/posts/videos", files={"file": ("c.mp4", CLIP, "video/mp4")})
    assert r.status_code == 413


@needs_ffmpeg
async def test_too_long_fails_cleanly(client, browser, monkeypatch):
    u, _ = await _creator(browser)
    monkeypatch.setattr(settings, "max_video_seconds", 1)
    vid = (await u.post(f"{PREFIX}/posts/videos", files={"file": ("c.mp4", CLIP, "video/mp4")})).json()["id"]
    v = (await u.get(f"{PREFIX}/posts/videos/{vid}")).json()
    assert v["status"] == "failed" and "minutes" in v["error"]
    raw = Path(settings.upload_dir) / "video_raw"
    assert not any(raw.iterdir())  # the raw upload is always removed


async def test_admin_manages_video_creators(client, browser):
    a, _ = await _join(browser, "admin@example.com", "Ad Min")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.email == "admin@example.com").values(role="admin"))
        await db.commit()
    m, me = await _join(browser, "m@example.com", "Mo Member")
    assert (await m.post(f"{PREFIX}/admin/video-creators", json={"email": "m@example.com"})).status_code == 404
    assert (await a.post(f"{PREFIX}/admin/video-creators", json={"email": "M@example.com"})).status_code == 204
    assert (await m.get(f"{PREFIX}/auth/me")).json()["can_upload_video"] is True
    assert [c["email"] for c in (await a.get(f"{PREFIX}/admin/video-creators")).json()] == ["m@example.com"]
    await a.delete(f"{PREFIX}/admin/video-creators/{me['id']}")
    assert (await m.get(f"{PREFIX}/auth/me")).json()["can_upload_video"] is False
