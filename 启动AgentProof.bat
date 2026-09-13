@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on this machine.
  echo   Install it from https://nodejs.org then run this file again.
  echo.
  pause
  exit /b 1
)
node agentproof.mjs serve --open --port 7317
pause
