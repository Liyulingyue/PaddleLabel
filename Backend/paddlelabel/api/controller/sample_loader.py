# -*- coding: utf-8 -*-
"""
样本加载模块
负责样本项目的加载和文件服务
"""

import os
import os.path as osp
import asyncio

import connexion
import flask  # TODO: remove this
import paddlelabel  # for eval later

from paddlelabel import configs
from paddlelabel.api.schema import ProjectSchema
from paddlelabel.api.model import TaskCategory, Project
from paddlelabel.api.controller.sample_manager import sample_folders


def load_sample(sample_family="bear"):
    """加载样本项目"""
    request_json = asyncio.run(connexion.request.json())

    task_category_id = request_json.get("task_category_id")
    sample_names = {
        "classification": "分类",
        "detection": "检测",
        "semantic_segmentation": "语义分割",
        "instance_segmentation": "实例分割",
        "optical_character_recognition": "字符识别",
        "point": "点标注",
    }
    task_category = TaskCategory._get(task_category_id=task_category_id)
    data_dir = osp.join(configs.home, "sample", sample_family, *sample_folders[task_category.name])

    name = f"{sample_names[task_category.name]} 样例项目"
    curr_project = Project._get(data_dir=data_dir)
    if curr_project is not None:
        return {"project_id": curr_project.project_id}, 200

    curr_project = Project._get(name=name)
    if curr_project is not None:
        return {"project_id": curr_project.project_id}, 200

    project = {
        "name": name,
        "description": f"PaddleLabel内置 {sample_names[task_category.name]} 样例项目",
        "task_category_id": str(task_category_id),
        "data_dir": data_dir,
        "other_settings": {"isSample": True},
    }
    project = ProjectSchema().load(project)

    selector = eval(f"paddlelabel.task.{task_category.name}.ProjectSubtypeSelector")()
    handler = selector.get_handler(None, project)
    importer = selector.get_importer(None, project)

    try:
        importer(data_dir=data_dir)
    except Exception as e:
        # 确保在出错时删除半创建的项目
        project = Project._get(project_id=handler.project.project_id)
        db.session.delete(project)
        db.session.commit()
        raise e

    return {"project_id": handler.project.project_id}, 200


def sample_folder_structure(path):
    """获取样本文件夹结构"""
    base_path = osp.join(osp.expanduser("~"), ".paddlelabel")
    path.replace("/", osp.sep)
    path = osp.join(base_path, path)

    def dfs(path):
        res = []
        names = os.listdir(path)
        for name in names:
            if name == "paddlelabel.warning":
                continue
            temp = {}
            full_path = osp.join(path, name)
            if osp.isdir(full_path):
                temp["title"] = name
                temp["key"] = osp.relpath(full_path, base_path)
                temp["children"] = dfs(full_path)
                temp["isLeaf"] = False
            else:
                temp["title"] = name
                temp["key"] = osp.relpath(full_path, base_path)
                temp["isLeaf"] = True
            res.append(temp)
        res.sort(key=lambda v: v["isLeaf"], reverse=True)
        return res

    res = dfs(path)
    return res, 200


def serve_sample_file(path):
    """服务样本文件"""
    base_path = osp.join(osp.join(osp.expanduser("~"), ".paddlelabel"))
    path.replace("/", osp.sep)
    path = osp.join(base_path, path)

    file_name = osp.basename(path)
    folder = osp.dirname(path)
    return flask.send_from_directory(folder, file_name)