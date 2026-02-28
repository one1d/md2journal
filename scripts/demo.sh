#!/usr/bin/env bash
#
# demo.sh - 运行示例转换（使用 demo 目录的示例文件）
#
# 用法:
#   ./scripts/demo.sh [样式] [输出目录]
#
# 示例:
#   ./scripts/demo.sh                    # 默认 journal 样式 -> ./output
#   ./scripts/demo.sh cornell-notes      # Cornell 样式
#   ./scripts/demo.sh all                # 所有样式
#   ./scripts/demo.sh journal ./pdfs     # 指定输出目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

STYLE="${1:-journal}"
OUTPUT_DIR="${2:-./output}"

cd "$PROJECT_DIR"

echo "=== md2journal 示例转换 ==="
echo "输入: ./demo"
echo "输出: $OUTPUT_DIR"
echo "样式: $STYLE"
echo ""

if [ "$STYLE" = "all" ]; then
  node cli.js build ./demo "$OUTPUT_DIR" --all-styles
else
  node cli.js build ./demo "$OUTPUT_DIR" --css "$STYLE"
fi
