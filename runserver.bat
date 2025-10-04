@echo off
echo ========================================
echo Starting Video Streaming Server
echo ========================================
echo.

:: 仮想環境のアクティベート
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment.
    echo Please run install.bat first.
    pause
    exit /b 1
)

:: バックエンドディレクトリへ移動
cd backend

:: Daphneサーバーの起動
echo Starting Daphne ASGI server...
echo Server will be available at http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

:: Daphneの起動（ASGIサーバー）
daphne -b 0.0.0.0 -p 8000 backend.asgi:application

:: サーバー停止後の処理
cd ..
echo.
echo Server stopped.
pause