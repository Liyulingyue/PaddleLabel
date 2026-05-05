# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BaseTagSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class TagBase(BaseTagSchema):
    project_id: int | None = None
    name: str | None = None
    color: str | None = None
    comment: str | None = None


class TagCreate(TagBase):
    name: str
    project_id: int


class TagUpdate(TagBase):
    pass


class TagRead(TagBase):
    tag_id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True
