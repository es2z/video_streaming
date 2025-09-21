"""
Serializers for video streaming application.
"""

from rest_framework import serializers
from .models import File, Folder, Tag, Group, ScanHistory


class GroupSerializer(serializers.ModelSerializer):
    """タググループシリアライザー"""
    tags_count = serializers.IntegerField(source='tags.count', read_only=True)
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'tags_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class TagSerializer(serializers.ModelSerializer):
    """タグシリアライザー"""
    groups = GroupSerializer(many=True, read_only=True)
    group_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Group.objects.all(), 
        write_only=True, 
        required=False,
        source='groups'
    )
    
    class Meta:
        model = Tag
        fields = ['id', 'tag_name', 'groups', 'group_ids', 'usage_count', 'created_at', 'updated_at']
        read_only_fields = ['usage_count', 'created_at', 'updated_at']


class FolderSerializer(serializers.ModelSerializer):
    """フォルダシリアライザー"""
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    children_count = serializers.IntegerField(source='children.count', read_only=True)
    files_count = serializers.IntegerField(source='files.count', read_only=True)
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        source='parent',
        allow_null=True,
        required=False
    )
    
    class Meta:
        model = Folder
        fields = [
            'id', 'folder_name', 'parent', 'parent_id', 'full_path', 
            'children_count', 'files_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """循環参照のチェック"""
        if self.instance and 'parent' in data:
            parent = data['parent']
            if parent:
                # 自分自身を親にできない
                if parent.id == self.instance.id:
                    raise serializers.ValidationError("フォルダは自分自身を親にできません。")
                
                # 自分の子孫を親にできない
                current = parent
                while current.parent:
                    if current.parent.id == self.instance.id:
                        raise serializers.ValidationError("フォルダの子孫を親にすることはできません。")
                    current = current.parent
        
        return data


class FileListSerializer(serializers.ModelSerializer):
    """ファイルリスト用シリアライザー（軽量版）"""
    thumbnail_url = serializers.SerializerMethodField()
    folder_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        source='folders',
        read_only=True
    )
    tag_names = serializers.StringRelatedField(
        many=True,
        source='tags',
        read_only=True
    )
    
    class Meta:
        model = File
        fields = [
            'id', 'file_name', 'file_size', 'video_duration',
            'folder_ids', 'tag_names', 'delete_flag', 'duplicate_flag',
            'thumbnail_url', 'created_at', 'updated_at'
        ]
    
    def get_thumbnail_url(self, obj):
        """サムネイルURLを取得"""
        if obj.thumbnail_file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{obj.get_relative_thumbnail_path()}')
        return None


class FileDetailSerializer(serializers.ModelSerializer):
    """ファイル詳細シリアライザー"""
    folders = FolderSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    folder_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Folder.objects.all(),
        write_only=True,
        required=False,
        source='folders'
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        write_only=True,
        required=False,
        source='tags'
    )
    tag_names = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = File
        fields = [
            'id', 'file_name', 'file_path', 'file_size', 'md5_hash',
            'video_duration', 'folders', 'folder_ids', 'tags', 'tag_ids', 'tag_names',
            'delete_flag', 'duplicate_flag', 'thumbnail_url', 'video_url',
            'metadata', 'width', 'height', 'fps', 'codec', 'bitrate',
            'created_at', 'updated_at', 'last_accessed'
        ]
        read_only_fields = [
            'file_path', 'file_size', 'md5_hash', 'video_duration',
            'width', 'height', 'fps', 'codec', 'bitrate',
            'created_at', 'updated_at'
        ]
    
    def get_thumbnail_url(self, obj):
        """サムネイルURLを取得"""
        if obj.thumbnail_file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{obj.get_relative_thumbnail_path()}')
        return None
    
    def get_video_url(self, obj):
        """動画URLを取得"""
        request = self.context.get('request')
        if request:
            relative_path = obj.file_path.replace('\\', '/')
            if relative_path.startswith('media/'):
                relative_path = relative_path[6:]
            return request.build_absolute_uri(f'/media/{relative_path}')
        return None
    
    def update(self, instance, validated_data):
        """更新処理"""
        # タグ名からタグを作成/取得
        tag_names = validated_data.pop('tag_names', None)
        if tag_names is not None:
            for tag_name in tag_names:
                instance.add_tag(tag_name)
        
        # フォルダとタグの更新
        folders = validated_data.pop('folders', None)
        tags = validated_data.pop('tags', None)
        
        instance = super().update(instance, validated_data)
        
        if folders is not None:
            instance.folders.set(folders)
        
        if tags is not None:
            instance.tags.set(tags)
            # 使用回数の更新
            for tag in tags:
                tag.increment_usage()
        
        return instance


class FileBulkActionSerializer(serializers.Serializer):
    """ファイル一括操作用シリアライザー"""
    file_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    action = serializers.ChoiceField(
        choices=[
            ('delete', '削除フラグ設定'),
            ('restore', '削除フラグ解除'),
            ('add_to_folder', 'フォルダに追加'),
            ('remove_from_folder', 'フォルダから削除'),
            ('add_tags', 'タグ追加'),
            ('remove_tags', 'タグ削除'),
        ],
        required=True
    )
    folder_id = serializers.IntegerField(required=False)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    tag_names = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )


class ScanHistorySerializer(serializers.ModelSerializer):
    """スキャン履歴シリアライザー"""
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = ScanHistory
        fields = [
            'id', 'started_at', 'completed_at', 'status',
            'files_scanned', 'files_added', 'files_updated',
            'duplicates_found', 'errors', 'duration'
        ]
    
    def get_duration(self, obj):
        """実行時間を取得"""
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            return delta.total_seconds()
        return None