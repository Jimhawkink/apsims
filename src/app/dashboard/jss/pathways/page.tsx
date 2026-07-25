'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiTarget, FiUsers, FiUser, FiBook, FiAward, FiCheck, FiX, FiPlus,
    FiSearch, FiDownload, FiUpload, FiRefreshCw, FiArrowRight, FiStar,
    FiBarChart2, FiShield, FiFileText, FiGrid, FiList, FiCheckCircle,
    FiAlertCircle, FiClock, FiEdit2, FiTrash2, FiLayers, FiZap,
    FiTrendingUp, FiActivity, FiMessageSquare, FiMail, FiCalendar,
    FiChevronRight, FiChevronDown, FiChevronUp, FiInfo, FiGlobe,
    FiCopy, FiSend, FiEye, FiFolder, FiBookOpen, FiPieChart,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── Types ────────────────────────────────────────────────────────────────────
type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type PathwayId = 'stem' | 'social' | 'arts' | 'tvet';
type SelectionStatus = 'pending' | 'counseled' | 'selected' | 'parent_approved' | 'confirmed' | 'appealing';
type Tab = 'overview' | 'students' | 'pathways' | 'counseling' | 'consent' | 'transition' | 'analytics' | 'settings';

interface PathwayDef {
    id: PathwayId; name: string; icon: string; color: string; lightBg: string;
    description: string; vision: string;
    knec_code: string; min_competency: CompLevel;
    core_subjects: string[]; elective_subjects: string[];
    career_clusters: string[]; university_options: string[];
    tvet_options?: string[];
}

interface Student {
    id: number; first_name: string; last_name: string; admission_no?: string;
    form_id?: number; form_name?: string; gender?: string;
    pathway_preference?: PathwayId; pathway_selected_at?: string;
    pathway_counselor_notes?: string; pathway_status?: SelectionStatus;
    parent_consent?: boolean; parent_consent_date?: string;
    cbc_avg_level?: CompLevel; nemis_no?: string;
    guardian_name?: string; guardian_phone?: string; guardian_email?: string;
}

interface CounselingRecord {
    id: string; student_id: number; student_name?: string;
    counselor_name: string; session_date: string; notes: string;
    recommended_pathway?: PathwayId; student_interest?: PathwayId;
    action_items?: string; follow_up_date?: string;
    created_at: string;
}

interface TransitionRecord {
    id: string; student_id: number; student_name?: string; form_name?: string;
    pathway: PathwayId; target_school?: string; target_form?: string;
    transition_date?: string; status: 'pending'|'admitted'|'deferred'|'transferred';
    notes?: string;
}

// ─── Official Pathways ────────────────────────────────────────────────────────
const PATHWAYS: Record<PathwayId, PathwayDef> = {
    stem: {
        id:'stem', name:'STEM', icon:'⚗️', color:'#2563EB', lightBg:'#EFF6FF',
        description:'Science, Technology, Engineering and Mathematics',
        vision:'Produce innovators, scientists, engineers and technology leaders for Kenya\'s Vision 2030.',
        knec_code:'SS-STEM', min_competency:'ME',
        core_subjects:['Mathematics','Physics','Chemistry','Biology','Computer Science'],
        elective_subjects:['Technical Drawing','Further Mathematics','Geography','Applied Science'],
        career_clusters:['Medicine & Health','Engineering','Information Technology','Astronomy','Environmental Science','Pure Science Research'],
        university_options:['BSc Medicine','BEng Computer Science','BSc Mathematics','BPharm Pharmacy','BSc Agriculture','BEng Mechanical'],
        tvet_options:['Medical Laboratory Technician','ICT Technician','Engineering Technician'],
    },
    social: {
        id:'social', name:'Social Sciences', icon:'🌍', color:'#059669', lightBg:'#F0FDF4',
        description:'Humanities, Languages, Business and Social Studies',
        vision:'Develop critical thinkers, communicators and leaders who shape society and governance.',
        knec_code:'SS-SOC', min_competency:'ME',
        core_subjects:['History & Government','Geography','Economics','English','Kiswahili'],
        elective_subjects:['Business Studies','Religious Education','French','Sociology','Literature'],
        career_clusters:['Law & Justice','Economics & Finance','Education','Journalism','Diplomacy & Foreign Affairs','Social Work'],
        university_options:['LLB Law','BA Economics','BEd Arts','BA Journalism','BA International Relations','BSW Social Work'],
    },
    arts: {
        id:'arts', name:'Arts & Sports Sciences', icon:'🎨', color:'#D97706', lightBg:'#FEF3C7',
        description:'Creative Arts, Performing Arts, Music, Physical Education and Sports Science',
        vision:'Nurture Kenya\'s creative and sporting talent for global cultural leadership.',
        knec_code:'SS-ARTS', min_competency:'AE',
        core_subjects:['Visual Arts','Music','Performing Arts','Physical Education','Life Skills'],
        elective_subjects:['Home Science','Media Studies','Design & Technology','Sports Science'],
        career_clusters:['Visual Arts & Design','Music & Entertainment','Sports & Athletics','Filmmaking','Fashion Design','Education (Arts)'],
        university_options:['BA Fine Arts','BMus Music','BSc Sports Science','BEd Physical Education','BA Film Studies','BA Fashion Design'],
        tvet_options:['Certificate in Graphic Design','Diploma in Music Production','Certificate in Sports Coaching'],
    },
    tvet: {
        id:'tvet', name:'TVET', icon:'🔧', color:'#7C3AED', lightBg:'#F5F3FF',
        description:'Technical and Vocational Education and Training',
        vision:'Equip learners with practical skills for immediate employment and entrepreneurship in technical trades.',
        knec_code:'SS-TVET', min_competency:'AE',
        core_subjects:['Mathematics','Integrated Science','Pre-Technical Studies','Business Studies','Life Skills'],
        elective_subjects:['Building Technology','Electrical Engineering','Motor Vehicle Technology','ICT','Catering & Nutrition','Agriculture Technology'],
        career_clusters:['Electrical & Electronics','Building & Construction','Automotive Technology','Hospitality','ICT & Digital','Agriculture & Food'],
        university_options:['Diploma Electrical Engineering','Diploma ICT','Certificate Motor Vehicle','Diploma Catering'],
        tvet_options:['Artisan Certificate','Craft Certificate','Diploma — KNEC accredited','Higher National Diploma'],
    },
};

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<SelectionStatus,{label:string;color:string;bg:string;next?:SelectionStatus}> = {
    pending:        { label:'Pending',         color:'#64748B', bg:'#F1F5F9', next:'counseled' },
    counseled:      { label:'Counseled',       color:'#2563EB', bg:'#DBEAFE', next:'selected' },
    selected:       { label:'Pathway Selected',color:'#D97706', bg:'#FEF3C7', next:'parent_approved' },
    parent_approved:{ label:'Parent Approved', color:'#059669', bg:'#D1FAE5', next:'confirmed' },
    confirmed:      { label:'Confirmed ✓',     color:'#065F46', bg:'#A7F3D0', next:undefined },
    appealing:      { label:'Appeal Filed',    color:'#DC2626', bg:'#FEE2E2', next:'counseled' },
};

const COMP: Record<CompLevel,{color:string;bg:string;score:number}> = {
    EE:{ color:'#059669', bg:'#D1FAE5', score:4 },
    ME:{ color:'#2563EB', bg:'#DBEAFE', score:3 },
    AE:{ color:'#D97706', bg:'#FEF3C7', score:2 },
    BE:{ color:'#DC2626', bg:'#FEE2E2', score:1 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const compBadge = (l?: CompLevel) => {
    if (!l) return <span className="text-[10px] text-gray-400">—</span>;
    const c = COMP[l];
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.color }}>{l}</span>;
};
const statusBadge = (s?: SelectionStatus) => {
    if (!s) return statusBadge('pending');
    const st = STATUS[s];
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>;
};
const pwBadge = (id?: PathwayId) => {
    if (!id) return <span className="text-[10px] text-gray-400 italic">Not selected</span>;
    const p = PATHWAYS[id];
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: p.lightBg, color: p.color }}>{p.icon} {p.name}</span>;
};
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const SQL = `-- Pathway Selection Module Tables
-- 1. Add pathway columns to school_students
ALTER TABLE school_students
  ADD COLUMN IF NOT EXISTS pathway_preference text,
  ADD COLUMN IF NOT EXISTS pathway_selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathway_counselor_notes text,
  ADD COLUMN IF NOT EXISTS pathway_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS parent_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_consent_date timestamptz;

-- 2. Counseling records
CREATE TABLE IF NOT EXISTS school_pathway_counseling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id bigint REFERENCES school_students(id) ON DELETE CASCADE,
  counselor_name text NOT NULL,
  session_date date NOT NULL,
  notes text, recommended_pathway text, student_interest text,
  action_items text, follow_up_date date,
  created_at timestamptz DEFAULT now()
);

-- 3. Senior Secondary transition records
CREATE TABLE IF NOT EXISTS school_pathway_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id bigint REFERENCES school_students(id) ON DELETE CASCADE,
  pathway text NOT NULL, target_school text, target_form text,
  transition_date date, status text DEFAULT 'pending', notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. cbc_pathways (if not exists)
CREATE TABLE IF NOT EXISTS cbc_pathways (
  id serial PRIMARY KEY, name text NOT NULL,
  description text, knec_code text, color text, is_active boolean DEFAULT true
);
INSERT INTO cbc_pathways (name, description, knec_code, color) VALUES
  ('STEM', 'Science, Technology, Engineering and Mathematics', 'SS-STEM', '#2563EB'),
  ('Social Sciences', 'Humanities, Languages, Business', 'SS-SOC', '#059669'),
  ('Arts & Sports Sciences', 'Creative Arts and Physical Education', 'SS-ARTS', '#D97706'),
  ('TVET', 'Technical and Vocational Education', 'SS-TVET', '#7C3AED')
ON CONFLICT DO NOTHING;

ALTER TABLE school_pathway_counseling ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_pathway_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_pathway_counseling FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_pathway_transitions FOR ALL USING (true) WITH CHECK (true);`;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function PathwaySelectionPage() {
    const [tab, setTab]                   = useState<Tab>('overview');
    const [students, setStudents]         = useState<Student[]>([]);
    const [forms, setForms]               = useState<any[]>([]);
    const [counseling, setCounseling]     = useState<CounselingRecord[]>([]);
    const [transitions, setTransitions]   = useState<TransitionRecord[]>([]);
    const [loading, setLoading]           = useState(true);
    const [dbReady, setDbReady]           = useState(false);
    const [search, setSearch]             = useState('');
    const [fPathway, setFPathway]         = useState<PathwayId|''>('');
    const [fStatus, setFStatus]           = useState<SelectionStatus|''>('');
    const [fGender, setFGender]           = useState('');
    const [viewStudent, setViewStudent]   = useState<Student|null>(null);
    const [showCounsel, setShowCounsel]   = useState(false);
    const [showBulkAssign, setShowBulk]   = useState(false);
    const [showTransition, setShowTrans]  = useState(false);
    const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set());
    const [saving, setSaving]             = useState(false);
    const [expandedPathway, setExpanded]  = useState<PathwayId|null>('stem');

    const emptyCounsel = { student_id:'', counselor_name:'', session_date: new Date().toISOString().split('T')[0], notes:'', recommended_pathway:'' as PathwayId|'', student_interest:'' as PathwayId|'', action_items:'', follow_up_date:'' };
    const [counselForm, setCounselForm]   = useState(emptyCounsel);
    const emptyTrans = { student_id:'', pathway:'' as PathwayId|'', target_school:'', target_form:'Grade 10', transition_date:'', status:'pending' as TransitionRecord['status'], notes:'' };
    const [transForm, setTransForm]       = useState(emptyTrans);
    const [bulkPathway, setBulkPathway]   = useState<PathwayId|''>('');

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [fmsR, stuR] = await Promise.all([
                sb.from('school_forms').select('id,name,form_name,form_level').order('form_level'),
                sb.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender,guardian_name,guardian_phone,guardian_email,pathway_preference,pathway_selected_at,pathway_counselor_notes,pathway_status,parent_consent,parent_consent_date,nemis_no').order('first_name').limit(2000),
            ]);
            const fmsData = fmsR.data || [];
            setForms(fmsData);
            const fmMap: Record<number,{name:string;level:number}> = {};
            fmsData.forEach((f:any) => { fmMap[f.id] = { name: f.form_name||f.name||`Grade ${f.form_level}`, level: f.form_level }; });

            const allStu = (stuR.data || []).map((s:any) => ({
                ...s, form_name: fmMap[s.form_id]?.name || '—',
            }));
            // G9 students only
            const g9Ids = new Set(fmsData.filter((f:any)=>f.form_level===9).map((f:any)=>f.id));
            const g9Stu = allStu.filter((s:any) => g9Ids.has(s.form_id));
            setStudents(g9Stu.length > 0 ? g9Stu : allStu.filter((s:any) => fmMap[s.form_id]?.level >= 7));

            // Check counseling table
            const { error: cErr } = await sb.from('school_pathway_counseling').select('id').limit(1);
            const ready = !cErr || cErr.code !== '42P01';
            setDbReady(ready);

            if (ready) {
                const [cR, tR] = await Promise.all([
                    sb.from('school_pathway_counseling').select('*').order('created_at', { ascending: false }),
                    sb.from('school_pathway_transitions').select('*').order('created_at', { ascending: false }),
                ]);
                const stuMap: Record<number,Student> = {};
                allStu.forEach((s:any) => { stuMap[s.id] = s; });
                if (cR.data) setCounseling(cR.data.map((c:any) => ({ ...c, student_name: stuMap[c.student_id] ? `${stuMap[c.student_id].first_name} ${stuMap[c.student_id].last_name}` : '—' })));
                if (tR.data) setTransitions(tR.data.map((t:any) => ({ ...t, student_name: stuMap[t.student_id] ? `${stuMap[t.student_id].first_name} ${stuMap[t.student_id].last_name}` : '—', form_name: stuMap[t.student_id]?.form_name || '—' })));
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    }

    const filtered = useMemo(() => students.filter(s =>
        (!search || `${s.first_name} ${s.last_name} ${s.admission_no||''} ${s.form_name||''} ${s.guardian_name||''}`.toLowerCase().includes(search.toLowerCase()))
        && (!fPathway || s.pathway_preference === fPathway)
        && (!fStatus || (s.pathway_status||'pending') === fStatus)
        && (!fGender || s.gender === fGender)
    ), [students, search, fPathway, fStatus, fGender]);

    const stats = useMemo(() => {
        const dist: Record<PathwayId,number> = { stem:0, social:0, arts:0, tvet:0 };
        students.forEach(s => { if(s.pathway_preference && dist[s.pathway_preference]!==undefined) dist[s.pathway_preference]++; });
        return {
            total: students.length,
            selected: students.filter(s=>s.pathway_preference).length,
            pending: students.filter(s=>!s.pathway_preference||(s.pathway_status||'pending')==='pending').length,
            confirmed: students.filter(s=>s.pathway_status==='confirmed').length,
            parentApproved: students.filter(s=>s.parent_consent).length,
            counseled: counseling.length,
            dist,
            genderM: students.filter(s=>s.gender==='Male').length,
            genderF: students.filter(s=>s.gender==='Female').length,
        };
    }, [students, counseling]);

    async function assignPathway(studentId: number, pathway: PathwayId) {
        const payload = { pathway_preference: pathway, pathway_selected_at: new Date().toISOString(), pathway_status: 'selected' };
        await sb.from('school_students').update(payload).eq('id', studentId);
        setStudents(p => p.map(s => s.id === studentId ? { ...s, ...payload } : s));
        if (viewStudent?.id === studentId) setViewStudent(v => v ? { ...v, ...payload } : v);
        toast.success(`✅ ${PATHWAYS[pathway].name} pathway assigned!`);
    }

    async function updateStatus(studentId: number, status: SelectionStatus) {
        await sb.from('school_students').update({ pathway_status: status }).eq('id', studentId);
        setStudents(p => p.map(s => s.id === studentId ? { ...s, pathway_status: status } : s));
        if (viewStudent?.id === studentId) setViewStudent(v => v ? { ...v, pathway_status: status } : v);
        toast.success(`Status updated to: ${STATUS[status].label}`);
    }

    async function toggleConsent(studentId: number, current?: boolean) {
        const val = !current;
        const payload = { parent_consent: val, parent_consent_date: val ? new Date().toISOString() : null };
        await sb.from('school_students').update(payload).eq('id', studentId);
        setStudents(p => p.map(s => s.id === studentId ? { ...s, ...payload } : s));
        if (viewStudent?.id === studentId) setViewStudent(v => v ? { ...v, ...payload } : v);
        toast.success(val ? '✅ Parent consent recorded!' : 'Consent removed');
    }

    async function saveCounseling() {
        if (!counselForm.student_id || !counselForm.counselor_name) { toast.error('Fill student and counselor'); return; }
        setSaving(true);
        try {
            const payload = { student_id: Number(counselForm.student_id), counselor_name: counselForm.counselor_name, session_date: counselForm.session_date, notes: counselForm.notes, recommended_pathway: counselForm.recommended_pathway||null, student_interest: counselForm.student_interest||null, action_items: counselForm.action_items, follow_up_date: counselForm.follow_up_date||null };
            if (dbReady) {
                const { error } = await sb.from('school_pathway_counseling').insert(payload);
                if (error) throw error;
                // Update student status
                await sb.from('school_students').update({ pathway_status:'counseled', pathway_counselor_notes:counselForm.notes }).eq('id', Number(counselForm.student_id));
            }
            const stu = students.find(s => s.id === Number(counselForm.student_id));
            setCounseling(p => [{ id:`c-${Date.now()}`, ...payload, student_name: stu ? `${stu.first_name} ${stu.last_name}` : '—', created_at: new Date().toISOString() } as CounselingRecord, ...p]);
            setStudents(p => p.map(s => s.id === Number(counselForm.student_id) ? { ...s, pathway_status:'counseled' } : s));
            toast.success('✅ Counseling record saved!'); setShowCounsel(false); setCounselForm(emptyCounsel);
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSaving(false);
    }

    async function bulkAssignPathway() {
        if (!bulkPathway || selectedIds.size === 0) { toast.error('Select students and a pathway'); return; }
        setSaving(true);
        const ids = [...selectedIds];
        if (dbReady) {
            await sb.from('school_students').update({ pathway_preference: bulkPathway, pathway_selected_at: new Date().toISOString(), pathway_status: 'selected' }).in('id', ids);
        }
        setStudents(p => p.map(s => selectedIds.has(s.id) ? { ...s, pathway_preference: bulkPathway, pathway_status: 'selected' } : s));
        toast.success(`✅ ${PATHWAYS[bulkPathway].name} assigned to ${ids.length} students!`);
        setSelectedIds(new Set()); setBulkPathway(''); setShowBulk(false); setSaving(false);
    }

    async function saveTransition() {
        if (!transForm.student_id || !transForm.pathway) { toast.error('Fill student and pathway'); return; }
        setSaving(true);
        try {
            const payload = { student_id: Number(transForm.student_id), pathway: transForm.pathway, target_school: transForm.target_school, target_form: transForm.target_form, transition_date: transForm.transition_date||null, status: transForm.status, notes: transForm.notes };
            if (dbReady) {
                const { error } = await sb.from('school_pathway_transitions').insert(payload);
                if (error) throw error;
            }
            const stu = students.find(s => s.id === Number(transForm.student_id));
            setTransitions(p => [{ id:`t-${Date.now()}`, ...payload, pathway: payload.pathway as PathwayId, student_name: stu ? `${stu.first_name} ${stu.last_name}` : '—', form_name: stu?.form_name||'—' }, ...p]);
            toast.success('✅ Transition record saved!'); setShowTrans(false); setTransForm(emptyTrans);
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSaving(false);
    }

    function exportCSV() {
        const rows = [['Adm No','Student Name','Form','Gender','Pathway','Status','Parent Consent','Selected At','Counselor Notes','NEMIS No']];
        students.forEach(s => rows.push([s.admission_no||'', `${s.first_name} ${s.last_name}`, s.form_name||'', s.gender||'', s.pathway_preference||'', s.pathway_status||'pending', s.parent_consent?'Yes':'No', s.pathway_selected_at?fmtDate(s.pathway_selected_at):'', s.pathway_counselor_notes||'', s.nemis_no||'']));
        const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], { type:'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pathway_selections.csv'; a.click();
        toast.success('CSV exported!');
    }

    const toggle = (id:number) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiTarget size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading Pathway Selection Module...</p>
                <p className="text-sm text-gray-500 mt-1">Grade 9 → Senior Secondary Transition · Kenya CBC</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fdf4ff 50%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1A2040 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/jss/setup" className="hover:text-white">JSS Hub</Link><FiArrowRight size={10}/>
                        <span className="text-violet-400 font-semibold">🛤️ Pathway Selection</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>
                                <FiTarget size={30} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h1 className="text-2xl font-black text-white">Pathway Selection Module</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-400 text-violet-900">GRADE 9 → SS</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CBC 2025</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm">Grade 9 → Senior Secondary transition · STEM · Social Sciences · Arts & Sports · TVET</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {['Pathway Counseling','Parent Consent Tracking','Bulk Assignment','KNEC Codes','Career Mapping','Senior Secondary Transition','NEMIS Export'].map(tag=>(
                                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] text-blue-200 border border-white/10" style={{background:'rgba(255,255,255,0.07)'}}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={()=>setShowCounsel(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-violet-400/50 text-violet-300 hover:bg-violet-500/20 transition-all"><FiMessageSquare size={12}/>Log Counseling</button>
                            <button onClick={()=>setShowTrans(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-blue-400/50 text-blue-300 hover:bg-blue-500/20 transition-all"><FiArrowRight size={12}/>Transition Record</button>
                            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-green-400/50 text-green-300 hover:bg-green-500/20 transition-all"><FiDownload size={12}/>Export CSV</button>
                            <button onClick={()=>setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>
                                <FiZap size={15}/>Bulk Assign
                            </button>
                        </div>
                    </div>
                </div>
                {/* KPI bar */}
                <div className="grid grid-cols-4 lg:grid-cols-8 border-t border-white/10">
                    {[{l:'Grade 9 Students',v:stats.total,c:'#C084FC'},{l:'Pathway Selected',v:stats.selected,c:'#34D399'},{l:'Pending Selection',v:stats.pending,c:'#FCD34D'},{l:'Confirmed',v:stats.confirmed,c:'#60A5FA'},{l:'Parent Approved',v:stats.parentApproved,c:'#F472B6'},{l:'Counseled',v:stats.counseled,c:'#A78BFA'},{l:'Male',v:stats.genderM,c:'#38BDF8'},{l:'Female',v:stats.genderF,c:'#FB923C'}].map((s,i)=>(
                        <div key={i} className="px-3 py-3 flex items-center gap-2 border-r border-white/10 last:border-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:s.c+'22'}}><FiTarget size={11} style={{color:s.c}}/></div>
                            <div><div className="text-lg font-black leading-none" style={{color:s.c}}>{s.v}</div><div className="text-[9px] text-blue-300 leading-tight mt-0.5">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DB setup */}
            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — Pathway counseling tables not yet created</p>
                        <p className="text-sm text-amber-700 mt-1">Student pathway_preference is read from school_students. Counseling records require additional tables.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(SQL);toast.success('SQL copied!');}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiCopy size={12}/>Copy SQL</button>
                </div>
            )}

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                {([
                    ['overview','🏠 Overview',FiBarChart2],
                    ['students','👥 Students',FiUsers],
                    ['pathways','🛤️ Pathways',FiTarget],
                    ['counseling','🧑‍💼 Counseling',FiMessageSquare],
                    ['consent','✅ Parent Consent',FiCheckCircle],
                    ['transition','🎓 SS Transition',FiArrowRight],
                    ['analytics','📊 Analytics',FiPieChart],
                    ['settings','⚙️ Settings',FiShield],
                ] as const).map(([key,lbl,Ic])=>(
                    <button key={key} onClick={()=>setTab(key as Tab)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab===key?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===key?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={12}/>{lbl}
                    </button>
                ))}
            </div>

            {/* ══════════ OVERVIEW ══════════════════════════════════════ */}
            {tab==='overview'&&(
                <div className="space-y-5">
                    {/* Pathway distribution */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(Object.values(PATHWAYS) as PathwayDef[]).map(p=>{
                            const cnt = stats.dist[p.id]; const pct = stats.total>0?Math.round(cnt/stats.total*100):0;
                            return (
                                <div key={p.id} className="bg-white rounded-2xl shadow-sm border-2 p-5 hover:shadow-md cursor-pointer transition-all" style={{borderColor:p.color+'33'}} onClick={()=>{setTab('students');setFPathway(p.id);}}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{background:p.color}}>{p.icon}</div>
                                        <div><p className="text-2xl font-black" style={{color:p.color}}>{cnt}</p><p className="text-[10px] text-gray-500">students</p></div>
                                    </div>
                                    <p className="font-black text-gray-800 text-sm mb-0.5">{p.name}</p>
                                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{p.description}</p>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:p.color}}/>
                                    </div>
                                    <p className="text-[10px] font-bold mt-1" style={{color:p.color}}>{pct}% of Grade 9</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selection pipeline */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-black text-gray-800 mb-5 flex items-center gap-2"><FiActivity size={16} className="text-violet-600"/>Pathway Selection Pipeline</h3>
                        <div className="flex items-start gap-0 overflow-x-auto pb-2">
                            {(Object.entries(STATUS) as [SelectionStatus, typeof STATUS.pending][]).map(([key,s],i,arr)=>{
                                const cnt = students.filter(st=>(st.pathway_status||'pending')===key).length;
                                const pct = stats.total>0?Math.round(cnt/stats.total*100):0;
                                return (
                                    <div key={key} className="flex items-center">
                                        <div className="text-center min-w-[110px]">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black mx-auto mb-2 border-4" style={{background:s.bg,color:s.color,borderColor:s.color+'44'}}>{cnt}</div>
                                            <p className="text-xs font-bold text-gray-700 leading-tight">{s.label}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{pct}%</p>
                                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-2">
                                                <div className="h-full rounded-full" style={{width:`${pct}%`,background:s.color}}/>
                                            </div>
                                        </div>
                                        {i<arr.length-1&&<div className="flex-shrink-0 mx-1"><FiChevronRight size={18} className="text-gray-300"/></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Overview grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Quick actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 mb-4">⚡ Quick Actions</h3>
                            <div className="space-y-2">
                                {[{l:'Log Counseling Session',d:'Record individual student career counseling',ic:FiMessageSquare,c:'#7C3AED',action:()=>setShowCounsel(true)},
                                  {l:'Bulk Assign Pathways',d:'Assign pathway to multiple students at once',ic:FiZap,c:'#D97706',action:()=>setShowBulk(true)},
                                  {l:'Record SS Transition',d:'Log student Senior Secondary school placement',ic:FiArrowRight,c:'#059669',action:()=>setShowTrans(true)},
                                  {l:'View Pending Students',d:'Students still without pathway selection',ic:FiAlertCircle,c:'#DC2626',action:()=>{setFStatus('pending');setTab('students');}},
                                  {l:'Export Full Report',d:'Download all pathway data as CSV for NEMIS',ic:FiDownload,c:'#2563EB',action:exportCSV},
                                ].map((item,i)=>(
                                    <button key={i} onClick={item.action} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:item.c+'18'}}><item.ic size={16} style={{color:item.c}}/></div>
                                        <div><p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">{item.l}</p><p className="text-[10px] text-gray-500">{item.d}</p></div>
                                        <FiChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 ml-auto"/>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recent counseling */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-800">🧑‍💼 Recent Counseling Sessions</h3>
                                <button onClick={()=>setTab('counseling')} className="text-xs text-blue-600 font-semibold hover:underline">View all →</button>
                            </div>
                            {counseling.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-sm">
                                    <FiMessageSquare size={28} className="mx-auto mb-2 text-gray-200"/>
                                    <p>No counseling records yet</p>
                                    <button onClick={()=>setShowCounsel(true)} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#7C3AED'}}>Log First Session</button>
                                </div>
                            ) : counseling.slice(0,4).map(c=>{
                                const rp = c.recommended_pathway ? PATHWAYS[c.recommended_pathway] : null;
                                return (
                                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 mb-2 hover:border-violet-200 transition-colors">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>{c.counselor_name.charAt(0)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <p className="text-xs font-bold text-gray-800">{c.student_name}</p>
                                                {rp&&<span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{background:rp.lightBg,color:rp.color}}>{rp.icon} {rp.name}</span>}
                                            </div>
                                            <p className="text-[11px] text-gray-600 line-clamp-1">{c.notes}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{c.counselor_name} · {fmtDate(c.session_date)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ STUDENTS ══════════════════════════════════════ */}
            {tab==='students'&&(
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1">
                                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder="Search student, admission no, guardian…" value={search} onChange={e=>setSearch(e.target.value)}/>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(['stem','social','arts','tvet'] as PathwayId[]).map(p=>(
                                    <button key={p} onClick={()=>setFPathway(fPathway===p?'':p)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all" style={fPathway===p?{background:PATHWAYS[p].color,color:'#fff',borderColor:PATHWAYS[p].color}:{color:PATHWAYS[p].color,background:PATHWAYS[p].lightBg,borderColor:PATHWAYS[p].color+'44'}}>{PATHWAYS[p].icon} {PATHWAYS[p].name}</button>
                                ))}
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none" value={fStatus} onChange={e=>setFStatus(e.target.value as any)}>
                                    <option value="">All Statuses</option>
                                    {(Object.entries(STATUS) as any[]).map(([k,s]:any)=><option key={k} value={k}>{s.label}</option>)}
                                </select>
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none" value={fGender} onChange={e=>setFGender(e.target.value)}>
                                    <option value="">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            {selectedIds.size>0&&(
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-violet-700">{selectedIds.size} selected</span>
                                    <button onClick={()=>setShowBulk(true)} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700">Bulk Assign</button>
                                    <button onClick={()=>setSelectedIds(new Set())} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><FiX size={12}/></button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} students · {stats.selected} with pathway · {stats.pending} pending selection</p>
                    </div>

                    {/* Student table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-12 gap-1 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-1"><input type="checkbox" className="rounded" onChange={e=>{if(e.target.checked)setSelectedIds(new Set(filtered.map(s=>s.id)));else setSelectedIds(new Set());}}/></div>
                            <div className="col-span-2">Student</div>
                            <div className="col-span-1">Adm No</div>
                            <div className="col-span-1">Form</div>
                            <div className="col-span-1 text-center">Gender</div>
                            <div className="col-span-3">Pathway</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-1 text-center">Actions</div>
                        </div>
                        {filtered.length===0&&<div className="py-16 text-center text-gray-400 text-sm">No students found</div>}
                        {filtered.map((stu,i)=>(
                            <div key={stu.id} className={`grid grid-cols-12 gap-1 px-4 py-3 border-b border-gray-50 items-center hover:bg-violet-50/20 cursor-pointer transition-colors ${i%2===0?'bg-white':'bg-gray-50/20'} ${selectedIds.has(stu.id)?'bg-violet-50 border-violet-100':''}`} onClick={()=>setViewStudent(stu)}>
                                <div className="col-span-1" onClick={e=>e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedIds.has(stu.id)} onChange={()=>toggle(stu.id)}/></div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>{stu.first_name.charAt(0)}</div>
                                    <div><p className="text-sm font-bold text-gray-800 leading-tight">{stu.first_name} {stu.last_name}</p></div>
                                </div>
                                <div className="col-span-1"><p className="text-xs text-blue-600 font-mono">{stu.admission_no||'—'}</p></div>
                                <div className="col-span-1"><p className="text-xs text-gray-600">{stu.form_name}</p></div>
                                <div className="col-span-1 text-center"><span className="text-xs text-gray-500">{stu.gender?.charAt(0)||'—'}</span></div>
                                <div className="col-span-3">
                                    {stu.pathway_preference ? pwBadge(stu.pathway_preference as PathwayId) : (
                                        <div className="flex flex-wrap gap-1" onClick={e=>e.stopPropagation()}>
                                            {(['stem','social','arts','tvet'] as PathwayId[]).map(p=>(
                                                <button key={p} onClick={()=>assignPathway(stu.id,p)} className="px-1.5 py-1 rounded text-[9px] font-bold border transition-all hover:scale-105" style={{color:PATHWAYS[p].color,background:PATHWAYS[p].lightBg,borderColor:PATHWAYS[p].color+'44'}}>{PATHWAYS[p].icon}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-2">{statusBadge((stu.pathway_status||'pending') as SelectionStatus)}</div>
                                <div className="col-span-1 flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                                    {stu.pathway_preference&&!stu.parent_consent&&<button onClick={()=>toggleConsent(stu.id,false)} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Record Parent Consent"><FiCheckCircle size={13}/></button>}
                                    <button onClick={()=>setViewStudent(stu)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="View"><FiEye size={13}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════ PATHWAYS ══════════════════════════════════════ */}
            {tab==='pathways'&&(
                <div className="space-y-4">
                    <h2 className="font-black text-gray-800 text-lg">Senior Secondary Pathway Definitions</h2>
                    {(Object.values(PATHWAYS) as PathwayDef[]).map(p=>{
                        const isOpen = expandedPathway === p.id;
                        const stuCount = stats.dist[p.id];
                        return (
                            <div key={p.id} className="bg-white rounded-2xl shadow-sm border-2 overflow-hidden" style={{borderColor:p.color+'33'}}>
                                <div className="p-5 cursor-pointer" onClick={()=>setExpanded(isOpen?null:p.id)}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md flex-shrink-0" style={{background:p.color}}>{p.icon}</div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <h3 className="font-black text-gray-800 text-lg">{p.name}</h3>
                                                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-gray-100 text-gray-600">{p.knec_code}</span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:p.lightBg,color:p.color}}>{stuCount} students</span>
                                                </div>
                                                <p className="text-sm text-gray-500">{p.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-2xl font-black" style={{color:p.color}}>{stuCount}</p>
                                                <p className="text-[10px] text-gray-400">{stats.total>0?Math.round(stuCount/stats.total*100):0}% of G9</p>
                                            </div>
                                            {isOpen?<FiChevronUp size={20} className="text-gray-400"/>:<FiChevronDown size={20} className="text-gray-400"/>}
                                        </div>
                                    </div>
                                </div>
                                {isOpen&&(
                                    <div className="border-t border-gray-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-5" style={{background:p.lightBg+'66'}}>
                                        {/* Vision */}
                                        <div className="md:col-span-3 mb-2">
                                            <div className="rounded-xl p-4" style={{background:p.color+'12',border:`1px solid ${p.color}22`}}>
                                                <p className="text-xs font-bold mb-1" style={{color:p.color}}>🎯 Pathway Vision</p>
                                                <p className="text-sm text-gray-700">{p.vision}</p>
                                                <p className="text-xs text-gray-500 mt-1">Min. Competency Required: <strong>{p.min_competency}</strong> in core subjects · KNEC Code: <strong>{p.knec_code}</strong></p>
                                            </div>
                                        </div>
                                        {/* Subjects */}
                                        <div>
                                            <p className="text-xs font-black text-gray-600 uppercase mb-2">Core Subjects</p>
                                            <div className="space-y-1">
                                                {p.core_subjects.map(s=><div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{background:p.color+'18',color:p.color}}><FiCheck size={10}/>{s}</div>)}
                                            </div>
                                            <p className="text-xs font-black text-gray-600 uppercase mb-2 mt-3">Electives (choose 2)</p>
                                            <div className="space-y-1">
                                                {p.elective_subjects.map(s=><div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"><FiBook size={10}/>{s}</div>)}
                                            </div>
                                        </div>
                                        {/* Careers */}
                                        <div>
                                            <p className="text-xs font-black text-gray-600 uppercase mb-2">Career Clusters</p>
                                            <div className="space-y-1">
                                                {p.career_clusters.map(c=><div key={c} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{background:p.lightBg,color:p.color}}><FiStar size={10}/>{c}</div>)}
                                            </div>
                                        </div>
                                        {/* University / TVET */}
                                        <div>
                                            <p className="text-xs font-black text-gray-600 uppercase mb-2">University Programmes</p>
                                            <div className="space-y-1">
                                                {p.university_options.map(u=><div key={u} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700"><FiBookOpen size={10}/>{u}</div>)}
                                            </div>
                                            {p.tvet_options&&(<>
                                                <p className="text-xs font-black text-gray-600 uppercase mb-2 mt-3">TVET Options</p>
                                                <div className="space-y-1">
                                                    {p.tvet_options.map(t=><div key={t} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-purple-50 text-purple-700"><FiZap size={10}/>{t}</div>)}
                                                </div>
                                            </>)}
                                        </div>
                                        {/* Students in pathway */}
                                        <div className="md:col-span-3 border-t border-gray-200 pt-3">
                                            <p className="text-xs font-bold text-gray-600 mb-2">Students in {p.name} Pathway ({stuCount})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {students.filter(s=>s.pathway_preference===p.id).slice(0,20).map(s=>(
                                                    <div key={s.id} onClick={()=>setViewStudent(s)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer hover:shadow-sm transition-all" style={{background:p.lightBg,color:p.color}}>
                                                        <span className="font-bold">{s.first_name} {s.last_name.charAt(0)}.</span>
                                                        {s.pathway_status&&<span className="opacity-60">({STATUS[s.pathway_status as SelectionStatus]?.label||'—'})</span>}
                                                    </div>
                                                ))}
                                                {stuCount>20&&<span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-500">+{stuCount-20} more</span>}
                                                {stuCount===0&&<p className="text-xs text-gray-400 italic">No students selected this pathway yet</p>}
                                            </div>
                                            <button onClick={()=>{setFPathway(p.id);setTab('students');}} className="mt-2 flex items-center gap-1 text-xs font-semibold hover:underline" style={{color:p.color}}>View all in Students tab →</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════ COUNSELING ════════════════════════════════════ */}
            {tab==='counseling'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Career Counseling Records</h2><p className="text-xs text-gray-500">{counseling.length} sessions logged</p></div>
                        <button onClick={()=>setShowCounsel(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}><FiPlus size={14}/>Log Session</button>
                    </div>
                    {counseling.length===0&&<div className="py-16 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm"><FiMessageSquare size={32} className="mx-auto mb-2 text-gray-200"/><p>No counseling records yet</p><button onClick={()=>setShowCounsel(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#7C3AED'}}>Log First Session</button></div>}
                    <div className="space-y-3">
                        {counseling.map(c=>{
                            const rp = c.recommended_pathway ? PATHWAYS[c.recommended_pathway] : null;
                            const sp = c.student_interest ? PATHWAYS[c.student_interest] : null;
                            return (
                                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>{c.student_name?.charAt(0)||'?'}</div>
                                            <div>
                                                <p className="font-black text-gray-800">{c.student_name}</p>
                                                <p className="text-xs text-violet-600">Counselor: {c.counselor_name} · {fmtDate(c.session_date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {rp&&<div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:rp.lightBg,color:rp.color}}><FiTarget size={10}/>Recommended: {rp.name}</div>}
                                            {sp&&<div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:sp.lightBg,color:sp.color}}><FiStar size={10}/>Interest: {sp.name}</div>}
                                        </div>
                                    </div>
                                    {c.notes&&<div className="rounded-xl p-3 bg-gray-50 border border-gray-100 mb-3"><p className="text-xs font-bold text-gray-500 mb-1">Session Notes</p><p className="text-sm text-gray-700 leading-relaxed">{c.notes}</p></div>}
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                        {c.action_items&&<span className="flex items-center gap-1"><FiCheckCircle size={10} className="text-green-500"/>Action: {c.action_items}</span>}
                                        {c.follow_up_date&&<span className="flex items-center gap-1"><FiCalendar size={10} className="text-blue-500"/>Follow-up: {fmtDate(c.follow_up_date)}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════ CONSENT ═══════════════════════════════════════ */}
            {tab==='consent'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Parent Consent Tracking</h2><p className="text-xs text-gray-500">{stats.parentApproved} of {stats.selected} students with pathway have parent consent</p></div>
                        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border-2 border-green-300 text-green-700 hover:bg-green-50"><FiDownload size={14}/>Export</button>
                    </div>
                    {/* Consent progress */}
                    <div className="grid grid-cols-3 gap-4">
                        {[{l:'Consent Given',v:stats.parentApproved,c:'#059669'},{l:'Consent Pending',v:stats.selected-stats.parentApproved,c:'#D97706'},{l:'No Pathway Yet',v:stats.total-stats.selected,c:'#DC2626'}].map((s,i)=>(
                            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                                <p className="text-3xl font-black mb-1" style={{color:s.c}}>{s.v}</p>
                                <p className="text-xs text-gray-500">{s.l}</p>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{width:`${stats.total>0?Math.round(s.v/stats.total*100):0}%`,background:s.c}}/>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-10 gap-1 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-3">Student</div><div className="col-span-1">Form</div><div className="col-span-2">Pathway</div><div className="col-span-2">Status</div><div className="col-span-1 text-center">Consent</div><div className="col-span-1 text-center">Action</div>
                        </div>
                        {students.filter(s=>s.pathway_preference).map((stu,i)=>(
                            <div key={stu.id} className={`grid grid-cols-10 gap-1 px-4 py-3 border-b border-gray-50 items-center hover:bg-green-50/20 ${i%2===0?'bg-white':'bg-gray-50/20'}`}>
                                <div className="col-span-3"><p className="text-sm font-bold text-gray-800">{stu.first_name} {stu.last_name}</p><p className="text-[10px] text-gray-400">{stu.guardian_name||'—'} · {stu.guardian_phone||'—'}</p></div>
                                <div className="col-span-1 text-xs text-gray-600">{stu.form_name}</div>
                                <div className="col-span-2">{pwBadge(stu.pathway_preference as PathwayId)}</div>
                                <div className="col-span-2">{statusBadge((stu.pathway_status||'pending') as SelectionStatus)}</div>
                                <div className="col-span-1 text-center">{stu.parent_consent?<span className="text-green-600 font-bold text-xs">✓ Yes</span>:<span className="text-amber-500 font-bold text-xs">Pending</span>}</div>
                                <div className="col-span-1 text-center">
                                    <button onClick={()=>toggleConsent(stu.id,stu.parent_consent)} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${stu.parent_consent?'bg-red-50 text-red-600 hover:bg-red-100':'bg-green-100 text-green-700 hover:bg-green-200'}`}>{stu.parent_consent?'Remove':'Record'}</button>
                                </div>
                            </div>
                        ))}
                        {students.filter(s=>s.pathway_preference).length===0&&<div className="py-12 text-center text-gray-400 text-sm">No students with pathway selected yet</div>}
                    </div>
                </div>
            )}

            {/* ══════════ TRANSITION ════════════════════════════════════ */}
            {tab==='transition'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Senior Secondary Transition Records</h2><p className="text-xs text-gray-500">{transitions.length} transition records</p></div>
                        <button onClick={()=>setShowTrans(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}><FiPlus size={14}/>Add Record</button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[{l:'Total Records',v:transitions.length,c:'#7C3AED'},{l:'Admitted',v:transitions.filter(t=>t.status==='admitted').length,c:'#059669'},{l:'Pending',v:transitions.filter(t=>t.status==='pending').length,c:'#D97706'},{l:'Deferred',v:transitions.filter(t=>t.status==='deferred').length,c:'#DC2626'}].map((s,i)=>(
                            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center"><p className="text-2xl font-black mb-0.5" style={{color:s.c}}>{s.v}</p><p className="text-xs text-gray-500">{s.l}</p></div>
                        ))}
                    </div>
                    {transitions.length===0&&<div className="py-16 text-center bg-white rounded-2xl text-gray-400 text-sm border border-gray-100"><FiArrowRight size={32} className="mx-auto mb-2 text-gray-200"/><p>No transition records yet</p><button onClick={()=>setShowTrans(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#059669'}}>Add First Record</button></div>}
                    <div className="space-y-3">
                        {transitions.map(t=>{
                            const p = PATHWAYS[t.pathway];
                            const sc = {pending:{bg:'#FEF3C7',c:'#D97706'},admitted:{bg:'#D1FAE5',c:'#059669'},deferred:{bg:'#FEE2E2',c:'#DC2626'},transferred:{bg:'#DBEAFE',c:'#2563EB'}}[t.status];
                            return (
                                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 flex-wrap">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:p?.color||'#6366F1'}}>{p?.icon||'🎓'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <p className="font-bold text-gray-800">{t.student_name}</p>
                                            {p&&<span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{background:p.lightBg,color:p.color}}>{p.icon} {p.name}</span>}
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:sc.bg,color:sc.c}}>{t.status.charAt(0).toUpperCase()+t.status.slice(1)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{t.form_name} → {t.target_form||'Grade 10'}{t.target_school?` at ${t.target_school}`:''}{t.transition_date?` · ${fmtDate(t.transition_date)}`:''}</p>
                                        {t.notes&&<p className="text-xs text-gray-400 mt-0.5">{t.notes}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════ ANALYTICS ════════════════════════════════════ */}
            {tab==='analytics'&&(
                <div className="space-y-5">
                    <h2 className="font-black text-gray-800 text-lg">Pathway Analytics & Reports</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Pathway distribution */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-4">Pathway Distribution</h3>
                            {(Object.values(PATHWAYS) as PathwayDef[]).map(p=>{
                                const cnt=stats.dist[p.id]; const pct=stats.total>0?Math.round(cnt/stats.total*100):0;
                                return(
                                    <div key={p.id} className="flex items-center gap-3 mb-3">
                                        <span className="text-lg w-8">{p.icon}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between text-xs mb-1"><span className="font-bold text-gray-700">{p.name}</span><span className="font-black" style={{color:p.color}}>{cnt} ({pct}%)</span></div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:p.color}}/>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Gender × Pathway */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-4">Gender Distribution per Pathway</h3>
                            {(Object.values(PATHWAYS) as PathwayDef[]).map(p=>{
                                const pStu = students.filter(s=>s.pathway_preference===p.id);
                                const male = pStu.filter(s=>s.gender==='Male').length;
                                const female = pStu.filter(s=>s.gender==='Female').length;
                                const total = pStu.length;
                                return(
                                    <div key={p.id} className="mb-3">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-700">{p.icon} {p.name}</span>
                                            <span className="text-gray-400">M:{male} F:{female}</span>
                                        </div>
                                        <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                                            {total>0&&<div style={{width:`${Math.round(male/total*100)}%`,background:'#38BDF8'}} className="h-full"/>}
                                            {total>0&&<div style={{width:`${Math.round(female/total*100)}%`,background:'#F472B6'}} className="h-full"/>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-[9px] text-gray-400">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block"/>Male {total>0?Math.round(male/total*100):0}%</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block"/>Female {total>0?Math.round(female/total*100):0}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Status breakdown */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-4">Selection Status Breakdown</h3>
                            <div className="space-y-2">
                                {(Object.entries(STATUS) as [SelectionStatus, typeof STATUS.pending][]).map(([key,s])=>{
                                    const cnt=students.filter(st=>(st.pathway_status||'pending')===key).length;
                                    const pct=stats.total>0?Math.round(cnt/stats.total*100):0;
                                    return(
                                        <div key={key} className="flex items-center gap-3">
                                            <div className="w-24 text-right"><span className="text-xs font-bold" style={{color:s.color}}>{s.label}</span></div>
                                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full flex items-center px-2" style={{width:`${Math.max(pct,4)}%`,background:s.color}}>
                                                    {pct>8&&<span className="text-[8px] font-bold text-white">{pct}%</span>}
                                                </div>
                                            </div>
                                            <span className="w-6 text-xs font-bold text-gray-500">{cnt}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Summary table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-4">Summary Statistics</h3>
                            <div className="space-y-2 text-sm">
                                {[['Total Grade 9 Students',stats.total],['Pathway Selected',`${stats.selected} (${stats.total>0?Math.round(stats.selected/stats.total*100):0}%)`],['Pending Selection',stats.pending],['Counseling Sessions',counseling.length],['Parent Consent Given',`${stats.parentApproved} (${stats.selected>0?Math.round(stats.parentApproved/stats.selected*100):0}%)`],['Confirmed',stats.confirmed],['SS Transitions Recorded',transitions.length]].map(([l,v])=>(
                                    <div key={l as string} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-600">{l}</span><span className="font-black text-gray-800">{v}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={exportCSV} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}><FiDownload size={14}/>Export Full Report</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ SETTINGS ══════════════════════════════════════ */}
            {tab==='settings'&&(
                <div className="space-y-5">
                    <h2 className="font-black text-gray-800 text-lg">Pathway Module Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiShield size={16} className="text-violet-600"/>Database Setup SQL</h3>
                            <pre className="bg-gray-900 text-green-400 text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-56">{SQL}</pre>
                            <button onClick={()=>{navigator.clipboard.writeText(SQL);toast.success('Copied!');}} className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100"><FiCopy size={12}/>Copy SQL</button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiArrowRight size={16} className="text-blue-500"/>Integration Links</h3>
                            <div className="space-y-1.5">
                                {[{href:'/dashboard/jss/setup',l:'JSS Setup (Grade 7-9)',ic:FiGrid},{href:'/dashboard/cbc/parent-portal',l:'CBC Parent Portal',ic:FiUsers},{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward},{href:'/dashboard/cbc/portfolio',l:'Student Portfolio',ic:FiFolder},{href:'/dashboard/exams/cbc-report-cards',l:'CBC Report Cards',ic:FiFileText},{href:'/dashboard/students',l:'Student Management',ic:FiUser}].map(l=>(
                                    <Link key={l.href} href={l.href} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100 group">
                                        <div className="flex items-center gap-2"><l.ic size={14} className="text-gray-400"/><span className="text-sm font-medium text-gray-700 group-hover:text-violet-700">{l.l}</span></div>
                                        <FiChevronRight size={12} className="text-gray-300 group-hover:text-violet-400"/>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ VIEW STUDENT MODAL ════════════════════════════ */}
            {viewStudent&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white bg-white/20">{viewStudent.first_name.charAt(0)}</div>
                                <div><h2 className="text-lg font-black text-white">{viewStudent.first_name} {viewStudent.last_name}</h2><p className="text-violet-200 text-xs">{viewStudent.form_name} · {viewStudent.admission_no||'—'}</p></div>
                            </div>
                            <button onClick={()=>setViewStudent(null)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Pathway assignment */}
                            <div>
                                <p className="text-xs font-black text-gray-500 uppercase mb-2">Select / Change Pathway</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.values(PATHWAYS) as PathwayDef[]).map(p=>(
                                        <button key={p.id} onClick={()=>assignPathway(viewStudent.id,p.id)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${viewStudent.pathway_preference===p.id?'shadow-md':'hover:border-current'}`} style={viewStudent.pathway_preference===p.id?{background:p.color,color:'#fff',borderColor:p.color}:{color:p.color,background:p.lightBg,borderColor:p.color+'44'}}>
                                            <span className="text-lg">{p.icon}</span>{p.name}
                                            {viewStudent.pathway_preference===p.id&&<FiCheck size={14} className="ml-auto"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Status pipeline */}
                            <div>
                                <p className="text-xs font-black text-gray-500 uppercase mb-2">Update Status</p>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.entries(STATUS) as [SelectionStatus,typeof STATUS.pending][]).map(([key,s])=>(
                                        <button key={key} onClick={()=>updateStatus(viewStudent.id,key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${(viewStudent.pathway_status||'pending')===key?'shadow-md border-current':'border-transparent hover:border-current'}`} style={(viewStudent.pathway_status||'pending')===key?{background:s.color,color:'#fff',borderColor:s.color}:{color:s.color,background:s.bg,borderColor:s.color+'44'}}>{s.label}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[{l:'Gender',v:viewStudent.gender||'—'},{l:'NEMIS No',v:viewStudent.nemis_no||'—'},{l:'Guardian',v:viewStudent.guardian_name||'—'},{l:'Guardian Phone',v:viewStudent.guardian_phone||'—'},{l:'Pathway Selected',v:viewStudent.pathway_selected_at?fmtDate(viewStudent.pathway_selected_at):'—'},{l:'Parent Consent',v:viewStudent.parent_consent?`✓ Yes (${fmtDate(viewStudent.parent_consent_date)})`:'Pending'}].map((d,i)=>(
                                    <div key={i} className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{d.l}</p><p className="text-sm font-semibold text-gray-800">{d.v}</p></div>
                                ))}
                            </div>
                            {viewStudent.pathway_counselor_notes&&<div className="bg-violet-50 rounded-xl p-3 border border-violet-100"><p className="text-[10px] font-bold text-violet-600 uppercase mb-1">Counselor Notes</p><p className="text-sm text-gray-700">{viewStudent.pathway_counselor_notes}</p></div>}
                            {/* Consent toggle */}
                            <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                                <button onClick={()=>toggleConsent(viewStudent.id,viewStudent.parent_consent)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${viewStudent.parent_consent?'border-red-300 text-red-600 hover:bg-red-50':'border-green-400 text-green-700 hover:bg-green-50'}`}>
                                    {viewStudent.parent_consent?<><FiX size={14}/>Remove Consent</>:<><FiCheckCircle size={14}/>Record Parent Consent</>}
                                </button>
                                <button onClick={()=>{setShowCounsel(true);setCounselForm({...emptyCounsel,student_id:String(viewStudent.id)});setViewStudent(null);}} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}><FiMessageSquare size={14}/>Log Counseling</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ COUNSELING MODAL ══════════════════════════════ */}
            {showCounsel&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15"><FiMessageSquare size={18} color="#fff"/></div><div><h2 className="text-lg font-black text-white">Log Counseling Session</h2><p className="text-violet-200 text-xs">Career guidance record for Grade 9 student</p></div></div>
                            <button onClick={()=>{setShowCounsel(false);setCounselForm(emptyCounsel);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Student <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={counselForm.student_id} onChange={e=>setCounselForm({...counselForm,student_id:e.target.value})}>
                                        <option value="">Select student…</option>
                                        {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.form_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Counselor Name <span className="text-red-500">*</span></label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder="e.g. Mrs. Kamau" value={counselForm.counselor_name} onChange={e=>setCounselForm({...counselForm,counselor_name:e.target.value})}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Session Date</label>
                                    <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={counselForm.session_date} onChange={e=>setCounselForm({...counselForm,session_date:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Follow-up Date</label>
                                    <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={counselForm.follow_up_date} onChange={e=>setCounselForm({...counselForm,follow_up_date:e.target.value})}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Student's Interest</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={counselForm.student_interest} onChange={e=>setCounselForm({...counselForm,student_interest:e.target.value as any})}>
                                        <option value="">Not stated</option>
                                        {(Object.values(PATHWAYS) as PathwayDef[]).map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Counselor Recommends</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={counselForm.recommended_pathway} onChange={e=>setCounselForm({...counselForm,recommended_pathway:e.target.value as any})}>
                                        <option value="">No recommendation yet</option>
                                        {(Object.values(PATHWAYS) as PathwayDef[]).map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Session Notes</label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none" rows={3} placeholder="Notes about student interests, strengths, concerns, discussion points…" value={counselForm.notes} onChange={e=>setCounselForm({...counselForm,notes:e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Action Items</label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder="e.g. Research STEM careers, discuss with parents, visit campus…" value={counselForm.action_items} onChange={e=>setCounselForm({...counselForm,action_items:e.target.value})}/>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={saveCounseling} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>
                                    {saving?<><FiRefreshCw size={14} className="animate-spin"/>Saving…</>:<><FiCheck size={14}/>Save Counseling Record</>}
                                </button>
                                <button onClick={()=>{setShowCounsel(false);setCounselForm(emptyCounsel);}} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ BULK ASSIGN MODAL ══════════════════════════════ */}
            {showBulkAssign&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><FiZap size={18} color="#fff"/></div><div><h2 className="text-lg font-black text-white">Bulk Pathway Assignment</h2><p className="text-amber-100 text-xs">{selectedIds.size>0?`${selectedIds.size} students selected`:'Select students first'}</p></div></div>
                            <button onClick={()=>setShowBulk(false)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">{selectedIds.size>0?`Assign pathway to ${selectedIds.size} selected students:`:'First select students from the Students tab, then use Bulk Assign.'}</p>
                            {selectedIds.size===0&&<div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-xs text-amber-700">Go to Students tab → check boxes next to students → click Bulk Assign</div>}
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.values(PATHWAYS) as PathwayDef[]).map(p=>(
                                    <button key={p.id} onClick={()=>setBulkPathway(bulkPathway===p.id?'':p.id)} className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 font-bold transition-all ${bulkPathway===p.id?'shadow-md':'hover:border-current'}`} style={bulkPathway===p.id?{background:p.color,color:'#fff',borderColor:p.color}:{color:p.color,background:p.lightBg,borderColor:p.color+'44'}}>
                                        <span className="text-xl">{p.icon}</span><div className="text-left"><p className="text-sm">{p.name}</p><p className={`text-[9px] ${bulkPathway===p.id?'text-white/70':'text-gray-400'}`}>{p.description.split(' ').slice(0,3).join(' ')}…</p></div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={bulkAssignPathway} disabled={saving||selectedIds.size===0||!bulkPathway} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>
                                    {saving?<><FiRefreshCw size={14} className="animate-spin"/>Assigning…</>:<><FiZap size={14}/>Assign to {selectedIds.size} Students</>}
                                </button>
                                <button onClick={()=>setShowBulk(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ TRANSITION MODAL ══════════════════════════════ */}
            {showTransition&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><FiArrowRight size={18} color="#fff"/></div><div><h2 className="text-lg font-black text-white">Record SS Transition</h2><p className="text-green-100 text-xs">Senior Secondary school placement record</p></div></div>
                            <button onClick={()=>{setShowTrans(false);setTransForm(emptyTrans);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Student</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={transForm.student_id} onChange={e=>setTransForm({...transForm,student_id:e.target.value})}>
                                        <option value="">Select student…</option>
                                        {students.filter(s=>s.pathway_preference).map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Confirmed Pathway</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={transForm.pathway} onChange={e=>setTransForm({...transForm,pathway:e.target.value as PathwayId})}>
                                        <option value="">Select pathway…</option>
                                        {(Object.values(PATHWAYS) as PathwayDef[]).map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Target School</label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" placeholder="e.g. Alliance High School" value={transForm.target_school} onChange={e=>setTransForm({...transForm,target_school:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Target Form/Grade</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={transForm.target_form} onChange={e=>setTransForm({...transForm,target_form:e.target.value})}>
                                        {['Grade 10','Grade 11','Grade 12'].map(g=><option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Transition Date</label>
                                    <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={transForm.transition_date} onChange={e=>setTransForm({...transForm,transition_date:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Status</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={transForm.status} onChange={e=>setTransForm({...transForm,status:e.target.value as any})}>
                                        <option value="pending">Pending</option>
                                        <option value="admitted">Admitted</option>
                                        <option value="deferred">Deferred</option>
                                        <option value="transferred">Transferred</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none" rows={2} placeholder="Any notes about this transition…" value={transForm.notes} onChange={e=>setTransForm({...transForm,notes:e.target.value})}/>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={saveTransition} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                    {saving?<><FiRefreshCw size={14} className="animate-spin"/>Saving…</>:<><FiCheck size={14}/>Save Transition Record</>}
                                </button>
                                <button onClick={()=>{setShowTrans(false);setTransForm(emptyTrans);}} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
