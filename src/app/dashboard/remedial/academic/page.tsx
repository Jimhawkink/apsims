'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiBook, FiUsers, FiCalendar, FiTrendingUp, FiBarChart2,
  FiPlus, FiX, FiCheck, FiEdit2, FiTrash2, FiSearch,
  FiRefreshCw, FiDownload, FiPrinter, FiAlertTriangle,
  FiCheckCircle, FiClock, FiTarget, FiActivity, FiList,
  FiSave, FiEye, FiSend, FiShield, FiZap, FiUser, FiLayers,
} from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Program {
  id?: number; name: string; subject_id: number; form_id: number;
  term_id: number; teacher_id?: number; start_date?: string; end_date?: string;
  schedule?: string; target_score: number; status: 'active'|'completed'|'planned';
  description?: string; max_students?: number;
  subject_name?: string; form_name?: string; teacher_name?: string; term_name?: string;
}
interface Enrollment {
  id?: number; program_id: number; student_id: number; pre_score?: number;
  post_score?: number; status: 'enrolled'|'completed'|'dropped'; enrolled_at?: string;
  student_name?: string; admission_no?: string;
}
interface Session {
  id?: number; program_id: number; session_date: string; start_time?: string;
  end_time?: string; topic: string; notes?: string; program_name?: string;
}
interface Attendance {
  id?: number; session_id: number; student_id: number;
  status: 'present'|'absent'|'late'; notes?: string;
}

type Tab = 'programs'|'enrollment'|'sessions'|'attendance'|'progress'|'analytics';

const STATUS_COLORS = {
  active:    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  completed: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  planned:   { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  enrolled:  { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  dropped:   { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};
const ATTEND_STYLES = {
  present: { bg: '#d1fae5', text: '#065f46', label: '✅ Present' },
  absent:  { bg: '#fee2e2', text: '#991b1b', label: '❌ Absent' },
  late:    { bg: '#fef3c7', text: '#92400e', label: '⏰ Late' },
};

// ── Confirmation dialog helper ────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: any) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth: wide ? 820 : 520, maxHeight:'92vh', overflow:'auto', boxShadow:'0 25px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'2px solid #f1f5f9', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <h3 style={{ fontWeight:900, fontSize:16, color:'#1e293b', margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}><FiX size={16}/></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon, grad }: any) {
  return (
    <div style={{ background: grad, borderRadius:18, padding:'18px 20px', color:'#fff', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }}/>
      <div style={{ fontSize:28 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{value}</div>
      <div style={{ fontSize:11, opacity:0.8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
      {sub && <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RemedialAcademicPage() {
  // ── Master data ──
  const [forms,    setForms]    = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks,    setMarks]    = useState<any[]>([]);

  // ── App data ──
  const [programs,    setPrograms]    = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [attendance,  setAttendance]  = useState<Attendance[]>([]);

  const [tab, setTab]       = useState<Tab>('programs');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // ── Filters ──
  const [selProgram, setSelProgram] = useState('');
  const [selSession, setSelSession] = useState('');
  const [selForm,    setSelForm]    = useState('');
  const [search,     setSearch]     = useState('');

  // ── Modals ──
  const [showProgramModal,    setShowProgramModal]    = useState(false);
  const [showSessionModal,    setShowSessionModal]    = useState(false);
  const [showEnrollModal,     setShowEnrollModal]     = useState(false);
  const [showProgressModal,   setShowProgressModal]   = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);

  const [editProgram,  setEditProgram]  = useState<Partial<Program>>({});
  const [editSession,  setEditSession]  = useState<Partial<Session>>({});
  const [editEnroll,   setEditEnroll]   = useState<{program_id:number; studentIds:number[]}>({ program_id:0, studentIds:[] });
  const [progressTarget, setProgressTarget] = useState<Enrollment|null>(null);
  const [interventionText, setInterventionText] = useState('');
  const [interventionStudent, setInterventionStudent] = useState<any>(null);

  // ── Attend editing ──
  const [attendEdits, setAttendEdits] = useState<Record<string,Attendance['status']>>({});
  const [attendNotes, setAttendNotes] = useState<Record<string,string>>({});

  // ── Load master data ──
  const loadMaster = useCallback(async () => {
    const [f, sub, t, tch, s, m] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_teachers').select('id,first_name,last_name').eq('status','Active').order('first_name'),
      supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id').eq('status','Active').order('first_name'),
      supabase.from('school_exam_marks').select('student_id,subject_id,score,term_id').limit(20000),
    ]);
    setForms(f.data||[]); setSubjects(sub.data||[]);
    setTerms(t.data||[]); setTeachers(tch.data||[]);
    setStudents(s.data||[]); setMarks(m.data||[]);
  }, []);

  // ── Load remedial data ──
  const loadRemedial = useCallback(async () => {
    const [prog, enr, sess, att] = await Promise.all([
      supabase.from('school_remedial_programs').select('*').order('id', { ascending:false }),
      supabase.from('school_remedial_enrollments').select('*'),
      supabase.from('school_remedial_sessions').select('*').order('session_date', { ascending:false }),
      supabase.from('school_remedial_attendance').select('*'),
    ]);
    setPrograms(prog.data||[]);
    setEnrollments(enr.data||[]);
    setSessions(sess.data||[]);
    setAttendance(att.data||[]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMaster(), loadRemedial().catch(() => {})]);
    setLoading(false);
  }, [loadMaster, loadRemedial]);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ──
  const getSubjectName = (id: number) => subjects.find(s=>s.id===id)?.subject_name||'—';
  const getFormName    = (id: number) => forms.find(f=>f.id===id)?.form_name||'—';
  const getTeacherName = (id: number) => { const t=teachers.find(t=>t.id===id); return t?`${t.first_name} ${t.last_name}`:'—'; };
  const getTermName    = (id: number) => terms.find(t=>t.id===id)?.term_name||'—';
  const getStudentName = (id: number) => { const s=students.find(s=>s.id===id); return s?`${s.first_name} ${s.last_name}`:'—'; };
  const getAdmNo       = (id: number) => { const s=students.find(s=>s.id===id); return s?.admission_no||s?.admission_number||'—'; };

  // ── Auto-detect at-risk students for a program ──
  const getAtRiskStudents = (program: Program) => {
    const formStudents = students.filter(s => s.form_id === program.form_id);
    return formStudents.filter(s => {
      const studentMarks = marks.filter(m => m.student_id === s.id && m.subject_id === program.subject_id && String(m.term_id) === String(program.term_id));
      if (!studentMarks.length) return false;
      const avg = studentMarks.reduce((a,m) => a + Number(m.score||0), 0) / studentMarks.length;
      return avg < (program.target_score || 50);
    });
  };

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = programs.length;
    const active = programs.filter(p=>p.status==='active').length;
    const totalEnrolled = enrollments.length;
    const improved = enrollments.filter(e => e.post_score && e.pre_score && e.post_score > e.pre_score).length;
    const totalSessions = sessions.length;
    const presentCount = attendance.filter(a=>a.status==='present').length;
    const attendRate = attendance.length ? Math.round((presentCount/attendance.length)*100) : 0;
    return { total, active, totalEnrolled, improved, totalSessions, attendRate };
  }, [programs, enrollments, sessions, attendance]);

  // ── Derived lists ──
  const filteredPrograms = useMemo(() =>
    programs.filter(p =>
      (!selForm || String(p.form_id) === selForm) &&
      (!search || [getSubjectName(p.subject_id), getFormName(p.form_id), p.name||''].some(v => v.toLowerCase().includes(search.toLowerCase())))
    ), [programs, selForm, search, subjects, forms]);

  const programSessions = useMemo(() =>
    selProgram ? sessions.filter(s => String(s.program_id) === selProgram) : sessions,
    [sessions, selProgram]);

  const sessionEnrollments = useMemo(() => {
    const sess = sessions.find(s => String(s.id) === selSession);
    if (!sess) return [];
    return enrollments.filter(e => String(e.program_id) === String(sess.program_id));
  }, [selSession, sessions, enrollments]);

  // ── Save program ──
  const saveProgram = async () => {
    if (!editProgram.name || !editProgram.subject_id || !editProgram.form_id || !editProgram.term_id) {
      toast.error('Fill in Program Name, Subject, Form and Term'); return;
    }
    setSaving(true);
    const payload = { ...editProgram, target_score: editProgram.target_score||50, status: editProgram.status||'active' };
    const { error } = editProgram.id
      ? await supabase.from('school_remedial_programs').update(payload).eq('id', editProgram.id)
      : await supabase.from('school_remedial_programs').insert([payload]);
    if (error) toast.error(error.message);
    else { toast.success(editProgram.id ? 'Program updated!' : '✅ Remedial program created!'); setShowProgramModal(false); setEditProgram({}); loadRemedial(); }
    setSaving(false);
  };

  // ── Delete program ──
  const deleteProgram = async (id: number) => {
    if (!confirm('Delete this remedial program and all its sessions/enrollments?')) return;
    await supabase.from('school_remedial_attendance').delete().in('session_id', sessions.filter(s=>s.program_id===id).map(s=>s.id!));
    await supabase.from('school_remedial_sessions').delete().eq('program_id', id);
    await supabase.from('school_remedial_enrollments').delete().eq('program_id', id);
    await supabase.from('school_remedial_programs').delete().eq('id', id);
    toast.success('Program deleted'); loadRemedial();
  };

  // ── Save session ──
  const saveSession = async () => {
    if (!editSession.program_id || !editSession.session_date || !editSession.topic) {
      toast.error('Fill Program, Date and Topic'); return;
    }
    setSaving(true);
    const { error } = editSession.id
      ? await supabase.from('school_remedial_sessions').update(editSession).eq('id', editSession.id)
      : await supabase.from('school_remedial_sessions').insert([editSession]);
    if (error) toast.error(error.message);
    else { toast.success('Session saved!'); setShowSessionModal(false); setEditSession({}); loadRemedial(); }
    setSaving(false);
  };

  // ── Bulk enroll ──
  const bulkEnroll = async () => {
    if (!editEnroll.program_id || editEnroll.studentIds.length === 0) {
      toast.error('Select a program and at least one student'); return;
    }
    setSaving(true);
    const prog = programs.find(p => p.id === editEnroll.program_id);
    const payload = editEnroll.studentIds.map(sid => {
      const studentMarks = marks.filter(m => m.student_id === sid && m.subject_id === prog?.subject_id && String(m.term_id) === String(prog?.term_id));
      const preScore = studentMarks.length ? Math.round(studentMarks.reduce((a,m)=>a+Number(m.score||0),0)/studentMarks.length) : 0;
      return { program_id: editEnroll.program_id, student_id: sid, pre_score: preScore, status: 'enrolled', enrolled_at: new Date().toISOString() };
    });
    const { error } = await supabase.from('school_remedial_enrollments').upsert(payload as any, { onConflict: 'program_id,student_id', ignoreDuplicates: true });
    if (error) toast.error(error.message);
    else { toast.success(`✅ ${payload.length} students enrolled!`); setShowEnrollModal(false); loadRemedial(); }
    setSaving(false);
  };

  // ── Save attendance bulk ──
  const saveAttendance = async () => {
    if (!selSession) { toast.error('Select a session first'); return; }
    setSaving(true);
    const sid = Number(selSession);
    const upserts = Object.entries(attendEdits).map(([student_id, status]) => ({
      session_id: sid, student_id: Number(student_id), status,
      notes: attendNotes[student_id] || null,
    }));
    if (upserts.length === 0) { toast.error('No attendance marked'); setSaving(false); return; }
    const { error } = await supabase.from('school_remedial_attendance').upsert(upserts as any, { onConflict: 'session_id,student_id' });
    if (error) toast.error(error.message);
    else { toast.success(`✅ Attendance saved for ${upserts.length} students!`); setAttendEdits({}); setAttendNotes({}); loadRemedial(); }
    setSaving(false);
  };

  // ── Update post-score (progress) ──
  const saveProgress = async () => {
    if (!progressTarget) return;
    setSaving(true);
    const { error } = await supabase.from('school_remedial_enrollments')
      .update({ post_score: progressTarget.post_score, status: progressTarget.status })
      .eq('id', progressTarget.id);
    if (error) toast.error(error.message);
    else { toast.success('Progress updated!'); setShowProgressModal(false); setProgressTarget(null); loadRemedial(); }
    setSaving(false);
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const rows = [['Program','Subject','Form','Teacher','Term','Status','Enrolled','Sessions']];
    programs.forEach(p => {
      rows.push([
        p.name||getSubjectName(p.subject_id),
        getSubjectName(p.subject_id),
        getFormName(p.form_id),
        getTeacherName(p.teacher_id||0),
        getTermName(p.term_id),
        p.status,
        String(enrollments.filter(e=>e.program_id===p.id).length),
        String(sessions.filter(s=>s.program_id===p.id).length),
      ]);
    });
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='remedial_programs.csv'; a.click();
  };

  const TABS: {id:Tab; label:string; icon:any; badge?:number}[] = [
    { id:'programs',   label:'Programs',   icon:FiBook,     badge:programs.length },
    { id:'enrollment', label:'Enrollment', icon:FiUsers,    badge:enrollments.length },
    { id:'sessions',   label:'Sessions',   icon:FiCalendar, badge:sessions.length },
    { id:'attendance', label:'Attendance', icon:FiList },
    { id:'progress',   label:'Progress',   icon:FiTrendingUp },
    { id:'analytics',  label:'Analytics',  icon:FiBarChart2 },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse" style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
          <FiBook size={28} color="#fff"/>
        </div>
        <p className="text-xl font-black text-gray-800">Loading Remedial Programs...</p>
        <p className="text-sm text-gray-400 mt-1">Academic intervention tracking system</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl text-white" style={{background:'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)', minHeight:180}}>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
        <div className="absolute top-6 right-6 w-48 h-48 opacity-10" style={{background:'radial-gradient(circle,#6ee7b7,transparent)',filter:'blur(40px)'}}/>
        <div className="relative px-8 py-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"/>
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Academic Intervention System</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1">📚 Remedial Programs</h1>
            <p className="text-emerald-200 text-sm max-w-xl">Identify at-risk students · Assign targeted remedial sessions · Track attendance · Measure improvement · Generate reports</p>
            <div className="flex flex-wrap gap-6 mt-5">
              {[
                {l:'Total Programs',   v:kpis.total,        c:'#6ee7b7'},
                {l:'Active Programs',  v:kpis.active,       c:'#34d399'},
                {l:'Students Enrolled',v:kpis.totalEnrolled,c:'#a7f3d0'},
                {l:'Students Improved',v:kpis.improved,     c:'#fde68a'},
                {l:'Sessions Held',    v:kpis.totalSessions,c:'#93c5fd'},
                {l:'Avg Attend. Rate', v:`${kpis.attendRate}%`, c:'#f9a8d4'},
              ].map(k=>(
                <div key={k.l}>
                  <p className="text-2xl font-black" style={{color:k.c}}>{k.v}</p>
                  <p className="text-[10px] text-white/50 font-bold uppercase">{k.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            <button onClick={() => { setEditProgram({status:'active',target_score:50}); setShowProgramModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all">
              <FiPlus size={14}/> New Program
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all">
              <FiDownload size={14}/> Export CSV
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all">
              <FiPrinter size={14}/> Print Report
            </button>
          </div>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${active ? 'text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
              style={active ? {background:'linear-gradient(135deg,#059669,#10b981)'} : {}}>
              <Icon size={14}/>{t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${active?'bg-white/20 text-white':'bg-emerald-100 text-emerald-700'}`}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: PROGRAMS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'programs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-gray-200 p-4">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search programs, subjects…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 outline-none"/>
            </div>
            <select value={selForm} onChange={e=>setSelForm(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
              <option value="">All Forms</option>
              {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-emerald-600">
              <FiRefreshCw size={15}/>
            </button>
            <button onClick={() => { setEditProgram({status:'active',target_score:50}); setShowProgramModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
              <FiPlus size={14}/> New Program
            </button>
          </div>

          {/* Program Cards */}
          {filteredPrograms.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-700 font-black text-lg">No Remedial Programs Yet</p>
              <p className="text-gray-400 text-sm mt-2 mb-6">Create a program to start tracking academic interventions</p>
              <button onClick={() => { setEditProgram({status:'active',target_score:50}); setShowProgramModal(true); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                <FiPlus size={14}/> Create First Program
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPrograms.map(prog => {
                const enrolled = enrollments.filter(e=>e.program_id===prog.id).length;
                const sessCount = sessions.filter(s=>s.program_id===prog.id).length;
                const progAttend = attendance.filter(a => sessions.filter(s=>s.program_id===prog.id).map(s=>s.id).includes(a.session_id));
                const rate = progAttend.length ? Math.round((progAttend.filter(a=>a.status==='present').length/progAttend.length)*100) : 0;
                const improved = enrollments.filter(e=>e.program_id===prog.id&&e.post_score&&e.pre_score&&e.post_score>e.pre_score).length;
                const sc = STATUS_COLORS[prog.status]||STATUS_COLORS.active;
                return (
                  <div key={prog.id} className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:shadow-xl transition-all group"
                    style={{borderLeftWidth:4, borderLeftColor:prog.status==='active'?'#059669':prog.status==='completed'?'#3b82f6':'#f59e0b'}}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`}}>
                          {prog.status.toUpperCase()}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Target: {prog.target_score||50}%
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditProgram(prog); setShowProgramModal(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><FiEdit2 size={13}/></button>
                        <button onClick={() => deleteProgram(prog.id!)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><FiTrash2 size={13}/></button>
                      </div>
                    </div>
                    <h3 className="font-black text-gray-900 text-base">{prog.name || getSubjectName(prog.subject_id)}</h3>
                    <p className="text-xs text-gray-500 mt-1">📖 {getSubjectName(prog.subject_id)} · 🏫 {getFormName(prog.form_id)} · {getTermName(prog.term_id)}</p>
                    {prog.teacher_id && <p className="text-xs text-emerald-600 mt-1 font-semibold">👨‍🏫 {getTeacherName(prog.teacher_id)}</p>}
                    {prog.schedule && <p className="text-xs text-gray-400 mt-1">🕐 {prog.schedule}</p>}
                    {prog.description && <p className="text-xs text-gray-500 mt-2 italic border-t border-gray-100 pt-2">{prog.description}</p>}
                    
                    {/* Stats bar */}
                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-2 text-center">
                      {[
                        {v:enrolled,  l:'Enrolled',  c:'#6366f1'},
                        {v:sessCount, l:'Sessions',  c:'#0ea5e9'},
                        {v:`${rate}%`,l:'Attend',    c:rate>=75?'#059669':rate>=50?'#d97706':'#dc2626'},
                        {v:improved,  l:'Improved',  c:'#10b981'},
                      ].map(k=>(
                        <div key={k.l}>
                          <p className="text-sm font-black" style={{color:k.c}}>{k.v}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{k.l}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => { setEditEnroll({program_id:prog.id!, studentIds:[]}); setShowEnrollModal(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
                        style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                        <FiUsers size={11}/> Enroll
                      </button>
                      <button onClick={() => { setSelProgram(String(prog.id)); setShowSessionModal(true); setEditSession({program_id:prog.id}); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
                        style={{background:'linear-gradient(135deg,#0ea5e9,#0284c7)'}}>
                        <FiCalendar size={11}/> Add Session
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: ENROLLMENT                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'enrollment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
            <div>
              <p className="font-black text-gray-800">Student Enrollment Register</p>
              <p className="text-xs text-gray-500 mt-0.5">{enrollments.length} students enrolled across {programs.length} programs</p>
            </div>
            <button onClick={() => { setEditEnroll({program_id:0, studentIds:[]}); setShowEnrollModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
              <FiPlus size={14}/> Enroll Students
            </button>
          </div>

          {programs.map(prog => {
            const progEnrollments = enrollments.filter(e => e.program_id === prog.id);
            if (progEnrollments.length === 0) return null;
            return (
              <div key={prog.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
                  style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)'}}>
                  <div>
                    <h3 className="font-black text-gray-800 text-sm">{prog.name||getSubjectName(prog.subject_id)}</h3>
                    <p className="text-xs text-emerald-600">{getFormName(prog.form_id)} · {getTermName(prog.term_id)} · {progEnrollments.length} students</p>
                  </div>
                  <button onClick={() => { setEditEnroll({program_id:prog.id!, studentIds:[]}); setShowEnrollModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{background:'#059669'}}>
                    <FiPlus size={10}/> Add More
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{['#','Adm No','Student','Pre-Score','Post-Score','Improvement','Status','Actions'].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {progEnrollments.map((enr, i) => {
                        const improvement = enr.post_score && enr.pre_score ? enr.post_score - enr.pre_score : null;
                        const sc2 = STATUS_COLORS[enr.status as keyof typeof STATUS_COLORS]||STATUS_COLORS.enrolled;
                        return (
                          <tr key={enr.id} className="hover:bg-emerald-50/20">
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i+1}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{getAdmNo(enr.student_id)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{getStudentName(enr.student_id)}</td>
                            <td className="px-4 py-3">
                              {enr.pre_score !== undefined && enr.pre_score !== null
                                ? <span className="font-black text-red-600">{enr.pre_score}%</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {enr.post_score !== undefined && enr.post_score !== null
                                ? <span className="font-black text-emerald-600">{enr.post_score}%</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {improvement !== null
                                ? <span className={`font-black ${improvement>0?'text-emerald-600':improvement<0?'text-red-600':'text-gray-500'}`}>
                                    {improvement>0?'↑ ':improvement<0?'↓ ':''}{Math.abs(improvement)}pts
                                  </span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background:sc2.bg,color:sc2.text}}>{enr.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => { setProgressTarget({...enr}); setShowProgressModal(true); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{background:'#0ea5e9'}}>
                                <FiTrendingUp size={10}/> Update Score
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {enrollments.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-3">👥</div>
              <p className="font-bold text-gray-600">No Students Enrolled Yet</p>
              <p className="text-xs text-gray-400 mt-1">Create a program first, then enroll students</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: SESSIONS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex gap-3 items-center flex-1">
              <select value={selProgram} onChange={e=>setSelProgram(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm flex-1 max-w-xs">
                <option value="">All Programs</option>
                {programs.map(p=><option key={p.id} value={p.id}>{p.name||getSubjectName(p.subject_id)} — {getFormName(p.form_id)}</option>)}
              </select>
              <span className="text-xs text-gray-500 font-bold">{programSessions.length} sessions</span>
            </div>
            <button onClick={() => { setShowSessionModal(true); setEditSession(selProgram?{program_id:Number(selProgram)}:{}); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
              <FiPlus size={14}/> Add Session
            </button>
          </div>

          {programSessions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-3">📅</div>
              <p className="font-bold text-gray-600">No Sessions Scheduled</p>
              <p className="text-xs text-gray-400 mt-1">Add sessions to start tracking attendance</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Date','Program','Topic','Time','Enrolled','Attended','Rate','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {programSessions.map(sess => {
                    const prog = programs.find(p=>p.id===sess.program_id);
                    const enrolled2 = enrollments.filter(e=>String(e.program_id)===String(sess.program_id)).length;
                    const sessAtt = attendance.filter(a=>a.session_id===sess.id);
                    const present2 = sessAtt.filter(a=>a.status==='present').length;
                    const rate2 = enrolled2 > 0 ? Math.round((present2/enrolled2)*100) : 0;
                    return (
                      <tr key={sess.id} className="hover:bg-emerald-50/20">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{sess.session_date}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 text-xs">{prog?.name||getSubjectName(prog?.subject_id||0)}</p>
                          <p className="text-[10px] text-gray-400">{getFormName(prog?.form_id||0)}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 max-w-[200px] truncate">{sess.topic}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{sess.start_time||'—'}{sess.end_time?`-${sess.end_time}`:''}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{enrolled2}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{present2}/{sessAtt.length}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${rate2}%`,background:rate2>=75?'#059669':rate2>=50?'#d97706':'#dc2626'}}/>
                            </div>
                            <span className="text-xs font-black" style={{color:rate2>=75?'#059669':rate2>=50?'#d97706':'#dc2626'}}>{rate2}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setSelSession(String(sess.id)); setTab('attendance'); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{background:'#6366f1'}}>
                              <FiList size={10}/> Attendance
                            </button>
                            <button onClick={() => { setEditSession(sess); setShowSessionModal(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><FiEdit2 size={12}/></button>
                            <button onClick={async () => {
                              if (!confirm('Delete this session?')) return;
                              await supabase.from('school_remedial_attendance').delete().eq('session_id',sess.id);
                              await supabase.from('school_remedial_sessions').delete().eq('id',sess.id);
                              loadRemedial(); toast.success('Session deleted');
                            }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><FiTrash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: ATTENDANCE                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Select Session</label>
              <select value={selSession} onChange={e => { setSelSession(e.target.value); setAttendEdits({}); setAttendNotes({}); }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                <option value="">— Choose Session —</option>
                {sessions.map(s => {
                  const prog = programs.find(p=>p.id===s.program_id);
                  return <option key={s.id} value={s.id}>{s.session_date} — {prog?.name||getSubjectName(prog?.subject_id||0)} — {s.topic}</option>;
                })}
              </select>
            </div>
            {selSession && (
              <button onClick={saveAttendance} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white mt-5"
                style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <FiSave size={14}/>}
                Save Attendance
              </button>
            )}
          </div>

          {selSession && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)'}}>
                <div>
                  <h3 className="font-black text-gray-800">Attendance Register</h3>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {sessionEnrollments.length} enrolled · {Object.values(attendEdits).filter(v=>v==='present').length} marked present
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const edits: Record<string,Attendance['status']> = {};
                    sessionEnrollments.forEach(e => { edits[String(e.student_id)] = 'present'; });
                    setAttendEdits(edits);
                  }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#059669'}}>
                    ✅ Mark All Present
                  </button>
                  <button onClick={() => {
                    const edits: Record<string,Attendance['status']> = {};
                    sessionEnrollments.forEach(e => { edits[String(e.student_id)] = 'absent'; });
                    setAttendEdits(edits);
                  }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#dc2626'}}>
                    ❌ Mark All Absent
                  </button>
                </div>
              </div>

              {sessionEnrollments.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FiUsers size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="font-bold">No Students Enrolled in This Program</p>
                  <p className="text-xs mt-1">Go to Enrollment tab to add students first</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sessionEnrollments.map((enr, i) => {
                    const sid = String(enr.student_id);
                    const existing = attendance.find(a => a.session_id === Number(selSession) && a.student_id === enr.student_id);
                    const current = attendEdits[sid] || existing?.status || null;
                    return (
                      <div key={enr.id} className={`px-5 py-4 flex items-center gap-4 ${current==='present'?'bg-emerald-50/30':current==='absent'?'bg-red-50/30':current==='late'?'bg-amber-50/30':''}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xs flex-shrink-0">{i+1}</div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{getStudentName(enr.student_id)}</p>
                          <p className="text-xs text-gray-400">{getAdmNo(enr.student_id)} · Pre-score: {enr.pre_score ?? '—'}%</p>
                        </div>
                        <div className="flex gap-2">
                          {(['present','late','absent'] as const).map(status => {
                            const s = ATTEND_STYLES[status];
                            const active2 = current === status;
                            return (
                              <button key={status} onClick={() => setAttendEdits(prev => ({...prev,[sid]:status}))}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all"
                                style={active2 ? {background:s.bg,color:s.text,borderColor:s.text} : {background:'#f8fafc',color:'#94a3b8',borderColor:'#e2e8f0'}}>
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                        <input value={attendNotes[sid]||''} onChange={e=>setAttendNotes(prev=>({...prev,[sid]:e.target.value}))}
                          placeholder="Note…" className="w-36 px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-100 outline-none"/>
                      </div>
                    );
                  })}
                </div>
              )}
              {sessionEnrollments.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                  <button onClick={saveAttendance} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                    {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<FiSave size={14}/>}
                    Save Attendance Register
                  </button>
                </div>
              )}
            </div>
          )}

          {!selSession && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-bold text-gray-600">Select a Session Above</p>
              <p className="text-xs text-gray-400 mt-1">Choose a session to mark attendance</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: PROGRESS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'progress' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-3 items-center">
            <select value={selProgram} onChange={e=>setSelProgram(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm max-w-sm">
              <option value="">All Programs</option>
              {programs.map(p=><option key={p.id} value={p.id}>{p.name||getSubjectName(p.subject_id)} — {getFormName(p.form_id)}</option>)}
            </select>
            <p className="text-xs text-gray-400 font-bold">Showing pre-score vs post-score improvement</p>
          </div>

          {programs.filter(p=>!selProgram||String(p.id)===selProgram).map(prog => {
            const progEnr = enrollments.filter(e=>e.program_id===prog.id&&(e.pre_score!==undefined||e.post_score!==undefined));
            if (progEnr.length===0) return null;
            const avgPre  = progEnr.filter(e=>e.pre_score!==undefined).reduce((a,e)=>a+Number(e.pre_score),0)/Math.max(1,progEnr.filter(e=>e.pre_score!==undefined).length);
            const avgPost = progEnr.filter(e=>e.post_score!==undefined).reduce((a,e)=>a+Number(e.post_score),0)/Math.max(1,progEnr.filter(e=>e.post_score!==undefined).length);
            const improved2 = progEnr.filter(e=>e.post_score&&e.pre_score&&e.post_score>e.pre_score).length;
            return (
              <div key={prog.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)'}}>
                  <div>
                    <h3 className="font-black text-gray-800">{prog.name||getSubjectName(prog.subject_id)}</h3>
                    <p className="text-xs text-sky-600">{getFormName(prog.form_id)} · {getTermName(prog.term_id)} · {progEnr.length} students tracked</p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div><p className="text-lg font-black text-red-600">{avgPre.toFixed(1)}%</p><p className="text-[9px] text-gray-400 font-bold uppercase">Avg Pre</p></div>
                    <div className="flex items-center text-gray-300 font-black">→</div>
                    <div><p className="text-lg font-black text-emerald-600">{avgPost.toFixed(1)}%</p><p className="text-[9px] text-gray-400 font-bold uppercase">Avg Post</p></div>
                    <div><p className="text-lg font-black text-blue-600">{improved2}/{progEnr.length}</p><p className="text-[9px] text-gray-400 font-bold uppercase">Improved</p></div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['Student','Pre-Score','Post-Score','Change','Progress Bar','Status','Action'].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {progEnr.sort((a,b)=>(b.post_score||0)-(a.post_score||0)).map(enr => {
                        const diff = (enr.post_score||0) - (enr.pre_score||0);
                        const hasPost = enr.post_score !== undefined && enr.post_score !== null;
                        return (
                          <tr key={enr.id} className="hover:bg-blue-50/10">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-800">{getStudentName(enr.student_id)}</p>
                              <p className="text-[10px] text-gray-400">{getAdmNo(enr.student_id)}</p>
                            </td>
                            <td className="px-4 py-3 font-black text-red-600">{enr.pre_score??'—'}%</td>
                            <td className="px-4 py-3 font-black text-emerald-600">{hasPost?`${enr.post_score}%`:'—'}</td>
                            <td className="px-4 py-3">
                              {hasPost && enr.pre_score!==undefined ? (
                                <span className={`font-black text-sm ${diff>0?'text-emerald-600':diff<0?'text-red-600':'text-gray-500'}`}>
                                  {diff>0?'↑ ':diff<0?'↓ ':''}{Math.abs(diff)}pts
                                </span>
                              ) : <span className="text-gray-300 text-xs">Pending</span>}
                            </td>
                            <td className="px-4 py-3 min-w-[120px]">
                              {hasPost && (
                                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="absolute left-0 top-0 h-full rounded-full opacity-30"
                                    style={{width:`${enr.pre_score||0}%`,background:'#ef4444'}}/>
                                  <div className="absolute left-0 top-0 h-full rounded-full"
                                    style={{width:`${enr.post_score||0}%`,background:diff>=0?'#059669':'#ef4444',opacity:0.7}}/>
                                  <span className="absolute right-1 text-[9px] font-black" style={{color:diff>=0?'#065f46':'#7f1d1d',top:'50%',transform:'translateY(-50%)'}}>
                                    {enr.post_score}%
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                                style={STATUS_COLORS[enr.status as keyof typeof STATUS_COLORS]||STATUS_COLORS.enrolled}>
                                {enr.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => { setProgressTarget({...enr}); setShowProgressModal(true); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{background:'#0ea5e9'}}>
                                <FiEdit2 size={9}/> Update
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {enrollments.filter(e=>e.pre_score!==undefined||e.post_score!==undefined).length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-3">📈</div>
              <p className="font-bold text-gray-600">No Progress Data Yet</p>
              <p className="text-xs text-gray-400 mt-1">Enroll students to start tracking their improvement</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: ANALYTICS                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-5">
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Active Programs"    value={kpis.active}         icon="📚" sub={`${kpis.total} total`}           grad="linear-gradient(135deg,#059669,#10b981)"/>
            <KPI label="Students Enrolled"  value={kpis.totalEnrolled}  icon="👥" sub="across all programs"             grad="linear-gradient(135deg,#6366f1,#8b5cf6)"/>
            <KPI label="Attendance Rate"    value={`${kpis.attendRate}%`} icon="✅" sub={`${sessions.length} sessions`} grad="linear-gradient(135deg,#0ea5e9,#0284c7)"/>
            <KPI label="Students Improved"  value={kpis.improved}       icon="📈" sub="post > pre score"                grad="linear-gradient(135deg,#f59e0b,#d97706)"/>
          </div>

          {/* Per-program analytics */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-black text-gray-800">Program Performance Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Program','Subject','Form','Students','Sessions','Avg Attendance','Avg Improvement','Completion','Status'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {programs.map(prog => {
                    const progEnr2 = enrollments.filter(e=>e.program_id===prog.id);
                    const progSess = sessions.filter(s=>s.program_id===prog.id);
                    const progAtt = attendance.filter(a=>progSess.map(s=>s.id).includes(a.session_id));
                    const attRate = progAtt.length ? Math.round((progAtt.filter(a=>a.status==='present').length/progAtt.length)*100) : 0;
                    const withScores = progEnr2.filter(e=>e.post_score!==undefined&&e.post_score!==null&&e.pre_score!==undefined);
                    const avgImprove = withScores.length ? Math.round(withScores.reduce((a,e)=>a+((e.post_score||0)-(e.pre_score||0)),0)/withScores.length) : null;
                    const completed = progEnr2.filter(e=>e.status==='completed').length;
                    const sc3 = STATUS_COLORS[prog.status]||STATUS_COLORS.active;
                    return (
                      <tr key={prog.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{prog.name||getSubjectName(prog.subject_id)}</td>
                        <td className="px-4 py-3 text-gray-600">{getSubjectName(prog.subject_id)}</td>
                        <td className="px-4 py-3 text-gray-600">{getFormName(prog.form_id)}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{progEnr2.length}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">{progSess.length}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${attRate}%`,background:attRate>=75?'#059669':attRate>=50?'#d97706':'#dc2626'}}/>
                            </div>
                            <span className="font-black text-xs" style={{color:attRate>=75?'#059669':attRate>=50?'#d97706':'#dc2626'}}>{attRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-black">
                          {avgImprove!==null ? (
                            <span style={{color:avgImprove>0?'#059669':avgImprove<0?'#dc2626':'#64748b'}}>
                              {avgImprove>0?'+':''}{avgImprove}pts
                            </span>
                          ) : <span className="text-gray-300 text-xs">No data</span>}
                        </td>
                        <td className="px-4 py-3">
                          {progEnr2.length > 0 ? (
                            <span className="font-bold text-gray-600">{completed}/{progEnr2.length}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background:sc3.bg,color:sc3.text}}>{prog.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {programs.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No programs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* At-risk detection */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2" style={{background:'linear-gradient(135deg,#fff1f2,#fce7f3)'}}>
              <FiAlertTriangle className="text-red-500" size={16}/>
              <h3 className="font-black text-gray-800 text-sm">⚠️ At-Risk Detection — Students Below Program Target Scores</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {programs.filter(p=>p.status==='active').map(prog => {
                const atRisk = getAtRiskStudents(prog).filter(s => !enrollments.some(e=>e.program_id===prog.id&&e.student_id===s.id));
                if (atRisk.length === 0) return null;
                return (
                  <div key={prog.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-black text-gray-800 text-sm">{prog.name||getSubjectName(prog.subject_id)} — {getFormName(prog.form_id)}</p>
                        <p className="text-xs text-red-600">{atRisk.length} students below {prog.target_score||50}% not yet enrolled</p>
                      </div>
                      <button onClick={() => { setEditEnroll({program_id:prog.id!, studentIds:atRisk.map(s=>s.id)}); setShowEnrollModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#dc2626'}}>
                        <FiZap size={11}/> Bulk Enroll All {atRisk.length}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {atRisk.slice(0,10).map(s => (
                        <span key={s.id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          {s.first_name} {s.last_name}
                        </span>
                      ))}
                      {atRisk.length>10&&<span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">+{atRisk.length-10} more</span>}
                    </div>
                  </div>
                );
              })}
              {programs.filter(p=>p.status==='active').every(prog=>getAtRiskStudents(prog).filter(s=>!enrollments.some(e=>e.program_id===prog.id&&e.student_id===s.id)).length===0) && (
                <div className="p-8 text-center">
                  <FiCheckCircle size={28} className="mx-auto mb-2 text-emerald-500"/>
                  <p className="font-bold text-emerald-700">All at-risk students are enrolled! ✅</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE/EDIT PROGRAM                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal open={showProgramModal} onClose={() => { setShowProgramModal(false); setEditProgram({}); }} title={editProgram.id ? '✏️ Edit Remedial Program' : '📚 New Remedial Program'} wide>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Program Name</label>
            <input value={editProgram.name||''} onChange={e=>setEditProgram(p=>({...p,name:e.target.value}))}
              placeholder="e.g. Form 2 Mathematics Remedial — Term 2"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Subject *</label>
              <select value={editProgram.subject_id||''} onChange={e=>setEditProgram(p=>({...p,subject_id:Number(e.target.value)}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none">
                <option value="">Select Subject</option>
                {subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Form / Class *</label>
              <select value={editProgram.form_id||''} onChange={e=>setEditProgram(p=>({...p,form_id:Number(e.target.value)}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none">
                <option value="">Select Form</option>
                {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Term *</label>
              <select value={editProgram.term_id||''} onChange={e=>setEditProgram(p=>({...p,term_id:Number(e.target.value)}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none">
                <option value="">Select Term</option>
                {terms.map(t=><option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Assigned Teacher</label>
              <select value={editProgram.teacher_id||''} onChange={e=>setEditProgram(p=>({...p,teacher_id:Number(e.target.value)}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none">
                <option value="">Select Teacher</option>
                {teachers.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Target Pass Score (%)</label>
              <input type="number" min={1} max={100} value={editProgram.target_score||50} onChange={e=>setEditProgram(p=>({...p,target_score:Number(e.target.value)}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Max Students</label>
              <input type="number" min={1} value={editProgram.max_students||''} onChange={e=>setEditProgram(p=>({...p,max_students:Number(e.target.value)}))}
                placeholder="Leave blank for unlimited"
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Start Date</label>
              <input type="date" value={editProgram.start_date||''} onChange={e=>setEditProgram(p=>({...p,start_date:e.target.value}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">End Date</label>
              <input type="date" value={editProgram.end_date||''} onChange={e=>setEditProgram(p=>({...p,end_date:e.target.value}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Schedule / Timetable</label>
            <input value={editProgram.schedule||''} onChange={e=>setEditProgram(p=>({...p,schedule:e.target.value}))}
              placeholder="e.g. Mon/Wed/Fri 4:00–5:30 PM, Library Room B"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Description / Goals</label>
            <textarea value={editProgram.description||''} onChange={e=>setEditProgram(p=>({...p,description:e.target.value}))}
              placeholder="Describe the goals and approach of this remedial program…" rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-emerald-400 outline-none resize-none"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['planned','active','completed'] as const).map(s => (
                <button key={s} onClick={()=>setEditProgram(p=>({...p,status:s}))}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all capitalize"
                  style={editProgram.status===s
                    ? {background:STATUS_COLORS[s].bg,color:STATUS_COLORS[s].text,borderColor:STATUS_COLORS[s].border}
                    : {background:'#f8fafc',color:'#94a3b8',borderColor:'#e2e8f0'}}>
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={saveProgram} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
              {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<FiSave size={14}/>}
              {editProgram.id ? 'Update Program' : 'Create Program'}
            </button>
            <button onClick={()=>{setShowProgramModal(false);setEditProgram({});}}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD SESSION                                              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal open={showSessionModal} onClose={()=>{setShowSessionModal(false);setEditSession({});}} title="📅 Schedule Remedial Session">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Program *</label>
            <select value={editSession.program_id||''} onChange={e=>setEditSession(p=>({...p,program_id:Number(e.target.value)}))}
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm">
              <option value="">Select Program</option>
              {programs.map(p=><option key={p.id} value={p.id}>{p.name||getSubjectName(p.subject_id)} — {getFormName(p.form_id)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Session Date *</label>
            <input type="date" value={editSession.session_date||''} onChange={e=>setEditSession(p=>({...p,session_date:e.target.value}))}
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Start Time</label>
              <input type="time" value={editSession.start_time||''} onChange={e=>setEditSession(p=>({...p,start_time:e.target.value}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">End Time</label>
              <input type="time" value={editSession.end_time||''} onChange={e=>setEditSession(p=>({...p,end_time:e.target.value}))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm"/>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Topic / Lesson Focus *</label>
            <input value={editSession.topic||''} onChange={e=>setEditSession(p=>({...p,topic:e.target.value}))}
              placeholder="e.g. Algebra — Simultaneous Equations Revision"
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Teacher Notes</label>
            <textarea value={editSession.notes||''} onChange={e=>setEditSession(p=>({...p,notes:e.target.value}))}
              placeholder="Any notes about this session, resources used, etc." rows={3}
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none"/>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={saveSession} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#0ea5e9,#0284c7)'}}>
              {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<FiSave size={14}/>}
              Save Session
            </button>
            <button onClick={()=>{setShowSessionModal(false);setEditSession({});}}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ENROLL STUDENTS                                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal open={showEnrollModal} onClose={()=>{setShowEnrollModal(false);}} title="👥 Enroll Students in Remedial Program" wide>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Program *</label>
            <select value={editEnroll.program_id||''} onChange={e=>setEditEnroll(p=>({...p,program_id:Number(e.target.value),studentIds:[]}))}
              className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 text-sm">
              <option value="">Select Program</option>
              {programs.map(p=><option key={p.id} value={p.id}>{p.name||getSubjectName(p.subject_id)} — {getFormName(p.form_id)}</option>)}
            </select>
          </div>

          {editEnroll.program_id > 0 && (() => {
            const prog = programs.find(p=>p.id===editEnroll.program_id);
            if (!prog) return null;
            const atRisk = getAtRiskStudents(prog);
            const formStudents = students.filter(s => s.form_id === prog.form_id);
            const alreadyEnrolled = new Set(enrollments.filter(e=>e.program_id===prog.id).map(e=>e.student_id));

            return (
              <div className="space-y-3">
                {atRisk.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <p className="text-xs text-amber-700 font-bold">⚠️ {atRisk.length} students below {prog.target_score||50}% threshold detected</p>
                    <button onClick={() => setEditEnroll(p=>({...p,studentIds:atRisk.map(s=>s.id)}))}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{background:'#f59e0b'}}>
                      Select At-Risk Students
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setEditEnroll(p=>({...p,studentIds:formStudents.filter(s=>!alreadyEnrolled.has(s.id)).map(s=>s.id)}))}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#6366f1'}}>
                    Select All ({formStudents.filter(s=>!alreadyEnrolled.has(s.id)).length})
                  </button>
                  <button onClick={() => setEditEnroll(p=>({...p,studentIds:[]}))}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">Clear All</button>
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                  {formStudents.map(s => {
                    const studentMarks = marks.filter(m=>m.student_id===s.id&&m.subject_id===prog.subject_id&&String(m.term_id)===String(prog.term_id));
                    const avg2 = studentMarks.length ? Math.round(studentMarks.reduce((a,m)=>a+Number(m.score||0),0)/studentMarks.length) : null;
                    const enrolled3 = alreadyEnrolled.has(s.id);
                    const selected = editEnroll.studentIds.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => { if(enrolled3) return; setEditEnroll(p=>({...p,studentIds:p.studentIds.includes(s.id)?p.studentIds.filter(id=>id!==s.id):[...p.studentIds,s.id]})); }}
                        className={`flex items-center gap-3 px-4 py-2.5 ${enrolled3?'opacity-50 cursor-not-allowed':'cursor-pointer hover:bg-emerald-50/30'} ${selected?'bg-emerald-50':''}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected?'bg-emerald-500 border-emerald-500':enrolled3?'bg-gray-200 border-gray-200':'border-gray-300'}`}>
                          {(selected||enrolled3) && <FiCheck size={10} color="#fff"/>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                          <p className="text-[10px] text-gray-400">{s.admission_no||s.admission_number}</p>
                        </div>
                        {avg2!==null && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${avg2<(prog.target_score||50)?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>
                            {avg2}%
                          </span>
                        )}
                        {enrolled3 && <span className="text-[9px] text-gray-400 font-bold">Already enrolled</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">{editEnroll.studentIds.length} students selected</p>
              </div>
            );
          })()}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={bulkEnroll} disabled={saving||editEnroll.studentIds.length===0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
              {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<FiUsers size={14}/>}
              Enroll {editEnroll.studentIds.length} Students
            </button>
            <button onClick={()=>setShowEnrollModal(false)}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: UPDATE PROGRESS                                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal open={showProgressModal} onClose={()=>{setShowProgressModal(false);setProgressTarget(null);}} title="📈 Update Student Progress">
        {progressTarget && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-black text-gray-800">{getStudentName(progressTarget.student_id)}</p>
              <p className="text-xs text-gray-500">{getAdmNo(progressTarget.student_id)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Pre-Score (%) — Baseline</label>
                <input type="number" min={0} max={100} value={progressTarget.pre_score??''} onChange={e=>setProgressTarget(p=>p?({...p,pre_score:Number(e.target.value)}):null)}
                  className="w-full px-3 py-3 rounded-xl border-2 border-red-200 text-sm font-black text-red-600 focus:border-red-400 outline-none"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Post-Score (%) — After Remedial</label>
                <input type="number" min={0} max={100} value={progressTarget.post_score??''} onChange={e=>setProgressTarget(p=>p?({...p,post_score:Number(e.target.value)}):null)}
                  className="w-full px-3 py-3 rounded-xl border-2 border-emerald-200 text-sm font-black text-emerald-600 focus:border-emerald-400 outline-none"/>
              </div>
            </div>
            {progressTarget.pre_score!==undefined && progressTarget.post_score!==undefined && (
              <div className={`p-4 rounded-xl ${progressTarget.post_score > progressTarget.pre_score ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-black ${progressTarget.post_score > progressTarget.pre_score ? 'text-emerald-700' : 'text-red-700'}`}>
                  {progressTarget.post_score > progressTarget.pre_score ? '📈' : '📉'} Improvement: {progressTarget.post_score - progressTarget.pre_score > 0 ? '+' : ''}{progressTarget.post_score - progressTarget.pre_score} points
                </p>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Student Status</label>
              <div className="flex gap-2">
                {(['enrolled','completed','dropped'] as const).map(s => (
                  <button key={s} onClick={()=>setProgressTarget(p=>p?({...p,status:s}):null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 capitalize transition-all"
                    style={progressTarget.status===s
                      ? {background:STATUS_COLORS[s]?.bg||'#e0e7ff',color:STATUS_COLORS[s]?.text||'#3730a3',borderColor:STATUS_COLORS[s]?.border||'#a5b4fc'}
                      : {background:'#f8fafc',color:'#94a3b8',borderColor:'#e2e8f0'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={saveProgress} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<FiSave size={14}/>}
                Save Progress
              </button>
              <button onClick={()=>{setShowProgressModal(false);setProgressTarget(null);}}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
