"""Task ORM model - one Task holds 1+ Data records (an image plus its annotations)."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models._mixins import TimestampMixin


class Task(Base, TimestampMixin):
    __tablename__ = "task"

    task_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.project_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    set: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    project = relationship("Project", back_populates="tasks")
    datas = relationship(
        "Data", back_populates="task", cascade="all, delete-orphan", lazy="selectin"
    )
    annotations = relationship(
        "Annotation", back_populates="task", cascade="all, delete-orphan", lazy="selectin"
    )
