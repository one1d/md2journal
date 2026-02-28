#!/usr/bin/env bash
#
# convert-journal.sh - 使用 Journal（学术期刊）样式转换
#
# 用法:
#   ./scripts/convert-journal.sh <输入> [输出]
#
# 示例:
#   ./scripts/convert-journal.sh paper.md                      # 单文件转换
#   ./scripts/convert-journal.sh paper.md ./output/paper.pdf   # 指定输出
#   ./scripts/convert-journal.sh ./mds ./pdfs                  # 批量转换目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "用法: $0 <输入文件或目录> [输出文件或目录]"
  echo ""
  echo "示例:"
  echo "  $0 paper.md                       # 单文件转换"
  echo "  $0 paper.md ./output/paper.pdf    # 指定输出路径"
  echo "  $0 ./mds ./pdfs                   # 批量转换目录"
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-}"

cd "$PROJECT_DIR"

if [ -d "$INPUT" ]; then
  OUTPUT_DIR="${OUTPUT:-./output}"
  echo "=== Journal 学术期刊批量转换 ==="
  node cli.js build "$INPUT" "$OUTPUT_DIR" --css journal
elif [ -f "$INPUT" ]; then
  echo "=== Journal 学术期刊单文件转换 ==="
  if [ -n "$OUTPUT" ]; then
    node cli.js file "$INPUT" "$OUTPUT" --css journal
  else
    node cli.js file "$INPUT" --css journal
  fi
else
  echo "错误: 输入路径不存在: $INPUT"
  exit 1
fi
