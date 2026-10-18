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
    access_token_ttl_min: int = 15
    # A session stays alive while used at least every refresh_token_ttl_days,
    # and ends after session_max_days no matter what.
    refresh_token_ttl_days: int = 30
    session_max_days: int = 90
    password_reset_ttl_min: int = 60
    # Role verification. A school or work email link lasts this long.
    affiliation_token_ttl_hours: int = 48
    # False: a new organization waits for an admin before anyone gets a
    # verified badge from it. True: a confirmed address on a new domain is
    # enough on its own (faster, but easier for a fake employer).
    org_auto_approve: bool = False
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
    # Sign-in and sign-up throttles, same Redis counter (skipped without Redis).
    login_rate_per_ip_hour: int = 30
    login_rate_per_email_hour: int = 10
    register_rate_per_hour: int = 10

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

    def check_production(self) -> None:
        """Refuse to start in production on settings that would quietly make
        every account forgeable or every database readable."""
        if self.is_dev:
            return
        problems = []
        if self.jwt_secret == "change-me-in-production":
            problems.append("JWT_SECRET is still the public default")
        elif len(self.jwt_secret) < 32:
            import logging

            logging.getLogger("greatskills").warning(
                "JWT_SECRET is shorter than 32 characters; rotate it to a longer random value"
            )
        if self.database_url.startswith("sqlite"):
            problems.append("DATABASE_URL points at sqlite; production must use Postgres")
        if problems:
            raise RuntimeError("Unsafe production settings: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
