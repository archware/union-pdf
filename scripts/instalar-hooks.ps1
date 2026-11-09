# Instala los hooks versionados de .githooks/ (git config core.hooksPath .githooks).
$ErrorActionPreference = "Stop"
$Raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $Raiz
try {
    git config core.hooksPath .githooks
    if ($LASTEXITCODE -ne 0) { throw "No se pudo configurar core.hooksPath" }
    Write-Host "core.hooksPath = $(git config core.hooksPath)  (hook pre-commit: candado de tauri.conf.json)"
} finally {
    Pop-Location
}
