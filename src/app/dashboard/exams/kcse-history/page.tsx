'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiDownload, FiPrinter, FiRefreshCw, FiTrendingUp, FiAward, FiPlus, FiSave, FiEdit2, FiX } from 'react-icons/fi';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

// ── Kenya KCSE Grade system ───────────────────────────────────────────────────
const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
const GRADE_POINTS: Record<string, number> = {
  'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8, 'C+': 7, 'C': 6,
  'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1,
};
const GRADE_COLORS: Record<string, string> = {
  'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#6ee7b7',
  'B-': '#a7f3d0', 'C+': '#fcd34d', 'C': '#fbbf24', 'C-': '#f59e0b',
  'D+': '#fb923c', 'D': '#f97316', 'D-': '#ef4444', 'E': '#dc2626',
};

// ── Kenya Grading System Reference ────────────────────────────────────────────
const GRADING_SYSTEMS = [
  {
    title: 'Languages (English, Kiswahili)',
    color: '#6366f1',
    grades: [
      { grade: 'A', range: '75–100', points: 12 }, { grade: 'A-', range: '70–74', points: 11 },
      { grade: 'B+', range: '65–69', points: 10 }, { grade: 'B', range: '60–64', points: 9 },
      { grade: 'B-', range: '55–59', points: 8 }, { grade: 'C+', range: '50–54', points: 7 },
      { grade: 'C', range: '45–49', points: 6 }, { grade: 'C-', range: '40–44', points: 5 },
      { grade: 'D+', range: '35–39', points: 4 }, { grade: 'D', range: '30–34', points: 3 },
      { grade: 'D-', range: '25–29', points: 2 }, { grade: 'E', range: '0–24', points: 1 },
    ],
  },
  {
    title: 'Maths & Sciences',
    color: '#0891b2',
    grades: [
      { grade: 'A', range: '80–100', points: 12 }, { grade: 'A-', range: '75–79', points: 11 },
      { grade: 'B+', range: '70–74', points: 10 }, { grade: 'B', range: '65–69', points: 9 },
      { grade: 'B-', range: '60–64', points: 8 }, { grade: 'C+', range: '55–59', points: 7 },
      { grade: 'C', range: '50–54', points: 6 }, { grade: 'C-', range: '45–49', points: 5 },
      { grade: 'D+', range: '40–44', points: 4 }, { grade: 'D', range: '35–39', points: 3 },
      { grade: 'D-', range: '30–34', points: 2 }, { grade: 'E', range: '0–29', points: 1 },
    ],
  },
  {
    title: 'Humanities / Technical / Applied',
    color: '#d97706',
    grades: [
      { grade: 'A', range: '75–100', points: 12 }, { grade: 'A-', range: '70–74', points: 11 },
      { grade: 'B+', range: '65–69', points: 10 }, { grade: 'B', range: '60–64', points: 9 },
      { grade: 'B-', range: '55–59', points: 8 }, { grade: 'C+', range: '50–54', points: 7 },
      { grade: 'C', range: '45–49', points: 6 }, { grade: 'C-', range: '40–44', points: 5 },
      { grade: 'D+', range: '35–39', points: 4 }, { grade: 'D', range: '30–34', points: 3 },
      { grade: 'D-', range: '25–29', points: 2 }, { grade: 'E', range: '0–24', points: 1 },
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface KCSERecord {
  id?: number;
  year: number;
  total_candidates: number;
  grade_counts: Record<string, number>;
  mean_points: number;
  mean_grade: string;
  school_position?: number;
  county_mean?: number;
  national_mean?: number;
  notes?: string;
}
interface SubjectRecord {
  id?: number;
  year: number;
  subject: string;
  mean_score: number;
  mean_grade: string;
  candidates: number;
  pass_rate: number;
}

const TABS = ['📅 Year-by-Year Analysis', '📚 Subject Analysis', '🎯 Grade System Reference', '📊 Charts & Trends'] as const;

export default function KCSEHistoryPage() {
  const [tab, setTab] = useState<typeof TABS[number]>(TABS[0]);
  const [records, setRecords] = useState<KCSERecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<Partial<KCSERecord>>({});
  const [saving, setSaving] = useState(false);
  const [subjectList, setSubjectList] = useState<string[]>([]);
  const [selSubject, setSelSubject] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: recs }, { data: subs }] = await Promise.all([
      supabase.from('school_kcse_history').select('*').order('year', { ascending: false }),
      supabase.from('school_kcse_subject_history').select('*').order('year', { ascending: false }),
    ]);
    setRecords(recs || []);
    setSubjects(subs || []);
    const uniqueSubjects = [...new Set((subs || []).map((s: SubjectRecord) => s.subject))].sort();
    setSubjectList(uniqueSubjects);
    if (uniqueSubjects.length > 0 && !selSubject) setSelSubject(uniqueSubjects[0]);
    setLoading(false);
  }, [selSubject]);

  useEffect(() => { load(); }, []);

  const years = useMemo(() => records.map(r => r.year).sort((a, b) => a - b), [records]);
  const filteredSubjectData = useMemo(() => subjects.filter(s => s.subject === selSubject).sort((a, b) => a.year - b.year), [subjects, selSubject]);

  // ── Save KCSE record ───────────────────────────────────────────────────────
  const saveRecord = async () => {
    if (!editRecord.year) { return; }
    setSaving(true);
    const payload = {
      year: Number(editRecord.year),
      total_candidates: Number(editRecord.total_candidates || 0),
      grade_counts: editRecord.grade_counts || {},
      mean_points: Number(editRecord.mean_points || 0),
      mean_grade: editRecord.mean_grade || 'C',
      school_position: editRecord.school_position ? Number(editRecord.school_position) : null,
      county_mean: editRecord.county_mean ? Number(editRecord.county_mean) : null,
      national_mean: editRecord.national_mean ? Number(editRecord.national_mean) : null,
      notes: editRecord.notes || null,
    };
    const { error } = editRecord.id
      ? await supabase.from('school_kcse_history').update(payload).eq('id', editRecord.id)
      : await supabase.from('school_kcse_history').insert(payload);
    if (!error) { setShowAddModal(false); setEditRecord({}); await load(); }
    setSaving(false);
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const sorted = [...records].sort((a, b) => a.year - b.year);
    const header = ['Year', 'Candidates', ...GRADES, 'Mean Points', 'Mean Grade', 'School Position', 'County Mean', 'National Mean'];
    const rows = sorted.map(r => [
      r.year, r.total_candidates,
      ...GRADES.map(g => r.grade_counts?.[g] || 0),
      r.mean_points.toFixed(2), r.mean_grade,
      r.school_position || '', r.county_mean || '', r.national_mean || '',
    ]);
    const csv = '\uFEFF' + [header, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'KCSE_Historical_Analysis.csv'; a.click();
  };

  const trendData = {
    labels: years.map(String),
    datasets: [
      {
        label: 'Mean Points',
        data: years.map(y => records.find(r => r.year === y)?.mean_points || 0),
        borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.4, fill: true, yAxisID: 'y',
      },
      {
        label: 'County Mean',
        data: years.map(y => records.find(r => r.year === y)?.county_mean || null),
        borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.4, borderDash: [5, 5], yAxisID: 'y',
      },
      {
        label: 'National Mean',
        data: years.map(y => records.find(r => r.year === y)?.national_mean || null),
        borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.4, borderDash: [8, 4], yAxisID: 'y',
      },
    ],
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">KCSE Historical Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Year-by-year results from 2006 · Grade distribution · Mean grade · Subject analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><FiRefreshCw size={13} />Refresh</button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><FiDownload size={13} />Export CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><FiPrinter size={13} />Print</button>
          <button onClick={() => { setEditRecord({ year: new Date().getFullYear() }); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <FiPlus size={13} />Add Year
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Years of Data', value: records.length, icon: '📅', color: '#6366f1' },
          { label: 'Best Mean Grade', value: records.length ? records.reduce((b, r) => (r.mean_points > b.mean_points ? r : b), records[0])?.mean_grade : '—', icon: '🏆', color: '#059669' },
          { label: 'Latest Mean', value: records.length ? `${records.sort((a,b) => b.year - a.year)[0]?.mean_points?.toFixed(2)} pts` : '—', icon: '📊', color: '#0891b2' },
          { label: 'Subjects Tracked', value: subjectList.length, icon: '📚', color: '#d97706' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><span className="text-xl">{k.icon}</span><p className="text-xs text-gray-500 font-semibold">{k.label}</p></div>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
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
        <div className="flex items-center justify-center py-20"><FiRefreshCw size={24} className="animate-spin text-indigo-400 mr-2" /><span className="text-gray-500">Loading…</span></div>
      ) : (

      // ── TAB: Year-by-Year ─────────────────────────────────────────────────
      tab === TABS[0] ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 1000 }}>
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-4 py-3 text-left text-xs font-black sticky left-0 bg-gray-900 z-10">Grade</th>
                  {[...records].sort((a,b) => a.year - b.year).map(r => (
                    <th key={r.year} className="px-3 py-3 text-center text-xs font-black whitespace-nowrap">
                      <div>{r.year}</div>
                      <div className="text-gray-400 text-[9px] font-normal">{r.total_candidates} cands</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRADES.map(grade => (
                  <tr key={grade} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-black sticky left-0 bg-white z-10" style={{ color: GRADE_COLORS[grade] }}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-black" style={{ background: GRADE_COLORS[grade] }}>{grade}</div>
                        <span className="text-xs">{GRADE_POINTS[grade]} pts</span>
                      </div>
                    </td>
                    {[...records].sort((a,b) => a.year - b.year).map(r => {
                      const count = r.grade_counts?.[grade] || 0;
                      const pct = r.total_candidates > 0 ? Math.round(count / r.total_candidates * 100) : 0;
                      return (
                        <td key={r.year} className="px-3 py-2.5 text-center">
                          <div className="text-sm font-black text-gray-800">{count}</div>
                          <div className="text-[9px] text-gray-400">{pct}%</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Mean Points row */}
                <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                  <td className="px-4 py-3 font-black text-indigo-700 sticky left-0 bg-indigo-50 z-10 text-xs">Mean Points</td>
                  {[...records].sort((a,b) => a.year - b.year).map(r => (
                    <td key={r.year} className="px-3 py-3 text-center font-black text-indigo-700 text-sm">{r.mean_points?.toFixed(2)}</td>
                  ))}
                </tr>
                {/* Mean Grade row */}
                <tr className="bg-green-50">
                  <td className="px-4 py-3 font-black text-green-700 sticky left-0 bg-green-50 z-10 text-xs">Mean Grade</td>
                  {[...records].sort((a,b) => a.year - b.year).map(r => (
                    <td key={r.year} className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-black" style={{ background: GRADE_COLORS[r.mean_grade] || '#6b7280' }}>{r.mean_grade}</span>
                    </td>
                  ))}
                </tr>
                {/* County Mean */}
                <tr className="bg-amber-50">
                  <td className="px-4 py-3 font-black text-amber-700 sticky left-0 bg-amber-50 z-10 text-xs">County Mean</td>
                  {[...records].sort((a,b) => a.year - b.year).map(r => (
                    <td key={r.year} className="px-3 py-3 text-center text-xs font-semibold text-amber-700">{r.county_mean?.toFixed(2) || '—'}</td>
                  ))}
                </tr>
                {/* National Mean */}
                <tr className="bg-red-50">
                  <td className="px-4 py-3 font-black text-red-700 sticky left-0 bg-red-50 z-10 text-xs">National Mean</td>
                  {[...records].sort((a,b) => a.year - b.year).map(r => (
                    <td key={r.year} className="px-3 py-3 text-center text-xs font-semibold text-red-700">{r.national_mean?.toFixed(2) || '—'}</td>
                  ))}
                </tr>
                {/* School Position */}
                <tr className="bg-purple-50">
                  <td className="px-4 py-3 font-black text-purple-700 sticky left-0 bg-purple-50 z-10 text-xs">School Position</td>
                  {[...records].sort((a,b) => a.year - b.year).map(r => (
                    <td key={r.year} className="px-3 py-3 text-center text-xs font-semibold text-purple-700">{r.school_position ? `#${r.school_position}` : '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">📅</p>
              <p className="font-semibold">No KCSE records yet</p>
              <p className="text-xs mt-1">Click "+ Add Year" to enter historical results</p>
            </div>
          )}
        </div>
      )

      // ── TAB: Subject Analysis ─────────────────────────────────────────────
      : tab === TABS[1] ? (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <label className="text-xs font-bold text-gray-600">Subject:</label>
            <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              {subjectList.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => { /* open add subject modal */ }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl">
              <FiPlus size={11} />Add Subject Data
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {['Year', 'Candidates', 'Mean Score', 'Mean Grade', 'Pass Rate'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-black text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubjectData.map(s => (
                    <tr key={s.id || s.year} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-black text-gray-800">{s.year}</td>
                      <td className="px-4 py-3 text-gray-600">{s.candidates}</td>
                      <td className="px-4 py-3 font-black text-indigo-700">{s.mean_score?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-black"
                          style={{ background: GRADE_COLORS[s.mean_grade] || '#6b7280' }}>{s.mean_grade}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${s.pass_rate}%`, background: s.pass_rate >= 50 ? '#059669' : '#ef4444' }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: s.pass_rate >= 50 ? '#059669' : '#ef4444' }}>{s.pass_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubjectData.length === 0 && (
                <div className="text-center py-10 text-gray-400"><p>No data for {selSubject}</p></div>
              )}
            </div>
          </div>
        </div>
      )

      // ── TAB: Grade System Reference ───────────────────────────────────────
      : tab === TABS[2] ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {GRADING_SYSTEMS.map(sys => (
            <div key={sys.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4" style={{ background: sys.color }}>
                <h3 className="text-white font-black text-sm">{sys.title}</h3>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-2 text-left font-bold text-gray-500">Grade</th><th className="px-4 py-2 text-left font-bold text-gray-500">Score Range</th><th className="px-4 py-2 text-left font-bold text-gray-500">Points</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {sys.grades.map(g => (
                    <tr key={g.grade} className="hover:bg-gray-50">
                      <td className="px-4 py-2"><span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-black" style={{ background: GRADE_COLORS[g.grade] }}>{g.grade}</span></td>
                      <td className="px-4 py-2 font-semibold text-gray-700">{g.range}</td>
                      <td className="px-4 py-2 font-black text-gray-800">{g.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="lg:col-span-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-black text-amber-800 mb-2">📌 Kenya Mean Grade Calculation</h3>
            <p className="text-sm text-amber-700">Mean Points = Sum of best 8 subject points ÷ 8. Mean Grade is the letter grade corresponding to the Mean Points score. KNEC uses the weighted average where compulsory subjects (English, Kiswahili, Maths) and 5 best optional subjects count toward the mean.</p>
          </div>
        </div>
      )

      // ── TAB: Charts ───────────────────────────────────────────────────────
      : (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">Mean Points Trend vs County & National</h3>
            {years.length > 0 ? (
              <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { min: 0, max: 12, title: { display: true, text: 'Mean Points' } } } }} height={80} />
            ) : <p className="text-center text-gray-400 py-10">No data yet — add KCSE records first</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">Grade Distribution — Latest Year</h3>
            {records.length > 0 ? (() => {
              const latest = records.sort((a, b) => b.year - a.year)[0];
              return <Bar data={{
                labels: GRADES,
                datasets: [{ label: `${latest.year} Candidates`, data: GRADES.map(g => latest.grade_counts?.[g] || 0), backgroundColor: GRADES.map(g => GRADE_COLORS[g] + 'cc') }],
              }} options={{ responsive: true, plugins: { legend: { display: false } } }} height={80} />;
            })() : <p className="text-center text-gray-400 py-10">No data yet</p>}
          </div>
        </div>
      )
      )}

      {/* ── ADD/EDIT MODAL ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="font-black text-gray-900 text-lg">Add KCSE Year Results</h2>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><FiX size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Year *', key: 'year', type: 'number', placeholder: '2024' },
                  { label: 'Total Candidates', key: 'total_candidates', type: 'number', placeholder: '150' },
                  { label: 'Mean Points *', key: 'mean_points', type: 'number', placeholder: '6.43' },
                  { label: 'Mean Grade *', key: 'mean_grade', type: 'text', placeholder: 'C+' },
                  { label: 'School Position (County)', key: 'school_position', type: 'number', placeholder: '3' },
                  { label: 'County Mean Points', key: 'county_mean', type: 'number', placeholder: '5.82' },
                  { label: 'National Mean Points', key: 'national_mean', type: 'number', placeholder: '5.43' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">{f.label}</label>
                    <input type={f.type} value={(editRecord as any)[f.key] || ''}
                      onChange={e => setEditRecord(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none"
                      placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Grade Counts (A, A-, B+… E)</label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map(g => (
                    <div key={g}>
                      <label className="text-[9px] font-black mb-1 block" style={{ color: GRADE_COLORS[g] }}>{g} ({GRADE_POINTS[g]} pts)</label>
                      <input type="number" min="0"
                        value={editRecord.grade_counts?.[g] || ''}
                        onChange={e => setEditRecord(prev => ({ ...prev, grade_counts: { ...(prev.grade_counts || {}), [g]: Number(e.target.value) } }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-indigo-400 outline-none"
                        placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
                <textarea value={editRecord.notes || ''} onChange={e => setEditRecord(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none resize-none h-16"
                  placeholder="Any special notes for this year..." />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button onClick={saveRecord} disabled={saving}
                className="flex-1 py-3 font-black text-white rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><FiSave size={14} />Save Record</>}
              </button>
              <button onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
