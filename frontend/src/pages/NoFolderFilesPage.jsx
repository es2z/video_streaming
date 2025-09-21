import React, { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Box, Typography } from "@mui/material";

import FileGrid from "@components/files/FileGrid";
import FileList from "@components/files/FileList";
import VideoPlayerModal from "@components/player/VideoPlayerModal";

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

function NoFolderFilesPage() {
    const [viewMode] = useAtom(viewModeAtom);
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);
    const [searchQuery] = useAtom(searchQueryAtom);
    const [sortSettings] = useAtom(sortSettingsAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [, setNotification] = useAtom(notificationAtom);

    const [files, setFiles] = useState([]);
    const [playerOpen, setPlayerOpen] = useState(false);
    const [playingFile, setPlayingFile] = useState(null);

    // ファイル取得
    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fileAPI.getNoFolderFiles({
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
            } else {
                setPlayingFile(file);
                setPlayerOpen(true);
            }
        },
        [multiSelectMode, setSelectedFiles]
    );

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6">
                    フォルダに存在しないファイル ({files.length}件)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    どのフォルダにも振り分けられていないファイルです
                </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
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

            {playerOpen && playingFile && (
                <VideoPlayerModal
                    file={playingFile}
                    open={playerOpen}
                    onClose={() => setPlayerOpen(false)}
                />
            )}
        </Box>
    );
}

export default NoFolderFilesPage;
