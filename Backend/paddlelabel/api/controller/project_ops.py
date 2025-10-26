# -*- coding: utf-8 -*-
"""
项目管理操作模块
负责处理项目的创建、更新、删除等管理操作
"""

import json
import logging
import os
from pathlib import Path

from paddlelabel.config import db
from paddlelabel.api.model import Project, Label
from paddlelabel.api.schema import ProjectSchema
from paddlelabel.api.controller.base import crud
from paddlelabel.api.controller.dataset_io import import_dataset
from paddlelabel.task.util import rand_hex_color
from paddlelabel.task.util.file import expand_home

logger = logging.getLogger("paddlelabel")


def pre_add(new_project, se):
    """Pre-add hook for project creation"""
    new_project.data_dir = expand_home(new_project.data_dir)
    if not os.path.isabs(new_project.data_dir):
        from paddlelabel.api.util import abort
        abort("Dataset Path is not absolute path", 409)
    if not Path(new_project.data_dir).exists():
        from paddlelabel.api.util import abort
        abort(f"Dataset Path {new_project.data_dir} doesn't exist", 404)

    return new_project


def post_add(new_project, se, request_json={}):
    """Post-add hook for project creation - run dataset import"""

    try:
        import_dataset(new_project, request_json=request_json)
    except Exception as e:
        project = Project.query.filter(Project.project_id == new_project.project_id).one()
        db.session.delete(project)
        db.session.commit()

        logger.exception("Create project failed", exc_info=True)

        if "detail" in dir(e):
            from paddlelabel.api.util import abort
            abort(e.detail, 500, e.title)
        else:
            from paddlelabel.api.util import abort
            abort(str(e), 500, str(e))

    return new_project


def pre_put(project, body, se):
    """Pre-put hook for project updates"""
    if "other_settings" in body.keys():
        body["other_settings"] = json.dumps(body["other_settings"])
    return project, body


def create_label(project, label_name):
    """Create a new label for the project"""
    color = rand_hex_color([l.color for l in project.labels])
    ids = [l.id for l in project.labels]
    ids.append(0)
    label = Label(
        id=max(ids) + 1,
        project_id=project.project_id,
        name=label_name,
        color=color,
    )
    project.labels.append(label)
    db.session.commit()
    return label


def post_delete(project, se):
    """Post-delete hook for project cleanup"""
    warning_path = Path(project.data_dir) / "paddlelabel.warning"
    if warning_path.exists():
        warning_path.unlink()


# CRUD operations with triggers
get_all, get, post, put, delete = crud(
    Project,
    ProjectSchema,
    triggers=[pre_add, post_add, pre_put, post_delete],
)