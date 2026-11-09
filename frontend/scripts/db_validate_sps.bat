@echo off
setlocal
cd /d "%~dp0.."
node.exe scripts\validate-sql-contracts.js
endlocal & exit /b %ERRORLEVEL%
