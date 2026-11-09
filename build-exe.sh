#!/bin/bash
# Script oficial canónico de compilación (delegador raíz POSIX)
# pdf-tool - Cumplimiento estricto de Axiomas 1 al 9
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== [pdf-tool] Iniciando compilación canónica (build-exe.sh) ==="
exec bash "${SCRIPT_DIR}/scripts/verificar-todo.sh"