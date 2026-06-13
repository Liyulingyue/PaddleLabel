"""Label ORM model."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models._mixins import TimestampMixin


class Label(Base, TimestampMixin):
    __tablename__ = "label"

    label_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.project_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    super_category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("label.label_id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)

    project = relationship("Project", back_populates="labels")
