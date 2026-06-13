"""Setting ORM model - key/value site-level settings (loaded from default_setting.json)."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models._mixins import TimestampMixin


class Setting(Base, TimestampMixin):
    __tablename__ = "setting"

    setting_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    value: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)
