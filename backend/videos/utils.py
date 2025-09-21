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
import imageio
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
        # 一時ファイルパス
        temp_file = file_path + '.temp.mp4'
        
        # FFmpegで最初の部分をコピー
        try:
            (
                ffmpeg
                .input(file_path)
                .output(temp_file, t=1, c='copy', f='mp4')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error:
            # エラーが発生した場合は直接ファイルを読む
            return calculate_md5_direct(file_path, max_size)
        
        # 一時ファイルのMD5を計算
        md5_hash = hashlib.md5()
        with open(temp_file, 'rb') as f:
            while chunk := f.read(8192):
                md5_hash.update(chunk)
        
        # 一時ファイルを削除
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        return md5_hash.hexdigest()
    
    except Exception as e:
        logger.error(f"Error calculating MD5 for {file_path}: {e}")
        # フォールバック：直接ファイルを読む
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


def create_gif_thumbnail(video_path, gif_path, duration=10, fps=10, scale=320):
    """
    動画からGIFサムネイルを作成
    """
    try:
        # 出力ディレクトリを確認
        os.makedirs(os.path.dirname(gif_path), exist_ok=True)
        
        # 動画情報を取得
        video_info = get_video_info(video_path)
        if not video_info:
            return False
        
        # GIF作成時間を決定（動画が短い場合は動画全体）
        gif_duration = min(duration, video_info['duration'])
        
        # FFmpegでGIFを生成
        try:
            (
                ffmpeg
                .input(video_path, ss=0, t=gif_duration)
                .filter('fps', fps=fps)
                .filter('scale', scale, -1)
                .output(gif_path, loop=0)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return True
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error creating GIF: {e.stderr.decode()}")
            return False
    
    except Exception as e:
        logger.error(f"Error creating GIF thumbnail for {video_path}: {e}")
        return False


def scan_video_directory():
    """
    動画ディレクトリをスキャンしてデータベースを更新
    """
    scan_history = ScanHistory.objects.create()
    
    video_dir = settings.VIDEO_DIR
    gif_dir = settings.GIF_DIR
    
    if not os.path.exists(video_dir):
        logger.error(f"Video directory does not exist: {video_dir}")
        scan_history.status = 'failed'
        scan_history.errors = [f"Video directory does not exist: {video_dir}"]
        scan_history.save()
        return scan_history
    
    # 対象の動画拡張子
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'}
    
    files_scanned = 0
    files_added = 0
    files_updated = 0
    duplicates_found = 0
    errors = []
    
    try:
        # ディレクトリ内のすべてのファイルを走査
        for root, dirs, files in os.walk(video_dir):
            for filename in files:
                file_path = os.path.join(root, filename)
                
                # 動画ファイルのみ処理
                if not any(filename.lower().endswith(ext) for ext in video_extensions):
                    continue
                
                files_scanned += 1
                
                try:
                    # ファイル情報を取得
                    file_size = os.path.getsize(file_path)
                    relative_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
                    
                    # データベースに存在するか確認（ファイル名とサイズで）
                    existing_file = File.objects.filter(
                        file_name=filename,
                        file_size=file_size
                    ).first()
                    
                    if existing_file:
                        # 既存ファイルの場合はパスを更新
                        if existing_file.file_path != relative_path:
                            existing_file.file_path = relative_path
                            existing_file.save(update_fields=['file_path', 'updated_at'])
                            files_updated += 1
                        continue
                    
                    # MD5ハッシュを計算
                    md5_hash = calculate_md5_partial(file_path)
                    if not md5_hash:
                        errors.append(f"Failed to calculate MD5 for {file_path}")
                        continue
                    
                    # 重複チェック
                    is_duplicate = File.objects.filter(
                        file_size=file_size,
                        md5_hash=md5_hash
                    ).exists()
                    
                    if is_duplicate:
                        # 既存の重複ファイルにもフラグを設定
                        File.objects.filter(
                            file_size=file_size,
                            md5_hash=md5_hash
                        ).update(duplicate_flag=True)
                        duplicates_found += 1
                    
                    # 動画情報を取得
                    video_info = get_video_info(file_path)
                    
                    # GIFサムネイルを作成
                    gif_filename = f"{os.path.splitext(filename)[0]}.gif"
                    gif_path = os.path.join(gif_dir, gif_filename)
                    gif_created = create_gif_thumbnail(file_path, gif_path)
                    
                    # ファイルレコードを作成
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
                    
                    if gif_created:
                        file_record.thumbnail_file_path = f"gifs/{gif_filename}"
                    
                    file_record.save()
                    files_added += 1
                    
                    logger.info(f"Added file: {filename}")
                
                except Exception as e:
                    error_msg = f"Error processing file {file_path}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
        
        # スキャン履歴を更新
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
    
    # 重複の可能性があるグループを検索
    duplicate_groups = File.objects.values('file_size', 'md5_hash').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    duplicates_marked = 0
    
    for group in duplicate_groups:
        # 同じサイズとMD5を持つファイルを取得
        files = File.objects.filter(
            file_size=group['file_size'],
            md5_hash=group['md5_hash']
        )
        
        # すべてに重複フラグを設定
        updated = files.update(duplicate_flag=True)
        duplicates_marked += updated
    
    logger.info(f"Marked {duplicates_marked} files as duplicates")
    return duplicates_marked