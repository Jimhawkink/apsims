'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiEdit2, FiSend, FiAward } from 'react-icons/fi';

export default function AlumniTab({ data }: { data: any }) {
    const { alumniList, students, forms, streams, getFormName, getStreamName, fetchAll } = data;
    const [search, setSearch] = useState('');
    const [editAlumni, setEditAlumni] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});

    const filtered = alumniList.filter((a: any) => {
        const student = students.find((s: any) => s.id === a.student_id);
        const name = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return !search || name.includes(search.toLowerCase());
    });

    const getStudentName = (id: number) => { const s = students.find((st: any) => st.id === id); return s ? `${s.first_name} ${s.last_name}` : `#${id}`; };
    const getStudentAdm = (id: number) => { const s = students.find((st: any) => st.id === id); return s ? (s.admission_no || s.admission_number) : '-'; };
    const getStudentPhone = (id: number) => { const s = students.find((st: any) => st.id === id); return s?.guardian_phone || s?.phone || ''; };

    const openEdit = (a: any) => { setEditAlumni(a); setEditForm({ current_occupation: a.current_occupation || '', current_employer: a.current_employer || '', current_phone: a.current_phone || '', current_email: a.current_email || '', current_address: a.current_address || '', university: a.university || '', course: a.course || '', alumni_status: a.alumni_status || 'Active', notes: a.notes || '' }); };

    const saveEdit = async () => {
        if (!editAlumni) return;
        const { error } = await supabase.from('school_alumni').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', editAlumni.id);
        if (error) { toast.error(error.message); return; }
        toast.success('Alumni updated ✅');
        setEditAlumni(null); fetchAll();
    };

    const totalAlumni = alumniList.length;
    const activeAlumni = alumniList.filter((a: any) => a.alumni_status === 'Active').length;
    const inUni = alumniList.filter((a: any) => a.university).length;

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 grid grid-cols-3 gap-3">
                    {[{ label: 'Total Alumni', value: totalAlumni, color: '#3b82f6', bg: '#eff6ff' }, { label: 'Active Contact', value: activeAlumni, color: '#22c55e', bg: '#f0fdf4' }, { label: 'In University', value: inUni, color: '#8b5cf6', bg: '#f3f0ff' }].map((k, i) => (
                        <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: k.bg }}>
                            <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{k.label}</p>
                        </div>
                    ))}
                </div>
                <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-3">
                    <div className="relative flex-1"><FiSearch className="absolute left-3 top-2 text-gray-400" size={12} /><input value={search} onChange={e => setSearch(e.target.value)} className="input-modern w-full text-[11px] pl-8" placeholder="Search alumni by name..." /></div>
                    <span className="text-[11px] text-gray-400">{filtered.length} shown</span>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 text-gray-400">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center"><FiAward size={24} className="text-gray-300" /></div>
                    <p className="font-semibold text-sm text-gray-500">No alumni records</p>
                    <p className="text-[11px] mt-1 text-gray-400">Graduated students will appear here</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adm No</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Year</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Final Form</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">University</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupation</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Act.</th>
                            </tr></thead>
                            <tbody>
                                {filtered.map((a: any, i: number) => (
                                    <tr key={a.id} className="border-b border-gray-100 hover:bg-green-50/30 transition-all duration-150">
                                        <td className="px-2.5 py-2 text-[11px] text-gray-400">{i + 1}</td>
                                        <td className="px-2.5 py-2 text-[11px] font-semibold text-gray-800">{getStudentName(a.student_id)}</td>
                                        <td className="px-2.5 py-2 text-[11px] font-bold text-blue-600">{getStudentAdm(a.student_id)}</td>
                                        <td className="px-2.5 py-2 text-center text-[11px]">{a.graduation_year}</td>
                                        <td className="px-2.5 py-2 text-center text-[11px]">{getFormName(a.final_form_id)}</td>
                                        <td className="px-2.5 py-2 text-center text-[11px] font-bold">{a.final_average_score ? Number(a.final_average_score).toFixed(1) : '—'}</td>
                                        <td className="px-2.5 py-2 text-[10px] text-gray-600">{a.university || '—'}</td>
                                        <td className="px-2.5 py-2 text-[10px] text-gray-600">{a.current_occupation || '—'}</td>
                                        <td className="px-2.5 py-2 text-center">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.alumni_status === 'Active' ? 'bg-green-100 text-green-700' : a.alumni_status === 'Deceased' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{a.alumni_status}</span>
                                        </td>
                                        <td className="px-2.5 py-2 text-center">
                                            <button onClick={() => openEdit(a)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={11} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editAlumni && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-bold text-gray-800">Edit Alumni — {getStudentName(editAlumni.student_id)}</h3>
                            <button onClick={() => setEditAlumni(null)} className="p-1 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                                <select value={editForm.alumni_status} onChange={e => setEditForm({ ...editForm, alumni_status: e.target.value })} className="select-modern w-full text-sm">
                                    <option value="Active">Active</option><option value="Lost Contact">Lost Contact</option><option value="Deceased">Deceased</option>
                                </select>
                            </div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Current Occupation</label><input value={editForm.current_occupation} onChange={e => setEditForm({ ...editForm, current_occupation: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Current Employer</label><input value={editForm.current_employer} onChange={e => setEditForm({ ...editForm, current_employer: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Current Phone</label><input value={editForm.current_phone} onChange={e => setEditForm({ ...editForm, current_phone: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Current Email</label><input value={editForm.current_email} onChange={e => setEditForm({ ...editForm, current_email: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">University</label><input value={editForm.university} onChange={e => setEditForm({ ...editForm, university: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Course</label><input value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label><textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="input-modern w-full text-sm" rows={2} /></div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button onClick={() => setEditAlumni(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={saveEdit} className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
