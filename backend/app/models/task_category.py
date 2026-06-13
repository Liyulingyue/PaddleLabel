"""TaskCategory ORM model (detection, classification, ...)."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models._mixins import TimestampMixin


class TaskCategory(Base, TimestampMixin):
    __tablename__ = "task_category"

    task_category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    handler: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    label_format: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
