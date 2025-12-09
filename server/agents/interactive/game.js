import {
    callDeepSeek,
    getGeminiModel,
    cleanJson,
    ANTI_CLICHE_INSTRUCTIONS,
    getToneInstruction,
} from "../../lib/llm.js";

// ==========================================
// 🎮 Interactive Style Guide (遊戲化風格)
// ==========================================
const GAME_STYLE_GUIDE = `
【互動小說・風格指南】
1. **節奏極快**：跳過冗長的環境描寫，直接切入對話和動作。每一段都是一個「事件」。
2. **對話驅動**：像《全球高考》或《地球上線》那樣，用簡短、機鋒的對話來推進劇情。
3. **高智商/瘋批感**：主角面對危機時要展現出「漫不經心」或「邏輯碾壓」的態度。
4. **CP 極限拉扯**：無論發生什麼，主角和 CP (對象) 之間必須有張力（言語互損、肢體接觸、眼神交流）。
5. **結尾卡點**：每一段的結尾必須停在**「危機發生」**或**「必須做出抉擇」**的瞬間，引導玩家看選項。
`;

// ==========================================
// 1. 設定生成 (The Game Architect)
// ==========================================
// 這裡我們生成比較簡單、更像「遊戲簡介」的設定
export const generateInteractiveSettings = async (tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);

    let genderConstraint = "";
    if (category === "BG") genderConstraint = "主角必須是一男一女 (BG)。";
    else if (category === "BL") genderConstraint = "主角必須是兩位男性 (BL)。";
    else if (category === "GL") genderConstraint = "主角必須是兩位女性 (GL)。";

    const prompt = `
    你是一位**文字冒險遊戲 (Visual Novel)** 的金牌製作人。
    請根據標籤【${tags.join('、')}】，設計一個**高張力、適合遊戲化**的故事設定。
    
    **風格**：${toneDesc} | 強強對抗 | 無限流
    ${genderConstraint}
    
    【設計任務】
    1. **核心梗**：一句話講清楚遊戲的目標（如：在全是鬼的學校活到畢業）。
    2. **主角 (玩家視角)**：高智商、冷靜或瘋批。為什麼進入遊戲？
    3. **攻略對象 (CP)**：強大的 NPC、監考官或榜一。與主角是什麼關係？
    4. **開局場景**：第一關是什麼？（如：一輛開往地獄的公車）。

    【回傳 JSON】
    {
      "title": "遊戲標題",
      "summary": "遊戲簡介 (包含主角、CP、主線目標)",
      "protagonist": { "name": "...", "trait": "性格標籤 (如：高智商厭世)", "specialty": "金手指/特長" },
      "loveInterest": { "name": "...", "identity": "身份 (如：瘋批監考官)", "dynamic": "與主角的互動模式" },
      "first_level_brief": "第一關的簡要設定 (環境、致命規則)"
    }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是遊戲製作人。", prompt, true);
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    } catch (e) { return null; }
};

// ==========================================
// 2. 關卡策劃 (The Level Designer)
// ==========================================
const generateWithRetry = async (prompt, modelName, maxRetries = 2) => {
    const model = getGeminiModel(true);
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const res = await model.generateContent(prompt);
            const json = cleanJson(res.response.text());
            if (json) return json;
            console.warn(`Attempt ${i + 1} failed: Invalid JSON`);
        } catch (e) {
            console.warn(`Attempt ${i + 1} failed: ${e.message}`);
        }
    }
    return null;
};

// ==========================================
// 2. 關卡策劃 (The Level Designer)
// ==========================================
// 這是核心：根據用戶的選擇，計算下一段劇情和新選項
const planInteractiveSegment = async ({ contextSummary, userChoice, novelContext, useDeepSeek }) => {

    const prompt = `
    你是一位**互動式小說**的關卡設計師。
    
    【當前劇情狀態】
    ${contextSummary}
    
    【玩家剛才的選擇】
    👉 **${userChoice || "遊戲開始 (第一章)"}**

    【任務】
    請規劃**下一小節 (Segment)** 的劇本大綱。
    
    1. **承接選擇**：根據玩家選的 ${userChoice}，推演立即發生的後果（是成功打臉？還是受傷？還是觸發了 CP 的特殊反應？）。
    2. **推進衝突**：引入新的危機或挑戰。
    3. **設計新選項**：在結尾處設計 3 個截然不同的行動選項：
       - **選項 A (瘋批/激進)**：高風險、暴力、或者「搞事」。
       - **選項 B (理智/規則)**：利用邏輯漏洞、觀察細節、穩妥行事。
       - **選項 C (CP/調情)**：向 CP 求助、調戲 CP、或者利用 CP 的關係破局。

    【回傳 JSON】
    {
        "segment_title": "小節標題",
        "outline": "劇本大綱 (包含承接後果 -> 新危機 -> 結尾停頓點)",
        "options": [
            { "label": "選項A的內容", "type": "Aggressive", "hint": "預期後果" },
            { "label": "選項B的內容", "type": "Logical", "hint": "預期後果" },
            { "label": "選項C的內容", "type": "Romance", "hint": "預期後果" }
        ]
    }
    `;

    if (useDeepSeek) {
        try {
            return await callDeepSeek("你是關卡設計師。", prompt, true);
        } catch (e) {
            console.warn("DeepSeek failed, falling back to Gemini retry...");
        }
    }
    return await generateWithRetry(prompt, "Gemini");
};

// ==========================================
// 3. 劇本寫作 (The Scriptwriter)
// ==========================================
const writeInteractiveSegment = async ({ novelContext, plan, tone, useDeepSeek }) => {
    const toneDesc = getToneInstruction(tone);

    const prompt = `
    你是一位風格犀利的無限流小說家。請根據大綱撰寫一段**互動小說的劇本**。

    **風格**：${toneDesc}
    ${GAME_STYLE_GUIDE}
    ${ANTI_CLICHE_INSTRUCTIONS}

    【小說設定】
    - 主角：${novelContext.settings?.protagonist?.name} (${novelContext.settings?.protagonist?.trait})
    - CP：${novelContext.settings?.loveInterest?.name} (${novelContext.settings?.loveInterest?.identity})

    【劇本大綱】
    ${plan.outline}

    【寫作要求】
    1. **字數**：**800 - 1200 字** (短小精悍，不要長篇大論)。
    2. **開頭**：直接承接上一次的選擇後果，不要寫「前情提要」。
    3. **結尾**：必須停在**主角準備做出行動**的那一刻，與下方的選項無縫銜接。
    4. **CP感**：必須描寫主角與 CP 之間的眼神、動作或語言交鋒（張力拉滿）。
    5. **嚴禁出現選項**：請不要在正文結尾列出 A/B/C 選項，只需寫劇情。選項會由系統另外顯示。

    回傳 JSON: { "content": "..." }
    `;

    if (useDeepSeek) {
        try {
            return await callDeepSeek("你是劇本作家。", prompt, true);
        } catch (e) {
            console.warn("DeepSeek failed, falling back to Gemini retry...");
        }
    }
    return await generateWithRetry(prompt, "Gemini");
};

// ==========================================
// 🚀 Main Entry Point (互動版入口)
// ==========================================

// 1. 生成第一章 (Start)
export const generateInteractiveStart = async (settings, tags = [], tone = "一般", useDeepSeek = false) => {
    // 構造初始 context
    const initialContext = `
    【遊戲背景】：${settings.summary}
    【主角】：${JSON.stringify(settings.protagonist)}
    【CP】：${JSON.stringify(settings.loveInterest)}
    【當前關卡】：${settings.first_level_brief}
    `;

    // 1. 策劃第一章
    const plan = await planInteractiveSegment({
        contextSummary: initialContext,
        userChoice: "【遊戲開始】主角醒來，發現自己身處異界。",
        novelContext: { settings },
        useDeepSeek
    });

    if (!plan || !plan.outline) {
        throw new Error("系統繁忙：策劃失敗 (Retried)，請稍後再試。");
    }

    // 2. 寫作第一章
    const script = await writeInteractiveSegment({
        novelContext: { settings },
        plan,
        tone,
        useDeepSeek
    });

    if (!script || !script.content) {
        throw new Error("系統繁忙：寫作失敗 (Retried)，請稍後再試。");
    }

    return {
        content: script.content,
        options: plan.options, // 回傳選項給前端
        plot_state: {
            chapter_count: 1,
            history_summary: initialContext // 簡單記錄歷史
        }
    };
};

// 2. 生成下一章 (Next - 響應玩家選擇)
export const generateInteractiveNext = async (novelContext, previousContent, userChoice, lastPlotState, tone = "一般", useDeepSeek = false) => {

    // 構造上下文：包含最後一段劇情 + 玩家的選擇
    const currentContext = `
    【前情摘要】：${previousContent.slice(-1000)}
    【玩家剛剛選擇了】：👉 ${userChoice}
    `;

    // 1. 策劃下一段
    const plan = await planInteractiveSegment({
        contextSummary: currentContext,
        userChoice: userChoice,
        novelContext,
        useDeepSeek
    });

    if (!plan || !plan.outline) {
        throw new Error("系統繁忙：策劃下個階段失敗，請重試。");
    }

    // 2. 寫作下一段
    const script = await writeInteractiveSegment({
        novelContext,
        plan,
        tone,
        useDeepSeek
    });

    if (!script || !script.content) {
        throw new Error("系統繁忙：寫作下個階段失敗，請重試。");
    }

    return {
        content: script.content,
        options: plan.options, // 新的選項
        plot_state: {
            chapter_count: (lastPlotState?.chapter_count || 1) + 1,
            // 這裡可以選擇性地把 userChoice 加入歷史記憶
        }
    };
};
