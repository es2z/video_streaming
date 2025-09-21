import React, { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Box, Typography, Chip } from "@mui/material";

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
} from "@store/atoms";

import { fileAPI } from "@services/api";

function DuplicateFilesPage() {
    const [viewMode] = useAtom(viewModeAtom);
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);
    const [searchQuery] = useAtom(searchQueryAtom);
    const [sortSettings] = useAtom(sortSettingsAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [, setNotification] = useAtom(notificationAtom);

    const [files, setFiles] = useState([]);
    const [duplicateGroups, setDuplicateGroups] = useState([]);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fileAPI.getDuplicateFiles({
                search: searchQuery,
                sort_by: `${sortSettings.order === "desc" ? "-" : ""}${
                    sortSettings.field
                }`,
            });

            const allFiles = response.results || response;
            setFiles(allFiles);

            // 重複グループを作成（MD5ハッシュでグループ化）
            const groups = {};
            allFiles.forEach((file) => {
                const key = `${file.md5_hash}_${file.file_size}`;
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(file);
            });

            setDuplicateGroups(
                Object.values(groups).filter((group) => group.length > 1)
            );
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

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6">
                    重複ファイル ({files.length}件)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    同じMD5ハッシュとファイルサイズを持つファイルです
                </Typography>
                {duplicateGroups.length > 0 && (
                    <Chip
                        label={`${duplicateGroups.length}個の重複グループ`}
                        color="warning"
                        size="small"
                        sx={{ mt: 1 }}
                    />
                )}
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                {files.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            重複ファイルはありません
                        </Typography>
                    </Box>
                ) : viewMode === "thumbnail" ? (
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
        </Box>
    );
}

export default DuplicateFilesPage;
