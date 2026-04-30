'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiBookOpen, FiStar } from 'react-icons/fi';
import UltraGrid from './UltraGrid';

export default function KNECSyllabusTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ subject_id: '', form_id: '', topic_name: '', topic_code: '', sort_order: 0, estimated_lessons: 1, is_exam_area: false, weight_percent: 0 });
  const [filterSubject, setFilterSubject] = useState('');

  const save = async () => {
    if (!f.topic_name || !f.subject_id || !f.form_id) return toast.error('Topic, subject & form required');
    await supabase.from('school_knec_syllabus').insert([f]);
    toast.success('Topic added'); setShow(false); d.fetchAll();
  };

  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_knec_syllabus').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };

  const filtered = filterSubject ? d.knecSyllabus.filter((k: any) => k.subject_id === Number(filterSubject)) : d.knecSyllabus;

  const cols = [
    { key: 'subject_id', label: 'Subject', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{d.getSubjectName(v)}</span> },
    { key: 'form_id', label: 'Form', color: '#065f46', bg: '#ecfdf5', render: (v: any) => d.getFormName(v) },
    { key: 'topic_name', label: 'Topic', color: '#92400e', bg: '#fffbeb', render: (v: any) => <span className="font-semibold">{v}</span> },
    { key: 'topic_code', label: 'Code', color: '#5b21b6', bg: '#f5f3ff' },
    { key: 'sort_order', label: 'Order', color: '#155e75', bg: '#ecfeff' },
    { key: 'estimated_lessons', label: 'Lessons', color: '#166534', bg: '#f0fdf4' },
    { key: 'is_exam_area', label: 'Exam Area', color: '#991b1b', bg: '#fef2f2', render: (v: any) => v ? <span className="text-red-600 font-bold text-[10px] flex items-center gap-1"><FiStar size={9} /> Hot</span> : <span className="text-gray-400 text-[10px]">—</span> },
    { key: 'weight_percent', label: 'Weight %', color: '#6b21a8', bg: '#faf5ff', render: (v: any) => <span className="font-bold">{v || 0}%</span> },
  ];
  const actions = [
    { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: del },
  ];

  // Preload KNEC data
  const preloadKNEC = async () => {
    if (!confirm('Preload KNEC syllabus topics for all subjects? This adds sample data.')) return;
    const inserts: any[] = [];
    d.subjects.forEach((s: any) => {
      d.forms.forEach((fm: any) => {
        const sampleTopics = ['Introduction', 'Core Concepts', 'Advanced Topics', 'Practical Applications', 'Revision & Exam Prep'];
        sampleTopics.forEach((t, i) => {
          inserts.push({ subject_id: s.id, form_id: fm.id, topic_name: `${t} — ${s.subject_name}`, topic_code: `${s.subject_code || s.subject_name.substring(0, 3).toUpperCase()}-${fm.id}-${i + 1}`, sort_order: i + 1, estimated_lessons: 3 + i, is_exam_area: i >= 3, weight_percent: i === 0 ? 10 : i === 4 ? 25 : 15 });
        });
      });
    });
    for (let i = 0; i < inserts.length; i += 50) {
      await supabase.from('school_knec_syllabus').insert(inserts.slice(i, i + 50));
    }
    toast.success(`Preloaded ${inserts.length} KNEC topics`);
    d.fetchAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBookOpen className="text-amber-500" /> KNEC Syllabus</h3><p className="text-xs text-gray-400">{d.knecSyllabus.length} topics</p></div>
        <div className="flex gap-2">
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="select-modern text-xs">
            <option value="">All Subjects</option>
            {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
          <button onClick={preloadKNEC} className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 rounded-xl flex items-center gap-1"><FiStar size={12} /> Preload KNEC</button>
          <button onClick={() => setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#92400e,#f59e0b)' }}><FiPlus size={13} /> Add Topic</button>
        </div>
      </div>
      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="lbl">Subject *</label><select value={f.subject_id} onChange={e => setF({ ...f, subject_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Form *</label><select value={f.form_id} onChange={e => setF({ ...f, form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.forms.map((fm: any) => <option key={fm.id} value={fm.id}>Form {fm.form_number || fm.id}</option>)}</select></div>
            <div><label className="lbl">Topic *</label><input value={f.topic_name} onChange={e => setF({ ...f, topic_name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Code</label><input value={f.topic_code} onChange={e => setF({ ...f, topic_code: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Lessons</label><input type="number" value={f.estimated_lessons} onChange={e => setF({ ...f, estimated_lessons: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div><label className="lbl">Weight %</label><input type="number" value={f.weight_percent} onChange={e => setF({ ...f, weight_percent: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.is_exam_area} onChange={e => setF({ ...f, is_exam_area: e.target.checked })} /> <span className="font-bold">Exam Hot Area</span></label></div>
          </div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#92400e,#f59e0b)' }}>Save Topic</button>
        </div>
      )}
      <UltraGrid columns={cols} data={filtered} actions={actions} emptyMessage="No KNEC topics — click Preload KNEC to add sample data" />
    </div>
  );
}
