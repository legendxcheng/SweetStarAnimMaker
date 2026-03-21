@echo off
setlocal

title SweetStar Backend

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

set "STUDIO_ORIGIN=http://127.0.0.1:14273,http://localhost:5173"

node tooling\scripts\start-backend-stack.mjs
