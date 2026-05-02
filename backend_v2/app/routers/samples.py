# -*- coding: utf-8 -*-
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db, Project, TaskCategory

router = APIRouter(prefix="/samples", tags=["sample"])


@router.post("")
def load_sample(body: dict, db: Session = Depends(get_db)):
    task_category_id = body.get("task_category_id")
    if task_category_id is None:
        raise HTTPException(status_code=500, detail="task_category_id is required")

    tc = db.query(TaskCategory).filter(TaskCategory.task_category_id == task_category_id).first()
    if tc is None:
        raise HTTPException(status_code=404, detail=f"Task category {task_category_id} not found")

    from paddlelabel import configs

    sample_dir = configs.sample_dir
    if not sample_dir.exists():
        raise HTTPException(status_code=500, detail="Sample data not found")

    return {"message": "Sample loading not implemented in FastAPI backend", "sample_dir": str(sample_dir)}


@router.get("/structure")
def get_structure(path: str = Query(...), db: Session = Depends(get_db)):
    from paddlelabel import configs

    sample_dir = configs.sample_dir
    target_path = sample_dir / path

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    if target_path.is_file():
        return [{"name": target_path.name, "type": "file"}]

    result = []
    for item in sorted(target_path.iterdir()):
        result.append({
            "name": item.name,
            "type": "dir" if item.is_dir() else "file",
        })
    return result


@router.get("/file")
def get_file(path: str = Query(...)):
    from paddlelabel import configs

    sample_dir = configs.sample_dir
    target_path = sample_dir / path

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(target_path))


@router.get("/reset")
def reset_samples(db: Session = Depends(get_db)):
    from paddlelabel import configs

    sample_dir = configs.sample_dir
    if sample_dir.exists():
        shutil.rmtree(str(sample_dir))
    return {"message": "Samples reset"}
