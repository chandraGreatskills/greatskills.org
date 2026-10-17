from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base, engine

# Ensure models are registered on Base before create_all
import app.models  # noqa: F401,E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Dev convenience: create tables on startup. Production uses Alembic
    # migrations (see alembic/) instead of create_all.
    if settings.is_dev:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (avatars, resumes) in local-storage mode.
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "service": settings.app_name, "env": settings.environment}
