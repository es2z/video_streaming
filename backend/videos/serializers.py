# backend/videos/serializers.py
"""
Serializers for video streaming application.
"""

from typing import List, Dict, Any
from django.conf import settings
from django.utils import timezone
from django.utils.timezone import is_naive, make_aware, get_current_timezone
from rest_framework import serializers

from .models import File, Folder, Tag, Group, ScanHistory


# ----------------------------
# Group / Tag
# ----------------------------
class GroupSerializer(serializers.ModelSerializer):
    """タググループ"""

    tags_count = serializers.IntegerField(source="tags.count", read_only=True)

    class Meta:
        model = Group
        fields = ["id", "name", "tags_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class TagSerializer(serializers.ModelSerializer):
    """タグ"""

    groups = GroupSerializer(many=True, read_only=True)
    # 書き込み用
    group_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        write_only=True,
        required=False,
        source="groups",
    )

    class Meta:
        model = Tag
        fields = [
            "id",
            "tag_name",
            "groups",
            "group_ids",
            "usage_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["usage_count", "created_at", "updated_at"]


# ----------------------------
# Folder
# ----------------------------
class FolderSerializer(serializers.ModelSerializer):
    """フォルダ"""

    full_path = serializers.CharField(source="get_full_path", read_only=True)
    children_count = serializers.IntegerField(source="children.count", read_only=True)
    files_count = serializers.IntegerField(source="files.count", read_only=True)

    # parentを明示的に定義してrequired=Falseを設定
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Folder
        fields = [
            "id",
            "folder_name",
            "parent",
            "full_path",
            "children_count",
            "files_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, data):
        """循環参照を防止"""
        new_parent = (
            data.get("parent")
            if "parent" in data
            else getattr(self.instance, "parent", None)
        )
        current = self.instance
        while new_parent is not None:
            if current and new_parent.id == current.id:
                raise serializers.ValidationError("親フォルダに自身は指定できません。")
            new_parent = new_parent.parent
        return data


# ----------------------------
# File（一覧用）
# ----------------------------
class FileListSerializer(serializers.ModelSerializer):
    """ファイル一覧"""

    # 表示用
    duration_hms = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    folder_ids = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True, source="folders"
    )
    tag_names = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="tag_name", source="tags"
    )

    class Meta:
        model = File
        fields = [
            "id",
            "file_name",
            "file_path",
            "file_size",
            "md5_hash",
            "video_duration",
            "duration_hms",
            "width",
            "height",
            "fps",
            "codec",
            "bitrate",
            "delete_flag",
            "duplicate_flag",
            "thumbnail_file_path",
            "thumbnail_url",
            "folder_ids",
            "tag_names",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_duration_hms(self, obj: File) -> str:
        if obj.video_duration is None:
            return "-"
        total = int(obj.video_duration)
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h}:{m:02d}:{s:02d}" if h > 0 else f"{m}:{s:02d}"

    def get_thumbnail_url(self, obj: File) -> str | None:
        if not obj.thumbnail_file_path:
            return None
        # 例: /media/webp/xxxx.webp
        base = getattr(settings, "MEDIA_URL", "/media/")
        return f"{base}{obj.thumbnail_file_path}".replace("//", "/")


# ----------------------------
# File（詳細用）
# ----------------------------
class FileDetailSerializer(serializers.ModelSerializer):
    """ファイル詳細"""

    folders = FolderSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    duration_hms = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    # 書き込み用
    folder_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Folder.objects.all(),
        write_only=True,
        required=False,
        source="folders",
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        write_only=True,
        required=False,
        source="tags",
    )

    class Meta:
        model = File
        fields = [
            "id",
            "file_name",
            "file_path",
            "file_size",
            "md5_hash",
            "video_duration",
            "duration_hms",
            "width",
            "height",
            "fps",
            "codec",
            "bitrate",
            "delete_flag",
            "duplicate_flag",
            "thumbnail_file_path",
            "thumbnail_url",
            "metadata",
            "folders",
            "tags",
            "folder_ids",
            "tag_ids",
            "created_at",
            "updated_at",
            "last_accessed",
        ]

    def get_duration_hms(self, obj: File) -> str:
        if obj.video_duration is None:
            return "-"
        total = int(obj.video_duration)
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h}:{m:02d}:{s:02d}" if h > 0 else f"{m}:{s:02d}"

    def get_thumbnail_url(self, obj: File) -> str | None:
        if not obj.thumbnail_file_path:
            return None
        base = getattr(settings, "MEDIA_URL", "/media/")
        return f"{base}{obj.thumbnail_file_path}".replace("//", "/")

    def update(self, instance: File, validated_data: Dict[str, Any]) -> File:
        # M2M は pop してから set
        folders = validated_data.pop("folders", None)
        tags = validated_data.pop("tags", None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if folders is not None:
            instance.folders.set(folders)
        if tags is not None:
            instance.tags.set(tags)

        return instance


# ----------------------------
# File（一括操作）
# ----------------------------
class FileBulkActionSerializer(serializers.Serializer):
    """一括操作"""

    ACTIONS = (
        "mark_deleted",
        "restore",
        "mark_duplicate",
        "add_tags",
        "remove_tags",
        "add_to_folder",
        "remove_from_folder",
    )

    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=False
    )
    action = serializers.ChoiceField(choices=ACTIONS)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False
    )
    folder_id = serializers.IntegerField(min_value=1, required=False)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        action = attrs["action"]
        if action in ("add_tags", "remove_tags") and "tag_ids" not in attrs:
            raise serializers.ValidationError("tag_ids が必要です。")
        if (
            action in ("add_to_folder", "remove_from_folder")
            and "folder_id" not in attrs
        ):
            raise serializers.ValidationError("folder_id が必要です。")
        return attrs

    def perform(self) -> Dict[str, Any]:
        ids: List[int] = self.validated_data["ids"]
        action: str = self.validated_data["action"]

        files = File.objects.filter(id__in=ids)
        affected = files.count()

        if action == "mark_deleted":
            files.update(delete_flag=True)
        elif action == "restore":
            files.update(delete_flag=False)
        elif action == "mark_duplicate":
            files.update(duplicate_flag=True)
        elif action in ("add_tags", "remove_tags"):
            tag_ids: List[int] = self.validated_data["tag_ids"]
            tags = Tag.objects.filter(id__in=tag_ids)
            for f in files:
                if action == "add_tags":
                    f.tags.add(*tags)
                else:
                    f.tags.remove(*tags)
        elif action in ("add_to_folder", "remove_from_folder"):
            folder_id: int = self.validated_data["folder_id"]
            try:
                folder = Folder.objects.get(id=folder_id)
            except Folder.DoesNotExist:
                raise serializers.ValidationError("指定されたフォルダが存在しません。")
            for f in files:
                if action == "add_to_folder":
                    f.folders.add(folder)
                else:
                    f.folders.remove(folder)

        return {"affected": affected, "action": action}


# ----------------------------
# ScanHistory
# ----------------------------
class ScanHistorySerializer(serializers.ModelSerializer):
    """スキャン履歴"""

    duration_seconds = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()

    class Meta:
        model = ScanHistory
        fields = [
            "id",
            "started_at",
            "completed_at",
            "status",
            "files_scanned",
            "files_added",
            "files_updated",
            "duplicates_found",
            "errors",
            "duration_seconds",
            "duration_display",
        ]

    def _ensure_aware(self, dt):
        """naive/aware を吸収して aware に揃える"""
        if dt is None:
            return None
        if is_naive(dt):
            try:
                return make_aware(dt, get_current_timezone())
            except Exception:
                # 万一失敗したら（UTC として）最低限比較可能にする
                return make_aware(dt)
        return dt

    def get_duration_seconds(self, obj: ScanHistory) -> int | None:
        if not obj.started_at or not obj.completed_at:
            return None
        end = self._ensure_aware(obj.completed_at)
        start = self._ensure_aware(obj.started_at)
        return int((end - start).total_seconds())

    def get_duration_display(self, obj: ScanHistory) -> str:
        sec = self.get_duration_seconds(obj)
        if sec is None:
            return "実行中..." if obj.status == "running" else "-"
        h = sec // 3600
        m = (sec % 3600) // 60
        s = sec % 60
        return f"{h}時間{m}分{s}秒" if h > 0 else (f"{m}分{s}秒" if m > 0 else f"{s}秒")
