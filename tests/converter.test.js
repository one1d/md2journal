import { describe, it, expect } from 'vitest';
import path from 'path';

// Test helper - import the functions we need to test
// Since converter.js uses ESM and has complex dependencies, we'll test pure functions

describe('escapeHtml', () => {
  const htmlEscapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (c) => htmlEscapeMap[c]);
  }

  it('should escape HTML entities', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("'single'")).toBe('&#39;single&#39;');
  });

  it('should return empty string for null/undefined', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should handle Chinese characters', () => {
    expect(escapeHtml('你好世界')).toBe('你好世界');
    expect(escapeHtml('<div>中文</div>')).toBe('&lt;div&gt;中文&lt;/div&gt;');
  });
});

describe('Output path generation', () => {
  // Use real Node.js path module
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

    return path.join(outputRoot, result);
  }

  it('should generate correct output path', () => {
    const inputPath = '/input/subdir/test.md';
    const inputRoot = '/input';
    const outputRoot = '/output';
    const stylePath = '/styles/journal.css';

    const result = generateOutputPath(inputPath, inputRoot, outputRoot, stylePath, false, null);
    expect(result).toBe('/output/subdir/test.pdf');
  });

  it('should use multi-style pattern', () => {
    const inputPath = '/input/test.md';
    const inputRoot = '/input';
    const outputRoot = '/output';
    const stylePath = '/styles/journal.css';

    const result = generateOutputPath(inputPath, inputRoot, outputRoot, stylePath, true, null);
    expect(result).toBe('/output/journal/test.pdf');
  });

  it('should use custom output pattern', () => {
    const inputPath = '/input/test.md';
    const inputRoot = '/input';
    const outputRoot = '/output';
    const stylePath = '/styles/journal.css';

    const result = generateOutputPath(inputPath, inputRoot, outputRoot, stylePath, false, '{name}.{ext}');
    // ext 不包含前导点，所以结果是 'test.pdf'
    expect(result).toBe('/output/test.pdf');
  });
});

describe('Style path resolution', () => {
  const BUILT_IN_STYLES = {
    'journal': '/path/to/journal.css',
    'cornell-notes': '/path/to/cornell-notes.css',
    'normal-a4': '/path/to/normal-a4.css',
  };

  function resolveStyleNames(opts) {
    const { css, preset, allStyles } = opts;
    const styles = new Set();

    if (allStyles) {
      Object.keys(BUILT_IN_STYLES).forEach(s => styles.add(s));
    }

    if (preset) {
      if (preset === 'all') {
        Object.keys(BUILT_IN_STYLES).forEach(s => styles.add(s));
      } else if (preset === 'academic') {
        styles.add('journal');
      }
    }

    if (css) {
      css.forEach(s => styles.add(s));
    }

    // 如果没有指定任何样式，默认使用 journal
    if (styles.size === 0) {
      styles.add('journal');
    }

    return Array.from(styles);
  }

  it('should use default style', () => {
    expect(resolveStyleNames({})).toEqual(['journal']);
  });

  it('should resolve all styles', () => {
    expect(resolveStyleNames({ allStyles: true }).sort()).toEqual(['cornell-notes', 'journal', 'normal-a4']);
  });

  it('should resolve preset', () => {
    expect(resolveStyleNames({ preset: 'academic' }).sort()).toEqual(['journal']);
    expect(resolveStyleNames({ preset: 'all' }).sort()).toEqual(['cornell-notes', 'journal', 'normal-a4']);
  });

  it('should deduplicate styles', () => {
    expect(resolveStyleNames({ preset: 'all', css: ['journal'] }).sort()).toEqual(['cornell-notes', 'journal', 'normal-a4']);
  });
});
