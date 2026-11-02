"""Converting uploaded videos to something every browser can play.

Phones record .MOV and HEVC, which many browsers can't play. Each upload is
converted with ffmpeg to H.264/AAC MP4 at up to 720p, with the index at the
front so playback starts before the whole file arrives, plus a poster frame.
One conversion runs at a time per API process so the site stays responsive.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
from pathlib import Path
from uuid import UUID, uuid4

from app.core.config import settings
from app.db.base import SessionLocal
from app.models.post import PostVideo

logger = logging.getLogger("greatskills.video")
_one_at_a_time = asyncio.Semaphore(1)

RAW_DIR = "video_raw"     # private: never served
OUT_DIR = "videos"        # public: served at /uploads/videos


def available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def looks_like_video(head: bytes) -> bool:
    """MP4/MOV (an 'ftyp' box near the start) or WebM/MKV (EBML header)."""
    return head[4:8] == b"ftyp" or head[:4] == b"\x1a\x45\xdf\xa3"


def raw_path(name: str) -> Path:
    d = Path(settings.upload_dir) / RAW_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d / name


async def _run(*args: str, timeout: int) -> tuple[int, bytes]:
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        return 1, b"timed out"
    return proc.returncode or 0, out if proc.returncode == 0 else err


async def _set(video_id: UUID, **fields) -> None:
    async with SessionLocal() as db:
        v = await db.get(PostVideo, video_id)
        if v:
            for k, val in fields.items():
                setattr(v, k, val)
            await db.commit()


async def process(video_id: UUID, src: Path) -> None:
    """Probe, convert and save. Always removes the raw upload."""
    try:
        async with _one_at_a_time:
            code, out = await _run(
                "ffprobe", "-v", "error", "-show_entries", "format=duration", "-show_streams", "-of", "json", str(src),
                timeout=60,
            )
            if code != 0:
                return await _set(video_id, status="failed", error="That file doesn't look like a video we can read")
            info = json.loads(out or b"{}")
            if not any(s.get("codec_type") == "video" for s in info.get("streams", [])):
                return await _set(video_id, status="failed", error="No video track found in that file")
            seconds = float(info.get("format", {}).get("duration") or 0)
            if seconds > settings.max_video_seconds:
                return await _set(video_id, status="failed", error=f"Videos can be at most {settings.max_video_seconds // 60} minutes long")

            out_dir = Path(settings.upload_dir) / OUT_DIR
            out_dir.mkdir(parents=True, exist_ok=True)
            name = uuid4().hex
            mp4, jpg = out_dir / f"{name}.mp4", out_dir / f"{name}.jpg"
            code, err = await _run(
                "ffmpeg", "-y", "-v", "error", "-i", str(src),
                "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
                "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-map_metadata", "-1", str(mp4),
                timeout=900,
            )
            if code != 0:
                mp4.unlink(missing_ok=True)
                logger.warning("video %s failed to convert: %s", video_id, err[-300:])
                return await _set(video_id, status="failed", error="We couldn't convert that video")
            await _run("ffmpeg", "-y", "-v", "error", "-ss", str(min(1.0, seconds / 2)), "-i", str(mp4),
                       "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", str(jpg), timeout=60)
            await _set(
                video_id, status="ready", file_url=f"/uploads/{OUT_DIR}/{mp4.name}",
                poster_url=f"/uploads/{OUT_DIR}/{jpg.name}" if jpg.exists() else None, duration_s=round(seconds),
            )
    except Exception:  # never leave a video stuck on "processing"
        logger.exception("video %s processing crashed", video_id)
        await _set(video_id, status="failed", error="Something went wrong converting that video")
    finally:
        src.unlink(missing_ok=True)
