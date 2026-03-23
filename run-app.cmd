@echo off
setlocal

echo Starting PillMinder backend and frontend...
echo.
echo Backend: http://localhost:5000
echo Frontend: http://127.0.0.1:3000
echo.
echo Keep both terminal windows open while using the app.
echo.

start "PillMinder Backend" cmd /k "cd /d "%~dp0backend" && npm.cmd start"
start "PillMinder Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd start"

timeout /t 2 >nul
start "" "http://127.0.0.1:3000"

endlocal
