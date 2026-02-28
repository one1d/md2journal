#!/usr/bin/env bash
#
# convert-single.sh - 单文件快速转换（支持选择样式）
#
# 用法:
#   ./scripts/convert-single.sh <输入文件> [输出文件] [样式]
#
# 样式选项: journal (默认) | cornell-notes | normal-a4 | all
#
# 示例:
#   ./scripts/convert-single.sh paper.md                              # 默认 journal 样式
#   ./scripts/convert-single.sh paper.md ./out.pdf                    # 指定输出
#   ./scripts/convert-single.sh paper.md ./out.pdf cornell-notes      # 指定样式
#   ./scripts/convert-single.sh paper.md "" all                       # 所有样式，自动命名

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "用法: $0 <输入文件> [输出文件] [样式]"
  echo ""
  echo "样式选项: journal (默认) | cornell-notes | normal-a4 | all"
  echo ""
  echo "示例:"
  echo "  $0 paper.md                              # 默认 journal"
  echo "  $0 paper.md ./out.pdf                    # 指定输出路径"
  echo "  $0 paper.md ./out.pdf cornell-notes      # Cornell 样式"
  echo "  $0 paper.md \"\" all                       # 所有样式"
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-}"
STYLE="${3:-journal}"

cd "$PROJECT_DIR"

if [ ! -f "$INPUT" ]; then
  echo "错误: 文件不存在: $INPUT"
  exit 1
fi

STYLE_ARGS=""
if [ "$STYLE" = "all" ]; then
  STYLE_ARGS="--all-styles"
else
  STYLE_ARGS="--css $STYLE"
fi

echo "=== 单文件转换 ==="
echo "输入: $INPUT"
echo "样式: $STYLE"

if [ -n "$OUTPUT" ]; then
  node cli.js file "$INPUT" "$OUTPUT" $STYLE_ARGS
else
  node cli.js file "$INPUT" $STYLE_ARGS
fi
