'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiSave, FiX, FiCheck, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const C = {
  num:{bg:'#f5f3ff',text:'#6d28d9',head:'#ddd6fe'},question:{bg:'#eef2ff',text:'#4338ca',head:'#c7d2fe'},
  subject:{bg:'#f0fdfa',text:'#0f766e',head:'#99f6e4'},type:{bg:'#faf5ff',text:'#7c3aed',head:'#e9d5ff'},
  difficulty:{bg:'#fffbeb',text:'#b45309',head:'#fde68a'},marks:{bg:'#f0fdf4',text:'#15803d',head:'#bbf7d0'},
  blooms:{bg:'#eff6ff',text:'#1d4ed8',head:'#bfdbfe'},source:{bg:'#fdf2f8',text:'#9d174d',head:'#fce7f3'},
  status:{bg:'#ecfdf5',text:'#059669',head:'#a7f3d0'},actions:{bg:'#f5f3ff',text:'#6d28d9',head:'#ddd6fe'},
};
const QT = [{v:'multiple_choice',l:'Multiple Choice',i:'🔘'},{v:'true_false',l:'True/False',i:'✅'},{v:'short_answer',l:'Short Answer',i:'✏️'},{v:'essay',l:'Essay',i:'📝'},{v:'fill_blank',l:'Fill Blank',i:'📋'}];
const DIFF = [{v:'easy',l:'Easy',c:'#22c55e',b:'#f0fdf4',bd:'#bbf7d0'},{v:'medium',l:'Medium',c:'#3b82f6',b:'#eff6ff',bd:'#bfdbfe'},{v:'hard',l:'Hard',c:'#ef4444',b:'#fef2f2',bd:'#fecaca'}];
const BLOOMS = [{v:'remember',l:'Remember',i:'🧠'},{v:'understand',l:'Understand',i:'📖'},{v:'apply',l:'Apply',i:'🔧'},{v:'analyze',l:'Analyze',i:'🔍'},{v:'evaluate',l:'Evaluate',i:'⚖️'},{v:'create',l:'Create',i:'💡'}];

export default function QuestionBankPage() {
  const [loading,setLoading]=useState(true),[questions,setQuestions]=useState<any[]>([]),[subjects,setSubjects]=useState<any[]>([]),
    [topics,setTopics]=useState<any[]>([]),[forms,setForms]=useState<any[]>([]),[saving,setSaving]=useState(false);
  const [search,setSearch]=useState(''),[fSub,setFSub]=useState(''),[fType,setFType]=useState(''),[fDiff,setFDiff]=useState('');
  const [page,setPage]=useState(1),[ps,setPs]=useState(10);
  const [showModal,setShowModal]=useState(false),[editItem,setEditItem]=useState<any>(null),[tab,setTab]=useState<'bank'|'topics'>('bank');
  const [form,setForm]=useState({subject_id:0,topic_id:0,form_id:0,question_text:'',question_type:'multiple_choice',difficulty:'medium',marks:1,correct_answer:'',explanation:'',blooms_level:'',is_approved:true});
  const [mcqOpts,setMcqOpts]=useState([{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}]);
  const [showTopicModal,setShowTopicModal]=useState(false),[topicForm,setTopicForm]=useState({subject_id:0,topic_name:'',form_id:0,description:''});

  const fetchAll=useCallback(async()=>{setLoading(true);const[q,s,t,f]=await Promise.all([supabase.from('school_question_bank').select('*').order('id',{ascending:false}),supabase.from('school_subjects').select('*').eq('is_active',true).order('subject_name'),supabase.from('school_topics').select('*').order('topic_name'),supabase.from('school_forms').select('*').order('form_level')]);setQuestions(q.data||[]);setSubjects(s.data||[]);setTopics(t.data||[]);setForms(f.data||[]);setLoading(false)},[]);
  useEffect(()=>{fetchAll()},[fetchAll]);

  const filtered=useMemo(()=>{let items=[...questions];if(fSub)items=items.filter(q=>String(q.subject_id)===fSub);if(fType)items=items.filter(q=>q.question_type===fType);if(fDiff)items=items.filter(q=>q.difficulty===fDiff);if(search){const s=search.toLowerCase();items=items.filter(q=>q.question_text?.toLowerCase().includes(s)||q.correct_answer?.toLowerCase().includes(s))}return items},[questions,fSub,fType,fDiff,search]);
  const tp=Math.max(1,Math.ceil(filtered.length/ps)),pag=filtered.slice((page-1)*ps,page*ps);
  const getSub=(id:number)=>subjects.find(s=>s.id===id),getTop=(id:number)=>topics.find(t=>t.id===id);
  const getTypeInfo=(t:string)=>QT.find(qt=>qt.v===t)||{l:t,i:'❓'},getDiffInfo=(d:string)=>DIFF.find(df=>df.v===d)||DIFF[1],getBloom=(b:string)=>BLOOMS.find(bl=>bl.v===b);

  const openAdd=()=>{setEditItem(null);setForm({subject_id:subjects[0]?.id||0,topic_id:0,form_id:0,question_text:'',question_type:'multiple_choice',difficulty:'medium',marks:1,correct_answer:'',explanation:'',blooms_level:'',is_approved:true});setMcqOpts([{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}]);setShowModal(true)};
  const openEdit=(q:any)=>{setEditItem(q);setForm({subject_id:q.subject_id,topic_id:q.topic_id||0,form_id:q.form_id||0,question_text:q.question_text,question_type:q.question_type,difficulty:q.difficulty,marks:q.marks,correct_answer:q.correct_answer||'',explanation:q.explanation||'',blooms_level:q.blooms_level||'',is_approved:q.is_approved});if(q.question_type==='multiple_choice'&&q.options){try{const o=typeof q.options==='string'?JSON.parse(q.options):q.options;setMcqOpts(Array.isArray(o)?o.map((x:any)=>({k:x.key||x.label||'',v:x.value||x.text||''})):[{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}])}catch{setMcqOpts([{k:'A',v:''},{k:'B',v:''},{k:'C',v:''},{k:'D',v:''}])}}setShowModal(true)};

  const handleSave=async()=>{if(!form.question_text.trim()||!form.subject_id){toast.error('Question text & subject required');return}setSaving(true);try{const p:any={subject_id:form.subject_id,topic_id:form.topic_id||null,form_id:form.form_id||null,question_text:form.question_text.trim(),question_type:form.question_type,difficulty:form.difficulty,marks:form.marks,correct_answer:form.correct_answer.trim()||null,explanation:form.explanation.trim()||null,blooms_level:form.blooms_level||null,is_approved:form.is_approved,source:editItem?.source||'manual'};if(form.question_type==='multiple_choice')p.options=mcqOpts.filter(o=>o.v.trim());let err;if(editItem?.id)({error:err}=await supabase.from('school_question_bank').update(p).eq('id',editItem.id));else{p.created_by='admin';({error:err}=await supabase.from('school_question_bank').insert([p]))}if(err)throw err;toast.success(editItem?'✅ Updated!':'✅ Added!');setShowModal(false);fetchAll()}catch(e:any){toast.error(e.message||'Failed')}setSaving(false)};
  const handleDelete=async(id:number)=>{if(!confirm('Delete?'))return;const{error}=await supabase.from('school_question_bank').delete().eq('id',id);if(error)toast.error('Failed');else{toast.success('Deleted');fetchAll()}};
  const handleSaveTopic=async()=>{if(!topicForm.topic_name.trim()||!topicForm.subject_id){toast.error('Name & subject required');return}setSaving(true);const{error}=await supabase.from('school_topics').insert([{subject_id:topicForm.subject_id,topic_name:topicForm.topic_name.trim(),form_id:topicForm.form_id||null,description:topicForm.description.trim()||null}]);if(error)toast.error(error.message);else{toast.success('✅ Topic added!');setShowTopicModal(false);fetchAll()}setSaving(false)};

  if(loading)return(<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>📚</div><p className="text-sm font-bold text-gray-500">Loading Question Bank…</p></div>);

  return(<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-extrabold text-gray-900" style={{fontFamily:'Outfit,sans-serif',letterSpacing:'-0.03em'}}>📚 Question Bank</h1><p className="text-sm text-gray-500 mt-1">{questions.length} questions · {topics.length} topics</p></div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15}/></button>
        <button onClick={()=>{setShowTopicModal(true);setTopicForm({subject_id:subjects[0]?.id||0,topic_name:'',form_id:0,description:''})}} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{background:'#f0fdfa',color:'#0f766e',border:'none',cursor:'pointer'}}>📂 Add Topic</button>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><FiPlus size={15}/> Add Question</button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[{l:'Total Questions',v:questions.length,e:'📚',c:'#6366f1'},{l:'MCQ',v:questions.filter(q=>q.question_type==='multiple_choice').length,e:'🔘',c:'#7c3aed'},{l:'Essay',v:questions.filter(q=>q.question_type==='essay').length,e:'📝',c:'#2563eb'},{l:'AI Generated',v:questions.filter(q=>q.source==='ai_generated').length,e:'🤖',c:'#06b6d4'},{l:'Topics',v:topics.length,e:'📂',c:'#059669'}].map((cd,i)=>(
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{borderLeftWidth:4,borderLeftColor:cd.c}}>
          <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{cd.l}</p><span className="text-xl">{cd.e}</span></div>
          <p className="text-xl font-extrabold text-gray-900">{cd.v}</p><div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{background:cd.c}}/>
        </div>))}
    </div>

    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
      {[{k:'bank',l:'📚 Questions',c:questions.length},{k:'topics',l:'📂 Topics',c:topics.length}].map(t=>(
        <button key={t.k} onClick={()=>setTab(t.k as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab===t.k?'bg-white shadow text-indigo-700':'text-gray-500 hover:text-gray-700'}`}>{t.l} ({t.c})</button>))}
    </div>

    {tab==='bank'&&<><div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search questions…" className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 transition-all"/>{search&&<button onClick={()=>{setSearch('');setPage(1)}} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14}/></button>}</div>
      <select value={fSub} onChange={e=>{setFSub(e.target.value);setPage(1)}} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600"><option value="">All Subjects</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
      <select value={fType} onChange={e=>{setFType(e.target.value);setPage(1)}} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600"><option value="">All Types</option>{QT.map(t=><option key={t.v} value={t.v}>{t.i} {t.l}</option>)}</select>
      <select value={fDiff} onChange={e=>{setFDiff(e.target.value);setPage(1)}} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600"><option value="">All Difficulty</option>{DIFF.map(d=><option key={d.v} value={d.v}>{d.l}</option>)}</select>
      <p className="ml-auto text-xs font-bold text-gray-400">{filtered.length} results</p>
    </div></div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}>
      <thead><tr>{[{l:'#',c:C.num},{l:'📝 Question',c:C.question},{l:'📖 Subject',c:C.subject},{l:'🔘 Type',c:C.type},{l:'⚡ Difficulty',c:C.difficulty},{l:'🏆 Marks',c:C.marks},{l:'🧠 Bloom\'s',c:C.blooms},{l:'📡 Source',c:C.source},{l:'✅ Status',c:C.status},{l:'⚙️',c:C.actions}].map((h,i)=><th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{background:h.c.head,color:h.c.text,borderBottom:`2px solid ${h.c.text}30`}}>{h.l}</th>)}</tr></thead>
      <tbody>{pag.length===0?<tr><td colSpan={10} className="text-center py-16 text-gray-400"><span className="text-5xl block mb-2">📚</span><p className="text-sm">No questions found</p></td></tr>:pag.map((q,idx)=>{const sub=getSub(q.subject_id),di=getDiffInfo(q.difficulty),ti=getTypeInfo(q.question_type),bl=getBloom(q.blooms_level);return(
        <tr key={q.id} className="transition-colors" style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}>
          <td className="px-3 py-3 text-center font-bold" style={{background:C.num.bg+'60',color:C.num.text}}>{(page-1)*ps+idx+1}</td>
          <td className="px-3 py-3" style={{background:C.question.bg+'60'}}><p className="font-bold text-gray-900 line-clamp-2" style={{maxWidth:280}}>{q.question_text}</p>{q.topic_id&&<p className="text-[10px] text-gray-400 mt-0.5">📂 {getTop(q.topic_id)?.topic_name||'-'}</p>}</td>
          <td className="px-3 py-3 whitespace-nowrap font-semibold" style={{background:C.subject.bg+'60',color:C.subject.text}}>{sub?.subject_name||'-'}</td>
          <td className="px-3 py-3 whitespace-nowrap" style={{background:C.type.bg+'60'}}><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:C.type.head+'80',color:C.type.text}}>{ti.i} {ti.l}</span></td>
          <td className="px-3 py-3" style={{background:di.b+'60'}}><span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{background:di.b,color:di.c,borderColor:di.bd}}>{q.difficulty==='easy'?'🟢':q.difficulty==='hard'?'🔴':'🔵'} {q.difficulty}</span></td>
          <td className="px-3 py-3 text-center font-extrabold" style={{background:C.marks.bg+'60',color:C.marks.text}}>{q.marks}</td>
          <td className="px-3 py-3 whitespace-nowrap" style={{background:C.blooms.bg+'60'}}>{bl?<span className="text-[10px] font-bold" style={{color:C.blooms.text}}>{bl.i} {bl.l}</span>:<span className="text-gray-300 text-[10px]">—</span>}</td>
          <td className="px-3 py-3 whitespace-nowrap" style={{background:C.source.bg+'60'}}><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${q.source==='ai_generated'?'bg-cyan-50 text-cyan-700':'bg-gray-50 text-gray-500'}`}>{q.source==='ai_generated'?'🤖 AI':'✍️ Manual'}</span></td>
          <td className="px-3 py-3" style={{background:C.status.bg+'60'}}><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${q.is_approved?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{q.is_approved?'✅':'⏳'}</span></td>
          <td className="px-3 py-3" style={{background:C.actions.bg+'60'}}><div className="flex items-center gap-1.5"><button onClick={()=>openEdit(q)} className="p-2 rounded-xl transition hover:scale-110" style={{background:'#c7d2fe',color:'#4338ca'}}><FiEdit2 size={12}/></button><button onClick={()=>handleDelete(q.id)} className="p-2 rounded-xl transition hover:scale-110" style={{background:'#fee2e2',color:'#b91c1c'}}><FiTrash2 size={12}/></button></div></td>
        </tr>);})}</tbody>
    </table></div>
    {filtered.length>0&&<div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between"><p className="text-xs text-gray-400">{Math.min((page-1)*ps+1,filtered.length)}–{Math.min(page*ps,filtered.length)} of {filtered.length}</p><div className="flex items-center gap-1.5"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"><FiChevronLeft size={14}/></button>{Array.from({length:tp},(_,i)=>i+1).filter(p=>p===1||p===tp||Math.abs(p-page)<=1).map(p=><button key={p} onClick={()=>setPage(p)} className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition-all ${page===p?'bg-indigo-600 text-white shadow-md':'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>)}<button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"><FiChevronRight size={14}/></button></div></div>}
    </div></>}

    {tab==='topics'&&<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><table className="w-full border-collapse" style={{fontSize:12}}>
      <thead><tr><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>#</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>📂 Topic</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>📖 Subject</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>🏫 Form</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>📚 Questions</th></tr></thead>
      <tbody>{topics.map((t,i)=>{const sub=getSub(t.subject_id);const qCount=questions.filter(q=>q.topic_id===t.id).length;return(
        <tr key={t.id} className="transition-colors" style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}>
          <td className="px-4 py-3 text-xs font-bold text-gray-400">{i+1}</td><td className="px-4 py-3 font-bold text-gray-900">{t.topic_name}</td><td className="px-4 py-3 text-gray-600">{sub?.subject_name||'-'}</td><td className="px-4 py-3 text-gray-600">{t.form_id?getTop(t.form_id)?.topic_name||`Form ${t.form_id}`:'—'}</td><td className="px-4 py-3"><span className="badge badge-info">{qCount}</span></td>
        </tr>);})}</tbody>
    </table></div>}

    {/* Question Modal */}
    {showModal&&<div className="modal-overlay" onClick={()=>setShowModal(false)}><div className="modal-content" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{background:editItem?'linear-gradient(135deg,#4f46e5,#7c3aed)':'linear-gradient(135deg,#059669,#0d9488)'}}>
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/>
        <div><h2 className="text-lg font-bold text-white flex items-center gap-2">{editItem?'✏️ Edit Question':'🆕 Add Question'}</h2><p className="text-white/70 text-xs mt-0.5">All starred (*) fields are required</p></div>
        <button onClick={()=>setShowModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18}/></button>
      </div>
      <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📖 Subject *</label><select value={form.subject_id} onChange={e=>setForm({...form,subject_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">{subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📂 Topic</label><select value={form.topic_id} onChange={e=>setForm({...form,topic_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"><option value={0}>— None —</option>{topics.filter(t=>t.subject_id===form.subject_id).map(t=><option key={t.id} value={t.id}>{t.topic_name}</option>)}</select></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🔘 Type *</label><select value={form.question_type} onChange={e=>setForm({...form,question_type:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">{QT.map(t=><option key={t.v} value={t.v}>{t.i} {t.l}</option>)}</select></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">⚡ Difficulty</label><select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">{DIFF.map(d=><option key={d.v} value={d.v}>{d.l}</option>)}</select></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🏆 Marks</label><input type="number" value={form.marks} onChange={e=>setForm({...form,marks:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" min={1}/></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🧠 Bloom's Level</label><select value={form.blooms_level} onChange={e=>setForm({...form,blooms_level:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"><option value="">— None —</option>{BLOOMS.map(b=><option key={b.v} value={b.v}>{b.i} {b.l}</option>)}</select></div>
        </div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📝 Question Text *</label><textarea value={form.question_text} onChange={e=>setForm({...form,question_text:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" rows={3} placeholder="Enter the question…"/></div>
        {form.question_type==='multiple_choice'&&<div className="space-y-2"><label className="text-xs font-bold text-gray-600 block uppercase tracking-wider">🔘 Options</label>{mcqOpts.map((o,i)=><div key={i} className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>{o.k}</span><input value={o.v} onChange={e=>{const n=[...mcqOpts];n[i]={...n[i],v:e.target.value};setMcqOpts(n)}} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder={`Option ${o.k}`}/></div>)}</div>}
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">✅ Correct Answer</label><input value={form.correct_answer} onChange={e=>setForm({...form,correct_answer:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="e.g. A or the answer text"/></div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">💡 Explanation</label><textarea value={form.explanation} onChange={e=>setForm({...form,explanation:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" rows={2} placeholder="Optional explanation…"/></div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_approved} onChange={e=>setForm({...form,is_approved:e.target.checked})} className="w-4 h-4 rounded"/><span className="text-sm font-medium text-gray-700">Approved</span></label>
      </div>
      <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50">
        <button onClick={()=>setShowModal(false)} className="btn-outline flex items-center gap-2"><FiX size={14}/> Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{background:editItem?'linear-gradient(135deg,#4f46e5,#7c3aed)':'linear-gradient(135deg,#059669,#0d9488)'}}>{saving?<div className="spinner" style={{width:14,height:14}}/>:<FiSave size={14}/>}{editItem?'💾 Update':'✅ Save'}</button>
      </div>
    </div></div>}

    {/* Topic Modal */}
    {showTopicModal&&<div className="modal-overlay" onClick={()=>setShowTopicModal(false)}><div className="modal-content" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{background:'linear-gradient(135deg,#0f766e,#0d9488)'}}>
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/>
        <h2 className="text-lg font-bold text-white">📂 Add Topic</h2>
        <button onClick={()=>setShowTopicModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18}/></button>
      </div>
      <div className="p-6 space-y-4">
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📖 Subject *</label><select value={topicForm.subject_id} onChange={e=>setTopicForm({...topicForm,subject_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">{subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📂 Topic Name *</label><input value={topicForm.topic_name} onChange={e=>setTopicForm({...topicForm,topic_name:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="e.g. Quadratic Equations"/></div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🏫 Form</label><select value={topicForm.form_id} onChange={e=>setTopicForm({...topicForm,form_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"><option value={0}>— All Forms —</option>{forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
      </div>
      <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50">
        <button onClick={()=>setShowTopicModal(false)} className="btn-outline flex items-center gap-2"><FiX size={14}/> Cancel</button>
        <button onClick={handleSaveTopic} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0d9488)'}}>{saving?<div className="spinner" style={{width:14,height:14}}/>:<FiSave size={14}/>}✅ Save Topic</button>
      </div>
    </div></div>}
  </div>);
}
