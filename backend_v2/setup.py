# -*- coding: utf-8 -*-
import pathlib
from setuptools import setup, find_packages

HERE = pathlib.Path(__file__).parent

with open("requirements.txt", "r") as fin:
    REQUIRED_PACKAGES = [l.strip() for l in fin.read().strip().split("\n") if l.strip()]

setup(
    name="paddlelabel_v2",
    version="1.0.0",
    description="FastAPI backend for PaddleLabel",
    long_description=(HERE / "README.md").read_text(encoding="utf-8"),
    long_description_content_type="text/markdown",
    url="https://github.com/PaddleCV-SIG/PaddleLabel",
    author="PaddleCV-SIG",
    author_email="me@linhan.email",
    license="Apache Software License",
    classifiers=[
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    packages=find_packages(exclude=("tests.*", "tests")),
    install_requires=[
        "paddlelabel",  # reuse existing models and task handlers
        "fastapi>=0.115.0",
        "uvicorn[standard]>=0.32.0",
        "python-jose[cryptography]>=3.3.0",
        "python-multipart>=0.0.9",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "httpx>=0.25.0",
            "pytest-asyncio>=0.21.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "paddlelabel_v2=paddlelabel_v2.__main__:run",
            "pdlabel_v2=paddlelabel_v2.__main__:run",
        ]
    },
    python_requires=">=3.9",
)
