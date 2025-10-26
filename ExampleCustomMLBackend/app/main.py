from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
import base64
import io
from PIL import Image
import numpy as np

from model import PPYoloeOpenVINOModel

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="PP-YOLOE+ OpenVINO Custom Backend",
    description="基于PP-YOLOE+和OpenVINO的自定义推理后端",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],  # 前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型实例
model = PPYoloeOpenVINOModel()

# 请求/响应模型
class LoadModelRequest(BaseModel):
    model_path: str
    labels_path: Optional[str] = None

class LoadModelResponse(BaseModel):
    message: str
    status: str

class UnloadModelResponse(BaseModel):
    message: str
    status: str

class InferRequest(BaseModel):
    image: str  # base64编码的图像
    conf_threshold: Optional[float] = 0.5

class DetectionResult(BaseModel):
    bbox: List[float]
    confidence: float
    class_id: int
    label: str

class InferResponse(BaseModel):
    detections: List[DetectionResult]
    count: int

class LabelsResponse(BaseModel):
    labels: List[str]
    count: int

class StatusResponse(BaseModel):
    is_loaded: bool
    input_shape: Optional[List[int]] = None
    labels_count: int

class RootResponse(BaseModel):
    message: str
    status: str

class InferFileRequest(BaseModel):
    conf_threshold: Optional[float] = 0.5

@app.get("/", response_model=RootResponse)
async def root():
    """根路径"""
    return RootResponse(message="PP-YOLOE+ OpenVINO Custom Backend", status="running")

@app.post("/load", response_model=LoadModelResponse)
async def load_model(request: LoadModelRequest):
    """
    加载模型

    请求体:
    - model_path: 模型文件路径 (.xml)
    - labels_path: 标签文件路径 (可选)
    """
    try:
        success = model.load_model(request.model_path, request.labels_path)
        if success:
            return LoadModelResponse(
                message="Model loaded successfully",
                status="success"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to load model")
    except Exception as e:
        logger.error(f"Load model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/unload", response_model=UnloadModelResponse)
async def unload_model():
    """卸载模型"""
    try:
        success = model.unload_model()
        if success:
            return UnloadModelResponse(
                message="Model unloaded successfully",
                status="success"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to unload model")
    except Exception as e:
        logger.error(f"Unload model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/infer", response_model=InferResponse)
async def infer(request: InferRequest):
    """
    执行推理

    请求体:
    - image: base64编码的图像
    - conf_threshold: 置信度阈值 (可选，默认0.5)
    """
    try:
        if not model.is_loaded:
            raise HTTPException(status_code=400, detail="Model not loaded")

        # 解码base64图像
        try:
            image_data = base64.b64decode(request.image)
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

        # 执行推理
        detections = model.infer(image_array, request.conf_threshold)

        # 转换为响应格式
        detection_results = [
            DetectionResult(
                bbox=detection["bbox"],
                confidence=detection["confidence"],
                class_id=detection["class_id"],
                label=detection["label"]
            )
            for detection in detections
        ]

        response = InferResponse(
            detections=detection_results,
            count=len(detection_results)
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/labels", response_model=LabelsResponse)
async def get_labels():
    """获取标签列表"""
    try:
        labels = model.get_labels()
        return LabelsResponse(labels=labels, count=len(labels))
    except Exception as e:
        logger.error(f"Get labels error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status", response_model=StatusResponse)
async def get_status():
    """获取模型状态"""
    return StatusResponse(
        is_loaded=model.is_loaded,
        input_shape=list(model.input_shape) if model.input_shape else None,
        labels_count=len(model.labels) if model.labels else 0
    )

@app.post("/infer_file", response_model=InferResponse)
async def infer_file(
    file: UploadFile = File(...),
    conf_threshold: float = Form(0.5)
):
    """
    上传文件进行推理

    表单参数:
    - file: 图像文件
    - conf_threshold: 置信度阈值 (可选，默认0.5)
    """
    try:
        if not model.is_loaded:
            raise HTTPException(status_code=400, detail="Model not loaded")

        # 读取上传的文件
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents))
            image_array = np.array(image)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

        # 执行推理
        detections = model.infer(image_array, conf_threshold)

        # 转换为响应格式
        detection_results = [
            DetectionResult(
                bbox=detection["bbox"],
                confidence=detection["confidence"],
                class_id=detection["class_id"],
                label=detection["label"]
            )
            for detection in detections
        ]

        response = InferResponse(
            detections=detection_results,
            count=len(detection_results)
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )