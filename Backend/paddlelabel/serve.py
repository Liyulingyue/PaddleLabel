# -*- coding: utf-8 -*-
"""
服务启动模块
负责初始化和启动PaddleLabel服务
"""

from paddlelabel.server.routes import setup_routes
from paddlelabel.server.database import setup_database_migration
from paddlelabel.server.app_config import setup_app_config
from paddlelabel.config import connexion_app


def initialize_app():
    """初始化应用"""
    # 1. 设置路由
    setup_routes()

    # 2. 设置数据库迁移
    setup_database_migration()

    # 3. 设置应用配置
    setup_app_config()

    return connexion_app

