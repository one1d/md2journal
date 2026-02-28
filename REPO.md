# md2journal

<p align="center">
  <strong>Markdown → 中文期刊 PDF 批量自动转换工具</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/md2journal">
    <img src="https://img.shields.io/npm/v/md2journal" alt="npm version">
  </a>
  <a href="https://github.com/one1d/md2journal/actions">
    <img src="https://github.com/one1d/md2journal/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License">
  </a>
</p>

## 简介

md2journal 是一个 Node.js 命令行工具，可将 Markdown 文件（含 LaTeX 公式、Mermaid 图表）转换为符合中文期刊排版规范的 PDF 文档。支持单文件转换、批量构建、监听自动转换三种运行模式，输出涵盖学术期刊、康奈尔笔记、常规 A4 三种样式。

## 特性

- 📝 **Markdown 完整支持** — GFM 语法、代码高亮、表格任务列表
- 🔬 **LaTeX 公式** — 基于 KaTeX，行内 `$...$` 与行间 `$$...$$` 语法
- 📊 **Mermaid 图表** — 流程图、状态图、时序图等，直接嵌入 Markdown
- 📰 **中文期刊排版** — 宋体正文、黑体标题、三线表、首行缩进
- 🌐 **离线优先** — 自动内联本地资源，无网络亦可使用
- 🎨 **多样式输出** — 一次转换生成多种 PDF 样式
- 👁️ **GUI 图形界面** — 浏览器可视化操作

## 快速开始

```bash
# 安装
npm install

# 单文件转换
node cli.js file input.md output.pdf

# 批量转换
node cli.js build ./input ./output

# 监听模式（文件变动自动转换）
node cli.js watch ./input ./output
```

## 使用示例

```markdown
---
title: 深度学习在自然语言处理中的应用
author: 张三，李四
date: 2026年2月
abstract: 本文综述了深度学习技术在NLP领域的最新进展...
keywords: [深度学习, 自然语言处理, Transformer]
---

# 引言

近年来，Transformer 架构在 NLP 领域取得了突破性进展。

## 公式示例

注意力机制的核心计算：
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

## 图表示例

```mermaid
graph LR
    A[输入] --> B[编码器]
    B --> C[解码器]
    C --> D[输出]
```
```

## 输出样式

| 样式 | 说明 |
|------|------|
| `journal` | 中文核心期刊排版（默认） |
| `cornell-notes` | 康奈尔笔记格式 |
| `normal-a4` | 常规 A4 通用文档 |

## 技术栈

- [marked](https://github.com/markedjs/marked) — Markdown 解析
- [KaTeX](https://github.com/KaTeX/KaTeX) — LaTeX 公式渲染
- [Mermaid](https://github.com/mermaid-js/mermaid) — 图表生成
- [Puppeteer](https://github.com/puppeteer/puppeteer) — PDF 渲染

## 许可证

[Apache License 2.0](./LICENSE)
