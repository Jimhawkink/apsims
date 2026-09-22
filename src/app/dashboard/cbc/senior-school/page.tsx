'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import {
  FiBook, FiUsers, FiAward, FiTrendingUp, FiGrid, FiSettings,
  FiBarChart2, FiStar, FiTarget, FiCheckCircle, FiAlertCircle,
  FiFileText, FiDownload, FiRefreshCw, FiFilter, FiChevronRight,
  FiPieChart, FiActivity, FiGlobe, FiLayers, FiZap, FiShield,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── Senior School Pathways (CBC Grade 10-12) ──────────────────────────────
const SENIOR_PATHWAYS = [
  {
    id: 'STEM',
    name: 'Science, Technology, Engineering & Mathematics',
    short: 'STEM',
    icon: '🔬',
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    careers: ['Engineer', 'Doctor', 'Scientist', 'Data Analyst', 'Software Developer'],
  },
  {
    id: 'ARTS',
    name: 'Arts & Sports Science',
    short: 'Arts & Sports',
    icon: '🎨',
    color: '#EC4899',
    bg: '#FCE7F3',
    border: '#F9A8D4',
    subjects: ['Visual Arts', 'Music', 'Performing Arts', 'Physical Education', 'Drama'],
    careers: ['Artist', 'Athlete', 'Musician', 'Sports Coach', 'Entertainment Manager'],
  },
  {
    id: 'SOCIAL',
    name: 'Social Sciences',
    short: 'Social Sciences',
    icon: '🌍',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FCD34D',
    subjects: ['History', 'Geography', 'Business Studies', 'Economics', 'CRE/IRE'],
    careers: ['Lawyer', 'Journalist', 'Diplomat', 'Economist', 'Social Worker'],
  },
  {
    id: 'TECHNICAL',
    name: 'Technical & Applied Sciences',
    short: 'Technical',
    icon: '⚙️',
    color: '#0891B2',
    bg: '#CFFAFE',
    border: '#67E8F9',
    subjects: ['Pre-Technical Studies', 'Agriculture', 'Home Science', 'Building Construction', 'Electrical'],
    careers: ['Technician', 'Farmer', 'Chef', 'Builder', 'Electrician'],
  },
];

const COMP_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  EE: { text: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  ME: { text: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  AE: { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  BE: { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

type Tab = 'overview' | 'enrollment' | 'marks' | 'pathways' | 'analytics' | 'reports';

export default function CBCSeniorSchoolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [pathwaySelections, setPathwaySelections] = useState<any[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selPathway, setSelPathway] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollModal, setEnrollModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [formsRes, termsRes, subjectsRes, sdRes] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_terms').select('*').order('id', { ascending: false }),
        sb.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
        sb.from('school_details').select('*').limit(1).maybeSingle(),
      ]);
      const allForms = formsRes.data || [];
      // Senior school = Grade 10-12 (form_level 10-12)
      const seniorForms = allForms.filter((f: any) => f.form_level >= 10 && f.form_level <= 12);
      setForms(seniorForms);
      setTerms(termsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setSchoolDetails(sdRes.data);
      const cur = (termsRes.data || []).find((t: any) => t.is_current);
      if (cur) setSelTerm(String(cur.id));
      if (seniorForms.length > 0) setSelForm(String(seniorForms[0].id));
      setLoading(false);
    };
    load();
  }, []);

  // Load students when form changes
  useEffect(() => {
    if (!selForm) { setStudents([]); return; }
    const load = async () => {
      const { data } = await sb.from('school_students').select('*').eq('form_id', Number(selForm)).eq('status', 'Active').order('last_name');
      setStudents(data || []);
    };
    load();
  }, [selForm]);

  // Load assessments
  useEffect(() => {
    if (!selTerm || !selForm || students.length === 0) return;
    const load = async () => {
      const ids = students.map((s: any) => s.id);
      const { data } = await sb.from('cbc_assessments').select('*').in('student_id', ids).eq('term_id', Number(selTerm));
      setAssessments(data || []);
    };
    load();
  }, [selForm, selTerm, students]);

  // Load pathway selections
  useEffect(() => {
    if (students.length === 0) return;
    const load = async () => {
      const ids = students.map((s: any) => s.id);
      try {
        const { data } = await sb.from('cbc_senior_pathways').select('*').in('student_id', ids);
        setPathwaySelections(data || []);
      } catch {}
    };
    load();
  }, [students]);

  // Computed analytics
  const analytics = useMemo(() => {
    const pathwayDist = SENIOR_PATHWAYS.map(p => ({
      ...p,
      count: pathwaySelections.filter((ps: any) => ps.pathway_id === p.id).length,
    }));
    const levelCounts = { EE: 0, ME: 0, AE: 0, BE: 0, NA: 0 };
    students.forEach((s: any) => {
      const asmts = assessments.filter((a: any) => a.student_id === s.id && a.assessment_type === 'Summative');
      if (asmts.length === 0) { levelCounts.NA++; return; }
      const levels = asmts.map((a: any) => a.rubric_level).filter(Boolean);
      const freq: any = { EE: 0, ME: 0, AE: 0, BE: 0 };
      levels.forEach((l: string) => { if (freq[l] !== undefined) freq[l]++; });
      const dom = Object.entries(freq).sort((a: any, b: any) => b[1] - a[1])[0][0] as string;
      levelCounts[dom as keyof typeof levelCounts]++;
    });
    return { pathwayDist, levelCounts };
  }, [students, assessments, pathwaySelections]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      if (searchQuery && !`${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selPathway !== 'all') {
        const ps = pathwaySelections.find((p: any) => p.student_id === s.id);
        if (!ps || ps.pathway_id !== selPathway) return false;
      }
      return true;
    });
  }, [students, searchQuery, selPathway, pathwaySelections]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FiGrid size={15} /> },
    { id: 'enrollment', label: 'Pathway Enrollment', icon: <FiUsers size={15} /> },
    { id: 'marks', label: 'Mark Entry', icon: <FiFileText size={15} /> },
    { id: 'pathways', label: 'Pathway Analytics', icon: <FiBarChart2 size={15} /> },
    { id: 'analytics', label: 'Performance Analytics', icon: <FiActivity size={15} /> },
    { id: 'reports', label: 'Reports & Cards', icon: <FiAward size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-md">
              <FiStar className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900">CBC Senior School Hub</h1>
              <p className="text-xs text-gray-500 font-medium">Grade 10 · 11 · 12 — Competency-Based Curriculum (2026 Ready)</p>
            </div>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-black bg-violet-100 text-violet-700 border border-violet-200">NEW</span>
          </div>
          <div className="flex gap-2">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value="">Select Grade</option>
              {forms.map((f: any) => <option key={f.id} value={String(f.id)}>Grade {f.form_level} — {f.form_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400">
              {terms.map((t: any) => <option key={t.id} value={String(t.id)}>{t.term_name}{t.is_current ? ' ★' : ''}</option>)}
            </select>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-screen-2xl mx-auto px-4 border-t border-gray-100">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading Senior School data…</p>
          </div>
        )}

        {!loading && activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Grade 10-12 notice */}
            {forms.length === 0 && (
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-8 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FiZap size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black mb-2">🇰🇪 Ready for Kenya's CBC Senior School (2026)</h2>
                    <p className="text-violet-100 text-sm leading-relaxed max-w-2xl">
                      The first JSS cohort (Grade 9, 2025) transitions to Senior School in 2026. APSIMS is Kenya's first school management system fully built for CBC Senior School (Grade 10–12) with Pathway-based learning, Senior School assessments, and university readiness tracking.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {SENIOR_PATHWAYS.map(p => (
                        <span key={p.id} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-bold">
                          {p.icon} {p.short}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: students.length, icon: <FiUsers />, color: 'violet' },
                { label: 'Pathway Enrolled', value: pathwaySelections.length, icon: <FiTarget />, color: 'blue' },
                { label: 'Assessments', value: assessments.length, icon: <FiFileText />, color: 'emerald' },
                { label: 'EE+ME Rate', value: students.length > 0 ? `${Math.round(((analytics.levelCounts.EE + analytics.levelCounts.ME) / students.length) * 100)}%` : '—', icon: <FiAward />, color: 'amber' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl border shadow-sm p-5">
                  <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600 mb-3`}>
                    {kpi.icon}
                  </div>
                  <p className="text-3xl font-black text-gray-800">{kpi.value}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Pathway cards */}
            <h2 className="text-lg font-bold text-gray-800">Senior School Pathways</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SENIOR_PATHWAYS.map(p => {
                const enrolled = analytics.pathwayDist.find(d => d.id === p.id)?.count || 0;
                return (
                  <div key={p.id} className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{p.icon}</span>
                      <span className="text-xl font-black" style={{ color: p.color }}>{enrolled}</span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-1">{p.short}</h3>
                    <p className="text-xs text-gray-500 mb-3">{p.name}</p>
                    <div className="space-y-1">
                      {p.subjects.slice(0, 3).map(s => (
                        <div key={s} className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ color: p.color, background: p.bg }}>
                          📖 {s}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Career Paths</p>
                      <p className="text-xs text-gray-600 mt-1">{p.careers.slice(0, 3).join(' · ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Competency distribution */}
            {students.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">Competency Level Distribution</h3>
                <div className="grid grid-cols-4 gap-4">
                  {(['EE', 'ME', 'AE', 'BE'] as const).map(k => {
                    const cnt = analytics.levelCounts[k] || 0;
                    const pct = students.length > 0 ? Math.round((cnt / students.length) * 100) : 0;
                    const c = COMP_COLORS[k];
                    return (
                      <div key={k} className="text-center p-4 rounded-xl border" style={{ background: c.bg, borderColor: c.border }}>
                        <p className="text-2xl font-black" style={{ color: c.text }}>{cnt}</p>
                        <p className="text-xs font-bold mt-1" style={{ color: c.text }}>{k}</p>
                        <div className="mt-2 w-full h-2 rounded-full bg-white/60 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.text }} />
                        </div>
                        <p className="text-xs mt-1" style={{ color: c.text }}>{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'enrollment' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Pathway Enrollment — {students.length} Students</h2>
              <div className="flex gap-2">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search student…" type="text"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                <select value={selPathway} onChange={e => setSelPathway(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
                  <option value="all">All Pathways</option>
                  {SENIOR_PATHWAYS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.short}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Adm No</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Current Pathway</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((s: any, i: number) => {
                    const ps = pathwaySelections.find((p: any) => p.student_id === s.id);
                    const pathway = ps ? SENIOR_PATHWAYS.find(p => p.id === ps.pathway_id) : null;
                    return (
                      <tr key={s.id} className="hover:bg-violet-50/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                              {s.first_name?.[0]}{s.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-gray-400">{s.gender || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{s.admission_no || s.admission_number || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {pathway ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border"
                              style={{ color: pathway.color, background: pathway.bg, borderColor: pathway.border }}>
                              {pathway.icon} {pathway.short}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not enrolled</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ps?.status === 'confirmed' ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                              <FiCheckCircle size={10} /> Confirmed
                            </span>
                          ) : ps ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Pending</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={ps?.pathway_id || ''}
                            onChange={async (e) => {
                              const pathwayId = e.target.value;
                              if (!pathwayId) return;
                              try {
                                const { error } = await sb.from('cbc_senior_pathways').upsert({
                                  student_id: s.id,
                                  pathway_id: pathwayId,
                                  form_id: Number(selForm),
                                  status: 'pending',
                                  enrolled_at: new Date().toISOString(),
                                }, { onConflict: 'student_id' });
                                if (error) throw error;
                                setPathwaySelections(prev => {
                                  const next = prev.filter((p: any) => p.student_id !== s.id);
                                  return [...next, { student_id: s.id, pathway_id: pathwayId, status: 'pending' }];
                                });
                                toast.success(`${s.first_name} enrolled in ${pathwayId} pathway`);
                              } catch (err: any) {
                                toast.error('Failed: ' + (err.message || 'DB error'));
                              }
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                            <option value="">Assign Pathway…</option>
                            {SENIOR_PATHWAYS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.short}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                      <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
                      <p>{forms.length === 0 ? 'No Senior School grades (10-12) configured yet. Add Grade 10 in School Setup.' : 'No students found'}</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'marks' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <FiFileText size={32} className="text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Senior School Mark Entry</h3>
            <p className="text-gray-500 text-sm mb-4">Use the main CBC Marks Entry page with "CBC Senior School" mode selected.</p>
            <Link href="/dashboard/exams/cbc-marks"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all">
              Go to CBC Mark Entry <FiChevronRight />
            </Link>
          </div>
        )}

        {!loading && activeTab === 'pathways' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {SENIOR_PATHWAYS.map(p => {
              const cnt = analytics.pathwayDist.find(d => d.id === p.id)?.count || 0;
              const pct = students.length > 0 ? Math.round((cnt / students.length) * 100) : 0;
              const studentsInPath = pathwaySelections
                .filter((ps: any) => ps.pathway_id === p.id)
                .map((ps: any) => students.find((s: any) => s.id === ps.student_id))
                .filter(Boolean);
              return (
                <div key={p.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-5 border-b" style={{ background: p.bg, borderColor: p.border }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{p.icon}</span>
                        <div>
                          <h3 className="font-bold text-gray-800">{p.name}</h3>
                          <p className="text-xs text-gray-600">{cnt} students enrolled · {pct}%</p>
                        </div>
                      </div>
                      <div className="text-3xl font-black" style={{ color: p.color }}>{cnt}</div>
                    </div>
                    <div className="mt-3 w-full h-2 rounded-full bg-white/60 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Core Subjects</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.subjects.map(s => <span key={s} className="text-xs px-2 py-0.5 rounded-md border font-medium" style={{ color: p.color, background: p.bg, borderColor: p.border }}>{s}</span>)}
                    </div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Enrolled Students</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {studentsInPath.slice(0, 8).map((s: any) => (
                        <div key={s.id} className="flex items-center gap-2 text-xs">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: p.color }}>
                            {s.first_name?.[0]}
                          </div>
                          <span className="text-gray-700 font-medium">{s.first_name} {s.last_name}</span>
                        </div>
                      ))}
                      {studentsInPath.length > 8 && <p className="text-xs text-gray-400">+{studentsInPath.length - 8} more</p>}
                      {studentsInPath.length === 0 && <p className="text-xs text-gray-400 italic">No students enrolled yet</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(['EE','ME','AE','BE'] as const).map(k => {
                const cnt = analytics.levelCounts[k] || 0;
                const pct = students.length > 0 ? Math.round((cnt / students.length) * 100) : 0;
                const c = COMP_COLORS[k];
                return (
                  <div key={k} className="bg-white rounded-2xl border shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md border" style={{ color: c.text, background: c.bg, borderColor: c.border }}>{k}</span>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                    <p className="text-3xl font-black text-gray-800">{cnt}</p>
                    <div className="mt-2 w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.text }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">Senior School Analytics — Grade {selForm ? (forms.find((f: any) => String(f.id) === selForm)?.form_level) : '—'}</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Competency Distribution</p>
                  {(['EE','ME','AE','BE'] as const).map(k => {
                    const cnt = analytics.levelCounts[k] || 0;
                    const pct = students.length > 0 ? Math.round((cnt / students.length) * 100) : 0;
                    const c = COMP_COLORS[k];
                    const fullLabel = { EE: 'Exceeds Expectation', ME: 'Meets Expectation', AE: 'Approaches Expectation', BE: 'Below Expectation' }[k];
                    return (
                      <div key={k} className="flex items-center gap-3 mb-3">
                        <span className="w-8 text-center text-xs font-black" style={{ color: c.text }}>{k}</span>
                        <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full flex items-center justify-end pr-2 text-white text-[10px] font-bold transition-all"
                            style={{ width: `${Math.max(pct, 4)}%`, background: c.text }}>
                            {pct > 10 ? `${pct}%` : ''}
                          </div>
                        </div>
                        <span className="w-8 text-xs text-gray-500 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pathway Distribution</p>
                  {SENIOR_PATHWAYS.map(p => {
                    const cnt = analytics.pathwayDist.find(d => d.id === p.id)?.count || 0;
                    const pct = students.length > 0 ? Math.round((cnt / students.length) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3 mb-3">
                        <span className="text-base w-6">{p.icon}</span>
                        <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full flex items-center justify-end pr-2 text-white text-[10px] font-bold transition-all"
                            style={{ width: `${Math.max(pct, 4)}%`, background: p.color }}>
                            {pct > 10 ? `${pct}%` : ''}
                          </div>
                        </div>
                        <span className="w-16 text-xs text-gray-500">{p.short}</span>
                        <span className="w-6 text-xs text-gray-400 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: 'Senior School Report Cards', desc: 'Print pathway-based competency report cards for Grade 10-12', icon: '📋', color: 'violet', href: '/dashboard/exams/cbc-report-cards' },
                { title: 'Pathway Progress Report', desc: 'Detailed subject-by-subject progress per pathway', icon: '📊', color: 'blue', href: '/dashboard/exams/cbc-reports' },
                { title: 'University Readiness Report', desc: 'Predict minimum university entry requirements', icon: '🎓', color: 'emerald', href: '/dashboard/exams/cbc-analytics' },
              ].map((r, i) => (
                <Link key={i} href={r.href}
                  className="bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-all group">
                  <div className="text-3xl mb-3">{r.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1 group-hover:text-violet-700 transition-colors">{r.title}</h3>
                  <p className="text-xs text-gray-500">{r.desc}</p>
                  <div className="mt-4 flex items-center text-xs text-violet-600 font-semibold">
                    Open <FiChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

