@echo off
echo ========================================
echo Video Streaming Frontend Installation
echo ========================================
echo.

:: Node.jsがインストールされているか確認
where node >nul 2>nul
if errorlevel 1 (
    echo Error: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: npmがインストールされているか確認
where npm >nul 2>nul
if errorlevel 1 (
    echo Error: npm is not installed.
    echo Please install Node.js with npm from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Node.js version:
node --version
echo.
echo [2/4] npm version:
npm --version
echo.

:: フロントエンドディレクトリに移動
echo [3/4] Navigating to frontend directory...
cd frontend
if errorlevel 1 (
    echo Error: frontend directory not found.
    echo Please ensure the frontend folder exists.
    pause
    exit /b 1
)

:: 依存関係のインストール
echo [4/4] Installing dependencies...
echo This may take a few minutes...
npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Frontend installation completed!
echo ========================================
echo.
echo To start the development server:
echo   cd frontend
echo   npm run dev
echo.
echo The frontend will be available at:
echo   http://localhost:3000
echo.
pause