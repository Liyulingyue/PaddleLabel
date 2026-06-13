"""CLI entry point - run with `python -m backend` from the repo root, or
`uvicorn app.main:app --reload` from the `backend/` directory."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import uvicorn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="paddlelabel",
        description="PaddleLabel backend (FastAPI)",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind address")
    parser.add_argument("--port", "-p", type=int, default=18000, help="Bind port")
    parser.add_argument("--lan", action="store_true", help="Expose to LAN (sets host=0.0.0.0)")
    parser.add_argument("--debug", "-d", action="store_true", help="Enable auto-reload")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    parser.add_argument(
        "--home",
        type=Path,
        default=None,
        help="PaddleLabel home dir (database + samples). Default: ~/.paddlelabel",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    if args.home:
        import os
        os.environ["PADDLELABEL_HOME"] = str(args.home)
    if args.lan:
        args.host = "0.0.0.0"

    # Make sure the backend/ directory is on sys.path so `app.main:app` resolves.
    here = Path(__file__).resolve().parent
    if str(here) not in sys.path:
        sys.path.insert(0, str(here))

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.debug,
        log_level=level,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
