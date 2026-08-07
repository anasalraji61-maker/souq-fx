@echo off
title MATRIX Desktop
cd /d "%~dp0desktop"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing Electron...
  call npm install
  if exist "node_modules\electron\install.js" (
    pushd node_modules\electron
    call node install.js
    popd
  )
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo ERROR: Electron binary missing. Run: cd desktop ^&^& npm install
  pause
  exit /b 1
)

set MATRIX_WEB_URL=http://127.0.0.1:8081
set MATRIX_API_URL=http://127.0.0.1:8110
echo.
echo MATRIX Desktop
echo Backend: %MATRIX_API_URL%
echo Web:     %MATRIX_WEB_URL%
echo.
echo تأكد أن Backend و Expo web يعملان أولاً.
echo.
start "" "node_modules\electron\dist\electron.exe" .
