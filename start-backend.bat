@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

if not exist ".codex-runtime" mkdir ".codex-runtime"

if not exist "apps\api\node_modules\tsx\dist\cli.mjs" (
  echo Missing dependencies for API launcher.
  echo Run: corepack pnpm install
  exit /b 1
)

if not exist "apps\worker\node_modules\tsx\dist\cli.mjs" (
  echo Missing dependencies for worker launcher.
  echo Run: corepack pnpm install
  exit /b 1
)

del ".codex-runtime\redis-url.txt" >nul 2>nul

start "SweetStar Redis" cmd /k "cd /d ""%ROOT%"" && node tooling\scripts\start-redis-memory.cjs"

start "SweetStar API" cmd /k "cd /d ""%ROOT%"" && node apps\api\node_modules\tsx\dist\cli.mjs tooling\scripts\start-api-root.mjs"
start "SweetStar Worker" cmd /k "cd /d ""%ROOT%"" && node apps\worker\node_modules\tsx\dist\cli.mjs tooling\scripts\start-worker-root.mjs"

echo Backend stack started.
echo API: http://127.0.0.1:3000
echo Redis URL file: .codex-runtime\redis-url.txt
echo Worker mode: real when VECTORENGINE_API_TOKEN is configured, otherwise smoke.
