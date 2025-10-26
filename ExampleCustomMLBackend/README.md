## 项目结构

```
ExampleCustomBackend/
├── app/                    # 应用代码目录
│   ├── __init__.py        # 包初始化文件
│   ├── main.py            # FastAPI主应用
│   ├── model.py           # PP-YOLOE+ OpenVINO模型推理类
│   ├── run.py             # 启动脚本
│   ├── test.py            # 测试脚本
│   └── example.py         # 使用示例
├── Source/                # 模型文件目录
│   └── .gitkeep          # 确保目录被git跟踪
├── requirements.txt       # Python依赖
├── config.ini            # 配置文件模板
├── run.py                # 根目录启动脚本
├── Dockerfile            # Docker构建文件
├── .dockerignore         # Docker忽略文件
├── .gitignore           # Git忽略文件
└── README.md             # 文档
```

## 功能特性

- 🚀 基于PP-YOLOE+高精度目标检测模型
- ⚡ OpenVINO推理引擎，高效性能
- 🌐 FastAPI框架，提供RESTful API
- 📦 支持模型动态加载/卸载
- 🖼️ 支持base64图像和文件上传两种推理方式
- 📊 实时获取检测结果和置信度

## API接口

### 1. 加载模型
```http
POST /load
Content-Type: application/json

{
  "model_path": "/path/to/model.xml",
  "labels_path": "/path/to/labels.txt"  // 可选
}
```

### 2. 卸载模型
```http
POST /unload
```

### 3. 执行推理 (Base64)
```http
POST /infer
Content-Type: application/json

{
  "image": "base64_encoded_image",
  "conf_threshold": 0.5
}
```

### 4. 执行推理 (文件上传)
```http
POST /infer_file
Content-Type: multipart/form-data

file: <image_file>
conf_threshold: 0.5
```

### 5. 获取标签列表
```http
GET /labels
```

### 6. 获取状态
```http
GET /status
```

## 安装和运行

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 准备模型文件

将PP-YOLOE+模型转换为OpenVINO格式，并放置在 `Source/` 目录中：

```bash
# 使用OpenVINO Model Optimizer转换模型
mo --input_model ppyoloe_plus_crn_s_80e_coco.onnx \
   --output_dir Source \
   --model_name ppyoloe_plus \
   --input_shape [1,3,640,640]

# 转换后文件结构
Source/
├── ppyoloe_plus.xml      # 模型结构文件
├── ppyoloe_plus.bin      # 模型权重文件
└── labels.txt           # 标签文件 (可选)
```

### 3. 运行服务
```bash
# 方法1: 使用根目录启动脚本 (推荐)
python run.py

# 方法2: 直接运行app模块
python -m app.run

# 方法3: 直接运行main文件
python app/main.py
```

服务将在 `http://localhost:8001` 启动。

### 4. 测试接口
```bash
python app/test.py --model Source/model.xml --image test.jpg
```

## 使用示例

### Python客户端示例

```python
import requests
import base64
from PIL import Image
import io

# 1. 加载模型
response = requests.post("http://localhost:8001/load", json={
    "model_path": "/path/to/model.xml",
    "labels_path": "/path/to/labels.txt"
})
print(response.json())

# 2. 准备图像
image = Image.open("test.jpg")
buffered = io.BytesIO()
image.save(buffered, format="JPEG")
img_str = base64.b64encode(buffered.getvalue()).decode()

# 3. 执行推理
response = requests.post("http://localhost:8001/infer", json={
    "image": img_str,
    "conf_threshold": 0.5
})
detections = response.json()
print(f"检测到 {detections['count']} 个目标")
for detection in detections['detections']:
    print(f"标签: {detection['label']}, 置信度: {detection['confidence']:.2f}")
```

### JavaScript客户端示例

```javascript
// 1. 加载模型
await fetch('http://localhost:8001/load', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_path: '/path/to/model.xml',
    labels_path: '/path/to/labels.txt'
  })
});

// 2. 转换为base64
const imageFile = document.getElementById('imageInput').files[0];
const base64Image = await fileToBase64(imageFile);

// 3. 执行推理
const response = await fetch('http://localhost:8001/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: base64Image,
    conf_threshold: 0.5
  })
});
const result = await response.json();
console.log(`检测到 ${result.count} 个目标`);
```

## 配置说明

### 模型要求

- **格式**: OpenVINO IR格式 (.xml + .bin)
- **输入**: [1, 3, H, W] (NCHW格式)
- **输出**: [1, N, 6] (检测框 + 置信度 + 类别ID)

### 标签文件格式

支持两种格式：

1. **文本文件** (labels.txt):
```
person
car
dog
cat
```

2. **JSON文件** (labels.json):
```json
["person", "car", "dog", "cat"]
```

或

```json
{
  "0": "person",
  "1": "car",
  "2": "dog",
  "3": "cat"
}
```

## 性能优化

1. **模型量化**: 使用OpenVINO的量化工具减小模型大小
2. **批处理**: 修改代码支持批量推理
3. **GPU加速**: 将编译目标改为"GPU" (如果有Intel GPU)
4. **多线程**: 使用uvicorn的worker模式

## 故障排除

### 常见问题

1. **模型加载失败**
   - 检查模型文件路径是否正确
   - 确认OpenVINO版本兼容性

2. **推理结果不准确**
   - 调整conf_threshold参数
   - 检查图像预处理是否正确

3. **内存不足**
   - 减小batch_size
   - 使用模型量化

### 日志调试

服务会输出详细的日志信息，帮助诊断问题：

```bash
python main.py  # 默认info级别
```

## 许可证

MIT License