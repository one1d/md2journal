# md2journal

<p align="center">
  <strong>Markdown → 中文期刊 PDF 批量自动转换工具</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/md2journal">
    <img src="https://img.shields.io/npm/v/md2journal" alt="npm 版本">
  </a>
  <a href="https://github.com/one1d/md2journal/actions">
    <img src="https://github.com/one1d/md2journal/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/node/v/md2journal" alt="node">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="许可证">
  </a>
</p>

## 简介

md2journal 是一个 Node.js 命令行工具，可将 Markdown 文件（含 LaTeX 公式、Mermaid 图表）转换为符合中文期刊排版规范的 PDF 文档。支持单文件转换、批量构建、监听自动转换三种运行模式。

**支持平台: Windows | macOS | Linux**

## 特性

- 📝 **完整 Markdown 支持** — GFM 语法、代码高亮、表格、任务列表
- 🔬 **LaTeX 公式** — KaTeX 驱动，支持行内 `$...$` 和行间 `$$...$$`
- 📊 **Mermaid 图表** — 流程图、状态图、时序图、类图
- 📰 **中文期刊排版** — 宋体正文、黑体标题、三线表、首行缩进
- 🎨 **多样式输出** — 学术期刊、康奈尔笔记、常规 A4 三种格式
- 👁️ **图形界面** — 浏览器可视化操作
- 🌐 **跨平台** — Windows、macOS、Linux 全平台支持
- ⚡ **高性能** — 浏览器池、资源缓存、并行处理

## 安装

### 环境要求

| 要求 | 版本 |
|------|------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |

### 方式一: npm 安装（推荐）

```bash
# 全局安装
npm install -g md2journal

# 验证安装
md2journal --version

# 或使用 npx
npx md2journal --version
```

### 方式二: 本地安装

```bash
# 克隆仓库
git clone https://github.com/one1d/md2journal.git
cd md2journal

# 安装依赖
npm install

# 直接运行
node cli.js --version
```

### 方式三: 二进制分发（即将推出）

从 [Releases](https://github.com/one1d/md2journal/releases) 页面下载预编译的二进制文件。

## 快速开始

### CLI 使用

```bash
# 单文件转换
md2journal file input.md output.pdf

# 批量转换目录
md2journal build ./input ./output

# 监听模式（文件变动自动转换）
md2journal watch ./input ./output
```

### GUI 使用

```bash
# 启动 GUI 服务（默认端口 3456）
md2journal-gui

# 或使用 npx
npx md2journal-gui

# 自定义端口
npx md2journal-gui --port 3000

# 然后在浏览器打开 http://localhost:3456
```

### npm 脚本

```bash
# 转换演示文件
npm run demo

# 构建输入文件
npm run build

# 监听模式
npm run watch

# 生成所有样式
npm run build:all
```

## 命令参考

### `md2journal file <input> [output]`

将单个 Markdown 文件转换为 PDF。

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--css <name>` | `-c` | CSS 样式名称 | `journal` |
| `--all-styles` | `-a` | 生成全部 3 种样式 | `false` |
| `--preset <name>` | `-p` | 预设名称 | - |
| `--output-pattern <pattern>` | `-o` | 输出文件名模式 | `{name}.pdf` |

**样式:** `journal`、`cornell-notes`、`normal-a4`

**示例:**
```bash
# 使用默认样式转换
md2journal file input.md output.pdf

# 使用康奈尔笔记样式
md2journal file input.md output.pdf --css cornell-notes

# 生成所有样式
md2journal file input.md output.pdf --all-styles
```

### `md2journal build <inputDir> <outputDir>`

批量转换目录中的所有 Markdown 文件。

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--css <name>` | `-c` | CSS 样式名称 | `journal` |
| `--all-styles` | `-a` | 生成全部 3 种样式 | `false` |
| `--preset <name>` | `-p` | 预设名称 | - |
| `--exclude <pattern>` | `-e` | 排除的 glob 模式 | - |
| `--concurrency <n>` | `-j` | 并行转换数 | `3` |

**示例:**
```bash
# 转换目录中所有文件
md2journal build ./input ./output

# 生成所有样式
md2journal build ./input ./output --all-styles

# 排除测试文件，5 个并行任务
md2journal build ./input ./output --exclude "**/test/**" --concurrency 5
```

### `md2journal watch <inputDir> <outputDir>`

监听文件变动并自动转换。

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--css <name>` | `-c` | CSS 样式名称 | `journal` |
| `--all-styles` | `-a` | 生成全部 3 种样式 | `false` |
| `--preset <name>` | `-p` | 预设名称 | - |

**示例:**
```bash
# 监听并转换
md2journal watch ./input ./output

# 监听并生成所有样式
md2journal watch ./input ./output --all-styles
```

### 预设

| 预设 | 样式 | 说明 |
|------|------|------|
| `default` | journal | 中文核心期刊 |
| `cornell` | cornell-notes | 康奈尔笔记格式 |
| `a4` | normal-a4 | 标准 A4 文档 |

## Markdown 功能

### YAML 头部

```yaml
---
title: 文档标题
author: Guoqin Chen
date: 2026-02-28
abstract: 文档摘要...
keywords: [关键词1, 关键词2]
---
```

### LaTeX 公式

**行内:** `$E = mc^2$`

**行间:**
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

### Mermaid 图表

````markdown
```mermaid
graph LR
    A[输入] --> B[处理]
    B --> C[输出]
```
````

### 代码块

```python
def hello():
    print("你好，世界！")
```

## 输出样式

| 样式 | 说明 | 适用场景 |
|------|------|----------|
| `journal` | 中文核心期刊排版 | 论文、学位论文 |
| `cornell-notes` | 康奈尔笔记格式 | 学习笔记 |
| `normal-a4` | 标准 A4 文档 | 通用文档 |

## 配置

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEBUG` | 启用调试输出 | - |
| `PUPPETEER_SKIP_DOWNLOAD` | 跳过浏览器下载 | `false` |
| `PUPPETEER_EXECUTABLE_PATH` | 自定义浏览器路径 | - |

### Puppeteer 浏览器

md2journal 使用 Puppeteer 渲染 PDF。首次运行时会自动下载 Chromium（如未找到）。

**跳过下载:**
```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
```

**使用自定义浏览器:**
```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chromium npm install
```

## 平台说明

### Windows

```powershell
# 使用 PowerShell
.\cli.bat file input.md output.pdf

# 或直接使用 node
node cli.js file input.md output.pdf
```

### macOS

```bash
# 直接执行
./cli.js file input.md output.pdf

# 或使用 npm 脚本
npm run demo
```

### Linux

```bash
# 安装依赖 (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2

# 运行
node cli.js file input.md output.pdf
```

## 常见问题

### "Browser not found" 错误

Puppeteer 找不到浏览器。解决方案：

1. **自动下载:** 直接运行，Puppeteer 会自动下载 Chromium
2. **跳过下载:** 设置 `PUPPETEER_SKIP_DOWNLOAD=1` 并配置 `PUPPETEER_EXECUTABLE_PATH`
3. **安装系统浏览器:** 安装 Chrome/Chromium 并设置路径

### "Module not found" 错误

缺少依赖。运行:

```bash
npm install
```

### "Permission denied" 错误 (Linux/macOS)

修复脚本权限:

```bash
chmod +x cli.js gui.js
```

### PDF 生成失败

1. 检查输入 Markdown 语法
2. 确保 LaTeX 公式有效
3. 检查 Mermaid 图表语法
4. 尝试 `--all-styles` 排查 CSS 问题

## 开发

### 环境设置

```bash
# 克隆并安装
git clone https://github.com/one1d/md2journal.git
cd md2journal
npm install
```

### 命令

```bash
# 运行测试
npm test

# 运行测试一次
npm run test:run

# 代码检查
npm run lint

# 代码格式化
npm run format

# 检查格式
npm run format:check
```

### 项目结构

```
md2journal/
├── cli.js              # CLI 入口
├── converter.js        # 核心转换引擎
├── browser-pool.js    # Puppeteer 浏览器池
├── gui.js             # GUI 服务
├── logger.js          # 日志模块
├── errors.js          # 错误处理
├── variables.css      # 共享 CSS 变量
├── journal.css        # 学术期刊样式
├── cornell-notes.css  # 康奈尔笔记样式
├── normal-a4.css     # 标准 A4 样式
├── tests/             # 测试文件
├── demo/              # 演示文件
├── input/             # 输入文件
└── output/           # 输出文件
```

## 许可证

[Apache License 2.0](./LICENSE)

## 致谢

- [marked](https://github.com/markedjs/marked) — Markdown 解析
- [KaTeX](https://github.com/KaTeX/KaTeX) — LaTeX 渲染
- [Mermaid](https://github.com/mermaid-js/mermaid) — 图表生成
- [Puppeteer](https://github.com/puppeteer/puppeteer) — PDF 渲染

---

<p align="center">❤️ 为中文学术界而作</p>
