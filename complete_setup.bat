@echo off
echo ========================================
echo Video Streaming Complete Setup
echo ========================================
echo.

echo This script will set up the complete video streaming system.
echo Make sure you have the following installed:
echo - Python 3.10+
echo - Node.js 18+
echo - MySQL 8.0+
echo - FFmpeg
echo.
pause

:: バックエンドセットアップ
echo.
echo [Step 1/3] Setting up Backend...
echo ========================================
call install.bat
if errorlevel 1 (
    echo Backend setup failed!
    pause
    exit /b 1
)

:: フロントエンドセットアップ
echo.
echo [Step 2/3] Setting up Frontend...
echo ========================================
call frontend_install.bat
if errorlevel 1 (
    echo Frontend setup failed!
    pause
    exit /b 1
)

:: 初期データ作成
echo.
echo [Step 3/3] Creating initial data...
echo ========================================
cd backend
call ..\venv\Scripts\activate.bat

:: スーパーユーザーが作成されていない場合のみ作成
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); exit(0 if User.objects.filter(is_superuser=True).exists() else 1)"
if errorlevel 1 (
    echo Creating superuser account...
    python manage.py createsuperuser --username admin --email admin@localhost
)

:: 初期フォルダ作成
python manage.py shell -c "from videos.models import Folder; Folder.objects.get_or_create(folder_name='お気に入り', parent=None); Folder.objects.get_or_create(folder_name='未分類', parent=None)"

cd ..

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the system, run: start_all.bat
echo.
echo Default URLs:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000/api
echo - Admin Panel: http://localhost:8000/admin
echo.
echo Default admin credentials:
echo - Username: admin
echo - Password: (the one you just created)
echo.
echo Place your video files in: media\videos\
echo.
pause