"""Token (JWT) issuing and decoding."""

from __future__ import annotations

import time
from typing import Any

import jwt

from app.config import get_settings


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    s = get_settings()
    now = int(time.time())
    payload: dict[str, Any] = {
        "iss": "paddlelabel",
        "iat": now,
        "exp": now + s.jwt_lifetime_seconds,
        "sub": subject,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError:
        return None
