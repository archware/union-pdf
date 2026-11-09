#!/bin/bash
# Script oficial canónico de generación de ejecutable (delegador raíz POSIX)
# pdf-tool - Cumplimiento estricto de Axiomas 1 al 9
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== [pdf-tool] Iniciando generación de ejecutable (generate-exe.sh) ==="
exec bash "${SCRIPT_DIR}/scripts/verificar-todo.sh"