'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiRotateCcw, FiSearch, FiDownload, FiFileText } from 'react-icons/fi';

export default function HistoryTab({ data }: { data: any }) {
    const { history, students, forms, streams, getFormName, getStreamName, user, fetchAll, schoolDetails } = data;
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');

    const filtered = history.filter((h: any) => {
        const student = students.find((s: any) => s.id === h.student_id);
        const name = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        const adm = student ? (student.admission_no || student.admission_number || '').toLowerCase() : '';
        const matchSearch = !search || name.includes(search.toLowerCase()) || adm.includes(search.toLowerCase());
        const matchAction = !filterAction || h.action_type === filterAction;
        return matchSearch && matchAction;
    });

    const handleRollback = async (h: any) => {
        if (!confirm(`Rollback ${h.action_type} for student #${h.student_id}?`)) return;
        const student = students.find((s: any) => s.id === h.student_id);
        if (!student) { toast.error('Student not found'); return; }
        const updateData: any = { form_id: h.from_form_id, stream_id: h.from_stream_id };
        if (h.action_type === 'Graduation') updateData.status = 'Active';
        const { error } = await supabase.from('school_students').update(updateData).eq('id', h.student_id);
        if (error) { toast.error(error.message); return; }
        await supabase.from('school_promotion_history').update({ reversed_at: new Date().toISOString(), reversed_by: user?.full_name || 'System', reversal_reason: 'Manual rollback' }).eq('id', h.id);
        if (h.action_type === 'Graduation') await supabase.from('school_alumni').delete().eq('student_id', h.student_id);
        await supabase.from('school_promotion_history').insert([{ student_id: h.student_id, from_form_id: h.to_form_id, to_form_id: h.from_form_id, from_stream_id: h.to_stream_id, to_stream_id: h.from_stream_id, action_type: 'Reversal', reversal_of_id: h.id, approval_status: 'Auto', performed_by: user?.full_name || 'System' }]);
        toast.success('Promotion rolled back ✅');
        fetchAll();
    };

    const generateLetter = async (h: any) => {
        const student = students.find((s: any) => s.id === h.student_id);
        if (!student) return;
        const schoolName = schoolDetails?.school_name || 'Alpha School';
        const date = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
        const letterType = h.action_type === 'Promotion' ? 'PROMOTION' : h.action_type === 'Demotion' ? 'DEMOTION' : h.action_type === 'Graduation' ? 'GRADUATION' : 'TRANSFER';
        const content = `REF: ${letterType}/${new Date().getFullYear()}/${student.admission_no || student.admission_number}\n\nDate: ${date}\n\nTo: Parent/Guardian of ${student.first_name} ${student.last_name}\nAdm No: ${student.admission_no || student.admission_number}\n\nDear Parent/Guardian,\n\nRE: ${letterType} OF ${student.first_name?.toUpperCase()} ${student.last_name?.toUpperCase()}\n\nThis is to inform you that ${student.first_name} ${student.last_name} has been ${h.action_type === 'Promotion' ? 'promoted' : h.action_type === 'Demotion' ? 'demoted' : 'graduated from'} ${getFormName(h.to_form_id)} at ${schoolName}.\n\nYours faithfully,\n_____________________\nPrincipal\n${schoolName}`;
        await supabase.from('school_promotion_letters').insert([{ student_id: h.student_id, promotion_history_id: h.id, letter_type: h.action_type, content, generated_by: user?.full_name || 'System' }]);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${h.action_type}_Letter_${student.first_name}_${student.last_name}.txt`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Letter generated ✅');
    };

    const getStudentName = (id: number) => { const s = students.find((st: any) => st.id === id); return s ? `${s.first_name} ${s.last_name}` : `Student #${id}`; };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Search</label>
                        <div className="relative"><FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} className="input-modern w-full text-sm pl-9" placeholder="Search by name or adm no..." /></div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Action Type</label>
                        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="select-modern text-sm"><option value="">All</option><option value="Promotion">Promotion</option><option value="Demotion">Demotion</option><option value="Graduation">Graduation</option><option value="Reversal">Reversal</option></select>
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <span className="text-4xl block mb-3">📜</span><p className="font-semibold">No promotion history found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">From</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">To</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Avg</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Eligibility</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Approval</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">SMS</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody>
                                {filtered.map((h: any) => (
                                    <tr key={h.id} className={`border-b border-gray-100 hover:bg-gray-50 ${h.reversed_at ? 'opacity-50 line-through' : ''}`}>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{getStudentName(h.student_id)}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.action_type === 'Promotion' ? 'bg-green-100 text-green-700' : h.action_type === 'Demotion' ? 'bg-red-100 text-red-700' : h.action_type === 'Graduation' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{h.action_type}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-xs">{getFormName(h.from_form_id)} {h.from_stream_id ? getStreamName(h.from_stream_id) : ''}</td>
                                        <td className="px-3 py-2.5 text-center text-xs font-bold">{getFormName(h.to_form_id)} {h.to_stream_id ? getStreamName(h.to_stream_id) : ''}</td>
                                        <td className="px-3 py-2.5 text-center text-xs">{h.average_score ? Number(h.average_score).toFixed(1) : '—'}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.eligibility_status === 'Eligible' ? 'bg-green-100 text-green-700' : h.eligibility_status === 'Conditional' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{h.eligibility_status || '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.approval_status === 'Approved' || h.approval_status === 'Auto' ? 'bg-green-100 text-green-700' : h.approval_status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{h.approval_status}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-xs">{h.sms_sent ? '✅' : '—'}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {!h.reversed_at && h.action_type !== 'Reversal' && (
                                                    <button onClick={() => handleRollback(h)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Rollback"><FiRotateCcw size={13} /></button>
                                                )}
                                                <button onClick={() => generateLetter(h)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Generate Letter"><FiFileText size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
