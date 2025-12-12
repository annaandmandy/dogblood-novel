import { directorInfinite } from "../agents/infinite/planInfinite.js";
import { planInfinite } from "../agents/infinite/planInfinite.js";
import { determinePlotDirectives, planChapter } from "../lib/plot_logic.js";
import { editorInfinite, editorGeneral } from "../agents/editor.js";
import { getGeminiModel, cleanJson, polishContent, callDeepSeek, ANTI_CLICHE_INSTRUCTIONS, getToneInstruction, getPovInstruction } from "../lib/llm.js";

// ==========================================
// 🎬 Director Node
// ==========================================
export const directorNode = async (state) => {
    const { novelContext, plotState } = state;
    const { title, genre } = novelContext;

    console.log(`🎬 Director Node Running for: ${title}`);

    let nextDirectorOutput;

    if (genre === "無限流") {
        // Infinite Flow Director
        // Note: directorInfinite needs (currentChapterIndex, lastPlotState, totalChapters)
        // context doesn't explicitly store totalChapters or currentChapterIndex separately if we rely on plotState
        // We might need to derive it or pass it in state.
        // Assuming plotState tracks instance_progress and phase.
        // We'll treat currentChapterIndex as derived or just pass 0 if not tracking global index strictly yet.
        // Actually, let's treat plotState as the source of truth.
        nextDirectorOutput = directorInfinite(0, plotState, 200); // 200 default for infinite
    } else {
        // Standard Director
        nextDirectorOutput = determinePlotDirectives(0, plotState, genre, state.tags || []);
    }

    return {
        directorOutput: nextDirectorOutput,
        plotState: {
            ...plotState,
            phase: nextDirectorOutput.phase,
            sub_phase: nextDirectorOutput.sub_phase,
            intensity: nextDirectorOutput.intensity,
            // maintain other props
        }
    };
};

// ==========================================
// 🧠 Planner Node
// ==========================================
export const plannerNode = async (state) => {
    const { directorOutput, novelContext, prevText, memories, clues, characters, tags, tone, useDeepSeek, plotState } = state;

    console.log(`🧠 Planner Node Running... Phase: ${directorOutput?.phase}`);

    let plan;

    if (novelContext.genre === "無限流") {
        plan = await planInfinite({
            director: directorOutput,
            blueprint: novelContext.design_blueprint,
            contextSummary: prevText.slice(-1000), // Approximate summary
            memories,
            clues,
            characters,
            tags,
            tone,
            lastPlotState: plotState, // Pass current plotState
            useDeepSeek,
            novelId: novelContext.id
        });
    } else {
        // Standard Planner
        // planChapter expects (director, blueprint, contextSummary, memories, clues, genre, tags, useDeepSeek, characters, instanceProgress)
        plan = await planChapter(
            directorOutput,
            novelContext.design_blueprint,
            prevText.slice(-1000),
            memories,
            clues,
            novelContext.genre,
            tags,
            useDeepSeek,
            characters,
            plotState.instance_progress || 0
        );
    }

    return {
        chapterPlan: plan,
        // Update plotState with planner's suggestions (e.g. progress increment)
        plotState: {
            ...plotState,
            instance_progress: (plotState.instance_progress || 0) + (plan?.suggested_progress_increment || 5)
        }
    };
};

// ==========================================
// ✍️ Writer Node
// ==========================================
export const writerNode = async (state) => {
    const { chapterPlan, directorOutput, novelContext, prevText, memories, clues, characters, tags, tone, pov, useDeepSeek, userFeedback, critique } = state;

    console.log(`✍️ Writer Node Running...`);

    const toneDesc = getToneInstruction(tone);
    const povDesc = getPovInstruction(pov);
    const styleGuide = `類型：${novelContext.genre} | 風格：${(tags || []).join('、')} | ${toneDesc} | ${povDesc}`;
    const blueprintStr = JSON.stringify(novelContext.design_blueprint || {});
    const charText = (characters || []).map(c => `- ${c.name} (${c.role}): ${c.description} [狀態: ${c.status}]`).join('\n');
    const memText = (memories || []).map(m => m.content).join('\n');
    const prevSlice = prevText.slice(-2000);

    const outlineContext = chapterPlan ?
        `【本章大綱】\n標題：${chapterPlan.chapter_title}\n內容：${chapterPlan.outline}\n線索：${chapterPlan.key_clue_action}\n感情：${chapterPlan.romance_moment}` : "";

    let rewriteInstruction = "";
    if (critique && critique.status === "REWRITE_REQUIRED") {
        rewriteInstruction = `
        【⚠️ 重寫指令】
        上一版草稿被駁回。請根據以下意見修改：
        ${critique.required_fixes.join('\n')}
        `;
    }

    if (userFeedback) {
        rewriteInstruction += `\n【用戶反饋】${userFeedback}`;
    }

    const geminiUserPrompt = `
    ${ANTI_CLICHE_INSTRUCTIONS}
    【資訊】${novelContext.title} | ${directorOutput?.phase}
    【風格】${styleGuide}
    【設計圖】${blueprintStr}
    【導演指令】${directorOutput?.directive || JSON.stringify(directorOutput)}
    ${outlineContext}
    
    ${rewriteInstruction}

    【去重指令】請檢查前文，絕對不要重複上一章的結尾內容或對話。劇情必須向前推進。
    
    【上下文】
    記憶：${memText}
    線索：${(clues || []).join('\n')}
    角色：${charText}
    前文：${prevSlice}

    【回傳 JSON】
    {
      "content": "小說內文...",
      "new_memories": [], "new_clues": [], "resolved_clues": [], "character_updates": []
    }
    `;

    // Call Model
    // Logic similar to getGeminiModel use
    let draft;
    let responseJson;

    try {
        if (useDeepSeek && ANTI_CLICHE_INSTRUCTIONS) {
            // If we really want to use DeepSeek for writing, logic is here.
            // For consistency with existing code, let's try Gemini first usually unless specified.
            // But existing code falls back to OpenRouter if blocked.
            const model = getGeminiModel(true);
            const result = await model.generateContent(geminiUserPrompt);
            responseJson = cleanJson(result.response.text());
        } else {
            const model = getGeminiModel(true);
            const result = await model.generateContent(geminiUserPrompt);
            responseJson = cleanJson(result.response.text());
        }
    } catch (e) {
        console.error("Writer error, trying fallback...", e);
        try {
            // Simple fallback to OpenRouter logic if LLM blocked
            const content = await callDeepSeek("你是小說家", geminiUserPrompt, true); // reusing general call
            responseJson = typeof content === 'string' ? { content } : content;
        } catch (err) {
            throw new Error(`Generation failed completely. Primary Error: ${e.message}. Fallback Error: ${err.message}`);
        }
    }

    draft = responseJson.content;

    // Polish
    if (draft && draft.length > 500) {
        draft = await polishContent(draft, tone, pov);
    }

    return {
        draft: draft,
        // Pass metadata to state for API response
        new_memories: responseJson.new_memories || [],
        new_clues: responseJson.new_clues || [],
        resolved_clues: responseJson.resolved_clues || [],
        character_updates: responseJson.character_updates || [],
        // Ideally we should merge these into the main 'memories' / 'clues' arrays in the state too
        // if we want the graph to run multiple steps autonomously.
        // For now, Reader.jsx expects them as deltas, so we store them as deltas.
    };
};

// ==========================================
// 🧐 Editor Node
// ==========================================
export const editorNode = async (state) => {
    const { draft, chapterPlan, prevText, directorOutput, novelContext, useDeepSeek } = state;

    console.log(`🧐 Editor Node Running...`);

    let editorResult;
    const params = {
        draft,
        plan: chapterPlan,
        prevText: prevText.slice(-2000),
        director: directorOutput,
        novelContext,
        relationships: [], // TODO: pass relationships if available
        useDeepSeek
    };

    if (novelContext.genre === "無限流") {
        editorResult = await editorInfinite(params);
    } else {
        editorResult = await editorGeneral(params);
    }

    return {
        critique: editorResult
    };
};
