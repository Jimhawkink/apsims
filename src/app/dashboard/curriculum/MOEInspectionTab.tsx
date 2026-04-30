'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiFileText, FiStar, FiAlertCircle } from 'react-icons/fi';
import UltraGrid, { StatusBadge, STATUS_MAPS } from './UltraGrid';

export default function MOEInspectionTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ inspection_type: '', inspection_date: '', inspectors: '', findings: '', recommendations: '', rating: 'Satisfactory', areas_checked: '', follow_up_date: '', status: 'Scheduled' });

  const save = async () => {
    if (!f.inspection_type || !f.inspection_date) return toast.error('Type & date required');
    const obj = { ...f, areas_checked: f.areas_checked?.split(',').map((s: string) => s.trim()).filter(Boolean) };
    await supabase.from('school_moe_inspections').insert([obj]);
    toast.success('Inspection recorded'); setShow(false); d.fetchAll();
  };

  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_moe_inspections').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };
  const complete = async (r: any) => { await supabase.from('school_moe_inspections').update({ status: 'Completed' }).eq('id', r.id); toast.success('Marked complete'); d.fetchAll(); };

  const RATING_COLORS: Record<string, { color: string; bg: string }> = {
    'Excellent': { color: '#15803d', bg: '#f0fdf4' },
    'Good': { color: '#1e40af', bg: '#eff6ff' },
    'Satisfactory': { color: '#b45309', bg: '#fffbeb' },
    'Needs Improvement': { color: '#b91c1c', bg: '#fef2f2' },
    'Unsatisfactory': { color: '#991b1b', bg: '#fef2f2' },
  };

  const cols = [
    { key: 'inspection_type', label: 'Type', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{v}</span> },
    { key: 'inspection_date', label: 'Date', color: '#065f46', bg: '#ecfdf5', render: (v: any) => new Date(v).toLocaleDateString() },
    { key: 'inspectors', label: 'Inspectors', color: '#92400e', bg: '#fffbeb' },
    { key: 'rating', label: 'Rating', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => { const rc = RATING_COLORS[v] || RATING_COLORS.Satisfactory; return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: rc.color, backgroundColor: rc.bg }}>{v}</span>; } },
    { key: 'status', label: 'Status', color: '#991b1b', bg: '#fef2f2', render: (v: any) => <StatusBadge status={v} map={STATUS_MAPS.inspection} /> },
    { key: 'follow_up_date', label: 'Follow Up', color: '#155e75', bg: '#ecfeff', render: (v: any) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'findings', label: 'Findings', color: '#166534', bg: '#f0fdf4', render: (v: any) => <span className="text-gray-500 text-xs max-w-[200px] truncate block">{v || '—'}</span> },
  ];
  const actions = [
    { label: 'Complete', icon: FiStar, color: '#15803d', bg: '#f0fdf4', onClick: complete, show: (r: any) => r.status === 'Scheduled' || r.status === 'In Progress' },
    { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: del },
  ];

  const scheduled = d.moeInspections.filter((m: any) => m.status === 'Scheduled').length;
  const completed = d.moeInspections.filter((m: any) => m.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{scheduled}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Scheduled</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Completed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{d.moeInspections.length}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiFileText className="text-amber-500" /> MOE Inspection Reports</h3>
        <button onClick={() => setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#92400e,#f59e0b)' }}><FiPlus size={13} /> New Inspection</button>
      </div>
      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="lbl">Type *</label><input value={f.inspection_type} onChange={e => setF({ ...f, inspection_type: e.target.value })} placeholder="e.g. Curriculum Audit" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Date *</label><input type="date" value={f.inspection_date} onChange={e => setF({ ...f, inspection_date: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Inspectors</label><input value={f.inspectors} onChange={e => setF({ ...f, inspectors: e.target.value })} placeholder="Names..." className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Rating</label><select value={f.rating} onChange={e => setF({ ...f, rating: e.target.value })} className="select-modern w-full text-sm"><option>Excellent</option><option>Good</option><option>Satisfactory</option><option>Needs Improvement</option><option>Unsatisfactory</option></select></div>
            <div><label className="lbl">Follow Up Date</label><input type="date" value={f.follow_up_date} onChange={e => setF({ ...f, follow_up_date: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Areas Checked</label><input value={f.areas_checked} onChange={e => setF({ ...f, areas_checked: e.target.value })} placeholder="Curriculum, Records..." className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">Findings</label><textarea rows={3} value={f.findings} onChange={e => setF({ ...f, findings: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Recommendations</label><textarea rows={3} value={f.recommendations} onChange={e => setF({ ...f, recommendations: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
          </div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#92400e,#f59e0b)' }}>Save Inspection</button>
        </div>
      )}
      <UltraGrid columns={cols} data={d.moeInspections} actions={actions} emptyMessage="No MOE inspections recorded" />
    </div>
  );
}
