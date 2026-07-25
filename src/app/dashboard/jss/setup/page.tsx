'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiBook, FiUsers, FiGrid, FiSettings, FiPlus, FiSearch, FiCheck,
    FiX, FiEdit2, FiTrash2, FiDownload, FiRefreshCw, FiArrowRight,
    FiCheckCircle, FiAlertCircle, FiZap, FiAward, FiLayers, FiTarget,
    FiBarChart2, FiTrendingUp, FiShield, FiFileText, FiStar, FiGlobe,
    FiCalendar, FiUser, FiActivity, FiPieChart, FiCpu, FiBookOpen,
    FiChevronRight, FiInfo, FiFolder, FiClock,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'grades' | 'subjects' | 'pathways' | 'students' | 'timetable' | 'settings';

interface JSSForm { id: number; name: string; form_name?: string; form_level: number; education_system?: string; is_active?: boolean; stream_count?: number; student_count?: number; }
interface JSSStream { id: number; stream_name: string; form_id: number; form_name?: string; is_active?: boolean; student_count?: number; }
interface JSSSubject { id?: number; subject_name: string; subject_code: string; grade_levels: string[]; category: 'Core'|'Optional'; kicd_code?: string; weekly_periods: number; is_active?: boolean; description?: string; assessment_sba: number; assessment_knec: number; }
interface JSSStudent { id: number; first_name: string; last_name: string; admission_no?: string; form_id?: number; form_name?: string; gender?: string; pathway_preference?: string; }
interface Pathway { id: string; name: string; icon: string; color: string; description: string; subjects: string[]; career_paths: string[]; }

// ─── JSS OFFICIAL SUBJECTS (MoE Kenya 2023) ──────────────────────────────────
const JSS_SUBJECTS_OFFICIAL: JSSSubject[] = [
    { subject_name:'English',                    subject_code:'ENG',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JE001', weekly_periods:5, is_active:true, description:'Language of instruction. Develops communication, reading and writing skills.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Kiswahili',                  subject_code:'KSW',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JK001', weekly_periods:4, is_active:true, description:'National language. Strengthens communication in Kenyan context.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Mathematics',                subject_code:'MAT',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JM001', weekly_periods:6, is_active:true, description:'Numeracy, algebra, geometry, statistics and financial literacy.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Integrated Science',         subject_code:'ISC',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JIS001',weekly_periods:5, is_active:true, description:'Biology, Chemistry and Physics integrated. Practical skills focus.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Health Education',           subject_code:'HED',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JH001', weekly_periods:2, is_active:true, description:'Personal health, hygiene, reproductive health and disease prevention.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Pre-Technical & Pre-Career', subject_code:'PTC',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JP001', weekly_periods:4, is_active:true, description:'Technical drawing, woodwork, metalwork, career exploration and life skills.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Social Studies',             subject_code:'SST',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JSS001',weekly_periods:4, is_active:true, description:'History, Geography, Civics and Community Service Learning.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Religious Education',        subject_code:'RE',   grade_levels:['7','8','9'], category:'Core',     kicd_code:'JRE001',weekly_periods:2, is_active:true, description:'Christian Religious Education / Islamic Religious Education / Hindu RE.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Business Studies',           subject_code:'BST',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JB001', weekly_periods:3, is_active:true, description:'Entrepreneurship, financial literacy, basic business operations.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Agriculture',                subject_code:'AGR',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JAG001',weekly_periods:3, is_active:true, description:'Crop production, animal husbandry, soil science and agro-business.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Life Skills Education',      subject_code:'LSE',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JL001', weekly_periods:2, is_active:true, description:'Decision making, social skills, emotional intelligence and values education.', assessment_sba:100, assessment_knec:0 },
    { subject_name:'Physical & Health Education',subject_code:'PHE',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JPH001',weekly_periods:3, is_active:true, description:'Sports, fitness, physical wellness and team activities.', assessment_sba:100, assessment_knec:0 },
    { subject_name:'Creative Arts',              subject_code:'CAT',  grade_levels:['7','8','9'], category:'Core',     kicd_code:'JCA001',weekly_periods:3, is_active:true, description:'Visual Arts, Music, Performing Arts and Home Science (rotational).', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Foreign Language (French)',  subject_code:'FRE',  grade_levels:['7','8','9'], category:'Optional', kicd_code:'JFL001',weekly_periods:3, is_active:false,description:'Optional foreign language for STEM/Social Sciences track.', assessment_sba:40, assessment_knec:60 },
    { subject_name:'Kenya Sign Language',        subject_code:'KSL',  grade_levels:['7','8','9'], category:'Optional', kicd_code:'JKL001',weekly_periods:3, is_active:false,description:'Optional: For schools with learners with hearing impairment.', assessment_sba:40, assessment_knec:60 },
];

// ─── JSS PATHWAYS (after Grade 9 → Senior Secondary) ─────────────────────────
const JSS_PATHWAYS: Pathway[] = [
    { id:'stem', name:'STEM', icon:'⚗️', color:'#2563EB', description:'Science, Technology, Engineering and Mathematics. Leads to medicine, engineering, computer science, pharmacy, architecture.', subjects:['Physics','Chemistry','Biology','Mathematics','Computer Science','Technical Drawing'], career_paths:['Medical Doctor','Engineer','Data Scientist','Architect','Pharmacist','Pilot'] },
    { id:'social', name:'Social Sciences', icon:'🌍', color:'#059669', description:'Humanities, Languages, Business and Social Studies. Leads to law, journalism, economics, social work, education.', subjects:['History','Geography','Economics','Sociology','Literature','Business Studies'], career_paths:['Lawyer','Journalist','Economist','Teacher','Diplomat','Social Worker'] },
    { id:'arts', name:'Arts & Sports Sciences', icon:'🎨', color:'#D97706', description:'Creative Arts, Performing Arts, Music, Physical Education and Sports Science. Leads to creative industries and sports.', subjects:['Visual Arts','Music','Performing Arts','Physical Education','Media Studies','Design'], career_paths:['Artist','Musician','Athlete','Coach','Filmmaker','Fashion Designer'] },
    { id:'tvet', name:'TVET', icon:'🔧', color:'#7C3AED', description:'Technical and Vocational Education and Training. Practical skills for immediate employment in trades and technology.', subjects:['Building Technology','Electrical Engineering','Motor Vehicle','ICT','Catering','Agriculture Technology'], career_paths:['Electrician','Mechanic','Chef','Programmer','Plumber','Agricultural Officer'] },
];

// ─── Grade display helper ─────────────────────────────────────────────────────
const gradeColor = (level: number) => {
    if(level===7) return { bg:'#EFF6FF', fg:'#2563EB', ring:'#BFDBFE' };
    if(level===8) return { bg:'#F0FDF4', fg:'#059669', ring:'#A7F3D0' };
    if(level===9) return { bg:'#FAF5FF', fg:'#7C3AED', ring:'#DDD6FE' };
    return { bg:'#F8FAFC', fg:'#64748B', ring:'#E2E8F0' };
};

const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'});

const SQL_JSS = `-- Run in Supabase SQL Editor to enable full JSS functionality

-- 1. Add JSS columns to school_forms (if not present)
ALTER TABLE school_forms 
  ADD COLUMN IF NOT EXISTS education_system text DEFAULT '8-4-4',
  ADD COLUMN IF NOT EXISTS grade_label text,
  ADD COLUMN IF NOT EXISTS jss_pathway_enabled boolean DEFAULT false;

-- 2. JSS Subject-Grade mapping
CREATE TABLE IF NOT EXISTS school_jss_subject_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id bigint REFERENCES school_subjects(id) ON DELETE CASCADE,
  grade_level int NOT NULL,
  weekly_periods int DEFAULT 4,
  is_active boolean DEFAULT true,
  UNIQUE(subject_id, grade_level)
);

-- 3. Student pathway preferences
ALTER TABLE school_students
  ADD COLUMN IF NOT EXISTS pathway_preference text,
  ADD COLUMN IF NOT EXISTS pathway_selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathway_counselor_notes text;

-- 4. Update Grade 7-9 forms to JSS
UPDATE school_forms 
SET education_system = 'CBC_JSS' 
WHERE form_level IN (7,8,9);

ALTER TABLE school_jss_subject_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_jss_subject_grades FOR ALL USING (true) WITH CHECK (true);`;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function JSSSetupPage() {
    const [tab, setTab]                   = useState<Tab>('overview');
    const [forms, setForms]               = useState<JSSForm[]>([]);
    const [allForms, setAllForms]         = useState<any[]>([]);
    const [streams, setStreams]           = useState<JSSStream[]>([]);
    const [students, setStudents]         = useState<JSSStudent[]>([]);
    const [dbSubjects, setDbSubjects]     = useState<any[]>([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [showCreateForm, setShowForm]   = useState(false);
    const [showCreateStream, setShowStream] = useState(false);
    const [showAddSubject, setShowSubject] = useState(false);
    const [selectedGrade, setSelGrade]    = useState<number|null>(null);
    const [savingForm, setSavingForm]     = useState(false);

    // Form modals
    const emptyFormData = { name:'', form_level:7, education_system:'CBC_JSS', is_active:true };
    const emptyStreamData = { stream_name:'', form_id:'', is_active:true };
    const [formData, setFormData]       = useState(emptyFormData);
    const [streamData, setStreamData]   = useState(emptyStreamData);
    const [pathwayEdits, setPathwayEdits] = useState<Record<number,string>>({});

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [fmsR, stmR, stuR, subR] = await Promise.all([
                sb.from('school_forms').select('*').order('form_level'),
                sb.from('school_streams').select('*').order('stream_name'),
                sb.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender,pathway_preference').order('first_name').limit(1000),
                sb.from('school_subjects').select('*').order('subject_name'),
            ]);
            const fmsAll = fmsR.data || [];
            setAllForms(fmsAll);
            const stmAll = stmR.data || [];
            const stuAll = stuR.data || [];
            setDbSubjects(subR.data || []);

            // Filter JSS forms (grade 7–9)
            const jssForms = fmsAll.filter((f:any) => f.form_level >= 7 && f.form_level <= 9);
            const fmMap: Record<number,string> = {};
            fmsAll.forEach((f:any) => { fmMap[f.id] = f.form_name || f.name || `Grade ${f.form_level}`; });

            // Enrich forms with stream/student counts
            const enrichedForms: JSSForm[] = jssForms.map((f:any) => ({
                ...f, name: f.form_name || f.name || `Grade ${f.form_level}`,
                stream_count: stmAll.filter((s:any) => s.form_id === f.id).length,
                student_count: stuAll.filter((s:any) => s.form_id === f.id).length,
            }));
            setForms(enrichedForms);

            // Enrich streams
            const jssFormIds = new Set(jssForms.map((f:any) => f.id));
            const jssStreams: JSSStream[] = stmAll
                .filter((s:any) => jssFormIds.has(s.form_id))
                .map((s:any) => ({
                    ...s, form_name: fmMap[s.form_id] || '—',
                    student_count: stuAll.filter((st:any) => st.form_id === s.form_id).length,
                }));
            setStreams(jssStreams);

            // JSS students
            const jssStudents: JSSStudent[] = stuAll
                .filter((s:any) => jssFormIds.has(s.form_id))
                .map((s:any) => ({ ...s, form_name: fmMap[s.form_id] || '—' }));
            setStudents(jssStudents);

        } catch(e) { console.error(e); }
        setLoading(false);
    }

    const stats = useMemo(() => ({
        grades: forms.length,
        streams: streams.length,
        students: students.length,
        g7: students.filter(s => { const f = allForms.find((f:any)=>f.id===s.form_id); return f?.form_level===7; }).length,
        g8: students.filter(s => { const f = allForms.find((f:any)=>f.id===s.form_id); return f?.form_level===8; }).length,
        g9: students.filter(s => { const f = allForms.find((f:any)=>f.id===s.form_id); return f?.form_level===9; }).length,
        pathwaySelected: students.filter(s=>s.pathway_preference).length,
        subjects: JSS_SUBJECTS_OFFICIAL.filter(s=>s.is_active).length,
    }), [forms, streams, students, allForms]);

    async function createGrade() {
        if (!formData.name) { toast.error('Enter grade name (e.g. Grade 7)'); return; }
        setSavingForm(true);
        try {
            const { error } = await sb.from('school_forms').insert({
                form_name: formData.name, form_level: formData.form_level,
                education_system: 'CBC_JSS', is_active: true,
            });
            if (error) throw error;
            toast.success(`✅ ${formData.name} created!`);
            setShowForm(false); setFormData(emptyFormData); load();
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSavingForm(false);
    }

    async function createStream() {
        if (!streamData.stream_name || !streamData.form_id) { toast.error('Fill stream name and grade'); return; }
        setSavingForm(true);
        try {
            const { error } = await sb.from('school_streams').insert({
                stream_name: streamData.stream_name, form_id: Number(streamData.form_id), is_active: true,
            });
            if (error) throw error;
            toast.success(`✅ Stream ${streamData.stream_name} created!`);
            setShowStream(false); setStreamData(emptyStreamData); load();
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSavingForm(false);
    }

    async function deleteForm(id:number) {
        if (!confirm('Delete this grade? This will affect all students in this grade.')) return;
        await sb.from('school_forms').delete().eq('id', id);
        toast.success('Grade deleted'); load();
    }

    async function deleteStream(id:number) {
        if (!confirm('Delete this stream?')) return;
        await sb.from('school_streams').delete().eq('id', id);
        toast.success('Stream deleted'); load();
    }

    async function savePathway(studentId: number, pathway: string) {
        await sb.from('school_students').update({ pathway_preference: pathway, pathway_selected_at: new Date().toISOString() }).eq('id', studentId);
        setStudents(p=>p.map(s=>s.id===studentId?{...s,pathway_preference:pathway}:s));
        toast.success('Pathway saved!');
    }

    async function addSubjectToDB(subj: JSSSubject) {
        const existing = dbSubjects.find(s=>s.subject_code===subj.subject_code);
        if (existing) { toast.error(`${subj.subject_name} already exists in your subjects`); return; }
        const { error } = await sb.from('school_subjects').insert({ subject_name:subj.subject_name, subject_code:subj.subject_code, category:subj.category==='Core'?'Compulsory':'Optional', max_score:100, is_active:subj.is_active, initials:subj.subject_code });
        if (error) { toast.error(error.message); return; }
        toast.success(`✅ ${subj.subject_name} added to school subjects!`); load();
    }

    async function addAllJSSSubjects() {
        let added=0, skipped=0;
        for (const subj of JSS_SUBJECTS_OFFICIAL.filter(s=>s.category==='Core')) {
            const existing = dbSubjects.find(s=>s.subject_code===subj.subject_code);
            if (existing) { skipped++; continue; }
            await sb.from('school_subjects').insert({ subject_name:subj.subject_name, subject_code:subj.subject_code, category:'Compulsory', max_score:100, is_active:true, initials:subj.subject_code });
            added++;
        }
        toast.success(`✅ Added ${added} JSS subjects${skipped>0?` (${skipped} already existed)`:''}`);
        load();
    }

    const filteredStudents = useMemo(() => students.filter(s => {
        const q = search.toLowerCase();
        return !q || `${s.first_name} ${s.last_name} ${s.admission_no||''} ${s.form_name||''}`.toLowerCase().includes(q);
    }), [students, search]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiBook size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading JSS Setup...</p>
                <p className="text-sm text-gray-500 mt-1">Junior Secondary School — Kenya CBC 2023</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1A2F4A 40%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/cbc/portfolio" className="hover:text-white">CBC Hub</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">🏫 JSS Setup (Grade 7–9)</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                <FiBook size={30} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h1 className="text-2xl font-black text-white">JSS Setup — Grade 7, 8 & 9</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400 text-green-900">CBC 2023</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">MoE KENYA</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white">NEW</span>
                                </div>
                                <p className="text-blue-200 text-sm">Junior Secondary School configuration · Grades · Streams · Subjects · Pathways · KICD Aligned</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {['Grade 7 (2023)','Grade 8 (2024)','Grade 9 (2025)','13 Core Subjects','4 Pathways','SBA 40% + KNEC 60%'].map(tag=>(
                                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] text-blue-200 border border-white/10" style={{background:'rgba(255,255,255,0.07)'}}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward},{href:'/dashboard/cbc/portfolio',l:'Portfolio',ic:FiFolder},{href:'/dashboard/exams/cbc-marks',l:'CBC Marks',ic:FiFileText},{href:'/dashboard/timetable',l:'Timetable',ic:FiCalendar}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                        </div>
                    </div>
                </div>
                {/* KPI bar */}
                <div className="grid grid-cols-4 lg:grid-cols-8 border-t border-white/10">
                    {[
                        {l:'Grades Set Up',v:stats.grades,ic:FiGrid,c:'#F59E0B'},
                        {l:'Streams',v:stats.streams,ic:FiLayers,c:'#38BDF8'},
                        {l:'JSS Students',v:stats.students,ic:FiUsers,c:'#34D399'},
                        {l:'Grade 7',v:stats.g7,ic:FiStar,c:'#60A5FA'},
                        {l:'Grade 8',v:stats.g8,ic:FiStar,c:'#4ADE80'},
                        {l:'Grade 9',v:stats.g9,ic:FiStar,c:'#C084FC'},
                        {l:'Pathway Selected',v:stats.pathwaySelected,ic:FiTarget,c:'#F472B6'},
                        {l:'Core Subjects',v:stats.subjects,ic:FiBook,c:'#FCD34D'},
                    ].map((s,i)=>(
                        <div key={i} className="px-3 py-3 flex items-center gap-2 border-r border-white/10 last:border-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:s.c+'22'}}><s.ic size={12} style={{color:s.c}}/></div>
                            <div><div className="text-lg font-black leading-none" style={{color:s.c}}>{s.v}</div><div className="text-[9px] text-blue-300 leading-tight mt-0.5">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── ALERT: No JSS grades yet ─────────────────────────────── */}
            {forms.length === 0 && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">No JSS Grades Found (Grade 7, 8, 9)</p>
                        <p className="text-sm text-amber-700 mt-1">Your system doesn't have Grade 7–9 set up yet. Click <strong>"Add Grade"</strong> in the Grades tab to create them, or check that your forms have <code className="bg-amber-100 px-1 rounded text-xs">form_level</code> values of 7, 8 or 9.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show SQL to enable JSS features</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL_JSS}</pre>
                        </details>
                    </div>
                    <button onClick={()=>setTab('grades')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"><FiPlus size={12}/> Add Grades</button>
                </div>
            )}

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                {([
                    ['overview','🏠 Overview',FiBarChart2],
                    ['grades','📚 Grades & Streams',FiGrid],
                    ['subjects','📖 JSS Subjects',FiBook],
                    ['pathways','🛤️ Pathways',FiTarget],
                    ['students','👥 Students',FiUsers],
                    ['timetable','📅 Period Guide',FiCalendar],
                    ['settings','⚙️ Settings',FiSettings],
                ] as const).map(([key,lbl,Ic])=>(
                    <button key={key} onClick={()=>setTab(key as Tab)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab===key?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===key?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={12}/>{lbl}
                    </button>
                ))}
            </div>

            {/* ══════════════════ OVERVIEW ══════════════════════════════ */}
            {tab==='overview'&&(
                <div className="space-y-5">
                    {/* JSS Journey */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-black text-gray-800 text-lg mb-4">🇰🇪 JSS in Kenya — CBC Journey 2023–2025</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                            {[
                                {year:'2023', grade:'Grade 7', note:'First JSS cohort joined — former KCPE 2022 graduates', color:'#2563EB', bg:'#EFF6FF'},
                                {year:'2024', grade:'Grade 8', note:'Second cohort — Grade 7 (2023) moved up to Grade 8', color:'#059669', bg:'#F0FDF4'},
                                {year:'2025', grade:'Grade 9', note:'Third cohort — Grade 7 (2023) final year of JSS', color:'#7C3AED', bg:'#FAF5FF'},
                            ].map(item=>(
                                <div key={item.year} className="rounded-2xl p-5 border-2" style={{background:item.bg,borderColor:item.color+'33'}}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white" style={{background:item.color}}>{item.year}</div>
                                        <div><p className="font-black text-gray-800">{item.grade}</p><p className="text-xs" style={{color:item.color}}>Intake Year</p></div>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.note}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                            <div className="h-full rounded-full" style={{width:`${item.year==='2023'?100:item.year==='2024'?100:75}%`,background:item.color}}/>
                                        </div>
                                        <span className="text-[10px] font-bold" style={{color:item.color}}>{item.year==='2025'?'Ongoing':'Complete'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Grade breakdown */}
                        <div className="grid grid-cols-3 gap-4">
                            {[{level:7,label:'Grade 7',count:stats.g7},{level:8,label:'Grade 8',count:stats.g8},{level:9,label:'Grade 9',count:stats.g9}].map(g=>{
                                const gc = gradeColor(g.level);
                                const form = forms.find(f=>f.form_level===g.level);
                                const stm = streams.filter(s=>form&&s.form_id===form.id);
                                return (
                                    <div key={g.level} className="rounded-2xl p-4 border-2" style={{background:gc.bg,borderColor:gc.ring}}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{background:gc.fg,color:'#fff'}}>{g.level}</div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black" style={{color:gc.fg}}>{g.count}</p>
                                                <p className="text-[10px] text-gray-500">students</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-gray-800 mb-1">{g.label}</p>
                                        {form ? <p className="text-xs text-gray-500">{stm.length} stream{stm.length!==1?'s':''} · {form.student_count} enrolled</p> : <p className="text-xs text-red-500">⚠ Not configured</p>}
                                        <button onClick={()=>setTab('grades')} className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-bold transition-all" style={{background:gc.fg,color:'#fff'}}>{form?'Manage →':'Set Up →'}</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* JSS Assessment Framework */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 mb-3">📊 JSS Assessment Framework</h3>
                            <div className="space-y-3">
                                {[{l:'School Based Assessment (SBA)',pct:40,c:'#059669',d:'Continuous assessment tasks, projects, portfolios. Assessed by school.'},
                                  {l:'KNEC External Assessment',pct:60,c:'#2563EB',d:'National examination at end of Grade 9 set by KNEC.'},
                                ].map(item=>(
                                    <div key={item.l} className="rounded-xl p-3" style={{background:item.c+'0F'}}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-bold" style={{color:item.c}}>{item.l}</p>
                                            <span className="text-xl font-black" style={{color:item.c}}>{item.pct}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                                            <div className="h-full rounded-full" style={{width:`${item.pct}%`,background:item.c}}/>
                                        </div>
                                        <p className="text-xs text-gray-500">{item.d}</p>
                                    </div>
                                ))}
                                <div className="rounded-xl p-3 bg-amber-50 border border-amber-200">
                                    <p className="text-xs font-bold text-amber-800 mb-1">Competency Levels</p>
                                    <div className="flex gap-2">
                                        {[['EE','#059669'],['ME','#2563EB'],['AE','#D97706'],['BE','#DC2626']].map(([k,c])=>(
                                            <div key={k} className="flex-1 text-center py-1.5 rounded-lg text-xs font-black text-white" style={{background:c}}>{k}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pathway Overview */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 mb-3">🛤️ Senior Secondary Pathways (after Grade 9)</h3>
                            <div className="space-y-2">
                                {JSS_PATHWAYS.map(p=>(
                                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-100 transition-colors cursor-pointer" onClick={()=>setTab('pathways')}>
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{background:p.color+'18'}}>{p.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{p.career_paths.slice(0,3).join(' · ')}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black" style={{color:p.color}}>{students.filter(s=>s.pathway_preference===p.id).length}</p>
                                            <p className="text-[9px] text-gray-400">selected</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[{l:'Add Grade/Stream',ic:FiGrid,c:'#2563EB',d:'Create Grade 7, 8 or 9',action:()=>setTab('grades')},
                          {l:'Add JSS Subjects',ic:FiBook,c:'#059669',d:'Import official KICD subjects',action:()=>setTab('subjects')},
                          {l:'Set Pathways',ic:FiTarget,c:'#D97706',d:'STEM/Social/Arts/TVET',action:()=>setTab('pathways')},
                          {l:'View Students',ic:FiUsers,c:'#7C3AED',d:'All JSS enrolled students',action:()=>setTab('students')},
                        ].map(item=>(
                            <button key={item.l} onClick={item.action} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all text-left group">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{background:item.c+'18'}}><item.ic size={18} style={{color:item.c}}/></div>
                                <p className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{item.l}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.d}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════════ GRADES & STREAMS ═════════════════════ */}
            {tab==='grades'&&(
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-black text-gray-800 text-lg">Grades & Streams Configuration</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Set up Grade 7, 8 and 9 with their streams/classes</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>setShowStream(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all"><FiPlus size={14}/>Add Stream</button>
                            <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}><FiPlus size={14}/>Add Grade</button>
                        </div>
                    </div>

                    {/* Grade cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[7,8,9].map(level=>{
                            const gc = gradeColor(level);
                            const form = forms.find(f=>f.form_level===level);
                            const gradeStreams = streams.filter(s=>form&&s.form_id===form.id);
                            const gradeStudents = form ? students.filter(s=>s.form_id===form.id) : [];
                            return (
                                <div key={level} className="bg-white rounded-2xl shadow-sm border-2 overflow-hidden" style={{borderColor:gc.ring}}>
                                    {/* Card header */}
                                    <div className="px-5 py-4" style={{background:`linear-gradient(135deg,${gc.bg},white)`}}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md" style={{background:gc.fg}}>{level}</div>
                                                <div>
                                                    <p className="font-black text-gray-800 text-lg">Grade {level}</p>
                                                    {form ? <p className="text-xs font-semibold" style={{color:gc.fg}}>✅ Configured</p> : <p className="text-xs text-red-500 font-semibold">⚠ Not set up</p>}
                                                </div>
                                            </div>
                                            {form && <button onClick={()=>deleteForm(form.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete grade"><FiTrash2 size={14}/></button>}
                                        </div>
                                        {form && (
                                            <div className="grid grid-cols-3 gap-2 mt-3">
                                                {[{l:'Students',v:gradeStudents.length,c:gc.fg},{l:'Streams',v:gradeStreams.length,c:gc.fg},{l:'Avg/Stream',v:gradeStreams.length>0?Math.round(gradeStudents.length/gradeStreams.length):0,c:gc.fg}].map(s=>(
                                                    <div key={s.l} className="text-center p-2 rounded-lg bg-white/70 border border-gray-100">
                                                        <p className="text-lg font-black" style={{color:s.c}}>{s.v}</p>
                                                        <p className="text-[9px] text-gray-500">{s.l}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Streams list */}
                                    <div className="p-4">
                                        {!form ? (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-gray-400 mb-2">Grade {level} not configured yet</p>
                                                <button onClick={()=>{setFormData({name:`Grade ${level}`,form_level:level,education_system:'CBC_JSS',is_active:true});setShowForm(true);}} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{background:gc.fg}}>
                                                    <FiPlus size={12} className="inline mr-1"/>Create Grade {level}
                                                </button>
                                            </div>
                                        ) : gradeStreams.length===0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-gray-400 mb-2">No streams yet</p>
                                                <button onClick={()=>{setStreamData({stream_name:'',form_id:String(form.id),is_active:true});setShowStream(true);}} className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all" style={{borderColor:gc.fg,color:gc.fg}}>Add Stream</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {gradeStreams.map(stream=>(
                                                    <div key={stream.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 hover:border-blue-100 transition-colors" style={{background:gc.bg+'66'}}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{background:gc.fg}}>{stream.stream_name.charAt(0)}</div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800">{stream.stream_name}</p>
                                                                <p className="text-[10px] text-gray-400">{students.filter(s=>s.form_id===form.id).length} students</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${stream.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{stream.is_active?'Active':'Inactive'}</span>
                                                            <button onClick={()=>deleteStream(stream.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><FiTrash2 size={11}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button onClick={()=>{setStreamData({stream_name:'',form_id:String(form.id),is_active:true});setShowStream(true);}} className="w-full py-2 rounded-xl border-2 border-dashed text-xs font-bold transition-all hover:border-solid" style={{borderColor:gc.fg,color:gc.fg}}>
                                                    <FiPlus size={11} className="inline mr-1"/>Add Stream
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* JSS subjects reminder */}
                                    {form && (
                                        <div className="px-4 pb-4">
                                            <div className="rounded-xl p-3 text-xs" style={{background:gc.bg,border:`1px solid ${gc.ring}`}}>
                                                <p className="font-bold mb-1" style={{color:gc.fg}}>📚 JSS Subjects for Grade {level}</p>
                                                <p className="text-gray-600">13 core subjects · SBA 40% + KNEC 60% · KICD aligned</p>
                                                <button onClick={()=>setTab('subjects')} className="mt-1.5 text-[11px] font-bold underline" style={{color:gc.fg}}>Configure subjects →</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════ SUBJECTS ═════════════════════════════ */}
            {tab==='subjects'&&(
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-black text-gray-800 text-lg">JSS Subjects — KICD Official Curriculum 2023</h2>
                            <p className="text-xs text-gray-500 mt-0.5">13 Core + 2 Optional subjects per MoE Kenya JSS framework</p>
                        </div>
                        <button onClick={addAllJSSSubjects} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                            <FiZap size={14}/>Import All Core Subjects
                        </button>
                    </div>

                    {/* Assessment note */}
                    <div className="rounded-xl p-4 flex items-start gap-3" style={{background:'linear-gradient(135deg,#EFF6FF,#F0FDF4)'}}>
                        <FiInfo size={18} className="text-blue-600 flex-shrink-0 mt-0.5"/>
                        <div className="text-sm text-gray-700">
                            <p className="font-bold text-gray-800 mb-1">JSS Assessment Model (KICD/KNEC 2023)</p>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                                <span>📊 <strong>SBA: 40%</strong> — School-assessed tasks, projects, portfolios</span>
                                <span>📝 <strong>KNEC: 60%</strong> — National examination end of Grade 9</span>
                                <span>💯 <strong>Life Skills & PHE: 100% SBA</strong> — No external exam</span>
                                <span>🏅 <strong>Levels: EE · ME · AE · BE</strong> — No percentage scores</span>
                            </div>
                        </div>
                    </div>

                    {/* Subjects grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {JSS_SUBJECTS_OFFICIAL.map((subj,idx)=>{
                            const inDb = dbSubjects.find(s=>s.subject_code===subj.subject_code);
                            return (
                                <div key={idx} className={`bg-white rounded-2xl border-2 shadow-sm p-4 transition-all hover:shadow-md ${subj.category==='Core'?'border-blue-100':'border-purple-100 opacity-80'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{background:subj.category==='Core'?'#2563EB':'#7C3AED'}}>{subj.subject_code.slice(0,3)}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="font-bold text-gray-800 text-sm">{subj.subject_name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${subj.category==='Core'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{subj.category}</span>
                                                    {inDb ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">✓ In System</span> : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">Not Added</span>}
                                                </div>
                                                <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">{subj.description}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                                                    <span>📋 Code: <strong>{subj.subject_code}</strong></span>
                                                    {subj.kicd_code&&<span>🏛 KICD: <strong>{subj.kicd_code}</strong></span>}
                                                    <span>⏱ <strong>{subj.weekly_periods}</strong> periods/week</span>
                                                    <span>SBA: <strong className="text-green-700">{subj.assessment_sba}%</strong></span>
                                                    <span>KNEC: <strong className="text-blue-700">{subj.assessment_knec}%</strong></span>
                                                </div>
                                                <div className="flex gap-1 mt-2">
                                                    {subj.grade_levels.map(g=><span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600">G{g}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-shrink-0">
                                            {!inDb ? (
                                                <button onClick={()=>addSubjectToDB(subj)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all active:scale-95" style={{background:'#2563EB'}}>
                                                    <FiPlus size={10} className="inline mr-0.5"/>Add
                                                </button>
                                            ) : (
                                                <div className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-green-700 bg-green-50 flex items-center gap-0.5"><FiCheck size={10}/>Added</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════ PATHWAYS ════════════════════════════ */}
            {tab==='pathways'&&(
                <div className="space-y-5">
                    <div>
                        <h2 className="font-black text-gray-800 text-lg">Senior Secondary Pathways — After Grade 9</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Students select a pathway in Grade 9 that determines their Senior Secondary subjects</p>
                    </div>

                    {/* Pathway info */}
                    <div className="rounded-xl p-4" style={{background:'linear-gradient(135deg,#FAF5FF,#EFF6FF)'}}>
                        <p className="text-sm font-bold text-gray-800 mb-1">🛤️ How JSS Pathways Work</p>
                        <p className="text-xs text-gray-600">After completing Grade 9, students choose one of 4 pathways for Senior Secondary (Grade 10–12). Selection is based on student interest, competency performance, and career aspirations. Schools must record pathway preferences in Grade 9.</p>
                    </div>

                    {/* Pathway cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {JSS_PATHWAYS.map(p=>{
                            const selected = students.filter(s=>s.pathway_preference===p.id);
                            const pct = students.filter(s=>s.form_id&&allForms.find((f:any)=>f.id===s.form_id&&f.form_level===9)).length > 0 
                                ? Math.round(selected.length / Math.max(1,students.filter(s=>s.form_id&&allForms.find((f:any)=>f.id===s.form_id&&f.form_level===9)).length) * 100) : 0;
                            return (
                                <div key={p.id} className="bg-white rounded-2xl shadow-sm border-2 overflow-hidden" style={{borderColor:p.color+'33'}}>
                                    <div className="px-5 py-4" style={{background:`linear-gradient(135deg,${p.color}15,white)`}}>
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md flex-shrink-0" style={{background:p.color}}>{p.icon}</div>
                                            <div className="flex-1">
                                                <h3 className="font-black text-gray-800 text-lg">{p.name}</h3>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs" style={{color:p.color}}>{selected.length} students selected</span>
                                                    <span className="text-sm font-black" style={{color:p.color}}>{pct}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:p.color}}/>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-3">{p.description}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Key Subjects</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {p.subjects.slice(0,4).map(s=><span key={s} className="px-1.5 py-0.5 rounded text-[9px]" style={{background:p.color+'18',color:p.color}}>{s}</span>)}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Career Paths</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {p.career_paths.slice(0,4).map(c=><span key={c} className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 text-gray-600">{c}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {selected.length>0&&(
                                        <div className="px-5 py-3 border-t border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Students Who Selected {p.name}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {selected.slice(0,10).map(s=>(
                                                    <span key={s.id} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-100 text-gray-700">{s.first_name} {s.last_name.charAt(0)}.</span>
                                                ))}
                                                {selected.length>10&&<span className="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-400">+{selected.length-10} more</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grade 9 students pathway assignment */}
                    {students.filter(s=>allForms.find((f:any)=>f.id===s.form_id&&f.form_level===9)).length>0&&(
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-800">Grade 9 — Pathway Assignment</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Assign senior secondary pathways to Grade 9 students</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-4 py-2 text-left">Student</th>
                                        <th className="px-4 py-2 text-left">Adm No</th>
                                        <th className="px-4 py-2 text-left">Gender</th>
                                        <th className="px-4 py-2 text-left">Pathway Selection</th>
                                        <th className="px-4 py-2 text-center">Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {students.filter(s=>allForms.find((f:any)=>f.id===s.form_id&&f.form_level===9)).map((stu,i)=>(
                                            <tr key={stu.id} className={`border-b border-gray-50 hover:bg-blue-50/30 ${i%2===0?'bg-white':'bg-gray-50/30'}`}>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{stu.first_name} {stu.last_name}</td>
                                                <td className="px-4 py-3 text-xs text-blue-600">{stu.admission_no||'—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{stu.gender||'—'}</td>
                                                <td className="px-4 py-3">
                                                    <select className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                        value={stu.pathway_preference||''}
                                                        onChange={e=>savePathway(stu.id,e.target.value)}>
                                                        <option value="">— Select Pathway —</option>
                                                        {JSS_PATHWAYS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {stu.pathway_preference
                                                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">✓ Selected</span>
                                                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Pending</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════ STUDENTS ════════════════════════════ */}
            {tab==='students'&&(
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-black text-gray-800 text-lg">JSS Students — Grade 7, 8 & 9</h2>
                            <p className="text-xs text-gray-500">{students.length} enrolled students across all JSS grades</p>
                        </div>
                        <Link href="/dashboard/students/admissions" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <FiPlus size={14}/>Enroll Student
                        </Link>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Search JSS students by name, admission number, form…" value={search} onChange={e=>setSearch(e.target.value)}/>
                    </div>

                    {/* Grade breakdown */}
                    <div className="grid grid-cols-3 gap-3">
                        {[7,8,9].map(level=>{
                            const gc=gradeColor(level);
                            const cnt=students.filter(s=>allForms.find((f:any)=>f.id===s.form_id&&f.form_level===level)).length;
                            return (
                                <div key={level} className="rounded-xl p-4 flex items-center gap-3" style={{background:gc.bg,border:`2px solid ${gc.ring}`}}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{background:gc.fg}}>{level}</div>
                                    <div><p className="text-2xl font-black" style={{color:gc.fg}}>{cnt}</p><p className="text-xs text-gray-500">Grade {level} students</p></div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-1">#</div>
                            <div className="col-span-3">Student</div>
                            <div className="col-span-2">Admission No</div>
                            <div className="col-span-2">Form/Grade</div>
                            <div className="col-span-1 text-center">Gender</div>
                            <div className="col-span-3">Pathway Preference</div>
                        </div>
                        {filteredStudents.length===0&&<div className="py-16 text-center text-gray-400 text-sm">{students.length===0?'No JSS students enrolled':'No results for your search'}</div>}
                        {filteredStudents.map((stu,i)=>{
                            const level = allForms.find((f:any)=>f.id===stu.form_id)?.form_level;
                            const gc = level ? gradeColor(level) : {bg:'#F8FAFC',fg:'#64748B',ring:'#E2E8F0'};
                            const pathway = JSS_PATHWAYS.find(p=>p.id===stu.pathway_preference);
                            return (
                                <div key={stu.id} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 items-center hover:bg-blue-50/20 ${i%2===0?'bg-white':'bg-gray-50/30'}`}>
                                    <div className="col-span-1 text-xs font-bold text-gray-400">{i+1}</div>
                                    <div className="col-span-3"><p className="text-sm font-bold text-gray-800">{stu.first_name} {stu.last_name}</p></div>
                                    <div className="col-span-2"><p className="text-xs text-blue-600 font-mono">{stu.admission_no||'—'}</p></div>
                                    <div className="col-span-2">
                                        <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{background:gc.bg,color:gc.fg}}>{stu.form_name}</span>
                                    </div>
                                    <div className="col-span-1 text-center text-xs text-gray-500">{stu.gender?.charAt(0)||'—'}</div>
                                    <div className="col-span-3">
                                        {pathway ? (
                                            <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{background:pathway.color+'18',color:pathway.color}}>{pathway.icon} {pathway.name}</span>
                                        ) : level===9 ? (
                                            <select className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none" value="" onChange={e=>savePathway(stu.id,e.target.value)}>
                                                <option value="">Select pathway…</option>
                                                {JSS_PATHWAYS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">Grade {level} — pathway in Grade 9</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════ TIMETABLE GUIDE ════════════════════ */}
            {tab==='timetable'&&(
                <div className="space-y-5">
                    <div>
                        <h2 className="font-black text-gray-800 text-lg">JSS Period Allocation Guide</h2>
                        <p className="text-xs text-gray-500">KICD recommended weekly periods per subject for Grade 7–9</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-6 gap-0 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-2">Subject</div>
                            <div className="text-center">G7</div><div className="text-center">G8</div><div className="text-center">G9</div>
                            <div className="text-center">Assessment</div>
                        </div>
                        {JSS_SUBJECTS_OFFICIAL.map((subj,i)=>(
                            <div key={i} className={`grid grid-cols-6 gap-0 px-5 py-3 border-b border-gray-50 items-center hover:bg-blue-50/20 ${i%2===0?'bg-white':'bg-gray-50/20'}`}>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white flex-shrink-0" style={{background:subj.category==='Core'?'#2563EB':'#7C3AED'}}>{subj.subject_code.slice(0,2)}</div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{subj.subject_name}</p>
                                        <span className={`text-[9px] font-bold ${subj.category==='Core'?'text-blue-600':'text-purple-600'}`}>{subj.category}</span>
                                    </div>
                                </div>
                                {['7','8','9'].map(g=>(
                                    <div key={g} className="text-center">
                                        {subj.grade_levels.includes(g) ? (
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm" style={{background:'#EFF6FF',color:'#2563EB'}}>{subj.weekly_periods}</div>
                                        ) : <span className="text-gray-300">—</span>}
                                    </div>
                                ))}
                                <div className="text-center">
                                    <div className="text-[10px]">
                                        <span className="font-bold text-green-700">{subj.assessment_sba}% SBA</span>
                                        {subj.assessment_knec>0&&<span className="text-gray-400"> + {subj.assessment_knec}% KNEC</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="px-5 py-3 bg-blue-50 flex items-center justify-between">
                            <div className="text-sm font-bold text-blue-800">Total Weekly Periods</div>
                            <div className="font-black text-blue-800">{JSS_SUBJECTS_OFFICIAL.filter(s=>s.category==='Core').reduce((a,s)=>a+s.weekly_periods,0)} periods/week (Core)</div>
                        </div>
                    </div>
                    <Link href="/dashboard/timetable" className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white w-full" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                        <FiCalendar size={14}/>Open Full Timetable Manager →
                    </Link>
                </div>
            )}

            {/* ══════════════════ SETTINGS ════════════════════════════ */}
            {tab==='settings'&&(
                <div className="space-y-5">
                    <h2 className="font-black text-gray-800 text-lg">JSS System Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* SQL setup */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiShield size={16} className="text-blue-600"/>Database Setup SQL</h3>
                            <p className="text-xs text-gray-500 mb-3">Run this in your Supabase SQL Editor to enable all JSS features:</p>
                            <pre className="bg-gray-900 text-green-400 text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48">{SQL_JSS}</pre>
                            <button onClick={()=>{navigator.clipboard.writeText(SQL_JSS);toast.success('SQL copied!');}} className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                                <FiDownload size={12}/>Copy SQL
                            </button>
                        </div>

                        {/* Links */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiArrowRight size={16} className="text-green-600"/>JSS Integration Links</h3>
                            <div className="space-y-2">
                                {[{href:'/dashboard/exams/sba-manager',l:'SBA Manager',d:'Manage Grade 7-9 SBA tasks',ic:FiAward,c:'#059669'},
                                  {href:'/dashboard/cbc/portfolio',l:'Student Portfolio',d:'Grade 7-9 evidence portfolios',ic:FiFolder,c:'#F59E0B'},
                                  {href:'/dashboard/exams/cbc-marks',l:'CBC Mark Entry',d:'Enter JSS competency marks',ic:FiFileText,c:'#6366F1'},
                                  {href:'/dashboard/exams/cbc-report-cards',l:'CBC Report Cards',d:'Generate JSS report cards',ic:FiFileText,c:'#059669'},
                                  {href:'/dashboard/curriculum/kicd-alignment',l:'KICD Alignment',d:'Track curriculum coverage',ic:FiCheckCircle,c:'#2563EB'},
                                  {href:'/dashboard/timetable',l:'Timetable Manager',d:'JSS period allocation',ic:FiCalendar,c:'#7C3AED'},
                                  {href:'/dashboard/students',l:'Student Management',d:'Enroll & manage JSS students',ic:FiUsers,c:'#DC2626'},
                                  {href:'/dashboard/subjects',l:'Subjects Manager',d:'Manage all school subjects',ic:FiBook,c:'#D97706'},
                                ].map(l=>(
                                    <Link key={l.href} href={l.href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:l.c+'18'}}><l.ic size={14} style={{color:l.c}}/></div>
                                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{l.l}</p><p className="text-[10px] text-gray-400 truncate">{l.d}</p></div>
                                        <FiChevronRight size={12} className="text-gray-300 group-hover:text-blue-400 flex-shrink-0"/>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ CREATE GRADE MODAL ══════════════════ */}
            {showCreateForm&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(245,158,11,0.2)'}}><FiBook size={18} color="#F59E0B"/></div>
                                <div><h2 className="text-lg font-black text-white">Add JSS Grade</h2><p className="text-blue-200 text-xs">Create Grade 7, 8 or 9</p></div>
                            </div>
                            <button onClick={()=>setShowForm(false)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Grade Name <span className="text-red-500">*</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Grade 7, Grade 8, Grade 9" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Grade Level</label>
                                <div className="flex gap-2">
                                    {[7,8,9].map(l=>{
                                        const gc=gradeColor(l);
                                        return <button key={l} onClick={()=>setFormData({...formData,form_level:l,name:`Grade ${l}`})} className={`flex-1 py-3 rounded-xl font-black text-lg border-2 transition-all`} style={formData.form_level===l?{background:gc.fg,color:'#fff',borderColor:gc.fg}:{background:gc.bg,color:gc.fg,borderColor:gc.ring}}>G{l}</button>;
                                    })}
                                </div>
                            </div>
                            <div className="rounded-xl p-3 bg-blue-50 border border-blue-200 text-xs text-blue-700">
                                <p className="font-bold mb-1">📋 This will create a JSS grade with:</p>
                                <ul className="space-y-0.5 list-disc list-inside text-blue-600">
                                    <li>Education system set to <strong>CBC_JSS</strong></li>
                                    <li>13 official KICD subjects available</li>
                                    <li>SBA 40% + KNEC 60% assessment model</li>
                                    <li>EE/ME/AE/BE competency levels</li>
                                </ul>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={createGrade} disabled={savingForm} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                                    {savingForm?<><FiRefreshCw size={14} className="animate-spin"/>Creating…</>:<><FiCheck size={14}/>Create Grade {formData.form_level}</>}
                                </button>
                                <button onClick={()=>setShowForm(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ CREATE STREAM MODAL ═════════════════ */}
            {showCreateStream&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(56,189,248,0.2)'}}><FiLayers size={18} color="#38BDF8"/></div>
                                <div><h2 className="text-lg font-black text-white">Add Stream / Class</h2><p className="text-blue-200 text-xs">e.g. Grade 7A, Grade 7B</p></div>
                            </div>
                            <button onClick={()=>setShowStream(false)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Grade</label>
                                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={streamData.form_id} onChange={e=>setStreamData({...streamData,form_id:e.target.value})}>
                                    <option value="">Select grade…</option>
                                    {forms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Stream Name <span className="text-red-500">*</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. 7A, East, North, Kilimanjaro" value={streamData.stream_name} onChange={e=>setStreamData({...streamData,stream_name:e.target.value})}/>
                                <p className="text-[10px] text-gray-400 mt-1">Common: A, B, C or directional names (East, West) or mountain names</p>
                            </div>
                            <div className="flex gap-2">
                                {['7A','7B','8A','8B','9A','9B'].map(n=>(
                                    <button key={n} onClick={()=>setStreamData({...streamData,stream_name:n})} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${streamData.stream_name===n?'bg-blue-600 text-white border-blue-600':'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}>{n}</button>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={createStream} disabled={savingForm} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                                    {savingForm?<><FiRefreshCw size={14} className="animate-spin"/>Creating…</>:<><FiCheck size={14}/>Create Stream</>}
                                </button>
                                <button onClick={()=>setShowStream(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
