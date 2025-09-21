@echo off
echo ========================================
echo Video Streaming Backend Installation
echo ========================================
echo.

:: Python仮想環境の作成
echo [1/8] Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Error: Failed to create virtual environment.
    pause
    exit /b 1
)

:: 仮想環境のアクティベート
echo [2/8] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment.
    pause
    exit /b 1
)

:: pipのアップグレード
echo [3/8] Upgrading pip...
python -m pip install --upgrade pip

:: 依存関係のインストール
echo [4/8] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

:: メディアフォルダの作成
echo [5/8] Creating media directories...
if not exist "media" mkdir media
if not exist "media\videos" mkdir media\videos
if not exist "media\gifs" mkdir media\gifs
if not exist "logs" mkdir logs

:: MySQLデータベースの作成（MySQLが環境変数に設定されている前提）
echo [6/8] Setting up MySQL database...
echo Please enter MySQL root password:
set /p MYSQL_ROOT_PASSWORD=
mysql -u root -p%MYSQL_ROOT_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS video_streaming_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p%MYSQL_ROOT_PASSWORD% -e "CREATE USER IF NOT EXISTS 'video_user'@'localhost' IDENTIFIED BY 'video_pass_2024';"
mysql -u root -p%MYSQL_ROOT_PASSWORD% -e "GRANT ALL PRIVILEGES ON video_streaming_db.* TO 'video_user'@'localhost';"
mysql -u root -p%MYSQL_ROOT_PASSWORD% -e "FLUSH PRIVILEGES;"

:: Djangoの初期設定
echo [7/8] Running Django migrations...
cd backend
python manage.py makemigrations
python manage.py migrate
if errorlevel 1 (
    echo Error: Failed to run migrations.
    cd ..
    pause
    exit /b 1
)

:: スーパーユーザーの作成
echo [8/8] Creating Django superuser...
echo.
echo Please create a superuser account:
python manage.py createsuperuser

cd ..

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo To start the server, run: runserver.bat
echo.
pause