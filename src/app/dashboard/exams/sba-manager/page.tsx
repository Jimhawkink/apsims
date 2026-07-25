'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiAward, FiPlus, FiSearch, FiFilter, FiGrid, FiList, FiBarChart2,
    FiUsers, FiBook, FiLayers, FiCheckCircle, FiClock, FiAlertCircle,
    FiX, FiCheck, FiEdit2, FiTrash2, FiDownload, FiUpload, FiShield,
    FiTrendingUp, FiRefreshCw, FiArrowRight, FiCalendar, FiFileText,
    FiStar, FiZap, FiTarget, FiActivity, FiPieChart, FiUser,
    FiChevronDown, FiChevronUp, FiSend, FiEye, FiFolder,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ── Types ─────────────────────────────────────────────────────────────────────
type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type TaskStatus = 'draft' | 'active' | 'closed' | 'submitted_knec';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface SBATask {
    id: string; title: string; description?: string;
    form_id: number; form_name?: string; subject_id?: number; subject_name?: string;
    term_id?: number; term_name?: string; year: number;
    learning_area: string; strand?: string; sub_strand?: string;
    task_type: string; max_score: number; due_date?: string;
    status: TaskStatus; hod_approval: ApprovalStatus;
    created_by?: string; created_at: string;
    scores?: SBAScore[];
}

interface SBAScore {
    id: string; task_id: string; student_id: number;
    student_name?: string; admission_no?: string;
    score?: number; competency_level?: CompLevel;
    evidence_url?: string; teacher_notes?: string;
    submitted_at?: string; status: 'pending' | 'scored' | 'approved';
}

interface Student { id: number; first_name: string; last_name: string; admission_no?: string; form_id?: number; }
interface Form { id: number; name: string; form_level?: number; }
interface Subject { id: number; subject_name: string; }
interface Term { id: number; term_name?: string; year?: number; }

// ── Constants ─────────────────────────────────────────────────────────────────
const COMP: Record<CompLevel, { label: string; color: string; bg: string; short: string; score: number }> = {
    EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', short: 'EE', score: 4 },
    ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', short: 'ME', score: 3 },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', short: 'AE', score: 2 },
    BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', short: 'BE', score: 1 },
};

const TASK_TYPES = ['Project Work', 'Portfolio Task', 'Observation', 'Practical Activity', 'Written Task', 'Oral Assessment', 'Group Work', 'Field Activity', 'Research Task', 'Performance Task'];

const LEARNING_AREAS = [
    'Literacy Activities','Kiswahili','English','Mathematics Activities',
    'Environmental Activities','Hygiene & Nutrition','Religious Education',
    'Creative Arts','Physical Education','Pre-Technical Studies',
    'Agriculture','Social Studies','Business Studies','ICT',
];

const DEMO_TASKS: SBATask[] = [
    { id:'t1', title:'Water Cycle Project — Term 1', description:'Students to create a 3D model or diagram of the water cycle with labels in both English and Kiswahili.', form_id:1, form_name:'Grade 7', subject_name:'Environmental Activities', term_name:'Term 1', year:2025, learning_area:'Environmental Activities', strand:'Physical Environment', sub_strand:'Water Bodies', task_type:'Project Work', max_score:4, due_date:'2025-03-28', status:'active', hod_approval:'approved', created_at:'2025-01-15T08:00:00Z' },
    { id:'t2', title:'Fraction Manipulation — Practical', description:'Students demonstrate understanding of fractions using physical materials (paper, clay, food items) and explain their reasoning.', form_id:2, form_name:'Grade 8', subject_name:'Mathematics Activities', term_name:'Term 1', year:2025, learning_area:'Mathematics Activities', strand:'Numbers', sub_strand:'Fractions', task_type:'Practical Activity', max_score:4, due_date:'2025-03-15', status:'closed', hod_approval:'approved', created_at:'2025-01-20T09:00:00Z' },
    { id:'t3', title:'Creative Poetry Composition', description:'Each student composes an original poem (min 3 stanzas) on an environmental theme and presents to class.', form_id:1, form_name:'Grade 7', subject_name:'Literacy Activities', term_name:'Term 2', year:2025, learning_area:'Literacy Activities', strand:'Writing', sub_strand:'Creative Writing', task_type:'Performance Task', max_score:4, due_date:'2025-06-10', status:'active', hod_approval:'pending', created_at:'2025-04-01T10:00:00Z' },
    { id:'t4', title:'School Garden Project', description:'Learners plan, plant and maintain a kitchen garden over 4 weeks documenting progress in a journal.', form_id:3, form_name:'Grade 9', subject_name:'Agriculture', term_name:'Term 2', year:2025, learning_area:'Agriculture', strand:'Crop Production', sub_strand:'Kitchen Garden', task_type:'Field Activity', max_score:4, due_date:'2025-06-30', status:'draft', hod_approval:'pending', created_at:'2025-05-01T11:00:00Z' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const compBadge = (l?: CompLevel) => {
    if (!l) return <span className="text-[10px] text-gray-400">—</span>;
    const c = COMP[l];
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.color }}><FiAward size={9}/>{l}</span>;
};

const taskStatusBadge = (s: TaskStatus) => {
    const m = { draft: { l: 'Draft', bg: '#F1F5F9', fg: '#64748B' }, active: { l: 'Active', bg: '#D1FAE5', fg: '#059669' }, closed: { l: 'Closed', bg: '#DBEAFE', fg: '#2563EB' }, submitted_knec: { l: 'KNEC Submitted', bg: '#EDE9FE', fg: '#7C3AED' } }[s];
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: m.bg, color: m.fg }}>{m.l}</span>;
};

const hodBadge = (s: ApprovalStatus) => {
    const m = { pending: { l: 'HOD: Pending', bg: '#FEF3C7', fg: '#D97706' }, approved: { l: 'HOD: Approved', bg: '#D1FAE5', fg: '#059669' }, rejected: { l: 'HOD: Rejected', bg: '#FEE2E2', fg: '#DC2626' } }[s];
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: m.bg, color: m.fg }}>{m.l}</span>;
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const SQL_TASKS = `-- Run in Supabase SQL Editor
CREATE TABLE school_sba_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text,
  form_id bigint, subject_id bigint, term_id bigint,
  year int DEFAULT EXTRACT(YEAR FROM NOW()),
  learning_area text, strand text, sub_strand text,
  task_type text DEFAULT 'Project Work',
  max_score int DEFAULT 4,
  due_date date, status text DEFAULT 'draft',
  hod_approval text DEFAULT 'pending',
  created_by text, created_at timestamptz DEFAULT now()
);
CREATE TABLE school_sba_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES school_sba_tasks(id) ON DELETE CASCADE,
  student_id bigint REFERENCES school_students(id) ON DELETE CASCADE,
  score int, competency_level text,
  evidence_url text, teacher_notes text,
  submitted_at timestamptz, status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, student_id)
);
ALTER TABLE school_sba_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_sba_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_sba_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_sba_scores FOR ALL USING (true) WITH CHECK (true);`;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function SBAManagerPage() {
    const [tasks, setTasks]         = useState<SBATask[]>([]);
    const [forms, setForms]         = useState<Form[]>([]);
    const [subjects, setSubjects]   = useState<Subject[]>([]);
    const [terms, setTerms]         = useState<Term[]>([]);
    const [students, setStudents]   = useState<Student[]>([]);
    const [loading, setLoading]     = useState(true);
    const [dbReady, setDbReady]     = useState(false);
    const [view, setView]           = useState<'tasks' | 'scoring' | 'analytics'>('tasks');
    const [search, setSearch]       = useState('');
    const [fForm, setFForm]         = useState('');
    const [fStatus, setFStatus]     = useState('');
    const [fArea, setFArea]         = useState('');
    const [fYear, setFYear]         = useState(String(new Date().getFullYear()));
    const [showCreate, setShowCreate] = useState(false);
    const [selectedTask, setSelectedTask] = useState<SBATask | null>(null);
    const [scores, setScores]       = useState<Record<string, SBAScore[]>>({});
    const [savingTask, setSavingTask] = useState(false);
    const [savingScores, setSavingScores] = useState(false);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);

    const emptyTask = { title:'', description:'', form_id:'', subject_id:'', term_id:'', year: new Date().getFullYear(), learning_area:'', strand:'', sub_strand:'', task_type:'Project Work', max_score:4, due_date:'', status:'draft' as TaskStatus };
    const [taskForm, setTaskForm] = useState(emptyTask);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            // Load lookups
            const [fmsR, subR, trmR] = await Promise.all([
                sb.from('school_forms').select('id,name,form_level').order('form_level'),
                sb.from('school_subjects').select('id,subject_name').order('subject_name'),
                sb.from('school_terms').select('id,term_name,year').order('id', { ascending: false }),
            ]);
            const fmsData = fmsR.data || []; setForms(fmsData);
            setSubjects(subR.data || []);
            setTerms(trmR.data || []);
            const fmMap: Record<number,string> = {};
            fmsData.forEach((f:any) => { fmMap[f.id] = f.name; });

            // Load students
            const { data: s1 } = await sb.from('school_students').select('id,first_name,last_name,admission_no,form_id').eq('status','Active').order('first_name').limit(1000);
            const { data: s2 } = !s1?.length ? await sb.from('school_students').select('id,first_name,last_name,admission_no,form_id').order('first_name').limit(1000) : { data: null };
            setStudents(s1?.length ? s1 : (s2 || []));

            // Check SBA tables
            const { error: tErr } = await sb.from('school_sba_tasks').select('id').limit(1);
            const ready = !tErr || tErr.code !== '42P01';
            setDbReady(ready);

            if (ready) {
                const { data: rows } = await sb.from('school_sba_tasks').select('*').order('created_at', { ascending: false });
                if (rows) {
                    const enriched = rows.map((r:any) => ({
                        ...r, form_name: fmMap[r.form_id] || '—',
                        subject_name: (subR.data||[]).find((s:any)=>s.id===r.subject_id)?.subject_name || '',
                        term_name: (trmR.data||[]).find((t:any)=>t.id===r.term_id)?.term_name || '',
                    }));
                    setTasks(enriched);
                }
            } else {
                setTasks(DEMO_TASKS);
            }
        } catch(e) { console.error(e); setTasks(DEMO_TASKS); }
        setLoading(false);
    }

    const filtered = useMemo(() => tasks.filter(t =>
        (!search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.form_name||'').toLowerCase().includes(search.toLowerCase()) || (t.learning_area||'').toLowerCase().includes(search.toLowerCase()))
        && (!fForm   || String(t.form_id) === fForm)
        && (!fStatus || t.status === fStatus)
        && (!fArea   || t.learning_area === fArea)
        && (!fYear   || String(t.year) === fYear)
    ), [tasks, search, fForm, fStatus, fArea, fYear]);

    // Stats
    const stats = useMemo(() => ({
        total: tasks.length,
        active: tasks.filter(t=>t.status==='active').length,
        pending_hod: tasks.filter(t=>t.hod_approval==='pending').length,
        approved: tasks.filter(t=>t.hod_approval==='approved').length,
        forms: new Set(tasks.map(t=>t.form_id)).size,
        areas: new Set(tasks.map(t=>t.learning_area)).size,
    }), [tasks]);

    // Score distribution for analytics
    const scoreAnalytics = useMemo(() => {
        const all = Object.values(scores).flat();
        const dist = { EE:0, ME:0, AE:0, BE:0, unscored:0 };
        all.forEach(s => { if(s.competency_level) dist[s.competency_level]++; else dist.unscored++; });
        return dist;
    }, [scores]);

    async function saveTask() {
        if (!taskForm.title || !taskForm.form_id || !taskForm.learning_area) { toast.error('Fill required fields: Title, Form, Learning Area'); return; }
        setSavingTask(true);
        try {
            const payload = { title:taskForm.title, description:taskForm.description, form_id:Number(taskForm.form_id), subject_id:taskForm.subject_id?Number(taskForm.subject_id):null, term_id:taskForm.term_id?Number(taskForm.term_id):null, year:taskForm.year, learning_area:taskForm.learning_area, strand:taskForm.strand, sub_strand:taskForm.sub_strand, task_type:taskForm.task_type, max_score:taskForm.max_score, due_date:taskForm.due_date||null, status:taskForm.status, hod_approval:'pending' };
            if (dbReady) {
                const { error } = await sb.from('school_sba_tasks').insert(payload);
                if (error) throw error;
                toast.success('✅ SBA Task created! Pending HOD approval.'); setShowCreate(false); setTaskForm(emptyTask); load();
            } else {
                const fm = forms.find(f=>f.id===Number(taskForm.form_id));
                const sub = subjects.find(s=>s.id===Number(taskForm.subject_id));
                const trm = terms.find(t=>t.id===Number(taskForm.term_id));
                const newTask: SBATask = { id:`demo-${Date.now()}`, ...payload, form_id:Number(taskForm.form_id), form_name:fm?.name||'—', subject_name:sub?.subject_name||'', term_name:trm?.term_name||'', hod_approval:'pending', created_at:new Date().toISOString() };
                setTasks(p=>[newTask,...p]); toast.success('✅ Task created (demo mode)!'); setShowCreate(false); setTaskForm(emptyTask);
            }
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSavingTask(false);
    }

    async function approveTask(id:string, approval: ApprovalStatus) {
        if (dbReady) await sb.from('school_sba_tasks').update({ hod_approval: approval }).eq('id', id);
        setTasks(p=>p.map(t=>t.id===id?{...t,hod_approval:approval}:t));
        toast.success(`Task ${approval}!`);
    }

    async function deleteTask(id:string) {
        if (!confirm('Delete this SBA task and all its scores?')) return;
        if (dbReady) await sb.from('school_sba_tasks').delete().eq('id', id);
        setTasks(p=>p.filter(t=>t.id!==id));
        if (selectedTask?.id===id) setSelectedTask(null);
        toast.success('Task deleted');
    }

    async function loadScores(taskId:string) {
        if (scores[taskId]) return; // already loaded
        if (!dbReady) { setScores(p=>({...p,[taskId]:[]})); return; }
        const { data } = await sb.from('school_sba_scores').select('*').eq('task_id', taskId);
        setScores(p=>({...p,[taskId]:data||[]}));
    }

    async function openScoring(task:SBATask) {
        setSelectedTask(task);
        setView('scoring');
        await loadScores(task.id);
    }

    async function saveScore(taskId:string, studentId:number, level:CompLevel, notes='') {
        const score = COMP[level].score;
        if (dbReady) {
            await sb.from('school_sba_scores').upsert({ task_id:taskId, student_id:studentId, score, competency_level:level, teacher_notes:notes, status:'scored', submitted_at:new Date().toISOString() }, { onConflict:'task_id,student_id' });
        }
        setScores(p => {
            const prev = p[taskId] || [];
            const existing = prev.findIndex(s=>s.student_id===studentId);
            const entry: SBAScore = { id:`s-${studentId}`, task_id:taskId, student_id:studentId, score, competency_level:level, teacher_notes:notes, status:'scored', submitted_at:new Date().toISOString() };
            const next = existing>=0 ? prev.map((s,i)=>i===existing?entry:s) : [...prev, entry];
            return {...p,[taskId]:next};
        });
    }

    function exportCSV(task:SBATask) {
        const taskScores = scores[task.id] || [];
        const taskStudents = students.filter(s=>s.form_id===task.form_id);
        const rows = [['Adm No','Student Name','Score','Competency Level','Teacher Notes','Submitted At']];
        taskStudents.forEach(st => {
            const sc = taskScores.find(s=>s.student_id===st.id);
            rows.push([st.admission_no||'', `${st.first_name} ${st.last_name}`, String(sc?.score||''), sc?.competency_level||'', sc?.teacher_notes||'', sc?.submitted_at||'']);
        });
        const csv = rows.map(r=>r.join(',')).join('\n');
        const blob = new Blob([csv], {type:'text/csv'});
        const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`SBA_${task.title.replace(/\s+/g,'_')}.csv`; a.click();
        toast.success('CSV exported!');
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiAward size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading SBA Manager...</p>
                <p className="text-sm text-gray-500 mt-1">School Based Assessment System — Kenya CBC</p>
            </div>
        </div>
    );

    const taskStudents = selectedTask ? students.filter(s=>s.form_id===selectedTask.form_id) : [];
    const taskScores   = selectedTask ? (scores[selectedTask.id]||[]) : [];
    const scored       = taskScores.filter(s=>s.competency_level).length;
    const completion   = taskStudents.length>0 ? Math.round(scored/taskStudents.length*100) : 0;

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HERO ───────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/cbc/portfolio" className="hover:text-white">CBC Hub</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">📋 SBA Manager</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                <FiAward size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">SBA Manager</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400 text-green-900">KNEC ALIGNED</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CBC 2024</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">School Based Assessment · Task Management · HOD Approval · KNEC Export</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/cbc/portfolio',l:'Portfolio',ic:FiFolder},{href:'/dashboard/exams/cbc-marks',l:'CBC Marks',ic:FiFileText},{href:'/dashboard/exams/cbc-reports/sba-audit',l:'SBA Audit',ic:FiShield},{href:'/dashboard/exams/cbc-report-cards',l:'Report Cards',ic:FiFileText}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                <FiPlus size={15}/> Create SBA Task
                            </button>
                        </div>
                    </div>
                    {/* CBC SBA info strip */}
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        {[['SBA Weight','40% of final grade'],['Assessment Levels','EE · ME · AE · BE'],['Process','Create → HOD Approve → Score → Export KNEC'],['Authority','KICD / KNEC Kenya']].map(([k,v])=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}>
                                <span className="text-amber-400 font-bold">{k}:</span><span className="text-blue-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* KPI bar */}
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-white/10">
                    {[{l:'Total Tasks',v:stats.total,ic:FiFileText,c:'#F59E0B'},{l:'Active Tasks',v:stats.active,ic:FiActivity,c:'#34D399'},{l:'HOD Pending',v:stats.pending_hod,ic:FiClock,c:'#FCD34D'},{l:'HOD Approved',v:stats.approved,ic:FiCheckCircle,c:'#60A5FA'},{l:'Forms Covered',v:stats.forms,ic:FiUsers,c:'#A78BFA'},{l:'Learning Areas',v:stats.areas,ic:FiBook,c:'#F472B6'}].map((s,i)=>(
                        <div key={i} className="px-4 py-3 flex items-center gap-3 border-r border-white/10 last:border-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.c+'22'}}><s.ic size={14} style={{color:s.c}}/></div>
                            <div><div className="text-xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-blue-300">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DB SETUP */}
            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — SBA tables not yet created</p>
                        <p className="text-sm text-amber-700 mt-1">Tables <code className="bg-amber-100 px-1 rounded text-xs">school_sba_tasks</code> and <code className="bg-amber-100 px-1 rounded text-xs">school_sba_scores</code> not found.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL_TASKS}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/> Retry</button>
                </div>
            )}

            {/* ── VIEW TABS ───────────────────────────────────────────── */}
            <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['tasks','📋 SBA Tasks',FiFileText],['scoring','🎯 Score Entry',FiTarget],['analytics','📊 Analytics',FiBarChart2]] as const).map(([key,lbl,Ic])=>(
                    <button key={key} onClick={()=>setView(key as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view===key?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={view===key?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={13}/>{lbl}
                    </button>
                ))}
            </div>

            {/* ══════════════════ TASKS VIEW ══════════════════════════ */}
            {view==='tasks' && (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1">
                                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Search task title, form, learning area…" value={search} onChange={e=>setSearch(e.target.value)}/>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fForm} onChange={e=>setFForm(e.target.value)}>
                                    <option value="">All Forms</option>
                                    {forms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
                                    <option value="">All Statuses</option>
                                    {['draft','active','closed','submitted_knec'].map(s=><option key={s} value={s}>{s.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}</option>)}
                                </select>
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fArea} onChange={e=>setFArea(e.target.value)}>
                                    <option value="">All Learning Areas</option>
                                    {LEARNING_AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                                </select>
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" value={fYear} onChange={e=>setFYear(e.target.value)}>
                                    {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} task{filtered.length!==1?'s':''} found · {students.length} students loaded</p>
                    </div>

                    {/* Task Cards */}
                    {filtered.length===0 && (
                        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
                            <FiAward size={40} className="text-gray-200 mx-auto mb-3"/>
                            <p className="text-gray-400 font-medium">No SBA tasks found</p>
                            <button onClick={()=>setShowCreate(true)} className="mt-3 px-4 py-2 rounded-lg text-sm font-bold text-white" style={{background:'#0F2044'}}>Create First SBA Task</button>
                        </div>
                    )}
                    <div className="space-y-3">
                        {filtered.map(task => {
                            const isExpanded = expandedTask === task.id;
                            const taskStuCount = students.filter(s=>s.form_id===task.form_id).length;
                            const sc = scores[task.id] || [];
                            const scoredCount = sc.filter(s=>s.competency_level).length;
                            const pct = taskStuCount>0?Math.round(scoredCount/taskStuCount*100):0;
                            return (
                                <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="font-black text-gray-800 text-base">{task.title}</h3>
                                                    {taskStatusBadge(task.status)}
                                                    {hodBadge(task.hod_approval)}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                                                    <span className="flex items-center gap-1"><FiUsers size={10}/><strong className="text-gray-700">{task.form_name}</strong></span>
                                                    <span className="flex items-center gap-1"><FiBook size={10}/>{task.learning_area}</span>
                                                    {task.strand&&<span className="flex items-center gap-1"><FiLayers size={10}/>{task.strand}</span>}
                                                    <span className="flex items-center gap-1"><FiZap size={10}/>{task.task_type}</span>
                                                    {task.subject_name&&<span className="flex items-center gap-1"><FiFileText size={10}/>{task.subject_name}</span>}
                                                    {task.term_name&&<span className="flex items-center gap-1"><FiCalendar size={10}/>{task.term_name} {task.year}</span>}
                                                    {task.due_date&&<span className="flex items-center gap-1 text-red-500"><FiClock size={10}/>Due: {fmtDate(task.due_date)}</span>}
                                                </div>
                                                {task.description&&<p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
                                                {/* Progress bar */}
                                                {taskStuCount>0&&(
                                                    <div className="mt-2">
                                                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                            <span>Scoring Progress</span>
                                                            <span className="font-bold text-gray-700">{scoredCount}/{taskStuCount} students ({pct}%)</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:pct===100?'#059669':pct>50?'#2563EB':'#D97706'}}/>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                                <div className="text-center px-3 py-2 rounded-xl" style={{background:'#F0FDF4'}}>
                                                    <p className="text-[10px] text-gray-500">Max Score</p>
                                                    <p className="text-lg font-black text-green-700">{task.max_score}</p>
                                                </div>
                                                <button onClick={()=>openScoring(task)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                                    <FiTarget size={13}/>Score Students
                                                </button>
                                                {task.hod_approval==='pending'&&(
                                                    <div className="flex gap-1">
                                                        <button onClick={()=>approveTask(task.id,'approved')} className="flex items-center gap-1 px-2 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100"><FiCheck size={12}/>Approve</button>
                                                        <button onClick={()=>approveTask(task.id,'rejected')} className="flex items-center gap-1 px-2 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100"><FiX size={12}/>Reject</button>
                                                    </div>
                                                )}
                                                <button onClick={()=>exportCSV(task)} className="flex items-center gap-1 p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Export CSV"><FiDownload size={14}/></button>
                                                <button onClick={()=>deleteTask(task.id)} className="flex items-center gap-1 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><FiTrash2 size={14}/></button>
                                                <button onClick={()=>setExpandedTask(isExpanded?null:task.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">{isExpanded?<FiChevronUp size={14}/>:<FiChevronDown size={14}/>}</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded score summary */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-4 bg-gray-50">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Competency Distribution</p>
                                            <div className="grid grid-cols-4 gap-2 mb-3">
                                                {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k,v])=>{
                                                    const cnt = sc.filter(s=>s.competency_level===k).length;
                                                    const pctComp = taskStuCount>0?Math.round(cnt/taskStuCount*100):0;
                                                    return (
                                                        <div key={k} className="rounded-xl p-3 text-center" style={{background:v.bg}}>
                                                            <p className="text-lg font-black" style={{color:v.color}}>{cnt}</p>
                                                            <p className="text-[10px] font-bold" style={{color:v.color}}>{k}</p>
                                                            <p className="text-[9px]" style={{color:v.color,opacity:0.7}}>{pctComp}%</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button onClick={()=>openScoring(task)} className="w-full py-2 rounded-xl text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>Open Full Scoring Sheet →</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ══════════════════ SCORING VIEW ════════════════════════ */}
            {view==='scoring' && (
                <div>
                    {!selectedTask ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                            <FiTarget size={40} className="text-gray-200 mx-auto mb-3"/>
                            <p className="text-gray-500 font-medium">Select a task to score</p>
                            <p className="text-xs text-gray-400 mt-1">Go to Tasks tab and click "Score Students" on any active task</p>
                            <button onClick={()=>setView('tasks')} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'#0F2044'}}>← Back to Tasks</button>
                        </div>
                    ) : (
                        <div>
                            {/* Task header */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h2 className="font-black text-gray-800 text-lg">{selectedTask.title}</h2>
                                            {taskStatusBadge(selectedTask.status)}
                                            {hodBadge(selectedTask.hod_approval)}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                                            <span><strong>{selectedTask.form_name}</strong></span>
                                            <span>{selectedTask.learning_area}{selectedTask.strand?` · ${selectedTask.strand}`:''}</span>
                                            <span>{selectedTask.task_type}</span>
                                            {selectedTask.due_date&&<span className="text-red-500">Due: {fmtDate(selectedTask.due_date)}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Completion ring */}
                                        <div className="text-center">
                                            <div className="relative w-16 h-16">
                                                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                                    <circle cx="32" cy="32" r="26" fill="none" stroke="#F1F5F9" strokeWidth="8"/>
                                                    <circle cx="32" cy="32" r="26" fill="none" stroke={completion===100?'#059669':completion>50?'#2563EB':'#D97706'} strokeWidth="8" strokeDasharray={`${completion*1.633} 163.3`} strokeLinecap="round"/>
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-black text-gray-800">{completion}%</span></div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{scored}/{taskStudents.length} scored</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={()=>exportCSV(selectedTask)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"><FiDownload size={12}/>Export CSV</button>
                                            <button onClick={()=>{setView('tasks');setSelectedTask(null);}} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200">← All Tasks</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Score grid */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-1">#</div>
                                    <div className="col-span-3">Student</div>
                                    <div className="col-span-5">Competency Level</div>
                                    <div className="col-span-2">Notes</div>
                                    <div className="col-span-1 text-center">Status</div>
                                </div>
                                {taskStudents.length===0 && <div className="py-12 text-center text-gray-400 text-sm">No students found for {selectedTask.form_name}</div>}
                                {taskStudents.map((stu,i)=>{
                                    const sc = taskScores.find(s=>s.student_id===stu.id);
                                    return (
                                        <div key={stu.id} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 items-center ${i%2===0?'bg-white':'bg-gray-50/40'}`}>
                                            <div className="col-span-1 text-xs font-bold text-gray-400">{i+1}</div>
                                            <div className="col-span-3">
                                                <p className="text-sm font-bold text-gray-800 leading-tight">{stu.first_name} {stu.last_name}</p>
                                                {stu.admission_no&&<p className="text-[10px] text-blue-600">{stu.admission_no}</p>}
                                            </div>
                                            <div className="col-span-5">
                                                <div className="flex gap-1 flex-wrap">
                                                    {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k,v])=>(
                                                        <button key={k} onClick={()=>saveScore(selectedTask.id,stu.id,k)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${sc?.competency_level===k?'border-current shadow-md':'border-transparent hover:border-current'}`} style={sc?.competency_level===k?{background:v.bg,color:v.color,borderColor:v.color}:{color:v.color,background:'#F8FAFC'}}>
                                                            {k}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <input className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200" placeholder="Notes…" defaultValue={sc?.teacher_notes||''} onBlur={e=>{ if(sc?.competency_level) saveScore(selectedTask.id,stu.id,sc.competency_level,e.target.value); }} />
                                            </div>
                                            <div className="col-span-1 flex items-center justify-center">
                                                {sc?.competency_level ? compBadge(sc.competency_level) : <span className="text-[10px] text-gray-300">—</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {taskStudents.length>0&&(
                                    <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                                        <span className="text-xs text-gray-500">{scored} of {taskStudents.length} students scored</span>
                                        <button onClick={()=>exportCSV(selectedTask)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}><FiDownload size={12}/>Export KNEC Format</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════ ANALYTICS VIEW ══════════════════════ */}
            {view==='analytics' && (
                <div className="space-y-5">
                    {/* Overview cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k,v])=>{
                            const cnt = Object.values(scores).flat().filter(s=>s.competency_level===k).length;
                            return (
                                <div key={k} className="rounded-2xl p-5 shadow-sm" style={{background:`linear-gradient(135deg,${v.bg},white)`,border:`2px solid ${v.color}22`}}>
                                    <div className="flex items-center gap-3 mb-2"><FiAward size={20} style={{color:v.color}}/><span className="font-black text-xl" style={{color:v.color}}>{cnt}</span></div>
                                    <p className="font-bold text-sm" style={{color:v.color}}>{k} — {v.label}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">students scored at this level</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Task completion matrix */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">SBA Task Completion Matrix</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Scoring progress across all active tasks</p>
                        </div>
                        <div className="p-4">
                            {tasks.filter(t=>t.status==='active'||t.status==='closed').length===0 ? (
                                <p className="text-center text-gray-400 py-8 text-sm">No active tasks yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {tasks.filter(t=>t.status==='active'||t.status==='closed').map(task=>{
                                        const stuCount = students.filter(s=>s.form_id===task.form_id).length;
                                        const sc = scores[task.id]||[];
                                        const done = sc.filter(s=>s.competency_level).length;
                                        const pct = stuCount>0?Math.round(done/stuCount*100):0;
                                        return (
                                            <div key={task.id} className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-sm font-semibold text-gray-700 truncate">{task.title}</p>
                                                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{done}/{stuCount}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:pct===100?'#059669':pct>50?'#2563EB':'#D97706'}}/>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-600 w-10 text-right">{pct}%</span>
                                                    </div>
                                                </div>
                                                <button onClick={()=>{setSelectedTask(task);setView('scoring');loadScores(task.id);}} className="px-2 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 flex-shrink-0 flex items-center gap-1"><FiTarget size={11}/>Score</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CBC Quick links */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[{href:'/dashboard/exams/cbc-reports/sba-audit',l:'SBA Audit Report',ic:FiShield,c:'#DC2626',d:'KNEC submission audit'},
                          {href:'/dashboard/exams/cbc-reports/at-risk',l:'At-Risk Students',ic:FiAlertCircle,c:'#D97706',d:'Students needing support'},
                          {href:'/dashboard/cbc/portfolio',l:'Student Portfolio',ic:FiFolder,c:'#F59E0B',d:'Evidence bank'},
                          {href:'/dashboard/exams/cbc-reports',l:'CBC Reports Hub',ic:FiBarChart2,c:'#2563EB',d:'20+ analytics reports'},
                        ].map(l=>(
                            <Link key={l.href} href={l.href} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{background:l.c+'18'}}><l.ic size={18} style={{color:l.c}}/></div>
                                <p className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{l.l}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{l.d}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════════ CREATE TASK MODAL ═══════════════════ */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(5,150,105,0.25)'}}><FiPlus size={18} color="#34D399"/></div>
                                <div><h2 className="text-lg font-black text-white">Create SBA Task</h2><p className="text-blue-200 text-xs">School Based Assessment · KICD/KNEC Aligned</p></div>
                            </div>
                            <button onClick={()=>{setShowCreate(false);setTaskForm(emptyTask);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Water Cycle Project — Term 1, Fraction Practical Activity…" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/>
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Task Description / Instructions</label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} placeholder="Describe what students should do, materials needed, assessment criteria…" value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})}/>
                            </div>
                            {/* Form + Subject */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Form / Grade <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.form_id} onChange={e=>setTaskForm({...taskForm,form_id:e.target.value})}>
                                        <option value="">Select form…</option>
                                        {forms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Subject (optional)</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.subject_id} onChange={e=>setTaskForm({...taskForm,subject_id:e.target.value})}>
                                        <option value="">Select subject…</option>
                                        {subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Term + Year */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Term</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.term_id} onChange={e=>setTaskForm({...taskForm,term_id:e.target.value})}>
                                        <option value="">Select term…</option>
                                        {terms.map(t=><option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Academic Year</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.year} onChange={e=>setTaskForm({...taskForm,year:Number(e.target.value)})}>
                                        {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Learning Area + Task Type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Learning Area <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.learning_area} onChange={e=>setTaskForm({...taskForm,learning_area:e.target.value})}>
                                        <option value="">Select area…</option>
                                        {LEARNING_AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Task Type</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.task_type} onChange={e=>setTaskForm({...taskForm,task_type:e.target.value})}>
                                        {TASK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Strand + Sub-strand */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Strand</label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Numbers, Reading, Environment" value={taskForm.strand} onChange={e=>setTaskForm({...taskForm,strand:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Sub-Strand</label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Fractions, Creative Writing" value={taskForm.sub_strand} onChange={e=>setTaskForm({...taskForm,sub_strand:e.target.value})}/>
                                </div>
                            </div>
                            {/* Max Score + Due Date + Status */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Max Score</label>
                                    <div className="flex gap-1">
                                        {[4,10,20,40,100].map(n=>(
                                            <button key={n} onClick={()=>setTaskForm({...taskForm,max_score:n})} className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${taskForm.max_score===n?'bg-blue-600 text-white border-blue-600':'bg-gray-50 text-gray-500 border-transparent hover:border-blue-200'}`}>{n}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Due Date</label>
                                    <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm,due_date:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Initial Status</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={taskForm.status} onChange={e=>setTaskForm({...taskForm,status:e.target.value as TaskStatus})}>
                                        <option value="draft">Draft</option>
                                        <option value="active">Active (Live)</option>
                                    </select>
                                </div>
                            </div>
                            {/* Info box */}
                            <div className="rounded-xl p-3 bg-green-50 border border-green-200 flex items-start gap-3">
                                <FiShield size={16} className="text-green-600 flex-shrink-0 mt-0.5"/>
                                <div className="text-xs text-green-700">
                                    <p className="font-bold mb-0.5">HOD Approval Workflow</p>
                                    <p>This task will be saved as <strong>Pending HOD Approval</strong>. The Head of Department must approve before scoring begins. SBA contributes <strong>40%</strong> to the final CBC grade per KNEC guidelines.</p>
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={saveTask} disabled={savingTask} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                    {savingTask?<><FiRefreshCw size={14} className="animate-spin"/>Creating…</>:<><FiCheck size={14}/>Create SBA Task</>}
                                </button>
                                <button onClick={()=>{setShowCreate(false);setTaskForm(emptyTask);}} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
