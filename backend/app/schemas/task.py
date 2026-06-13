from __future__ import annotations

from app.schemas.base import CamelModel
from app.schemas.label import LabelRead


class TaskBase(CamelModel):
    pass


class TaskCreate(TaskBase):
    data_paths: list[str] = []
    set: int | None = 0


class TaskUpdate(TaskBase):
    set: int | None = None


class TaskRead(CamelModel):
    task_id: int | None = None
    project_id: int | None = None
    data_paths: list[str] = []
    set: int | None = 0
    annotation_count: int | None = 0
    modified: str | None = None
    created: str | None = None
    labels: list[LabelRead] = []
