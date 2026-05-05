# PaddleLabel Backend

FastAPI-based backend for PaddleLabel.

## Quick Start

```bash
cd /home/liyulingyue/Codes/PaddleLabel/backend

# Create virtual environment (first time)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 18000 --reload
```

## API Documentation

- Swagger UI: http://localhost:18000/docs
- ReDoc: http://localhost:18000/redoc

## Environment Variables

- `JWT_SECRET`: JWT signing secret (default: "change_this")
- `DATABASE_URL`: SQLite database URL (default: sqlite://~/.paddlelabel/paddlelabel.db)

## Project Structure

```
backend/
├── app/                # FastAPI application
│   ├── routers/        # API endpoints
│   ├── schemas/        # Pydantic models
│   ├── task/           # Import/Export tasks
│   └── main.py         # App entry point
├── paddlelabel/        # Core labeling logic
└── requirements.txt
```
