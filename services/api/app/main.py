from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base, engine

# Ensure models are registered on Base before create_all
import app.models  # noqa: F401,E402


settings.check_production()


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
    # The interactive docs map every endpoint for anyone; development only.
    docs_url="/docs" if settings.is_dev else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.is_dev else None,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    # Browsers must take our Content-Type at its word; never guess "this
    # looks like HTML" for an uploaded file.
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("X-Frame-Options", "DENY")
    h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if request.url.path.startswith(settings.api_v1_prefix):
        # API answers carry personal data; keep them out of shared caches.
        h.setdefault("Cache-Control", "no-store")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve avatars only. Resumes sit beside them in upload_dir (the folder Docker
# keeps) but are private and go out through /profiles/me/resumes/{id}/file.
# Never widen this mount to all of upload_dir.
class ImagesOnly(StaticFiles):
    # Avatars uploaded before content checks existed may have any extension.
    # Serve image types only, so an old "avatar.html" can't run as a page.
    async def get_response(self, path, scope):
        if Path(path).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            from starlette.exceptions import HTTPException as StarletteHTTPException

            raise StarletteHTTPException(status_code=404)
        return await super().get_response(path, scope)


_avatars = Path(settings.upload_dir) / "avatars"
_avatars.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/avatars", ImagesOnly(directory=_avatars), name="avatars")

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "service": settings.app_name, "env": settings.environment}
