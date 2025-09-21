"""
WebSocket routing for videos application.
"""

from django.urls import re_path

# WebSocketのURLパターン（現在は空だが、将来的にリアルタイム機能を追加する場合に使用）
websocket_urlpatterns = [
    # 例: re_path(r'ws/scan-status/$', ScanStatusConsumer.as_asgi()),
]