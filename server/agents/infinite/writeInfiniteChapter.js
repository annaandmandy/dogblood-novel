import {
    callDeepSeek,
    getGeminiModel,
    cleanJson,
    ANTI_CLICHE_INSTRUCTIONS
} from "../../lib/llm.js";

export const writeInfiniteChapter = async ({ novelContext, plan, prevText, tone, pov }) => {
    const { title, genre } = novelContext;
    const { chapter_title, outline, key_clue_action, romance_moment } = plan;

    const styleGuide = `風格：${genre} | 基調：${tone} | 視角：${pov}`;

    const prompt = `
    你是一位無限流小說家。請根據大綱撰寫本章正文。
    
    ${ANTI_CLICHE_INSTRUCTIONS}

    【無限流特化禁令 (Infinite Flow Strict Rules)】
    1. **禁止解說**：不要向讀者解釋「主神空間是什麼」、「積分怎麼算」。讓主角在生死邊緣自己去領悟。
    2. **禁止數據化**：除非主角查看面板，否則不要在戰鬥中彈出「生命值-10」。用「肋骨斷裂的脆響」代替。
    3. **強化恐懼**：副本必須是致命的。描寫隊友的死亡、環境的異變、未知的壓迫感。
    4. **人際冷漠**：不要寫「大家團結一致」。新人是累贅，資深者是威脅。

    【小說資訊】${title}
    ${styleGuide}

    【本章大綱】
    標題：${chapter_title}
    劇情：${outline}
    線索操作：${key_clue_action}
    感情高光：${romance_moment}

    【前情提要】
    ${prevText.slice(-1000)}

    【寫作目標】
    1. 字數：2000字以上。
    2. 嚴格遵守大綱，但細節要充滿張力。
    3. 結尾必須留有懸念 (Cliffhanger)。

    回傳 JSON:
    {
        "content": "小說正文...",
        "character_updates": [
            { "name": "角色名", "status": "Alive/Dead/Injured", "description": "狀態更新" }
        ]
    }
    `;

    try {
        // 優先使用 DeepSeek (如果有的話)，因為它更擅長長文與邏輯
        if (process.env.OPENROUTER_API_KEY) {
            try {
                return await callDeepSeek("你是一位無限流小說家。", prompt, true);
            } catch (deepSeekError) {
                console.warn("DeepSeek Writer failed, falling back to Gemini...", deepSeekError);
                const model = getGeminiModel(true);
                const res = await model.generateContent(prompt);
                return cleanJson(res.response.text());
            }
        } else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            return cleanJson(res.response.text());
        }
    } catch (e) {
        console.error("Infinite Writer Error:", e);
        throw e; // Let the main loop handle fallback
    }
};
