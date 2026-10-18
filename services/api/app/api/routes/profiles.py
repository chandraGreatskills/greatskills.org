from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.models.profile import Education, Experience, Profile, Resume
from app.schemas.profile import (
    EducationIn,
    EducationOut,
    ExperienceIn,
    ExperienceOut,
    ProfileOut,
    ProfileUpdate,
    ProfileViewOut,
    ResumeOut,
)
from app.services import affiliations as aff
from app.services.storage import storage
from app.services.uploads import DOC_TYPES, document_ext, image_ext
from app.services.visibility import build_view, relation_to

router = APIRouter(prefix="/profiles", tags=["profiles"])

_FULL = (
    selectinload(Profile.experiences),
    selectinload(Profile.education),
    selectinload(Profile.resumes),
)


async def _load_full(db, **where) -> Profile | None:
    stmt = select(Profile).options(*_FULL)
    for k, v in where.items():
        stmt = stmt.where(getattr(Profile, k) == v)
    return await db.scalar(stmt)


async def _my_profile(db, user_id: UUID) -> Profile:
    profile = await _load_full(db, user_id=user_id)
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return profile


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(current: CurrentUser, db: DbSession):
    return await _my_profile(db, current.id)


@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(payload: ProfileUpdate, current: CurrentUser, db: DbSession):
    profile = await _my_profile(db, current.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    return await _my_profile(db, current.id)


@router.get("/{handle}", response_model=ProfileViewOut)
async def view_profile(handle: str, viewer: OptionalUser, db: DbSession):
    """Someone else's profile, trimmed to what this viewer may see. Owners get
    pointed at /profiles/me so there is exactly one place the full record
    leaves the API."""
    profile = await _load_full(db, handle=handle)
    rel = await relation_to(db, viewer, profile.user_id) if profile else None
    if not profile or rel is None:
        # Blocked looks exactly like missing, so a block can't be detected.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    if rel == "self":
        rel = "connection"  # an owner previewing their own link sees the widest outside view
    roles = (await aff.verified_roles(db, [profile.user_id])).get(profile.user_id, [])
    recruiter = rel != "public" and viewer is not None and await aff.has_verified(db, viewer.id, ("recruiter",))
    return build_view(profile, rel, roles, recruiter)


# --- Experience ---
@router.post("/me/experiences", response_model=ExperienceOut, status_code=201)
async def add_experience(payload: ExperienceIn, current: CurrentUser, db: DbSession):
    profile = await _my_profile(db, current.id)
    exp = Experience(profile_id=profile.id, **payload.model_dump())
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp


@router.delete("/me/experiences/{exp_id}", status_code=204)
async def delete_experience(exp_id: UUID, current: CurrentUser, db: DbSession):
    profile = await _my_profile(db, current.id)
    exp = await db.get(Experience, exp_id)
    if not exp or exp.profile_id != profile.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.delete(exp)
    await db.commit()


# --- Education ---
@router.post("/me/education", response_model=EducationOut, status_code=201)
async def add_education(payload: EducationIn, current: CurrentUser, db: DbSession):
    profile = await _my_profile(db, current.id)
    edu = Education(profile_id=profile.id, **payload.model_dump())
    db.add(edu)
    await db.commit()
    await db.refresh(edu)
    return edu


@router.delete("/me/education/{edu_id}", status_code=204)
async def delete_education(edu_id: UUID, current: CurrentUser, db: DbSession):
    profile = await _my_profile(db, current.id)
    edu = await db.get(Education, edu_id)
    if not edu or edu.profile_id != profile.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.delete(edu)
    await db.commit()


# --- Avatar ---
@router.post("/me/avatar", response_model=ProfileOut)
async def upload_avatar(current: CurrentUser, db: DbSession, file: UploadFile = File(...)):
    data = await file.read()
    ext = image_ext(data)
    profile = await _my_profile(db, current.id)
    old = profile.avatar_url
    profile.avatar_url = await storage.save(data, ext, "avatars")
    await db.commit()
    if old and old.startswith("/uploads/avatars/"):
        await storage.delete(old)
    return await _my_profile(db, current.id)


# --- Resumes (private: owner only for now, employers later through applications) ---
@router.post("/me/resume", response_model=ResumeOut, status_code=201)
async def upload_resume(current: CurrentUser, db: DbSession, file: UploadFile = File(...)):
    data = await file.read()
    ext = document_ext(data)
    profile = await _my_profile(db, current.id)
    key = await storage.save(data, ext, "resumes")
    # Keep the member's own name for the file, minus any path, capped.
    name = (file.filename or f"resume{ext}").replace("\\", "/").rsplit("/", 1)[-1][:200]
    resume = Resume(
        profile_id=profile.id,
        filename=name,
        file_url=key,
        size_bytes=len(data),
        is_primary=len(profile.resumes) == 0,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def _my_resume(db, user_id: UUID, resume_id: UUID) -> tuple[Profile, Resume]:
    profile = await _my_profile(db, user_id)
    resume = next((r for r in profile.resumes if r.id == resume_id), None)
    if not resume:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return profile, resume


@router.get("/me/resumes/{resume_id}/file")
async def download_resume(resume_id: UUID, current: CurrentUser, db: DbSession):
    _, resume = await _my_resume(db, current.id, resume_id)
    data = await storage.open_private(resume.file_url)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File missing")
    ext = "." + resume.file_url.rsplit(".", 1)[-1].lower()
    return Response(
        content=data,
        media_type=DOC_TYPES.get(ext, "application/octet-stream"),
        headers={
            # attachment: download, never render inside our origin
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(resume.filename)}",
            "Cache-Control": "private, no-store",
        },
    )


@router.delete("/me/resumes/{resume_id}", status_code=204)
async def delete_resume(resume_id: UUID, current: CurrentUser, db: DbSession):
    profile, resume = await _my_resume(db, current.id, resume_id)
    key, was_primary = resume.file_url, resume.is_primary
    await db.delete(resume)
    if was_primary:
        rest = [r for r in profile.resumes if r.id != resume_id]
        if rest:
            rest[0].is_primary = True
    await db.commit()
    await storage.delete(key)
