'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiX, FiSave, FiRefreshCw, FiPrinter, FiFileText, FiZap, FiChevronLeft, FiChevronRight, FiTrash2, FiEdit2 } from 'react-icons/fi';

const C = {
  num:{bg:'#f5f3ff',text:'#6d28d9',head:'#ddd6fe'},title:{bg:'#eef2ff',text:'#4338ca',head:'#c7d2fe'},
  subject:{bg:'#f0fdfa',text:'#0f766e',head:'#99f6e4'},form:{bg:'#faf5ff',text:'#7c3aed',head:'#e9d5ff'},
  marks:{bg:'#f0fdf4',text:'#15803d',head:'#bbf7d0'},duration:{bg:'#fffbeb',text:'#b45309',head:'#fde68a'},
  type:{bg:'#eff6ff',text:'#1d4ed8',head:'#bfdbfe'},status:{bg:'#ecfdf5',text:'#059669',head:'#a7f3d0'},
  actions:{bg:'#f5f3ff',text:'#6d28d9',head:'#ddd6fe'},
};
const DIFF = [{v:'easy',l:'Easy'},{v:'medium',l:'Medium'},{v:'hard',l:'Hard'}];

export default function PaperGeneratorPage() {
  const [loading,setLoading]=useState(true),[papers,setPapers]=useState<any[]>([]),[subjects,setSubjects]=useState<any[]>([]),
    [questions,setQuestions]=useState<any[]>([]),[forms,setForms]=useState<any[]>([]),[terms,setTerms]=useState<any[]>([]),
    [examTypes,setExamTypes]=useState<any[]>([]),[saving,setSaving]=useState(false);
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[ps,setPs]=useState(10);

  // Generator state
  const [showGen,setShowGen]=useState(false),[genForm,setGenForm]=useState({subject_id:0,form_id:0,term_id:0,exam_type_id:0,paper_title:'',duration_minutes:60,instructions:'',paper_type:'auto_generated'});
  const [genConfig,setGenConfig]=useState({easy:3,medium:4,hard:3,totalMarks:50,sections:[{label:'Section A',type:'multiple_choice',count:10},{label:'Section B',type:'short_answer',count:5},{label:'Section C',type:'essay',count:2}]});
  const [selectedQs,setSelectedQs]=useState<any[]>([]),[genStep,setGenStep]=useState(0); // 0=config,1=pick,2=preview

  const fetchAll=useCallback(async()=>{setLoading(true);const[p,s,q,f,t,et]=await Promise.all([supabase.from('school_exam_papers').select('*').order('id',{ascending:false}),supabase.from('school_subjects').select('*').eq('is_active',true).order('subject_name'),supabase.from('school_question_bank').select('*').eq('is_approved',true).order('id'),supabase.from('school_forms').select('*').order('form_level'),supabase.from('school_terms').select('*').order('id',{ascending:false}),supabase.from('school_exam_types').select('*').order('id')]);setPapers(p.data||[]);setSubjects(s.data||[]);setQuestions(q.data||[]);setForms(f.data||[]);setTerms(t.data||[]);setExamTypes(et.data||[]);setLoading(false)},[]);
  useEffect(()=>{fetchAll()},[fetchAll]);

  const filtered=useMemo(()=>{let items=[...papers];if(search){const s=search.toLowerCase();items=items.filter(p=>p.paper_title?.toLowerCase().includes(s))}return items},[papers,search]);
  const tp=Math.max(1,Math.ceil(filtered.length/ps)),pag=filtered.slice((page-1)*ps,page*ps);
  const getSub=(id:number)=>subjects.find(s=>s.id===id),getForm=(id:number)=>forms.find(f=>f.id===id);

  const openGenerator=()=>{setGenForm({subject_id:subjects[0]?.id||0,form_id:0,term_id:0,exam_type_id:0,paper_title:'',duration_minutes:60,instructions:'',paper_type:'auto_generated'});setGenConfig({easy:3,medium:4,hard:3,totalMarks:50,sections:[{label:'Section A',type:'multiple_choice',count:10},{label:'Section B',type:'short_answer',count:5},{label:'Section C',type:'essay',count:2}]});setSelectedQs([]);setGenStep(0);setShowGen(true)};

  const autoSelectQuestions=()=>{
    if(!genForm.subject_id){toast.error('Select a subject first');return}
    const subQs=questions.filter(q=>q.subject_id===genForm.subject_id);
    const picked:any[]=[];
    genConfig.sections.forEach(sec=>{
      const secQs=subQs.filter(q=>q.question_type===sec.type);
      // Pick by difficulty distribution
      const easyQs=secQs.filter(q=>q.difficulty==='easy').sort(()=>Math.random()-0.5);
      const medQs=secQs.filter(q=>q.difficulty==='medium').sort(()=>Math.random()-0.5);
      const hardQs=secQs.filter(q=>q.difficulty==='hard').sort(()=>Math.random()-0.5);
      const easyCount=Math.ceil(sec.count*0.3),medCount=Math.ceil(sec.count*0.4),hardCount=sec.count-easyCount-medCount;
      [...easyQs.slice(0,easyCount),...medQs.slice(0,medCount),...hardQs.slice(0,hardCount)].forEach(q=>{
        if(picked.length<genConfig.sections.reduce((a,s)=>a+s.count,0)&&!picked.find(p=>p.id===q.id))picked.push({...q,section_label:sec.label});
      });
    });
    setSelectedQs(picked);
    setGenStep(1);
    toast.success(`🎯 ${picked.length} questions auto-selected!`);
  };

  const handleSavePaper=async()=>{
    if(!genForm.paper_title.trim()||!genForm.subject_id){toast.error('Title & subject required');return}
    if(selectedQs.length===0){toast.error('Select at least one question');return}
    setSaving(true);try{
      const totalMarks=selectedQs.reduce((a,q)=>a+(q.marks||1),0);
      const{data:paper,error:pErr}=await supabase.from('school_exam_papers').insert([{paper_title:genForm.paper_title.trim(),subject_id:genForm.subject_id,form_id:genForm.form_id||null,term_id:genForm.term_id||null,exam_type_id:genForm.exam_type_id||null,total_marks:totalMarks,duration_minutes:genForm.duration_minutes,instructions:genForm.instructions.trim()||null,paper_type:genForm.paper_type,status:'Draft',created_by:'admin'}]).select().single();
      if(pErr)throw pErr;
      // Insert paper-question links
      const links=selectedQs.map((q,i)=>({paper_id:paper.id,question_id:q.id,question_order:i+1,section_label:q.section_label||null,marks_override:null}));
      const{error:lErr}=await supabase.from('school_exam_paper_questions').insert(links);
      if(lErr)throw lErr;
      toast.success('✅ Exam paper generated!');setShowGen(false);fetchAll();
    }catch(e:any){toast.error(e.message||'Failed')}setSaving(false);
  };

  const handleDelete=async(id:number)=>{if(!confirm('Delete this paper?'))return;const{error}=await supabase.from('school_exam_papers').delete().eq('id',id);if(error)toast.error('Failed');else{toast.success('Deleted');fetchAll()}};

  const toggleQuestion=(q:any)=>{
    if(selectedQs.find(s=>s.id===q.id)){setSelectedQs(selectedQs.filter(s=>s.id!==q.id))}
    else{setSelectedQs([...selectedQs,q])}
  };

  const availableQs=questions.filter(q=>q.subject_id===genForm.subject_id);

  if(loading)return(<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>📝</div><p className="text-sm font-bold text-gray-500">Loading Papers…</p></div>);

  return(<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-extrabold text-gray-900" style={{fontFamily:'Outfit,sans-serif',letterSpacing:'-0.03em'}}>📝 Exam Paper Generator</h1><p className="text-sm text-gray-500 mt-1">{papers.length} papers · Auto-generate from question bank</p></div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15}/></button>
        <button onClick={openGenerator} className="btn-primary flex items-center gap-2"><FiZap size={15}/> Generate Paper</button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[{l:'Total Papers',v:papers.length,e:'📝',c:'#6366f1'},{l:'Drafts',v:papers.filter(p=>p.status==='Draft').length,e:'📋',c:'#f59e0b'},{l:'Published',v:papers.filter(p=>p.status==='Published').length,e:'✅',c:'#059669'},{l:'Questions Available',v:questions.length,e:'📚',c:'#2563eb'}].map((cd,i)=>(
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{borderLeftWidth:4,borderLeftColor:cd.c}}>
          <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{cd.l}</p><span className="text-xl">{cd.e}</span></div>
          <p className="text-xl font-extrabold text-gray-900">{cd.v}</p><div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{background:cd.c}}/>
        </div>))}
    </div>

    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search papers…" className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 transition-all"/>{search&&<button onClick={()=>{setSearch('');setPage(1)}} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14}/></button>}</div>
      <p className="ml-auto text-xs font-bold text-gray-400">{filtered.length} papers</p>
    </div></div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}>
      <thead><tr>{[{l:'#',c:C.num},{l:'📝 Paper Title',c:C.title},{l:'📖 Subject',c:C.subject},{l:'🏫 Form',c:C.form},{l:'🏆 Total Marks',c:C.marks},{l:'⏱ Duration',c:C.duration},{l:'📋 Type',c:C.type},{l:'✅ Status',c:C.status},{l:'⚙️',c:C.actions}].map((h,i)=><th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{background:h.c.head,color:h.c.text,borderBottom:`2px solid ${h.c.text}30`}}>{h.l}</th>)}</tr></thead>
      <tbody>{pag.length===0?<tr><td colSpan={9} className="text-center py-16 text-gray-400"><span className="text-5xl block mb-2">📝</span><p className="text-sm">No papers yet. Generate one!</p></td></tr>:pag.map((p,idx)=>{const sub=getSub(p.subject_id),frm=getForm(p.form_id);return(
        <tr key={p.id} className="transition-colors" style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}>
          <td className="px-3 py-3 text-center font-bold" style={{background:C.num.bg+'60',color:C.num.text}}>{(page-1)*ps+idx+1}</td>
          <td className="px-3 py-3 font-bold text-gray-900" style={{background:C.title.bg+'60'}}>{p.paper_title}</td>
          <td className="px-3 py-3 whitespace-nowrap font-semibold" style={{background:C.subject.bg+'60',color:C.subject.text}}>{sub?.subject_name||'-'}</td>
          <td className="px-3 py-3 whitespace-nowrap" style={{background:C.form.bg+'60',color:C.form.text}}>{frm?.form_name||'—'}</td>
          <td className="px-3 py-3 text-center font-extrabold" style={{background:C.marks.bg+'60',color:C.marks.text}}>{p.total_marks||0}</td>
          <td className="px-3 py-3 whitespace-nowrap" style={{background:C.duration.bg+'60',color:C.duration.text}}>{p.duration_minutes||60} min</td>
          <td className="px-3 py-3 whitespace-nowrap" style={{background:C.type.bg+'60'}}><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.paper_type==='ai_generated'?'bg-cyan-50 text-cyan-700':p.paper_type==='auto_generated'?'bg-violet-50 text-violet-700':'bg-blue-50 text-blue-700'}`}>{p.paper_type==='ai_generated'?'🤖 AI':p.paper_type==='auto_generated'?'⚡ Auto':'✍️ Manual'}</span></td>
          <td className="px-3 py-3" style={{background:C.status.bg+'60'}}><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${p.status==='Published'?'bg-green-50 text-green-700 border-green-200':p.status==='Draft'?'bg-amber-50 text-amber-700 border-amber-200':'bg-gray-50 text-gray-500 border-gray-200'}`}>{p.status==='Published'?'✅':p.status==='Draft'?'📋':'📦'} {p.status}</span></td>
          <td className="px-3 py-3" style={{background:C.actions.bg+'60'}}><div className="flex items-center gap-1.5"><button onClick={()=>{}} className="p-2 rounded-xl transition hover:scale-110" style={{background:'#dbeafe',color:'#1d4ed8'}} title="Print"><FiPrinter size={12}/></button><button onClick={()=>handleDelete(p.id)} className="p-2 rounded-xl transition hover:scale-110" style={{background:'#fee2e2',color:'#b91c1c'}} title="Delete"><FiTrash2 size={12}/></button></div></td>
        </tr>);})}</tbody>
    </table></div>
    {filtered.length>0&&<div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between"><p className="text-xs text-gray-400">{Math.min((page-1)*ps+1,filtered.length)}–{Math.min(page*ps,filtered.length)} of {filtered.length}</p><div className="flex items-center gap-1.5"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"><FiChevronLeft size={14}/></button><button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"><FiChevronRight size={14}/></button></div></div>}
    </div>

    {/* Generator Modal */}
    {showGen&&<div className="modal-overlay" onClick={()=>setShowGen(false)}><div className="modal-content" style={{maxWidth:900}} onClick={e=>e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/>
        <div><h2 className="text-lg font-bold text-white flex items-center gap-2">⚡ Exam Paper Generator</h2><p className="text-white/70 text-xs mt-0.5">Step {genStep+1} of 3 — {['Configure','Select Questions','Review'][genStep]}</p></div>
        <button onClick={()=>setShowGen(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18}/></button>
      </div>

      {/* Step indicators */}
      <div className="px-6 pt-4 flex gap-2">
        {[{l:'1. Config',i:'⚙️'},{l:'2. Questions',i:'📚'},{l:'3. Review',i:'👀'}].map((s,i)=>(
          <div key={i} className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center transition-all ${genStep===i?'bg-indigo-50 text-indigo-700 border-2 border-indigo-200':genStep>i?'bg-green-50 text-green-700 border-2 border-green-200':'bg-gray-50 text-gray-400 border-2 border-gray-100'}`}>{s.i} {s.l}</div>
        ))}
      </div>

      <div className="p-6 max-h-[65vh] overflow-y-auto">
        {genStep===0&&<div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📝 Paper Title *</label><input value={genForm.paper_title} onChange={e=>setGenForm({...genForm,paper_title:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="e.g. Mathematics CAT 1 - Form 2"/></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📖 Subject *</label><select value={genForm.subject_id} onChange={e=>setGenForm({...genForm,subject_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">{subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🏫 Form</label><select value={genForm.form_id} onChange={e=>setGenForm({...genForm,form_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"><option value={0}>— All —</option>{forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">⏱ Duration (min)</label><input type="number" value={genForm.duration_minutes} onChange={e=>setGenForm({...genForm,duration_minutes:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"/></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📋 Term</label><select value={genForm.term_id} onChange={e=>setGenForm({...genForm,term_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"><option value={0}>— None —</option>{terms.map(t=><option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
          </div>
          <hr className="border-gray-100"/>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">🎯 Paper Structure</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border-2 border-green-200 bg-green-50/50"><p className="text-[10px] font-bold text-green-700 uppercase">Easy ({Math.ceil(genConfig.easy+genConfig.medium+genConfig.hard)*0.3}q)</p><input type="number" value={genConfig.easy} onChange={e=>setGenConfig({...genConfig,easy:Number(e.target.value)})} className="w-full mt-1 px-2 py-1.5 bg-white border border-green-200 rounded-lg text-sm text-center font-bold text-green-700"/></div>
            <div className="p-3 rounded-xl border-2 border-blue-200 bg-blue-50/50"><p className="text-[10px] font-bold text-blue-700 uppercase">Medium</p><input type="number" value={genConfig.medium} onChange={e=>setGenConfig({...genConfig,medium:Number(e.target.value)})} className="w-full mt-1 px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-center font-bold text-blue-700"/></div>
            <div className="p-3 rounded-xl border-2 border-red-200 bg-red-50/50"><p className="text-[10px] font-bold text-red-700 uppercase">Hard</p><input type="number" value={genConfig.hard} onChange={e=>setGenConfig({...genConfig,hard:Number(e.target.value)})} className="w-full mt-1 px-2 py-1.5 bg-white border border-red-200 rounded-lg text-sm text-center font-bold text-red-700"/></div>
          </div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📋 Instructions</label><textarea value={genForm.instructions} onChange={e=>setGenForm({...genForm,instructions:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" rows={2} placeholder="Answer ALL questions…"/></div>
        </div>}

        {genStep===1&&<div className="space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">📚 Available Questions ({availableQs.length})</p><p className="text-xs font-bold text-indigo-600">✅ Selected: {selectedQs.length}</p></div>
          <div className="max-h-[45vh] overflow-y-auto space-y-2">
            {availableQs.length===0?<p className="text-center py-8 text-gray-400 text-sm">No approved questions for this subject. Add questions first.</p>:availableQs.map(q=>{
              const sel=selectedQs.find(s=>s.id===q.id);
              return(<div key={q.id} onClick={()=>toggleQuestion(q)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${sel?'border-indigo-400 bg-indigo-50/50 shadow-sm':'border-gray-100 bg-white hover:border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${sel?'bg-indigo-600 text-white':'bg-gray-100 text-gray-400'}`}>{sel?'✓':q.id}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 line-clamp-2">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${q.difficulty==='easy'?'bg-green-50 text-green-700':q.difficulty==='hard'?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700'}`}>{q.difficulty}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700">{q.question_type.replace('_',' ')}</span>
                      <span className="text-[10px] font-bold text-gray-400">{q.marks} marks</span>
                    </div>
                  </div>
                </div>
              </div>);
            })}
          </div>
        </div>}

        {genStep===2&&<div className="space-y-3">
          <div className="p-4 rounded-xl bg-indigo-50/50 border-2 border-indigo-200">
            <h3 className="font-bold text-indigo-900 text-sm">{genForm.paper_title}</h3>
            <p className="text-xs text-indigo-600 mt-1">{getSub(genForm.subject_id)?.subject_name} · {genForm.duration_minutes} min · {selectedQs.reduce((a,q)=>a+(q.marks||1),0)} total marks</p>
          </div>
          <div className="max-h-[45vh] overflow-y-auto space-y-2">
            {selectedQs.map((q,i)=>(
              <div key={q.id} className="p-3 rounded-xl border border-gray-100 bg-white flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>{i+1}</span>
                <div className="flex-1"><p className="text-sm font-bold text-gray-900">{q.question_text}</p><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-gray-400">{q.marks} marks</span><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${q.difficulty==='easy'?'bg-green-50 text-green-700':q.difficulty==='hard'?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700'}`}>{q.difficulty}</span></div></div>
                <button onClick={()=>setSelectedQs(selectedQs.filter(s=>s.id!==q.id))} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"><FiX size={12}/></button>
              </div>
            ))}
          </div>
        </div>}
      </div>

      <div className="p-6 border-t border-gray-100 flex gap-3 justify-between bg-gray-50/50">
        <div className="flex gap-2">{genStep>0&&<button onClick={()=>setGenStep(genStep-1)} className="btn-outline flex items-center gap-2 text-sm"><FiChevronLeft size={14}/> Back</button>}</div>
        <div className="flex gap-2">
          <button onClick={()=>setShowGen(false)} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14}/> Cancel</button>
          {genStep===0&&<button onClick={autoSelectQuestions} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>⚡ Auto-Select Questions</button>}
          {genStep===1&&<button onClick={()=>setGenStep(2)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{background:'linear-gradient(135deg,#059669,#0d9488)'}}>👀 Review ({selectedQs.length} selected)</button>}
          {genStep===2&&<button onClick={handleSavePaper} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{background:'linear-gradient(135deg,#059669,#0d9488)'}}>{saving?<div className="spinner" style={{width:14,height:14}}/>:<FiSave size={14}/>}✅ Generate Paper</button>}
        </div>
      </div>
    </div></div>}
  </div>);
}
