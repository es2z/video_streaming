import React, { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Box, CircularProgress, Typography } from "@mui/material";

import FileGrid from "@components/files/FileGrid";
import FileList from "@components/files/FileList";
import FileSelectionBar from "@components/files/FileSelectionBar";
import VideoPlayerModal from "@components/player/VideoPlayerModal";

import {
    viewModeAtom,
    multiSelectModeAtom,
    selectedFilesAtom,
    searchQueryAtom,
    sortSettingsAtom,
    loadingAtom,
    notificationAtom,
    openPlayersAtom,
    contextMenuAtom,
} from "@store/atoms";
import { playerModeAtom } from "@components/common/PlayerModeToggle";

import { fileAPI } from "@services/api";

function AllFilesPage() {
    const [viewMode] = useAtom(viewModeAtom);
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);
    const [searchQuery] = useAtom(searchQueryAtom);
    const [sortSettings] = useAtom(sortSettingsAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [, setNotification] = useAtom(notificationAtom);
    const [openPlayers, setOpenPlayers] = useAtom(openPlayersAtom);
    const [playerMode] = useAtom(playerModeAtom);

    const [files, setFiles] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // 再生中のファイル
    const [playingFile, setPlayingFile] = useState(null);
    const [playerOpen, setPlayerOpen] = useState(false);

    // ファイル取得
    const fetchFiles = useCallback(
        async (reset = false) => {
            if (loading) return;

            setLoading(true);
            try {
                const params = {
                    page: reset ? 1 : page,
                    page_size: 100,
                    search: searchQuery,
                    sort_by: `${sortSettings.order === "desc" ? "-" : ""}${
                        sortSettings.field
                    }`,
                };

                const response = await fileAPI.getAllFiles(params);

                if (reset) {
                    setFiles(response.results || response);
                    setPage(2);
                } else {
                    setFiles((prev) => [
                        ...prev,
                        ...(response.results || response),
                    ]);
                    setPage((prev) => prev + 1);
                }

                setHasMore(response.next !== null);
                setTotalCount(response.count || response.length);
            } catch (error) {
                console.error("Failed to fetch files:", error);
                setNotification({
                    open: true,
                    message: "ファイルの取得に失敗しました",
                    severity: "error",
                });
            } finally {
                setLoading(false);
            }
        },
        [page, searchQuery, sortSettings, loading, setLoading, setNotification]
    );

    // 初回読み込み & 検索・ソート変更時
    useEffect(() => {
        fetchFiles(true);
    }, [searchQuery, sortSettings]);

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
            } else {
                // プレイヤーモードに応じて開き方を変更
                if (playerMode === 'multi') {
                    // PIPモード: openPlayersAtomに追加
                    setOpenPlayers((prev) => {
                        // 既に開いているか確認
                        const alreadyOpen = prev.some((p) => p.id === file.id);
                        if (alreadyOpen) {
                            return prev;
                        }
                        return [...prev, file];
                    });
                } else {
                    // シングルモード: モーダルで開く
                    setPlayingFile(file);
                    setPlayerOpen(true);
                }
            }
        },
        [multiSelectMode, playerMode, setSelectedFiles, setOpenPlayers]
    );

    // 全選択/全解除
    const handleSelectAll = useCallback(() => {
        if (selectedFiles.length === files.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(files);
        }
    }, [files, selectedFiles, setSelectedFiles]);

    // ファイル操作
    const handleFileAction = useCallback(
        async (action, fileIds = null) => {
            const targetIds = fileIds || selectedFiles.map((f) => f.id);
            if (targetIds.length === 0) return;

            setLoading(true);
            try {
                switch (action) {
                    case "delete":
                        await fileAPI.bulkAction({
                            ids: targetIds,
                            action: "mark_deleted",
                        });
                        setFiles((prev) =>
                            prev.filter((f) => !targetIds.includes(f.id))
                        );
                        setNotification({
                            open: true,
                            message: `${targetIds.length}個のファイルを削除しました`,
                            severity: "success",
                        });
                        break;

                    case "addToFolder":
                        // フォルダ選択ダイアログを開く処理
                        break;

                    case "addTags":
                        // タグ追加ダイアログを開く処理
                        break;

                    default:
                        break;
                }

                setSelectedFiles([]);
            } catch (error) {
                console.error("File action failed:", error);
                setNotification({
                    open: true,
                    message: "操作に失敗しました",
                    severity: "error",
                });
            } finally {
                setLoading(false);
            }
        },
        [selectedFiles, setSelectedFiles, setLoading, setNotification]
    );

    const [contextMenu, setContextMenu] = useAtom(contextMenuAtom);

    // コンテキストメニュー処理
    const handleContextMenu = useCallback(
        (event, file) => {
            event.preventDefault();
            setContextMenu({
                open: true,
                x: event.clientX,
                y: event.clientY,
                file: file,
                type: "file",
            });
        },
        [setContextMenu]
    );

    // 無限スクロール
    const handleLoadMore = useCallback(() => {
        if (hasMore && !loading) {
            fetchFiles();
        }
    }, [hasMore, loading, fetchFiles]);

    // プレイヤーで次の動画へ
    const handleNextVideo = useCallback(() => {
        const currentIndex = files.findIndex((f) => f.id === playingFile?.id);
        if (currentIndex < files.length - 1) {
            setPlayingFile(files[currentIndex + 1]);
        }
    }, [files, playingFile]);

    // プレイヤーで前の動画へ
    const handlePrevVideo = useCallback(() => {
        const currentIndex = files.findIndex((f) => f.id === playingFile?.id);
        if (currentIndex > 0) {
            setPlayingFile(files[currentIndex - 1]);
        }
    }, [files, playingFile]);

    // すべてのファイルを開く
    const handleOpenAll = useCallback(() => {
        if (selectedFiles.length === 0) return;

        // 選択されたファイルをPIPプレイヤーとして開く
        const newPlayers = selectedFiles.map((file, index) => ({
            id: `player-${file.id}-${Date.now()}`,
            file,
            position: {
                x: 50 + index * 30,
                y: 50 + index * 30,
            },
            size: {
                width: Math.min(window.innerWidth * 0.3, 480),
                height: Math.min(window.innerHeight * 0.3, 270),
            },
        }));

        setOpenPlayers([...openPlayers, ...newPlayers]);
        setNotification({
            open: true,
            message: `${selectedFiles.length}個の動画を開きました`,
            severity: "success",
        });
    }, [selectedFiles, openPlayers, setOpenPlayers, setNotification]);

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* ヘッダー情報 */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6">
                    全ファイル ({totalCount}件)
                </Typography>
            </Box>

            {/* ファイル表示エリア */}
            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                {loading && files.length === 0 ? (
                    <Box
                        sx={{ display: "flex", justifyContent: "center", p: 4 }}
                    >
                        <CircularProgress />
                    </Box>
                ) : files.length === 0 ? (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                        <Typography variant="h6" color="text.secondary">
                            ファイルが見つかりません
                        </Typography>
                    </Box>
                ) : viewMode === "thumbnail" ? (
                    <FileGrid
                        files={files}
                        selectedFiles={selectedFiles}
                        onFileSelect={handleFileSelect}
                        onContextMenu={handleContextMenu}
                        onLoadMore={handleLoadMore}
                        hasMore={hasMore}
                        loading={loading}
                    />
                ) : (
                    <FileList
                        files={files}
                        selectedFiles={selectedFiles}
                        onFileSelect={handleFileSelect}
                        onContextMenu={handleContextMenu}
                        onLoadMore={handleLoadMore}
                        hasMore={hasMore}
                        loading={loading}
                    />
                )}
            </Box>

            {/* 複数選択時の操作バー */}
            {multiSelectMode && selectedFiles.length > 0 && (
                <FileSelectionBar
                    selectedCount={selectedFiles.length}
                    totalCount={files.length}
                    onSelectAll={handleSelectAll}
                    onAction={handleFileAction}
                    onOpenAll={handleOpenAll}
                />
            )}

            {/* 動画プレイヤーモーダル */}
            {playerOpen && playingFile && (
                <VideoPlayerModal
                    file={playingFile}
                    open={playerOpen}
                    onClose={() => setPlayerOpen(false)}
                    onNext={handleNextVideo}
                    onPrev={handlePrevVideo}
                />
            )}
        </Box>
    );
}

export default AllFilesPage;
