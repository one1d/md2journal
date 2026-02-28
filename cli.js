#!/usr/bin/env node

/**
 * md2journal CLI
 *
 * 用法:
 *   md2journal file  <input> [output]           单文件/通配符转换
 *   md2journal build <inputDir> <outputDir>      批量转换
 *   md2journal watch <inputDir> <outputDir>      监听并自动转换
 *
 * 多样式:
 *   --css <name|path>     指定样式（可多次使用）
 *   --all-styles          使用所有内置样式
 *   --preset <name>       使用样式预设 (academic|notes|report|all)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { cliLog, configureLogger } from './logger.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { convert } from './converter.js';
import { createBrowserPool } from './browser-pool.js';
import puppeteer from 'puppeteer';
import { glob } from 'glob';
import { watch } from 'chokidar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Shared browser pool
let browserPool = null;

// ─── 样式配置 ─────────────────────────────────────────

const BUILT_IN_STYLES = {
  journal: path.join(__dirname, 'journal.css'),
  'cornell-notes': path.join(__dirname, 'cornell-notes.css'),
  'normal-a4': path.join(__dirname, 'normal-a4.css'),
};

const STYLE_PRESETS = {
  academic: ['journal'],
  notes: ['cornell-notes'],
  report: ['normal-a4'],
  all: Object.keys(BUILT_IN_STYLES),
};

// ─── 辅助函数 ─────────────────────────────────────────

/**
 * 解析命令行选项为 CSS 路径数组
 *
 * 优先级: --all-styles > --preset > --css > 默认 journal.css
 * 支持内置样式名(如 "journal") 和文件路径(如 "./my.css")
 */
async function resolveStylePaths(opts) {
  const paths = [];

  // --all-styles
  if (opts.allStyles) {
    paths.push(...Object.values(BUILT_IN_STYLES));
  }

  // --preset
  if (opts.preset) {
    const names = STYLE_PRESETS[opts.preset];
    if (!names) {
      const valid = Object.keys(STYLE_PRESETS).join(', ');
      throw new Error(`未知预设: ${opts.preset}，可用预设: ${valid}`);
    }
    for (const n of names) {
      paths.push(BUILT_IN_STYLES[n]);
    }
  }

  // --css (数组，可多次指定)
  if (opts.css && opts.css.length > 0) {
    for (const val of opts.css) {
      if (BUILT_IN_STYLES[val]) {
        paths.push(BUILT_IN_STYLES[val]);
      } else {
        paths.push(path.resolve(val));
      }
    }
  }

  // 默认
  if (paths.length === 0) {
    paths.push(BUILT_IN_STYLES.journal);
  }

  // 去重
  return [...new Set(paths)];
}

/**
 * 生成输出文件路径
 */
function generateOutputPath(inputPath, inputRoot, outputRoot, stylePath, isMultiStyle, outputPattern) {
  const name = path.basename(inputPath, '.md');
  const dir = path.relative(inputRoot, path.dirname(inputPath));
  const style = path.basename(stylePath, '.css');
  const ext = 'pdf'; // 不包含前导点，避免产生双点

  let pattern = outputPattern;
  if (!pattern) {
    pattern = isMultiStyle ? '{style}/{dir}/{name}.{ext}' : '{dir}/{name}.{ext}';
  }

  const result = pattern
    .replace(/\{name\}/g, name)
    .replace(/\{style\}/g, style)
    .replace(/\{dir\}/g, dir)
    .replace(/\{ext\}/g, ext);

  // 清理路径中的多余分隔符(当 dir 为空时)
  return path.join(outputRoot, result);
}

/**
 * 带样式的转换函数
}

  let pattern = outputPattern;
  if (!pattern) {
    pattern = isMultiStyle ? '{style}/{dir}/{name}.{ext}' : '{dir}/{name}.{ext}';
  }
  const name = path.basename(inputPath, '.md');
  const dir = path.relative(inputRoot, path.dirname(inputPath));
  const style = path.basename(stylePath, '.css');
  const ext = '.pdf';

  let pattern = outputPattern;
  if (!pattern) {
    pattern = isMultiStyle ? '{style}/{dir}/{name}{ext}' : '{dir}/{name}{ext}';
  }

  const result = pattern
    .replace(/\{name\}/g, name)
    .replace(/\{style\}/g, style)
    .replace(/\{dir\}/g, dir)
    .replace(/\{ext\}/g, ext);

  return path.join(outputRoot, result);
}

/**
 * 带样式的转换函数
  return path.join(outputRoot, result);
}

/**
 * 带样式的转换函数
 */
async function convertWithStyles(files, inputRoot, outputRoot, stylePaths, options = {}) {
  const concurrency = options.concurrency || 3;
  const isMultiStyle = stylePaths.length > 1;

  // Use browser pool
  let browser = options.browser;
  let ownBrowser = false;

  if (!browser) {
    if (!browserPool) {
      browserPool = createBrowserPool({ maxBrowsers: Math.min(concurrency, 3) });
    }
    browser = await browserPool.acquire();
    ownBrowser = true;
  }

  // 构建任务列表: files × styles
  const tasks = [];
  for (const file of files) {
    for (const style of stylePaths) {
      const outputPath = generateOutputPath(file, inputRoot, outputRoot, style, isMultiStyle, options.outputPattern);
      tasks.push({ inputPath: file, outputPath, cssPath: style });
    }
  }

  const results = [];
  let success = 0;
  let failed = 0;

  // 并发队列
  await new Promise((resolveAll) => {
    let running = 0;
    let idx = 0;

    const processFile = async (task) => {
      try {
        await convert(task.inputPath, task.outputPath, { cssPath: task.cssPath, browser });
        success++;
        results.push({ inputPath: task.inputPath, outputPath: task.outputPath, style: path.basename(task.cssPath, '.css'), status: 'ok' });
      } catch (err) {
        failed++;
        results.push({ inputPath: task.inputPath, style: path.basename(task.cssPath, '.css'), status: 'error', error: err.message });
      }
    };

    const next = () => {
      while (running < concurrency && idx < tasks.length) {
        running++;
        const task = tasks[idx++];
        processFile(task).finally(() => {
          running--;
          next();
        });
      }
      if (running === 0 && idx >= tasks.length) resolveAll();
    };
    next();
  });

  // Release browser back to pool
  if (ownBrowser && browserPool) {
    await browserPool.release(browser);
  } else if (ownBrowser) {
    await browser.close();
  }

  return { total: tasks.length, success, failed, results };
}

// ─── Commander.js 选项收集器 ──────────────────────────

const program = new Command();

program
  .name('md2journal')
  .description('Markdown → 中文期刊 PDF 批量自动转换工具')
  .version('1.1.0');

// build: 批量转换
program
  .command('build <inputDir> <outputDir>')
  .description('批量转换目录下所有 Markdown 文件')
  .option('-s, --css <name|path>', '指定 CSS 样式（可多次使用）', [])
  .option('--all-styles', '使用所有内置样式')
  .option('--preset <name>', '使用样式预设 (academic|notes|report|all)')
  .option('-e, --exclude <pattern>', '排除文件（可多次使用）', [])
  .option('-c, --concurrency <number>', '并发数', '3')
  .option('-o, --output-pattern <pattern>', '输出文件命名模式')
  .action(async (inputDir, outputDir, opts) => {
    try {
      const absInput = path.resolve(inputDir);
      const absOutput = path.resolve(outputDir);

      // 解析样式
      const stylePaths = await resolveStylePaths(opts);
      const styleNames = stylePaths.map((p) => path.basename(p, '.css'));

      console.log(chalk.blue('📂 输入目录:'), absInput);
      console.log(chalk.blue('📂 输出目录:'), absOutput);
      console.log(chalk.blue('🎨 样式:'), styleNames.join(', '));
      if (opts.exclude.length > 0) {
        console.log(chalk.blue('🚫 排除:'), opts.exclude.join(', '));
      }
      console.log(chalk.gray('─'.repeat(50)));

      // 检查输入目录
      try {
        await fs.access(absInput);
      } catch {
        console.error(chalk.red('✗ 输入目录不存在:'), absInput);
        process.exit(1);
      }

      // 确保输出目录存在
      await fs.mkdir(absOutput, { recursive: true });

      // 扫描文件
      let files = await glob('**/*.md', { cwd: absInput, ignore: opts.exclude });

      if (files.length === 0) {
        console.log(chalk.yellow('未找到 .md 文件'));
        process.exit(0);
      }

      // 过滤排除
      if (opts.exclude.length > 0) {
        const excludePatterns = opts.exclude.map((p) => new RegExp(p));
        files = files.filter((f) => !excludePatterns.some((r) => r.test(f)));
      }

      const absFiles = files.map((f) => path.join(absInput, f));

      console.log(chalk.gray('─'.repeat(50)));

      const startTime = Date.now();
      const result = await convertWithStyles(absFiles, absInput, absOutput, stylePaths, {
        concurrency: parseInt(opts.concurrency),
        outputPattern: opts.outputPattern,
      });

      // 输出结果
      for (const r of result.results) {
        if (r.status === 'ok') {
          const label = path.relative(absOutput, r.outputPath);
          console.log(chalk.green('  ✓'), label);
        } else {
          const label = r.inputPath;
          console.log(chalk.red('  ✗'), `[${r.style}]`, chalk.gray(r.error));
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        chalk.bold(`完成: ${result.success}/${result.total} 成功`),
        result.failed > 0 ? chalk.red(`${result.failed} 失败`) : '',
        chalk.gray(`(${elapsed}s)`)
      );

      // 转换完成后自动退出
      process.exit(result.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error(chalk.red('✗ 批量转换失败:'), err.message);
      process.exit(1);
    }
  });

// watch: 监听模式
program
  .command('watch <inputDir> <outputDir>')
  .description('监听目录变动并自动转换')
  .option('-s, --css <name|path>', '指定 CSS 样式', [])
  .option('--all-styles', '使用所有内置样式')
  .option('--preset <name>', '使用样式预设')
  .action(async (inputDir, outputDir, opts) => {
    const absInput = path.resolve(inputDir);
    const absOutput = path.resolve(outputDir);

    const stylePaths = await resolveStylePaths(opts);
    const styleNames = stylePaths.map((p) => path.basename(p, '.css'));

    console.log(chalk.blue('👀 监听目录:'), absInput);
    console.log(chalk.blue('📂 输出目录:'), absOutput);
    console.log(chalk.blue('🎨 样式:'), styleNames.join(', '));
    console.log(chalk.gray('等待文件变动... (Ctrl+C 退出)\n'));

    let browser;
    let browserPool;

    const enqueueFile = async (rel) => {
      if (!rel.endsWith('.md')) return;

      const absInputPath = path.join(absInput, rel);
      const time = new Date().toLocaleTimeString();

      try {
        console.log(chalk.gray(`[${time}]`), chalk.yellow('转换中...'), rel);

        if (!browserPool) {
          browserPool = createBrowserPool({ maxBrowsers: 3 });
        }
        if (!browser) {
          browser = await browserPool.acquire();
        }

        for (const stylePath of stylePaths) {
          const outputPath = generateOutputPath(absInputPath, absInput, absOutput, stylePath, stylePaths.length > 1, null);
          try {
            await convert(absInputPath, outputPath, { cssPath: stylePath, browser });
            const relOut = path.relative(absOutput, outputPath);
            console.log(chalk.gray(`[${time}]`), chalk.green('  ✓'), relOut);
          } catch (err) {
            const styleName = path.basename(stylePath, '.css');
            console.log(chalk.gray(`[${time}]`), chalk.red(`  ✗ [${styleName}]`), err.message);
          }
        }
      } catch (err) {
        console.log(chalk.gray(`[${time}]`), chalk.red('  ✗ 失败:'), err.message);
      }
    };

    const watcher = watch(absInput, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on('add', (rel) => enqueueFile(rel))
      .on('change', (rel) => enqueueFile(rel))
      .on('error', (err) => console.error(chalk.red('✗'), err.message));

    // 优雅退出
    process.on('SIGINT', async () => {
      console.log(chalk.gray('\n正在关闭...'));
      await watcher.close();
      if (browserPool) {
        await browserPool.close();
      } else if (browser) {
        await browser.close();
      }
      process.exit(0);
    });
  });

// file: 单文件/通配符转换
const fileCmd = program
  .command('file <input> [output]')
  .description('单文件或通配符转换')
  .option('-s, --css <name|path>', '指定 CSS 样式', [])
  .option('--all-styles', '使用所有内置样式')
  .option('--preset <name>', '使用样式预设')
  .option('-o, --output-pattern <pattern>', '输出文件命名模式');

fileCmd.action(async (input, output, opts) => {
  try {
    // 通配符检测
    const isGlob = input.includes('*') || input.includes('?');

    if (isGlob && !output) {
      console.error(chalk.red('✗ 通配符模式下必须指定输出目录'));
      process.exit(1);
    }

    const absInput = path.resolve(input);
    const absOutput = output ? path.resolve(output) : absInput.replace(/\.md$/i, '.pdf');

    const stylePaths = await resolveStylePaths(opts);
    const styleNames = stylePaths.map((p) => path.basename(p, '.css'));

    console.log(chalk.blue('📄 匹配文件:'), isGlob ? input : absInput);
    console.log(chalk.blue('📂 输出目录:'), absOutput);
    console.log(chalk.blue('🎨 样式:'), styleNames.join(', '));
    console.log(chalk.gray('─'.repeat(50)));

    let files;
    if (isGlob) {
      const dir = path.dirname(absInput);
      const pattern = path.basename(absInput);
      files = await glob(pattern, { cwd: dir }).then((arr) => arr.map((f) => path.join(dir, f)));
    } else {
      files = [absInput];
    }

    if (files.length === 0) {
      console.error(chalk.red('✗ 没有匹配的文件:'), input);
      process.exit(1);
    }

    const inputRoot = isGlob ? path.dirname(absInput) : path.dirname(absInput);
    const outputRoot = isGlob ? absOutput : path.dirname(absOutput);

    console.log(chalk.gray('─'.repeat(50)));

    const startTime = Date.now();
    const result = await convertWithStyles(files, inputRoot, outputRoot, stylePaths, {
      outputPattern: opts.outputPattern,
    });

    // 输出结果
    for (const r of result.results) {
      if (r.status === 'ok') {
        const label = path.relative(absOutput, r.outputPath);
        console.log(chalk.green('  ✓'), label, `→ ${path.dirname(label) === '.' ? '' : path.dirname(label)}`);
      } else {
        console.log(chalk.red('  ✗'), `[${r.style}]`, chalk.gray(r.error));
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.bold(`完成: ${result.success}/${result.total}`), chalk.gray(`(${elapsed}s)`));

    // 转换完成后自动退出
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error(chalk.red('✗'), err.message);
    process.exit(1);
  }
});

program.parse();
