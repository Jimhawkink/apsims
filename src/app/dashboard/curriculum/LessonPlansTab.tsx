'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiSend, FiZap } from 'react-icons/fi';
import UltraGrid, { StatusBadge, STATUS_MAPS } from './UltraGrid';

export default function LessonPlansTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ lesson_title:'', subject_id:'', form_id:'', teacher_id:'', term_id:'', duration_minutes:40, learning_objectives:'', key_inquiry_questions:'', learning_activities:'', learning_resources:'', assessment_methods:'', notes:'' });

  const save = async () => {
    if (!f.lesson_title || !f.subject_id) return toast.error('Title & subject required');
    const obj = { ...f, learning_objectives: f.learning_objectives?.split('\n').filter(Boolean), key_inquiry_questions: f.key_inquiry_questions?.split('\n').filter(Boolean), learning_activities: f.learning_activities?.split('\n').filter(Boolean), learning_resources: f.learning_resources?.split('\n').filter(Boolean), assessment_methods: f.assessment_methods?.split('\n').filter(Boolean), status:'Draft' };
    await supabase.from('school_lesson_plans').insert([obj]);
    toast.success('Lesson plan created'); setShow(false); d.fetchAll();
  };

  const del = async (id:number) => { if(!confirm('Delete?')) return; await supabase.from('school_lesson_plans').delete().eq('id',id); toast.success('Deleted'); d.fetchAll(); };
  const approve = async (r:any) => { await supabase.from('school_lesson_plans').update({status:'Approved',approved_by:'HOD'}).eq('id',r.id); toast.success('Approved'); d.fetchAll(); };
  const submit = async (r:any) => { await supabase.from('school_lesson_plans').update({status:'Submitted'}).eq('id',r.id); toast.success('Submitted'); d.fetchAll(); };

  const cols = [
    { key:'lesson_title', label:'Title', color:'#1e40af', bg:'#eff6ff', render:(v:any)=> <span className="font-bold text-indigo-700">{v}</span> },
    { key:'subject_id', label:'Subject', color:'#065f46', bg:'#ecfdf5', render:(v:any)=> d.getSubjectName(v) },
    { key:'form_id', label:'Form', color:'#92400e', bg:'#fffbeb', render:(v:any)=> d.getFormName(v) },
    { key:'teacher_id', label:'Teacher', color:'#5b21b6', bg:'#f5f3ff', render:(v:any)=> d.getTeacherName(v) },
    { key:'duration_minutes', label:'Mins', color:'#155e75', bg:'#ecfeff' },
    { key:'status', label:'Status', color:'#991b1b', bg:'#fef2f2', render:(v:any)=> <StatusBadge status={v} map={STATUS_MAPS.lesson} /> },
    { key:'ai_generated', label:'AI?', color:'#166534', bg:'#f0fdf4', render:(v:any)=> v ? <span className="text-purple-600 font-bold">⚡AI</span> : <span className="text-gray-400">Manual</span> },
  ];
  const actions = [
    { label:'Submit', icon:FiSend, color:'#1e40af', bg:'#eff6ff', onClick:submit, show:(r:any)=>r.status==='Draft' },
    { label:'Approve', icon:FiCheck, color:'#15803d', bg:'#f0fdf4', onClick:approve, show:(r:any)=>r.status==='Submitted' },
    { label:'Delete', icon:FiTrash2, color:'#b91c1c', bg:'#fef2f2', onClick:del },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h3 className="text-sm font-bold text-gray-700">Lesson Plans</h3><p className="text-xs text-gray-400">{d.lessonPlans.length} plans</p></div>
        <button onClick={()=>setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}><FiPlus size={13}/> New Plan</button>
      </div>
      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="lbl">Title *</label><input value={f.lesson_title} onChange={e=>setF({...f,lesson_title:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Subject *</label><select value={f.subject_id} onChange={e=>setF({...f,subject_id:e.target.value})} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s:any)=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Form</label><select value={f.form_id} onChange={e=>setF({...f,form_id:e.target.value})} className="select-modern w-full text-sm"><option value="">Select...</option>{d.forms.map((s:any)=><option key={s.id} value={s.id}>Form {s.form_number||s.id}</option>)}</select></div>
            <div><label className="lbl">Teacher</label><select value={f.teacher_id} onChange={e=>setF({...f,teacher_id:e.target.value})} className="select-modern w-full text-sm"><option value="">Select...</option>{d.teachers.map((t:any)=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            <div><label className="lbl">Term</label><select value={f.term_id} onChange={e=>setF({...f,term_id:e.target.value})} className="select-modern w-full text-sm"><option value="">Select...</option>{d.terms.map((t:any)=><option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
            <div><label className="lbl">Duration (min)</label><input type="number" value={f.duration_minutes} onChange={e=>setF({...f,duration_minutes:Number(e.target.value)})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="lbl">Learning Objectives (one per line)</label><textarea rows={3} value={f.learning_objectives} onChange={e=>setF({...f,learning_objectives:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Key Inquiry Questions</label><textarea rows={3} value={f.key_inquiry_questions} onChange={e=>setF({...f,key_inquiry_questions:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Learning Activities</label><textarea rows={3} value={f.learning_activities} onChange={e=>setF({...f,learning_activities:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Assessment Methods</label><textarea rows={3} value={f.assessment_methods} onChange={e=>setF({...f,assessment_methods:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
          </div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>Save Lesson Plan</button>
        </div>
      )}
      <UltraGrid columns={cols} data={d.lessonPlans} actions={actions} emptyMessage="No lesson plans yet" />
    </div>
  );
}
