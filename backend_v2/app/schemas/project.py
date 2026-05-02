# -*- coding: utf-8 -*-
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class LabelSchema(BaseModel):
    label_id: int | None = None
    project_id: int | None = None
    id: int | None = None
    name: str
    color: str | None = None
    comment: str | None = None
    super_category_id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True


class TaskCategorySchema(BaseModel):
    task_category_id: int | None = None
    name: str | None = None
    handler: str | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str | None = None
    description: str | None = None
    data_dir: str | None = None
    task_category_id: int | None = None
    other_settings: dict | None = None
    all_options: dict | None = Field(None, exclude=True)


class ProjectCreate(ProjectBase):
    name: str
    data_dir: str
    task_category_id: int
    labels: list[LabelSchema] | None = None


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    project_id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None
    upid: str | None = None
    task_category: TaskCategorySchema | None = None
    labels: list[LabelSchema] = []

    class Config:
        from_attributes = True
