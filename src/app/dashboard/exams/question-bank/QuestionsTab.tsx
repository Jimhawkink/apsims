'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiSearch, FiSave, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';

const QT=[{v:'multiple_choice',l:'MCQ',e:'🔘'},{v:'true_false',l:'True/False',e:'✅'},{v:'short_answer',l:'Short',e:'✏️'},{v:'essay',l:'Essay',e:'📝'},{v:'fill_blank',l:'Fill Blank',e:'📋'},{v:'calculation',l:'Calculation',e:'🔢'}];
const DIFF=[{v:'easy',l:'Easy',c:'#22c55e',b:'#f0fdf4'},{v:'medium',l:'Medium',c:'#3b82f6',b:'#eff6ff'},{v:'hard',l:'Hard',c:'#ef4444',b:'#fef2f2'}];
const BLOOMS=[{v:'remember',l:'Remember',e:'🧠'},{v:'understand',l:'Understand',e:'📖'},{v:'apply',l:'Apply',e:'🔧'},{v:'analyze',l:'Analyze',e:'🔍'},{v:'evaluate',l:'Evaluate',e:'⚖️'},{v:'create',l:'Create',e:'💡'}];

export default function QuestionsTab({ d }: any) {
  const [search,setSearch]=useState(''),[fSub,setFSub]=useState(''),[fType,setFType]=useState(''),[fDiff,setFDiff]=useState('');
  const [showModal,setShowModal]=useState(false),[editItem,setEditItem]=useState<any>(null);
  const [form,setForm]=useState<any>({subject_id:0,topic_id:0,form_id:0,question_text:'',question_type:'multiple_choice',difficulty:'medium',marks:1,correct_answer:'',explanation:'',blooms_level:'',marking_scheme:'',calculation_steps:'',is_approved:true});
  const [mcqOpts,setMcqOpts]=useState([{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}]);
  const [page,setPage]=useState(1);const ps=10;

  const filtered=useMemo(()=>{let items=[...d.questions];if(fSub)items=items.filter((q:any)=>String(q.subject_id)===fSub);if(fType)items=items.filter((q:any)=>q.question_type===fType);if(fDiff)items=items.filter((q:any)=>q.difficulty===fDiff);if(search){const s=search.toLowerCase();items=items.filter((q:any)=>q.question_text?.toLowerCase().includes(s))}return items},[d.questions,fSub,fType,fDiff,search]);
  const tp=Math.max(1,Math.ceil(filtered.length/ps)),pag=filtered.slice((page-1)*ps,page*ps);

  const openAdd=()=>{setEditItem(null);setForm({subject_id:d.subjects[0]?.id||0,topic_id:0,form_id:0,question_text:'',question_type:'multiple_choice',difficulty:'medium',marks:1,correct_answer:'',explanation:'',blooms_level:'',marking_scheme:'',calculation_steps:'',is_approved:true});setMcqOpts([{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}]);setShowModal(true)};
  const openEdit=(q:any)=>{setEditItem(q);setForm({...q,essay_marking_points:q.essay_marking_points||[]});if(q.question_type==='multiple_choice'&&q.options){try{const o=typeof q.options==='string'?JSON.parse(q.options):q.options;setMcqOpts(Array.isArray(o)?o.map((x:any)=>({k:x.key||x.label||'',v:x.value||x.text||''})):[{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}])}catch{setMcqOpts([{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}])}}setShowModal(true)};

  const handleSave=async()=>{
    if(!form.question_text.trim()||!form.subject_id)return toast.error('Question & subject required');
    const p:any={subject_id:form.subject_id,topic_id:form.topic_id||null,form_id:form.form_id||null,question_text:form.question_text.trim(),question_type:form.question_type,difficulty:form.difficulty,marks:form.marks,correct_answer:form.correct_answer||null,explanation:form.explanation||null,blooms_level:form.blooms_level||null,marking_scheme:form.marking_scheme||null,calculation_steps:form.calculation_steps||null,is_approved:form.is_approved,approval_status:form.is_approved?'approved':'pending',source:editItem?.source||'manual'};
    if(form.question_type==='multiple_choice')p.options=mcqOpts.filter(o=>o.v.trim());
    let err;if(editItem?.id)({error:err}=await supabase.from('school_question_bank').update(p).eq('id',editItem.id));else{p.created_by='admin';({error:err}=await supabase.from('school_question_bank').insert([p]))}
    if(err)toast.error(err.message);else{toast.success(editItem?'Updated':'Added');setShowModal(false);d.fetchAll()}
  };
  const del=async(id:number)=>{if(!confirm('Delete?'))return;await supabase.from('school_question_bank').delete().eq('id',id);toast.success('Deleted');d.fetchAll()};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search…" className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs w-48 focus:border-indigo-300 outline-none"/></div>
          <select value={fSub} onChange={e=>{setFSub(e.target.value);setPage(1)}} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"><option value="">All Subjects</option>{d.subjects.map((s:any)=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
          <select value={fType} onChange={e=>{setFType(e.target.value);setPage(1)}} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"><option value="">All Types</option>{QT.map(t=><option key={t.v} value={t.v}>{t.e} {t.l}</option>)}</select>
          <select value={fDiff} onChange={e=>{setFDiff(e.target.value);setPage(1)}} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"><option value="">All Difficulty</option>{DIFF.map(df=><option key={df.v} value={df.v}>{df.l}</option>)}</select>
        </div>
        <div className="flex gap-2">
          <button onClick={d.fetchAll} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600"><FiRefreshCw size={14}/></button>
          <button onClick={openAdd} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}><FiPlus size={13}/> Add Question</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full" style={{fontSize:12}}>
          <thead><tr>{[{l:'#',bg:'#f5f3ff',c:'#6d28d9'},{l:'Question',bg:'#eef2ff',c:'#4338ca'},{l:'Subject',bg:'#f0fdfa',c:'#0f766e'},{l:'Type',bg:'#faf5ff',c:'#7c3aed'},{l:'Diff',bg:'#fffbeb',c:'#b45309'},{l:'Marks',bg:'#f0fdf4',c:'#15803d'},{l:"Bloom's",bg:'#eff6ff',c:'#1d4ed8'},{l:'Source',bg:'#fdf2f8',c:'#9d174d'},{l:'Status',bg:'#ecfdf5',c:'#059669'},{l:'⚙️',bg:'#f5f3ff',c:'#6d28d9'}].map((h,i)=><th key={i} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{background:h.bg,color:h.c,borderBottom:`2px solid ${h.c}30`}}>{h.l}</th>)}</tr></thead>
          <tbody>{pag.map((q:any,idx:number)=>{const di=DIFF.find(df=>df.v===q.difficulty)||DIFF[1];const ti=QT.find(t=>t.v===q.question_type);const bl=BLOOMS.find(b=>b.v===q.blooms_level);return(
            <tr key={q.id} className="border-b border-gray-50 hover:bg-indigo-50/30">
              <td className="px-3 py-2 text-center font-bold" style={{color:'#6d28d9'}}>{(page-1)*ps+idx+1}</td>
              <td className="px-3 py-2 max-w-[250px] truncate font-semibold text-gray-800">{q.question_text}</td>
              <td className="px-3 py-2 font-semibold" style={{color:'#0f766e'}}>{d.getSubjectName(q.subject_id)}</td>
              <td className="px-3 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#e9d5ff',color:'#7c3aed'}}>{ti?.e} {ti?.l}</span></td>
              <td className="px-3 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{background:di.b,color:di.c,borderColor:di.c+'40'}}>{q.difficulty}</span></td>
              <td className="px-3 py-2 text-center font-extrabold" style={{color:'#15803d'}}>{q.marks}</td>
              <td className="px-3 py-2">{bl?<span className="text-[10px] font-bold" style={{color:'#1d4ed8'}}>{bl.e} {bl.l}</span>:<span className="text-gray-300 text-[10px]">—</span>}</td>
              <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.source==='ai_generated'?'bg-cyan-50 text-cyan-700':'bg-gray-50 text-gray-500'}`}>{q.source==='ai_generated'?'🤖 AI':'✍️ Manual'}</span></td>
              <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${q.is_approved?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{q.is_approved?'✅':'⏳'}</span></td>
              <td className="px-3 py-2"><div className="flex gap-1"><button onClick={()=>openEdit(q)} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:scale-110 transition"><FiEdit2 size={12}/></button><button onClick={()=>del(q.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:scale-110 transition"><FiTrash2 size={12}/></button></div></td>
            </tr>);})}</tbody>
        </table>
        {filtered.length===0&&<p className="text-center py-8 text-gray-400 text-sm">No questions found</p>}
      </div>

      {filtered.length>ps&&<div className="flex items-center justify-between px-2"><p className="text-xs text-gray-400">{Math.min((page-1)*ps+1,filtered.length)}–{Math.min(page*ps,filtered.length)} of {filtered.length}</p><div className="flex gap-1">{Array.from({length:tp},(_,i)=>i+1).filter(p=>p===1||p===tp||Math.abs(p-page)<=1).map(p=><button key={p} onClick={()=>setPage(p)} className={`min-w-[28px] h-7 rounded-lg text-xs font-bold ${page===p?'bg-indigo-600 text-white':'border border-gray-200 text-gray-600'}`}>{p}</button>)}</div></div>}

      {showModal&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{background:editItem?'linear-gradient(135deg,#4f46e5,#7c3aed)':'linear-gradient(135deg,#059669,#0d9488)'}}>
          <h2 className="text-sm font-bold text-white">{editItem?'✏️ Edit':'🆕 Add'} Question</h2>
          <button onClick={()=>setShowModal(false)} className="p-1.5 rounded-lg bg-white/20 text-white"><FiX size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">Subject *</label><select value={form.subject_id} onChange={e=>setForm({...form,subject_id:Number(e.target.value)})} className="select-modern w-full text-sm">{d.subjects.map((s:any)=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Topic</label><select value={form.topic_id} onChange={e=>setForm({...form,topic_id:Number(e.target.value)})} className="select-modern w-full text-sm"><option value={0}>— None —</option>{d.topics.filter((t:any)=>t.subject_id===form.subject_id).map((t:any)=><option key={t.id} value={t.id}>{t.topic_name}</option>)}</select></div>
            <div><label className="lbl">Type</label><select value={form.question_type} onChange={e=>setForm({...form,question_type:e.target.value})} className="select-modern w-full text-sm">{QT.map(t=><option key={t.v} value={t.v}>{t.e} {t.l}</option>)}</select></div>
            <div><label className="lbl">Difficulty</label><select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} className="select-modern w-full text-sm">{DIFF.map(df=><option key={df.v} value={df.v}>{df.l}</option>)}</select></div>
            <div><label className="lbl">Marks</label><input type="number" min={1} value={form.marks} onChange={e=>setForm({...form,marks:Number(e.target.value)})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"/></div>
            <div><label className="lbl">Bloom's</label><select value={form.blooms_level} onChange={e=>setForm({...form,blooms_level:e.target.value})} className="select-modern w-full text-sm"><option value="">— None —</option>{BLOOMS.map(b=><option key={b.v} value={b.v}>{b.e} {b.l}</option>)}</select></div>
          </div>
          <div><label className="lbl">Question Text *</label><textarea rows={3} value={form.question_text} onChange={e=>setForm({...form,question_text:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"/></div>
          {form.question_type==='multiple_choice'&&<div className="space-y-1.5"><label className="lbl">Options</label>{mcqOpts.map((o,i)=><div key={i} className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{background:'#6366f1'}}>{o.k}</span><input value={o.v} onChange={e=>{const n=[...mcqOpts];n[i]={...n[i],v:e.target.value};setMcqOpts(n)}} className="flex-1 px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm outline-none" placeholder={`Option ${o.k}`}/></div>)}</div>}
          <div><label className="lbl">Correct Answer</label><input value={form.correct_answer} onChange={e=>setForm({...form,correct_answer:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none" placeholder="e.g. A"/></div>
          <div><label className="lbl">Explanation</label><textarea rows={2} value={form.explanation} onChange={e=>setForm({...form,explanation:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none"/></div>
          <div><label className="lbl">Marking Scheme</label><textarea rows={2} value={form.marking_scheme} onChange={e=>setForm({...form,marking_scheme:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none" placeholder="Full marking guide…"/></div>
          {form.question_type==='calculation'&&<div><label className="lbl">Calculation Steps</label><textarea rows={2} value={form.calculation_steps} onChange={e=>setForm({...form,calculation_steps:e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none" placeholder="Step 1: …"/></div>}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_approved} onChange={e=>setForm({...form,is_approved:e.target.checked})} className="w-4 h-4 rounded"/><span className="text-sm text-gray-700">Approved</span></label>
        </div>
        <div className="p-4 border-t flex gap-2 justify-end bg-gray-50">
          <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 rounded-xl border">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5" style={{background:editItem?'linear-gradient(135deg,#4f46e5,#7c3aed)':'linear-gradient(135deg,#059669,#0d9488)'}}><FiSave size={13}/> {editItem?'Update':'Save'}</button>
        </div>
      </div></div>}
    </div>
  );
}
