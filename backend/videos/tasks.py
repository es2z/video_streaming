"""
Background tasks for video processing.
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .utils import scan_video_directory, check_and_mark_duplicates

logger = logging.getLogger('videos')


@shared_task
def periodic_scan_task():
    """
    定期的なファイルスキャンタスク
    """
    logger.info("Starting periodic file scan task...")
    
    try:
        # ファイルスキャンを実行
        scan_history = scan_video_directory()
        
        # 重複チェック
        duplicates = check_and_mark_duplicates()
        
        logger.info(f"Periodic scan completed. Files added: {scan_history.files_added}, Duplicates: {duplicates}")
        
        return {
            'status': 'success',
            'scan_id': scan_history.id,
            'files_added': scan_history.files_added,
            'files_updated': scan_history.files_updated,
            'duplicates_found': duplicates
        }
    
    except Exception as e:
        logger.error(f"Periodic scan failed: {str(e)}")
        return {
            'status': 'failed',
            'error': str(e)
        }


@shared_task
def cleanup_old_scan_history():
    """
    古いスキャン履歴を削除
    """
    from .models import ScanHistory
    
    # 30日以上前の履歴を削除
    cutoff_date = timezone.now() - timedelta(days=30)
    deleted_count = ScanHistory.objects.filter(started_at__lt=cutoff_date).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old scan history records")
    return deleted_count


@shared_task
def generate_missing_thumbnails():
    """
    サムネイルが欠けているファイルのGIFを生成
    """
    from .models import File
    from .utils import create_gif_thumbnail
    import os
    from django.conf import settings
    
    files_without_thumbnails = File.objects.filter(
        thumbnail_file_path__isnull=True,
        delete_flag=False
    )
    
    generated_count = 0
    
    for file in files_without_thumbnails:
        try:
            video_path = os.path.join(settings.MEDIA_ROOT, file.file_path)
            
            if not os.path.exists(video_path):
                logger.warning(f"Video file not found: {video_path}")
                continue
            
            gif_filename = f"{os.path.splitext(file.file_name)[0]}.gif"
            gif_path = os.path.join(settings.GIF_DIR, gif_filename)
            
            if create_gif_thumbnail(video_path, gif_path):
                file.thumbnail_file_path = f"gifs/{gif_filename}"
                file.save(update_fields=['thumbnail_file_path', 'updated_at'])
                generated_count += 1
                logger.info(f"Generated thumbnail for: {file.file_name}")
        
        except Exception as e:
            logger.error(f"Failed to generate thumbnail for {file.file_name}: {str(e)}")
    
    logger.info(f"Generated {generated_count} missing thumbnails")
    return generated_count