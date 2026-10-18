"""Check uploaded files by their contents, not their names.

The filename and Content-Type both come from the browser and can say anything.
An "avatar" named photo.html would otherwise be stored and served back from
our own domain as a web page. So each upload is sniffed for the real format,
and the stored extension comes from what we found, never from the client.
"""

from __future__ import annotations

import io
import zipfile

from fastapi import HTTPException, status

from app.core.config import settings


def _too_big(data: bytes) -> None:
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {settings.max_upload_mb} MB",
        )
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty")


def image_ext(data: bytes) -> str:
    """Return the extension for a JPEG, PNG or WebP image, or reject it."""
    _too_big(data)
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    raise HTTPException(
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Photos must be JPEG, PNG or WebP"
    )


def document_ext(data: bytes) -> str:
    """Return the extension for a PDF or Word .docx file, or reject it.

    Old binary .doc files are refused: they can carry macros and we have no
    way to check them here.
    """
    _too_big(data)
    if data.startswith(b"%PDF-"):
        return ".pdf"
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                names = set(z.namelist())
        except zipfile.BadZipFile:
            names = set()
        # A .docx is a zip with this part; macro-enabled .docm adds vbaProject.
        if "word/document.xml" in names and not any(n.endswith("vbaProject.bin") for n in names):
            return ".docx"
    raise HTTPException(
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Resumes must be a PDF or a Word .docx file"
    )


DOC_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
