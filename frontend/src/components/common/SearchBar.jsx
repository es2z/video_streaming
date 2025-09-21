import React, { useState, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import {
    Box,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    Autocomplete,
    Paper,
    Popper,
} from "@mui/material";
import {
    Search as SearchIcon,
    Close as CloseIcon,
    Clear as ClearIcon,
} from "@mui/icons-material";

import { searchQueryAtom, tagsListAtom } from "@store/atoms";
import { tagAPI } from "@services/api";

function SearchBar({ onClose }) {
    const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
    const [tagsList, setTagsList] = useAtom(tagsListAtom);

    const [inputValue, setInputValue] = useState(searchQuery);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);

    // 初回フォーカス
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // タグ候補の取得
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const tags = await tagAPI.getPopularTags(20);
                setTagsList(tags);
            } catch (error) {
                console.error("Failed to fetch tags:", error);
            }
        };

        if (tagsList.length === 0) {
            fetchTags();
        }
    }, [tagsList.length, setTagsList]);

    // 検索実行
    const handleSearch = () => {
        setSearchQuery(inputValue);
        setShowSuggestions(false);
    };

    // クリア
    const handleClear = () => {
        setInputValue("");
        setSearchQuery("");
        inputRef.current?.focus();
    };

    // キーボードショートカット
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        } else if (e.key === "Escape") {
            if (inputValue) {
                handleClear();
            } else {
                onClose?.();
            }
        }
    };

    // 検索候補の生成
    const generateSuggestions = (value) => {
        if (!value) {
            setSuggestions([]);
            return;
        }

        const lowerValue = value.toLowerCase();
        const tagSuggestions = tagsList
            .filter((tag) => tag.tag_name.toLowerCase().includes(lowerValue))
            .slice(0, 5)
            .map((tag) => ({
                type: "tag",
                label: tag.tag_name,
                value: `tag:${tag.tag_name}`,
            }));

        const searchSuggestions = [
            { type: "search", label: `"${value}"を検索`, value },
        ];

        setSuggestions([...searchSuggestions, ...tagSuggestions]);
    };

    // 入力変更
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        generateSuggestions(value);
        setShowSuggestions(true);
    };

    // 候補選択
    const handleSuggestionClick = (suggestion) => {
        setInputValue(suggestion.value);
        setSearchQuery(suggestion.value);
        setShowSuggestions(false);
    };

    return (
        <Box sx={{ position: "relative", width: "100%", maxWidth: 600 }}>
            <TextField
                ref={inputRef}
                fullWidth
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                placeholder="ファイル名やタグで検索..."
                variant="outlined"
                size="small"
                sx={{
                    bgcolor: "background.paper",
                    "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                            borderColor: "primary.main",
                        },
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            {inputValue && (
                                <IconButton size="small" onClick={handleClear}>
                                    <ClearIcon />
                                </IconButton>
                            )}
                            {onClose && (
                                <IconButton size="small" onClick={onClose}>
                                    <CloseIcon />
                                </IconButton>
                            )}
                        </InputAdornment>
                    ),
                }}
            />

            {/* 検索候補 */}
            {showSuggestions && suggestions.length > 0 && (
                <Paper
                    sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        mt: 0.5,
                        maxHeight: 300,
                        overflow: "auto",
                        zIndex: 1300,
                    }}
                    elevation={3}
                >
                    {suggestions.map((suggestion, index) => (
                        <Box
                            key={index}
                            sx={{
                                p: 1.5,
                                cursor: "pointer",
                                "&:hover": {
                                    bgcolor: "action.hover",
                                },
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion.type === "tag" && (
                                <Chip
                                    label="タグ"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            {suggestion.label}
                        </Box>
                    ))}
                </Paper>
            )}
        </Box>
    );
}

export default SearchBar;
