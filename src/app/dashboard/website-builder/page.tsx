'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiGlobe, FiSave, FiEye, FiPlus, FiTrash2, FiX, FiEdit3,
    FiCheck, FiSettings, FiRefreshCw, FiExternalLink, FiBook,
    FiAward, FiMail, FiPhone, FiMapPin, FiUpload, FiImage,
    FiAlignLeft, FiStar, FiGrid, FiRss, FiZap, FiToggleRight,
    FiToggleLeft, FiChevronRight, FiLayout, FiUsers, FiAirplay,
} from 'react-icons/fi';

type Tab = 'hero' | 'about' | 'academics' | 'achievements' | 'gallery' | 'news' | 'contact' | 'settings';

const TABS: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: 'hero',         label: 'Hero',         icon: FiAirplay,    color: '#6366f1' },
    { id: 'about',        label: 'About',         icon: FiBook,       color: '#10b981' },
    { id: 'academics',    label: 'Academics',     icon: FiLayout,     color: '#3b82f6' },
    { id: 'achievements', label: 'Achievements',  icon: FiAward,      color: '#f59e0b' },
    { id: 'gallery',      label: 'Gallery',       icon: FiImage,      color: '#ec4899' },
    { id: 'news',         label: 'News',          icon: FiAlignLeft,  color: '#8b5cf6' },
    { id: 'contact',      label: 'Contact',       icon: FiMail,       color: '#14b8a6' },
    { id: 'settings',     label: 'Settings',      icon: FiSettings,   color: '#64748b' },
];

const THEMES = [
    { name: 'Ocean',    primary: '#1d4ed8', secondary: '#0f172a' },
    { name: 'Emerald',  primary: '#059669', secondary: '#064e3b' },
    { name: 'Royal',    primary: '#7c3aed', secondary: '#1e1b4b' },
    { name: 'Crimson',  primary: '#dc2626', secondary: '#7f1d1d' },
    { name: 'Gold',     primary: '#d97706', secondary: '#451a03' },
    { name: 'Slate',    primary: '#334155', secondary: '#0f172a' },
];

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';
const sect = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4';

export default function WebsiteBuilderPage() {
    const [activeTab, setActiveTab] = useState<Tab>('hero');
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [config, setConfig] = useState<Record<string, any>>({});
    const [news, setNews] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [published, setPublished] = useState(false);
    const [newItem, setNewItem] = useState<any>({});
    const [showNewsModal, setShowNewsModal] = useState(false);
    const [editNewsId, setEditNewsId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [schoolRes, configRes, newsRes, formsRes] = await Promise.all([
            supabase.from('school_details').select('*').single(),
            supabase.from('school_website_config').select('*'),
            supabase.from('school_news').select('*').order('published_at', { ascending: false }),
            supabase.from('school_forms').select('id,form_name').order('form_name'),
        ]);
        setSchoolInfo(schoolRes.data || {});
        // Build config map: section -> parsed content JSON
        const map: Record<string, any> = {};
        for (const row of configRes.data || []) {
            try { map[row.section] = JSON.parse(row.content || '{}'); } catch { map[row.section] = {}; }
        }
        setConfig(map);
        setNews(newsRes.data || []);
        setForms(formsRes.data || []);
        setPublished(map['settings']?.published ?? true);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const saveSection = async (section: string, data: any) => {
        setSaving(true);
        const content = JSON.stringify(data);
        const { error } = await supabase.from('school_website_config').upsert(
            [{ section, content, updated_at: new Date().toISOString() }],
            { onConflict: 'section' }
        );
        if (error) toast.error(error.message);
        else { toast.success(`✅ ${section} saved!`); setConfig(prev => ({ ...prev, [section]: data })); }
        setSaving(false);
    };

    const updateSchool = async (fields: any) => {
        setSaving(true);
        const { error } = await supabase.from('school_details').update(fields).eq('id', schoolInfo.id);
        if (error) toast.error(error.message);
        else { toast.success('✅ School info updated!'); setSchoolInfo((p: any) => ({ ...p, ...fields })); }
        setSaving(false);
    };

    const set = (section: string, key: string, val: any) =>
        setConfig(prev => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: val } }));

    const saveNews = async () => {
        const payload = {
            title:       newItem.title || '',
            content:     newItem.content || '',
            excerpt:     newItem.excerpt || newItem.content?.slice(0, 120) || '',
            category:    newItem.category || 'News',
            is_published: newItem.is_published ?? true,
            author:      newItem.author || schoolInfo.school_name,
            image_url:   newItem.image_url || '',
            slug:        (newItem.title || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now(),
        };
        if (editNewsId) {
            await supabase.from('school_news').update(payload).eq('id', editNewsId);
            toast.success('News updated!');
        } else {
            await supabase.from('school_news').insert([payload]);
            toast.success('News published!');
        }
        setShowNewsModal(false); setNewItem({}); setEditNewsId(null); fetchAll();
    };

    const deleteNews = async (id: number) => {
        if (!confirm('Delete this news item?')) return;
        await supabase.from('school_news').delete().eq('id', id);
        toast.success('Deleted'); fetchAll();
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                    <FiGlobe className="absolute inset-0 m-auto text-indigo-500" size={18} />
                </div>
                <p className="text-sm font-semibold text-gray-500">Loading website builder…</p>
            </div>
        </div>
    );

    const renderTab = () => {
        const c = config[activeTab] || {};
        switch (activeTab) {
            // ─── HERO ───────────────────────────────────────────────────────────
            case 'hero': return (
                <div className="space-y-5">
                    <div className={sect}>
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiAirplay className="text-indigo-500" /> Hero Section</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className={lbl}>Hero Tagline</label>
                                <input className={inp} value={c.tagline || ''} onChange={e => set('hero', 'tagline', e.target.value)} placeholder="Nurturing tomorrow's leaders today..." /></div>
                            <div><label className={lbl}>Hero Layout</label>
                                <select className={inp} value={c.layout || 'fullwidth'} onChange={e => set('hero', 'layout', e.target.value)}>
                                    <option value="fullwidth">Full Width Gradient</option>
                                    <option value="split">Split (Text + Image)</option>
                                    <option value="minimal">Minimal Clean</option>
                                </select>
                            </div>
                            <div><label className={lbl}>CTA Button Text</label>
                                <input className={inp} value={c.cta || 'Apply for Admission'} onChange={e => set('hero', 'cta', e.target.value)} /></div>
                        </div>
                        <div><label className={lbl}>Choose Theme Palette</label>
                            <div className="flex gap-3 flex-wrap mt-1">
                                {THEMES.map(t => (
                                    <button key={t.name} onClick={() => set('hero', 'theme', t)}
                                        className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all ${c.theme?.name === t.name ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : ''}`}
                                        style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => saveSection('hero', c)} disabled={saving}
                            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                            <FiSave size={14} /> Save Hero Section
                        </button>
                    </div>
                </div>
            );

            // ─── ABOUT ──────────────────────────────────────────────────────────
            case 'about': return (
                <div className="space-y-5">
                    <div className={sect}>
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiBook className="text-emerald-500" /> About the School</h3>
                        <div><label className={lbl}>School History / Overview</label>
                            <textarea className={inp + ' h-28 resize-none'} value={c.history || ''} onChange={e => set('about', 'history', e.target.value)}
                                placeholder="Founded in..." /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={lbl}>Mission Statement</label>
                                <textarea className={inp + ' h-20 resize-none'} value={c.mission || ''} onChange={e => set('about', 'mission', e.target.value)} /></div>
                            <div><label className={lbl}>Vision Statement</label>
                                <textarea className={inp + ' h-20 resize-none'} value={c.vision || ''} onChange={e => set('about', 'vision', e.target.value)} /></div>
                        </div>
                        <div><label className={lbl}>Principal's Welcome Message</label>
                            <textarea className={inp + ' h-24 resize-none'} value={c.principal_msg || ''} onChange={e => set('about', 'principal_msg', e.target.value)} /></div>
                        <div><label className={lbl}>Core Values (comma separated)</label>
                            <input className={inp} value={c.values || ''} onChange={e => set('about', 'values', e.target.value)} placeholder="Integrity, Excellence, Teamwork, Innovation" /></div>
                        <button onClick={() => saveSection('about', c)} disabled={saving}
                            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#10b981,#065f46)' }}>
                            <FiSave size={14} /> Save About Section
                        </button>
                    </div>
                </div>
            );

            // ─── ACADEMICS ──────────────────────────────────────────────────────
            case 'academics': return (
                <div className={sect}>
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiBook className="text-blue-500" /> Academics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={lbl}>Curriculum</label>
                            <select className={inp} value={c.curriculum || 'CBC'} onChange={e => set('academics', 'curriculum', e.target.value)}>
                                <option>CBC</option><option>8-4-4</option><option>Both CBC & 8-4-4</option>
                            </select></div>
                        <div><label className={lbl}>School Type</label>
                            <select className={inp} value={c.type || 'Day'} onChange={e => set('academics', 'type', e.target.value)}>
                                <option>Day</option><option>Boarding</option><option>Day & Boarding</option>
                            </select></div>
                    </div>
                    <div><label className={lbl}>Classes / Forms Offered (auto from DB)</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {forms.map(f => <span key={f.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">{f.form_name}</span>)}
                        </div>
                    </div>
                    <div><label className={lbl}>Extra-Curricular Activities (comma separated)</label>
                        <input className={inp} value={c.extracurricular || ''} onChange={e => set('academics', 'extracurricular', e.target.value)}
                            placeholder="Football, Debate Club, Science Congress, Drama..." /></div>
                    <div><label className={lbl}>Mean KCSE Score (latest)</label>
                        <input type="number" step="0.1" className={inp} value={c.kcse_mean || ''} onChange={e => set('academics', 'kcse_mean', e.target.value)} placeholder="e.g. 7.2" /></div>
                    <button onClick={() => saveSection('academics', c)} disabled={saving}
                        className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                        <FiSave size={14} /> Save Academics
                    </button>
                </div>
            );

            // ─── ACHIEVEMENTS ────────────────────────────────────────────────────
            case 'achievements': return (
                <div className={sect}>
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiAward className="text-amber-500" /> Achievements</h3>
                    <div className="space-y-3">
                        {(c.items || []).map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="text-2xl">{item.icon || '🏆'}</span>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-800">{item.title}</p>
                                    <p className="text-xs text-gray-500">{item.year} · {item.desc}</p>
                                </div>
                                <button onClick={() => { const items = [...(c.items || [])]; items.splice(i, 1); set('achievements', 'items', items); }}
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><FiTrash2 size={13} /></button>
                            </div>
                        ))}
                        <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            {[['🏆', 'Icon'], ['', 'Year'], ['', 'Title'], ['', 'Description']].map(([def, ph], j) => (
                                <input key={j} className={inp} placeholder={ph}
                                    id={`ach-${j}`}
                                    defaultValue={def} />
                            ))}
                            <button onClick={() => {
                                const icon  = (document.getElementById('ach-0') as HTMLInputElement)?.value;
                                const year  = (document.getElementById('ach-1') as HTMLInputElement)?.value;
                                const title = (document.getElementById('ach-2') as HTMLInputElement)?.value;
                                const desc  = (document.getElementById('ach-3') as HTMLInputElement)?.value;
                                if (!title) return;
                                set('achievements', 'items', [...(c.items || []), { icon, year, title, desc }]);
                            }} className="col-span-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1">
                                <FiPlus size={12} /> Add Achievement
                            </button>
                        </div>
                    </div>
                    <button onClick={() => saveSection('achievements', c)} disabled={saving}
                        className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                        <FiSave size={14} /> Save Achievements
                    </button>
                </div>
            );

            // ─── NEWS ────────────────────────────────────────────────────────────
            case 'news': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-700">{news.length} news articles</p>
                        <button onClick={() => { setNewItem({}); setEditNewsId(null); setShowNewsModal(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-xl"
                            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
                            <FiPlus size={13} /> New Article
                        </button>
                    </div>
                    {news.map(n => (
                        <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg">
                                    {n.title?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{n.title}</p>
                                    <p className="text-[10px] text-gray-400">{n.category} · {new Date(n.published_at).toLocaleDateString('en-KE')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {n.is_published ? 'Published' : 'Draft'}
                                </span>
                                <button onClick={() => { setNewItem(n); setEditNewsId(n.id); setShowNewsModal(true); }}
                                    className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><FiEdit3 size={13} /></button>
                                <button onClick={() => deleteNews(n.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><FiTrash2 size={13} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            );

            // ─── CONTACT ─────────────────────────────────────────────────────────
            case 'contact': return (
                <div className={sect}>
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiMail className="text-teal-500" /> Contact Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={lbl}>Phone Number</label>
                            <input className={inp} value={schoolInfo.phone || ''} onChange={e => setSchoolInfo((p:any) => ({...p, phone: e.target.value}))} /></div>
                        <div><label className={lbl}>Email Address</label>
                            <input className={inp} value={schoolInfo.email || ''} onChange={e => setSchoolInfo((p:any) => ({...p, email: e.target.value}))} /></div>
                        <div className="col-span-2"><label className={lbl}>Physical Address</label>
                            <input className={inp} value={schoolInfo.address || ''} onChange={e => setSchoolInfo((p:any) => ({...p, address: e.target.value}))} /></div>
                        <div><label className={lbl}>Facebook URL</label>
                            <input className={inp} value={c.facebook || ''} onChange={e => set('contact', 'facebook', e.target.value)} placeholder="https://facebook.com/..." /></div>
                        <div><label className={lbl}>WhatsApp Number</label>
                            <input className={inp} value={c.whatsapp || ''} onChange={e => set('contact', 'whatsapp', e.target.value)} placeholder="2547XXXXXXXX" /></div>
                        <div className="col-span-2"><label className={lbl}>Google Maps Embed URL</label>
                            <input className={inp} value={c.maps_url || ''} onChange={e => set('contact', 'maps_url', e.target.value)} placeholder="https://maps.google.com/embed?..." /></div>
                    </div>
                    <button onClick={() => { saveSection('contact', c); updateSchool({ phone: schoolInfo.phone, email: schoolInfo.email, address: schoolInfo.address }); }} disabled={saving}
                        className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#14b8a6,#0f766e)' }}>
                        <FiSave size={14} /> Save Contact Info
                    </button>
                </div>
            );

            // ─── SETTINGS ────────────────────────────────────────────────────────
            case 'settings': return (
                <div className={sect}>
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiSettings className="text-slate-500" /> Website Settings</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                            <p className="font-bold text-sm text-gray-800">Public Website</p>
                            <p className="text-xs text-gray-500">When enabled, the website is visible at /school</p>
                        </div>
                        <button onClick={() => { const next = !published; setPublished(next); saveSection('settings', { ...c, published: next }); }}
                            className={`text-3xl transition-colors ${published ? 'text-emerald-500' : 'text-gray-300'}`}>
                            {published ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={lbl}>SEO Title</label>
                            <input className={inp} value={c.seo_title || schoolInfo.school_name || ''} onChange={e => set('settings', 'seo_title', e.target.value)} /></div>
                        <div><label className={lbl}>Google Analytics ID</label>
                            <input className={inp} value={c.ga_id || ''} onChange={e => set('settings', 'ga_id', e.target.value)} placeholder="G-XXXXXXXXXX" /></div>
                        <div><label className={lbl}>KNEC Code</label>
                            <input className={inp} value={schoolInfo.knec_code || ''} onChange={e => setSchoolInfo((p:any)=>({...p,knec_code:e.target.value}))} /></div>
                        <div><label className={lbl}>NEMIS Code</label>
                            <input className={inp} value={schoolInfo.nemis_code || ''} onChange={e => setSchoolInfo((p:any)=>({...p,nemis_code:e.target.value}))} /></div>
                        <div className="col-span-2"><label className={lbl}>SEO Meta Description</label>
                            <textarea className={inp + ' h-16 resize-none'} value={c.seo_desc || ''} onChange={e => set('settings', 'seo_desc', e.target.value)} /></div>
                    </div>
                    <button onClick={() => { saveSection('settings', { ...c, published }); updateSchool({ knec_code: schoolInfo.knec_code, nemis_code: schoolInfo.nemis_code }); }} disabled={saving}
                        className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#334155,#0f172a)' }}>
                        <FiSave size={14} /> Save Settings
                    </button>
                </div>
            );

            default: return <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Select a section to edit</div>;
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Premium Header ── */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #3b82f6 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">🌐 School Website Builder</h1>
                        <p className="text-blue-200 text-sm mt-0.5">
                            {schoolInfo.school_name || 'Your School'} · Build your public web presence
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link href="/school" target="_blank"
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                            <FiEye size={13} /> Preview Site
                        </Link>
                        <button onClick={fetchAll} className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition">
                            <FiRefreshCw size={14} />
                        </button>
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${published ? 'bg-emerald-500/80' : 'bg-gray-500/50'}`}>
                            <span className={`w-2 h-2 rounded-full ${published ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
                            {published ? 'Published' : 'Draft'}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-px border-t border-white/10">
                    {[
                        { label: 'School', val: schoolInfo.school_name || '—' },
                        { label: 'News Articles', val: news.length },
                        { label: 'Status', val: published ? 'Live ✅' : 'Draft' },
                    ].map((k, i) => (
                        <div key={i} className="bg-white/10 p-3 text-center">
                            <p className="text-blue-200 text-[10px] font-bold uppercase">{k.label}</p>
                            <p className="font-black text-sm mt-0.5 truncate text-white">{k.val}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="flex gap-4">
                {/* Sidebar Tabs */}
                <div className="w-48 flex-shrink-0 space-y-1">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all text-left ${activeTab === t.id ? 'text-white shadow-md' : 'text-gray-600 bg-white border border-gray-100 hover:bg-gray-50'}`}
                            style={activeTab === t.id ? { background: `linear-gradient(135deg, ${t.color}dd, ${t.color})` } : {}}>
                            <t.icon size={15} style={{ color: activeTab === t.id ? 'white' : t.color }} />
                            {t.label}
                            {activeTab === t.id && <FiChevronRight size={13} className="ml-auto" />}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">{renderTab()}</div>
            </div>

            {/* ── News Modal ── */}
            {showNewsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewsModal(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                            <h2 className="text-lg font-bold text-white">{editNewsId ? 'Edit Article' : 'New News Article'}</h2>
                            <button onClick={() => setShowNewsModal(false)} className="p-2 bg-white/20 rounded-xl text-white"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div><label className={lbl}>Title *</label>
                                <input className={inp} value={newItem.title || ''} onChange={e => setNewItem((p:any)=>({...p,title:e.target.value}))} /></div>
                            <div><label className={lbl}>Category</label>
                                <select className={inp} value={newItem.category || 'News'} onChange={e => setNewItem((p:any)=>({...p,category:e.target.value}))}>
                                    {['News','Events','Achievements','Sports','Academic','Cultural'].map(c => <option key={c}>{c}</option>)}
                                </select></div>
                            <div><label className={lbl}>Content</label>
                                <textarea className={inp + ' h-32 resize-none'} value={newItem.content || ''} onChange={e => setNewItem((p:any)=>({...p,content:e.target.value}))} /></div>
                            <div><label className={lbl}>Image URL (optional)</label>
                                <input className={inp} value={newItem.image_url || ''} onChange={e => setNewItem((p:any)=>({...p,image_url:e.target.value}))} placeholder="https://..." /></div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={newItem.is_published ?? true} onChange={e => setNewItem((p:any)=>({...p,is_published:e.target.checked}))} className="w-4 h-4" />
                                <label className="text-sm font-semibold text-gray-700">Publish immediately</label>
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">
                            <button onClick={() => setShowNewsModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={saveNews} className="px-6 py-2 text-sm font-bold text-white rounded-xl"
                                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
                                {editNewsId ? 'Update Article' : 'Publish Article'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
