import React, { useState } from "react";
import { useAtom } from "jotai";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Box,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Slider,
    Switch,
    TextField,
    Typography,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Select,
    MenuItem,
    InputLabel,
} from "@mui/material";

import {
    displaySettingsAtom,
    playerSettingsAtom,
    keyboardShortcutsAtom,
} from "@store/atoms";
import { getShortcutHelp } from "@utils/keyboard";

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

function SettingsDialog({ open, onClose }) {
    const [tabValue, setTabValue] = useState(0);
    const [displaySettings, setDisplaySettings] = useAtom(displaySettingsAtom);
    const [playerSettings, setPlayerSettings] = useAtom(playerSettingsAtom);
    const [keyboardShortcuts, setKeyboardShortcuts] = useAtom(
        keyboardShortcutsAtom
    );

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleDisplaySettingChange = (key, value) => {
        setDisplaySettings((prev) => ({ ...prev, [key]: value }));
    };

    const handlePlayerSettingChange = (key, value) => {
        setPlayerSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleKeyboardShortcutChange = (key, value) => {
        setKeyboardShortcuts((prev) => ({ ...prev, [key]: value }));
    };

    const shortcuts = getShortcutHelp();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { height: "80vh" },
            }}
        >
            <DialogTitle>設定</DialogTitle>
            <DialogContent dividers>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="表示" />
                    <Tab label="プレイヤー" />
                    <Tab label="キーボード" />
                    <Tab label="詳細" />
                </Tabs>

                {/* 表示設定 */}
                <TabPanel value={tabValue} index={0}>
                    <List>
                        <ListItem>
                            <ListItemText
                                primary="サムネイルサイズ"
                                secondary="グリッド表示時のサムネイルサイズ"
                            />
                            <ListItemSecondaryAction>
                                <FormControl
                                    variant="outlined"
                                    size="small"
                                    sx={{ minWidth: 120 }}
                                >
                                    <Select
                                        value={displaySettings.thumbnailSize}
                                        onChange={(e) =>
                                            handleDisplaySettingChange(
                                                "thumbnailSize",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="small">小</MenuItem>
                                        <MenuItem value="medium">中</MenuItem>
                                        <MenuItem value="large">大</MenuItem>
                                    </Select>
                                </FormControl>
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="ファイル情報表示"
                                secondary="サムネイル下にファイル名とサイズを表示"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={displaySettings.showFileInfo}
                                    onChange={(e) =>
                                        handleDisplaySettingChange(
                                            "showFileInfo",
                                            e.target.checked
                                        )
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="アニメーションサムネイル"
                                secondary="GIFサムネイルをアニメーション表示"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={displaySettings.animatedThumbnails}
                                    onChange={(e) =>
                                        handleDisplaySettingChange(
                                            "animatedThumbnails",
                                            e.target.checked
                                        )
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="グリッド列数"
                                secondary="グリッド表示の列数"
                            />
                            <ListItemSecondaryAction>
                                <FormControl
                                    variant="outlined"
                                    size="small"
                                    sx={{ minWidth: 120 }}
                                >
                                    <Select
                                        value={displaySettings.gridColumns}
                                        onChange={(e) =>
                                            handleDisplaySettingChange(
                                                "gridColumns",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="auto">自動</MenuItem>
                                        <MenuItem value={2}>2列</MenuItem>
                                        <MenuItem value={3}>3列</MenuItem>
                                        <MenuItem value={4}>4列</MenuItem>
                                        <MenuItem value={5}>5列</MenuItem>
                                        <MenuItem value={6}>6列</MenuItem>
                                    </Select>
                                </FormControl>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                </TabPanel>

                {/* プレイヤー設定 */}
                <TabPanel value={tabValue} index={1}>
                    <List>
                        <ListItem>
                            <ListItemText
                                primary="デフォルト再生速度"
                                secondary={`${playerSettings.playbackSpeed}倍速`}
                            />
                            <Box sx={{ width: 200, ml: 2 }}>
                                <Slider
                                    value={playerSettings.playbackSpeed}
                                    onChange={(e, value) =>
                                        handlePlayerSettingChange(
                                            "playbackSpeed",
                                            value
                                        )
                                    }
                                    min={0.25}
                                    max={5}
                                    step={0.25}
                                    marks
                                    valueLabelDisplay="auto"
                                />
                            </Box>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="デフォルト音量"
                                secondary={`${Math.round(
                                    playerSettings.volume * 100
                                )}%`}
                            />
                            <Box sx={{ width: 200, ml: 2 }}>
                                <Slider
                                    value={playerSettings.volume}
                                    onChange={(e, value) =>
                                        handlePlayerSettingChange(
                                            "volume",
                                            value
                                        )
                                    }
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(value) =>
                                        `${Math.round(value * 100)}%`
                                    }
                                />
                            </Box>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="スキップ秒数"
                                secondary="ダブルタップでスキップする秒数"
                            />
                            <Box sx={{ width: 200, ml: 2 }}>
                                <Slider
                                    value={playerSettings.skipSeconds}
                                    onChange={(e, value) =>
                                        handlePlayerSettingChange(
                                            "skipSeconds",
                                            value
                                        )
                                    }
                                    min={5}
                                    max={30}
                                    step={5}
                                    marks
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(value) => `${value}秒`}
                                />
                            </Box>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="長押し倍速"
                                secondary="長押し時の再生速度"
                            />
                            <Box sx={{ width: 200, ml: 2 }}>
                                <Slider
                                    value={playerSettings.longPressSpeed}
                                    onChange={(e, value) =>
                                        handlePlayerSettingChange(
                                            "longPressSpeed",
                                            value
                                        )
                                    }
                                    min={1.5}
                                    max={5}
                                    step={0.5}
                                    marks
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(value) => `${value}倍速`}
                                />
                            </Box>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="自動再生"
                                secondary="動画を開いた時に自動で再生"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={playerSettings.autoPlay}
                                    onChange={(e) =>
                                        handlePlayerSettingChange(
                                            "autoPlay",
                                            e.target.checked
                                        )
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="ループ再生"
                                secondary="動画を繰り返し再生"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={playerSettings.loop}
                                    onChange={(e) =>
                                        handlePlayerSettingChange(
                                            "loop",
                                            e.target.checked
                                        )
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>

                        <ListItem>
                            <ListItemText
                                primary="アスペクト比"
                                secondary="動画の表示方法"
                            />
                            <ListItemSecondaryAction>
                                <FormControl
                                    variant="outlined"
                                    size="small"
                                    sx={{ minWidth: 120 }}
                                >
                                    <Select
                                        value={playerSettings.aspectRatioFit}
                                        onChange={(e) =>
                                            handlePlayerSettingChange(
                                                "aspectRatioFit",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="contain">
                                            全体表示
                                        </MenuItem>
                                        <MenuItem value="cover">
                                            画面いっぱい
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                </TabPanel>

                {/* キーボードショートカット */}
                <TabPanel value={tabValue} index={2}>
                    <Typography variant="h6" gutterBottom>
                        キーボードショートカット一覧
                    </Typography>
                    <List dense>
                        {shortcuts.map((shortcut, index) => (
                            <React.Fragment key={index}>
                                {index > 0 &&
                                    shortcuts[index - 1].category !==
                                        shortcut.category && (
                                        <>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                                sx={{ mt: 2, mb: 1 }}
                                            >
                                                {shortcut.category}
                                            </Typography>
                                        </>
                                    )}
                                {index === 0 && (
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                    >
                                        {shortcut.category}
                                    </Typography>
                                )}
                                <ListItem>
                                    <ListItemText
                                        primary={shortcut.description}
                                        secondary={shortcut.key}
                                        secondaryTypographyProps={{
                                            component: "span",
                                            sx: {
                                                fontFamily: "monospace",
                                                bgcolor: "action.hover",
                                                px: 1,
                                                py: 0.5,
                                                borderRadius: 1,
                                                display: "inline-block",
                                            },
                                        }}
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                </TabPanel>

                {/* 詳細設定 */}
                <TabPanel value={tabValue} index={3}>
                    <Typography variant="h6" gutterBottom>
                        システム情報
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemText
                                primary="バージョン"
                                secondary="1.0.0"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="バックエンドURL"
                                secondary={import.meta.env.VITE_API_URL}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="メディアURL"
                                secondary={import.meta.env.VITE_MEDIA_URL}
                            />
                        </ListItem>
                    </List>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" gutterBottom>
                        データ管理
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                if (
                                    confirm("すべての設定をリセットしますか？")
                                ) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            color="error"
                        >
                            設定をリセット
                        </Button>
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>閉じる</Button>
            </DialogActions>
        </Dialog>
    );
}

export default SettingsDialog;
