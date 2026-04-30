'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiShield, FiClock } from 'react-icons/fi';
import UltraGrid, { StatusBadge, STATUS_MAPS } from './UltraGrid';

export default function HODApprovalTab({ d }: any) {
  const [filter, setFilter] = useState('');

  const approve = async (r: any) => {
    await supabase.from('school_hod_approvals').update({ status: 'Approved', hod_comments: 'Approved by HOD', acted_at: new Date().toISOString() }).eq('id', r.id);
    // Also update the referenced record
    if (r.request_type === 'Lesson Plan') await supabase.from('school_lesson_plans').update({ status: 'Approved', approved_by: 'HOD' }).eq('id', r.reference_id);
    if (r.request_type === 'Scheme') await supabase.from('school_schemes_of_work').update({ status: 'Approved', approved_by: 'HOD' }).eq('id', r.reference_id);
    toast.success('Approved'); d.fetchAll();
  };

  const reject = async (r: any) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    await supabase.from('school_hod_approvals').update({ status: 'Rejected', hod_comments: reason, acted_at: new Date().toISOString() }).eq('id', r.id);
    if (r.request_type === 'Lesson Plan') await supabase.from('school_lesson_plans').update({ status: 'Draft' }).eq('id', r.reference_id);
    toast.success('Rejected'); d.fetchAll();
  };

  const filtered = filter ? d.hodApprovals.filter((a: any) => a.status === filter) : d.hodApprovals;
  const pending = d.hodApprovals.filter((a: any) => a.status === 'Pending').length;
  const approved = d.hodApprovals.filter((a: any) => a.status === 'Approved').length;
  const rejected = d.hodApprovals.filter((a: any) => a.status === 'Rejected').length;

  const cols = [
    { key: 'request_type', label: 'Type', color: '#1e40af', bg: '#eff6ff', render: (v: any) => {
      const colors: Record<string, string> = { 'Lesson Plan': '#1e40af', 'Scheme': '#065f46', 'Syllabus': '#92400e', 'Content': '#5b21b6' };
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: colors[v] || '#6b7280', backgroundColor: `${colors[v] || '#6b7280'}15` }}>{v}</span>;
    }},
    { key: 'reference_id', label: 'Ref ID', color: '#065f46', bg: '#ecfdf5' },
    { key: 'requested_by', label: 'Requested By', color: '#92400e', bg: '#fffbeb', render: (v: any) => <span className="font-semibold">{v}</span> },
    { key: 'department_id', label: 'Department', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => d.getDeptName(v) },
    { key: 'status', label: 'Status', color: '#991b1b', bg: '#fef2f2', render: (v: any) => <StatusBadge status={v} map={STATUS_MAPS.approval} /> },
    { key: 'hod_comments', label: 'Comments', color: '#155e75', bg: '#ecfeff', render: (v: any) => <span className="text-gray-500 text-xs">{v || '—'}</span> },
    { key: 'acted_at', label: 'Acted At', color: '#166534', bg: '#f0fdf4', render: (v: any) => v ? new Date(v).toLocaleDateString() : '—' },
  ];
  const actions = [
    { label: 'Approve', icon: FiCheck, color: '#15803d', bg: '#f0fdf4', onClick: approve, show: (r: any) => r.status === 'Pending' },
    { label: 'Reject', icon: FiX, color: '#b91c1c', bg: '#fef2f2', onClick: reject, show: (r: any) => r.status === 'Pending' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{approved}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Approved</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{rejected}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Rejected</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiShield className="text-indigo-500" /> HOD Approval Workflow</h3>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="select-modern text-xs">
          <option value="">All Status</option>
          <option>Pending</option><option>Approved</option><option>Rejected</option>
        </select>
      </div>
      <UltraGrid columns={cols} data={filtered} actions={actions} emptyMessage="No approval requests" rowColor={(r: any) => r.status === 'Pending' ? 'bg-amber-50/50' : ''} />
    </div>
  );
}
