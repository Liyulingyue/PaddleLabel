# -*- coding: utf-8 -*-
"""
推理服务模块
负责处理ML模型推理相关的功能
"""

import json
import os.path as osp
import base64
import requests

import connexion

from paddlelabel.config import db
from paddlelabel.api.model import Project, Task, Label, Annotation
from paddlelabel.api.controller.project_ops import create_label


def predict(project_id):
    """Run prediction on project data using ML backend"""
    _, project = Project._exists(project_id)

    params = connexion.request.json
    if "create_label" not in params.keys():
        params["create_label"] = False
    if "same_server" not in params.keys():
        params["same_server"] = False

    url = params["ml_backend_url"]
    if url[-1] != "/":
        url += "/"
    url += params["model"] + "/predict"
    # print("request url", url)

    headers = {"content-type": "application/json"}

    labels = Label._get(project_id=project_id, many=True)
    labels = {l.name: l.label_id for l in labels}

    for task in Task._get(project_id=project_id, many=True):
        for data in task.datas:
            if len(data.annotations) != 0:
                continue
            if params["same_server"]:
                body = {"img": osp.join(project.data_dir, data.path), "format": "path"}
            else:
                img_b64 = base64.b64encode(open(osp.join(project.data_dir, data.path), "rb").read()).decode("utf-8")
                body = {"img": img_b64, "format": "b64"}
            res = requests.post(url, headers=headers, json=body)
            res = json.loads(res.text)
            if res["result"] not in labels.keys():
                if params["create_label"]:
                    new_label = create_label(project, res["result"])
                    labels[new_label.name] = new_label.id
                else:
                    continue
            ann = Annotation(
                label_id=labels[res["result"]],
                project_id=project.project_id,
                # task_id=task.task_id,
                data_id=data.data_id,
                result="",
            )
            task.annotations.append(ann)
            # print(osp.join(project.data_dir, data.path), res["result"])
    db.session.commit()
    return "finished"