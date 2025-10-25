# -*- coding: utf-8 -*-
"""
项目控制器模块
统一接口，整合数据集IO、项目管理和推理功能
"""

from paddlelabel.api.controller.dataset_io import (
    import_dataset,
    import_additional_data,
    export_dataset,
    to_easydata,
    split_dataset,
)
from paddlelabel.api.controller.project_ops import (
    get_all,
    get,
    post,
    put,
    delete,
    create_label,
)
from paddlelabel.api.controller.inference import predict
from paddlelabel.api.util import camel2snake
from paddlelabel.api.model import TaskCategory
import paddlelabel  # for eval later


def get_options(im_or_export: str, project_type: str):
    """Get import/export options for project type"""
    project_type = camel2snake(project_type)
    all_catgs = TaskCategory._get(many=True)
    assert project_type in [c.name for c in all_catgs], f"Project type specified {project_type} isn't supported"
    selector = eval(f"paddlelabel.task.{project_type}.ProjectSubtypeSelector")()
    if im_or_export == "import":
        return selector.import_questions
    else:
        return selector.export_questions
