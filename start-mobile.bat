@echo off
title MATRIX Mobile
cd /d "%~dp0mobile"

echo Starting Expo...
echo Keep this window OPEN.
echo.

set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined IP set "IP=%%a"
)
set "IP=%IP: =%"

echo Phone Expo Go:
echo   exp://%IP%:8081
echo Laptop browser:
echo   http://%IP%:8081
echo.

set REACT_NATIVE_PACKAGER_HOSTNAME=%IP%
if exist "node_modules\expo\bin\cli" (
  node "node_modules\expo\bin\cli" start --lan --port 8081
) else (
  echo ERROR: node_modules missing. Run: npm install --legacy-peer-deps
)

echo.
echo Expo stopped.
pause
