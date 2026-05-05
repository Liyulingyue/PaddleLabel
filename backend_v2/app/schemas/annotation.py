# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


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

    class Config:
        from_attributes = True


class AnnotationBase(BaseModel):
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


class AnnotationRead(AnnotationBase):
    annotation_id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None
    label: LabelSchema | None = None

    class Config:
        from_attributes = True
