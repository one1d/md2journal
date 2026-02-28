#!/usr/bin/env bash
#
# build-all.sh - 使用所有内置样式批量转换 Markdown 为 PDF
#
# 用法:
#   ./scripts/build-all.sh [输入目录] [输出目录] [并发数]
#
# 示例:
#   ./scripts/build-all.sh                    # 默认 ./input -> ./output
#   ./scripts/build-all.sh ./mds ./pdfs       # 指定目录
#   ./scripts/build-all.sh ./mds ./pdfs 5     # 5 并发

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

INPUT_DIR="${1:-./input}"
OUTPUT_DIR="${2:-./output}"
CONCURRENCY="${3:-3}"

cd "$PROJECT_DIR"

echo "=== md2journal 全样式批量转换 ==="
echo "输入: $INPUT_DIR"
echo "输出: $OUTPUT_DIR"
echo "并发: $CONCURRENCY"
echo ""

node cli.js build "$INPUT_DIR" "$OUTPUT_DIR" \
  --all-styles \
  --concurrency "$CONCURRENCY"
