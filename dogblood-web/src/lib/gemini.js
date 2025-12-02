import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY in .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Helper to get model - User requested specific model
const getModel = () => genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

export const generateRandomSettings = async (genre) => {
    const model = getModel();
    const prompt = `
    請為一部「${genre}」類型的小說生成一套原創設定。
    
    嚴格要求：
    1. **絕對原創**：禁止使用任何現有知名小說、動漫、影視作品的人物名稱（如：沈清秋、洛冰河、魏無羨等）或具體劇情。請創造全新的名字和背景。
    2. **繁體中文**：所有內容必須是繁體中文。
    3. **詳細摘要**：請生成一段至少 150 字的劇情摘要 (Summary)，這將作為小說的簡介，需要包含核心衝突和看點。
    
    請以 JSON 格式輸出，不要包含 Markdown 代碼塊標記：
    {
      "title": "小說標題",
      "protagonist": "主角姓名 (原創)",
      "loveInterest": "對象/反派姓名 (原創)",
      "trope": "核心梗 (例如：重生、系統、穿越等)",
      "summary": "至少 150 字的劇情摘要..."
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating settings:", error);
        // Fallback for demo if JSON parsing fails, though Gemini is usually good
        return {
            title: "生成失敗",
            protagonist: "未知",
            loveInterest: "未知",
            trope: "未知",
            summary: "生成設定時發生錯誤，請重試。"
        };
    }
};

export const generateNovelStart = async (genre, settings) => {
    const model = getModel();

    const prompt = `
    你是一個專業的網絡小說作家，擅長寫作「${genre}」類型的小說。
    請根據以下設定，創作出小說的第一章（約 800-1200 字）。
    
    設定：
    - 標題：${settings.title}
    - 主角：${settings.protagonist}
    - 對象/反派：${settings.loveInterest}
    - 核心梗：${settings.trope}
    - 摘要：${settings.summary}
    
    嚴格要求：
    1. **原創性**：內容必須完全原創，嚴禁抄襲任何現有作品。
    2. **語言**：繁體中文 (Traditional Chinese)。
    3. **風格**：${genre === 'BL' ? '耽美、細膩、張力十足、情感糾葛' : '言情、爽文、節奏快、打臉虐渣'}。
    4. **格式**：請直接輸出小說內容，不要有任何前言後語。
    5. **內容**：第一章要有強烈的衝突或懸念，吸引讀者。
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating novel:", error);
        throw error;
    }
};

export const generateNextChapter = async (novelContext, previousContent, characters = [], memories = []) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-09-2025",
        generationConfig: { responseMimeType: "application/json" }
    });

    const charText = characters.map(c => `- ${c.name}: ${c.description} [目前狀態: ${c.status}]`).join('\n');
    const memText = memories.slice(0, 10).map(m => `- ${m.content}`).join('\n');

    const prompt = `
    你是一名網文小說家。請根據設定撰寫下一章，並同時更新世界觀數據。

    【小說設定】標題: ${novelContext.title}, 主角: ${novelContext.protagonist}, 類型: ${novelContext.trope}
    【角色狀態】${charText}
    【記憶庫】${memText}
    【上一章】${previousContent.slice(-2000)}

    【任務要求】
    1. 撰寫新章節 (約 1000-1500 字)。
    2. 偵測是否有角色狀態改變 (如: 受傷、升級、獲得物品) 或新角色登場。
    3. 偵測是否發生值得記錄的關鍵劇情 (Memory)。
    4. 回傳嚴格的 JSON 格式。

    【JSON Schema】
    {
      "content": "小說內文...",
      "new_memories": ["主角獲得了XX劍", "反派YYY登場"],
      "character_updates": [
        { "name": "主角名", "status": "重傷", "description_append": "獲得了雷電異能" } 
      ]
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating next chapter:", error);
        throw error;
    }
};
