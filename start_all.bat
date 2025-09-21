@echo off
echo ========================================
echo Starting Video Streaming System
echo ========================================
echo.

:: バックエンドとフロントエンドを並行して起動
echo Starting Backend Server (Django)...
start "Backend Server" cmd /k "cd backend && call ..\venv\Scripts\activate.bat && daphne -b 0.0.0.0 -p 8000 backend.asgi:application"

:: 少し待機
timeout /t 3 /nobreak >nul

echo Starting Frontend Server (React)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Both servers are starting...
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo Admin:    http://localhost:8000/admin
echo.
echo Press any key to open the frontend in your browser...
pause >nul

:: ブラウザで開く
start http://localhost:3000

echo.
echo The servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause