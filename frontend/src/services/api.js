import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const MEDIA_URL =
    import.meta.env.VITE_MEDIA_URL || "http://localhost:8000/media";

// Axiosインスタンスの作成
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// リクエストインターセプター
api.interceptors.request.use(
    (config) => {
        // 必要に応じて認証トークンなどを追加
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// レスポンスインターセプター
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        console.error("API Error:", error);
        return Promise.reject(error);
    }
);

// ファイル関連API
export const fileAPI = {
    // ファイル一覧取得
    getFiles: (params = {}) => {
        return api.get("/files/", { params });
    },

    // すべてのファイル取得
    getAllFiles: (params = {}) => {
        return api.get("/files/all/", { params });
    },

    // フォルダに属さないファイル取得
    getNoFolderFiles: (params = {}) => {
        return api.get("/files/no-folder/", { params });
    },

    // 削除済みファイル取得
    getDeletedFiles: (params = {}) => {
        return api.get("/files/deleted/", { params });
    },

    // 重複ファイル取得
    getDuplicateFiles: (params = {}) => {
        return api.get("/files/duplicates/", { params });
    },

    // ファイル詳細取得
    getFile: (id) => {
        return api.get(`/files/${id}/`);
    },

    // ファイル更新
    updateFile: (id, data) => {
        return api.patch(`/files/${id}/`, data);
    },

    // 削除フラグ設定
    markAsDeleted: (id) => {
        return api.post(`/files/${id}/mark_deleted/`);
    },

    // 削除フラグ解除
    restoreFile: (id) => {
        return api.post(`/files/${id}/restore/`);
    },

    // フォルダに追加
    addToFolder: (id, folderId) => {
        return api.post(`/files/${id}/add_to_folder/`, { folder_id: folderId });
    },

    // フォルダから削除
    removeFromFolder: (id, folderId) => {
        return api.post(`/files/${id}/remove_from_folder/`, {
            folder_id: folderId,
        });
    },

    // タグ追加
    addTags: (id, tagNames) => {
        return api.post(`/files/${id}/add_tags/`, { tag_names: tagNames });
    },

    // タグ削除
    removeTags: (id, tagNames) => {
        return api.post(`/files/${id}/remove_tags/`, { tag_names: tagNames });
    },

    // 一括操作
    bulkAction: (data) => {
        return api.post("/files/bulk_action/", data);
    },
};

// フォルダ関連API
export const folderAPI = {
    // フォルダ一覧取得
    getFolders: (params = {}) => {
        return api.get("/folders/", { params });
    },

    // フォルダツリー取得
    getFolderTree: () => {
        return api.get("/folders/tree/");
    },

    // フォルダ詳細取得
    getFolder: (id) => {
        return api.get(`/folders/${id}/`);
    },

    // フォルダ作成
    createFolder: (data) => {
        return api.post("/folders/", data);
    },

    // フォルダ更新
    updateFolder: (id, data) => {
        return api.patch(`/folders/${id}/`, data);
    },

    // フォルダ削除
    deleteFolder: (id) => {
        return api.delete(`/folders/${id}/`);
    },
};

// タグ関連API
export const tagAPI = {
    // タグ一覧取得
    getTags: (params = {}) => {
        return api.get("/tags/", { params });
    },

    // 人気タグ取得
    getPopularTags: (limit = 20) => {
        return api.get("/tags/popular/", { params: { limit } });
    },

    // タグ検索
    searchTags: (query) => {
        return api.get("/tags/search/", { params: { q: query } });
    },

    // タグ作成
    createTag: (data) => {
        return api.post("/tags/", data);
    },

    // タグ更新
    updateTag: (id, data) => {
        return api.patch(`/tags/${id}/`, data);
    },

    // タグ削除
    deleteTag: (id) => {
        return api.delete(`/tags/${id}/`);
    },
};

// グループ関連API
export const groupAPI = {
    // グループ一覧取得
    getGroups: () => {
        return api.get("/groups/");
    },

    // グループ作成
    createGroup: (data) => {
        return api.post("/groups/", data);
    },

    // グループ更新
    updateGroup: (id, data) => {
        return api.patch(`/groups/${id}/`, data);
    },

    // グループ削除
    deleteGroup: (id) => {
        return api.delete(`/groups/${id}/`);
    },
};

// システム関連API
export const systemAPI = {
    // 強制スキャン実行
    forceRefresh: () => {
        return api.get("/force_refresh/");
    },

    // スキャン履歴取得
    getScanHistory: () => {
        return api.get("/scan-history/");
    },

    // 最新スキャン履歴取得
    getLatestScan: () => {
        return api.get("/scan-history/latest/");
    },
};

// メディアURL生成ヘルパー
export const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${MEDIA_URL}/${path}`;
};

// サムネイルURL生成ヘルパー
export const getThumbnailUrl = (file) => {
    if (file.thumbnail_url) {
        return file.thumbnail_url;
    }
    if (file.thumbnail_file_path) {
        return getMediaUrl(file.thumbnail_file_path);
    }
    return null;
};

// 動画URL生成ヘルパー
export const getVideoUrl = (file) => {
    if (file.video_url) {
        return file.video_url;
    }
    if (file.file_path) {
        return getMediaUrl(file.file_path);
    }
    return null;
};

export default api;
