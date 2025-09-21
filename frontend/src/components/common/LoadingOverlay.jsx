import React from "react";
import { useAtom } from "jotai";
import { Backdrop, CircularProgress, Box, Typography } from "@mui/material";

import { loadingAtom } from "@store/atoms";

function LoadingOverlay() {
    const [loading] = useAtom(loadingAtom);

    return (
        <Backdrop
            sx={{
                color: "#fff",
                zIndex: (theme) => theme.zIndex.drawer + 1000,
                backdropFilter: "blur(3px)",
            }}
            open={loading}
        >
            <Box sx={{ textAlign: "center" }}>
                <CircularProgress color="inherit" size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    処理中...
                </Typography>
            </Box>
        </Backdrop>
    );
}

export default LoadingOverlay;
