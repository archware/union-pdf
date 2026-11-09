@echo off
setlocal
echo ========================================================
echo  [pdf-tool] Ejecutando compuerta canonica de compilacion
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\verificar-todo.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR FATAL] La compilacion o verificacion fallo con codigo %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo.
echo ========================================================
echo  [pdf-tool] COMPILACION EXITOSA
echo  Ejecutable generado fisicamente en:
echo  %~dp0src-tauri\target\release\union-pdf.exe
echo ========================================================
endlocal
