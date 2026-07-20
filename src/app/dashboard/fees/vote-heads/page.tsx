'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface VoteHead {
    id: number;
    code: string;
    name: string;
    category: 'fee' | 'discount' | 'credit' | 'expense';
    sort_order: number;
    priority: number;
    is_active: boolean;
    description: string | null;
    color: string | null;
    created_at: string;
}


const CATEGORIES = [
    { value: 'fee',      label: 'Fee',      color: '#6366f1', bg: '#eef2ff', emoji: '💰' },
    { value: 'discount', label: 'Discount', color: '#10b981', bg: '#f0fdf4', emoji: '🎓' },
    { value: 'credit',   label: 'Credit',   color: '#3b82f6', bg: '#eff6ff', emoji: '⬆️' },
    { value: 'expense',  label: 'Expense',  color: '#f59e0b', bg: '#fffbeb', emoji: '📝' },
];

const getCat = (v: string) => CATEGORIES.find(c => c.value === v) || CATEGORIES[0];

const EMPTY_FORM = { code: '', name: '', category: 'fee' as const, sort_order: 99, priority: 99, is_active: true, description: '', color: '#6366f1' };


export default function VoteHeadsPage() {
    const [heads, setHeads] = useState<VoteHead[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('school_vote_heads')
            .select('*')
            .order('sort_order')
            .order('name');
        if (error) toast.error('Failed to load vote heads');
        else setHeads(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditId(null);
        setForm({ ...EMPTY_FORM, sort_order: (heads.length + 1), priority: (heads.length + 1) });
        setShowModal(true);
    };

    const openEdit = (h: VoteHead) => {
        setEditId(h.id);
        setForm({ code: h.code, name: h.name, category: h.category, sort_order: h.sort_order, priority: h.priority ?? 99, is_active: h.is_active, description: h.description || '', color: h.color || '#6366f1' });
        setShowModal(true);
    };


    const handleSave = async () => {
        if (!form.code.trim() || !form.name.trim()) { toast.error('Code and Name are required'); return; }
        setSaving(true);
        const payload = {
            code: form.code.trim().toUpperCase().replace(/\s+/g, '_'),
            name: form.name.trim(),
            category: form.category,
            sort_order: Number(form.sort_order) || 99,
            priority: Number(form.priority) || 99,   // ← controls auto-distribution order
            is_active: form.is_active,
            description: form.description.trim() || null,
            color: form.color || '#6366f1',
            updated_at: new Date().toISOString(),
        };


        let err;
        if (editId) {
            ({ error: err } = await supabase.from('school_vote_heads').update(payload).eq('id', editId));
        } else {
            ({ error: err } = await supabase.from('school_vote_heads').insert([payload]));
        }

        if (err) {
            toast.error(err.message.includes('unique') ? 'Code already exists — choose a different code' : 'Save failed: ' + err.message);
        } else {
            toast.success(editId ? '✅ Vote head updated' : '✅ Vote head added');
            setShowModal(false);
            load();
        }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        const { error } = await supabase.from('school_vote_heads').delete().eq('id', id);
        if (error) toast.error('Delete failed: ' + error.message);
        else { toast.success('🗑️ Vote head deleted'); setDeleteConfirm(null); load(); }
    };

    const handleToggleActive = async (h: VoteHead) => {
        const { error } = await supabase.from('school_vote_heads').update({ is_active: !h.is_active, updated_at: new Date().toISOString() }).eq('id', h.id);
        if (error) toast.error('Update failed');
        else { toast.success(h.is_active ? 'Deactivated' : 'Activated'); load(); }
    };

    const filtered = heads.filter(h => {
        const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.code.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'all' || h.category === filterCat;
        return matchSearch && matchCat;
    });

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', padding: '24px 20px' }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 28 }}>
                <Link href="/dashboard/fees" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
                    ← Back to Fees
                </Link>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
                            🏷️ Vote Heads
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                            Manage fee categories used across the school system · {heads.length} total
                        </p>
                    </div>
                    <button onClick={openAdd} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
                        borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                    }}>
                        <span style={{ fontSize: 18 }}>＋</span> Add Vote Head
                    </button>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Total', value: heads.length, color: '#6366f1', bg: '#eef2ff', emoji: '📋' },
                    { label: 'Active', value: heads.filter(h => h.is_active).length, color: '#10b981', bg: '#f0fdf4', emoji: '✅' },
                    { label: 'Inactive', value: heads.filter(h => !h.is_active).length, color: '#f59e0b', bg: '#fffbeb', emoji: '⏸️' },
                    ...CATEGORIES.map(c => ({ label: c.label, value: heads.filter(h => h.category === c.value).length, color: c.color, bg: c.bg, emoji: c.emoji })),
                ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${s.color}25`, boxShadow: `0 2px 8px ${s.color}10` }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 16, border: '1.5px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍  Search vote heads..."
                    style={{ flex: 1, minWidth: 180, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                />
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                </select>
            </div>

            {/* ── Table ── */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div style={{ fontWeight: 600 }}>Loading vote heads...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#475569' }}>
                            {heads.length === 0 ? 'No vote heads yet' : 'No results found'}
                        </div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>
                            {heads.length === 0 ? 'Click "Add Vote Head" to get started' : 'Try a different search or filter'}
                        </div>
                        {heads.length === 0 && (
                            <button onClick={openAdd} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                Add First Vote Head
                            </button>
                        )}
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                {['Priority', 'Order', 'Code', 'Name', 'Category', 'Description', 'Status', 'Actions'].map(h => (

                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((h, i) => {
                                const cat = getCat(h.category);
                                return (
                                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', opacity: h.is_active ? 1 : 0.55 }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                <span style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', boxShadow: '0 2px 6px rgba(239,68,68,0.3)' }}>
                                                    {h.priority ?? 99}
                                                </span>
                                                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>PRIORITY</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                                {h.sort_order}
                                            </span>
                                        </td>

                                        <td style={{ padding: '12px 16px' }}>
                                            <code style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: '0.04em' }}>
                                                {h.code}
                                            </code>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{h.name}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cat.bg, color: cat.color, border: `1px solid ${cat.color}30` }}>
                                                {cat.emoji} {cat.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', maxWidth: 220 }}>{h.description || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <button onClick={() => handleToggleActive(h)} style={{
                                                padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                                background: h.is_active ? '#f0fdf4' : '#fef2f2',
                                                color: h.is_active ? '#10b981' : '#ef4444',
                                                border: `1px solid ${h.is_active ? '#10b98130' : '#ef444430'}`,
                                            }}>
                                                {h.is_active ? '✅ Active' : '⏸ Inactive'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => openEdit(h)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6366f1' }}>
                                                    ✏️ Edit
                                                </button>
                                                {deleteConfirm === h.id ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button onClick={() => handleDelete(h.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Confirm</button>
                                                        <button onClick={() => setDeleteConfirm(null)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(h.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Add/Edit Modal ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                        {/* Modal header */}
                        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>
                                    {editId ? '✏️ Edit Vote Head' : '➕ Add Vote Head'}
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                                    {editId ? 'Update the vote head details' : 'Create a new fee category'}
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>

                        {/* Modal body */}
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Priority — key field for auto-distribution */}
                            <div style={{ padding: '14px', background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', borderRadius: 12, border: '2px solid #f59e0b30', marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <span style={{ fontSize: 20 }}>⚡</span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>Auto-Distribution Priority</div>
                                        <div style={{ fontSize: 11, color: '#b45309' }}>Lower number = paid first when a student pays fees</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input type="number" min={1} max={999} value={form.priority}
                                        onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                                        style={{ width: 90, padding: '10px 12px', borderRadius: 10, border: '2px solid #f59e0b', fontSize: 18, fontWeight: 900, textAlign: 'center', outline: 'none', background: '#fff' }} />
                                    <div style={{ flex: 1, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
                                        <strong>Priority 1</strong> = paid first (e.g. ARREARS)<br />
                                        <strong>Priority 2</strong> = paid second (e.g. BES)<br />
                                        <strong>Priority 99</strong> = paid last / optional
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code *</label>
                                    <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                                        placeholder="e.g. BES, ADM_COST"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }} />
                                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>Short unique identifier (auto-uppercased)</p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort Order</label>
                                    <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Display Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Boarding Education Support"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                                    {CATEGORIES.map(c => (
                                        <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value as any }))}
                                            style={{
                                                padding: '10px 6px', borderRadius: 10, border: `2px solid ${form.category === c.value ? c.color : '#e2e8f0'}`,
                                                background: form.category === c.value ? c.bg : '#fff', cursor: 'pointer', textAlign: 'center',
                                                transition: 'all 0.15s',
                                            }}>
                                            <div style={{ fontSize: 18 }}>{c.emoji}</div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: form.category === c.value ? c.color : '#64748b', marginTop: 2 }}>{c.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
                                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional — brief description of this vote head"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    style={{
                                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                                        background: form.is_active ? '#6366f1' : '#cbd5e1', transition: 'background 0.2s',
                                    }}>
                                    <span style={{
                                        position: 'absolute', top: 2, left: form.is_active ? 22 : 2, width: 20, height: 20,
                                        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                                    }} />
                                </button>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                    {form.is_active ? '✅ Active — visible in fee collection' : '⏸️ Inactive — hidden from fee forms'}
                                </span>
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{
                                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: 13, fontWeight: 800, color: '#fff', opacity: saving ? 0.7 : 1,
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                {saving ? '⏳ Saving...' : (editId ? '✅ Update Vote Head' : '➕ Add Vote Head')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cleanup temp file note */}
            <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 32 }}>
                Vote heads are stored in <code>school_vote_heads</code> · Changes take effect immediately across all fee forms
            </p>
        </div>
    );
}
