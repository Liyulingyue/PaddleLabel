"""Sample routes + manage/version."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter
from sqlalchemy import select

from app import __version__
from app.config import get_settings
from app.database import DbSession
from app.models.project import Project

router = APIRouter(tags=["Sample / Manage"])


@router.get("/version")
async def get_version() -> str:
    return __version__


@router.get("/samples")
async def list_samples(db: DbSession):
    res = await db.execute(select(Project))
    out = []
    for p in res.scalars().all():
        settings = p.other_settings or {}
        if settings.get("isSample"):
            out.append(
                {
                    "project_id": p.project_id,
                    "name": p.name,
                    "description": p.description,
                    "task_category_id": p.task_category_id,
                }
            )
    return out
