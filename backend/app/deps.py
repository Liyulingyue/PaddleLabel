"""Shared FastAPI dependencies: auth, request id, etc."""

from __future__ import annotations

import time

from fastapi import Depends, Header, HTTPException, status

from app.config import get_settings
from app.database import DbSession
from app.models.user import User
from app.services.auth import decode_access_token

_request_ids: list[tuple[float, str]] = []
_REQUEST_TIMEOUT = 2.0


def check_request_id(request_id: str | None = Header(None, alias="X-Request-Id")):
    """Reject duplicate requests inside a short window."""
    if not request_id:
        return
    now = time.time()
    global _request_ids
    _request_ids = [(t, r) for t, r in _request_ids if now - t < _REQUEST_TIMEOUT]
    for ts, rid in _request_ids:
        if rid == request_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate request from {now - ts:.1f}s ago",
            )
    _request_ids.append((now, request_id))


async def get_current_user(
    db: DbSession,
    authorization: str | None = Header(None),
) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(None, 1)[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    uuid = payload.get("sub")
    if not uuid:
        return None
    from sqlalchemy import select

    res = await db.execute(select(User).where(User.uuid == uuid))
    return res.scalar_one_or_none()


async def require_user(
    user: User | None = Depends(get_current_user),
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user
