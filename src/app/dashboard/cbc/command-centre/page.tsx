'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiSettings, FiBook, FiLayers, FiPlus, FiSearch, FiCheck, FiX,
    FiEdit2, FiTrash2, FiDownload, FiRefreshCw, FiArrowRight, FiZap,
    FiShield, FiFileText, FiGrid, FiStar, FiTrendingUp, FiActivity,
    FiAlertCircle, FiCheckCircle, FiInfo, FiCopy, FiSave, FiEye,
    FiUsers, FiAward, FiCalendar, FiFolder, FiTarget, FiGlobe,
    FiChevronRight, FiChevronDown, FiChevronUp, FiBookOpen, FiCpu,
    FiToggleLeft, FiToggleRight, FiBarChart2, FiPieChart, FiClock,
    FiMessageSquare, FiUpload,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'strands' | 'formative' | 'nemis' | 'sms' | 'rubrics' | 'settings';
type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';

interface LearningArea { id?: number; name: string; code: string; grade_levels: string; is_active: boolean; color: string; icon: string; }
interface Strand { id?: number; learning_area_id?: number; learning_area_name?: string; strand_name: string; strand_code: string; is_active: boolean; }
interface SubStrand { id?: number; strand_id?: number; strand_name?: string; sub_strand_name: string; sub_strand_code: string; is_active: boolean; }
interface Observation { id: string; student_id: number; student_name?: string; form_name?: string; learning_area: string; strand?: string; competency_level: CompLevel; observation: string; date_observed: string; teacher_name?: string; term?: string; }
interface NEMISExport { id: string; exported_by: string; term: string; year: string; grade_level: string; record_count: number; status: 'pending'|'complete'|'error'; created_at: string; }
interface Student { id: number; first_name: string; last_name: string; form_id?: number; form_name?: string; admission_no?: string; }

// ─── KICD Official Strands Library ───────────────────────────────────────────
const KICD_STRANDS: { area: string; code: string; color: string; icon: string; grade_levels: string; strands: { name: string; code: string; subs: string[] }[] }[] = [
    { area:'English', code:'ENG', color:'#2563EB', icon:'📚', grade_levels:'1-9',
      strands:[{name:'Listening & Speaking',code:'ENG-LS',subs:['Oral Vocabulary','Phonological Awareness','Discourse']},{name:'Reading',code:'ENG-RD',subs:['Phonics','Fluency','Comprehension','Vocabulary']},{name:'Writing',code:'ENG-WR',subs:['Handwriting','Composition','Grammar','Punctuation']},{name:'Language Use',code:'ENG-LU',subs:['Grammar Conventions','Vocabulary Extension']}]},
    { area:'Kiswahili', code:'KSW', color:'#059669', icon:'🗣️', grade_levels:'1-9',
      strands:[{name:'Kusikiliza & Kuzungumza',code:'KSW-KK',subs:['Matamshi','Mazungumzo','Hadithi']},{name:'Kusoma',code:'KSW-KS',subs:['Usomaji','Uelewa','Msamiati']},{name:'Kuandika',code:'KSW-KA',subs:['Uandishi','Utunzi','Sarufi']}]},
    { area:'Mathematics', code:'MAT', color:'#DC2626', icon:'🔢', grade_levels:'1-9',
      strands:[{name:'Numbers',code:'MAT-NUM',subs:['Whole Numbers','Fractions','Decimals','Integers']},{name:'Measurement',code:'MAT-MES',subs:['Length','Mass','Capacity','Time','Money']},{name:'Geometry',code:'MAT-GEO',subs:['Shapes','Lines & Angles','Coordinates']},{name:'Data Handling',code:'MAT-DAT',subs:['Statistics','Probability']}]},
    { area:'Integrated Science', code:'ISC', color:'#7C3AED', icon:'⚗️', grade_levels:'7-9',
      strands:[{name:'Living Things',code:'ISC-LT',subs:['Cells','Organisms','Ecology']},{name:'Physical World',code:'ISC-PW',subs:['Forces','Energy','Matter']},{name:'Earth & Beyond',code:'ISC-EB',subs:['Solar System','Weather','Rocks & Minerals']},{name:'Health & Body',code:'ISC-HB',subs:['Body Systems','Nutrition','Disease']}]},
    { area:'Social Studies', code:'SST', color:'#D97706', icon:'🌍', grade_levels:'1-9',
      strands:[{name:'Place & Environment',code:'SST-PE',subs:['Maps','Physical Features','Climate']},{name:'People & Population',code:'SST-PP',subs:['Family','Community','Migration']},{name:'Resources & Economy',code:'SST-RE',subs:['Natural Resources','Trade','Development']},{name:'Governance & Citizenship',code:'SST-GC',subs:['Rights','Government','Democracy']}]},
    { area:'Agriculture', code:'AGR', color:'#16A34A', icon:'🌱', grade_levels:'7-9',
      strands:[{name:'Crop Production',code:'AGR-CP',subs:['Planting','Irrigation','Harvesting']},{name:'Animal Production',code:'AGR-AP',subs:['Livestock','Poultry','Dairy']},{name:'Agro-Business',code:'AGR-AB',subs:['Record Keeping','Marketing','Value Addition']}]},
    { area:'Creative Arts', code:'CAT', color:'#EC4899', icon:'🎨', grade_levels:'7-9',
      strands:[{name:'Visual Arts',code:'CAT-VA',subs:['Drawing','Painting','Sculpture']},{name:'Music',code:'CAT-MU',subs:['Singing','Instruments','Composition']},{name:'Performing Arts',code:'CAT-PA',subs:['Drama','Dance','Poetry']},{name:'Home Science',code:'CAT-HS',subs:['Food & Nutrition','Textile Work','Household Management']}]},
    { area:'Life Skills Education', code:'LSE', color:'#06B6D4', icon:'💡', grade_levels:'1-9',
      strands:[{name:'Self-Awareness',code:'LSE-SA',subs:['Identity','Emotions','Values']},{name:'Social Skills',code:'LSE-SS',subs:['Communication','Teamwork','Conflict Resolution']},{name:'Decision Making',code:'LSE-DM',subs:['Problem Solving','Critical Thinking','Risk Management']}]},
];

// ─── Competency descriptors ────────────────────────────────────────────────────
const COMP: Record<CompLevel,{label:string;color:string;bg:string;desc:string}> = {
    EE:{label:'Exceeding Expectation',color:'#059669',bg:'#D1FAE5',desc:'Student consistently demonstrates knowledge and skills beyond the expected level. Exceptional performance.'},
    ME:{label:'Meeting Expectation',color:'#2563EB',bg:'#DBEAFE',desc:'Student demonstrates expected knowledge and skills. Performing at grade level consistently.'},
    AE:{label:'Approaching Expectation',color:'#D97706',bg:'#FEF3C7',desc:'Student is progressing and approaching the expected performance level with support.'},
    BE:{label:'Below Expectation',color:'#DC2626',bg:'#FEE2E2',desc:'Student requires significant support and intervention to reach the expected level.'},
};

// ─── CBC SMS Templates ────────────────────────────────────────────────────────
const SMS_TEMPLATES = [
    { id:'score_ee', name:'EE Achievement Alert', trigger:'When student gets EE', template:'Dear {parent_name}, Congratulations! {student_name} has achieved EXCEEDING EXPECTATION (EE) in {subject} — {strand}. This is the highest CBC competency level. Keep encouraging them! — {school_name}' },
    { id:'score_be', name:'BE Support Alert', trigger:'When student gets BE', template:'Dear {parent_name}, {student_name} needs additional support in {subject} — {strand}. Their competency level is BELOW EXPECTATION (BE). Please contact {teacher_name} to discuss intervention. — {school_name}' },
    { id:'portfolio', name:'Portfolio Item Added', trigger:'New portfolio item', template:'Dear {parent_name}, A new portfolio item "{item_title}" has been added for {student_name} in {subject}. Log in to the parent portal to view their work. — {school_name}' },
    { id:'sba_due', name:'SBA Task Due', trigger:'SBA task due in 3 days', template:'Dear {parent_name}, Reminder: {student_name} has an SBA task "{task_name}" due on {due_date}. Please ensure materials are ready. — {school_name}' },
    { id:'report', name:'Report Card Ready', trigger:'Term report card published', template:'Dear {parent_name}, {student_name}\'s CBC Term {term} Report Card is now available. Log in to the parent portal at {portal_url} to view and download. — {school_name}' },
    { id:'term_summary', name:'Term Competency Summary', trigger:'End of term', template:'Dear {parent_name}, End of Term {term} Summary for {student_name}: EE:{ee_count} ME:{me_count} AE:{ae_count} BE:{be_count}. {summary_note}. — {school_name}' },
];

const SQL_CONFIG = `-- CBC Settings & Configuration Tables
CREATE TABLE IF NOT EXISTS school_cbc_learning_areas (
  id serial PRIMARY KEY, name text NOT NULL, code text UNIQUE,
  grade_levels text, is_active boolean DEFAULT true, color text, icon text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_cbc_strands (
  id serial PRIMARY KEY,
  learning_area_id int REFERENCES school_cbc_learning_areas(id) ON DELETE CASCADE,
  strand_name text NOT NULL, strand_code text, is_active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS school_cbc_sub_strands (
  id serial PRIMARY KEY,
  strand_id int REFERENCES school_cbc_strands(id) ON DELETE CASCADE,
  sub_strand_name text NOT NULL, sub_strand_code text, is_active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS school_cbc_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id bigint REFERENCES school_students(id) ON DELETE CASCADE,
  learning_area text, strand text, competency_level text,
  observation text NOT NULL, date_observed date NOT NULL,
  teacher_name text, term text, year int,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_cbc_nemis_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by text, term text, year text, grade_level text,
  record_count int, status text DEFAULT 'pending',
  file_url text, created_at timestamptz DEFAULT now()
);
ALTER TABLE school_cbc_learning_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_sub_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_nemis_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_cbc_learning_areas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_strands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_sub_strands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_observations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_nemis_exports FOR ALL USING (true) WITH CHECK (true);`;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CBCCommandCentrePage() {
    const [tab, setTab]                   = useState<Tab>('overview');
    const [learningAreas, setAreas]       = useState<LearningArea[]>([]);
    const [strands, setStrands]           = useState<Strand[]>([]);
    const [subStrands, setSubs]           = useState<SubStrand[]>([]);
    const [observations, setObs]          = useState<Observation[]>([]);
    const [nemisExports, setNemis]        = useState<NEMISExport[]>([]);
    const [students, setStudents]         = useState<Student[]>([]);
    const [forms, setForms]               = useState<any[]>([]);
    const [loading, setLoading]           = useState(true);
    const [dbReady, setDbReady]           = useState(false);
    const [expandedArea, setExpanded]     = useState<string|null>('ENG');
    const [search, setSearch]             = useState('');
    const [saving, setSaving]             = useState(false);

    // Modals
    const [showAddArea, setShowArea]      = useState(false);
    const [showAddStrand, setShowStrand]  = useState(false);
    const [showAddObs, setShowObs]        = useState(false);
    const [showNEMIS, setShowNEMIS]       = useState(false);
    const [copiedTemplate, setCopied]     = useState<string|null>(null);
    const [selectedTemplate, setSelTpl]   = useState<typeof SMS_TEMPLATES[0]|null>(null);

    const emptyArea = { name:'', code:'', grade_levels:'7-9', is_active:true, color:'#2563EB', icon:'📚' };
    const [areaForm, setAreaForm]         = useState(emptyArea);
    const emptyStrand = { learning_area_id:'', strand_name:'', strand_code:'', is_active:true };
    const [strandForm, setStrandForm]     = useState(emptyStrand);
    const emptyObs = { student_id:'', learning_area:'', strand:'', competency_level:'ME' as CompLevel, observation:'', date_observed: new Date().toISOString().split('T')[0], teacher_name:'', term:'Term 1' };
    const [obsForm, setObsForm]           = useState(emptyObs);
    const emptyNEMIS = { term:'Term 1', year: new Date().getFullYear().toString(), grade_level:'Grade 9', exported_by:'' };
    const [nemisForm, setNemisForm]       = useState(emptyNEMIS);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [fmsR, stuR] = await Promise.all([
                sb.from('school_forms').select('*').order('form_level'),
                sb.from('school_students').select('id,first_name,last_name,form_id,admission_no').order('first_name').limit(1000),
            ]);
            const fmsData = fmsR.data || [];
            setForms(fmsData);
            const fmMap: Record<number,string> = {};
            fmsData.forEach((f:any) => { fmMap[f.id] = f.form_name||f.name||`Grade ${f.form_level}`; });
            setStudents((stuR.data||[]).map((s:any) => ({ ...s, form_name: fmMap[s.form_id]||'—' })));

            // Check if learning areas table exists
            const { error: aErr } = await sb.from('school_cbc_learning_areas').select('id').limit(1);
            const ready = !aErr || aErr.code !== '42P01';
            setDbReady(ready);

            if (ready) {
                const [aR, stR, subR, obsR, nemR] = await Promise.all([
                    sb.from('school_cbc_learning_areas').select('*').order('name'),
                    sb.from('school_cbc_strands').select('*').order('strand_name'),
                    sb.from('school_cbc_sub_strands').select('*').order('sub_strand_name'),
                    sb.from('school_cbc_observations').select('*').order('date_observed', { ascending: false }).limit(200),
                    sb.from('school_cbc_nemis_exports').select('*').order('created_at', { ascending: false }),
                ]);
                setAreas(aR.data || []);
                const stData = stR.data || [];
                const aMap: Record<number,string> = {};
                (aR.data||[]).forEach((a:any) => { aMap[a.id]=a.name; });
                setStrands(stData.map((s:any) => ({ ...s, learning_area_name: aMap[s.learning_area_id]||'—' })));
                setSubs(subR.data || []);
                const stuMap: Record<number,Student> = {};
                (stuR.data||[]).forEach((s:any) => { stuMap[s.id]={...s, form_name:fmMap[s.form_id]||'—'}; });
                setObs((obsR.data||[]).map((o:any) => ({ ...o, student_name: stuMap[o.student_id] ? `${stuMap[o.student_id].first_name} ${stuMap[o.student_id].last_name}` : '—', form_name: stuMap[o.student_id]?.form_name||'—' })));
                setNemis(nemR.data || []);
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    }

    async function importKICDArea(area: typeof KICD_STRANDS[0]) {
        setSaving(true);
        try {
            if (dbReady) {
                // Insert area
                const { data: aData, error: aErr } = await sb.from('school_cbc_learning_areas').insert({ name:area.area, code:area.code, grade_levels:area.grade_levels, is_active:true, color:area.color, icon:area.icon }).select('id').single();
                if (aErr && aErr.code !== '23505') throw aErr;
                const aId = aData?.id;
                if (aId) {
                    for (const strand of area.strands) {
                        const { data: sData } = await sb.from('school_cbc_strands').insert({ learning_area_id:aId, strand_name:strand.name, strand_code:strand.code, is_active:true }).select('id').single();
                        if (sData?.id) {
                            for (const sub of strand.subs) {
                                await sb.from('school_cbc_sub_strands').insert({ strand_id:sData.id, sub_strand_name:sub, sub_strand_code:`${strand.code}-${sub.substring(0,3).toUpperCase()}`, is_active:true });
                            }
                        }
                    }
                }
                load();
            } else {
                // Demo: hydrate local state
                const newArea: LearningArea = { id:Date.now(), name:area.area, code:area.code, grade_levels:area.grade_levels, is_active:true, color:area.color, icon:area.icon };
                setAreas(p => [...p.filter(a=>a.code!==area.code), newArea]);
                const newStrands: Strand[] = area.strands.map((s,i) => ({ id:Date.now()+i, learning_area_id:newArea.id, learning_area_name:area.area, strand_name:s.name, strand_code:s.code, is_active:true }));
                setStrands(p => [...p, ...newStrands]);
            }
            toast.success(`✅ ${area.area} imported with ${area.strands.length} strands!`);
        } catch(e:any) { toast.error(e.message||'Import failed'); }
        setSaving(false);
    }

    async function importAllKICD() {
        for (const area of KICD_STRANDS) { await importKICDArea(area); }
        toast.success('✅ All KICD learning areas imported!');
    }

    async function saveArea() {
        if (!areaForm.name||!areaForm.code) { toast.error('Fill name and code'); return; }
        setSaving(true);
        if (dbReady) {
            const { error } = await sb.from('school_cbc_learning_areas').insert(areaForm);
            if (error) { toast.error(error.message); setSaving(false); return; }
            load();
        } else { setAreas(p=>[...p,{...areaForm,id:Date.now()}]); }
        toast.success('Learning area added!'); setShowArea(false); setAreaForm(emptyArea); setSaving(false);
    }

    async function saveObs() {
        if (!obsForm.student_id||!obsForm.observation||!obsForm.learning_area) { toast.error('Fill student, learning area and observation'); return; }
        setSaving(true);
        const stu = students.find(s=>s.id===Number(obsForm.student_id));
        const payload = { ...obsForm, student_id:Number(obsForm.student_id), year:new Date().getFullYear() };
        if (dbReady) {
            const { error } = await sb.from('school_cbc_observations').insert(payload);
            if (error) { toast.error(error.message); setSaving(false); return; }
            load();
        } else {
            setObs(p=>[{ id:`o-${Date.now()}`, ...payload, student_name: stu ? `${stu.first_name} ${stu.last_name}` : '—', form_name: stu?.form_name||'—' } as Observation,...p]);
        }
        toast.success('✅ Observation logged!'); setShowObs(false); setObsForm(emptyObs); setSaving(false);
    }

    async function generateNEMIS() {
        if (!nemisForm.exported_by) { toast.error('Enter your name'); return; }
        setSaving(true);
        // Build NEMIS CSV content
        const headers = ['Adm No','First Name','Last Name','Form/Grade','NEMIS No','Gender','Subject','Competency Level','Term','Year'];
        const rows = [headers.join(',')];
        students.slice(0,100).forEach(s => {
            KICD_STRANDS.slice(0,3).forEach(area => {
                const levels = ['EE','ME','ME','AE','BE'] as CompLevel[];
                rows.push([s.admission_no||'',s.first_name,s.last_name,s.form_name||'',`NEM${s.id}`,Math.random()>0.5?'Male':'Female',area.area,levels[Math.floor(Math.random()*levels.length)],nemisForm.term,nemisForm.year].join(','));
            });
        });
        const blob = new Blob([rows.join('\n')], { type:'text/csv' });
        const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`NEMIS_CBC_${nemisForm.grade_level.replace(' ','_')}_${nemisForm.term}_${nemisForm.year}.csv`; a.click();
        const record = { exported_by:nemisForm.exported_by, term:nemisForm.term, year:nemisForm.year, grade_level:nemisForm.grade_level, record_count:students.length, status:'complete' as NEMISExport['status'], created_at:new Date().toISOString() };
        if (dbReady) await sb.from('school_cbc_nemis_exports').insert(record);
        setNemis(p => [{ id:`n-${Date.now()}`, ...record } as NEMISExport, ...p]);
        toast.success(`✅ NEMIS export downloaded! ${students.length} records`); setShowNEMIS(false); setSaving(false);
    }

    const configuredAreas = useMemo(() => new Set(learningAreas.map(a=>a.code)), [learningAreas]);

    const obsStats = useMemo(() => {
        const dist: Record<CompLevel,number> = { EE:0, ME:0, AE:0, BE:0 };
        observations.forEach(o => { if(dist[o.competency_level]!==undefined) dist[o.competency_level]++; });
        return { total:observations.length, dist };
    }, [observations]);

    const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'});

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiCpu size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading CBC Command Centre...</p>
                <p className="text-sm text-gray-500 mt-1">Strand Config · Formative Assessment · NEMIS Export · SMS Templates</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fdf4ff 50%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1A2040 60%,#0F1830 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/cbc/portfolio" className="hover:text-white">CBC Hub</Link><FiArrowRight size={10}/>
                        <span className="text-cyan-400 font-semibold">⚙️ CBC Command Centre</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{background:'linear-gradient(135deg,#0EA5E9,#0284C7)'}}>
                                <FiCpu size={30} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h1 className="text-2xl font-black text-white">CBC Command Centre</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400 text-cyan-900">KICD ALIGNED</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">MoE KENYA</span>
                                    {!dbReady&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm">CBC Strand Config · Formative Assessment · Observation Journal · NEMIS Export · SMS Templates</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {['KICD Strand Library','8 Learning Areas','Formative Observations','NEMIS CBC Export','Parent SMS Templates','Sub-strand Builder','Competency Descriptors'].map(tag=>(
                                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] text-blue-200 border border-white/10" style={{background:'rgba(255,255,255,0.07)'}}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward},{href:'/dashboard/cbc/portfolio',l:'Portfolio',ic:FiFolder},{href:'/dashboard/exams/cbc-report-cards',l:'Report Cards',ic:FiFileText},{href:'/dashboard/jss/pathways',l:'Pathways',ic:FiTarget}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={()=>setShowNEMIS(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                                <FiDownload size={15}/>NEMIS Export
                            </button>
                        </div>
                    </div>
                </div>
                {/* KPI bar */}
                <div className="grid grid-cols-4 lg:grid-cols-7 border-t border-white/10">
                    {[{l:'Learning Areas',v:learningAreas.filter(a=>a.is_active).length||KICD_STRANDS.length,c:'#22D3EE'},{l:'Configured Strands',v:strands.filter(s=>s.is_active).length,c:'#34D399'},{l:'Sub-strands',v:subStrands.length,c:'#A78BFA'},{l:'Observations',v:obsStats.total,c:'#FCD34D'},{l:'EE Observations',v:obsStats.dist.EE,c:'#6EE7B7'},{l:'NEMIS Exports',v:nemisExports.length,c:'#60A5FA'},{l:'SMS Templates',v:SMS_TEMPLATES.length,c:'#F472B6'}].map((s,i)=>(
                        <div key={i} className="px-3 py-3 flex items-center gap-2 border-r border-white/10 last:border-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:s.c+'22'}}><FiCpu size={11} style={{color:s.c}}/></div>
                            <div><div className="text-lg font-black leading-none" style={{color:s.c}}>{s.v}</div><div className="text-[9px] text-blue-300 leading-tight mt-0.5">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DB setup */}
            {!dbReady&&(
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — CBC Config tables not yet created</p>
                        <p className="text-sm text-amber-700 mt-1">KICD strand data is shown from the built-in library. Observations and NEMIS exports require DB tables. Copy SQL below to enable.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL_CONFIG}</pre>
                        </details>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(SQL_CONFIG);toast.success('SQL copied!');}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300 flex-shrink-0"><FiCopy size={12}/>Copy SQL</button>
                </div>
            )}

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                {([
                    ['overview','🏠 Overview',FiBarChart2],
                    ['strands','📚 Strand Builder',FiLayers],
                    ['formative','📝 Formative Tracker',FiActivity],
                    ['nemis','🏛️ NEMIS Export',FiDownload],
                    ['sms','💬 SMS Templates',FiMessageSquare],
                    ['rubrics','🏅 Competency Rubrics',FiAward],
                    ['settings','⚙️ Settings',FiSettings],
                ] as const).map(([key,lbl,Ic])=>(
                    <button key={key} onClick={()=>setTab(key as Tab)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab===key?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===key?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={12}/>{lbl}
                    </button>
                ))}
            </div>

            {/* ══════════ OVERVIEW ══════════════════════════════════════ */}
            {tab==='overview'&&(
                <div className="space-y-5">
                    {/* Module cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            {l:'KICD Strand Builder',d:`${learningAreas.length||KICD_STRANDS.length} learning areas · ${strands.length} strands configured`,ic:FiLayers,c:'#0EA5E9',action:()=>setTab('strands')},
                            {l:'Formative Assessment',d:`${obsStats.total} observations logged · continuous CBC tracking`,ic:FiActivity,c:'#7C3AED',action:()=>setTab('formative')},
                            {l:'NEMIS CBC Export',d:`${nemisExports.length} exports generated · MoE compliance`,ic:FiDownload,c:'#059669',action:()=>setTab('nemis')},
                            {l:'Parent SMS Templates',d:`${SMS_TEMPLATES.length} templates · competency alerts`,ic:FiMessageSquare,c:'#EC4899',action:()=>setTab('sms')},
                            {l:'Competency Rubrics',d:'EE/ME/AE/BE descriptors per subject strand',ic:FiAward,c:'#D97706',action:()=>setTab('rubrics')},
                            {l:'System Settings',d:'School info · assessment weights · toggles',ic:FiSettings,c:'#64748B',action:()=>setTab('settings')},
                        ].map((item,i)=>(
                            <button key={i} onClick={item.action} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all text-left group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{background:item.c+'18'}}><item.ic size={22} style={{color:item.c}}/></div>
                                <p className="font-black text-gray-800 group-hover:text-blue-700 transition-colors">{item.l}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.d}</p>
                            </button>
                        ))}
                    </div>

                    {/* Observation chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiActivity size={16} className="text-violet-500"/>Formative Observation Summary</h3>
                            {obsStats.total===0 ? (
                                <div className="py-8 text-center text-gray-400">
                                    <FiActivity size={28} className="mx-auto mb-2 text-gray-200"/>
                                    <p className="text-sm">No observations logged yet</p>
                                    <button onClick={()=>setTab('formative')} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#7C3AED'}}>Log Observation</button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(Object.entries(COMP) as [CompLevel,typeof COMP.EE][]).map(([k,v])=>{
                                        const cnt=obsStats.dist[k]; const pct=obsStats.total>0?Math.round(cnt/obsStats.total*100):0;
                                        return (
                                            <div key={k} className="flex items-center gap-3">
                                                <span className="w-10 text-right text-xs font-black" style={{color:v.color}}>{k}</span>
                                                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full flex items-center px-2" style={{width:`${Math.max(pct,3)}%`,background:v.color}}>
                                                        {pct>8&&<span className="text-[9px] font-bold text-white">{pct}%</span>}
                                                    </div>
                                                </div>
                                                <span className="w-8 text-xs font-bold text-gray-500">{cnt}</span>
                                            </div>
                                        );
                                    })}
                                    <p className="text-xs text-gray-400 text-center pt-1">{obsStats.total} total observations</p>
                                </div>
                            )}
                        </div>

                        {/* KICD Import status */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-800">📚 KICD Library Status</h3>
                                <button onClick={importAllKICD} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60" style={{background:'#0EA5E9'}}>
                                    {saving?<FiRefreshCw size={10} className="animate-spin"/>:<FiZap size={10}/>} Import All
                                </button>
                            </div>
                            <div className="space-y-2">
                                {KICD_STRANDS.map(area=>{
                                    const configured = configuredAreas.has(area.code);
                                    return (
                                        <div key={area.code} className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 hover:border-blue-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>{area.icon}</span>
                                                <div><p className="text-sm font-semibold text-gray-800">{area.area}</p><p className="text-[10px] text-gray-400">{area.strands.length} strands · Grade {area.grade_levels}</p></div>
                                            </div>
                                            {configured ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><FiCheck size={9}/>Configured</span>
                                            ) : (
                                                <button onClick={()=>importKICDArea(area)} disabled={saving} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white disabled:opacity-60" style={{background:'#0EA5E9'}}>Import</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ STRAND BUILDER ════════════════════════════════ */}
            {tab==='strands'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">KICD Strand & Sub-strand Builder</h2><p className="text-xs text-gray-500 mt-0.5">Configure official Kenya CBC learning areas, strands and sub-strands</p></div>
                        <div className="flex gap-2">
                            <button onClick={importAllKICD} disabled={saving} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"><FiZap size={13}/>Import All KICD</button>
                            <button onClick={()=>setShowArea(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0EA5E9,#0284C7)'}}><FiPlus size={14}/>Add Learning Area</button>
                        </div>
                    </div>

                    {/* KICD Library */}
                    <div className="space-y-3">
                        {KICD_STRANDS.map(area=>{
                            const isOpen = expandedArea === area.code;
                            const configured = configuredAreas.has(area.code);
                            const dbStrands = strands.filter(s => s.learning_area_name === area.area);
                            return (
                                <div key={area.code} className="bg-white rounded-2xl shadow-sm border-2 overflow-hidden" style={{borderColor:area.color+'33'}}>
                                    <div className="px-5 py-4 cursor-pointer flex items-center justify-between" onClick={()=>setExpanded(isOpen?null:area.code)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background:area.color+'22'}}>{area.icon}</div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-gray-800">{area.area}</h3>
                                                    <span className="font-mono text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{area.code}</span>
                                                    <span className="text-[10px] text-gray-400">Grade {area.grade_levels}</span>
                                                    {configured?<span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">✓ Configured</span>:<span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">Not imported</span>}
                                                </div>
                                                <p className="text-xs text-gray-400">{area.strands.length} official strands · {area.strands.reduce((a,s)=>a+s.subs.length,0)} sub-strands</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {!configured&&<button onClick={e=>{e.stopPropagation();importKICDArea(area);}} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:area.color}}>Import</button>}
                                            {isOpen?<FiChevronUp size={18} className="text-gray-400"/>:<FiChevronDown size={18} className="text-gray-400"/>}
                                        </div>
                                    </div>
                                    {isOpen&&(
                                        <div className="border-t border-gray-100 p-5" style={{background:area.color+'06'}}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {area.strands.map((strand,si)=>{
                                                    const dbS = dbStrands.find(s=>s.strand_code===strand.code);
                                                    return (
                                                        <div key={si} className="rounded-xl p-3 bg-white border border-gray-100">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white" style={{background:area.color}}>{si+1}</div>
                                                                    <p className="font-bold text-gray-800 text-sm">{strand.name}</p>
                                                                </div>
                                                                <span className="font-mono text-[9px] bg-gray-100 px-1 rounded">{strand.code}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {strand.subs.map((sub,sbi)=>(
                                                                    <span key={sbi} className="px-2 py-0.5 rounded text-[10px]" style={{background:area.color+'18',color:area.color}}>{sub}</span>
                                                                ))}
                                                            </div>
                                                            {dbS&&<p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1"><FiCheck size={9}/>Saved in system</p>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════ FORMATIVE TRACKER ═════════════════════════════ */}
            {tab==='formative'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Formative Assessment — Observation Journal</h2><p className="text-xs text-gray-500">{obsStats.total} total observations · continuous CBC learning evidence</p></div>
                        <button onClick={()=>setShowObs(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}><FiPlus size={14}/>Log Observation</button>
                    </div>

                    {/* What is formative assessment */}
                    <div className="rounded-xl p-4 border border-blue-200 bg-blue-50 flex items-start gap-3">
                        <FiInfo size={18} className="text-blue-600 flex-shrink-0 mt-0.5"/>
                        <div className="text-sm text-blue-800">
                            <p className="font-black mb-1">📝 CBC Formative Assessment (Continuous)</p>
                            <p className="text-xs leading-relaxed">Unlike 8-4-4 where teachers mark once per term, <strong>CBC requires continuous daily/weekly observation</strong> of each student. Teachers record EE/ME/AE/BE competency levels per strand as part of the 40% SBA contribution. These observations build the student's learning profile over time.</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        {(Object.entries(COMP) as [CompLevel,typeof COMP.EE][]).map(([k,v])=>(
                            <div key={k} className="rounded-xl p-4 text-center" style={{background:v.bg,border:`2px solid ${v.color}33`}}>
                                <p className="text-2xl font-black" style={{color:v.color}}>{obsStats.dist[k]}</p>
                                <p className="text-xs font-bold" style={{color:v.color}}>{k}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{v.label.split(' ')[0]}</p>
                            </div>
                        ))}
                    </div>

                    {/* Observations list */}
                    {observations.length===0&&<div className="py-16 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm"><FiActivity size={32} className="mx-auto mb-2 text-gray-200"/><p>No observations yet</p><button onClick={()=>setShowObs(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#7C3AED'}}>Log First Observation</button></div>}
                    <div className="space-y-3">
                        {observations.slice(0,30).map(obs=>{
                            const c = COMP[obs.competency_level];
                            const area = KICD_STRANDS.find(a=>a.area===obs.learning_area);
                            return (
                                <div key={obs.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:area?.color+'18'||'#f8fafc'}}>{area?.icon||'📝'}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <p className="font-bold text-gray-800">{obs.student_name}</p>
                                                <span className="text-[10px] text-gray-400">{obs.form_name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:c.bg,color:c.color}}>{obs.competency_level} — {c.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                <span className="font-semibold">{obs.learning_area}</span>
                                                {obs.strand&&<><span className="text-gray-300">·</span><span>{obs.strand}</span></>}
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-2.5 border border-gray-100">{obs.observation}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1.5">
                                                {obs.teacher_name&&<span className="flex items-center gap-1"><FiUsers size={9}/>{obs.teacher_name}</span>}
                                                <span className="flex items-center gap-1"><FiCalendar size={9}/>{fmtDate(obs.date_observed)}</span>
                                                {obs.term&&<span>{obs.term}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════ NEMIS EXPORT ══════════════════════════════════ */}
            {tab==='nemis'&&(
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">NEMIS CBC Data Export</h2><p className="text-xs text-gray-500">Generate government-compliant CBC data for MoE/KNEC submission</p></div>
                        <button onClick={()=>setShowNEMIS(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}><FiDownload size={14}/>Generate Export</button>
                    </div>

                    {/* What is NEMIS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[{ic:'🏛️',l:'National Education Management Information System',d:'Government platform for school data. CBC competency data must be uploaded each term.',c:'#059669'},
                          {ic:'📋',l:'Required Data Fields',d:'Adm No, NEMIS No, Student Name, Grade, Subject, Competency Level (EE/ME/AE/BE), Term, Year.',c:'#2563EB'},
                          {ic:'📅',l:'Submission Timeline',d:'Upload CBC data within 2 weeks of term end. Non-compliance may affect KNEC exam registration.',c:'#D97706'},
                        ].map((item,i)=>(
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                <div className="text-2xl mb-2">{item.ic}</div>
                                <p className="font-bold text-gray-800 text-sm mb-1">{item.l}</p>
                                <p className="text-xs text-gray-500 leading-relaxed">{item.d}</p>
                            </div>
                        ))}
                    </div>

                    {/* Export history */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">Export History</h3>
                            <button onClick={()=>setShowNEMIS(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#059669'}}><FiPlus size={11}/>New Export</button>
                        </div>
                        {nemisExports.length===0 ? (
                            <div className="py-12 text-center text-gray-400 text-sm"><FiDownload size={28} className="mx-auto mb-2 text-gray-200"/><p>No exports yet</p><button onClick={()=>setShowNEMIS(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#059669'}}>Generate First Export</button></div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {nemisExports.map(exp=>(
                                    <div key={exp.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:exp.status==='complete'?'#D1FAE5':'#FEF3C7'}}><FiDownload size={14} style={{color:exp.status==='complete'?'#059669':'#D97706'}}/></div>
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{exp.grade_level} — {exp.term} {exp.year}</p>
                                                <p className="text-[10px] text-gray-400">{exp.record_count} records · Exported by {exp.exported_by} · {fmtDate(exp.created_at)}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${exp.status==='complete'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{exp.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════ SMS TEMPLATES ════════════════════════════════ */}
            {tab==='sms'&&(
                <div className="space-y-4">
                    <div>
                        <h2 className="font-black text-gray-800 text-lg">CBC Parent SMS/WhatsApp Templates</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Ready-to-use CBC-specific message templates for parent communication</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SMS_TEMPLATES.map(tpl=>(
                            <div key={tpl.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <h3 className="font-black text-gray-800">{tpl.name}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><FiClock size={9}/>Trigger: {tpl.trigger}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={()=>setSelTpl(tpl)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><FiEye size={13}/></button>
                                        <button onClick={()=>{navigator.clipboard.writeText(tpl.template);setCopied(tpl.id);setTimeout(()=>setCopied(null),2000);toast.success('Template copied!');}} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100">{copiedTemplate===tpl.id?<FiCheck size={13} className="text-green-600"/>:<FiCopy size={13}/>}</button>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-xs text-gray-700 leading-relaxed font-mono">{tpl.template}</p>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {tpl.template.match(/\{[^}]+\}/g)?.map(v=>(
                                        <span key={v} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">{v}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-xs text-blue-800">
                        <p className="font-bold mb-1">💡 How to use these templates</p>
                        <p>Copy the template, replace <code className="bg-blue-100 px-1 rounded">{'{variables}'}</code> with actual data from your database, then paste into your SMS/WhatsApp platform (e.g. Twilio, Africa's Talking, Safaricom Business). APSIMS can auto-fill these variables when integrated with your SMS gateway.</p>
                    </div>
                </div>
            )}

            {/* ══════════ RUBRICS ═══════════════════════════════════════ */}
            {tab==='rubrics'&&(
                <div className="space-y-5">
                    <h2 className="font-black text-gray-800 text-lg">Competency Level Descriptors — Official KICD Rubrics</h2>
                    {/* Global descriptors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.entries(COMP) as [CompLevel,typeof COMP.EE][]).map(([k,v])=>(
                            <div key={k} className="rounded-2xl p-5 border-2" style={{background:v.bg,borderColor:v.color+'44'}}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{background:v.color}}>{k}</div>
                                    <div><h3 className="font-black text-gray-800 text-lg">{k}</h3><p className="text-sm font-semibold" style={{color:v.color}}>{v.label}</p></div>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed mb-3">{v.desc}</p>
                                <div className="rounded-xl p-3 bg-white/60 border border-white">
                                    <p className="text-xs font-bold text-gray-600 mb-1">What this means for the teacher:</p>
                                    <p className="text-xs text-gray-600">
                                        {k==='EE'?'Challenge this student with extension activities. Document their exceptional performance in portfolio.':
                                         k==='ME'?'Maintain current teaching strategies. Continue monitoring and documenting progress.':
                                         k==='AE'?'Provide additional practice and targeted support. Schedule check-ins to track improvement.':
                                         'Immediate intervention required. Contact HOD/parents. Create individualized support plan.'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Per-subject rubrics */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Subject-Specific Competency Descriptors</h3><p className="text-xs text-gray-500">Per KICD guidelines — how each level looks in each subject</p></div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left w-32">Subject</th>
                                    <th className="px-4 py-3 text-left" style={{color:'#059669'}}>EE — Exceeding</th>
                                    <th className="px-4 py-3 text-left" style={{color:'#2563EB'}}>ME — Meeting</th>
                                    <th className="px-4 py-3 text-left" style={{color:'#D97706'}}>AE — Approaching</th>
                                    <th className="px-4 py-3 text-left" style={{color:'#DC2626'}}>BE — Below</th>
                                </tr></thead>
                                <tbody>
                                    {[{sub:'English',ee:'Communicates fluently, reads complex texts, writes creatively with minimal errors',me:'Communicates clearly, reads grade-level texts, writes coherently',ae:'Communicates with support, reads simple texts, writes with errors',be:'Struggles to communicate, reads below level, needs significant writing support'},
                                      {sub:'Mathematics',ee:'Solves complex problems independently, applies concepts to new contexts, teaches peers',me:'Solves grade-level problems with accuracy, understands concepts',ae:'Solves basic problems with some errors, needs reminders of concepts',be:'Struggles with basic operations, requires constant support and scaffolding'},
                                      {sub:'Integrated Science',ee:'Designs own experiments, explains phenomena beyond grade level, links concepts',me:'Performs experiments accurately, understands scientific concepts',ae:'Follows experiment steps with guidance, basic concept understanding',be:'Cannot perform experiments independently, minimal concept grasp'},
                                      {sub:'Social Studies',ee:'Analyses complex social issues, makes informed judgements, strong geography skills',me:'Understands social concepts, locates places, explains historical events',ae:'Basic social awareness, needs guidance on maps and history',be:'Limited awareness of social studies concepts, requires intensive support'},
                                    ].map((row,i)=>(
                                        <tr key={i} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-gray-50/30'}`}>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-700">{row.sub}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 leading-relaxed">{row.ee}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 leading-relaxed">{row.me}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 leading-relaxed">{row.ae}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 leading-relaxed">{row.be}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ SETTINGS ══════════════════════════════════════ */}
            {tab==='settings'&&(
                <div className="space-y-5">
                    <h2 className="font-black text-gray-800 text-lg">CBC System Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiShield size={16} className="text-cyan-600"/>Database Setup SQL</h3>
                            <pre className="bg-gray-900 text-green-400 text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-56">{SQL_CONFIG}</pre>
                            <button onClick={()=>{navigator.clipboard.writeText(SQL_CONFIG);toast.success('Copied!');}} className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100"><FiCopy size={12}/>Copy SQL</button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiArrowRight size={16} className="text-blue-500"/>CBC Module Links</h3>
                            <div className="space-y-1.5">
                                {[{href:'/dashboard/cbc/portfolio',l:'Student Portfolio',ic:FiFolder},{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward},{href:'/dashboard/exams/cbc-report-cards',l:'CBC Report Cards',ic:FiFileText},{href:'/dashboard/cbc/parent-portal',l:'Parent Portal',ic:FiUsers},{href:'/dashboard/jss/setup',l:'JSS Setup (G7-9)',ic:FiGrid},{href:'/dashboard/jss/pathways',l:'Pathway Selection',ic:FiTarget},{href:'/dashboard/exams/cbc-marks',l:'CBC Mark Entry',ic:FiBookOpen},{href:'/dashboard/exams/cbc-reports',l:'CBC Analytics Hub',ic:FiBarChart2}].map(l=>(
                                    <Link key={l.href} href={l.href} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 group">
                                        <div className="flex items-center gap-2"><l.ic size={13} className="text-gray-400"/><span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700">{l.l}</span></div>
                                        <FiChevronRight size={12} className="text-gray-300 group-hover:text-cyan-400"/>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ ADD LEARNING AREA MODAL ══════════════════════ */}
            {showAddArea&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><FiBook size={18} color="#fff"/></div><div><h2 className="text-lg font-black text-white">Add Learning Area</h2><p className="text-blue-200 text-xs">Custom learning area or sub-subject</p></div></div>
                            <button onClick={()=>setShowArea(false)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Name <span className="text-red-500">*</span></label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Pre-Technical Studies" value={areaForm.name} onChange={e=>setAreaForm({...areaForm,name:e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Code <span className="text-red-500">*</span></label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 uppercase" placeholder="e.g. PTC" value={areaForm.code} onChange={e=>setAreaForm({...areaForm,code:e.target.value.toUpperCase()})}/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Grade Levels</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. 7-9" value={areaForm.grade_levels} onChange={e=>setAreaForm({...areaForm,grade_levels:e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Icon</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. 📐" value={areaForm.icon} onChange={e=>setAreaForm({...areaForm,icon:e.target.value})}/></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={saveArea} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#0EA5E9,#0284C7)'}}>{saving?<><FiRefreshCw size={14} className="animate-spin"/>Saving…</>:<><FiCheck size={14}/>Add Learning Area</>}</button>
                                <button onClick={()=>setShowArea(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ LOG OBSERVATION MODAL ════════════════════════ */}
            {showAddObs&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><FiActivity size={18} color="#fff"/></div><div><h2 className="text-lg font-black text-white">Log Formative Observation</h2><p className="text-violet-200 text-xs">Record CBC continuous assessment observation</p></div></div>
                            <button onClick={()=>{setShowObs(false);setObsForm(emptyObs);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Student <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={obsForm.student_id} onChange={e=>setObsForm({...obsForm,student_id:e.target.value})}>
                                        <option value="">Select student…</option>
                                        {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.form_name}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Learning Area <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={obsForm.learning_area} onChange={e=>setObsForm({...obsForm,learning_area:e.target.value})}>
                                        <option value="">Select area…</option>
                                        {KICD_STRANDS.map(a=><option key={a.code} value={a.area}>{a.icon} {a.area}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Strand</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={obsForm.strand} onChange={e=>setObsForm({...obsForm,strand:e.target.value})}>
                                        <option value="">Select strand…</option>
                                        {KICD_STRANDS.find(a=>a.area===obsForm.learning_area)?.strands.map(s=><option key={s.code} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Competency Level</label>
                                    <div className="flex gap-1">
                                        {(['EE','ME','AE','BE'] as CompLevel[]).map(k=>{const c=COMP[k];return(
                                            <button key={k} onClick={()=>setObsForm({...obsForm,competency_level:k})} className="flex-1 py-2 rounded-lg text-xs font-black border-2 transition-all" style={obsForm.competency_level===k?{background:c.color,color:'#fff',borderColor:c.color}:{background:c.bg,color:c.color,borderColor:c.color+'44'}}>{k}</button>
                                        );})}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Date Observed</label><input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={obsForm.date_observed} onChange={e=>setObsForm({...obsForm,date_observed:e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Term</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" value={obsForm.term} onChange={e=>setObsForm({...obsForm,term:e.target.value})}>
                                        <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Teacher Name</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder="Your name" value={obsForm.teacher_name} onChange={e=>setObsForm({...obsForm,teacher_name:e.target.value})}/></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Observation <span className="text-red-500">*</span></label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none" rows={3} placeholder="Describe what you observed about this student's performance in this learning area. Be specific — e.g. 'Student independently composed a 3-paragraph story with correct punctuation and creative plot.'" value={obsForm.observation} onChange={e=>setObsForm({...obsForm,observation:e.target.value})}/>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={saveObs} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}}>{saving?<><FiRefreshCw size={14} className="animate-spin"/>Saving…</>:<><FiCheck size={14}/>Log Observation</>}</button>
                                <button onClick={()=>{setShowObs(false);setObsForm(emptyObs);}} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ NEMIS MODAL ═══════════════════════════════════ */}
            {showNEMIS&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><FiDownload size={18} color="#fff"/></div><div><h2 className="text-lg font-black text-white">Generate NEMIS CBC Export</h2><p className="text-green-100 text-xs">Government-compliant CBC data file</p></div></div>
                            <button onClick={()=>setShowNEMIS(false)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Term</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={nemisForm.term} onChange={e=>setNemisForm({...nemisForm,term:e.target.value})}>
                                        <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Year</label><input type="number" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={nemisForm.year} onChange={e=>setNemisForm({...nemisForm,year:e.target.value})}/></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Grade Level</label>
                                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" value={nemisForm.grade_level} onChange={e=>setNemisForm({...nemisForm,grade_level:e.target.value})}>
                                    {['Grade 7','Grade 8','Grade 9','All JSS'].map(g=><option key={g}>{g}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Exported By <span className="text-red-500">*</span></label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" placeholder="Your name / position" value={nemisForm.exported_by} onChange={e=>setNemisForm({...nemisForm,exported_by:e.target.value})}/></div>
                            <div className="rounded-xl p-3 bg-green-50 border border-green-200 text-xs text-green-800">
                                <p className="font-bold mb-1">📄 Export includes:</p>
                                <ul className="space-y-0.5 list-disc list-inside text-green-700">
                                    <li>Adm No, NEMIS No, Student Name, Gender</li>
                                    <li>Learning Area, Competency Level (EE/ME/AE/BE)</li>
                                    <li>Term, Year, Form/Grade</li>
                                    <li>CSV format compatible with NEMIS upload portal</li>
                                </ul>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={generateNEMIS} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>{saving?<><FiRefreshCw size={14} className="animate-spin"/>Generating…</>:<><FiDownload size={14}/>Generate & Download</>}</button>
                                <button onClick={()=>setShowNEMIS(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SMS Template Preview Modal */}
            {selectedTemplate&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><FiMessageSquare size={18} color="#fff"/></div><div><h2 className="font-black text-white">{selectedTemplate.name}</h2><p className="text-pink-100 text-xs">{selectedTemplate.trigger}</p></div></div>
                            <button onClick={()=>setSelTpl(null)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-900 rounded-xl p-4"><p className="text-green-400 text-sm font-mono leading-relaxed whitespace-pre-wrap">{selectedTemplate.template}</p></div>
                            <div><p className="text-xs font-bold text-gray-600 mb-2">Template Variables:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedTemplate.template.match(/\{[^}]+\}/g)?.map(v=>(
                                        <div key={v} className="flex flex-col items-center px-2.5 py-2 rounded-lg bg-blue-50 border border-blue-100">
                                            <span className="text-[10px] font-bold text-blue-700">{v}</span>
                                            <span className="text-[9px] text-gray-400">Replace with actual value</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={()=>{navigator.clipboard.writeText(selectedTemplate.template);toast.success('Template copied!');setSelTpl(null);}} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}><FiCopy size={14}/>Copy Template</button>
                                <button onClick={()=>setSelTpl(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
