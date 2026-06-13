"""Predict service - calls PaddleLabel-ML for model inference."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.annotation import Annotation
from app.models.data import Data
from app.models.label import Label
from app.models.project import Project
from app.models.task import Task
from app.util.color import rand_hex_color


async def predict_project(db, project_id: int, body: dict) -> dict:
    settings = get_settings()
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    if not project.data_dir:
        raise HTTPException(status_code=500, detail="Project has no data_dir")

    model = body.get("model")
    if not model:
        raise HTTPException(status_code=400, detail="model is required")
    ml_url = (body.get("ml_backend_url") or settings.ml_backend_url).rstrip("/") + "/"
    url = f"{ml_url}{model}/predict"
    same_server = bool(body.get("same_server", False))
    create_label = bool(body.get("create_label", False))

    # Load labels
    res = await db.execute(select(Label).where(Label.project_id == project_id))
    labels = {l.name: l for l in res.scalars().all()}

    # Load data
    stmt = (
        select(Data)
        .join(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Data.annotations))
    )
    res = await db.execute(stmt)
    data_rows = res.scalars().all()

    processed = 0
    async with httpx.AsyncClient(timeout=300) as client:
        for d in data_rows:
            if d.annotations:
                continue
            img_path = Path(project.data_dir) / d.path
            if not img_path.exists():
                continue
            if same_server:
                req_body = {"img": str(img_path), "format": "path"}
            else:
                with open(img_path, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                req_body = {"img": b64, "format": "b64"}
            try:
                resp = await client.post(url, json=req_body)
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail=f"ML backend error: {exc}")
            if resp.status_code != 200:
                continue
            try:
                result = resp.json()
            except ValueError:
                continue
            label_name = result.get("result") or result.get("label")
            if not label_name:
                continue
            if label_name not in labels:
                if not create_label:
                    continue
                used_ids = {l.id for l in labels.values()}
                nid = max([0] + list(used_ids)) + 1
                while nid in used_ids:
                    nid += 1
                label = Label(
                    project_id=project_id,
                    id=nid,
                    name=label_name,
                    color=rand_hex_color([l.color for l in labels.values() if l.color]),
                )
                db.add(label)
                await db.flush()
                labels[label_name] = label
            ann = Annotation(
                project_id=project_id,
                data_id=d.data_id,
                task_id=d.task_id,
                label_id=labels[label_name].label_id,
                result=result.get("raw", ""),
                type="rectangle",
                predicted_by=str(model),
            )
            db.add(ann)
            processed += 1
    await db.commit()
    return {"message": "finished", "processed": processed}
