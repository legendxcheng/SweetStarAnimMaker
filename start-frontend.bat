@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

if not exist "apps\studio\node_modules\vite\bin\vite.js" (
  echo Missing dependencies for Studio launcher.
  echo Run: corepack pnpm install
  exit /b 1
)

start "SweetStar Studio" cmd /k "cd /d ""%ROOT%apps\studio"" && set ""VITE_API_BASE_URL=http://127.0.0.1:3000"" && node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 4273"

echo Studio starting at http://127.0.0.1:4273
echo API base URL: http://127.0.0.1:3000
