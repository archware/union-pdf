@echo off
cd /d "%~dp0.."
echo Limpiando puertos bloqueados (zombies de Node)...
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :1420 ^| findstr LISTENING') DO taskkill /F /PID %%a >nul 2>&1
echo Iniciando entorno de desarrollo de Tauri...
set PATH=%PATH%;%USERPROFILE%\.cargo\bin
call npm.cmd run tauri dev
