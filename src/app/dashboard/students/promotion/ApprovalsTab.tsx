'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCheck, FiX as FiXIcon } from 'react-icons/fi';

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
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {['Pending', 'Approved', 'Rejected', ''].map(f => (
                        <button key={f || 'all'} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {f || 'All'} {f === 'Pending' && pendingCount > 0 && <span className="ml-1 bg-white text-purple-600 px-1.5 rounded-full">{pendingCount}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <span className="text-4xl block mb-3">🛡️</span><p className="font-semibold">No {filter.toLowerCase()} approvals</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((a: any) => {
                        const info = getHistoryInfo(a.promotion_history_id);
                        return (
                            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800">{info?.studentName || `History #${a.promotion_history_id}`}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {info?.action}: {info?.from} → {info?.to} {info?.avg ? `(Avg: ${Number(info.avg).toFixed(1)})` : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">Approver: {a.approver_type} • {new Date(a.created_at).toLocaleDateString()}</p>
                                        {a.comments && <p className="text-xs text-gray-500 mt-1 italic">"{a.comments}"</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${a.status === 'Approved' ? 'bg-green-100 text-green-700' : a.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                                        {a.status === 'Pending' && (
                                            <>
                                                <button onClick={() => handleApproval(a.id, 'Approved')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><FiCheck size={16} /></button>
                                                <button onClick={() => handleApproval(a.id, 'Rejected')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><FiXIcon size={16} /></button>
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
