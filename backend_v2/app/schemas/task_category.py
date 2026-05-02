# -*- coding: utf-8 -*-
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class TaskCategoryRead(BaseModel):
    task_category_id: int | None = None
    name: str | None = None
    handler: str | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True
