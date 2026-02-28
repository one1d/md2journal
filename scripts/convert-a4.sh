#!/usr/bin/env bash
#
# convert-a4.sh - 使用 Normal A4 样式转换
#
# 用法:
#   ./scripts/convert-a4.sh <输入> [输出]
#
# 示例:
#   ./scripts/convert-a4.sh report.md                       # 单文件转换
#   ./scripts/convert-a4.sh report.md ./output/report.pdf   # 指定输出
#   ./scripts/convert-a4.sh ./mds ./pdfs                    # 批量转换目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "用法: $0 <输入文件或目录> [输出文件或目录]"
  echo ""
  echo "示例:"
  echo "  $0 report.md                       # 单文件转换"
  echo "  $0 report.md ./output/report.pdf   # 指定输出路径"
  echo "  $0 ./mds ./pdfs                    # 批量转换目录"
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-}"

cd "$PROJECT_DIR"

if [ -d "$INPUT" ]; then
  OUTPUT_DIR="${OUTPUT:-./output}"
  echo "=== Normal A4 批量转换 ==="
  node cli.js build "$INPUT" "$OUTPUT_DIR" --css normal-a4
elif [ -f "$INPUT" ]; then
  echo "=== Normal A4 单文件转换 ==="
  if [ -n "$OUTPUT" ]; then
    node cli.js file "$INPUT" "$OUTPUT" --css normal-a4
  else
    node cli.js file "$INPUT" --css normal-a4
  fi
else
  echo "错误: 输入路径不存在: $INPUT"
  exit 1
fi
