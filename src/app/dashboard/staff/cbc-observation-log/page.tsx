'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiEye, FiPlus, FiSearch, FiRefreshCw, FiX, FiSave, FiEdit2, FiTrash2,
    FiArrowRight, FiAlertCircle, FiDownload, FiFileText, FiBarChart2,
    FiUsers, FiAward, FiStar, FiCheckCircle, FiCalendar, FiActivity,
    FiPieChart, FiTarget, FiBook, FiUser, FiPrinter,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Rating = 1|2|3|4|5;
interface Observation {
    id: string; teacher_id?: string; teacher_name: string; subject?: string; form_name?: string;
    observer_name: string; observer_role: string; observation_date: string;
    term: string; year: number; observation_type: string;
    domain_planning: Rating; domain_delivery: Rating; domain_assessment: Rating;
    domain_classroom: Rating; domain_professional: Rating;
    overall_rating?: number; strengths?: string; areas_for_growth?: string;
    action_plan?: string; teacher_comments?: string; status: 'draft'|'submitted'|'acknowledged';
    created_at: string;
}

const RATINGS: Record<number,{label:string;color:string;bg:string}> = {
    1:{label:'Unsatisfactory',color:'#DC2626',bg:'#FEE2E2'},
    2:{label:'Basic',color:'#D97706',bg:'#FEF3C7'},
    3:{label:'Proficient',color:'#2563EB',bg:'#DBEAFE'},
    4:{label:'Distinguished',color:'#059669',bg:'#D1FAE5'},
    5:{label:'Exemplary',color:'#7C3AED',bg:'#EDE9FE'},
};
const DOMAINS = [
    {key:'domain_planning',label:'Lesson Planning & Preparation',icon:FiFileText},
    {key:'domain_delivery',label:'Delivery & Instruction',icon:FiBook},
    {key:'domain_assessment',label:'Assessment for Learning',icon:FiTarget},
    {key:'domain_classroom',label:'Classroom Environment',icon:FiUsers},
    {key:'domain_professional',label:'Professional Conduct',icon:FiAward},
] as const;
const OBS_TYPES = ['Formal Observation','Informal Walk-through','Peer Observation','Self-Assessment','Post-Observation Debrief'];
const STATUS_CFG = {draft:{l:'Draft',bg:'#F1F5F9',fg:'#64748B'},submitted:{l:'Submitted',bg:'#D1FAE5',fg:'#059669'},acknowledged:{l:'Acknowledged',bg:'#DBEAFE',fg:'#2563EB'}};

const SQL = `CREATE TABLE IF NOT EXISTS school_teacher_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text, teacher_name text NOT NULL,
  subject text, form_name text,
  observer_name text NOT NULL, observer_role text,
  observation_date date DEFAULT now(),
  term text, year int DEFAULT EXTRACT(YEAR FROM NOW()),
  observation_type text DEFAULT 'Formal Observation',
  domain_planning int DEFAULT 3, domain_delivery int DEFAULT 3,
  domain_assessment int DEFAULT 3, domain_classroom int DEFAULT 3,
  domain_professional int DEFAULT 3, overall_rating numeric(3,1),
  strengths text, areas_for_growth text, action_plan text,
  teacher_comments text, status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_teacher_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_teacher_observations FOR ALL USING (true) WITH CHECK (true);`;

const DEMO: Observation[] = [
    {id:'d1',teacher_name:'Ms. Jane Akinyi',subject:'Mathematics',form_name:'Grade 8A',observer_name:'Mrs. Wanjiku',observer_role:'HOD Mathematics',observation_date:'2025-07-28',term:'Term 2',year:2025,observation_type:'Formal Observation',domain_planning:4,domain_delivery:4,domain_assessment:3,domain_classroom:5,domain_professional:4,overall_rating:4.0,strengths:'Excellent use of hands-on activities and manipulatives. Students were highly engaged throughout the lesson.',areas_for_growth:'Could improve differentiation strategies for weaker learners.',action_plan:'Attend differentiated instruction workshop in August.',status:'submitted',created_at:new Date().toISOString()},
    {id:'d2',teacher_name:'Mr. David Kamau',subject:'English',form_name:'Grade 7B',observer_name:'Mr. Ochieng',observer_role:'Principal',observation_date:'2025-07-30',term:'Term 2',year:2025,observation_type:'Informal Walk-through',domain_planning:3,domain_delivery:3,domain_assessment:3,domain_classroom:4,domain_professional:4,overall_rating:3.4,strengths:'Good rapport with students. Clear objectives shared at start.',areas_for_growth:'Assessment questions could be more CBC-aligned.',action_plan:'Peer coaching with Ms. Akinyi on CBC assessment techniques.',status:'draft',created_at:new Date().toISOString()},
];

function calcOverall(form:any):number {
    const vals=[form.domain_planning,form.domain_delivery,form.domain_assessment,form.domain_classroom,form.domain_professional].map(Number).filter(v=>v>0);
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10:0;
}

export default function TeacherObservationLogPage() {
    const [obs, setObs]         = useState<Observation[]>([]);
    const [staff, setStaff]     = useState<{id:string;full_name:string;role?:string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbReady, setDbReady] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editOb, setEditOb]   = useState<Observation|null>(null);
    const [saving, setSaving]   = useState(false);
    const [search, setSearch]   = useState('');
    const [fStatus, setFStatus] = useState('');
    const [fType, setFType]     = useState('');
    const [tab, setTab]         = useState<'log'|'analytics'>('log');

    const empty = {teacher_name:'',subject:'',form_name:'',observer_name:'',observer_role:'',observation_date:new Date().toISOString().slice(0,10),term:'Term 2',year:2025,observation_type:'Formal Observation',domain_planning:3 as Rating,domain_delivery:3 as Rating,domain_assessment:3 as Rating,domain_classroom:3 as Rating,domain_professional:3 as Rating,strengths:'',areas_for_growth:'',action_plan:'',teacher_comments:'',status:'draft' as const};
    const [form,setForm]=useState(empty);

    useEffect(()=>{load();},[]);
    async function load(){
        setLoading(true);
        try {
            const {data:stR}=await sb.from('school_users').select('id,full_name,role').order('full_name');
            setStaff(stR||[]);
            const {error}=await sb.from('school_teacher_observations').select('id').limit(1);
            const ready=!error||error.code!=='42P01';
            setDbReady(ready);
            if(ready){const {data}=await sb.from('school_teacher_observations').select('*').order('observation_date',{ascending:false}).limit(300);setObs(data||[]);}
            else{setObs(DEMO);}
        }catch{setObs(DEMO);}
        setLoading(false);
    }

    const filtered=useMemo(()=>obs.filter(o=>
        (!search||`${o.teacher_name} ${o.observer_name} ${o.subject||''} ${o.form_name||''}`.toLowerCase().includes(search.toLowerCase()))
        &&(!fStatus||o.status===fStatus)
        &&(!fType||o.observation_type===fType)
    ),[obs,search,fStatus,fType]);

    const stats=useMemo(()=>({
        total:obs.length,
        submitted:obs.filter(o=>o.status==='submitted').length,
        acknowledged:obs.filter(o=>o.status==='acknowledged').length,
        teachers:new Set(obs.map(o=>o.teacher_name)).size,
        avgRating:obs.length?Math.round(obs.reduce((a,o)=>a+(o.overall_rating||0),0)/obs.length*10)/10:0,
        excellentCount:obs.filter(o=>(o.overall_rating||0)>=4).length,
    }),[obs]);

    async function save(){
        if(!form.teacher_name||!form.observer_name||!form.observation_date){toast.error('Teacher, observer and date are required');return;}
        setSaving(true);
        try{
            const overall=calcOverall(form);
            const payload:any={...form,overall_rating:overall,domain_planning:Number(form.domain_planning),domain_delivery:Number(form.domain_delivery),domain_assessment:Number(form.domain_assessment),domain_classroom:Number(form.domain_classroom),domain_professional:Number(form.domain_professional)};
            delete payload.id; delete payload.created_at;
            if(editOb){
                if(dbReady){const {error}=await sb.from('school_teacher_observations').update(payload).eq('id',editOb.id);if(error)throw error;}
                setObs(p=>p.map(o=>o.id===editOb.id?{...o,...payload}:o));
                toast.success('Observation updated!');
            }else{
                if(dbReady){const {data,error}=await sb.from('school_teacher_observations').insert(payload).select().single();if(error)throw error;setObs(p=>[data,...p]);}
                else{setObs(p=>[{...payload,id:`demo-${Date.now()}`,created_at:new Date().toISOString()},...p]);}
                toast.success('✅ Observation recorded!');
            }
            setShowModal(false);setEditOb(null);setForm(empty);
        }catch(e:any){toast.error(e.message||'Save failed');}
        setSaving(false);
    }

    async function del(id:string){
        if(!confirm('Delete this observation?'))return;
        if(dbReady)await sb.from('school_teacher_observations').delete().eq('id',id);
        setObs(p=>p.filter(o=>o.id!==id));
        toast.success('Deleted');
    }

    function exportCSV(){
        const rows=[['Date','Teacher','Subject','Form','Observer','Role','Type','Planning','Delivery','Assessment','Classroom','Professional','Overall','Status']];
        filtered.forEach(o=>rows.push([o.observation_date,o.teacher_name,o.subject||'',o.form_name||'',o.observer_name,o.observer_role||'',o.observation_type,String(o.domain_planning),String(o.domain_delivery),String(o.domain_assessment),String(o.domain_classroom),String(o.domain_professional),String(o.overall_rating||''),o.status]));
        const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
        const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='Teacher_Observations.csv';a.click();
        toast.success('CSV exported!');
    }

    function printReport(){
        const html=`<!DOCTYPE html><html><head><title>Teacher Observation Report</title><style>
        @page{size:A4 landscape;margin:15mm}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b}
        h1{font-size:16px;color:#0F2044;margin-bottom:4px}p{color:#64748b;margin:0 0 12px}
        table{width:100%;border-collapse:collapse}th{background:#0F2044;color:#fff;padding:6px 8px;text-align:left;font-size:9px}
        td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9px}tr:nth-child(even){background:#f8fafc}
        .badge{display:inline-block;padding:2px 6px;border-radius:999px;font-weight:700;font-size:8px}
        </style></head><body>
        <h1>📋 Teacher Observation Log</h1>
        <p>Generated: ${new Date().toLocaleString('en-KE')} · ${filtered.length} observations</p>
        <table><thead><tr><th>Date</th><th>Teacher</th><th>Subject</th><th>Form</th><th>Observer</th><th>Type</th><th>Planning</th><th>Delivery</th><th>Assessment</th><th>Classroom</th><th>Professional</th><th>Overall</th><th>Status</th></tr></thead><tbody>
        ${filtered.map(o=>`<tr><td>${o.observation_date}</td><td><b>${o.teacher_name}</b></td><td>${o.subject||'—'}</td><td>${o.form_name||'—'}</td><td>${o.observer_name}</td><td>${o.observation_type}</td><td>${o.domain_planning}/5</td><td>${o.domain_delivery}/5</td><td>${o.domain_assessment}/5</td><td>${o.domain_classroom}/5</td><td>${o.domain_professional}/5</td><td><b>${o.overall_rating||'—'}/5</b></td><td>${o.status}</td></tr>`).join('')}
        </tbody></table></body></html>`;
        const w=window.open('','_blank');w?.document.write(html);w?.document.close();w?.print();
    }

    if(loading) return(
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}><FiEye size={30} color="#F59E0B"/></div>
            <p className="text-xl font-black text-gray-800">Loading Observation Log…</p><p className="text-sm text-gray-500 mt-1">Teacher Performance Monitoring System</p></div>
        </div>
    );

    return(
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* HEADER */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/hr-payroll" className="hover:text-white">HR & Payroll</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">👁️ Teacher Observation Log</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#0891B2,#06B6D4)'}}>
                                <FiEye size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">Teacher Observation Log</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400 text-cyan-900">TSC ALIGNED</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CBC 2024</span>
                                    {!dbReady&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">5-Domain Rating · HOD & Principal Observations · Action Plans · Performance Tracking</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/staff/cbc-professional-dev',l:'Prof Dev Log',ic:FiAward},{href:'/dashboard/hr-payroll/staff',l:'Staff Directory',ic:FiUsers}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><FiDownload size={12}/>Export CSV</button>
                            <button onClick={printReport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><FiPrinter size={12}/>Print</button>
                            <button onClick={()=>{setForm(empty);setEditOb(null);setShowModal(true);}} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{background:'linear-gradient(135deg,#0891B2,#06B6D4)'}}>
                                <FiPlus size={15}/>Record Observation
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        {[['Domains','Planning · Delivery · Assessment · Classroom · Professional'],['Scale','1-Unsatisfactory to 5-Exemplary'],['Authority','TSC / MoE Kenya'],['Purpose','Quality Teaching & CBC Delivery']].map(([k,v])=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}>
                                <span className="text-amber-400 font-bold">{k}:</span><span className="text-blue-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-white/10">
                    {[{l:'Total Obs.',v:stats.total,ic:FiEye,c:'#F59E0B'},{l:'Submitted',v:stats.submitted,ic:FiCheckCircle,c:'#34D399'},{l:'Acknowledged',v:stats.acknowledged,ic:FiAward,c:'#60A5FA'},{l:'Teachers',v:stats.teachers,ic:FiUsers,c:'#A78BFA'},{l:'Avg Rating',v:stats.avgRating,ic:FiStar,c:'#F472B6'},{l:'Excellent (4+)',v:stats.excellentCount,ic:FiTarget,c:'#FCD34D'}].map((s,i)=>(
                        <div key={i} className="px-4 py-3 flex items-center gap-3 border-r border-white/10 last:border-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.c+'22'}}><s.ic size={14} style={{color:s.c}}/></div>
                            <div><div className="text-xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-blue-300">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {!dbReady&&(
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — <code className="text-xs bg-amber-100 px-1 rounded">school_teacher_observations</code> table not yet created</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['log','📋 Observation Log',FiEye],['analytics','📊 Analytics',FiBarChart2]] as const).map(([k,l,Ic])=>(
                    <button key={k} onClick={()=>setTab(k as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===k?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={13}/>{l}
                    </button>
                ))}
            </div>

            {tab==='log'&&(<>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="relative flex-1"><FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200" placeholder="Search teacher, observer, subject…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                        <div className="flex flex-wrap gap-2">
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All Statuses</option>{['draft','submitted','acknowledged'].map(s=><option key={s}>{s}</option>)}</select>
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Types</option>{OBS_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                            <button onClick={()=>{setSearch('');setFStatus('');setFType('');}} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1"><FiRefreshCw size={11}/>Clear</button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} record{filtered.length!==1?'s':''}{!dbReady?' · Demo Mode':''}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}} className="text-white">
                                {['Date','Teacher','Subject/Form','Observer','Type','Planning','Delivery','Assessment','Classroom','Professional','Overall','Status',''].map(h=><th key={h} className="text-left px-3 py-3 text-xs font-semibold whitespace-nowrap">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {filtered.length===0?<tr><td colSpan={13} className="text-center py-16 text-gray-400"><FiEye size={40} className="mx-auto mb-3 opacity-30"/><p className="font-semibold">No observations recorded yet</p><button onClick={()=>setShowModal(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0891B2,#06B6D4)'}}><FiPlus size={14}/>Record First Observation</button></td></tr>
                                :filtered.map((o,i)=>{
                                    const st=STATUS_CFG[o.status];
                                    const rating=o.overall_rating||0;
                                    const rColor=rating>=4?'#059669':rating>=3?'#2563EB':rating>=2?'#D97706':'#DC2626';
                                    return <tr key={o.id} className={`border-b border-gray-100 hover:bg-cyan-50/30 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                                        <td className="px-3 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{o.observation_date}</td>
                                        <td className="px-3 py-3"><p className="text-xs font-bold text-gray-900">{o.teacher_name}</p></td>
                                        <td className="px-3 py-3 text-[10px] text-gray-500">{o.subject||'—'}<br/>{o.form_name||''}</td>
                                        <td className="px-3 py-3"><p className="text-xs text-gray-700">{o.observer_name}</p><p className="text-[10px] text-gray-400">{o.observer_role||''}</p></td>
                                        <td className="px-3 py-3 text-[10px] text-gray-600 whitespace-nowrap">{o.observation_type}</td>
                                        {[o.domain_planning,o.domain_delivery,o.domain_assessment,o.domain_classroom,o.domain_professional].map((v,di)=>{
                                            const rc=RATINGS[v as number]||RATINGS[3];
                                            return <td key={di} className="px-3 py-3 text-center"><span className="inline-block w-7 h-7 rounded-lg text-xs font-black leading-7" style={{background:rc.bg,color:rc.color}}>{v}</span></td>;
                                        })}
                                        <td className="px-3 py-3 text-center"><span className="text-sm font-black" style={{color:rColor}}>{rating.toFixed(1)}</span></td>
                                        <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:st.bg,color:st.fg}}>{st.l}</span></td>
                                        <td className="px-3 py-3"><div className="flex gap-1">
                                            <button onClick={()=>{setEditOb(o);setForm({teacher_name:o.teacher_name,subject:o.subject||'',form_name:o.form_name||'',observer_name:o.observer_name,observer_role:o.observer_role||'',observation_date:o.observation_date,term:o.term,year:o.year,observation_type:o.observation_type,domain_planning:o.domain_planning,domain_delivery:o.domain_delivery,domain_assessment:o.domain_assessment,domain_classroom:o.domain_classroom,domain_professional:o.domain_professional,strengths:o.strengths||'',areas_for_growth:o.areas_for_growth||'',action_plan:o.action_plan||'',teacher_comments:o.teacher_comments||'',status:o.status});setShowModal(true);}} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={12}/></button>
                                            <button onClick={()=>del(o.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={12}/></button>
                                        </div></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>)}

            {tab==='analytics'&&(
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 className="text-cyan-600"/>Average Ratings by Domain</h2>
                        {DOMAINS.map(d=>{
                            const avg=obs.length?Math.round(obs.reduce((a,o)=>a+(o[d.key as keyof Observation] as number||0),0)/obs.length*10)/10:0;
                            const pct=(avg/5)*100;
                            const color=avg>=4?'#059669':avg>=3?'#2563EB':avg>=2?'#D97706':'#DC2626';
                            return <div key={d.key} className="mb-4">
                                <div className="flex justify-between text-xs mb-1"><span className="font-bold text-gray-700">{d.label}</span><span className="font-black" style={{color}}>{avg}/5</span></div>
                                <div className="bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full transition-all duration-700" style={{width:`${pct}%`,background:color}}/></div>
                            </div>;
                        })}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiUsers className="text-indigo-600"/>Teacher Performance Summary</h2>
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                            {Array.from(new Set(obs.map(o=>o.teacher_name))).map(name=>{
                                const tObs=obs.filter(o=>o.teacher_name===name);
                                const avg=tObs.length?Math.round(tObs.reduce((a,o)=>a+(o.overall_rating||0),0)/tObs.length*10)/10:0;
                                const color=avg>=4?'#059669':avg>=3?'#2563EB':avg>=2?'#D97706':'#DC2626';
                                return <div key={name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{background:'linear-gradient(135deg,#0891B2,#06B6D4)'}}>{name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
                                    <div className="flex-1"><p className="text-xs font-bold text-gray-900">{name}</p><p className="text-[10px] text-gray-400">{tObs.length} observation{tObs.length!==1?'s':''}</p></div>
                                    <div className="text-right"><div className="text-sm font-black" style={{color}}>{avg}/5</div><div className="text-[10px] text-gray-400">{avg>=4?'Distinguished':avg>=3?'Proficient':avg>=2?'Basic':'Needs Support'}</div></div>
                                </div>;
                            })}
                            {!obs.length&&<p className="text-center text-gray-400 text-sm py-8">Record observations to see analytics</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL */}
            {showModal&&(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[93vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-black text-gray-900 flex items-center gap-2"><FiEye className="text-cyan-600"/>{editOb?'Edit':'Record'} Teacher Observation</h2>
                            <button onClick={()=>{setShowModal(false);setEditOb(null);setForm(empty);}} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Teacher Name *</label>
                                    {staff.length>0?<select value={form.teacher_name} onChange={e=>setForm(p=>({...p,teacher_name:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white"><option value="">— Select Teacher —</option>{staff.map(s=><option key={s.id}>{s.full_name}</option>)}</select>
                                    :<input value={form.teacher_name} onChange={e=>setForm(p=>({...p,teacher_name:e.target.value}))} placeholder="Teacher full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"/>}
                                </div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Subject</label><input value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="e.g. Mathematics" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Class / Form</label><input value={form.form_name} onChange={e=>setForm(p=>({...p,form_name:e.target.value}))} placeholder="e.g. Grade 8A" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Observation Type</label>
                                    <select value={form.observation_type} onChange={e=>setForm(p=>({...p,observation_type:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white">{OBS_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Observer Name *</label><input value={form.observer_name} onChange={e=>setForm(p=>({...p,observer_name:e.target.value}))} placeholder="e.g. Mrs. Principal" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Observer Role</label><input value={form.observer_role} onChange={e=>setForm(p=>({...p,observer_role:e.target.value}))} placeholder="e.g. HOD, Principal" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"/></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Obs. Date *</label><input type="date" value={form.observation_date} onChange={e=>setForm(p=>({...p,observation_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Term</label><select value={form.term} onChange={e=>setForm(p=>({...p,term:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Year</label><select value={form.year} onChange={e=>setForm(p=>({...p,year:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white">{[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select></div>
                            </div>

                            {/* Domain Ratings */}
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                <p className="text-xs font-black text-gray-800 mb-3">Domain Ratings (1=Unsatisfactory · 5=Exemplary)</p>
                                <div className="space-y-3">
                                    {DOMAINS.map(d=>{
                                        const val=form[d.key as keyof typeof form] as number;
                                        return <div key={d.key}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"><d.icon size={11}/>{d.label}</label>
                                                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{background:RATINGS[val]?.bg||'#F1F5F9',color:RATINGS[val]?.color||'#64748B'}}>{val} — {RATINGS[val]?.label}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setForm(p=>({...p,[d.key]:n as Rating}))} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${val===n?'shadow-md scale-105':''}`} style={val===n?{background:RATINGS[n].bg,color:RATINGS[n].color,border:`2px solid ${RATINGS[n].color}`}:{background:'white',color:'#9CA3AF',border:'2px solid #E5E7EB'}}>{n}</button>)}
                                            </div>
                                        </div>;
                                    })}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                                    <span className="text-sm font-black text-gray-800">Overall Average: </span>
                                    <span className="text-lg font-black" style={{color:calcOverall(form)>=4?'#059669':calcOverall(form)>=3?'#2563EB':calcOverall(form)>=2?'#D97706':'#DC2626'}}>{calcOverall(form)}/5</span>
                                </div>
                            </div>

                            <div><label className="block text-xs font-bold text-gray-700 mb-1">💪 Strengths Observed</label><textarea value={form.strengths} onChange={e=>setForm(p=>({...p,strengths:e.target.value}))} rows={2} placeholder="What did the teacher do well?" className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none resize-none"/></div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">📈 Areas for Growth</label><textarea value={form.areas_for_growth} onChange={e=>setForm(p=>({...p,areas_for_growth:e.target.value}))} rows={2} placeholder="What can be improved?" className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none"/></div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">🎯 Action Plan</label><textarea value={form.action_plan} onChange={e=>setForm(p=>({...p,action_plan:e.target.value}))} rows={2} placeholder="Agreed action steps and timeline…" className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"/></div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Teacher Comments</label><textarea value={form.teacher_comments} onChange={e=>setForm(p=>({...p,teacher_comments:e.target.value}))} rows={2} placeholder="Teacher's own reflections or response…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none resize-none"/></div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as any}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white"><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="acknowledged">Acknowledged by Teacher</option></select>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={()=>{setShowModal(false);setEditOb(null);setForm(empty);}} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 font-semibold">Cancel</button>
                            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#0891B2,#06B6D4)'}}>
                                {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editOb?'Update':'Save'} Observation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
