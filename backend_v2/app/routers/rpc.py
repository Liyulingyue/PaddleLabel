# -*- coding: utf-8 -*-
import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/rpc", tags=["rpc"])

_cache: dict[str, str] = {}


@router.post("/folders")
def get_folders(body: dict):
    folder_path = body.get("path", "")
    if not folder_path:
        return []

    target = Path(folder_path).expanduser()
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    result = []
    for item in sorted(target.iterdir()):
        if item.name.startswith("."):
            continue
        result.append({
            "name": item.name,
            "type": "dir" if item.is_dir() else "file",
        })
    return result


@router.post("/seg/polygon2points")
def polygon2points(body: dict):
    polygon = body.get("polygon", "")
    if not polygon:
        return []

    try:
        coords = polygon.split(";")
        points = []
        for coord in coords:
            x, y = coord.split(",")
            points.append(f"{x},{y}")
        return points
    except:
        raise HTTPException(status_code=500, detail="Invalid polygon format")


@router.post("/seg/points2polygon")
def points2polygon(body: dict):
    points_str = body.get("points", "")
    if not points_str:
        return []

    try:
        coords = points_str.split(";")
        return [f"{x},{y}" for x, y in [c.split(",") for c in coords]]
    except:
        raise HTTPException(status_code=500, detail="Invalid points format")


@router.post("/cache")
def create_cache(body: dict):
    content = body.get("content", "")
    cache_id = hashlib.md5(f"{uuid.uuid4()}{content}".encode()).hexdigest()
    _cache[cache_id] = content
    return {"cache_id": cache_id}


@router.get("/cache/{cache_id}")
def get_cache(cache_id: str):
    if cache_id not in _cache:
        raise HTTPException(status_code=404, detail="Cache not found")
    return {"content": _cache[cache_id]}
