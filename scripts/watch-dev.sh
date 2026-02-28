#!/usr/bin/env bash
#
# watch-dev.sh - 监听模式，文件变动时自动转换
#
# 用法:
#   ./scripts/watch-dev.sh [输入目录] [输出目录] [样式]
#
# 示例:
#   ./scripts/watch-dev.sh                              # 默认 ./input -> ./output, journal 样式
#   ./scripts/watch-dev.sh ./mds ./pdfs                 # 指定目录
#   ./scripts/watch-dev.sh ./mds ./pdfs cornell-notes   # 使用 cornell-notes 样式
#   ./scripts/watch-dev.sh ./demo ./output all          # 使用所有样式

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

INPUT_DIR="${1:-./input}"
OUTPUT_DIR="${2:-./output}"
STYLE="${3:-journal}"

cd "$PROJECT_DIR"

echo "=== md2journal 监听模式 ==="
echo "输入: $INPUT_DIR"
echo "输出: $OUTPUT_DIR"
echo "样式: $STYLE"
echo ""

if [ "$STYLE" = "all" ]; then
  node cli.js watch "$INPUT_DIR" "$OUTPUT_DIR" --all-styles
else
  node cli.js watch "$INPUT_DIR" "$OUTPUT_DIR" --css "$STYLE"
fi
