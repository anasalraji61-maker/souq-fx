@echo off
title MATRIX Dev
cd /d "%~dp0"

echo.
echo  ========================================
echo   MATRIX Dev Launcher
echo  ========================================
echo.
echo  Keep this window OPEN for live updates.
echo  Phone Expo Go URL will be shown below.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-matrix-dev.ps1"
echo.
echo  Exit code: %ERRORLEVEL%
echo.
echo  Press any key to close...
pause >nul
