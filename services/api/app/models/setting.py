from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SiteSetting(Base):
    """Site-wide switches an admin can change without a deploy, one row per
    key. Read through app/services, never straight from routes, so each
    setting keeps one default and one meaning."""

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
