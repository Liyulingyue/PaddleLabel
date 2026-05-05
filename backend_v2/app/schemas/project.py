# -*- coding: utf-8 -*-
from typing import Optional, Annotated
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, AliasChoices


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class LabelSchema(BaseSchema):
    label_id: int | None = None
    project_id: int | None = None
    id: int | None = None
    name: str
    color: str | None = None
    comment: str | None = None
    super_category_id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None


class TaskCategorySchema(BaseSchema):
    task_category_id: int | None = None
    name: str | None = None


class ProjectBase(BaseSchema):
    name: str | None = None
    description: str | None = None
    data_dir: Annotated[str | None, Field(validation_alias='dataDir')] = None
    task_category_id: Annotated[int | None, Field(validation_alias='taskCategoryId')] = None
    other_settings: Annotated[dict | None, Field(validation_alias='otherSettings')] = None
    all_options: Annotated[dict | None, Field(validation_alias='allOptions')] = None


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