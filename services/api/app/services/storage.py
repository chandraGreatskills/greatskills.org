"""File storage behind a tiny interface so we can swap local disk for
S3-compatible object storage (Cloudflare R2 / Backblaze B2) later without
touching route code.

Two kinds of file live here:
- public (avatars): served as-is at /uploads/avatars/...
- private (resumes): never served statically. Routes read them back with
  open_private() after checking who is asking.

Both sit under upload_dir because that is the folder Docker keeps between
deploys. Only the avatars folder is mounted in main.py; do not widen that
mount to all of /uploads.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from uuid import uuid4

from app.core.config import settings

PUBLIC_FOLDERS = {"avatars"}


class Storage(ABC):
    @abstractmethod
    async def save(self, data: bytes, ext: str, folder: str) -> str:
        """Persist bytes. Public folders return a URL path; private folders
        return a storage key for open_private()."""

    @abstractmethod
    async def open_private(self, key: str) -> bytes | None:
        """Read a private file back, or None if it's gone."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Remove a file. Missing files are not an error."""


class LocalStorage(Storage):
    def __init__(self, base_dir: str) -> None:
        self.base = Path(base_dir).resolve()
        self.base.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Keys come from our own database, but resolve and check anyway so a
        # bad row can never point outside the upload folder.
        p = (self.base / key.removeprefix("/uploads/")).resolve()
        if self.base not in p.parents:
            raise ValueError("storage key escapes the upload folder")
        return p

    async def save(self, data: bytes, ext: str, folder: str) -> str:
        key = f"{folder}/{uuid4().hex}{ext}"
        dest = self._path(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return f"/uploads/{key}" if folder in PUBLIC_FOLDERS else key

    async def open_private(self, key: str) -> bytes | None:
        p = self._path(key)
        return p.read_bytes() if p.is_file() else None

    async def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


def get_storage() -> Storage:
    # if settings.storage_backend == "s3": return S3Storage(...)  # later
    return LocalStorage(settings.upload_dir)


storage = get_storage()
