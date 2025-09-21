/**
 * キーボードショートカット処理
 */

import { atom } from "jotai";

// グローバルキーボードショートカット設定
const shortcuts = {
    // ナビゲーション
    "ctrl+1": {
        action: "navigate",
        target: "/all-files",
        description: "全ファイル",
    },
    "ctrl+2": {
        action: "navigate",
        target: "/no-folder",
        description: "フォルダに存在しない",
    },
    "ctrl+3": {
        action: "navigate",
        target: "/folders",
        description: "フォルダ",
    },
    "ctrl+4": {
        action: "navigate",
        target: "/deleted",
        description: "削除ファイル",
    },
    "ctrl+5": {
        action: "navigate",
        target: "/duplicates",
        description: "重複ファイル",
    },

    // 検索
    "ctrl+f": { action: "search", description: "検索" },
    "ctrl+k": { action: "search", description: "検索（代替）" },
    escape: { action: "closeSearch", description: "検索を閉じる" },

    // 表示切替
    "ctrl+shift+v": { action: "toggleView", description: "表示モード切替" },
    "ctrl+m": { action: "toggleMultiSelect", description: "複数選択切替" },

    // ファイル操作
    "ctrl+a": { action: "selectAll", description: "全選択" },
    "ctrl+shift+a": { action: "deselectAll", description: "選択解除" },
    delete: { action: "deleteSelected", description: "選択ファイルを削除" },
    "ctrl+r": { action: "refresh", description: "更新" },

    // プレイヤー（グローバル）
    f11: { action: "fullscreen", description: "フルスクリーン" },
};

// プレイヤー専用ショートカット
const playerShortcuts = {
    " ": { action: "playPause", description: "再生/一時停止" },
    f: { action: "fullscreen", description: "フルスクリーン" },
    m: { action: "mute", description: "ミュート切替" },
    l: { action: "loop", description: "ループ切替" },
    ArrowLeft: { action: "seekBackward", description: "巻き戻し" },
    ArrowRight: { action: "seekForward", description: "スキップ" },
    ArrowUp: { action: "volumeUp", description: "音量アップ" },
    ArrowDown: { action: "volumeDown", description: "音量ダウン" },
    "<": { action: "speedDown", description: "速度ダウン" },
    ">": { action: "speedUp", description: "速度アップ" },
    ",": { action: "speedDown", description: "速度ダウン（代替）" },
    ".": { action: "speedUp", description: "速度アップ（代替）" },
    n: { action: "nextVideo", description: "次の動画" },
    p: { action: "previousVideo", description: "前の動画" },
    a: { action: "setABLoopStart", description: "A-Bループ開始点" },
    b: { action: "setABLoopEnd", description: "A-Bループ終了点" },
    r: { action: "toggleABLoop", description: "A-Bループ切替" },
    1: { action: "speed1x", description: "1倍速" },
    2: { action: "speed2x", description: "2倍速" },
    5: { action: "speed05x", description: "0.5倍速" },
};

// 現在のハンドラーを保存
let currentHandlers = new Map();

/**
 * キーボードイベントからキー文字列を生成
 */
const getKeyString = (event) => {
    const parts = [];

    if (event.ctrlKey || event.metaKey) parts.push("ctrl");
    if (event.shiftKey) parts.push("shift");
    if (event.altKey) parts.push("alt");

    // キー名を正規化
    let key = event.key.toLowerCase();

    // 特殊キーの変換
    const keyMap = {
        arrowleft: "ArrowLeft",
        arrowright: "ArrowRight",
        arrowup: "ArrowUp",
        arrowdown: "ArrowDown",
        escape: "escape",
        enter: "enter",
        delete: "delete",
        " ": " ",
    };

    if (keyMap[key]) {
        key = keyMap[key];
    }

    parts.push(key);

    return parts.join("+");
};

/**
 * ショートカットハンドラーを登録
 */
export const registerShortcut = (keyCombo, handler, options = {}) => {
    const {
        preventDefault = true,
        stopPropagation = false,
        scope = "global",
    } = options;

    const wrappedHandler = (event) => {
        const keyString = getKeyString(event);

        if (keyString === keyCombo) {
            if (preventDefault) event.preventDefault();
            if (stopPropagation) event.stopPropagation();
            handler(event);
            return true;
        }
        return false;
    };

    currentHandlers.set(keyCombo, { handler: wrappedHandler, scope });
    return () => currentHandlers.delete(keyCombo);
};

/**
 * グローバルキーボードショートカットをセットアップ
 */
export const setupKeyboardShortcuts = () => {
    const handleKeyDown = (event) => {
        // 入力フィールドでは無効化
        if (
            event.target.matches("input, textarea, select, [contenteditable]")
        ) {
            return;
        }

        const keyString = getKeyString(event);

        // 登録されたハンドラーを実行
        for (const [combo, { handler }] of currentHandlers) {
            if (handler(event)) {
                return;
            }
        }

        // デフォルトショートカット
        const shortcut = shortcuts[keyString];
        if (shortcut) {
            event.preventDefault();
            handleShortcutAction(shortcut.action, event);
        }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
        document.removeEventListener("keydown", handleKeyDown);
    };
};

/**
 * プレイヤー用キーボードショートカットをセットアップ
 */
export const setupPlayerShortcuts = (playerRef, callbacks) => {
    const handleKeyDown = (event) => {
        // プレイヤーがフォーカスされていない場合は無効
        if (!playerRef.current?.contains(document.activeElement)) {
            return;
        }

        const key = event.key;
        const shortcut = playerShortcuts[key];

        if (shortcut) {
            event.preventDefault();
            handlePlayerShortcutAction(shortcut.action, callbacks, event);
        }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
        document.removeEventListener("keydown", handleKeyDown);
    };
};

/**
 * ショートカットアクションを処理
 */
const handleShortcutAction = (action, event) => {
    switch (action) {
        case "navigate":
            // ナビゲーション処理は各コンポーネントで実装
            window.dispatchEvent(
                new CustomEvent("shortcut:navigate", {
                    detail: { target: event.target },
                })
            );
            break;

        case "search":
            window.dispatchEvent(new CustomEvent("shortcut:search"));
            break;

        case "closeSearch":
            window.dispatchEvent(new CustomEvent("shortcut:closeSearch"));
            break;

        case "toggleView":
            window.dispatchEvent(new CustomEvent("shortcut:toggleView"));
            break;

        case "toggleMultiSelect":
            window.dispatchEvent(new CustomEvent("shortcut:toggleMultiSelect"));
            break;

        case "selectAll":
            window.dispatchEvent(new CustomEvent("shortcut:selectAll"));
            break;

        case "deselectAll":
            window.dispatchEvent(new CustomEvent("shortcut:deselectAll"));
            break;

        case "deleteSelected":
            window.dispatchEvent(new CustomEvent("shortcut:deleteSelected"));
            break;

        case "refresh":
            window.location.reload();
            break;

        case "fullscreen":
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
            break;

        default:
            console.warn("Unknown shortcut action:", action);
    }
};

/**
 * プレイヤーショートカットアクションを処理
 */
const handlePlayerShortcutAction = (action, callbacks, event) => {
    const {
        onPlayPause,
        onSeekForward,
        onSeekBackward,
        onVolumeUp,
        onVolumeDown,
        onSpeedUp,
        onSpeedDown,
        onToggleMute,
        onToggleLoop,
        onToggleFullscreen,
        onNextVideo,
        onPreviousVideo,
        onSetSpeed,
        onSetABLoopStart,
        onSetABLoopEnd,
        onToggleABLoop,
    } = callbacks;

    switch (action) {
        case "playPause":
            onPlayPause?.();
            break;

        case "seekForward":
            onSeekForward?.();
            break;

        case "seekBackward":
            onSeekBackward?.();
            break;

        case "volumeUp":
            onVolumeUp?.();
            break;

        case "volumeDown":
            onVolumeDown?.();
            break;

        case "speedUp":
            onSpeedUp?.();
            break;

        case "speedDown":
            onSpeedDown?.();
            break;

        case "mute":
            onToggleMute?.();
            break;

        case "loop":
            onToggleLoop?.();
            break;

        case "fullscreen":
            onToggleFullscreen?.();
            break;

        case "nextVideo":
            onNextVideo?.();
            break;

        case "previousVideo":
            onPreviousVideo?.();
            break;

        case "speed1x":
            onSetSpeed?.(1);
            break;

        case "speed2x":
            onSetSpeed?.(2);
            break;

        case "speed05x":
            onSetSpeed?.(0.5);
            break;

        case "setABLoopStart":
            onSetABLoopStart?.();
            break;

        case "setABLoopEnd":
            onSetABLoopEnd?.();
            break;

        case "toggleABLoop":
            onToggleABLoop?.();
            break;

        default:
            console.warn("Unknown player shortcut action:", action);
    }
};

/**
 * ショートカットヘルプを取得
 */
export const getShortcutHelp = () => {
    const globalShortcuts = Object.entries(shortcuts).map(([key, value]) => ({
        key: key.toUpperCase().replace("+", " + "),
        description: value.description,
        category: "グローバル",
    }));

    const playerShortcutsList = Object.entries(playerShortcuts).map(
        ([key, value]) => ({
            key: key === " " ? "Space" : key.toUpperCase(),
            description: value.description,
            category: "プレイヤー",
        })
    );

    return [...globalShortcuts, ...playerShortcutsList];
};

/**
 * ショートカットが有効かどうかを確認
 */
export const isShortcutEnabled = (keyCombo) => {
    return (
        shortcuts[keyCombo] !== undefined ||
        playerShortcuts[keyCombo] !== undefined
    );
};

/**
 * カスタムショートカットを追加
 */
export const addCustomShortcut = (keyCombo, action, description) => {
    shortcuts[keyCombo] = { action, description, custom: true };
};

/**
 * カスタムショートカットを削除
 */
export const removeCustomShortcut = (keyCombo) => {
    if (shortcuts[keyCombo]?.custom) {
        delete shortcuts[keyCombo];
    }
};
