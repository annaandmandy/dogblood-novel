import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Globe, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [novels, setNovels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNovels();
    }, []);

    const fetchNovels = async () => {
        try {
            const { data, error } = await supabase
                .from('novels')
                .select('*')
                .eq('owner_id', 'productive_v1')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNovels(data);
        } catch (error) {
            console.error('Error fetching novels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault(); // Prevent navigation
        if (!window.confirm('確定要刪除這本小說嗎？此操作無法復原。')) return;

        try {
            const { error } = await supabase.from('novels').delete().eq('id', id);
            if (error) throw error;
            setNovels(novels.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting novel:', error);
            alert('刪除失敗');
        }
    };

    const togglePublic = async (e, novel) => {
        e.preventDefault(); // Prevent navigation
        try {
            const { error } = await supabase
                .from('novels')
                .update({ is_public: !novel.is_public })
                .eq('id', novel.id);

            if (error) throw error;

            setNovels(novels.map(n =>
                n.id === novel.id ? { ...n, is_public: !novel.is_public } : n
            ));
        } catch (error) {
            console.error('Error updating visibility:', error);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500">載入中...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    我的書庫
                </h1>
                <Link to="/create" className="md:hidden p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20">
                    <Plus size={24} />
                </Link>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {novels.map((novel) => (
                    <Link key={novel.id} to={`/read/${novel.id}`} className="group relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] active:scale-95 bg-slate-900 border border-slate-800">
                        <div className={`absolute inset-0 ${novel.genre === 'BL' ? 'bg-violet-900' : 'bg-rose-900'} opacity-60 group-hover:opacity-80 transition-opacity`} />

                        {/* Actions Overlay */}
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                                onClick={(e) => togglePublic(e, novel)}
                                className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 text-white"
                                title={novel.is_public ? "設為私密" : "設為公開"}
                            >
                                {novel.is_public ? <Globe size={14} /> : <Lock size={14} />}
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, novel.id)}
                                className="p-1.5 bg-red-500/50 rounded-full hover:bg-red-500 text-white"
                                title="刪除"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit mb-2 backdrop-blur-sm border border-white/10 ${novel.genre === 'BL' ? 'bg-purple-500/20 text-purple-200' : 'bg-rose-500/20 text-rose-200'}`}>
                                {novel.genre}
                            </span>
                            <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{novel.title}</h3>
                            <p className="text-xs text-slate-300 line-clamp-2 opacity-80">{novel.summary || novel.settings?.trope}</p>
                        </div>
                    </Link>
                ))}

                {/* Empty State / Add New Placeholder */}
                <Link to="/create" className="flex flex-col items-center justify-center aspect-[2/3] rounded-xl border-2 border-dashed border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/50 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-3 group-hover:bg-purple-900/30 transition-colors border border-slate-800 group-hover:border-purple-500/30">
                        <Plus className="text-slate-500 group-hover:text-purple-400" />
                    </div>
                    <span className="text-sm text-slate-500 font-medium group-hover:text-purple-400 transition-colors">新建小說</span>
                </Link>
            </div>
        </div>
    );
}
