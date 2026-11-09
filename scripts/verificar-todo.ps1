# Script Oficial Canónico de Verificación de Calidad y Compilación
# pdf-tool - Cumplimiento de Axiomas 1 a 9

$ErrorActionPreference = "Stop"
$Raiz = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [pdf-tool] INICIANDO COMPUERTA CANONICA DE VERIFICACION" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Paso 0: Candado de integridad de tauri.conf.json (hash canonico + claves esenciales)
Write-Host "`n[0/7] Verificando integridad de src-tauri/tauri.conf.json..." -ForegroundColor Yellow
node (Join-Path $Raiz "scripts\verificar-tauri-conf.mjs")
if ($LASTEXITCODE -ne 0) { throw "Fallo la integridad de src-tauri/tauri.conf.json (NO lo edite; restaure con git checkout HEAD -- src-tauri/tauri.conf.json y reporte el fallo)" }

# Paso 0b: el .exe de release no debe estar en ejecucion (Windows no deja reemplazarlo: os error 5)
$ExeRelease = Join-Path $Raiz "src-tauri\target\release\union-pdf.exe"
$EnEjecucion = Get-Process -Name @("union-pdf", "pdf-tool") -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and ((Resolve-Path $_.Path).Path -eq (Resolve-Path $ExeRelease -ErrorAction SilentlyContinue).Path) }
if ($EnEjecucion) {
    $Pids = ($EnEjecucion | ForEach-Object { $_.Id }) -join ", "
    throw "union-pdf.exe esta en ejecucion (PID $Pids) y Windows no permite reemplazarlo. Pida al usuario que cierre la aplicacion y repita. NO edite tauri.conf.json ni otros archivos por este error."
}

# Paso 1: Limpieza previa obligatoria (Clean Build)
Write-Host "`n[1/7] Limpieza de artefactos previos..." -ForegroundColor Yellow
$DistDir = Join-Path $Raiz "frontend\dist"
if (Test-Path $DistDir) {
    Remove-Item -Recurse -Force $DistDir
    Write-Host "      Carpeta frontend/dist eliminada exitosamente." -ForegroundColor Green
}

# Paso 2: Verificación de pin de Atomic UI
Write-Host "`n[2/7] Verificando pin gobernado de Atomic UI..." -ForegroundColor Yellow
Push-Location (Join-Path $Raiz "frontend")
try {
    npm run check:atomic:pin
    if ($LASTEXITCODE -ne 0) { throw "Fallo en check:atomic:pin" }
} finally {
    Pop-Location
}

# Paso 3: Verificación de tipos, angular y CSS
Write-Host "`n[3/7] Verificando tipos, angular y tokens CSS..." -ForegroundColor Yellow
Push-Location (Join-Path $Raiz "frontend")
try {
    npm run check:types
    if ($LASTEXITCODE -ne 0) { throw "Fallo en check:types" }
    npm run check:angular
    if ($LASTEXITCODE -ne 0) { throw "Fallo en check:angular" }
    npm run check:theme
    if ($LASTEXITCODE -ne 0) { throw "Fallo en check:theme" }
    npm run check:css
    if ($LASTEXITCODE -ne 0) { throw "Fallo en check:css" }
} finally {
    Pop-Location
}

# Paso 4: Pruebas unitarias de Frontend
Write-Host "`n[4/7] Ejecutando pruebas unitarias de frontend (Vitest)..." -ForegroundColor Yellow
Push-Location (Join-Path $Raiz "frontend")
try {
    npm test -- --watch=false
    if ($LASTEXITCODE -ne 0) { throw "Fallo en pruebas unitarias de frontend" }
} finally {
    Pop-Location
}

# Paso 5: Compilación del Frontend
Write-Host "`n[5/7] Compilando frontend Angular..." -ForegroundColor Yellow
Push-Location (Join-Path $Raiz "frontend")
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Fallo al compilar frontend" }
} finally {
    Pop-Location
}

# Paso 6: Pruebas unitarias de Backend Rust
Write-Host "`n[6/7] Ejecutando pruebas unitarias de Rust (cargo test)..." -ForegroundColor Yellow
Push-Location (Join-Path $Raiz "src-tauri")
try {
    cargo test
    if ($LASTEXITCODE -ne 0) { throw "Fallo en cargo test" }
} finally {
    Pop-Location
}

# Paso 7: Compilación del binario release
Write-Host "`n[7/7] Compilando binario de lanzamiento (cargo build --release)..." -ForegroundColor Yellow
Push-Location (Join-Path $Raiz "src-tauri")
try {
    cargo build --release
    if ($LASTEXITCODE -ne 0) { throw "Fallo en cargo build --release" }
} finally {
    Pop-Location
}

# Verificación física del binario según Axioma 1
$ExePath = Join-Path $Raiz "src-tauri\target\release\union-pdf.exe"
if (-not (Test-Path $ExePath)) {
    Write-Error "ERROR FATAL: El binario físico $ExePath no existe en disco."
    exit 1
}

$Size = (Get-Item $ExePath).Length
if ($Size -le 0) {
    Write-Error "ERROR FATAL: El binario $ExePath tiene tamaño 0 bytes."
    exit 1
}

$SizeMB = [math]::Round($Size / 1MB, 2)
Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " [pdf-tool] VERIFICACION Y COMPILACION EXITOSA AL 100%" -ForegroundColor Green
Write-Host " Binario verificado: $ExePath ($SizeMB MB)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
exit 0
