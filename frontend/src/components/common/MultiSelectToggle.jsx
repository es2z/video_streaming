import React from "react";
import { useAtom } from "jotai";
import { IconButton, Tooltip, Badge } from "@mui/material";
import {
    CheckBox as SelectIcon,
    CheckBoxOutlineBlank as UnselectIcon,
} from "@mui/icons-material";

import { multiSelectModeAtom, selectedFilesAtom } from "@store/atoms";

function MultiSelectToggle() {
    const [multiSelectMode, setMultiSelectMode] = useAtom(multiSelectModeAtom);
    const [selectedFiles, setSelectedFiles] = useAtom(selectedFilesAtom);

    const handleToggle = () => {
        setMultiSelectMode(!multiSelectMode);
        if (multiSelectMode) {
            // 複数選択モードを解除する時は選択もクリア
            setSelectedFiles([]);
        }
    };

    return (
        <Tooltip
            title={multiSelectMode ? "複数選択モードを解除" : "複数選択モード"}
        >
            <IconButton
                onClick={handleToggle}
                color={multiSelectMode ? "primary" : "inherit"}
                sx={{
                    bgcolor: multiSelectMode
                        ? "action.selected"
                        : "transparent",
                }}
            >
                <Badge badgeContent={selectedFiles.length} color="error">
                    {multiSelectMode ? <SelectIcon /> : <UnselectIcon />}
                </Badge>
            </IconButton>
        </Tooltip>
    );
}

export default MultiSelectToggle;
