#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
gui_root=/workspace/.tools/desktop-gui
if [[ ! -x "$gui_root/usr/bin/Xvfb" ]]; then echo 'Run bash scripts/setup-cloud.sh first.' >&2; exit 1; fi
smoke_root=$(mktemp -d /tmp/tgg-gui-XXXXXX)
trap 'rm -rf "$smoke_root"' EXIT
mkdir -p "$smoke_root/runtime" "$smoke_root/data"
chmod 700 "$smoke_root/runtime"
export XDG_RUNTIME_DIR="$smoke_root/runtime"
export XDG_DATA_HOME="$smoke_root/data"
export XDG_CACHE_HOME=/workspace/.cache
export LD_LIBRARY_PATH="$gui_root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PATH="$gui_root/usr/bin:$PATH"
export TGG_KEYRING_DAEMON="$gui_root/usr/bin/gnome-keyring-daemon"
xvfb-run -a -s '-screen 0 1280x900x24 -nolisten tcp' dbus-run-session -- node scripts/keyring-smoke.cjs
