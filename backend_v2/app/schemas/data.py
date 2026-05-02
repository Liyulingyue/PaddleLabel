# -*- coding: utf-8 -*-
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class DataBase(BaseModel):
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
