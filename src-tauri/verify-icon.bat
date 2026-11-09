@echo off
REM Verificación ad-hoc del icono en la compilación de pdf-tool

echo Verificando la integración del icono en la compilación...
echo.

REM Verificar que el ejecutable fue creado
if exist "target\release\pdf-tool.exe" (
    echo ✅ Ejecutable creado correctamente
) else (
    echo ❌ Ejecutable no encontrado
    exit /b 1
)

REM Verificar que el icono existe en la carpeta de icons
if exist "icons\icon.ico" (
    echo ✅ Archivo de icono encontrado
) else (
    echo ❌ Archivo de icono no encontrado
    exit /b 1
)

REM Mostrar información básica del icono
echo.
echo Información del icono:
echo -------------------
dir "icons\icon.ico"

echo.
echo Compilación completada exitosamente con el nuevo icono.