import {
    callDeepSeek,
    getGeminiModel,
    cleanJson,
    ANTI_CLICHE_INSTRUCTIONS,
    getToneInstruction,
    getPovInstruction,
} from "../../lib/llm.js";

import { supabase } from '../../lib/supabase.js';

// ==========================================
// 🎲 Smart Theme Pool (百大副本庫 - 完整版)
// ==========================================
const THEME_POOL = {
    // 🏫 現代/都市靈異 (適合新手/前期)
    modern: [
        "深夜校園", "404號公寓", "廢棄醫院", "午夜末班車", "無人便利店",
        "詭異遊樂園", "死亡直播間", "鬧鬼電影院", "整形美容院", "猛鬼大廈",
        "陰森圖書館", "地下停車場", "模特兒經紀公司", "深山療養院", "雨夜屠夫案",
        "逃離網戒中心", "無限電梯", "靈異照相館", "蠟像館驚魂", "玩偶工廠",
        "太平間夜班", "都市傳說俱樂部", "廢棄地鐵線", "自殺直播間", "網紅鬼屋探險",
        "恐怖快遞站", "雨夜計程車", "鏡中公寓", "迴聲走廊", "鄰居的日記",
        "直播帶貨的詛咒", "數字詛咒信", "電子寵物復仇", "智能家居失控", "虛擬偶像鬼魂",
        "加班大樓的怨念", "共享單車墳場", "外賣員的末路", "KTV最後一間", "密室逃脫真人版",
        "網吧包夜驚魂", "快遞櫃裡的秘密", "合租房禁忌", "電梯維修日", "停電的購物中心",
        "末日預言聊天群", "相親對象是鬼", "寵物監控的真相", "遺物整理師", "最後一班渡輪"
    ],

    // 🏮 中式/民俗恐怖 (適合中式恐怖 Tag)
    chinese: [
        "冥婚古宅", "湘西趕屍", "封門鬼村", "戲班驚魂", "黃皮子墳",
        "陰陽客棧", "苗疆蠱寨", "鎖龍井", "紙人回魂夜", "義莊守夜",
        "奈何橋邊", "繡花鞋老宅", "皮影戲班", "長生邪教", "血祭龍王廟",
        "山村老屍", "狐仙廟", "鬼市交易", "殭屍王爺", "五行殺陣",
        "水鬼拉替身", "吊死鬼林", "斷頭新娘", "畫皮妖", "古鏡攝魂",
        "借陰壽", "養小鬼", "趕屍客棧", "鬼打牆山村", "撈屍人",
        "陰兵借道", "鬼嬰哭墳", "河神娶親", "祖墳風水局", "打生樁",
        "紮紙術傳承", "趕海遇海鬼", "龍脈鎮壓", "鬼戲台", "死人妝",
        "陰宅中介", "鬼當鋪", "背屍工", "問米婆", "走陰人",
        "棺材鋪秘聞", "屍變客棧", "鬼抬轎", "陰胎", "骨灰盒的詛咒",
        "夜哭郎", "鬼剃頭", "餓鬼道", "陰司路引", "地府快遞"
    ],

    // 🏰 西式/宗教/克蘇魯 (適合西幻/克蘇魯 Tag)
    western: [
        "德古拉城堡", "開膛手傑克", "塞勒姆女巫審判", "寂靜嶺迷霧", "血腥瑪麗",
        "舊日支配者祭壇", "深海拉萊耶", "瘋狂修道院", "惡魔召喚儀式", "恐怖孤兒院",
        "溫徹斯特鬼屋", "人皮客棧", "喪屍圍城", "弗蘭肯斯坦實驗室", "吸血鬼舞會",
        "狼人村落", "惡靈附身", "詛咒人偶安娜貝爾", "深淵凝視", "黑彌撒",
        "聖嬰遺骸", "懺悔室秘密", "聖水污染", "褻瀆教堂", "異端審判所",
        "死靈法師塔", "地獄邊境", "魔鬼契約", "七宗罪試煉", "天使墮落日",
        "黑死病醫生", "活體標本館", "畸形秀馬戲團", "人體蜈蚣實驗", "靈魂交換儀式",
        "地獄廚房", "詛咒油畫", "鬼修女", "邪神胎兒", "食人魔莊園",
        "瘟疫醫生面具", "活埋俱樂部", "人體蠟像", "瘋人院地下", "獻祭之夜",
        "古神低語", "深海恐懼症", "星空瘋狂", "不可名狀之物", "宇宙恐怖",
        "黃衣之王", "奈亞拉托提普", "阿撒托斯之夢", "遠古者遺跡", "星之彩"
    ],

    // 🚀 科幻/未來/收容 (適合星際/賽博 Tag)
    scifi: [
        "SCP收容失效", "AI暴走都市", "太空幽靈船", "生化危機實驗室", "賽博貧民窟",
        "複製人工廠", "虛擬現實崩壞", "缸中之腦", "機械公敵", "異形母巢",
        "時空折疊站", "核輻射廢土", "基因改造營", "量子幽靈", "矩陣重啟",
        "反烏托邦監獄", "記憶提取中心", "深海基地", "月球背面", "硅基生物入侵",
        "智械危機", "意識上傳失敗", "時間悖論監獄", "平行宇宙交匯", "克魯蘇AI",
        "數字鬼魂", "賽博精神病院", "義體排斥反應", "腦機接口病毒", "全息幻境崩壞",
        "戴森球故障", "蟲族入侵", "星際難民船", "黑洞邊緣站", "量子糾纏詛咒",
        "記憶篡改公司", "情感刪除服務", "永生代價", "克隆體叛亂", "納米機器人瘟疫",
        "虛擬偶像覺醒", "數據幽靈復仇", "元宇宙崩潰", "意識囚籠", "靈魂備份站",
        "時間回溯失敗", "因果律武器失控", "高維生物觀察", "文明重置器", "宇宙歸零",
        "外星遺物感染", "星際恐懼症", "維度裂縫", "反物質泄露", "奇點降臨"
    ],

    // ⚔️ 生存/大逃殺/規則 (適合無限流/規則怪談)
    survival: [
        "絕地求生島", "死亡迷宮", "飢餓遊戲", "俄羅斯輪盤賭場", "暴風雪山莊",
        "亞馬遜食人族", "泰坦尼克號沉沒夜", "龐貝古城末日", "切爾諾貝利", "迷霧森林",
        "規則怪談：動物園", "規則怪談：媽媽的紙條", "七日殺", "死亡列車", "天空鬥技場",
        "謊言之城", "禁止呼吸", "黑暗童話鎮", "愛麗絲夢遊仙境", "無盡迴廊",
        "大逃殺校園", "殺人遊戲別墅", "定時炸彈城市", "倖存者名額爭奪", "氧氣耗盡空間站",
        "深海潛艇困境", "沙漠求生", "極地考察站", "火山爆發前夜", "隕石撞擊倒數",
        "喪屍圍城十日", "病毒感染隔離區", "食人族部落", "原始森林求生", "無人荒島",
        "規則怪談：公司", "規則怪談：學校", "規則怪談：醫院", "規則怪談：旅館", "規則怪談：遊輪",
        "死亡遊戲直播", "賭命擂台", "致命捉迷藏", "殺手與平民", "最後的晚餐",
        "時限迷宮", "機關城堡", "毒氣密室", "洪水倒灌", "高溫熔爐",
        "冰封末日", "酸雨侵蝕", "輻射廢土", "磁極翻轉", "太陽耀斑"
    ],

    // 🌟 新增類別：混合/跨界/創意類
    hybrid: [
        "賽博鬼城", "AI詛咒", "機械幽靈", "數字招魂", "虛擬地獄",
        "義體鬼魂", "全息鬼屋", "納米詛咒", "量子鬼魅", "時間幽靈",
        "都市狐仙", "地鐵陰兵", "寫字樓養屍", "快遞鬼妻", "網紅黃皮子",
        "共享單車借陰債", "外賣餓鬼", "直播驅魔", "電競通靈", "滴滴鬼車",
        "舊日支配者的公司", "深潛者地鐵", "星空瘋人院", "古神直播間", "邪神外賣",
        "克蘇魯規則怪談", "深淵電梯", "不可名狀的學校", "星空恐懼遊樂園", "古神詛咒APP",
        "表情包詛咒", "emoji殺人事件", "短視頻循環地獄", "彈幕鬼魂", "雲端鬼魂",
        "Wi-Fi招魂", "藍牙附身", "二維碼詛咒", "網紅濾鏡真相", "算法殺人",
        "兵馬俑復活", "故宮夜巡", "金字塔詛咒", "特洛伊木馬病毒", "維京鬼船",
        "瑪雅預言末日", "秦始皇永生計劃", "木乃伊快遞", "騎士亡魂", "武士怨靈"
    ],

    // 🎭 新增類別：心理/超現實/抽象
    psychological: [
        "記憶迷宮", "夢境囚籠", "意識深淵", "人格分裂診所", "現實扭曲病房",
        "時間感知失調", "空間認知崩壞", "感官剝奪實驗", "集體幻覺小鎮", "存在危機危機",
        "邏輯地獄", "悖論房間", "自指詛咒", "無限迴圈公寓", "自我吞噬空間",
        "他者地獄", "鏡像監獄", "聲音實體化", "色彩殺人", "幾何恐懼",
        "語言病毒", "思想污染", "概念實體", "抽象恐懼", "形而上詛咒",
        "存在性虛無", "意義崩塌", "認知邊界", "理性盡頭", "瘋狂臨界點"
    ],

    // 🏛️ 新增類別：歷史/神話/傳說改編
    historical: [
        "特洛伊之夜", "龐貝最後一夜", "圓明園鬼影", "兵馬俑蘇醒", "瑪雅血祭",
        "亞特蘭蒂斯回歸", "樓蘭鬼城", "吳哥窟詛咒", "印加黃金城", "所羅門寶藏",
        "聖杯詛咒", "約櫃殺機", "死海古卷秘密", "諾亞方舟殘骸", "巴別塔遺跡",
        "奧林匹斯神怒", "北歐諸神黃昏", "埃及十災重現", "巴比倫空中花園", "波斯不死軍",
        "匈奴王陵墓", "成吉思汗秘葬", "秦始皇地宮", "武則天無字碑", "大明咒術案",
        "維京英靈殿", "騎士團秘寶", "女巫審判夜", "海盜鬼船", "西部亡魂鎮"
    ],

    // 🎪 新增類別：娛樂/流行文化梗
    popculture: [
        "綜藝大逃殺", "真人秀地獄", "偶像養成詛咒", "電競選手亡魂", "主播連線鬼",
        "電影拍攝事故", "劇組鬧鬼事件", "漫展克蘇魯", "同人展異變", "Cosplay殺人事件",
        "遊戲實體化", "副本成真", "裝備具現化", "技能覺醒日", "氪金詛咒",
        "短視頻挑戰死亡", "直播PK地獄", "彈幕殺人", "評論區鬼魂", "點贊詛咒",
        "微博熱搜詭事", "朋友圈靈異", "微信群死亡遊戲", "知乎怪談成真", "B站鬼畜實體化"
    ],

    // 🌌 新增類別：宇宙/高維/終極恐怖
    cosmic: [
        "宇宙歸零", "熱寂前夕", "真空衰變", "奇點降臨", "維度坍塌",
        "時間盡頭", "因果崩壞", "物理法則失效", "數學地獄", "邏輯末日",
        "觀察者效應恐怖", "量子自殺", "平行宇宙污染", "多世界詛咒", "退相干地獄",
        "黑洞信息悖論", "白洞噴發", "蟲洞迷失", "曲速引擎故障", "超光速詛咒",
        "宇宙背景輻射低語", "暗物質實體", "暗能量侵蝕", "弦理論噩夢", "M理論地獄",
        "高維生物飼養場", "宇宙農場主假說", "缸中之腦集群", "模擬世界崩潰", "造物主棄坑"
    ]
};

const selectDungeonTheme = (tags = [], cycleNum = 1, usedThemes = []) => {
    let availablePools = [];
    if (tags.includes("中式恐怖") || tags.includes("古風") || tags.includes("盜墓")) availablePools.push(...THEME_POOL.chinese);
    if (tags.includes("克蘇魯") || tags.includes("西幻") || tags.includes("吸血鬼")) availablePools.push(...THEME_POOL.western, ...THEME_POOL.cosmic);
    if (tags.includes("星際") || tags.includes("賽博龐克") || tags.includes("科幻")) availablePools.push(...THEME_POOL.scifi, ...THEME_POOL.cosmic);
    if (tags.includes("懸疑") || tags.includes("驚悚") || tags.includes("燒腦")) availablePools.push(...THEME_POOL.psychological);

    availablePools.push(...THEME_POOL.modern, ...THEME_POOL.survival, ...THEME_POOL.hybrid, ...THEME_POOL.popculture);

    if (cycleNum > 5) availablePools.push(...THEME_POOL.scifi, ...THEME_POOL.cosmic, ...THEME_POOL.psychological);

    const freshThemes = availablePools.filter(theme => !usedThemes.includes(theme));
    const finalPool = freshThemes.length > 0 ? freshThemes : availablePools;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
};

// 專屬的防套路指令 (針對無限流優化)
const INFINITE_ANTI_CLICHE = `
${ANTI_CLICHE_INSTRUCTIONS}
【無限流特化：沈浸式寫作】
1. **拒絕說明書**：副本規則是用來「觸發」的，不是用來「背誦」的。不要花大篇幅解釋機制，要花篇幅描寫**在機制下的人性與互動**。
2. **人物弧光**：主角不是殺人機器。請描寫他在殺戮後的疲憊、對人性的失望，以及被 CP 治癒的瞬間。
3. **現實的重量**：回到現實世界/主世界後，反差感要強烈。
4. **極致張力**：主角與CP的關係應該充滿張力。
5. **群像刻畫**：隊友不是報幕員。請賦予他們鮮明的性格。
`;

// 新增：主角認知限制指令 (防止主角一開始就知道所有設定)
const IGNORANCE_INSTRUCTION = `
【⚠️ 認知限制 (Fog of War)】
- **主角是新人**：除非設定中主角是重生者，否則**嚴禁**主角一開始就知道「主神」、「副本」、「積分」等專有名詞。
- **循序漸進**：主角應該對眼前的一切感到困惑、恐懼、懷疑。
- **描述方式**：不要寫「系統面板出現」，要寫「視網膜上突兀地浮現出一行血紅的字跡」。不要寫「進入了副本」，要寫「推開門，原本熟悉的走廊變成了一片荒蕪的墳場」。
`;

// ==========================================
// 1. 專屬設定生成 (支援模型切換)
// ==========================================
export const generateInfiniteSettings = async (tags = [], tone = "一般", targetChapterCount = null, category = "BG", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);
    const totalChapters = targetChapterCount || 200;
    const isRuleBased = tags.includes("規則怪談");

    let genderConstraint = "";
    if (category === "BG") genderConstraint = "主角必須是一男一女 (BG)。";
    else if (category === "BL") genderConstraint = "主角必須是兩位男性 (BL)。";
    else if (category === "GL") genderConstraint = "主角必須是兩位女性 (GL)。";

    const dungeonRequirement = isRuleBased
        ? "設計【規則怪談】副本。必須包含5-8條詭異的紅藍字規則，以及規則背後的邏輯陷阱。"
        : "設計【生存/動作/解謎】副本。重點在於「主線任務」與「環境威脅」。";

    const prompt = `
    你是一位頂級的無限流小說架構師。
    請設計一套驚悚、懸疑但充滿 CP 張力的設定。
    **類別**：${category}。**篇幅**：${totalChapters} 章。
    **性別要求**：${genderConstraint}
    風格：${tags.join('、')}。\n${toneDesc}
    
    ${INFINITE_ANTI_CLICHE}
    
    【任務要求】
    1. **CP 設計 (關鍵)**：設計一對強強 CP（或極致拉扯）。他們在現實世界是否有過節？還是久別重逢？或者是系統的對立面？
    2. **主角團 (The Squad)**：請設計 2-3 位**固定隊友**。他們將與主角一起闖關。請賦予他們討喜的性格標籤。
    3. **主線謎題**：主角進入無限世界並非偶然。請設計一個貫穿全書的懸疑主線。
    4. **第一副本設計**：${dungeonRequirement}
    
    【回傳 JSON】
    {
      "title": "小說標題",
      "summary": "吸睛文案 (需包含主世界/學校/空間的背景設定)",
      "trope": "核心梗",
      "design_blueprint": {
          "main_goal": "主角終極目標",
          "world_truth": "世界隱藏真相",
          "ending_vision": "預設結局",
          "side_characters": [ 
              { "name": "...", "role": "隊友/搞笑擔當", "profile": "...", "speaking_style": "...", "sample_dialogue": "..." },
              { "name": "...", "role": "隊友/智囊", "profile": "...", "speaking_style": "...", "sample_dialogue": "..." }
          ]
      },
      "first_dungeon_setting": {
          "dungeon_name": "副本名稱",
          "difficulty": "等級",
          "background_story": "副本背景",
          "core_rules": ["規則1...", "規則2..."], 
          "missions": ["主線任務...", "支線任務..."], 
          "mechanics": { "gameplay": "核心玩法", "threat": "主要威脅" }
      },
      "protagonist": { "name": "主角名", "role": "主角", "gender": "...", "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "trauma": "...", "desire": "...", "speaking_style": "...", "sample_dialogue": "..." } },
      "loveInterest": { "name": "對象名", "role": "...", "gender": "...", "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "trauma": "...", "desire": "...", "speaking_style": "...", "sample_dialogue": "..." } }
    }
    `;

    try {
        if (useDeepSeek) {
            return await callDeepSeek("你是一位無限流架構師。", prompt, true);
        } else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            return cleanJson(res.response.text());
        }
    } catch (e) {
        console.warn("Settings generation failed, retrying with Gemini...", e);
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    }
};

export const ensureInfiniteSettings = async (simpleSettings, tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);
    const isRuleBased = tags.includes("規則怪談");

    if (simpleSettings.first_dungeon_setting && simpleSettings.first_dungeon_setting.dungeon_name) {
        return simpleSettings;
    }

    const prompt = `
    你是一位無限流小說架構師。
    請根據現有的簡單設定，補全【第一個副本】的詳細設計，以及【世界觀藍圖】。
    標題：${simpleSettings.title}
    風格：${tags.join('、')}
    ${INFINITE_ANTI_CLICHE}

    【補全任務】
    1. **副本設計**：${isRuleBased ? "設計一個規則怪談副本，包含5-8條紅藍字規則。" : "設計一個生存/解謎副本，包含主線任務與環境威脅。"}
    2. **世界觀藍圖 (Design Blueprint)**：請設計主角的「終極目標」、無限世界的「隱藏真相」以及「預設結局」。
    3. **角色深度設定**：請完善主角 (${simpleSettings.protagonist?.name || simpleSettings.protagonist}) 與對象 (${simpleSettings.loveInterest?.name || simpleSettings.loveInterest}) 的詳細人設（外貌、性格、說話風格）。
    4. **配角設計**：補充 2 位關鍵隊友。

    回傳 JSON (只回傳需要補全/更新的欄位):
    {
        "design_blueprint": { 
            "main_goal": "...", 
            "world_truth": "...", 
            "ending_vision": "...",
            "side_characters": [ { "name": "...", "role": "...", "profile": "..." } ]
        },
        "first_dungeon_setting": { 
            "dungeon_name": "...", 
            "difficulty": "...", 
            "background_story": "...", 
            "core_rules": [], 
            "missions": [], 
            "mechanics": { "gameplay": "...", "threat": "..." } 
        },
        "protagonist": { 
            "name": "${simpleSettings.protagonist?.name || simpleSettings.protagonist}", 
            "role": "主角", 
            "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "speaking_style": "...", "sample_dialogue": "..." } 
        },
        "loveInterest": { 
            "name": "${simpleSettings.loveInterest?.name || simpleSettings.loveInterest}", 
            "role": "對象", 
            "profile": { "appearance": "...", "personality_surface": "...", "personality_core": "...", "biography": "...", "speaking_style": "...", "sample_dialogue": "..." } 
        }
    }
    `;

    try {
        let result;
        if (useDeepSeek) result = await callDeepSeek("你是一位無限流架構師。", prompt, true);
        else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            result = cleanJson(res.response.text());
        }

        const finalSettings = { ...simpleSettings, ...(result || {}) };

        if (!finalSettings.protagonist || typeof finalSettings.protagonist === 'string') {
            finalSettings.protagonist = {
                name: typeof finalSettings.protagonist === 'string' ? finalSettings.protagonist : "主角",
                role: '主角',
                profile: {}
            };
        }
        if (!finalSettings.loveInterest || typeof finalSettings.loveInterest === 'string') {
            finalSettings.loveInterest = {
                name: typeof finalSettings.loveInterest === 'string' ? finalSettings.loveInterest : "對象",
                role: '對象',
                profile: {}
            };
        }

        if (!finalSettings.design_blueprint || Object.keys(finalSettings.design_blueprint).length === 0) {
            console.log("⚠️ design_blueprint missing, generating fallback...");
            const blueprintPrompt = `
            請為無限流小說《${finalSettings.title}》設計【世界觀藍圖】。
            風格：${tags.join('、')}
            主角：${finalSettings.protagonist.name}
            對象：${finalSettings.loveInterest.name}
            
            回傳 JSON:
            {
                "design_blueprint": { 
                    "main_goal": "主角的終極目標", 
                    "world_truth": "無限世界的隱藏真相", 
                    "ending_vision": "預設結局",
                    "side_characters": [ { "name": "配角名", "role": "定位", "profile": "簡介" } ]
                }
            }
            `;
            try {
                let bpResult;
                if (useDeepSeek) bpResult = await callDeepSeek("你是一位無限流架構師。", blueprintPrompt, true);
                else {
                    const model = getGeminiModel(true);
                    const res = await model.generateContent(blueprintPrompt);
                    bpResult = cleanJson(res.response.text());
                }
                if (bpResult && bpResult.design_blueprint) {
                    finalSettings.design_blueprint = bpResult.design_blueprint;
                }
            } catch (err) {
                console.warn("Blueprint fallback failed:", err);
                finalSettings.design_blueprint = { main_goal: "活下去", world_truth: "未知", ending_vision: "未知" };
            }
        }

        return finalSettings;

    } catch (e) {
        console.error("ensureInfiniteSettings failed:", e);
        const fallback = { ...simpleSettings };
        if (!fallback.protagonist || typeof fallback.protagonist === 'string') {
            fallback.protagonist = { name: typeof fallback.protagonist === 'string' ? fallback.protagonist : "主角", role: '主角', profile: {} };
        }
        if (!fallback.loveInterest || typeof fallback.loveInterest === 'string') {
            fallback.loveInterest = { name: typeof fallback.loveInterest === 'string' ? fallback.loveInterest : "對象", role: '對象', profile: {} };
        }
        return fallback;
    }
};

// ==========================================
// 2. 專屬第一章生成 (開局分流：主世界 vs 副本)
// ==========================================
export const generateInfiniteStart = async (settings, tags = [], tone = "一般", pov = "女主", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);
    const povDesc = getPovInstruction(pov);
    const styleGuide = `風格：${tags.join('、')} | ${toneDesc} | ${povDesc}`;
    const isRuleBased = tags.includes("規則怪談");
    const firstDungeon = settings.first_dungeon_setting;
    let sideCharsText = settings.design_blueprint?.side_characters ? settings.design_blueprint.side_characters.map(c => `- ${c.name} (${c.role}): ${c.profile}`).join('\n') : "";

    // 🕵️ 判斷開局類型 (Hub Start vs Dungeon Start)
    const summary = settings.summary || "";
    // 關鍵字檢索：判斷文案中是否提及了「學校」、「入學」、「大廳」、「空間」等主世界概念
    const isHubStart = summary.includes("學校") || summary.includes("入學") || summary.includes("主神空間") || summary.includes("列車") || summary.includes("大廳") || summary.includes("公會");

    let prompt;
    // 預設狀態 (副本開局)
    let startPhase = "setup";
    let startArcName = firstDungeon?.dungeon_name || "未知副本";
    let startDungeonData = firstDungeon;
    let startRules = {
        title: isRuleBased ? "規則書" : "任務面板",
        rules: isRuleBased ? (firstDungeon?.core_rules || []) : (firstDungeon?.missions || []),
        hidden_truth: "未知"
    };
    let startProgress = 5;
    let startCycle = 1;

    // --- 分支 A: 主世界/序章開局 (Cycle 0) ---
    if (isHubStart) {
        startPhase = "hub_intro"; // 特殊階段：主世界導入
        startArcName = "序章：初入世界";
        startDungeonData = null; // 還沒進副本
        startRules = null;       // 還沒有規則
        startProgress = 0;
        startCycle = 0;          // Cycle 0 代表序章

        prompt = `
        你是一位無限流小說家。請撰寫第一章。
        **寫作風格**：${tone}。
        ${INFINITE_ANTI_CLICHE}
        ${IGNORANCE_INSTRUCTION}

        【小說設定】${settings.title}
        【簡介】${summary}
        ${styleGuide}
        【主角】${JSON.stringify(settings.protagonist)}
        【對象】${JSON.stringify(settings.loveInterest)}
        【重要配角】${sideCharsText}
        
        【寫作任務：主世界導入】
        1. **新人報到**：主角剛進入這個奇異的主世界（如：收到錄取通知書來到詭異學校、死後靈魂來到中轉站）。
        2. **未知與迷茫**：描寫主角對環境的困惑，以及與周圍其他「新人」的互動（或許有資深者來引導/恐嚇）。
        3. **接取任務**：章節後半段，主角被迫接到了第一個副本任務【${firstDungeon?.dungeon_name}】，準備傳送或出發。
        4. **氛圍**：主世界雖然暫時安全，但要透露出一種詭異、壓抑或弱肉強食的規則感。
        5. **字數**：2000字以上。
        
        【回傳 JSON】
        {
          "content": "小說正文...",
          "character_updates": [ ... ],
          "plot_state": {
              "phase": "hub_intro", // 標記為序章
              "arcName": "序章：初入世界",
              "instance_progress": 5,
              "cycle_num": 0,       // 0 代表還沒開始第一個正式副本
              "current_dungeon": null,
              "current_rules": null
          }
        }
        `;
    }
    // --- 分支 B: 副本直接開局 (In Media Res) ---
    else {
        let mechanismDisplay = isRuleBased
            ? `**規則展示**：發現詭異規則（紙條/血字）。主角敏銳地察覺規則漏洞。`
            : `**任務發布**：腦海中/視網膜上浮現冰冷的任務文字。主角冷靜分析局勢。`;

        prompt = `
        你是一位無限流小說家。請撰寫第一章。
        **寫作風格**：高智商、強強對抗、快節奏、氛圍驚悚但邏輯嚴密。
        ${INFINITE_ANTI_CLICHE}
        ${IGNORANCE_INSTRUCTION}

        【小說設定】${settings.title}
        ${styleGuide}
        【當前副本：${firstDungeon?.dungeon_name}】
        背景：${firstDungeon?.background_story}
        規則/任務：${isRuleBased ? firstDungeon?.core_rules?.join('\n') : firstDungeon?.missions?.join('\n')}
        【主角】${JSON.stringify(settings.protagonist)}
        【對象】${JSON.stringify(settings.loveInterest)}
        【重要配角】${sideCharsText}
        
        【寫作任務：直接入局】
        1. **驚醒**：主角醒來時已經身處副本中。描寫群體的恐慌 vs 主角的冷靜。
        2. ${mechanismDisplay}
        3. **CP 張力**：安排與攻略對象的初次交鋒。
        4. **字數**：2000字以上。
        
        【回傳 JSON】
        {
          "content": "小說正文...",
          "character_updates": [ ... ],
          "plot_state": {
              "phase": "setup",
              "arcName": "${firstDungeon?.dungeon_name}",
              "instance_progress": 5,
              "cycle_num": 1,
              "current_dungeon": ${JSON.stringify(firstDungeon)},
              "current_rules": { "title": "${isRuleBased ? '規則書' : '任務面板'}", "rules": [], "hidden_truth": "..." }
          }
        }
        `;
    }

    try {
        let result;
        if (useDeepSeek) result = await callDeepSeek("你是一位無限流小說家。", prompt, true);
        else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            result = cleanJson(res.response.text());
        }
        if (!result) result = {};
        if (!result.plot_state) result.plot_state = {};

        // Fallback safety
        if (!result.plot_state.phase) result.plot_state.phase = startPhase;
        if (!result.plot_state.arcName) result.plot_state.arcName = startArcName;
        if (result.plot_state.cycle_num === undefined) result.plot_state.cycle_num = startCycle;

        // FIX: Persist first dungeon for hub start so Chapter 2 can use it
        if (isHubStart && firstDungeon) {
            result.plot_state.preloaded_dungeon = firstDungeon;
        }

        return result;
    } catch (e) {
        throw new Error("生成失敗，請重試");
    }
};

export const generateDungeonDesign = async (arcName, tone, tags = [], cycleNum, extraInstruction = "", hazards = [], useDeepSeek = false) => {
    const isRuleBased = tags.includes("規則怪談");
    const hazardsText = hazards.length > 0 ? `\n環境危害：${hazards.join('、')}` : "";
    const designType = isRuleBased ? "規則怪談" : "一般無限流";
    const mechanicReq = isRuleBased ? "請設計 5-8 條紅藍字規則，包含矛盾與認知污染。" : "請設計明確的「主線任務」、「支線任務」、「限制條件」與「失敗懲罰」。";

    const prompt = `
    你是一位無限流副本設計師。
    請為第 ${cycleNum} 個副本【${arcName}】設計設定。
    類型：${designType}。基調：${tone}。
    ${hazardsText} ${extraInstruction}
    【設計要求】
    1. **世界觀**：詭異的背景故事。
    2. **核心機制**：${mechanicReq}
    3. **特殊機制**：考驗人性的機制。
    4. **高光時刻**：預設適合不同專長隊友發揮的環節。
    5. **結局**：普通/完美通關條件。
    【回傳 JSON】
    {
        "dungeon_name": "副本名稱", "difficulty": "等級", "background_story": "...",
        "core_rules": ${isRuleBased ? '["規則1..."]' : '[]'},
        "missions": ${isRuleBased ? '[]' : '["主線任務..."]'},
        "mechanics": { "gameplay_focus": "...", "environment": "...", "relationship_test": "...", "role_highlights": "..." },
        "entities": [ { "name": "...", "description": "...", "weakness": "..." } ],
        "endings": { "normal": "...", "true": "..." }
    }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是一位無限流副本架構師。", prompt, true);
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    } catch (e) {
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    }
};

const directorInfinite = (currentChapterIndex, lastPlotState, totalChapters) => {
    let progress = lastPlotState?.instance_progress || 0;
    let cycleNum = lastPlotState?.cycle_num || 1;
    let arcName = lastPlotState?.arcName || `第${cycleNum}卷`;
    let phase = lastPlotState?.phase || "setup";

    // Handle hub_intro transition
    if (phase === 'hub_intro') {
        phase = "setup";
        progress = 5;
        cycleNum = 1;
        // arcName will be updated by planner based on dungeon name
    } else if (phase === 'resolution') {
        phase = "hub_phase";
        progress = 0;
        arcName = "主世界/休整區";
    } else if (phase === 'hub_phase') {
        if (progress >= 40) {
            phase = "setup";
            progress = 5;
            cycleNum += 1;
            arcName = `第${cycleNum}個副本`;
        } else {
            phase = "hub_phase";
        }
    } else {
        if (progress <= 15) phase = "setup";
        else if (progress <= 75) phase = "investigation";
        else if (progress < 100) phase = "climax";
        else phase = "resolution";
    }

    const isFinale = (totalChapters - currentChapterIndex) <= 20;
    if (isFinale) {
        phase = 'finale';
        arcName = "終章：最終決戰";
    }

    let directive = "";
    let intensity = "medium";

    if (phase === "hub_phase") {
        intensity = "low";
        directive = `【階段：主世界日常/休整】
        - **當前位置**：主世界（如：副本學校、主神空間、現實世界）。
        - **重點**：
          1. **戰後創傷與治癒**：描寫主角回到安全區後的放鬆與後怕。
          2. **探索主世界真相**：發現主世界的秘密（如：學校的禁地、系統的漏洞）。
          3. **CP 互動**：在沒有生命危險的環境下，兩人關係的微妙變化（曖昧、同居、吵架）。
          4. **準備工作**：購買道具、強化能力，為下一次恐怖做準備。`;
    } else if (phase === "setup") {
        intensity = "high (suspense)";
        directive = `【階段：副本導入/新人試煉】
        - **情境**：突然被拉入異世界/恐怖場景。
        - **重點**：
          1. **未知與恐慌**：強調感官的陌生與恐懼。不要直接丟設定，讓主角去「看」和「聽」。
          2. **觀察環境**：快速建立副本的獨特氛圍（古堡、荒村、太空船）。
          3. **初遇隊友/NPC**：建立初步的人際關係（誰是豬隊友，誰是大腿）。`;
    } else if (phase === "investigation") {
        intensity = "medium";
        directive = `【階段：探索與解謎 (進度 ${progress}%)】
        - **重點**：尋找線索，試錯，觸發死亡Flag（由炮灰承擔）。
        - **人性考驗**：在資源匱乏或生命受威脅時，隊友之間的猜忌與背叛。`;
    } else if (phase === "climax") {
        intensity = "high";
        directive = `【階段：副本高潮】
        - **重點**：BOSS戰或最終謎題揭曉。
        - **高光時刻**：主角利用規則漏洞或道具完成反殺。
        - **生死一線**：CP 為了保護對方而受傷或爆發。`;
    } else if (phase === "resolution") {
        intensity = "low";
        directive = `【階段：副本結算】
        - **重點**：逃出生天。回歸主世界前的最後一刻。
        - **餘韻**：看著崩塌的副本或死去的隊友，產生對無限世界的無力感。`;
    } else if (phase === "finale") {
        intensity = "high";
        directive = "【終局模式】全書高潮。揭開無限世界的終極真相。";
    }

    return { phase, intensity, directive, arcName, cycleNum, instanceProgress: progress };
};

// ==========================================
// 5. 無限流 Planner Agent (分流邏輯)
// ==========================================
export const planInfinite = async ({
    director,
    blueprint,
    contextSummary,
    memories = [],
    clues = [],
    characters = [],
    tags = [],
    tone = "一般",
    lastPlotState = null,
    useDeepSeek = false,
    novelId = null
}) => {
    const isRuleBased = tags.includes("規則怪談");
    // 1. 狀態初始化
    let currentDungeon = lastPlotState?.current_dungeon || null;
    let currentRules = lastPlotState?.current_rules || null;
    let cycleNum = lastPlotState?.cycle_num ?? 1;
    let instanceProgress = lastPlotState?.instance_progress || 0;
    let usedThemes = lastPlotState?.used_themes || [];
    let phase = lastPlotState?.phase || "setup"; // default

    // 2. 階段流轉邏輯 (修正版)
    // 處理從「序章/休整」進入「新副本」的邏輯

    // 如果上一章是 hub_intro (序章)，下一章強制進入第一個副本 (Setup)
    if (phase === 'hub_intro') {
        phase = 'setup';
        instanceProgress = 0;
        cycleNum = 1; // 正式開始第1卷

        // FIX: Retrieve preloaded dungeon (from settings)
        if (lastPlotState?.preloaded_dungeon) {
            currentDungeon = lastPlotState.preloaded_dungeon;
            // Update arcName to match the preloaded dungeon
            director.arcName = currentDungeon.dungeon_name;
        } else {
            currentDungeon = null; // Will trigger generation
        }
    }
    // 如果上一章是 rest (休整)，下一章進入新副本
    else if (director.phase === 'setup' && (!currentDungeon || instanceProgress >= 100)) {
        instanceProgress = 0;
        currentDungeon = null;
        cycleNum += 1;
        phase = 'setup';
    }
    else if (director.phase === 'rest') {
        phase = 'rest';
        instanceProgress = 0;
        currentDungeon = null;
    }
    // 副本內推進
    else {
        const resolvedCluesCount = clues.filter(c => c.includes("已解決") || c.includes("解開")).length;
        const organicProgress = (Math.min(resolvedCluesCount / 5, 1) * 50);
        let newProgress = Math.max(instanceProgress + 5, organicProgress);
        instanceProgress = instanceProgress > 0 ? Math.max(instanceProgress, newProgress) : newProgress;
        if (instanceProgress > 100) instanceProgress = 100;

        // 階段判定
        if (instanceProgress < 15) phase = "setup";
        else if (instanceProgress < 75) phase = "investigation";
        else if (instanceProgress < 95) phase = "climax";
        else phase = "resolution";
    }

    // 4. 副本生成 (Lazy Generation)
    const isNewDungeon = phase === 'setup' && !currentDungeon;

    // FIX: Initialize preloaded dungeon (if it exists but has no rules set up yet)
    if (phase === 'setup' && currentDungeon && !currentRules) {
        const rulesList = isRuleBased ? (currentDungeon.core_rules || []) : (currentDungeon.missions || ["任務：存活"]);
        currentRules = { title: isRuleBased ? "規則守則" : "任務面板", rules: rulesList, hidden_truth: "待探索" };

        if (novelId) {
            try {
                await supabase.from('dungeons').insert({
                    novel_id: novelId, name: currentDungeon.dungeon_name, cycle_num: cycleNum, difficulty: currentDungeon.difficulty,
                    background_story: currentDungeon.background_story, mechanics: currentDungeon.mechanics, core_rules: rulesList,
                    rule_logic: currentRules, entities: currentDungeon.entities, endings: currentDungeon.endings, status: 'active'
                });
            } catch (err) { console.error("DB Save Error:", err); }
        }
    }

    if (isNewDungeon) {
        const randomTheme = selectDungeonTheme(tags, cycleNum, usedThemes);
        const dungeonName = `${director.arcName} - ${randomTheme}`;
        currentDungeon = await generateDungeonDesign(dungeonName, tone, tags, cycleNum, "", [], useDeepSeek);
        const rulesList = isRuleBased ? (currentDungeon.core_rules || []) : (currentDungeon.missions || ["任務：存活"]);
        currentRules = { title: isRuleBased ? "規則守則" : "任務面板", rules: rulesList, hidden_truth: "待探索" };
        usedThemes.push(randomTheme);
        instanceProgress = 5;

        if (novelId) {
            try {
                await supabase.from('dungeons').insert({
                    novel_id: novelId, name: currentDungeon.dungeon_name, cycle_num: cycleNum, difficulty: currentDungeon.difficulty,
                    background_story: currentDungeon.background_story, mechanics: currentDungeon.mechanics, core_rules: rulesList,
                    rule_logic: currentRules, entities: currentDungeon.entities, endings: currentDungeon.endings, status: 'active'
                });
            } catch (err) { console.error("DB Save Error:", err); }
        }
    }

    const gameplayOps = (() => {
        if (director.phase === "setup") return isRuleBased ? "展示【規則守則】，但重點是主角們對規則的吐槽/不屑/恐慌反應。" : "發布【主線任務】，重點描寫主角團的磨合與分歧。";
        if (director.phase === "investigation") return "觸發【羈絆考驗】或【人性抉擇】。在探索中揭露隊友的過去或 CP 的默契。";
        if (director.phase === "climax") return "全員高光時刻。利用團隊配合或 CP 的犧牲/爆發來破局，而不是單純靠數值碾壓。";
        if (director.phase === "rest" || director.phase === "hub_phase" || director.phase === "hub_intro") return "主神空間的溫馨/曖昧日常，修復創傷。";
        return "推進劇情，強調人與人的互動。";
    })();

    const dungeonContext = currentDungeon ? `【🏯 當前副本：${currentDungeon.dungeon_name}】\n難度：${currentDungeon.difficulty}\n背景：${currentDungeon.background_story}\n核心玩法：${currentDungeon.mechanics?.gameplay_focus}\n通關條件：${currentDungeon.endings?.normal}` : "【當前場景】主神空間/現實世界";
    const rulesContext = currentRules ? `【📜 ${currentRules.title}】\n${currentRules.rules.join('\n')}` : "";

    const prompt = `
    你是一位無限流小說策劃。請根據以下資訊規劃下一章大綱。
    ${INFINITE_ANTI_CLICHE}
    【當前狀態】
    - 階段：${director.phase.toUpperCase()} (進度: ${Math.floor(instanceProgress)}%)
    - 導演指令：${director.directive}
    - **玩法策略**：${gameplayOps}
    ${dungeonContext}
    ${rulesContext}
    【隊友狀態】${characters.map(c => `- ${c.name}: ${c.status || '正常'}`).join('\n') || "暫無詳細隊友資訊"}
    【設計圖】${typeof blueprint === 'string' ? blueprint : JSON.stringify(blueprint)}
    【前情提要】${contextSummary}
    【線索】${clues.length > 0 ? clues.join('\n') : "無"}
    【任務】
    1. 根據副本進度，推進劇情。
    2. **機制演繹**：${isRuleBased ? '讓主角分析規則邏輯。' : '讓主角執行任務目標。'}
    3. **人物互動 (關鍵)**：本章必須包含至少一位隊友的關鍵互動，不要讓他們變成背景板。
    4. 衝突設計與感情規劃。
    回傳 JSON: { "chapter_title": "...", "outline": "...", "key_clue_action": "...", "romance_moment": "...", "suggested_progress_increment": 5, "should_finish_instance": false }
    `;

    let plan;
    try {
        if (useDeepSeek) plan = await callDeepSeek("你是一位無限流策劃。", prompt, true);
        else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            plan = cleanJson(res.response.text());
        }
    } catch (e) { plan = { chapter_title: "新的一章", outline: "推進劇情...", suggested_progress_increment: 5 }; }

    return {
        ...plan,
        plot_state_update: {
            phase,
            instance_progress: instanceProgress,
            current_dungeon: currentDungeon,
            current_rules: currentRules,
            cycle_num: cycleNum,
            used_themes: usedThemes
        }
    };
};

const writeInfiniteChapter = async ({ novelContext, plan, prevText, tone, pov, useDeepSeek, director, currentDungeon }) => {
    const { title, genre } = novelContext;
    const { chapter_title, outline, key_clue_action, romance_moment } = plan;

    const charismaInstruction = `
    【人物高光 (Charisma)】
    請用力刻畫主角的魅力。
    - **強大**：不是靠數值，而是靠臨危不亂的氣場。
    - **破碎**：受傷時的隱忍、眼神中的疲憊，讓人心疼（親媽粉視角）。
    - **性張力**：與 CP 的互動要「欲」，眼神拉絲，肢體接觸要寫出電流感。
    `;

    const writerPrompt = `
    ${INFINITE_ANTI_CLICHE}
    【資訊】${title} | ${director.phase}
    【風格】${tone} | ${pov}
    
    【本章劇本 (Planner's Outline)】
    ${outline}
    
    【導演指令】
    ${director.directive}
    ${charismaInstruction}
    
    【場景氛圍】
    副本：${currentDungeon?.dungeon_name || "未知領域"}
    (請自行腦補環境細節，重點是營造恐怖/壓抑/詭異的氛圍)

    【寫作重點】
    1. **字數**：2000+。
    2. **Show, Don't Tell**：不要告訴讀者「很危險」，要寫出怪物貼在耳邊的呼吸聲。
    3. **感情線**：請務必執行大綱中的感情互動，這是讀者最想看的部分。
    4. **結尾**：必須留有懸念 (Cliffhanger)。
    
    回傳 JSON: { "content": "...", "character_updates": [], "new_memories": [] }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是一位無限流小說家。", writerPrompt, true);
        const model = getGeminiModel(true);
        const res = await model.generateContent(writerPrompt);
        return cleanJson(res.response.text());
    } catch (e) {
        console.error("Infinite Writer Error:", e);
        throw e;
    }
};

export const generateInfiniteNextChapter = async (novelContext, previousContent, characters = [], memories = [], clues = [], tags = [], tone = "一般", pov = "女主", lastPlotState = null, useDeepSeek = false) => {
    const totalChapters = novelContext.targetEndingChapter || 200;
    const director = directorInfinite(novelContext.currentChapterIndex, lastPlotState, totalChapters);

    const blueprintStr = JSON.stringify(novelContext.design_blueprint || {});
    const prevText = previousContent.slice(-2000);

    const infinitePlan = await planInfinite({
        novelId: novelContext.id,
        director,
        blueprint: blueprintStr,
        contextSummary: prevText,
        memories,
        clues,
        characters,
        tags,
        tone,
        lastPlotState,
        useDeepSeek
    });

    const writerResult = await writeInfiniteChapter({
        novelContext,
        plan: infinitePlan,
        prevText,
        tone,
        pov,
        useDeepSeek,
        director,
        currentDungeon: infinitePlan.plot_state_update.current_dungeon
    });

    if (writerResult.content && writerResult.content.length > 500) {
        writerResult.content = await polishContent(writerResult.content, tone, pov);
    }

    return {
        ...writerResult,
        plot_state: infinitePlan.plot_state_update,
        chapter_plan: infinitePlan
    };
};

const polishContent = async (draft, tone, pov) => {
    const model = getGeminiModel(false);
    const editorPrompt = `你是一位資深的網文主編。請對以下初稿進行【深度潤色】。

${ANTI_CLICHE_INSTRUCTIONS}

【潤色目標】
1. **去除AI味**：消除機械重複的句式，增加口語化與生動感。
2. **去除冗餘**：刪除無意義的過渡句與重複的劇情回顧。
3. **增強畫面感**：多用感官描寫（視覺、聽覺、觸覺）。
4. **符合基調**：${tone}。
5. **嚴格輸出格式**：**只輸出潤色後的小說正文**。絕對不要輸出「【深度潤色版】」、「以下是潤色後的內容」等任何前言後語。不要輸出標題。

[初稿]
${draft}`;

    try {
        const result = await model.generateContent(editorPrompt);
        let polished = result.response.text();

        polished = polished.replace(/^【.*?】\s*/g, '')
            .replace(/^\[.*?\]\s*/g, '')
            .replace(/^以下是.*?\n/g, '')
            .replace(/^Here is.*?\n/g, '')
            .trim();

        return polished;
    } catch (e) { return draft; }
};