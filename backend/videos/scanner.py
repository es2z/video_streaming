# backend/videos/scanner.py
"""
Scan entrypoints used by VideosConfig to start background scans.
"""

import os
import time
import logging
from django.conf import settings
from .utils import scan_video_directory, check_and_mark_duplicates

logger = logging.getLogger("videos")


def _ensure_media_dirs() -> None:
    """MEDIA_ROOT / VIDEO_DIR / WEBP_DIR を必ず作成しておく。"""
    try:
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        os.makedirs(settings.VIDEO_DIR, exist_ok=True)
        webp_dir = getattr(settings, "WEBP_DIR", os.path.join(settings.MEDIA_ROOT, "webp"))
        os.makedirs(webp_dir, exist_ok=True)
    except Exception:
        logger.exception("Failed to create media directories.")


def initial_scan() -> None:
    """
    サーバ起動直後に 1 回だけ実行する初期スキャン。
    AppConfig から別スレッドで呼ばれる想定。
    """
    _ensure_media_dirs()
    logger.info("Starting initial file scan (with WebP thumbnails)...")
    try:
        scan_video_directory()
        check_and_mark_duplicates()
        logger.info("Initial file scan finished.")
    except Exception:
        logger.exception("Initial file scan failed.")


def periodic_scan() -> None:
    """
    常駐で定期的にスキャンを回すループ。
    AppConfig から別スレッドで呼ばれる想定。
    """
    _ensure_media_dirs()
    interval = getattr(settings, "FILE_SCAN_INTERVAL", 6 * 60 * 60)  # 既定 6 時間
    logger.info("Starting periodic scan loop (interval=%s sec) with WebP thumbnails...", interval)

    while True:
        try:
            logger.info("Periodic scan tick.")
            scan_video_directory()
            check_and_mark_duplicates()
            logger.info("Periodic scan tick finished.")
        except Exception:
            logger.exception("Periodic scan tick failed.")
        time.sleep(interval)
