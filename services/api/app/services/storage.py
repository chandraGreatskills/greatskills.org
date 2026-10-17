"""File storage behind a tiny interface so we can swap local disk for
S3-compatible object storage (Cloudflare R2 / Backblaze B2) later without
touching route code."""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


class Storage(ABC):
    @abstractmethod
    async def save(self, data: bytes, filename: str, folder: str) -> str:
        """Persist bytes and return a public URL/path."""


class LocalStorage(Storage):
    def __init__(self, base_dir: str) -> None:
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    async def save(self, data: bytes, filename: str, folder: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        key = f"{folder}/{uuid4().hex}{ext}"
        dest = self.base / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        # Served by the API at /uploads/... (see main.py StaticFiles mount)
        return f"/uploads/{key}"


def get_storage() -> Storage:
    # if settings.storage_backend == "s3": return S3Storage(...)  # later
    return LocalStorage(settings.upload_dir)


storage = get_storage()
