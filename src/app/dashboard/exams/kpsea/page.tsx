'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiBook, FiUsers, FiAward, FiTrendingUp, FiFileText, FiBarChart2,
  FiDownload, FiSave, FiCheckCircle, FiAlertCircle, FiRefreshCw,
  FiStar, FiTarget, FiActivity, FiChevronRight, FiGrid, FiFilter,
  FiSearch, FiPrinter, FiInfo, FiShield,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── KPSEA Subjects (Kenya Primary School Education Assessment - Grade 6) ─────
const KPSEA_SUBJECTS = [
  { code: 'ENG', name: 'English', icon: '📚', color: '#2563EB', bg: '#DBEAFE', maxScore: 100 },
  { code: 'KSW', name: 'Kiswahili', icon: '🗣️', color: '#059669', bg: '#D1FAE5', maxScore: 100 },
  { code: 'MAT', name: 'Mathematics', icon: '🔢', color: '#DC2626', bg: '#FEE2E2', maxScore: 100 },
  { code: 'SCI', name: 'Integrated Science', icon: '⚗️', color: '#7C3AED', bg: '#EDE9FE', maxScore: 100 },
  { code: 'SST', name: 'Social Studies', icon: '🌍', color: '#D97706', bg: '#FEF3C7', maxScore: 100 },
  { code: 'CRE', name: 'Religious Education', icon: '🙏', color: '#6366F1', bg: '#EEF2FF', maxScore: 100 },
  { code: 'CAS', name: 'Creative Arts', icon: '🎨', color: '#EC4899', bg: '#FCE7F3', maxScore: 100 },
  { code: 'AGR', name: 'Agriculture', icon: '🌱', color: '#16A34A', bg: '#DCFCE7', maxScore: 100 },
];

// KPSEA performance bands (Kenya MOE classification)
const KPSEA_BANDS = [
  { band: 'Excellent', min: 80, max: 100, color: '#059669', bg: '#D1FAE5', desc: 'Exceeds expectations — ready for JSS' },
  { band: 'Good', min: 60, max: 79, color: '#2563EB', bg: '#DBEAFE', desc: 'Meets expectations — JSS ready' },
  { band: 'Average', min: 40, max: 59, color: '#D97706', bg: '#FEF3C7', desc: 'Approaching — may need support' },
  { band: 'Below Average', min: 0, max: 39, color: '#DC2626', bg: '#FEE2E2', desc: 'Needs significant support' },
];

function getBand(avg: number) {
  return KPSEA_BANDS.find(b => avg >= b.min && avg <= b.max) || KPSEA_BANDS[3];
}

function getSubjectBand(score: number) {
  return KPSEA_BANDS.find(b => score >= b.min && score <= b.max) || KPSEA_BANDS[3];
}

type Tab = 'dashboard' | 'entry' | 'analysis' | 'transition' | 'reports';

export default function KPSEAPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<any[]>([]); // Grade 6 forms
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [savedScores, setSavedScores] = useState<Record<string, Record<string, string>>>({});
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [jssTransition, setJssTransition] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [formsRes, streamsRes, termsRes, sdRes] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_streams').select('*').order('stream_name'),
        sb.from('school_terms').select('*').order('id', { ascending: false }),
        sb.from('school_details').select('*').limit(1).maybeSingle(),
      ]);
      const allForms = formsRes.data || [];
      // Grade 6 = KPSEA year (Primary Grade 6 / Form 6 in CBC primary)
      const grade6Forms = allForms.filter((f: any) => f.form_level === 6);
      setForms(grade6Forms);
      setStreams(streamsRes.data || []);
      setTerms(termsRes.data || []);
      setSchoolDetails(sdRes.data);
      const cur = (termsRes.data || []).find((t: any) => t.is_current);
      if (cur) setSelTerm(String(cur.id));
      if (grade6Forms.length > 0) setSelForm(String(grade6Forms[0].id));
      setLoading(false);
    };
    load();
  }, []);

  // Load students
  useEffect(() => {
    if (!selForm) { setStudents([]); return; }
    const load = async () => {
      let q = sb.from('school_students').select('*').eq('form_id', Number(selForm)).eq('status', 'Active').order('last_name');
      if (selStream) q = q.eq('stream_id', Number(selStream));
      const { data } = await q;
      setStudents(data || []);
    };
    load();
  }, [selForm, selStream]);

  // Load existing KPSEA scores
  useEffect(() => {
    if (!selTerm || students.length === 0) { setScores({}); setSavedScores({}); return; }
    const load = async () => {
      const ids = students.map((s: any) => s.id);
      try {
        const { data } = await sb.from('kpsea_scores')
          .select('student_id,subject_code,score')
          .in('student_id', ids)
          .eq('term_id', Number(selTerm));
        const loaded: Record<string, Record<string, string>> = {};
        (data || []).forEach((r: any) => {
          const sid = String(r.student_id);
          if (!loaded[sid]) loaded[sid] = {};
          loaded[sid][r.subject_code] = String(r.score);
        });
        setScores(structuredClone(loaded));
        setSavedScores(structuredClone(loaded));
        setIsDirty(false);
      } catch {}
    };
    load();
  }, [selTerm, students]);

  const setScore = useCallback((studentId: number, subjectCode: string, value: string) => {
    const n = parseInt(value, 10);
    const clamped = isNaN(n) ? value : String(Math.min(Math.max(n, 0), 100));
    setScores(prev => ({
      ...prev,
      [String(studentId)]: { ...(prev[String(studentId)] || {}), [subjectCode]: clamped },
    }));
    setIsDirty(true);
  }, []);

  const saveScores = async () => {
    if (!selTerm || students.length === 0) return;
    setSaving(true);
    try {
      const rows: any[] = [];
      const curTerm = terms.find((t: any) => String(t.id) === selTerm);
      const year = curTerm?.year || new Date().getFullYear();
      students.forEach((s: any) => {
        const sid = String(s.id);
        const studentScores = scores[sid] || {};
        KPSEA_SUBJECTS.forEach(sub => {
          const sc = studentScores[sub.code];
          if (sc !== undefined && sc !== '') {
            rows.push({
              student_id: s.id,
              subject_code: sub.code,
              subject_name: sub.name,
              score: Number(sc),
              term_id: Number(selTerm),
              year,
              form_id: Number(selForm),
            });
          }
        });
      });
      if (rows.length === 0) { toast.error('No scores to save'); setSaving(false); return; }
      const { error } = await sb.from('kpsea_scores').upsert(rows, {
        onConflict: 'student_id,subject_code,term_id,year',
      });
      if (error) throw error;
      setSavedScores(structuredClone(scores));
      setIsDirty(false);
      toast.success(`✅ Saved KPSEA scores for ${students.length} students!`);
    } catch (e: any) {
      toast.error('Save failed: ' + (e.message || 'Check database'));
    } finally {
      setSaving(false);
    }
  };

  // Analytics
  const analytics = useMemo(() => {
    if (students.length === 0) return null;
    const studentAnalytics = students.map((s: any) => {
      const sid = String(s.id);
      const studentScores = scores[sid] || {};
      const subScores = KPSEA_SUBJECTS.map(sub => ({
        subject: sub,
        score: parseInt(studentScores[sub.code] || '', 10),
      })).filter(x => !isNaN(x.score));
      const avg = subScores.length > 0 ? Math.round(subScores.reduce((a, x) => a + x.score, 0) / subScores.length) : null;
      const total = subScores.reduce((a, x) => a + x.score, 0);
      const band = avg !== null ? getBand(avg) : null;
      return { student: s, subScores, avg, total, band, completed: subScores.length };
    });

    const bandDist = KPSEA_BANDS.map(b => ({
      ...b,
      count: studentAnalytics.filter(sa => sa.band?.band === b.band).length,
    }));

    const subjectAvgs = KPSEA_SUBJECTS.map(sub => {
      const validScores = studentAnalytics.map(sa => sa.subScores.find(x => x.subject.code === sub.code)?.score).filter(x => x !== undefined) as number[];
      const avg = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
      return { subject: sub, avg, count: validScores.length };
    });

    const top10 = [...studentAnalytics].filter(sa => sa.avg !== null).sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 10);
    const atRisk = studentAnalytics.filter(sa => sa.band?.band === 'Below Average' || (sa.avg !== null && (sa.avg as number) < 40));
    const readyForJSS = studentAnalytics.filter(sa => sa.avg !== null && (sa.avg as number) >= 50);

    return { studentAnalytics, bandDist, subjectAvgs, top10, atRisk, readyForJSS };
  }, [students, scores]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s: any) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q));
  }, [students, searchQuery]);

  const exportCSV = useCallback(() => {
    if (!students.length) { toast.error('No data to export'); return; }
    const headers = ['Adm No', 'Student', 'Gender', ...KPSEA_SUBJECTS.map(s => s.name), 'Total', 'Average', 'Band', 'JSS Ready'];
    const rows = (analytics?.studentAnalytics || []).map(sa => [
      sa.student.admission_no || sa.student.admission_number || '',
      `${sa.student.first_name} ${sa.student.last_name}`,
      sa.student.gender || '',
      ...KPSEA_SUBJECTS.map(sub => scores[String(sa.student.id)]?.[sub.code] || ''),
      sa.total,
      sa.avg !== null ? sa.avg : '',
      sa.band?.band || '',
      sa.avg !== null && sa.avg >= 50 ? 'YES' : 'NO',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `KPSEA_Results_${new Date().getFullYear()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  }, [analytics, scores, students]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid size={14} /> },
    { id: 'entry', label: 'Score Entry', icon: <FiFileText size={14} /> },
    { id: 'analysis', label: 'Analysis', icon: <FiBarChart2 size={14} /> },
    { id: 'transition', label: 'JSS Transition', icon: <FiChevronRight size={14} /> },
    { id: 'reports', label: 'Reports', icon: <FiAward size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md">
                <FiShield className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900">KPSEA Module</h1>
                <p className="text-xs text-gray-500 font-medium">Kenya Primary School Education Assessment — Grade 6</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200">Grade 6 → JSS</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filters */}
              <select value={selForm} onChange={e => setSelForm(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select Grade 6 Class</option>
                {forms.map((f: any) => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
              </select>
              <select value={selStream} onChange={e => setSelStream(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">All Streams</option>
                {streams.map((s: any) => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
              </select>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                {terms.map((t: any) => <option key={t.id} value={String(t.id)}>{t.term_name}{t.is_current ? ' ★' : ''}</option>)}
              </select>
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
                <FiDownload size={14} /> Export
              </button>
              <button onClick={saveScores} disabled={saving || !isDirty}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all ${isDirty ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {saving ? <><FiRefreshCw size={14} className="animate-spin" /> Saving…</> : <><FiSave size={14} /> Save</>}
              </button>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-screen-2xl mx-auto px-4 border-t border-gray-100">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading KPSEA data…</p>
          </div>
        )}

        {!loading && forms.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-blue-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <FiInfo size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">No Grade 6 Classes Found</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              KPSEA is for Grade 6 (final year of primary school). Please ensure Grade 6 classes are configured in School Setup with form_level = 6.
            </p>
          </div>
        )}

        {!loading && forms.length > 0 && (
          <>
            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Hero Banner */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-7 text-white">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <FiShield size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black mb-1">Kenya Primary School Education Assessment (KPSEA)</h2>
                      <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
                        KPSEA replaced KCPE for CBC learners. Grade 6 students sit this national assessment before transitioning to JSS (Grade 7). 
                        APSIMS provides the most comprehensive KPSEA tracking, analysis, and JSS transition planning tool in Kenya.
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm">
                        {[
                          { label: 'Total Students', value: students.length },
                          { label: 'JSS Ready', value: analytics?.readyForJSS.length || 0 },
                          { label: 'At Risk', value: analytics?.atRisk.length || 0 },
                        ].map((stat, i) => (
                          <div key={i} className="bg-white/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black">{stat.value}</p>
                            <p className="text-xs text-blue-100">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPSEA Subjects grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {KPSEA_SUBJECTS.map(sub => {
                    const avg = analytics?.subjectAvgs.find(s => s.subject.code === sub.code)?.avg;
                    const band = avg !== null && avg !== undefined ? getBand(avg) : null;
                    return (
                      <div key={sub.code} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{sub.icon}</span>
                          {avg !== null && avg !== undefined ? (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: band?.color, background: band?.bg }}>{avg}%</span>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </div>
                        <p className="text-sm font-bold text-gray-800">{sub.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{sub.code} · Max 100</p>
                        {avg !== null && avg !== undefined && (
                          <div className="mt-2 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${avg}%`, background: sub.color }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Performance bands */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {KPSEA_BANDS.map(b => {
                    const cnt = analytics?.bandDist.find(d => d.band === b.band)?.count || 0;
                    const pct = students.length > 0 ? Math.round((cnt / students.length) * 100) : 0;
                    return (
                      <div key={b.band} className="bg-white rounded-2xl border shadow-sm p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded border" style={{ color: b.color, background: b.bg, borderColor: b.color + '33' }}>
                            {b.min}–{b.max}%
                          </span>
                          <span className="text-xs text-gray-400">{pct}%</span>
                        </div>
                        <p className="text-2xl font-black text-gray-800">{cnt}</p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: b.color }}>{b.band}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{b.desc}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SCORE ENTRY TAB ── */}
            {activeTab === 'entry' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-blue-600" />
                    <span className="font-bold text-gray-800">KPSEA Score Entry — {students.length} Students</span>
                    {isDirty && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold animate-pulse">Unsaved</span>}
                  </div>
                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search student…" type="text"
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[180px]"># Student</th>
                          {KPSEA_SUBJECTS.map(sub => (
                            <th key={sub.code} className="text-center px-2 py-3 font-semibold min-w-[80px]">
                              <span className="text-sm">{sub.icon}</span>
                              <div className="text-[10px] font-bold mt-0.5" style={{ color: sub.color }}>{sub.code}</div>
                              <div className="text-[9px] text-gray-400 font-normal">/100</div>
                            </th>
                          ))}
                          <th className="text-center px-3 py-3 font-semibold text-gray-600 sticky right-0 bg-gray-50 min-w-[100px]">Average</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((s: any, idx: number) => {
                          const sid = String(s.id);
                          const studentScores = scores[sid] || {};
                          const validScores = KPSEA_SUBJECTS.map(sub => parseInt(studentScores[sub.code] || '', 10)).filter(n => !isNaN(n));
                          const avg = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
                          const band = avg !== null ? getBand(avg) : null;
                          return (
                            <tr key={s.id} className={`hover:bg-blue-50/30 transition-colors ${band?.band === 'Below Average' ? 'bg-red-50/20' : ''}`}>
                              <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 font-mono w-5">{idx + 1}</span>
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {s.first_name?.[0]}{s.last_name?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800 text-xs">{s.first_name} {s.last_name}</p>
                                    <p className="text-[10px] text-gray-400">{s.admission_no || ''}</p>
                                  </div>
                                </div>
                              </td>
                              {KPSEA_SUBJECTS.map(sub => {
                                const val = studentScores[sub.code] || '';
                                const score = parseInt(val, 10);
                                const subBand = !isNaN(score) ? getSubjectBand(score) : null;
                                return (
                                  <td key={sub.code} className="px-1.5 py-2 text-center">
                                    <input
                                      type="number" min="0" max="100"
                                      value={val}
                                      onChange={e => setScore(s.id, sub.code, e.target.value)}
                                      placeholder="—"
                                      className="w-14 text-center text-sm font-bold rounded-lg border-2 py-1.5 focus:outline-none transition-all"
                                      style={subBand ? {
                                        borderColor: subBand.color + '66',
                                        background: subBand.bg,
                                        color: subBand.color,
                                      } : {
                                        borderColor: '#E5E7EB',
                                        background: '#F9FAFB',
                                        color: '#6B7280',
                                      }}
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-center sticky right-0 bg-white">
                                {avg !== null ? (
                                  <div>
                                    <span className="text-base font-black" style={{ color: band?.color }}>{avg}</span>
                                    <div className="text-[10px] font-bold mt-0.5" style={{ color: band?.color }}>{band?.band}</div>
                                  </div>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <tr><td colSpan={KPSEA_SUBJECTS.length + 2} className="text-center py-12 text-gray-400">
                            <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
                            <p>No students found. Please select a Grade 6 class above.</p>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── ANALYSIS TAB ── */}
            {activeTab === 'analysis' && analytics && (
              <div className="space-y-5">
                {/* Subject averages */}
                <div className="bg-white rounded-2xl border shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Subject Performance Analysis</h3>
                  <div className="space-y-3">
                    {analytics.subjectAvgs.map(({ subject, avg }) => {
                      if (avg === null) return null;
                      const band = getBand(avg);
                      return (
                        <div key={subject.code} className="flex items-center gap-4">
                          <span className="text-xl w-7">{subject.icon}</span>
                          <div className="w-32 text-sm font-semibold text-gray-700">{subject.name}</div>
                          <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full flex items-center justify-end pr-3 text-white text-xs font-bold transition-all"
                              style={{ width: `${Math.max(avg, 3)}%`, background: subject.color }}>
                              {avg > 15 ? `${avg}%` : ''}
                            </div>
                          </div>
                          <span className="text-sm font-black w-12 text-right" style={{ color: band.color }}>{avg}%</span>
                          <span className="text-xs px-2 py-0.5 rounded-md font-bold w-28 text-center" style={{ color: band.color, background: band.bg }}>{band.band}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top performers & At risk */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FiStar className="text-amber-500" size={18} />
                      <h3 className="font-bold text-gray-800">Top 10 Performers</h3>
                    </div>
                    <div className="space-y-2">
                      {analytics.top10.map((sa, i) => (
                        <div key={sa.student.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{sa.student.first_name} {sa.student.last_name}</p>
                            <p className="text-[10px] text-gray-400">{sa.completed} subjects</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black" style={{ color: sa.band?.color }}>{sa.avg}%</p>
                            <p className="text-[10px] font-bold" style={{ color: sa.band?.color }}>{sa.band?.band}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FiAlertCircle className="text-red-500" size={18} />
                      <h3 className="font-bold text-gray-800">At-Risk Students</h3>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{analytics.atRisk.length}</span>
                    </div>
                    <div className="space-y-2">
                      {analytics.atRisk.slice(0, 8).map(sa => (
                        <div key={sa.student.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50 border border-red-100">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                            {sa.student.first_name?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800">{sa.student.first_name} {sa.student.last_name}</p>
                            <p className="text-[10px] text-red-400">{sa.completed} subjects entered</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-red-600">{sa.avg !== null ? `${sa.avg}%` : '—'}</p>
                            <p className="text-[10px] text-red-500 font-bold">Needs support</p>
                          </div>
                        </div>
                      ))}
                      {analytics.atRisk.length === 0 && (
                        <div className="text-center py-8">
                          <FiCheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                          <p className="text-sm text-gray-500">All students performing above threshold!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── JSS TRANSITION TAB ── */}
            {activeTab === 'transition' && analytics && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
                  <h2 className="text-xl font-black mb-1">JSS Transition Readiness</h2>
                  <p className="text-emerald-100 text-sm">Based on KPSEA scores — {analytics.readyForJSS.length} of {students.length} students ({students.length > 0 ? Math.round((analytics.readyForJSS.length / students.length) * 100) : 0}%) are JSS-ready</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'JSS Ready (≥50%)', count: analytics.readyForJSS.length, color: '#059669', bg: '#D1FAE5', icon: '✅' },
                    { label: 'Need Support (<50%)', count: analytics.atRisk.length, color: '#DC2626', bg: '#FEE2E2', icon: '⚠️' },
                    { label: 'Avg KPSEA Score', count: analytics.studentAnalytics.filter(s => s.avg !== null).length > 0
                      ? `${Math.round(analytics.studentAnalytics.filter(s => s.avg !== null).reduce((a: number, s: any) => a + s.avg, 0) / analytics.studentAnalytics.filter(s => s.avg !== null).length)}%`
                      : '—', color: '#2563EB', bg: '#DBEAFE', icon: '📊' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl border shadow-sm p-5 text-center">
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.count}</p>
                      <p className="text-sm text-gray-600 font-medium mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">Student Transition Status</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">KPSEA Average</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Band</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">JSS Status</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Recommended Pathway</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analytics.studentAnalytics.filter(sa => sa.avg !== null).sort((a: any, b: any) => (b.avg || 0) - (a.avg || 0)).map((sa: any, i: number) => {
                          const ready = sa.avg >= 50;
                          // Recommend pathway based on strongest subject
                          const strongest = sa.subScores.sort((a: any, b: any) => b.score - a.score)[0];
                          const rec = strongest?.subject.code === 'MAT' || strongest?.subject.code === 'SCI' ? 'STEM' :
                            strongest?.subject.code === 'CAS' ? 'Arts & Sports' :
                            strongest?.subject.code === 'AGR' ? 'Technical' : 'Social Sciences';
                          return (
                            <tr key={sa.student.id} className={ready ? '' : 'bg-red-50/20'}>
                              <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                    {sa.student.first_name?.[0]}
                                  </div>
                                  <span className="font-semibold text-gray-800 text-xs">{sa.student.first_name} {sa.student.last_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-black text-lg" style={{ color: sa.band?.color }}>{sa.avg}%</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: sa.band?.color, background: sa.band?.bg }}>{sa.band?.band}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {ready ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                                    <FiCheckCircle size={10} /> Ready for JSS
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                                    <FiAlertCircle size={10} /> Needs Support
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{rec}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── REPORTS TAB ── */}
            {activeTab === 'reports' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: 'KPSEA Results Report', desc: 'Full subject-by-subject KPSEA results for all Grade 6 students', icon: '📋', action: exportCSV },
                  { title: 'JSS Transition Report', desc: 'Which students are ready for Grade 7 and pathway recommendations', icon: '🎯', action: () => setActiveTab('transition') },
                  { title: 'At-Risk Intervention Plan', desc: 'Detailed report of students needing support before JSS', icon: '⚠️', action: () => setActiveTab('analysis') },
                  { title: 'Class Performance Summary', desc: 'School-wide KPSEA performance summary', icon: '📊', action: () => setActiveTab('analysis') },
                  { title: 'Individual Student KPSEA Card', desc: 'Print KPSEA performance card per student', icon: '🖨️', action: () => { window.print(); } },
                  { title: 'Parent KPSEA Report', desc: 'Parent-friendly KPSEA results letters', icon: '👨‍👩‍👧', action: () => toast('Coming soon!') },
                ].map((r, i) => (
                  <button key={i} onClick={r.action}
                    className="bg-white rounded-2xl border shadow-sm p-6 text-left hover:shadow-md transition-all group">
                    <div className="text-3xl mb-3">{r.icon}</div>
                    <h3 className="font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{r.title}</h3>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                    <div className="mt-4 flex items-center text-xs text-blue-600 font-semibold">
                      Generate <FiChevronRight size={13} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

