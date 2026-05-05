# -*- coding: utf-8 -*-
import argparse
import os
import sys
from pathlib import Path


def run():
    backend_dir = Path(__file__).resolve().parent
    if str(backend_dir.parent) not in sys.path:
        sys.path.insert(0, str(backend_dir.parent))
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    import uvicorn
    from app.main import app

    parser = argparse.ArgumentParser(prog="paddlelabel_v2")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind")
    parser.add_argument("-p", "--port", type=int, default=18000, help="Port to bind")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args(sys.argv[1:])

    print("Starting PaddleLabel FastAPI Backend")
    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        reload_dirs=[str(backend_dir / "app")],
        log_level="info",
        app_dir=str(backend_dir),
    )


if __name__ == "__main__":
    run()
