import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAtom } from "jotai";
import { Box } from "@mui/material";

// レイアウト
import MainLayout from "@components/layout/MainLayout";

// ページ
import AllFilesPage from "@pages/AllFilesPage";
import NoFolderFilesPage from "@pages/NoFolderFilesPage";
import FoldersPage from "@pages/FoldersPage";
import DeletedFilesPage from "@pages/DeletedFilesPage";
import DuplicateFilesPage from "@pages/DuplicateFilesPage";

// コンポーネント
import VideoPlayer from "@components/player/VideoPlayer";
import MultiPlayerContainer from "@components/player/MultiPlayerContainer";
import ContextMenu from "@components/common/ContextMenu";
import NotificationSnackbar from "@components/common/NotificationSnackbar";
import LoadingOverlay from "@components/common/LoadingOverlay";

// ストア
import { windowSizeAtom, openPlayersAtom } from "@store/atoms";

// ユーティリティ
import { setupKeyboardShortcuts } from "@utils/keyboard";

function App() {
    const [, setWindowSize] = useAtom(windowSizeAtom);
    const [openPlayers] = useAtom(openPlayersAtom);

    // ウィンドウサイズの監視
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [setWindowSize]);

    // キーボードショートカットのセットアップ
    useEffect(() => {
        const cleanup = setupKeyboardShortcuts();
        return cleanup;
    }, []);

    // コンテキストメニューの無効化
    useEffect(() => {
        const handleContextMenu = (e) => {
            // カスタムコンテキストメニューを使用するため、デフォルトを無効化
            if (e.target.closest(".enable-context-menu")) {
                return;
            }
            e.preventDefault();
        };

        document.addEventListener("contextmenu", handleContextMenu);
        return () =>
            document.removeEventListener("contextmenu", handleContextMenu);
    }, []);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <MainLayout>
                <Routes>
                    <Route
                        path="/"
                        element={<Navigate to="/all-files" replace />}
                    />
                    <Route path="/all-files" element={<AllFilesPage />} />
                    <Route path="/no-folder" element={<NoFolderFilesPage />} />
                    <Route path="/folders" element={<FoldersPage />} />
                    <Route
                        path="/folders/:folderId"
                        element={<FoldersPage />}
                    />
                    <Route path="/deleted" element={<DeletedFilesPage />} />
                    <Route
                        path="/duplicates"
                        element={<DuplicateFilesPage />}
                    />
                </Routes>
            </MainLayout>

            {/* 複数プレイヤーコンテナ */}
            {openPlayers.length > 0 && (
                <MultiPlayerContainer players={openPlayers} />
            )}

            {/* グローバルコンポーネント */}
            <ContextMenu />
            <NotificationSnackbar />
            <LoadingOverlay />
        </Box>
    );
}

export default App;
