const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const getRecommendedTotalChapters = (genre) => {
    switch (genre) {
        case "無限流": case "修仙玄幻": case "西方奇幻": case "星際科幻": return 200;
        case "末世生存": return 160;
        default: return 120;
    }
};

const callApi = async (endpoint, body) => {
    try {
        const response = await fetch(`${API_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Call Failed (${endpoint}):`, error);
        throw error;
    }
};

export const generateRandomSettings = async (genre, tags = [], tone = "一般", targetChapterCount = null, category = "BG", useDeepSeek = false) => {
    return callApi('generate-settings', { genre, tags, tone, targetChapterCount, category, useDeepSeek });
};

export const ensureDetailedSettings = async (genre, simpleSettings, tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    return callApi('ensure-detailed-settings', { genre, simpleSettings, tags, tone, category, useDeepSeek });
};

export const refineCharacterProfile = async (charInfo, novelContext, useDeepSeek = false) => {
    return callApi('refine-character', { charInfo, novelContext, useDeepSeek });
};

export const generateNovelStart = async (genre, settings, tags = [], tone = "一般", pov = "女主", useDeepSeek = false) => {
    return callApi('generate-start', { genre, settings, tags, tone, pov, useDeepSeek });
};

export const generateNextChapter = async (novelContext, prevText, characters = [], memories = [], clues = [], tags = [], tone = "一般", pov = "女主", lastPlotState = null, useDeepSeek = false) => {
    return callApi('generate-chapter', { novelContext, prevText, characters, memories, clues, tags, tone, pov, lastPlotState, useDeepSeek });
};