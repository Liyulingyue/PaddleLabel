# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class TaskCategoryRead(BaseSchema):
    task_category_id: int | None = None
    name: str | None = None
    handler: str | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True
