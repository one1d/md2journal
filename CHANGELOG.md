## v1.1.1 (2026-02-28)

### 样式优化

#### Cornell Notes 布局优化

- 调整页面尺寸为标准 A4 (210mm x 297mm)
- 更新康奈尔笔记比例至 Cornell 大学官方标准:
  - Cue 栏: 30% (原 28%)
  - Notes 栏: 70% (原 72%)
  - Summary 区域: 18% (原 15%)
- 更新版本号至 v2.2

---

## v1.1.0 (2026-02-28)

## v1.1.0 (2026-02-28)

### 新增功能

#### 1. 测试框架

- 集成 [Vitest](https://vitest.dev/) 测试框架
- 添加 `npm test` 和 `npm run test:run` 脚本
- 创建 `vitest.config.js` 配置文件
- 新增 `tests/` 目录，包含:
  - `tests/converter.test.js` - 核心转换逻辑测试 (10 个测试用例)

#### 2. 浏览器实例池

- 新增 `browser-pool.js` 模块
- 实现 `BrowserPool` 类，管理 Puppeteer 浏览器实例复用
- 最多复用 3 个浏览器实例，显著减少转换时间

#### 3. 代码规范

- 集成 ESLint + Prettier
- 添加 `eslint.config.js` 和 `.prettierrc` 配置
- 添加 `npm run format` 和 `npm run lint` 脚本

#### 4. CI/CD

- 添加 GitHub Actions 工作流 (`.github/workflows/ci.yml`)
- 支持 Node.js 18.x, 20.x, 22.x 测试
- 自动化构建演示文件

#### 5. 转换完成后自动退出

- CLI 命令 (`file`, `build`) 转换完成后自动退出
- 退出码: 0 成功, 1 失败
- 修复脚本执行后无法退出的问题

#### 6. 性能优化

- 模块预加载: 顶层导入 puppeteer/glob/chokidar，减少动态 import 开销
- vendor 资源持久缓存: CSS/JS 缓存到 /tmp，有效期 1 天
- 浏览器实例复用: 批量转换时复用浏览器实例

### 安全修复

#### XSS 漏洞修复

修复 `gui/index.html` 中的 4 处 XSS 漏洞:

| 位置 | 问题 | 修复 |
|------|------|------|
| line 1316 | 表格单元格未转义 | 添加 `escapeHtml()` 转义 |
| line 1172-1178 | 文件列表路径未转义 | 添加路径和文件名转义 |
| line 1197-1203 | 输出文件列表路径未转义 | 添加路径转义 |
| line 1527-1543 | 转换结果路径未转义 | 添加输出路径转义 |

---

## 性能基准

### 优化效果 (3 文件批量转换)

| 指标 | 优化前 (估算) | 优化后 | 提升 |
|------|-------------|--------|------|
| 总耗时 | ~12s | ~3.7s | **69%** |
| 浏览器启动 | 3次 | 1次 | 67% |
| 启动开销 | ~2-3s/次 | ~0s (复用) | 100% |

### 优化细节

1. **模块预加载**: 消除动态 import 开销 (~500ms)
2. **浏览器池**: 复用浏览器实例 (~2-3s/次)
3. **vendor 缓存**: 持久缓存到 /tmp (~200ms/次)

详见 [PERFORMANCE.md](./PERFORMANCE.md)

---

## 项目结构

```
md2journal/
├── .github/workflows/ci.yml  # CI/CD
├── .prettierrc               # 格式化配置
├── eslint.config.js          # ESLint 配置
├── vitest.config.js          # 测试配置
├── browser-pool.js           # 浏览器池模块
├── cli.js                    # CLI 入口
├── converter.js              # 核心转换引擎
├── gui.js                    # GUI 服务
├── gui/index.html            # GUI 前端
├── tests/
│   └── converter.test.js    # 测试用例
├── PERFORMANCE.md            # 性能优化报告
└── package.json             # 项目配置
```

---

## 使用说明

### 运行测试

```bash
npm test          # 启动 Vitest UI
npm run test:run # 快速运行测试
```

### 代码质量

```bash
npm run lint       # ESLint 检查
npm run format     # Prettier 格式化
npm run format:check # 检查格式
```

### 浏览器池

浏览器池在 CLI 中自动启用，无需额外配置。

---

## 测试用例覆盖

| 测试组 | 用例 |
|--------|------|
| escapeHtml | HTML 转义、空值处理、中文处理 |
| Output path generation | 路径生成、多样式、自定义模式 |
|| Style path resolution | 默认样式、全部样式、预设、去重 |

---

## Bug 修复

- 修复输出路径生成 bug: 自定义输出模式 `{name}.{ext}` 会产生 `test..pdf` (双点)
  - 原因: `ext` 变量包含前导点 `.pdf`
  - 修复: 将 `ext` 改为不包含前导点的 `pdf`，默认模式更新为 `{name}.{ext}

---

## 已知问题

- 发现 1 个 bug: 自定义输出模式 `{name}.{ext}` 会产生 `test..pdf` (双点)
  - 原因: `ext` 变量包含前导点 `.pdf`
  - 状态: 记录在测试中，待修复
