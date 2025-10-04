import React, { useState } from "react";
import { useAtom } from "jotai";
import { useLocation } from "react-router-dom";
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemButton,
    Checkbox,
    Typography,
} from "@mui/material";
import {
    DriveFileMove as MoveIcon,
    FileCopy as CopyIcon,
    Delete as DeleteIcon,
    DeleteForever as DeleteForeverIcon,
    Restore as RestoreIcon,
    Label as TagIcon,
    Folder as FolderIcon,
    Edit as EditIcon,
    Info as InfoIcon,
    PictureInPictureAlt as PipIcon,
    PlayArrow as PlayIcon,
} from "@mui/icons-material";

import {
    contextMenuAtom,
    notificationAtom,
    folderActionModeAtom,
    selectedFilesAtom,
    openPlayersAtom,
} from "@store/atoms";
import { playerModeAtom } from "@components/common/PlayerModeToggle";
import { fileAPI, folderAPI } from "@services/api";
import TagEditDialog from "@components/dialogs/TagEditDialog";

function ContextMenu() {
    const location = useLocation();
    const [contextMenu, setContextMenu] = useAtom(contextMenuAtom);
    const [, setNotification] = useAtom(notificationAtom);
    const [, setFolderActionMode] = useAtom(folderActionModeAtom);
    const [selectedFiles] = useAtom(selectedFilesAtom);
    const [, setOpenPlayers] = useAtom(openPlayersAtom);
    const [, setPlayerMode] = useAtom(playerModeAtom);

    const [folderSelectDialog, setFolderSelectDialog] = useState(false);
    const [tagDialog, setTagDialog] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [folders, setFolders] = useState([]);
    const [actionType, setActionType] = useState(null);

    const handleClose = () => {
        setContextMenu({ open: false, x: 0, y: 0, file: null, type: null });
    };

    // フォルダへ移動/コピー
    const handleFolderAction = async (action) => {
        setActionType(action);

        // フォルダ一覧を取得
        try {
            const response = await folderAPI.getFolderTree();
            setFolders(response);
            setFolderSelectDialog(true);
        } catch (error) {
            setNotification({
                open: true,
                message: "フォルダの取得に失敗しました",
                severity: "error",
            });
        }
        handleClose();
    };

    // フォルダ選択確定
    const handleFolderSelect = async () => {
        if (!selectedFolderId) return;

        const targetFiles =
            selectedFiles.length > 0 ? selectedFiles : [contextMenu.file];

        if (actionType === "move" || actionType === "copy") {
            setFolderActionMode({
                active: true,
                action: actionType,
                files: targetFiles,
            });

            // フォルダページへ遷移
            window.location.href = `/folders/${selectedFolderId}`;
        }

        setFolderSelectDialog(false);
        setSelectedFolderId(null);
    };

    // ファイル削除（フォルダから）
    const handleRemoveFromFolder = async () => {
        const targetFiles =
            selectedFiles.length > 0 ? selectedFiles : [contextMenu.file];
        const currentFolderId = location.pathname.split("/").pop();

        try {
            for (const file of targetFiles) {
                await fileAPI.removeFromFolder(file.id, currentFolderId);
            }

            setNotification({
                open: true,
                message: `${targetFiles.length}個のファイルをフォルダから削除しました`,
                severity: "success",
            });

            // ページをリロード
            window.location.reload();
        } catch (error) {
            setNotification({
                open: true,
                message: "フォルダからの削除に失敗しました",
                severity: "error",
            });
        }
        handleClose();
    };

    // delete_flagを付与
    const handleMarkAsDeleted = async () => {
        const targetFiles =
            selectedFiles.length > 0 ? selectedFiles : [contextMenu.file];

        try {
            await fileAPI.bulkAction({
                ids: targetFiles.map((f) => f.id),
                action: "mark_deleted",
            });

            setNotification({
                open: true,
                message: `${targetFiles.length}個のファイルを削除しました`,
                severity: "success",
            });

            // ページをリロード
            window.location.reload();
        } catch (error) {
            setNotification({
                open: true,
                message: "削除に失敗しました",
                severity: "error",
            });
        }
        handleClose();
    };

    // ファイル復元
    const handleRestore = async () => {
        const targetFiles =
            selectedFiles.length > 0 ? selectedFiles : [contextMenu.file];

        try {
            await fileAPI.bulkAction({
                ids: targetFiles.map((f) => f.id),
                action: "restore",
            });

            setNotification({
                open: true,
                message: `${targetFiles.length}個のファイルを復元しました`,
                severity: "success",
            });

            // ページをリロード
            window.location.reload();
        } catch (error) {
            setNotification({
                open: true,
                message: "復元に失敗しました",
                severity: "error",
            });
        }
        handleClose();
    };

    // タグ追加
    const handleAddTags = () => {
        handleClose();
        setTagDialog(true);
    };

    // PIPで開く
    const handleOpenInPIP = () => {
        const targetFiles = selectedFiles.length > 0 ? selectedFiles : [contextMenu.file];

        // PIPモードに切り替え
        setPlayerMode('multi');

        // openPlayersAtomに追加
        setOpenPlayers((prev) => {
            const newPlayers = [...prev];
            for (const file of targetFiles) {
                // 既に開いているか確認
                const alreadyOpen = prev.some((p) => p.id === file.id);
                if (!alreadyOpen) {
                    newPlayers.push(file);
                }
            }
            return newPlayers;
        });

        setNotification({
            open: true,
            message: `${targetFiles.length}個のファイルをPIPで開きました`,
            severity: "success",
        });

        handleClose();
    };

    // メニュー項目の判定
    const getMenuItems = () => {
        const items = [];
        const isDeletedPage = location.pathname === "/deleted";
        const isFolderPage = location.pathname.startsWith("/folders");

        // PIPで開く
        items.push({
            icon: <PipIcon />,
            text: "PIPで開く",
            onClick: handleOpenInPIP,
        });

        // 削除済みページの場合は復元オプションを最初に表示
        if (isDeletedPage) {
            items.push({
                icon: <RestoreIcon />,
                text: "削除を解除",
                onClick: handleRestore,
            });
        }

        if (isFolderPage && location.pathname !== "/folders") {
            items.push({
                icon: <MoveIcon />,
                text: "フォルダへ移動",
                onClick: () => handleFolderAction("move"),
            });
        }

        if (!isDeletedPage) {
            items.push({
                icon: <CopyIcon />,
                text: "フォルダへコピー",
                onClick: () => handleFolderAction("copy"),
            });
        }

        if (isFolderPage && location.pathname !== "/folders") {
            items.push({
                icon: <DeleteIcon />,
                text: "フォルダから削除",
                onClick: handleRemoveFromFolder,
            });
        }

        if (!isDeletedPage) {
            items.push(
                { divider: true },
                {
                    icon: <DeleteIcon />,
                    text: "ファイルを削除",
                    onClick: handleMarkAsDeleted,
                }
            );
        }

        // タグ追加は常に表示
        if (!isDeletedPage) {
            items.push({
                icon: <TagIcon />,
                text: "タグを追加",
                onClick: handleAddTags,
            });
        }

        return items;
    };

    return (
        <>
            <Menu
                open={contextMenu.open}
                onClose={handleClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu.open
                        ? { top: contextMenu.y, left: contextMenu.x }
                        : undefined
                }
            >
                {getMenuItems().map((item, index) => {
                    if (item.divider) {
                        return <Divider key={`divider-${index}`} />;
                    }
                    return (
                        <MenuItem key={index} onClick={item.onClick}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText>{item.text}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>

            {/* フォルダ選択ダイアログ */}
            <Dialog
                open={folderSelectDialog}
                onClose={() => setFolderSelectDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {actionType === "move"
                        ? "フォルダへ移動"
                        : "フォルダへコピー"}
                </DialogTitle>
                <DialogContent>
                    <List>
                        {folders.map((folder) => (
                            <ListItem key={folder.id} disablePadding>
                                <ListItemButton
                                    selected={selectedFolderId === folder.id}
                                    onClick={() =>
                                        setSelectedFolderId(folder.id)
                                    }
                                >
                                    <ListItemIcon>
                                        <FolderIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={folder.folder_name}
                                        secondary={`${
                                            folder.files_count || 0
                                        } ファイル`}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFolderSelectDialog(false)}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleFolderSelect}
                        variant="contained"
                        disabled={!selectedFolderId}
                    >
                        {actionType === "move" ? "移動" : "コピー"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* タグ追加ダイアログ */}
            <TagEditDialog
                open={tagDialog}
                onClose={() => setTagDialog(false)}
                files={
                    selectedFiles.length > 0
                        ? selectedFiles
                        : contextMenu.file
                        ? [contextMenu.file]
                        : []
                }
            />
        </>
    );
}

export default ContextMenu;
