# -*- coding: utf-8 -*-
"""
应用配置模块
负责处理应用配置、中间件和错误处理
"""

from pathlib import Path
import logging

from connexion.options import SwaggerUIOptions
from connexion.middleware import MiddlewarePosition
from starlette.middleware.cors import CORSMiddleware

from paddlelabel import configs
from paddlelabel.util import Resolver, backend_error
from paddlelabel.config import connexion_app

logger = logging.getLogger("paddlelabel")


def setup_app_config():
    """设置应用配置"""

    HERE = Path(__file__).parent.parent.absolute()

    # 设置日志级别
    logger.setLevel(configs.log_level)

    # 配置connexion应用
    connexion_app.add_api(
        HERE / "openapi.yml",
        resolver=Resolver("paddlelabel.api", collection_endpoint_name="get_all"),
        # 请求有未定义参数时返回错误，不强制body
        strict_validation=True,
        pythonic_params=True,
        swagger_ui_options=SwaggerUIOptions(serve_spec=configs.debug, swagger_ui=configs.debug),
    )

    # 添加错误处理器
    connexion_app.add_error_handler(Exception, backend_error)

    # 添加CORS中间件
    connexion_app.add_middleware(
        CORSMiddleware,
        position=MiddlewarePosition.BEFORE_EXCEPTION,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )