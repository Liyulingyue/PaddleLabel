# -*- coding: utf-8 -*-
"""
数据集导入导出模块
负责处理数据集的导入、导出和相关的数据操作
"""

import math
import random
import json
import os.path as osp
import asyncio
import logging
from pathlib import Path

import connexion

from paddlelabel.config import db
from paddlelabel.api.model import Project, Task, TaskCategory
from paddlelabel.api.util import abort
from paddlelabel.task.util.file import expand_home
import paddlelabel  # for eval later

logger = logging.getLogger("paddlelabel")


def import_dataset(project, data_dir=None, label_format=None, request_json={}):
    """Import dataset from specified directory"""
    data_dir = project.data_dir if data_dir is None else data_dir
    print(f"[DEBUG] importing dataset from {data_dir}")
    task_category = TaskCategory._get(task_category_id=project.task_category_id)

    assert task_category is not None, f"invalid task category id {project.task_category_id}"

    selector = eval(f"paddlelabel.task.{task_category.name}.ProjectSubtypeSelector")()
    answers = request_json.get("all_options", {})
    importer = selector.get_importer(answers, project=project)
    importer(data_dir)
    persists = selector.__persist__
    if len(persists) != 0:
        other_settings = project._get_other_settings()
        for field in persists:
            other_settings[field] = answers[field]
        project.other_settings = json.dumps(other_settings)
        db.session.commit()


def export_dataset(project_id):
    """Export dataset to specified format"""
    # 1. ensure project exists
    _, project = Project._exists(project_id)

    # 2. get handler and exporter
    task_category = TaskCategory._get(task_category_id=project.task_category_id)
    handler = eval(task_category.handler)(project, is_export=True)

    request_json = asyncio.run(connexion.request.json())
    export_format = request_json.get("export_format", None)
    if export_format is None:
        export_format = project.label_format
    if export_format is None or len(export_format) == 0:
        exporter = handler.default_exporter
    else:
        exporter = handler.exporters[export_format]

    # 3. get export path
    params = request_json
    params["export_dir"] = expand_home(params["export_dir"])
    if not Path(params["export_dir"]).is_absolute():
        abort(f"Only support absolute paths, got {params['export_dir']}", 500)
    if osp.exists(osp.join(params["export_dir"], "paddlelabel.warning")):
        abort(
            "This folder is actively used as file store for PaddleLabel. Please specify another folder for export", 500
        )
    # 4. export
    try:
        del params["export_format"]
        exporter(**params)

    except Exception as e:
        logging.exception("Export dataset failed")

        if "detail" in dir(e):
            abort(e.detail, 500, e.title)
        else:
            abort(str(e), 500, str(e))


def to_easydata(project_id):
    """Convert project to EasyData format"""
    _, project = Project._exists(project_id)
    task_category = TaskCategory._get(task_category_id=project.task_category_id)
    handler = eval(task_category.handler)(project)
    handler.to_easydata(project_id=project_id, **{k: connexion.request.json[k] for k in ["access_token", "dataset_id"]})


def split_dataset(project_id):
    """Split dataset into train/val/test sets"""
    Project._exists(project_id)
    request_json = asyncio.run(connexion.request.json())
    split = request_json
    if list(split.keys()) != ["train", "val", "test"]:
        abort(
            f"Got {split}",
            500,
            "Request should provide train, validataion and test percentage",
        )
    if sum(split.values()) != 100:
        abort(
            f"The train({split['train']}), val({split['val']}), test({split['test']}) split don't sum to 100.",
            500,
            "The three percentages don't sum to 100",
        )
    split_num = [0] * 3
    split_num[1] = split["train"] / 100
    split_num[2] = split["val"] / 100
    split = split_num

    for idx in range(1, 3):
        split[idx] += split[idx - 1]

    tasks = Task._get(project_id=project_id, many=True)
    split = [math.ceil(s * len(tasks)) for s in split]
    split.append(len(tasks))

    random.shuffle(tasks)
    for set_idx in range(3):
        for idx in range(split[set_idx], split[set_idx + 1]):
            tasks[idx].set = set_idx
    db.session.commit()
    tasks = Task._get(project_id=project_id, many=True)
    return {
        "train": split[1],
        "val": split[2] - split[1],
        "test": split[3] - split[2],
    }, 200


def import_additional_data(project_id):
    """import additional data

    Args:
        project_id (int): the project to import to
    """
    # 1. get project
    request_json = asyncio.run(connexion.request.json())

    req = request_json
    _, project = Project._exists(project_id)

    # 2. get current project data file names
    tasks = Task._get(project_id=project.project_id, many=True)
    curr_data_names = set()
    for task in tasks:
        for data in task.datas:
            curr_data_names.add(Path(data.path).name)

    # 3. move all new images and all other files to import temp
    import_temp = osp.join(osp.expanduser("~"), ".paddlelabel", "import_temp")
    remove_dir(import_temp)
    create_dir(import_temp)

    import_dir = req["import_dir"]
    import_dir = expand_home(import_dir)
    import_format = req.get("import_format", None)

    if not Path(import_dir).is_absolute():
        abort(f"Only supports absolute import dir", 500)

    if not Path(import_dir).exists():
        abort(f"Import directory '{import_dir}' doesn't exist", 404)

    new_data_paths = listdir(
        import_dir,
        filters={"exclude_prefix": ["."], "include_postfix": image_extensions},
    )
    all_paths = listdir(
        import_dir,
        filters={"exclude_prefix": ["."]},
    )
    all_copy_paths = [p for p in all_paths if p not in new_data_paths]
    new_data_paths = [p for p in new_data_paths if osp.basename(p) not in curr_data_names]
    all_copy_paths += new_data_paths
    for p in all_copy_paths:
        copy(p, import_temp)

    # 4. import
    import_dataset(project, data_dir=import_temp, label_format=import_format, request_json=req)

    # 5. clean up
    remove_dir(import_temp)


def export_dataset(project_id):
    """Export dataset to specified format"""
    # TODO: 实现数据集导出逻辑
    pass


def to_easydata(project_id):
    """Convert project to EasyData format"""
    # TODO: 实现EasyData转换逻辑
    pass


def split_dataset(project_id):
    """Split dataset into train/val/test sets"""
    # TODO: 实现数据集分割逻辑
    pass