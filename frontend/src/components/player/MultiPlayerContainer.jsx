import React, { useState, useRef, useCallback } from "react";
import { useAtom } from "jotai";
import Draggable from "react-draggable";
import { Resizable } from "react-resizable";
import {
    Box,
    Paper,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Fab,
    Tooltip,
} from "@mui/material";
import {
    Close as CloseIcon,
    CloseFullscreen as CloseAllIcon,
    GridView as GridIcon,
    DragIndicator as FreeIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as ExitFullscreenIcon,
} from "@mui/icons-material";

import VideoPlayer from "./VideoPlayer";
import { openPlayersAtom, playerLayoutModeAtom } from "@store/atoms";

// 個別のプレイヤーラッパー
function PlayerWrapper({
    player,
    index,
    layoutMode,
    onClose,
    onResize,
    onDrag,
    gridPosition,
}) {
    const nodeRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aspectRatioFit, setAspectRatioFit] = useState(player.aspectRatioFit || "contain");

    // 動画のアスペクト比に基づいた初期サイズを計算
    const calculateInitialSize = useCallback(() => {
        const videoWidth = player.width || 16;
        const videoHeight = player.height || 9;
        const aspectRatio = videoWidth / videoHeight;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxArea = screenWidth * screenHeight * 0.15; // 画面の15%以内

        // アスペクト比を維持しながら、面積が15%以内になるようにサイズを計算
        let width = Math.sqrt(maxArea * aspectRatio);
        let height = width / aspectRatio;

        // 画面サイズを超えないように調整
        if (width > screenWidth * 0.5) {
            width = screenWidth * 0.5;
            height = width / aspectRatio;
        }
        if (height > screenHeight * 0.5) {
            height = screenHeight * 0.5;
            width = height * aspectRatio;
        }

        // 最小サイズを確保
        const minWidth = 200;
        const minHeight = 150;
        if (width < minWidth) {
            width = minWidth;
            height = width / aspectRatio;
        }
        if (height < minHeight) {
            height = minHeight;
            width = height * aspectRatio;
        }

        return { width: Math.round(width), height: Math.round(height) };
    }, [player.width, player.height]);

    const [size, setSize] = useState(() => {
        return player.size || calculateInitialSize();
    });

    const [position, setPosition] = useState(
        player.position || { x: 50 + index * 30, y: 50 + index * 30 }
    );

    const handleResize = (event, { size: newSize }) => {
        setSize(newSize);
        if (onResize) {
            onResize(index, newSize);
        }
    };

    const handleDragStop = (e, data) => {
        // ドロップした場所に移動
        setPosition({ x: data.x, y: data.y });
        if (onDrag) {
            onDrag(index, { x: data.x, y: data.y });
        }
    };

    const handleClose = () => {
        onClose(index);
    };

    // 元のサイズと位置を保存
    const [savedState, setSavedState] = useState(null);

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            // 最大化：現在の状態を保存して、(0,0)に移動して全画面に
            setSavedState({ size, position });
            setPosition({ x: 0, y: 0 });
            setSize({ width: window.innerWidth, height: window.innerHeight });
        } else {
            // 元に戻す：保存した状態を復元（アスペクト比を維持）
            if (savedState) {
                setPosition(savedState.position);
                // アスペクト比を維持したサイズを復元
                setSize(savedState.size);
            } else {
                // フォールバック：アスペクト比を計算して復元
                const calculatedSize = calculateInitialSize();
                setSize(calculatedSize);
                setPosition({ x: 50 + index * 30, y: 50 + index * 30 });
            }
        }
        setIsFullscreen(!isFullscreen);
    };

    // マウスホイールでPIPプレイヤーのサイズを変更
    const handleWheel = useCallback((e) => {
        if (layoutMode !== 'free') return;

        e.stopPropagation();
        const delta = e.deltaY > 0 ? -20 : 20;

        setSize(prevSize => {
            const aspectRatio = prevSize.width / prevSize.height;
            const newWidth = Math.max(200, Math.min(window.innerWidth, prevSize.width + delta));
            const newHeight = newWidth / aspectRatio;

            return {
                width: newWidth,
                height: newHeight
            };
        });

        if (onResize) {
            onResize(index, size);
        }
    }, [layoutMode, index, onResize, size]);

    // グリッドモードの場合
    if (layoutMode === "grid") {
        return (
            <Box
                sx={{
                    ...gridPosition,
                    position: "relative",
                    overflow: "hidden",
                    border: 1,
                    borderColor: "divider",
                }}
            >
                <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        zIndex: 10,
                        bgcolor: "rgba(0,0,0,0.5)",
                        color: "white",
                        "&:hover": {
                            bgcolor: "rgba(0,0,0,0.7)",
                        },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <VideoPlayer
                    file={player}
                    onClose={handleClose}
                    isMultiPlayer={true}
                />
            </Box>
        );
    }

    // フリーモードの場合
    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".drag-handle"
            position={position}
            onStop={handleDragStop}
            bounds="parent"
            disabled={isFullscreen}
        >
            <div
                ref={nodeRef}
                style={{
                    position: "absolute",
                    zIndex: isFullscreen ? 9999 : 1000 + index,
                    // ポインターイベントを有効にしてクリック可能にする
                    pointerEvents: "auto",
                }}
                onWheel={handleWheel}
            >
                <Resizable
                    width={size.width}
                    height={size.height}
                    onResize={handleResize}
                    minConstraints={[200, 150]}
                    maxConstraints={[window.innerWidth, window.innerHeight]}
                    resizeHandles={isFullscreen ? [] : ["se"]}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            width: size.width,
                            height: size.height,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            position: "relative",
                        }}
                    >
                        {/* ヘッダーバー（ドラッグ可能） */}
                        <Box
                            className="drag-handle"
                            sx={{
                                height: 32,
                                bgcolor: "primary.dark",
                                display: "flex",
                                alignItems: "center",
                                px: 1,
                                cursor: "move",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                zIndex: 1,
                                opacity: 0.9,
                            }}
                        >
                            <FreeIcon fontSize="small" sx={{ mr: 1 }} />
                            <Box sx={{ flexGrow: 1 }} />
                            <IconButton
                                size="small"
                                onClick={toggleFullscreen}
                                sx={{ color: "white" }}
                            >
                                {isFullscreen ? (
                                    <ExitFullscreenIcon fontSize="small" />
                                ) : (
                                    <FullscreenIcon fontSize="small" />
                                )}
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={handleClose}
                                sx={{ color: "white" }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>

                        {/* プレイヤー本体 - タイトルバーの高さ（32px）を引く */}
                        <Box sx={{ flexGrow: 1, height: 'calc(100% - 32px)', mt: '32px' }}>
                            <VideoPlayer
                                file={player}
                                onClose={handleClose}
                                isMultiPlayer={true}
                                aspectRatioFit={aspectRatioFit}
                                onAspectRatioFitChange={setAspectRatioFit}
                            />
                        </Box>
                    </Paper>
                </Resizable>
            </div>
        </Draggable>
    );
}

// メインコンテナ
function MultiPlayerContainer({ players: initialPlayers = [] }) {
    const [openPlayers, setOpenPlayers] = useAtom(openPlayersAtom);
    const [layoutMode, setLayoutMode] = useAtom(playerLayoutModeAtom);
    const [gridLayout, setGridLayout] = useState({ rows: 1, cols: 1 });

    // プレイヤーを使用（propsまたはatom）
    const players = initialPlayers.length > 0 ? initialPlayers : openPlayers;

    // レイアウトモード切替
    const handleLayoutChange = (event, newMode) => {
        if (newMode !== null) {
            setLayoutMode(newMode);

            // グリッドレイアウトの計算
            if (newMode === "grid") {
                const count = players.length;
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);
                setGridLayout({ rows, cols });
            }
        }
    };

    // プレイヤーを閉じる
    const handleClosePlayer = (index) => {
        setOpenPlayers((prev) => prev.filter((_, i) => i !== index));
    };

    // すべて閉じる
    const handleCloseAll = () => {
        setOpenPlayers([]);
    };

    // グリッド位置計算
    const getGridPosition = (index) => {
        const { rows, cols } = gridLayout;
        const row = Math.floor(index / cols);
        const col = index % cols;

        return {
            gridRow: row + 1,
            gridColumn: col + 1,
            width: "100%",
            height: "100%",
        };
    };

    if (players.length === 0) {
        return null;
    }

    return (
        <Box
            sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                // フリーモードの時は背景を透明にして下のコンテンツをクリック可能にする
                bgcolor: layoutMode === "grid" ? "rgba(0, 0, 0, 0.8)" : "transparent",
                // フリーモードの時はポインターイベントを通過させる
                pointerEvents: layoutMode === "free" ? "none" : "auto",
                zIndex: 1200,
                ...(layoutMode === "grid" && {
                    display: "grid",
                    gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                    gap: 1,
                    p: 2,
                }),
            }}
        >
            {/* コントロールバー */}
            <Paper
                elevation={4}
                sx={{
                    position: "fixed",
                    top: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1300,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    // コントロールバーは常にクリック可能
                    pointerEvents: "auto",
                }}
            >
                <ToggleButtonGroup
                    value={layoutMode}
                    exclusive
                    onChange={handleLayoutChange}
                    size="small"
                >
                    <ToggleButton value="free">
                        <Tooltip title="自由配置">
                            <FreeIcon />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="grid">
                        <Tooltip title="グリッド配置">
                            <GridIcon />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>

                <IconButton onClick={handleCloseAll} color="error">
                    <Tooltip title="すべて閉じる">
                        <CloseAllIcon />
                    </Tooltip>
                </IconButton>
            </Paper>

            {/* プレイヤー */}
            {players.map((player, index) => (
                <PlayerWrapper
                    key={player.id || index}
                    player={player}
                    index={index}
                    layoutMode={layoutMode}
                    onClose={handleClosePlayer}
                    gridPosition={
                        layoutMode === "grid" ? getGridPosition(index) : null
                    }
                />
            ))}
        </Box>
    );
}

export default MultiPlayerContainer;
