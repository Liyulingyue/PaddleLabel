"""Format-specific readers/writers for import/export.

Each module implements read() and write() functions. They're orchestrated
by app.services.import_export.importer / exporter based on project category
+ format. Format discovery (which files exist?) is handled inside each module.
"""
