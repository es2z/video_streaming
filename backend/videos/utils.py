# backend/videos/utils.py
"""
Utility functions for video processing and file management.
"""

import os
import hashlib
import logging
from pathlib import Path

import ffmpeg  # ffmpeg-python
import imageio  # 依存関係維持のため（未使用でも削除しない）

from django.conf import settings
from django.utils import timezone

from .models import File, ScanHistory

logger = logging.getLogger("videos")


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def get_video_info(file_path: str):
    """
    FFmpeg の probe で動画情報を取得
    """
    try:
        probe = ffmpeg.probe(file_path)
        video_stream = next(
            (s for s in probe["streams"] if s.get("codec_type") == "video"), None
        )
        if not video_stream:
            return None

        duration = float(probe["format"].get("duration") or 0) or None
        width = int(video_stream.get("width") or 0) or None
        height = int(video_stream.get("height") or 0) or None

        r_frame_rate = video_stream.get("r_frame_rate") or "0/1"
        try:
            num, den = (int(x) for x in r_frame_rate.split("/"))
            fps = (num / den) if den else None
        except Exception:
            fps = None

        codec = video_stream.get("codec_name") or None
        bitrate = int(probe["format"].get("bit_rate") or 0) or None

        return {
            "duration": duration,
            "width": width,
            "height": height,
            "fps": fps,
            "codec": codec,
            "bitrate": bitrate,
        }
    except Exception as e:
        logger.error(f"Error getting video info for {file_path}: {e}")
        return None


def calculate_md5_partial(
    file_path: str, max_bytes: int = 10 * 1024 * 1024
) -> str | None:
    """
    先頭 max_bytes 分の MD5 を計算（重いフルハッシュを避ける）
    オリジナル仕様の「最初のキーフレームまでをコピー」相当は環境差の影響が大きいので、
    安定性重視で「先頭バイト数での近似ハッシュ」を採用（既存挙動は保持）。
    """
    try:
        h = hashlib.md5()
        with open(file_path, "rb") as f:
            remaining = max_bytes
            while remaining > 0:
                chunk = f.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                h.update(chunk)
                remaining -= len(chunk)
        return h.hexdigest()
    except Exception as e:
        logger.error(f"Failed to calculate partial MD5 for {file_path}: {e}")
        return None


def create_gif_thumbnail(
    video_path: str, gif_path: str, duration: int = 10, fps: int = 10
) -> bool:
    """
    GIF サムネイル生成（既存 API 互換のため残置）
    """
    try:
        palette_path = gif_path + ".palette.png"
        # パレット生成
        (
            ffmpeg.input(video_path, ss=0)
            .filter("fps", fps)
            .filter("scale", -1, 360)
            .output(palette_path, vframes=fps * duration, f="image2", vcodec="png")
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        # GIF 生成
        (
            ffmpeg.input(video_path, ss=0)
            .filter("fps", fps)
            .filter("scale", -1, 360)
            .filter("paletteuse")
            .output(
                gif_path,
                vframes=fps * duration,
                loop=0,
                vf=f"paletteuse=diff_mode=rectangle:palette={palette_path}",
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        try:
            os.remove(palette_path)
        except OSError:
            pass
        return True
    except ffmpeg.Error as e:
        logger.error(
            f"FFmpeg error creating GIF: {e.stderr.decode() if getattr(e, 'stderr', None) else e}"
        )
        return False
    except Exception as e:
        logger.error(f"Error creating GIF: {e}")
        return False


def create_webp_thumbnail(
    video_path: str,
    webp_path: str,
    quality: int = 80,
    lossless: bool = False,
    compression_level: int = 4,
) -> bool:
    """
    単枚 WebP サムネイル生成（軽量でフロント互換）
    """
    try:
        (
            ffmpeg.input(video_path, ss=0)
            .filter("scale", -1, 360)
            .output(
                webp_path,
                vframes=1,
                f="webp",
                **({"lossless": 1} if lossless else {}),
                **({"compression_level": compression_level} if not lossless else {}),
                **({"qscale:v": quality} if not lossless else {}),
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        return True
    except ffmpeg.Error as e:
        logger.error(
            f"FFmpeg error creating WebP: {e.stderr.decode() if getattr(e, 'stderr', None) else e}"
        )
        return False
    except Exception as e:
        logger.error(f"Error creating WebP thumbnail for {video_path}: {e}")
        return False


def scan_video_directory() -> ScanHistory:
    """
    動画ディレクトリをスキャンして DB を更新
    - 既存判定を file_path_hash（= 相対パスの SHA-256）で実施
    - ファイル移動検出は「ファイル名＋サイズ」で既存更新
    - サムネイルは WebP を生成（既存の GIF 関数は保持）
    """
    scan_history = ScanHistory.objects.create()

    video_dir = settings.VIDEO_DIR
    webp_dir = getattr(settings, "WEBP_DIR", os.path.join(settings.MEDIA_ROOT, "webp"))

    # 必要ディレクトリ作成
    try:
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        os.makedirs(video_dir, exist_ok=True)
        os.makedirs(webp_dir, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to prepare media directories: {e}")
        scan_history.status = "failed"
        scan_history.errors = [f"Failed to prepare media directories: {e}"]
        scan_history.completed_at = timezone.now()
        scan_history.save()
        return scan_history

    video_exts = {
        ".mp4",
        ".avi",
        ".mkv",
        ".mov",
        ".wmv",
        ".flv",
        ".webm",
        ".m4v",
        ".mpg",
        ".mpeg",
    }

    files_scanned = files_added = files_updated = duplicates_found = 0
    errors: list[str] = []

    try:
        for root, _, files in os.walk(video_dir):
            for filename in files:
                if not any(filename.lower().endswith(ext) for ext in video_exts):
                    continue

                files_scanned += 1
                file_path = os.path.join(root, filename)

                try:
                    file_size = os.path.getsize(file_path)
                    relative_path = os.path.relpath(
                        file_path, settings.MEDIA_ROOT
                    ).replace("\\", "/")
                    path_hash = _sha256_hex(relative_path)

                    # 1) パス（ハッシュ）で厳密一致（重複ユニークキーと合致）
                    existing = File.objects.filter(file_path_hash=path_hash).first()

                    if existing:
                        # パスは同じ。サイズやメタが変わっていた場合のみ更新
                        changed = False
                        if existing.file_size != file_size:
                            existing.file_size = file_size
                            changed = True
                        if changed:
                            existing.save(update_fields=["file_size", "updated_at"])
                            files_updated += 1
                        continue

                    # 2) “ファイル名＋サイズ” で移動検出（元コードの挙動を保持） :contentReference[oaicite:5]{index=5}
                    moved = File.objects.filter(
                        file_name=filename, file_size=file_size
                    ).first()
                    if moved:
                        moved.file_path = relative_path
                        # file_path_hash は save() で自動更新される（モデルの save を維持） :contentReference[oaicite:6]{index=6}
                        moved.save(update_fields=["file_path", "updated_at"])
                        files_updated += 1
                        continue

                    # 3) 新規作成
                    md5_hash = calculate_md5_partial(file_path)
                    if not md5_hash:
                        errors.append(f"Failed to calculate MD5 for {file_path}")
                        continue

                    # 新規ファイルは初期状態でduplicate_flag=False
                    # 重複検出は後でcheck_and_mark_duplicates()で一括処理
                    is_dup = False

                    info = get_video_info(file_path)

                    # WebP サムネイルを生成
                    webp_filename = f"{os.path.splitext(filename)[0]}.webp"
                    webp_path = os.path.join(webp_dir, webp_filename)
                    webp_ok = create_webp_thumbnail(file_path, webp_path)

                    rec = File.objects.create(
                        file_name=filename,
                        file_path=relative_path,
                        file_size=file_size,
                        md5_hash=md5_hash,
                        duplicate_flag=is_dup,
                    )

                    if info:
                        rec.video_duration = info["duration"]
                        rec.width = info["width"]
                        rec.height = info["height"]
                        rec.fps = info["fps"]
                        rec.codec = info["codec"]
                        rec.bitrate = info["bitrate"]

                    if webp_ok:
                        # 相対パスで保存（例: webp/xxx.webp）
                        rec.thumbnail_file_path = f"webp/{webp_filename}"

                    rec.save()
                    files_added += 1
                    logger.info(f"Added file: {filename}")

                except Exception as e:
                    msg = f"Error processing file {file_path}: {e}"
                    logger.error(msg)
                    errors.append(msg)

        scan_history.completed_at = timezone.now()
        scan_history.status = "completed"
        scan_history.files_scanned = files_scanned
        scan_history.files_added = files_added
        scan_history.files_updated = files_updated
        scan_history.duplicates_found = duplicates_found
        scan_history.errors = errors
        scan_history.save()
        logger.info(
            f"Scan completed: {files_scanned} scanned, {files_added} added, "
            f"{files_updated} updated, {duplicates_found} duplicates"
        )

    except Exception as e:
        msg = f"Scan failed: {e}"
        logger.error(msg)
        scan_history.completed_at = timezone.now()
        scan_history.status = "failed"
        scan_history.errors = [msg]
        scan_history.save()

    return scan_history


def check_and_mark_duplicates() -> int:
    """
    すべてのファイルの重複をチェックして duplicate_flag を更新
    同じサイズ・同じMD5のファイルが2つ以上ある場合のみ重複とマーク
    """
    from django.db.models import Count

    # まず全ファイルの重複フラグをクリア
    File.objects.all().update(duplicate_flag=False)

    # ファイルサイズとMD5ハッシュが同じファイルのグループを取得（2つ以上）
    groups = (
        File.objects.values("file_size", "md5_hash")
        .annotate(count=Count("id"))
        .filter(count__gt=1)
    )

    marked = 0
    for g in groups:
        # このグループに属するファイルをすべて重複としてマーク
        updated = File.objects.filter(
            file_size=g["file_size"],
            md5_hash=g["md5_hash"],
        ).update(duplicate_flag=True)
        marked += updated

    logger.info(f"Marked {marked} files as duplicates")
    return marked
