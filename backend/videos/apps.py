"""
App configuration for videos application.
"""

from django.apps import AppConfig
import threading
import time
import logging

logger = logging.getLogger('videos')


class VideosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'videos'
    verbose_name = '動画管理'
    
    def ready(self):
        """アプリケーション起動時の処理"""
        # マイグレーション時やその他の管理コマンド実行時はスキップ
        import sys
        if 'runserver' in sys.argv or 'daphne' in ' '.join(sys.argv):
            # 起動時のファイルスキャンを別スレッドで実行
            threading.Thread(target=self.initial_scan, daemon=True).start()
            
            # 定期スキャンを開始
            threading.Thread(target=self.periodic_scan, daemon=True).start()
    
    def initial_scan(self):
        """初期スキャン"""
        # サーバー起動を待つ
        time.sleep(5)
        
        try:
            from .utils import scan_video_directory, check_and_mark_duplicates
            logger.info("Starting initial file scan...")
            scan_video_directory()
            check_and_mark_duplicates()
            logger.info("Initial file scan completed.")
        except Exception as e:
            logger.error(f"Initial scan failed: {e}")
    
    def periodic_scan(self):
        """定期スキャン（6時間ごと）"""
        from django.conf import settings
        interval = settings.FILE_SCAN_INTERVAL
        
        # 最初の定期スキャンまで待機
        time.sleep(interval)
        
        while True:
            try:
                from .utils import scan_video_directory, check_and_mark_duplicates
                logger.info("Starting periodic file scan...")
                scan_video_directory()
                check_and_mark_duplicates()
                logger.info("Periodic file scan completed.")
            except Exception as e:
                logger.error(f"Periodic scan failed: {e}")
            
            # 次のスキャンまで待機
            time.sleep(interval)