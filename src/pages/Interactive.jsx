import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, Send, SkipForward, AlertTriangle, MessageCircle, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Interactive() {
    const { t } = useLanguage();
    const [gameState, setGameState] = useState('setup'); // setup, playing, loading
    const [loading, setLoading] = useState(false);

    // Setup State
    const [tags, setTags] = useState("");
    const [tone, setTone] = useState("暗黑");
    const [category, setCategory] = useState("BG");
    const [settings, setSettings] = useState(null);

    // Game State
    const [history, setHistory] = useState([]); // Array of { content, type: 'story' | 'choice' }
    const [currentOptions, setCurrentOptions] = useState([]);
    const [customInput, setCustomInput] = useState("");
    const [novelContext, setNovelContext] = useState({});
    const [plotState, setPlotState] = useState(null);
    const scrollRef = useRef(null);

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, loading]);

    // 1. Generate Settings
    const handleGenerateSettings = async () => {
        setLoading(true);
        try {
            const tagList = tags.split(/[,，\s]+/).filter(Boolean);
            const res = await fetch(`${API_BASE}/api/interactive/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tagList, tone, category, useDeepSeek: false }) // Default to Gemini for speed for now
            });
            const data = await res.json();
            if (data && data.title) {
                setSettings(data);
                setNovelContext({ settings: data });
            }
        } catch (e) {
            console.error(e);
            alert("生成設定失敗，請重試");
        } finally {
            setLoading(false);
        }
    };

    // 2. Start Game
    const handleStartGame = async () => {
        setLoading(true);
        setGameState('playing');
        try {
            const tagList = tags.split(/[,，\s]+/).filter(Boolean);
            const res = await fetch(`${API_BASE}/api/interactive/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings, tags: tagList, tone, useDeepSeek: false })
            });
            const data = await res.json();

            setHistory([{ content: data.content, type: 'story' }]);
            setCurrentOptions(data.options || []);
            setPlotState(data.plot_state);
        } catch (e) {
            console.error(e);
            setGameState('setup');
        } finally {
            setLoading(false);
        }
    };

    // 3. Make Choice (or Custom)
    const handleChoice = async (choiceText) => {
        if (!choiceText) return;

        // Add user choice to history immediately
        setHistory(prev => [...prev, { content: choiceText, type: 'choice' }]);
        setCustomInput("");
        setCurrentOptions([]); // Hide options while loading
        setLoading(true);

        try {
            const previousContent = history.filter(h => h.type === 'story').slice(-1)[0]?.content || "";

            const res = await fetch(`${API_BASE}/api/interactive/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    novelContext,
                    previousContent,
                    userChoice: choiceText,
                    lastPlotState: plotState,
                    tone,
                    useDeepSeek: false
                })
            });
            const data = await res.json();

            setHistory(prev => [...prev, { content: data.content, type: 'story' }]);
            setCurrentOptions(data.options || []);
            setPlotState(data.plot_state);
        } catch (e) {
            console.error(e);
            alert("生成失敗");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 max-w-4xl mx-auto">
            {/* Header */}
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur">
                <div className="flex items-center space-x-2">
                    <Gamepad2 className="text-purple-400" />
                    <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        互動小說
                    </h1>
                </div>
                {gameState === 'playing' && (
                    <button
                        onClick={() => setGameState('setup')}
                        className="text-xs text-slate-500 hover:text-slate-300"
                    >
                        重新開始
                    </button>
                )}
            </header>

            {/* Setup Mode */}
            {gameState === 'setup' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-fade-in">
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
                        <span>生成遊戲設定</span>
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
                                <span>開始遊戲</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Game Mode */}
            {gameState === 'playing' && (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Story Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
                    >
                        {history.map((item, idx) => (
                            <div key={idx} className={`animate-fade-in ${item.type === 'choice' ? 'flex justify-end' : ''}`}>
                                {item.type === 'story' ? (
                                    <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 max-w-none">
                                        <div className="whitespace-pre-wrap leading-relaxed text-base md:text-lg font-serif tracking-wide bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                                            {item.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-purple-600/20 border border-purple-500/30 text-purple-200 px-4 py-2 rounded-lg text-sm max-w-[80%]">
                                        {item.content}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center space-x-2 text-slate-500 animate-pulse">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs">正在推演劇情...</span>
                            </div>
                        )}
                    </div>

                    {/* Interaction Area (Fixed Bottom) */}
                    <div className="p-4 bg-slate-900/80 backdrop-blur border-t border-slate-800 safe-area-bottom">
                        {currentOptions.length > 0 && !loading && (
                            <div className="space-y-3 mb-4">
                                {currentOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleChoice(opt.label)}
                                        className="w-full text-left p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{opt.label}</span>
                                            {opt.type === 'Romance' && <span className="text-pink-400 text-xs px-2 py-0.5 bg-pink-900/30 rounded">CP向</span>}
                                            {opt.type === 'Aggressive' && <span className="text-red-400 text-xs px-2 py-0.5 bg-red-900/30 rounded">激進</span>}
                                            {opt.type === 'Logical' && <span className="text-blue-400 text-xs px-2 py-0.5 bg-blue-900/30 rounded">理智</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 relative z-10">{opt.hint}</div>
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
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 disabled:opacity-50"
                                onKeyDown={(e) => e.key === 'Enter' && handleChoice(customInput)}
                            />
                            <button
                                onClick={() => handleChoice(customInput)}
                                disabled={loading || !customInput}
                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
