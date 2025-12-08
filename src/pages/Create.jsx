import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dice5, ArrowRight, Sparkles,
    Infinity, VenetianMask, CloudLightning, Skull, Crown, Heart, Sword, Rocket,
    Zap, Smile, Scale, Moon, Coffee, Edit
} from 'lucide-react';
import CharacterEditModal from '../components/CharacterEditModal';
import { generateRandomSettings, generateNovelStart, ensureDetailedSettings } from '../lib/gemini';
import { supabase } from '../lib/supabase';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Create() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();

    React.useEffect(() => {
        if (!user) {
            navigate('/auth');
        }
    }, [user, navigate]);

    if (!user) return null;

    // --- State Management ---
    const [category, setCategory] = useState('BG');
    const [genre, setGenre] = useState('豪門宮鬥');
    const [pov, setPov] = useState('女主');
    const [tone, setTone] = useState('一般');
    const [selectedTags, setSelectedTags] = useState([]);

    const [settings, setSettings] = useState({
        title: '',
        protagonist: '',
        loveInterest: '',
        trope: '',
        summary: ''
    });

    // Store deep character profiles (hidden from simple UI but used for generation)
    const [profiles, setProfiles] = useState({
        protagonist: {},
        loveInterest: {}
    });

    // Relationship State
    const [relationships, setRelationships] = useState([]);

    const [designBlueprint, setDesignBlueprint] = useState({});
    const [targetEndingChapter, setTargetEndingChapter] = useState(120);
    const [useDeepSeek, setUseDeepSeek] = useState(false); // Default to true (DeepSeek)
    const [lastGeneratedSettings, setLastGeneratedSettings] = useState(null); // To track if user modified settings

    const [loading, setLoading] = useState(false);
    const [loadingRandom, setLoadingRandom] = useState(false);
    const [customTag, setCustomTag] = useState('');
    const [editingCharacter, setEditingCharacter] = useState(null); // 'protagonist' | 'loveInterest' | null

    // --- Options Configuration ---
    const GENRE_OPTIONS = [
        { id: '無限流', icon: Infinity, label: t('genre.infinite'), desc: t('genre.infinite_desc') },
        { id: '諜戰黑道', icon: VenetianMask, label: t('genre.spy'), desc: t('genre.spy_desc') },
        { id: '修仙玄幻', icon: CloudLightning, label: t('genre.xianxia'), desc: t('genre.xianxia_desc') },
        { id: '末世生存', icon: Skull, label: t('genre.apocalypse'), desc: t('genre.apocalypse_desc') },
        { id: '豪門宮鬥', icon: Crown, label: t('genre.palace'), desc: t('genre.palace_desc') },
        { id: '都市情緣', icon: Heart, label: t('genre.urban'), desc: t('genre.urban_desc') },
        { id: '西方奇幻', icon: Sword, label: t('genre.fantasy'), desc: t('genre.fantasy_desc') },
        { id: '星際科幻', icon: Rocket, label: t('genre.scifi'), desc: t('genre.scifi_desc') },
    ];

    const getRecommendedTotalChapters = (genreId) => {
        switch (genreId) {
            case '無限流': return 200;
            case '修仙玄幻': return 200;
            case '豪門宮鬥': return 160;
            case '西方奇幻': return 200;
            default: return 120;
        }
    };
    const POV_OPTIONS = [
        { id: '第三人稱', label: t('pov.third'), desc: t('pov.third_desc'), category: 'ALL' },
        { id: '女主', label: t('pov.female'), desc: t('pov.female_desc'), category: 'BG' },
        { id: '男主', label: t('pov.male'), desc: t('pov.male_desc'), category: 'BG' },
        { id: '主受', label: t('pov.shou'), desc: t('pov.shou_desc'), category: 'BL_GL' },
        { id: '主攻', label: t('pov.gong'), desc: t('pov.gong_desc'), category: 'BL_GL' },
    ];

    const TONE_OPTIONS = [
        { id: '爽文', icon: Zap, label: t('tone.cool'), desc: t('tone.cool_desc') },
        { id: '歡脫', icon: Smile, label: t('tone.funny'), desc: t('tone.funny_desc') },
        { id: '嚴肅', icon: Scale, label: t('tone.serious'), desc: t('tone.serious_desc') },
        { id: '虐戀', icon: Moon, label: t('tone.angst'), desc: t('tone.angst_desc') },
        { id: '溫馨', icon: Coffee, label: t('tone.warm'), desc: t('tone.warm_desc') },
    ];

    const AVAILABLE_TAGS = [
        { id: 'tag.rebirth', label: '重生' }, { id: 'tag.transmigration', label: '穿越' }, { id: 'tag.redemption', label: '救贖' },
        { id: 'tag.system', label: '系統' }, { id: 'tag.book_transmigration', label: '穿書' }, { id: 'tag.secret_identity', label: '馬甲' },
        { id: 'tag.power_couple', label: '強強' }, { id: 'tag.master_servant', label: '主僕' }, { id: 'tag.enemies_to_lovers', label: '相愛相殺' },
        { id: 'tag.reunion', label: '破鏡重圓' }, { id: 'tag.crematorium', label: '追妻火葬場' }, { id: 'tag.age_gap', label: '年下' },
        { id: 'tag.dungeon', label: '副本解密' }, { id: 'tag.survival', label: '生存遊戲' }, { id: 'tag.level_up', label: '升級' },
        { id: 'tag.adventure', label: '歷練' }, { id: 'tag.face_slapping', label: '打臉' }, { id: 'tag.revenge', label: '復仇' },
        { id: 'tag.construction', label: '建設' }, { id: 'tag.politics', label: '權謀' },
        { id: 'tag.campus', label: '校園' }, { id: 'tag.workplace', label: '職場' }, { id: 'tag.entertainment', label: '娛樂圈' },
        { id: 'tag.gang', label: '幫派' }, { id: 'tag.undercover', label: '臥底' }, { id: 'tag.action', label: '動作' },
        { id: 'tag.zombie', label: '喪屍' }, { id: 'tag.disaster', label: '天災' }, { id: 'tag.chinese_horror', label: '中式恐怖' },
        { id: 'tag.cultivation', label: '修仙' }, { id: 'tag.rules_horror', label: '規則怪談' }, { id: 'tag.cthulhu', label: '克蘇魯' }
    ];

    // --- Handlers ---

    // Reset POV when category changes
    React.useEffect(() => {
        setPov('第三人稱');
    }, [category]);

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            if (selectedTags.length >= 5) {
                alert(t('create.max_tags_alert'));
                return;
            }
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    const addCustomTag = () => {
        if (!customTag.trim()) return;
        if (selectedTags.length >= 5) {
            alert(t('create.max_tags_alert'));
            return;
        }
        if (!selectedTags.includes(customTag.trim())) {
            setSelectedTags(prev => [...prev, customTag.trim()]);
        }
        setCustomTag('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleRandomize = async () => {
        setLoadingRandom(true);
        try {
            // Updated signature: generateRandomSettings(genre, tags, tone, targetChapterCount, category, useDeepSeek)
            const randomSettings = await generateRandomSettings(genre, selectedTags, tone, parseInt(targetEndingChapter), category, useDeepSeek);

            // Separate flat settings for UI and deep profiles for logic
            setSettings({
                title: randomSettings.title,
                protagonist: randomSettings.protagonist.name,
                loveInterest: randomSettings.loveInterest.name,
                trope: randomSettings.trope,
                summary: randomSettings.summary
            });

            setProfiles({
                protagonist: { ...randomSettings.protagonist.profile, gender: randomSettings.protagonist.gender },
                loveInterest: { ...randomSettings.loveInterest.profile, gender: randomSettings.loveInterest.gender }
            });

            if (randomSettings.design_blueprint) {
                setDesignBlueprint(randomSettings.design_blueprint);
            }
            if (randomSettings.relationships) {
                setRelationships(randomSettings.relationships);
            }

            // Save the exact state of what we generated to compare later
            setLastGeneratedSettings({
                title: randomSettings.title,
                protagonist: randomSettings.protagonist.name,
                loveInterest: randomSettings.loveInterest.name,
                trope: randomSettings.trope,
                summary: randomSettings.summary,
                // Also track side characters if they exist in blueprint
                side_characters: randomSettings.design_blueprint?.side_characters
            });

        } catch (error) {
            console.error(error);
            alert(t('create.random_fail'));
        } finally {
            setLoadingRandom(false);
        }
    };

    const handleSaveProfile = (newProfile) => {
        if (editingCharacter) {
            setProfiles(prev => ({
                ...prev,
                [editingCharacter]: newProfile
            }));
        }
    };

    const handleCreate = async () => {
        if (!settings.title || !settings.protagonist || !settings.loveInterest || !settings.trope || !settings.summary) {
            alert(t('create.empty_fields_alert'));
            return;
        }

        setLoading(true);
        try {
            // 1. Generate Content
            // Construct full settings object with profiles for the AI
            // 1. Generate Content
            // Construct full settings object with profiles for the AI
            let apiSettings = {
                ...settings,
                design_blueprint: designBlueprint,
                protagonist: { name: settings.protagonist, role: '主角', profile: profiles.protagonist },
                loveInterest: { name: settings.loveInterest, role: '對象/反派', profile: profiles.loveInterest }
            };

            // Check if we need to generate/refresh deep settings (profiles & blueprint)
            // This happens if:
            // 1. Profiles/Blueprint are missing (Manual entry from scratch)
            // 2. User modified key fields (Title, Names, Summary) after generation
            const isModified = lastGeneratedSettings && (
                settings.title !== lastGeneratedSettings.title ||
                settings.protagonist !== lastGeneratedSettings.protagonist ||
                settings.loveInterest !== lastGeneratedSettings.loveInterest ||
                settings.summary !== lastGeneratedSettings.summary
            );

            const needsDeepSettings = !profiles.protagonist?.personality_core || !designBlueprint?.main_goal || isModified;

            if (needsDeepSettings) {
                console.log("Generating deep settings for manual input...");
                const detailed = await ensureDetailedSettings(genre, settings, selectedTags, tone, category, useDeepSeek);

                // Update apiSettings with the newly generated deep data
                apiSettings = {
                    ...apiSettings,
                    design_blueprint: detailed.design_blueprint,
                    protagonist: { ...apiSettings.protagonist, profile: detailed.protagonist.profile, gender: detailed.protagonist.gender },
                    loveInterest: { ...apiSettings.loveInterest, profile: detailed.loveInterest.profile, gender: detailed.loveInterest.gender }
                };

                // Also update local state for consistency (optional but good for debugging)
                setDesignBlueprint(detailed.design_blueprint);
                setProfiles({
                    protagonist: { ...detailed.protagonist.profile, gender: detailed.protagonist.gender },
                    loveInterest: { ...detailed.loveInterest.profile, gender: detailed.loveInterest.gender }
                });
            }

            // Updated signature: generateNovelStart(genre, settings, tags, tone, pov)
            // Note: We must pass the specific genre (e.g. '無限流') not the category ('BG')
            // Updated signature: generateNovelStart(genre, settings, tags, tone, pov, useDeepSeek)
            // Note: We must pass the specific genre (e.g. '無限流') not the category ('BG')
            const startResponse = await generateNovelStart(genre, apiSettings, selectedTags, tone, pov, useDeepSeek);
            const content = startResponse.content;
            // Note: startResponse.character_updates is also available here if we want to use it dynamically,
            // but for now we use the pre-generated profiles for the main characters.

            // 2. Save Novel to Supabase
            const { data: novel, error: novelError } = await supabase
                .from('novels')
                .insert({
                    owner_id: user.id,
                    title: settings.title,
                    genre: genre, // Save specific genre (e.g. '無限流') so gemini.js works correctly
                    summary: settings.summary || settings.trope,
                    settings: {
                        ...settings,
                        tone,
                        pov,
                        category,
                        design_blueprint: designBlueprint,
                        relationships: relationships, // Save relationships
                        useDeepSeek,
                        plot_state: startResponse.plot_state // Save the initial plot state!
                    },
                    tags: selectedTags,
                    target_ending_chapter: parseInt(targetEndingChapter) || 120,
                    is_public: false
                })
                .select()
                .single();

            if (novelError) throw novelError;

            // 3. Save Chapter 1
            const { error: chapterError } = await supabase
                .from('chapters')
                .insert({
                    novel_id: novel.id,
                    chapter_index: 1,
                    title: '第一章',
                    content: content
                });

            if (chapterError) throw chapterError;

            // 4. Save Initial Characters
            // Strategy: Start with the deep profiles generated in the random step,
            // then merge any updates from the first chapter generation.

            const characterMap = new Map();

            // A. Initialize with base profiles (Protagonist & Love Interest)
            const protagName = typeof settings.protagonist === 'object' ? settings.protagonist.name : settings.protagonist;
            const loveName = typeof settings.loveInterest === 'object' ? settings.loveInterest.name : settings.loveInterest;

            if (protagName) {
                characterMap.set(protagName, {
                    novel_id: novel.id,
                    name: protagName,
                    role: '主角',
                    gender: profiles.protagonist?.gender || (settings.protagonist?.gender) || '未知',
                    description: '本故事主角',
                    status: 'Alive',
                    profile: profiles.protagonist || settings.protagonist?.profile || {}
                });
            }

            if (loveName) {
                characterMap.set(loveName, {
                    novel_id: novel.id,
                    name: loveName,
                    role: '對象/反派',
                    gender: profiles.loveInterest?.gender || (settings.loveInterest?.gender) || '未知',
                    description: '本故事重要角色',
                    status: 'Alive',
                    profile: profiles.loveInterest || settings.loveInterest?.profile || {}
                });
            }

            // B. Add Side Characters from Design Blueprint
            if (designBlueprint?.side_characters && Array.isArray(designBlueprint.side_characters)) {
                designBlueprint.side_characters.forEach(sc => {
                    // Avoid overwriting protagonist/love interest if names collide (though unlikely with strict prompting)
                    if (!characterMap.has(sc.name)) {
                        characterMap.set(sc.name, {
                            novel_id: novel.id,
                            name: sc.name,
                            role: sc.role || '配角',
                            gender: '未知', // Blueprint usually doesn't have gender, default to unknown
                            description: sc.profile || '重要配角', // Use the short profile string as description
                            status: 'Alive',
                            profile: { personality_core: sc.profile } // Store the short profile in the JSON profile as well
                        });
                    }
                });
            }

            // C. Merge updates from Chapter 1 generation
            if (startResponse.character_updates && startResponse.character_updates.length > 0) {
                startResponse.character_updates.forEach(update => {
                    const existing = characterMap.get(update.name);

                    if (existing) {
                        // Merge existing character
                        characterMap.set(update.name, {
                            ...existing,
                            role: update.role || existing.role,
                            gender: update.gender || existing.gender,
                            description: update.description || existing.description,
                            status: update.status || existing.status,
                            profile: { ...existing.profile, ...update.profile_update } // Merge deep profile with updates
                        });
                    } else {
                        // Add new character (Side characters introduced in Ch1)
                        characterMap.set(update.name, {
                            novel_id: novel.id,
                            name: update.name,
                            role: update.role || '配角',
                            gender: update.gender || '未知',
                            description: update.description || '新登場角色',
                            status: update.status || 'Alive',
                            profile: update.profile_update || {}
                        });
                    }
                });
            }

            const charactersToInsert = Array.from(characterMap.values());

            const { error: charactersError } = await supabase
                .from('characters')
                .insert(charactersToInsert);

            if (charactersError) throw charactersError;

            // 5. Save Initial Dungeon (Infinite Flow Only)
            if (genre === '無限流' && apiSettings.first_dungeon_setting) {
                const fd = apiSettings.first_dungeon_setting;
                // Generate rule logic object if not present (simple fallback)
                const ruleLogic = {
                    title: "規則",
                    rules: fd.core_rules || [],
                    hidden_truth: "未知"
                };

                const { error: dungeonError } = await supabase
                    .from('dungeons')
                    .insert({
                        novel_id: novel.id,
                        name: fd.dungeon_name,
                        cycle_num: 1,
                        difficulty: fd.difficulty || '未知',
                        background_story: fd.background_story,
                        mechanics: fd.mechanics,
                        core_rules: fd.core_rules,
                        rule_logic: ruleLogic,
                        entities: fd.entities, // If available in settings
                        endings: fd.endings,   // If available in settings
                        status: 'active'
                    });

                if (dungeonError) console.error("Failed to save initial dungeon:", dungeonError);
            }

            // Navigate to Reader
            navigate(`/read/${novel.id}`);

        } catch (error) {
            alert(t('create.create_fail'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto min-h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                {t('create.title')}
            </h1>

            <div className="space-y-10 flex-1">

                {/* Step 0: Category Selection */}
                <section>
                    <h2 className="text-xl font-medium text-slate-200 mb-4 flex items-center gap-2">
                        <span className="bg-rose-600 text-xs px-2 py-1 rounded text-white">Step 1</span>
                        {t('create.step1')}
                    </h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setCategory('BG')}
                            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${category === 'BG'
                                ? 'border-rose-500 bg-rose-500/10 text-white shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                                }`}
                        >
                            <div className="text-2xl mb-1">🌹</div>
                            <div className="font-bold">{t('create.bg')}</div>
                        </button>
                        <button
                            onClick={() => setCategory('BL')}
                            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${category === 'BL'
                                ? 'border-violet-500 bg-violet-500/10 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                                : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                                }`}
                        >
                            <div className="text-2xl mb-1">🔮</div>
                            <div className="font-bold">{t('create.bl')}</div>
                        </button>
                        <button
                            onClick={() => setCategory('GL')}
                            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${category === 'GL'
                                ? 'border-violet-500 bg-violet-500/10 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                                : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                                }`}
                        >
                            <div className="text-2xl mb-1">⚜️</div>
                            <div className="font-bold">{t('create.gl')}</div>
                        </button>
                    </div>
                </section>

                {/* Step 1: Genre Selection */}
                <section>
                    <h2 className="text-xl font-medium text-slate-200 mb-4 flex items-center gap-2">
                        <span className="bg-purple-600 text-xs px-2 py-1 rounded text-white">Step 2</span>
                        {t('create.step2')}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {GENRE_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    setGenre(opt.id);
                                    setTargetEndingChapter(getRecommendedTotalChapters(opt.id));
                                }}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${genre === opt.id
                                    ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                    }`}
                            >
                                <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${genre === opt.id ? 'opacity-20' : ''}`}>
                                    <opt.icon size={64} />
                                </div>
                                <div className="relative z-10">
                                    <div className="mb-2 text-purple-400"><opt.icon size={24} /></div>
                                    <div className="font-bold text-lg text-slate-100">{opt.label}</div>
                                    <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Step 2: POV & Tone */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* POV Selection */}
                    <section>
                        <h2 className="text-xl font-medium text-slate-200 mb-4 flex items-center gap-2">
                            <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white">Step 3</span>
                            {t('create.step3_pov')}
                        </h2>
                        <div className="space-y-3">
                            {POV_OPTIONS.filter(opt =>
                                opt.category === 'ALL' ||
                                opt.category === category ||
                                (opt.category === 'BL_GL' && (category === 'BL' || category === 'GL'))
                            ).map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setPov(opt.id)}
                                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${pov === opt.id
                                        ? 'border-blue-500 bg-blue-500/10 text-white'
                                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${pov === opt.id ? 'border-blue-500' : 'border-slate-600'
                                        }`}>
                                        {pov === opt.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                    </div>
                                    <div>
                                        <div className="font-medium">{opt.label}</div>
                                        <div className="text-xs opacity-70">{opt.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Tone Selection */}
                    <section>
                        <h2 className="text-xl font-medium text-slate-200 mb-4 flex items-center gap-2">
                            <span className="bg-pink-600 text-xs px-2 py-1 rounded text-white">Step 3</span>
                            {t('create.step3_tone')}
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {TONE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setTone(opt.id)}
                                    className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-2 ${tone === opt.id
                                        ? 'border-pink-500 bg-pink-500/10 text-white'
                                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <opt.icon size={16} />
                                        <span className="font-medium">{opt.label}</span>
                                    </div>
                                    <div className="text-xs opacity-70">{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Step 4: Tags */}
                <section>
                    <h2 className="text-xl font-medium text-slate-200 mb-4 flex items-center gap-2">
                        <span className="bg-emerald-600 text-xs px-2 py-1 rounded text-white">Step 4</span>
                        {t('create.step4')}
                    </h2>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {/* Render Predefined Tags */}
                            {AVAILABLE_TAGS.map(tagObj => {
                                const isSelected = selectedTags.includes(tagObj.label); // Still store the label string for now to match backend expectation
                                return (
                                    <button
                                        key={tagObj.id}
                                        onClick={() => toggleTag(tagObj.label)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${isSelected
                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {t(tagObj.id)}
                                    </button>
                                );
                            })}

                            {/* Render Custom Tags */}
                            {selectedTags.filter(t => !AVAILABLE_TAGS.some(at => at.label === t)).map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className="px-3 py-1.5 rounded-full text-sm border transition-all bg-emerald-600 border-emerald-600 text-white"
                                >
                                    {tag}
                                </button>
                            ))}

                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-800">
                            <input
                                type="text"
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                placeholder={t('create.custom_tag_placeholder')}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                            />
                            <button
                                onClick={addCustomTag}
                                className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 text-slate-200"
                            >
                                {t('create.add_tag')}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Model Selection Toggle */}
                <section className="mt-8 p-4 rounded-lg border border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-slate-200">{t('create.ai_model_select')}</h3>
                            <p className="text-sm text-slate-400">{t('create.ai_model_desc')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm ${!useDeepSeek ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>Gemini</span>
                            <button
                                onClick={() => setUseDeepSeek(!useDeepSeek)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useDeepSeek ? 'bg-purple-600' : 'bg-slate-600'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useDeepSeek ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                            <span className={`text-sm ${useDeepSeek ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>DeepSeek</span>
                        </div>
                    </div>
                </section>

                {/* Step 5: Settings */}
                <section className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-medium text-slate-200 flex items-center gap-2">
                            <span className="bg-orange-600 text-xs px-2 py-1 rounded text-white">Step 5</span>
                            {t('create.step5')}
                        </h2>
                        <button
                            onClick={handleRandomize}
                            disabled={loadingRandom}
                            className="text-sm flex items-center gap-2 text-purple-400 hover:text-purple-300 disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition-colors"
                        >
                            <Dice5 size={16} className={loadingRandom ? "animate-spin" : ""} />
                            {loadingRandom ? t('create.generating') : t('create.random_gen')}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <input
                            name="title"
                            value={settings.title}
                            onChange={handleInputChange}
                            type="text"
                            placeholder={t('create.novel_title')}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors text-lg font-bold"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <input
                                    name="protagonist"
                                    value={typeof settings.protagonist === 'object' ? settings.protagonist.name : settings.protagonist}
                                    onChange={handleInputChange}
                                    type="text"
                                    placeholder={t('create.protagonist')}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <button
                                    onClick={() => setEditingCharacter('protagonist')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-purple-400 transition-colors"
                                    title="編輯詳細人設"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    name="loveInterest"
                                    value={typeof settings.loveInterest === 'object' ? settings.loveInterest.name : settings.loveInterest}
                                    onChange={handleInputChange}
                                    type="text"
                                    placeholder={t('create.love_interest')}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <button
                                    onClick={() => setEditingCharacter('loveInterest')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-purple-400 transition-colors"
                                    title="編輯詳細人設"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>
                        </div>
                        <textarea
                            name="trope"
                            value={settings.trope}
                            onChange={handleInputChange}
                            placeholder={t('create.trope_placeholder')}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 h-24 resize-none focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <textarea
                            name="summary"
                            value={settings.summary}
                            onChange={handleInputChange}
                            placeholder={t('create.summary_placeholder')}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 h-32 resize-none focus:outline-none focus:border-purple-500 transition-colors text-sm"
                        />

                        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-300 mb-1">{t('create.chapter_count')}</label>
                                <div className="text-xs text-slate-500">{t('create.chapter_count_desc')}</div>
                            </div>
                            <input
                                type="number"
                                value={targetEndingChapter}
                                onChange={(e) => setTargetEndingChapter(e.target.value)}
                                min="20"
                                max="500"
                                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-center focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>
                </section>
            </div>

            <div className="pt-8 mt-8 pb-8 border-t border-slate-800">
                <button
                    onClick={handleCreate}
                    disabled={loading || loadingRandom}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-xl shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Sparkles className="animate-spin" /> {t('create.building_world')}
                        </>
                    ) : (
                        <>
                            {t('create.start_writing')} <ArrowRight size={24} />
                        </>
                    )}
                </button>
            </div>
            {/* Character Edit Modal */}
            <CharacterEditModal
                isOpen={!!editingCharacter}
                onClose={() => setEditingCharacter(null)}
                characterName={editingCharacter === 'protagonist' ? settings.protagonist : settings.loveInterest}
                profile={editingCharacter ? profiles[editingCharacter] : {}}
                onSave={handleSaveProfile}
            />
        </div>
    );
}
