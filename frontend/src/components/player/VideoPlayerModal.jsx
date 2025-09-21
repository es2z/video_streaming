import React, { useEffect } from "react";
import { Modal, Box, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

import VideoPlayer from "./VideoPlayer";

function VideoPlayerModal({ file, open, onClose, onNext, onPrev }) {
    // ESCキーでモーダルを閉じる
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener("keydown", handleEsc);
        }

        return () => {
            document.removeEventListener("keydown", handleEsc);
        };
    }, [open, onClose]);

    // ボディのスクロールを無効化
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [open]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    width: "90vw",
                    height: "90vh",
                    maxWidth: 1600,
                    bgcolor: "black",
                    borderRadius: 2,
                    overflow: "hidden",
                    outline: "none",
                }}
            >
                {/* 閉じるボタン */}
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: "white",
                        bgcolor: "rgba(0,0,0,0.5)",
                        zIndex: 1,
                        "&:hover": {
                            bgcolor: "rgba(0,0,0,0.7)",
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* ビデオプレイヤー */}
                <VideoPlayer
                    file={file}
                    onClose={onClose}
                    onNext={onNext}
                    onPrev={onPrev}
                    isMultiPlayer={false}
                />
            </Box>
        </Modal>
    );
}

export default VideoPlayerModal;
