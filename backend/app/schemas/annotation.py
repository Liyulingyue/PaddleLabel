from __future__ import annotations

from app.schemas.base import CamelModel, TimestampedModel
from app.schemas.label import LabelRead


class AnnotationBase(CamelModel):
    frontend_id: int | None = None
    result: str | None = None
    type: str | None = None
    label_id: int | None = None
    data_id: int | None = None
    task_id: int | None = None
    project_id: int | None = None
    predicted_by: str | None = None


class AnnotationCreate(AnnotationBase):
    data_id: int


class AnnotationUpdate(AnnotationBase):
    pass


class AnnotationRead(AnnotationBase, TimestampedModel):
    annotation_id: int | None = None
    label: LabelRead | None = None
