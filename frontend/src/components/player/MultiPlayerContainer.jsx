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
    const [size, setSize] = useState({ width: 400, height: 300 });
    const [position, setPosition] = useState({ x: index * 50, y: index * 50 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const nodeRef = useRef(null);

    const handleResize = (event, { size: newSize }) => {
        setSize(newSize);
        if (onResize) {
            onResize(index, newSize);
        }
    };

    const handleDrag = (e, data) => {
        setPosition({ x: data.x, y: data.y });
        if (onDrag) {
            onDrag(index, { x: data.x, y: data.y });
        }
    };

    const handleClose = () => {
        onClose(index);
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            setSize({ width: window.innerWidth, height: window.innerHeight });
            setPosition({ x: 0, y: 0 });
        } else {
            setSize({ width: 400, height: 300 });
            setPosition({ x: index * 50, y: index * 50 });
        }
        setIsFullscreen(!isFullscreen);
    };

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
            onDrag={handleDrag}
            bounds="parent"
            disabled={isFullscreen}
        >
            <div
                ref={nodeRef}
                style={{
                    position: "absolute",
                    zIndex: isFullscreen ? 9999 : 1000 + index,
                }}
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

                        {/* プレイヤー本体 */}
                        <Box sx={{ flexGrow: 1, mt: 4 }}>
                            <VideoPlayer
                                file={player}
                                onClose={handleClose}
                                isMultiPlayer={true}
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
                bgcolor: "rgba(0, 0, 0, 0.8)",
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
