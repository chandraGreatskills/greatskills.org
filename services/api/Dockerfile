FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for asyncpg / argon2 build wheels are prebuilt; keep image slim.
# ffmpeg converts uploaded videos to web-friendly MP4 (approved creators only).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Production: run migrations then serve with Gunicorn + Uvicorn workers.
CMD ["sh", "-c", "alembic upgrade head && gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY:-4} -b 0.0.0.0:8000 --timeout 60"]
