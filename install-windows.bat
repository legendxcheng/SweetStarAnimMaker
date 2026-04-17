@echo off
setlocal

set "ROOT=%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%install-windows.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo Installation failed with exit code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

echo Installation completed.
pause
