from __future__ import annotations

from app.schemas.base import CamelModel, TimestampedModel
from app.schemas.annotation import AnnotationRead


class DataBase(CamelModel):
    path: str | None = None
    size: str | None = None
    predicted: bool | None = False
    sault: str | None = None


class DataCreate(DataBase):
    path: str
    task_id: int | None = None


class DataUpdate(DataBase):
    predicted: bool | None = None


class DataRead(DataBase, TimestampedModel):
    data_id: int | None = None
    task_id: int | None = None
    annotations: list[AnnotationRead] = []
