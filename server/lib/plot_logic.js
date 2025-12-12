import { getGeminiModel, cleanJson, callDeepSeek, ANTI_CLICHE_INSTRUCTIONS } from './llm.js';

// --- Helper Functions ---
const formatMemoriesForFallback = (memories, limit = 30) => {
    if (!memories || memories.length === 0) return "暫無記憶";
    const startMemories = memories.slice(0, 5);
    const recentMemories = memories.slice(-limit);
    const combined = [...new Set([...startMemories, ...recentMemories])];
    return combined.map(m => `- ${m.content}`).join('\n');
};

/**
 * 劇情狀態管理器 - V23 事件驅動版 (Event-Driven)
 * 使用 instance_progress (0-100) 來決定階段，而非固定章節數。
 */
export const determinePlotDirectives = (currentChapterIndex, lastPlotState, genre, tags, totalChapters = 120) => {
    const hasTag = (t) => tags.some(tag => tag.includes(t));
    const isAngst = hasTag("虐戀") || hasTag("追妻");
    const hasSecretIdentity = hasTag("馬甲") || hasTag("掉馬");

    // 初始化狀態 (如果上一章沒有傳入狀態)
    let progress = lastPlotState?.instance_progress || 0;
    let cycleNum = lastPlotState?.cycle_num || 1;
    let arcName = lastPlotState?.arcName || `第${cycleNum}卷`;
    let phase = "setup"; // default

    // --- 1. 階段判定 (Based on Progress) ---
    // 無限流/副本類：彈性長度，由 Planner 決定何時結束
    if (progress <= 15) phase = "setup";
    else if (progress <= 75) phase = "investigation";
    else if (progress < 100) phase = "climax";
    else phase = "resolution"; // progress >= 100

    // 如果上一章已經結算 (resolution)，本章進入休整 (Rest) 或開啟新循環
    if (lastPlotState?.phase === 'resolution') {
        phase = "rest";
        progress = 0; // 重置進度給下一章（但本章還是 Rest）
    } else if (lastPlotState?.phase === 'rest') {
        // Rest 結束，開啟新循環
        phase = "setup";
        progress = 5;
        cycleNum += 1;
        arcName = `第${cycleNum}卷`;
    }

    // --- 2. 指令生成 ---
    let directive = "";
    let intensity = "medium";

    // 通用邏輯 (可根據 Genre 特化)
    if (phase === "setup") {
        intensity = "low (suspense)";
        directive = `【階段：新篇章/副本導入】主角進入新環境。**重點描寫環境的詭異/新奇、規則的建立、新配角的登場。** 暫時不要有高強度戰鬥，先鋪陳氛圍。更新 plot_state.arcName。`;
    } else if (phase === "investigation") {
        intensity = "medium";
        directive = `【階段：探索與發展】劇情推進期。尋找線索、解決小障礙、人際互動。**請根據進度條 (${progress}%) 決定劇情的緊湊度。** 若進度較低，多寫細節與鋪墊；若進度較高，準備迎接轉折。`;
    } else if (phase === "climax") {
        intensity = "high";
        directive = `【階段：高潮與決戰】**副本/事件的最高潮！** BOSS 戰、謎題揭曉、身分曝光。所有衝突集中爆發。主角必須全力以赴。`;
    } else if (phase === "resolution") {
        intensity = "low";
        directive = `【階段：結算與收尾】事件解決後的餘韻。清點收穫、治療傷勢、情感昇華。**請務必在本章結束當前事件，並給出一個明確的結局（小結）。**`;
    } else if (phase === "rest") {
        intensity = "low (fluff)";
        directive = `【階段：休整與日常】過渡章節。回到安全區/日常身分。處理戰利品、與 CP 發糖、鋪陳主線伏筆。準備迎接下一個挑戰。`;
    }

    // --- 3. 感情與馬甲 (Global Overlays) ---
    let romanceBeat = "感情升溫";
    if (phase === "investigation") romanceBeat = "並肩作戰/試探";
    if (phase === "climax") romanceBeat = isAngst ? "虐心抉擇" : "生死與共";
    if (phase === "rest") romanceBeat = "甜蜜日常/深度對話";

    let identityDirective = "";
    if (hasSecretIdentity && phase !== "rest") {
        identityDirective = "【馬甲線】：在行動中小心隱藏身分，或因意外差點掉馬。";
    }

    // --- 4. 終局判定 ---
    // 如果總章節快到了，強制覆蓋為終局模式
    if (totalChapters - currentChapterIndex <= 20) {
        arcName = "終章：最終決戰";
        phase = "finale";
        intensity = "high";
        directive = "【終局模式】收束全書伏筆，面對最終 BOSS。";
    }

    const finalDirective = `${directive}\n${identityDirective}\n**【❤️ 感情線】**：${romanceBeat}`;

    return { phase, intensity, directive: finalDirective, arcName, instanceProgress: progress, cycleNum };
};

/**
 * Planner Agent: 加入了副本進度管理
 */
export const planChapter = async (director, blueprint, contextSummary, memories = [], clues = [], genre = "", tags = [], useDeepSeek = false, characters = [], instanceProgress = 0) => {
    const memoryList = formatMemoriesForFallback(memories, 50);
    const clueList = clues.length > 0 ? clues.map(c => `- ${c}`).join('\n') : "目前暫無明確線索";

    const prompt = `
    你是一位小說劇情策劃（Plot Architect）。
    請根據【導演指令】、【世界觀藍圖】與【當前進度】，規劃下一章的詳細大綱。
    
    ${ANTI_CLICHE_INSTRUCTIONS}
    
    【當前狀態】
    - 劇情階段：${director.phase}
    - 導演指令：${director.directive}
    - 副本/篇章進度：${instanceProgress}% (請根據此進度判斷劇情推進速度)
    
    【設計圖 (終極目標)】
    ${typeof blueprint === 'string' ? blueprint : JSON.stringify(blueprint)}
    
    【前情提要】
    ${contextSummary}

    【任務】
    1. **進度管理**：如果進度接近 100%，請安排高潮或收尾；如果剛開始，請安排鋪墊。
    2. **邏輯推演**：確保劇情連貫，伏筆回收。
    3. **衝突設計**：設計本章的核心衝突點。
    4. **感情規劃**：規劃感情線的具體互動。
    
    請回傳 JSON:
    {
        "chapter_title": "本章暫定標題",
        "outline": "詳細的劇情大綱 (約 300-500 字)",
        "key_clue_action": "本章對線索的操作",
        "romance_moment": "感情高光時刻",
        "suggested_progress_increment": 5, // 建議本章推進多少進度 (1-10)
        "should_finish_instance": false // 是否建議結束當前副本/篇章
    }
    `;

    // Only if OPENROUTER_KEY is available in env (which llm.js handles via callDeepSeek if setup, but here we check existence via param or env logic?)
    // Note: callDeepSeek throws if key missing.
    // The original code checked `if (OPENROUTER_KEY && useDeepSeek)`. 
    // We'll rely on useDeepSeek and let callDeepSeek handle (or wrap). 
    // Ideally we should import OPENROUTER_KEY from config/env but process.env is available in Node.

    if (process.env.OPENROUTER_API_KEY && useDeepSeek) {
        try {
            return await callDeepSeek("你是一位專業的小說策劃。", prompt, true);
        } catch (e) {
            console.warn("DeepSeek Planning failed, fallback to Gemini.");
        }
    }

    const model = getGeminiModel(true);
    try {
        const result = await model.generateContent(prompt);
        return cleanJson(result.response.text());
    } catch (e) {
        return null;
    }
};
