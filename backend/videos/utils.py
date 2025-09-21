"""
Utility functions for video processing and file management.
"""

import os
import hashlib
import subprocess
import json
import logging
from pathlib import Path
from datetime import datetime
import ffmpeg
import imageio  # 既存依存を残す（未使用でも削除不要）
from django.conf import settings
from .models import File, ScanHistory

logger = logging.getLogger('videos')


def get_video_info(file_path):
    """
    FFmpegを使用して動画情報を取得
    """
    try:
        probe = ffmpeg.probe(file_path)
        video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
        
        if video_stream:
            duration = float(probe['format'].get('duration', 0))
            width = int(video_stream.get('width', 0))
            height = int(video_stream.get('height', 0))
            fps = eval(video_stream.get('r_frame_rate', '0/1'))
            if isinstance(fps, tuple):
                fps = fps[0] / fps[1] if fps[1] != 0 else 0
            codec = video_stream.get('codec_name', '')
            bitrate = int(probe['format'].get('bit_rate', 0))
            
            return {
                'duration': duration,
                'width': width,
                'height': height,
                'fps': fps,
                'codec': codec,
                'bitrate': bitrate
            }
    except Exception as e:
        logger.error(f"Error getting video info for {file_path}: {e}")
    
    return None


def calculate_md5_partial(file_path, max_size=10*1024*1024):
    """
    ファイルの最初の部分のMD5ハッシュを計算（大きなファイル用）
    FFmpegを使用して最初のキーフレームまでをコピーしてから計算
    """
    try:
        temp_file = file_path + '.temp.mp4'
        try:
            (
                ffmpeg
                .input(file_path)
                .output(temp_file, t=1, c='copy', f='mp4')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error:
            return calculate_md5_direct(file_path, max_size)
        
        md5_hash = hashlib.md5()
        with open(temp_file, 'rb') as f:
            while chunk := f.read(8192):
                md5_hash.update(chunk)
        if os.path.exists(temp_file):
            os.remove(temp_file)
        return md5_hash.hexdigest()
    
    except Exception as e:
        logger.error(f"Error calculating MD5 for {file_path}: {e}")
        return calculate_md5_direct(file_path, max_size)


def calculate_md5_direct(file_path, max_size=10*1024*1024):
    """
    ファイルの最初の部分を直接読んでMD5を計算（フォールバック）
    """
    try:
        md5_hash = hashlib.md5()
        with open(file_path, 'rb') as f:
            bytes_read = 0
            while bytes_read < max_size:
                chunk = f.read(min(8192, max_size - bytes_read))
                if not chunk:
                    break
                md5_hash.update(chunk)
                bytes_read += len(chunk)
        return md5_hash.hexdigest()
    except Exception as e:
        logger.error(f"Error calculating MD5 (direct) for {file_path}: {e}")
        return None


def create_webp_thumbnail(video_path, webp_path, duration=10, fps=10, scale=320, quality=75, lossless=0, compression_level=6):
    """
    動画からアニメーションWebPサムネイルを作成
    - duration: 最初の何秒を使うか
    - fps: サムネイルのフレームレート
    - scale: 横幅（高さはアスペクト維持で自動）
    - quality: 0(低)〜100(高) 目安: 60〜80
    - lossless: 0=非可逆, 1=可逆
    - compression_level: 0(高速)〜6(高圧縮)
    """
    try:
        os.makedirs(os.path.dirname(webp_path), exist_ok=True)

        video_info = get_video_info(video_path)
        if not video_info:
            return False

        webp_duration = min(duration, max(0.0, float(video_info['duration'])))

        try:
            # ffmpeg-python で libwebp によるアニメーションWebP作成
            # -vf "fps=fps,scale=scale:-1:flags=lanczos" -loop 0 -vcodec libwebp -q:v quality -lossless {0|1} -compression_level 6
            (
                ffmpeg
                .input(video_path, ss=0, t=webp_duration)
                .filter('fps', fps=fps)
                .filter('scale', scale, -1)
                .output(
                    webp_path,
                    vcodec='libwebp',
                    loop=0,
                    lossless=lossless,
                    compression_level=compression_level,
                    **{'q:v': quality}
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return True
        except ffmpeg.Error as e:
            try:
                # 互換のため -qscale:v で再試行
                (
                    ffmpeg
                    .input(video_path, ss=0, t=webp_duration)
                    .filter('fps', fps=fps)
                    .filter('scale', scale, -1)
                    .output(
                        webp_path,
                        vcodec='libwebp',
                        loop=0,
                        lossless=lossless,
                        compression_level=compression_level,
                        **{'qscale:v': quality}
                    )
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
                return True
            except ffmpeg.Error as e2:
                logger.error(f"FFmpeg error creating WebP: {e2.stderr.decode() if hasattr(e2, 'stderr') and e2.stderr else e2}")
                return False

    except Exception as e:
        logger.error(f"Error creating WebP thumbnail for {video_path}: {e}")
        return False


def scan_video_directory():
    """
    動画ディレクトリをスキャンしてデータベースを更新
    """
    scan_history = ScanHistory.objects.create()
    
    video_dir = settings.VIDEO_DIR
    # ★ 変更点: WebP 用ディレクトリを使用
    webp_dir = getattr(settings, 'WEBP_DIR', os.path.join(settings.MEDIA_ROOT, 'webp'))

    # ディレクトリを確実に作成
    try:
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        os.makedirs(video_dir, exist_ok=True)
        os.makedirs(webp_dir, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to prepare media directories: {e}")
        scan_history.status = 'failed'
        scan_history.errors = [f"Failed to prepare media directories: {e}"]
        scan_history.save()
        return scan_history
    
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'}
    
    files_scanned = 0
    files_added = 0
    files_updated = 0
    duplicates_found = 0
    errors = []
    
    try:
        for root, dirs, files in os.walk(video_dir):
            for filename in files:
                file_path = os.path.join(root, filename)
                
                if not any(filename.lower().endswith(ext) for ext in video_extensions):
                    continue
                
                files_scanned += 1
                
                try:
                    file_size = os.path.getsize(file_path)
                    relative_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
                    
                    existing_file = File.objects.filter(
                        file_name=filename,
                        file_size=file_size
                    ).first()
                    
                    if existing_file:
                        if existing_file.file_path != relative_path:
                            existing_file.file_path = relative_path
                            existing_file.save(update_fields=['file_path', 'updated_at'])
                            files_updated += 1
                        continue
                    
                    md5_hash = calculate_md5_partial(file_path)
                    if not md5_hash:
                        errors.append(f"Failed to calculate MD5 for {file_path}")
                        continue
                    
                    is_duplicate = File.objects.filter(
                        file_size=file_size,
                        md5_hash=md5_hash
                    ).exists()
                    
                    if is_duplicate:
                        File.objects.filter(
                            file_size=file_size,
                            md5_hash=md5_hash
                        ).update(duplicate_flag=True)
                        duplicates_found += 1
                    
                    video_info = get_video_info(file_path)

                    # ★ 変更点: WebP サムネイルを作成
                    webp_filename = f"{os.path.splitext(filename)[0]}.webp"
                    webp_path = os.path.join(webp_dir, webp_filename)
                    webp_created = create_webp_thumbnail(file_path, webp_path)

                    file_record = File(
                        file_name=filename,
                        file_path=relative_path,
                        file_size=file_size,
                        md5_hash=md5_hash,
                        duplicate_flag=is_duplicate
                    )
                    
                    if video_info:
                        file_record.video_duration = video_info['duration']
                        file_record.width = video_info['width']
                        file_record.height = video_info['height']
                        file_record.fps = video_info['fps']
                        file_record.codec = video_info['codec']
                        file_record.bitrate = video_info['bitrate']
                    
                    # ★ 変更点: WebP の相対パスを保存（フィールド名は互換のためそのまま）
                    if webp_created:
                        file_record.thumbnail_file_path = f"webp/{webp_filename}"
                    
                    file_record.save()
                    files_added += 1
                    
                    logger.info(f"Added file: {filename}")
                
                except Exception as e:
                    error_msg = f"Error processing file {file_path}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
        
        scan_history.completed_at = datetime.now()
        scan_history.status = 'completed'
        scan_history.files_scanned = files_scanned
        scan_history.files_added = files_added
        scan_history.files_updated = files_updated
        scan_history.duplicates_found = duplicates_found
        scan_history.errors = errors
        scan_history.save()
        
        logger.info(f"Scan completed: {files_scanned} scanned, {files_added} added, {files_updated} updated, {duplicates_found} duplicates")
        
    except Exception as e:
        error_msg = f"Scan failed: {str(e)}"
        logger.error(error_msg)
        scan_history.completed_at = datetime.now()
        scan_history.status = 'failed'
        scan_history.errors = [error_msg]
        scan_history.save()
    
    return scan_history


def check_and_mark_duplicates():
    """
    すべてのファイルの重複をチェックしてフラグを更新
    """
    from django.db.models import Count
    
    duplicate_groups = File.objects.values('file_size', 'md5_hash').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    duplicates_marked = 0
    
    for group in duplicate_groups:
        files = File.objects.filter(
            file_size=group['file_size'],
            md5_hash=group['md5_hash']
        )
        updated = files.update(duplicate_flag=True)
        duplicates_marked += updated
    
    logger.info(f"Marked {duplicates_marked} files as duplicates")
    return duplicates_marked
