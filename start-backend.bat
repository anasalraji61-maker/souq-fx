@echo off
title MATRIX Backend
cd /d "%~dp0backend"

echo Starting MATRIX Backend on port 8110...
echo.

if not exist "venv\Scripts\python.exe" (
  echo Creating Python venv...
  python -m venv venv
  "venv\Scripts\python.exe" -m pip install -r requirements.txt
)

"venv\Scripts\python.exe" -c "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8110, reload=False)"
echo.
echo Backend stopped.
pause
