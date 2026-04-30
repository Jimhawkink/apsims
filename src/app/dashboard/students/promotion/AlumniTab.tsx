'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiEdit2, FiSend } from 'react-icons/fi';

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
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{totalAlumni}</p>
                    <p className="text-xs font-semibold text-blue-600">Total Alumni</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{activeAlumni}</p>
                    <p className="text-xs font-semibold text-green-600">Active Contact</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-700">{inUni}</p>
                    <p className="text-xs font-semibold text-purple-600">In University</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input value={search} onChange={e => setSearch(e.target.value)} className="input-modern w-full text-sm pl-9" placeholder="Search alumni by name..." />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <span className="text-4xl block mb-3">🎓</span><p className="font-semibold">No alumni records</p><p className="text-xs mt-1">Graduated students will appear here</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Year</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Final Form</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Avg</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">University</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Occupation</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody>
                                {filtered.map((a: any, i: number) => (
                                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{getStudentName(a.student_id)}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-blue-600">{getStudentAdm(a.student_id)}</td>
                                        <td className="px-3 py-2.5 text-center text-sm">{a.graduation_year}</td>
                                        <td className="px-3 py-2.5 text-center text-xs">{getFormName(a.final_form_id)}</td>
                                        <td className="px-3 py-2.5 text-center text-sm font-bold">{a.final_average_score ? Number(a.final_average_score).toFixed(1) : '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{a.university || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{a.current_occupation || '—'}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.alumni_status === 'Active' ? 'bg-green-100 text-green-700' : a.alumni_status === 'Deceased' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{a.alumni_status}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 size={13} /></button>
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
