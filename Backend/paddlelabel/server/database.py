# -*- coding: utf-8 -*-
"""
数据库迁移模块
负责处理数据库版本管理和迁移
"""

import shutil
from datetime import datetime
from pathlib import Path
import logging

import alembic
from alembic.config import Config
from alembic.script import ScriptDirectory

from paddlelabel import configs
from paddlelabel.config import db
from paddlelabel.api.model import AlembicVersion

logger = logging.getLogger("paddlelabel")


def setup_database_migration():
    """设置数据库迁移"""

    HERE = Path(__file__).parent.parent.absolute()
    db_exists = configs.db_path.exists()

    # 配置alembic
    alembic_cfg = alembic.config.Config(HERE / "alembic.ini")
    alembic_cfg.set_main_option("script_location", str(HERE / "dbmigration"))
    alembic_cfg.set_main_option("sqlalchemy.url", configs.db_url)

    # 创建alembic版本表
    alembic.command.ensure_version(alembic_cfg)

    res = AlembicVersion.query.all()
    # 获取数据库中的版本
    curr_db_v = None if len(res) == 0 else res[0].version_num
    # 获取版本头
    script = ScriptDirectory.from_config(alembic_cfg)
    heads = script.get_revisions("heads")
    db_head_version = heads[0].revision

    # v0.1.0: 数据库存在但没有版本
    if db_exists and curr_db_v is None:
        alembic.command.stamp(alembic_cfg, revision="23c1bf9b7f48")

    # 需要数据库备份
    if db_exists and curr_db_v != db_head_version:
        back_up_path = (
            Path(configs.db_path).parent
            / f"{str(datetime.now()).split('.')[0].replace(' ', '_').replace(':', '_')}-paddlelabel.db.bk"
        )
        shutil.copy(Path(configs.db_path), back_up_path)
        logger.warn(
            f"Performing database update. Should anything goes wrong during this update, you can find the old database at {str(back_up_path)}"
        )

    # 执行数据库升级
    alembic.command.upgrade(alembic_cfg, "head")

    # TODO: 移动到由alembic管理 @lin
    from paddlelabel.api.controller.setting import init_site_settings
    init_site_settings(HERE / "default_setting.json")

    if configs.debug:
        alembic.command.check(alembic_cfg)  # 如果模型定义发生变化且需要新版本，则中止
