'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiFilter, FiBarChart2, FiGrid, FiTrendingUp } from 'react-icons/fi';

// ── 8-4-4 Grading (uses score column) ──────────────────────────────────────────
const GRADES_844 = [
  { label: 'A',  min: 75, max: 100, color: '#14532d', bg: '#dcfce7', text: '#fff', points: 12 },
  { label: 'A-', min: 70, max: 74,  color: '#166534', bg: '#bbf7d0', text: '#fff', points: 11 },
  { label: 'B+', min: 65, max: 69,  color: '#15803d', bg: '#86efac', text: '#fff', points: 10 },
  { label: 'B',  min: 60, max: 64,  color: '#16a34a', bg: '#4ade80', text: '#fff', points: 9  },
  { label: 'B-', min: 55, max: 59,  color: '#65a30d', bg: '#bef264', text: '#fff', points: 8  },
  { label: 'C+', min: 50, max: 54,  color: '#ca8a04', bg: '#fef08a', text: '#fff', points: 7  },
  { label: 'C',  min: 45, max: 49,  color: '#d97706', bg: '#fde68a', text: '#fff', points: 6  },
  { label: 'C-', min: 40, max: 44,  color: '#ea580c', bg: '#fed7aa', text: '#fff', points: 5  },
  { label: 'D+', min: 35, max: 39,  color: '#dc2626', bg: '#fca5a5', text: '#fff', points: 4  },
  { label: 'D',  min: 30, max: 34,  color: '#b91c1c', bg: '#f87171', text: '#fff', points: 3  },
  { label: 'D-', min: 25, max: 29,  color: '#991b1b', bg: '#ef4444', text: '#fff', points: 2  },
  { label: 'E',  min: 0,  max: 24,  color: '#7f1d1d', bg: '#dc2626', text: '#fff', points: 1  },
];

// ── CBC Performance Levels ────────────────────────────────────────────────────
const LEVELS_CBC = [
  { label: 'EE', name: 'Exceeds Expectation',  min: 80, max: 100, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  { label: 'ME', name: 'Meets Expectation',    min: 60, max: 79,  color: '#2563eb', bg: '#DBEAFE', border: '#93C5FD' },
  { label: 'AE', name: 'Approaching Expectation', min: 40, max: 59, color: '#d97706', bg: '#FEF3C7', border: '#FCD34D' },
  { label: 'BE', name: 'Below Expectation',    min: 0,  max: 39,  color: '#dc2626', bg: '#FEE2E2', border: '#FCA5A5' },
];

function getGrade844(score: number) {
  for (const g of GRADES_844) { if (score >= g.min) return g; }
  return GRADES_844[GRADES_844.length - 1];
}
function getLevelCBC(score: number) {
  for (const l of LEVELS_CBC) { if (score >= l.min) return l; }
  return LEVELS_CBC[LEVELS_CBC.length - 1];
}

const EXAM_TYPES = ['End-Term', 'Mid-Term', 'CAT 1', 'CAT 2', 'Opening', 'Mock', 'KCSE Trial', 'KCPE Trial'];

type Mode = '844' | 'cbc';
type TabId = 'heatmap' | 'bar' | 'subject' | 'trend';

export default function GradeHeatmapPage() {
  const [subjects, setSubjects]   = useState<any[]>([]);
  const [terms, setTerms]         = useState<any[]>([]);
  const [forms, setForms]         = useState<any[]>([]);
  const [marks, setMarks]         = useState<any[]>([]);
  const [selTerm, setSelTerm]     = useState('');
  const [selForm, setSelForm]     = useState('');
  const [selExamType, setSelExamType] = useState('End-Term');
  const [loading, setLoading]     = useState(true);
  const [fetching, setFetching]   = useState(false);
  const [mode, setMode]           = useState<Mode>('844');
  const [tab, setTab]             = useState<TabId>('heatmap');

  // ── LOAD METADATA ─────────────────────────────────────────────────────────────
  const loadMeta = useCallback(async () => {
    setLoading(true);
    const [sR, tR, fR] = await Promise.all([
      supabase.from('school_subjects').select('id,subject_name,subject_code').order('subject_name'),
      supabase.from('school_terms').select('id,term_name,academic_year').order('id', { ascending: false }),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
    ]);
    setSubjects(sR.data || []);
    setForms(fR.data || []);
    const termData = tR.data || [];
    setTerms(termData);
    // Auto-select most recent term
    if (termData.length > 0) setSelTerm(String(termData[0].id));
    setLoading(false);
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // ── LOAD MARKS whenever filters change ───────────────────────────────────────
  const loadMarks = useCallback(async () => {
    if (!selTerm) return;
    setFetching(true);
    let q = supabase
      .from('school_exam_marks')
      .select('student_id, subject_id, score, grade, points, form_id')
      .eq('term_id', Number(selTerm))
      .eq('exam_type', selExamType)
      .limit(10000);
    if (selForm) q = q.eq('form_id', Number(selForm));
    const { data, error } = await q;
    if (error) { toast.error('Failed to load marks: ' + error.message); }
    setMarks(data || []);
    setFetching(false);
  }, [selTerm, selExamType, selForm]);

  useEffect(() => { loadMarks(); }, [loadMarks]);

  // ── COMPUTE HEATMAP ───────────────────────────────────────────────────────────
  const GRADES = mode === '844' ? GRADES_844 : LEVELS_CBC.map(l => ({ label: l.label, color: l.color, bg: l.bg, border: l.border, min: l.min, name: l.name }));
  const gradeLabels = mode === '844' ? GRADES_844.map(g => g.label) : LEVELS_CBC.map(l => l.label);

  // subject_id → grade_label → count
  const heatmap = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    subjects.forEach(s => { map[s.id] = {}; gradeLabels.forEach(g => { map[s.id][g] = 0; }); });
    marks.forEach(m => {
      const score = Number(m.score || 0);
      const label = mode === '844' ? getGrade844(score).label : getLevelCBC(score).label;
      if (map[m.subject_id]) { map[m.subject_id][label] = (map[m.subject_id][label] || 0) + 1; }
    });
    return map;
  }, [marks, subjects, mode, gradeLabels]);

  // Overall grade totals
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    marks.forEach(m => {
      const score = Number(m.score || 0);
      const label = mode === '844' ? getGrade844(score).label : getLevelCBC(score).label;
      t[label] = (t[label] || 0) + 1;
    });
    return t;
  }, [marks, mode]);

  // Active subjects (with marks)
  const activeSubjects = useMemo(() =>
    subjects.filter(s => marks.some(m => m.subject_id === s.id)),
    [subjects, marks]
  );

  // Per subject stats (average score, pass rate)
  const subjectStats = useMemo(() => activeSubjects.map(s => {
    const sMarks = marks.filter(m => m.subject_id === s.id);
    const avg = sMarks.length > 0 ? sMarks.reduce((a, m) => a + Number(m.score || 0), 0) / sMarks.length : 0;
    const passing = mode === '844'
      ? sMarks.filter(m => Number(m.score || 0) >= 50).length
      : sMarks.filter(m => getLevelCBC(Number(m.score || 0)).label !== 'BE').length;
    const grade = mode === '844' ? getGrade844(avg) : null;
    const level = mode === 'cbc' ? getLevelCBC(avg) : null;
    return { ...s, avg: Math.round(avg * 10) / 10, count: sMarks.length, passing, passRate: sMarks.length > 0 ? Math.round(passing / sMarks.length * 100) : 0, grade, level };
  }).sort((a, b) => b.avg - a.avg), [activeSubjects, marks, mode]);

  // Trend: top & bottom
  const topSubject = subjectStats[0];
  const bottomSubject = subjectStats[subjectStats.length - 1];

  // ── EXPORT CSV ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Subject', ...gradeLabels, 'Total', 'Avg Score', 'Pass Rate'];
    const rows = activeSubjects.map(s => {
      const stat = subjectStats.find(ss => ss.id === s.id);
      const total = gradeLabels.reduce((a, g) => a + (heatmap[s.id]?.[g] || 0), 0);
      return [s.subject_name, ...gradeLabels.map(g => String(heatmap[s.id]?.[g] || 0)), String(total), String(stat?.avg || 0), `${stat?.passRate || 0}%`];
    });
    const overall = ['TOTAL', ...gradeLabels.map(g => String(totals[g] || 0)), String(marks.length), '', ''];
    const csv = '\uFEFF' + [headers, ...rows, overall].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `grade_heatmap_${selExamType.replace(/\s/g, '_')}.csv`; a.click();
    toast.success('✅ Exported!');
  };

  // ── GET CELL INTENSITY ────────────────────────────────────────────────────────
  function cellIntensity(count: number, totalForSubject: number) {
    if (totalForSubject === 0) return 0;
    return count / totalForSubject;
  }

  const currentTerm = terms.find(t => String(t.id) === selTerm);

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)', minHeight: 160 }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">🌡️</div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Grade Distribution Heatmap</p>
              <h1 className="text-2xl font-black text-white">Subject × Grade Matrix</h1>
              <p className="text-white/50 text-sm mt-0.5">
                {currentTerm ? `${currentTerm.term_name} · ${currentTerm.academic_year}` : 'All Terms'} ·
                {mode === '844' ? ' 8-4-4 Kenya (A–E)' : ' CBC Performance Levels (EE/ME/AE/BE)'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* Curriculum Mode Toggle */}
            <div className="flex gap-1 bg-white/10 p-1 rounded-xl border border-white/20">
              <button onClick={() => setMode('844')}
                className={`px-5 py-2 rounded-lg text-sm font-black transition ${mode === '844' ? 'bg-white text-indigo-900 shadow' : 'text-white/70 hover:text-white'}`}>
                📚 8-4-4
              </button>
              <button onClick={() => setMode('cbc')}
                className={`px-5 py-2 rounded-lg text-sm font-black transition ${mode === 'cbc' ? 'bg-white text-indigo-900 shadow' : 'text-white/70 hover:text-white'}`}>
                🌿 CBC
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={loadMarks} disabled={fetching} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition disabled:opacity-60">
                <FiRefreshCw size={13} className={fetching ? 'animate-spin' : ''}/> Refresh
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-indigo-900 font-black text-sm hover:bg-amber-300 transition">
                <FiDownload size={13}/> CSV
              </button>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pb-5">
          {[
            { icon: '📊', label: 'Total Marks', val: marks.length.toLocaleString() },
            { icon: '📚', label: 'Active Subjects', val: activeSubjects.length },
            { icon: '🏆', label: topSubject ? `Best: ${topSubject.subject_name?.slice(0,10)}` : 'Best Subject', val: topSubject ? `${topSubject.avg}%` : '—' },
            { icon: '📉', label: bottomSubject && bottomSubject !== topSubject ? `Weakest: ${bottomSubject.subject_name?.slice(0,10)}` : 'Weakest', val: bottomSubject && bottomSubject !== topSubject ? `${bottomSubject.avg}%` : '—' },
            { icon: mode === '844' ? '✅' : '🌿', label: mode === '844' ? 'Pass Rate (≥50%)' : 'ME+ Rate', val: marks.length > 0 ? `${Math.round((mode === '844' ? marks.filter(m => Number(m.score||0) >= 50).length : marks.filter(m => getLevelCBC(Number(m.score||0)).label !== 'BE').length) / marks.length * 100)}%` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="font-black text-white text-sm leading-tight">{s.val}</div>
              <div className="text-[9px] text-indigo-300 font-bold uppercase tracking-wide mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-1.5 block">TERM</label>
            <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50">
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-1.5 block">EXAM TYPE</label>
            <select value={selExamType} onChange={e => setSelExamType(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50">
              {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-1.5 block">FORM / CLASS</label>
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50">
              <option value="">All Forms</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          <div className="text-xs text-gray-400 ml-auto self-center">
            {fetching ? <span className="flex items-center gap-1"><span className="w-3 h-3 border border-indigo-300 border-t-indigo-600 rounded-full animate-spin"/>Loading…</span>
            : <span className="font-bold text-gray-600">{marks.length.toLocaleString()} marks · {activeSubjects.length} subjects</span>}
          </div>
        </div>
      </div>

      {/* ── GRADE LEGEND ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-[10px] font-black text-gray-500 uppercase mb-2.5">
          {mode === '844' ? '📊 8-4-4 Grade Legend' : '🌿 CBC Performance Level Legend'}
        </p>
        <div className="flex flex-wrap gap-2">
          {mode === '844' ? GRADES_844.map(g => (
            <div key={g.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-black" style={{ background: g.color }}>
              {g.label} ({g.min}%+) · {g.points}pts
            </div>
          )) : LEVELS_CBC.map(l => (
            <div key={l.label} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-black" style={{ background: l.bg, color: l.color, borderColor: l.border }}>
              <span className="text-base">{l.label === 'EE' ? '⭐' : l.label === 'ME' ? '✅' : l.label === 'AE' ? '⚠️' : '🔴'}</span>
              <span>{l.label} — {l.name} ({l.min}%+)</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── VIEW TABS ── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'heatmap', label: '🌡️ Heatmap Grid', icon: FiGrid },
          { id: 'bar',     label: '📊 Grade Distribution', icon: FiBarChart2 },
          { id: 'subject', label: '📚 Subject Rankings', icon: FiTrendingUp },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as TabId)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition ${tab === t.id ? 'bg-indigo-700 text-white border-indigo-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-12 h-12 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>
      ) : marks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="font-black text-gray-700 text-xl">No marks found</p>
          <p className="text-gray-400 text-sm mt-2">Select a different Term or Exam Type above</p>
          <p className="text-gray-300 text-xs mt-1">Marks are entered via Exams → Enter Marks</p>
        </div>
      ) : tab === 'heatmap' ? (
        /* ── HEATMAP GRID ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60">
            <h3 className="font-black text-gray-800">🌡️ Subject × Grade Heatmap — {mode === '844' ? '8-4-4' : 'CBC'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Darker = more students in that grade band · Hover for exact count</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-[160px]">Subject</th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-gray-500">Total</th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-gray-500">Avg%</th>
                {mode === '844'
                  ? GRADES_844.map(g => <th key={g.label} className="px-3 py-3 text-center text-[10px] font-black" style={{ color: g.color }}>{g.label}</th>)
                  : LEVELS_CBC.map(l => <th key={l.label} className="px-3 py-3 text-center text-[10px] font-black" style={{ color: l.color }}>{l.label}</th>)
                }
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {activeSubjects.map(s => {
                  const total = gradeLabels.reduce((a, g) => a + (heatmap[s.id]?.[g] || 0), 0);
                  const stat = subjectStats.find(ss => ss.id === s.id);
                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/10 transition group">
                      <td className="px-4 py-3 font-black text-gray-800 text-xs sticky left-0 bg-white group-hover:bg-indigo-50/10 whitespace-nowrap">
                        {s.subject_name}
                        <span className="ml-1 text-[9px] text-gray-400 font-normal">{s.subject_code || ''}</span>
                      </td>
                      <td className="px-3 py-3 text-center font-black text-gray-700">{total}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={
                          mode === '844'
                            ? { background: stat?.grade?.bg || '#f3f4f6', color: stat?.grade?.color || '#374151' }
                            : { background: stat?.level?.bg || '#f3f4f6', color: stat?.level?.color || '#374151', borderColor: stat?.level?.border }
                        }>{stat?.avg}%</span>
                      </td>
                      {gradeLabels.map(g => {
                        const count = heatmap[s.id]?.[g] || 0;
                        const intensity = cellIntensity(count, total);
                        const gradeConf = mode === '844' ? GRADES_844.find(gg => gg.label === g) : LEVELS_CBC.find(l => l.label === g);
                        const bg = intensity === 0 ? '#f9fafb' : gradeConf?.color || '#6366f1';
                        const alpha = Math.max(0.08, intensity * 0.9);
                        return (
                          <td key={g} className="px-3 py-3 text-center relative group/cell" title={`${s.subject_name}: ${count} student${count !== 1 ? 's' : ''} with ${g}`}>
                            <div className="rounded-lg py-1 px-2 text-center transition-transform hover:scale-110 cursor-default"
                              style={{ background: count === 0 ? '#f9fafb' : `${bg}${Math.round(alpha * 255).toString(16).padStart(2,'0')}`, color: count === 0 ? '#d1d5db' : intensity > 0.5 ? 'white' : bg, fontWeight: count > 0 ? 900 : 400, fontSize: 12 }}>
                              {count === 0 ? '—' : count}
                            </div>
                            {count > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover/cell:opacity-100 transition whitespace-nowrap z-20">
                                {count} students ({Math.round(intensity * 100)}%)
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                  <td className="px-4 py-3 font-black text-indigo-800 text-xs sticky left-0 bg-indigo-50">TOTAL ({activeSubjects.length} subjects)</td>
                  <td className="px-3 py-3 text-center font-black text-indigo-700">{marks.length}</td>
                  <td className="px-3 py-3 text-center font-black text-indigo-700">
                    {marks.length > 0 ? Math.round(marks.reduce((a, m) => a + Number(m.score || 0), 0) / marks.length * 10) / 10 : 0}%
                  </td>
                  {gradeLabels.map(g => (
                    <td key={g} className="px-3 py-3 text-center font-black text-indigo-700">{totals[g] || 0}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      ) : tab === 'bar' ? (
        /* ── BAR CHART TAB ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Overall distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 mb-5">📊 Overall Grade Distribution — {mode === '844' ? '8-4-4' : 'CBC'}</h3>
            {mode === '844' ? (
              <div>
                <div className="flex items-end gap-1 h-48 mb-3">
                  {GRADES_844.map(g => {
                    const count = totals[g.label] || 0;
                    const maxCount = Math.max(...GRADES_844.map(gg => totals[gg.label] || 0), 1);
                    return (
                      <div key={g.label} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                          {count} students ({marks.length > 0 ? Math.round(count/marks.length*100) : 0}%)
                        </div>
                        {count > 0 && <span className="text-[9px] font-black text-gray-600">{count}</span>}
                        <div className="w-full rounded-t-lg hover:opacity-80 transition cursor-default"
                          style={{ height: `${Math.max(count/maxCount*100, 2)}%`, background: g.color, minHeight: 4 }}/>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1">{GRADES_844.map(g => <span key={g.label} className="flex-1 text-center text-[9px] font-bold" style={{ color: g.color }}>{g.label}</span>)}</div>
              </div>
            ) : (
              <div className="space-y-4">
                {LEVELS_CBC.map(l => {
                  const count = totals[l.label] || 0;
                  const pct = marks.length > 0 ? Math.round(count / marks.length * 100) : 0;
                  return (
                    <div key={l.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{l.label === 'EE' ? '⭐' : l.label === 'ME' ? '✅' : l.label === 'AE' ? '⚠️' : '🔴'}</span>
                          <span className="font-black text-sm" style={{ color: l.color }}>{l.label}</span>
                          <span className="text-xs text-gray-500">{l.name}</span>
                        </div>
                        <span className="font-black text-sm" style={{ color: l.color }}>{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-5 rounded-full flex items-center px-2" style={{ width: `${Math.max(pct, 0.5)}%`, background: l.color, minWidth: count > 0 ? 20 : 0 }}>
                          {pct >= 5 && <span className="text-white text-[9px] font-black">{pct}%</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pass / Fail donut equivalent */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 mb-5">
              {mode === '844' ? '✅ Pass vs Fail Analysis' : '🌿 CBC Performance Summary'}
            </h3>
            {mode === '844' ? (
              <div className="space-y-4">
                {[
                  { label: 'A & A-', grades: ['A','A-'], desc: 'Distinction', color: '#14532d', emoji: '🏆' },
                  { label: 'B Range', grades: ['B+','B','B-'], desc: 'Credit', color: '#15803d', emoji: '🥇' },
                  { label: 'C Range', grades: ['C+','C','C-'], desc: 'Pass', color: '#ca8a04', emoji: '✅' },
                  { label: 'D Range', grades: ['D+','D','D-'], desc: 'Below Average', color: '#dc2626', emoji: '⚠️' },
                  { label: 'E', grades: ['E'], desc: 'Fail', color: '#7f1d1d', emoji: '🔴' },
                ].map(band => {
                  const count = band.grades.reduce((a, g) => a + (totals[g] || 0), 0);
                  const pct = marks.length > 0 ? Math.round(count / marks.length * 100) : 0;
                  return (
                    <div key={band.label} className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0">{band.emoji}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-gray-700">{band.label} <span className="text-gray-400 font-normal">({band.desc})</span></span>
                          <span className="font-black text-sm" style={{ color: band.color }}>{count} students ({pct}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-3 rounded-full" style={{ width: `${pct}%`, background: band.color }}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                    <p className="text-[10px] text-gray-500 font-bold">PASS (≥50%)</p>
                    <p className="font-black text-2xl text-green-700">{marks.filter(m => Number(m.score||0) >= 50).length}</p>
                    <p className="text-[10px] text-green-600">{marks.length > 0 ? Math.round(marks.filter(m => Number(m.score||0) >= 50).length / marks.length * 100) : 0}%</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                    <p className="text-[10px] text-gray-500 font-bold">FAIL (&lt;50%)</p>
                    <p className="font-black text-2xl text-red-700">{marks.filter(m => Number(m.score||0) < 50).length}</p>
                    <p className="text-[10px] text-red-600">{marks.length > 0 ? Math.round(marks.filter(m => Number(m.score||0) < 50).length / marks.length * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {LEVELS_CBC.map(l => {
                  const count = totals[l.label] || 0;
                  const pct = marks.length > 0 ? Math.round(count / marks.length * 100) : 0;
                  return (
                    <div key={l.label} className="p-4 rounded-xl border-2" style={{ background: l.bg, borderColor: l.border }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm" style={{ color: l.color }}>{l.label} — {l.name}</p>
                          <p className="text-xs text-gray-500">Score range: {l.min}% – {l.max}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black" style={{ color: l.color }}>{count}</p>
                          <p className="text-xs font-bold" style={{ color: l.color }}>{pct}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                  <p className="text-xs font-black text-indigo-600">ME+ RATE (Meeting or Exceeding Expectations)</p>
                  <p className="text-3xl font-black text-indigo-700 mt-1">
                    {marks.length > 0 ? Math.round(((totals['EE'] || 0) + (totals['ME'] || 0)) / marks.length * 100) : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ── SUBJECT RANKINGS TAB ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60">
            <h3 className="font-black text-gray-800">📚 Subject Performance Rankings</h3>
            <p className="text-xs text-gray-400 mt-0.5">Sorted by average score · {activeSubjects.length} active subjects</p>
          </div>
          {subjectStats.length === 0 ? (
            <div className="py-16 text-center"><p className="text-gray-400">No data for current filters</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  {['Rank','Subject','Avg Score','Grade/Level','Students','Pass Rate','Distribution'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectStats.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-indigo-50/20 transition ${i === 0 ? 'bg-green-50/30' : i === subjectStats.length - 1 ? 'bg-red-50/20' : ''}`}>
                      <td className="px-4 py-3 text-center font-black text-lg">{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}</td>
                      <td className="px-4 py-3">
                        <p className="font-black text-gray-800">{s.subject_name}</p>
                        <p className="text-[10px] text-gray-400">{s.subject_code || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full w-24">
                            <div className="h-2 rounded-full" style={{ width: `${s.avg}%`, background: mode === '844' ? (s.grade?.color || '#6366f1') : (s.level?.color || '#6366f1') }}/>
                          </div>
                          <span className="font-black text-sm text-gray-700">{s.avg}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mode === '844' ? (
                          <span className="text-sm font-black px-2.5 py-1 rounded-lg text-white" style={{ background: s.grade?.color || '#6366f1' }}>{s.grade?.label || '—'}</span>
                        ) : (
                          <span className="text-sm font-black px-2.5 py-1 rounded-lg border-2" style={{ background: s.level?.bg, color: s.level?.color, borderColor: s.level?.border }}>{s.level?.label || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700 text-center">{s.count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full">
                            <div className="h-2 rounded-full" style={{ width: `${s.passRate}%`, background: s.passRate >= 70 ? '#16a34a' : s.passRate >= 50 ? '#d97706' : '#dc2626' }}/>
                          </div>
                          <span className={`text-xs font-black ${s.passRate >= 70 ? 'text-green-700' : s.passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.passRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-end gap-0.5 h-8 w-32">
                          {gradeLabels.map(g => {
                            const count = heatmap[s.id]?.[g] || 0;
                            const gradeConf = mode === '844' ? GRADES_844.find(gg => gg.label === g) : LEVELS_CBC.find(l => l.label === g);
                            return (
                              <div key={g} className="flex-1 rounded-t-sm" title={`${g}: ${count}`}
                                style={{ height: `${s.count > 0 ? Math.max(count/s.count*100, count > 0 ? 5 : 0) : 0}%`, background: gradeConf?.color || '#e5e7eb', minHeight: count > 0 ? 3 : 0 }}/>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
