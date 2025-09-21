# backend/videos/apps.py
import os
import sys
import threading
import logging
import importlib
from typing import Optional, Tuple, Set

from django.apps import AppConfig, apps as django_apps
from django.db import connection
from django.db.models.signals import post_migrate

logger = logging.getLogger(__name__)


class VideosConfig(AppConfig):
    name = 'videos'
    verbose_name = 'Videos'

    def __init__(self, app_name, app_module):
        super().__init__(app_name, app_module)
        # スキャン開始済みフラグ（重複起動防止）
        self._scans_started = False
        # post_migrate ハンドラ登録用フラグ
        self._post_migrate_connected = False

    # ------------------------------------------------------------------
    # DB 準備が整っているかを判定するユーティリティ
    # モデルの _meta.db_table を動的に参照することで、
    # db_table 名を変更しても追従できるようにする。
    # ------------------------------------------------------------------
    def _db_ready(self) -> bool:
        try:
            existing_tables: Set[str] = set(connection.introspection.table_names())
        except Exception as e:
            logger.debug("Failed to introspect DB tables: %s", e)
            return False

        required_model_names = ['ScanHistory', 'File', 'Folder', 'Tag', 'Group']
        required_tables = set()
        for mname in required_model_names:
            try:
                model = django_apps.get_model('videos', mname)
            except LookupError:
                # モデルがロードされていない（アプリ未ロードなど）
                logger.debug("Model videos.%s not available yet", mname)
                return False
            required_tables.add(model._meta.db_table)

        missing = required_tables - existing_tables
        if missing:
            logger.debug("DB missing required tables: %s", missing)
            return False
        return True

    # ------------------------------------------------------------------
    # スキャン関数（initial_scan, periodic_scan）を探して返す
    # 探索候補モジュールはプロジェクト差で異なるため複数候補を見る
    # ------------------------------------------------------------------
    def _find_scan_functions(self) -> Tuple[Optional[callable], Optional[callable]]:
        candidates = [
            'videos.scanner',
            'videos.tasks',
            'videos.scan',
            'videos.utils',
            'videos.management.scan',  # まれに管理コマンド配下
        ]
        initial_scan = None
        periodic_scan = None
        for modname in candidates:
            try:
                mod = importlib.import_module(modname)
            except Exception:
                continue
            # 明示的に関数名を探す
            if hasattr(mod, 'initial_scan'):
                initial_scan = getattr(mod, 'initial_scan')
            if hasattr(mod, 'periodic_scan'):
                periodic_scan = getattr(mod, 'periodic_scan')
            # もしモジュールがクラス内実装であれば属性名違いの可能性もあるが
            # 最低限上記2つが見つかれば十分。
            if initial_scan or periodic_scan:
                logger.debug("Found scan module %s (initial=%s periodic=%s)", modname, bool(initial_scan), bool(periodic_scan))
                break
        return initial_scan, periodic_scan

    # ------------------------------------------------------------------
    # 実際にスキャンスレッドを起動する。重複起動しないようにチェックする。
    # ------------------------------------------------------------------
    def _start_scans(self):
        if self._scans_started:
            logger.debug("Scans already started; skip.")
            return

        initial_scan, periodic_scan = self._find_scan_functions()

        if not initial_scan and not periodic_scan:
            logger.warning("No scan entrypoints found (initial_scan / periodic_scan). Skipping automatic scan startup.")
            return

        # 起動用ラッパー。例外が出てもスレッドが潰れないようにする。
        def _safe_run(func, *args, **kwargs):
            try:
                logger.info("Starting scan function: %s", getattr(func, '__name__', repr(func)))
                func(*args, **kwargs)
            except Exception:
                logger.exception("Exception occurred while running scan function %s", getattr(func, '__name__', repr(func)))

        # initial_scan は一度だけ起動（バックグラウンド）
        if initial_scan:
            t = threading.Thread(target=_safe_run, args=(initial_scan,), daemon=True, name='videos.initial_scan')
            t.start()
            logger.info("Initial scan thread started.")

        # periodic_scan はデーモンスレッドで起動（実装側でループ/スリープ管理する想定）
        if periodic_scan:
            t2 = threading.Thread(target=_safe_run, args=(periodic_scan,), daemon=True, name='videos.periodic_scan')
            t2.start()
            logger.info("Periodic scan thread started.")

        self._scans_started = True

    # ------------------------------------------------------------------
    # post_migrate シグナルハンドラ（マイグレーション完了後に呼ばれる）
    # DB が未準備で起動時にスキップされた場合、ここで再チェックしてスキャンを開始する
    # ------------------------------------------------------------------
    def _on_post_migrate(self, **kwargs):
        # 開発サーバの再読み込み子プロセス対策
        if os.environ.get('RUN_MAIN') != 'true':
            return
        # 既に起動済みなら無視
        if self._scans_started:
            return
        # テーブルが用意できているか再チェック
        if self._db_ready():
            logger.info("DB ready after migrations; starting scans via post_migrate handler.")
            self._start_scans()
        else:
            logger.debug("post_migrate: DB still not ready; skipping start.")

    # ------------------------------------------------------------------
    # AppConfig.ready(): Django 起動時に呼ばれる
    # - RUN_MAIN チェックで子プロセスを除外
    # - runserver からの起動時のみ自動スキャンを検討
    # - DB が未準備なら post_migrate で開始するよう接続
    # ------------------------------------------------------------------
    def ready(self):
        # 開発サーバのリロード子プロセスでは実行しない（重複防止）
        if os.environ.get('RUN_MAIN') != 'true':
            return

        # まず runserver / daphne などサーバ起動コマンドかどうかを判定
        is_server = any(k in ' '.join(sys.argv) for k in ('runserver', 'daphne', 'gunicorn', 'uvicorn'))

        if not is_server:
            # サーバ以外（manage.py migrate 等）のときはスキャンを開始しない
            logger.debug("Not a server process (sys.argv: %s). Skipping automatic scan startup.", sys.argv)
            return

        # DB の準備状況に応じて即時かシグナル待ちかを決める
        try:
            if self._db_ready():
                logger.info("Database ready at startup; starting initial and periodic scans.")
                self._start_scans()
            else:
                logger.warning("Database not ready at startup; connecting post_migrate handler to start scans after migrations.")
                # post_migrate を一度だけ接続する
                if not self._post_migrate_connected:
                    post_migrate.connect(self._on_post_migrate, dispatch_uid=f'videos_post_migrate_{id(self)}')
                    self._post_migrate_connected = True
        except Exception:
            logger.exception("Exception while checking DB readiness in ready(); connecting post_migrate handler as fallback.")
            if not self._post_migrate_connected:
                post_migrate.connect(self._on_post_migrate, dispatch_uid=f'videos_post_migrate_{id(self)}')
                self._post_migrate_connected = True
