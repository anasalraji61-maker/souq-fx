@echo off
title MATRIX - Static IP
cd /d "%~dp0"

echo.
echo  ========================================
echo   MATRIX Static IP Setup
echo  ========================================
echo.
echo  IMPORTANT:
echo  Right-click this file and choose:
echo  Run as administrator
echo.
echo  Running now...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\set-static-ip.ps1"
echo.
echo  Exit code: %ERRORLEVEL%
echo.
echo  Press any key to close...
pause >nul
