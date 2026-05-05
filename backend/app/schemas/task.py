# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class TaskBase(BaseSchema):
    project_id: int | None = None
    set: int | None = None


class TaskCreate(TaskBase):
    project_id: int


class TaskUpdate(TaskBase):
    pass


class AnnotationSchema(BaseModel):
    annotation_id: int | None = None
    frontend_id: int | None = None
    result: str | None = None
    type: str | None = None
    label_id: int | None = None
    data_id: int | None = None
    task_id: int | None = None
    project_id: int | None = None
    predicted_by: str | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True


class DataSchema(BaseModel):
    data_id: int | None = None
    task_id: int | None = None
    path: str | None = None
    size: str | None = None
    predicted: bool | None = None
    created: datetime | None = None
    modified: datetime | None = None
    sault: str | None = None

    class Config:
        from_attributes = True


class TaskRead(TaskBase):
    task_id: int | None = None
    data_paths: list[str] = []
    annotations: list[AnnotationSchema] = []
    annotation_count: int = 0
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True
