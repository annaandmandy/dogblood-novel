import {
    callDeepSeek,
    getGeminiModel,
    cleanJson,
    ANTI_CLICHE_INSTRUCTIONS,
    getToneInstruction,
    getPovInstruction,
} from "../../lib/llm.js";
import { editorInfinite } from "../editor.js";

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

// ==========================================
// 🌌 Infinite Flow Archetypes (無限流類型矩陣)
// ==========================================
const INFINITE_ARCHETYPES = {
    // 1. 學校/考試型 (Global Exam Style)
    school: {
        trigger: ["校園", "考試", "學霸", "輕鬆"],
        description: "以「荒誕學校」為主世界。玩家是學生，副本是考試，死亡是退學。風格通常帶有黑色幽默或規則怪談感。"
    },
    // 2. 直播/娛樂圈型 (Streamer/Showbiz)
    stream: {
        trigger: ["直播", "網紅", "娛樂圈", "彈幕", "爽文"],
        description: "以「死亡直播間」或「驚悚綜藝」為主世界。玩家是主播/演員，積分是打賞/收視率。重點在於觀眾互動與人設扮演。"
    },
    // 3. 載具/旅行型 (Transport/Journey)
    transport: {
        trigger: ["列車", "公車", "郵輪", "旅行", "公路文"],
        description: "以「幽靈載具」為主世界（如444號列車）。玩家是乘客，副本是站點。重點在於封閉空間的相處與旅途感。"
    },
    // 4. 遊戲/數據型 (VR/Game/Cyber)
    game: {
        trigger: ["網遊", "電競", "系統", "數據", "賽博", "升級"],
        description: "以「虛擬主城」或「登錄空間」為主世界。玩家是數據化角色，有明確的面板、公會和排行榜。風格偏向RPG或數據流。"
    },
    // 5. 樓宇/封閉社區型 (Apartment/Tower)
    building: {
        trigger: ["公寓", "鄰居", "高塔", "層級", "求生"],
        description: "以「神秘公寓」或「巴別塔」為主世界。玩家是住戶，副本是樓層或鄰居房間。重點在於鄰里關係與領地建設。"
    },
    // 6. 手機/APP型 (App/Modern)
    app: {
        trigger: ["手機", "APP", "都市", "靈異", "日常"],
        description: "以「現實世界」為主世界，通過手機APP發布任務。副本融入現實生活（如午夜的辦公室）。重點是現實與恐怖的邊界模糊。"
    },
    // 7. 經典主神型 (Classic God Space)
    classic: {
        trigger: ["主神", "無限", "末世", "傳統"],
        description: "經典的「白色空間」或「大光球」。強調殘酷的抹殺規則、強化兌換與團隊求生。"
    },
    building: {
        trigger: ["公寓", "鄰居", "高塔", "求生", "籠屋", "房客", "租金", "樓"], // 👈 增加「籠屋」、「房客」
        description: "以「神秘公寓」或「巴別籠屋」為主世界。玩家是住戶，副本是鄰居的房間。重點在於：狹窄空間的壓抑感、鄰里關係的猜忌、以及必須繳納的『租金』。"
    }
};

// 根據 Tags 智能選擇類型
const detectArchetype = (tags = []) => {
    for (const [key, type] of Object.entries(INFINITE_ARCHETYPES)) {
        if (type.trigger.some(t => tags.includes(t))) {
            return type; // 命中匹配的類型
        }
    }
    // 默認隨機選擇一個非學校的類型（增加多樣性），或者回傳 null 讓 AI 自由發揮
    const types = Object.values(INFINITE_ARCHETYPES);
    return types[Math.floor(Math.random() * types.length)];
};

const INFINITE_STYLE_GUIDE = `
【無限流・寫作風格指南】
1. **感官沉浸**：不要告訴讀者「很恐怖」，要描寫腐爛的氣味、粘膩的觸感、耳邊的低語。
2. **冷幽默 (Cold Humor)**：主角面對恐怖時要保持一種「厭世的冷靜」或「瘋批的優雅」。
3. **Show, Don't Tell**：不要寫「他很聰明」，寫他如何在必死的規則裡找到漏洞並加以利用。
4. **主世界即戰場**：主世界（學校/公寓/直播間）不是安全區，而是另一個充滿壓抑規則的社會。
5. **CP 張力**：拒絕工業糖精。要寫生死關頭的「共犯」感，眼神拉絲，肢體接觸要寫出電流感。
`;

// 動態顯化指令生成器 (統一第一章與後續章節的風格)
const getDynamicSettingPrompt = (settings) => {
    const combinedText = ((settings.summary || "") + JSON.stringify(settings.main_world_setting || "")).toLowerCase();

    if (combinedText.includes("直播") || combinedText.includes("綜藝")) {
        return `【寫作強制：直播流】
        1. **鏡頭感**：時刻描寫主角對攝像頭的意識（表演、躲避）。
        2. **彈幕**：在劇情關鍵點（反轉/受傷）插入視網膜上的彈幕反應。
        3. **心態**：這是一場娛樂至死的表演。`;
    }
    if (combinedText.includes("公寓") || combinedText.includes("籠屋")) {
        return `【寫作強制：公寓流】
        1. **空間感**：強調狹窄、潮濕、隔音差的壓抑環境。
        2. **鄰里**：描寫對鄰居的恐懼與窺視感。
        3. **規則**：強調《入住須知》或《租約》的束縛。`;
    }
    if (combinedText.includes("學校") || combinedText.includes("考試")) {
        return `【寫作強制：校園流】
        1. **體制化**：強調廣播、鐘聲、校規的機械感。
        2. **競爭**：描寫同學之間的敵意與分數壓力。`;
    }
    return "";
};

const selectDungeonTheme = (tags = [], cycleNum = 1, usedThemes = []) => {
    let availablePools = [];

    // 優先根據 Tag 鎖定類型 (Strict Mode)
    const isChinese = tags.includes("中式恐怖") || tags.includes("古風") || tags.includes("盜墓");
    const isWestern = tags.includes("克蘇魯") || tags.includes("西幻") || tags.includes("吸血鬼");
    const isSciFi = tags.includes("星際") || tags.includes("賽博龐克") || tags.includes("科幻");

    if (isChinese) availablePools.push(...THEME_POOL.chinese);
    if (isWestern) availablePools.push(...THEME_POOL.western, ...THEME_POOL.cosmic);
    if (isSciFi) availablePools.push(...THEME_POOL.scifi);

    // 只有在沒有明確風格 Tag 時，才混合 Generic pool
    if (!isChinese && !isWestern && !isSciFi) {
        availablePools.push(...THEME_POOL.modern, ...THEME_POOL.survival, ...THEME_POOL.hybrid, ...THEME_POOL.popculture);
        // 後期才會出現高维恐怖，且必須符合邏輯
        if (cycleNum > 6) availablePools.push(...THEME_POOL.cosmic, ...THEME_POOL.psychological);
    } else {
        // 如果有明確風格，只混入少量的通用恐怖 (Modern/Survival)，保持風格統一
        availablePools.push(...THEME_POOL.modern, ...THEME_POOL.survival);
    }

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
6. **規則破壞者**：讓主角鑽規則漏洞，用邏輯氣死監考官/系統，而不是單純靠武力。
7. **主世界反差**：回到主世界後，反差感要強烈，才能突顯副本嗎得恐怖刺激。
8. 讀者是來嗑cp的，請著重在cp的互動和情感描写。
`;

// 新增：主角認知限制指令 (防止主角一開始就知道所有設定)
const IGNORANCE_INSTRUCTION = `
【⚠️ 認知限制 (Fog of War)】
- **主角是新人**：除非設定中主角是重生者，否則**嚴禁**主角一開始就知道「主神」、「副本」、「積分」等專有名詞。
- **循序漸進**：主角應該對眼前的一切感到困惑、恐懼、懷疑。
- **描述方式**：不要寫「系統面板出現」，要寫「視網膜上突兀地浮現出一行血紅的字跡」。不要寫「進入了副本」，要寫「推開門，原本熟悉的走廊變成了一片荒蕪的墳場」。
`;

// ==========================================
// 1. 設定生成 (generateInfiniteSettings)
// ==========================================
export const generateInfiniteSettings = async (tags = [], tone = "一般", targetChapterCount = null, category = "BG", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);
    const totalChapters = targetChapterCount || 200;

    let genderConstraint = "";
    if (category === "BG") genderConstraint = "主角必須是一男一女 (BG)。";
    else if (category === "BL") genderConstraint = "主角必須是兩位男性 (BL)。";
    else if (category === "GL") genderConstraint = "主角必須是兩位女性 (GL)。";

    const prompt = `
    你是一位頂級無限流小說架構師。請設計一套獨特、有趣且設定嚴密的小說設定。
    **類別**：${category}。**篇幅**：${totalChapters} 章。
    **標籤**：${tags.join('、')}。**基調**：${toneDesc}
    ${genderConstraint}
    ${INFINITE_ANTI_CLICHE}
    
    【核心任務】
    1. **主世界 (Hub) 本身就是有自己的故事線與設定**：主世界不只是休息區，主世界有自己獨特的設定，如：現代/異次元/低魔/高魔。若主世界為現實也可以，
    2. **貨幣與懲罰**：不要只用「積分」。如直播流用「打賞/壽命」、校園流用「學分」。懲罰不僅是抹殺。
    3. **CP 關係**：強張力 CP（宿敵/共犯/救贖）。
    
    【回傳 JSON】
    {
      "title": "小說標題",
      "summary": "吸睛文案 (含主世界背景、進入原因、金手指)",
      "trope": "核心梗",
      "main_world_setting": {
          "name": "主世界名稱 (如：荒蕪學府 / 第13中學)",
          "type": "類型 (校園/公寓/列車/直播等)",
          "entry_method": "進入方式",
          "currency": "貨幣",
          "rules": ["校規1...", "校規2..."],
          "hierarchy": "階級制度 (如：S班擁有生殺大權)",
          "punishment": "懲罰",
          "atmosphere": "氛圍 (如：表面正常但天空有巨眼)",
          "key_locations": ["地點1", "地點2", "地點3"],
          "conflict_sources": [
              "衝突源1 (如：樓長每週收『肢體稅』)",
              "衝突源2 (如：隔壁住著變態殺人魔)",
              "衝突源3 (如：主角被執法隊監視)"
          ]
      },
      "design_blueprint": {
          "main_goal": "終極目標",
          "world_truth": "隱藏真相",
          "ending_vision": "結局",
          "side_characters": [ { "name": "...", "role": "...", "profile": "...", "speaking_style": "..." } ]
      },
      "protagonist": { "name": "...", "role": "主角", "gender": "...", "profile": { "appearance": "...", "personality": "...", "special_ability": "...", "background": "...", "speaking_style": "..." } },
      "loveInterest": { "name": "...", "role": "...", "gender": "...", "profile": { "appearance": "...", "personality": "...", "identity_in_world": "...", "speaking_style": "..." } },
      "relationships": [
          { "source": "Protagonist", "target": "LoveInterest", "type": "Stranger/Ex/Rival", "status": "Not Met", "description": "..." }
      ]
    }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是一位無限流架構師。", prompt, true);
        const model = getGeminiModel(true);
        const res = await model.generateContent(prompt);
        return cleanJson(res.response.text());
    } catch (e) {
        return null;
    }
};

export const ensureInfiniteSettings = async (simpleSettings, tags = [], tone = "一般", category = "BG", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);

    // 如果已經有詳細世界觀，則跳過
    if (simpleSettings.design_blueprint && simpleSettings.protagonist?.profile) {
        return simpleSettings;
    }

    const prompt = `
    你是一位無限流小說架構師。
    請根據現有的簡單設定，補全【世界觀藍圖】與【角色詳情】。
    (注意：暫時不需要設計副本，請專注於主世界與人物)
    
    標題：${simpleSettings.title}
    風格：${tags.join('、')}
    ${INFINITE_ANTI_CLICHE}

    【補全任務】
    1. **世界觀藍圖 (Design Blueprint)**：請設計主角的「終極目標」、無限世界的「隱藏真相」以及「預設結局」。
    2. **角色深度設定**：請完善主角 (${simpleSettings.protagonist?.name || simpleSettings.protagonist}) 與對象 (${simpleSettings.loveInterest?.name || simpleSettings.loveInterest}) 的詳細人設（外貌、性格、說話風格）。
    3. **配角設計**：補充 2 位關鍵隊友。

    回傳 JSON (只回傳需要補全/更新的欄位):
    {
        "design_blueprint": { 
            "main_goal": "...", 
            "world_truth": "...", 
            "ending_vision": "...",
            "side_characters": [ { "name": "...", "role": "...", "profile": "..." } ]
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
        },
        "relationships": [
            { "source": "${simpleSettings.protagonist?.name || '主角'}", "target": "${simpleSettings.loveInterest?.name || '對象'}", "type": "宿敵/前任/陌生人", "status": "Not Met", "description": "初始關係描述" }
        ]
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
// ==========================================
// 2. 第一章生成 (The Pilot Director)
// ==========================================
export const generateInfiniteStart = async (settings, tags = [], tone = "一般", pov = "女主", useDeepSeek = false) => {
    const toneDesc = getToneInstruction(tone);
    const povDesc = getPovInstruction(pov);
    const styleGuide = `風格：${tags.join('、')} | ${toneDesc} | ${povDesc}`;

    const dynamicPrompt = getDynamicSettingPrompt(settings);

    const prompt = `
    你是一位專業無限流小說作者，負責撰寫「第一章」。
    ${styleGuide}
    ${INFINITE_STYLE_GUIDE}
    ${dynamicPrompt}

    【小說設定】
    - 標題：${settings.title}
    - 簡介：${settings.summary}
    - 主世界：${JSON.stringify(settings.main_world_setting)}
    - 主角：${JSON.stringify(settings.protagonist)}
    - 對象：${JSON.stringify(settings.loveInterest)}

    【第一章的任務】
    第一章（Pilot Chapter）不是正式劇情，它的作用是：
    1. 從現實世界進入主世界（Hub）。
    2. 展示主角的性格、語氣、觀察方式。
    3. 描寫主世界給主角的第一印象（壓迫感、規則感、荒誕感）。
    4. 建立 CP / 核心角色的第一次「視覺印象」（但不強求互動）。
    5. 為第二章留下一個明確的事件入口（不跳副本）。

    【嚴禁】
    - 禁止進入副本（Dungeon）。
    - 禁止 info dump（如整段說明規則、金手指、世界觀）。
    - 禁止主角一開始就理解體系（主角一定是困惑的）。
    - 禁止寫系統面板、任務欄、能力數值。
    - 禁止大量配角登場。
    - 禁止寫完整衝突，只能鋪陳壓力。

    【敘事結構】
    第一章必須遵循以下 4 步驟：

    (1) 現實世界中的引爆點
    例：目擊事件、收到訊息、某個日常異常化。

    (2) 現實逐步扭曲
    例：光線異變、走廊變長、手機彈出血色字、人的臉模糊。

    (3) 主世界的第一次亮相（Hub）
    請描寫：場景、氣味、空氣、規則感、階層感。
    不要一次講完，全部要「Show, not tell」。

    (4) 收束在一個明確的懸念點（Hook）
    例：
    - 一個「不該說話」的物件對主角說：歡迎。
    - 身後傳來腳步聲。
    - 牆壁上的字開始變動。
    - 廣播叫出主角的名字。

    【語氣要求】
    - 用主角視角（POV）
    - 用沉浸式描寫
    - 不要寫成摘要
    - 要有壓迫感與陌生感

    【輸出格式】
    {
    "content": "正文 1800~2600 字，沒有任何前言、說明或 JSON 外文字。",
    "plot_state": {
        "phase": "hub_intro",
        "cycle_num": 0,
        "hub_tension": 10,
        "current_dungeon": null
    },
    "cliffhanger_note": "下一章由主世界事件推動，而非副本。必須給下一章一個明確入口。"
    }
    `;

    try {
        let result;
        if (useDeepSeek) result = await callDeepSeek("你是無限流小說家。", prompt, true);
        else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(prompt);
            result = cleanJson(res.response.text());
        }

        // 確保第一章生成的副本設定（如果有的話）被保存
        if (settings.first_dungeon_setting) {
            result.plot_state.preloaded_dungeon = settings.first_dungeon_setting;
        }
        return result;
    } catch (e) { throw new Error("生成失敗"); }
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

// ==========================================
// 🎬 Infinite Flow Director (無限流導演 - 事件驅動版)
// ==========================================
// ==========================================
// 🎬 Infinite Flow Director (無限流導演 - 精簡版)
// ==========================================
export const directorInfinite = (currentChapterIndex, lastPlotState, totalChapters) => {
    let phase = lastPlotState?.phase || "hub";
    let subPhase = lastPlotState?.sub_phase || "intro";
    let cycleNum = lastPlotState?.cycle_num || 0;

    const isFinale = (totalChapters - currentChapterIndex <= 5);

    if (isFinale) {
        return {
            phase: "finale",
            sub_phase: "reveal",
            chapter_function: [
                "揭露無限世界的最終真相",
                "主角迎來最終對決"
            ],
            intensity: "high",
            notes: "此階段不可鋪新線索，只能收束。",
            cycleNum: cycleNum // Keep cycleNum consistent
        };
    }

    // HUB（主世界）逻辑
    if (phase === "hub") {
        if (subPhase === "intro") {
            return {
                phase: "hub",
                sub_phase: "settling",
                chapter_function: [
                    "展示主世界的基本規則",
                    "讓主角第一次感受到壓力或威脅"
                ],
                intensity: "medium",
                notes: "禁止進入副本，禁止推進世界真相。",
                cycleNum: cycleNum
            };
        }

        if (subPhase === "settling") {
            return {
                phase: "hub",
                sub_phase: "conflict",
                chapter_function: [
                    "主世界人物與主角發生摩擦或衝突",
                    "展示主角智慧或規則理解能力"
                ],
                intensity: "medium",
                notes: "不可推出真正敵人，只能小反派。",
                cycleNum: cycleNum
            };
        }

        if (subPhase === "conflict") {
            return {
                phase: "hub",
                sub_phase: "pre_dungeon",
                chapter_function: [
                    "主世界矛盾升高至進副本前的極限",
                    "鋪陳下一個副本的入場原因"
                ],
                intensity: "high",
                notes: "下一章用於進入副本。",
                cycleNum: cycleNum
            };
        }

        if (subPhase === "pre_dungeon") {
            return {
                phase: "dungeon",
                sub_phase: "setup",
                chapter_function: [
                    "主角被迫（或自願）進入新副本",
                    "第一次見到陌生環境與危險"
                ],
                intensity: "high",
                notes: "首要任務：沉浸式環境描寫。",
                cycleNum: cycleNum + 1 // Start new cycle
            };
        }
    }

    // 副本阶段逻辑
    if (phase === "dungeon") {
        const stageMap = {
            setup: [
                "展示副本規則或危險",
                "讓某個炮灰或NPC觸發危險"
            ],
            investigation: [
                "讓隊伍探索線索",
                "推進至少一條真相相關線索"
            ],
            twist: [
                "揭露重大誤解或陷阱",
                "讓主角陷入劣勢"
            ],
            climax: [
                "主角使用智慧或規則漏洞破局",
                "推向勝負一線"
            ],
            resolution: [
                "完成副本任務",
                "主角離開副本回到主世界"
            ],
        };

        // Define subPhase progression locally for simplicity in this lite version
        // or rely on caller to update subPhase?
        // The user's prompt assumes directorInfinite returns the *current* directive based on state.
        // But state update usually happens *after* execution.
        // However, `subPhase` needs to advance.
        // Let's implement a simple state machine transition if lastPlotState provided the *current* state.
        // Wait, the user's code for HUB returns the *next* phase directly. 
        // "if subPhase === 'intro' return 'settling'". This means it returns the *next* step.
        // So I should do the same for Dungeon.

        let nextSubPhase = subPhase;
        let nextPhase = phase;

        if (subPhase === "setup") nextSubPhase = "investigation";
        else if (subPhase === "investigation") nextSubPhase = "twist";
        else if (subPhase === "twist") nextSubPhase = "climax";
        else if (subPhase === "climax") nextSubPhase = "resolution";
        else if (subPhase === "resolution") {
            nextPhase = "hub";
            nextSubPhase = "return";
        }

        // Handle Return specifically
        if (nextPhase === "hub" && nextSubPhase === "return") {
            return {
                phase: "hub",
                sub_phase: "return", // User didn't define 'return' in HUB block, but we need a bridge.
                // Or maybe default to 'intro' or 'settling' of NEXT cycle?
                // Let's map it to 'settling' or 'intro' but with a note?
                // The user logic for hub starts at 'intro' -> 'settling'.
                // If we come back from dungeon, we likely go to 'intro' (re-entering safe zone) or 'settling'.
                // Let's use 'return' as a transient state or map to 'settling'.
                sub_phase: "settling",
                chapter_function: [
                    "主角帶著戰利品回到主世界",
                    "清點收穫與休息"
                ],
                intensity: "low",
                notes: "過渡章節",
                cycleNum: cycleNum
            };
        }

        return {
            phase: "dungeon",
            sub_phase: nextSubPhase,
            chapter_function: stageMap[nextSubPhase] || ["推進劇情"],
            intensity: nextSubPhase === "climax" ? "high" : "medium",
            notes: "不得超出該階段劇情功能。",
            cycleNum: cycleNum
        };
    }

    // Default Fallback
    return {
        phase: "hub",
        sub_phase: "intro",
        chapter_function: ["引入主世界規則"],
        intensity: "medium",
        notes: "初始狀態",
        cycleNum: 0
    };
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
    novelId = null,
    novelContext = {}
}) => {
    const isRuleBased = tags.includes("規則怪談");

    // 1. 狀態初始化
    let phase = director.phase;
    let subPhase = director.sub_phase;
    let cycleNum = director.cycleNum;
    let instanceProgress = director.instanceProgress;

    let currentDungeon = lastPlotState?.current_dungeon || null;
    let currentRules = lastPlotState?.current_rules || null;
    let usedThemes = lastPlotState?.used_themes || [];

    // 獲取第一章的懸念筆記
    const cliffhangerNote = lastPlotState?.cliffhanger_note || "無";
    // 動態設定提示
    const dynamicPrompt = getDynamicSettingPrompt(novelContext);

    // 2. 特殊狀態處理
    let metaPlanningInstruction = "";
    const summary = novelContext.summary || "";
    const mainWorld = novelContext.settings?.main_world_setting || {};
    const relationships = novelContext.relationships || []; // 獲取關係圖
    const combinedText = (summary + (mainWorld.type || "")).toLowerCase();

    if (combinedText.includes("直播") || combinedText.includes("綜藝")) {
        metaPlanningInstruction = `
        【⚠️ 特殊策劃要求：綜藝直播流】
        這是一場直播綜藝。大綱中必須包含：
        1. **互動環節**：設計觀眾/彈幕的反應節點（如：主角遇到危險時，彈幕在賭她死）。
        2. **節目效果**：主角是否為了人氣/打賞而故意做出驚險動作？
        3. **場外干預**：是否有土豪觀眾打賞了關鍵道具？
        `;
    }

    // (A) 清空副本數據
    if (phase === 'hub_return' || phase.startsWith('hub')) {
        currentDungeon = null;
        currentRules = null;
    }

    // (B) 預設副本
    if (phase === 'setup' && cycleNum === 1 && lastPlotState?.preloaded_dungeon && !currentDungeon) {
        currentDungeon = lastPlotState.preloaded_dungeon;
        director.arcName = currentDungeon.dungeon_name;
    }

    // (C) 有機進度調整
    if (!phase.startsWith('hub') && phase !== 'setup' && phase !== 'resolution') {
        const resolvedCluesCount = clues.filter(c => c.includes("已解決") || c.includes("解開")).length;
        const organicProgress = (Math.min(resolvedCluesCount / 5, 1) * 50);
        let newProgress = Math.max(instanceProgress, organicProgress);
        if (newProgress > 100) newProgress = 100;
        instanceProgress = newProgress;

        if (instanceProgress < 15) phase = "setup";
        else if (instanceProgress < 55) phase = "investigation";
        else if (instanceProgress < 80) phase = "twist";
        else if (instanceProgress < 95) phase = "climax";
        else phase = "resolution";
    }

    // 4. 副本生成
    const isNewDungeon = phase === 'dungeon' && subPhase === 'setup' && !currentDungeon;

    if (phase === 'dungeon' && currentDungeon && !currentRules) {
        const rulesList = isRuleBased ? (currentDungeon.core_rules || []) : (currentDungeon.missions || ["任務：存活"]);
        currentRules = { title: isRuleBased ? "規則守則" : "任務面板", rules: rulesList, hidden_truth: "待探索" };
        if (novelId) {
            // Updated DB persistence if needed
        }
    }

    if (isNewDungeon) {
        const randomTheme = selectDungeonTheme(tags, cycleNum, usedThemes);
        const dungeonName = `副本 ${cycleNum}: ${randomTheme}`;
        currentDungeon = await generateDungeonDesign(dungeonName, tone, tags, cycleNum, "", [], useDeepSeek);
        const rulesList = isRuleBased ? (currentDungeon.core_rules || []) : (currentDungeon.missions || ["任務：存活"]);
        currentRules = { title: isRuleBased ? "規則守則" : "任務面板", rules: rulesList, hidden_truth: "待探索" };
        usedThemes.push(randomTheme);

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

    const PLANNER_PROMPT = `
    你是小說的「故事規劃者 Planner Agent」。

    你的任務：將 Director 的敘事功能轉換成「三步事件」。

    【你只能做三件事】
    1️⃣ chapter_goal：一句話概括本章目的（不可模糊）。
    2️⃣ story_beats：三個依序發生的事件節點。
    3️⃣ hook：章尾懸念。

    【嚴禁】
    - 不得重複上一章內容
    - 不得提前寫下一章
    - 不得寫出具體對白（Writer 負責）
    - 不得新增道具/規則/魔法
    - 不得改變既有設定
    - 不得劇透未來副本

    【背景設定】
    - 主世界設定：${JSON.stringify(novelContext.main_world_setting)}
    - 副本設定：${isNewDungeon || currentDungeon ? JSON.stringify(currentDungeon) : "目前不在副本"}
    - 規則：${currentRules ? JSON.stringify(currentRules) : "無"}

    【上一章摘要】
    ${contextSummary}

    【關鍵記憶 (Memories)】
    ${memories.length > 0 ? memories.map(m => `- ${m}`).join('\n') : "暫無"}

    【Director 的敘事功能】
    ${JSON.stringify(director.chapter_function)}
    
    【當前進度】
    階段：${phase} - ${subPhase}

    【請輸出 JSON】
    {
      "chapter_title": "標題",
      "chapter_goal": "...",
      "story_beats": [
        "事件1 必須直接承接上一章最後動作",
        "事件2 必須推進 chapter_goal",
        "事件3 必須完成 Director 要求的敘事功能"
      ],
      "hook": "留下一個懸念，禁止解決衝突"
    }
    `;

    let plan;
    try {
        if (useDeepSeek) plan = await callDeepSeek("你是一位極致穩定的故事策劃。", PLANNER_PROMPT, true);
        else {
            const model = getGeminiModel(true);
            const res = await model.generateContent(PLANNER_PROMPT);
            plan = cleanJson(res.response.text());
        }
    } catch (e) { plan = { chapter_title: "新的一章", outline: "推進劇情...", story_beats: ["事件1", "事件2", "事件3"], hook: "未完待續" }; }

    return {
        ...plan,
        outline: plan.story_beats.join('\n'), // 兼容舊格式
        plot_state_update: {
            phase,
            sub_phase: subPhase, // Persist sub_phase
            current_dungeon: currentDungeon,
            current_rules: currentRules,
            cycle_num: cycleNum,
            used_themes: usedThemes
        }
    };
};

const writeInfiniteChapter = async ({ novelContext, plan, prevText, tone, pov, useDeepSeek, director, currentDungeon, memories = [], forceInstruction = null }) => {
    const writerPrompt = `
    你是小說作者 Writer Agent。

    【核心規則】
    你必須嚴格逐一按照 story_beats 寫作，不得跳過，也不得添加新的事件。

    【硬性要求】
    1. 開頭必須從 story_beats[0] 的第一個動作開始。
    2. 不得重複上一章的動作、場景或對話。
    3. 不得加入 story_beats 未提及的事件。
    4. 不得加入新設定（新規則、魔法、武器、科技）。
    5. 不得提前解決本章衝突。
    6. 字數必須 2000 字以上。
    7. 文風必須沉浸式、具體化、Show Don't Tell。
    8. 結尾必須留懸念（使用 plan.hook）。

    【上一章摘要】
    ${prevText}

    【Writer 的任務】
    根據以下 Planner 的事件逐步寫作：

    ${JSON.stringify(plan.story_beats, null, 2)}
    
    【導演指令 (Director's Function)】
    ${JSON.stringify(director.chapter_function)}

    ${forceInstruction ? `\n【⚠️ 重寫指令 (Rewrite Logic)】\n${forceInstruction}` : ""}

    【關鍵記憶 (Memories)】
    ${memories.length > 0 ? memories.map(m => `- ${m}`).join('\n') : "暫無"}

    【情緒與風格】
    POV：${pov}
    Tone：${tone}

    【輸出 JSON】
    {
      "content": "正文（不要任何解說，不要任何標題）",
      "new_memories": ["例如：主角獲得了打火機", "例如：發現了校長的祕密日記"],
      "character_updates": [
        { "name": "角色名", "status": "受傷/死亡/正常", "description_append": "新發生的重要經歷", "profile_update": { "personality_surface": "..." } }
      ],
      "new_clues": ["新發現的線索"],
      "resolved_clues": ["本章解開的線索"],
      "relationship_updates": [ { "source": "A", "target": "B", "status": "Close", "description": "關係變化" } ]
    }
    `;

    try {
        if (useDeepSeek) return await callDeepSeek("你是小說作者。", writerPrompt, true);
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
        novelContext,
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

    // Step 1: Writer 生成初稿
    let writerResult = await writeInfiniteChapter({
        novelContext,
        plan: infinitePlan,
        prevText,
        tone,
        pov,
        useDeepSeek,
        director,
        currentDungeon: infinitePlan.plot_state_update.current_dungeon,
        memories
    });

    let draft = writerResult.content;

    // Step 2: Editor 審稿
    if (draft && draft.length > 500) {
        const editorResult = await editorInfinite({
            draft,
            plan: infinitePlan,
            prevText,
            director,
            novelContext,
            relationships: novelContext.relationships || [],
            useDeepSeek
        });

        // 如果 Editor 要求重寫
        if (editorResult.status === "REWRITE_REQUIRED") {
            console.log("✏️ Editor 要求重寫章節：", editorResult.required_fixes);

            const rewritePrompt = `
            【重寫要求】
            ${editorResult.required_fixes.join('\n')}
            請在不違反世界觀與大綱的前提下重寫此章。
            `;

            const rewriteResult = await writeInfiniteChapter({
                novelContext,
                plan: infinitePlan,
                prevText,
                tone,
                pov,
                useDeepSeek,
                director,
                forceInstruction: rewritePrompt,
                currentDungeon: infinitePlan.plot_state_update.current_dungeon
            });

            // 更新 writerResult
            if (rewriteResult.content && rewriteResult.content.length > 500) {
                writerResult = rewriteResult;
                draft = writerResult.content;
            }
        }
    }

    // Step 3: Polish
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

    const editorPrompt = `
    你是小說語言潤色者 Polish Agent。

    【任務】
    在不更改任何劇情事件、邏輯、對話內容的前提下：

    - 改善語氣流暢度
    - 增加畫面感與感官描寫
    - 消除 AI 味（重複句式、模板句）
    - 保持 POV 與 Tone 一致

    【嚴禁】
    - 新增事件
    - 刪除事件
    - 推進或改變劇情
    - 添加設定（規則、道具等）

    只輸出潤色後最終正文，不得有任何解說。

    【初稿】
    ${draft}
    `;

    try {
        const result = await model.generateContent(editorPrompt);
        return result.response.text().trim();
    } catch {
        return draft;
    }
};