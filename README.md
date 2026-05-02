# PaddleLabel

<div align="center">

<p align="center">
  <img src="https://user-images.githubusercontent.com/35907364/182084617-ea94f744-3a34-4193-98fe-5d6869a118fc.png" align="middle" alt="LOGO" width = "500" />
</p>

<b> 飞桨智能标注，让标注快人一步 </b>

<p>
<img src="https://img.shields.io/badge/python-3.7+-blue.svg">
<img src="https://img.shields.io/badge/os-linux%2C%20windows%2C%20macos-blue.svg"/>
<a href="https://github.com/PaddleCV-SIG/doc/blob/develop/LICENSE"> <img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg"/> </a>
</p>
</div>

## 简介

PaddleLabel 是基于飞桨 PaddlePaddle 各个套件功能提供的配套标注工具。目前支持对分类、检测、分割、OCR 四种常见的计算机视觉任务数据集进行标注和管理，除基础的手动标注功能外也支持深度学习辅助标注，可以有效地提升标注效率。

## 项目结构

本仓库采用 monorepo 结构，包含以下三个子项目：

- **[backend](./backend/)** - PaddleLabel 的 Web 后端实现（Python/Flask）
- **[frontend](./frontend/)** - 基于 React 和 Ant Design 构建的前端
- **[ml](./ml/)** - 基于飞桨实现的自动和交互式深度学习辅助标注后端

## 特性

- **简单** 一行 `pip install` 安装，手动标注直观易操作，机器学习后端安装即用无需复杂配置，极易上手
- **高效** 支持交互式分割和多种预标注，显著提升标注效率和精度
- **灵活** 分类支持单分类和多分类标注，分割支持多边形、笔刷及交互式分割等多种工具，方便您根据场景灵活选择标注方式
- **全流程** 与飞桨其它套件紧密配合，帮助您高效完成数据标注、模型训练与导出等全流程操作

## 快速开始

### 安装后端

```bash
cd backend
pip install -e .
```

### 安装前端依赖

```bash
cd frontend
yarn install
```

### 安装 ML 后端（可选）

```bash
cd ml
pip install -e .
```

### 启动服务

```bash
# 启动后端
paddlelabel

# 启动前端开发服务器（开发模式）
cd frontend
npm start

# 启动 ML 后端（可选）
paddlelabel_ml
```

## 文档

详细使用文档请参见 [backend/doc/CN/](./backend/doc/CN/)

## 技术交流

- 如果您有任何使用问题、产品建议、功能需求，可以[提交 Issues](https://github.com/PaddleCV-SIG/PaddleLabel/issues/new)与开发团队交流

## 许可证

本项目采用 [Apache 2.0 许可证](./LICENSE)

## 学术引用

```
@misc{paddlelabel2022,
    title={PaddleLabel, an effective and flexible tool for data annotation},
    author={PaddlePaddle Authors},
    howpublished = {\url{https://github.com/PaddleCV-SIG/PaddleLabel}},
    year={2022}
}
```
