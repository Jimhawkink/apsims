'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCheck, FiX as FiXIcon, FiShield } from 'react-icons/fi';

export default function ApprovalsTab({ data }: { data: any }) {
    const { approvals, history, students, getFormName, user, fetchAll } = data;
    const [filter, setFilter] = useState('Pending');

    const filtered = approvals.filter((a: any) => !filter || a.status === filter);

    const handleApproval = async (approvalId: number, status: 'Approved' | 'Rejected') => {
        const comments = prompt(`${status === 'Approved' ? 'Approve' : 'Reject'} — comments (optional):`) || '';
        const { error } = await supabase.from('school_promotion_approvals').update({
            status, comments, acted_at: new Date().toISOString(), approver_name: user?.full_name || 'Admin',
        }).eq('id', approvalId);
        if (error) { toast.error(error.message); return; }
        if (status === 'Approved') {
            const approval = approvals.find((a: any) => a.id === approvalId);
            if (approval) {
                const hist = history.find((h: any) => h.id === approval.promotion_history_id);
                if (hist) {
                    await supabase.from('school_students').update({ form_id: hist.to_form_id, stream_id: hist.to_stream_id }).eq('id', hist.student_id);
                    await supabase.from('school_promotion_history').update({ approval_status: 'Approved', approved_by: user?.full_name }).eq('id', hist.id);
                }
            }
        } else {
            const approval = approvals.find((a: any) => a.id === approvalId);
            if (approval) {
                const hist = history.find((h: any) => h.id === approval.promotion_history_id);
                if (hist) await supabase.from('school_promotion_history').update({ approval_status: 'Rejected' }).eq('id', hist.id);
            }
        }
        toast.success(`${status} ✅`);
        fetchAll();
    };

    const getStudentName = (id: number) => { const s = students.find((st: any) => st.id === id); return s ? `${s.first_name} ${s.last_name}` : `#${id}`; };

    const getHistoryInfo = (histId: number) => {
        const h = history.find((hi: any) => hi.id === histId);
        if (!h) return null;
        return { studentName: getStudentName(h.student_id), action: h.action_type, from: getFormName(h.from_form_id), to: getFormName(h.to_form_id), avg: h.average_score };
    };

    const pendingCount = approvals.filter((a: any) => a.status === 'Pending').length;

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {['Pending', 'Approved', 'Rejected', ''].map(f => (
                        <button key={f || 'all'} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${filter === f ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {f || 'All'} {f === 'Pending' && pendingCount > 0 && <span className="ml-1 bg-white/25 text-white px-1.5 py-0.5 text-[10px] rounded-full">{pendingCount}</span>}
                        </button>
                    ))}
                </div>
                <span className="text-[11px] text-gray-400">{filtered.length} items</span>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 text-gray-400">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center"><FiShield size={24} className="text-gray-300" /></div>
                    <p className="font-semibold text-sm text-gray-500">No {filter.toLowerCase()} approvals</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((a: any) => {
                        const info = getHistoryInfo(a.promotion_history_id);
                        return (
                            <div key={a.id} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${a.status === 'Pending' ? 'border-amber-200 border-l-4 border-l-amber-400' : 'border-gray-200'}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="text-[12px] font-bold text-gray-800">{info?.studentName || `History #${a.promotion_history_id}`}</h4>
                                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                            {info?.action}: {info?.from} <span className="text-purple-500">→</span> {info?.to} {info?.avg ? `(Avg: ${Number(info.avg).toFixed(1)})` : ''}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">Approver: {a.approver_type} • {new Date(a.created_at).toLocaleDateString()}</p>
                                        {a.comments && <p className="text-[11px] text-gray-500 mt-1 italic">"{a.comments}"</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'Approved' ? 'bg-green-100 text-green-700' : a.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                                        {a.status === 'Pending' && (
                                            <>
                                                <button onClick={() => handleApproval(a.id, 'Approved')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve"><FiCheck size={14} /></button>
                                                <button onClick={() => handleApproval(a.id, 'Rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><FiXIcon size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
