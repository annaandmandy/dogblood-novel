console.log("Starting server initialization...");
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getGeminiModel, cleanJson, callDeepSeek, ANTI_CLICHE_INSTRUCTIONS, polishContent } from './lib/llm.js';
import { generateInfiniteNextChapter, generateInfiniteSettings, generateInfiniteStart, ensureInfiniteSettings } from './agents/infinite/planInfinite.js';
import { graph } from './langgraph/graph.js';
import { determinePlotDirectives, planChapter } from './lib/plot_logic.js';
import { editorGeneral } from './agents/editor.js';
import { generateInteractiveSettings, generateInteractiveStart, generateInteractiveNext } from './agents/interactive/game.js';

dotenv.config();

const app = express();
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://annaandmandy.github.io',
        'https://dogblood-novel.dogblood-novel.workers.dev'
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// --- 模型定義 ---
const FALLBACK_MODEL = "anthracite-org/magnum-v4-72b";
const DEEPSEEK_MODEL = "deepseek/deepseek-chat";

// --- Utilities ---
const isGeminiBlockedError = (error) => {
    const errStr = (error.message || error.toString()).toLowerCase();
    return errStr.includes("prohibited") ||
        errStr.includes("safety") ||
        errStr.includes("model output must contain") ||
        errStr.includes("candidate was blocked") ||
        errStr.includes("400");
};

// --- Helper Functions ---
const getToneInstruction = (tone) => {
    switch (tone) {
        case "歡脫": return "【基調：幽默沙雕】多用內心吐槽，淡化沈重感，製造反差萌笑點。";
        case "嚴肅": return "【基調：嚴肅正劇】邏輯縝密，氛圍莊重，著重現實殘酷與人性博弈。";
        case "虐戀": return "【基調：虐心催淚】行文唯美但殘酷，著重描寫情感的拉扯、愛而不得的痛苦與犧牲。";
        case "暗黑": return "【基調：暗黑壓抑】行文冷峻，描寫絕望與人性的陰暗面。";
        case "溫馨": return "【基調：溫馨治癒】細膩溫柔，著重生活小確幸與善意。";
        case "爽文": return "【基調：熱血爽快】節奏明快，抑揚頓挫，打臉痛快。";
        default: return "【基調：標準網文】節奏流暢，平衡劇情與互動。";
    }
};

const getPovInstruction = (pov) => {
    switch (pov) {
        case "女主": return "【視角：女主視角 (晉江風)】重點描寫細膩的情感變化、對男主的觀察。";
        case "男主": return "【視角：男主視角 (起點風)】重點描寫行動力、大局觀。";
        case "主受": return "【視角：主受視角 (耽美)】重點描寫心理掙扎、感官體驗。";
        case "主攻": return "【視角：主攻視角 (耽美)】重點描寫掌控欲、心理上的佔有。";
        case "第三人稱": return "【視角：第三人稱】多角度展現劇情與群像。";
        default: return "【視角：第三人稱限制視角】鏡頭緊跟主角。";
    }
};

const getRecommendedTotalChapters = (genre) => {
    switch (genre) {
        case "無限流": case "修仙玄幻": case "西方奇幻": case "星際科幻": return 200;
        case "末世生存": return 160;
        default: return 120;
    }
};

// --- Memory Optimizer ---
const formatMemoriesForGemini = (memories) => {
    if (!memories || memories.length === 0) return "暫無記憶";
    return memories.map((m, i) => `[Event ${i + 1}] ${m.content}`).join('\n');
};



// --- API Helpers ---
const isChineseFlavor = (genre, tags = []) => {
    const safeTags = Array.isArray(tags) ? tags : [];
    return genre === '修仙玄幻' ||
        genre === '豪門宮鬥' ||
        safeTags.includes('中式恐怖') ||
        safeTags.includes('古風') ||
        safeTags.includes('盜墓');
};

const translateToChinese = async (text) => {
    const prompt = `Translate to Traditional Chinese (Taiwanese Novel Style/繁體中文). Maintain tone. Output ONLY translated text.\n\n${text}`;
    try {
        // Assuming callDeepSeek can handle generic calls or we use fetch directly if callDeepSeek is strictly for DeepSeek model
        // But here we want to use fallback model for translation usually.
        // Let's reuse callDeepSeek but force the model if possible or just implement a simple fetch here as before.
        // To keep it simple and consistent with previous code, I'll reimplement the fetch here using the shared logic if possible,
        // or just keep the original implementation but using the constants.
        // Actually, let's just use the original implementation style for now to minimize risk.
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
                "X-Title": "DogBlood AI",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": FALLBACK_MODEL,
                "messages": [{ "role": "user", "content": prompt }],
                "temperature": 0.3
            })
        });
        if (!response.ok) throw new Error(`Translation Error`);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        throw error;
    }
};

const callOpenRouterPipeline = async (systemPrompt, userPrompt, genre, tags = []) => {
    if (!OPENROUTER_KEY) throw new Error("OpenRouter API Key not configured.");

    const useDeepSeek = isChineseFlavor(genre, tags);
    const fallbackModel = useDeepSeek ? DEEPSEEK_MODEL : FALLBACK_MODEL;

    console.log(`⚠️ Fallback to ${fallbackModel}`);

    let finalSystemPrompt = systemPrompt;
    if (useDeepSeek) {
        finalSystemPrompt += "\n請務必使用優美的繁體中文撰寫。";
    } else {
        finalSystemPrompt += "\nIMPORTANT: Write in ENGLISH. Focus on quality prose.";
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
                "X-Title": "DogBlood AI",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": fallbackModel,
                "messages": [
                    { "role": "system", "content": finalSystemPrompt },
                    { "role": "user", "content": userPrompt }
                ],
                "temperature": useDeepSeek ? 1.1 : 0.8,
                "max_tokens": 4096
            })
        });

        if (!response.ok) throw new Error(`API Error`);
        const data = await response.json();
        let generatedText = data.choices[0].message.content;

        if (!useDeepSeek) {
            generatedText = await translateToChinese(generatedText);
        }
        return generatedText;
    } catch (error) {
        throw error;
    }
};

// ==========================================
// 🧠 Agent Functions
// ==========================================





export const generateRandomSettings = async (genre, tags = [], tone = "一般", targetChapterCount = null, category = "BG") => {
    const model = getGeminiModel(true);
    const toneDesc = getToneInstruction(tone);
    const styleGuide = `風格標籤：${tags.join('、')}。\n${toneDesc}`;
    const totalChapters = targetChapterCount || getRecommendedTotalChapters(genre);

    const prompt = `
    請為「${genre}」小說生成一套具備爆款潛力的原創設定。
    **類別**：${category}
    **預計篇幅：${totalChapters} 章**。
    ${styleGuide}
    
    ${ANTI_CLICHE_INSTRUCTIONS}
    
    【嚴格要求】
    1. **絕對原創**：禁止使用現有知名作品人名。
    2. **深度人設**：請為主角和核心對象設計完整的「人物冰山檔案」。
    3. **宏觀設計圖**：請在一開始就規劃好「終極目標」與「世界真相」。
    
    【回傳 JSON 格式】
    {
      "title": "小說標題",
      "summary": "150-200字的吸睛文案 (封底風格)",
      "trope": "核心梗",
      "design_blueprint": {
          "main_goal": "主角的終極目標",
          "world_truth": "世界的隱藏真相",
          "ending_vision": "預設結局走向 (Happy/Bad/Open)"
      },
      "protagonist": {
        "name": "主角名",
        "role": "主角",
        "profile": {
            "appearance": "外貌特徵",
            "personality_surface": "表層性格",
            "personality_core": "內在價值觀",
            "biography": "生平摘要",
            "trauma": "過去的陰影/創傷",
            "desire": "核心慾望/目標",
            "fear": "最大的恐懼",
            "charm_point": "反差萌點/小癖好",
            "speaking_style": "說話風格 (如：文縐縐、粗俗、簡短)",
            "sample_dialogue": "代表台詞 (一句話)"
        }
      },
      "loveInterest": {
        "name": "對象名",
        "role": "攻略對象/反派",
        "profile": {
            "appearance": "", "personality_surface": "", "personality_core": "", 
            "biography": "", "trauma": "", "desire": "", "fear": "", "charm_point": "",
            "speaking_style": "", "sample_dialogue": ""
        }
      }
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        return cleanJson(result.response.text());
    } catch (error) {
        return {
            title: "生成失敗",
            summary: "AI 靈感枯竭，請重試。",
            design_blueprint: {},
            protagonist: { name: "未知", profile: {} },
            loveInterest: { name: "未知", profile: {} }
        };
    }
};





export const generateNovelStart = async (genre, settings, tags = [], tone = "一般", pov = "女主") => {
    const model = getGeminiModel(true);
    const toneDesc = getToneInstruction(tone);
    const povDesc = getPovInstruction(pov);
    const styleGuide = `類型：${genre}\n風格標籤：${tags.join('、')}。\n${toneDesc}\n${povDesc}`;

    const protagonistProfile = JSON.stringify(settings.protagonist.profile);
    const loveInterestProfile = JSON.stringify(settings.loveInterest.profile);
    const blueprint = JSON.stringify(settings.design_blueprint);

    let extraInstruction = "";
    if (genre === "修仙玄幻") extraInstruction = "第一章重點：描寫主角身處的宗門/底層環境。請描寫周圍弟子的嘲笑、底層雜役的眾生相，不要讓場景只有主角一人。";
    else if (genre === "諜戰黑道") extraInstruction = "第一章重點：主角處於偽裝身分中。請描寫組織內部繁忙的景象、周圍的小弟或路人，展現真實的黑道/職場生態。";
    else if (genre === "末世生存") extraInstruction = "第一章重點：災難爆發。請描寫混亂奔逃的人群、被咬的路人、堵塞的交通，展現末日的宏大混亂感。";
    else if (genre === "豪門宮鬥") extraInstruction = "第一章重點：主角遭受陷害。請描寫周圍看熱鬧的群眾、勢利眼的僕人、冷漠的旁觀者。";
    else if (genre === "都市情緣") extraInstruction = "第一章重點：描寫主角與對象的初次相遇。請描寫周圍環境（酒吧/學校/公司）的熱鬧與路人的反應。";

    if (tags.includes("重生")) extraInstruction += " (需描寫前世慘死與重生後的震驚)";
    if (tags.includes("馬甲")) extraInstruction += " (需強調主角隱藏身分的謹慎與對周圍的不信任)";

    const systemPrompt = `你是一名專業小說家。請撰寫第一章。繁體中文。`;
    const userPrompt = `
    ${ANTI_CLICHE_INSTRUCTIONS}
    【小說設定】${settings.title} / ${settings.trope}
    ${styleGuide}
    【設計圖】${blueprint}
    【主角】${settings.protagonist.name}: ${protagonistProfile}
    【對象】${settings.loveInterest.name}: ${loveInterestProfile}
    
    【寫作要求】
    1. **字數**：1500-2000字。
    2. **黃金開篇**：衝突開場 (In Media Res)，直接切入事件。
    3. **群像與配角**：請自然引入 1-2 位功能性配角。務必賦予配角鮮明的特徵。
    4. **有意義的衝突**：主角遭遇的麻煩必須阻礙他的核心渴望，迫使他行動。
    5. **人設防崩 (Anti-OOC)**：嚴格遵守每個角色的【口吻/說話風格】。
    6. ${extraInstruction}

    【回傳 JSON 格式】
    {
      "content": "小說內文...",
      "character_updates": [
        { "name": "主角名", "role": "主角", "status": "初始狀態", "is_new": false, "profile_update": ${protagonistProfile} },
        { "name": "配角名", "role": "配角", "status": "登場", "is_new": true, "profile_update": { "appearance": "...", "personality": "...", "charm": "...", "biography": "..." } }
      ]
    }
    `;

    try {
        const result = await model.generateContent(systemPrompt + "\n" + userPrompt);
        let jsonResponse = cleanJson(result.response.text());
        if (!jsonResponse) jsonResponse = {};

        // Initialize plot state for first chapter
        jsonResponse.plot_state = {
            phase: 'setup',
            arcName: '第1卷',
            instance_progress: 5, // Initial progress
            cycle_num: 1
        };

        if (jsonResponse.content && jsonResponse.content.length > 500) {
            const polishedContent = await polishContent(jsonResponse.content, tone, pov);
            jsonResponse.content = polishedContent;
        }
        return jsonResponse;

    } catch (error) {
        if (isGeminiBlockedError(error)) {
            try {
                const content = await callOpenRouterPipeline(systemPrompt, userPrompt, genre, tags);
                return { content: content, character_updates: [], plot_state: { phase: 'setup', arcName: '第1卷', instance_progress: 5, cycle_num: 1 } };
            } catch (e) { throw new Error("生成失敗，請重試"); }
        }
        throw error;
    }
};



// ==========================================
// 3. 生成下一章
// ==========================================
export const generateNextChapter = async (novelContext, previousContent, characters = [], memories = [], clues = [], tags = [], tone = "一般", pov = "女主", lastPlotState = null, useDeepSeek = false) => {
};

// --- Routes ---


app.post('/api/generate-chapter-graph', async (req, res) => {
    try {
        const initialState = req.body; // Expects matched state shape
        const config = { configurable: { thread_id: initialState.thread_id || "default_thread" } };

        // Invoke the graph
        const finalState = await graph.invoke(initialState, config);

        // Return the final state, which includes the draft and plot state
        // We might want to format this to match the old API response if possible, or just return the full state.
        // For 'user adjust', returning full state is better.
        res.json(finalState);
    } catch (error) {
        console.error("Graph Execution Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Helper Functions for Routes ---

const ensureDetailedSettings = async (genre, settings, tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    const model = getGeminiModel(true);
    const toneDesc = getToneInstruction(tone);
    const styleGuide = `風格：${tags.join('、')} | ${toneDesc} | 類別：${category}`;

    const summaryText = settings.summary ? `簡介：${settings.summary}` : "";
    const tropeText = settings.trope ? `核心梗：${settings.trope}` : "";
    const coreInfo = [summaryText, tropeText].filter(Boolean).join('\n    ') || "暫無具體簡介";

    const prompt = `
    你是一位專業的小說架構師。請根據用戶提供的初步構想，補充並完善詳細的小說設定。
    
    【用戶提供資訊】
    標題：${settings.title || "未命名"}
    題材：${genre || "未定義"}
    ${styleGuide}
    ${coreInfo}
    
    主角姓名：${settings.protagonist?.name || settings.protagonist || "未定"}
    對象姓名：${settings.loveInterest?.name || settings.loveInterest || "未定"}

    【補全任務】
    1. **深度人設**：根據現有資訊，補全外貌、性格（表/裡）、過去創傷、核心慾望。
    2. **說話風格 (Anti-OOC)**：設計獨特的說話方式與代表台詞。
    3. **世界觀與主線**：完善世界觀真相與結局走向。

    請回傳 JSON (只回傳需要補全/更新的欄位):
    {
        "design_blueprint": { "main_goal": "...", "world_truth": "...", "ending_vision": "..." },
        "protagonist": { 
            "name": "${settings.protagonist?.name || settings.protagonist || "主角名"}",
            "role": "主角",
            "gender": "...",
            "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "speaking_style": "...", "sample_dialogue": "..." }
        },
        "loveInterest": { 
            "name": "${settings.loveInterest?.name || settings.loveInterest || "對象名"}",
            "role": "攻略對象",
            "gender": "...",
            "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "speaking_style": "...", "sample_dialogue": "..." }
        }
    }
    `;
    try {
        const result = await model.generateContent(prompt);
        const generated = cleanJson(result.response.text());

        // Merge and Normalize
        const finalSettings = { ...settings, ...(generated || {}) };

        // Ensure protagonist is an object
        if (!finalSettings.protagonist || typeof finalSettings.protagonist === 'string') {
            finalSettings.protagonist = {
                name: typeof finalSettings.protagonist === 'string' ? finalSettings.protagonist : "主角",
                role: '主角',
                profile: {}
            };
        }
        // Ensure loveInterest is an object
        if (!finalSettings.loveInterest || typeof finalSettings.loveInterest === 'string') {
            finalSettings.loveInterest = {
                name: typeof finalSettings.loveInterest === 'string' ? finalSettings.loveInterest : "對象",
                role: '對象',
                profile: {}
            };
        }
        return finalSettings;

    } catch (e) {
        console.error("ensureDetailedSettings failed:", e);
        const fallback = { ...settings };
        if (!fallback.protagonist || typeof fallback.protagonist === 'string') {
            fallback.protagonist = { name: typeof fallback.protagonist === 'string' ? fallback.protagonist : "主角", role: '主角', profile: {} };
        }
        if (!fallback.loveInterest || typeof fallback.loveInterest === 'string') {
            fallback.loveInterest = { name: typeof fallback.loveInterest === 'string' ? fallback.loveInterest : "對象", role: '對象', profile: {} };
        }
        return fallback;
    }
};

const refineCharacterProfile = async (charData, novelContext, useDeepSeek = false) => {
    const model = getGeminiModel(true);
    const prompt = `
    請完善角色設定：${charData.name}
    小說：${novelContext.title}
    
    回傳 JSON:
    {
        "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "speaking_style": "...", "sample_dialogue": "..." }
    }
    `;
    try {
        const result = await model.generateContent(prompt);
        return cleanJson(result.response.text())?.profile || {};
    } catch (e) { return {}; }
};



// ... (existing code)

app.post('/api/ensure-detailed-settings', async (req, res) => {
    try {
        const { genre, settings, tags, tone, category, useDeepSeek } = req.body;

        if (genre === "無限流") {
            const result = await ensureInfiniteSettings(settings, tags, tone, category, useDeepSeek);
            res.json(result);
        } else {
            const result = await ensureDetailedSettings(genre, settings, tags, tone, category, useDeepSeek);
            res.json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/refine-character', async (req, res) => {
    try {
        const { charData, novelContext, useDeepSeek } = req.body;
        const result = await refineCharacterProfile(charData, novelContext, useDeepSeek);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.post('/api/generate-settings', async (req, res) => {
    try {
        const { genre, tags, tone, targetChapterCount, category, useDeepSeek } = req.body;

        if (genre === "無限流") {
            const result = await generateInfiniteSettings(tags, tone, targetChapterCount, category, useDeepSeek);
            res.json(result);
        } else {
            const result = await generateRandomSettings(genre, tags, tone, targetChapterCount, category);
            res.json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-start', async (req, res) => {
    try {
        const { genre, settings, tags, tone, pov, useDeepSeek } = req.body;

        if (genre === "無限流") {
            const result = await generateInfiniteStart(settings, tags, tone, pov, useDeepSeek);
            res.json(result);
        } else {
            const result = await generateNovelStart(genre, settings, tags, tone, pov);
            res.json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/translate', async (req, res) => {
    const { text, targetLang = 'English' } = req.body;
    try {
        const prompt = `
        You are a professional literary translator.
        Translate the following novel excerpt to ${targetLang}.
        
        Requirements:
        1. Maintain the original tone, style, and flow.
        2. If it's a "dogblood" (melodramatic) or "infinite flow" novel, use appropriate genre terminology.
        3. Output ONLY the translated text, no conversational filler.
        4. Keep Markdown formatting (headings, bold, etc.) intact.

        Text to translate:
        ${text}
        `;

        const model = getGeminiModel(true); // Use Flash for speed
        const result = await model.generateContent(prompt);
        const translatedText = result.response.text();

        res.json({ content: translatedText });
    } catch (error) {
        console.error("Translation error:", error);
        res.status(500).json({ error: "Translation failed" });
    }
});


app.post('/api/interactive/settings', async (req, res) => {
    try {
        const { tags, tone, category, useDeepSeek } = req.body;
        const result = await generateInteractiveSettings(tags, tone, category, useDeepSeek);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/interactive/start', async (req, res) => {
    try {
        const { settings, tags, tone, useDeepSeek } = req.body;
        const result = await generateInteractiveStart(settings, tags, tone, useDeepSeek);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/interactive/next', async (req, res) => {
    try {
        const { novelContext, previousContent, userChoice, lastPlotState, tone, useDeepSeek } = req.body;
        const result = await generateInteractiveNext(novelContext, previousContent, userChoice, lastPlotState, tone, useDeepSeek);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
