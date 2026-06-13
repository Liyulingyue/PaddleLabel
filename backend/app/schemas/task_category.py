from __future__ import annotations

from app.schemas.base import CamelModel


class TaskCategoryRead(CamelModel):
    task_category_id: int | None = None
    name: str | None = None
    handler: str | None = None
    label_format: str | None = None
