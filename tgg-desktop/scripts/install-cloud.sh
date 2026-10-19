#!/usr/bin/env bash
set -euo pipefail

# This is the Codex Linux cloud setup script, not a Windows CMD command.
project_dir=/workspace/tggm
desktop_dir="$project_dir/tgg-desktop"

if [[ $(uname -s) != Linux ]]; then
  echo 'Run this script in the Linux cloud environment, not Windows CMD.' >&2
  exit 1
fi
for required_tool in node npm git dpkg dpkg-deb; do
  if ! command -v "$required_tool" >/dev/null 2>&1; then
    echo "Missing required cloud tool: $required_tool" >&2
    exit 1
  fi
done
if [[ $(node -p 'process.versions.node.split(".")[0]') != 24 ]]; then
  echo 'This environment requires Node.js 24.' >&2
  exit 1
fi
if [[ ! -f "$desktop_dir/package-lock.json" ]]; then
  echo "Expected the existing checkout and lockfile at $desktop_dir." >&2
  exit 1
fi

export npm_config_cache=/workspace/.cache/npm
export XDG_CACHE_HOME=/workspace/.cache
export ELECTRON_CACHE=/workspace/.cache/electron
export electron_config_cache=/workspace/.cache/electron
export ELECTRON_BUILDER_CACHE=/workspace/.cache/electron-builder
export NODE_USE_ENV_PROXY=1
mkdir -p "$npm_config_cache" "$ELECTRON_CACHE" "$ELECTRON_BUILDER_CACHE"

cd "$desktop_dir"
npm ci --no-audit --no-fund
node node_modules/electron/install.js
bash scripts/setup-cloud.sh
npm test

cd "$project_dir"
npm run check:tgg-source
npm run check:tgg-projects
npm run check:tgg-higgsfield
npm run check:tgg-app
node --test scripts/tgg-project-events.test.mjs

cd "$desktop_dir"
npm run dist:preview
app_version=$(node -p 'require("./package.json").version')
installer="$desktop_dir/dist-preview/TGG-AI-Ultra-Setup-$app_version-x64.exe"
if [[ ! -s "$installer" ]]; then
  echo 'Setup finished without producing the expected Windows installer.' >&2
  exit 1
fi
printf 'Cloud setup and checks passed. Unsigned engineering installer: %s\n' "$installer"
