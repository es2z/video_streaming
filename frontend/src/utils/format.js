/**
 * フォーマット用ユーティリティ関数
 */

/**
 * 時間を MM:SS または HH:MM:SS 形式にフォーマット
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間文字列
 */
export const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

/**
 * ファイルサイズを人間が読みやすい形式にフォーマット
 * @param {number} bytes - バイト数
 * @returns {string} フォーマットされたサイズ
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

/**
 * 日付を相対的な時間表現にフォーマット
 * @param {string|Date} date - 日付
 * @returns {string} 相対時間表現
 */
export const formatRelativeTime = (date) => {
    const now = new Date();
    const target = new Date(date);
    const diff = now - target;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}年前`;
    if (months > 0) return `${months}ヶ月前`;
    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return "たった今";
};

/**
 * 日付を YYYY/MM/DD HH:mm 形式にフォーマット
 * @param {string|Date} date - 日付
 * @returns {string} フォーマットされた日付
 */
export const formatDateTime = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");

    return `${year}/${month}/${day} ${hours}:${minutes}`;
};

/**
 * ファイル名を短縮表示
 * @param {string} filename - ファイル名
 * @param {number} maxLength - 最大長
 * @returns {string} 短縮されたファイル名
 */
export const truncateFileName = (filename, maxLength = 30) => {
    if (!filename || filename.length <= maxLength) return filename;

    const extension = filename.split(".").pop();
    const nameWithoutExt = filename.slice(0, -(extension.length + 1));
    const truncatedName = nameWithoutExt.slice(
        0,
        maxLength - extension.length - 4
    );

    return `${truncatedName}...${extension}`;
};

/**
 * 数値を3桁ごとにカンマ区切り
 * @param {number} num - 数値
 * @returns {string} カンマ区切りの数値
 */
export const formatNumber = (num) => {
    if (!num && num !== 0) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * 動画の解像度を判定
 * @param {number} width - 幅
 * @param {number} height - 高さ
 * @returns {string} 解像度の名称
 */
export const getResolutionLabel = (width, height) => {
    if (!width || !height) return "Unknown";

    if (height >= 2160) return "4K";
    if (height >= 1440) return "2K";
    if (height >= 1080) return "Full HD";
    if (height >= 720) return "HD";
    if (height >= 480) return "SD";
    return "Low";
};

/**
 * ビットレートを適切な単位でフォーマット
 * @param {number} bitrate - ビットレート（bps）
 * @returns {string} フォーマットされたビットレート
 */
export const formatBitrate = (bitrate) => {
    if (!bitrate) return "Unknown";

    if (bitrate >= 1000000) {
        return `${(bitrate / 1000000).toFixed(2)} Mbps`;
    }
    if (bitrate >= 1000) {
        return `${(bitrate / 1000).toFixed(2)} Kbps`;
    }
    return `${bitrate} bps`;
};

/**
 * パスからファイル名を抽出
 * @param {string} path - ファイルパス
 * @returns {string} ファイル名
 */
export const getFileNameFromPath = (path) => {
    if (!path) return "";
    return path.split(/[/\\]/).pop() || path;
};

/**
 * パスから拡張子を抽出
 * @param {string} path - ファイルパス
 * @returns {string} 拡張子
 */
export const getFileExtension = (path) => {
    if (!path) return "";
    const parts = path.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
};
