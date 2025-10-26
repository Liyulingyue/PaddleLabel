import cv2
import numpy as np
from openvino.runtime import Core
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import yaml

logger = logging.getLogger(__name__)

class PPYoloeOpenVINOModel:
    """PP-YOLOE+ OpenVINO模型推理类"""

    def __init__(self):
        self.core = None
        self.model = None
        self.compiled_model = None
        self.input_layer = None
        self.output_layer = None
        self.labels = []
        self.input_shape = None
        self.is_loaded = False

    def load_model(self, model_path: str, labels_path: Optional[str] = None) -> bool:
        """
        加载OpenVINO模型

        Args:
            model_path: 模型文件路径 (.xml文件 或 .pdmodel文件)
            labels_path: 标签文件路径 (.txt或.json文件)

        Returns:
            bool: 加载是否成功
        """
        try:
            # 初始化OpenVINO
            self.core = Core()

            # 读取模型
            model_file = Path(model_path)

            if model_file.suffix == '.pdmodel':
                # 直接读取PaddlePaddle模型
                if not model_file.exists():
                    logger.error(f"Model file not found: {model_file}")
                    return False
                self.model = self.core.read_model(str(model_file))
            elif model_file.suffix == '.xml':
                # 读取OpenVINO IR格式
                model_bin = model_file.with_suffix('.bin')
                if not model_file.exists() or not model_bin.exists():
                    logger.error(f"Model files not found: {model_file}, {model_bin}")
                    return False
                self.model = self.core.read_model(str(model_file))
            else:
                logger.error(f"Unsupported model format: {model_file.suffix}")
                return False

            self.compiled_model = self.core.compile_model(self.model, "CPU")

            # 获取输入输出层
            self.input_layer = self.compiled_model.input(0)
            self.output_layer = self.compiled_model.output(0)

            # 检查输入数量
            self.num_inputs = len(self.compiled_model.inputs)
            logger.info(f"Model has {self.num_inputs} inputs")

            # 打印所有输入的信息
            for i, input_layer in enumerate(self.compiled_model.inputs):
                try:
                    shape = input_layer.shape
                    logger.info(f"Input {i} shape: {shape}")
                except Exception as e:
                    logger.info(f"Input {i} has dynamic shape: {e}")

            # 获取输入形状 - 处理动态形状
            try:
                self.input_shape = self.compiled_model.input(0).shape
                logger.info(f"Model input shape: {self.input_shape}")
            except Exception as e:
                # 处理动态形状的情况
                logger.warning(f"Model has dynamic shape: {e}")
                # 从配置文件中读取输入尺寸，如果没有则使用默认值
                if labels_path and Path(labels_path).exists():
                    try:
                        with open(labels_path, 'r', encoding='utf-8') as f:
                            config = yaml.safe_load(f)
                            if 'Preprocess' in config:
                                for preprocess_step in config['Preprocess']:
                                    if preprocess_step.get('type') == 'Resize' and 'target_size' in preprocess_step:
                                        target_size = preprocess_step['target_size']
                                        self.input_shape = [1, 3, target_size[1], target_size[0]]  # [N, C, H, W]
                                        logger.info(f"Using target size from config: {self.input_shape}")
                                        break
                    except Exception as config_error:
                        logger.warning(f"Failed to read config: {config_error}")

                # 如果无法从配置获取，使用默认尺寸
                if not hasattr(self, 'input_shape') or self.input_shape is None:
                    self.input_shape = [1, 3, 640, 640]  # 默认640x640
                    logger.info(f"Using default input shape: {self.input_shape}")

            # 加载标签
            if labels_path and Path(labels_path).exists():
                self._load_labels(labels_path)
            else:
                # 默认标签
                self.labels = [f"class_{i}" for i in range(80)]  # COCO默认80类

            self.is_loaded = True
            logger.info("Model loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False

    def _load_labels(self, labels_path: str):
        """加载标签文件"""
        try:
            labels_file = Path(labels_path)
            if labels_file.suffix == '.txt':
                with open(labels_file, 'r', encoding='utf-8') as f:
                    self.labels = [line.strip() for line in f if line.strip()]
            elif labels_file.suffix in ['.json', '.JSON']:
                with open(labels_file, 'r', encoding='utf-8') as f:
                    labels_data = json.load(f)
                    if isinstance(labels_data, list):
                        self.labels = labels_data
                    elif isinstance(labels_data, dict):
                        self.labels = list(labels_data.values())
            elif labels_file.suffix in ['.yml', '.yaml']:
                with open(labels_file, 'r', encoding='utf-8') as f:
                    config = yaml.safe_load(f)
                    if 'label_list' in config:
                        self.labels = config['label_list']
                    else:
                        logger.warning(f"No label_list found in {labels_file}, using default labels")
                        self.labels = [f"class_{i}" for i in range(80)]
            else:
                logger.warning(f"Unsupported labels file format: {labels_file.suffix}")
                self.labels = [f"class_{i}" for i in range(80)]

            logger.info(f"Loaded {len(self.labels)} labels from {labels_file}")
        except Exception as e:
            logger.warning(f"Failed to load labels: {e}")
            self.labels = [f"class_{i}" for i in range(80)]

    def unload_model(self) -> bool:
        """
        卸载模型

        Returns:
            bool: 卸载是否成功
        """
        try:
            self.model = None
            self.compiled_model = None
            self.input_layer = None
            self.output_layer = None
            self.is_loaded = False
            logger.info("Model unloaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to unload model: {e}")
            return False

    def preprocess_image(self, image: np.ndarray) -> Dict[str, np.ndarray]:
        """
        预处理图像

        Args:
            image: 输入图像 (H, W, C)

        Returns:
            Dict[str, np.ndarray]: 预处理后的输入数据
        """
        try:
            logger.info(f"Original image shape: {image.shape}")  # 调试信息

            # 获取模型输入尺寸
            _, _, h, w = self.input_shape

            # 计算缩放因子 [input_h / orig_h, input_w / orig_w]
            scale_factor = np.array([h / image.shape[0], w / image.shape[1]], dtype=np.float32).reshape((1, 2))

            # 调整图像尺寸
            resized = cv2.resize(image, (w, h))

            # 确保图像是3通道RGB格式
            if resized.shape[2] == 4:  # RGBA to RGB
                resized = cv2.cvtColor(resized, cv2.COLOR_RGBA2RGB)
            elif resized.shape[2] == 3:
                resized = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

            # 归一化到[0,1]
            resized = resized.astype(np.float32) / 255.0

            # 转换为NCHW格式
            resized = np.transpose(resized, (2, 0, 1))  # HWC -> CHW
            resized = np.expand_dims(resized, axis=0)  # CHW -> NCHW

            logger.info(f"Processed image shape: {resized.shape}")  # 调试信息

            return {"scale_factor": scale_factor, "image": resized}

        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise

    def postprocess_output(self, output: np.ndarray, scale_factor: np.ndarray, conf_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        后处理模型输出

        Args:
            output: 模型输出
            scale_factor: 缩放因子 [orig_w / input_w, orig_h / input_h]
            conf_threshold: 置信度阈值

        Returns:
            List[Dict]: 检测结果
        """
        try:
            results = []

            # 处理输出格式
            if output.ndim == 3:
                # [batch, num_boxes, 6] 格式
                detections = output[0]  # 移除batch维度
            else:
                detections = output

            for detection in detections:
                if len(detection) >= 6:
                    # PP-YOLOE+输出格式: [class_id, confidence, xmin, ymin, xmax, ymax]
                    class_id, conf, x1, y1, x2, y2 = detection[:6]

                    if conf > conf_threshold:
                        results.append({
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "confidence": float(conf),
                            "class_id": int(class_id),
                            "label": self.labels[int(class_id)] if int(class_id) < len(self.labels) else f"class_{int(class_id)}"
                        })

            return results

        except Exception as e:
            logger.error(f"Output postprocessing failed: {e}")
            return []

    def infer(self, image: np.ndarray, conf_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        执行推理

        Args:
            image: 输入图像
            conf_threshold: 置信度阈值

        Returns:
            List[Dict]: 检测结果
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded")

        try:
            # 预处理
            processed_data = self.preprocess_image(image)

            # 构建输入字典
            inputs = {}
            # PP-YOLOE+双输入 - scale_factor + image
            inputs[self.compiled_model.input(0)] = processed_data["scale_factor"]
            inputs[self.compiled_model.input(1)] = processed_data["image"]

            # 推理
            result = self.compiled_model(inputs)

            # print(f"[CustomBackend] Model output shape: {result[self.output_layer].shape}")
            # print(f"[CustomBackend] Model output (first 5 detections): {result[self.output_layer][0][:5] if result[self.output_layer].ndim == 3 else result[self.output_layer][:5]}")

            # 后处理
            detections = self.postprocess_output(result[self.output_layer], processed_data["scale_factor"], conf_threshold)

            # 可视化并保存图片
            # try:
            #     import cv2, os
            #     vis_img = image.copy()
            #     if vis_img.shape[-1] == 4:
            #         vis_img = cv2.cvtColor(vis_img, cv2.COLOR_BGRA2BGR)
            #     for det in detections:
            #         x1, y1, x2, y2 = map(int, det["bbox"])
            #         label = det["label"]
            #         conf = det["confidence"]
            #         cv2.rectangle(vis_img, (x1, y1), (x2, y2), (0,255,0), 2)
            #         cv2.putText(vis_img, f"{label} {conf:.2f}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            #     vis_dir = os.path.abspath("./custom_vis")
            #     os.makedirs(vis_dir, exist_ok=True)
            #     out_path = os.path.join(vis_dir, "out.png")
            #     cv2.imwrite(out_path, vis_img)
            #     print(f"[CustomBackend] 推理可视化图片已保存到: {out_path}")
            # except Exception as e:
            #     import traceback
            #     print(f"[CustomBackend Visualize Error] {e}\n{traceback.format_exc()}")

            return detections

        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise

    def get_labels(self) -> List[str]:
        """
        获取标签列表

        Returns:
            List[str]: 标签列表
            # 可视化并保存图片
            try:
                import cv2, os
                vis_img = image.copy()
                if vis_img.shape[-1] == 4:
                    vis_img = cv2.cvtColor(vis_img, cv2.COLOR_BGRA2BGR)
                for det in detections:
                    x1, y1, x2, y2 = map(int, det["bbox"])
                    label = det["label"]
                    conf = det["confidence"]
                    cv2.rectangle(vis_img, (x1, y1), (x2, y2), (0,255,0), 2)
                    cv2.putText(vis_img, f"{label} {conf:.2f}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
                vis_dir = os.path.abspath("./custom_vis")
                os.makedirs(vis_dir, exist_ok=True)
                out_path = os.path.join(vis_dir, "out.png")
                cv2.imwrite(out_path, vis_img)
                print(f"[CustomBackend] 推理可视化图片已保存到: {out_path}")
            except Exception as e:
                import traceback
                print(f"[CustomBackend Visualize Error] {e}\n{traceback.format_exc()}")
        """
        return self.labels.copy()