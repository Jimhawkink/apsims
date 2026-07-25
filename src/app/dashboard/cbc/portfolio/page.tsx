'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiFolder, FiUpload, FiImage, FiFile, FiVideo, FiDownload, FiSearch,
    FiGrid, FiList, FiClock, FiUser, FiBook, FiLayers, FiStar,
    FiCheckCircle, FiAlertCircle, FiEye, FiTrash2, FiShare2,
    FiX, FiPlus, FiBarChart2, FiAward, FiTrendingUp, FiUsers, FiBookOpen,
    FiZap, FiPaperclip, FiCheck, FiRefreshCw, FiEdit2, FiCalendar,
    FiArrowRight, FiShield, FiPieChart,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type ItemStatus = 'draft' | 'submitted' | 'approved' | 'shared';
type ViewMode = 'gallery' | 'list' | 'timeline';
type FileType = 'image' | 'pdf' | 'video' | 'document' | 'other';

interface PortfolioItem {
    id: string; student_id: number; student_name?: string; form_name?: string;
    year: number; title: string; description?: string; file_url?: string;
    file_type: FileType; file_name?: string; learning_area?: string;
    strand?: string; sub_strand?: string; competency_level?: CompLevel;
    teacher_name?: string; status: ItemStatus; created_at: string; tags?: string[];
}
interface Student { id: number; first_name: string; last_name: string; admission_no?: string; form_id?: number; form_name?: string; }

const COMP = {
    EE: { label: 'Exceeding Expectation', color: '#059669', bg: '#D1FAE5', desc: 'Outstanding — beyond grade level' },
    ME: { label: 'Meeting Expectation',   color: '#2563EB', bg: '#DBEAFE', desc: 'Performing at expected grade level' },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', desc: 'Making progress toward grade level' },
    BE: { label: 'Below Expectation',     color: '#DC2626', bg: '#FEE2E2', desc: 'Requires significant support' },
};

const LEARNING_AREAS = [
    'Literacy Activities','Kiswahili','English','Mathematics Activities',
    'Environmental Activities','Hygiene & Nutrition','Religious Education',
    'Creative Arts','Physical Education','Pre-Technical Studies',
    'Agriculture','Social Studies','Business Studies','ICT',
];

const DEMO: PortfolioItem[] = [
    { id:'d1', student_id:1, student_name:'Amina Otieno', form_name:'Grade 7A', year:2025, title:'Water Cycle Diagram — Creative Project', description:'Hand-drawn water cycle diagram with Kiswahili and English annotations. Student demonstrated excellent understanding of evaporation, condensation and precipitation.', file_type:'image', learning_area:'Environmental Activities', strand:'Physical Environment', sub_strand:'Water Bodies', competency_level:'EE', teacher_name:'Ms. Kamau', status:'shared', created_at:'2025-03-15T10:30:00Z', tags:['creative','science','bilingual'] },
    { id:'d2', student_id:2, student_name:'Brian Mwangi', form_name:'Grade 8B', year:2025, title:'Fraction Pizza — Maths Practical', description:'Cut and paste activity demonstrating fractions using real-world contexts. Student created 5 different pizza fraction models.', file_type:'image', learning_area:'Mathematics Activities', strand:'Numbers', sub_strand:'Fractions', competency_level:'ME', teacher_name:'Mr. Odhiambo', status:'approved', created_at:'2025-03-10T08:00:00Z', tags:['maths','practical','hands-on'] },
    { id:'d3', student_id:3, student_name:'Chloe Wanjiku', form_name:'Grade 6A', year:2025, title:'Poetry Recitation — Video Recording', description:'Original poem on environmental conservation. Strong use of figurative language and rhythm.', file_type:'video', learning_area:'Literacy Activities', strand:'Reading', sub_strand:'Creative Writing', competency_level:'EE', teacher_name:'Ms. Njeri', status:'approved', created_at:'2025-04-02T14:00:00Z', tags:['literacy','creative','oral'] },
    { id:'d4', student_id:4, student_name:'David Kipkoech', form_name:'Grade 9A', year:2025, title:'Arduino LED Project Report', description:'Pre-Technical Studies project connecting LED circuits. Full technical report documenting steps.', file_type:'pdf', learning_area:'Pre-Technical Studies', strand:'Electronics', sub_strand:'Simple Circuits', competency_level:'ME', teacher_name:'Mr. Mutai', status:'submitted', created_at:'2025-04-08T11:00:00Z', tags:['stem','electronics','project'] },
    { id:'d5', student_id:5, student_name:'Eva Moraa', form_name:'Grade 7B', year:2025, title:'Community Map Drawing', description:'Student mapped their community including natural features, infrastructure and services. Map includes legend and compass direction.', file_type:'image', learning_area:'Social Studies', strand:'Social Environment', sub_strand:'The Community', competency_level:'AE', teacher_name:'Ms. Achieng', status:'submitted', created_at:'2025-04-12T09:30:00Z', tags:['social','geography','mapping'] },
    { id:'d6', student_id:6, student_name:'Felix Omondi', form_name:'Grade 8A', year:2025, title:'Organic Farming Photo Journal', description:'Week-long photo journal of the school garden documenting soil preparation, planting, watering and first shoots. 12 annotated photos.', file_type:'image', learning_area:'Agriculture', strand:'Crop Production', sub_strand:'Kitchen Garden', competency_level:'EE', teacher_name:'Mr. Kiprotich', status:'shared', created_at:'2025-04-18T16:00:00Z', tags:['agriculture','photo','journal'] },
];

const fileCol = (t: FileType) => ({ image:{bg:'#EFF6FF',fg:'#2563EB'}, video:{bg:'#FDF4FF',fg:'#9333EA'}, pdf:{bg:'#FFF7ED',fg:'#EA580C'}, document:{bg:'#F0FDF4',fg:'#16A34A'}, other:{bg:'#F8FAFC',fg:'#64748B'} }[t]);
const fileIco = (t: FileType, sz=18) => { const cls='flex-shrink-0'; if(t==='image') return <FiImage size={sz} className={cls}/>; if(t==='video') return <FiVideo size={sz} className={cls}/>; if(t==='pdf') return <FiFile size={sz} className={cls}/>; if(t==='document') return <FiBookOpen size={sz} className={cls}/>; return <FiPaperclip size={sz} className={cls}/>; };
const statusBadge = (s: ItemStatus) => { const m={draft:{l:'Draft',bg:'#F1F5F9',fg:'#64748B'},submitted:{l:'Submitted',bg:'#EFF6FF',fg:'#2563EB'},approved:{l:'Approved',bg:'#F0FDF4',fg:'#16A34A'},shared:{l:'Shared',bg:'#FAF5FF',fg:'#9333EA'}}[s]; return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:m.bg,color:m.fg}}>{m.l}</span>; };
const compBadge = (l?: CompLevel) => { if(!l) return null; const c=COMP[l]; return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold" style={{background:c.bg,color:c.color}}><FiAward size={10}/>{l}</span>; };
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'});

const SQL = `CREATE TABLE school_cbc_portfolios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      bigint REFERENCES school_students(id) ON DELETE CASCADE,
  year            int DEFAULT EXTRACT(YEAR FROM NOW()),
  title           text NOT NULL,
  description     text,
  file_url        text,
  file_type       text DEFAULT 'image',
  file_name       text,
  learning_area   text,
  strand          text,
  sub_strand      text,
  competency_level text DEFAULT 'ME',
  teacher_name    text,
  status          text DEFAULT 'draft',
  tags            text[],
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE school_cbc_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON school_cbc_portfolios FOR ALL USING (true) WITH CHECK (true);`;

export default function CBCPortfolioPage() {
    const [items, setItems]         = useState<PortfolioItem[]>([]);
    const [students, setStudents]   = useState<Student[]>([]);
    const [forms, setForms]         = useState<any[]>([]);
    const [areas, setAreas]         = useState<string[]>(LEARNING_AREAS);
    const [loading, setLoading]     = useState(true);
    const [dbReady, setDbReady]     = useState(false);
    const [view, setView]           = useState<ViewMode>('gallery');
    const [search, setSearch]       = useState('');
    const [fArea, setFArea]         = useState('');
    const [fLevel, setFLevel]       = useState<CompLevel|''>('');
    const [fStatus, setFStatus]     = useState<ItemStatus|''>('');
    const [fYear, setFYear]         = useState(String(new Date().getFullYear()));
    const [fType, setFType]         = useState<FileType|''>('');
    const [fForm, setFForm]         = useState('');
    const [activeTab, setTab]       = useState<'all'|'approved'|'shared'>('all');
    const [selected, setSelected]   = useState<Set<string>>(new Set());
    const [showUp, setShowUp]       = useState(false);
    const [viewItem, setViewItem]   = useState<PortfolioItem|null>(null);
    const [saving, setSaving]       = useState(false);
    const emptyForm = { student_id:'', title:'', description:'', learning_area:'', strand:'', sub_strand:'', competency_level:'ME' as CompLevel, file_type:'image' as FileType, file_name:'', year:new Date().getFullYear(), tags:'' };
    const [form, setForm]           = useState(emptyForm);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            // 1. Forms
            const { data: fms } = await sb.from('school_forms').select('id,name,form_level').order('form_level');
            const fmsData = fms || [];
            setForms(fmsData);
            const fmMap: Record<number,string> = {};
            fmsData.forEach((f:any) => { fmMap[f.id] = f.name; });

            // 2. Students — try active first, fallback without filter
            let stuData: any[] = [];
            const { data: s1 } = await sb.from('school_students').select('id,first_name,last_name,admission_no,form_id').eq('status','Active').order('first_name').limit(1000);
            if (s1 && s1.length > 0) { stuData = s1; }
            else {
                const { data: s2 } = await sb.from('school_students').select('id,first_name,last_name,admission_no,form_id').order('first_name').limit(1000);
                stuData = s2 || [];
            }
            setStudents(stuData.map((s:any) => ({ ...s, form_name: fmMap[s.form_id] || '' })));

            // 3. Portfolio table
            const { error: tErr } = await sb.from('school_cbc_portfolios').select('id').limit(1);
            const ready = !tErr || tErr.code !== '42P01';
            setDbReady(ready);

            if (ready) {
                const { data: rows } = await sb.from('school_cbc_portfolios').select('*').order('created_at',{ascending:false});
                if (rows && rows.length > 0) {
                    const ids = [...new Set(rows.map((r:any) => r.student_id))];
                    const { data: st } = await sb.from('school_students').select('id,first_name,last_name,form_id').in('id', ids);
                    const stMap: Record<number,any> = {};
                    (st||[]).forEach((s:any) => { stMap[s.id] = s; });
                    setItems(rows.map((r:any) => {
                        const s = stMap[r.student_id];
                        return { ...r, student_name: s ? `${s.first_name} ${s.last_name}` : '—', form_name: s ? (fmMap[s.form_id]||'—') : '—' };
                    }));
                } else { setItems([]); }
            } else { setItems(DEMO); }

            // 4. Learning areas
            const { data: la } = await sb.from('school_cbc_learning_areas').select('name').order('name');
            if (la && la.length > 0) setAreas(la.map((l:any) => l.name));
        } catch(e) { console.error(e); setItems(DEMO); }
        setLoading(false);
    }

    const filtered = items.filter(it => {
        const q = search.toLowerCase();
        return (!q || it.title.toLowerCase().includes(q) || (it.student_name||'').toLowerCase().includes(q) || (it.learning_area||'').toLowerCase().includes(q))
            && (!fArea   || it.learning_area === fArea)
            && (!fLevel  || it.competency_level === fLevel)
            && (!fStatus || it.status === fStatus)
            && (!fYear   || String(it.year) === fYear)
            && (!fType   || it.file_type === fType)
            && (activeTab==='all' || (activeTab==='approved'&&it.status==='approved') || (activeTab==='shared'&&it.status==='shared'));
    });

    const stats = { total:items.length, students:new Set(items.map(i=>i.student_id)).size, areas:new Set(items.map(i=>i.learning_area)).size, ee:items.filter(i=>i.competency_level==='EE').length, approved:items.filter(i=>i.status==='approved').length, shared:items.filter(i=>i.status==='shared').length };

    async function save() {
        if (!form.student_id||!form.title||!form.learning_area) { toast.error('Fill required fields'); return; }
        setSaving(true);
        try {
            if (dbReady) {
                const { error } = await sb.from('school_cbc_portfolios').insert({ student_id:Number(form.student_id), title:form.title, description:form.description, learning_area:form.learning_area, strand:form.strand, sub_strand:form.sub_strand, competency_level:form.competency_level, file_type:form.file_type, file_name:form.file_name, year:form.year, status:'submitted', tags:form.tags?form.tags.split(',').map((t:string)=>t.trim()):[] });
                if (error) throw error;
                toast.success('✅ Portfolio item saved!'); setShowUp(false); setForm(emptyForm); load();
            } else {
                const st = students.find(s=>s.id===Number(form.student_id));
                setItems(p=>[{ id:`d${Date.now()}`, student_id:Number(form.student_id), student_name:st?`${st.first_name} ${st.last_name}`:'—', form_name:st?.form_name||'—', year:form.year, title:form.title, description:form.description, file_type:form.file_type, learning_area:form.learning_area, strand:form.strand, sub_strand:form.sub_strand, competency_level:form.competency_level, status:'submitted', created_at:new Date().toISOString(), tags:form.tags?form.tags.split(',').map((t:string)=>t.trim()):[] },...p]);
                toast.success('✅ Saved (demo mode)'); setShowUp(false); setForm(emptyForm);
            }
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSaving(false);
    }

    async function setStatus(id:string, status:ItemStatus) {
        if (dbReady) await sb.from('school_cbc_portfolios').update({status}).eq('id',id);
        setItems(p=>p.map(i=>i.id===id?{...i,status}:i));
        if(viewItem?.id===id) setViewItem(v=>v?{...v,status}:v);
        toast.success(`Item ${status}!`);
    }

    async function del(id:string) {
        if(!confirm('Delete this portfolio item?')) return;
        if(dbReady) await sb.from('school_cbc_portfolios').delete().eq('id',id);
        setItems(p=>p.filter(i=>i.id!==id));
        if(viewItem?.id===id) setViewItem(null);
        toast.success('Deleted');
    }

    const toggle = (id:string) => setSelected(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
    const bulkApprove = async () => { for(const id of selected) await setStatus(id,'approved'); setSelected(new Set()); };
    const bulkShare   = async () => { for(const id of selected) await setStatus(id,'shared');   setSelected(new Set()); };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiFolder size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading CBC Portfolio System...</p>
                <p className="text-sm text-gray-500 mt-1">Connecting to student evidence bank</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* HERO */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">🗂️ CBC Student Portfolio</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                <FiFolder size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">CBC Student Portfolio</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">KICD ALIGNED</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">Digital evidence bank · Competency-Based Curriculum · Kenya CBC</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/exams/cbc-marks',label:'CBC Marks',icon:FiBookOpen},{href:'/dashboard/exams/cbc-reports',label:'CBC Reports',icon:FiBarChart2},{href:'/dashboard/exams/cbc-report-cards',label:'Report Cards',icon:FiFile},{href:'/dashboard/exams/sba-manager',label:'SBA Manager',icon:FiAward}].map(l=>(
                                <Link key={l.href} href={l.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 transition-all border border-white/10"><l.icon size={12}/>{l.label}</Link>
                            ))}
                            <button onClick={()=>setShowUp(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                <FiPlus size={15}/> Add Evidence
                            </button>
                        </div>
                    </div>
                    {/* Competency legend */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {(Object.entries(COMP) as any[]).map(([k,v]:any)=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{background:'rgba(255,255,255,0.08)',color:'#fff'}}>
                                <div className="w-2 h-2 rounded-full" style={{background:v.color}}/><span className="font-bold">{k}</span><span className="text-blue-200 hidden sm:inline">— {v.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* KPI bar */}
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-white/10">
                    {[{l:'Total Items',v:stats.total,ic:FiFolder,c:'#F59E0B'},{l:'Students',v:stats.students,ic:FiUsers,c:'#38BDF8'},{l:'Learning Areas',v:stats.areas,ic:FiBook,c:'#A78BFA'},{l:'EE Achieved',v:stats.ee,ic:FiStar,c:'#34D399'},{l:'Approved',v:stats.approved,ic:FiCheckCircle,c:'#60A5FA'},{l:'Shared',v:stats.shared,ic:FiShare2,c:'#F472B6'}].map((s,i)=>(
                        <div key={i} className="px-4 py-3 flex items-center gap-3 border-r border-white/10 last:border-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.c+'22'}}><s.ic size={14} style={{color:s.c}}/></div>
                            <div><div className="text-xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-blue-300">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DB SETUP BANNER */}
            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — Run SQL to activate full features</p>
                        <p className="text-sm text-amber-700 mt-1">Table <code className="bg-amber-100 px-1 rounded text-xs">school_cbc_portfolios</code> not found. Showing sample data.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL (copy to Supabase SQL Editor)</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/> Retry</button>
                </div>
            )}

            {/* TABS */}
            <div className="flex items-center gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['all','All Items',items.length],['approved','Approved',stats.approved],['shared','Shared with Parents',stats.shared]] as const).map(([key,lbl,cnt])=>(
                    <button key={key} onClick={()=>setTab(key as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===key?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={activeTab===key?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        {lbl}<span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab===key?'bg-white/20 text-white':'bg-gray-100 text-gray-500'}`}>{cnt}</span>
                    </button>
                ))}
            </div>

            {/* FILTER BAR */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Search student name, title, learning area…" value={search} onChange={e=>setSearch(e.target.value)}/>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[{label:'All Learning Areas',val:fArea,set:setFArea,opts:areas.map(a=>({v:a,l:a}))},
                          {label:'All Levels',val:fLevel,set:setFLevel,opts:Object.entries(COMP).map(([k,v])=>({v:k,l:`${k} — ${(v as any).label}`}))},
                          {label:'All Statuses',val:fStatus,set:setFStatus,opts:(['draft','submitted','approved','shared'] as ItemStatus[]).map(s=>({v:s,l:s[0].toUpperCase()+s.slice(1)}))},
                          {label:'All Types',val:fType,set:setFType,opts:(['image','pdf','video','document','other'] as FileType[]).map(t=>({v:t,l:t[0].toUpperCase()+t.slice(1)}))},
                        ].map((f,i)=>(
                            <select key={i} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={f.val} onChange={e=>f.set(e.target.value as any)}>
                                <option value="">{f.label}</option>
                                {f.opts.map((o:any)=><option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                        ))}
                        <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fYear} onChange={e=>setFYear(e.target.value)}>
                            {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        {(['gallery','list','timeline'] as ViewMode[]).map(m=>{ const I={gallery:FiGrid,list:FiList,timeline:FiClock}[m]; return <button key={m} onClick={()=>setView(m)} className={`p-2 rounded-md transition-all ${view===m?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`} title={m}><I size={14}/></button>; })}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">{filtered.length} item{filtered.length!==1?'s':''} · {students.length} students loaded</p>
                    {selected.size>0&&(
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-700">{selected.size} selected</span>
                            <button onClick={bulkApprove} className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 flex items-center gap-1"><FiCheck size={11}/>Approve All</button>
                            <button onClick={bulkShare}   className="px-3 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold hover:bg-purple-200 flex items-center gap-1"><FiShare2 size={11}/>Share All</button>
                            <button onClick={()=>setSelected(new Set())} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"><FiX size={12}/></button>
                        </div>
                    )}
                </div>
            </div>

            {/* GALLERY */}
            {view==='gallery'&&(
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.length===0&&<div className="col-span-full py-20 text-center"><FiFolder size={40} className="text-gray-200 mx-auto mb-3"/><p className="text-gray-400 font-medium">No portfolio items found</p><button onClick={()=>setShowUp(true)} className="mt-3 px-4 py-2 rounded-lg text-sm font-bold text-white" style={{background:'#0F2044'}}>Add First Item</button></div>}
                    {filtered.map(item=>{
                        const fc=fileCol(item.file_type); const sel=selected.has(item.id);
                        return (
                            <div key={item.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group cursor-pointer ${sel?'border-blue-500 ring-2 ring-blue-200':'border-transparent hover:border-blue-100'}`} onClick={()=>setViewItem(item)}>
                                <div className="relative h-36 flex items-center justify-center" style={{background:`linear-gradient(135deg,${fc.bg},#fff)`}}>
                                    <div className="flex flex-col items-center gap-2" style={{color:fc.fg}}>{fileIco(item.file_type,38)}<span className="text-[9px] font-bold uppercase tracking-widest">{item.file_type}</span></div>
                                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${sel?'bg-blue-500 border-blue-500':'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'}`} onClick={e=>{e.stopPropagation();toggle(item.id);}}>{sel&&<FiCheck size={11} color="white"/>}</div>
                                    <div className="absolute top-2 right-2">{statusBadge(item.status)}</div>
                                    {item.competency_level&&<div className="absolute bottom-2 right-2">{compBadge(item.competency_level)}</div>}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">{item.title}</h3>
                                    {item.description&&<p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>}
                                    <div className="flex items-center gap-1 mb-1"><FiUser size={10} className="text-gray-400"/><span className="text-xs font-semibold text-gray-700">{item.student_name}</span>{item.form_name&&<span className="text-[10px] text-gray-400 ml-1">· {item.form_name}</span>}</div>
                                    {item.learning_area&&<div className="flex items-center gap-1 mb-2"><FiBook size={10} className="text-indigo-400"/><span className="text-[10px] text-indigo-600 font-medium">{item.learning_area}</span>{item.strand&&<span className="text-[10px] text-gray-400">· {item.strand}</span>}</div>}
                                    {item.tags&&item.tags.length>0&&<div className="flex flex-wrap gap-1 mb-2">{item.tags.slice(0,3).map(t=><span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px]">#{t}</span>)}</div>}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><FiCalendar size={9}/>{fmtDate(item.created_at)}</span>
                                        <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                                            {item.status!=='approved'&&<button onClick={()=>setStatus(item.id,'approved')} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Approve"><FiCheckCircle size={13}/></button>}
                                            {item.status!=='shared'&&<button onClick={()=>setStatus(item.id,'shared')} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors" title="Share"><FiShare2 size={13}/></button>}
                                            <button onClick={()=>del(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><FiTrash2 size={13}/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LIST */}
            {view==='list'&&(
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-1"/>
                        <div className="col-span-3">Student</div><div className="col-span-3">Title / Learning Area</div>
                        <div className="col-span-2">Strand</div><div className="col-span-1 text-center">Level</div>
                        <div className="col-span-1 text-center">Status</div><div className="col-span-1 text-right">Actions</div>
                    </div>
                    {filtered.length===0&&<div className="py-16 text-center text-gray-400 text-sm">No items found</div>}
                    {filtered.map((item,i)=>{const fc=fileCol(item.file_type); return(
                        <div key={item.id} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors ${i%2===0?'bg-white':'bg-gray-50/30'}`} onClick={()=>setViewItem(item)}>
                            <div className="col-span-1 flex items-center"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:fc.bg,color:fc.fg}}>{fileIco(item.file_type,14)}</div></div>
                            <div className="col-span-3 flex flex-col justify-center"><span className="text-sm font-bold text-gray-800">{item.student_name}</span><span className="text-xs text-blue-600">{item.form_name}</span></div>
                            <div className="col-span-3 flex flex-col justify-center"><span className="text-sm font-semibold text-gray-700 line-clamp-1">{item.title}</span><span className="text-xs text-indigo-500">{item.learning_area}</span></div>
                            <div className="col-span-2 flex flex-col justify-center"><span className="text-xs text-gray-600">{item.strand}</span><span className="text-[10px] text-gray-400">{item.sub_strand}</span></div>
                            <div className="col-span-1 flex items-center justify-center">{compBadge(item.competency_level)}</div>
                            <div className="col-span-1 flex items-center justify-center">{statusBadge(item.status)}</div>
                            <div className="col-span-1 flex items-center justify-end gap-1" onClick={e=>e.stopPropagation()}>
                                <button onClick={()=>setStatus(item.id,'approved')} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600" title="Approve"><FiCheckCircle size={12}/></button>
                                <button onClick={()=>setStatus(item.id,'shared')} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600" title="Share"><FiShare2 size={12}/></button>
                                <button onClick={()=>del(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Delete"><FiTrash2 size={12}/></button>
                            </div>
                        </div>
                    );})}
                </div>
            )}

            {/* TIMELINE */}
            {view==='timeline'&&(
                <div className="space-y-3">
                    {filtered.length===0&&<div className="py-16 text-center text-gray-400 bg-white rounded-2xl text-sm">No items</div>}
                    {filtered.map((item,i)=>{const fc=fileCol(item.file_type); return(
                        <div key={item.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0" style={{background:fc.bg,color:fc.fg}}>{fileIco(item.file_type,16)}</div>
                                {i<filtered.length-1&&<div className="w-0.5 flex-1 min-h-4 mt-2 bg-gradient-to-b from-gray-300 to-transparent"/>}
                            </div>
                            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-1 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all" onClick={()=>setViewItem(item)}>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1"><h3 className="font-bold text-gray-800 text-sm">{item.title}</h3>{compBadge(item.competency_level)}{statusBadge(item.status)}</div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><FiUser size={10}/><strong className="text-gray-700">{item.student_name}</strong> · {item.form_name}</span>
                                            <span className="flex items-center gap-1"><FiBook size={10}/>{item.learning_area}</span>
                                            {item.strand&&<span className="flex items-center gap-1"><FiLayers size={10}/>{item.strand}</span>}
                                        </div>
                                        {item.description&&<p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>}
                                        {item.tags&&item.tags.length>0&&<div className="flex flex-wrap gap-1 mt-2">{item.tags.map(t=><span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">#{t}</span>)}</div>}
                                    </div>
                                    <div className="flex items-center gap-2 sm:flex-col sm:items-end flex-shrink-0">
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><FiCalendar size={10}/>{fmtDate(item.created_at)}</span>
                                        <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                                            <button onClick={()=>setStatus(item.id,'approved')} className="px-2 py-1 rounded-lg hover:bg-green-50 text-xs text-gray-400 hover:text-green-600 flex items-center gap-1"><FiCheck size={11}/>Approve</button>
                                            <button onClick={()=>setStatus(item.id,'shared')} className="px-2 py-1 rounded-lg hover:bg-purple-50 text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1"><FiShare2 size={11}/>Share</button>
                                            <button onClick={()=>del(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><FiTrash2 size={12}/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );})}
                </div>
            )}

            {/* QUICK LINKS */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{href:'/dashboard/exams/sba-manager',label:'SBA Manager',icon:FiAward,color:'#F59E0B',desc:'Manage School Based Assessments'},
                  {href:'/dashboard/exams/cbc-marks',label:'CBC Mark Entry',icon:FiEdit2,color:'#6366F1',desc:'Enter strand competency marks'},
                  {href:'/dashboard/exams/cbc-report-cards',label:'CBC Report Cards',icon:FiFile,color:'#059669',desc:'Generate & print CBC cards'},
                  {href:'/dashboard/exams/cbc-reports',label:'CBC Reports Hub',icon:FiBarChart2,color:'#2563EB',desc:'20+ CBC analytics reports'},
                ].map(l=>(
                    <Link key={l.href} href={l.href} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{background:l.color+'18'}}><l.icon size={18} style={{color:l.color}}/></div>
                        <p className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{l.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                    </Link>
                ))}
            </div>

            {/* UPLOAD MODAL */}
            {showUp&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(245,158,11,0.2)'}}><FiUpload size={18} color="#F59E0B"/></div>
                                <div><h2 className="text-lg font-black text-white">Add Portfolio Evidence</h2><p className="text-blue-200 text-xs">Upload CBC learning evidence for assessment</p></div>
                            </div>
                            <button onClick={()=>{setShowUp(false);setForm(emptyForm);setFForm('');}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Form filter → Student */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Filter by Form / Grade</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={fForm} onChange={e=>setFForm(e.target.value)}>
                                        <option value="">All Forms ({students.length} students)</option>
                                        {forms.map((f:any)=><option key={f.id} value={String(f.id)}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Student <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}>
                                        <option value="">Select student…</option>
                                        {students.filter(s=>!fForm||String(s.form_id)===fForm).map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.admission_no?` (${s.admission_no})`:''}{s.form_name?` — ${s.form_name}`:''}</option>)}
                                    </select>
                                    {students.length===0&&<p className="text-xs text-red-500 mt-1">⚠ No students loaded — check DB connection</p>}
                                    {students.length>0&&<p className="text-[10px] text-gray-400 mt-1">{fForm?students.filter(s=>String(s.form_id)===fForm).length:students.length} students available</p>}
                                </div>
                            </div>
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Portfolio Title <span className="text-red-500">*</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Water Cycle Diagram, Fraction Pizza Activity…" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Teacher Observations / Description</label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} placeholder="Describe competencies demonstrated, teacher observations, what student did…" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
                            </div>
                            {/* Learning Area + Competency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Learning Area <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.learning_area} onChange={e=>setForm({...form,learning_area:e.target.value})}>
                                        <option value="">Select area…</option>
                                        {areas.map(a=><option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Competency Level</label>
                                    <div className="grid grid-cols-2 gap-1">
                                        {(Object.entries(COMP) as any[]).map(([k,v]:any)=>(
                                            <button key={k} onClick={()=>setForm({...form,competency_level:k})} className={`px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all`} style={form.competency_level===k?{background:v.bg,color:v.color,borderColor:v.color}:{color:v.color,background:'#F8FAFC',borderColor:'transparent'}}>{k} — {v.label.split(' ')[0]}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Strand + Sub-strand */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Strand</label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Numbers, Reading, Physical Environment" value={form.strand} onChange={e=>setForm({...form,strand:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Sub-Strand</label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Fractions, Creative Writing" value={form.sub_strand} onChange={e=>setForm({...form,sub_strand:e.target.value})}/>
                                </div>
                            </div>
                            {/* File type + Year */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Evidence Type</label>
                                    <div className="flex flex-wrap gap-1">
                                        {(['image','pdf','video','document','other'] as FileType[]).map(t=>{const fc=fileCol(t); return<button key={t} onClick={()=>setForm({...form,file_type:t})} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all" style={form.file_type===t?{background:fc.bg,color:fc.fg,borderColor:fc.fg}:{color:fc.fg,background:'#F8FAFC',borderColor:'transparent'}}>{fileIco(t,12)}{t}</button>;})}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Academic Year</label>
                                        <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})}>
                                            {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">File Reference</label>
                                        <input className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="photo_001.jpg or reference" value={form.file_name} onChange={e=>setForm({...form,file_name:e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Tags <span className="text-gray-400">(comma separated)</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="creative, science, practical, group-work, outdoor…" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/>
                            </div>
                            {/* Level preview */}
                            {form.competency_level&&(
                                <div className="rounded-xl p-3 flex items-center gap-3" style={{background:COMP[form.competency_level].bg}}>
                                    <FiAward size={20} style={{color:COMP[form.competency_level].color,flexShrink:0}}/>
                                    <div><p className="text-sm font-bold" style={{color:COMP[form.competency_level].color}}>{form.competency_level} — {COMP[form.competency_level].label}</p><p className="text-xs" style={{color:COMP[form.competency_level].color,opacity:0.8}}>{COMP[form.competency_level].desc}</p></div>
                                </div>
                            )}
                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                                    {saving?<><FiRefreshCw size={14} className="animate-spin"/>Saving…</>:<><FiCheck size={14}/>Save to Portfolio</>}
                                </button>
                                <button onClick={()=>{setShowUp(false);setForm(emptyForm);setFForm('');}} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEWER MODAL */}
            {viewItem&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:`linear-gradient(135deg,${fileCol(viewItem.file_type).bg},#fff)`}}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:fileCol(viewItem.file_type).bg,color:fileCol(viewItem.file_type).fg}}>{fileIco(viewItem.file_type,24)}</div>
                                <div><h2 className="font-black text-gray-800 text-base leading-tight">{viewItem.title}</h2><div className="flex items-center gap-2 mt-0.5">{statusBadge(viewItem.status)}{compBadge(viewItem.competency_level)}</div></div>
                            </div>
                            <button onClick={()=>setViewItem(null)} className="p-2 rounded-lg hover:bg-gray-100"><FiX size={18}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Student</p><p className="font-bold text-gray-800 text-sm">{viewItem.student_name}</p><p className="text-xs text-blue-600">{viewItem.form_name}</p></div>
                                <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Learning Area</p><p className="font-bold text-gray-800 text-sm">{viewItem.learning_area}</p><p className="text-xs text-indigo-600">{viewItem.strand}{viewItem.sub_strand?` › ${viewItem.sub_strand}`:''}</p></div>
                            </div>
                            {viewItem.description&&<div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Teacher Observations</p><div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-blue-100">{viewItem.description}</div></div>}
                            {viewItem.competency_level&&(
                                <div className="rounded-xl p-4 flex items-center gap-3" style={{background:COMP[viewItem.competency_level].bg}}>
                                    <FiAward size={28} style={{color:COMP[viewItem.competency_level].color}}/>
                                    <div><p className="font-black text-base" style={{color:COMP[viewItem.competency_level].color}}>{viewItem.competency_level} — {COMP[viewItem.competency_level].label}</p><p className="text-sm" style={{color:COMP[viewItem.competency_level].color,opacity:0.8}}>{COMP[viewItem.competency_level].desc}</p></div>
                                </div>
                            )}
                            {viewItem.tags&&viewItem.tags.length>0&&<div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Tags</p><div className="flex flex-wrap gap-1">{viewItem.tags.map(t=><span key={t} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">#{t}</span>)}</div></div>}
                            <div className="flex items-center justify-between pt-3 border-t">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><FiCalendar size={11}/>Added {fmtDate(viewItem.created_at)}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={()=>setStatus(viewItem.id,'approved')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100"><FiCheckCircle size={12}/>Approve</button>
                                    <button onClick={()=>setStatus(viewItem.id,'shared')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100"><FiShare2 size={12}/>Share</button>
                                    <button onClick={()=>{del(viewItem.id);setViewItem(null);}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100"><FiTrash2 size={12}/>Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
