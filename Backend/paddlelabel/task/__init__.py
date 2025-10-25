# -*- coding: utf-8 -*-
# from .base import BaseTask
# from .classification import SingleClass, MultiClass, ProjectSubtypeSelector
# from .detection import Detection, ProjectSubtypeSelector
# from .semantic_segmentation import SemanticSegmentation
# from .instance_segmentation import InstanceSegmentation
# from .optical_character_recognition import OpticalCharacterRecognition
# from .point import Point

from pathlib import Path

files = Path(__file__).parent.glob("*.py")

__all__ = list(map(lambda p: p.name.split(".")[0], files))

# TODO(Liyulingyue): 引入成员，后续需要跟__all__合并
from .detection import Detection
from .semantic_segmentation import SemanticSegmentation
