import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import {
    Box,
    Breadcrumbs,
    Link,
    Typography,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Fab,
    Menu,
    MenuItem,
    Grid,
    Paper,
    Chip,
} from "@mui/material";
import {
    NavigateNext as NavigateNextIcon,
    ArrowBack as BackIcon,
    CreateNewFolder as NewFolderIcon,
    Home as HomeIcon,
    Folder as FolderIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreIcon,
} from "@mui/icons-material";

import FileGrid from "@components/files/FileGrid";
import FileList from "@components/files/FileList";
import FileSelectionBar from "@components/files/FileSelectionBar";

import {
    viewModeAtom,
    multiSelectModeAtom,
    selectedFilesAtom,
    currentFolderAtom,
    folderPathAtom,
    folderActionModeAtom,
    loadingAtom,
    notificationAtom,
} from "@store/atoms";

import { folderAPI, fileAPI } from "@services/api";

function FoldersPage() {
    const { folderId } = useParams();
    const navigate = useNavigate();

    const [viewMode] = useAtom(viewModeAtom);
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);
    const [currentFolder, setCurrentFolder] = useAtom(currentFolderAtom);
    const [folderPath, setFolderPath] = useAtom(folderPathAtom);
    const [folderActionMode, setFolderActionMode] =
        useAtom(folderActionModeAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [, setNotification] = useAtom(notificationAtom);

    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [editingFolder, setEditingFolder] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
    const [contextMenuFolder, setContextMenuFolder] = useState(null);

    // フォルダとファイルの取得
    const fetchFolderContent = useCallback(async () => {
        setLoading(true);
        try {
            // フォルダ一覧取得
            const foldersResponse = await folderAPI.getFolders({
                parent_id: folderId || "null",
            });
            setFolders(foldersResponse);

            // 現在のフォルダ情報取得
            if (folderId) {
                const folderInfo = await folderAPI.getFolder(folderId);
                setCurrentFolder(folderInfo);

                // パンくずリストの構築
                const ancestors = [];
                let current = folderInfo;
                while (current.parent) {
                    ancestors.unshift(current.parent);
                    current = current.parent;
                }
                setFolderPath(ancestors);

                // フォルダ内のファイル取得
                const filesResponse = await fileAPI.getFiles({
                    folder_id: folderId,
                });
                setFiles(filesResponse.results || filesResponse);
            } else {
                setCurrentFolder(null);
                setFolderPath([]);
                setFiles([]);
            }
        } catch (error) {
            console.error("Failed to fetch folder content:", error);
            setNotification({
                open: true,
                message: "フォルダの読み込みに失敗しました",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [
        folderId,
        setLoading,
        setNotification,
        setCurrentFolder,
        setFolderPath,
    ]);

    useEffect(() => {
        fetchFolderContent();
    }, [folderId]);

    // フォルダ作成
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            const payload = {
                folder_name: newFolderName,
            };
            if (folderId) {
                payload.parent = folderId;
            }
            await folderAPI.createFolder(payload);

            setNotification({
                open: true,
                message: "フォルダを作成しました",
                severity: "success",
            });

            setNewFolderDialog(false);
            setNewFolderName("");
            fetchFolderContent();
        } catch (error) {
            setNotification({
                open: true,
                message: "フォルダの作成に失敗しました",
                severity: "error",
            });
        }
    };

    // フォルダ名変更
    const handleRenameFolder = async () => {
        if (!editingFolder || !newFolderName.trim()) return;

        try {
            await folderAPI.updateFolder(editingFolder.id, {
                folder_name: newFolderName,
            });

            setNotification({
                open: true,
                message: "フォルダ名を変更しました",
                severity: "success",
            });

            setEditingFolder(null);
            setNewFolderName("");
            fetchFolderContent();
        } catch (error) {
            setNotification({
                open: true,
                message: "フォルダ名の変更に失敗しました",
                severity: "error",
            });
        }
    };

    // フォルダ削除
    const handleDeleteFolder = async (folder) => {
        if (!confirm(`フォルダ「${folder.folder_name}」を削除しますか？`))
            return;

        try {
            await folderAPI.deleteFolder(folder.id);

            setNotification({
                open: true,
                message: "フォルダを削除しました",
                severity: "success",
            });

            fetchFolderContent();
        } catch (error) {
            setNotification({
                open: true,
                message: "フォルダの削除に失敗しました",
                severity: "error",
            });
        }
    };

    // フォルダクリック
    const handleFolderClick = (folder) => {
        navigate(`/folders/${folder.id}`);
    };

    // フォルダコンテキストメニュー
    const handleFolderContextMenu = (event, folder) => {
        event.preventDefault();
        setContextMenuAnchor({ x: event.clientX, y: event.clientY });
        setContextMenuFolder(folder);
    };

    // ファイル選択
    const handleFileSelect = useCallback(
        (file) => {
            if (multiSelectMode) {
                setSelectedFiles((prev) => {
                    const isSelected = prev.some((f) => f.id === file.id);
                    if (isSelected) {
                        return prev.filter((f) => f.id !== file.id);
                    } else {
                        return [...prev, file];
                    }
                });
            }
        },
        [multiSelectMode, setSelectedFiles]
    );

    // フォルダへの移動/コピーモード
    const handleFolderAction = useCallback(() => {
        if (!folderActionMode.active) return;

        const action = folderActionMode.action;
        const targetFiles = folderActionMode.files;

        if (action === "move" || action === "copy") {
            // 現在のフォルダに移動/コピー
            targetFiles.forEach(async (file) => {
                try {
                    await fileAPI.addToFolder(file.id, folderId || null);
                } catch (error) {
                    console.error("Failed to add file to folder:", error);
                }
            });

            setNotification({
                open: true,
                message: `${targetFiles.length}個のファイルを${
                    action === "move" ? "移動" : "コピー"
                }しました`,
                severity: "success",
            });

            setFolderActionMode({ active: false, action: null, files: [] });
            fetchFolderContent();
        }
    }, [
        folderActionMode,
        folderId,
        setFolderActionMode,
        setNotification,
        fetchFolderContent,
    ]);

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* ヘッダー */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                {/* パンくずリスト */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
                    <Link
                        component="button"
                        variant="body1"
                        onClick={() => navigate("/folders")}
                        sx={{ display: "flex", alignItems: "center" }}
                    >
                        <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
                        ルート
                    </Link>
                    {folderPath.map((folder, index) => (
                        <Link
                            key={folder.id}
                            component="button"
                            variant="body1"
                            onClick={() => navigate(`/folders/${folder.id}`)}
                            disabled={index === folderPath.length - 1}
                        >
                            {folder.folder_name}
                        </Link>
                    ))}
                    {currentFolder && (
                        <Typography color="text.primary">
                            {currentFolder.folder_name}
                        </Typography>
                    )}
                </Breadcrumbs>

                {/* フォルダアクションモード時の表示 */}
                {folderActionMode.active && (
                    <Box sx={{ mt: 2 }}>
                        <Chip
                            label={`${
                                folderActionMode.files.length
                            }個のファイルを${
                                folderActionMode.action === "move"
                                    ? "移動"
                                    : "コピー"
                            }中`}
                            color="primary"
                            sx={{ mr: 2 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleFolderAction}
                            sx={{ mr: 1 }}
                        >
                            このフォルダへ
                            {folderActionMode.action === "move"
                                ? "移動"
                                : "コピー"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() =>
                                setFolderActionMode({
                                    active: false,
                                    action: null,
                                    files: [],
                                })
                            }
                        >
                            キャンセル
                        </Button>
                    </Box>
                )}
            </Box>

            {/* コンテンツエリア */}
            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                {/* フォルダ一覧 */}
                {folders.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            フォルダ ({folders.length})
                        </Typography>
                        <Grid container spacing={2}>
                            {folders.map((folder) => (
                                <Grid
                                    item
                                    xs={6}
                                    sm={4}
                                    md={3}
                                    lg={2}
                                    key={folder.id}
                                >
                                    <Paper
                                        sx={{
                                            p: 2,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            "&:hover": {
                                                bgcolor: "action.hover",
                                                transform: "scale(1.02)",
                                            },
                                        }}
                                        onClick={() =>
                                            handleFolderClick(folder)
                                        }
                                        onContextMenu={(e) =>
                                            handleFolderContextMenu(e, folder)
                                        }
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                mb: 1,
                                            }}
                                        >
                                            <FolderIcon
                                                sx={{
                                                    mr: 1,
                                                    color: "primary.main",
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFolderContextMenu(
                                                        e,
                                                        folder
                                                    );
                                                }}
                                            >
                                                <MoreIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        <Typography variant="body2" noWrap>
                                            {folder.folder_name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {folder.files_count || 0} ファイル
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* ファイル一覧 */}
                {files.length > 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            ファイル ({files.length})
                        </Typography>
                        {viewMode === "thumbnail" ? (
                            <FileGrid
                                files={files}
                                selectedFiles={selectedFiles}
                                onFileSelect={handleFileSelect}
                                onContextMenu={() => {}}
                                onLoadMore={() => {}}
                                hasMore={false}
                                loading={loading}
                            />
                        ) : (
                            <FileList
                                files={files}
                                selectedFiles={selectedFiles}
                                onFileSelect={handleFileSelect}
                                onContextMenu={() => {}}
                                onLoadMore={() => {}}
                                hasMore={false}
                                loading={loading}
                            />
                        )}
                    </Box>
                )}

                {/* 空の状態 */}
                {folders.length === 0 && files.length === 0 && !loading && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <FolderIcon
                            sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                        />
                        <Typography variant="h6" color="text.secondary">
                            このフォルダは空です
                        </Typography>
                        <Button
                            startIcon={<NewFolderIcon />}
                            onClick={() => setNewFolderDialog(true)}
                            sx={{ mt: 2 }}
                        >
                            新しいフォルダを作成
                        </Button>
                    </Box>
                )}
            </Box>

            {/* 新規フォルダ作成ボタン */}
            <Fab
                color="primary"
                aria-label="新規フォルダ"
                sx={{ position: "fixed", bottom: 16, right: 16 }}
                onClick={() => setNewFolderDialog(true)}
            >
                <NewFolderIcon />
            </Fab>

            {/* 新規フォルダ作成ダイアログ */}
            <Dialog
                open={newFolderDialog}
                onClose={() => setNewFolderDialog(false)}
            >
                <DialogTitle>新しいフォルダを作成</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="フォルダ名"
                        fullWidth
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                handleCreateFolder();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewFolderDialog(false)}>
                        キャンセル
                    </Button>
                    <Button onClick={handleCreateFolder} variant="contained">
                        作成
                    </Button>
                </DialogActions>
            </Dialog>

            {/* フォルダ名変更ダイアログ */}
            <Dialog
                open={Boolean(editingFolder)}
                onClose={() => setEditingFolder(null)}
            >
                <DialogTitle>フォルダ名を変更</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="新しいフォルダ名"
                        fullWidth
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                handleRenameFolder();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingFolder(null)}>
                        キャンセル
                    </Button>
                    <Button onClick={handleRenameFolder} variant="contained">
                        変更
                    </Button>
                </DialogActions>
            </Dialog>

            {/* フォルダコンテキストメニュー */}
            <Menu
                open={Boolean(contextMenuAnchor)}
                onClose={() => setContextMenuAnchor(null)}
                anchorReference="anchorPosition"
                anchorPosition={contextMenuAnchor}
            >
                <MenuItem
                    onClick={() => {
                        setEditingFolder(contextMenuFolder);
                        setNewFolderName(contextMenuFolder?.folder_name || "");
                        setContextMenuAnchor(null);
                    }}
                >
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    名前を変更
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleDeleteFolder(contextMenuFolder);
                        setContextMenuAnchor(null);
                    }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    削除
                </MenuItem>
            </Menu>

            {/* 複数選択時の操作バー */}
            {multiSelectMode && selectedFiles.length > 0 && (
                <FileSelectionBar
                    selectedCount={selectedFiles.length}
                    totalCount={files.length}
                    onSelectAll={() => {}}
                    onAction={() => {}}
                />
            )}
        </Box>
    );
}

export default FoldersPage;
