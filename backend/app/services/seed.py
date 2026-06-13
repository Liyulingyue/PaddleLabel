"""One-shot DB initialization: default user, default task categories, default settings."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.label import Label
from app.models.project import Project
from app.models.setting import Setting
from app.models.task_category import TaskCategory
from app.models.user import User
from app.services.password import hash_password


DEFAULT_CATEGORIES = [
    {"name": "classification", "handler": "app.task.classification", "label_format": "clsList"},
    {"name": "detection", "handler": "app.task.detection", "label_format": "voc"},
    {"name": "semantic_segmentation", "handler": "app.task.segmentation", "label_format": "mask"},
    {"name": "instance_segmentation", "handler": "app.task.segmentation", "label_format": "eiseg"},
    {"name": "optical_character_recognition", "handler": "app.task.ocr", "label_format": "default"},
]


async def seed_default_categories(db: AsyncSession) -> None:
    for c in DEFAULT_CATEGORIES:
        res = await db.execute(select(TaskCategory).where(TaskCategory.name == c["name"]))
        if res.scalar_one_or_none() is not None:
            continue
        db.add(TaskCategory(name=c["name"], handler=c["handler"], label_format=c["label_format"]))
    await db.commit()


async def seed_default_user(db: AsyncSession) -> User:
    res = await db.execute(select(User).where(User.username == "admin"))
    user = res.scalar_one_or_none()
    if user is not None:
        return user
    import uuid

    user = User(
        uuid=uuid.uuid4().hex,
        username="admin",
        password=hash_password("admin"),
        role="admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def seed_default_settings(db: AsyncSession, defaults_path: Path | None) -> None:
    defaults: dict = {}
    if defaults_path and defaults_path.exists():
        try:
            defaults = json.loads(defaults_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            defaults = {}
    # Always have an entry called 'site' with the defaults
    res = await db.execute(select(Setting).where(Setting.name == "site"))
    site = res.scalar_one_or_none()
    if site is None:
        site = Setting(name="site", value=defaults)
        db.add(site)
    else:
        # merge new defaults
        merged = {**(site.value or {}), **defaults}
        site.value = merged
    await db.commit()
