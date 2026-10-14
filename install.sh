#!/usr/bin/env bash
# 把 resume-builder-pro 装成 AI Agent skill（Claude Code / Hermes 通用）
# 用法：./install.sh [目标目录]
#   默认装到 ~/.claude/skills/resume-builder-pro
#   指定目录：./install.sh ~/.hermes/skills/productivity
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-$HOME/.claude/skills}"
mkdir -p "$DEST"
cp -r "$ROOT" "$DEST/resume-builder-pro"
echo "已安装到 $DEST/resume-builder-pro"
echo "现在可以在 Agent 里说「帮我做简历」「帮我改简历」触发。"
echo "（网页工具本体：$DEST/resume-builder-pro/index.html，双击即用）"
