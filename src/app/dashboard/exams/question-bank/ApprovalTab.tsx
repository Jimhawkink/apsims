'use client';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCheck, FiX } from 'react-icons/fi';

export default function ApprovalTab({ d }: any) {
  const pending = d.questions.filter((q: any) => q.approval_status === 'pending');
  const approved = d.questions.filter((q: any) => q.approval_status === 'approved');
  const rejected = d.questions.filter((q: any) => q.approval_status === 'rejected');

  const approve = async (q: any) => { await supabase.from('school_question_bank').update({ approval_status: 'approved', is_approved: true, approved_by: 'Admin', approved_at: new Date().toISOString() }).eq('id', q.id); toast.success('Approved'); d.fetchAll(); };
  const reject = async (q: any) => { await supabase.from('school_question_bank').update({ approval_status: 'rejected', is_approved: false }).eq('id', q.id); toast.success('Rejected'); d.fetchAll(); };
  const approveAll = async () => { if (!confirm(`Approve all ${pending.length} questions?`)) return; for (const q of pending) await approve(q); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiCheck className="text-green-500" /> Question Approval Workflow</h3>
        {pending.length > 0 && <button onClick={approveAll} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#15803d,#22c55e)' }}>Approve All ({pending.length})</button>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center"><p className="text-2xl font-bold text-amber-600">{pending.length}</p><p className="text-[10px] font-bold text-amber-500 uppercase">Pending</p></div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center"><p className="text-2xl font-bold text-green-600">{approved.length}</p><p className="text-[10px] font-bold text-green-500 uppercase">Approved</p></div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center"><p className="text-2xl font-bold text-red-600">{rejected.length}</p><p className="text-[10px] font-bold text-red-500 uppercase">Rejected</p></div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-amber-700">Pending Review</h4>
          {pending.map((q: any) => (
            <div key={q.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-start gap-3">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800">{q.question_text}</p>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{d.getSubjectName(q.subject_id)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{q.question_type}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{q.difficulty}</span>
                  {q.source === 'ai_generated' && <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">🤖 AI</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => approve(q)} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><FiCheck size={14}/></button>
                <button onClick={() => reject(q)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><FiX size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {pending.length === 0 && <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center"><FiCheck size={30} className="text-green-400 mx-auto mb-2"/><p className="text-sm font-bold text-green-700">All questions approved!</p></div>}
    </div>
  );
}
