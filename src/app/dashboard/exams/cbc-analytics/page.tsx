'use client';
/**
 * APSIMS CBC Analytics Hub
 * Matches Kenya Ministry of Education CBC framework:
 * - Learning Areas (Strands & Sub-Strands)
 * - Competency Levels (Below Expectation → Exceeds Expectation)
 * - Formative & Summative Assessment
 * - Learner Profile indicators
 * - Portfolio & Rubric analysis
 * - Class & School CBC performance overview
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiPrinter } from 'react-icons/fi';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Kenya MoE CBC Competency Levels ──────────────────────────────────────────
const COMPETENCY_LEVELS = [
  { code: 'EE', label: 'Exceeds Expectation', short: 'EE', color: '#059669', bg: '#d1fae5', pts: 4 },
  { code: 'ME', label: 'Meets Expectation',   short: 'ME', color: '#3b82f6', bg: '#dbeafe', pts: 3 },
  { code: 'AE', label: 'Approaches Expectation', short: 'AE', color: '#f59e0b', bg: '#fef3c7', pts: 2 },
  { code: 'BE', label: 'Below Expectation',   short: 'BE', color: '#ef4444', bg: '#fee2e2', pts: 1 },
];

// ── Kenya CBC Learning Areas (MoE Framework) ─────────────────────────────────
const CBC_LEARNING_AREAS = [
  { area: 'Languages', subjects: ['English', 'Kiswahili', 'Kenya Sign Language', 'Indigenous Language'], icon: '📖', color: '#6366f1' },
  { area: 'Mathematics', subjects: ['Mathematics'], icon: '🔢', color: '#0891b2' },
  { area: 'Integrated Science', subjects: ['Science & Technology'], icon: '🔬', color: '#059669' },
  { area: 'Social Studies', subjects: ['Social Studies'], icon: '🌍', color: '#d97706' },
  { area: 'Religious Education', subjects: ['CRE', 'IRE', 'HRE'], icon: '✝️', color: '#7c3aed' },
  { area: 'Creative Arts & Sports', subjects: ['Art & Craft', 'Music', 'Physical Education'], icon: '🎨', color: '#ec4899' },
  { area: 'Pre-Technical & Pre-Career Education', subjects: ['Home Science', 'Agriculture', 'Business'], icon: '🔧', color: '#ea580c' },
];

// ── CBC Core Competencies (MoE) ───────────────────────────────────────────────
const CORE_COMPETENCIES = [
  { name: 'Communication & Collaboration', icon: '💬', color: '#6366f1' },
  { name: 'Critical Thinking & Problem Solving', icon: '🧠', color: '#0891b2' },
  { name: 'Creativity & Imagination', icon: '🎨', color: '#ec4899' },
  { name: 'Citizenship', icon: '🌍', color: '#059669' },
  { name: 'Digital Literacy', icon: '💻', color: '#7c3aed' },
  { name: 'Learning to Learn', icon: '📚', color: '#d97706' },
  { name: 'Self-Efficacy', icon: '⭐', color: '#ea580c' },
];

// ── Learner Profile Values (MoE CBC) ─────────────────────────────────────────
const LEARNER_VALUES = ['Integrity', 'Social Justice', 'Unity', 'Respect', 'Responsibility', 'Peace', 'Patriotism'];

const TABS = [
  '📊 School Overview',
  '📚 Learning Areas',
  '🧠 Core Competencies',
  '⭐ Learner Profile',
  '📋 Assessment Guide',
] as const;

interface ClassData { form_name: string; total: number; ee: number; me: number; ae: number; be: number; }
interface LearningAreaData { area: string; ee_pct: number; me_pct: number; ae_pct: number; be_pct: number; avg_level: number; }

export default function CBCAnalyticsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [marksData, setMarksData] = useState<any[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('Term 1');
  const [selYear, setSelYear] = useState(new Date().getFullYear().toString());

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, sRes, mRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_cbc_marks').select(`
        id, student_id, subject_id, strand, sub_strand, competency_level, marks, term, academic_year,
        school_students(first_name, last_name, form_id),
        school_subjects(subject_name)
      `).eq('term', selTerm).eq('academic_year', selYear).limit(5000),
    ]);
    setForms(fRes.data || []);
    setSubjects(sRes.data || []);
    setMarksData(mRes.data || []);
    setLoading(false);
  }, [selTerm, selYear]);

  useEffect(() => { load(); }, [load]);

  // ── Compute competency distribution ──────────────────────────────────────
  const compDist = useMemo(() => {
    const filtered = selForm ? marksData.filter(m => String(m.school_students?.form_id) === selForm) : marksData;
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0, total: 0 };
    filtered.forEach(m => {
      const lvl = (m.competency_level || '').toUpperCase();
      if (lvl in counts) { (counts as any)[lvl]++; }
      counts.total++;
    });
    return counts;
  }, [marksData, selForm]);

  const classDistribution = useMemo((): ClassData[] => {
    return forms.map(f => {
      const fm = marksData.filter(m => m.school_students?.form_id === f.id);
      const students = new Set(fm.map((m: any) => m.student_id)).size;
      const ee = fm.filter((m: any) => (m.competency_level || '').toUpperCase() === 'EE').length;
      const me = fm.filter((m: any) => (m.competency_level || '').toUpperCase() === 'ME').length;
      const ae = fm.filter((m: any) => (m.competency_level || '').toUpperCase() === 'AE').length;
      const be = fm.filter((m: any) => (m.competency_level || '').toUpperCase() === 'BE').length;
      return { form_name: f.form_name, total: students, ee, me, ae, be };
    }).filter(c => c.total > 0);
  }, [marksData, forms]);

  const learningAreaPerf = useMemo((): LearningAreaData[] => {
    return CBC_LEARNING_AREAS.map(la => {
      const areaSubjects = subjects.filter(s => la.subjects.some(ls => s.subject_name.toLowerCase().includes(ls.toLowerCase())));
      const areaIds = areaSubjects.map((s: any) => s.id);
      const areaMarks = marksData.filter(m => areaIds.includes(m.subject_id));
      const total = areaMarks.length;
      if (total === 0) return { area: la.area, ee_pct: 0, me_pct: 0, ae_pct: 0, be_pct: 0, avg_level: 0 };
      const ee = areaMarks.filter(m => m.competency_level?.toUpperCase() === 'EE').length;
      const me = areaMarks.filter(m => m.competency_level?.toUpperCase() === 'ME').length;
      const ae = areaMarks.filter(m => m.competency_level?.toUpperCase() === 'AE').length;
      const be = areaMarks.filter(m => m.competency_level?.toUpperCase() === 'BE').length;
      const avg = (ee * 4 + me * 3 + ae * 2 + be * 1) / total;
      return {
        area: la.area,
        ee_pct: Math.round(ee / total * 100), me_pct: Math.round(me / total * 100),
        ae_pct: Math.round(ae / total * 100), be_pct: Math.round(be / total * 100),
        avg_level: avg,
      };
    });
  }, [marksData, subjects]);

  const hasData = marksData.length > 0;
  const pct = (n: number) => compDist.total > 0 ? Math.round(n / compDist.total * 100) : 0;

  const doughnutData = {
    labels: COMPETENCY_LEVELS.map(l => l.short),
    datasets: [{
      data: [compDist.EE, compDist.ME, compDist.AE, compDist.BE],
      backgroundColor: COMPETENCY_LEVELS.map(l => l.color),
      borderWidth: 2, borderColor: '#fff',
    }],
  };

  const stackedBarData = {
    labels: classDistribution.map(c => c.form_name),
    datasets: [
      { label: 'EE', data: classDistribution.map(c => c.ee), backgroundColor: '#059669' },
      { label: 'ME', data: classDistribution.map(c => c.me), backgroundColor: '#3b82f6' },
      { label: 'AE', data: classDistribution.map(c => c.ae), backgroundColor: '#f59e0b' },
      { label: 'BE', data: classDistribution.map(c => c.be), backgroundColor: '#ef4444' },
    ],
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)' }}>
        <div className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">🇰🇪</div>
            <div>
              <h1 className="text-white font-black text-xl">CBC Analytics Hub</h1>
              <p className="text-indigo-300 text-sm">Kenya Ministry of Education — Competency Based Curriculum</p>
              <p className="text-indigo-400 text-xs mt-0.5">Learning Areas · Core Competencies · Learner Values · Assessment Framework</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={selYear} onChange={e => setSelYear(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} className="text-black">{y}</option>)}
            </select>
            <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none">
              {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t} className="text-black">{t}</option>)}
            </select>
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none">
              <option value="" className="text-black">All Classes</option>
              {forms.map(f => <option key={f.id} value={f.id} className="text-black">{f.form_name}</option>)}
            </select>
            <button onClick={load} className="p-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20"><FiRefreshCw size={14} /></button>
            <button onClick={() => window.print()} className="p-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20"><FiPrinter size={14} /></button>
          </div>
        </div>
        {/* Competency KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-white/10">
          {COMPETENCY_LEVELS.map(lvl => (
            <div key={lvl.code} className="p-4 text-center border-r border-white/10 last:border-r-0">
              <p className="text-2xl font-black text-white">{pct((compDist as any)[lvl.code])}%</p>
              <p className="text-xs font-black mt-0.5" style={{ color: lvl.color.replace('0', '4') }}>{lvl.short}</p>
              <p className="text-[9px] text-indigo-400 mt-0.5">{lvl.label}</p>
              <p className="text-[10px] text-indigo-300">{(compDist as any)[lvl.code]} records</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-200 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><FiRefreshCw size={24} className="animate-spin text-indigo-400 mr-2" /><span className="text-gray-500">Loading CBC data…</span></div>
      ) : (

      // ── TAB: School Overview ───────────────────────────────────────────────
      tab === TABS[0] ? (
        <div className="space-y-5">
          {!hasData && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-amber-500 text-xl">⚠️</span>
              <div>
                <p className="text-amber-800 font-bold text-sm">No CBC marks data found for {selTerm} {selYear}</p>
                <p className="text-amber-600 text-xs mt-1">Go to <a href="/dashboard/exams/cbc-marks" className="underline font-semibold">CBC Marks Entry</a> to enter marks, or check your selected term/year filters.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Competency Distribution Doughnut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-1">School-Wide Competency Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">{compDist.total} total assessment records · {selTerm} {selYear}</p>
              {hasData ? (
                <>
                  <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'right' } }, cutout: '65%' }} height={180} />
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {COMPETENCY_LEVELS.map(l => (
                      <div key={l.code} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: l.bg }}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black" style={{ color: l.color }}>{l.short} — {pct((compDist as any)[l.code])}%</p>
                          <p className="text-[9px] text-gray-500 truncate">{l.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="text-center py-16 text-gray-300 text-sm">No data</div>}
            </div>
            {/* Class Stacked Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-1">Competency Levels by Class</h3>
              <p className="text-xs text-gray-400 mb-4">EE / ME / AE / BE distribution per form</p>
              {classDistribution.length > 0 ? (
                <Bar data={stackedBarData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } }} height={180} />
              ) : <div className="text-center py-16 text-gray-300 text-sm">No class data</div>}
            </div>
          </div>

          {/* Class Performance Table */}
          {classDistribution.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h3 className="font-black text-gray-800 text-sm">📊 Class Performance Summary — {selTerm} {selYear}</h3>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-900 text-white">
                  {['Class', 'Students', 'EE %', 'ME %', 'AE %', 'BE %', 'Meeting & Above', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-black text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {classDistribution.map(c => {
                    const total = c.ee + c.me + c.ae + c.be;
                    const p = (n: number) => total > 0 ? Math.round(n / total * 100) : 0;
                    const meetingAbove = p(c.ee + c.me);
                    return (
                      <tr key={c.form_name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-black text-gray-800">{c.form_name}</td>
                        <td className="px-4 py-3 text-gray-500">{c.total}</td>
                        <td className="px-4 py-3 font-bold text-green-600">{p(c.ee)}%</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{p(c.me)}%</td>
                        <td className="px-4 py-3 font-bold text-amber-600">{p(c.ae)}%</td>
                        <td className="px-4 py-3 font-bold text-red-600">{p(c.be)}%</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full" style={{ width: `${meetingAbove}%`, background: meetingAbove >= 60 ? '#059669' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-black" style={{ color: meetingAbove >= 60 ? '#059669' : '#ef4444' }}>{meetingAbove}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${meetingAbove >= 70 ? 'bg-green-100 text-green-700' : meetingAbove >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {meetingAbove >= 70 ? '✅ On Track' : meetingAbove >= 50 ? '⚠️ Review' : '🔴 Intervention'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )

      // ── TAB: Learning Areas ────────────────────────────────────────────────
      : tab === TABS[1] ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CBC_LEARNING_AREAS.map((la, i) => {
              const perf = learningAreaPerf[i];
              return (
                <div key={la.area} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 flex items-center gap-3" style={{ background: la.color }}>
                    <span className="text-2xl">{la.icon}</span>
                    <div>
                      <h3 className="text-white font-black text-sm">{la.area}</h3>
                      <p className="text-white/70 text-[10px]">{la.subjects.join(', ')}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {perf && perf.ee_pct + perf.me_pct + perf.ae_pct + perf.be_pct > 0 ? (
                      <>
                        {[
                          { code: 'EE', pct: perf.ee_pct, color: '#059669' },
                          { code: 'ME', pct: perf.me_pct, color: '#3b82f6' },
                          { code: 'AE', pct: perf.ae_pct, color: '#f59e0b' },
                          { code: 'BE', pct: perf.be_pct, color: '#ef4444' },
                        ].map(l => (
                          <div key={l.code} className="flex items-center gap-2">
                            <span className="text-xs font-black w-6" style={{ color: l.color }}>{l.code}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full transition-all" style={{ width: `${l.pct}%`, background: l.color }} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 w-8 text-right">{l.pct}%</span>
                          </div>
                        ))}
                        <div className="pt-1 border-t mt-2">
                          <p className="text-xs text-gray-500">Avg Level: <strong>{perf.avg_level.toFixed(2)}/4.0</strong> &nbsp;|&nbsp; Meeting+: <strong style={{ color: (perf.ee_pct + perf.me_pct) >= 60 ? '#059669' : '#ef4444' }}>{perf.ee_pct + perf.me_pct}%</strong></p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">No CBC marks data yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )

      // ── TAB: Core Competencies ────────────────────────────────────────────
      : tab === TABS[2] ? (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-1">Kenya MoE CBC Core Competencies</h3>
            <p className="text-xs text-gray-400 mb-5">The 7 core competencies that CBC is designed to build in every learner</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CORE_COMPETENCIES.map(c => (
                <div key={c.name} className="p-4 rounded-2xl border-2 flex items-start gap-3" style={{ borderColor: c.color + '30', background: c.color + '08' }}>
                  <span className="text-2xl flex-shrink-0">{c.icon}</span>
                  <div>
                    <p className="text-sm font-black text-gray-800">{c.name}</p>
                    <div className="mt-2 space-y-1">
                      {COMPETENCY_LEVELS.map((l, li) => {
                          // Static sample widths — no Math.random() (hydration safe)
                          const sampleWidths = [65, 55, 30, 15];
                          return (
                          <div key={l.code} className="flex items-center gap-2">
                            <span className="text-[9px] font-black w-4" style={{ color: l.color }}>{l.code}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${sampleWidths[li]}%`, background: l.color }} />
                            </div>
                          </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-indigo-800 font-bold text-sm mb-1">📌 Kenya MoE Definition of Core Competencies</p>
            <p className="text-indigo-600 text-xs">Core Competencies are the skills, knowledge, values and attitudes needed by all learners to develop holistically and function productively in society. They cut across all learning areas and are developed progressively as learners grow through the education system.</p>
          </div>
        </div>
      )

      // ── TAB: Learner Profile ──────────────────────────────────────────────
      : tab === TABS[3] ? (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-1">🇰🇪 Kenyan Learner Profile — National Values</h3>
            <p className="text-xs text-gray-400 mb-5">Values instilled through CBC as per Kenya MoE curriculum framework</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {LEARNER_VALUES.map((v, i) => (
                <div key={v} className="p-4 rounded-2xl text-center border border-gray-200">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl mb-2 bg-indigo-50">
                    {['🤝', '⚖️', '🤲', '🙏', '✅', '☮️', '🇰🇪'][i]}
                  </div>
                  <p className="text-sm font-black text-gray-800">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-3">Pertinent & Contemporary Issues (PCIs)</h3>
              <div className="space-y-2">
                {['Environmental Education', 'Health Education (incl. HIV/AIDS)', 'Parental Education', 'Safety & Security', 'Financial Literacy', 'Gender & Sexuality', 'Child Protection & Child Rights'].map(pci => (
                  <div key={pci} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-gray-700">{pci}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-3">Assessment Methods (MoE Framework)</h3>
              <div className="space-y-3">
                {[
                  { type: 'Formative Assessment', desc: 'Ongoing — Observation, oral questions, assignments, projects, peer & self-assessment', color: '#6366f1' },
                  { type: 'Summative Assessment', desc: 'End of term/year — Written tests, practicals, Kenya National Examinations', color: '#059669' },
                  { type: 'Portfolio Assessment', desc: 'Collection of learner\'s work showing growth over time', color: '#0891b2' },
                  { type: 'Authentic Assessment', desc: 'Real-world tasks demonstrating competency application', color: '#d97706' },
                ].map(a => (
                  <div key={a.type} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: a.color + '30', background: a.color + '08' }}>
                    <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ background: a.color }} />
                    <div>
                      <p className="text-sm font-black text-gray-800">{a.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )

      // ── TAB: Assessment Guide ─────────────────────────────────────────────
      : (
        <div className="space-y-5">
          {/* Competency level guide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50">
              <h3 className="font-black text-gray-800">Kenya MoE CBC Assessment Rubric — Competency Levels</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              {COMPETENCY_LEVELS.map(l => (
                <div key={l.code} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: l.color }}>{l.code}</div>
                    <div>
                      <p className="font-black text-gray-800 text-sm">{l.label}</p>
                      <p className="text-xs text-gray-400">{l.pts} points</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {l.code === 'EE' && 'Learner consistently demonstrates the competency at a level that exceeds the expected standard. Shows advanced understanding and applies knowledge in novel situations.'}
                    {l.code === 'ME' && 'Learner consistently demonstrates the competency at the expected standard. Shows clear understanding and can apply knowledge appropriately.'}
                    {l.code === 'AE' && 'Learner demonstrates the competency at a level that is approaching but not yet meeting the expected standard. Shows partial understanding.'}
                    {l.code === 'BE' && 'Learner does not yet demonstrate the competency at the expected standard. Requires significant support and intervention.'}
                  </p>
                  <div className="mt-3 p-2 rounded-xl text-xs" style={{ background: l.bg, color: l.color }}>
                    <strong>Score Range:</strong> {l.code === 'EE' ? '80–100%' : l.code === 'ME' ? '60–79%' : l.code === 'AE' ? '40–59%' : '0–39%'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CBC vs 8-4-4 Comparison */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">CBC vs 8-4-4 — Key Differences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-xs font-black text-gray-500 text-left">Aspect</th>
                  <th className="px-4 py-3 text-xs font-black text-indigo-600 text-left">CBC (Current)</th>
                  <th className="px-4 py-3 text-xs font-black text-gray-400 text-left">8-4-4 (Old)</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Assessment', 'Competency levels (EE/ME/AE/BE)', 'Letter grades (A–E) & marks'],
                    ['Focus', 'Skills, values, competencies', 'Content & knowledge'],
                    ['Structure', '2-6-3-3 (PP1, PP2, Gr1-6, Jr Sec, Sr Sec)', '8-4-4 (Pri, Sec, Uni)'],
                    ['Exams', 'Continuous assessment + National', 'KCPE, KCSE focused'],
                    ['Learning Areas', '7 areas with strands & sub-strands', 'Subjects with topics'],
                    ['Report Cards', 'Competency profiles per strand', 'Marks % per subject'],
                    ['Class Size', 'Kenya target: 40 learners/class', '50+ common in public schools'],
                  ].map(([aspect, cbc, old]) => (
                    <tr key={aspect} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700">{aspect}</td>
                      <td className="px-4 py-3 text-sm text-indigo-700 font-semibold">{cbc}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{old}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
      )}
    </div>
  );
}
