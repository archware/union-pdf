# Prueba de frescura obligatoria (envoltorio PowerShell). La logica vive en probar-compilacion.mjs.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/probar-compilacion.ps1 [--sin-compilar]
# El agente solo puede declarar "compilo" pegando LITERALMENTE el bloque
# "===== INICIO PRUEBA DE FRESCURA ... FIN PRUEBA DE FRESCURA =====" que imprime este script.
$ErrorActionPreference = "Stop"
$Mjs = Join-Path $PSScriptRoot "probar-compilacion.mjs"
& node $Mjs @args
exit $LASTEXITCODE
