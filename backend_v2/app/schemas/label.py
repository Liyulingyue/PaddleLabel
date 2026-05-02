# -*- coding: utf-8 -*-
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class LabelBase(BaseModel):
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
