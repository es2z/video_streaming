"""
URL routing for videos application.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileViewSet, FolderViewSet, TagViewSet, GroupViewSet,
    ScanView, ScanHistoryViewSet
)

router = DefaultRouter()
router.register(r'files', FileViewSet, basename='file')
router.register(r'folders', FolderViewSet, basename='folder')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'scan-history', ScanHistoryViewSet, basename='scan-history')

urlpatterns = [
    path('', include(router.urls)),
    path('force_refresh/', ScanView.as_view(), name='force-refresh'),
    
    # 特殊なファイルリスト用エンドポイント
    path('files/all/', FileViewSet.as_view({'get': 'all_files'}), name='all-files'),
    path('files/no-folder/', FileViewSet.as_view({'get': 'no_folder_files'}), name='no-folder-files'),
    path('files/deleted/', FileViewSet.as_view({'get': 'deleted_files'}), name='deleted-files'),
    path('files/duplicates/', FileViewSet.as_view({'get': 'duplicate_files'}), name='duplicate-files'),
]