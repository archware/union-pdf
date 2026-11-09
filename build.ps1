# Script Raíz Canónico de Compilación Directa
# pdf-tool - Generación del binario release y ejecución de compuertas
param()
$ErrorActionPreference = "Stop"
$ScriptCanonica = Join-Path $PSScriptRoot "scripts\verificar-todo.ps1"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [pdf-tool] Ejecutando compuerta canonica desde la raiz" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

& $ScriptCanonica
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo en la ejecucion de la compuerta canónica ($LASTEXITCODE)."
    exit $LASTEXITCODE
}

$ExePath = Join-Path $PSScriptRoot "src-tauri\target\release\union-pdf.exe"
if (Test-Path $ExePath) {
    $SizeMB = [math]::Round((Get-Item $ExePath).Length / 1MB, 2)
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " [OK] Binario generado exitosamente en:" -ForegroundColor Green
    Write-Host "      $ExePath ($SizeMB MB)" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Error "ERROR: No se encontro el archivo $ExePath tras la compilacion."
    exit 1
}
