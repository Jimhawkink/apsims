'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiTrash2, FiX, FiSearch, FiRefreshCw, FiEdit2,
    FiYoutube, FiEye, FiEyeOff, FiLink, FiCheck, FiAlertCircle,
    FiArrowLeft, FiVideo, FiSave, FiFilter
} from 'react-icons/fi';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LearningVideo {
    id: string;
    subject_id: string;
    subject_name: string;
    topic: string;
    form_level: string;
    curriculum: string;
    title: string;
    youtube_id: string | null;
    youtube_url: string | null;
    duration: string;
    channel: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    added_by_name: string | null;
    created_at: string;
    thumbnail_url?: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SUBJECTS = [
    { id: 'mathematics',  name: 'Mathematics',      icon: '📐' },
    { id: 'biology',      name: 'Biology',           icon: '🧬' },
    { id: 'chemistry',    name: 'Chemistry',         icon: '⚗️' },
    { id: 'physics',      name: 'Physics',           icon: '⚡' },
    { id: 'english',      name: 'English',           icon: '📖' },
    { id: 'kiswahili',    name: 'Kiswahili',         icon: '🇰🇪' },
    { id: 'geography',    name: 'Geography',         icon: '🌍' },
    { id: 'history',      name: 'History & Govt',    icon: '🏛️' },
    { id: 'cre',          name: 'CRE',               icon: '✝️' },
    { id: 'agriculture',  name: 'Agriculture',       icon: '🌱' },
    { id: 'business',     name: 'Business Studies',  icon: '💼' },
    { id: 'homescience',  name: 'Home Science',      icon: '🏠' },
    { id: 'ict',          name: 'ICT / Computer',    icon: '💻' },
    { id: 'intg_science', name: 'Integrated Science',icon: '🔬' },
    { id: 'social_studies',name:'Social Studies',    icon: '🗺️' },
    { id: 'creative_arts',name: 'Creative Arts',     icon: '🎨' },
];
const FORMS    = ['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','Form 1','Form 2','Form 3','Form 4'];
const CURRICULA = ['8-4-4','CBC','Both'];

// ─── YouTube ID Extractor ─────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    // Handle plain IDs (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /v=([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ─── Empty Form ───────────────────────────────────────────────────────────────
const emptyForm = {
    subject_id: 'mathematics', subject_name: 'Mathematics', topic: '',
    form_level: 'Form 1', curriculum: '8-4-4', title: '', youtube_url: '',
    duration: '', channel: '', description: '', is_active: true, sort_order: 0,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManageVideosPage() {
    const [videos,    setVideos]    = useState<LearningVideo[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState<LearningVideo | null>(null);
    const [form,      setForm]      = useState(emptyForm);
    const [saving,    setSaving]    = useState(false);
    const [search,    setSearch]    = useState('');
    const [filterSub, setFilterSub] = useState('');
    const [filterForm,setFilterForm]= useState('');
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [thumbStatus, setThumbStatus] = useState<'idle'|'ok'|'fail'>('idle');

    // Derived YouTube ID from form URL
    const derivedId = extractYouTubeId(form.youtube_url);
    const thumbUrl  = derivedId ? `https://img.youtube.com/vi/${derivedId}/hqdefault.jpg` : null;

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('learning_videos')
            .select('*')
            .order('subject_id').order('form_level').order('sort_order');
        if (error) { toast.error('Failed to load videos'); }
        else setVideos(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // When editing an existing video, populate form
    function openEdit(v: LearningVideo) {
        setEditing(v);
        setForm({
            subject_id: v.subject_id, subject_name: v.subject_name, topic: v.topic,
            form_level: v.form_level, curriculum: v.curriculum, title: v.title,
            youtube_url: v.youtube_id ? `https://www.youtube.com/watch?v=${v.youtube_id}` : (v.youtube_url || ''),
            duration: v.duration, channel: v.channel, description: v.description || '',
            is_active: v.is_active, sort_order: v.sort_order,
        });
        setThumbStatus('idle');
        setShowModal(true);
    }

    function openAdd() {
        setEditing(null);
        setForm(emptyForm);
        setThumbStatus('idle');
        setShowModal(true);
    }

    function closeModal() { setShowModal(false); setEditing(null); }

    async function handleSave() {
        if (!form.title.trim()) return toast.error('Title is required');
        if (!form.topic.trim()) return toast.error('Topic is required');
        setSaving(true);

        const ytId = extractYouTubeId(form.youtube_url);
        const payload = {
            subject_id:    form.subject_id,
            subject_name:  SUBJECTS.find(s => s.id === form.subject_id)?.name || form.subject_id,
            topic:         form.topic.trim(),
            form_level:    form.form_level,
            curriculum:    form.curriculum,
            title:         form.title.trim(),
            youtube_id:    ytId || null,
            youtube_url:   form.youtube_url.trim() || null,
            duration:      form.duration.trim() || '00:00',
            channel:       form.channel.trim() || 'Custom',
            description:   form.description.trim() || null,
            is_active:     form.is_active,
            sort_order:    Number(form.sort_order) || 0,
        };

        let err;
        if (editing) {
            ({ error: err } = await supabase.from('learning_videos').update(payload).eq('id', editing.id));
        } else {
            ({ error: err } = await supabase.from('learning_videos').insert(payload));
        }

        if (err) toast.error(err.message);
        else {
            toast.success(editing ? 'Video updated!' : 'Video added!');
            closeModal();
            load();
        }
        setSaving(false);
    }

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        const { error } = await supabase.from('learning_videos').delete().eq('id', id);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); load(); }
    }

    async function toggleActive(v: LearningVideo) {
        const { error } = await supabase.from('learning_videos').update({ is_active: !v.is_active }).eq('id', v.id);
        if (error) toast.error(error.message);
        else load();
    }

    // Filtered list
    const filtered = videos.filter(v => {
        const q = search.toLowerCase();
        const matchQ = !q || v.title.toLowerCase().includes(q) || v.topic.toLowerCase().includes(q) || v.subject_name.toLowerCase().includes(q);
        const matchS = !filterSub  || v.subject_id === filterSub;
        const matchF = !filterForm || v.form_level === filterForm;
        return matchQ && matchS && matchF;
    });

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)' }}>

            {/* ── Header ── */}
            <div style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5,#6d28d9)', padding: '24px 32px' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/learning"
                            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
                            <FiArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-white font-black text-2xl flex items-center gap-2">
                                <FiVideo /> Video Library Manager
                            </h1>
                            <p className="text-white/60 text-sm mt-0.5">
                                Super Admin · Add, edit & manage all learning videos for 8-4-4 & CBC
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/80 bg-white/10 hover:bg-white/20 transition-all text-sm font-bold">
                            <FiRefreshCw size={14} /> Refresh
                        </button>
                        <button onClick={openAdd}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-sm transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
                            <FiPlus size={16} /> Add Video
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-4 mt-5 flex-wrap">
                    {[
                        { label: 'Total Videos', value: videos.length, color: '#818cf8' },
                        { label: 'Active',        value: videos.filter(v=>v.is_active).length, color: '#10b981' },
                        { label: 'Inactive',      value: videos.filter(v=>!v.is_active).length, color: '#f59e0b' },
                        { label: 'Subjects',      value: new Set(videos.map(v=>v.subject_id)).size, color: '#06b6d4' },
                    ].map(s => (
                        <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 text-center" style={{ minWidth: 100 }}>
                            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-white/60 text-xs font-semibold mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="px-8 py-4 flex gap-3 flex-wrap items-center" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="relative flex-1 min-w-48">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                    <input value={search} onChange={e=>setSearch(e.target.value)}
                        placeholder="Search videos, topics, subjects…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-white text-sm font-medium outline-none"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <select value={filterSub} onChange={e=>setFilterSub(e.target.value)}
                    className="px-3 py-2 rounded-xl text-white text-sm font-semibold outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">All Subjects</option>
                    {SUBJECTS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
                <select value={filterForm} onChange={e=>setFilterForm(e.target.value)}
                    className="px-3 py-2 rounded-xl text-white text-sm font-semibold outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">All Forms/Grades</option>
                    {FORMS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                <span className="text-white/40 text-xs font-semibold">{filtered.length} videos</span>
            </div>

            {/* ── Table ── */}
            <div className="px-8 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24">
                        <FiVideo size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/50 font-semibold">No videos found</p>
                        <button onClick={openAdd} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                            + Add First Video
                        </button>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    {['Thumbnail','Title & Topic','Subject','Form/Grade','Curriculum','Status','Actions'].map(h=>(
                                        <th key={h} className="px-4 py-3 text-left text-xs font-black text-white/50 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((v, i) => {
                                    const thumb = v.youtube_id ? `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg` : null;
                                    const sub = SUBJECTS.find(s=>s.id===v.subject_id);
                                    return (
                                        <tr key={v.id}
                                            style={{ background: i%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderTop: '1px solid rgba(255,255,255,0.04)' }}
                                            className="hover:bg-white/5 transition-all">
                                            {/* Thumbnail */}
                                            <td className="px-4 py-3">
                                                <div className="w-20 h-12 rounded-lg overflow-hidden flex-shrink-0"
                                                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                                    onClick={() => v.youtube_id && setPreviewId(v.youtube_id)}>
                                                    {thumb ? (
                                                        <img src={thumb} alt={v.title}
                                                            className="w-full h-full object-cover"
                                                            onError={e=>(e.currentTarget.style.display='none')} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-lg">
                                                            {sub?.icon || '🎬'}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Title */}
                                            <td className="px-4 py-3 max-w-xs">
                                                <p className="text-white font-bold text-sm truncate">{v.title}</p>
                                                <p className="text-white/40 text-xs mt-0.5 truncate">{v.topic}</p>
                                                {v.youtube_id && (
                                                    <a href={`https://youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-indigo-400 text-xs flex items-center gap-1 mt-1 hover:text-indigo-300">
                                                        <FiYoutube size={10} /> {v.youtube_id}
                                                    </a>
                                                )}
                                            </td>
                                            {/* Subject */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-white/80">{sub?.icon} {v.subject_name}</span>
                                            </td>
                                            {/* Form */}
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-500/20">{v.form_level}</span>
                                            </td>
                                            {/* Curriculum */}
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-lg text-xs font-bold"
                                                    style={{ background: v.curriculum==='CBC' ? '#065f4620' : v.curriculum==='8-4-4' ? '#1d4ed820' : '#7c3aed20',
                                                             color:      v.curriculum==='CBC' ? '#10b981'   : v.curriculum==='8-4-4' ? '#60a5fa'   : '#a78bfa' }}>
                                                    {v.curriculum}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <button onClick={()=>toggleActive(v)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: v.is_active ? '#10b98120' : '#ef444420',
                                                             color:      v.is_active ? '#10b981'   : '#ef4444' }}>
                                                    {v.is_active ? <FiEye size={10}/> : <FiEyeOff size={10}/>}
                                                    {v.is_active ? 'Active' : 'Hidden'}
                                                </button>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {v.youtube_id && (
                                                        <button onClick={()=>setPreviewId(v.youtube_id)}
                                                            className="p-1.5 rounded-lg text-white/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                                                            <FiEye size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={()=>openEdit(v)}
                                                        className="p-1.5 rounded-lg text-white/50 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button onClick={()=>handleDelete(v.id, v.title)}
                                                        className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Preview Modal ── */}
            {previewId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}
                    onClick={()=>setPreviewId(null)}>
                    <div className="w-full max-w-3xl rounded-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                            <span className="text-white font-bold text-sm flex items-center gap-2"><FiYoutube className="text-red-500"/>Video Preview</span>
                            <button onClick={()=>setPreviewId(null)} className="text-white/60 hover:text-white"><FiX size={18}/></button>
                        </div>
                        <div style={{ position:'relative', paddingBottom:'56.25%', background:'#000' }}>
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${previewId}?autoplay=1&rel=0`}
                                title="Preview"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
                    style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
                    onClick={closeModal}>
                    <div className="w-full max-w-2xl my-8 rounded-2xl overflow-hidden shadow-2xl"
                        style={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={e=>e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5"
                            style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5)' }}>
                            <div>
                                <h2 className="text-white font-black text-lg">{editing ? '✏️ Edit Video' : '➕ Add New Video'}</h2>
                                <p className="text-white/60 text-xs mt-0.5">Paste any YouTube URL or video ID</p>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Form body */}
                        <div className="px-6 py-6 space-y-5">

                            {/* YouTube URL + thumbnail preview */}
                            <div>
                                <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">YouTube URL or Video ID *</label>
                                <div className="relative">
                                    <FiYoutube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
                                    <input
                                        value={form.youtube_url}
                                        onChange={e => { setForm(f=>({...f, youtube_url:e.target.value})); setThumbStatus('idle'); }}
                                        placeholder="https://youtube.com/watch?v=... or just the video ID"
                                        className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                                </div>
                                {/* Thumbnail preview */}
                                {derivedId && (
                                    <div className="mt-3 flex items-center gap-4 p-3 rounded-xl" style={{ background:'rgba(255,255,255,0.05)' }}>
                                        <div className="w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                                            <img src={`https://img.youtube.com/vi/${derivedId}/mqdefault.jpg`}
                                                alt="thumb"
                                                className="w-full h-full object-cover"
                                                onLoad={()=>setThumbStatus('ok')}
                                                onError={()=>setThumbStatus('fail')} />
                                        </div>
                                        <div>
                                            {thumbStatus === 'ok'   && <p className="text-green-400 text-xs font-bold flex items-center gap-1"><FiCheck size={12}/> Valid video — thumbnail loaded</p>}
                                            {thumbStatus === 'fail' && <p className="text-amber-400 text-xs font-bold flex items-center gap-1"><FiAlertCircle size={12}/> Thumbnail not found — check ID</p>}
                                            <p className="text-white/40 text-xs mt-1">ID: <code className="text-indigo-300">{derivedId}</code></p>
                                            <a href={`https://youtube.com/watch?v=${derivedId}`} target="_blank" rel="noopener noreferrer"
                                                className="text-indigo-400 text-xs flex items-center gap-1 mt-1 hover:underline">
                                                <FiLink size={10}/> Open on YouTube
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Video Title *</label>
                                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                                    placeholder="e.g. Natural Numbers - Introduction & Number Line"
                                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                    style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                            </div>

                            {/* Row: Subject + Topic */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Subject *</label>
                                    <select value={form.subject_id}
                                        onChange={e => {
                                            const sub = SUBJECTS.find(s=>s.id===e.target.value);
                                            setForm(f=>({...f, subject_id:e.target.value, subject_name: sub?.name||e.target.value}));
                                        }}
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
                                        {SUBJECTS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Topic / Chapter *</label>
                                    <input value={form.topic} onChange={e=>setForm(f=>({...f,topic:e.target.value}))}
                                        placeholder="e.g. Fractions & Decimals"
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                                </div>
                            </div>

                            {/* Row: Form + Curriculum */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Form / Grade Level</label>
                                    <select value={form.form_level} onChange={e=>setForm(f=>({...f,form_level:e.target.value}))}
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
                                        {FORMS.map(f=><option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Curriculum</label>
                                    <select value={form.curriculum} onChange={e=>setForm(f=>({...f,curriculum:e.target.value}))}
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
                                        {CURRICULA.map(c=><option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Row: Duration + Channel + Order */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Duration</label>
                                    <input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}
                                        placeholder="e.g. 18:30"
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                                </div>
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Channel Name</label>
                                    <input value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}
                                        placeholder="e.g. Edu TV Kenya"
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                                </div>
                                <div>
                                    <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Sort Order</label>
                                    <input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:Number(e.target.value)}))}
                                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                                        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1.5 block">Description (optional)</label>
                                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                                    placeholder="Brief description of what this video covers…"
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                                    style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3">
                                <button onClick={()=>setForm(f=>({...f,is_active:!f.is_active}))}
                                    className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                                    style={{ background: form.is_active ? '#10b981' : 'rgba(255,255,255,0.15)' }}>
                                    <span className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                                        style={{ left: form.is_active ? '26px' : '2px' }} />
                                </button>
                                <span className="text-white/70 text-sm font-semibold">
                                    {form.is_active ? 'Active — visible to students' : 'Hidden — not shown in learning module'}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-white/70 font-bold text-sm hover:bg-white/5 transition-all"
                                    style={{ border:'1px solid rgba(255,255,255,0.12)' }}>
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-3 rounded-xl text-white font-black text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                                    style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', opacity: saving?0.7:1 }}>
                                    {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</>
                                            : <><FiSave size={14}/> {editing ? 'Save Changes' : 'Add Video'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
