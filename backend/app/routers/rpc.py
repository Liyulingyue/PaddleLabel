"""RPC routes - cache the frontend uses for interactor mask preview."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/rpc", tags=["RPC"])


# In-memory cache. Persisting to DB is overkill for short-lived interactor state.
_CACHE: dict[str, str] = {}


class CacheCreateBody(BaseModel):
    content: str


@router.get("/cache/{cache_id}")
async def get_cache(cache_id: str):
    if cache_id not in _CACHE:
        raise HTTPException(status_code=404, detail="Cache not found")
    return {"content": _CACHE[cache_id]}


@router.post("/cache")
async def create_cache(body: CacheCreateBody):
    cache_id = secrets.token_urlsafe(16)
    _CACHE[cache_id] = body.content
    return {"cacheId": cache_id}
