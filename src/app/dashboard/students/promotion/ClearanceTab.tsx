'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiX, FiCheck, FiSearch } from 'react-icons/fi';

const CLEARANCE_ITEMS = [
    { key: 'library_cleared', label: 'Library' },
    { key: 'lab_cleared', label: 'Lab' },
    { key: 'store_cleared', label: 'Store' },
    { key: 'fees_cleared', label: 'Fees' },
    { key: 'hostel_cleared', label: 'Hostel' },
    { key: 'sports_cleared', label: 'Sports' },
    { key: 'discipline_cleared', label: 'Discipline' },
    { key: 'principal_cleared', label: 'Principal' },
];

export default function ClearanceTab({ data }: { data: any }) {
    const { students, clearanceForms, academicYears, user, fetchAll } = data;
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<any>({ student_id: '', clearance_type: 'Promotion', library_cleared: false, lab_cleared: false, store_cleared: false, fees_cleared: false, hostel_cleared: false, sports_cleared: false, discipline_cleared: false, principal_cleared: false, notes: '' });
    const [search, setSearch] = useState('');

    const openAdd = () => {
        setEditId(null);
        setForm({ student_id: '', clearance_type: 'Promotion', library_cleared: false, lab_cleared: false, store_cleared: false, fees_cleared: false, hostel_cleared: false, sports_cleared: false, discipline_cleared: false, principal_cleared: false, notes: '' });
        setShowModal(true);
    };

    const openEdit = (c: any) => {
        setEditId(c.id);
        setForm({ student_id: c.student_id, clearance_type: c.clearance_type, library_cleared: c.library_cleared, lab_cleared: c.lab_cleared, store_cleared: c.store_cleared, fees_cleared: c.fees_cleared, hostel_cleared: c.hostel_cleared, sports_cleared: c.sports_cleared, discipline_cleared: c.discipline_cleared, principal_cleared: c.principal_cleared, notes: c.notes || '' });
        setShowModal(true);
    };

    const save = async () => {
        if (!form.student_id) { toast.error('Select student'); return; }
        const currentAY = academicYears.find((a: any) => a.is_current);
        const allCleared = CLEARANCE_ITEMS.every(item => form[item.key]);
        const payload = { ...form, all_cleared: allCleared, academic_year_id: currentAY?.id || null };
        if (editId) {
            const { error } = await supabase.from('school_clearance_forms').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId);
            if (error) { toast.error(error.message); return; }
        } else {
            const { error } = await supabase.from('school_clearance_forms').insert([payload]);
            if (error) { toast.error(error.message); return; }
        }
        await supabase.from('school_students').update({ clearance_status: allCleared ? 'Complete' : 'In Progress' }).eq('id', form.student_id);
        toast.success(editId ? 'Clearance updated ✅' : 'Clearance created ✅');
        setShowModal(false); setEditId(null); fetchAll();
    };

    const toggleItem = (key: string) => setForm({ ...form, [key]: !form[key] });

    const getStudentName = (id: number) => { const s = students.find((st: any) => st.id === id); return s ? `${s.first_name} ${s.last_name}` : `#${id}`; };

    const filtered = clearanceForms.filter((c: any) => {
        const name = getStudentName(c.student_id).toLowerCase();
        return !search || name.includes(search.toLowerCase());
    });

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input value={search} onChange={e => setSearch(e.target.value)} className="input-modern w-full text-sm pl-9" placeholder="Search student..." />
                </div>
                <button onClick={openAdd} className="px-3 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <FiPlus size={13} /> New Clearance
                </button>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <span className="text-4xl block mb-3">📋</span><p className="font-semibold">No clearance forms</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((c: any) => {
                        const cleared = CLEARANCE_ITEMS.filter(item => c[item.key]).length;
                        const total = CLEARANCE_ITEMS.length;
                        return (
                            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800">{getStudentName(c.student_id)}</h4>
                                        <p className="text-xs text-gray-500">{c.clearance_type} — {new Date(c.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${cleared === total ? 'bg-green-500' : cleared > total / 2 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(cleared / total) * 100}%` }} /></div>
                                        <span className={`text-xs font-bold ${cleared === total ? 'text-green-600' : 'text-amber-600'}`}>{cleared}/{total}</span>
                                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 size={13} /></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mt-3">
                                    {CLEARANCE_ITEMS.map(item => (
                                        <div key={item.key} className={`text-center p-1.5 rounded-lg text-[10px] font-bold ${c[item.key] ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                                            {c[item.key] ? '✅' : '❌'} {item.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-bold text-gray-800">{editId ? 'Edit Clearance' : 'New Clearance Form'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Student *</label>
                                <select value={form.student_id} onChange={e => setForm({ ...form, student_id: Number(e.target.value) })} className="select-modern w-full text-sm">
                                    <option value="">Select Student</option>
                                    {students.filter((s: any) => s.status === 'Active').map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no || s.admission_number})</option>)}
                                </select>
                            </div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                                <select value={form.clearance_type} onChange={e => setForm({ ...form, clearance_type: e.target.value })} className="select-modern w-full text-sm">
                                    <option value="Promotion">Promotion</option><option value="Graduation">Graduation</option><option value="Transfer">Transfer</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-600">Clearance Items</p>
                                {CLEARANCE_ITEMS.map(item => (
                                    <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                                        <input type="checkbox" checked={form[item.key]} onChange={() => toggleItem(item.key)} className="w-4 h-4 rounded" />
                                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                        {form[item.key] && <FiCheck className="text-green-500 ml-auto" size={14} />}
                                    </label>
                                ))}
                            </div>
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
