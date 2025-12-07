import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import OpenAI from "openai";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const SITE_URL = "http://localhost:5173";
const SITE_NAME = "DogBlood AI";

// --- Client Init ---
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const openai = OPENROUTER_KEY ? new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_KEY,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME }
}) : null;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

export const callApi = async (endpoint, body) => {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Call Failed (${endpoint}):`, error);
        throw error;
    }
};

export const FALLBACK_MODEL = "anthracite-org/magnum-v4-72b";
export const DEEPSEEK_MODEL = "deepseek/deepseek-chat";

export const ANTI_CLICHE_INSTRUCTIONS = `
【🚫 寫作禁令與風格指導 - V5.1 (超級慢熱版)】
1. **拒絕工業糖精 (Slow Burn Protocol)**：
   - **嚴禁**讓主角在故事前期（前50%）就確認關係或過度親密。
   - 感情必須建立在 **「生存」** 與 **「共患難」** 的基礎上。
   - **前期互動**：眼神對視、簡短的戰術交流、遞水遞藥。不要動不動就抱在一起。
2. **拒絕說明書**：不要大段解釋設定。讓讀者跟隨主角的視角去發現規則。
3. **拒絕流水帳**：不要寫「然後...接著...」。每一段都必須有衝突或情報推進。
4. **題材隔離**：無限流就是無限流，不要寫成校園戀愛或總裁文。
`;

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
        console.warn("JSON parse failed...", e);
        return null;
    }
};

export const getToneInstruction = (tone) => {
    switch (tone) {
        case "歡脫": return "【基調：幽默沙雕】多用內心吐槽，製造反差萌。";
        case "嚴肅": return "【基調：嚴肅正劇】邏輯縝密，氛圍莊重。";
        case "虐戀": return "【基調：虐心催淚】唯美殘酷，情感拉扯，注重心理描寫。";
        case "暗黑": return "【基調：暗黑驚悚】人性博弈，絕望感。";
        case "溫馨": return "【基調：溫馨治癒】細膩溫柔，生活小確幸。";
        case "爽文": return "【基調：熱血爽快】節奏明快，打臉痛快。";
        default: return "【基調：標準網文】節奏流暢。";
    }
};

export const getPovInstruction = (pov) => {
    switch (pov) {
        case "女主": return "【視角：女主視角】細膩情感與觀察，重心理活動。";
        case "男主": return "【視角：男主視角】行動力與大局觀。";
        case "主受": return "【視角：主受視角】心理掙扎、感官體驗、對攻方氣場的感受。";
        case "主攻": return "【視角：主攻視角】掌控欲、凝視細節、心理上的佔有。";
        case "第三人稱": return "【視角：上帝視角】多角度展現劇情與群像。";
        default: return "【視角：第三人稱限制視角】鏡頭緊跟主角。";
    }
};

export const getGeminiModel = (jsonMode = false) => genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-09-2025",
    safetySettings: safetySettings,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : {},
});

export const callDeepSeek = async (systemPrompt, userPrompt, jsonMode = false) => {
    if (!OPENROUTER_KEY) throw new Error("OpenRouter API Key missing.");
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME, "Content-Type": "application/json" },
            body: JSON.stringify({
                "model": "deepseek/deepseek-chat",
                "messages": [{ "role": "system", "content": systemPrompt }, { "role": "user", "content": userPrompt }],
                "temperature": jsonMode ? 0.7 : 1.2,
                "response_format": jsonMode ? { "type": "json_object" } : undefined,
                "max_tokens": 8192
            })
        });
        if (!response.ok) throw new Error(`DeepSeek API Error: ${response.status}`);
        const data = await response.json();
        const content = data.choices[0].message.content;
        if (jsonMode) return cleanJson(content);
        return content;
    } catch (error) { console.error("DeepSeek Call Failed:", error); throw error; }
};

export const polishContent = async (draft, tone, pov) => {
    const model = getGeminiModel(false);
    const editorPrompt = `
    你是一位資深的網文主編。請對以下初稿進行【深度潤色】。
    ${ANTI_CLICHE_INSTRUCTIONS}
    
    【潤色目標】
    1. **去油膩**：刪除過早出現的親密或深情描寫。如果是前期，請讓互動保持克制與張力。
    2. **蘇感**：用細節（眼神、手部動作）代替直白的形容詞。
    3. **符合基調**：${tone}。
    
    [初稿內容]
    ${draft}
    `;
    try {
        const result = await model.generateContent(editorPrompt);
        return result.response.text();
    } catch (e) { return draft; }
};

export const translateToChinese = async (text) => {
    // Simple placeholder or implementation if needed
    return text;
};

export const callOpenRouterPipeline = async (sys, user) => {
    // Simple placeholder
    return "";
};
