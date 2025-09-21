import React, { useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { useInView } from "react-intersection-observer";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    IconButton,
    Chip,
    Box,
    Skeleton,
    Typography,
} from "@mui/material";
import {
    PlayArrow as PlayIcon,
    Folder as FolderIcon,
    Label as TagIcon,
    FileCopy as DuplicateIcon,
} from "@mui/icons-material";

import { multiSelectModeAtom, sortSettingsAtom } from "@store/atoms";
import { getThumbnailUrl } from "@services/api";
import {
    formatFileSize,
    formatTime,
    formatDateTime,
    truncateFileName,
} from "@utils/format";

function FileListRow({ file, isSelected, onSelect, onContextMenu }) {
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const thumbnailUrl = getThumbnailUrl(file);

    const handleClick = useCallback(
        (e) => {
            if (multiSelectMode) {
                e.preventDefault();
                e.stopPropagation();
            }
            onSelect(file);
        },
        [multiSelectMode, file, onSelect]
    );

    const handleContextMenu = useCallback(
        (e) => {
            e.preventDefault();
            onContextMenu(e, file);
        },
        [file, onContextMenu]
    );

    return (
        <TableRow
            hover
            selected={isSelected}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            sx={{
                cursor: "pointer",
                "&:hover": {
                    bgcolor: "action.hover",
                },
            }}
        >
            {/* 選択チェックボックス */}
            {multiSelectMode && (
                <TableCell padding="checkbox">
                    <Checkbox
                        checked={isSelected}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(file);
                        }}
                    />
                </TableCell>
            )}

            {/* サムネイル */}
            <TableCell sx={{ width: 100, p: 1 }}>
                <Box
                    sx={{
                        width: 80,
                        height: 45,
                        position: "relative",
                        bgcolor: "grey.800",
                        borderRadius: 1,
                        overflow: "hidden",
                    }}
                >
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={file.file_name}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <PlayIcon sx={{ color: "grey.600" }} />
                        </Box>
                    )}
                </Box>
            </TableCell>

            {/* ファイル名 */}
            <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" title={file.file_name}>
                        {truncateFileName(file.file_name, 50)}
                    </Typography>
                    {file.duplicate_flag && (
                        <Chip
                            icon={<DuplicateIcon />}
                            label="重複"
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                    )}
                </Box>
            </TableCell>

            {/* サイズ */}
            <TableCell align="right" sx={{ width: 100 }}>
                {formatFileSize(file.file_size)}
            </TableCell>

            {/* 動画時間 */}
            <TableCell align="right" sx={{ width: 80 }}>
                {file.video_duration ? formatTime(file.video_duration) : "-"}
            </TableCell>

            {/* フォルダ */}
            <TableCell sx={{ width: 150 }}>
                {file.folder_ids && file.folder_ids.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <FolderIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                            {file.folder_ids.length}個
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        なし
                    </Typography>
                )}
            </TableCell>

            {/* タグ */}
            <TableCell sx={{ width: 200 }}>
                {file.tag_names && file.tag_names.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {file.tag_names.slice(0, 3).map((tag, index) => (
                            <Chip
                                key={index}
                                label={tag}
                                size="small"
                                variant="outlined"
                            />
                        ))}
                        {file.tag_names.length > 3 && (
                            <Chip
                                label={`+${file.tag_names.length - 3}`}
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        なし
                    </Typography>
                )}
            </TableCell>

            {/* 作成日時 */}
            <TableCell align="right" sx={{ width: 150 }}>
                <Typography variant="caption">
                    {formatDateTime(file.created_at)}
                </Typography>
            </TableCell>
        </TableRow>
    );
}

function FileList({
    files,
    selectedFiles,
    onFileSelect,
    onContextMenu,
    onLoadMore,
    hasMore,
    loading,
}) {
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [sortSettings, setSortSettings] = useAtom(sortSettingsAtom);
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0,
        rootMargin: "100px",
    });

    // 無限スクロール
    useEffect(() => {
        if (inView && hasMore && !loading) {
            onLoadMore();
        }
    }, [inView, hasMore, loading, onLoadMore]);

    // ソート処理
    const handleSort = (field) => {
        setSortSettings((prev) => ({
            field,
            order:
                prev.field === field && prev.order === "asc" ? "desc" : "asc",
        }));
    };

    // 全選択
    const handleSelectAll = () => {
        if (selectedFiles.length === files.length) {
            onFileSelect([]);
        } else {
            files.forEach((file) => onFileSelect(file));
        }
    };

    return (
        <TableContainer component={Paper}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        {multiSelectMode && (
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={
                                        selectedFiles.length > 0 &&
                                        selectedFiles.length < files.length
                                    }
                                    checked={
                                        files.length > 0 &&
                                        selectedFiles.length === files.length
                                    }
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                        )}
                        <TableCell>サムネイル</TableCell>
                        <TableCell
                            onClick={() => handleSort("file_name")}
                            sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            ファイル名
                            {sortSettings.field === "file_name" && (
                                <span>
                                    {sortSettings.order === "asc" ? " ▲" : " ▼"}
                                </span>
                            )}
                        </TableCell>
                        <TableCell
                            align="right"
                            onClick={() => handleSort("file_size")}
                            sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            サイズ
                            {sortSettings.field === "file_size" && (
                                <span>
                                    {sortSettings.order === "asc" ? " ▲" : " ▼"}
                                </span>
                            )}
                        </TableCell>
                        <TableCell
                            align="right"
                            onClick={() => handleSort("video_duration")}
                            sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            時間
                            {sortSettings.field === "video_duration" && (
                                <span>
                                    {sortSettings.order === "asc" ? " ▲" : " ▼"}
                                </span>
                            )}
                        </TableCell>
                        <TableCell>フォルダ</TableCell>
                        <TableCell>タグ</TableCell>
                        <TableCell
                            align="right"
                            onClick={() => handleSort("created_at")}
                            sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            作成日時
                            {sortSettings.field === "created_at" && (
                                <span>
                                    {sortSettings.order === "asc" ? " ▲" : " ▼"}
                                </span>
                            )}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {files.map((file) => (
                        <FileListRow
                            key={file.id}
                            file={file}
                            isSelected={selectedFiles.some(
                                (f) => f.id === file.id
                            )}
                            onSelect={onFileSelect}
                            onContextMenu={onContextMenu}
                        />
                    ))}

                    {/* ローディング表示 */}
                    {loading && (
                        <>
                            {[...Array(5)].map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    {multiSelectMode && (
                                        <TableCell padding="checkbox" />
                                    )}
                                    <TableCell>
                                        <Skeleton
                                            variant="rectangular"
                                            width={80}
                                            height={45}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </>
                    )}
                </TableBody>
            </Table>

            {/* 無限スクロール用のトリガー */}
            {hasMore && <div ref={loadMoreRef} style={{ height: 1 }} />}
        </TableContainer>
    );
}

export default FileList;
