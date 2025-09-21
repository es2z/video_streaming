import React from "react";
import { useAtom } from "jotai";
import { Snackbar, Alert, Slide } from "@mui/material";

import { notificationAtom } from "@store/atoms";

function SlideTransition(props) {
    return <Slide {...props} direction="up" />;
}

function NotificationSnackbar() {
    const [notification, setNotification] = useAtom(notificationAtom);

    const handleClose = (event, reason) => {
        if (reason === "clickaway") {
            return;
        }
        setNotification((prev) => ({ ...prev, open: false }));
    };

    return (
        <Snackbar
            open={notification.open}
            autoHideDuration={6000}
            onClose={handleClose}
            TransitionComponent={SlideTransition}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
            <Alert
                onClose={handleClose}
                severity={notification.severity}
                variant="filled"
                sx={{ width: "100%" }}
            >
                {notification.message}
            </Alert>
        </Snackbar>
    );
}

export default NotificationSnackbar;
