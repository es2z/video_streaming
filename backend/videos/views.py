# backend/videos/views.py
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
                Q(file_path__icontains=search) |
                Q(tags__tag_name__icontains=search)
            ).distinct()
        
        # ソート
        sort_by = params.get('sort_by', '-created_at')
        queryset = queryset.order_by(sort_by)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='all')
    def all_files(self, request):
        """削除されていないすべてのファイル"""
        queryset = self.get_queryset().filter(delete_flag=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='no-folder')
    def no_folder_files(self, request):
        """フォルダに属さないファイル"""
        queryset = self.get_queryset().filter(folders__isnull=True, delete_flag=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='deleted')
    def deleted_files(self, request):
        """削除フラグの付いたファイル"""
        queryset = self.get_queryset().filter(delete_flag=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='duplicates')
    def duplicate_files(self, request):
        """重複フラグが付いたファイル"""
        queryset = self.get_queryset().filter(duplicate_flag=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = FileListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = FileListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class FolderViewSet(viewsets.ModelViewSet):
    """フォルダビューセット"""
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
    
    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        """フォルダツリーを取得"""
        def build_tree(parent=None):
            nodes = Folder.objects.filter(parent=parent).annotate(
                file_count=Count('files')
            )
            folders = []
            for node in nodes:
                folders.append({
                    'id': node.id,
                    'name': node.name,
                    'children': build_tree(node),
                    'file_count': node.file_count
                })
            return folders
        
        tree = build_tree()
        return Response(tree)


class TagViewSet(viewsets.ModelViewSet):
    """タグビューセット"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    
    @action(detail=False, methods=['get'], url_path='popular')
    def popular(self, request):
        """人気のタグを取得"""
        limit = int(request.query_params.get('limit', 20))
        tags = Tag.objects.annotate(num_files=Count('files')).order_by('-num_files')[:limit]
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """タグ検索"""
        q = request.query_params.get('q', '')
        tags = Tag.objects.filter(tag_name__icontains=q)[:50]
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)


class GroupViewSet(viewsets.ModelViewSet):
    """グループビューセット"""
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
    
    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        """最新のスキャン履歴を取得"""
        latest = self.queryset.first()
        if latest:
            serializer = self.get_serializer(latest)
            return Response(serializer.data)
        return Response({'message': 'No scan history found'}, status=status.HTTP_404_NOT_FOUND)
