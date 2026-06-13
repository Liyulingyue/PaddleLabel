"""FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.config import get_settings
from app.database import init_db
from app.routers import annotations, files, labels, projects, rpc, samples, tags, tasks, users
from app.services.seed import seed_default_categories, seed_default_settings, seed_default_user
from app.database import SessionLocal

logger = logging.getLogger("paddlelabel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"PaddleLabel backend v{__version__} starting up")
    logger.info(f"  home  = {settings.home}")
    logger.info(f"  db    = {settings.db_url}")
    await init_db()
    async with SessionLocal() as db:
        await seed_default_categories(db)
        await seed_default_user(db)
        await seed_default_settings(db, None)
    yield
    logger.info("PaddleLabel backend shutting down")


app = FastAPI(
    title="PaddleLabel API",
    version=__version__,
    description="Web backend APIs for PaddleLabel (v2, fresh reimplementation).",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(tags=["manage"])


@api_router.get("/version")
async def get_version() -> str:
    return __version__


@api_router.get("/ping")
async def ping() -> dict:
    return {"message": "pong", "version": __version__}


api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(annotations.router)
api_router.include_router(labels.router)
api_router.include_router(tags.router)
api_router.include_router(samples.router)
api_router.include_router(rpc.router)
api_router.include_router(files.router)

app.include_router(api_router, prefix="/api")

# Serve static frontend if built (optional)
settings = get_settings()
static_dir = settings.home / "static"
if static_dir.exists() and static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


@app.get("/debug/printid/{debug_id}")
async def debug_printid(debug_id: str) -> dict:
    return {"debug_id": debug_id}
