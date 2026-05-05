# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class DataBase(BaseSchema):
    task_id: int | None = None
    path: str | None = None
    size: str | None = None
    predicted: bool | None = None


class DataCreate(DataBase):
    task_id: int


class DataUpdate(DataBase):
    pass


class DataRead(DataBase):
    data_id: int | None = None
    created: datetime | None = None
    modified: datetime | None = None
    sault: str | None = None

    class Config:
        from_attributes = True
