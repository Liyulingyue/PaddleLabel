# -*- coding: utf-8 -*-
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class UserBase(BaseSchema):
    username: str | None = None
    email: str | None = None
    role_id: int | None = None


class UserCreate(UserBase):
    username: str
    email: str | None = None
    password: str | None = None


class UserUpdate(UserBase):
    pass


class UserRead(UserBase):
    user_id: int | None = None
    uuid: str | None = None
    created: datetime | None = None
    modified: datetime | None = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str
