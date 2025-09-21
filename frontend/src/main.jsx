import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ja from "date-fns/locale/ja";
import App from "./App";
import "./index.css";

// MUIテーマの設定
const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#1976d2",
        },
        secondary: {
            main: "#dc004e",
        },
        background: {
            default: "#121212",
            paper: "#1e1e1e",
        },
    },
    typography: {
        fontFamily: [
            "Roboto",
            "-apple-system",
            "BlinkMacSystemFont",
            '"Segoe UI"',
            '"Helvetica Neue"',
            "Arial",
            "sans-serif",
        ].join(","),
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: "#6b6b6b #2b2b2b",
                    "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                        backgroundColor: "#2b2b2b",
                        width: "10px",
                        height: "10px",
                    },
                    "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb":
                        {
                            borderRadius: 8,
                            backgroundColor: "#6b6b6b",
                            minHeight: 24,
                            border: "2px solid #2b2b2b",
                        },
                    "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus":
                        {
                            backgroundColor: "#959595",
                        },
                    "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active":
                        {
                            backgroundColor: "#959595",
                        },
                    "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover":
                        {
                            backgroundColor: "#959595",
                        },
                },
            },
        },
    },
});

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LocalizationProvider
                    dateAdapter={AdapterDateFns}
                    adapterLocale={ja}
                >
                    <App />
                </LocalizationProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>
);
