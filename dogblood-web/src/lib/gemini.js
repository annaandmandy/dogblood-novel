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

// 使用 Magnum (適合邏輯與文筆平衡)
const FALLBACK_MODEL = "anthracite-org/magnum-v4-72b";

// --- Utilities ---
const cleanJson = (text) => {
    try {
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstOpen = cleaned.indexOf('{');
        const lastClose = cleaned.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleaned = cleaned.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("Standard JSON parse failed, attempting regex repair...");
        throw e;
    }
};

const getToneInstruction = (tone) => {
    switch (tone) {
        case "歡脫": return "【基調：幽默沙雕】多用內心吐槽，淡化沈重感，製造反差萌笑點。";
        case "嚴肅": return "【基調：嚴肅正劇】邏輯縝密，氛圍莊重，著重現實殘酷與人性博弈。";
        case "暗黑": return "【基調：暗黑壓抑】行文冷峻，描寫絕望與人性的陰暗面。";
        case "溫馨": return "【基調：溫馨治癒】細膩溫柔，著重生活小確幸與善意。";
        case "爽文": return "【基調：熱血爽快】節奏明快，抑揚頓挫，主角不憋屈，打臉痛快。";
        default: return "【基調：標準網文】節奏流暢，平衡劇情與互動。";
    }
};

const getPovInstruction = (pov) => {
    switch (pov) {
        case "女主": return "【視角：女主視角 (BG)】重點描寫心理活動、細膩情感與對男主的觀察。";
        case "男主": return "【視角：男主視角 (BG)】重點描寫行動力、大局觀與對女主的保護/佔有慾。";
        case "主受": return "【視角：主受視角 (BL)】重點描寫心理掙扎、感官體驗與對攻方氣場的感受。";
        case "主攻": return "【視角：主攻視角 (BL)】重點描寫掌控欲、凝視細節與心理上的佔有/寵溺。";
        case "第三人稱": return "【視角：第三人稱】多角度展現劇情與群像，不侷限於單一主角內心。";
        default: return "【視角：第三人稱限制視角】鏡頭緊跟主角。";
    }
};

// --- API Helpers ---

const translateToChinese = async (text) => {
    console.log("Translating content to Traditional Chinese (using OpenRouter)...");
    const prompt = `
    You are a professional translator. Translate the following English novel text into fluent, beautiful Traditional Chinese (繁體中文).
    Maintain the original tone, style, and tension.
    Output ONLY the translated text.
    
    [Source Text]
    ${text}
    `;

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
                "model": FALLBACK_MODEL,
                "messages": [{ "role": "user", "content": prompt }],
                "temperature": 0.3
            })
        });
        if (!response.ok) throw new Error(`Translation API Error: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Translation error:", error);
        throw error;
    }
};

const callOpenRouterPipeline = async (systemPrompt, userPrompt) => {
    if (!OPENROUTER_KEY) throw new Error("OpenRouter API Key not configured for fallback.");
    console.log(`⚠️ Triggering Fallback: Generating in English with ${FALLBACK_MODEL}...`);

    const englishInstruction = "IMPORTANT: Write the story in ENGLISH. Do not use Chinese yet. Focus on high-quality prose and tension.";

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
                "model": FALLBACK_MODEL,
                "messages": [
                    { "role": "system", "content": systemPrompt + "\n" + englishInstruction },
                    { "role": "user", "content": userPrompt }
                ],
                "temperature": 0.8
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const englishText = data.choices[0].message.content;

        try {
            const chineseText = await translateToChinese(englishText);
            return chineseText;
        } catch (transError) {
            console.error("Translation failed, returning English text:", transError);
            return englishText + "\n\n(系統提示：翻譯服務暫時不可用，以上為原文)";
        }
    } catch (error) {
        console.error("OpenRouter Pipeline Failed:", error);
        throw error;
    }
};

const getGeminiModel = (jsonMode = false) => genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-09-2025",
    safetySettings: safetySettings,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : {},
});

const isGeminiBlockedError = (error) => {
    const errStr = (error.message || error.toString()).toLowerCase();
    return errStr.includes("prohibited") ||
        errStr.includes("safety") ||
        errStr.includes("model output must contain") ||
        errStr.includes("candidate was blocked") ||
        errStr.includes("400");
};

// ==========================================
// 1. 生成初始設定 (含深度人設 & 設計圖)
// ==========================================
export const generateRandomSettings = async (genre, tags = [], tone = "一般") => {
    const model = getGeminiModel(true);
    const toneDesc = getToneInstruction(tone);
    const styleGuide = `風格標籤：${tags.join('、')}。\n${toneDesc}`;

    const prompt = `
    請為「${genre}」小說生成一套具備爆款潛力的原創設定。
    ${styleGuide}
    
    【嚴格要求】
    1. **絕對原創**：禁止使用現有知名作品人名。
    2. **深度人設**：請為主角和核心對象設計完整的「人物冰山檔案」，包含生平、陰影、慾望。
    3. **宏觀設計圖**：請在一開始就規劃好「終極目標」與「世界真相」，避免故事鬼打牆。
    
    【回傳 JSON 格式】
    {
      "title": "小說標題",
      "summary": "150-200字的吸睛文案 (封底風格)",
      "trope": "核心梗",
      "design_blueprint": {
          "main_goal": "主角的終極目標 (例如：殺死主神、查清滅門真相)",
          "world_truth": "世界的隱藏真相 (例如：世界是虛擬的、反派其實是守護者)",
          "ending_vision": "預設結局走向 (Happy/Bad/Open)"
      },
      "protagonist": {
        "name": "主角名",
        "role": "主角",
        "profile": {
            "appearance": "外貌特徵",
            "personality_surface": "表層性格",
            "personality_core": "內在價值觀",
            "biography": "生平摘要 (童年、關鍵轉折、人際關係)",
            "trauma": "過去的陰影/創傷",
            "desire": "核心慾望/目標",
            "fear": "最大的恐懼",
            "charm_point": "反差萌點/小癖好"
        }
      },
      "loveInterest": {
        "name": "對象名",
        "role": "攻略對象/反派",
        "profile": {
            "appearance": "", "personality_surface": "", "personality_core": "", 
            "biography": "", "trauma": "", "desire": "", "fear": "", "charm_point": ""
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

// ==========================================
// 2. 生成第一章 (含配角 & 設計圖注入)
// ==========================================
export const generateNovelStart = async (genre, settings, tags = [], tone = "一般", pov = "女主") => {
    const model = getGeminiModel(true);
    const toneDesc = getToneInstruction(tone);
    const povDesc = getPovInstruction(pov);
    const styleGuide = `類型：${genre}\n風格標籤：${tags.join('、')}。\n${toneDesc}\n${povDesc}`;

    const protagonistProfile = JSON.stringify(settings.protagonist.profile);
    const loveInterestProfile = JSON.stringify(settings.loveInterest.profile);
    const blueprint = JSON.stringify(settings.design_blueprint);

    let extraInstruction = "";
    if (genre === "無限流") extraInstruction = "第一章重點：主角進入第一個恐怖/無限副本。請描寫周圍同時進入的「一群人」（約10-20人），包括尖叫的新人、冷漠的資深者、以及很快就會死掉的炮灰路人，營造群體恐慌感。";
    else if (genre === "修仙玄幻") extraInstruction = "第一章重點：描寫主角身處的宗門/底層環境。請描寫周圍弟子的嘲笑、底層雜役的眾生相，不要讓場景只有主角一人。";
    else if (genre === "諜戰黑道") extraInstruction = "第一章重點：主角處於偽裝身分中。請描寫組織內部繁忙的景象、周圍的小弟或路人，展現真實的黑道/職場生態。";
    else if (genre === "末世生存") extraInstruction = "第一章重點：災難爆發。請描寫混亂奔逃的人群、被咬的路人、堵塞的交通，展現末日的宏大混亂感。";
    else if (genre === "豪門宮鬥") extraInstruction = "第一章重點：主角遭受陷害。請描寫周圍看熱鬧的群眾、勢利眼的僕人、冷漠的旁觀者。";
    else if (genre === "都市情緣") extraInstruction = "第一章重點：描寫主角與對象的初次相遇。請描寫周圍環境（酒吧/學校/公司）的熱鬧與路人的反應。";

    if (tags.includes("重生")) extraInstruction += " (需描寫前世慘死與重生後的震驚)";
    if (tags.includes("馬甲")) extraInstruction += " (需強調主角隱藏身分的謹慎與對周圍的不信任)";

    const systemPrompt = `你是一名專業小說家。請撰寫第一章。繁體中文。`;
    const userPrompt = `
    【小說設定】
    標題：${settings.title}
    核心梗：${settings.trope}
    ${styleGuide}
    
    【設計圖 (核心靈魂)】
    ${blueprint}
    (請在第一章埋下關於「世界真相」或「終極目標」的微小伏筆)
    
    【主角檔案】
    ${settings.protagonist.name}: ${protagonistProfile}
    
    【對象檔案】
    ${settings.loveInterest.name}: ${loveInterestProfile}

    【寫作要求】
    1. **字數**：1500-2000字。
    2. **黃金開篇**：衝突開場 (In Media Res)，直接切入事件。
    3. **群像與配角**：請自然引入 1-2 位功能性配角。務必賦予配角鮮明的特徵。
    4. **有意義的衝突**：主角遭遇的麻煩必須阻礙他的核心渴望，迫使他行動。
    5. ${extraInstruction}

    【回傳 JSON 格式】
    {
      "content": "小說正文...",
      "character_updates": [
        {
           "name": "主角名", 
           "role": "主角",
           "status": "初始狀態",
           "is_new": false,
           "profile_update": ${protagonistProfile}
        },
        {
           "name": "配角名",
           "role": "配角",
           "status": "登場",
           "is_new": true,
           "profile_update": {
             "appearance": "...", "personality": "...", "charm": "...", "biography": "簡短生平"
           }
        }
      ]
    }
    `;

    try {
        const result = await model.generateContent(systemPrompt + "\n" + userPrompt);
        return cleanJson(result.response.text());
    } catch (error) {
        if (isGeminiBlockedError(error)) {
            try {
                const content = await callOpenRouterPipeline(systemPrompt, userPrompt);
                return {
                    content: content,
                    character_updates: []
                };
            } catch (e) {
                throw new Error("生成失敗，請重試");
            }
        }
        throw error;
    }
};

/**
 * 劇情狀態管理器 - V19 完整雙核循環版 (The Dual-Core Cycle)
 * 總預設篇幅：120章。
 * 三幕劇：前期(1-40) -> 中期(41-80) -> 後期(81-120)。
 * 雙核循環：[事件A (16章)] -> [休整A (4章)] -> [事件B (16章)] -> [休整B (4章)]
 */
const determinePlotDirectives = (currentChapterIndex, lastPlotState, genre, tags, totalChapters = 120) => {
    // 輔助檢查 Tags
    const hasTag = (t) => tags.some(tag => tag.includes(t));
    const isAngst = hasTag("虐戀") || hasTag("追妻");
    const hasSecretIdentity = hasTag("馬甲") || hasTag("掉馬") || hasTag("臥底") || hasTag("隱藏身分");

    // 三幕劇判定 (Grand Phase)
    const phaseLength = Math.floor(totalChapters / 3);
    let grandPhase = "early";
    if (currentChapterIndex > phaseLength * 2) grandPhase = "late";
    else if (currentChapterIndex > phaseLength) grandPhase = "mid";

    // 終局判定 (Finale Zone)
    const isFinale = (totalChapters - currentChapterIndex) <= 20;

    // 雙核循環計算
    const ARC_LENGTH = 40;
    const cyclePos = (currentChapterIndex % ARC_LENGTH) + 1;
    const cycleNum = Math.floor(currentChapterIndex / ARC_LENGTH) + 1;

    // 判斷是上半循環(事件A) 還是 下半循環(事件B)
    const isSecondHalf = cyclePos > 20;
    const localPos = isSecondHalf ? cyclePos - 20 : cyclePos; // 映射為 1-20
    const isRestPhase = localPos > 16; // 17-20 是休整期

    let directive = "";
    let romanceBeat = "";
    let intensity = "medium";
    let arcName = (cyclePos === 1) ? `第${cycleNum}卷` : (lastPlotState?.arcName || `第${cycleNum}卷`);
    if (cyclePos === 21) arcName = `第${cycleNum}卷-下`;

    // --- 1. 節奏控制指令 (Pacing) ---
    const pacingInstruction = isRestPhase
        ? "【節奏控制】：本章為「休整/過渡期」。請放慢節奏，多描寫日常互動、心理活動或整理收穫。不要安排高強度戰鬥。"
        : "【節奏控制】：本章為「劇情推進期」。節奏緊湊，衝突升級。單一小事件請在3章內解決。";

    // --- 2. 🌍 世界觀/三幕劇升級指令 (Macro Structure) ---
    let scaleInstruction = "";
    if (grandPhase === "early") {
        scaleInstruction = "【前期 (生存與適應)】：危機主要圍繞在主角個人生存或小團體利益。重點是「活下來」並「適應規則」。";
    } else if (grandPhase === "mid") {
        scaleInstruction = "【中期 (勢力與博弈)】：危機擴大到城市、門派或大型組織。主角已有一席之地，開始建立勢力或結盟。";
    } else {
        scaleInstruction = "【後期 (揭密與決戰)】：危機涉及世界存亡、位面規則。主角接近「終極目標」與「世界真相」。";
    }

    // --- 3. ❤️ 感情線節奏 (Global Romance Arc) ---
    if (isRestPhase) {
        romanceBeat = "【感情：日常溫存/深度對話】在放鬆的狀態下，兩人進行深層次的情感交流。或者是「小別勝新婚」的甜蜜互動。解開之前的誤會，或埋下新的感情伏筆。";
    } else {
        if (localPos <= 5) romanceBeat = "【感情：並肩作戰/試探】在事件初期，兩人互相配合或觀察。";
        else if (localPos <= 12) romanceBeat = "【感情：升溫/默契】在衝突中展現對彼此的信任。";
        else {
            if (hasSecretIdentity) romanceBeat = "【感情：猜忌/身分危機】發現破綻，信任感面臨考驗。";
            else if (isAngst) romanceBeat = "【感情：冰點/互相折磨】矛盾激化，心口不一。";
            else romanceBeat = "【感情：生死與共/爆發】高潮時刻，為了對方不顧一切。";
        }
    }

    // --- 4. 🎭 馬甲線指令 (Global Identity Arc) ---
    let identityDirective = "";
    if (hasSecretIdentity) {
        if (isRestPhase) identityDirective = "【馬甲線】：回歸日常身分，處理雙重生活的矛盾。差點因為生活習慣而露餡。";
        else identityDirective = "【馬甲線】：在執行任務/解決危機時，必須小心隱藏真實能力。";
    }

    // ==========================================
    // 5. 終局覆寫 (Global Finale Override)
    // ==========================================
    if (isFinale) {
        arcName = "終章：最終決戰";
        intensity = "high";
        scaleInstruction = "【終局模式】：所有伏筆必須回收。運用之前獲得的「設計圖」資訊。";
        pacingInstruction = "【節奏控制】：終局衝刺，節奏極快。";

        if (totalChapters - currentChapterIndex <= 3) {
            directive = "【階段：大結局 (Epilogue)】塵埃落定。描寫戰後的世界/生活。主角與CP的圓滿結局（婚禮/隱居/長相廝守）。給讀者一個充滿希望的未來。";
            romanceBeat = "【感情：永恆的承諾】";
        } else if (totalChapters - currentChapterIndex <= 10) {
            directive = "【階段：終極決戰 (Climax)】面對最終BOSS/黑手。主角動用所有底牌（前100章積累的人脈、道具、能力）。場面宏大，情感悲壯但充滿希望。";
            romanceBeat = "【感情：生死相隨】";
        } else {
            directive = "【階段：終局前奏 (Setup)】揭開「世界真相」。主角發現通往結局的最後一把鑰匙。所有配角集結。";
            romanceBeat = "【感情：暴風雨前的寧靜】確認心意，為了未來而戰。";
        }

        const finalDirective = `${directive}\n\n**【❤️ 感情線必修題】**：${romanceBeat}\n**【🌍 三幕劇階段】**：${scaleInstruction}`;
        return { phase: "finale", intensity, directive: finalDirective, arcName };
    }

    // ==========================================
    // 6. 常規循環 (16+4 雙核) - Genre Logic
    // ==========================================

    // Genre 1: 無限流
    if (genre === "無限流") {
        if (grandPhase === "late" && cyclePos > 20) {
            // 進入最後大循環的後半段，提早收束主線
            if (cyclePos <= 30) {
                directive = "【階段：主線收束 (終局前奏)】不再進入常規副本。主角團隊在現實世界或主神空間的核心區域，根據之前收集的所有線索，直面「無限世界的起源」或「主神真身」。揭開最大的謎底。";
            } else {
                directive = "【階段：終極決戰前奏】所有伏筆回收，配角回歸助陣。準備迎接最終戰。";
            }
        } else {
            if (isRestPhase) {
                intensity = "low";
                directive = isSecondHalf
                    ? "【階段：循環結算與主線】回到主神空間。清點收穫。**重點推進主線**：研究從副本帶回的道具，發現其指向現實世界的某個陰謀或主神的漏洞。"
                    : "【階段：現實世界/短暫休整】回到現實世界。**處理現實生活中的異常**（如：尋找失蹤的資深者線索）。同時安排與CP的溫馨互動。";
                if (isSecondHalf && cyclePos === ARC_LENGTH) arcName = "準備進入新循環";
                if (!isSecondHalf && cyclePos === 20) arcName = "準備進入下半場副本";
            } else {
                if (localPos <= 3) {
                    intensity = "low (suspense)";
                    directive = `【階段：副本導入 (${isSecondHalf ? '副本B' : '副本A'})】進入新副本。重點描寫詭異規則與群體恐慌。更新 plot_state.arcName 為具體副本名。`;
                } else if (localPos <= 12) {
                    intensity = "medium";
                    directive = "【階段：深度探索】尋找線索，經歷試錯。重點：發現規則漏洞、獲得關鍵道具。**雙線並行**：副本解密 + **安排與CP在危機中互助或猜疑**。";
                } else {
                    intensity = "high";
                    directive = "【階段：副本高潮】副本倒數時刻。BOSS戰或死亡機制觸發。主角利用線索絕地反擊。揭開本副本真相。";
                }
            }
        }
    }

    // Genre 2: 諜戰黑道
    else if (genre === "諜戰黑道") {
        if (isRestPhase) {
            intensity = "low";
            directive = "【階段：偽裝與日常】回到表面身分（如：公司職員）。**處理雙重身分帶來的家庭/人際壓力。** 享受片刻的安寧，但內心始終警惕。";
        } else {
            if (localPos <= 3) {
                intensity = "medium";
                directive = `【階段：接獲任務 (${isSecondHalf ? '任務B' : '任務A'})】組織發布新指令或發現新目標。進行情報蒐集與佈局。`;
            } else if (localPos <= 12) {
                intensity = "high";
                directive = "【階段：行動與博弈】執行潛入、跟蹤或交易。遭遇突發狀況，與敵對勢力交鋒。";
            } else {
                intensity = "high (climax)";
                directive = "【階段：任務高潮/收網】槍戰、追車或心理對決。在極限壓力下完成目標並全身而退。";
            }
        }
    }

    // Genre 3: 修仙玄幻
    else if (genre === "修仙玄幻") {
        if (isRestPhase) {
            intensity = "low";
            directive = "【階段：閉關與消化】回到宗門/洞府。**清點歷練所得，煉丹、煉器或領悟功法。** 與師門好友互動，鞏固地位。";
        } else {
            if (localPos <= 3) {
                intensity = "low";
                directive = `【階段：機緣開啟 (${isSecondHalf ? '事件B' : '事件A'})】秘境開啟、拍賣會舉行或宗門任務發布。主角前往新地點。`;
            } else if (localPos <= 12) {
                intensity = "high";
                directive = "【階段：爭奪與歷練】與其他修士爭奪資源。遭遇妖獸或仇家追殺。展現越級戰鬥能力。";
            } else {
                intensity = "high (climax)";
                directive = "【階段：事件高潮】奪得核心寶物，或在眾人面前展現實力（打臉）。擊敗強敵。";
            }
        }
    }

    // Genre 4: 末世生存
    else if (genre === "末世生存") {
        if (isRestPhase) {
            intensity = "low";
            directive = "【階段：基地建設與日常】回到安全區。**清點物資，升級設施，種植作物。** 處理倖存者之間的糾紛或溫情時刻。";
        } else {
            if (localPos <= 3) {
                intensity = "medium";
                directive = `【階段：外出行動 (${isSecondHalf ? '行動B' : '行動A'})】物資短缺或為了尋找特殊設備而離開基地。進入危險區。`;
            } else if (localPos <= 12) {
                intensity = "high";
                directive = "【階段：危機四伏】遭遇變異喪屍或掠奪者團隊。戰鬥與逃亡。";
            } else {
                intensity = "high (climax)";
                directive = "【階段：生存高潮】屍潮爆發或與敵對勢力決戰。成功守住據點或突圍。";
            }
        }
    }

    // Genre 5: 豪門宮鬥
    else if (genre === "豪門宮鬥") {
        if (isRestPhase) {
            intensity = "low";
            directive = "【階段：私下籌謀與日常】回到自己的宮殿/豪宅。**分析局勢，拉攏盟友，安撫下屬。** 與CP的私密相處。";
        } else {
            if (localPos <= 3) {
                intensity = "low";
                directive = `【階段：風波起 (${isSecondHalf ? '事件B' : '事件A'})】宴會、節慶或家族聚會。反派進行言語挑釁或設下圈套。`;
            } else if (localPos <= 12) {
                intensity = "medium";
                directive = "【階段：見招拆招】主角處於守勢，尋找破局關鍵。蒐集證據。";
            } else {
                intensity = "high";
                directive = "【階段：反擊高潮】當眾揭穿陰謀，讓反派自食惡果。獲得地位提升或掌權。";
            }
        }
    }

    // Genre 6: 都市情緣
    else if (genre === "都市情緣") {
        if (isRestPhase) {
            intensity = "low (sweet)";
            directive = "【階段：甜蜜約會/日常】週末約會、同居生活、旅行。**純粹的發糖時間，感情大幅升溫。**";
        } else {
            if (localPos <= 3) {
                intensity = "low";
                directive = `【階段：生活波瀾 (${isSecondHalf ? '事件B' : '事件A'})】工作上的難題、學校的活動、或出現情敵/追求者。`;
            } else if (localPos <= 12) {
                intensity = "medium";
                directive = "【階段：互相扶持/誤會】共同面對問題。可能會產生小誤會，但也是了解彼此觀念的機會。";
            } else {
                intensity = "medium";
                directive = "【階段：解決與告白】問題解決。確認對方在自己心中的地位。關係更進一步。";
            }
        }
    }

    // Fallback
    else {
        if (isRestPhase) {
            directive = "【階段：休整與過渡】整理劇情，為下一階段做準備。";
        } else {
            if (localPos <= 12) directive = "【階段：劇情發展】遭遇挑戰，克服困難。";
            else directive = "【階段：高潮】解決核心問題。";
        }
    }

    const finalDirective = `
    ${directive}
    ${identityDirective ? `\n**【🎭 馬甲線特別指令】**：${identityDirective}` : ""}
    \n**【❤️ 感情線必修題】**：${romanceBeat}
    \n**【🌍 三幕劇階段】**：${scaleInstruction}
    \n${pacingInstruction}`;

    return { phase: grandPhase, intensity, directive: finalDirective, arcName };
};

// ==========================================
// 3. 生成下一章
// ==========================================
export const generateNextChapter = async (novelContext, previousContent, characters = [], memories = [], tags = [], tone = "一般", pov = "女主", lastPlotState = null) => {
    // 預設 120 章，若 novelContext 有設定則用設定值
    const totalChapters = novelContext.targetEndingChapter || 120;

    const director = determinePlotDirectives(novelContext.currentChapterIndex, lastPlotState, novelContext.genre, tags, totalChapters);
    const toneDesc = getToneInstruction(tone);
    const povDesc = getPovInstruction(pov);
    const styleGuide = `類型：${novelContext.genre} | 風格標籤：${tags.join('、')}。\n${toneDesc}\n${povDesc}`;

    // 將完整 profile 傳給 AI，以便其理解角色深度
    const charText = characters.map(c => {
        const profile = typeof c.profile === 'string' ? JSON.parse(c.profile) : c.profile;
        const profileStr = profile ? ` (陰影:${profile.trauma || '無'}, 慾望:${profile.desire || '無'})` : '';
        return `- ${c.name} (${c.role}): ${c.description} [狀態: ${c.status}]${profileStr}`;
    }).join('\n');

    const memText = memories.slice(0, 15).map(m => `- ${m.content}`).join('\n');
    const blueprint = JSON.stringify(novelContext.design_blueprint || {});

    // 結局倒數邏輯 (與 director.directive 中的終局指令雙重保險)
    let endingInstruction = "";
    const left = totalChapters - novelContext.currentChapterIndex;
    if (left <= 5 && left > 0) endingInstruction = `【全局終局倒數】還有 ${left} 章完結。請開始收束全書伏筆，向「終極目標」衝刺。`;
    else if (left <= 0) endingInstruction = `【全書大結局】這是最後一章！請給出一個情感飽滿的結局。`;

    const baseSystemPrompt = `你是一名專業的小說家。請撰寫下一章並維護世界觀數據。`;

    const geminiUserPrompt = `
    【小說資訊】
    標題：${novelContext.title}
    風格設定：${styleGuide}
    當前卷名/副本：${director.arcName}
    
    【設計圖 (導航)】
    ${blueprint}
    (寫作時請時刻記得「終極目標」與「世界真相」，確保劇情不跑偏)

    【本章導演指令 (重要)】
    ${director.directive}
    ${endingInstruction}
    
    【寫作重點】
    1. **字數**：1500-2000字。
    2. **鏡頭規則**：${pov}。鏡頭必須跟隨主角。
    3. **群像**：請描寫配角與路人的反應，增加世界真實感。
    4. **希望**：無論過程多慘烈，結尾請留下一線希望或新的線索。

    【上下文】
    記憶庫：${memText}
    角色狀態：${charText}
    前文摘要：${previousContent.slice(-1500)}

    【回傳 JSON】
    {
      "content": "小說內文...",
      "new_memories": ["關鍵事件1"],
      "character_updates": [
         {
           "name": "角色名",
           "status": "更新狀態",
           "is_new": false,
           "profile_update": { "appearance": "...", "personality": "...", "biography": "...", "trauma": "..." }
         }
      ],
      "plot_state": { 
          "phase": "${director.phase}", 
          "arcName": "${director.arcName}" 
      }
    }
    `;

    try {
        const geminiModel = getGeminiModel(true);
        const geminiPrompt = baseSystemPrompt + "\n" + geminiUserPrompt + `\n 回傳 JSON Schema 請包含 plot_state`;
        const result = await geminiModel.generateContent(geminiPrompt);
        return cleanJson(result.response.text());

    } catch (error) {
        if (isGeminiBlockedError(error)) {
            console.log("🚀 Fallback: Gemini blocked. Switching to English Pipeline...");
            try {
                const englishUserPrompt = `
                Novel: ${novelContext.title}
                Current Arc: ${director.arcName}
                
                DIRECTOR'S INSTRUCTION:
                ${director.directive}
                
                POV RULE:
                Third-person limited perspective following the MAIN CHARACTER (${pov}). 
                
                WORLD BUILDING:
                Include description of background characters/mobs/passersby.
                
                Previous Context: ${previousContent.slice(-1500)}
                
                Task: Write next chapter. STRICTLY FOLLOW INSTRUCTIONS. Focus on character depth.
                `;
                const chineseContent = await callOpenRouterPipeline(baseSystemPrompt, englishUserPrompt);
                return {
                    content: chineseContent,
                    new_memories: [],
                    character_updates: [],
                    plot_state: { phase: director.phase, arcName: director.arcName }
                };
            } catch (fbError) {
                console.error("Pipeline Failed:", fbError);
                throw new Error("系統暫時無法生成內容，請稍後再試。");
            }
        }
        throw error;
    }
};