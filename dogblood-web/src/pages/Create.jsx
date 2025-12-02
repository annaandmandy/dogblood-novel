import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dice5, ArrowRight, Sparkles } from 'lucide-react';
import { generateNovelStart, generateRandomSettings } from '../lib/gemini';
import { supabase } from '../lib/supabase';

export default function Create() {
    const navigate = useNavigate();
    const [genre, setGenre] = useState('BG');
    const [loading, setLoading] = useState(false);
    const [loadingRandom, setLoadingRandom] = useState(false);
    const [settings, setSettings] = useState({
        title: '',
        protagonist: '',
        loveInterest: '',
        trope: '',
        summary: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleRandomize = async () => {
        setLoadingRandom(true);
        try {
            const randomSettings = await generateRandomSettings(genre);
            setSettings(randomSettings);
        } catch (error) {
            console.error(error);
            alert('隨機生成失敗，請重試。');
        } finally {
            setLoadingRandom(false);
        }
    };

    const handleCreate = async () => {
        if (!settings.title || !settings.protagonist) {
            alert('請填寫完整設定');
            return;
        }

        setLoading(true);
        try {
            // 1. Generate Content
            const content = await generateNovelStart(genre, settings);

            // 2. Save Novel to Supabase
            const { data: novel, error: novelError } = await supabase
                .from('novels')
                .insert({
                    owner_id: 'productive_v1', // Hardcoded for now
                    title: settings.title,
                    genre: genre,
                    summary: settings.summary || settings.trope,
                    settings: settings,
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
            const charactersToInsert = [
                {
                    novel_id: novel.id,
                    name: settings.protagonist,
                    role: '主角',
                    description: '本故事主角',
                    status: 'Alive'
                },
                {
                    novel_id: novel.id,
                    name: settings.loveInterest,
                    role: '對象/反派',
                    description: '本故事重要角色',
                    status: 'Alive'
                }
            ];

            const { error: charactersError } = await supabase
                .from('characters')
                .insert(charactersToInsert);

            if (charactersError) throw charactersError;

            // Navigate to Reader with the new novel ID
            navigate(`/read/${novel.id}`);

        } catch (error) {
            alert('生成或儲存失敗，請檢查 Supabase 連接或 API Key。');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto min-h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-8">創作新小說</h1>

            <div className="space-y-8 flex-1">
                {/* Genre Selection */}
                <section>
                    <h2 className="text-lg font-medium text-slate-300 mb-4">選擇類型</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setGenre('BG')}
                            className={`p-6 rounded-xl border-2 text-left transition-all ${genre === 'BG'
                                ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                }`}
                        >
                            <div className="text-2xl mb-2">🌹</div>
                            <div className="font-bold text-lg">BG (言情)</div>
                            <div className="text-xs text-slate-400 mt-1">重生、復仇、總裁</div>
                        </button>

                        <button
                            onClick={() => setGenre('BL')}
                            className={`p-6 rounded-xl border-2 text-left transition-all ${genre === 'BL'
                                ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                }`}
                        >
                            <div className="text-2xl mb-2">🔮</div>
                            <div className="font-bold text-lg">BL (耽美)</div>
                            <div className="text-xs text-slate-400 mt-1">救贖、虐戀、強強</div>
                        </button>
                    </div>
                </section>

                {/* Settings */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-slate-300">核心設定</h2>
                        <button
                            onClick={handleRandomize}
                            disabled={loadingRandom}
                            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                        >
                            <Dice5 size={14} className={loadingRandom ? "animate-spin" : ""} />
                            {loadingRandom ? "生成中..." : "隨機生成 (AI)"}
                        </button>
                    </div>

                    <div className="space-y-3">
                        <input
                            name="title"
                            value={settings.title}
                            onChange={handleInputChange}
                            type="text"
                            placeholder="小說標題"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                name="protagonist"
                                value={settings.protagonist}
                                onChange={handleInputChange}
                                type="text"
                                placeholder="主角姓名"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <input
                                name="loveInterest"
                                value={settings.loveInterest}
                                onChange={handleInputChange}
                                type="text"
                                placeholder="對象/反派姓名"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                        <textarea
                            name="trope"
                            value={settings.trope}
                            onChange={handleInputChange}
                            placeholder="核心梗 / 背景設定"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 h-20 resize-none focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <textarea
                            name="summary"
                            value={settings.summary}
                            onChange={handleInputChange}
                            placeholder="劇情摘要 (至少 150 字，將顯示在圖書館)"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 h-32 resize-none focus:outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                    </div>
                </section>
            </div>

            <div className="pt-8 mt-auto pb-8">
                <button
                    onClick={handleCreate}
                    disabled={loading || loadingRandom}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Sparkles className="animate-spin" /> 正在生成世界...
                        </>
                    ) : (
                        <>
                            開始寫作 <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
