'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

export default function AcademicYearsTab({ data }: { data: any }) {
    const { academicYears, fetchAll } = data;
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<any>({ year_name: '', start_date: '', end_date: '', is_current: false, status: 'Active', notes: '' });

    const openAdd = () => { setEditId(null); setForm({ year_name: '', start_date: '', end_date: '', is_current: false, status: 'Active', notes: '' }); setShowModal(true); };
    const openEdit = (ay: any) => { setEditId(ay.id); setForm({ year_name: ay.year_name, start_date: ay.start_date || '', end_date: ay.end_date || '', is_current: ay.is_current, status: ay.status, notes: ay.notes || '' }); setShowModal(true); };

    const save = async () => {
        if (!form.year_name) { toast.error('Year name required'); return; }
        if (form.is_current) await supabase.from('school_academic_years').update({ is_current: false }).neq('id', editId || -1);
        const payload = { ...form };
        const { error } = editId
            ? await supabase.from('school_academic_years').update(payload).eq('id', editId)
            : await supabase.from('school_academic_years').insert([payload]);
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Academic year updated ✅' : 'Academic year created ✅');
        setShowModal(false); setEditId(null); fetchAll();
    };

    const deleteAy = async (id: number) => {
        if (!confirm('Delete this academic year?')) return;
        const { error } = await supabase.from('school_academic_years').delete().eq('id', id);
        if (error) { toast.error('Cannot delete'); return; }
        toast.success('Deleted'); fetchAll();
    };

    const setCurrent = async (id: number) => {
        await supabase.from('school_academic_years').update({ is_current: false }).neq('id', id);
        const { error } = await supabase.from('school_academic_years').update({ is_current: true }).eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('Current academic year set ✅'); fetchAll();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Academic Year Management</h3>
                <button onClick={openAdd} className="px-3 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <FiPlus size={13} /> Add Year
                </button>
            </div>

            {academicYears.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <span className="text-4xl block mb-3">📅</span><p className="font-semibold">No academic years defined</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {academicYears.map((ay: any) => (
                        <div key={ay.id} className={`bg-white rounded-xl border p-4 ${ay.is_current ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-gray-800">{ay.year_name}</h4>
                                        {ay.is_current && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Current</span>}
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ay.status === 'Active' ? 'bg-blue-100 text-blue-700' : ay.status === 'Closed' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{ay.status}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {ay.start_date ? new Date(ay.start_date).toLocaleDateString() : '—'} — {ay.end_date ? new Date(ay.end_date).toLocaleDateString() : '—'}
                                    </p>
                                    {ay.notes && <p className="text-xs text-gray-400 mt-1">{ay.notes}</p>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {!ay.is_current && <button onClick={() => setCurrent(ay.id)} className="px-2.5 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-lg hover:bg-green-200">Set Current</button>}
                                    <button onClick={() => openEdit(ay)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 size={13} /></button>
                                    <button onClick={() => deleteAy(ay.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={13} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-bold text-gray-800">{editId ? 'Edit Academic Year' : 'New Academic Year'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Year Name *</label><input value={form.year_name} onChange={e => setForm({ ...form, year_name: e.target.value })} className="input-modern w-full text-sm" placeholder="e.g. 2025 or 2025/2026" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input-modern w-full text-sm" /></div>
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">End Date</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-modern w-full text-sm" /></div>
                            </div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="select-modern w-full text-sm">
                                    <option value="Active">Active</option><option value="Closed">Closed</option><option value="Archived">Archived</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} className="w-3.5 h-3.5 rounded" /><span className="text-xs font-medium text-gray-600">Set as current academic year</span></label>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-modern w-full text-sm" rows={2} /></div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={save} className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
