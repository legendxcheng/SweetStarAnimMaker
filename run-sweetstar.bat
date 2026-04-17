@echo off
setlocal

title SweetStar Launcher

set "ROOT=%~dp0"
cd /d "%ROOT%"

if not exist "apps\studio\node_modules\vite\bin\vite.js" (
  echo Missing dependencies.
  echo Run install-windows.bat first.
  pause
  exit /b 1
)

if not exist "apps\api\node_modules\tsx\dist\cli.mjs" (
  echo Missing backend dependencies.
  echo Run install-windows.bat first.
  pause
  exit /b 1
)

if not exist "apps\worker\node_modules\tsx\dist\cli.mjs" (
  echo Missing worker dependencies.
  echo Run install-windows.bat first.
  pause
  exit /b 1
)

start "SweetStar Backend" cmd /c call "%ROOT%start-backend.bat"
start "SweetStar Studio" cmd /c call "%ROOT%start-frontend.bat"

echo Backend and Studio launchers started.
echo Studio URL: http://127.0.0.1:14273
pause
