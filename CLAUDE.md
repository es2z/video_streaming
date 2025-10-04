# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal video streaming web application for home use. The system manages video files with a tag-based folder system (similar to symbolic links - files aren't physically moved) and features a custom video player with advanced controls.

**Tech Stack:**
- Backend: Django 5.0.1 + Django REST Framework + MySQL + Daphne (ASGI)
- Frontend: React 18.2 + Material-UI 5.15 + Vite + Jotai (state management)
- Video Processing: FFmpeg

## Development Commands

### Initial Setup
```bash
# Backend setup (includes MySQL database creation, migrations, superuser creation)
install.bat

# Frontend setup
frontend_install.bat

# Or setup everything at once
complete_setup.bat
```

### Running the Application
```bash
# Start both servers simultaneously
start_all.bat

# Or start individually:
# Backend only (http://localhost:8000)
runserver.bat

# Frontend only (http://localhost:3000)
cd frontend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend Development
```bash
# Activate virtual environment first
call venv\Scripts\activate.bat
cd backend

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Django shell
python manage.py shell

# Run tests (if any)
python manage.py test
```

### System Testing
```bash
# Test entire system setup
test_system.bat
```

## Architecture

### Data Model Philosophy

The system uses a **tag-based folder structure** rather than physical file organization:

- **Files** remain in their physical location (`media/videos/`)
- **Folders** are virtual containers (like playlists/tags)
- Files can belong to multiple folders simultaneously
- Folders support hierarchical structure (parent-child relationships)
- This is implemented via many-to-many relationships in Django

**Key Models:**
- `File`: Stores file metadata, MD5 hash, video info, deletion/duplicate flags
- `Folder`: Virtual folders with parent-child hierarchy
- `Tag`: User-defined tags with usage count tracking
- `Group`: Tag groups for organization
- `ScanHistory`: Tracks file scanning operations

### Backend Structure (Django)

Located in `backend/videos/`:

- `models.py`: Core data models with SHA-256 file path hashing to avoid MySQL index length issues
- `views.py`: REST API endpoints for files, folders, tags, groups
- `serializers.py`: DRF serializers for API responses
- `utils.py`: Video processing utilities (FFmpeg probe, MD5 calculation, thumbnail generation)
- `scanner.py`: File system scanner for detecting new/changed video files
- `tasks.py`: Celery background tasks (periodic scanning)
- `apps.py`: App configuration with startup file scanning

**Important Backend Concepts:**
- Uses `file_path_hash` (SHA-256) as unique key instead of `file_path` to avoid MySQL varchar index limits
- MD5 hash is calculated on partial file content (first 10MB) for performance
- Automatic GIF thumbnail generation on file detection
- Duplicate detection via MD5 hash + file size comparison

### Frontend Structure (React)

Located in `frontend/src/`:

```
components/
  ├── common/         # Shared components (ContextMenu, etc.)
  ├── dialogs/        # Modal dialogs (TagEditDialog, etc.)
  ├── files/          # File management components
  │   ├── FileGrid.jsx           # Thumbnail grid view
  │   ├── FileList.jsx           # Detailed table view
  │   └── FileSelectionBar.jsx   # Multi-select action bar
  ├── layout/         # Layout components (header, sidebar)
  └── player/         # Video player components
      ├── VideoPlayer.jsx              # Main player with A-B loop, speed control
      ├── MultiPlayerContainer.jsx     # Multiple simultaneous players (PiP-style)
      └── VideoPlayerModal.jsx         # Player modal wrapper

pages/
  ├── AllFilesPage.jsx          # All non-deleted files
  ├── NoFolderFilesPage.jsx     # Files not in any folder
  ├── FoldersPage.jsx           # Hierarchical folder view
  ├── DeletedFilesPage.jsx      # Soft-deleted files
  └── DuplicateFilesPage.jsx    # Duplicate detection results

services/
  └── api.js         # Axios-based API client with helpers

store/
  └── atoms.js       # Jotai state atoms (viewMode, playerSettings, etc.)
```

**State Management (Jotai):**
- `viewModeAtom`: Toggle between thumbnail/table view
- `playerSettingsAtom`: Persistent player preferences (speed, volume, A-B loop, etc.)
- `selectedFilesAtom`: Multi-select state
- `currentFolderAtom`, `folderPathAtom`: Navigation state
- Most settings use `atomWithStorage` for localStorage persistence

### API Endpoints

All endpoints are prefixed with `/api/`:

**Files:**
- `GET /files/all/` - All non-deleted files
- `GET /files/no-folder/` - Files not in folders
- `GET /files/deleted/` - Soft-deleted files
- `GET /files/duplicates/` - Duplicate files by MD5+size
- `POST /files/{id}/mark_deleted/` - Soft delete
- `POST /files/{id}/restore/` - Restore deleted file
- `POST /files/{id}/add_to_folder/` - Add to folder (body: `{folder_id}`)
- `POST /files/{id}/remove_from_folder/` - Remove from folder (body: `{folder_id}`)
- `POST /files/{id}/add_tags/` - Add tags (body: `{tag_names: []}`)
- `POST /files/{id}/remove_tags/` - Remove tags (body: `{tag_names: []}`)
- `POST /files/bulk_action/` - Bulk operations (body: `{ids: [], action: "mark_deleted"|"restore"|"add_tags"|"remove_tags"|"add_to_folder"|"remove_from_folder", tag_ids?: [], folder_id?: number}`)

**Folders:**
- `GET /folders/tree/` - Hierarchical folder tree
- `POST /folders/` - Create folder (body: `{folder_name, parent?: number}`) - parent is optional for root folders

**System:**
- `GET /force_refresh/` - Trigger manual file scan
- `GET /scan-history/latest/` - Latest scan results

### Video Player Features

**Player Modes:**
- **Single Mode**: Full-screen modal player (default)
- **Multi/PIP Mode**: Multiple floating players with drag-and-drop
- Toggle between modes using `PlayerModeToggle` in the header
- Right-click menu: "PIPで開く" automatically switches to PIP mode

The custom player (`VideoPlayer.jsx`) implements:

- **A-B Loop**: Smooth looping between two timestamps
- **Variable Speed**: 0.1x to 5x with fine control
- **Long Press**: Hold for 2x speed playback
- **Double Tap/Click**:
  - Left 35% - Rewind 5 seconds
  - Right 35% - Skip forward 5 seconds
  - Center 35-65% - Play/Pause toggle
- **Mouse Wheel Zoom**:
  - Single player mode: Zooms video (1x-3x scale)
  - PIP mode: Resizes player window
- **Pinch Zoom**: Touch gesture support for zoom
- **Keyboard Shortcuts**: Space (play/pause), F (fullscreen), L (loop), M (mute), arrows (seek/volume)

The `MultiPlayerContainer.jsx` enables:
- Multiple simultaneous video playback
- **Aspect Ratio Aware Sizing**: Initial size calculated to maintain video aspect ratio (max 15% of screen area)
- **Independent Player State**: Each PIP player has its own aspectRatioFit setting (contain/cover)
- Free drag-and-drop positioning (optimized for smooth movement)
- Grid layout mode
- Mouse wheel resize in free mode
- Per-player fullscreen toggle

## Configuration

### Backend Settings

`backend/backend/settings.py`:
- Database credentials (MySQL)
- `MEDIA_ROOT`, `VIDEO_DIR`, `GIF_DIR` paths
- `FILE_SCAN_INTERVAL = 6 * 60 * 60` (6 hours)
- CORS settings (currently allows all origins for local use)

### Frontend Environment

Create `frontend/.env` if needed:
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MEDIA_URL=http://localhost:8000/media
```

### Media File Location

Place video files in: `media/videos/`

Supported formats: mp4, avi, mkv, mov, wmv, flv, webm, m4v, mpg, mpeg

Generated thumbnails stored in: `media/gifs/` (or `media/webp/` for WebP format)

## Important Implementation Details

### Bulk Action API
When using the bulk action API, the request body must use `ids` (not `file_ids`) and valid action names:

**Frontend:**
```javascript
fileAPI.bulkAction({
    ids: [1, 2, 3],  // NOT file_ids
    action: "mark_deleted",  // NOT "delete"
    // Optional based on action:
    tag_ids: [1, 2],
    folder_id: 5
})
```

**Valid Actions:**
- `mark_deleted` - Set delete flag
- `restore` - Remove delete flag
- `mark_duplicate` - Set duplicate flag
- `add_tags` - Add tags (requires `tag_ids`)
- `remove_tags` - Remove tags (requires `tag_ids`)
- `add_to_folder` - Add to folder (requires `folder_id`)
- `remove_from_folder` - Remove from folder (requires `folder_id`)

### File Path Hashing
The `File` model uses `file_path_hash` (SHA-256) as the unique key because MySQL has varchar index length limits. When querying by path, hash the path first:

```python
from videos.models import sha256_hex
file_path_hash = sha256_hex(file_path)
file = File.objects.get(file_path_hash=file_path_hash)
```

### Duplicate Detection
Files are considered duplicates if they share the same:
1. `md5_hash` (calculated from first 10MB)
2. `file_size`

The `duplicate_flag` is automatically set during scanning.

### Soft Deletion
Files use `delete_flag=True` instead of being deleted from the database. Physical files remain on disk.

### Automatic Scanning
- On server startup: `apps.py` triggers initial scan
- Periodic: Celery task runs every 6 hours (requires Redis)
- Manual: Call `/api/force_refresh/`

### Thumbnail Generation
FFmpeg generates GIF thumbnails (first 10 seconds, 10fps) automatically when new videos are detected. The system is transitioning to WebP format (`THUMBNAIL_EXT = 'webp'`).

## Common Development Patterns

### Adding a New API Endpoint
1. Add view function in `backend/videos/views.py`
2. Add URL pattern in `backend/videos/urls.py`
3. Add API method in `frontend/src/services/api.js`
4. Use in components via async/await

### Adding a New Page
1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx`
3. Add navigation link in layout components

### Adding Player Settings
1. Add to `playerSettingsAtom` in `frontend/src/store/atoms.js`
2. Implement UI in `VideoPlayer.jsx`
3. Settings automatically persist to localStorage

## Security Notes

**This system is designed for private home use only.** Before exposing externally:
- Change `SECRET_KEY` in settings.py
- Set `DEBUG = False`
- Configure `ALLOWED_HOSTS` properly
- Implement authentication
- Enable HTTPS
- Review CORS settings

## Logging

Backend logs: `logs/django.log`

Log level: INFO for general, DEBUG for `videos` app
