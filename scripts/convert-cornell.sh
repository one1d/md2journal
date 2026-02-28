#!/usr/bin/env bash
#
# convert-cornell.sh - 使用 Cornell Notes 样式转换
#
# 用法:
#   ./scripts/convert-cornell.sh <输入> [输出]
#
# 示例:
#   ./scripts/convert-cornell.sh notes.md                      # 单文件，输出到同目录
#   ./scripts/convert-cornell.sh notes.md ./output/notes.pdf   # 单文件，指定输出
#   ./scripts/convert-cornell.sh ./mds ./pdfs                  # 批量转换目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "用法: $0 <输入文件或目录> [输出文件或目录]"
  echo ""
  echo "示例:"
  echo "  $0 notes.md                       # 单文件转换"
  echo "  $0 notes.md ./output/notes.pdf    # 指定输出路径"
  echo "  $0 ./mds ./pdfs                   # 批量转换目录"
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-}"

cd "$PROJECT_DIR"

# 判断输入是文件还是目录
if [ -d "$INPUT" ]; then
  # 目录模式 -> build
  OUTPUT_DIR="${OUTPUT:-./output}"
  echo "=== Cornell Notes 批量转换 ==="
  node cli.js build "$INPUT" "$OUTPUT_DIR" --css cornell-notes
elif [ -f "$INPUT" ]; then
  # 单文件模式 -> file
  echo "=== Cornell Notes 单文件转换 ==="
  if [ -n "$OUTPUT" ]; then
    node cli.js file "$INPUT" "$OUTPUT" --css cornell-notes
  else
    node cli.js file "$INPUT" --css cornell-notes
  fi
else
  echo "错误: 输入路径不存在: $INPUT"
  exit 1
fi
