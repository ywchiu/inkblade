#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '請先安裝 Node.js，再重新開啟。'
  read -r '?按 Enter 關閉。'
  exit 1
fi
printf '墨刃已準備啟動。請開啟 http://127.0.0.1:4173\n關閉此視窗或按 Control-C 可停止伺服器。\n'
node server.mjs
