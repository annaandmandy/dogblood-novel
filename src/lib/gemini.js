

import {
    getGeminiModel,
    callDeepSeek,
    cleanJson,
    ANTI_CLICHE_INSTRUCTIONS,
    getToneInstruction,
    getPovInstruction,
    polishContent,
    translateToChinese,
    callOpenRouterPipeline,
    callApi
} from "./llm.js";

// ==========================================
// 核心 Agent 函數群
// ==========================================



export const generateRandomSettings = async (genre, tags = [], tone = "一般", targetChapterCount = null, category = "BG", useDeepSeek = false) => {
    return callApi('generate-settings', { genre, tags, tone, targetChapterCount, category, useDeepSeek });
};

export const ensureDetailedSettings = async (genre, simpleSettings, tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    return callApi('ensure-detailed-settings', { genre, settings: simpleSettings, tags, tone, category, useDeepSeek });
};

export const generateNovelStart = async (genre, settings, tags = [], tone = "一般", pov = "女主", useDeepSeek = false) => {
    return callApi('generate-start', { genre, settings, tags, tone, pov, useDeepSeek });
};

export const generateNextChapter = async (novelContext, prevText, characters = [], memories = [], clues = [], tags = [], tone = "一般", pov = "女主", lastPlotState = null, useDeepSeek = false) => {
    return callApi('generate-chapter', { novelContext, prevText, characters, memories, clues, tags, tone, pov, lastPlotState, useDeepSeek });
};

export const refineCharacterProfile = async (charInfo, novelContext, useDeepSeek = false) => {
    // Simple implementation or placeholder
    const model = getGeminiModel(true);
    const prompt = `請完善角色設定：${charInfo.name}。小說：${novelContext.title}。回傳 JSON: { "profile": { ... } }`;
    try {
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text())?.profile || {};
    } catch (e) { return {}; }
};

export const translateContent = async (text, targetLang = 'English') => {
    return await translateToChinese(text); // Reusing existing helper for now
};