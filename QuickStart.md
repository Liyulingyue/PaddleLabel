# PaddleLabel Quick Start

图像标注工具，支持分类、检测、语义分割、实例分割、OCR 等多种任务。

## 环境要求

- Python 3.10+
- Node.js 18+
- npm 或 yarn

## 安装与启动

### 1. 后端

```bash
cd backend

# 首次运行：创建虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 首次运行：安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 18000 --reload
```

后端启动后访问：
- API 文档: http://localhost:18000/docs
- ReDoc: http://localhost:18000/redoc

### 2. 前端（新终端）

```bash
cd frontend

# 首次运行：安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端启动后访问: http://localhost:3000

## 使用流程

### 创建项目

1. 打开 http://localhost:3000
2. 选择项目类型：
   - **分类** (Classification)
   - **目标检测** (Detection)
   - **语义分割** (Semantic Segmentation)
   - **实例分割** (Instance Segmentation)
   - **OCR** (Optical Character Recognition)
3. 填写项目名称
4. 点击路径输入框右侧搜索图标 📍 选择数据集目录
5. 选择标注格式（如 COCO、VOC、YOLO 等）
6. 点击"创建"

### 标注操作

**检测/分割任务：**
1. 右侧标签列表点击标签选择
2. 左侧工具栏选择工具（矩形框/多边形/画笔）
3. 在图像上绘制标注
4. 右侧标注列表可删除标注
5. 点击"保存"按钮或按 `Ctrl+S` 保存

**分类任务：**
1. 右侧标签列表点击标签即可标注
2. 自动保存

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `F` | 上一张图片 |
| `G` | 下一张图片 |
| `Ctrl+S` | 保存标注 |

## 项目结构

```
PaddleLabel/
├── backend/          # FastAPI 后端
│   ├── app/          # 应用代码
│   │   ├── routers/  # API 路由
│   │   ├── schemas/  # 数据模型
│   │   └── task/     # 导入导出逻辑
│   ├── paddlelabel/  # 核心标注逻辑
│   └── requirements.txt
├── frontend/         # Vite + React 前端
│   ├── src/
│   │   ├── pages/    # 页面组件
│   │   ├── components/ # 通用组件
│   │   ├── services/ # API 服务
│   │   └── i18n/     # 国际化
│   └── package.json
├── legacy/           # v1 版本归档
└── demos/            # 示例数据
```

## 配置

### 环境变量

后端支持以下环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | `change_this` |
| `DATABASE_URL` | 数据库 URL | `sqlite://~/.paddlelabel/paddlelabel.db` |

### 数据库

默认使用 SQLite，数据存储在 `~/.paddlelabel/paddlelabel.db`

## 常见问题

### 端口被占用

```bash
# 查看端口占用
lsof -i :18000  # 后端
lsof -i :3000   # 前端

# 杀掉进程
kill -9 <PID>
```

### 依赖安装失败

```bash
# 后端：升级 pip
pip install --upgrade pip

# 前端：清除缓存
rm -rf node_modules package-lock.json
npm install
```

## 开发

### 后端开发

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload  # 自动重载
```

### 前端开发

```bash
cd frontend
npm run dev  # 热更新
npm run build  # 构建生产版本
```

## License

Apache 2.0
