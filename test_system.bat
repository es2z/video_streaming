@echo off
echo ========================================
echo Video Streaming System Test
echo ========================================
echo.

:: Python確認
echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed
    pause
    exit /b 1
)
python --version

:: Node.js確認
echo.
echo [2/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    pause
    exit /b 1
)
node --version
npm --version

:: MySQL確認
echo.
echo [3/6] Checking MySQL...
mysql --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: MySQL command not found in PATH
    echo Make sure MySQL service is running
) else (
    mysql --version
)

:: FFmpeg確認
echo.
echo [4/6] Checking FFmpeg...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: FFmpeg is not installed or not in PATH
    pause
    exit /b 1
)
ffmpeg -version | findstr "ffmpeg version"

:: バックエンド確認
echo.
echo [5/6] Testing Backend...
cd backend
call ..\venv\Scripts\activate.bat >nul 2>&1
if errorlevel 1 (
    echo ERROR: Virtual environment not found. Run install.bat first
    cd ..
    pause
    exit /b 1
)

python manage.py check >nul 2>&1
if errorlevel 1 (
    echo ERROR: Django configuration error
    cd ..
    pause
    exit /b 1
)
echo Django configuration: OK

:: データベース接続テスト
python -c "from django.db import connection; cursor = connection.cursor(); print('Database connection: OK')" 2>nul
if errorlevel 1 (
    echo ERROR: Cannot connect to database
    echo Make sure MySQL is running and configured correctly
    cd ..
    pause
    exit /b 1
)

cd ..

:: フロントエンド確認
echo.
echo [6/6] Testing Frontend...
cd frontend
if not exist node_modules (
    echo ERROR: Node modules not found. Run frontend_install.bat first
    cd ..
    pause
    exit /b 1
)
echo Frontend dependencies: OK

cd ..

:: メディアフォルダ確認
echo.
echo Checking media directories...
if not exist media\videos (
    echo Creating media\videos directory...
    mkdir media\videos
)
if not exist media\gifs (
    echo Creating media\gifs directory...
    mkdir media\gifs
)
echo Media directories: OK

:: 動作テスト
echo.
echo ========================================
echo System Test Completed Successfully!
echo ========================================
echo.
echo All components are properly installed.
echo.
echo To start the system:
echo   start_all.bat
echo.
echo To test the API:
echo   1. Start the backend server
echo   2. Open http://localhost:8000/api
echo.
echo To test the frontend:
echo   1. Start both servers
echo   2. Open http://localhost:3000
echo.
pause