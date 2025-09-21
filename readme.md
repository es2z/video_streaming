# 動画配信サイト バックエンド

自宅用の動画配信サイトのバックエンドシステムです。  
Django + Django REST Framework + MySQL + Daphne で構築されています。

## システム要件

- Windows 11
- Python 3.10以上
- MySQL 8.0以上
- Redis（オプション：Celeryを使用する場合）
- FFmpeg（動画処理用）

## 事前準備

### 1. FFmpegのインストール

1. [FFmpeg公式サイト](https://ffmpeg.org/download.html)からWindows用バイナリをダウンロード
2. 適当な場所に解凍（例：`C:\ffmpeg`）
3. システム環境変数のPATHに追加（例：`C:\ffmpeg\bin`）

### 2. MySQLのインストール

1. [MySQL公式サイト](https://dev.mysql.com/downloads/installer/)からMySQL Installerをダウンロード
2. インストール時にrootパスワードを設定

### 3. Redis（オプション）

Celeryを使用する場合：
1. [Redis for Windows](https://github.com/microsoftarchive/redis/releases)からダウンロード
2. インストールしてサービスとして実行

## セットアップ手順

### 1. プロジェクトのクローン/配置

```bash
# プロジェクトフォルダを作成
mkdir video_streaming
cd video_streaming

# ファイルを配置
# - install.bat
# - runserver.bat
# - requirements.txt
# - backend/
```

### 2. インストールの実行

```bash
# install.batを実行
install.bat
```

インストール中に以下の入力が求められます：
1. MySQLのrootパスワード
2. Django管理者アカウントの情報

### 3. 動画ファイルの配置

`media/videos/` フォルダに動画ファイルを配置してください。  
対応フォーマット：mp4, avi, mkv, mov, wmv, flv, webm, m4v, mpg, mpeg

## サーバーの起動

```bash
# runserver.batを実行
runserver.bat
```

サーバーは `http://localhost:8000` で起動します。

## API エンドポイント

### ファイル管理

- `GET /api/files/` - ファイル一覧
- `GET /api/files/all/` - 削除されていないすべてのファイル
- `GET /api/files/no-folder/` - フォルダに属さないファイル
- `GET /api/files/deleted/` - 削除フラグが付いたファイル
- `GET /api/files/duplicates/` - 重複ファイル
- `GET /api/files/{id}/` - ファイル詳細
- `POST /api/files/{id}/mark_deleted/` - 削除フラグ設定
- `POST /api/files/{id}/restore/` - 削除フラグ解除
- `POST /api/files/{id}/add_to_folder/` - フォルダに追加
- `POST /api/files/{id}/remove_from_folder/` - フォルダから削除
- `POST /api/files/{id}/add_tags/` - タグ追加
- `POST /api/files/{id}/remove_tags/` - タグ削除
- `POST /api/files/bulk_action/` - 一括操作

### フォルダ管理

- `GET /api/folders/` - フォルダ一覧
- `GET /api/folders/tree/` - フォルダツリー
- `POST /api/folders/` - フォルダ作成
- `PUT /api/folders/{id}/` - フォルダ更新
- `DELETE /api/folders/{id}/` - フォルダ削除

### タグ管理

- `GET /api/tags/` - タグ一覧
- `GET /api/tags/popular/` - 人気タグ
- `GET /api/tags/search/?q={query}` - タグ検索
- `POST /api/tags/` - タグ作成

### グループ管理

- `GET /api/groups/` - グループ一覧
- `POST /api/groups/` - グループ作成

### システム管理

- `GET /api/force_refresh/` - 強制ファイルスキャン
- `GET /api/scan-history/` - スキャン履歴
- `GET /api/scan-history/latest/` - 最新のスキャン履歴

## 管理画面

Django管理画面: `http://localhost:8000/admin/`

インストール時に作成した管理者アカウントでログイン可能です。

## ディレクトリ構造

```
video_streaming/
├── install.bat           # インストールスクリプト
├── runserver.bat         # サーバー起動スクリプト  
├── requirements.txt      # Python依存関係
├── venv/                 # Python仮想環境
├── backend/              # Djangoプロジェクト
│   ├── manage.py
│   ├── backend/          # プロジェクト設定
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   ├── wsgi.py
│   │   └── celery.py
│   └── videos/           # 動画管理アプリ
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       ├── utils.py
│       ├── tasks.py
│       └── admin.py
├── media/                # メディアファイル
│   ├── videos/           # 動画ファイル
│   └── gifs/             # サムネイルGIF
└── logs/                 # ログファイル
```

## 自動処理

以下の処理が自動的に実行されます：

1. **起動時スキャン**: サーバー起動時に動画ファイルをスキャン
2. **定期スキャン**: 6時間ごとに動画ファイルをスキャン
3. **重複検出**: MD5ハッシュとファイルサイズで重複を検出
4. **GIF生成**: 動画の最初の10秒からサムネイルGIFを自動生成

## トラブルシューティング

### MySQLエラー

```
Error: Can't connect to MySQL server
```
→ MySQLサービスが起動しているか確認

### FFmpegエラー

```
Error: ffmpeg not found
```
→ FFmpegがPATHに追加されているか確認

### ポート使用中エラー

```
Error: [Errno 10048] Only one usage of each socket address
```
→ 8000番ポートが他のアプリで使用されていないか確認

## サービス化（nssm使用）

Windows サービスとして登録する場合：

```bash
# nssmをダウンロードして配置
nssm install VideoStreamingServer "C:\path\to\runserver.bat"
nssm start VideoStreamingServer
```

## 注意事項

- 本システムは自宅内での使用を想定しています
- 外部公開する場合はセキュリティ設定の見直しが必要です
- 大量の動画ファイルがある場合、初回スキャンに時間がかかります

## ライセンス

個人使用のみ