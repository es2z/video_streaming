"""
Views for video streaming application.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count
from django.utils import timezone
import logging

from .models import File, Folder, Tag, Group, ScanHistory
from .serializers import (
    FileListSerializer, FileDetailSerializer, FileBulkActionSerializer,
    FolderSerializer, TagSerializer, GroupSerializer, ScanHistorySerializer
)
from .utils import scan_video_directory, check_and_mark_duplicates

logger = logging.getLogger('videos')


class FileViewSet(viewsets.ModelViewSet):
    """ファイルビューセット"""
    queryset = File.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['list']:
            return FileListSerializer
        return FileDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # クエリパラメータでフィルタリング
        params = self.request.query_params
        
        # 削除フラグでフィルタ
        delete_flag = params.get('delete_flag')
        if delete_flag is not None:
            queryset = queryset.filter(delete_flag=delete_flag.lower() == 'true')
        
        # 重複フラグでフィルタ
        duplicate_flag = params.get('duplicate_flag')
        if duplicate_flag is not None:
            queryset = queryset.filter(duplicate_flag=duplicate_flag.lower() == 'true')
        
        # フォルダでフィルタ
        folder_id = params.get('folder_id')
        if folder_id:
            queryset = queryset.filter(folders__id=folder_id)
        
        # フォルダに属さないファイル
        no_folder = params.get('no_folder')
        if no_folder and no_folder.lower() == 'true':
            queryset = queryset.filter(folders__isnull=True)
        
        # タグでフィルタ
        tag_ids = params.getlist('tag_ids')
        if tag_ids:
            queryset = queryset.filter(tags__id__in=tag_ids).distinct()
        
        # 検索
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(file_name__icontains=search) |
                Q(tags__tag_name__icontains=search)
            ).distinct()
        
        # ソート
        sort_by = params.get('sort_by', '-created_at')
        queryset = queryset.order_by(sort_by)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def all_files(self, request):
        """削除されていないすべてのファイル"""
        queryset = self.get_queryset().filter(delete_flag=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def no_folder_files(self, request):
        """フォルダに属さないファイル"""
        queryset = self.get_queryset().filter(folders__isnull=True, delete_flag=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def deleted_files(self, request):
        """削除フラグが付いたファイル"""
        queryset = self.get_queryset().filter(delete_flag=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def duplicate_files(self, request):
        """重複フラグが付いたファイル"""
        queryset = self.get_queryset().filter(duplicate_flag=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_deleted(self, request, pk=None):
        """削除フラグを設定"""
        file = self.get_object()
        file.mark_as_deleted()
        serializer = FileDetailSerializer(file, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """削除フラグを解除"""
        file = self.get_object()
        file.restore()
        serializer = FileDetailSerializer(file, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_to_folder(self, request, pk=None):
        """フォルダに追加"""
        file = self.get_object()
        folder_id = request.data.get('folder_id')
        
        if not folder_id:
            return Response({'error': 'folder_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            folder = Folder.objects.get(id=folder_id)
            file.add_to_folder(folder)
            serializer = FileDetailSerializer(file, context={'request': request})
            return Response(serializer.data)
        except Folder.DoesNotExist:
            return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_from_folder(self, request, pk=None):
        """フォルダから削除"""
        file = self.get_object()
        folder_id = request.data.get('folder_id')
        
        if not folder_id:
            return Response({'error': 'folder_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            folder = Folder.objects.get(id=folder_id)
            file.remove_from_folder(folder)
            serializer = FileDetailSerializer(file, context={'request': request})
            return Response(serializer.data)
        except Folder.DoesNotExist:
            return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def add_tags(self, request, pk=None):
        """タグを追加"""
        file = self.get_object()
        tag_names = request.data.get('tag_names', [])
        
        for tag_name in tag_names:
            file.add_tag(tag_name)
        
        serializer = FileDetailSerializer(file, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_tags(self, request, pk=None):
        """タグを削除"""
        file = self.get_object()
        tag_names = request.data.get('tag_names', [])
        
        for tag_name in tag_names:
            file.remove_tag(tag_name)
        
        serializer = FileDetailSerializer(file, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """一括操作"""
        serializer = FileBulkActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        file_ids = data['file_ids']
        action = data['action']
        
        files = File.objects.filter(id__in=file_ids)
        
        if action == 'delete':
            files.update(delete_flag=True, updated_at=timezone.now())
        elif action == 'restore':
            files.update(delete_flag=False, updated_at=timezone.now())
        elif action == 'add_to_folder':
            folder_id = data.get('folder_id')
            if folder_id:
                try:
                    folder = Folder.objects.get(id=folder_id)
                    for file in files:
                        file.add_to_folder(folder)
                except Folder.DoesNotExist:
                    return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
        elif action == 'remove_from_folder':
            folder_id = data.get('folder_id')
            if folder_id:
                try:
                    folder = Folder.objects.get(id=folder_id)
                    for file in files:
                        file.remove_from_folder(folder)
                except Folder.DoesNotExist:
                    return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
        elif action == 'add_tags':
            tag_names = data.get('tag_names', [])
            for file in files:
                for tag_name in tag_names:
                    file.add_tag(tag_name)
        elif action == 'remove_tags':
            tag_names = data.get('tag_names', [])
            for file in files:
                for tag_name in tag_names:
                    file.remove_tag(tag_name)
        
        return Response({'success': True, 'files_affected': files.count()})
    
    def retrieve(self, request, *args, **kwargs):
        """ファイル詳細取得時に最終アクセス時刻を更新"""
        instance = self.get_object()
        instance.last_accessed = timezone.now()
        instance.save(update_fields=['last_accessed'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class FolderViewSet(viewsets.ModelViewSet):
    """フォルダビューセット"""
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 親フォルダでフィルタ
        parent_id = self.request.query_params.get('parent_id')
        if parent_id == 'null':
            queryset = queryset.filter(parent__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """フォルダツリー構造を取得"""
        def build_tree(parent=None):
            folders = []
            for folder in Folder.objects.filter(parent=parent):
                folder_data = FolderSerializer(folder).data
                folder_data['children'] = build_tree(folder)
                folders.append(folder_data)
            return folders
        
        tree = build_tree()
        return Response(tree)


class TagViewSet(viewsets.ModelViewSet):
    """タグビューセット"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """人気のタグを取得"""
        limit = int(request.query_params.get('limit', 20))
        tags = self.queryset.order_by('-usage_count')[:limit]
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """タグを検索"""
        query = request.query_params.get('q', '')
        if query:
            tags = self.queryset.filter(tag_name__icontains=query)
        else:
            tags = self.queryset.all()
        
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)


class GroupViewSet(viewsets.ModelViewSet):
    """タググループビューセット"""
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class ScanView(APIView):
    """ファイルスキャンビュー"""
    
    def get(self, request, format=None):
        """強制スキャンを実行"""
        logger.info("Starting forced file scan...")
        scan_history = scan_video_directory()
        
        # 重複チェック
        check_and_mark_duplicates()
        
        serializer = ScanHistorySerializer(scan_history)
        return Response(serializer.data)


class ScanHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """スキャン履歴ビューセット"""
    queryset = ScanHistory.objects.all()
    serializer_class = ScanHistorySerializer
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """最新のスキャン履歴を取得"""
        latest = self.queryset.first()
        if latest:
            serializer = self.get_serializer(latest)
            return Response(serializer.data)
        return Response({'message': 'No scan history found'}, status=status.HTTP_404_NOT_FOUND)