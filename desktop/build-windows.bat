@echo off
REM MATRIX Charts - build the Windows installer with one double-click.
REM Needs Node.js 20+ (https://nodejs.org, LTS). Result: desktop\dist\MATRIX-Charts-Setup-<version>.exe
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this file again.
  start https://nodejs.org/en/download
  pause
  exit /b 1
)

if not exist desktop-config.json (
  copy /y desktop-config.example.json desktop-config.json >nul
)
echo.
echo The app opens this MATRIX server:
type desktop-config.json
echo.
set "NEWURL="
set /p NEWURL=Press Enter to keep it, or type your domain (example: https://matrix-fx.com): 
if defined NEWURL (
  echo {"remoteUrl": "%NEWURL%"}> desktop-config.json
  echo Saved: %NEWURL%
)

echo.
echo == 1/2 installing build tools (first time takes a few minutes)
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo npm install failed. Check the internet connection and run again.
  pause
  exit /b 1
)

echo.
echo == 2/2 building the installer
call npm run dist
if errorlevel 1 (
  echo Build failed - send a screenshot of this window.
  pause
  exit /b 1
)

echo.
echo DONE: the installer is in desktop\dist
start "" "%~dp0dist"
pause
