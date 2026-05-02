# FastAPI Backend for PaddleLabel

## Setup

```bash
source /home/liyulingyue/Codes/PaddleLabel/backend/.venv/bin/activate
cd /home/liyulingyue/Codes/PaddleLabel/backend_v2
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18000 --reload
```

## API Docs

- Swagger UI: http://localhost:18000/docs
- ReDoc: http://localhost:18000/redoc

## Environment Variables

- `JWT_SECRET`: JWT signing secret (default: "change_this")
- `DATABASE_URL`: SQLite database URL (default: sqlite://~/.paddlelabel/paddlelabel.db)
