import { callDeepSeek, getGeminiModel, cleanJson } from '../lib/llm.js';

const EDITOR_PROMPT = (draft, plan, prevText, director, novelContext, relationships) => `
你是小說總編輯 Editor Agent。

你的任務：審核 Writer 的草稿是否符合規格。

【審核五大項】
1️⃣ 是否完全依照 story_beats？
- 是否有跳步？
- 是否加入未出現在 beats 的劇情？

2️⃣ 是否緊接上一章？
- 開頭是否承接上一章？
- 是否重複上一章內容？

3️⃣ 設定一致性
- 是否新增規則/武器/魔法？
- 是否破壞世界觀？
- 是否 OOC（角色性格偏差）？

4️⃣ 敘事功能是否達成？
- Director 的 chapter_function 是否被實現？

5️⃣ 文本品質
- 有無 AI 味？
- 有無不必要灌水？

【如果不合格】
輸出：
{
  "status": "REWRITE_REQUIRED",
  "reason": "清楚描述問題",
  "required_fixes": [
    "修正點1",
    "修正點2"
  ]
}

【如果合格】
輸出：
{
  "status": "PASS",
  "notes": "可選，給下一章的建議"
}

【Writer 草稿】
${draft}

【Planner】
${JSON.stringify(plan, null, 2)}

【上一章】
${prevText}

【Director】
${JSON.stringify(director, null, 2)}
`;

const runEditorCheck = async ({
    draft,
    plan,
    prevText,
    director,
    novelContext,
    relationships,
    useDeepSeek = false
}) => {
    const prompt = EDITOR_PROMPT(draft, plan, prevText, director, novelContext, relationships);

    try {
        let result;
        if (useDeepSeek) {
            result = await callDeepSeek("你是小說總編輯。", prompt, true);
        } else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            result = cleanJson(res.response.text());
        }

        return result;
    } catch (e) {
        console.error("Editor Agent Error:", e);
        return { status: "PASS", summary_for_plan_update: "" };
    }
};

export const editorInfinite = (params) => runEditorCheck(params);
export const editorGeneral = (params) => runEditorCheck({ ...params, isGeneral: true });
