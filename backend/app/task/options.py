"""Subtype options (the `import_questions` / `export_questions` lists).

Frontend asks /api/projects/options/{im_or_export}/{project_type} and gets back a list of
{label, type, required, choices, tips, show_after, allow_edit} for each question.
We return a simple set: "labelFormat" choice + any task-specific prompts.
"""

from __future__ import annotations

from fastapi import HTTPException


def build_options(project_type: str, im_or_export: str) -> list[dict]:
    pt = _camel_to_snake(project_type)
    supported = {
        "classification",
        "detection",
        "semantic_segmentation",
        "instance_segmentation",
        "optical_character_recognition",
    }
    if pt not in supported:
        raise HTTPException(status_code=404, detail=f"Project type {project_type} isn't supported")

    questions: list[dict] = []

    # labelFormat - always present
    if pt == "classification":
        choices = [
            ("imgClass", "ImageFolder layout - one folder per class"),
            ("clsList", "label.txt + train/val/test list files"),
        ]
    elif pt == "detection":
        choices = [
            ("voc", "Pascal VOC XML + train/val/test lists"),
            ("yolo", "YOLO txt + classes.names"),
            ("coco", "COCO JSON (train/val/test)"),
        ]
    elif pt == "semantic_segmentation":
        choices = [
            ("mask", "Indexed PNG mask + train/val/test lists"),
            ("coco", "COCO JSON"),
        ]
    elif pt == "instance_segmentation":
        choices = [
            ("mask", "Indexed mask per object"),
            ("coco", "COCO JSON"),
            ("eiseg", "EISeg / labelme JSON"),
        ]
    else:  # ocr
        choices = [("default", "Default txt + Label.txt layout")]

    if im_or_export == "export":
        # exporter also accepts a labelFormat choice
        questions.append(
            {
                "label": "labelFormat",
                "type": "choice",
                "required": False,
                "choices": [("noLabel", None)] + choices,
                "tips": "Choose the output format",
                "show_after": [],
                "allow_edit": True,
            }
        )
        return questions

    # import
    questions.append(
        {
            "label": "labelFormat",
            "type": "choice",
            "required": True,
            "choices": choices,
            "tips": "Choose the on-disk format of your dataset",
            "show_after": [],
            "allow_edit": True,
        }
    )

    if pt == "classification":
        questions.append(
            {
                "label": "clasSubCatg",
                "type": "choice",
                "required": True,
                "choices": [("multiClass", "Multi class"), ("singleClass", "Single class")],
                "tips": "Single class - one label per image; Multi class - zero or more",
                "show_after": [],
                "allow_edit": True,
            }
        )
    if pt == "semantic_segmentation":
        questions.append(
            {
                "label": "segMaskType",
                "type": "choice",
                "required": False,
                "choices": [("indexed", "Indexed PNG (palette)"), ("grayscale", "Grayscale mask")],
                "tips": "Indexed PNG is more compact",
                "show_after": [],
                "allow_edit": True,
            }
        )
    return questions


def _camel_to_snake(name: str) -> str:
    out = []
    for i, c in enumerate(name):
        if c.isupper() and i > 0:
            out.append("_")
        out.append(c.lower())
    return "".join(out)
