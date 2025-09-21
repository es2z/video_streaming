"""
Models for video streaming application.
"""

import hashlib
from django.db import models
from django.core.validators import MinValueValidator
import json


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


class Group(models.Model):
    """タググループモデル"""
    name = models.CharField(max_length=100, unique=True, verbose_name='グループ名')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'video_groups'
        verbose_name = 'タググループ'
        verbose_name_plural = 'タググループ'
        ordering = ['name']

    def __str__(self):
        return self.name


class Tag(models.Model):
    """タグモデル"""
    tag_name = models.CharField(max_length=100, unique=True, verbose_name='タグ名')
    groups = models.ManyToManyField(Group, related_name='tags', blank=True, verbose_name='所属グループ')
    usage_count = models.IntegerField(default=0, validators=[MinValueValidator(0)], verbose_name='使用回数')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tags'
        verbose_name = 'タグ'
        verbose_name_plural = 'タグ'
        ordering = ['-usage_count', 'tag_name']

    def __str__(self):
        return self.tag_name

    def increment_usage(self):
        """使用回数をインクリメント"""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])


class Folder(models.Model):
    """フォルダモデル"""
    folder_name = models.CharField(max_length=255, verbose_name='フォルダ名')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='親フォルダ'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'folders'
        verbose_name = 'フォルダ'
        verbose_name_plural = 'フォルダ'
        ordering = ['parent__id', 'folder_name']
        unique_together = [['folder_name', 'parent']]

    def __str__(self):
        if self.parent:
            return f"{self.parent} / {self.folder_name}"
        return self.folder_name

    def get_full_path(self):
        """フルパスを取得"""
        if self.parent:
            return f"{self.parent.get_full_path()}/{self.folder_name}"
        return self.folder_name

    def get_ancestors(self):
        """祖先フォルダのリストを取得"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors


class File(models.Model):
    """ファイルモデル"""
    file_name = models.CharField(max_length=255, verbose_name='ファイル名')
    file_path = models.CharField(max_length=255, verbose_name='ファイルパス', db_index=True)
    # 追加フィールド：固定長ハッシュ（SHA-256）。このフィールドをユニークキーとして使い、MySQLのインデックス長エラーを回避する
    file_path_hash = models.CharField(max_length=64, unique=True, editable=False, null=True, blank=True, verbose_name='ファイルパスハッシュ', db_index=True)

    file_size = models.BigIntegerField(validators=[MinValueValidator(0)], verbose_name='ファイルサイズ（バイト）')
    md5_hash = models.CharField(max_length=32, db_index=True, verbose_name='MD5ハッシュ')
    video_duration = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)], verbose_name='動画の長さ（秒）')
    folders = models.ManyToManyField(Folder, related_name='files', blank=True, verbose_name='所属フォルダ')
    tags = models.ManyToManyField('Tag', related_name='files', blank=True, verbose_name='タグ')
    delete_flag = models.BooleanField(default=False, db_index=True, verbose_name='削除フラグ')
    duplicate_flag = models.BooleanField(default=False, db_index=True, verbose_name='重複フラグ')
    thumbnail_file_path = models.CharField(max_length=255, null=True, blank=True, verbose_name='サムネイルGIFパス')

    # メタデータ用のJSONフィールド
    metadata = models.JSONField(default=dict, blank=True, verbose_name='メタデータ')

    # 動画情報
    width = models.IntegerField(null=True, blank=True, verbose_name='動画の幅')
    height = models.IntegerField(null=True, blank=True, verbose_name='動画の高さ')
    fps = models.FloatField(null=True, blank=True, verbose_name='FPS')
    codec = models.CharField(max_length=50, null=True, blank=True, verbose_name='コーデック')
    bitrate = models.IntegerField(null=True, blank=True, verbose_name='ビットレート')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'files'
        verbose_name = 'ファイル'
        verbose_name_plural = 'ファイル'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['file_size', 'md5_hash']),
            models.Index(fields=['delete_flag', 'duplicate_flag']),
        ]

    def __str__(self):
        return self.file_name

    def add_tag(self, tag_name):
        """タグを追加"""
        tag, created = Tag.objects.get_or_create(tag_name=tag_name)
        self.tags.add(tag)
        tag.increment_usage()
        return tag

    def remove_tag(self, tag_name):
        """タグを削除"""
        try:
            tag = Tag.objects.get(tag_name=tag_name)
            self.tags.remove(tag)
            if tag.usage_count > 0:
                tag.usage_count -= 1
                tag.save(update_fields=['usage_count'])
        except Tag.DoesNotExist:
            pass

    def add_to_folder(self, folder):
        """フォルダに追加"""
        self.folders.add(folder)

    def remove_from_folder(self, folder):
        """フォルダから削除"""
        self.folders.remove(folder)

    def mark_as_deleted(self):
        """削除フラグを設定"""
        self.delete_flag = True
        self.save(update_fields=['delete_flag', 'updated_at'])

    def restore(self):
        """削除フラグを解除"""
        self.delete_flag = False
        self.save(update_fields=['delete_flag', 'updated_at'])

    def mark_as_duplicate(self):
        """重複フラグを設定"""
        self.duplicate_flag = True
        self.save(update_fields=['duplicate_flag', 'updated_at'])

    def get_relative_thumbnail_path(self):
        """相対サムネイルパスを取得"""
        if self.thumbnail_file_path:
            return self.thumbnail_file_path.replace('\\', '/')
        return None

    # ここに save() を追加してハッシュをセットする（既存メソッドは消していません）
    def save(self, *args, **kwargs):
        # file_path が設定されているなら SHA-256 を計算して file_path_hash に入れる
        if self.file_path:
            self.file_path_hash = sha256_hex(self.file_path)
        super().save(*args, **kwargs)


class ScanHistory(models.Model):
    """ファイルスキャン履歴"""
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='開始時刻')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完了時刻')
    status = models.CharField(
        max_length=20,
        choices=[
            ('running', '実行中'),
            ('completed', '完了'),
            ('failed', '失敗'),
        ],
        default='running',
        verbose_name='ステータス'
    )
    files_scanned = models.IntegerField(default=0, verbose_name='スキャン済みファイル数')
    files_added = models.IntegerField(default=0, verbose_name='追加ファイル数')
    files_updated = models.IntegerField(default=0, verbose_name='更新ファイル数')
    duplicates_found = models.IntegerField(default=0, verbose_name='重複ファイル数')
    errors = models.JSONField(default=list, blank=True, verbose_name='エラー')

    class Meta:
        db_table = 'scan_history'
        verbose_name = 'スキャン履歴'
        verbose_name_plural = 'スキャン履歴'
        ordering = ['-started_at']

    def __str__(self):
        return f"Scan {self.started_at.strftime('%Y-%m-%d %H:%M:%S')}"
