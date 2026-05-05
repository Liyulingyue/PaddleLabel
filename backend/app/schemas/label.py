# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BaseLabelSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class LabelBase(BaseLabelSchema):
    name: str
    color: str | None = None
    comment: str | None = None
    super_category_id: int | None = None
    project_id: int | None = None
    id: int | None = None


class LabelCreate(LabelBase):
    pass


class LabelUpdate(LabelBase):
    pass


class LabelRead(LabelBase):
    label_id: int | None = None
    project_id: int | None = None
    id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True
