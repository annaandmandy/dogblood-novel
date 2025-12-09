import {
    callDeepSeek,
    getGeminiModel,
    cleanJson,
    ANTI_CLICHE_INSTRUCTIONS,
    getToneInstruction,
} from "../../lib/llm.js";

// ==========================================
// 🎮 風格與核心指令 (無版權風險版)
// ==========================================
const INTERACTIVE_STYLE_GUIDE = `
【互動小說・核心風格】
1. **極致張力**：主角與關鍵角色（CP/宿敵）之間必須充滿張力。不是單純的談戀愛，而是「在危險邊緣試探」、「高智商的言語交鋒」或「互相利用」。
2. **快節奏**：跳過囉唆的環境描寫。每一段劇情都是一個「事件」，直接切入衝突或互動。
3. **冷幽默與瘋批感**：主角面對恐怖事物時，反應要反套路。例如：看到鬼不是尖叫，而是嫌棄鬼長得醜，或者試圖跟鬼講道理/做交易。
4. **遊戲感**：把劇情視為「關卡」。獲得的資訊、道具或好感度要寫得有「獲得感」。
`;

// ==========================================
// 1. 設定生成 (The Architect) - 更自由的開局
// ==========================================
export const generateInteractiveSettings = async (tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);

    let genderConstraint = "";
    if (category === "BG") genderConstraint = "主角必須是一男一女 (BG)。";
    else if (category === "BL") genderConstraint = "主角必須是兩位男性 (BL)。";
    else if (category === "GL") genderConstraint = "主角必須是兩位女性 (GL)。";

    const prompt = `
    你是一位**高概念互動小說**的架構師。
    請根據標籤【${tags.join('、')}】，設計一個**充滿張力、適合作為互動遊戲**的故事設定。
    
    **風格**：${toneDesc} | 強強對抗 | 無限流/規則怪談風格
    ${genderConstraint}
    ${INTERACTIVE_STYLE_GUIDE}
    
    【設計任務】
    1. **核心梗**：一句話講清楚遊戲的目標（如：在全員惡人的學校活到畢業、在驚悚直播中成為榜一）。
    2. **主角 (玩家)**：性格必須鮮明（如：高智商厭世、暴力破局、精緻利己）。為什麼進入這個世界？
    3. **關鍵角色 (CP)**：他是這個世界的大佬、監考官、還是危險的怪物？他與主角的關係是「相愛相殺」或「危險共犯」。
    4. **開局情境 (Opening Situation)**：設計一個「剛進入世界」的具體場景描述 (主角在哪裡？正在發生什麼？)。
    5. **第一關副本 (First Level)**：設計新手關卡的具體設定。
       - **副本名稱**：(如：幽靈高中數學考試)
       - **通關任務**：(如：找到消失的監考官、存活到考試結束)
       - **死亡禁忌**：(如：不可作弊、不可回頭看)

    【回傳 JSON】
    {
      "title": "小說標題",
      "summary": "精簡有力的文案 (包含主角、CP、世界觀)",
      "protagonist": { "name": "...", "trait": "性格標籤", "specialty": "金手指/特長" },
      "loveInterest": { "name": "...", "identity": "身份 (如：瘋批監考官)", "dynamic": "互動模式 (如：貓鼠遊戲)" },
      "opening_situation": "開局的具體場景描述 (主角在哪裡？正在發生什麼？)",
      "first_level_brief": "第一關副本簡介 (包含副本名稱、通關任務、死亡禁忌，約 50-100 字)"
    }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是架構師。", prompt, true);
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    } catch (e) { return null; }
};

// ==========================================
// 2. 劇情策劃 (The Branch Designer) - 這是關鍵！
// ==========================================
// 負責根據當前情況，設計 3 個截然不同的「劇情走向」
const planInteractiveSegment = async ({ contextSummary, userChoice, novelContext, useDeepSeek }) => {

    const prompt = `
    你是一位**互動式小說**的總導演。
    
    【當前劇情狀態】
    ${contextSummary}
    
    【玩家剛才的選擇】
    👉 **${userChoice || "故事開始"}**

    【任務：設計下一段劇情與分支】
    
    **第一步：推演劇情**
    根據玩家的選擇，推演接下來發生的事情。
    - 如果玩家選了互動，請描寫兩人之間極限拉扯的張力。
    - 如果玩家選了探索，請揭露世界觀的詭異之處。
    - 如果玩家選了衝突，請讓主角帥氣地（或瘋批地）解決問題。

    **第二步：設計 3 個「劇情走向」選項 (關鍵)**
    本段結束時，請給出 3 個**截然不同**的後續發展方向（類似攻略路線），而不僅僅是動作。
    請參考以下範例的**顆粒度**：
    
    * *範例情境*：主角剛解決了入學考試，現在是自由時間。
    * *選項 A (感情線)*：**【宿舍夜話】** 回到分配的「情侶宿舍」，與 CP 進行尷尬又曖昧的獨處試探。
    * *選項 B (探索線)*：**【校園探索】** 去食堂或商店街，挖掘這個世界的隱藏規則或道具。
    * *選項 C (劇情線/衝突)*：**【突發狀況】** 剛想休息，卻被捲入了突發的鬼怪襲擊或勢力鬥爭。

    【回傳 JSON】
    {
        "segment_title": "本段標題",
        "outline": "本段劇情的詳細大綱 (承接後果 -> 發展 -> 結尾停在選擇前)",
        "options": [
            { "label": "選項A標題 (如：宿舍夜話)", "hint": "簡述這條路線會發生什麼 (如：與CP獨處，試探底細)" },
            { "label": "選項B標題 (如：深入探索)", "hint": "簡述這條路線會發生什麼 (如：尋找隱藏道具)" },
            { "label": "選項C標題 (如：正面衝突)", "hint": "簡述這條路線會發生什麼 (如：觸發戰鬥事件)" }
        ]
    }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是導演。", prompt, true);
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    } catch (e) { return null; }
};

// ==========================================
// 3. 劇本寫作 (The Novelist)
// ==========================================
const writeInteractiveSegment = async ({ novelContext, plan, tone, useDeepSeek, isStart = false }) => {
    const toneDesc = getToneInstruction(tone);

    const prompt = `
    你是一位風格犀利的無限流小說家。請根據大綱撰寫一段**互動小說的劇本**。

    **風格**：${toneDesc}
    ${INTERACTIVE_STYLE_GUIDE}
    ${ANTI_CLICHE_INSTRUCTIONS}

    【小說設定】
    - 主角：${novelContext.settings?.protagonist?.name} (${novelContext.settings?.protagonist?.trait})
    - CP：${novelContext.settings?.loveInterest?.name} (${novelContext.settings?.loveInterest?.identity})

    【劇本大綱】
    ${plan.outline}

    【寫作要求】
    1. **字數**：**800 - 1200 字** (短小精悍，不要長篇大論)。
    ${isStart
            ? "2. **開頭**：這是小說的第一章。請從【開局情境】開始寫起，詳細描繪主角進入世界/副本的瞬間，建立代入感與懸念。"
            : "2. **開頭**：直接承接上一次的選擇後果，不要寫「前情提要」。"}
    3. **結尾**：必須停在**主角準備做出行動**的那一刻，與下方的選項無縫銜接。
    4. **CP感**：必須描寫主角與 CP 之間的眼神、動作或語言交鋒（張力拉滿）。
    5. **嚴禁出現選項**：請不要在正文結尾列出 A/B/C 選項，只需寫劇情。選項會由系統另外顯示。

    【回傳 JSON】
    請回傳以下 JSON 格式：
    {
        "content": "小說正文...",
        "character_updates": [
            { "name": "角色名", "role": "配角", "status": "狀態描述 (如：受傷/死亡/登場)", "profile_update": { "personality": "..." } }
        ]
    }
    `;

    if (useDeepSeek) {
        try {
            return await callDeepSeek("你是劇本作家。", prompt, true);
        } catch (e) {
            console.warn("DeepSeek failed, falling back to Gemini retry...");
        }
    }
    // Fallback or Primary Gemini Call
    try {
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    } catch (e) {
        console.error("Gemini Generation Failed:", e);
        return null;
    }
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
    【開局情境】：${settings.opening_situation}
    `;

    // 1. 策劃第一章
    // 我們假裝用戶點擊了 "開始遊戲"，觸發第一章的策劃
    const plan = await planInteractiveSegment({
        contextSummary: initialContext,
        userChoice: "【序章開始】進入世界。",
        novelContext: { settings },
        useDeepSeek
    });

    if (!plan || !plan.outline) {
        throw new Error("Failed to plan interactive segment. Please try again.");
    }

    // 2. 寫作第一章
    const script = await writeInteractiveSegment({
        novelContext: { settings },
        plan,
        tone,
        useDeepSeek,
        isStart: true
    });

    if (!script || !script.content) {
        throw new Error("Failed to write interactive segment. Please try again.");
    }

    return {
        content: script.content,
        character_updates: script.character_updates || [], // Pass updates to frontend
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
    【前情摘要】：${previousContent.slice(-1500)}
    【玩家剛剛選擇了】：👉 **${userChoice}**
    `;

    // 1. 策劃下一段 (根據 userChoice 決定是去宿舍、去食堂、還是打架)
    const plan = await planInteractiveSegment({
        contextSummary: currentContext,
        userChoice: userChoice,
        novelContext,
        useDeepSeek
    });

    if (!plan || !plan.outline) {
        throw new Error("Failed to plan subsequent segment. Please try again.");
    }

    // 2. 寫作下一段
    const script = await writeInteractiveSegment({
        novelContext,
        plan,
        tone,
        useDeepSeek
    });

    if (!script || !script.content) {
        throw new Error("Failed to write subsequent segment. Please try again.");
    }

    return {
        content: script.content,
        character_updates: script.character_updates || [], // Pass updates to frontend
        options: plan.options, // 新的選項
        plot_state: {
            chapter_count: (lastPlotState?.chapter_count || 1) + 1,
            // 這裡可以選擇性地把 userChoice 加入歷史記憶
        }
    };
};

