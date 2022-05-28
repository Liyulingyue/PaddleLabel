import os.path as osp
import json
from copy import deepcopy

from pycocotoolse.coco import COCO
import cv2

from pplabel.api import Task, Annotation, Label
from pplabel.task.util import create_dir, listdir, copy, image_extensions
from pplabel.task.base import BaseTask
from pplabel.config import db

# TODO: move to io
def parse_voc_label(label_path):
    from xml.dom import minidom

    def data(elements):
        return elements[0].firstChild.data

    file = minidom.parse(label_path)
    objects = file.getElementsByTagName("object")
    res = []
    for object in objects:
        temp = {}
        temp["label_name"] = data(object.getElementsByTagName("name"))
        bndbox = object.getElementsByTagName("bndbox")[0]
        temp["result"] = {}
        temp["result"]["xmin"] = data(bndbox.getElementsByTagName("xmin"))
        temp["result"]["xmax"] = data(bndbox.getElementsByTagName("xmax"))
        temp["result"]["ymin"] = data(bndbox.getElementsByTagName("ymin"))
        temp["result"]["ymax"] = data(bndbox.getElementsByTagName("ymax"))
        temp["result"] = json.dumps(temp["result"])
        res.append(temp)
    return res


def create_voc_label(filename, width, height, annotations):
    from xml.dom import minidom

    object_labels = ""
    r = json.loads(ann.result)
    for ann in annotations:
        object_labels += f"""
    <object>
    <name>{ann.label.name}</name>
    <bndbox>
      <xmin>{r['xmin']}</xmin>
      <ymin>{r['ymin']}</ymin>
      <xmax>{r['xmax']}</xmax>
      <ymax>{r['ymax']}</ymax>
    </bndbox>
    </object>
"""
    voc_label = f"""
<?xml version='1.0' encoding='UTF-8'?>
<annotation>
  <filename>{filename}</filename>
  <object_num>{len(annotations)}</object_num>
  <size>
    <width>{width}</width>
    <height>{height}</height>
  </size>
{object_labels}
</annotation>
"""
    # TODO: beautify export xml
    # return minidom.parseString(voc_label.strip()).toprettyxml(indent="    ", newl="")
    return voc_label.strip()


class Detection(BaseTask):
    def __init__(self, project):
        super().__init__(project)
        self.importers = {"coco": self.coco_importer, "voc": self.voc_importer}
        self.exporters = {"coco": self.coco_exporter, "voc": self.voc_exporter}  # TODO: change
        # self.default_importer = self.default_importer # default to voc
        self.default_importer = self.voc_exporter  # default to voc
        self.default_exporter = self.voc_importer

    def coco_importer(
        self,
        data_dir=None,
        filters={"exclude_prefix": ["."], "include_postfix": image_extensions},
    ):
        """
        images should be located at data_dir / file_name in coco annotation
        """
        # TODO: supercategory
        # TODO: coco中其他信息

        # 1. set params
        project = self.project
        if data_dir is None:
            data_dir = project.data_dir
        label_file_paths = ["train.json", "val.json", "test.json"]
        label_file_paths = [osp.join(data_dir, f) for f in label_file_paths]

        self.create_warning(data_dir)

        def _coco_importer(data_paths, label_file_path, set=0):
            coco = COCO(label_file_path)
            ann_by_task = {}
            # get image full paths
            for idx, img in coco.imgs.items():
                file_name = img["file_name"]
                full_path = filter(lambda p: p[-len(file_name) :] == file_name, data_paths)
                full_path = list(full_path)
                if len(full_path) != 1:
                    raise RuntimeError(
                        f"{'No' if len(full_path) == 0 else 'Multiple'} image(s) with path ending with {file_name} found under {data_dir}"
                    )
                full_path = full_path[0]
                data_paths.remove(full_path)
                coco.imgs[idx]["full_path"] = full_path
                # TODO: read image decide width height if not found
                s = [img["width"], img["height"]]
                s = [str(t) for t in s]
                coco.imgs[idx]["size"] = ",".join(s)
                ann_by_task[img["id"]] = []

            # get ann by image
            for ann_id in coco.getAnnIds():
                ann = coco.anns[ann_id]
                label_name = coco.cats[ann["category_id"]]["name"]
                # result = {}
                # result["xmin"] = ann["bbox"][0]
                # result["ymin"] = ann["bbox"][1]
                # result["xmax"] = result["xmin"] + ann["bbox"][2]
                # result["ymax"] = result["ymin"] + ann["bbox"][3]
                # image center as origin, right x down y
                res = ann["bbox"]
                width, height = (
                    coco.imgs[ann["image_id"]].get("width", None),
                    coco.imgs[ann["image_id"]].get("height", None),
                )
                res[2] += res[0]
                res[3] += res[1]
                res[0] -= width / 2
                res[1] -= height / 2
                res[2] -= width / 2
                res[3] -= height / 2

                res = [str(r) for r in res]
                res = ",".join(res)
                # curr_anns = ann_by_task.get(ann["image_id"], [])
                ann_by_task[ann["image_id"]].append(
                    {
                        "label_name": label_name,
                        "result": res,
                        "type": "rectangle",
                        "frontend_id": len(ann_by_task[ann["image_id"]]) + 1,
                    }
                )

            # add tasks
            for img_id, annotations in list(ann_by_task.items()):
                data_path = coco.imgs[img_id]["full_path"]
                size = "1," + coco.imgs[img_id]["size"]
                print(data_path, size)
                self.add_task([{"path": data_path, "size": size}], [annotations], split=set)
            return data_paths

        # 2. find all images under data_dir
        data_paths = listdir(data_dir, filters=filters)
        for split_idx, label_file_path in enumerate(label_file_paths):
            data_paths = _coco_importer(data_paths, label_file_path, split_idx)

        # 3. add tasks without label
        for data_path in data_paths:
            img = cv2.imread(osp.join(data_dir, data_path))
            s = img.shape
            size = [1, s[1], s[0], s[2]]
            size = [str(s) for s in size]
            size = ",".join(size)
            self.add_task([{"path": data_path, "size": size}])

        db.session.commit()

    def voc_importer(
        self,
        data_dir=None,
        filters={"exclude_prefix": ["."]},
    ):
        project = self.project
        base_dir = data_dir
        if base_dir is None:
            base_dir = project.data_dir

        data_dir = osp.join(base_dir, "JPEGImages")
        label_dir = osp.join(base_dir, "Annotations")

        create_dir(data_dir)
        self.create_warning(data_dir)

        data_paths = listdir(data_dir, filters=filters)
        label_paths = listdir(label_dir, filters=filters)
        data_paths = [osp.join(data_dir, p) for p in data_paths]
        label_paths = [osp.join(label_dir, p) for p in label_paths]

        label_name_dict = {}
        labels = []
        for label_path in label_paths:
            labels.append(parse_voc_label(label_path))
            label_name_dict[osp.basename(label_path).split(".")[0]] = len(labels) - 1

        for data_path in data_paths:
            id = osp.basename(data_path).split(".")[0]
            label_idx = label_name_dict.get(id, -1)
            self.add_task([data_path], [labels[label_idx] if label_idx != -1 else []])
        db.session.commit()

    def coco_exporter(self, export_dir):
        # 1. set params
        project = self.project

        # 2. create coco with all tasks
        coco = COCO()
        # 2.1 add categories
        labels = Label._get(project_id=project.project_id, many=True)
        for label in labels:
            coco.addCategory(label.id, label.name, label.color)
        # 2.2 add images
        split = [set(), set(), set()]
        tasks = Task._get(project_id=project.project_id, many=True)
        data_dir = osp.join(export_dir, "image")
        create_dir(data_dir)
        for task in tasks:
            data = task.datas[0]
            size = data.size.split(",")
            coco.addImage(data.path, int(size[1]), int(size[2]), data.data_id)
            copy(osp.join(project.data_dir, data.path), data_dir)
            split[task.set].add(data.data_id)
        # 2.3 add annotations
        annotations = Annotation._get(project_id=project.project_id, many=True)
        for ann in annotations:
            r = ann.result.split(",")
            r = [float(t) for t in r]
            # print(coco.imgs[ann.data_id])
            width, height = coco.imgs[ann.data_id]["width"], coco.imgs[ann.data_id]["height"]
            width = int(width)
            height = int(height)
            bb = [r[0] + width / 2, r[1] + height / 2, r[2] + width / 2, r[3] + height / 2]
            bb[2] -= bb[0]
            bb[3] -= bb[1]
            area = (r[2] - r[0]) * (r[3] - r[1])
            coco.addAnnotation(
                ann.data_id, ann.label_id, segmentation=[], id=ann.annotation_id, area=area, bbox=bb
            )
        # 3. write coco json
        for split_idx, fname in enumerate(["train.json", "val.json", "test.json"]):
            outcoco = deepcopy(coco)
            outcoco.dataset["images"] = [
                img for img in coco.dataset["images"] if img["id"] in split[split_idx]
            ]
            outcoco.dataset["annotations"] = [
                ann for ann in coco.dataset["annotations"] if ann["image_id"] in split[split_idx]
            ]

            with open(osp.join(export_dir, fname), "w") as outf:
                print(json.dumps(outcoco.dataset), file=outf)

    def voc_exporter(self, export_dir):
        project = self.project
        tasks = Task._get(project_id=project.project_id, many=True)
        export_data_dir = osp.join(export_dir, "JPEGImages")
        export_label_dir = osp.join(export_dir, "Annotations")
        create_dir(export_data_dir)
        create_dir(export_label_dir)

        set_names = ["train.txt", "validation.txt", "test.txt"]
        set_files = [open(osp.join(export_dir, n), "w") for n in set_names]
        for task in tasks:
            data_path = osp.join(project.data_dir, task.datas[0].path)
            copy(data_path, export_data_dir)
            id = osp.basename(data_path).split(".")[0]
            f = open(osp.join(export_label_dir, f"{id}.xml"), "w")
            print(
                create_voc_label(osp.basename(data_path), 1000, 1000, task.annotations),
                file=f,
            )
            f.close()

            print(
                f"JPEGImages/{osp.basename(data_path)} Annotations/{id}.xml",
                file=set_files[task.set],
            )
        for f in set_files:
            f.close()
