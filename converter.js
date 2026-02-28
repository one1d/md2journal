/**
 * md2journal - 核心转换引擎
 *
 * Markdown (+ LaTeX + Mermaid) → 中文期刊 PDF
 *
 * 依赖: marked, katex, puppeteer, gray-matter
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import katex from 'katex';
import matter from 'gray-matter';
import { fileNotFound, cssNotFound, dirNotFound, invalidDirectory } from './errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { fileNotFound, cssNotFound, dirNotFound, invalidDirectory } from './errors.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── HTML 转义辅助 ──────────────────────────────────

const htmlEscapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (c) => htmlEscapeMap[c]);
}

// ─── KaTeX 渲染辅助 ──────────────────────────────────

/** 将文本中的 LaTeX 公式替换为 KaTeX HTML */
function renderLatex(html) {
  // 将转义的 \$ 替换为占位符，避免干扰公式匹配
  const DOLLAR_PLACEHOLDER = '\u0000DOLLAR';
  html = html.replace(/\\\$/g, DOLLAR_PLACEHOLDER);

  // 行间公式 $$...$$
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<pre class="katex-error">${tex}</pre>`;
    }
  });

  // 行内公式 $...$（排除 $$）
  html = html.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code class="katex-error">${tex}</code>`;
    }
  });

  // 恢复转义的 $ 符号
  html = html.replace(new RegExp(DOLLAR_PLACEHOLDER, 'g'), '$');

  return html;
}

// ─── Marked 配置 ──────────────────────────────────────

/** 自定义 renderer：mermaid 代码块特殊处理 */
function createRenderer() {
  const renderer = new marked.Renderer();

  const originalCode = renderer.code.bind(renderer);
  renderer.code = function ({ text, lang }) {
    if (lang === 'mermaid') {
      return `<pre class="mermaid">${text}</pre>`;
    }
    return originalCode({ text, lang });
  };

  return renderer;
}

// 模块加载时配置 marked（避免在 convert 中重复调用全局 setOptions）
marked.use({
  renderer: createRenderer(),
  gfm: true,
  breaks: false,
});

// ─── HTML 模板生成 ─────────────────────────────────────

function buildHtml(body, meta, cssContent, vendorAssets) {
  const header = meta.title
    ? `<div class="article-header">
        <div class="article-title">${escapeHtml(meta.title)}</div>
        ${meta.author ? `<div class="article-author">${escapeHtml(meta.author)}</div>` : ''}
        ${meta.date ? `<div class="article-date">${escapeHtml(meta.date)}</div>` : ''}
      </div>`
    : '';

  const abstractBlock = meta.abstract
    ? `<div class="abstract-block">
        <span class="label">摘要：</span>${escapeHtml(meta.abstract)}
      </div>`
    : '';

  const keywordsBlock = meta.keywords
    ? `<div class="keywords-block">
        <span class="label">关键词：</span>${Array.isArray(meta.keywords) ? meta.keywords.map((k) => escapeHtml(k)).join('；') : escapeHtml(meta.keywords)}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(meta.title) || 'md2journal'}</title>
  ${vendorAssets.fontsCss ? `<style>${vendorAssets.fontsCss}</style>` : ''}
  ${vendorAssets.katexCss ? `<style>${vendorAssets.katexCss}</style>` : '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">'}
  ${vendorAssets.mermaidJs ? `<script>${vendorAssets.mermaidJs}</script>` : '<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>'}
  <style>${cssContent}</style>
</head>
<body>
  ${header}
  ${abstractBlock}
  ${keywordsBlock}
  <div class="article-body">
    ${body}
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: { useMaxWidth: true }
    });
  </script>
</body>
</html>`;
}

// ─── 跨平台工具函数 ────────────────────────────────

/** 获取平台兼容的临时目录 */
function getTempDir() {
  // Windows: TEMP, TMP, USERPROFILE\AppData\Local\Temp
  // Unix: TMPDIR, /tmp
  return process.env.TEMP || process.env.TMP || process.env.TMPDIR || (process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp');
}

/** 将本地路径转换为 file:// URL，兼容 Windows */
function pathToFileUrl(filePath) {
  if (process.platform === 'win32') {
    // Windows: file:///C:/path/to/file
    return 'file:///' + filePath.replace(/\\/g, '/');
  }
  // Unix: file:///path/to/file
  return 'file://' + filePath;
}

/** 获取平台兼容的 Puppeteer 启动参数 */
function getPuppeteerArgs() {
  const args = ['--no-sandbox'];
  // Linux 需要 --disable-setuid-sandbox，Windows/macOS 不需要且可能有问题
  if (process.platform === 'linux') {
    args.push('--disable-setuid-sandbox');
  }
  return args;
}

// ─── vendor 资源缓存 ──────────────────────────────────

let vendorAssetsCache = null;
const VENDOR_CACHE_FILE = path.join(getTempDir(), 'md2journal-vendor-cache.json');

/** 加载并处理 fontsource 字体 CSS，将相对路径转换为绝对路径 */
async function loadFontCss(fontPackage, cssFile = 'index.css') {
  try {
    const fontDir = path.join(__dirname, 'node_modules', fontPackage);
    const cssPath = path.join(fontDir, cssFile);
    let css = await fs.readFile(cssPath, 'utf-8');
    // 将相对路径 url(./files/...) 转换为 file:// URL（兼容 Windows）
    css = css.replace(/url\(\.\//g, `url(${pathToFileUrl(fontDir)}/`);
    return css;
  } catch {
    return '';
  }
}

/** 尝试从持久缓存加载 vendor 资源 */
async function loadVendorAssetsFromCache() {
  try {
    const stat = await fs.stat(VENDOR_CACHE_FILE);
    // 缓存有效期 1 天
    if (Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) {
      return null;
    }
    const data = await fs.readFile(VENDOR_CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** 保存 vendor 资源到持久缓存 */
async function saveVendorAssetsToCache(assets) {
  try {
    await fs.writeFile(VENDOR_CACHE_FILE, JSON.stringify(assets), 'utf-8');
  } catch {
    // 缓存写入失败不影响主流程
  }
}

/** 尝试从 node_modules 读取本地 vendor 资源，失败时回退到 CDN */
async function loadVendorAssets() {
  // 尝试从持久缓存加载
  const cached = await loadVendorAssetsFromCache();
  if (cached) {
    return cached;
  }

  const assets = { katexCss: null, mermaidJs: null, fontsCss: null };

  // KaTeX CSS（已作为项目依赖安装）
  try {
    const katexCssPath = path.join(__dirname, 'node_modules/katex/dist/katex.min.css');
    assets.katexCss = await fs.readFile(katexCssPath, 'utf-8');
  } catch {
    /* 回退到 CDN */
  }

  // Mermaid JS（尝试从 node_modules 读取）
  try {
    const mermaidJsPath = path.join(__dirname, 'node_modules/mermaid/dist/mermaid.min.js');
    assets.mermaidJs = await fs.readFile(mermaidJsPath, 'utf-8');
  } catch {
    /* 回退到 CDN */
  }

  // 加载字体 CSS（使用 400/700 字重满足常规和粗体需求）
  const fontConfigs = [
    { package: '@fontsource/noto-sans-sc', css: '400.css' },
    { package: '@fontsource/noto-sans-sc', css: '700.css' },
    { package: '@fontsource/noto-serif-sc', css: '400.css' },
    { package: '@fontsource/noto-serif-sc', css: '700.css' },
    { package: '@fontsource/source-code-pro', css: '400.css' },
    { package: '@fontsource/source-code-pro', css: '700.css' },
    { package: '@fontsource/jetbrains-mono', css: '400.css' },
    { package: '@fontsource/fira-code', css: '400.css' },
  ];
  const fontsCssArr = await Promise.all(fontConfigs.map((cfg) => loadFontCss(cfg.package, cfg.css)));
  assets.fontsCss = fontsCssArr.filter(Boolean).join('\n');

  // 保存到持久缓存
  await saveVendorAssetsToCache(assets);

  return assets;
}

// ─── 主转换函数 ────────────────────────────────────────

/**
 * 将单个 Markdown 文件转换为 PDF
 *
 * @param {string} inputPath  - 输入 .md 文件路径
 * @param {string} outputPath - 输出 .pdf 文件路径
 * @param {object} options    - { cssPath, browser }
 */
export async function convert(inputPath, outputPath, options = {}) {
  // 输入验证
  try {
    await fs.access(inputPath);
  } catch {
    throw fileNotFound(inputPath);
  }

  const cssPath = options.cssPath || path.join(__dirname, 'journal.css');
  if (options.cssPath) {
    try {
      await fs.access(cssPath);
    } catch {
    throw cssNotFound(cssPath);
    }
  }
  const cssContent = await fs.readFile(cssPath, 'utf-8');

  // 1. 读取 Markdown 并解析 front-matter
  const raw = await fs.readFile(inputPath, 'utf-8');
  const { data: meta, content: mdContent } = matter(raw);

  // 2. Marked 解析 Markdown → HTML
  let html = marked.parse(mdContent);

  // 3. KaTeX 渲染 LaTeX 公式
  html = renderLatex(html);

  // 4. 加载 vendor 资源（单例缓存）
  if (!vendorAssetsCache) vendorAssetsCache = await loadVendorAssets();

  // 5. 组装完整 HTML
  const fullHtml = buildHtml(html, meta, cssContent, vendorAssetsCache);

  // 6. Puppeteer 渲染 PDF
  const browser = options.browser || (await (await import('puppeteer')).default.launch({
    headless: true,
    args: getPuppeteerArgs(),
  }));
  const ownBrowser = !options.browser;

  try {
    const page = await browser.newPage();

    // 高分辨率视口，提升 PDF 图片质量
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });

    // 内联资源时无需等待网络，加速加载
    const waitStrategy = vendorAssetsCache.katexCss && vendorAssetsCache.mermaidJs
      ? 'domcontentloaded'
      : 'networkidle0';
    await page.setContent(fullHtml, { waitUntil: waitStrategy, timeout: 30000 });

    // 等待 Mermaid 渲染完成
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const mermaidEls = document.querySelectorAll('.mermaid');
        if (mermaidEls.length === 0) return resolve();

        const maxWait = setTimeout(resolve, 10000);
        const check = () => {
          const svgs = document.querySelectorAll('.mermaid svg');
          if (svgs.length >= mermaidEls.length) {
            clearTimeout(maxWait);
            setTimeout(resolve, 300); // 渲染完成后短暂等待布局稳定
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    });

    // 确保输出目录存在
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // 根据 CSS 类型选择页边距和页脚样式
    const cssBaseName = path.basename(cssPath);
    const isJournal = cssBaseName === 'journal.css';
    const pdfMargin = isJournal
      ? { top: '2.5cm', bottom: '2.5cm', left: '2.2cm', right: '2.2cm' }
      : { top: '0mm', bottom: '6mm', left: '0mm', right: '0mm' };
    const pdfFooter = isJournal
      ? `<div style="width:100%;text-align:center;font-size:9px;color:#888;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`
      : `<div style="width:100%;text-align:center;font-size:8px;color:#9BAFAB;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`;

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: pdfMargin,
      printBackground: true,
      preferCSSPageSize: false,
      scale: 1.0,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: pdfFooter,
    });

    await page.close();
  } finally {
    if (ownBrowser) await browser.close();
  }
}

/**
 * 批量转换目录中所有 .md 文件
 *
 * @param {string} inputDir  - 输入目录
 * @param {string} outputDir - 输出目录
 * @param {object} options   - { cssPath, concurrency }
 */
export async function batchConvert(inputDir, outputDir, options = {}) {
  // 输入验证
  try {
    const stat = await fs.stat(inputDir);
    if (!stat.isDirectory()) throw invalidDirectory(inputDir, '不是目录');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw dirNotFound(inputDir);
    }
    throw invalidDirectory(inputDir, err.message);
  }
  } catch (err) {
    throw new Error(`输入目录无效: ${inputDir} (${err.message})`);
  }

  const { glob } = await import('glob');
  const files = await glob('**/*.md', { cwd: inputDir });

  if (files.length === 0) {
    console.log('未找到 .md 文件');
    return { total: 0, success: 0, failed: 0, results: [] };
  }

  const concurrency = options.concurrency || 3;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: getPuppeteerArgs(),
  });

  const results = [];
  let success = 0;
  let failed = 0;

  // 并发队列：始终保持 concurrency 个任务在运行
  await new Promise((resolveAll) => {
    let running = 0;
    let idx = 0;

    const processFile = async (file) => {
      const input = path.join(inputDir, file);
      const output = path.join(outputDir, file.replace(/\.md$/i, '.pdf'));
      try {
        await convert(input, output, { ...options, browser });
        success++;
        results.push({ file, status: 'ok', output });
      } catch (err) {
        failed++;
        results.push({ file, status: 'error', error: err.message });
      }
    };

    const next = () => {
      while (running < concurrency && idx < files.length) {
        running++;
        const file = files[idx++];
        processFile(file).finally(() => {
          running--;
          next();
        });
      }
      if (running === 0 && idx >= files.length) resolveAll();
    };
    next();
  });

  await browser.close();
  return { total: files.length, success, failed, results };
}
