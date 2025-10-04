import React, { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Divider,
    Chip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import {
    Close as CloseIcon,
    SelectAll as SelectAllIcon,
    DriveFileMove as MoveIcon,
    FileCopy as CopyIcon,
    Delete as DeleteIcon,
    Restore as RestoreIcon,
    Label as TagIcon,
    Folder as FolderIcon,
    MoreVert as MoreIcon,
    PlayArrow as PlayIcon,
} from "@mui/icons-material";
import { useAtom } from "jotai";
import { useLocation } from "react-router-dom";

import { selectedFilesAtom, multiSelectModeAtom } from "@store/atoms";

function FileSelectionBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onAction,
    onOpenAll,
}) {
    const location = useLocation();
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);
    const [, setMultiSelectMode] = useAtom(multiSelectModeAtom);
    const [anchorEl, setAnchorEl] = useState(null);

    const isDeletedPage = location.pathname === "/deleted";
    const isFolderPage = location.pathname.startsWith("/folders");

    const handleClose = () => {
        setSelectedFiles([]);
        setMultiSelectMode(false);
    };

    const handleAction = (action) => {
        onAction(action);
        setAnchorEl(null);
    };

    const handleMoreClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <Paper
            elevation={8}
            sx={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                p: 2,
                borderRadius: 0,
                borderTop: 2,
                borderColor: "primary.main",
                bgcolor: "background.paper",
                zIndex: 1200,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {/* 選択数表示 */}
                <Chip
                    label={`${selectedCount}個選択中`}
                    color="primary"
                    onDelete={handleClose}
                    deleteIcon={<CloseIcon />}
                />

                {/* 全選択ボタン */}
                <Button
                    size="small"
                    startIcon={<SelectAllIcon />}
                    onClick={onSelectAll}
                    disabled={selectedCount === totalCount}
                >
                    全選択
                </Button>

                {/* すべて開くボタン */}
                {onOpenAll && (
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlayIcon />}
                        onClick={onOpenAll}
                        disabled={selectedCount === 0}
                    >
                        すべて開く
                    </Button>
                )}

                <Divider orientation="vertical" flexItem />

                {/* アクションボタン */}
                {!isDeletedPage && (
                    <>
                        {isFolderPage && (
                            <Button
                                size="small"
                                startIcon={<MoveIcon />}
                                onClick={() => handleAction("move")}
                            >
                                移動
                            </Button>
                        )}
                        <Button
                            size="small"
                            startIcon={<CopyIcon />}
                            onClick={() => handleAction("copy")}
                        >
                            コピー
                        </Button>
                    </>
                )}

                {isFolderPage && location.pathname !== "/folders" && (
                    <Button
                        size="small"
                        startIcon={<FolderIcon />}
                        onClick={() => handleAction("removeFromFolder")}
                    >
                        フォルダから削除
                    </Button>
                )}

                <Button
                    size="small"
                    startIcon={<TagIcon />}
                    onClick={() => handleAction("addTags")}
                >
                    タグ追加
                </Button>

                {!isDeletedPage ? (
                    <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleAction("delete")}
                        color="error"
                    >
                        削除
                    </Button>
                ) : (
                    <Button
                        size="small"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleAction("restore")}
                        color="success"
                    >
                        復元
                    </Button>
                )}

                {/* その他メニュー */}
                <IconButton
                    size="small"
                    onClick={handleMoreClick}
                    sx={{ ml: "auto" }}
                >
                    <MoreIcon />
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                >
                    <MenuItem onClick={() => handleAction("addToPlaylist")}>
                        <ListItemIcon>
                            <FolderIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>プレイリストに追加</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleAction("export")}>
                        <ListItemIcon>
                            <CopyIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            ファイルリストをエクスポート
                        </ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={() => handleAction("properties")}>
                        <ListItemIcon>
                            <TagIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>プロパティを表示</ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
        </Paper>
    );
}

export default FileSelectionBar;
