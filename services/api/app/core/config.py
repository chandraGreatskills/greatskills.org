from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Great Skills API"
    environment: str = "development"  # development | production
    api_v1_prefix: str = "/api/v1"

    # Database. Defaults to a local sqlite file so the API runs with zero setup;
    # docker-compose overrides this with the Postgres URL.
    database_url: str = "sqlite+aiosqlite:///./greatskills.db"

    # Auth / JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_ttl_min: int = 30
    refresh_token_ttl_days: int = 30
    verify_token_ttl_hours: int = 48

    # Outgoing email (SMTP over SSL). Empty host = not configured: production
    # logs and skips, development prints to the console.
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = ""

    # Where links in emails point.
    portal_url: str = "https://achievers.greatskills.org"

    # Who gets told about new contact-form inquiries. Empty = saved, not emailed.
    notify_to: str = ""
    # Contact form: max submissions per IP per hour (needs Redis; skipped without it).
    contact_rate_per_hour: int = 5

    # CORS origins allowed to call the API (portal + marketing site)
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://achievers.greatskills.org",
        "https://greatskills.org",
        "https://www.greatskills.org",
    ]

    # Storage
    storage_backend: str = "local"  # local | s3
    upload_dir: str = "./uploads"
    max_upload_mb: int = 10

    # Redis (cache / rate-limit / jobs)
    redis_url: str = "redis://localhost:6379/0"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
