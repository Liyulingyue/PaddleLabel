"""Annotation ORM model - rectangle, polygon, brush, ocr_polygon, ocr_rectangle."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models._mixins import TimestampMixin


class Annotation(Base, TimestampMixin):
    __tablename__ = "annotation"

    annotation_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    frontend_id: Mapped[Optional[int]] = mapped_column(default=None, nullable=True)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    label_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("label.label_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    data_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("data.data_id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    task_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("task.task_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("project.project_id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    predicted_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    task = relationship("Task", back_populates="annotations")
    data = relationship("Data", back_populates="annotations")
    label = relationship("Label", lazy="joined")
