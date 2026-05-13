'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiRotateCcw, FiSearch, FiDownload, FiFileText, FiClock } from 'react-icons/fi';

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
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Search</label>
                        <div className="relative"><FiSearch className="absolute left-3 top-2.5 text-gray-400" size={12} /><input value={search} onChange={e => setSearch(e.target.value)} className="input-modern w-full text-[11px] pl-8" placeholder="Search by name or adm no..." /></div>
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Action Type</label>
                        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="select-modern text-[11px]">
                            <option value="">All</option><option value="Promotion">Promotion</option><option value="Demotion">Demotion</option><option value="Graduation">Graduation</option><option value="Reversal">Reversal</option>
                        </select>
                    </div>
                </div>
                <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50 flex items-center gap-3">
                    <span className="text-[11px] font-bold text-gray-600">{filtered.length} Records</span>
                    <div className="w-px h-4 bg-gray-200" />
                    <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-green-500" />{history.filter((h:any) => h.action_type==='Promotion' && !h.reversed_at).length} Promotions</span>
                    <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-blue-500" />{history.filter((h:any) => h.action_type==='Graduation').length} Graduations</span>
                    <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-red-500" />{history.filter((h:any) => h.action_type==='Demotion').length} Demotions</span>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 text-gray-400">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center"><FiClock size={24} className="text-gray-300" /></div>
                    <p className="font-semibold text-sm text-gray-500">No promotion history found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">From</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">To</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Elig.</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Apprvl</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">SMS</th>
                                <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr></thead>
                            <tbody>
                                {filtered.map((h: any) => (
                                    <tr key={h.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-150 ${h.reversed_at ? 'opacity-40' : ''}`}>
                                        <td className="px-2.5 py-2 text-[11px] text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td>
                                        <td className="px-2.5 py-2 text-[11px] font-semibold text-gray-800">{getStudentName(h.student_id)}</td>
                                        <td className="px-2.5 py-2 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.action_type === 'Promotion' ? 'bg-green-100 text-green-700' : h.action_type === 'Demotion' ? 'bg-red-100 text-red-700' : h.action_type === 'Graduation' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{h.action_type}</span>
                                        </td>
                                        <td className="px-2.5 py-2 text-center text-[11px] text-gray-500">{getFormName(h.from_form_id)}</td>
                                        <td className="px-2.5 py-2 text-center text-[11px] font-bold text-gray-700">{getFormName(h.to_form_id)}</td>
                                        <td className="px-2.5 py-2 text-center text-[11px]">{h.average_score ? Number(h.average_score).toFixed(1) : '—'}</td>
                                        <td className="px-2.5 py-2 text-center">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${h.eligibility_status === 'Eligible' ? 'bg-green-100 text-green-700' : h.eligibility_status === 'Conditional' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{h.eligibility_status || '—'}</span>
                                        </td>
                                        <td className="px-2.5 py-2 text-center">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${h.approval_status === 'Approved' || h.approval_status === 'Auto' ? 'bg-green-100 text-green-700' : h.approval_status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{h.approval_status}</span>
                                        </td>
                                        <td className="px-2.5 py-2 text-center text-[11px]">{h.sms_sent ? '✅' : '—'}</td>
                                        <td className="px-2.5 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {!h.reversed_at && h.action_type !== 'Reversal' && (
                                                    <button onClick={() => handleRollback(h)} className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Rollback"><FiRotateCcw size={11} /></button>
                                                )}
                                                <button onClick={() => generateLetter(h)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Generate Letter"><FiFileText size={11} /></button>
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
