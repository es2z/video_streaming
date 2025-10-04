import React, { useRef, useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { useLongPress } from "use-long-press";
import {
    Box,
    IconButton,
    Slider,
    Typography,
    Tooltip,
    Menu,
    MenuItem,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Fab,
    Collapse,
} from "@mui/material";
import {
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    SkipNext as NextIcon,
    SkipPrevious as PrevIcon,
    VolumeUp as VolumeIcon,
    VolumeOff as VolumeMuteIcon,
    Loop as LoopIcon,
    Speed as SpeedIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    MoreVert as MoreIcon,
    AspectRatio as AspectRatioIcon,
    Repeat as RepeatIcon,
    Add as AddIcon,
    Close as CloseIcon,
} from "@mui/icons-material";

import {
    playerSettingsAtom,
    openPlayersAtom,
    notificationAtom,
} from "@store/atoms";
import { fileAPI, getVideoUrl } from "@services/api";
import { formatTime } from "@utils/format";

function VideoPlayer({ file, onClose, onNext, onPrev, isMultiPlayer = false }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [playerSettings, setPlayerSettings] = useAtom(playerSettingsAtom);
    const [, setOpenPlayers] = useAtom(openPlayersAtom);
    const [, setNotification] = useAtom(notificationAtom);

    // プレイヤー状態
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(playerSettings.volume);
    const [muted, setMuted] = useState(playerSettings.muted);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [buffered, setBuffered] = useState(0);

    // A-Bループ
    const [abLoop, setAbLoop] = useState(playerSettings.abLoop);
    const [settingABLoop, setSettingABLoop] = useState(false);

    // メニュー
    const [anchorEl, setAnchorEl] = useState(null);
    const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
    const [abLoopDialogOpen, setAbLoopDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newFileName, setNewFileName] = useState(file?.file_name || "");

    // タッチ制御
    const [lastTap, setLastTap] = useState(0);
    const [tapTimer, setTapTimer] = useState(null);
    const controlsTimer = useRef(null);

    // 長押し処理（2倍速）
    const bindLongPress = useLongPress(
        () => {
            if (videoRef.current) {
                videoRef.current.playbackRate = playerSettings.longPressSpeed;
            }
        },
        {
            onFinish: () => {
                if (videoRef.current) {
                    videoRef.current.playbackRate =
                        playerSettings.playbackSpeed;
                }
            },
            threshold: 500,
            captureEvent: true,
            cancelOnMovement: false,
        }
    );

    // 動画URL取得
    const videoUrl = getVideoUrl(file);

    // 初期化
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = muted;
            videoRef.current.playbackRate = playerSettings.playbackSpeed;

            if (playerSettings.autoPlay) {
                videoRef.current.play().catch((err) => {
                    console.error("Auto-play failed:", err);
                });
            }
        }
    }, []);

    // コントロール自動非表示
    useEffect(() => {
        const hideControls = () => {
            if (controlsTimer.current) {
                clearTimeout(controlsTimer.current);
            }
            controlsTimer.current = setTimeout(() => {
                if (playing && !isMultiPlayer) {
                    setShowControls(false);
                }
            }, 3000);
        };

        if (playing) {
            hideControls();
        } else {
            setShowControls(true);
        }

        return () => {
            if (controlsTimer.current) {
                clearTimeout(controlsTimer.current);
            }
        };
    }, [playing, isMultiPlayer]);

    // マウス移動でコントロール表示
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (playing && !isMultiPlayer) {
            if (controlsTimer.current) {
                clearTimeout(controlsTimer.current);
            }
            controlsTimer.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [playing, isMultiPlayer]);

    // 再生/一時停止
    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (playing) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setPlaying(!playing);
        }
    }, [playing]);

    // シーク
    const handleSeek = useCallback((value) => {
        if (videoRef.current) {
            videoRef.current.currentTime = value;
            setCurrentTime(value);
        }
    }, []);

    // ボリューム変更
    const handleVolumeChange = useCallback(
        (value) => {
            if (videoRef.current) {
                videoRef.current.volume = value;
                setVolume(value);
                setPlayerSettings((prev) => ({ ...prev, volume: value }));
            }
        },
        [setPlayerSettings]
    );

    // ミュート切り替え
    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            const newMuted = !muted;
            videoRef.current.muted = newMuted;
            setMuted(newMuted);
            setPlayerSettings((prev) => ({ ...prev, muted: newMuted }));
        }
    }, [muted, setPlayerSettings]);

    // 再生速度変更
    const handleSpeedChange = useCallback(
        (speed) => {
            if (videoRef.current) {
                videoRef.current.playbackRate = speed;
                setPlayerSettings((prev) => ({
                    ...prev,
                    playbackSpeed: speed,
                }));
            }
            setSpeedMenuOpen(false);
        },
        [setPlayerSettings]
    );

    // フルスクリーン切り替え
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    }, []);

    // A-Bループ設定
    const setABLoopPoint = useCallback(
        (point) => {
            if (point === "start") {
                setAbLoop((prev) => ({
                    ...prev,
                    start: currentTime,
                    enabled: prev.end !== null,
                }));
            } else {
                setAbLoop((prev) => ({
                    ...prev,
                    end: currentTime,
                    enabled: prev.start !== null,
                }));
            }
        },
        [currentTime]
    );

    // A-Bループ処理
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !abLoop.enabled) return;

        const handleTimeUpdate = () => {
            if (abLoop.start !== null && abLoop.end !== null) {
                if (video.currentTime >= abLoop.end) {
                    video.currentTime = abLoop.start;
                }
            }
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        return () => video.removeEventListener("timeupdate", handleTimeUpdate);
    }, [abLoop]);

    // タップ/クリック処理（ダブルタップでスキップ/巻き戻し、シングルタップで再生/停止）
    const handleTap = useCallback(
        (e) => {
            // コントロール領域のクリックは無視
            if (e.target.closest('.video-player-controls')) {
                return;
            }

            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX || e.touches?.[0]?.clientX;
            const relativeX = (x - rect.left) / rect.width;

            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300;

            if (now - lastTap < DOUBLE_TAP_DELAY) {
                // ダブルタップ/ダブルクリック
                if (tapTimer) {
                    clearTimeout(tapTimer);
                    setTapTimer(null);
                }

                if (relativeX < 0.35) {
                    // 左側 - 巻き戻し
                    handleSeek(
                        Math.max(0, currentTime - playerSettings.skipSeconds)
                    );
                    setNotification({
                        open: true,
                        message: `${playerSettings.skipSeconds}秒巻き戻し`,
                        severity: "info",
                    });
                } else if (relativeX > 0.65) {
                    // 右側 - スキップ
                    handleSeek(
                        Math.min(
                            duration,
                            currentTime + playerSettings.skipSeconds
                        )
                    );
                    setNotification({
                        open: true,
                        message: `${playerSettings.skipSeconds}秒スキップ`,
                        severity: "info",
                    });
                } else {
                    // 中央 - 再生/一時停止（ダブルクリック時も）
                    togglePlay();
                }
            } else {
                // シングルタップ/クリック - 中央なら再生/停止
                const timer = setTimeout(() => {
                    // 中央35-65%の範囲で再生/停止
                    if (relativeX >= 0.35 && relativeX <= 0.65) {
                        togglePlay();
                    }
                }, DOUBLE_TAP_DELAY);
                setTapTimer(timer);
            }

            setLastTap(now);
        },
        [
            currentTime,
            duration,
            playerSettings.skipSeconds,
            handleSeek,
            togglePlay,
            lastTap,
            tapTimer,
            setNotification,
        ]
    );

    // フリック処理（シーク）
    const handleSwipe = useCallback((e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const y = e.clientY || e.touches?.[0]?.clientY;
        const relativeY = (y - rect.top) / rect.height;

        // 下部40%の範囲のみ
        if (relativeY > 0.6) {
            // フリック処理のロジックを実装
            // ここでは簡略化
        }
    }, []);

    // ズーム処理
    const [scale, setScale] = useState(1);
    const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

    // マウスホイールでズーム
    const handleWheel = useCallback((e) => {
        e.preventDefault();

        if (isMultiPlayer) {
            // PIPモードではプレイヤー全体のサイズを変更（MultiPlayerContainerで処理）
            return;
        }

        // 通常モードでは動画をズーム
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setScale((prevScale) => {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(1, Math.min(3, prevScale + delta));
            if (newScale !== prevScale) {
                setZoomOrigin({ x, y });
            }
            return newScale;
        });
    }, [isMultiPlayer]);

    // ピンチズーム処理
    const [pinchDistance, setPinchDistance] = useState(null);
    const handlePinch = useCallback((e) => {
        if (e.touches && e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (pinchDistance !== null) {
                const delta = distance - pinchDistance;
                setScale((prevScale) => {
                    const newScale = Math.max(1, Math.min(3, prevScale + delta * 0.01));
                    return newScale;
                });
            }
            setPinchDistance(distance);
        }
    }, [pinchDistance]);

    const handleTouchEnd = useCallback(() => {
        setPinchDistance(null);
    }, []);

    // ファイル名変更
    const handleRename = async () => {
        try {
            await fileAPI.updateFile(file.id, { file_name: newFileName });
            setNotification({
                open: true,
                message: "ファイル名を変更しました",
                severity: "success",
            });
            setRenameDialogOpen(false);
        } catch (error) {
            setNotification({
                open: true,
                message: "ファイル名の変更に失敗しました",
                severity: "error",
            });
        }
    };

    // 追加で動画を開く
    const handleAddVideo = () => {
        setOpenPlayers((prev) => [
            ...prev,
            { ...file, id: `${file.id}_${Date.now()}` },
        ]);
        // 選択モードに遷移する処理を追加
    };

    return (
        <Box
            ref={containerRef}
            className="video-player-container"
            sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: "black",
                overflow: "hidden",
                cursor: showControls ? "default" : "none",
            }}
            onMouseMove={handleMouseMove}
            onClick={handleTap}
            onTouchStart={handleTap}
            onTouchMove={handlePinch}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            {...bindLongPress()}
        >
            {/* ビデオ要素 */}
            <video
                ref={videoRef}
                src={videoUrl}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: playerSettings.aspectRatioFit,
                    transform: `scale(${scale})`,
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                }}
                loop={playerSettings.loop && !abLoop.enabled}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onProgress={(e) => {
                    if (e.target.buffered.length > 0) {
                        setBuffered(
                            e.target.buffered.end(e.target.buffered.length - 1)
                        );
                    }
                }}
                onEnded={() => {
                    if (!playerSettings.loop && !abLoop.enabled && onNext) {
                        onNext();
                    }
                }}
            />

            {/* コントロールオーバーレイ */}
            <Collapse in={showControls}>
                <Box
                    className="video-player-controls"
                    sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background:
                            "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                        p: 2,
                    }}
                >
                    {/* シークバー */}
                    <Box sx={{ px: 2, mb: 1 }}>
                        <Slider
                            value={currentTime}
                            max={duration}
                            onChange={(e, value) => handleSeek(value)}
                            sx={{
                                "& .MuiSlider-rail": {
                                    opacity: 0.28,
                                },
                                "& .MuiSlider-track": {
                                    border: "none",
                                },
                            }}
                        />
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography variant="caption">
                                {formatTime(currentTime)}
                            </Typography>
                            <Typography variant="caption">
                                {formatTime(duration)}
                            </Typography>
                        </Box>
                    </Box>

                    {/* コントロールボタン */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {/* 前へ */}
                        {onPrev && (
                            <IconButton onClick={onPrev} color="inherit">
                                <PrevIcon />
                            </IconButton>
                        )}

                        {/* 再生/一時停止 */}
                        <IconButton onClick={togglePlay} color="inherit">
                            {playing ? <PauseIcon /> : <PlayIcon />}
                        </IconButton>

                        {/* 次へ */}
                        {onNext && (
                            <IconButton onClick={onNext} color="inherit">
                                <NextIcon />
                            </IconButton>
                        )}

                        {/* ボリューム */}
                        <IconButton onClick={toggleMute} color="inherit">
                            {muted ? <VolumeMuteIcon /> : <VolumeIcon />}
                        </IconButton>
                        <Slider
                            value={muted ? 0 : volume}
                            onChange={(e, value) => handleVolumeChange(value)}
                            max={1}
                            step={0.1}
                            sx={{ width: 100 }}
                        />

                        {/* 再生速度 */}
                        <Button
                            startIcon={<SpeedIcon />}
                            onClick={() => setSpeedMenuOpen(true)}
                            color="inherit"
                            size="small"
                        >
                            {playerSettings.playbackSpeed}x
                        </Button>

                        {/* ループ */}
                        <IconButton
                            onClick={() =>
                                setPlayerSettings((prev) => ({
                                    ...prev,
                                    loop: !prev.loop,
                                }))
                            }
                            color={playerSettings.loop ? "primary" : "inherit"}
                        >
                            <LoopIcon />
                        </IconButton>

                        {/* A-Bループ */}
                        <IconButton
                            onClick={() => setAbLoopDialogOpen(true)}
                            color={abLoop.enabled ? "primary" : "inherit"}
                        >
                            <RepeatIcon />
                        </IconButton>

                        {/* アスペクト比 */}
                        <IconButton
                            onClick={() => {
                                const newFit =
                                    playerSettings.aspectRatioFit === "contain"
                                        ? "cover"
                                        : "contain";
                                setPlayerSettings((prev) => ({
                                    ...prev,
                                    aspectRatioFit: newFit,
                                }));
                            }}
                            color="inherit"
                        >
                            <AspectRatioIcon />
                        </IconButton>

                        <Box sx={{ flexGrow: 1 }} />

                        {/* その他メニュー */}
                        <IconButton
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                            color="inherit"
                        >
                            <MoreIcon />
                        </IconButton>

                        {/* フルスクリーン */}
                        <IconButton onClick={toggleFullscreen} color="inherit">
                            {fullscreen ? (
                                <FullscreenExitIcon />
                            ) : (
                                <FullscreenIcon />
                            )}
                        </IconButton>

                        {/* 閉じる */}
                        {onClose && (
                            <IconButton onClick={onClose} color="inherit">
                                <CloseIcon />
                            </IconButton>
                        )}
                    </Stack>
                </Box>
            </Collapse>

            {/* 追加で動画を開くボタン（複数プレイヤーモードでない場合） */}
            {!isMultiPlayer && (
                <Fab
                    color="primary"
                    size="small"
                    onClick={handleAddVideo}
                    sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        opacity: showControls ? 1 : 0,
                        transition: "opacity 0.3s",
                    }}
                >
                    <AddIcon />
                </Fab>
            )}

            {/* 再生速度メニュー */}
            <Menu
                open={speedMenuOpen}
                onClose={() => setSpeedMenuOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {[0.25, 0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4, 5].map(
                    (speed) => (
                        <MenuItem
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                        >
                            {speed}x
                        </MenuItem>
                    )
                )}
            </Menu>

            {/* その他メニュー */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => setRenameDialogOpen(true)}>
                    ファイル名を変更
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        /* タグ付け処理 */
                    }}
                >
                    タグを追加
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        /* フォルダ移動処理 */
                    }}
                >
                    フォルダへ移動
                </MenuItem>
            </Menu>

            {/* A-Bループ設定ダイアログ */}
            <Dialog
                open={abLoopDialogOpen}
                onClose={() => setAbLoopDialogOpen(false)}
            >
                <DialogTitle>A-Bループ設定</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <Button onClick={() => setABLoopPoint("start")}>
                            開始地点を設定 ({formatTime(abLoop.start || 0)})
                        </Button>
                        <Button onClick={() => setABLoopPoint("end")}>
                            終了地点を設定 ({formatTime(abLoop.end || duration)}
                            )
                        </Button>
                        <Button
                            onClick={() =>
                                setAbLoop({
                                    enabled: false,
                                    start: null,
                                    end: null,
                                })
                            }
                            disabled={!abLoop.enabled}
                        >
                            A-Bループを解除
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAbLoopDialogOpen(false)}>
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ファイル名変更ダイアログ */}
            <Dialog
                open={renameDialogOpen}
                onClose={() => setRenameDialogOpen(false)}
            >
                <DialogTitle>ファイル名を変更</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        label="新しいファイル名"
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameDialogOpen(false)}>
                        キャンセル
                    </Button>
                    <Button onClick={handleRename} variant="contained">
                        変更
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default VideoPlayer;
