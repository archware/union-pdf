#!/bin/bash
# Script Oficial Canónico de Verificación de Calidad y Compilación (POSIX Bash)
# pdf-tool - Cumplimiento estricto de Axiomas 1 a 9

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "========================================================"
echo " [pdf-tool] INICIANDO COMPUERTA CANONICA DE VERIFICACION"
echo "========================================================"

# Paso 0: Candado de integridad de tauri.conf.json (hash canonico + claves esenciales)
echo -e "\n[0/7] Verificando integridad de src-tauri/tauri.conf.json..."
if ! node "${ROOT_DIR}/scripts/verificar-tauri-conf.mjs"; then
    echo "ERROR FATAL: fallo la integridad de src-tauri/tauri.conf.json (NO lo edite; restaure con git checkout HEAD -- src-tauri/tauri.conf.json y reporte el fallo)" >&2
    exit 1
fi

# Paso 1: Limpieza previa obligatoria (Clean Build)
echo -e "\n[1/7] Limpieza de artefactos previos..."
rm -rf "${ROOT_DIR}/frontend/dist"
echo "      Carpeta frontend/dist eliminada exitosamente."

# Paso 2: Verificación de pin de Atomic UI
echo -e "\n[2/7] Verificando pin gobernado de Atomic UI..."
cd "${ROOT_DIR}/frontend"
npm run check:atomic:pin

# Paso 3: Verificación de tipos, angular y CSS
echo -e "\n[3/7] Verificando tipos, angular y tokens CSS..."
npm run check:types
npm run check:angular
npm run check:theme
npm run check:css

# Paso 4: Pruebas unitarias de Frontend
echo -e "\n[4/7] Ejecutando pruebas unitarias de frontend (Vitest)..."
npm test -- --watch=false

# Paso 5: Compilación del Frontend
echo -e "\n[5/7] Compilando frontend Angular..."
npm run build

# Paso 6: Pruebas unitarias de Backend Rust
echo -e "\n[6/7] Ejecutando pruebas unitarias de Rust (cargo test)..."
cd "${ROOT_DIR}/src-tauri"
cargo test

# Paso 7: Compilación del binario release
echo -e "\n[7/7] Compilando binario de lanzamiento (cargo build --release)..."
cargo build --release

# Verificación física del binario según Axioma 1
if [ -f "${ROOT_DIR}/src-tauri/target/release/union-pdf.exe" ]; then
    EXE_PATH="${ROOT_DIR}/src-tauri/target/release/union-pdf.exe"
else
    EXE_PATH="${ROOT_DIR}/src-tauri/target/release/union-pdf"
fi
if [ ! -f "${EXE_PATH}" ]; then
    echo "ERROR FATAL: El binario físico ${EXE_PATH} no existe en disco." >&2
    exit 1
fi

SIZE=$(stat -c%s "${EXE_PATH}" 2>/dev/null || stat -f%z "${EXE_PATH}" 2>/dev/null)
if [ "${SIZE}" -le 0 ]; then
    echo "ERROR FATAL: El binario ${EXE_PATH} tiene tamaño 0 bytes." >&2
    exit 1
fi

echo "========================================================"
echo " [pdf-tool] VERIFICACION Y COMPILACION EXITOSA AL 100%"
echo " Binario verificado: ${EXE_PATH} (${SIZE} bytes)"
echo "========================================================"
exit 0
