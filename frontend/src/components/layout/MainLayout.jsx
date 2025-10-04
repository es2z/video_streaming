import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Badge,
    Button,
    Tooltip,
} from "@mui/material";
import {
    Menu as MenuIcon,
    VideoLibrary as VideoLibraryIcon,
    FolderOff as FolderOffIcon,
    Folder as FolderIcon,
    Delete as DeleteIcon,
    FileCopy as FileCopyIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    Search as SearchIcon,
} from "@mui/icons-material";

import SearchBar from "@components/common/SearchBar";
import ViewToggle from "@components/common/ViewToggle";
import MultiSelectToggle from "@components/common/MultiSelectToggle";
import PlayerModeToggle from "@components/common/PlayerModeToggle";
import SettingsDialog from "@components/dialogs/SettingsDialog";

import { loadingAtom, notificationAtom } from "@store/atoms";
import { systemAPI } from "@services/api";

const drawerWidth = 240;

const menuItems = [
    {
        id: "all-files",
        path: "/all-files",
        label: "全ファイル",
        icon: <VideoLibraryIcon />,
        description: "すべての有効なファイル",
    },
    {
        id: "no-folder",
        path: "/no-folder",
        label: "フォルダに存在しない",
        icon: <FolderOffIcon />,
        description: "フォルダに振り分けられていないファイル",
    },
    {
        id: "folders",
        path: "/folders",
        label: "フォルダ",
        icon: <FolderIcon />,
        description: "フォルダ管理",
    },
    {
        id: "deleted",
        path: "/deleted",
        label: "削除ファイル一覧",
        icon: <DeleteIcon />,
        description: "削除フラグが付いたファイル",
    },
    {
        id: "duplicates",
        path: "/duplicates",
        label: "重複ファイル一覧",
        icon: <FileCopyIcon />,
        description: "重複フラグが付いたファイル",
    },
];

function MainLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useAtom(loadingAtom);
    const [, setNotification] = useAtom(notificationAtom);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleNavigate = (path) => {
        navigate(path);
        setDrawerOpen(false);
    };

    const handleForceRefresh = async () => {
        setLoading(true);
        try {
            const result = await systemAPI.forceRefresh();
            setNotification({
                open: true,
                message: `スキャン完了: ${result.files_added}個のファイルを追加、${result.files_updated}個を更新`,
                severity: "success",
            });
        } catch (error) {
            setNotification({
                open: true,
                message: "スキャンに失敗しました",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const getCurrentPageTitle = () => {
        const currentItem = menuItems.find((item) =>
            location.pathname.startsWith(item.path)
        );
        return currentItem?.label || "Video Streaming";
    };

    const drawer = (
        <Box>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Video Library
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <ListItem key={item.id} disablePadding>
                            <ListItemButton
                                selected={isActive}
                                onClick={() => handleNavigate(item.path)}
                            >
                                <ListItemIcon>
                                    {item.badge ? (
                                        <Badge
                                            badgeContent={item.badge}
                                            color="error"
                                        >
                                            {item.icon}
                                        </Badge>
                                    ) : (
                                        item.icon
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    secondary={item.description}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleForceRefresh}
                        disabled={loading}
                    >
                        <ListItemIcon>
                            <RefreshIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="強制スキャン"
                            secondary="ファイルを再スキャン"
                        />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => setSettingsOpen(true)}>
                        <ListItemIcon>
                            <SettingsIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="設定"
                            secondary="アプリケーション設定"
                        />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: "flex", height: "100vh" }}>
            <AppBar
                position="fixed"
                sx={{
                    width: {
                        sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)`,
                    },
                    ml: { sm: `${drawerOpen ? drawerWidth : 0}px` },
                    transition: "all 0.3s",
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 0, mr: 3 }}
                    >
                        {getCurrentPageTitle()}
                    </Typography>

                    {/* 検索バー */}
                    <Box
                        sx={{
                            flexGrow: 1,
                            display: { xs: "none", md: "block" },
                        }}
                    >
                        {!searchOpen && (
                            <Button
                                startIcon={<SearchIcon />}
                                onClick={() => setSearchOpen(true)}
                                sx={{ color: "white" }}
                            >
                                検索...
                            </Button>
                        )}
                        {searchOpen && (
                            <SearchBar onClose={() => setSearchOpen(false)} />
                        )}
                    </Box>

                    {/* モバイル用検索ボタン */}
                    <IconButton
                        color="inherit"
                        onClick={() => setSearchOpen(!searchOpen)}
                        sx={{ display: { xs: "block", md: "none" } }}
                    >
                        <SearchIcon />
                    </IconButton>

                    {/* 右側のコントロール */}
                    <Box
                        sx={{
                            ml: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <PlayerModeToggle />
                        <MultiSelectToggle />
                        <ViewToggle />
                        <Tooltip title="強制スキャン">
                            <IconButton
                                color="inherit"
                                onClick={handleForceRefresh}
                                disabled={loading}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="設定">
                            <IconButton
                                color="inherit"
                                onClick={() => setSettingsOpen(true)}
                            >
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>

                {/* モバイル用検索バー */}
                {searchOpen && (
                    <Box sx={{ display: { xs: "block", md: "none" }, p: 1 }}>
                        <SearchBar onClose={() => setSearchOpen(false)} />
                    </Box>
                )}
            </AppBar>

            <Box
                component="nav"
                sx={{
                    width: { sm: drawerOpen ? drawerWidth : 0 },
                    flexShrink: { sm: 0 },
                }}
            >
                <Drawer
                    variant="temporary"
                    open={drawerOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // モバイルでのパフォーマンス向上
                    }}
                    sx={{
                        display: { xs: "block", sm: "none" },
                        "& .MuiDrawer-paper": {
                            boxSizing: "border-box",
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="persistent"
                    open={drawerOpen}
                    sx={{
                        display: { xs: "none", sm: "block" },
                        "& .MuiDrawer-paper": {
                            boxSizing: "border-box",
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 0,
                    width: {
                        sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)`,
                    },
                    ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
                    transition: "all 0.3s",
                    mt: { xs: 7, sm: 8 },
                    height: "calc(100vh - 64px)",
                    overflow: "hidden",
                }}
            >
                {children}
            </Box>

            {/* 設定ダイアログ */}
            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </Box>
    );
}

export default MainLayout;
