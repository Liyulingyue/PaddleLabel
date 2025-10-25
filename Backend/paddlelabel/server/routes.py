# -*- coding: utf-8 -*-
"""
路由处理模块
负责处理静态文件路由和基础页面路由
"""

from pathlib import Path

from paddlelabel.config import connexion_app


def setup_routes():
    """设置应用路由"""

    # 1. 静态路由
    @connexion_app.app.route("/")
    def index():
        """根路径重定向到静态首页"""
        return "", 301, {"Location": "/static/index.html"}

    @connexion_app.app.route("/static/doc/")
    def doc_index():
        """文档首页重定向"""
        return "", 301, {"Location": "/static/doc/index.html"}

    @connexion_app.app.route("/static/doc/CN/")
    def cn_doc_index():
        """中文文档首页重定向"""
        return "", 301, {"Location": "/static/doc/CN/index.html"}

    @connexion_app.app.route("/static/doc/EN/")
    def en_doc_index():
        """英文文档首页重定向"""
        return "", 301, {"Location": "/static/doc/EN/index.html"}
