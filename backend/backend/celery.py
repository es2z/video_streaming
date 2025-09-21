"""
Celery configuration for backend project.
"""

import os
from celery import Celery
from celery.schedules import crontab

# Djangoの設定モジュールを指定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Celeryアプリケーションインスタンスを作成
app = Celery('backend')

# Djangoの設定ファイルから設定を読み込み
app.config_from_object('django.conf:settings', namespace='CELERY')

# 登録されたDjangoアプリケーションからタスクを自動検出
app.autodiscover_tasks()

# 定期タスクの設定
app.conf.beat_schedule = {
    # 6時間ごとにファイルスキャンを実行
    'periodic-file-scan': {
        'task': 'videos.tasks.periodic_scan_task',
        'schedule': crontab(minute=0, hour='*/6'),  # 0:00, 6:00, 12:00, 18:00に実行
    },
    # 毎日午前3時に古いスキャン履歴を削除
    'cleanup-scan-history': {
        'task': 'videos.tasks.cleanup_old_scan_history',
        'schedule': crontab(hour=3, minute=0),
    },
    # 毎日午前4時に欠けているサムネイルを生成
    'generate-missing-thumbnails': {
        'task': 'videos.tasks.generate_missing_thumbnails',
        'schedule': crontab(hour=4, minute=0),
    },
}

@app.task(bind=True)
def debug_task(self):
    """デバッグ用タスク"""
    print(f'Request: {self.request!r}')