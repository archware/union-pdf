@echo off
setlocal
cd /d "%~dp0.."
set PATH=%PATH%;%USERPROFILE%\.cargo\bin
call npm.cmd run check:contracts
if errorlevel 1 exit /b %ERRORLEVEL%
call npm.cmd run db:validate:sps
if errorlevel 1 exit /b %ERRORLEVEL%
npm.cmd run tauri build
endlocal
