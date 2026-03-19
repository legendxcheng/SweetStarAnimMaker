@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

node tooling\scripts\stop-smoke-processes.mjs
