from pathlib import Path
import logging

from flask_cors import CORS # TODO: custom middleware, dont use this package
from alembic.config import Config
import alembic

from paddlelabel.util import Resolver
from paddlelabel.config import db_url, db_path, connexion_app, app
import paddlelabel.api
import paddlelabel.task
from paddlelabel.api.controller.setting import init_site_settings
from paddlelabel.api.model import AlembicVersion

HERE = Path(__file__).parent.absolute()


@connexion_app.app.route("/")
def index():
    return "", 301, {"Location": "/static/index.html"}


db_exists = Path(db_path).exists()
alembic_cfg = alembic.config.Config(HERE / "alembic.ini")
alembic_cfg.set_main_option("script_location", str(HERE / "dbmigration"))
alembic_cfg.set_main_option("sqlalchemy.url", db_url)
alembic.command.ensure_version(alembic_cfg)
print("Current database version: ", end="")
alembic.command.current(alembic_cfg)
print()
with app.app_context():
    if len(AlembicVersion.query.all()) == 0 and db_exists:
        alembic.command.stamp(alembic_cfg, revision="23c1bf9b7f48")
    alembic.command.upgrade(alembic_cfg, "head")

    init_site_settings(HERE / "default_setting.json")

connexion_app.add_api(
    HERE / "openapi.yml",
    resolver=Resolver("paddlelabel.api", collection_endpoint_name="get_all"),
    # request with undefined param returns error, dont enforce body
    strict_validation=True,
    pythonic_params=True,
)

CORS(connexion_app.app)
