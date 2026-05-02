# -*- coding: utf-8 -*-
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

from app.config import get_settings
from app.routers import projects, tasks, datas, annotations, labels, tags, users, samples, rpc

logger = logging.getLogger("paddlelabel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"Using database: {settings.database_url}")
    yield


app = FastAPI(
    title="PaddleLabel API",
    version="1.0.2",
    description="Web backend APIs for PaddleLabel",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
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
def get_version():
    from paddlelabel import __version__
    return __version__


api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(datas.router)
api_router.include_router(annotations.router)
api_router.include_router(labels.router)
api_router.include_router(tags.router)
api_router.include_router(users.router)
api_router.include_router(samples.router)
api_router.include_router(rpc.router)
app.include_router(api_router, prefix="/api")


@app.get("/debug/printid/{debug_id}")
def debug_printid(debug_id: str):
    return {"debug_id": debug_id}
