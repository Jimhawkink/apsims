'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiDownload, FiBook, FiFileText, FiCheck, FiX } from 'react-icons/fi';
import UltraGrid, { StatusBadge } from './UltraGrid';

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  Note: { color: '#1e40af', bg: '#eff6ff' },
  Video: { color: '#b91c1c', bg: '#fef2f2' },
  Document: { color: '#065f46', bg: '#ecfdf5' },
  Presentation: { color: '#92400e', bg: '#fffbeb' },
  Textbook: { color: '#5b21b6', bg: '#f5f3ff' },
  Exam: { color: '#991b1b', bg: '#fef2f2' },
  Worksheet: { color: '#155e75', bg: '#ecfeff' },
};

export default function ContentBankTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ title: '', content_type: 'Note', subject_id: '', topic_id: '', form_id: '', content: '', source: 'Teacher' });
  const [filter, setFilter] = useState('');

  const save = async () => {
    if (!f.title || !f.subject_id) return toast.error('Title & subject required');
    await supabase.from('school_content_bank').insert([f]);
    toast.success('Content added'); setShow(false); d.fetchAll();
  };

  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_content_bank').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };
  const approve = async (r: any) => { await supabase.from('school_content_bank').update({ is_approved: true, approved_by: 'Admin' }).eq('id', r.id); toast.success('Approved'); d.fetchAll(); };
  const reject = async (r: any) => { await supabase.from('school_content_bank').update({ is_approved: false }).eq('id', r.id); toast.success('Rejected'); d.fetchAll(); };

  const filtered = filter ? d.contentBank.filter((c: any) => c.content_type === filter) : d.contentBank;

  const cols = [
    { key: 'title', label: 'Title', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{v}</span> },
    { key: 'content_type', label: 'Type', color: '#065f46', bg: '#ecfdf5', render: (v: any) => { const tc = TYPE_COLORS[v] || TYPE_COLORS.Note; return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: tc.color, backgroundColor: tc.bg }}>{v}</span>; } },
    { key: 'subject_id', label: 'Subject', color: '#92400e', bg: '#fffbeb', render: (v: any) => d.getSubjectName(v) },
    { key: 'form_id', label: 'Form', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => v ? d.getFormName(v) : 'All' },
    { key: 'source', label: 'Source', color: '#155e75', bg: '#ecfeff' },
    { key: 'is_approved', label: 'Approved', color: '#166534', bg: '#f0fdf4', render: (v: any) => v ? <span className="text-green-600 font-bold text-[10px]">✓ Approved</span> : <span className="text-amber-600 text-[10px]">Pending</span> },
    { key: 'is_digital', label: 'Digital', color: '#6b21a8', bg: '#faf5ff', render: (v: any) => v ? <span className="text-purple-600 text-[10px] font-bold">📱 Digital</span> : <span className="text-gray-400 text-[10px]">Print</span> },
    { key: 'downloads', label: 'Downloads', color: '#991b1b', bg: '#fef2f2' },
  ];
  const actions = [
    { label: 'Approve', icon: FiCheck, color: '#15803d', bg: '#f0fdf4', onClick: approve, show: (r: any) => !r.is_approved },
    { label: 'Reject', icon: FiX, color: '#b91c1c', bg: '#fef2f2', onClick: reject, show: (r: any) => r.is_approved },
    { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: del },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBook className="text-indigo-500" /> Content / Topic Bank</h3><p className="text-xs text-gray-400">{d.contentBank.length} items</p></div>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="select-modern text-xs">
            <option value="">All Types</option>
            {Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}><FiPlus size={13} /> Add Content</button>
        </div>
      </div>
      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="lbl">Title *</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Type</label><select value={f.content_type} onChange={e => setF({ ...f, content_type: e.target.value })} className="select-modern w-full text-sm">{Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="lbl">Subject *</label><select value={f.subject_id} onChange={e => setF({ ...f, subject_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Form</label><select value={f.form_id} onChange={e => setF({ ...f, form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">All Forms</option>{d.forms.map((fm: any) => <option key={fm.id} value={fm.id}>Form {fm.form_number || fm.id}</option>)}</select></div>
          </div>
          <div><label className="lbl">Content / Description</label><textarea rows={3} value={f.content} onChange={e => setF({ ...f, content: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>Save Content</button>
        </div>
      )}
      <UltraGrid columns={cols} data={filtered} actions={actions} emptyMessage="No content yet" />
    </div>
  );
}
