from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models.profile import Education, Experience, Profile, Resume
from app.schemas.profile import (
    EducationIn,
    EducationOut,
    ExperienceIn,
    ExperienceOut,
    ProfileOut,
    ProfileUpdate,
    ResumeOut,
)
from app.services.storage import storage

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


@router.get("/{handle}", response_model=ProfileOut)
async def get_public_profile(handle: str, db: DbSession):
    profile = await _load_full(db, handle=handle)
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return profile


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


# --- Avatar + resume uploads ---
def _check_size(data: bytes):
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {settings.max_upload_mb} MB",
        )


@router.post("/me/avatar", response_model=ProfileOut)
async def upload_avatar(current: CurrentUser, db: DbSession, file: UploadFile = File(...)):
    data = await file.read()
    _check_size(data)
    profile = await _my_profile(db, current.id)
    profile.avatar_url = await storage.save(data, file.filename or "avatar.png", "avatars")
    await db.commit()
    return await _my_profile(db, current.id)


@router.post("/me/resume", response_model=ResumeOut, status_code=201)
async def upload_resume(current: CurrentUser, db: DbSession, file: UploadFile = File(...)):
    data = await file.read()
    _check_size(data)
    profile = await _my_profile(db, current.id)
    url = await storage.save(data, file.filename or "resume.pdf", "resumes")
    resume = Resume(
        profile_id=profile.id,
        filename=file.filename or "resume.pdf",
        file_url=url,
        size_bytes=len(data),
        is_primary=len(profile.resumes) == 0,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume
