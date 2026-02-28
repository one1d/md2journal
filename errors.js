/**
 * md2journal - 统一错误处理模块
 * 定义项目专用错误类型和错误处理工具
 */

// ─── 错误类型枚举 ───────────────────────────────────

export const ErrorCode = {
  // 文件相关错误 (1xxx)
  FILE_NOT_FOUND: 'E1001',
  FILE_READ_ERROR: 'E1002',
  FILE_WRITE_ERROR: 'E1003',
  FILE_INVALID: 'E1004',
  
  // 目录相关错误 (2xxx)
  DIR_NOT_FOUND: 'E2001',
  DIR_INVALID: 'E2002',
  DIR_CREATE_ERROR: 'E2003',
  
  // CSS 样式相关错误 (3xxx)
  CSS_NOT_FOUND: 'E3001',
  CSS_INVALID: 'E3002',
  PRESET_INVALID: 'E3003',
  
  // Markdown 解析错误 (4xxx)
  MARKDOWN_PARSE_ERROR: 'E4001',
  FRONT_MATTER_ERROR: 'E4002',
  
  // 渲染相关错误 (5xxx)
  RENDER_ERROR: 'E5001',
  PDF_GENERATE_ERROR: 'E5002',
  
  // 浏览器相关错误 (6xxx)
  BROWSER_INIT_ERROR: 'E6001',
  BROWSER_TIMEOUT: 'E6002',
  
  // 参数错误 (8xxx)
  INVALID_ARGUMENT: 'E8001',
  MISSING_ARGUMENT: 'E8002',
  
  // 未知错误 (9xxx)
  UNKNOWN_ERROR: 'E9001',
};

// ─── 自定义错误类 ─────────────────────────────────

/**
 * 基础错误类
 */
export class Md2JournalError extends Error {
  constructor(message, code = ErrorCode.UNKNOWN_ERROR, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * 文件相关错误
 */
export class FileError extends Md2JournalError {
  constructor(message, code = ErrorCode.FILE_READ_ERROR, filePath = null) {
    super(message, code, { filePath });
  }
}

/**
 * 目录相关错误
 */
export class DirectoryError extends Md2JournalError {
  constructor(message, code = ErrorCode.DIR_INVALID, dirPath = null) {
    super(message, code, { dirPath });
  }
}

/**
 * CSS 样式错误
 */
export class CssError extends Md2JournalError {
  constructor(message, code = ErrorCode.CSS_INVALID, cssName = null) {
    super(message, code, { cssName });
  }
}

/**
 * Markdown 解析错误
 */
export class MarkdownError extends Md2JournalError {
  constructor(message, code = ErrorCode.MARKDOWN_PARSE_ERROR, line = null) {
    super(message, code, { line });
  }
}

/**
 * 浏览器错误
 */
export class BrowserError extends Md2JournalError {
  constructor(message, code = ErrorCode.BROWSER_INIT_ERROR, details = null) {
    super(message, code, details);
  }
}

/**
 * 参数错误
 */
export class ArgumentError extends Md2JournalError {
  constructor(message, argumentName = null) {
    super(message, ErrorCode.INVALID_ARGUMENT, { argumentName });
  }
}

// ─── 错误工厂函数 ─────────────────────────────────

/**
 * 创建文件未找到错误
 */
export function fileNotFound(filePath) {
  return new FileError(`文件不存在: ${filePath}`, ErrorCode.FILE_NOT_FOUND, filePath);
}

/**
 * 创建目录未找到错误
 */
export function dirNotFound(dirPath) {
  return new DirectoryError(`目录不存在: ${dirPath}`, ErrorCode.DIR_NOT_FOUND, dirPath);
}

/**
 * 创建无效目录错误
 */
export function invalidDirectory(dirPath, reason) {
  return new DirectoryError(`无效目录: ${dirPath} - ${reason}`, ErrorCode.DIR_INVALID, { dirPath, reason });
}

/**
 * 创建 CSS 未找到错误
 */
export function cssNotFound(cssName) {
  return new CssError(`CSS 样式不存在: ${cssName}`, ErrorCode.CSS_NOT_FOUND, cssName);
}

/**
 * 创建无效预设错误
 */
export function invalidPreset(preset, validPresets) {
  return new CssError(
    `未知预设: ${preset}，可用预设: ${validPresets.join(', ')}`,
    ErrorCode.PRESET_INVALID,
    { preset, validPresets }
  );
}

/**
 * 创建浏览器初始化错误
 */
export function browserInitError(reason) {
  return new BrowserError(`浏览器初始化失败: ${reason}`, ErrorCode.BROWSER_INIT_ERROR, { reason });
}

/**
 * 创建浏览器超时错误
 */
export function browserTimeout(operation, timeout) {
  return new BrowserError(
    `浏览器操作超时: ${operation} (${timeout}ms)`,
    ErrorCode.BROWSER_TIMEOUT,
    { operation, timeout }
  );
}

/**
 * 创建参数错误
 */
export function invalidArgument(message, argumentName) {
  return new ArgumentError(message, argumentName);
}

// ─── 错误处理工具 ─────────────────────────────────

import { log } from './logger.js';

/**
 * 安全执行异步函数并捕获错误
 * @param {Function} fn 要执行的异步函数
 * @param {Object} options 选项
 * @param {string} options.context 错误上下文描述
 * @param {Function} options.onError 自定义错误处理
 * @returns {Promise<[Error|null, T|null]} [error, result] 元组
 */
export async function safeAsync(fn, options = {}) {
  const { context = '', onError = null } = options;
  try {
    const result = await fn();
    return [null, result];
  } catch (err) {
    const error = normalizeError(err, context);
    if (onError) {
      onError(error);
    } else {
      log.error(context ? `${context}: ${error.message}` : error.message);
    }
    return [error, null];
  }
}

/**
 * 规范化错误为 Md2JournalError
 * @param {Error} err 原始错误
 * @param {string} context 上下文
 * @returns {Md2JournalError}
 */
export function normalizeError(err, context = '') {
  if (err instanceof Md2JournalError) {
    return err;
  }
  
  // 尝试根据错误消息推断类型
  let code = ErrorCode.UNKNOWN_ERROR;
  let message = err.message;
  
  if (message.includes('ENOENT') || message.includes('不存在')) {
    code = ErrorCode.FILE_NOT_FOUND;
  } else if (message.includes('CSS') || message.includes('样式')) {
    code = ErrorCode.CSS_NOT_FOUND;
  } else if (message.includes('timeout') || message.includes('超时')) {
    code = ErrorCode.BROWSER_TIMEOUT;
  }
  
  const error = new Md2JournalError(message, code, { original: err.message, context });
  error.stack = err.stack;
  return error;
}

/**
 * 验证必需参数
 * @param {Object} args 参数对象
 * @param {string[]} required 必需参数名数组
 * @throws {ArgumentError}
 */
export function requireParams(args, required) {
  for (const param of required) {
    if (args[param] === undefined || args[param] === null || args[param] === '') {
      throw new ArgumentError(`缺少必需参数: ${param}`, param);
    }
  }
}

/**
 * 验证路径是否为有效文件
 * @param {string} filePath 文件路径
 * @param {string} name 友好名称
 * @throws {FileError}
 */
export async function validateFile(filePath, name = '文件') {
  const fs = await import('fs/promises');
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new FileError(`${name}不是有效文件: ${filePath}`, ErrorCode.FILE_INVALID, filePath);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw fileNotFound(filePath);
    }
    throw err;
  }
}

/**
 * 验证路径是否为有效目录
 * @param {string} dirPath 目录路径
 * @param {string} name 友好名称
 * @throws {DirectoryError}
 */
export async function validateDirectory(dirPath, name = '目录') {
  const fs = await import('fs/promises');
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new DirectoryError(`${name}不是有效目录: ${dirPath}`, ErrorCode.DIR_INVALID, dirPath);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw dirNotFound(dirPath);
    }
    throw err;
  }
}

// ─── 全局错误处理器 ─────────────────────────────────

/**
 * 设置全局未捕获异常处理器
 */
export function setupGlobalErrorHandler() {
  process.on('uncaughtException', (err) => {
    const error = normalizeError(err, 'Uncaught Exception');
    log.error(`未捕获的异常: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    const error = normalizeError(reason, 'Unhandled Rejection');
    log.error(`未处理的Promise拒绝: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}
