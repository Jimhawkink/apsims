'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiTrendingUp, FiPlus, FiSearch, FiRefreshCw, FiX, FiSave, FiEdit2,
    FiTrash2, FiArrowRight, FiAlertCircle, FiDownload, FiPrinter,
    FiUsers, FiAward, FiCheckCircle, FiCalendar, FiBarChart2,
    FiBook, FiFileText, FiActivity, FiTarget, FiStar, FiClock,
    FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import ExcelJS from 'exceljs';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CPDStatus = 'planned'|'in_progress'|'completed'|'cancelled';
type CPDCategory = 'CBC Pedagogy'|'Assessment'|'ICT Integration'|'Leadership'|'Subject Mastery'|'Counselling'|'Special Needs'|'General';

interface CPDEntry {
    id: string; teacher_name: string; teacher_id?: string;
    activity_title: string; category: CPDCategory;
    provider: string; facilitator?: string;
    start_date: string; end_date?: string; duration_hours: number;
    venue: string; mode: string; cost?: number;
    cbc_competency?: string; learning_outcomes?: string;
    certificate_no?: string; certificate_url?: string;
    status: CPDStatus; impact_rating?: number; reflection?: string;
    term: string; year: number; created_at: string;
}

const SQL = `CREATE TABLE IF NOT EXISTS school_teacher_cpd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_name text NOT NULL, teacher_id text,
  activity_title text NOT NULL, category text,
  provider text, facilitator text,
  start_date date, end_date date, duration_hours numeric(5,1) DEFAULT 0,
  venue text, mode text DEFAULT 'In-Person', cost numeric(10,2),
  cbc_competency text, learning_outcomes text,
  certificate_no text, certificate_url text,
  status text DEFAULT 'completed', impact_rating int,
  reflection text, term text, year int DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_teacher_cpd ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_teacher_cpd FOR ALL USING (true) WITH CHECK (true);`;

const CATEGORIES: CPDCategory[] = ['CBC Pedagogy','Assessment','ICT Integration','Leadership','Subject Mastery','Counselling','Special Needs','General'];
const MODES = ['In-Person','Online','Blended','Workshop','Conference','Seminar','Peer Learning'];
const CAT_COLORS: Record<CPDCategory,string> = {
    'CBC Pedagogy':'#2563EB','Assessment':'#059669','ICT Integration':'#7C3AED','Leadership':'#D97706',
    'Subject Mastery':'#DC2626','Counselling':'#0891B2','Special Needs':'#DB2777','General':'#64748B',
};
const STATUS_CFG: Record<CPDStatus,{l:string;bg:string;fg:string}> = {
    planned:{l:'Planned',bg:'#DBEAFE',fg:'#2563EB'},
    in_progress:{l:'In Progress',bg:'#FEF3C7',fg:'#D97706'},
    completed:{l:'Completed',bg:'#D1FAE5',fg:'#059669'},
    cancelled:{l:'Cancelled',bg:'#FEE2E2',fg:'#DC2626'},
};

const DEMO: CPDEntry[] = [
    {id:'c1',teacher_name:'Ms. Jane Akinyi',activity_title:'CBC Assessment & Rubric Design Workshop',category:'Assessment',provider:'KICD',facilitator:'Dr. Kamau',start_date:'2025-05-12',end_date:'2025-05-14',duration_hours:18,venue:'Kenyatta International Convention Centre, Nairobi',mode:'Workshop',cost:5000,cbc_competency:'Competency-Based Assessment',learning_outcomes:'Developed 5 new CBC rubrics for Mathematics. Aligned assessment tasks to KICD framework.',certificate_no:'KICD/CPD/2025/001',status:'completed',impact_rating:5,reflection:'Excellent. Directly applicable to my Grade 7 classes. Will implement from next term.',term:'Term 1',year:2025,created_at:new Date().toISOString()},
    {id:'c2',teacher_name:'Mr. David Kamau',activity_title:'ICT Integration in CBC Classrooms',category:'ICT Integration',provider:'Teachers Service Commission',facilitator:'Ms. Wanjiru',start_date:'2025-06-02',end_date:'2025-06-02',duration_hours:6,venue:'Online — Zoom',mode:'Online',cost:0,cbc_competency:'Digital Literacy',learning_outcomes:'Learned to use Google Classroom, Padlet, and Kahoot for CBC formative assessment.',status:'completed',impact_rating:4,reflection:'Very practical. Already using Google Classroom for SBA evidence collection.',term:'Term 2',year:2025,created_at:new Date().toISOString()},
    {id:'c3',teacher_name:'Mrs. Grace Njeri',activity_title:'Special Needs & Inclusive Education Training',category:'Special Needs',provider:'Kenya Institute of Special Education',facilitator:'Dr. Otieno',start_date:'2025-07-07',end_date:'2025-07-09',duration_hours:21,venue:'Mombasa Training Centre',mode:'In-Person',cost:8500,cbc_competency:'Inclusive Education',learning_outcomes:'Strategies for differentiating CBC instruction for learners with diverse needs.',certificate_no:'KISE/INC/2025/042',status:'completed',impact_rating:5,reflection:'Life-changing training. Now I understand how to support all learners within the CBC framework.',term:'Term 2',year:2025,created_at:new Date().toISOString()},
    {id:'c4',teacher_name:'Ms. Jane Akinyi',activity_title:'School Leadership & CBC Implementation',category:'Leadership',provider:'Kenya Secondary Schools Heads Association',facilitator:'Mr. Ochieng',start_date:'2025-08-15',end_date:'2025-08-16',duration_hours:12,venue:'Nakuru County',mode:'Conference',cost:3000,cbc_competency:'Leadership & Management',learning_outcomes:'TBD — conference not yet attended',status:'planned',term:'Term 2',year:2025,created_at:new Date().toISOString()},
];

// ── Ultra Pagination ────────────────────────────────────────────────────────
function UltraPagination({ total,page,perPage,onPage }:{ total:number;page:number;perPage:number;onPage:(p:number)=>void }) {
    const pages = Math.ceil(total/perPage);
    if (pages<=1) return null;
    const start = Math.max(1, page-2); const end = Math.min(pages, page+2);
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <span className="text-xs text-gray-500">{((page-1)*perPage)+1}–{Math.min(page*perPage,total)} of {total} records</span>
            <div className="flex items-center gap-1">
                <button onClick={()=>onPage(1)} disabled={page===1} className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 border border-gray-200 text-xs font-bold">«</button>
                <button onClick={()=>onPage(page-1)} disabled={page===1} className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 border border-gray-200"><FiChevronLeft size={12}/></button>
                {start>1&&<span className="px-2 text-gray-400 text-xs">…</span>}
                {Array.from({length:end-start+1},(_,i)=>start+i).map(p=>(
                    <button key={p} onClick={()=>onPage(p)} className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${p===page?'text-white shadow-sm':'text-gray-600 hover:bg-white border border-gray-200'}`} style={p===page?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>{p}</button>
                ))}
                {end<pages&&<span className="px-2 text-gray-400 text-xs">…</span>}
                <button onClick={()=>onPage(page+1)} disabled={page===pages} className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 border border-gray-200"><FiChevronRight size={12}/></button>
                <button onClick={()=>onPage(pages)} disabled={page===pages} className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 border border-gray-200 text-xs font-bold">»</button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                Go to <input type="number" min={1} max={pages} defaultValue={page} onKeyDown={e=>{if(e.key==='Enter'){const v=parseInt((e.target as HTMLInputElement).value);if(v>=1&&v<=pages)onPage(v);}}} className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"/> of {pages}
            </div>
        </div>
    );
}

export default function CBCProfDevPage() {
    const [entries, setEntries] = useState<CPDEntry[]>([]);
    const [staff, setStaff]     = useState<{id:string;full_name:string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbReady, setDbReady] = useState(false);
    const [tab, setTab]         = useState<'log'|'analytics'|'certificates'>('log');
    const [search, setSearch]   = useState('');
    const [fCat, setFCat]       = useState('');
    const [fStatus, setFStatus] = useState('');
    const [fTeacher, setFTeacher] = useState('');
    const [fYear, setFYear]     = useState(String(new Date().getFullYear()));
    const [showModal, setShowModal] = useState(false);
    const [editEntry, setEditEntry] = useState<CPDEntry|null>(null);
    const [saving, setSaving]   = useState(false);
    const [page, setPage]       = useState(1);
    const PER_PAGE = 15;

    const empty = { teacher_name:'', teacher_id:'', activity_title:'', category:'CBC Pedagogy' as CPDCategory, provider:'', facilitator:'', start_date:new Date().toISOString().slice(0,10), end_date:'', duration_hours:6, venue:'', mode:'In-Person', cost:undefined as any, cbc_competency:'', learning_outcomes:'', certificate_no:'', certificate_url:'', status:'completed' as CPDStatus, impact_rating:undefined as any, reflection:'', term:'Term 2', year:new Date().getFullYear() };
    const [form, setForm] = useState(empty);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const {data:sR}=await sb.from('school_users').select('id,full_name').order('full_name');
            setStaff(sR||[]);
            const {error}=await sb.from('school_teacher_cpd').select('id').limit(1);
            const ready=!error||error.code!=='42P01';
            setDbReady(ready);
            if(ready){const {data}=await sb.from('school_teacher_cpd').select('*').order('start_date',{ascending:false}).limit(500);setEntries(data||[]);}
            else{setEntries(DEMO);}
        }catch{setEntries(DEMO);}
        setLoading(false);
    }

    const filtered = useMemo(()=>entries.filter(e=>
        (!search||`${e.teacher_name} ${e.activity_title} ${e.provider} ${e.category}`.toLowerCase().includes(search.toLowerCase()))
        &&(!fCat||e.category===fCat)&&(!fStatus||e.status===fStatus)
        &&(!fTeacher||e.teacher_name===fTeacher)&&(!fYear||String(e.year)===fYear)
    ),[entries,search,fCat,fStatus,fTeacher,fYear]);

    const paginated = useMemo(()=>filtered.slice((page-1)*PER_PAGE,page*PER_PAGE),[filtered,page]);

    const stats = useMemo(()=>({
        total:entries.length,
        completed:entries.filter(e=>e.status==='completed').length,
        hours:entries.reduce((a,e)=>a+(e.duration_hours||0),0),
        teachers:new Set(entries.map(e=>e.teacher_name)).size,
        cost:entries.reduce((a,e)=>a+(e.cost||0),0),
        certs:entries.filter(e=>e.certificate_no).length,
    }),[entries]);

    const analytics = useMemo(()=>{
        const byCat:Record<string,{count:number;hours:number}>={}; const byTeacher:Record<string,{count:number;hours:number}>={}; const byMode:Record<string,number>={};
        entries.filter(e=>e.status==='completed').forEach(e=>{
            if(!byCat[e.category])byCat[e.category]={count:0,hours:0}; byCat[e.category].count++; byCat[e.category].hours+=e.duration_hours||0;
            if(!byTeacher[e.teacher_name])byTeacher[e.teacher_name]={count:0,hours:0}; byTeacher[e.teacher_name].count++; byTeacher[e.teacher_name].hours+=e.duration_hours||0;
            if(!byMode[e.mode])byMode[e.mode]=0; byMode[e.mode]++;
        });
        return { byCat, byTeacher, byMode };
    },[entries]);

    async function save(){
        if(!form.teacher_name||!form.activity_title||!form.provider){toast.error('Teacher, activity title and provider are required');return;}
        setSaving(true);
        try{
            const payload:any={teacher_name:form.teacher_name,teacher_id:form.teacher_id||null,activity_title:form.activity_title,category:form.category,provider:form.provider,facilitator:form.facilitator||null,start_date:form.start_date,end_date:form.end_date||null,duration_hours:Number(form.duration_hours)||0,venue:form.venue||null,mode:form.mode,cost:form.cost?Number(form.cost):null,cbc_competency:form.cbc_competency||null,learning_outcomes:form.learning_outcomes||null,certificate_no:form.certificate_no||null,certificate_url:form.certificate_url||null,status:form.status,impact_rating:form.impact_rating?Number(form.impact_rating):null,reflection:form.reflection||null,term:form.term,year:Number(form.year)};
            if(editEntry){
                if(dbReady){const {error}=await sb.from('school_teacher_cpd').update(payload).eq('id',editEntry.id);if(error)throw error;}
                setEntries(p=>p.map(e=>e.id===editEntry.id?{...e,...payload}:e));
                toast.success('CPD entry updated!');
            }else{
                if(dbReady){const {data,error}=await sb.from('school_teacher_cpd').insert(payload).select().single();if(error)throw error;setEntries(p=>[data,...p]);}
                else{setEntries(p=>[{...payload,id:`demo-${Date.now()}`,created_at:new Date().toISOString()},...p]);}
                toast.success('✅ CPD activity recorded!');
            }
            setShowModal(false);setEditEntry(null);setForm(empty);
        }catch(e:any){toast.error(e.message||'Save failed');}
        setSaving(false);
    }

    async function del(id:string){
        if(!confirm('Delete this CPD entry?'))return;
        if(dbReady)await sb.from('school_teacher_cpd').delete().eq('id',id);
        setEntries(p=>p.filter(e=>e.id!==id));
        toast.success('Deleted');
    }

    async function exportExcel(){
        const wb=new ExcelJS.Workbook();
        wb.creator='APSIMS CBC Pro';wb.created=new Date();

        const fnt=(bold=false,sz=10,color='000000')=>({name:'Calibri',bold,size:sz,color:{argb:color}});
        const aln=(h:any,v:any='middle')=>({horizontal:h,vertical:v,wrapText:true});
        const fill=(argb:string)=>({type:'pattern',pattern:'solid',fgColor:{argb}}) as ExcelJS.Fill;

        // Sheet 1: Summary KPIs
        const s1=wb.addWorksheet('Summary Dashboard');
        s1.columns=[{width:30},{width:18},{width:18},{width:18},{width:18},{width:18}];
        const titleRow=s1.addRow(['CBC TEACHER PROFESSIONAL DEVELOPMENT LOG','','','','','']);
        titleRow.height=36;s1.mergeCells('A1:F1');
        titleRow.getCell(1).fill=fill('FF0F2044');titleRow.getCell(1).font=fnt(true,18,'FFFFFFFF');titleRow.getCell(1).alignment=aln('center');
        const subR=s1.addRow([`Generated: ${new Date().toLocaleString('en-KE')} · ${filtered.length} records · ${fYear} Academic Year`,'','','','','']);
        subR.height=20;s1.mergeCells('A2:F2');subR.getCell(1).fill=fill('FF1E3A5F');subR.getCell(1).font=fnt(false,10,'FFBFDBFE');subR.getCell(1).alignment=aln('center');
        s1.addRow([]);
        const kpiH=s1.addRow(['KPI','Value','','KPI','Value','']);
        kpiH.height=20;['A','B','C','D','E','F'].forEach(c=>{kpiH.getCell(c).fill=fill('FF1E3A5F');kpiH.getCell(c).font=fnt(true,10,'FFFFFFFF');kpiH.getCell(c).alignment=aln('center');});
        const kpis=[['Total Activities',stats.total,'','Completed',stats.completed,''],['Total CPD Hours',stats.hours.toFixed(1),'','Teachers Trained',stats.teachers,''],['Total Cost (KES)',`KES ${Number(stats.cost).toLocaleString()}`,'','Certificates Issued',stats.certs,'']];
        kpis.forEach(k=>{const r=s1.addRow(k);r.height=18;r.getCell('A').font=fnt(true,10);r.getCell('D').font=fnt(true,10);});

        // Sheet 2: Full CPD Data
        const s2=wb.addWorksheet('CPD Log');
        s2.columns=[{width:24},{width:32},{width:18},{width:22},{width:14},{width:14},{width:16},{width:18},{width:14},{width:20},{width:12}];
        const hdr=s2.addRow(['Teacher','Activity Title','Category','Provider','Start Date','Hours','Mode','Venue','Status','CBC Competency','Impact']);
        hdr.height=22;['A','B','C','D','E','F','G','H','I','J','K'].forEach(c=>{hdr.getCell(c).fill=fill('FF0F2044');hdr.getCell(c).font=fnt(true,10,'FFFFFFFF');hdr.getCell(c).alignment=aln('center');});
        filtered.forEach((e,i)=>{
            const r=s2.addRow([e.teacher_name,e.activity_title,e.category,e.provider,e.start_date,e.duration_hours,e.mode,e.venue||'',e.status,e.cbc_competency||'',e.impact_rating?`${e.impact_rating}/5`:'']);
            r.height=16;if(i%2===1)r.eachCell(c=>{c.fill=fill('FFF8FAFC');});
        });

        // Sheet 3: By Category
        const s3=wb.addWorksheet('By Category');
        s3.columns=[{width:28},{width:16},{width:16},{width:20}];
        const ch=s3.addRow(['Category','Activities','Total Hours','Avg Hours/Activity']);
        ch.height=22;['A','B','C','D'].forEach(c=>{ch.getCell(c).fill=fill('FF0F2044');ch.getCell(c).font=fnt(true,10,'FFFFFFFF');ch.getCell(c).alignment=aln('center');});
        Object.entries(analytics.byCat).sort((a,b)=>b[1].count-a[1].count).forEach(([cat,d],i)=>{
            const r=s3.addRow([cat,d.count,d.hours.toFixed(1),(d.count?d.hours/d.count:0).toFixed(1)]);
            r.height=16;if(i%2===1)r.eachCell(c=>{c.fill=fill('FFF8FAFC');});
        });

        const buf=await wb.xlsx.writeBuffer();
        const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=`CBC_CPD_Log_${fYear}.xlsx`;a.click();
        toast.success('✅ Excel exported — 3 sheets!');
    }

    function printReport(){
        const html=`<!DOCTYPE html><html><head><title>CBC CPD Log</title><style>
        @page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;font-size:9px;color:#1e293b}
        h1{font-size:14px;color:#0F2044;margin:0 0 2px}p{color:#64748b;margin:0 0 10px}
        .kpis{display:flex;gap:10px;margin-bottom:12px}.kpi{background:#0F2044;color:#fff;padding:8px 14px;border-radius:8px;text-align:center}
        .kpi-v{font-size:18px;font-weight:900}.kpi-l{font-size:8px;opacity:0.7}
        table{width:100%;border-collapse:collapse}th{background:#0F2044;color:#fff;padding:5px 6px;text-align:left;font-size:8px}
        td{padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:8px}tr:nth-child(even){background:#f8fafc}
        </style></head><body>
        <h1>📈 CBC Teacher Professional Development Log</h1>
        <p>Generated: ${new Date().toLocaleString('en-KE')} · ${filtered.length} records · ${fYear}</p>
        <div class="kpis">
            <div class="kpi"><div class="kpi-v">${stats.total}</div><div class="kpi-l">Total Activities</div></div>
            <div class="kpi"><div class="kpi-v">${stats.completed}</div><div class="kpi-l">Completed</div></div>
            <div class="kpi"><div class="kpi-v">${stats.hours.toFixed(0)}h</div><div class="kpi-l">CPD Hours</div></div>
            <div class="kpi"><div class="kpi-v">${stats.teachers}</div><div class="kpi-l">Teachers</div></div>
            <div class="kpi"><div class="kpi-v">KES ${Number(stats.cost).toLocaleString()}</div><div class="kpi-l">Total Cost</div></div>
            <div class="kpi"><div class="kpi-v">${stats.certs}</div><div class="kpi-l">Certificates</div></div>
        </div>
        <table><thead><tr><th>Teacher</th><th>Activity</th><th>Category</th><th>Provider</th><th>Date</th><th>Hours</th><th>Mode</th><th>Cert No.</th><th>Status</th><th>Impact</th></tr></thead><tbody>
        ${filtered.map(e=>`<tr><td><b>${e.teacher_name}</b></td><td>${e.activity_title}</td><td>${e.category}</td><td>${e.provider}</td><td>${e.start_date}</td><td>${e.duration_hours}h</td><td>${e.mode}</td><td>${e.certificate_no||'—'}</td><td>${e.status}</td><td>${e.impact_rating?e.impact_rating+'/5':'—'}</td></tr>`).join('')}
        </tbody></table></body></html>`;
        const w=window.open('','_blank');w?.document.write(html);w?.document.close();w?.print();
    }

    if(loading) return(
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}><FiTrendingUp size={30} color="#F59E0B"/></div>
            <p className="text-xl font-black text-gray-800">Loading CPD Log…</p><p className="text-sm text-gray-500 mt-1">Teacher Professional Development Tracker</p></div>
        </div>
    );

    const teachers=Array.from(new Set(entries.map(e=>e.teacher_name)));

    return(
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* HEADER */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/hr-payroll" className="hover:text-white">HR & Payroll</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">📈 CBC Professional Dev Log</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}>
                                <FiTrendingUp size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">CBC Professional Development Log</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-400 text-purple-900">TSC ALIGNED</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CPD TRACKER</span>
                                    {!dbReady&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">Track & Manage Teacher CPD Activities · Certificates · Hours · Impact Assessment</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/staff/cbc-observation-log',l:'Observation Log',ic:FiActivity},{href:'/dashboard/hr-payroll/staff',l:'Staff Directory',ic:FiUsers}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><FiDownload size={12}/>Excel (3 Sheets)</button>
                            <button onClick={printReport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><FiPrinter size={12}/>Print</button>
                            <button onClick={()=>{setForm(empty);setEditEntry(null);setShowModal(true);}} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                <FiPlus size={15}/>Add CPD Activity
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        {[['Categories','8 CPD types'],['Tracking','Hours · Cost · Certificates'],['Export','Excel 3-Sheet + Print'],['Authority','TSC / MoE Kenya']].map(([k,v])=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}>
                                <span className="text-amber-400 font-bold">{k}:</span><span className="text-blue-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-white/10">
                    {[{l:'Activities',v:stats.total,ic:FiBook,c:'#F59E0B'},{l:'Completed',v:stats.completed,ic:FiCheckCircle,c:'#34D399'},{l:'CPD Hours',v:stats.hours.toFixed(0),ic:FiClock,c:'#60A5FA'},{l:'Teachers',v:stats.teachers,ic:FiUsers,c:'#A78BFA'},{l:'Certificates',v:stats.certs,ic:FiAward,c:'#F472B6'},{l:'Cost (KES)',v:`${Math.round(stats.cost/1000)}K`,ic:FiTarget,c:'#FCD34D'}].map((s,i)=>(
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
                        <p className="font-bold text-amber-800">Demo Mode — <code className="text-xs bg-amber-100 px-1 rounded">school_teacher_cpd</code> table not yet created</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['log','📋 CPD Log',FiBook],['analytics','📊 Analytics',FiBarChart2],['certificates','🏅 Certificates',FiAward]] as const).map(([k,l,Ic])=>(
                    <button key={k} onClick={()=>setTab(k as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===k?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={13}/>{l}
                    </button>
                ))}
            </div>

            {/* ── CPD LOG ── */}
            {tab==='log'&&(<>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="relative flex-1"><FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" placeholder="Search activity, teacher, provider…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
                        <div className="flex flex-wrap gap-2">
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fTeacher} onChange={e=>setFTeacher(e.target.value)}><option value="">All Teachers</option>{teachers.map(t=><option key={t}>{t}</option>)}</select>
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fCat} onChange={e=>setFCat(e.target.value)}><option value="">All Categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All Statuses</option>{['planned','in_progress','completed','cancelled'].map(s=><option key={s}>{s}</option>)}</select>
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fYear} onChange={e=>setFYear(e.target.value)}>{[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select>
                            <button onClick={()=>{setSearch('');setFCat('');setFStatus('');setFTeacher('');setPage(1);}} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1"><FiRefreshCw size={11}/>Clear</button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} record{filtered.length!==1?'s':''} · Page {page} of {Math.ceil(filtered.length/PER_PAGE)||1}{!dbReady?' · Demo Mode':''}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}} className="text-white">
                                {['Teacher','Activity Title','Category','Provider','Date','Hours','Mode','Cert No.','Status','Impact',''].map(h=><th key={h} className="text-left px-3 py-3 text-xs font-semibold whitespace-nowrap">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {paginated.length===0?<tr><td colSpan={11} className="text-center py-16 text-gray-400"><FiBook size={40} className="mx-auto mb-3 opacity-30"/><p className="font-semibold">No CPD activities yet</p><button onClick={()=>setShowModal(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}><FiPlus size={14}/>Add First CPD Activity</button></td></tr>
                                :paginated.map((e,i)=>{
                                    const st=STATUS_CFG[e.status];const cc=CAT_COLORS[e.category]||'#64748B';
                                    return <tr key={e.id} className={`border-b border-gray-100 hover:bg-purple-50/30 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                                        <td className="px-3 py-3"><p className="text-xs font-bold text-gray-900">{e.teacher_name}</p></td>
                                        <td className="px-3 py-3 max-w-[200px]"><p className="text-xs font-semibold text-gray-800 line-clamp-2">{e.activity_title}</p>{e.cbc_competency&&<p className="text-[10px] text-purple-600 mt-0.5">{e.cbc_competency}</p>}</td>
                                        <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white whitespace-nowrap" style={{background:cc}}>{e.category}</span></td>
                                        <td className="px-3 py-3 text-xs text-gray-600">{e.provider}{e.facilitator&&<><br/><span className="text-[10px] text-gray-400">{e.facilitator}</span></>}</td>
                                        <td className="px-3 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{e.start_date}{e.end_date&&e.end_date!==e.start_date&&<><br/><span className="text-[10px] text-gray-400">→ {e.end_date}</span></>}</td>
                                        <td className="px-3 py-3 text-center"><span className="text-sm font-black text-indigo-700">{e.duration_hours}h</span></td>
                                        <td className="px-3 py-3 text-[10px] text-gray-500 whitespace-nowrap">{e.mode}</td>
                                        <td className="px-3 py-3 text-[10px] font-mono text-emerald-700">{e.certificate_no||'—'}</td>
                                        <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{background:st.bg,color:st.fg}}>{st.l}</span></td>
                                        <td className="px-3 py-3 text-center">
                                            {e.impact_rating?<div className="flex justify-center gap-0.5">{[1,2,3,4,5].map(n=><FiStar key={n} size={10} className={n<=e.impact_rating!?'text-amber-400 fill-amber-400':'text-gray-200'}/>)}</div>:<span className="text-gray-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-3 py-3"><div className="flex gap-1">
                                            <button onClick={()=>{setEditEntry(e);setForm({teacher_name:e.teacher_name,teacher_id:e.teacher_id||'',activity_title:e.activity_title,category:e.category,provider:e.provider,facilitator:e.facilitator||'',start_date:e.start_date,end_date:e.end_date||'',duration_hours:e.duration_hours,venue:e.venue||'',mode:e.mode,cost:e.cost as any,cbc_competency:e.cbc_competency||'',learning_outcomes:e.learning_outcomes||'',certificate_no:e.certificate_no||'',certificate_url:e.certificate_url||'',status:e.status,impact_rating:e.impact_rating as any,reflection:e.reflection||'',term:e.term,year:e.year});setShowModal(true);}} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={12}/></button>
                                            <button onClick={()=>del(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={12}/></button>
                                        </div></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                    <UltraPagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={p=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'});}}/>
                </div>
            </>)}

            {/* ── ANALYTICS ── */}
            {tab==='analytics'&&(
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 className="text-purple-600"/>CPD by Category</h2>
                        {Object.entries(analytics.byCat).sort((a,b)=>b[1].count-a[1].count).map(([cat,d])=>{
                            const maxC=Math.max(...Object.values(analytics.byCat).map(x=>x.count));const pct=maxC?Math.round(d.count/maxC*100):0;
                            const color=CAT_COLORS[cat as CPDCategory]||'#64748B';
                            return <div key={cat} className="mb-3">
                                <div className="flex justify-between text-xs mb-1"><span className="font-bold text-gray-700">{cat}</span><span className="text-gray-500">{d.count} activities · {d.hours.toFixed(0)}h</span></div>
                                <div className="bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full transition-all duration-700" style={{width:`${pct}%`,background:color}}/></div>
                            </div>;
                        })}
                        {!Object.keys(analytics.byCat).length&&<p className="text-center text-gray-400 py-8">No data yet</p>}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiUsers className="text-indigo-600"/>Teacher CPD Summary</h2>
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                            {Object.entries(analytics.byTeacher).sort((a,b)=>b[1].hours-a[1].hours).map(([name,d])=>{
                                const certs=entries.filter(e=>e.teacher_name===name&&e.certificate_no).length;
                                return <div key={name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}>{name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
                                    <div className="flex-1"><p className="text-xs font-bold text-gray-900">{name}</p><p className="text-[10px] text-gray-400">{d.count} activities · {certs} certificates</p></div>
                                    <div className="text-right"><div className="text-sm font-black text-purple-700">{d.hours.toFixed(0)}h</div><div className="text-[10px] text-gray-400">CPD hours</div></div>
                                </div>;
                            })}
                            {!Object.keys(analytics.byTeacher).length&&<p className="text-center text-gray-400 text-sm py-8">Add CPD activities to see analytics</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CERTIFICATES ── */}
            {tab==='certificates'&&(
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entries.filter(e=>e.certificate_no||e.status==='completed').map(e=>(
                        <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                            <div className="h-2" style={{background:CAT_COLORS[e.category]||'#64748B'}}/>
                            <div className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                        <FiAward size={22}/>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xs font-black text-gray-900 leading-tight">{e.activity_title}</h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{e.teacher_name}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-400">Provider</span><span className="font-semibold text-gray-700">{e.provider}</span></div>
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-400">Date</span><span className="font-semibold text-gray-700">{e.start_date}</span></div>
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-400">Hours</span><span className="font-semibold text-indigo-700">{e.duration_hours}h</span></div>
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-400">Cert No.</span><span className="font-mono font-bold text-emerald-700">{e.certificate_no||'Pending'}</span></div>
                                    {e.impact_rating&&<div className="flex justify-between text-[10px] items-center"><span className="text-gray-400">Impact</span><div className="flex gap-0.5">{[1,2,3,4,5].map(n=><FiStar key={n} size={10} className={n<=e.impact_rating!?'text-amber-400 fill-amber-400':'text-gray-200'}/>)}</div></div>}
                                </div>
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{background:CAT_COLORS[e.category]}}>{e.category}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CFG[e.status].fg}`} style={{background:STATUS_CFG[e.status].bg}}>{STATUS_CFG[e.status].l}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!entries.filter(e=>e.certificate_no||e.status==='completed').length&&(
                        <div className="col-span-3 text-center py-16 text-gray-400"><FiAward size={48} className="mx-auto mb-4 opacity-20"/><p className="font-semibold">No certificates yet</p><p className="text-xs mt-1">Complete CPD activities to see certificates here</p></div>
                    )}
                </div>
            )}

            {/* MODAL */}
            {showModal&&(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[93vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-black text-gray-900 flex items-center gap-2"><FiTrendingUp className="text-purple-600"/>{editEntry?'Edit':'Record'} CPD Activity</h2>
                            <button onClick={()=>{setShowModal(false);setEditEntry(null);setForm(empty);}} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Teacher *</label>
                                {staff.length>0?<select value={form.teacher_name} onChange={e=>setForm(p=>({...p,teacher_name:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white"><option value="">— Select Teacher —</option>{staff.map(s=><option key={s.id}>{s.full_name}</option>)}</select>
                                :<input value={form.teacher_name} onChange={e=>setForm(p=>({...p,teacher_name:e.target.value}))} placeholder="Teacher full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/>}
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Activity Title *</label><input value={form.activity_title} onChange={e=>setForm(p=>({...p,activity_title:e.target.value}))} placeholder="e.g. CBC Assessment & Rubric Design Workshop" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value as CPDCategory}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Mode</label><select value={form.mode} onChange={e=>setForm(p=>({...p,mode:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white">{MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Provider *</label><input value={form.provider} onChange={e=>setForm(p=>({...p,provider:e.target.value}))} placeholder="e.g. KICD, TSC, MoE" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Facilitator</label><input value={form.facilitator} onChange={e=>setForm(p=>({...p,facilitator:e.target.value}))} placeholder="e.g. Dr. Kamau" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">End Date</label><input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Duration (hours)</label><input type="number" min={0.5} step={0.5} value={form.duration_hours} onChange={e=>setForm(p=>({...p,duration_hours:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Venue</label><input value={form.venue} onChange={e=>setForm(p=>({...p,venue:e.target.value}))} placeholder="e.g. KICC Nairobi / Online" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Cost (KES)</label><input type="number" min={0} value={form.cost||''} onChange={e=>setForm(p=>({...p,cost:e.target.value as any}))} placeholder="0 for free" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">CBC Competency Addressed</label><input value={form.cbc_competency} onChange={e=>setForm(p=>({...p,cbc_competency:e.target.value}))} placeholder="e.g. Competency-Based Assessment, Digital Literacy" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Learning Outcomes</label><textarea value={form.learning_outcomes} onChange={e=>setForm(p=>({...p,learning_outcomes:e.target.value}))} rows={2} placeholder="What did the teacher learn and how will it be applied?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Certificate Number</label><input value={form.certificate_no} onChange={e=>setForm(p=>({...p,certificate_no:e.target.value}))} placeholder="e.g. KICD/CPD/2025/001" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as CPDStatus}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white"><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-2">Impact Rating</label>
                                <div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setForm(p=>({...p,impact_rating:n as any}))} className={`flex-1 py-2.5 rounded-xl border-2 transition-all text-center ${form.impact_rating===n?'border-amber-500 bg-amber-50':'border-gray-200 hover:border-amber-300'}`}>
                                    <FiStar size={16} className={`mx-auto ${form.impact_rating&&n<=form.impact_rating?'text-amber-400 fill-amber-400':'text-gray-300'}`}/>
                                    <div className="text-[9px] text-gray-500 mt-0.5">{['','Poor','Fair','Good','Great','Excel.'][n]}</div>
                                </button>)}</div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Teacher Reflection</label><textarea value={form.reflection} onChange={e=>setForm(p=>({...p,reflection:e.target.value}))} rows={2} placeholder="Personal reflections and how you will apply learning in CBC teaching…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Term</label><select value={form.term} onChange={e=>setForm(p=>({...p,term:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Year</label><select value={form.year} onChange={e=>setForm(p=>({...p,year:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white">{[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select></div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={()=>{setShowModal(false);setEditEntry(null);setForm(empty);}} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 font-semibold">Cancel</button>
                            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}>
                                {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editEntry?'Update':'Save'} CPD Activity
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
