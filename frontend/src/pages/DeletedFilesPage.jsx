import React, { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Box, Typography, Button } from "@mui/material";
import { Restore as RestoreIcon } from "@mui/icons-material";

import FileGrid from "@components/files/FileGrid";
import FileList from "@components/files/FileList";

import {
    viewModeAtom,
    multiSelectModeAtom,
    selectedFilesAtom,
    searchQueryAtom,
    sortSettingsAtom,
    loadingAtom,
    notificationAtom,
    contextMenuAtom,
} from "@store/atoms";

import { fileAPI } from "@services/api";

function DeletedFilesPage() {
    const [viewMode] = useAtom(viewModeAtom);
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);
    const [searchQuery] = useAtom(searchQueryAtom);
    const [sortSettings] = useAtom(sortSettingsAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [, setNotification] = useAtom(notificationAtom);
    const [, setContextMenu] = useAtom(contextMenuAtom);

    const [files, setFiles] = useState([]);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fileAPI.getDeletedFiles({
                search: searchQuery,
                sort_by: `${sortSettings.order === "desc" ? "-" : ""}${
                    sortSettings.field
                }`,
            });
            setFiles(response.results || response);
        } catch (error) {
            setNotification({
                open: true,
                message: "ファイルの取得に失敗しました",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, sortSettings, setLoading, setNotification]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleFileSelect = useCallback(
        (file) => {
            if (multiSelectMode) {
                setSelectedFiles((prev) => {
                    const isSelected = prev.some((f) => f.id === file.id);
                    return isSelected
                        ? prev.filter((f) => f.id !== file.id)
                        : [...prev, file];
                });
            }
        },
        [multiSelectMode, setSelectedFiles]
    );

    const handleContextMenu = useCallback(
        (e, file) => {
            e.preventDefault();
            setContextMenu({
                open: true,
                x: e.clientX,
                y: e.clientY,
                file,
                type: 'deleted',
            });
        },
        [setContextMenu]
    );

    const handleRestoreSelected = async () => {
        if (selectedFiles.length === 0) return;

        setLoading(true);
        try {
            await fileAPI.bulkAction({
                file_ids: selectedFiles.map((f) => f.id),
                action: "restore",
            });

            setNotification({
                open: true,
                message: `${selectedFiles.length}個のファイルを復元しました`,
                severity: "success",
            });

            setSelectedFiles([]);
            fetchFiles();
        } catch (error) {
            setNotification({
                open: true,
                message: "復元に失敗しました",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Box>
                        <Typography variant="h6">
                            削除済みファイル ({files.length}件)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            削除フラグが設定されているファイルです
                        </Typography>
                    </Box>
                    {multiSelectMode && selectedFiles.length > 0 && (
                        <Button
                            variant="contained"
                            startIcon={<RestoreIcon />}
                            onClick={handleRestoreSelected}
                        >
                            選択したファイルを復元 ({selectedFiles.length}件)
                        </Button>
                    )}
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                {files.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            削除されたファイルはありません
                        </Typography>
                    </Box>
                ) : viewMode === "thumbnail" ? (
                    <FileGrid
                        files={files}
                        selectedFiles={selectedFiles}
                        onFileSelect={handleFileSelect}
                        onContextMenu={handleContextMenu}
                        onLoadMore={() => {}}
                        hasMore={false}
                        loading={loading}
                    />
                ) : (
                    <FileList
                        files={files}
                        selectedFiles={selectedFiles}
                        onFileSelect={handleFileSelect}
                        onContextMenu={handleContextMenu}
                        onLoadMore={() => {}}
                        hasMore={false}
                        loading={loading}
                    />
                )}
            </Box>
        </Box>
    );
}

export default DeletedFilesPage;
