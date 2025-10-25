# -*- coding: utf-8 -*-
"""
样本管理模块
负责样本文件夹的准备、重置和管理
"""

import json
import os
import os.path as osp
from pathlib import Path
from datetime import datetime

from paddlelabel import configs
from paddlelabel.api.model import Project
from paddlelabel.task.util.file import copy, copy_content
from paddlelabel.config import db

# TODO: move this to be registered in sub category selector
sample_folders = {
    "classification": ["classification", "singleClass"],
    "detection": ["detection", "coco"],
    "semantic_segmentation": ["semanticSegmentation", "mask"],
    "instance_segmentation": ["instanceSegmentation", "coco"],
    "optical_character_recognition": ["opticalCharacterRecognition", "txt"],
    "point": ["point", "labelme"],
}


def prep_samples():
    """准备样本数据"""
    sample_dst = configs.sample_dir
    sample_source = str(configs.install_base / "sample")
    copy_content(sample_source, sample_dst)

    dsts = [
        "bear/placeholder/1/1.jpeg",
        "bear/placeholder/2/2.jpeg",
        "bear/placeholder/3/3.jpeg",
        "bear/placeholder/4/4.jpeg",
        "bear/classification/multiClass/image/1.jpeg",
        "bear/classification/multiClass/image/2.jpeg",
        "bear/classification/multiClass/image/3.jpeg",
        "bear/classification/multiClass/image/4.jpeg",
        "bear/classification/singleClass/1只熊/1.jpeg",
        "bear/classification/singleClass/2只熊/2.jpeg",
        "bear/classification/singleClass/3只熊/3.jpeg",
        "bear/classification/singleClass/4.jpeg",
        "bear/detection/coco/JPEGImages/1.jpeg",
        "bear/detection/coco/JPEGImages/2.jpeg",
        "bear/detection/coco/JPEGImages/3.jpeg",
        "bear/detection/coco/JPEGImages/4.jpeg",
        "bear/detection/voc/JPEGImages/1.jpeg",
        "bear/detection/voc/JPEGImages/2.jpeg",
        "bear/detection/voc/JPEGImages/3.jpeg",
        "bear/detection/voc/JPEGImages/4.jpeg",
        "bear/detection/yolo/JPEGImages/1.jpeg",
        "bear/detection/yolo/JPEGImages/2.jpeg",
        "bear/detection/yolo/JPEGImages/3.jpeg",
        "bear/detection/yolo/JPEGImages/4.jpeg",
        "bear/img/1.jpeg",
        "bear/img/2.jpeg",
        "bear/img/3.jpeg",
        "bear/img/4.jpeg",
        "bear/instanceSegmentation/mask/JPEGImages/1.jpeg",
        "bear/instanceSegmentation/mask/JPEGImages/2.jpeg",
        "bear/instanceSegmentation/mask/JPEGImages/3.jpeg",
        "bear/instanceSegmentation/mask/JPEGImages/4.jpeg",
        "bear/instanceSegmentation/coco/image/1.jpeg",
        "bear/instanceSegmentation/coco/image/2.jpeg",
        "bear/instanceSegmentation/coco/image/3.jpeg",
        "bear/instanceSegmentation/coco/image/4.jpeg",
        "bear/instanceSegmentation/eiseg/1.jpeg",
        "bear/instanceSegmentation/eiseg/2.jpeg",
        "bear/instanceSegmentation/eiseg/3.jpeg",
        "bear/instanceSegmentation/eiseg/4.jpeg",
        "bear/semanticSegmentation/mask/JPEGImages/1.jpeg",
        "bear/semanticSegmentation/mask/JPEGImages/2.jpeg",
        "bear/semanticSegmentation/mask/JPEGImages/3.jpeg",
        "bear/semanticSegmentation/mask/JPEGImages/4.jpeg",
        "bear/semanticSegmentation/coco/image/1.jpeg",
        "bear/semanticSegmentation/coco/image/2.jpeg",
        "bear/semanticSegmentation/coco/image/3.jpeg",
        "bear/semanticSegmentation/coco/image/4.jpeg",
        "bear/semanticSegmentation/eiseg/1.jpeg",
        "bear/semanticSegmentation/eiseg/2.jpeg",
        "bear/semanticSegmentation/eiseg/3.jpeg",
        "bear/semanticSegmentation/eiseg/4.jpeg",
        "bear/opticalCharacterRecognition/txt/05.jpg",
        "bear/opticalCharacterRecognition/txt/06.jpg",
        "bear/opticalCharacterRecognition/txt/07.jpg",
        "bear/opticalCharacterRecognition/txt/08.jpg",
        "bear/opticalCharacterRecognition/txt/09.jpg",
        "bear/opticalCharacterRecognition/txt/10.jpg",
        "bear/opticalCharacterRecognition/txt/11.png",
        "bear/point/labelme/JPEGImages/1.jpeg",
        "bear/point/labelme/JPEGImages/2.jpeg",
        "bear/point/labelme/JPEGImages/3.jpeg",
        "bear/point/labelme/JPEGImages/4.jpeg",
        "fruit/classification/multiClass/image/1.jpeg",
        "fruit/classification/multiClass/image/2.jpeg",
        "fruit/classification/multiClass/image/3.jpeg",
        "fruit/classification/multiClass/image/4.jpeg",
        "fruit/classification/multiClass/image/5.jpeg",
        "fruit/placeholder/梨/2.jpeg",
        "fruit/placeholder/梨/4.jpeg",
        "fruit/placeholder/苹果/1.jpeg",
        "fruit/placeholder/苹果/3.jpeg",
        "fruit/classification/singleClass/梨/2.jpeg",
        "fruit/classification/singleClass/梨/4.jpeg",
        "fruit/classification/singleClass/苹果/1.jpeg",
        "fruit/classification/singleClass/苹果/3.jpeg",
        "fruit/classification/singleClass/5.jpeg",
        "fruit/detection/coco/image/1.jpeg",
        "fruit/detection/coco/image/2.jpeg",
        "fruit/detection/coco/image/3.jpeg",
        "fruit/detection/coco/image/4.jpeg",
        "fruit/detection/coco/image/5.jpeg",
        "fruit/detection/voc/JPEGImages/1.jpeg",
        "fruit/detection/voc/JPEGImages/2.jpeg",
        "fruit/detection/voc/JPEGImages/3.jpeg",
        "fruit/detection/voc/JPEGImages/4.jpeg",
        "fruit/detection/voc/JPEGImages/5.jpeg",
        "fruit/detection/yolo/JPEGImages/1.jpeg",
        "fruit/detection/yolo/JPEGImages/2.jpeg",
        "fruit/detection/yolo/JPEGImages/3.jpeg",
        "fruit/detection/yolo/JPEGImages/4.jpeg",
        "fruit/detection/yolo/JPEGImages/5.jpeg",
        "fruit/img/1.jpeg",
        "fruit/img/2.jpeg",
        "fruit/img/3.jpeg",
        "fruit/img/4.jpeg",
        "fruit/img/5.jpeg",
        "fruit/instanceSegmentation/mask/JPEGImages/1.jpeg",
        "fruit/instanceSegmentation/mask/JPEGImages/2.jpeg",
        "fruit/instanceSegmentation/mask/JPEGImages/3.jpeg",
        "fruit/instanceSegmentation/mask/JPEGImages/4.jpeg",
        "fruit/instanceSegmentation/mask/JPEGImages/5.jpeg",
        "fruit/instanceSegmentation/coco/image/1.jpeg",
        "fruit/instanceSegmentation/coco/image/2.jpeg",
        "fruit/instanceSegmentation/coco/image/3.jpeg",
        "fruit/instanceSegmentation/coco/image/4.jpeg",
        "fruit/instanceSegmentation/coco/image/5.jpeg",
        "fruit/semanticSegmentation/mask/JPEGImages/1.jpeg",
        "fruit/semanticSegmentation/mask/JPEGImages/2.jpeg",
        "fruit/semanticSegmentation/mask/JPEGImages/3.jpeg",
        "fruit/semanticSegmentation/mask/JPEGImages/4.jpeg",
        "fruit/semanticSegmentation/mask/JPEGImages/5.jpeg",
        "fruit/semanticSegmentation/coco/image/1.jpeg",
        "fruit/semanticSegmentation/coco/image/2.jpeg",
        "fruit/semanticSegmentation/coco/image/3.jpeg",
        "fruit/semanticSegmentation/coco/image/4.jpeg",
        "fruit/semanticSegmentation/coco/image/5.jpeg",
    ]
    for dst in dsts:
        img_fdr = osp.join(sample_source, dst.split("/")[0], "img")
        dst = osp.join(sample_dst, dst)
        src = osp.join(img_fdr, osp.basename(dst))
        copy(src, dst, make_dir=True)


def reset_samples(remove_current_sample_projects: bool = True):
    """重置样本数据

    Args:
        remove_current_sample_projects (bool, optional): 是否删除数据库中的样本项目。只有当用户在前端点击重置样本按钮时才会为True。默认为True。

    - 重置样本文件夹下的文件
    - 删除所有已创建的样本项目
    - 如果存在，将备份当前的样本文件夹
    """

    if configs.sample_dir.exists():
        back_up_path = (
            Path(configs.sample_dir).parent
            / f"{str(datetime.now()).split('.')[0].replace(' ', '_').replace(':', '_')}-sample_bk"
        )
        configs.sample_dir.rename(back_up_path)

    # 删除数据库中的样本项目
    for project in Project._get(many=True):
        if project._get_other_settings()["isSample"]:
            db.session.delete(project)
    db.session.commit()

    # 重新准备样本数据
    prep_samples()