'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiZap,
    FiSearch, FiRefreshCw, FiGrid, FiCopy, FiPrinter,
    FiSave, FiAlertTriangle, FiChevronDown,
} from 'react-icons/fi';

interface VoteHead {
    id: number; code: string; name: string; category: string;
    priority: number; is_active: boolean; description: string | null; color: string | null;
}
interface SchoolForm { id: number; form_name: string; }
interface Term { id: number; term_name: string; }
type MatrixState = Record<number, Record<number, { dbId: number | null; amount: string; dirty: boolean }>>;

const COLORS = [
    '#6366f1','#0891b2','#10b981','#f59e0b','#8b5cf6',
    '#ef4444','#ec4899','#f97316','#14b8a6','#3b82f6',
    '#84cc16','#dc2626','#059669','#e11d48','#7c3aed',
];
const EMPTY_VH = { code:'', name:'', category:'TUITION', priority:2, is_active:true, description:'', color:'#6366f1' };
const fmtKes = (n: number) => `KES ${n.toLocaleString()}`;

export default function VoteHeadsPage() {
    const [tab, setTab] = useState<'heads'|'matrix'>('heads');

    /* ── VOTE HEADS state ─────────────────────────────────────────── */
    const [heads, setHeads]           = useState<VoteHead[]>([]);
    const [loadingHeads, setLoadingHeads] = useState(true);
    const [search, setSearch]         = useState('');
    const [showModal, setShowModal]   = useState(false);
    const [editId, setEditId]         = useState<number|null>(null);
    const [formVH, setFormVH]         = useState({ ...EMPTY_VH });
    const [saving, setSaving]         = useState(false);
    const [deleteId, setDeleteId]     = useState<number|null>(null);

    /* ── MATRIX state ─────────────────────────────────────────────── */
    const [forms, setForms]             = useState<SchoolForm[]>([]);
    const [terms, setTerms]             = useState<Term[]>([]);
    const [selForm, setSelForm]         = useState<number|''>('');
    const [selYear, setSelYear]         = useState<number>(new Date().getFullYear());
    const [matrix, setMatrix]           = useState<MatrixState>({});
    const [loadingMatrix, setLoadingMatrix] = useState(false);
    const [savingMatrix, setSavingMatrix]   = useState(false);
    const [copyFromForm, setCopyFromForm]   = useState<number|''>('');
    const [showCopyModal, setShowCopyModal] = useState(false);

    const hasDirty = Object.values(matrix).some(row => Object.values(row).some(c => c.dirty));

    /* ── Fetch vote heads ─────────────────────────────────────────── */
    const fetchHeads = useCallback(async () => {
        setLoadingHeads(true);
        const { data, error } = await supabase.from('school_vote_heads')
            .select('*').order('priority').order('name');
        if (!error) setHeads(data || []);
        else toast.error('Failed to load vote heads');
        setLoadingHeads(false);
    }, []);

    /* ── Fetch forms and terms ────────────────────────────────────── */
    const fetchFormsTerms = useCallback(async () => {
        const [f, t] = await Promise.all([
            supabase.from('school_forms').select('id,form_name').order('id'),
            supabase.from('school_terms').select('id,term_name').order('id'),
        ]);
        setForms(f.data || []);
        setTerms(t.data || []);
    }, []);

    useEffect(() => { fetchHeads(); fetchFormsTerms(); }, [fetchHeads, fetchFormsTerms]);

    /* ── Build blank matrix from vote heads × terms ───────────────── */
    const buildEmptyMatrix = useCallback((vhs: VoteHead[], termList: Term[]): MatrixState => {
        const m: MatrixState = {};
        for (const vh of vhs.filter(h => h.is_active)) {
            m[vh.id] = {};
            for (const t of termList) {
                m[vh.id][t.id] = { dbId: null, amount: '', dirty: false };
            }
        }
        return m;
    }, []);

    /* ── Load matrix for selected form + year ─────────────────────── */
    const loadMatrix = useCallback(async (formId: number, year: number) => {
        if (!formId || heads.length === 0 || terms.length === 0) return;
        setLoadingMatrix(true);
        const base = buildEmptyMatrix(heads, terms);

        const { data, error } = await supabase
            .from('school_fee_structures')
            .select('id, vote_head_id, term_id, amount')
            .eq('form_id', formId)
            .eq('year', year)
            .not('vote_head_id', 'is', null);

        if (error) { toast.error('Failed to load fee matrix'); setLoadingMatrix(false); return; }

        for (const row of (data || [])) {
            if (base[row.vote_head_id]?.[row.term_id] !== undefined) {
                base[row.vote_head_id][row.term_id] = {
                    dbId: row.id,
                    amount: Number(row.amount) > 0 ? String(row.amount) : '',
                    dirty: false,
                };
            }
        }
        setMatrix(base);
        setLoadingMatrix(false);
    }, [heads, terms, buildEmptyMatrix]);

    useEffect(() => {
        if (selForm && tab === 'matrix') loadMatrix(Number(selForm), selYear);
    }, [selForm, selYear, tab, loadMatrix]);

    /* ── Cell change ──────────────────────────────────────────────── */
    const onCellChange = (vhId: number, termId: number, val: string) => {
        if (val !== '' && !/^\d*$/.test(val)) return;
        setMatrix(prev => ({
            ...prev,
            [vhId]: { ...prev[vhId], [termId]: { ...prev[vhId][termId], amount: val, dirty: true } },
        }));
    };

    /* ── Save all dirty cells ─────────────────────────────────────── */
    const saveMatrix = async () => {
        if (!selForm) { toast.error('Select a form first'); return; }
        setSavingMatrix(true);
        let saved = 0, errors = 0;

        for (const [vhIdStr, termMap] of Object.entries(matrix)) {
            const vhId = Number(vhIdStr);
            const vh   = heads.find(h => h.id === vhId);
            for (const [termIdStr, cell] of Object.entries(termMap)) {
                if (!cell.dirty) continue;
                const termId = Number(termIdStr);
                const amount = Number(cell.amount) || 0;

                if (cell.dbId) {
                    const { error } = await supabase.from('school_fee_structures')
                        .update({ amount, vote_head_name: vh?.name, category: vh?.name })
                        .eq('id', cell.dbId);
                    if (error) { console.error(error); errors++; }
                    else {
                        setMatrix(p => ({
                            ...p, [vhId]: { ...p[vhId], [termId]: { ...p[vhId][termId], dirty: false } },
                        }));
                        saved++;
                    }
                } else if (amount > 0) {
                    const { data: ins, error } = await supabase.from('school_fee_structures')
                        .insert({
                            form_id: Number(selForm), term_id: termId, year: selYear,
                            vote_head_id: vhId, vote_head_name: vh?.name || '',
                            category: vh?.name || '', amount,
                        })
                        .select('id').single();
                    if (error) { console.error(error); errors++; }
                    else {
                        setMatrix(p => ({
                            ...p, [vhId]: { ...p[vhId], [termId]: { dbId: ins.id, amount: String(amount), dirty: false } },
                        }));
                        saved++;
                    }
                } else {
                    setMatrix(p => ({
                        ...p, [vhId]: { ...p[vhId], [termId]: { ...p[vhId][termId], dirty: false } },
                    }));
                }
            }
        }

        setSavingMatrix(false);
        if (errors === 0) toast.success(`Saved ${saved} cell${saved !== 1 ? 's' : ''} ✅`);
        else toast.error(`Saved ${saved}, ${errors} failed — check console`);
    };

    /* ── Delete entire row from matrix ───────────────────────────── */
    const deleteRowFromMatrix = async (vhId: number) => {
        const row = matrix[vhId];
        if (!row) return;
        const ids = Object.values(row).filter(c => c.dbId).map(c => c.dbId!);
        if (ids.length > 0) {
            const { error } = await supabase.from('school_fee_structures').delete().in('id', ids);
            if (error) { toast.error('Failed to clear row: ' + error.message); return; }
        }
        setMatrix(prev => {
            const u = { ...prev };
            if (u[vhId]) {
                for (const tid of Object.keys(u[vhId])) {
                    u[vhId][Number(tid)] = { dbId: null, amount: '', dirty: false };
                }
            }
            return u;
        });
        toast.success('Row cleared');
    };

    /* ── Copy structure from another form ────────────────────────── */
    const copyFromOtherForm = async () => {
        if (!copyFromForm || !selForm) return;
        const { data, error } = await supabase.from('school_fee_structures')
            .select('vote_head_id, term_id, amount')
            .eq('form_id', Number(copyFromForm)).eq('year', selYear)
            .not('vote_head_id', 'is', null);
        if (error) { toast.error('Failed to copy: ' + error.message); return; }
        const base = buildEmptyMatrix(heads, terms);
        for (const row of (data || [])) {
            if (base[row.vote_head_id]?.[row.term_id] !== undefined) {
                base[row.vote_head_id][row.term_id] = { dbId: null, amount: String(row.amount || ''), dirty: true };
            }
        }
        setMatrix(base);
        setShowCopyModal(false);
        toast('Structure copied! Click Save All Changes to apply.', { icon: '📋' });
    };

    /* ── Print matrix ─────────────────────────────────────────────── */
    const printMatrix = () => {
        const formName  = forms.find(f => f.id === Number(selForm))?.form_name || '';
        const activeVHs = heads.filter(h => h.is_active && matrix[h.id]);
        const rows = activeVHs.map(vh => {
            const cells = terms.map(t => {
                const a = Number(matrix[vh.id]?.[t.id]?.amount || 0);
                return `<td style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;">${a > 0 ? a.toLocaleString() : '—'}</td>`;
            }).join('');
            const total = terms.reduce((s, t) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
            return `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">${vh.name}</td>${cells}<td style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;font-weight:700;">${total.toLocaleString()}</td></tr>`;
        }).join('');
        const colTotals = terms.map(t => {
            const s = activeVHs.reduce((sum, vh) => sum + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
            return `<td style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;font-weight:700;">${s.toLocaleString()}=</td>`;
        }).join('');
        const grand = activeVHs.reduce((s, vh) => s + terms.reduce((ss, t) => ss + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0), 0);
        const w = window.open('', '_blank'); if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Fee Structure</title><style>body{font-family:Arial;padding:30px;} table{border-collapse:collapse;width:100%;} th{background:#1e293b;color:white;padding:10px 12px;border:1px solid #e5e7eb;}</style></head><body><h2 style="text-align:center;">FEES STRUCTURE FOR THE YEAR ${selYear} — ${formName.toUpperCase()}</h2><table><thead><tr><th>Vote Head</th>${terms.map(t => `<th style="text-align:right;">${t.term_name}</th>`).join('')}<th style="text-align:right;">TOTAL</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f1f5f9;font-weight:800;"><td style="padding:8px 12px;border:1px solid #e5e7eb;">TOTAL</td>${colTotals}<td style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;">${grand.toLocaleString()}</td></tr></tfoot></table><p style="margin-top:16px;font-size:11px;color:#666;">Revenue: Students × ${grand.toLocaleString()} = ? | Printed: ${new Date().toLocaleDateString('en-KE')}</p></body></html>`);
        w.document.close(); w.print();
    };

    /* ── Vote Head CRUD ───────────────────────────────────────────── */
    const openAdd  = () => { setEditId(null); const n = heads.length > 0 ? Math.max(...heads.map(h => h.priority)) + 1 : 2; setFormVH({ ...EMPTY_VH, priority: n }); setShowModal(true); };
    const openEdit = (h: VoteHead) => { setEditId(h.id); setFormVH({ code: h.code, name: h.name, category: h.category, priority: h.priority, is_active: h.is_active, description: h.description || '', color: h.color || '#6366f1' }); setShowModal(true); };

    const handleSave = async () => {
        if (!formVH.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        const code = formVH.code.trim()
            ? formVH.code.trim().toUpperCase().replace(/\s+/g, '_')
            : formVH.name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
        const payload = {
            code, name: formVH.name.trim(), category: formVH.category,
            priority: Number(formVH.priority) || 99, sort_order: Number(formVH.priority) || 99,
            is_active: formVH.is_active, description: formVH.description?.trim() || null,
            color: formVH.color || '#6366f1', updated_at: new Date().toISOString(),
        };
        let error;
        if (editId) ({ error } = await supabase.from('school_vote_heads').update(payload).eq('id', editId));
        else ({ error } = await supabase.from('school_vote_heads').insert([{ ...payload, created_at: new Date().toISOString() }]));
        if (error) toast.error('Save failed: ' + error.message);
        else { toast.success(editId ? 'Updated ✅' : 'Vote head created ✅'); setShowModal(false); fetchHeads(); }
        setSaving(false);
    };

    const handleDelete  = async (id: number) => { const { error } = await supabase.from('school_vote_heads').delete().eq('id', id); if (error) toast.error('Delete failed: ' + error.message); else { toast.success('Deleted'); setDeleteId(null); fetchHeads(); } };
    const toggleActive  = async (h: VoteHead) => { await supabase.from('school_vote_heads').update({ is_active: !h.is_active }).eq('id', h.id); fetchHeads(); };

    const filtered = heads.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.code.toLowerCase().includes(search.toLowerCase()));

    /* ── Column / row totals ──────────────────────────────────────── */
    const activeVHsInMatrix = heads.filter(h => h.is_active && matrix[h.id]);
    const colTotals: Record<number, number> = {};
    let grandTotal = 0;
    for (const t of terms) {
        colTotals[t.id] = activeVHsInMatrix.reduce((s, vh) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
        grandTotal += colTotals[t.id];
    }

    /* ════════════════════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════════════════════ */
    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <FiZap className="text-amber-500" /> Vote Heads &amp; Fee Matrix
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Define fee categories and set amounts per vote head per term per form
                    </p>
                </div>
                <button onClick={() => { fetchHeads(); fetchFormsTerms(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
                    <FiRefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
                {([
                    { id: 'heads',  label: 'Vote Heads', icon: <FiZap size={14} /> },
                    { id: 'matrix', label: 'Fee Matrix',  icon: <FiGrid size={14} /> },
                ] as const).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t.icon} {t.label}
                        {t.id === 'matrix' && hasDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </button>
                ))}
            </div>

            {/* ════ TAB 1: VOTE HEADS ════ */}
            {tab === 'heads' && (
                <div className="space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total', value: heads.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                            { label: 'Active', value: heads.filter(h => h.is_active).length, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                            { label: 'Inactive', value: heads.filter(h => !h.is_active).length, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
                            { label: 'Highest Priority', value: heads.length ? `#${Math.min(...heads.map(h => h.priority))}` : '—', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                        ].map((s, i) => (
                            <div key={i} className={`border rounded-2xl p-4 ${s.bg}`}>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
                        <strong>How it works:</strong> Vote heads are fee categories (B.E.S, M&amp;I, ADM COST, P.EMOL, etc.).
                        Set amounts per term in the{' '}
                        <button onClick={() => setTab('matrix')} className="underline font-bold">Fee Matrix tab</button>.
                        Priority 1 = collected first (Arrears), 2 = BES/Tuition, etc.
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vote heads..."
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-400 outline-none" />
                            </div>
                            <button onClick={openAdd}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 whitespace-nowrap">
                                <FiPlus size={16} /> Add Vote Head
                            </button>
                        </div>

                        {loadingHeads ? (
                            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FiZap className="text-amber-500" size={28} />
                                </div>
                                <p className="text-gray-700 font-bold text-lg">No vote heads yet</p>
                                <p className="text-gray-400 text-sm mt-1">Add heads like B.E.S, M&amp;I, ADM COST, E.W&amp;C, P.EMOL, Activity</p>
                                <button onClick={openAdd}
                                    className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/25">
                                    <FiPlus size={14} className="inline mr-1" /> Add Vote Head
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filtered.sort((a, b) => a.priority - b.priority).map(h => (
                                    <div key={h.id}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md ${h.is_active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50 opacity-60'}`}>
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md"
                                            style={{ background: `linear-gradient(135deg,${h.color || '#6366f1'},${h.color || '#6366f1'}99)` }}>
                                            {h.priority}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-gray-800">{h.name}</span>
                                                <code className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">{h.code}</code>
                                                {!h.is_active && <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-400">Inactive</span>}
                                            </div>
                                            {h.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{h.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => toggleActive(h)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${h.is_active ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-600'}`}>
                                                {h.is_active ? <><FiCheck size={11} className="inline mr-1" />Active</> : 'Inactive'}
                                            </button>
                                            <button onClick={() => openEdit(h)} className="p-2 rounded-xl bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100"><FiEdit2 size={14} /></button>
                                            <button onClick={() => setDeleteId(h.id)} className="p-2 rounded-xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"><FiTrash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════ TAB 2: FEE MATRIX ════ */}
            {tab === 'matrix' && (
                <div className="space-y-5">
                    {/* Controls bar */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-48">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Form</label>
                            <div className="relative flex-1">
                                <select value={selForm} onChange={e => setSelForm(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full appearance-none border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-amber-400 outline-none pr-8">
                                    <option value="">— Select Form —</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Year</label>
                            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                                className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-amber-400 outline-none">
                                {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                            {selForm && (
                                <button onClick={() => setShowCopyModal(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-sm font-bold">
                                    <FiCopy size={14} /> Copy From
                                </button>
                            )}
                            {selForm && (
                                <button onClick={printMatrix}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold">
                                    <FiPrinter size={14} /> Print
                                </button>
                            )}
                            {selForm && hasDirty && (
                                <button onClick={saveMatrix} disabled={savingMatrix}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-black shadow-lg shadow-emerald-500/30 disabled:opacity-60">
                                    {savingMatrix
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                                        : <><FiSave size={14} /> Save All Changes</>}
                                </button>
                            )}
                        </div>
                    </div>

                    {hasDirty && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                            <FiAlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
                            <p className="text-sm text-amber-700 font-semibold">
                                Unsaved changes — click <strong>Save All Changes</strong> to persist them to the database.
                            </p>
                        </div>
                    )}

                    {!selForm ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
                            <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <FiGrid className="text-amber-500" size={36} />
                            </div>
                            <p className="text-xl font-black text-gray-700 mb-2">Select a Form to edit its Fee Matrix</p>
                            <p className="text-sm text-gray-400">Choose a form/class above, then enter amounts for each vote head per term.</p>
                        </div>
                    ) : loadingMatrix ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-3">
                            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : activeVHsInMatrix.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                            <p className="text-lg font-black text-gray-600 mb-2">No active vote heads</p>
                            <p className="text-sm text-gray-400">
                                Go to the{' '}
                                <button onClick={() => setTab('heads')} className="underline text-amber-600 font-bold">Vote Heads tab</button>
                                {' '}and add vote heads first.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Matrix title bar */}
                            <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
                                <div>
                                    <h2 className="text-white font-black text-lg">
                                        FEES STRUCTURE — {forms.find(f => f.id === Number(selForm))?.form_name?.toUpperCase()} · {selYear}
                                    </h2>
                                    <p className="text-slate-400 text-xs mt-0.5">Click any cell to edit · Tab/Enter to move to next cell</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Annual Total</p>
                                    <p className="text-emerald-400 font-black text-2xl">{fmtKes(grandTotal)}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="text-left px-5 py-3 text-xs font-black text-slate-600 uppercase tracking-wider w-52">Vote Head</th>
                                            {terms.map(t => (
                                                <th key={t.id} className="text-right px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider min-w-32">
                                                    {t.term_name}
                                                </th>
                                            ))}
                                            <th className="text-right px-5 py-3 text-xs font-black text-slate-600 uppercase tracking-wider">TOTAL</th>
                                            <th className="px-3 py-3 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {activeVHsInMatrix.map((vh, vIdx) => {
                                            const rowTotal    = terms.reduce((s, t) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
                                            const rowHasDirty = terms.some(t => matrix[vh.id]?.[t.id]?.dirty);
                                            return (
                                                <tr key={vh.id}
                                                    className={`group hover:bg-amber-50/30 transition-colors ${rowHasDirty ? 'bg-amber-50/50' : ''}`}>
                                                    {/* Vote head label */}
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-8 rounded-full flex-shrink-0" style={{ background: vh.color || '#6366f1' }} />
                                                            <div>
                                                                <p className="font-bold text-gray-800 text-sm">{vh.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-mono">{vh.code}</p>
                                                            </div>
                                                            {rowHasDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />}
                                                        </div>
                                                    </td>

                                                    {/* Amount cells */}
                                                    {terms.map((t, tIdx) => {
                                                        const cell = matrix[vh.id]?.[t.id];
                                                        if (!cell) return <td key={t.id} className="px-4 py-3 text-right text-gray-300 text-sm">—</td>;
                                                        return (
                                                            <td key={t.id} className="px-2 py-2">
                                                                <input
                                                                    id={`cell-${vIdx}-${tIdx}`}
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={cell.amount}
                                                                    placeholder="0"
                                                                    onChange={e => onCellChange(vh.id, t.id, e.target.value)}
                                                                    onFocus={e => e.target.select()}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                                                            e.preventDefault();
                                                                            const nT = tIdx + 1 < terms.length ? tIdx + 1 : 0;
                                                                            const nV = tIdx + 1 < terms.length ? vIdx : vIdx + 1;
                                                                            document.getElementById(`cell-${nV}-${nT}`)?.focus();
                                                                        }
                                                                    }}
                                                                    className={`w-full text-right px-3 py-2 rounded-xl text-sm font-bold border-2 outline-none transition-all ${
                                                                        cell.dirty
                                                                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                                            : 'border-transparent bg-gray-50 text-gray-700 hover:border-gray-300 focus:border-amber-400 focus:bg-white'
                                                                    }`}
                                                                />
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Row total */}
                                                    <td className="px-5 py-3 text-right">
                                                        <span className={`text-sm font-black ${rowTotal > 0 ? 'text-indigo-700' : 'text-gray-300'}`}>
                                                            {rowTotal > 0 ? rowTotal.toLocaleString() : '—'}
                                                        </span>
                                                    </td>

                                                    {/* Clear row button (hover) */}
                                                    <td className="px-3 py-3">
                                                        <button
                                                            onClick={() => { if (confirm(`Clear all amounts for "${vh.name}"?`)) deleteRowFromMatrix(vh.id); }}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-all"
                                                            title="Clear this row">
                                                            <FiX size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                    {/* TOTALS row */}
                                    <tfoot>
                                        <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                                            <td className="px-5 py-4 text-white font-black uppercase tracking-wide text-sm">TOTAL</td>
                                            {terms.map(t => (
                                                <td key={t.id} className="px-4 py-4 text-right">
                                                    <span className={`font-black text-base ${colTotals[t.id] > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                        {colTotals[t.id] > 0 ? `${colTotals[t.id].toLocaleString()}=` : '—'}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-emerald-400 font-black text-lg">
                                                    {grandTotal > 0 ? `${grandTotal.toLocaleString()}=` : '—'}
                                                </span>
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Save footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-4">
                                <p className="text-xs">
                                    {hasDirty
                                        ? <span className="text-amber-600 font-bold">⚠️ Unsaved changes</span>
                                        : <span className="text-gray-400">All changes saved ✅</span>}
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={printMatrix}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-100">
                                        <FiPrinter size={14} /> Print Structure
                                    </button>
                                    <button onClick={saveMatrix} disabled={!hasDirty || savingMatrix}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-black shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed">
                                        {savingMatrix
                                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                                            : <><FiSave size={14} /> Save All Changes</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ════ COPY FROM FORM MODAL ════ */}
            {showCopyModal && (
                <div onClick={() => setShowCopyModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FiCopy className="text-indigo-500" size={24} />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 text-center">Copy Fee Structure</h3>
                        <p className="text-sm text-gray-500 text-center mt-1 mb-5">
                            Copy amounts into <strong>{forms.find(f => f.id === Number(selForm))?.form_name}</strong>.
                            Existing amounts will be overwritten after you save.
                        </p>
                        <div className="mb-5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Copy FROM:</label>
                            <div className="relative">
                                <select value={copyFromForm} onChange={e => setCopyFromForm(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full appearance-none border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-indigo-400 outline-none pr-8">
                                    <option value="">— Select Source Form —</option>
                                    {forms.filter(f => f.id !== Number(selForm)).map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowCopyModal(false)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm">Cancel</button>
                            <button onClick={copyFromOtherForm} disabled={!copyFromForm}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-sm shadow-lg disabled:opacity-40">
                                <FiCopy size={14} className="inline mr-1" /> Copy Structure
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ ADD / EDIT VOTE HEAD MODAL ════ */}
            {showModal && (
                <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                        <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-3xl flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black flex items-center gap-2"><FiZap size={20} /> {editId ? 'Edit Vote Head' : 'Add New Vote Head'}</h3>
                                <p className="text-amber-100 text-xs mt-1">{editId ? 'Update vote head details' : 'Create a new fee category'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30"><FiX size={18} /></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Priority */}
                            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200">
                                <label className="text-xs font-black text-rose-700 uppercase tracking-wider block mb-2">⚡ Auto-Distribution Priority</label>
                                <p className="text-xs text-rose-500 mb-3">Lower number = collected first. 1 = Arrears, 2 = BES/Tuition, etc.</p>
                                <div className="flex items-center gap-3 mb-3">
                                    <button type="button"
                                        onClick={() => setFormVH(f => ({ ...f, priority: Math.max(1, f.priority - 1) }))}
                                        className="w-12 h-12 rounded-xl bg-rose-500 text-white text-2xl font-black flex items-center justify-center hover:bg-rose-600">
                                        −
                                    </button>
                                    <input type="number" min={1} max={999} value={formVH.priority}
                                        onChange={e => setFormVH(f => ({ ...f, priority: Math.max(1, Number(e.target.value) || 1) }))}
                                        className="w-24 text-center text-3xl font-black border-2 border-rose-400 rounded-xl py-3 outline-none focus:border-rose-600 bg-white text-rose-600" />
                                    <button type="button"
                                        onClick={() => setFormVH(f => ({ ...f, priority: f.priority + 1 }))}
                                        className="w-12 h-12 rounded-xl bg-rose-500 text-white text-2xl font-black flex items-center justify-center hover:bg-rose-600">
                                        +
                                    </button>
                                    <div className="flex-1 text-xs text-rose-700">
                                        <strong>1</strong> = Arrears (always first)<br />
                                        <strong>2</strong> = BES/Tuition<br />
                                        <strong>99</strong> = Optional / last
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { label: '1—Arrears', val: 1, c: '#dc2626' },
                                        { label: '2—BES',     val: 2, c: '#6366f1' },
                                        { label: '3—Activity',val: 3, c: '#10b981' },
                                        { label: '4—Exam',    val: 4, c: '#f59e0b' },
                                        { label: '99—Last',   val: 99,c: '#6b7280' },
                                    ].map(p => (
                                        <button key={p.val} type="button"
                                            onClick={() => setFormVH(f => ({ ...f, priority: p.val }))}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all"
                                            style={{ borderColor: formVH.priority === p.val ? p.c : '#fecdd3', background: formVH.priority === p.val ? p.c : '#fff5f5', color: formVH.priority === p.val ? '#fff' : p.c }}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name + Code */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Vote Head Name *</label>
                                    <input value={formVH.name} onChange={e => setFormVH(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. B.E.S, M&I, ADM COST, P.EMOL"
                                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Code (auto-generated)</label>
                                    <input value={formVH.code}
                                        onChange={e => setFormVH(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                                        placeholder="e.g. BES, M_I, ADM_COST"
                                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none font-mono font-bold" />
                                </div>
                            </div>

                            {/* Colour */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Colour (receipts &amp; reports)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button key={c} onClick={() => setFormVH(f => ({ ...f, color: c }))}
                                            className="w-8 h-8 rounded-lg border-2 flex-shrink-0 transition-all"
                                            style={{ background: c, borderColor: formVH.color === c ? '#1e293b' : 'transparent', transform: formVH.color === c ? 'scale(1.2)' : 'scale(1)' }} />
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Description (optional)</label>
                                <textarea value={formVH.description || ''} onChange={e => setFormVH(f => ({ ...f, description: e.target.value }))}
                                    rows={2} placeholder="Brief description of this vote head..."
                                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none resize-none" />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div>
                                    <p className="text-sm font-bold text-gray-700">Active</p>
                                    <p className="text-xs text-gray-400">Inactive heads are hidden from the fee matrix and payment collection</p>
                                </div>
                                <button onClick={() => setFormVH(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`relative w-12 h-6 rounded-full transition-all ${formVH.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${formVH.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg shadow-amber-500/25 disabled:opacity-60 flex items-center justify-center gap-2">
                                {saving
                                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                                    : <><FiCheck size={16} /> {editId ? 'Update' : 'Save'} Vote Head</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ DELETE CONFIRM ════ */}
            {deleteId && (
                <div onClick={() => setDeleteId(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FiTrash2 className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 text-center">Delete Vote Head?</h3>
                        <p className="text-sm text-gray-500 text-center mt-2">
                            The vote head definition will be removed. Fee structure rows linked to it will be unlinked,
                            but <strong>no financial data is deleted</strong>.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteId(null)}
                                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm">Cancel</button>
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
