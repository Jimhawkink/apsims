'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiZap,
    FiSearch, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';

// ── Kenyan school vote head categories ──────────────────────────────
// Vote heads are fee CATEGORIES — amounts are set in Fee Structure separately
const VOTE_HEAD_CATEGORIES = [
    { value: 'TUITION',    label: 'Tuition',          color: '#6366f1', bg: '#eef2ff' },
    { value: 'BOARDING',   label: 'Boarding',          color: '#0891b2', bg: '#ecfeff' },
    { value: 'LUNCH',      label: 'Lunch Program',     color: '#10b981', bg: '#f0fdf4' },
    { value: 'EXAM',       label: 'Exam Levies',       color: '#f59e0b', bg: '#fffbeb' },
    { value: 'ACTIVITY',   label: 'Activity / Sports', color: '#8b5cf6', bg: '#f5f3ff' },
    { value: 'DEVELOPMENT',label: 'Development',       color: '#ef4444', bg: '#fef2f2' },
    { value: 'MEDICAL',    label: 'Medical',           color: '#ec4899', bg: '#fdf2f8' },
    { value: 'TRANSPORT',  label: 'Transport',         color: '#f97316', bg: '#fff7ed' },
    { value: 'LIBRARY',    label: 'Library',           color: '#14b8a6', bg: '#f0fdfa' },
    { value: 'ICT',        label: 'Computer / ICT',    color: '#3b82f6', bg: '#eff6ff' },
    { value: 'UNIFORM',    label: 'Uniform',           color: '#84cc16', bg: '#f7fee7' },
    { value: 'ARREARS',    label: 'Arrears',           color: '#dc2626', bg: '#fef2f2' },
    { value: 'BURSARY',    label: 'Bursary Credit',    color: '#059669', bg: '#ecfdf5' },
    { value: 'OTHER',      label: 'Other',             color: '#6b7280', bg: '#f9fafb' },
];

const COLORS = [
    '#6366f1','#0891b2','#10b981','#f59e0b','#8b5cf6',
    '#ef4444','#ec4899','#f97316','#14b8a6','#3b82f6',
    '#84cc16','#dc2626','#059669','#e11d48','#7c3aed',
    '#0284c7','#d97706','#16a34a','#9333ea','#0e7490',
];

interface VoteHead {
    id: number;
    code: string;
    name: string;
    category: string;
    priority: number;
    sort_order: number;
    is_active: boolean;
    description: string | null;
    color: string | null;
    created_at: string;
}

const EMPTY: Omit<VoteHead,'id'|'created_at'> = {
    code: '', name: '', category: 'TUITION',
    priority: 1, sort_order: 1,
    is_active: true, description: '', color: '#6366f1',
};

export default function VoteHeadsPage() {
    const [heads, setHeads]         = useState<VoteHead[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId]       = useState<number | null>(null);
    const [form, setForm]           = useState({ ...EMPTY });
    const [saving, setSaving]       = useState(false);
    const [deleteId, setDeleteId]   = useState<number | null>(null);

    // ── Fetch ────────────────────────────────────────────────────────
    const fetchHeads = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('school_vote_heads')
            .select('*')
            .order('priority', { ascending: true })
            .order('name');
        if (!error) setHeads(data || []);
        else toast.error('Failed to load vote heads');
        setLoading(false);
    }, []);

    useEffect(() => { fetchHeads(); }, [fetchHeads]);

    // ── Open Add Modal ───────────────────────────────────────────────
    const openAdd = () => {
        setEditId(null);
        const nextPriority = heads.length > 0 ? Math.max(...heads.map(h => h.priority)) + 1 : 1;
        setForm({ ...EMPTY, priority: nextPriority, sort_order: nextPriority });
        setShowModal(true);
    };

    // ── Open Edit Modal ──────────────────────────────────────────────
    const openEdit = (h: VoteHead) => {
        setEditId(h.id);
        setForm({
            code: h.code, name: h.name, category: h.category,
            priority: h.priority ?? 99, sort_order: h.sort_order ?? 99,
            is_active: h.is_active, description: h.description || '',
            color: h.color || '#6366f1',
        });
        setShowModal(true);
    };

    // ── Save (Add or Edit) ───────────────────────────────────────────
    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Vote head name is required'); return; }
        setSaving(true);
        const code = form.code.trim()
            ? form.code.trim().toUpperCase().replace(/\s+/g, '_')
            : form.name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        const payload = {
            code,
            name:        form.name.trim(),
            category:    form.category,
            priority:    Number(form.priority) || 99,
            sort_order:  Number(form.priority) || 99,
            is_active:   form.is_active,
            description: form.description?.trim() || null,
            color:       form.color || '#6366f1',
            updated_at:  new Date().toISOString(),
        };

        let error;
        if (editId) {
            ({ error } = await supabase.from('school_vote_heads').update(payload).eq('id', editId));
        } else {
            ({ error } = await supabase.from('school_vote_heads').insert([{ ...payload, created_at: new Date().toISOString() }]));
        }

        if (error) {
            toast.error('Save failed: ' + error.message);
        } else {
            toast.success(editId ? 'Vote head updated ✅' : 'Vote head added ✅');
            setShowModal(false);
            fetchHeads();
        }
        setSaving(false);
    };

    // ── Delete ───────────────────────────────────────────────────────
    const handleDelete = async (id: number) => {
        const { error } = await supabase.from('school_vote_heads').delete().eq('id', id);
        if (error) toast.error('Delete failed: ' + error.message);
        else { toast.success('Vote head deleted'); setDeleteId(null); fetchHeads(); }
    };

    // ── Toggle Active ────────────────────────────────────────────────
    const toggleActive = async (h: VoteHead) => {
        await supabase.from('school_vote_heads').update({ is_active: !h.is_active }).eq('id', h.id);
        fetchHeads();
    };

    const filtered = heads.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.code.toLowerCase().includes(search.toLowerCase())
    );

    const getCat = (val: string) => VOTE_HEAD_CATEGORIES.find(c => c.value === val) || VOTE_HEAD_CATEGORIES[VOTE_HEAD_CATEGORIES.length - 1];

    // ── LOADING ──────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Vote Heads...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiZap className="text-amber-500" /> Vote Heads Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage fee categories (Vote Heads) — set priority for auto-distribution on payment
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchHeads}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={openAdd}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all">
                        <FiPlus size={16} /> Add Vote Head
                    </button>
                </div>
            </div>

            {/* ── STATS ROW ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Vote Heads', value: heads.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                    { label: 'Active', value: heads.filter(h => h.is_active).length, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                    { label: 'Inactive', value: heads.filter(h => !h.is_active).length, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
                    { label: 'Highest Priority', value: heads.length > 0 ? `#${Math.min(...heads.map(h => h.priority))}` : '—', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
                ].map((s, i) => (
                    <div key={i} className={`${s.bg} ${s.border} border rounded-2xl p-4`}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── IMPORTANT NOTE ── */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-start gap-3">
                <FiAlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                <div>
                    <p className="font-bold text-blue-800 text-sm">How Vote Heads work in APSIMS</p>
                    <p className="text-blue-600 text-xs mt-0.5">
                        Vote heads are fee <strong>categories</strong> only — no amounts here. Set amounts in <strong>Fee Structure</strong>.
                        Priority determines order of auto-distribution when a student pays.
                        <strong> Priority 1 = paid first</strong> (e.g. ARREARS), Priority 2 = second, etc.
                    </p>
                </div>
            </div>

            {/* ── SEARCH ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search vote heads..."
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-400 outline-none" />
                    </div>
                    <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} vote heads</span>
                </div>

                {/* ── VOTE HEADS LIST ── */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FiZap className="text-amber-500" size={28} />
                        </div>
                        <p className="text-gray-700 font-bold text-lg">No vote heads yet</p>
                        <p className="text-gray-400 text-sm mt-1">Click "Add Vote Head" to create your first one</p>
                        <button onClick={openAdd}
                            className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/25">
                            <FiPlus size={14} className="inline mr-1" /> Add Vote Head
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((h, idx) => {
                            const cat = getCat(h.category);
                            return (
                                <div key={h.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md ${h.is_active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50 opacity-60'}`}>

                                    {/* Priority Badge */}
                                    <div className="flex-shrink-0 text-center">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md"
                                            style={{ background: `linear-gradient(135deg, ${h.color || '#6366f1'}, ${h.color || '#6366f1'}cc)` }}>
                                            {h.priority}
                                        </div>
                                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wide">PRIORITY</p>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-black text-gray-800 text-base">{h.name}</span>
                                            <code className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 border border-gray-200">{h.code}</code>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg border"
                                                style={{ background: cat.bg, color: cat.color, borderColor: cat.color + '40' }}>
                                                {cat.label}
                                            </span>
                                            {!h.is_active && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-400">Inactive</span>
                                            )}
                                        </div>
                                        {h.description && (
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{h.description}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => toggleActive(h)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${h.is_active ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'}`}>
                                            {h.is_active ? <><FiCheck size={11} className="inline mr-1" />Active</> : 'Inactive'}
                                        </button>
                                        <button onClick={() => openEdit(h)}
                                            className="p-2 rounded-xl bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100 transition-all">
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button onClick={() => setDeleteId(h.id)}
                                            className="p-2 rounded-xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─────────────── ADD / EDIT MODAL ─────────────── */}
            {showModal && (
                <div onClick={() => setShowModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()}
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black flex items-center gap-2">
                                        <FiZap size={20} /> {editId ? 'Edit Vote Head' : 'Add New Vote Head'}
                                    </h3>
                                    <p className="text-amber-100 text-xs mt-1">
                                        {editId ? 'Update vote head details' : 'Create a new fee category for this school'}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)}
                                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all">
                                    <FiX size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body — scrollable */}
                        <div className="p-6 space-y-5 overflow-y-auto flex-1">

                            {/* ⚡ Priority — tap − / + to change */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200">
                                <label className="text-xs font-black text-rose-700 uppercase tracking-wider block mb-1">
                                    ⚡ Auto-Distribution Priority
                                </label>
                                <p className="text-xs text-rose-500 mb-3">
                                    Lower number = collected <strong>first</strong>. Tap − / + or type a number.
                                </p>
                                {/* Stepper */}
                                <div className="flex items-center gap-3 mb-3">
                                    <button type="button"
                                        onClick={() => setForm(f => ({ ...f, priority: Math.max(1, f.priority - 1) }))}
                                        className="w-12 h-12 rounded-xl bg-rose-500 text-white text-2xl font-black flex items-center justify-center hover:bg-rose-600 transition-all shadow-md">
                                        −
                                    </button>
                                    <input type="number" min={1} max={999}
                                        value={form.priority}
                                        onChange={e => setForm(f => ({ ...f, priority: Math.max(1, Number(e.target.value) || 1) }))}
                                        className="w-24 text-center text-3xl font-black border-2 border-rose-400 rounded-xl py-3 outline-none focus:border-rose-600 bg-white text-rose-600" />
                                    <button type="button"
                                        onClick={() => setForm(f => ({ ...f, priority: f.priority + 1 }))}
                                        className="w-12 h-12 rounded-xl bg-rose-500 text-white text-2xl font-black flex items-center justify-center hover:bg-rose-600 transition-all shadow-md">
                                        +
                                    </button>
                                    <div className="flex-1 text-xs text-rose-700 leading-relaxed">
                                        <strong>Priority 1</strong> → paid first (e.g. ARREARS)<br />
                                        <strong>Priority 2</strong> → paid second (e.g. Tuition/BES)<br />
                                        <strong>Priority 99</strong> → paid last / optional
                                    </div>
                                </div>
                                {/* Quick presets */}
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { label: '1 — ARREARS', val: 1, color: '#dc2626' },
                                        { label: '2 — Tuition', val: 2, color: '#6366f1' },
                                        { label: '3 — Boarding', val: 3, color: '#0891b2' },
                                        { label: '4 — Activity', val: 4, color: '#10b981' },
                                        { label: '5 — Exam', val: 5, color: '#f59e0b' },
                                        { label: '99 — Optional', val: 99, color: '#6b7280' },
                                    ].map(p => (
                                        <button key={p.val} type="button"
                                            onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all"
                                            style={{
                                                borderColor: form.priority === p.val ? p.color : '#fecdd3',
                                                background:  form.priority === p.val ? p.color : '#fff5f5',
                                                color:       form.priority === p.val ? '#fff' : p.color,
                                            }}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            {/* Name + Code */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                                        Vote Head Name *
                                    </label>
                                    <input value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Tuition, BES, ARREARS"
                                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                                        Code (auto-generated)
                                    </label>
                                    <input value={form.code}
                                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g,'_') }))}
                                        placeholder="e.g. TUITION"
                                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none font-mono font-bold tracking-wide" />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                                    Category Type
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {VOTE_HEAD_CATEGORIES.slice(0, 12).map(c => (
                                        <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value, color: c.color }))}
                                            className="px-2 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                                            style={{
                                                borderColor: form.category === c.value ? c.color : '#e5e7eb',
                                                background:  form.category === c.value ? c.bg : '#fff',
                                                color:       form.category === c.value ? c.color : '#6b7280',
                                            }}>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color picker */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                                    Colour (for receipts & reports)
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                                            className="w-8 h-8 rounded-lg border-2 transition-all flex-shrink-0"
                                            style={{
                                                background:   c,
                                                borderColor:  form.color === c ? '#1e293b' : 'transparent',
                                                transform:    form.color === c ? 'scale(1.2)' : 'scale(1)',
                                            }} />
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                                    Description (optional)
                                </label>
                                <textarea value={form.description || ''}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2} placeholder="Brief description of this vote head..."
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none resize-none" />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div>
                                    <p className="text-sm font-bold text-gray-700">Active</p>
                                    <p className="text-xs text-gray-400">Inactive vote heads are hidden from payment collection</p>
                                </div>
                                <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`relative w-12 h-6 rounded-full transition-all ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                {saving
                                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                    : <><FiCheck size={16} /> {editId ? 'Update Vote Head' : 'Save Vote Head'}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────── DELETE CONFIRM ─────────────── */}
            {deleteId && (
                <div onClick={() => setDeleteId(null)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()}
                        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FiTrash2 className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 text-center">Delete Vote Head?</h3>
                        <p className="text-sm text-gray-500 text-center mt-2">
                            This will remove the vote head and cannot be undone. Existing payment allocations will remain.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteId(null)}
                                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteId)}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm shadow-lg shadow-red-500/25">
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
