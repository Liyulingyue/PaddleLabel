"""Files route - serve images from project data_dir. Used by the annotation canvas."""

from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.database import DbSession
from app.models.data import Data
from app.models.task import Task

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/{data_id}")
async def get_file(data_id: int, db: DbSession):
    stmt = (
        select(Data, Task)
        .join(Task, Data.task_id == Task.task_id)
        .where(Data.data_id == data_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if row is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    data, task = row
    if not task.project or not task.project.data_dir:
        raise HTTPException(status_code=500, detail="Project data_dir is not set")
    path = Path(task.project.data_dir) / data.path
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail=f"File not found on disk: {path}")
    mime, _ = mimetypes.guess_type(path)
    return FileResponse(path, media_type=mime or "application/octet-stream")
