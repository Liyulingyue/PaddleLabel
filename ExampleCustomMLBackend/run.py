#!/usr/bin/env python3
"""
PP-YOLOE+ OpenVINO Custom Backend 启动脚本
"""

import sys
from pathlib import Path

# 添加app目录到Python路径
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

# 导入并运行启动脚本
from app.run import main

if __name__ == "__main__":
    main()