import React from "react";
import { useAtom } from "jotai";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { PictureInPictureAlt as PipIcon, Fullscreen as FullscreenIcon } from "@mui/icons-material";
import { atom } from "jotai";

// プレイヤーモード用のAtom（単一プレイヤー or 複数プレイヤー）
export const playerModeAtom = atom("single"); // 'single' or 'multi'

function PlayerModeToggle() {
    const [playerMode, setPlayerMode] = useAtom(playerModeAtom);

    const handleChange = (event, newMode) => {
        if (newMode !== null) {
            setPlayerMode(newMode);
        }
    };

    return (
        <ToggleButtonGroup
            value={playerMode}
            exclusive
            onChange={handleChange}
            size="small"
            sx={{
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiToggleButton-root': {
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    '&.Mui-selected': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.3)',
                        },
                    },
                    '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                },
            }}
        >
            <ToggleButton value="single">
                <Tooltip title="1つの動画を全画面で開く">
                    <FullscreenIcon fontSize="small" />
                </Tooltip>
            </ToggleButton>
            <ToggleButton value="multi">
                <Tooltip title="複数動画をPIPで開く">
                    <PipIcon fontSize="small" />
                </Tooltip>
            </ToggleButton>
        </ToggleButtonGroup>
    );
}

export default PlayerModeToggle;
