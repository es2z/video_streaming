import React from "react";
import { useAtom } from "jotai";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import {
    ViewModule as ThumbnailIcon,
    ViewList as ListIcon,
} from "@mui/icons-material";

import { viewModeAtom } from "@store/atoms";

function ViewToggle() {
    const [viewMode, setViewMode] = useAtom(viewModeAtom);

    const handleChange = (event, newMode) => {
        if (newMode !== null) {
            setViewMode(newMode);
        }
    };

    return (
        <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleChange}
            size="small"
            sx={{
                bgcolor: "background.paper",
                "& .MuiToggleButton-root": {
                    color: "text.secondary",
                    "&.Mui-selected": {
                        color: "primary.main",
                        bgcolor: "action.selected",
                    },
                },
            }}
        >
            <ToggleButton value="thumbnail">
                <Tooltip title="サムネイル表示">
                    <ThumbnailIcon />
                </Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
                <Tooltip title="詳細表示">
                    <ListIcon />
                </Tooltip>
            </ToggleButton>
        </ToggleButtonGroup>
    );
}

export default ViewToggle;
