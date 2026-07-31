'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiActivity, FiPlus, FiSearch, FiRefreshCw, FiX, FiSave, FiEdit2,
    FiTrash2, FiDownload, FiArrowRight, FiAlertCircle, FiCheckCircle,
    FiChevronDown, FiChevronUp, FiFilter, FiUsers, FiBook, FiCalendar,
    FiBarChart2, FiFileText, FiTarget, FiAward, FiClock, FiZap,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
interface Obs {
    id: string; student_id?: number; student_name: string; admission_no?: string;
    form_name: string; teacher_name: string; learning_area: string;
    strand?: string; sub_strand?: string; competency_level: CompLevel;
    observation_notes?: string; evidence_type?: string;
    observed_date: string; term: string; year: number; created_at: string;
}
interface Student { id: number; first_name: string; last_name: string; admission_no?: string; form_id?: number; }
interface Form { id: number; name: string; }

const COMP: Record<CompLevel, { label: string; color: string; bg: string; border: string }> = {
    EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
    ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
    BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};
const LEARNING_AREAS = ['Literacy Activities','Kiswahili','English','Mathematics Activities','Environmental Activities','Creative Arts','Physical Education','Pre-Technical Studies','Agriculture','Social Studies','Business Studies','ICT','Religious Education'];
const EVIDENCE_TYPES = ['Teacher Observation','Portfolio Sample','Oral Response','Practical Work','Written Work','Group Activity','Presentation','Field Work'];

const SQL = `CREATE TABLE IF NOT EXISTS school_cbc_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id bigint REFERENCES school_students(id) ON DELETE CASCADE,
  student_name text, admission_no text, form_name text,
  teacher_name text, learning_area text NOT NULL,
  strand text, sub_strand text,
  competency_level text DEFAULT 'ME',
  observation_notes text, evidence_type text,
  observed_date date DEFAULT now(),
  term text, year int DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_cbc_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_cbc_observations FOR ALL USING (true) WITH CHECK (true);`;

const DEMO: Obs[] = [
    { id:'d1', student_name:'Amina Otieno', admission_no:'ADM001', form_name:'Grade 7A', teacher_name:'Ms. Akinyi', learning_area:'Mathematics Activities', strand:'Numbers', sub_strand:'Fractions', competency_level:'EE', observation_notes:'Demonstrated excellent understanding of fractions using physical objects.', evidence_type:'Practical Work', observed_date:'2025-07-28', term:'Term 2', year:2025, created_at:new Date().toISOString() },
    { id:'d2', student_name:'Brian Mwangi', admission_no:'ADM002', form_name:'Grade 7A', teacher_name:'Ms. Akinyi', learning_area:'English', strand:'Reading', sub_strand:'Comprehension', competency_level:'ME', observation_notes:'Reads fluently and answers comprehension questions correctly.', evidence_type:'Written Work', observed_date:'2025-07-29', term:'Term 2', year:2025, created_at:new Date().toISOString() },
    { id:'d3', student_name:'Chloe Wanjiku', admission_no:'ADM003', form_name:'Grade 8B', teacher_name:'Mr. Kamau', learning_area:'Science', strand:'Living Things', sub_strand:'Plants', competency_level:'AE', observation_notes:'Needs more practice identifying plant parts.', evidence_type:'Teacher Observation', observed_date:'2025-07-30', term:'Term 2', year:2025, created_at:new Date().toISOString() },
    { id:'d4', student_name:'David Kipchoge', admission_no:'ADM004', form_name:'Grade 9A', teacher_name:'Mrs. Njeri', learning_area:'Agriculture', strand:'Crop Production', sub_strand:'Planting', competency_level:'BE', observation_notes:'Struggles to follow planting procedures. Requires one-on-one support.', evidence_type:'Field Work', observed_date:'2025-07-31', term:'Term 2', year:2025, created_at:new Date().toISOString() },
];

export default function FormativeDailyTrackerPage() {
    const [obs, setObs]           = useState<Obs[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [forms, setForms]       = useState<Form[]>([]);
    const [loading, setLoading]   = useState(true);
    const [dbReady, setDbReady]   = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editOb, setEditOb]     = useState<Obs | null>(null);
    const [saving, setSaving]     = useState(false);
    const [search, setSearch]     = useState('');
    const [fLevel, setFLevel]     = useState('');
    const [fArea, setFArea]       = useState('');
    const [fDate, setFDate]       = useState('');
    const [tab, setTab]           = useState<'log'|'analytics'>('log');

    const empty = { student_id:'', student_name:'', admission_no:'', form_name:'', teacher_name:'', learning_area:'', strand:'', sub_strand:'', competency_level:'ME' as CompLevel, observation_notes:'', evidence_type:'Teacher Observation', observed_date: new Date().toISOString().slice(0,10), term:'Term 2', year:2025 };
    const [form, setForm] = useState(empty);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [fR, sR] = await Promise.all([
                sb.from('school_forms').select('id,name').order('form_level'),
                sb.from('school_students').select('id,first_name,last_name,admission_no,form_id').order('first_name').limit(2000),
            ]);
            setForms(fR.data || []);
            setStudents(sR.data || []);
            const { error } = await sb.from('school_cbc_observations').select('id').limit(1);
            const ready = !error || error.code !== '42P01';
            setDbReady(ready);
            if (ready) {
                const { data } = await sb.from('school_cbc_observations').select('*').order('observed_date', { ascending: false }).limit(500);
                setObs(data || []);
            } else { setObs(DEMO); }
        } catch { setObs(DEMO); }
        setLoading(false);
    }

    const filtered = useMemo(() => obs.filter(o =>
        (!search || `${o.student_name} ${o.learning_area} ${o.teacher_name} ${o.form_name}`.toLowerCase().includes(search.toLowerCase()))
        && (!fLevel || o.competency_level === fLevel)
        && (!fArea  || o.learning_area === fArea)
        && (!fDate  || o.observed_date === fDate)
    ), [obs, search, fLevel, fArea, fDate]);

    const stats = useMemo(() => ({
        total: obs.length,
        today: obs.filter(o => o.observed_date === new Date().toISOString().slice(0,10)).length,
        students: new Set(obs.map(o => o.student_name)).size,
        EE: obs.filter(o => o.competency_level === 'EE').length,
        BE: obs.filter(o => o.competency_level === 'BE').length,
        areas: new Set(obs.map(o => o.learning_area)).size,
    }), [obs]);

    const analytics = useMemo(() => {
        const byLevel = { EE:0, ME:0, AE:0, BE:0 };
        obs.forEach(o => byLevel[o.competency_level]++);
        const byArea: Record<string,{EE:number;ME:number;AE:number;BE:number;total:number}> = {};
        obs.forEach(o => {
            if (!byArea[o.learning_area]) byArea[o.learning_area] = {EE:0,ME:0,AE:0,BE:0,total:0};
            byArea[o.learning_area][o.competency_level]++;
            byArea[o.learning_area].total++;
        });
        return { byLevel, byArea };
    }, [obs]);

    async function save() {
        if (!form.student_name || !form.learning_area || !form.teacher_name) { toast.error('Student name, learning area, and teacher are required'); return; }
        setSaving(true);
        try {
            const payload: any = { student_name: form.student_name, admission_no: form.admission_no, form_name: form.form_name, teacher_name: form.teacher_name, learning_area: form.learning_area, strand: form.strand || null, sub_strand: form.sub_strand || null, competency_level: form.competency_level, observation_notes: form.observation_notes || null, evidence_type: form.evidence_type || null, observed_date: form.observed_date, term: form.term, year: form.year };
            if (form.student_id) payload.student_id = Number(form.student_id);
            if (editOb) {
                if (dbReady) { const { error } = await sb.from('school_cbc_observations').update(payload).eq('id', editOb.id); if (error) throw error; }
                setObs(p => p.map(o => o.id === editOb.id ? { ...o, ...payload } : o));
                toast.success('Observation updated!');
            } else {
                if (dbReady) { const { data, error } = await sb.from('school_cbc_observations').insert(payload).select().single(); if (error) throw error; setObs(p => [data, ...p]); }
                else { setObs(p => [{ ...payload, id: `demo-${Date.now()}`, created_at: new Date().toISOString() }, ...p]); }
                toast.success('✅ Observation recorded!');
            }
            setShowModal(false); setEditOb(null); setForm(empty);
        } catch (e: any) { toast.error(e.message || 'Save failed'); }
        setSaving(false);
    }

    async function del(id: string) {
        if (!confirm('Delete this observation?')) return;
        if (dbReady) await sb.from('school_cbc_observations').delete().eq('id', id);
        setObs(p => p.filter(o => o.id !== id));
        toast.success('Deleted');
    }

    function exportCSV() {
        const rows = [['Date','Student','Adm No','Form','Teacher','Learning Area','Strand','Level','Evidence','Notes']];
        filtered.forEach(o => rows.push([o.observed_date, o.student_name, o.admission_no||'', o.form_name, o.teacher_name, o.learning_area, o.strand||'', o.competency_level, o.evidence_type||'', o.observation_notes||'']));
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = 'CBC_Formative_Log.csv'; a.click();
        toast.success('CSV exported!');
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiActivity size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading Formative Tracker…</p>
                <p className="text-sm text-gray-500 mt-1">CBC Daily Observation System</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HEADER (SBA Manager style) ── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/exams" className="hover:text-white">Exams</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">🔥 Formative Daily Tracker</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#DC2626,#F59E0B)'}}>
                                <FiActivity size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">Formative Daily Tracker</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CBC 2024</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400 text-green-900">KICD ALIGNED</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">Continuous Assessment · Observe · Record · Track every learner every day</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward},{href:'/dashboard/exams/cbc-reports',l:'CBC Reports',ic:FiBarChart2},{href:'/dashboard/exams/cbc-report-cards',l:'Report Cards',ic:FiFileText}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><FiDownload size={12}/>Export CSV</button>
                            <button onClick={() => { setForm(empty); setEditOb(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                <FiPlus size={15}/>Record Observation
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        {[['Levels','EE · ME · AE · BE'],['Focus','Continuous Formative Assessment'],['Framework','KICD CBC Curriculum'],['Data','Real-time class monitoring']].map(([k,v])=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}>
                                <span className="text-amber-400 font-bold">{k}:</span><span className="text-blue-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-white/10">
                    {[{l:'Total Obs.',v:stats.total,ic:FiActivity,c:'#F59E0B'},{l:'Today',v:stats.today,ic:FiCalendar,c:'#34D399'},{l:'Students',v:stats.students,ic:FiUsers,c:'#60A5FA'},{l:'EE Achieved',v:stats.EE,ic:FiAward,c:'#A78BFA'},{l:'Need Support',v:stats.BE,ic:FiAlertCircle,c:'#F87171'},{l:'Learning Areas',v:stats.areas,ic:FiBook,c:'#F472B6'}].map((s,i)=>(
                        <div key={i} className="px-4 py-3 flex items-center gap-3 border-r border-white/10 last:border-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.c+'22'}}><s.ic size={14} style={{color:s.c}}/></div>
                            <div><div className="text-xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-blue-300">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DB setup banner (collapsible) */}
            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — <code className="text-xs bg-amber-100 px-1 rounded">school_cbc_observations</code> table not yet created</p>
                        <p className="text-xs text-amber-700 mt-1">Run the SQL below in your Supabase SQL Editor to enable live data saving.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['log','📋 Observation Log',FiActivity],['analytics','📊 Analytics',FiBarChart2]] as const).map(([k,l,Ic])=>(
                    <button key={k} onClick={()=>setTab(k as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===k?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={13}/>{l}
                    </button>
                ))}
            </div>

            {/* ── OBSERVATION LOG ── */}
            {tab==='log' && (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1">
                                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Search student, teacher, learning area…" value={search} onChange={e=>setSearch(e.target.value)}/>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fLevel} onChange={e=>setFLevel(e.target.value)}>
                                    <option value="">All Levels</option>
                                    {(['EE','ME','AE','BE'] as CompLevel[]).map(l=><option key={l} value={l}>{l} — {COMP[l].label}</option>)}
                                </select>
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fArea} onChange={e=>setFArea(e.target.value)}>
                                    <option value="">All Learning Areas</option>
                                    {LEARNING_AREAS.map(a=><option key={a}>{a}</option>)}
                                </select>
                                <input type="date" className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fDate} onChange={e=>setFDate(e.target.value)}/>
                                <button onClick={()=>{setSearch('');setFLevel('');setFArea('');setFDate('');}} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1"><FiRefreshCw size={11}/>Clear</button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} observation{filtered.length!==1?'s':''} · {students.length} students loaded{!dbReady?' · Demo Mode':''}</p>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}} className="text-white">
                                        {['Date','Student','Form','Teacher','Learning Area','Strand','Level','Evidence','Notes',''].map(h=>(
                                            <th key={h} className="text-left px-3 py-3 text-xs font-semibold whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length===0?(
                                        <tr><td colSpan={10} className="text-center py-20 text-gray-400">
                                            <FiActivity size={40} className="mx-auto mb-3 opacity-30"/>
                                            <p className="font-semibold">No observations yet</p>
                                            <p className="text-xs mt-1">Click "Record Observation" to start tracking</p>
                                            <button onClick={()=>setShowModal(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}><FiPlus size={14}/>Record First Observation</button>
                                        </td></tr>
                                    ):filtered.map((o,i)=>{
                                        const c=COMP[o.competency_level];
                                        return (
                                            <tr key={o.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                                                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">{o.observed_date}</td>
                                                <td className="px-3 py-3">
                                                    <p className="text-xs font-bold text-gray-900">{o.student_name}</p>
                                                    {o.admission_no&&<p className="text-[10px] text-blue-600 font-mono">{o.admission_no}</p>}
                                                </td>
                                                <td className="px-3 py-3 text-xs text-gray-600">{o.form_name}</td>
                                                <td className="px-3 py-3 text-xs text-gray-700">{o.teacher_name}</td>
                                                <td className="px-3 py-3 text-xs font-medium text-gray-800">{o.learning_area}</td>
                                                <td className="px-3 py-3 text-[10px] text-gray-500">{o.strand||'—'}{o.sub_strand?<><br/><span className="text-gray-400">{o.sub_strand}</span></>:null}</td>
                                                <td className="px-3 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border" style={{background:c.bg,color:c.color,borderColor:c.border}}>
                                                        <FiAward size={9}/>{o.competency_level}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-[10px] text-gray-500">{o.evidence_type||'—'}</td>
                                                <td className="px-3 py-3 text-[10px] text-gray-500 max-w-[180px]"><span className="line-clamp-2">{o.observation_notes||'—'}</span></td>
                                                <td className="px-3 py-3">
                                                    <div className="flex gap-1">
                                                        <button onClick={()=>{setEditOb(o);setForm({student_id:String(o.student_id||''),student_name:o.student_name,admission_no:o.admission_no||'',form_name:o.form_name,teacher_name:o.teacher_name,learning_area:o.learning_area,strand:o.strand||'',sub_strand:o.sub_strand||'',competency_level:o.competency_level,observation_notes:o.observation_notes||'',evidence_type:o.evidence_type||'',observed_date:o.observed_date,term:o.term,year:o.year});setShowModal(true);}} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><FiEdit2 size={12}/></button>
                                                        <button onClick={()=>del(o.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={12}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── ANALYTICS ── */}
            {tab==='analytics' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 className="text-indigo-600"/>Competency Level Distribution</h2>
                        {(['EE','ME','AE','BE'] as CompLevel[]).map(l=>{
                            const cnt=analytics.byLevel[l]; const pct=obs.length?Math.round(cnt/obs.length*100):0; const c=COMP[l];
                            return (
                                <div key={l} className="mb-4">
                                    <div className="flex justify-between text-xs mb-1"><span className="font-bold" style={{color:c.color}}>{l} — {c.label}</span><span className="font-bold text-gray-700">{cnt} ({pct}%)</span></div>
                                    <div className="bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full transition-all duration-700" style={{width:`${pct}%`,background:c.color}}/></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiBook className="text-emerald-600"/>Performance by Learning Area</h2>
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                            {Object.entries(analytics.byArea).sort((a,b)=>b[1].total-a[1].total).map(([area,d])=>{
                                const eeP=d.total?Math.round(d.EE/d.total*100):0;
                                return (
                                    <div key={area} className="p-3 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-800 truncate">{area}</span>
                                            <span className="text-[10px] text-gray-400">{d.total} obs</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {(['EE','ME','AE','BE'] as CompLevel[]).map(l=>(
                                                <div key={l} className="flex-1 text-center">
                                                    <div className="text-xs font-black" style={{color:COMP[l].color}}>{d[l]}</div>
                                                    <div className="text-[9px] text-gray-400">{l}</div>
                                                </div>
                                            ))}
                                            <div className="flex-1 text-center border-l border-gray-200 pl-1">
                                                <div className="text-xs font-black text-emerald-600">{eeP}%</div>
                                                <div className="text-[9px] text-gray-400">EE Rate</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(analytics.byArea).length===0&&<p className="text-center text-gray-400 text-sm py-8">No data yet. Record observations to see analytics.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-black text-gray-900 flex items-center gap-2"><FiActivity className="text-amber-500"/>{editOb?'Edit':'Record'} Observation</h2>
                            <button onClick={()=>{setShowModal(false);setEditOb(null);setForm(empty);}} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-3">
                            {/* Student picker */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Student *</label>
                                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                                    onChange={e=>{const st=students.find(s=>String(s.id)===e.target.value);if(st)setForm(p=>({...p,student_id:String(st.id),student_name:`${st.first_name} ${st.last_name}`,admission_no:st.admission_no||'',form_name:(forms.find(f=>f.id===st.form_id)?.name)||''}));}}>
                                    <option value="">— Select Student —</option>
                                    {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no||'—'})</option>)}
                                </select>
                                {!students.length&&<input value={form.student_name} onChange={e=>setForm(p=>({...p,student_name:e.target.value}))} placeholder="Or type student name" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"/>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Form / Grade</label><input value={form.form_name} onChange={e=>setForm(p=>({...p,form_name:e.target.value}))} placeholder="e.g. Grade 7A" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Teacher Name *</label><input value={form.teacher_name} onChange={e=>setForm(p=>({...p,teacher_name:e.target.value}))} placeholder="e.g. Ms. Akinyi" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"/></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Learning Area *</label>
                                <select value={form.learning_area} onChange={e=>setForm(p=>({...p,learning_area:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                                    <option value="">— Select Learning Area —</option>
                                    {LEARNING_AREAS.map(a=><option key={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Strand</label><input value={form.strand} onChange={e=>setForm(p=>({...p,strand:e.target.value}))} placeholder="e.g. Numbers" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Sub-Strand</label><input value={form.sub_strand} onChange={e=>setForm(p=>({...p,sub_strand:e.target.value}))} placeholder="e.g. Fractions" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"/></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-2">Competency Level *</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['EE','ME','AE','BE'] as CompLevel[]).map(l=>{const c=COMP[l];return(
                                        <button key={l} type="button" onClick={()=>setForm(p=>({...p,competency_level:l}))} className={`py-3 rounded-xl border-2 text-center transition-all ${form.competency_level===l?'shadow-md scale-105':''}`} style={form.competency_level===l?{background:c.bg,borderColor:c.color,color:c.color}:{borderColor:'#E5E7EB',color:'#6B7280'}}>
                                            <div className="text-base font-black">{l}</div>
                                            <div className="text-[9px] leading-tight mt-0.5">{c.label.split(' ')[0]}</div>
                                        </button>
                                    );})}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Date *</label><input type="date" value={form.observed_date} onChange={e=>setForm(p=>({...p,observed_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Evidence Type</label>
                                    <select value={form.evidence_type} onChange={e=>setForm(p=>({...p,evidence_type:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                                        {EVIDENCE_TYPES.map(e=><option key={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Observation Notes</label>
                                <textarea value={form.observation_notes} onChange={e=>setForm(p=>({...p,observation_notes:e.target.value}))} rows={3} placeholder="Describe what you observed — specific skills demonstrated, areas for growth, evidence of learning…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Term</label>
                                    <select value={form.term} onChange={e=>setForm(p=>({...p,term:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                                        <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Year</label>
                                    <select value={form.year} onChange={e=>setForm(p=>({...p,year:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                                        {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={()=>{setShowModal(false);setEditOb(null);setForm(empty);}} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 font-semibold">Cancel</button>
                            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editOb?'Update Observation':'Save Observation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
