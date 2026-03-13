@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%stop-bundled-openclaw-gateway.ps1"

if not exist "%PS_SCRIPT%" (
  echo Missing script: %PS_SCRIPT%
  exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
exit /b %errorlevel%
