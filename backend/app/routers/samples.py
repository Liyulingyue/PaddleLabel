"""Sample routes + manage/version."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

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


@router.get("/samples/structure")
async def get_sample_structure(path: str = Query(..., description="Relative path under the sample directory")):
    """Return the directory tree (files and subdirs) under the sample path for preview in the project creator."""
    settings = get_settings()
    sample_dir = settings.home / "sample"
    target = (sample_dir / path).resolve()

    # If sample_dir doesn't exist, try legacy location
    if not sample_dir.exists():
        legacy_sample = Path(__file__).resolve().parents[2] / "legacy" / "backend" / "paddlelabel" / "sample"
        if legacy_sample.exists():
            sample_dir = legacy_sample
            target = (sample_dir / path).resolve()

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")

    # security: don't escape sample_dir
    if not str(target).startswith(str(sample_dir)):
        raise HTTPException(status_code=403, detail="Access denied")

    result: list[dict[str, Any]] = []
    for entry in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if entry.name.startswith("."):
            continue
        rel = entry.relative_to(sample_dir)
        result.append({
            "key": str(rel),
            "title": entry.name,
            "isLeaf": entry.is_file(),
            "children": [] if entry.is_dir() else None,
        })
    return result


@router.get("/samples/file")
async def get_sample_file(path: str = Query(..., description="Relative path to the file")):
    """Return a file (e.g. image) from the sample directory for preview."""
    settings = get_settings()
    sample_dir = settings.home / "sample"
    target = (sample_dir / path).resolve()

    if not target.exists() or not target.is_file():
        # Try legacy location
        legacy_sample = Path(__file__).resolve().parents[2] / "legacy" / "backend" / "paddlelabel" / "sample"
        target = (legacy_sample / path).resolve()
        if not target.exists() or not target.is_file():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        sample_dir = legacy_sample

    if not str(target).startswith(str(sample_dir)):
        raise HTTPException(status_code=403, detail="Access denied")

    import mimetypes
    mime, _ = mimetypes.guess_type(target)
    return FileResponse(target, media_type=mime or "application/octet-stream")
