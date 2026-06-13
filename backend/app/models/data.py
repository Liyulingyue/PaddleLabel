"""Data ORM model - one image (or other file) belonging to a Task."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models._mixins import TimestampMixin


class Data(Base, TimestampMixin):
    __tablename__ = "data"

    data_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("task.task_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    size: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    predicted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sault: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    task = relationship("Task", back_populates="datas")
    annotations = relationship(
        "Annotation", back_populates="data", cascade="all, delete-orphan", lazy="selectin"
    )
