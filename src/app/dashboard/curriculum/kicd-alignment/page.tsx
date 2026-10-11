'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const F = "'Outfit', 'Nunito', system-ui, -apple-system, sans-serif";

/* ═══ KICD 8-4-4 Curriculum Areas ═══ */
const KICD_AREAS = [
  { code: 'ENG', name: 'English', strands: ['Listening & Speaking', 'Reading', 'Writing', 'Grammar & Vocabulary'] },
  { code: 'KIS', name: 'Kiswahili', strands: ['Kusikiliza na Kuzungumza', 'Kusoma', 'Kuandika', 'Sarufi'] },
  { code: 'MAT', name: 'Mathematics', strands: ['Numbers & Algebra', 'Geometry', 'Statistics', 'Calculus'] },
  { code: 'BIO', name: 'Biology', strands: ['Cell Biology', 'Genetics', 'Ecology', 'Human Biology'] },
  { code: 'CHE', name: 'Chemistry', strands: ['Atomic Structure', 'Organic Chemistry', 'Electrochemistry', 'Thermochemistry'] },
  { code: 'PHY', name: 'Physics', strands: ['Mechanics', 'Waves & Optics', 'Electricity & Magnetism', 'Modern Physics'] },
  { code: 'GEO', name: 'Geography', strands: ['Physical Geography', 'Human Geography', 'Map Reading', 'Field Work'] },
  { code: 'HIS', name: 'History & Govt', strands: ['African History', 'Kenyan History', 'Government', 'International Relations'] },
  { code: 'BST', name: 'Business Studies', strands: ['Business Activities', 'Finance', 'Commerce', 'Entrepreneurship'] },
  { code: 'AGR', name: 'Agriculture', strands: ['Crop Production', 'Animal Husbandry', 'Farm Management', 'Agribusiness'] },
  { code: 'ICT', name: 'Computer Studies', strands: ['Hardware & Architecture', 'Programming', 'Networks', 'Database & Data'] },
  { code: 'ART', name: 'Visual Arts', strands: ['Drawing & Painting', 'Design & Applied Arts', 'Art History'] },
];

/* ═══ CBC Senior School Subjects (matches tracker) ═══ */
const CBC_SUBJECTS = [
  { id: 'ENG', name: 'English', pathway: 'CORE' },
  { id: 'KSW', name: 'Kiswahili / KSL', pathway: 'CORE' },
  { id: 'MAT', name: 'Mathematics', pathway: 'STEM' },
  { id: 'BIO', name: 'Biology', pathway: 'STEM' },
  { id: 'CHE', name: 'Chemistry', pathway: 'STEM' },
  { id: 'PHY', name: 'Physics', pathway: 'STEM' },
  { id: 'COMP', name: 'Computer Studies', pathway: 'STEM' },
  { id: 'AGR', name: 'Agriculture', pathway: 'STEM' },
  { id: 'ART', name: 'Visual Arts', pathway: 'ARTS' },
  { id: 'MUSIC', name: 'Music', pathway: 'ARTS' },
  { id: 'DRAMA', name: 'Performing Arts', pathway: 'ARTS' },
  { id: 'SPORT', name: 'Sports Science', pathway: 'ARTS' },
  { id: 'HIST', name: 'History & Citizenship', pathway: 'SOCIAL' },
  { id: 'GEO', name: 'Geography', pathway: 'SOCIAL' },
  { id: 'BUS', name: 'Business Studies', pathway: 'SOCIAL' },
  { id: 'ECO', name: 'Economics', pathway: 'SOCIAL' },
];

const PATHWAY_COLORS: Record<string, string> = {
  CORE: '#10b981', STEM: '#0ea5e9', ARTS: '#d946ef', SOCIAL: '#f59e0b',
};

const KICD_BADGES = [
  { id: 'full_cov', name: 'Full KICD Coverage', icon: '🏆', criteria: 'All strands covered 100%', color: '#f59e0b', threshold: 100 },
  { id: 'kicd_ok', name: 'KICD Compliant', icon: '✅', criteria: 'Meet Ministry 70% minimum', color: '#059669', threshold: 70 },
  { id: 'ahead', name: 'Ahead of Schedule', icon: '⚡', criteria: 'Achieve 85%+ coverage', color: '#0ea5e9', threshold: 85 },
  { id: 'cbc_data', name: 'CBC Tracker Active', icon: '🎓', criteria: 'CBC rubric assessments saved', color: '#6366f1', threshold: 1 },
  { id: 'excellence', name: 'Curriculum Excellence', icon: '🌟', criteria: 'Maintain 90%+ alignment score', color: '#dc2626', threshold: 90 },
];

const RUBRIC = {
  EE: { color: '#059669', bg: '#d1fae5', label: 'Exceeds Expectation' },
  ME: { color: '#2563eb', bg: '#dbeafe', label: 'Meets Expectation' },
  AE: { color: '#d97706', bg: '#fef3c7', label: 'Approaches Expectation' },
  BE: { color: '#dc2626', bg: '#fee2e2', label: 'Below Expectation' },
};

const pctColor = (p: number) => p >= 80 ? '#059669' : p >= 60 ? '#4f46e5' : p >= 40 ? '#f59e0b' : '#dc2626';
const pctBg   = (p: number) => p >= 80 ? '#d1fae5' : p >= 60 ? '#ede9fe' : p >= 40 ? '#fef3c7' : '#fee2e2';

interface AlignmentRecord {
  id: number; subject_code: string; strand: string; term_id: number; form_id: number;
  topic: string; kicd_ref: string; coverage_pct: number; assessment_done: boolean; notes: string;
}

export default function KICDAlignmentPage() {
  const [tab, setTab] = useState<'844' | 'cbc' | 'badges' | 'log'>('844');
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [alignments, setAlignments] = useState<AlignmentRecord[]>([]);
  const [cbcAssessments, setCbcAssessments] = useState<any[]>([]);
  const [selTerm, setSelTerm] = useState('');
  const [selSubject844, setSelSubject844] = useState('');
  const [selSubjectCBC, setSelSubjectCBC] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    subject_code: '', strand: '', topic: '', kicd_ref: '', coverage_pct: '', assessment_done: false, notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, tRes, aRes, cbcRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_kicd_alignment').select('*').order('id', { ascending: false }),
      (supabase as any).from('school_cbc_assessments').select('student_id,subject_code,term_id,assessment_type,rubric_level,rating_key').limit(5000),
    ]);
    setForms(fRes.data || []);
    const tData = tRes.data || [];
    setTerms(tData);
    const cur = tData.find((t: any) => t.is_current) || tData[0];
    if (cur && !selTerm) setSelTerm(String(cur.id));
    setAlignments(aRes.data || []);
    setCbcAssessments(cbcRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAlignment = async () => {
    if (!logForm.subject_code || !logForm.strand || !logForm.topic) {
      toast.error('Fill subject, strand and topic'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('school_kicd_alignment').insert({
      ...logForm,
      coverage_pct: parseFloat(logForm.coverage_pct) || 0,
      term_id: parseInt(selTerm) || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('✅ KICD alignment logged!');
      setLogModal(false);
      setLogForm({ subject_code: '', strand: '', topic: '', kicd_ref: '', coverage_pct: '', assessment_done: false, notes: '' });
      load();
    }
    setSaving(false);
  };

  // ── 8-4-4 filtered alignments
  const filtered844 = useMemo(() =>
    alignments.filter(a =>
      (!selTerm || String(a.term_id) === selTerm) &&
      (!selSubject844 || a.subject_code === selSubject844)
    ), [alignments, selTerm, selSubject844]);

  const overallCoverage = useMemo(() => {
    if (filtered844.length === 0) return 0;
    return filtered844.reduce((a, r) => a + Number(r.coverage_pct || 0), 0) / filtered844.length;
  }, [filtered844]);

  const subject844Coverage = useMemo(() =>
    KICD_AREAS.map(area => {
      const recs = filtered844.filter(a => a.subject_code === area.code);
      const avg = recs.length > 0 ? recs.reduce((a, r) => a + Number(r.coverage_pct || 0), 0) / recs.length : 0;
      return { ...area, avg, strandsCovered: new Set(recs.map(r => r.strand)).size, totalRecs: recs.length };
    }), [filtered844]);

  // ── CBC filtered assessments (from tracker)
  const filteredCBC = useMemo(() =>
    cbcAssessments.filter(a =>
      (!selTerm || String(a.term_id) === selTerm) &&
      (!selSubjectCBC || a.subject_code === selSubjectCBC)
    ), [cbcAssessments, selTerm, selSubjectCBC]);

  const cbcSubjectStats = useMemo(() =>
    CBC_SUBJECTS.map(subj => {
      const recs = filteredCBC.filter(a => a.subject_code === subj.id);
      const total = recs.length;
      const ee = recs.filter(r => r.rubric_level === 'EE').length;
      const me = recs.filter(r => r.rubric_level === 'ME').length;
      const ae = recs.filter(r => r.rubric_level === 'AE').length;
      const be = recs.filter(r => r.rubric_level === 'BE').length;
      // Score: EE=100, ME=75, AE=50, BE=25
      const score = total > 0 ? ((ee * 100 + me * 75 + ae * 50 + be * 25) / total) : 0;
      return { ...subj, total, ee, me, ae, be, score };
    }), [filteredCBC]);

  const cbcTotalAssessments = filteredCBC.length;
  const cbcAvgScore = cbcSubjectStats.filter(s => s.total > 0).length > 0
    ? cbcSubjectStats.filter(s => s.total > 0).reduce((a, s) => a + s.score, 0) / cbcSubjectStats.filter(s => s.total > 0).length
    : 0;

  const badges = useMemo(() => KICD_BADGES.map(b => ({
    ...b,
    earned: b.id === 'cbc_data' ? cbcTotalAssessments > 0
      : b.id === 'full_cov' ? overallCoverage >= 100
      : b.id === 'kicd_ok' ? overallCoverage >= 70
      : b.id === 'ahead' ? overallCoverage >= 85
      : overallCoverage >= 90,
  })), [overallCoverage, cbcTotalAssessments]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: F }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
        <p style={{ fontWeight: 800, color: '#374151' }}>Loading KICD Alignment Data…</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: F, background: '#f0f9ff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Nunito:wght@400;600;700;800;900&display=swap');
        .kicd-card { transition: all 0.2s ease; }
        .kicd-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .prog-bar { transition: width 0.6s cubic-bezier(.4,0,.2,1); }
      `}</style>

      {/* ── HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#4f46e5 100%)', padding: '28px 32px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Ministry of Education · KICD</div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>📚 KICD Curriculum Alignment &amp; CBC Tracker</h1>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>8-4-4 Coverage · CBC Competency Tracking · Ministry Compliance Badges</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLogModal(true)} style={{ background: '#fff', border: 'none', color: '#1d4ed8', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: F }}>
                + Log Coverage
              </button>
              <button onClick={load} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: F }}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { icon: '📊', label: '8-4-4 Coverage', value: `${overallCoverage.toFixed(1)}%`, color: pctColor(overallCoverage) === '#059669' ? '#86efac' : '#fde68a' },
              { icon: '📝', label: 'Coverage Logs', value: String(alignments.length) },
              { icon: '🎓', label: 'CBC Assessments', value: String(cbcTotalAssessments) },
              { icon: '📈', label: 'CBC Avg Score', value: `${cbcAvgScore.toFixed(0)}%`, color: '#a5f3fc' },
              { icon: '🏆', label: 'Badges Earned', value: `${badges.filter(b => b.earned).length}/${badges.length}` },
              { icon: '✅', label: 'KICD Status', value: overallCoverage >= 70 ? 'Compliant' : 'Needs Work', color: overallCoverage >= 70 ? '#86efac' : '#fca5a5' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 130 }}>
                <span style={{ fontSize: 22 }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: k.color || '#fff', lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', paddingLeft: 32 }}>
        {[
          { id: '844', label: '📝 8-4-4 Curriculum' },
          { id: 'cbc', label: '🎓 CBC Senior Assessment' },
          { id: 'badges', label: '🏆 Badges & Awards' },
          { id: 'log', label: '📋 Coverage Log' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '13px 22px', fontFamily: F, fontSize: 12, fontWeight: 800, background: 'none', border: 'none',
            borderBottom: tab === t.id ? '3px solid #1d4ed8' : '3px solid transparent',
            color: tab === t.id ? '#1d4ed8' : '#64748b', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── 8-4-4 TAB */}
        {tab === '844' && (
          <div>
            {/* Filter bar */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Filter:</span>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={SEL}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' (Current)' : ''}</option>)}
              </select>
              <select value={selSubject844} onChange={e => setSelSubject844(e.target.value)} style={SEL}>
                <option value="">All Subjects</option>
                {KICD_AREAS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <button onClick={() => setLogModal(true)} style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', border: 'none', color: '#fff', borderRadius: 9, padding: '8px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: F }}>+ Log Coverage</button>
            </div>

            {/* Empty state */}
            {alignments.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 16, border: '2px dashed #c7d2fe', padding: '48px 32px', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📋</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#1e293b' }}>No Curriculum Logs Yet</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                  Start logging your 8-4-4 curriculum coverage to track KICD compliance. Each log records which topic, strand and percentage of the syllabus has been covered.
                </p>
                <button onClick={() => setLogModal(true)} style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', border: 'none', color: '#fff', borderRadius: 10, padding: '12px 28px', fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: F }}>
                  + Log First Coverage Entry
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 16 }}>
              {subject844Coverage.filter(s => !selSubject844 || s.code === selSubject844).map(subj => (
                <div key={subj.code} className="kicd-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${pctColor(subj.avg)} ${subj.avg}%,#f1f5f9 ${subj.avg}%)` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, marginTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{subj.code}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{subj.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{subj.totalRecs} logs · {subj.strandsCovered}/{subj.strands.length} strands covered</div>
                    </div>
                    <div style={{ background: pctBg(subj.avg), color: pctColor(subj.avg), fontSize: 20, fontWeight: 900, padding: '6px 12px', borderRadius: 10, flexShrink: 0 }}>{subj.avg.toFixed(0)}%</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                    {subj.strands.map(strand => {
                      const sRecs = filtered844.filter(a => a.subject_code === subj.code && a.strand === strand);
                      const sAvg = sRecs.length > 0 ? sRecs.reduce((a, r) => a + Number(r.coverage_pct), 0) / sRecs.length : 0;
                      return (
                        <div key={strand} style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 4, lineHeight: 1.3 }}>{strand}</div>
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                            <div className="prog-bar" style={{ height: 4, width: `${Math.min(100, sAvg)}%`, background: pctColor(sAvg), borderRadius: 99 }} />
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: pctColor(sAvg), marginTop: 3 }}>{sRecs.length > 0 ? `${sAvg.toFixed(0)}%` : '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    <div style={{ fontSize: 10, color: pctColor(subj.avg), fontWeight: 800, background: pctBg(subj.avg), padding: '3px 10px', borderRadius: 6 }}>
                      {subj.avg >= 70 ? '✓ KICD Compliant' : subj.avg > 0 ? '⚠ Below 70% Minimum' : 'No data — log coverage'}
                    </div>
                    <button onClick={() => { setLogForm(p => ({ ...p, subject_code: subj.code })); setLogModal(true); }}
                      style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 7, padding: '5px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: F }}>+ Log</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CBC SENIOR TAB — reads from school_cbc_assessments (tracker data) */}
        {tab === 'cbc' && (
          <div>
            {/* Filter bar */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Filter:</span>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={SEL}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' (Current)' : ''}</option>)}
              </select>
              <select value={selSubjectCBC} onChange={e => setSelSubjectCBC(e.target.value)} style={SEL}>
                <option value="">All CBC Subjects</option>
                {CBC_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                {cbcTotalAssessments} assessments loaded from CBC Tracker
              </div>
            </div>

            {/* Empty state */}
            {cbcTotalAssessments === 0 && (
              <div style={{ background: '#fff', borderRadius: 16, border: '2px dashed #c7d2fe', padding: '48px 32px', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎓</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#1e293b' }}>No CBC Assessments Saved Yet</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
                  Go to the <strong>CBC Tracker</strong> page, select a grade, subject and term, then click the EE/ME/AE/BE rubric buttons for each student — then click <strong>Save Assessments</strong>. The data will appear here automatically.
                </p>
                <a href="/dashboard/curriculum/cbc-tracking" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', color: '#fff', borderRadius: 10, padding: '12px 28px', fontWeight: 900, fontSize: 14, textDecoration: 'none', fontFamily: F }}>
                  → Go to CBC Tracker
                </a>
              </div>
            )}

            {cbcTotalAssessments > 0 && (
              <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                  {(['EE', 'ME', 'AE', 'BE'] as const).map(k => {
                    const cnt = filteredCBC.filter(a => a.rubric_level === k).length;
                    const pct = filteredCBC.length > 0 ? Math.round((cnt / filteredCBC.length) * 100) : 0;
                    return (
                      <div key={k} className="kicd-card" style={{ background: RUBRIC[k].bg, borderRadius: 14, padding: '16px 18px', border: `2px solid ${RUBRIC[k].color}30` }}>
                        <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: RUBRIC[k].color, fontFamily: F }}>{cnt}</p>
                        <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: RUBRIC[k].color }}>{k} — {RUBRIC[k].label.split(' ')[0]}</p>
                        <div style={{ height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                          <div className="prog-bar" style={{ height: 4, width: `${pct}%`, background: RUBRIC[k].color, borderRadius: 99 }} />
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: RUBRIC[k].color, opacity: 0.8 }}>{pct}% of all ratings</p>
                      </div>
                    );
                  })}
                </div>

                {/* Per-subject CBC breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                  {cbcSubjectStats.filter(s => s.total > 0 && (!selSubjectCBC || s.id === selSubjectCBC)).map(subj => (
                    <div key={subj.id} className="kicd-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${pctColor(subj.score)} ${subj.score}%,#f1f5f9 ${subj.score}%)` }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, marginTop: 4 }}>
                        <div>
                          <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, color: '#fff', background: PATHWAY_COLORS[subj.pathway] || '#6366f1', padding: '2px 7px', borderRadius: 5, marginBottom: 4 }}>{subj.pathway}</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{subj.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{subj.total} LO ratings recorded</div>
                        </div>
                        <div style={{ background: pctBg(subj.score), color: pctColor(subj.score), fontSize: 18, fontWeight: 900, padding: '6px 12px', borderRadius: 10 }}>{subj.score.toFixed(0)}%</div>
                      </div>

                      {/* Rubric breakdown bar */}
                      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 10, gap: 1 }}>
                        {(['EE', 'ME', 'AE', 'BE'] as const).map(k => {
                          const c = subj[k.toLowerCase() as 'ee' | 'me' | 'ae' | 'be'];
                          const w = subj.total > 0 ? Math.round((c / subj.total) * 100) : 0;
                          return w > 0 ? <div key={k} title={`${k}: ${c} (${w}%)`} style={{ width: `${w}%`, background: RUBRIC[k].color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {w > 12 ? <span style={{ fontSize: 7, fontWeight: 900, color: '#fff' }}>{k}</span> : null}
                          </div> : null;
                        })}
                        {subj.total === 0 && <div style={{ flex: 1, background: '#f1f5f9' }} />}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                        {(['EE', 'ME', 'AE', 'BE'] as const).map(k => {
                          const c = subj[k.toLowerCase() as 'ee' | 'me' | 'ae' | 'be'];
                          const pct = subj.total > 0 ? Math.round((c / subj.total) * 100) : 0;
                          return (
                            <div key={k} style={{ background: RUBRIC[k].bg, borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: RUBRIC[k].color }}>{c}</p>
                              <p style={{ margin: '1px 0 0', fontSize: 9, fontWeight: 800, color: RUBRIC[k].color }}>{k} {pct}%</p>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 10, padding: '6px 10px', background: subj.score >= 70 ? '#f0fdf4' : '#fef2f2', borderRadius: 8, fontSize: 11, fontWeight: 700, color: subj.score >= 70 ? '#065f46' : '#991b1b' }}>
                        {subj.score >= 70 ? '✓ CBC Standard Met' : '⚠ Below 70% — needs attention'}
                      </div>
                    </div>
                  ))}
                  {cbcSubjectStats.filter(s => s.total > 0 && (!selSubjectCBC || s.id === selSubjectCBC)).length === 0 && selSubjectCBC && (
                    <div style={{ gridColumn: '1/-1', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '32px', textAlign: 'center' }}>
                      <p style={{ fontWeight: 800, color: '#94a3b8' }}>No assessments found for selected subject in this term. Go to CBC Tracker and save assessments.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BADGES TAB */}
        {tab === 'badges' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 28, marginBottom: 20, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 56 }}>🏛️</div>
              <h2 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 900, color: '#0f172a' }}>KICD Compliance Certificate</h2>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
                8-4-4 Coverage: <strong style={{ color: pctColor(overallCoverage), fontSize: 22 }}>{overallCoverage.toFixed(1)}%</strong>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                CBC Score: <strong style={{ color: pctColor(cbcAvgScore), fontSize: 22 }}>{cbcAvgScore.toFixed(0)}%</strong>
              </p>
              <div style={{ margin: '16px auto', width: 240, height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div className="prog-bar" style={{ height: 10, width: `${Math.min(100, overallCoverage)}%`, background: `linear-gradient(90deg,${pctColor(overallCoverage)},${pctColor(overallCoverage)}bb)`, borderRadius: 99 }} />
              </div>
              <div style={{ display: 'inline-block', background: overallCoverage >= 70 ? '#d1fae5' : '#fee2e2', color: overallCoverage >= 70 ? '#065f46' : '#991b1b', padding: '8px 24px', borderRadius: 99, fontSize: 13, fontWeight: 900 }}>
                {overallCoverage >= 70 ? '✅ KICD COMPLIANT' : overallCoverage > 0 ? '⚠️ IN PROGRESS — Need 70%' : '📋 No coverage logged yet — start logging!'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
              {badges.map(badge => (
                <div key={badge.id} className="kicd-card" style={{ background: '#fff', borderRadius: 16, border: `2px solid ${badge.earned ? badge.color + '50' : '#f1f5f9'}`, padding: 24, textAlign: 'center', position: 'relative', opacity: badge.earned ? 1 : 0.65, boxShadow: badge.earned ? `0 4px 20px ${badge.color}22` : 'none' }}>
                  {badge.earned && <div style={{ position: 'absolute', top: -1, right: -1, background: badge.color, color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: '0 14px 0 10px' }}>EARNED ✓</div>}
                  <div style={{ fontSize: 52, marginBottom: 10, filter: badge.earned ? 'none' : 'grayscale(100%)' }}>{badge.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{badge.name}</div>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#64748b', fontWeight: 600, textAlign: 'left', marginTop: 10 }}>
                    <strong>Criteria:</strong> {badge.criteria}
                  </div>
                  {badge.earned && <div style={{ marginTop: 8, fontSize: 11, color: badge.color, fontWeight: 800 }}>🎉 Badge Earned!</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOG TAB */}
        {tab === 'log' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 14 }}>📋 Coverage Logs — {alignments.length} entries</span>
              <button onClick={() => setLogModal(true)} style={{ background: '#fff', border: 'none', color: '#1d4ed8', borderRadius: 8, padding: '7px 14px', fontWeight: 900, fontSize: 12, cursor: 'pointer', fontFamily: F }}>+ Log Coverage</button>
            </div>
            {alignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>No Coverage Logs Yet</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Log your first curriculum coverage entry to start tracking KICD alignment.</p>
                <button onClick={() => setLogModal(true)} style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: F }}>+ Log First Coverage</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Subject', 'Strand', 'Topic Covered', 'KICD Ref', 'Coverage', 'Status', 'Notes'].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alignments.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <td style={{ ...TC, color: '#94a3b8', fontSize: 10 }}>{i + 1}</td>
                        <td style={TC}><span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>{a.subject_code}</span></td>
                        <td style={{ ...TC, fontWeight: 700 }}>{a.strand}</td>
                        <td style={TC}>{a.topic}</td>
                        <td style={{ ...TC, fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{a.kicd_ref || '—'}</td>
                        <td style={TC}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: 5, width: `${a.coverage_pct}%`, background: pctColor(Number(a.coverage_pct)), borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: pctColor(Number(a.coverage_pct)) }}>{a.coverage_pct}%</span>
                          </div>
                        </td>
                        <td style={TC}><span style={{ background: a.assessment_done ? '#d1fae5' : '#fee2e2', color: a.assessment_done ? '#065f46' : '#991b1b', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>{a.assessment_done ? 'Done' : 'Pending'}</span></td>
                        <td style={{ ...TC, fontSize: 11, color: '#64748b', maxWidth: 200 }}>{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── LOG MODAL */}
      {logModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={() => setLogModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', fontFamily: F, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>📋 Log 8-4-4 Curriculum Coverage</h3>
              <button onClick={() => setLogModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LB}>Subject *</label>
                <select value={logForm.subject_code} onChange={e => setLogForm(p => ({ ...p, subject_code: e.target.value, strand: '' }))} style={{ ...SEL, width: '100%' }}>
                  <option value="">— Select subject —</option>
                  {KICD_AREAS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Curriculum Strand *</label>
                <select value={logForm.strand} onChange={e => setLogForm(p => ({ ...p, strand: e.target.value }))} style={{ ...SEL, width: '100%' }}>
                  <option value="">— Select strand —</option>
                  {(KICD_AREAS.find(s => s.code === logForm.subject_code)?.strands || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Topic Covered *</label>
                <input value={logForm.topic} onChange={e => setLogForm(p => ({ ...p, topic: e.target.value }))} placeholder="e.g. Quadratic Equations" style={{ ...IN, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={LB}>KICD Reference Code</label>
                <input value={logForm.kicd_ref} onChange={e => setLogForm(p => ({ ...p, kicd_ref: e.target.value }))} placeholder="e.g. MAT/F3/ALG/3.2" style={{ ...IN, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={LB}>Coverage Percentage (0-100)</label>
                <input type="number" min={0} max={100} value={logForm.coverage_pct} onChange={e => setLogForm(p => ({ ...p, coverage_pct: e.target.value }))} placeholder="e.g. 75" style={{ ...IN, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={LB}>Notes</label>
                <textarea value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Any additional notes…" style={{ ...IN, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                <input type="checkbox" checked={logForm.assessment_done} onChange={e => setLogForm(p => ({ ...p, assessment_done: e.target.checked }))} />
                Assessment/Evaluation completed for this topic
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setLogModal(false)} style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F }}>Cancel</button>
                <button onClick={saveAlignment} disabled={saving} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: F }}>
                  {saving ? '⏳ Saving…' : '✅ Log Coverage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TH: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
const TC: React.CSSProperties = { padding: '11px 12px', fontSize: 12, color: '#0f172a', verticalAlign: 'middle' };
const IN: React.CSSProperties = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#f8fafc' };
const SEL: React.CSSProperties = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#f8fafc' };
const LB: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };
