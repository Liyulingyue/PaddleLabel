# -*- coding: utf-8 -*-
import time

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth import decode_access_token
from app.database import User as UserModel


_request_ids: list[tuple[float, str]] = []


def check_request_id(request_id: str | None = None):
    if request_id is None or len(request_id) == 0:
        return
    global _request_ids
    curr_time = time.time()
    _request_ids = [(t, rid) for t, rid in _request_ids if curr_time - t < 2.0]
    for ts, rid in _request_ids:
        if rid == request_id:
            raise HTTPException(status_code=409, detail=f"Duplicate request from {curr_time - ts}s ago")
    _request_ids.append((curr_time, request_id))


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(None),
) -> UserModel:
    if authorization is None or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    payload = decode_access_token(token)
    if payload is None:
        return None
    uuid = payload.get("sub")
    if uuid is None:
        return None
    user = db.query(UserModel).filter(UserModel.uuid == uuid).first()
    return user


def require_auth(user: UserModel = Depends(get_current_user)) -> UserModel:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user
