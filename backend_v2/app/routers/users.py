# -*- coding: utf-8 -*-
import hashlib
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, User
from app.schemas.user import UserCreate, UserUpdate, UserRead, LoginRequest
from app.services.auth import create_access_token

router = APIRouter(prefix="/users", tags=["User"])


def _user_to_dict(u: User) -> dict:
    return {
        "user_id": u.user_id,
        "uuid": u.uuid,
        "username": u.username,
        "email": u.email,
        "role_id": u.role_id,
        "created": u.created,
        "modified": u.modified,
    }


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [_user_to_dict(u) for u in users]


@router.post("", response_model=UserRead, status_code=201)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    password_hash = hashlib.sha256((user_in.password or "default").encode()).hexdigest()
    user = User(
        uuid=str(uuid_lib.uuid4()),
        username=user_in.username,
        email=user_in.email,
        password=password_hash,
        role_id=user_in.role_id or 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_dict(user)


@router.get("/{uuid}")
def get_user(uuid: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uuid == uuid).first()
    if user is None:
        raise HTTPException(status_code=404, detail=f"No user with uuid {uuid}")
    return _user_to_dict(user)


@router.put("/{uuid}", response_model=UserRead)
def update_user(uuid: str, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uuid == uuid).first()
    if user is None:
        raise HTTPException(status_code=404, detail=f"No user with uuid {uuid}")
    for k, v in user_in.model_dump(exclude_unset=True).items():
        if k == "password" and v:
            v = hashlib.sha256(v.encode()).hexdigest()
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return _user_to_dict(user)


@router.delete("/{uuid}")
def delete_user(uuid: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uuid == uuid).first()
    if user is None:
        raise HTTPException(status_code=404, detail=f"No user with uuid {uuid}")
    db.delete(user)
    db.commit()
    return {"message": f"User {uuid} deleted"}


@router.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    user = db.query(User).filter(User.username == credentials.username, User.password == password_hash).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user.uuid)
    return token
