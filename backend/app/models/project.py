"""Project ORM model."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models._mixins import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "project"

    project_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_dir: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    task_category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("task_category.task_category_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    other_settings: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)

    task_category = relationship("TaskCategory", lazy="joined")
    tasks = relationship(
        "Task", back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
    labels = relationship(
        "Label", back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
    tags = relationship(
        "Tag", back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
