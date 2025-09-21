# backend/videos/urls.py
"""
URL routing for videos application.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileViewSet,
    FolderViewSet,
    TagViewSet,
    GroupViewSet,
    ScanView,
    ScanHistoryViewSet,
)

router = DefaultRouter()
router.register(r"files", FileViewSet, basename="file")
router.register(r"folders", FolderViewSet, basename="folder")
router.register(r"tags", TagViewSet, basename="tag")
router.register(r"groups", GroupViewSet, basename="group")
router.register(r"scan-history", ScanHistoryViewSet, basename="scan-history")

urlpatterns = [
    # 先に“特殊一覧”の静的ルートを置いて、routerの <pk> と取り違えないようにする
    path("files/all/", FileViewSet.as_view({"get": "all_files"}), name="all-files"),
    path(
        "files/no-folder/",
        FileViewSet.as_view({"get": "no_folder_files"}),
        name="no-folder-files",
    ),
    path(
        "files/deleted/",
        FileViewSet.as_view({"get": "deleted_files"}),
        name="deleted-files",
    ),
    path(
        "files/duplicates/",
        FileViewSet.as_view({"get": "duplicate_files"}),
        name="duplicate-files",
    ),
    # 通常の ViewSet ルート
    path("", include(router.urls)),
    # 強制スキャン
    path("force_refresh/", ScanView.as_view(), name="force-refresh"),
]
