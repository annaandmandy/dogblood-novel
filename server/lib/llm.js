import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const SITE_NAME = "DogBlood AI";

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export const getGeminiModel = (jsonMode = false) => genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    safetySettings: safetySettings,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : {},
});

export const cleanJson = (text) => {
    try {
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstOpen = cleaned.indexOf('{');
        const lastClose = cleaned.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleaned = cleaned.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("JSON parse failed, returning raw text wrapper...");
        return null;
    }
};

export const callDeepSeek = async (systemPrompt, userPrompt, jsonMode = false, temperature = null) => {
    if (!OPENROUTER_KEY) throw new Error("OpenRouter API Key missing.");
    const defaultTemp = jsonMode ? 0.7 : 1.1;
    const finalTemp = temperature !== null ? temperature : defaultTemp;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "deepseek/deepseek-chat",
                "messages": [
                    { "role": "system", "content": systemPrompt + "\n請務必使用優美的繁體中文撰寫。" },
                    { "role": "user", "content": userPrompt }
                ],
                "temperature": finalTemp,
                "response_format": jsonMode ? { "type": "json_object" } : undefined,
                "max_tokens": 8192
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        if (jsonMode) {
            const json = cleanJson(content);
            if (!json) throw new Error("DeepSeek JSON parse failed");
            return json;
        }
        return content;
    } catch (error) {
        console.error("DeepSeek Call Failed:", error);
        throw error;
    }
};

export const ANTI_CLICHE_INSTRUCTIONS = `
【🚫 寫作禁令 (Negative Constraints) - V3.0】
1. **嚴格題材隔離 (Genre Integrity)**：
   - **如果題材是「諜戰黑道/都市/豪門」**：嚴禁出現魔法、修仙、系統面板、神殿、異能、妖魔、穿越等超自然元素。這是一個唯物主義的現實世界。
   - **如果題材是「豪門宮鬥/古代」**：嚴禁出現現代科技（手機、槍械、汽車）、現代網路用語（YYDS、打call、CPU）。
   - **如果題材是「西方奇幻」**：嚴禁出現東方修仙術語（金丹、元嬰、御劍、道友）。請使用法術位、魔力循環、騎士階級。
   - **如果題材是「末世生存」**：如果是寫實向，嚴禁出現過於魔幻的修仙技能，應以異能或科技為主。

2. **拒絕 AI 腔調**：
   - 嚴禁使用「不是...而是...」、「值得一提的是」、「命運的齒輪開始轉動」。拒絕教科書式排比。
   - 嚴禁在章節結尾進行總結或昇華。
   - **去重檢查**：嚴禁重複上一章已經寫過的對話或場景。

3. **職業與身分禁令**：
   - 除非題材是星際/賽博，否則嚴禁設定主角為數據分析師、AI工程師。

4. **世界觀去科技化**：
   - 魔法/修仙背景嚴禁使用「數據流」、「底層代碼」、「下載/上傳」。請用「靈力」、「神識」。

5. **無限流修正**：
   - 主神空間是「殘酷的角鬥場」，不是「電腦系統」。副本具有高度隨機性與致命性。
`;

export const getToneInstruction = (tone) => {
    switch (tone) {
        case "暗黑": return "【基調：暗黑】強調壓抑、絕望、血腥與人性的扭曲。描寫要赤裸、殘酷，不避諱暴力與死亡。";
        case "輕鬆": return "【基調：輕鬆】強調幽默、吐槽、反差萌。在緊張的劇情中穿插笑點，角色互動要有趣。";
        case "正劇": return "【基調：正劇】強調邏輯嚴密、情感厚重、史詩感。拒絕無厘頭，注重劇情的深度與合理性。";
        case "甜寵": return "【基調：甜寵】強調男女主角的甜蜜互動，發糖為主，虐戀為輔。";
        case "虐戀": return "【基調：虐戀】強調情感的糾葛與痛苦，誤會、犧牲、愛而不得。";
        default: return "【基調：一般】平衡劇情與情感，節奏張弛有度。";
    }
};

export const getPovInstruction = (pov) => {
    switch (pov) {
        case "女主": return "【視角：女主】以女主角為核心視角。多描寫她的內心獨白、情感變化與感官體驗。";
        case "男主": return "【視角：男主】以男主角為核心視角。多描寫他的決策過程、行動細節與對局勢的判斷。";
        case "雙視角": return "【視角：雙視角】在章節中適度切換男女主角的視角，展現雙方的心理活動。";
        default: return "【視角：上帝】全知視角，客觀描述場景與所有角色的行動。";
    }
};
