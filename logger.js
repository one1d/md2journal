/**
 * md2journal - 统一日志模块
 * 提供彩色日志和纯文本日志两种模式
 */

import chalk from 'chalk';
import process from 'process';

// 日志级别枚举
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
};

// 当前日志级别
let currentLevel = LogLevel.INFO;
let useColors = true;

/**
 * 配置日志系统
 * @param {Object} options 配置选项
 * @param {string} options.level 日志级别 (debug|info|warn|error|silent)
 * @param {boolean} options.colors 是否使用彩色输出
 */
export function configureLogger(options = {}) {
  if (options.level) {
    currentLevel = LogLevel[options.level.toUpperCase()] ?? LogLevel.INFO;
  }
  if (typeof options.colors === 'boolean') {
    useColors = options.colors;
  }
}

/**
 * 调试级别日志
 */
export function debug(...args) {
  if (currentLevel <= LogLevel.DEBUG) {
    if (useColors) {
      console.log(chalk.gray('[DEBUG]'), ...args);
    } else {
      console.log('[DEBUG]', ...args);
    }
  }
}

/**
 * 信息级别日志
 */
export function info(...args) {
  if (currentLevel <= LogLevel.INFO) {
    if (useColors) {
      console.log(chalk.blue('[INFO]'), ...args);
    } else {
      console.log('[INFO]', ...args);
    }
  }
}

/**
 * 警告级别日志
 */
export function warn(...args) {
  if (currentLevel <= LogLevel.WARN) {
    if (useColors) {
      console.warn(chalk.yellow('[WARN]'), ...args);
    } else {
      console.warn('[WARN]', ...args);
    }
  }
}

/**
 * 错误级别日志
 */
export function error(...args) {
  if (currentLevel <= LogLevel.ERROR) {
    if (useColors) {
      console.error(chalk.red('[ERROR]'), ...args);
    } else {
      console.error('[ERROR]', ...args);
    }
  }
}

/**
 * 成功信息日志 (绿色)
 */
export function success(...args) {
  if (currentLevel <= LogLevel.INFO) {
    if (useColors) {
      console.log(chalk.green('[OK]'), ...args);
    } else {
      console.log('[OK]', ...args);
    }
  }
}

/**
 * 带时间的日志
 */
export function time(label, message) {
  if (currentLevel <= LogLevel.INFO) {
    const timeStr = new Date().toLocaleTimeString('zh-CN', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    if (useColors) {
      console.log(chalk.gray(`[${timeStr}]`), label, message);
    } else {
      console.log(`[${timeStr}]`, label, message);
    }
  }
}

/**
 * 分隔线
 */
export function separator() {
  if (currentLevel <= LogLevel.INFO) {
    console.log(chalk.gray('─'.repeat(50)));
  }
}

/**
 * 进度条日志
 */
export function progress(current, total, message = '') {
  if (currentLevel <= LogLevel.INFO) {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    if (useColors) {
      console.log(chalk.blue(`[${bar}] ${percent}%`), message);
    } else {
      console.log(`[${bar}] ${percent}%`, message);
    }
  }
}

// ─── 便捷函数 ────────────────────────────────────────

/**
 * 带图标的信息日志
 */
export const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  step: (msg) => console.log(chalk.cyan('▸'), msg),
  debug: debug,
  time: time,
  separator: separator,
};

/**
 * CLI 专用日志 (带颜色)
 */
export const cliLog = {
  info: (label, value) => console.log(chalk.blue(`${label}:`), value),
  success: (label, value) => console.log(chalk.green('✓'), label, value),
  error: (label, value) => console.log(chalk.red('✗'), label, chalk.gray(value || '')),
  pending: (label) => console.log(chalk.yellow('…'), label),
  done: (msg) => console.log(chalk.green('✓'), msg),
  section: (title) => {
    console.log(chalk.bold.cyan(`\n━━ ${title} ━━`));
  },
};

/**
 * GUI 专用日志 (无颜色)
 */
export const guiLog = {
  info: (msg) => console.log('[INFO]', msg),
  success: (msg) => console.log('[OK]', msg),
  warn: (msg) => console.log('[WARN]', msg),
  error: (msg) => console.error('[ERROR]', msg),
  request: (method, path) => console.log(chalk.gray(`[${new Date().toISOString()}]`), method, path),
};
