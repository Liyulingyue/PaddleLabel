#!/usr/bin/env python3
"""
PP-YOLOE+ OpenVINO Custom Backend 启动脚本
"""

import uvicorn
import argparse
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="PP-YOLOE+ OpenVINO Custom Backend")
    parser.add_argument("--host", default="0.0.0.0", help="服务器主机地址")
    parser.add_argument("--port", type=int, default=8001, help="服务器端口")
    parser.add_argument("--reload", action="store_true", help="启用热重载")
    parser.add_argument("--log-level", default="info", choices=["debug", "info", "warning", "error"], help="日志级别")

    args = parser.parse_args()

    # 检查main.py是否存在
    main_file = Path(__file__).parent / "main.py"
    if not main_file.exists():
        print(f"错误: 找不到主文件 {main_file}")
        sys.exit(1)

    print("🚀 启动 PP-YOLOE+ OpenVINO Custom Backend")
    print(f"📍 服务地址: http://{args.host}:{args.port}")
    print(f"📚 API文档: http://{args.host}:{args.port}/docs")
    print("=" * 50)

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level
    )

if __name__ == "__main__":
    main()