#!/bin/sh
# Instala los hooks versionados de .githooks/ (git config core.hooksPath .githooks).
set -eu
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}/.."
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit 2>/dev/null || true
echo "core.hooksPath = $(git config core.hooksPath)  (hook pre-commit: candado de tauri.conf.json)"
