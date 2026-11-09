@echo off
setlocal
echo [DBDeploy] Despliegue automatico deshabilitado: requiere revision y ejecucion explicita por el responsable de base de datos.
echo [DBDeploy] Los contratos locales pueden validarse con: npm run db:validate:sps
endlocal & exit /b 2
