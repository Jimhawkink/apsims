'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, feeVoteHeads } from '../useFeeData';
import { FiGrid, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiDollarSign, FiArrowLeft } from 'react-icons/fi';

export default function FeeStructurePage() {
    const { forms, structures, terms, loading, fetchAll, getFormName } = useFeeData();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<any>({ category: '', amount: '', term_id: '', form_id: '', description: '', year: new Date().getFullYear() });
    const [filterForm, setFilterForm] = useState('all');
    const [filterTerm, setFilterTerm] = useState('all');
    const currentTerm = terms.find(t => t.is_current);

    const openAdd = () => { setEditId(null); setForm({ category: '', amount: '', term_id: currentTerm?.id || '', form_id: '', description: '', year: new Date().getFullYear() }); setShowModal(true); };
    const openEdit = (item: any) => { setEditId(item.id); setForm({ category: item.category, amount: String(item.amount), term_id: item.term_id || '', form_id: item.form_id || '', description: item.description || '', year: item.year || new Date().getFullYear() }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.category?.trim()) { toast.error('Select a fee category'); return; }
        if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
        const payload = { category: form.category.trim(), amount: Number(form.amount), term_id: form.term_id ? Number(form.term_id) : null, form_id: form.form_id ? Number(form.form_id) : null, description: form.description || null, year: Number(form.year) || new Date().getFullYear() };
        let error;
        if (editId) { ({ error } = await supabase.from('school_fee_structures').update(payload).eq('id', editId)); }
        else { ({ error } = await supabase.from('school_fee_structures').insert([payload])); }
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Updated ✅' : 'Added ✅'); setShowModal(false); fetchAll();
    };

    const handleDelete = async (id: number) => { if (!confirm('Delete this fee item?')) return; await supabase.from('school_fee_structures').delete().eq('id', id); toast.success('Deleted'); fetchAll(); };

    const filtered = structures.filter(s => {
        if (filterForm !== 'all' && s.form_id && String(s.form_id) !== filterForm && filterForm !== 'all_forms') return false;
        if (filterForm === 'all_forms' && s.form_id) return false;
        if (filterTerm !== 'all' && s.term_id && String(s.term_id) !== filterTerm) return false;
        return true;
    });

    const gp = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-purple-400 outline-none transition-all";
    const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="w-10 h-10 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading...</p></div></div>;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5"><span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: gp }}><FiGrid size={18} /></span> Fee Structure</h1><p className="text-sm text-gray-400 mt-0.5 ml-12">Define fee vote heads, amounts per form and term</p></div>
                <Link href="/dashboard/fees" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"><FiArrowLeft size={12} /> Fee Dashboard</Link>
            </div>

            {/* Form-wise annual totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {forms.map((f, i) => {
                    const total = structures.filter(s => !s.form_id || s.form_id === f.id).reduce((s, st) => s + Number(st.amount || 0), 0);
                    const colors = ['from-violet-500 to-purple-600','from-cyan-500 to-blue-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600'];
                    return <div key={f.id} className={`rounded-xl p-4 text-white shadow-lg bg-gradient-to-br ${colors[i % 4]}`}><p className="text-[10px] font-bold uppercase opacity-80">{f.form_name} Annual</p><p className="text-xl font-extrabold mt-1">{fmt(total)}</p></div>;
                })}
            </div>

            {/* Actions */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex gap-2">
                        <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-purple-400 outline-none min-w-[140px]"><option value="all">All Forms</option><option value="all_forms">General (All Forms)</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
                        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-purple-400 outline-none min-w-[140px]"><option value="all">All Terms</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select>
                    </div>
                    <button onClick={openAdd} className="px-5 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-md" style={{ background: gp }}><FiPlus size={14} /> Add Fee Item</button>
                </div>
            </div>

            {/* Fee table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-300"><FiGrid size={40} className="mx-auto mb-3 opacity-40" /><p className="font-medium text-sm">No fee items found</p></div>
                ) : (<>
                    <div className="overflow-x-auto"><table className="w-full">
                        <thead><tr className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fee Vote Head</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Term</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Year</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount (KES)</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-24">Actions</th>
                        </tr></thead>
                        <tbody>{filtered.map((item: any, i: number) => (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-3 font-bold text-gray-800">{item.category}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{item.description || '-'}</td>
                                <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">{item.form_id ? getFormName(item.form_id) : 'All Forms'}</span></td>
                                <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-[10px] font-bold">{item.term_id ? terms.find(t => t.id === item.term_id)?.term_name || '-' : 'All Terms'}</span></td>
                                <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">{item.year || '-'}</span></td>
                                <td className="px-4 py-3 text-right font-extrabold text-emerald-600 text-lg">{fmt(Number(item.amount))}</td>
                                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 size={14} /></button><button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={14} /></button></div></td>
                            </tr>
                        ))}</tbody>
                        <tfoot><tr className="bg-purple-50 border-t-2 border-purple-200"><td colSpan={6} className="px-4 py-3 font-bold text-purple-800 text-sm">GRAND TOTAL ({filtered.length} items)</td><td className="px-4 py-3 text-right font-extrabold text-purple-800 text-xl">{fmt(filtered.reduce((s: number, f: any) => s + Number(f.amount || 0), 0))}</td><td></td></tr></tfoot>
                    </table></div>
                </>)}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white w-full max-w-md shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}><h3 className="font-bold text-gray-800 flex items-center gap-2"><FiGrid size={16} className="text-purple-500" /> {editId ? 'Edit Fee Item' : 'Add Fee Item'}</h3><button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 rounded-lg"><FiX size={18} /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Fee Vote Head *</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}><option value="">— Select —</option>{feeVoteHeads.map(c => <option key={c}>{c}</option>)}</select></div>
                            <div><label className={labelCls}>Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0" /></div>
                            <div><label className={labelCls}>Description</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Optional description" /></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className={labelCls}>Form</label><select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })} className={inputCls}><option value="">All</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                                <div><label className={labelCls}>Term</label><select value={form.term_id} onChange={e => setForm({ ...form, term_id: e.target.value })} className={inputCls}><option value="">All</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
                                <div><label className={labelCls}>Year</label><input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className={inputCls} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2"><button onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600">Cancel</button><button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-md" style={{ background: gp }}><FiSave size={14} /> {editId ? 'Update' : 'Save'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
