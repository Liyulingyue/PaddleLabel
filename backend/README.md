# PaddleLabel Backend (v2)

FastAPI + SQLAlchemy 2.0 (async) + SQLite. 全新实现，不依赖 legacy 代码。

## Quick Start

```bash
cd /home/liyulingyue/Codes/PaddleLabel/backend

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 开发模式
uvicorn app.main:app --host 0.0.0.0 --port 18000 --reload

# 或 python -m
python -m backend
```

## API 文档

- Swagger UI: http://localhost:18000/docs
- ReDoc:      http://localhost:18000/redoc
- OpenAPI:    http://localhost:18000/openapi.json

所有接口挂在 `/api` 前缀下。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `HOST` | `127.0.0.1` | 监听地址（`--lan` 时设为 `0.0.0.0`） |
| `PORT` | `18000` | 监听端口 |
| `PADDLELABEL_HOME` | `~/.paddlelabel` | 数据库/样本所在目录 |
| `DATABASE_URL` | `sqlite+aiosqlite:///<HOME>/paddlelabel.db` | DB URL |
| `JWT_SECRET` | `change_this_in_prod` | Token 签名密钥 |
| `JWT_ALGORITHM` | `HS256` | Token 算法 |
| `JWT_LIFETIME_SECONDS` | `43200` | Token 有效期 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `ML_BACKEND_URL` | `http://127.0.0.1:18001` | PaddleLabel-ML 服务地址 |

## 目录结构

```
backend/
├── app/                  # FastAPI 应用
│   ├── main.py           # 入口
│   ├── config.py         # 配置
│   ├── database.py       # 异步 SQLAlchemy 引擎 / Session
│   ├── deps.py           # FastAPI Depends (鉴权等)
│   ├── models/           # ORM 模型 (SQLAlchemy 2.0 typed)
│   ├── schemas/          # Pydantic 模型 (对齐 frontend types)
│   ├── routers/          # APIRouter (一个资源一个文件)
│   ├── services/         # 业务服务 (auth / export / import / split / predict)
│   ├── task/             # 各种标注格式读写 (voc / yolo / coco / ...)
│   └── util/             # 工具 (颜色/路径)
├── requirements.txt
└── README.md
```
