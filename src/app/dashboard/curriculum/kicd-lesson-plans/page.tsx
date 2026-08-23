'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiDownload, FiRefreshCw, FiSearch, FiCheck, FiX, FiChevronDown, FiChevronUp, FiPrinter, FiZap } from 'react-icons/fi';

const ASSESSMENT_METHODS = ['Observation','Oral Questions','Written Exercise','Portfolio','Project','Peer Assessment','Self Assessment','Practical Activity','Checklist','Anecdotal Records'];
const LESSON_TYPES = ['Introduction','Development','Consolidation','Remediation','Enrichment','Assessment'];
const CORE_COMPETENCIES = ['Communication & Collaboration','Critical Thinking & Problem Solving','Imagination & Creativity','Citizenship','Digital Literacy','Learning to Learn','Self-Efficacy'];
const DIFFERENTIATION = ['Gifted Learners: Extension tasks','Struggling Learners: Simplified activities','ELL Support: Visual aids / bilingual support','SPED: Modified materials and support','General: Peer tutoring groups'];

type PlanStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
const STATUS_CFG: Record<PlanStatus,{label:string;color:string;bg:string;border:string}> = {
  draft:     {label:'Draft',     color:'#6B7280',bg:'#F9FAFB',border:'#E5E7EB'},
  submitted: {label:'Submitted', color:'#2563EB',bg:'#EFF6FF',border:'#BFDBFE'},
  approved:  {label:'Approved',  color:'#059669',bg:'#ECFDF5',border:'#6EE7B7'},
  rejected:  {label:'Rejected',  color:'#DC2626',bg:'#FEF2F2',border:'#FCA5A5'},
};

interface LessonPlan {
  id?: number;
  form_id: number; term_id: number; subject_id: number; teacher_id?: number;
  week_number: number; lesson_number: number;
  lesson_type: string; duration_minutes: number;
  strand: string; sub_strand: string;
  key_inquiry_question: string;
  learning_outcomes: string;
  key_vocabulary: string;
  learning_experiences: string;
  learning_resources: string;
  assessment_method: string;
  assessment_criteria: string;
  core_competencies: string;
  differentiation: string;
  reflection: string;
  status: PlanStatus;
  hod_comment?: string;
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const c = STATUS_CFG[status] || STATUS_CFG.draft;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: c.bg, color: c.color, borderColor: c.border }}>{c.label}</span>;
}

function KPICard({ value, label, emoji, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p><p className="text-3xl font-black" style={{ color }}>{value}</p></div>
        <span className="text-3xl">{emoji}</span>
      </div>
    </div>
  );
}

function PlanModal({ onClose, onSave, edit, forms, terms, subjects, teachers }: any) {
  const blank: Partial<LessonPlan> = { form_id:0, term_id:0, subject_id:0, week_number:1, lesson_number:1, lesson_type:'Introduction', duration_minutes:40, strand:'', sub_strand:'', key_inquiry_question:'', learning_outcomes:'', key_vocabulary:'', learning_experiences:'', learning_resources:'', assessment_method:'Observation', assessment_criteria:'', core_competencies:'', differentiation:'', reflection:'', status:'draft' };
  const [f, setF] = useState<Partial<LessonPlan>>({ ...blank, ...edit });
  const set = (p: Partial<LessonPlan>) => setF(prev => ({ ...prev, ...p }));
  const ta = (label: string, key: keyof LessonPlan, ph: string, rows = 2) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <textarea value={(f[key] as string) || ''} onChange={e => set({ [key]: e.target.value })} placeholder={ph} rows={rows}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50 resize-none" />
    </div>
  );
  const inp = (label: string, key: keyof LessonPlan, ph: string) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input value={(f[key] as string) || ''} onChange={e => set({ [key]: e.target.value })} placeholder={ph}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50" />
    </div>
  );

  const autoGenerate = () => {
    const subj = subjects.find((s: any) => s.id === f.subject_id);
    const sname = subj?.subject_name || 'Learning Area';
    set({
      key_inquiry_question: `How does knowledge of ${f.sub_strand || f.strand || 'this topic'} help us in daily life?`,
      learning_outcomes: `By the end of this lesson, the learner should be able to:\n1. Identify key concepts of ${f.sub_strand || f.strand}\n2. Apply understanding in a real-world context\n3. Demonstrate values of responsibility and respect during activities`,
      learning_experiences: `Opening (5 min): Review prior knowledge with a question.\nDevelopment (25 min):\n  - Teacher explains key concepts using examples\n  - Learners work in groups on activity cards\n  - Groups present findings to class\nClosing (10 min): Summarize key points; exit ticket`,
      learning_resources: `${sname} Textbook, Activity cards, Charts, Digital device (if available), Locally available materials`,
      assessment_criteria: `Learner can correctly explain ${f.sub_strand || 'the concept'}\nLearner participates actively in group work\nLearner demonstrates correct procedure/skill`,
      differentiation: DIFFERENTIATION.join('\n'),
      core_competencies: 'Communication & Collaboration; Critical Thinking & Problem Solving',
    });
    toast.success('Auto-filled from KICD template');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}><FiFileText size={18} className="text-white" /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">{edit?.id ? 'Edit' : 'New'} KICD Lesson Plan</h3><p className="text-xs text-gray-400">CBC/KICD Format · Competency-Based</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={autoGenerate} className="px-3 py-1.5 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}><FiZap size={12} /> Auto-Fill KICD</button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><FiX size={14} /></button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-4 gap-3">
            {[['Form *','form_id',forms,'form_name'],['Term *','term_id',terms,'term_name'],['Learning Area *','subject_id',subjects,'subject_name'],['Teacher','teacher_id',teachers,null]].map(([lbl,key,opts,nameKey]: any) => (
              <div key={key}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{lbl}</label>
                <select value={(f as any)[key]||''} onChange={e=>set({[key]:Number(e.target.value)||e.target.value})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50">
                  <option value="">Select…</option>
                  {opts.map((o:any)=><option key={o.id} value={o.id}>{nameKey?o[nameKey]:`${o.first_name} ${o.last_name}`}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Week</label>
              <select value={f.week_number||1} onChange={e=>set({week_number:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {Array.from({length:13},(_,i)=>i+1).map(w=><option key={w} value={w}>Week {w}</option>)}</select></div>
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Lesson #</label>
              <select value={f.lesson_number||1} onChange={e=>set({lesson_number:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {[1,2,3,4,5].map(n=><option key={n} value={n}>Lesson {n}</option>)}</select></div>
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
              <select value={f.lesson_type||'Introduction'} onChange={e=>set({lesson_type:e.target.value})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {LESSON_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Duration (min)</label>
              <input type="number" value={f.duration_minutes||40} onChange={e=>set({duration_minutes:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50" /></div>
            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assessment</label>
              <select value={f.assessment_method||'Observation'} onChange={e=>set({assessment_method:e.target.value})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {ASSESSMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {inp('Strand *','strand','e.g. Numbers, Listening & Speaking…')}
            {inp('Sub-Strand *','sub_strand','e.g. Whole Numbers, Counting…')}
          </div>
          {ta('Key Inquiry Question *','key_inquiry_question','e.g. How do whole numbers help us count items in our environment?')}
          {ta('Specific Learning Outcomes (SLOs) *','learning_outcomes','By the end of this lesson, the learner should be able to:\n1. …\n2. …\n3. …',3)}
          {inp('Key Vocabulary','key_vocabulary','e.g. digit, place value, tens, units…')}
          {ta('Learning Experiences (Activities) *','learning_experiences','Opening (5 min): …\nDevelopment (25 min): …\nClosing (10 min): …',4)}
          {ta('Learning Resources','learning_resources','Textbook pg. X, charts, counters, digital device…')}
          {ta('Assessment Criteria','assessment_criteria','How will you know the learner has achieved the outcomes?',2)}
          <div className="grid grid-cols-2 gap-3">
            {ta('Core Competencies','core_competencies','Communication & Collaboration; Critical Thinking…')}
            {ta('Differentiation (Inclusion)','differentiation','Gifted: …\nStruggling: …\nSPED: …')}
          </div>
          {ta('Reflection / Post-Lesson Remarks','reflection','What went well? What needs improvement for next lesson?')}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            {(['draft','submitted'] as PlanStatus[]).map(s=>(
              <button key={s} onClick={()=>set({status:s})} className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${f.status===s?'text-white border-0':'border-gray-200 text-gray-500'}`} style={f.status===s?{background:STATUS_CFG[s].color}:{}}>{STATUS_CFG[s].label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            <button onClick={()=>{if(!f.form_id||!f.term_id||!f.subject_id||!f.strand?.trim()||!f.key_inquiry_question?.trim()){toast.error('Fill required fields');return;}onSave(f);}} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md" style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
              {edit?.id?'Save Changes':'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KICDLessonPlansPage() {
  const [forms,setForms]=useState<any[]>([]);
  const [terms,setTerms]=useState<any[]>([]);
  const [subjects,setSubjects]=useState<any[]>([]);
  const [teachers,setTeachers]=useState<any[]>([]);
  const [plans,setPlans]=useState<LessonPlan[]>([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [editItem,setEditItem]=useState<Partial<LessonPlan>|undefined>();
  const [expanded,setExpanded]=useState<Set<number>>(new Set());
  const [filterForm,setFilterForm]=useState('');
  const [filterTerm,setFilterTerm]=useState('');
  const [filterStatus,setFilterStatus]=useState('all');
  const [searchQ,setSearchQ]=useState('');

  const fetchAll = useCallback(async()=>{
    setLoading(true);
    const [fR,tR,sR,tcR,pR]=await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_terms').select('*').order('year',{ascending:false}),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('kicd_lesson_plans').select('*').order('week_number'),
    ]);
    setForms(fR.data||[]);setTerms(tR.data||[]);setSubjects(sR.data||[]);setTeachers(tcR.data||[]);
    if(!pR.error)setPlans(pR.data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  const filtered=useMemo(()=>plans.filter(p=>{
    if(filterForm&&String(p.form_id)!==filterForm)return false;
    if(filterTerm&&String(p.term_id)!==filterTerm)return false;
    if(filterStatus!=='all'&&p.status!==filterStatus)return false;
    const q=searchQ.toLowerCase();
    if(q&&!(p.strand||'').toLowerCase().includes(q)&&!(p.sub_strand||'').toLowerCase().includes(q)&&!(p.key_inquiry_question||'').toLowerCase().includes(q))return false;
    return true;
  }),[plans,filterForm,filterTerm,filterStatus,searchQ]);

  const handleSave=async(data:Partial<LessonPlan>)=>{
    const tid=toast.loading(data.id?'Saving…':'Creating…');
    try{
      if(data.id){const{error}=await supabase.from('kicd_lesson_plans').update(data).eq('id',data.id);if(error)throw error;}
      else{const{error}=await supabase.from('kicd_lesson_plans').insert({...data,created_at:new Date().toISOString()});if(error)throw error;}
      toast.success(data.id?'Updated!':'Created!',{id:tid});setShowModal(false);setEditItem(undefined);fetchAll();
    }catch(e:any){toast.error(e.message||'Failed',{id:tid});}
  };

  const handleHOD=async(id:number,status:PlanStatus,comment?:string)=>{
    const{error}=await supabase.from('kicd_lesson_plans').update({status,hod_comment:comment||null}).eq('id',id);
    if(error){toast.error(error.message);return;}
    toast.success(`${STATUS_CFG[status].label}`);fetchAll();
  };

  const handleDelete=async(id:number)=>{
    if(!confirm('Delete this lesson plan?'))return;
    await supabase.from('kicd_lesson_plans').delete().eq('id',id);
    toast.success('Deleted');fetchAll();
  };

  const printPlan=(plan:LessonPlan)=>{
    const form=forms.find(f=>f.id===plan.form_id);
    const term=terms.find(t=>t.id===plan.term_id);
    const subj=subjects.find(s=>s.id===plan.subject_id);
    const teacher=teachers.find(t=>t.id===plan.teacher_id);
    const w=window.open('','_blank');if(!w)return;
    const row=(label:string,value:string)=>value?`<tr><td style="background:#f8fafc;font-weight:700;font-size:11px;padding:10px 14px;border:1px solid #e2e8f0;width:200px;vertical-align:top">${label}</td><td style="font-size:11px;padding:10px 14px;border:1px solid #e2e8f0;line-height:1.6;white-space:pre-wrap">${value}</td></tr>`:'';
    w.document.write(`<!DOCTYPE html><html><head><title>KICD Lesson Plan</title><style>@page{size:A4;margin:15mm}body{font-family:'Segoe UI',sans-serif;padding:20px}h1{color:#7c3aed;font-size:18px;text-align:center;margin-bottom:4px}p.sub{text-align:center;color:#6b7280;font-size:11px;margin-bottom:20px}table{width:100%;border-collapse:collapse}@media print{body{padding:0}}</style></head><body>
      <h1>KICD LESSON PLAN</h1><p class="sub">${subj?.subject_name||''} · ${form?.form_name||''} · Week ${plan.week_number} Lesson ${plan.lesson_number} · ${term?.term_name||''}</p>
      <table>
        ${row('Teacher',teacher?`${teacher.first_name} ${teacher.last_name}`:'')}
        ${row('Duration',`${plan.duration_minutes} minutes · ${plan.lesson_type}`)}
        ${row('Strand',plan.strand)}${row('Sub-Strand',plan.sub_strand)}
        ${row('Key Inquiry Question',plan.key_inquiry_question)}
        ${row('Learning Outcomes',plan.learning_outcomes)}
        ${row('Key Vocabulary',plan.key_vocabulary)}
        ${row('Learning Experiences',plan.learning_experiences)}
        ${row('Learning Resources',plan.learning_resources)}
        ${row('Assessment Method',plan.assessment_method)}
        ${row('Assessment Criteria',plan.assessment_criteria)}
        ${row('Core Competencies',plan.core_competencies)}
        ${row('Differentiation',plan.differentiation)}
        ${row('Reflection',plan.reflection)}
      </table>
      <p style="text-align:center;font-size:9px;color:#9ca3af;margin-top:20px">Generated by APSIMS · KICD CBC Lesson Plan Format · ${new Date().toLocaleDateString('en-GB')}</p>
    </body></html>`);
    w.document.close();setTimeout(()=>w.print(),400);
  };

  const exportCSV=()=>{
    const rows=[['Form','Term','Subject','Week','Lesson','Type','Duration','Strand','Sub-Strand','Key Inquiry Question','Outcomes','Assessment','Status'],
      ...plans.map(p=>[forms.find(f=>f.id===p.form_id)?.form_name||'',terms.find(t=>t.id===p.term_id)?.term_name||'',subjects.find(s=>s.id===p.subject_id)?.subject_name||'',`Week ${p.week_number}`,`Lesson ${p.lesson_number}`,p.lesson_type,`${p.duration_minutes}min`,p.strand,p.sub_strand,p.key_inquiry_question,p.learning_outcomes,p.assessment_method,p.status])];
    const blob=new Blob([rows.map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`kicd-lesson-plans-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  };

  if(loading)return(<div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}><FiFileText size={24} className="text-white"/></div><div className="w-8 h-8 border-gray-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" style={{borderWidth:3,borderStyle:'solid'}}/><p className="text-gray-400 text-sm">Loading KICD Lesson Plans…</p></div></div>);

  return(
    <>
      {showModal&&<PlanModal onClose={()=>{setShowModal(false);setEditItem(undefined);}} onSave={handleSave} edit={editItem} forms={forms} terms={terms} subjects={subjects} teachers={teachers}/>}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}><FiFileText size={22} className="text-white"/></div>
            <div><h1 className="text-2xl font-extrabold text-gray-900">KICD Lesson Plan Generator</h1><p className="text-sm text-gray-500">CBC Format · Key Inquiry Questions · SLOs · Differentiation · HOD Approval</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15}/></button>
            <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50"><FiDownload size={14}/> CSV</button>
            <button onClick={()=>{setEditItem(undefined);setShowModal(true);}} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95" style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
              <FiPlus size={14}/> New Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard value={plans.length} label="Total Plans" emoji="📄" color="#7c3aed"/>
          <KPICard value={plans.filter(p=>p.status==='submitted').length} label="Pending HOD" emoji="⏳" color="#d97706"/>
          <KPICard value={plans.filter(p=>p.status==='approved').length} label="Approved" emoji="✅" color="#059669"/>
          <KPICard value={[...new Set(plans.map(p=>p.subject_id))].length} label="Learning Areas" emoji="📚" color="#6366f1"/>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Strand, key inquiry…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50"/></div>
            </div>
            {[['Form',filterForm,setFilterForm,forms,'form_name'],['Term',filterTerm,setFilterTerm,terms,'term_name']].map(([lbl,val,setter,opts,name]:any)=>(
              <div key={lbl} className="min-w-[130px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{lbl}</label>
                <select value={val} onChange={e=>setter(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50">
                  <option value="">All</option>{opts.map((o:any)=><option key={o.id} value={o.id}>{o[name]}</option>)}
                </select>
              </div>
            ))}
            <div className="min-w-[120px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50">
                <option value="all">All</option>{Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / {plans.length}</p>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length===0?(
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiFileText size={28} className="text-gray-300"/></div>
              <p className="text-gray-400 font-semibold text-sm">No lesson plans found</p>
              <p className="text-xs text-gray-300 mt-1">Create your first KICD-format CBC lesson plan</p>
            </div>
          ):filtered.map(plan=>{
            const isOpen=expanded.has(plan.id!);
            const form=forms.find(f=>f.id===plan.form_id);
            const term=terms.find(t=>t.id===plan.term_id);
            const subj=subjects.find(s=>s.id===plan.subject_id);
            const teacher=teachers.find(t=>t.id===plan.teacher_id);
            return(
              <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50" onClick={()=>setExpanded(p=>{const n=new Set(p);n.has(plan.id!)?n.delete(plan.id!):n.add(plan.id!);return n;})}>
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-black" style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>W{plan.week_number}L{plan.lesson_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800">{subj?.subject_name||'—'}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-100 text-violet-700">{plan.lesson_type}</span>
                      <span className="text-[10px] text-gray-400">{plan.duration_minutes}min</span>
                      {form&&<span className="text-[10px] text-gray-400">· {form.form_name}</span>}
                      {term&&<span className="text-[10px] text-gray-400">· {term.term_name}</span>}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 font-medium truncate">{plan.strand}{plan.sub_strand?` › ${plan.sub_strand}`:''}</p>
                    <div className="flex items-center gap-2 mt-1"><StatusBadge status={plan.status}/>{teacher&&<span className="text-[10px] text-gray-400">{teacher.first_name} {teacher.last_name}</span>}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {plan.status==='submitted'&&<>
                      <button onClick={e=>{e.stopPropagation();handleHOD(plan.id!,'approved');}} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-green-600 hover:bg-green-700">✓ Approve</button>
                      <button onClick={e=>{e.stopPropagation();handleHOD(plan.id!,'rejected','Needs revision');}} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-red-600 hover:bg-red-700">✗ Reject</button>
                    </>}
                    <button onClick={e=>{e.stopPropagation();printPlan(plan);}} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"><FiPrinter size={12}/></button>
                    <button onClick={e=>{e.stopPropagation();setEditItem(plan);setShowModal(true);}} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600"><FiEdit2 size={12}/></button>
                    <button onClick={e=>{e.stopPropagation();plan.id&&handleDelete(plan.id);}} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><FiTrash2 size={12}/></button>
                    {isOpen?<FiChevronUp size={14} className="text-violet-500"/>:<FiChevronDown size={14} className="text-gray-300"/>}
                  </div>
                </div>
                {isOpen&&(
                  <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gradient-to-b from-violet-50/20 to-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        {[['❓ Key Inquiry Question',plan.key_inquiry_question],['📌 Learning Outcomes',plan.learning_outcomes],['🔤 Key Vocabulary',plan.key_vocabulary],['🎯 Learning Experiences',plan.learning_experiences],['📦 Resources',plan.learning_resources]].map(([lbl,val])=>val&&(
                          <div key={lbl}><p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">{lbl}</p><p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{val}</p></div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {[['✅ Assessment Criteria',plan.assessment_criteria],['🧠 Core Competencies',plan.core_competencies],['♿ Differentiation',plan.differentiation],['📝 Reflection',plan.reflection]].map(([lbl,val])=>val&&(
                          <div key={lbl}><p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">{lbl}</p><p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{val}</p></div>
                        ))}
                        {plan.hod_comment&&<div className={`p-3 rounded-xl border ${plan.status==='approved'?'bg-green-50 border-green-100':'bg-red-50 border-red-100'}`}><p className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5 text-gray-500">HOD Comment</p><p className="text-xs text-gray-700">{plan.hod_comment}</p></div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

