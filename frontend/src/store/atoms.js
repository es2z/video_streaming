import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// 表示モード（サムネイル or 詳細）
export const viewModeAtom = atomWithStorage("viewMode", "thumbnail");

// 複数選択モード
export const multiSelectModeAtom = atom(false);

// 選択されたファイル
export const selectedFilesAtom = atom([]);

// 現在のフォルダ
export const currentFolderAtom = atom(null);

// フォルダパス（階層）
export const folderPathAtom = atom([]);

// 検索クエリ
export const searchQueryAtom = atom("");

// フィルター設定
export const filterSettingsAtom = atom({
    showDeleted: false,
    showDuplicates: false,
    showNoFolder: false,
    tags: [],
});

// ソート設定
export const sortSettingsAtom = atomWithStorage("sortSettings", {
    field: "created_at",
    order: "desc",
});

// プレイヤー設定（ローカルストレージに保存）
export const playerSettingsAtom = atomWithStorage("playerSettings", {
    playbackSpeed: 1.0,
    volume: 1.0,
    muted: false,
    loop: false,
    autoPlay: true,
    skipSeconds: 5, // ダブルタップでスキップする秒数
    longPressSpeed: 2.0, // 長押し時の倍速
    aspectRatioFit: "contain", // 'contain' or 'cover'
    abLoop: {
        enabled: false,
        start: null,
        end: null,
    },
});

// 開いているプレイヤー
export const openPlayersAtom = atom([]);

// プレイヤーレイアウトモード
export const playerLayoutModeAtom = atom("free"); // 'free' or 'grid'

// コンテキストメニュー
export const contextMenuAtom = atom({
    open: false,
    x: 0,
    y: 0,
    file: null,
    type: null, // 'file', 'folder', 'background'
});

// 通知
export const notificationAtom = atom({
    open: false,
    message: "",
    severity: "info", // 'success', 'error', 'warning', 'info'
});

// ローディング状態
export const loadingAtom = atom(false);

// フォルダツリー
export const folderTreeAtom = atom([]);

// タグリスト
export const tagsListAtom = atom([]);

// グループリスト
export const groupsListAtom = atom([]);

// 最近使用したタグ
export const recentTagsAtom = atomWithStorage("recentTags", []);

// お気に入りフォルダ
export const favoriteFoldersAtom = atomWithStorage("favoriteFolders", []);

// 表示設定
export const displaySettingsAtom = atomWithStorage("displaySettings", {
    thumbnailSize: "medium", // 'small', 'medium', 'large'
    showFileInfo: true,
    animatedThumbnails: true,
    gridColumns: "auto", // 'auto', 2, 3, 4, 5, 6
});

// キーボードショートカット設定
export const keyboardShortcutsAtom = atomWithStorage("keyboardShortcuts", {
    playPause: " ", // スペースキー
    fullscreen: "f",
    volumeUp: "ArrowUp",
    volumeDown: "ArrowDown",
    seekForward: "ArrowRight",
    seekBackward: "ArrowLeft",
    speedUp: ">",
    speedDown: "<",
    toggleLoop: "l",
    toggleMute: "m",
    nextVideo: "n",
    previousVideo: "p",
});

// ドラッグ中のファイル
export const draggingFilesAtom = atom(null);

// フォルダ移動/コピーモード
export const folderActionModeAtom = atom({
    active: false,
    action: null, // 'move' or 'copy'
    files: [],
});

// 最後に開いたファイル（履歴）
export const fileHistoryAtom = atomWithStorage("fileHistory", []);

// ウィンドウサイズ（レスポンシブ対応）
export const windowSizeAtom = atom({
    width: window.innerWidth,
    height: window.innerHeight,
});

// デバイスタイプ
export const deviceTypeAtom = atom((get) => {
    const { width } = get(windowSizeAtom);
    if (width < 480) return "mobile";
    if (width < 768) return "tablet";
    return "desktop";
});

// タッチデバイスかどうか
export const isTouchDeviceAtom = atom(
    "ontouchstart" in window || navigator.maxTouchPoints > 0
);
