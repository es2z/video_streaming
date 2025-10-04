import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Chip,
    Box,
    Typography,
    Autocomplete,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Checkbox,
} from "@mui/material";
import { Add as AddIcon, Close as CloseIcon } from "@mui/icons-material";

import { notificationAtom, recentTagsAtom } from "@store/atoms";
import { tagAPI, fileAPI } from "@services/api";

function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index} style={{ paddingTop: 16 }}>
            {value === index && children}
        </div>
    );
}

function TagEditDialog({ open, onClose, files = [] }) {
    const [, setNotification] = useAtom(notificationAtom);
    const [recentTags, setRecentTags] = useAtom(recentTagsAtom);

    const [tabValue, setTabValue] = useState(0);
    const [allTags, setAllTags] = useState([]);
    const [popularTags, setPopularTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [newTagName, setNewTagName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // タグ一覧取得
    useEffect(() => {
        if (open) {
            fetchTags();
        }
    }, [open]);

    const fetchTags = async () => {
        try {
            const [allResponse, popularResponse] = await Promise.all([
                tagAPI.getTags(),
                tagAPI.getPopularTags(20),
            ]);
            setAllTags(allResponse);
            setPopularTags(popularResponse);
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        }
    };

    // タグ追加
    const handleAddTag = (tag) => {
        if (tag && !selectedTags.find((t) => t.tag_name === tag.tag_name)) {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // タグ削除
    const handleRemoveTag = (tagToRemove) => {
        setSelectedTags(selectedTags.filter((t) => t.tag_name !== tagToRemove.tag_name));
    };

    // 新しいタグを作成
    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        try {
            const newTag = await tagAPI.createTag({ tag_name: newTagName.trim() });
            setAllTags([...allTags, newTag]);
            setSelectedTags([...selectedTags, newTag]);
            setNewTagName("");
            setNotification({
                open: true,
                message: "タグを作成しました",
                severity: "success",
            });
        } catch (error) {
            setNotification({
                open: true,
                message: "タグの作成に失敗しました",
                severity: "error",
            });
        }
    };

    // タグを保存
    const handleSave = async () => {
        if (files.length === 0 || selectedTags.length === 0) {
            onClose();
            return;
        }

        try {
            const tagNames = selectedTags.map((t) => t.tag_name);

            // 各ファイルにタグを追加
            for (const file of files) {
                await fileAPI.addTags(file.id, tagNames);
            }

            // 最近使用したタグに追加
            const updatedRecentTags = [
                ...selectedTags,
                ...recentTags.filter(
                    (rt) => !selectedTags.find((st) => st.tag_name === rt.tag_name)
                ),
            ].slice(0, 20);
            setRecentTags(updatedRecentTags);

            setNotification({
                open: true,
                message: `${files.length}個のファイルに${selectedTags.length}個のタグを追加しました`,
                severity: "success",
            });

            onClose();
            window.location.reload();
        } catch (error) {
            setNotification({
                open: true,
                message: "タグの追加に失敗しました",
                severity: "error",
            });
        }
    };

    // タブ切り替え
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // 検索フィルター
    const filteredAllTags = allTags.filter((tag) =>
        tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                タグを追加 ({files.length}個のファイル)
            </DialogTitle>
            <DialogContent>
                {/* 選択済みタグ */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        選択済みタグ
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {selectedTags.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                タグが選択されていません
                            </Typography>
                        ) : (
                            selectedTags.map((tag) => (
                                <Chip
                                    key={tag.tag_name}
                                    label={tag.tag_name}
                                    onDelete={() => handleRemoveTag(tag)}
                                    color="primary"
                                />
                            ))
                        )}
                    </Box>
                </Box>

                {/* タブ */}
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="よく使うタグ" />
                    <Tab label="最近使用" />
                    <Tab label="全タグ" />
                    <Tab label="新規作成" />
                </Tabs>

                {/* 人気タグ */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {popularTags.map((tag) => (
                            <Chip
                                key={tag.tag_name}
                                label={`${tag.tag_name} (${tag.usage_count})`}
                                onClick={() => handleAddTag(tag)}
                                variant="outlined"
                            />
                        ))}
                    </Box>
                </TabPanel>

                {/* 最近使用したタグ */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {recentTags.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                最近使用したタグはありません
                            </Typography>
                        ) : (
                            recentTags.map((tag) => (
                                <Chip
                                    key={tag.tag_name}
                                    label={tag.tag_name}
                                    onClick={() => handleAddTag(tag)}
                                    variant="outlined"
                                />
                            ))
                        )}
                    </Box>
                </TabPanel>

                {/* 全タグ */}
                <TabPanel value={tabValue} index={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="タグを検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <List
                        sx={{
                            maxHeight: 300,
                            overflow: "auto",
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                        }}
                    >
                        {filteredAllTags.map((tag) => (
                            <ListItem key={tag.tag_name} disablePadding>
                                <ListItemButton
                                    onClick={() => handleAddTag(tag)}
                                    selected={selectedTags.some(
                                        (t) => t.tag_name === tag.tag_name
                                    )}
                                >
                                    <ListItemText
                                        primary={tag.tag_name}
                                        secondary={`使用回数: ${tag.usage_count}`}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </TabPanel>

                {/* 新規作成 */}
                <TabPanel value={tabValue} index={3}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="新しいタグ名を入力..."
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                    handleCreateTag();
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreateTag}
                            disabled={!newTagName.trim()}
                        >
                            作成
                        </Button>
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={selectedTags.length === 0}
                >
                    タグを追加
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default TagEditDialog;
