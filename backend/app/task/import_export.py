# -*- coding: utf-8 -*-
import logging
import json

from paddlelabel.config import db as flask_db, app as flask_app
from paddlelabel.task.util.file import expand_home

logger = logging.getLogger("paddlelabel")


def run_import(project_id: int, data_dir: str | None = None, all_options: dict | None = None):
    with flask_app.app_context():
        from paddlelabel.api.model import Project, TaskCategory

        project = flask_db.session.query(Project).filter(Project.project_id == project_id).first()
        if project is None:
            raise RuntimeError(f"No project with project_id {project_id}")

        if data_dir is None:
            data_dir = project.data_dir

        task_category = flask_db.session.query(TaskCategory).filter(
            TaskCategory.task_category_id == project.task_category_id
        ).first()
        if task_category is None:
            raise RuntimeError(f"Invalid task category id {project.task_category_id}")

        module_name = f"paddlelabel.task.{task_category.name}"
        module = __import__(module_name, fromlist=["ProjectSubtypeSelector"])
        selector = module.ProjectSubtypeSelector()

        answers = all_options or {}
        handler = selector.get_handler(answers, project)
        importer = selector.get_importer(answers, project)
        importer(data_dir)

        persists = selector.__persist__
        if len(persists) != 0:
            other_settings = {}
            if project.other_settings:
                try:
                    other_settings = json.loads(project.other_settings)
                except:
                    other_settings = {}
            for field in persists:
                if field in answers:
                    other_settings[field] = answers[field]
            project.other_settings = json.dumps(other_settings)
        flask_db.session.commit()


def run_export(project_id: int, export_dir: str, export_format: str | None = None, seg_mask_type: str | None = None):
    with flask_app.app_context():
        from paddlelabel.api.model import Project, TaskCategory

        project = flask_db.session.query(Project).filter(Project.project_id == project_id).first()
        if project is None:
            raise RuntimeError(f"No project with project_id {project_id}")

        task_category = flask_db.session.query(TaskCategory).filter(
            TaskCategory.task_category_id == project.task_category_id
        ).first()
        if task_category is None:
            raise RuntimeError(f"Invalid task category id {project.task_category_id}")

        module_name = f"paddlelabel.task.{task_category.name}"
        module = __import__(module_name, fromlist=["ProjectSubtypeSelector"])
        selector = module.ProjectSubtypeSelector()
        
        if selector.default_handler is None:
            raise RuntimeError(f"No default_handler for task category {task_category.name}")
        
        handler = selector.default_handler(project=project, is_export=True)

        if export_format is None or len(export_format) == 0:
            exporter = getattr(handler, "default_exporter", None)
            if exporter is None:
                raise RuntimeError(
                    f"No default exporter for task category {task_category.name} "
                    f"(export_format={export_format})"
                )
        else:
            exporters = getattr(handler, "exporters", {})
            exporter = exporters.get(export_format)
            if exporter is None:
                available = list(exporters.keys()) if exporters else ["(none)"]
                raise RuntimeError(
                    f"Unknown export_format '{export_format}' for task category {task_category.name}. "
                    f"Available formats: {available}"
                )

        params = {"export_dir": export_dir}
        if seg_mask_type:
            params["seg_mask_type"] = seg_mask_type
        exporter(**params)
        flask_db.session.commit()
