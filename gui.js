#!/usr/bin/env node

/**
 * md2journal GUI Server
 *
 * 启动一个本地 HTTP 服务器，提供图形化界面来操作 md2journal 的核心功能。
 * 用法: node gui.js [--port 3456]
 */

import http from 'http';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { convert } from './converter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 配置 ─────────────────────────────────────────────

const PORT = parseInt(process.argv.find((_, i, arr) => arr[i - 1] === '--port') || '3456');
const INPUT_DIR = path.join(__dirname, 'input');
const OUTPUT_DIR = path.join(__dirname, 'output');
const DEMO_DIR = path.join(__dirname, 'demo');

const STYLES = {
  journal: {
    name: 'journal',
    label: '学术期刊',
    desc: '宋体正文、三线表、首行缩进',
    cssPath: path.join(__dirname, 'journal.css')
  },
  'cornell-notes': {
    name: 'cornell-notes',
    label: '康奈尔笔记',
    desc: 'B5 内容区 + A4 笔记留白',
    cssPath: path.join(__dirname, 'cornell-notes.css')
  },
  'normal-a4': {
    name: 'normal-a4',
    label: '通用 A4',
    desc: 'A4 全幅通用排版',
    cssPath: path.join(__dirname, 'normal-a4.css')
  }
};

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// ─── 辅助函数 ───────────────────────────────────────

function jsonRes(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function errorRes(res, message, status = 500) {
  jsonRes(res, { error: message }, status);
}

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function listFiles(dir, baseDir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(dir, entry.name);
        const stat = await fs.stat(filePath);
        const relativePath = path.relative(baseDir, filePath);
        files.push({
          name: entry.name,
          path: relativePath,
          size: stat.size,
          sizeText: formatSize(stat.size),
          mtime: stat.mtime.toISOString()
        });
      }
    }
  } catch (err) {
    // 目录不存在或无权限
  }
  return files;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getExt(filename) {
  const i = filename.lastIndexOf('.');
  return i > 0 ? filename.substring(i).toLowerCase() : '';
}

function getMimeType(filePath) {
  const ext = getExt(filePath);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ─── 解析请求体 ───────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const size = parseInt(req.headers['content-length'] || '0', 10);
    if (size > 50 * 1024 * 1024) {
      reject(new Error('Body too large'));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// ─── Puppeteer 浏览器实例池 ────────────────────────────

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    const puppeteer = (await import('puppeteer')).default;
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

// ─── HTTP 服务器 ─────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const { url, method } = req;
  const parsedUrl = new URL(url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const search = parsedUrl.search;

  // 预检请求
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    // ─── API 路由 ─────────────────────────────────────

    // 获取可用样式
    if (pathname === '/api/styles' && method === 'GET') {
      jsonRes(res, { styles: Object.values(STYLES) });
      return;
    }

    // 获取输入文件列表
    if (pathname === '/api/files' && method === 'GET') {
      const files = await listFiles(INPUT_DIR, INPUT_DIR);
      const demoFiles = await listFiles(DEMO_DIR, INPUT_DIR);
      jsonRes(res, { files: [...files, ...demoFiles] });
      return;
    }

    // 获取输出文件列表
    if (pathname === '/api/outputs' && method === 'GET') {
      const files = await listFiles(OUTPUT_DIR, OUTPUT_DIR);
      jsonRes(res, { files });
      return;
    }

    // 读取文件内容
    if (pathname === '/api/file' && method === 'GET') {
      const filePath = search ? parsedUrl.searchParams.get('path') : null;
      if (!filePath) {
        errorRes(res, 'Missing path parameter', 400);
        return;
      }

      // 安全检查：防止路径遍历
      const baseDir = INPUT_DIR;
      const fullPath = path.join(baseDir, filePath);
      if (!fullPath.startsWith(baseDir)) {
        errorRes(res, '非法路径', 403);
        return;
      }

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        jsonRes(res, { content });
      } catch {
        errorRes(res, '文件读取失败', 404);
      }
      return;
    }

    // 转换请求
    if (pathname === '/api/convert' && method === 'POST') {
      const body = await parseBody(req);
      const { filePath, source, styles, content, filename } = body;

      let inputPath;

      // 如果提供了 content，保存为临时文件
      if (content && filename) {
        await ensureDir(INPUT_DIR);
        const safeName = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fff._-]/g, '_');
        inputPath = path.join(INPUT_DIR, safeName);
        await fs.writeFile(inputPath, content, 'utf-8');
      } else if (filePath) {
        // 否则使用指定的文件
        const baseDir = source === 'demo' ? DEMO_DIR : INPUT_DIR;
        const fullPath = path.join(baseDir, filePath);
        if (!fullPath.startsWith(baseDir)) {
          errorRes(res, '非法路径', 403);
          return;
        }
        inputPath = fullPath;
      } else {
        errorRes(res, 'Missing filePath or content', 400);
        return;
      }

      // 转换
      const targetStyles = styles && styles.length > 0 ? styles : ['journal'];
      const results = [];

      const browser = await getBrowser();

      for (const styleName of targetStyles) {
        const style = STYLES[styleName];
        if (!style) {
          results.push({ style: styleName, status: 'error', error: 'Unknown style' });
          continue;
        }

        const outputName = path.basename(inputPath, '.md') + '-' + styleName + '.pdf';
        const outputPath = path.join(OUTPUT_DIR, outputName);

        try {
          await ensureDir(OUTPUT_DIR);
          await convert(inputPath, outputPath, { cssPath: style.cssPath, browser });

          const stat = await fs.stat(outputPath);
          results.push({
            style: styleName,
            status: 'ok',
            output: outputName,
            size: stat.size,
            sizeText: formatSize(stat.size)
          });
        } catch (err) {
          results.push({ style: styleName, status: 'error', error: err.message });
        }
      }

      // 清理临时文件
      if (content && filename && inputPath) {
        await fs.unlink(inputPath).catch(() => {});
      }

      jsonRes(res, { results });
      return;
    }

    // 下载文件
    if (pathname === '/api/download' && method === 'GET') {
      const file = search ? parsedUrl.searchParams.get('file') : null;
      if (!file) {
        errorRes(res, 'Missing file parameter', 400);
        return;
      }

      const baseDir = OUTPUT_DIR;
      const fullPath = path.join(baseDir, file);
      if (!fullPath.startsWith(baseDir)) {
        errorRes(res, '非法路径', 403);
        return;
      }

      if (!existsSync(fullPath)) {
        errorRes(res, '文件不存在', 404);
        return;
      }

      const mimeType = getMimeType(fullPath);
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file)}"`
      });
      createReadStream(fullPath).pipe(res);
      return;
    }

    // ─── 静态文件服务 ─────────────────────────────────

    // 前端路由：serve index.html for any non-API path
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const staticDir = path.join(__dirname, 'gui');

    // 尝试在 gui 目录查找
    let targetPath = path.join(staticDir, filePath);

    // 如果不存在，尝试 index.html
    if (!existsSync(targetPath)) {
      targetPath = path.join(staticDir, filePath, 'index.html');
    }

    // 安全检查
    if (!targetPath.startsWith(staticDir)) {
      errorRes(res, 'Forbidden', 403);
      return;
    }

    if (existsSync(targetPath) && (await fs.stat(targetPath)).isFile()) {
      const mimeType = getMimeType(targetPath);
      res.writeHead(200, { 'Content-Type': mimeType });
      createReadStream(targetPath).pipe(res);
      return;
    }

    // 404
    errorRes(res, 'Not Found', 404);
  } catch (err) {
    console.error('Server error:', err);
    errorRes(res, err.message);
  }
});

// ─── 启动服务器 ─────────────────────────────────────

server.listen(PORT, () => {
  console.log(`🌐 GUI 服务器已启动: http://localhost:${PORT}`);
  console.log('📁 输入目录:', INPUT_DIR);
  console.log('📄 输出目录:', OUTPUT_DIR);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  server.close(async () => {
    if (browserInstance) {
      await browserInstance.close();
    }
    process.exit(0);
  });
});
