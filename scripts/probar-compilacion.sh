#!/bin/bash
# Prueba de frescura obligatoria (envoltorio POSIX). La logica vive en probar-compilacion.mjs.
# Uso: bash scripts/probar-compilacion.sh [--sin-compilar]
# El agente solo puede declarar "compilo" pegando LITERALMENTE el bloque
# "===== INICIO PRUEBA DE FRESCURA ... FIN PRUEBA DE FRESCURA =====" que imprime este script.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "${SCRIPT_DIR}/probar-compilacion.mjs" "$@"
exit $?
