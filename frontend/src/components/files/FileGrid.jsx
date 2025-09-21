import React, { useRef, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { useInView } from "react-intersection-observer";
import {
    Box,
    Card,
    CardMedia,
    CardContent,
    Typography,
    Checkbox,
    IconButton,
    Skeleton,
    Tooltip,
    Chip,
} from "@mui/material";
import {
    PlayArrow as PlayIcon,
    MoreVert as MoreIcon,
    FileCopy as DuplicateIcon,
} from "@mui/icons-material";

import {
    multiSelectModeAtom,
    displaySettingsAtom,
    isTouchDeviceAtom,
} from "@store/atoms";
import { getThumbnailUrl } from "@services/api";
import { formatFileSize, formatTime, truncateFileName } from "@utils/format";
import { useLongPress } from "use-long-press";

const THUMBNAIL_SIZES = {
    small: { width: 160, height: 90 },
    medium: { width: 240, height: 135 },
    large: { width: 320, height: 180 },
};

function FileGridItem({
    file,
    isSelected,
    onSelect,
    onContextMenu,
    onLongPress,
}) {
    const [multiSelectMode] = useAtom(multiSelectModeAtom);
    const [displaySettings] = useAtom(displaySettingsAtom);
    const [isTouchDevice] = useAtom(isTouchDeviceAtom);

    const thumbnailUrl = getThumbnailUrl(file);
    const size = THUMBNAIL_SIZES[displaySettings.thumbnailSize];

    // 長押し処理
    const bindLongPress = useLongPress(
        (event) => {
            if (onLongPress) {
                onLongPress(event, file);
            }
        },
        {
            threshold: 500,
            captureEvent: true,
            cancelOnMovement: 25,
        }
    );

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
        <Card
            sx={{
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: 4,
                    "& .hover-overlay": {
                        opacity: 1,
                    },
                },
                ...(isSelected && {
                    borderColor: "primary.main",
                    borderWidth: 2,
                    borderStyle: "solid",
                }),
            }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            {...(isTouchDevice ? bindLongPress() : {})}
        >
            {/* サムネイル */}
            <Box sx={{ position: "relative", paddingTop: "56.25%" }}>
                {thumbnailUrl ? (
                    <CardMedia
                        component={
                            displaySettings.animatedThumbnails ? "img" : "img"
                        }
                        image={thumbnailUrl}
                        alt={file.file_name}
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            bgcolor: "grey.800",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <PlayIcon sx={{ fontSize: 48, color: "grey.600" }} />
                    </Box>
                )}

                {/* オーバーレイ */}
                <Box
                    className="hover-overlay"
                    sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                            "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8))",
                        opacity: 0,
                        transition: "opacity 0.2s",
                        display: "flex",
                        alignItems: "flex-end",
                        p: 1,
                    }}
                >
                    {/* 動画時間 */}
                    {file.video_duration && (
                        <Chip
                            label={formatTime(file.video_duration)}
                            size="small"
                            sx={{
                                position: "absolute",
                                bottom: 8,
                                right: 8,
                                bgcolor: "rgba(0,0,0,0.7)",
                                color: "white",
                            }}
                        />
                    )}
                </Box>

                {/* 選択チェックボックス */}
                {multiSelectMode && (
                    <Checkbox
                        checked={isSelected}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(file);
                        }}
                        sx={{
                            position: "absolute",
                            top: 4,
                            left: 4,
                            bgcolor: "rgba(0,0,0,0.5)",
                            "&:hover": {
                                bgcolor: "rgba(0,0,0,0.7)",
                            },
                        }}
                    />
                )}

                {/* フラグ表示 */}
                {file.duplicate_flag && (
                    <Tooltip title="重複ファイル">
                        <DuplicateIcon
                            sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                color: "warning.main",
                                bgcolor: "rgba(0,0,0,0.5)",
                                borderRadius: 1,
                                p: 0.5,
                            }}
                        />
                    </Tooltip>
                )}
            </Box>

            {/* ファイル情報 */}
            {displaySettings.showFileInfo && (
                <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                    <Typography variant="body2" noWrap title={file.file_name}>
                        {truncateFileName(file.file_name, 30)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.file_size)}
                    </Typography>
                </CardContent>
            )}
        </Card>
    );
}

function FileGrid({
    files,
    selectedFiles,
    onFileSelect,
    onContextMenu,
    onLoadMore,
    hasMore,
    loading,
}) {
    const [displaySettings] = useAtom(displaySettingsAtom);
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

    // グリッドカラム数の計算
    const getGridColumns = () => {
        if (displaySettings.gridColumns === "auto") {
            const size = THUMBNAIL_SIZES[displaySettings.thumbnailSize];
            return `repeat(auto-fill, minmax(${size.width}px, 1fr))`;
        }
        return `repeat(${displaySettings.gridColumns}, 1fr)`;
    };

    return (
        <Box>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: getGridColumns(),
                    gap: 2,
                    pb: 2,
                }}
            >
                {files.map((file) => (
                    <FileGridItem
                        key={file.id}
                        file={file}
                        isSelected={selectedFiles.some((f) => f.id === file.id)}
                        onSelect={onFileSelect}
                        onContextMenu={onContextMenu}
                        onLongPress={onContextMenu}
                    />
                ))}
            </Box>

            {/* ローディング表示 */}
            {loading && (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: getGridColumns(),
                        gap: 2,
                        mt: 2,
                    }}
                >
                    {[...Array(8)].map((_, index) => (
                        <Card key={`skeleton-${index}`}>
                            <Skeleton
                                variant="rectangular"
                                sx={{ paddingTop: "56.25%" }}
                            />
                            {displaySettings.showFileInfo && (
                                <CardContent sx={{ p: 1 }}>
                                    <Skeleton variant="text" />
                                    <Skeleton variant="text" width="60%" />
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </Box>
            )}

            {/* 無限スクロール用のトリガー */}
            {hasMore && <div ref={loadMoreRef} style={{ height: 1 }} />}
        </Box>
    );
}

export default FileGrid;
