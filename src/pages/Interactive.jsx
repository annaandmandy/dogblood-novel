
import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, Send, Gamepad2, Save, SaveAll, Loader2, Book, User, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

export default function Interactive() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { id: novelIdParam } = useParams(); // URL parameter for existing novel
    const navigate = useNavigate();

    const [gameState, setGameState] = useState('setup'); // setup, playing, loading
    const [loading, setLoading] = useState(false);

    // Novel Metadata
    const [novel, setNovel] = useState(null);

    // Setup State
    const [tags, setTags] = useState("");
    const [tone, setTone] = useState("暗黑");
    const [category, setCategory] = useState("BG");
    const [settings, setSettings] = useState(null);

    // Game State
    const [history, setHistory] = useState([]); // Array of { content, type: 'story' | 'choice' }
    const [currentOptions, setCurrentOptions] = useState([]);
    const [customInput, setCustomInput] = useState("");
    const [plotState, setPlotState] = useState(null);
    const [characters, setCharacters] = useState([]); // Local state for wiki
    const [showWiki, setShowWiki] = useState(false);
    const scrollRef = useRef(null);

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

    // --- Load Game from Supabase ---
    useEffect(() => {
        if (novelIdParam && user) {
            loadGame(novelIdParam);
        }
    }, [novelIdParam, user]);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, loading]);

    const loadGame = async (id) => {
        setLoading(true);
        try {
            // 1. Fetch Novel
            const { data: novelData, error: novelError } = await supabase
                .from('novels')
                .select('*')
                .eq('id', id)
                .single();
            if (novelError) throw novelError;

            setNovel(novelData);
            setSettings(novelData.settings);
            setPlotState(novelData.settings.plot_state);

            // 2. Fetch Chapters (History)
            const { data: chapters, error: chapError } = await supabase
                .from('chapters')
                .select('*')
                .eq('novel_id', id)
                .order('chapter_index', { ascending: true });

            if (chapError) throw chapError;

            // 3. Fetch Characters
            const { data: charData, error: charError } = await supabase
                .from('characters')
                .select('*')
                .eq('novel_id', id);
            if (charError) console.error(charError);
            setCharacters(charData || []);

            // Reconstruct History
            // Assumption: Chapter content is the story segment. 
            // We need to figure out where the user choice is stored. 
            // For now, let's assume chapter title or content structure holds it, or we just show story segments.
            // If we want to show "User chose X", we can store it in the previous chapter or a separate field.
            // Simplified: Just show story content for now.

            const reconstructedHistory = chapters.map(c => ({
                content: c.content,
                type: 'story'
            }));

            // If there's a pending choice (saved in settings), we could restore it, but simpler to just restore last state options.
            // In a real app, we'd save the 'last_options' in the novel row.

            if (novelData.settings.last_options) {
                setCurrentOptions(novelData.settings.last_options);
            }

            setHistory(reconstructedHistory);
            setGameState('playing');

        } catch (error) {
            console.error("Load failed:", error);
            alert("讀取存檔失敗");
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // 1. Generate Settings (The Architect)
    const handleGenerateSettings = async () => {
        setLoading(true);
        try {
            const tagList = tags.split(/[,，\s]+/).filter(Boolean);
            const res = await fetch(`${API_BASE}/api/interactive/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tagList, tone, category, useDeepSeek: false })
            });
            const data = await res.json();
            if (data && data.title) {
                setSettings(data);
            }
        } catch (e) {
            console.error(e);
            alert("生成設定失敗，請重試");
        } finally {
            setLoading(false);
        }
    };

    // 2. Start Game (The Beginning)
    const handleStartGame = async () => {
        if (!user) {
            alert("請先登入");
            return;
        }

        setLoading(true);
        try {
            const tagList = tags.split(/[,，\s]+/).filter(Boolean);

            // A. Generate First Segment
            const res = await fetch(`${API_BASE}/api/interactive/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings, tags: tagList, tone, useDeepSeek: false })
            });

            if (!res.ok) throw new Error("Failed to start game");

            const data = await res.json();

            // B. Save to Supabase (Init)
            // 1. Create Novel
            const { data: newNovel, error: novelError } = await supabase
                .from('novels')
                .insert({
                    owner_id: user.id,
                    title: settings.title,
                    genre: 'Interactive', // Special genre
                    summary: settings.summary,
                    settings: {
                        ...settings,
                        tone,
                        category,
                        tags: tagList,
                        plot_state: data.plot_state,
                        last_options: data.options // Save options to persist state
                    },
                    tags: [...tagList, 'Interactive'],
                    is_public: false
                })
                .select()
                .single();

            if (novelError) throw novelError;

            // 2. Create Chapter 1
            const { error: chapError } = await supabase
                .from('chapters')
                .insert({
                    novel_id: newNovel.id,
                    chapter_index: 1,
                    title: '序章',
                    content: data.content
                });
            if (chapError) throw chapError;

            // 3. Create Characters
            const charactersToInsert = [];

            if (settings.protagonist) {
                charactersToInsert.push({
                    novel_id: newNovel.id,
                    name: settings.protagonist.name || "主角",
                    role: '主角',
                    gender: '未知',
                    description: settings.protagonist.trait,
                    status: 'Alive',
                    profile: settings.protagonist // Save full object
                });
            }
            if (settings.loveInterest) {
                charactersToInsert.push({
                    novel_id: newNovel.id,
                    name: settings.loveInterest.name || "對象",
                    role: '對象/反派',
                    gender: '未知',
                    description: settings.loveInterest.identity,
                    status: 'Alive',
                    profile: settings.loveInterest
                });
            }

            // Handle any additional updates returned
            if (data.character_updates) {
                data.character_updates.forEach(update => {
                    // Check if already in generic list
                    const exists = charactersToInsert.find(c => c.name === update.name);
                    if (!exists) {
                        charactersToInsert.push({
                            novel_id: newNovel.id,
                            name: update.name,
                            role: update.role || '配角',
                            gender: '未知',
                            description: update.status,
                            status: 'Alive',
                            profile: update.profile_update || {}
                        });
                    }
                });
            }

            let insertedCharacters = [];
            if (charactersToInsert.length > 0) {
                const { data: inserted } = await supabase.from('characters').insert(charactersToInsert).select();
                insertedCharacters = inserted || [];
            }

            // C. Update Local State
            setNovel(newNovel);
            setHistory([{ content: data.content, type: 'story' }]);
            setCurrentOptions(data.options || []);
            setPlotState(data.plot_state);
            setCharacters(insertedCharacters);
            setGameState('playing');

            // Optionally navigate to the permalink so refresh works
            navigate(`/interactive/${newNovel.id}`, { replace: true });

        } catch (e) {
            console.error(e);
            alert("開始遊戲失敗");
        } finally {
            setLoading(false);
        }
    };

    // 3. Make Choice (The Next Step)
    const handleChoice = async (choiceText) => {
        if (!choiceText || loading) return;

        // Optimistic UI update
        setHistory(prev => [...prev, { content: choiceText, type: 'choice' }]);
        setCustomInput("");
        setCurrentOptions([]);
        setLoading(true);

        try {
            const previousContent = history.filter(h => h.type === 'story').slice(-1)[0]?.content || "";

            // A. Generate Next Segment
            const res = await fetch(`${API_BASE}/api/interactive/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    novelContext: { settings: novel ? novel.settings : settings },
                    previousContent,
                    userChoice: choiceText,
                    lastPlotState: plotState,
                    tone,
                    useDeepSeek: false
                })
            });
            const data = await res.json();

            // B. Save to Supabase
            let updatedCharactersList = [...characters];

            if (novel) {
                // 1. Save new Chapter
                // Calculate new index
                const newIndex = (plotState?.chapter_count || 1) + 1;

                // Append user choice to previous chapter? Or save as separate 'Choice' entry?
                // Simplest: Save the NEW content as a new chapter. 
                // The User Choice is effectively the "Title" or transition.
                await supabase.from('chapters').insert({
                    novel_id: novel.id,
                    chapter_index: newIndex,
                    title: `選擇：${choiceText.slice(0, 20)}...`,
                    content: data.content
                });

                // 2. Update Novel State (Settings & Options)
                await supabase.from('novels').update({
                    settings: {
                        ...novel.settings,
                        plot_state: data.plot_state,
                        last_options: data.options
                    }
                }).eq('id', novel.id);

                // 3. Update Characters if needed
                if (data.character_updates && data.character_updates.length > 0) {
                    for (const update of data.character_updates) {
                        const existing = updatedCharactersList.find(c => c.name === update.name);
                        if (existing) {
                            // Update existing
                            const response = await supabase.from('characters').update({
                                status: update.status,
                                profile: { ...existing.profile, ...update.profile_update }
                            }).eq('id', existing.id).select().single();

                            if (response.data) {
                                updatedCharactersList = updatedCharactersList.map(c => c.id === existing.id ? response.data : c);
                            }
                        } else {
                            // Insert new
                            const response = await supabase.from('characters').insert({
                                novel_id: novel.id,
                                name: update.name,
                                role: update.role || '配角',
                                description: update.status,
                                status: 'Alive',
                                profile: update.profile_update || {}
                            }).select().single();

                            if (response.data) {
                                updatedCharactersList.push(response.data);
                            }
                        }
                    }
                }
            }

            // C. Update Local State
            setHistory(prev => [...prev, { content: data.content, type: 'story' }]);
            setCurrentOptions(data.options || []);
            setPlotState(data.plot_state);
            setCharacters(updatedCharactersList);

        } catch (e) {
            console.error(e);
            alert("生成失敗");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 max-w-4xl mx-auto relative overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur z-20">
                <div className="flex items-center space-x-2">
                    <Gamepad2 className="text-purple-400" />
                    <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        互動小說 {novel && <span className="text-xs text-slate-500 font-normal">| {novel.title}</span>}
                    </h1>
                </div>
                {gameState === 'playing' && (
                    <div className="flex items-center gap-2">
                        {/* Wiki Toggle */}
                        <button
                            onClick={() => setShowWiki(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors relative"
                            title="人物狀態 (Wiki)"
                        >
                            <Book size={20} />
                            {characters.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>}
                        </button>

                        <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>

                        {/* Auto-save indicator */}
                        {novel && (
                            <div className="hidden sm:flex items-center text-xs text-slate-500">
                                <SaveAll className="w-3 h-3 mr-1" />
                                已存檔
                            </div>
                        )}
                        <button
                            onClick={() => {
                                if (confirm('確定要回到主選單嗎？進度已自動保存。')) {
                                    setGameState('setup');
                                    setNovel(null);
                                    navigate('/interactive'); // Clear ID
                                }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2 py-1"
                        >
                            退出
                        </button>
                    </div>
                )}
            </header>

            {/* Wiki Sidebar / Modal */}
            {gameState === 'playing' && showWiki && (
                <div className="absolute inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowWiki(false)}>
                    <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Book size={20} className="text-purple-400" />
                                人物檔案 (Wiki)
                            </h2>
                            <button onClick={() => setShowWiki(false)} className="p-2 text-slate-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {characters.length === 0 && <div className="text-slate-500 text-center py-10">暫無角色資料</div>}
                            {characters.map(char => (
                                <div key={char.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-purple-500/30 transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                {char.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200">{char.name}</div>
                                                <div className="text-xs text-slate-500">{char.role}</div>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded border ${char.status === 'Alive' ? 'text-green-400 border-green-900/30 bg-green-900/10' : 'text-red-400 border-red-900/30 bg-red-900/10'}`}>
                                            {char.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-2">{char.description}</p>

                                    {/* Attributes / Profile */}
                                    {char.profile && Object.keys(char.profile).length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/50">
                                            {Object.entries(char.profile).map(([key, val]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="text-slate-500 block capitalize">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-slate-300 truncate block">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Setup Mode */}
            {gameState === 'setup' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-fade-in text-slate-200">
                    {loading && (
                        <div className="absolute inset-0 bg-slate-950/80 z-50 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
                                <span>Generating World...</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-400">1. 設定關鍵詞</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="例如：無限流、喪屍、校園、相愛相殺..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-slate-600"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-400">2. 風格基調</label>
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none"
                            >
                                <option value="暗黑">暗黑 (刺激/絕望)</option>
                                <option value="輕鬆">輕鬆 (搞笑/爽文)</option>
                                <option value="甜寵">甜寵 (戀愛為主)</option>
                                <option value="正劇">正劇 (邏輯嚴密)</option>
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-400">3. 性向分類</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none"
                            >
                                <option value="BG">BG (男女)</option>
                                <option value="BL">BL (男男)</option>
                                <option value="GL">GL (女女)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateSettings}
                        disabled={loading || !tags}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Sparkles className="animate-spin" /> : <Sparkles />}
                        <span>生成遊戲設定 (Generate)</span>
                    </button>

                    {settings && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4 animate-slide-up">
                            <h2 className="text-xl font-bold text-white mb-2">{settings.title}</h2>
                            <p className="text-slate-300 text-sm leading-relaxed">{settings.summary}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <h3 className="text-purple-400 text-xs font-bold mb-1">主角</h3>
                                    <div className="text-sm font-medium">{settings.protagonist?.name}</div>
                                    <div className="text-xs text-slate-400">{settings.protagonist?.trait}</div>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <h3 className="text-pink-400 text-xs font-bold mb-1">攻略對象</h3>
                                    <div className="text-sm font-medium">{settings.loveInterest?.name}</div>
                                    <div className="text-xs text-slate-400">{settings.loveInterest?.identity}</div>
                                </div>
                            </div>

                            <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
                                <h3 className="text-red-400 text-xs font-bold mb-1">第一關</h3>
                                <div className="text-sm text-slate-300">{settings.first_level_brief}</div>
                            </div>

                            <button
                                onClick={handleStartGame}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center space-x-2 mt-4"
                            >
                                <Play fill="currentColor" />
                                <span>開始遊戲 (Start Game)</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Game Mode */}
            {gameState === 'playing' && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {/* Loading Overlay for transitions */}
                    {loading && (
                        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] z-10 flex items-end justify-center pb-24 pointer-events-none">
                            <div className="bg-slate-900/80 px-4 py-2 rounded-full flex items-center gap-2 text-purple-300 border border-purple-500/30 shadow-lg animate-pulse">
                                <Sparkles className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-medium">正在推演命運...</span>
                            </div>
                        </div>
                    )}

                    {/* Story Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth pb-32"
                    >
                        {history.map((item, idx) => (
                            <div key={idx} className={`animate-fade-in ${item.type === 'choice' ? 'flex justify-end' : ''}`}>
                                {item.type === 'story' ? (
                                    <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 max-w-none">
                                        <div className="whitespace-pre-wrap leading-relaxed text-base md:text-lg font-serif tracking-wide bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 shadow-sm hover:border-slate-700 transition-colors">
                                            {item.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-purple-600/20 border border-purple-500/30 text-purple-200 px-4 py-2 rounded-lg text-sm max-w-[80%] rounded-br-none mx-2">
                                        {item.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Interaction Area (Fixed Bottom) */}
                    <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-20">
                        {currentOptions.length > 0 && !loading && (
                            <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
                                {currentOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleChoice(opt.label)}
                                        className="w-full text-left p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 transition-all group relative overflow-hidden active:scale-[0.99]"
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{opt.label}</span>
                                            {opt.type === 'Romance' && <span className="text-pink-400 text-xs px-2 py-0.5 bg-pink-900/30 rounded font-bold">CP向</span>}
                                            {/* Fix: Check for both 'Aggressive' AND 'Agresive' typo if any, or just use Aggressive */}
                                            {opt.type === 'Aggressive' && <span className="text-red-400 text-xs px-2 py-0.5 bg-red-900/30 rounded font-bold">激進</span>}
                                            {opt.type === 'Logical' && <span className="text-blue-400 text-xs px-2 py-0.5 bg-blue-900/30 rounded font-bold">理智</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 relative z-10 group-hover:text-slate-400 transition-colors">{opt.hint}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                disabled={loading}
                                placeholder="自定義行動... (例如：強吻他 / 一腳踹開大門)"
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 disabled:opacity-50 transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleChoice(customInput)}
                            />
                            <button
                                onClick={() => handleChoice(customInput)}
                                disabled={loading || !customInput}
                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-purple-900/20"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
