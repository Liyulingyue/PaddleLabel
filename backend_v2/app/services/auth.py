# -*- coding: utf-8 -*-
import time
from datetime import datetime, timedelta

from jose import jwt, JWTError

from app.config import get_settings


def create_access_token(uuid: str) -> str:
    settings = get_settings()
    timestamp = int(time.time())
    payload = {
        "iss": settings.jwt_issuer,
        "iat": timestamp,
        "exp": timestamp + settings.jwt_lifetime_seconds,
        "sub": uuid,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
