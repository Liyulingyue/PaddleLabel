# -*- coding: utf-8 -*-
import connexion

from paddlelabel.config import db
from .base import crud
from ..model import Task, Project, Data
from ..schema import TaskSchema, DataSchema
from paddlelabel.api.util import abort, parse_order_by

# TODO: reject tasks with same datas
get_all, get, post, put, delete = crud(Task, TaskSchema)


def get_by_project(project_id, order_by="created asc"):
    if connexion.request.method == "HEAD":
        return get_stat_by_project(project_id)
    Project._exists(project_id)
    order = parse_order_by(Task, order_by)

    tasks = Task.query.filter(Task.project_id == project_id).order_by(order).all()
    return TaskSchema(many=True).dump(tasks), 200


# TODO: dont lazy load annotations in tasks
def get_stat_by_project(project_id):
    Project._exists(project_id)
    tasks = Task.query.filter(Task.project_id == project_id).all()
    ann_count = 0
    for task in tasks:
        if len(task.annotations) != 0:
            ann_count += 1
    res = {"finished": ann_count, "total": len(tasks)}
    return res, 200, res


async def set_all_by_project(project_id):
    data = await connexion.request.json()
    if "data_predicted" in data.keys():
        for task in Task._get(project_id=project_id, many=True):
            for d in task.datas:
                d.predicted = data["data_predicted"]
    db.session.commit()


def get_datas(task_id):
    """Get all datas of a task"""
    Task._exists(task_id)
    datas = Data._get(task_id=task_id, many=True)
    return DataSchema(many=True).dump(datas), 200
