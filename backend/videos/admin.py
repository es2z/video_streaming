"""
Django admin configuration for videos app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import File, Folder, Tag, Group, ScanHistory


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'file_size_display', 'duration_display', 'delete_flag', 'duplicate_flag', 'created_at']
    list_filter = ['delete_flag', 'duplicate_flag', 'created_at', 'folders']
    search_fields = ['file_name', 'md5_hash']
    filter_horizontal = ['folders', 'tags']
    readonly_fields = ['file_path', 'md5_hash', 'file_size', 'video_duration', 'width', 'height', 'fps', 'codec', 'bitrate', 'created_at', 'updated_at']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('file_name', 'file_path', 'file_size', 'md5_hash')
        }),
        ('動画情報', {
            'fields': ('video_duration', 'width', 'height', 'fps', 'codec', 'bitrate')
        }),
        ('分類', {
            'fields': ('folders', 'tags')
        }),
        ('フラグ', {
            'fields': ('delete_flag', 'duplicate_flag')
        }),
        ('サムネイル', {
            'fields': ('thumbnail_file_path',)
        }),
        ('メタデータ', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('タイムスタンプ', {
            'fields': ('created_at', 'updated_at', 'last_accessed')
        })
    )
    
    def file_size_display(self, obj):
        """ファイルサイズを人間が読みやすい形式で表示"""
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} PB"
    file_size_display.short_description = 'ファイルサイズ'
    
    def duration_display(self, obj):
        """動画の長さを時:分:秒形式で表示"""
        if obj.video_duration:
            hours = int(obj.video_duration // 3600)
            minutes = int((obj.video_duration % 3600) // 60)
            seconds = int(obj.video_duration % 60)
            if hours > 0:
                return f"{hours}:{minutes:02d}:{seconds:02d}"
            else:
                return f"{minutes}:{seconds:02d}"
        return "-"
    duration_display.short_description = '動画の長さ'
    
    actions = ['mark_as_deleted', 'restore_files', 'mark_as_duplicate']
    
    def mark_as_deleted(self, request, queryset):
        """選択したファイルに削除フラグを設定"""
        updated = queryset.update(delete_flag=True)
        self.message_user(request, f"{updated}個のファイルに削除フラグを設定しました。")
    mark_as_deleted.short_description = "削除フラグを設定"
    
    def restore_files(self, request, queryset):
        """選択したファイルの削除フラグを解除"""
        updated = queryset.update(delete_flag=False)
        self.message_user(request, f"{updated}個のファイルの削除フラグを解除しました。")
    restore_files.short_description = "削除フラグを解除"
    
    def mark_as_duplicate(self, request, queryset):
        """選択したファイルに重複フラグを設定"""
        updated = queryset.update(duplicate_flag=True)
        self.message_user(request, f"{updated}個のファイルに重複フラグを設定しました。")
    mark_as_duplicate.short_description = "重複フラグを設定"


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ['folder_name', 'parent', 'files_count', 'children_count', 'created_at']
    list_filter = ['created_at', 'parent']
    search_fields = ['folder_name']
    raw_id_fields = ['parent']
    
    def files_count(self, obj):
        """フォルダ内のファイル数"""
        return obj.files.count()
    files_count.short_description = 'ファイル数'
    
    def children_count(self, obj):
        """子フォルダ数"""
        return obj.children.count()
    children_count.short_description = '子フォルダ数'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['tag_name', 'usage_count', 'groups_display', 'created_at']
    list_filter = ['groups', 'created_at']
    search_fields = ['tag_name']
    filter_horizontal = ['groups']
    readonly_fields = ['usage_count', 'created_at', 'updated_at']
    
    def groups_display(self, obj):
        """所属グループを表示"""
        groups = obj.groups.all()
        if groups:
            return ", ".join([g.name for g in groups])
        return "-"
    groups_display.short_description = '所属グループ'


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'tags_count', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    def tags_count(self, obj):
        """グループ内のタグ数"""
        return obj.tags.count()
    tags_count.short_description = 'タグ数'


@admin.register(ScanHistory)
class ScanHistoryAdmin(admin.ModelAdmin):
    list_display = ['started_at', 'status_display', 'files_scanned', 'files_added', 'duplicates_found', 'duration_display']
    list_filter = ['status', 'started_at']
    readonly_fields = ['started_at', 'completed_at', 'status', 'files_scanned', 'files_added', 'files_updated', 'duplicates_found', 'errors']
    
    def status_display(self, obj):
        """ステータスを色付きで表示"""
        colors = {
            'running': 'orange',
            'completed': 'green',
            'failed': 'red'
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'ステータス'
    
    def duration_display(self, obj):
        """実行時間を表示"""
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            total_seconds = int(delta.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            if hours > 0:
                return f"{hours}時間{minutes}分{seconds}秒"
            elif minutes > 0:
                return f"{minutes}分{seconds}秒"
            else:
                return f"{seconds}秒"
        elif obj.status == 'running':
            return "実行中..."
        return "-"
    duration_display.short_description = '実行時間'
    
    def has_add_permission(self, request):
        """手動でスキャン履歴を追加することを防ぐ"""
        return False