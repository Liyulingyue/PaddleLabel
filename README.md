# Monorepo 启动说明

本仓库包含三个子项目，分别为：
- Backend：后端服务
- Frontend：前端界面
- MLBackend：机器学习后端

## 启动方式（开发者模式）

### 1. 启动 Backend

```bash
cd Backend
# 建议使用虚拟环境
pip install -r requirements.txt
python -m paddlelabel
```

### 2. 启动 Frontend

```bash
cd Frontend
# 安装依赖
npm install
# 启动开发服务器
npm run dev
```

### 3. 启动 MLBackend

```bash
cd MLBackend
# 建议使用虚拟环境
pip install -r requirements.txt
pip install paddlepaddle
python -m paddlelabel_ml
```

---

如需同时开发，建议分别在不同终端窗口中进入对应目录并启动。
