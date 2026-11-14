#!/bin/sh
set -eu
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
if [ -e "${PENNY_DATA_DIR:-.pennyagent}/pentest-active.json" ]; then
  printf '%s\n' '请先结束活动任务并确认资源清理，再回退代码。' >&2
  exit 1
fi
PATCH=docs/verification/issue-45/code.patch
git apply --reverse --check "$PATCH"
case "${1:---check}" in
  --check) printf '%s\n' '代码回退检查通过。' ;;
  --apply) git apply --reverse "$PATCH"; printf '%s\n' '代码已回退，持久化任务数据保持原状。' ;;
  *) printf '%s\n' '用法：rollback.sh [--check|--apply]' >&2; exit 2 ;;
esac
