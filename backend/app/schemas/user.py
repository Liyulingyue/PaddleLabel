from __future__ import annotations

from app.schemas.base import CamelModel


class LoginRequest(CamelModel):
    username: str
    password: str


class UserCreate(CamelModel):
    username: str
    password: str
    role: str | None = "user"


class UserRead(CamelModel):
    user_id: int | None = None
    uuid: str | None = None
    username: str | None = None
    role: str | None = None
    last_login: str | None = None
    token: str | None = None
