"""User routes - login / logout / current user."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.database import DbSession
from app.models.user import User
from app.schemas.user import LoginRequest, UserRead
from app.services.auth import create_access_token
from app.services.password import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["User"])


def _user_to_dict(user: User, token: str | None = None) -> dict:
    return {
        "user_id": user.user_id,
        "uuid": user.uuid,
        "username": user.username,
        "role": user.role,
        "last_login": user.last_login,
        "token": token,
    }


@router.post("/login")
async def login(body: LoginRequest, db: DbSession):
    if not body.username or not body.password:
        raise HTTPException(status_code=400, detail="username and password are required")
    res = await db.execute(select(User).where(User.username == body.username))
    user = res.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user.last_login = datetime.utcnow().isoformat()
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.uuid)
    return _user_to_dict(user, token)


@router.post("/logout")
async def logout():
    """Tokens are stateless - client just discards. Endpoint kept for API compatibility."""
    return {"message": "Logged out"}


@router.get("/current", response_model=None)
async def current_user(db: DbSession, _user = None):
    """Return the current user or null if not authenticated. Read-only, no auth required."""
    if _user is None:
        return None
    return _user_to_dict(_user)


@router.post("/register", response_model=UserRead, include_in_schema=False)
async def register(body: dict, db: DbSession):
    """Convenience: create the first user (no admin yet). No auth required."""
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password are required")
    res = await db.execute(select(User).where(User.username == username))
    if res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Username already exists")
    import uuid

    user = User(
        uuid=uuid.uuid4().hex,
        username=username,
        password=hash_password(password),
        role=body.get("role", "user"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_to_dict(user)
