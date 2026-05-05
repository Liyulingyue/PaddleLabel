# -*- coding: utf-8 -*-
import os
import sys
from pathlib import Path

# Ensure original paddlelabel backend is importable
backend_path = Path("/home/liyulingyue/Codes/PaddleLabel/backend")
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Ensure this package (backend_v2) root is importable
pkg_root = Path(__file__).parent.parent
if str(pkg_root) not in sys.path:
    sys.path.insert(0, str(pkg_root))

import logging
logging.basicConfig(level=logging.INFO)

import paddlelabel
from paddlelabel import configs
from paddlelabel.api.model import Project, Label, Task, Data, Annotation, User, TaskCategory, Tag, TagTask

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

_engine = create_engine(
    configs.db_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


_session_factory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_db():
    db = _session_factory()
    try:
        yield db
    finally:
        db.close()


SessionLocal = _session_factory
