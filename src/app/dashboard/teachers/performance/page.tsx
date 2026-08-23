'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FiTrendingUp, FiTrendingDown, FiMinus, FiRefreshCw, FiDownload,
  FiSearch, FiUser, FiBook, FiAward, FiClock, FiAlertTriangle,
  FiCheckCircle, FiBarChart2, FiStar, FiZap, FiShield,
  FiTarget, FiActivity, FiUsers, FiGrid,
} from 'react-icons/fi';

// ─── Threshold constants (Kenya CBC/National benchmarks) ──────────────────────
const NATIONAL_MEAN = 62; // approximate national mean %
const SCHOOL_RISK_THRESHOLD = 45; // below this → at-risk class
const EXCELLENT_THRESHOLD = 75;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeacherMetrics {
  teacher: any;
  classMean: number | null;
  subjectBreakdown: Array<{ subject: string; mean: number; count: number }>;
  termTrend: Array<{ term: string; mean: number }>;
  appraisalRating: number | null;
  cpdHours: number;
  leaveDays: number;
  onLeaveNow: boolean;
  compositeScore: number;
  riskFlag: boolean;
  studentCount: number;
  passRate: number | null;
  appraisalStatus: string | null;
}

// ─── Inline mini bar chart ─────────────────────────────────────────────────────
function MiniBar({ value, max = 100, color = '#6366f1', height = 6, label }: { value: number; max?: number; color?: string; height?: number; label?: string }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="w-full">
      {label && <div className="flex justify-between mb-0.5"><span className="text-[10px] text-gray-500">{label}</span><span className="text-[10px] font-bold text-gray-700">{value.toFixed(1)}{max === 100 ? '%' : ''}</span></div>}
      <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#f3f4f6' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Trend sparkline (inline SVG) ─────────────────────────────────────────────
function Sparkline({ data, color = '#6366f1', width = 80, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return <span className="text-[10px] text-gray-300">No trend</span>;
  const min = Math.min(...data); const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  const last = data[data.length - 1]; const prev = data[data.length - 2];
  const TrendIcon = last > prev ? FiTrendingUp : last < prev ? FiTrendingDown : FiMinus;
  const trendColor = last > prev ? '#10b981' : last < prev ? '#ef4444' : '#6b7280';
  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * (width - 4) + 2;
          const y = height - 2 - ((v - min) / range) * (height - 4);
          return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 3 : 2} fill={i === data.length - 1 ? color : 'white'} stroke={color} strokeWidth="1.5" />;
        })}
      </svg>
      <TrendIcon size={12} style={{ color: trendColor }} />
    </div>
  );
}

// ─── Composite Score Ring ─────────────────────────────────────────────────────
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 10) / 2; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#6366f1' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 40 ? 'Average' : 'At Risk';
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="relative z-10 text-center">
        <p className="text-lg font-black leading-none" style={{ color }}>{score}</p>
        <p className="text-[8px] font-bold text-gray-400 uppercase">{label}</p>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ value, label, sub, icon: Icon, gradient, badge }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-6 -left-2 w-28 h-28 rounded-full opacity-5 bg-white" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-black">{value}</p>
          {sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}
          {badge && <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{badge}</span>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Icon size={18} /></div>
      </div>
    </div>
  );
}

// ─── Subject Competency Wheel (CSS-based) ────────────────────────────────────
function DimensionBar({ label, value, max = 5, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <p className="text-[10px] text-gray-500 w-28 flex-shrink-0 text-right truncate">{label}</p>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-[10px] font-bold text-gray-600 w-8 text-right">{value > 0 ? value.toFixed(1) : '—'}</p>
    </div>
  );
}

// ─── Teacher Card (sidebar) ───────────────────────────────────────────────────
function TeacherCard({ m, selected, onClick }: { m: TeacherMetrics; selected: boolean; onClick: () => void }) {
  const { teacher, compositeScore, riskFlag, classMean, cpdHours } = m;
  const scoreColor = compositeScore >= 75 ? '#10b981' : compositeScore >= 55 ? '#6366f1' : compositeScore >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div onClick={onClick} className={`p-3 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${selected ? 'border-indigo-500 bg-indigo-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black shadow-sm" style={{ background: `linear-gradient(135deg,${scoreColor},${scoreColor}99)` }}>
          {teacher.first_name?.[0]}{teacher.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate">{teacher.first_name} {teacher.last_name}</p>
          <p className="text-[10px] text-gray-400 truncate">{teacher.tsc_number || teacher.email || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-black" style={{ color: scoreColor }}>{compositeScore}</p>
          <p className="text-[9px] text-gray-400">score</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {riskFlag && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5"><FiAlertTriangle size={8} /> Risk</span>}
        {classMean !== null && <span className="text-[9px] text-gray-400">Cls: <span className="font-bold text-gray-600">{classMean.toFixed(1)}%</span></span>}
        {cpdHours > 0 && <span className="text-[9px] text-gray-400 ml-auto">CPD: <span className="font-bold text-emerald-600">{cpdHours}h</span></span>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherPerformancePage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [cbcAssessments, setCbcAssessments] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [cpdRecords, setCpdRecords] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [teacherSubjectMap, setTeacherSubjectMap] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterRisk, setFilterRisk] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'deep' | 'league' | 'board'>('overview');
  const [sortBy, setSortBy] = useState<'score' | 'mean' | 'cpd' | 'appraisal'>('score');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const [tRes, subRes, mRes, cbcRes, aprRes, cpdRes, lvRes, tsRes, studRes] = await Promise.all([
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('school_subjects').select('*'),
      supabase.from('jss_marks').select('*'),
      supabase.from('cbc_assessments').select('*'),
      supabase.from('teacher_appraisals').select('*'),
      supabase.from('teacher_cpd').select('*'),
      supabase.from('teacher_leaves').select('*').eq('status', 'Approved'),
      supabase.from('teacher_subject_streams').select('*').limit(500),
      supabase.from('school_students').select('id,first_name,last_name,form_id,stream_id').eq('status', 'Active'),
    ]);
    setTeachers(tRes.data || []);
    setSubjects(subRes.data || []);
    setMarks(mRes.data || []);
    if (!cbcRes.error) setCbcAssessments(cbcRes.data || []);
    if (!aprRes.error) setAppraisals(aprRes.data || []);
    if (!cpdRes.error) setCpdRecords(cpdRes.data || []);
    if (!lvRes.error) setLeaves(lvRes.data || []);
    if (!tsRes.error) setTeacherSubjectMap(tsRes.data || []);
    setStudents(studRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Build Teacher Metrics ───────────────────────────────────────────────────
  const allMetrics = useMemo<TeacherMetrics[]>(() => {
    const now = new Date();
    return teachers.map(teacher => {
      // Get subject IDs this teacher teaches
      const teacherSubjects = teacherSubjectMap.filter(ts => ts.teacher_id === teacher.id);
      const tSubjectIds = teacherSubjects.map(ts => ts.subject_id);
      const tStreamIds = teacherSubjects.map(ts => ts.stream_id).filter(Boolean);

      // JSS marks for this teacher's subjects
      const relevantMarks = marks.filter(m => tSubjectIds.includes(m.subject_id));
      const markScores = relevantMarks.map(m => Number(m.marks_obtained || m.raw_score || 0)).filter(v => v > 0);
      const classMean = markScores.length > 0 ? markScores.reduce((a, b) => a + b, 0) / markScores.length : null;

      // CBC assessments → map to percentage (rubric 1-4 scale → 25/50/75/100%)
      const rubricMap: Record<string, number> = { 'Exceeds Expectation': 90, 'Meets Expectation': 70, 'Approaches Expectation': 50, 'Below Expectation': 25 };
      const relevantCBC = cbcAssessments.filter(a => tSubjectIds.includes(a.subject_id));
      const cbcScores = relevantCBC.map(a => a.raw_score ? Number(a.raw_score) : (rubricMap[a.rubric_level] || 50)).filter(v => v > 0);
      const allScores = [...markScores, ...cbcScores];
      const combinedMean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : classMean;

      // Pass rate (≥50%)
      const passRate = allScores.length > 0 ? (allScores.filter(s => s >= 50).length / allScores.length) * 100 : null;

      // Subject breakdown
      const subjectBreakdown = subjects.filter(s => tSubjectIds.includes(s.id)).map(sub => {
        const subMarks = marks.filter(m => m.subject_id === sub.id).map(m => Number(m.marks_obtained || 0)).filter(v => v > 0);
        const subCBC = cbcAssessments.filter(a => a.subject_id === sub.id).map(a => a.raw_score ? Number(a.raw_score) : (rubricMap[a.rubric_level] || 50)).filter(v => v > 0);
        const all = [...subMarks, ...subCBC];
        return { subject: sub.subject_name, mean: all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : 0, count: all.length };
      }).filter(s => s.count > 0);

      // Term trend (JSS marks only — has term_id)
      const termGroups: Record<string, number[]> = {};
      relevantMarks.forEach(m => {
        const t = String(m.term_id || 'Unknown');
        if (!termGroups[t]) termGroups[t] = [];
        const v = Number(m.marks_obtained || 0);
        if (v > 0) termGroups[t].push(v);
      });
      const termTrend = Object.entries(termGroups).slice(-4).map(([term, vals]) => ({
        term, mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      }));

      // Appraisal
      const teacherAppraisals = appraisals.filter(a => a.teacher_id === teacher.id);
      const latestAppraisal = teacherAppraisals.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
      const appraisalRating = latestAppraisal?.overall_rating || null;
      const appraisalStatus = latestAppraisal?.status || null;

      // CPD
      const cpdHours = cpdRecords.filter(c => c.teacher_id === teacher.id).reduce((s, c) => s + (c.hours || 0), 0);

      // Leave
      const teacherLeaves = leaves.filter(l => l.teacher_id === teacher.id);
      const leaveDays = teacherLeaves.reduce((s, l) => s + (l.days_requested || 0), 0);
      const onLeaveNow = teacherLeaves.some(l => {
        const s = new Date(l.start_date); const e = new Date(l.end_date);
        return now >= s && now <= e;
      });

      // Student count
      const studentCount = new Set(relevantMarks.map(m => m.student_id)).size + new Set(relevantCBC.map(a => a.student_id)).size;

      // Composite score (weighted)
      let score = 0; let weight = 0;
      if (combinedMean !== null) { score += (combinedMean / 100) * 40; weight += 40; } // 40% class performance
      if (appraisalRating !== null) { score += (appraisalRating / 5) * 30; weight += 30; } // 30% appraisal
      if (cpdHours > 0) { score += Math.min(cpdHours / 40, 1) * 20; weight += 20; } // 20% CPD target
      if (passRate !== null) { score += (passRate / 100) * 10; weight += 10; } // 10% pass rate
      const compositeScore = weight > 0 ? Math.round((score / weight) * 100) : 0;

      const riskFlag = (combinedMean !== null && combinedMean < SCHOOL_RISK_THRESHOLD) ||
        (appraisalRating !== null && appraisalRating < 2.5) ||
        (cpdHours < 10 && teacherAppraisals.length > 0);

      return { teacher, classMean: combinedMean, subjectBreakdown, termTrend, appraisalRating, cpdHours, leaveDays, onLeaveNow, compositeScore, riskFlag, studentCount, passRate, appraisalStatus };
    });
  }, [teachers, subjects, marks, cbcAssessments, appraisals, cpdRecords, leaves, teacherSubjectMap]);

  // ─── Sort + Filter ────────────────────────────────────────────────────────────
  const sortedMetrics = useMemo(() => {
    let list = allMetrics.filter(m => {
      const q = searchQ.toLowerCase();
      const name = `${m.teacher.first_name} ${m.teacher.last_name}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (filterRisk && !m.riskFlag) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.compositeScore - a.compositeScore;
        case 'mean': return (b.classMean || 0) - (a.classMean || 0);
        case 'cpd': return b.cpdHours - a.cpdHours;
        case 'appraisal': return (b.appraisalRating || 0) - (a.appraisalRating || 0);
        default: return 0;
      }
    });
    return list;
  }, [allMetrics, searchQ, filterRisk, sortBy]);

  const selectedMetrics = allMetrics.find(m => m.teacher.id === selected) || null;

  // ─── School-level stats ───────────────────────────────────────────────────────
  const schoolMean = useMemo(() => {
    const vals = allMetrics.map(m => m.classMean).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [allMetrics]);

  const atRiskCount = allMetrics.filter(m => m.riskFlag).length;
  const excellentCount = allMetrics.filter(m => m.compositeScore >= EXCELLENT_THRESHOLD).length;
  const avgComposite = allMetrics.length > 0 ? Math.round(allMetrics.reduce((s, m) => s + m.compositeScore, 0) / allMetrics.length) : 0;
  const totalCPD = cpdRecords.reduce((s, c) => s + (c.hours || 0), 0);

  // ─── Subject League ───────────────────────────────────────────────────────────
  const subjectLeague = useMemo(() => {
    return subjects.map(sub => {
      const subMarks = marks.filter(m => m.subject_id === sub.id).map(m => Number(m.marks_obtained || 0)).filter(v => v > 0);
      const subCBC = cbcAssessments.filter(a => a.subject_id === sub.id).map(a => a.raw_score ? Number(a.raw_score) : 50).filter(v => v > 0);
      const all = [...subMarks, ...subCBC];
      if (all.length === 0) return null;
      const mean = all.reduce((a, b) => a + b, 0) / all.length;
      const passRate = (all.filter(s => s >= 50).length / all.length) * 100;
      const teacher = (() => {
        const ts = teacherSubjectMap.find(ts => ts.subject_id === sub.id);
        return ts ? teachers.find(t => t.id === ts.teacher_id) : null;
      })();
      return { subject: sub.subject_name, mean, passRate, count: all.length, teacher };
    }).filter(Boolean).sort((a: any, b: any) => b.mean - a.mean);
  }, [subjects, marks, cbcAssessments, teacherSubjectMap, teachers]);

  // ─── Export ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Teacher', 'TSC No.', 'Composite Score', 'Class Mean %', 'Pass Rate %', 'Appraisal Rating', 'CPD Hours', 'Leave Days', 'Risk Flag'],
      ...allMetrics.map(m => [
        `${m.teacher.first_name} ${m.teacher.last_name}`,
        m.teacher.tsc_number || '—',
        m.compositeScore,
        m.classMean?.toFixed(1) || '—',
        m.passRate?.toFixed(1) || '—',
        m.appraisalRating?.toFixed(1) || '—',
        m.cpdHours,
        m.leaveDays,
        m.riskFlag ? 'YES' : 'No',
      ]),
    ];
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `teacher-analytics-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
          <FiBarChart2 size={28} className="text-white" />
        </div>
        <div className="w-8 h-8 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Compiling teacher performance analytics…</p>
        <p className="text-gray-300 text-xs mt-1">Cross-referencing marks, appraisals, CPD, and leave records</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
            <FiBarChart2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Teacher Performance Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Multi-source Analytics · Class Results · Appraisals · CPD · Leave · Composite Scores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><FiRefreshCw size={15} /></button>
          <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FiDownload size={14} /> Export</button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard value={teachers.length}   label="Teachers"        sub="Active staff"                              icon={FiUsers}       gradient="linear-gradient(135deg,#0891b2,#0e7490)" />
        <KPICard value={avgComposite}      label="Avg Score"        sub="School composite"                          icon={FiTarget}      gradient="linear-gradient(135deg,#6366f1,#4f46e5)" />
        <KPICard value={schoolMean ? `${schoolMean.toFixed(1)}%` : '—'} label="School Mean" sub={`National: ${NATIONAL_MEAN}%`} icon={FiBarChart2} gradient={`linear-gradient(135deg,${schoolMean && schoolMean >= NATIONAL_MEAN ? '#10b981,#059669' : '#f59e0b,#d97706'})`} />
        <KPICard value={excellentCount}   label="Excellent"        sub={`Score ≥ ${EXCELLENT_THRESHOLD}`}           icon={FiStar}        gradient="linear-gradient(135deg,#10b981,#059669)" />
        <KPICard value={atRiskCount}      label="At Risk"          sub="Needs intervention"                         icon={FiAlertTriangle} gradient={`linear-gradient(135deg,${atRiskCount > 0 ? '#ef4444,#dc2626' : '#6b7280,#4b5563'})`} />
        <KPICard value={`${totalCPD}h`}   label="Total CPD"        sub="Collective hours"                          icon={FiActivity}    gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
      </div>

      {/* ── SCHOOL BENCHMARK BANNER ── */}
      {schoolMean !== null && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <FiTarget size={16} className="text-indigo-500" />
            <p className="text-sm font-bold text-gray-800">School vs National Mean Benchmark</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <MiniBar value={schoolMean} color={schoolMean >= NATIONAL_MEAN ? '#10b981' : '#f59e0b'} height={10} label={`School Mean: ${schoolMean.toFixed(1)}%`} />
            </div>
            <div>
              <MiniBar value={NATIONAL_MEAN} color="#6366f1" height={10} label={`National Mean: ${NATIONAL_MEAN}%`} />
            </div>
            <div className="flex items-center gap-2">
              {schoolMean >= NATIONAL_MEAN
                ? <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100"><FiTrendingUp size={16} className="text-green-600" /><div><p className="text-xs font-bold text-green-800">+{(schoolMean - NATIONAL_MEAN).toFixed(1)}% above national</p><p className="text-[10px] text-green-600">School performing above average</p></div></div>
                : <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100"><FiTrendingDown size={16} className="text-amber-600" /><div><p className="text-xs font-bold text-amber-800">{(NATIONAL_MEAN - schoolMean).toFixed(1)}% below national</p><p className="text-[10px] text-amber-600">Action plan recommended</p></div></div>}
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit flex-wrap">
        {([
          ['overview', 'Overview', FiGrid],
          ['deep', 'Teacher Deep Dive', FiUser],
          ['league', 'Subject League', FiBook],
          ['board', 'Leaderboard', FiAward],
        ] as const).map(([t, l, Icon]) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} /> {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Teacher list panel */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search teacher…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50" />
                </div>
                <button onClick={() => setFilterRisk(!filterRisk)} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${filterRisk ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  ⚠ Risk
                </button>
              </div>
              <div className="flex gap-1 mb-3">
                {(['score', 'mean', 'cpd', 'appraisal'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${sortBy === s ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {s === 'score' ? 'Score' : s === 'mean' ? 'Mean' : s === 'cpd' ? 'CPD' : 'Rate'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mb-2">{sortedMetrics.length} of {teachers.length} teachers</p>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {sortedMetrics.map(m => (
                  <TeacherCard key={m.teacher.id} m={m} selected={selected === m.teacher.id} onClick={() => { setSelected(m.teacher.id); setActiveTab('deep'); }} />
                ))}
                {sortedMetrics.length === 0 && <div className="text-center py-8"><FiUser size={24} className="text-gray-200 mx-auto mb-2" /><p className="text-xs text-gray-400">No teachers match filter</p></div>}
              </div>
            </div>
          </div>

          {/* Right: School analytics */}
          <div className="lg:col-span-2 space-y-4">
            {/* At-risk panel */}
            {atRiskCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2"><FiAlertTriangle size={15} /> {atRiskCount} Teacher{atRiskCount > 1 ? 's' : ''} Flagged At-Risk</p>
                <div className="flex flex-wrap gap-2">
                  {allMetrics.filter(m => m.riskFlag).map(m => (
                    <button key={m.teacher.id} onClick={() => { setSelected(m.teacher.id); setActiveTab('deep'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-[9px] font-black text-red-700">{m.teacher.first_name?.[0]}{m.teacher.last_name?.[0]}</div>
                      {m.teacher.first_name} {m.teacher.last_name}
                      <span className="text-[10px] text-red-400">{m.classMean !== null ? `${m.classMean.toFixed(0)}%` : `★${m.appraisalRating?.toFixed(1)}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Score distribution */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 size={15} className="text-cyan-500" /> Composite Score Distribution</h3>
              <div className="space-y-3">
                {[
                  { label: 'Excellent (75–100)', range: [75, 100], color: '#10b981', gradient: 'linear-gradient(90deg,#10b981,#34d399)' },
                  { label: 'Good (55–74)',        range: [55, 75],  color: '#6366f1', gradient: 'linear-gradient(90deg,#6366f1,#818cf8)' },
                  { label: 'Average (40–54)',     range: [40, 55],  color: '#f59e0b', gradient: 'linear-gradient(90deg,#f59e0b,#fbbf24)' },
                  { label: 'At Risk (0–39)',      range: [0, 40],   color: '#ef4444', gradient: 'linear-gradient(90deg,#ef4444,#f87171)' },
                ].map(({ label, range, color, gradient }) => {
                  const cnt = allMetrics.filter(m => m.compositeScore >= range[0] && m.compositeScore < range[1]).length;
                  const pct = teachers.length > 0 ? (cnt / teachers.length) * 100 : 0;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <p className="text-[11px] text-gray-500 w-36 flex-shrink-0">{label}</p>
                      <div className="flex-1 h-6 bg-gray-100 rounded-xl overflow-hidden relative">
                        <div className="h-full rounded-xl flex items-center transition-all" style={{ width: `${Math.max(pct, 3)}%`, background: gradient }}>
                          {pct > 15 && <span className="text-[10px] font-black text-white ml-2">{cnt}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-black w-8 text-right" style={{ color }}>{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 teachers mini table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiZap size={14} className="text-yellow-500" /> Top 5 Teachers by Composite Score</h3></div>
              <div className="divide-y divide-gray-100">
                {[...allMetrics].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 5).map((m, i) => {
                  const medals = ['🥇', '🥈', '🥉', '4', '5'];
                  const scoreColor = m.compositeScore >= 75 ? '#10b981' : m.compositeScore >= 55 ? '#6366f1' : '#f59e0b';
                  return (
                    <div key={m.teacher.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => { setSelected(m.teacher.id); setActiveTab('deep'); }}>
                      <span className="text-lg w-8 text-center flex-shrink-0">{medals[i]}</span>
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ background: `linear-gradient(135deg,${scoreColor},${scoreColor}aa)` }}>{m.teacher.first_name?.[0]}{m.teacher.last_name?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{m.teacher.first_name} {m.teacher.last_name}</p>
                        <p className="text-[10px] text-gray-400">{m.studentCount} students · {m.cpdHours}h CPD</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {m.classMean !== null && <div className="text-center"><p className="text-xs font-black" style={{ color: scoreColor }}>{m.classMean.toFixed(1)}%</p><p className="text-[9px] text-gray-400">class mean</p></div>}
                        {m.appraisalRating && <div className="text-center"><p className="text-xs font-black text-purple-600">★ {m.appraisalRating.toFixed(1)}</p><p className="text-[9px] text-gray-400">appraisal</p></div>}
                        <ScoreRing score={m.compositeScore} size={52} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEACHER DEEP DIVE TAB ── */}
      {activeTab === 'deep' && (
        <div className="space-y-4">
          {/* Teacher selector */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Teacher</label>
            <div className="flex gap-2">
              <select value={selected || ''} onChange={e => setSelected(Number(e.target.value) || null)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50">
                <option value="">Choose a teacher to analyse…</option>
                {[...allMetrics].sort((a, b) => b.compositeScore - a.compositeScore).map(m => (
                  <option key={m.teacher.id} value={m.teacher.id}>{m.teacher.first_name} {m.teacher.last_name} (Score: {m.compositeScore}){m.riskFlag ? ' ⚠' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {!selectedMetrics ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiUser size={28} className="text-gray-300" /></div>
              <p className="text-gray-400 font-semibold">Select a teacher above to view their full analytics</p>
            </div>
          ) : (() => {
            const { teacher, classMean, subjectBreakdown, termTrend, appraisalRating, cpdHours, leaveDays, onLeaveNow, compositeScore, riskFlag, studentCount, passRate, appraisalStatus } = selectedMetrics;
            const scoreColor = compositeScore >= 75 ? '#10b981' : compositeScore >= 55 ? '#6366f1' : compositeScore >= 40 ? '#f59e0b' : '#ef4444';
            const appraisalData = typeof (appraisals.find(a => a.teacher_id === teacher.id)?.competencies || '') === 'string'
              ? (() => { try { return JSON.parse(appraisals.find(a => a.teacher_id === teacher.id)?.competencies || '{}'); } catch { return {}; } })()
              : (appraisals.find(a => a.teacher_id === teacher.id)?.competencies || {});
            const COMP_LABELS: Record<string, string> = { subject_mastery: 'Subject Mastery', lesson_planning: 'Lesson Planning', delivery: 'Teaching Delivery', assessment: 'Assessment', classroom_mgmt: 'Classroom Mgmt', professionalism: 'Professionalism', collaboration: 'Collaboration', cbc_integration: 'CBC Integration', parent_engagement: 'Parent Engagement', cpd: 'CPD Engagement' };
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: profile + ring + mini KPIs */}
                <div className="space-y-4">
                  {/* Profile card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg mb-3" style={{ background: `linear-gradient(135deg,${scoreColor},${scoreColor}aa)` }}>
                        {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                      </div>
                      <p className="text-lg font-extrabold text-gray-900">{teacher.first_name} {teacher.last_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{teacher.tsc_number || '—'} · {teacher.email || '—'}</p>
                      {onLeaveNow && <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">Currently on Leave</span>}
                      {riskFlag && <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><FiAlertTriangle size={11} /> At-Risk Flagged</span>}
                      <div className="mt-4"><ScoreRing score={compositeScore} size={88} /></div>
                      <p className="text-xs text-gray-500 mt-2">Composite Performance Score</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                      {[
                        { label: 'Students', value: studentCount || '—', icon: FiUsers, color: '#6366f1' },
                        { label: 'Leave Days', value: leaveDays, icon: FiClock, color: '#f59e0b' },
                        { label: 'CPD Hours', value: `${cpdHours}h`, icon: FiActivity, color: '#059669' },
                        { label: 'Appraisal', value: appraisalRating ? `★ ${appraisalRating.toFixed(1)}` : '—', icon: FiStar, color: '#7c3aed' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="p-2.5 rounded-xl bg-gray-50 text-center">
                          <Icon size={14} className="mx-auto mb-0.5" style={{ color }} />
                          <p className="text-sm font-black text-gray-800">{value}</p>
                          <p className="text-[9px] text-gray-400">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Term Trend */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiTrendingUp size={12} className="text-cyan-500" /> Term Performance Trend</p>
                    {termTrend.length < 2
                      ? <p className="text-xs text-gray-400 italic text-center py-4">Not enough term data yet</p>
                      : <div className="space-y-3">
                          <Sparkline data={termTrend.map(t => t.mean)} color={scoreColor} width={200} height={48} />
                          <div className="grid grid-cols-4 gap-1 pt-1">
                            {termTrend.map((t, i) => (
                              <div key={i} className="text-center">
                                <p className="text-[10px] font-black" style={{ color: scoreColor }}>{t.mean.toFixed(0)}%</p>
                                <p className="text-[9px] text-gray-400 truncate">T{i + 1}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                    }
                  </div>
                </div>

                {/* Center: Subject + Appraisal */}
                <div className="space-y-4">
                  {/* Class performance */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiBarChart2 size={12} className="text-cyan-500" /> Class Performance vs Benchmarks</p>
                    <div className="space-y-3">
                      <MiniBar value={classMean || 0} color={classMean && classMean >= NATIONAL_MEAN ? '#10b981' : '#f59e0b'} height={12} label={`Class Mean: ${classMean?.toFixed(1) || '—'}%`} />
                      <MiniBar value={schoolMean || 0} color="#6366f1" height={12} label={`School Mean: ${schoolMean?.toFixed(1) || '—'}%`} />
                      <MiniBar value={NATIONAL_MEAN} color="#94a3b8" height={12} label={`National Mean: ${NATIONAL_MEAN}%`} />
                      {passRate !== null && <MiniBar value={passRate} color="#059669" height={12} label={`Pass Rate (≥50%): ${passRate.toFixed(1)}%`} />}
                    </div>
                    {classMean !== null && schoolMean !== null && (
                      <div className={`mt-3 p-2.5 rounded-xl text-center text-xs font-bold ${classMean >= schoolMean ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {classMean >= schoolMean ? `↑ ${(classMean - schoolMean).toFixed(1)}% above school mean` : `↓ ${(schoolMean - classMean).toFixed(1)}% below school mean`}
                      </div>
                    )}
                  </div>

                  {/* Subject Breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiBook size={12} className="text-cyan-500" /> Subject Performance Breakdown ({subjectBreakdown.length})</p>
                    {subjectBreakdown.length === 0
                      ? <p className="text-xs text-gray-400 italic text-center py-4">No mark data for assigned subjects</p>
                      : <div className="space-y-2.5">
                          {subjectBreakdown.sort((a, b) => b.mean - a.mean).map(sub => {
                            const col = sub.mean >= 75 ? '#10b981' : sub.mean >= 50 ? '#6366f1' : sub.mean >= 40 ? '#f59e0b' : '#ef4444';
                            return (
                              <div key={sub.subject}>
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-[11px] text-gray-600 font-semibold truncate">{sub.subject}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] text-gray-400">{sub.count} records</span>
                                    <span className="text-[11px] font-black" style={{ color: col }}>{sub.mean.toFixed(1)}%</span>
                                  </div>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${sub.mean}%`, background: col }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                </div>

                {/* Right: Appraisal + CPD */}
                <div className="space-y-4">
                  {/* Appraisal competency map */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><FiAward size={12} className="text-purple-500" /> Appraisal Competencies</p>
                      {appraisalStatus && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{appraisalStatus}</span>}
                    </div>
                    {Object.keys(appraisalData).length === 0
                      ? <div className="text-center py-6">
                          <FiAward size={24} className="text-gray-200 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">No appraisal data yet</p>
                          <p className="text-[10px] text-gray-300">Complete a TSC P1/P2 appraisal form</p>
                        </div>
                      : <div className="space-y-2">
                          {Object.entries(appraisalData as Record<string, number>).map(([key, val]) => {
                            const col = val >= 4 ? '#10b981' : val >= 3 ? '#6366f1' : val >= 2 ? '#f59e0b' : '#ef4444';
                            return <DimensionBar key={key} label={COMP_LABELS[key] || key} value={val} max={5} color={col} />;
                          })}
                          {appraisalRating && (
                            <div className="mt-3 p-2.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                              <p className="text-xs font-bold text-purple-700">Overall Rating</p>
                              <div className="flex">
                                {[1,2,3,4,5].map(n => <FiStar key={n} size={14} className={n <= Math.round(appraisalRating) ? 'text-purple-600 fill-purple-600' : 'text-gray-200'} style={{ fill: n <= Math.round(appraisalRating) ? '#7c3aed' : 'transparent' }} />)}
                                <span className="text-xs font-black text-purple-700 ml-1">{appraisalRating.toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                    }
                  </div>

                  {/* CPD summary */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiActivity size={12} className="text-emerald-500" /> CPD Summary</p>
                    <div className="text-center mb-3">
                      <p className="text-3xl font-black" style={{ color: cpdHours >= 40 ? '#10b981' : '#f59e0b' }}>{cpdHours}h</p>
                      <p className="text-xs text-gray-400">of {40}h annual TSC target</p>
                    </div>
                    <MiniBar value={cpdHours} max={40} color={cpdHours >= 40 ? '#10b981' : '#f59e0b'} height={10} />
                    <p className="text-[10px] text-center mt-1 font-bold" style={{ color: cpdHours >= 40 ? '#10b981' : '#f59e0b' }}>
                      {cpdHours >= 40 ? '✓ Annual target achieved' : `${40 - cpdHours}h to reach TSC annual target`}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {(() => {
                        const tCPD = cpdRecords.filter(c => c.teacher_id === teacher.id);
                        const cats: Record<string, number> = {};
                        tCPD.forEach(c => { cats[c.category] = (cats[c.category] || 0) + c.hours; });
                        return Object.entries(cats).slice(0, 4).map(([cat, h]) => (
                          <div key={cat} className="flex justify-between items-center py-1">
                            <p className="text-[10px] text-gray-500">{cat}</p>
                            <span className="text-[10px] font-bold text-gray-700">{h}h</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Leave summary */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FiClock size={12} className="text-amber-500" /> Leave Record</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-amber-600">{leaveDays}</p>
                        <p className="text-xs text-gray-400">approved days</p>
                      </div>
                      {onLeaveNow && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">On Leave Now</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SUBJECT LEAGUE TAB ── */}
      {activeTab === 'league' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiBook size={15} className="text-cyan-500" /> Subject Performance League Table</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {['Rank', 'Subject', 'Mean %', 'Pass Rate', 'Records', 'Teacher', 'Trend'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(subjectLeague as any[]).map((sub: any, idx: number) => {
                  const col = sub.mean >= 75 ? '#10b981' : sub.mean >= 50 ? '#6366f1' : sub.mean >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={sub.subject} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'} hover:bg-cyan-50/20 transition-colors`}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white" style={{ background: idx < 3 ? ['#f59e0b', '#94a3b8', '#cd7f32'][idx] : '#e5e7eb', color: idx < 3 ? 'white' : '#6b7280' }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{sub.subject}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sub.mean}%`, background: col }} />
                          </div>
                          <span className="text-sm font-black" style={{ color: col }}>{sub.mean.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${sub.passRate >= 70 ? 'text-green-600' : sub.passRate >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{sub.passRate.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{sub.count}</td>
                      <td className="px-4 py-3">
                        {sub.teacher
                          ? <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center text-[9px] font-black text-cyan-700">{sub.teacher.first_name?.[0]}{sub.teacher.last_name?.[0]}</div><span className="text-xs text-gray-600">{sub.teacher.first_name} {sub.teacher.last_name}</span></div>
                          : <span className="text-xs text-gray-300">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-3 h-3 rounded-full" style={{ background: col }} title={sub.mean >= NATIONAL_MEAN ? 'Above National' : 'Below National'} />
                      </td>
                    </tr>
                  );
                })}
                {subjectLeague.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center"><FiBook size={24} className="text-gray-200 mx-auto mb-2" /><p className="text-xs text-gray-400">No subject performance data available</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          {/* Top cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...allMetrics].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3).map((m, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const gradients = ['linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#94a3b8,#64748b)', 'linear-gradient(135deg,#cd7f32,#b5652d)'];
              const scoreColor = m.compositeScore >= 75 ? '#10b981' : '#6366f1';
              return (
                <div key={m.teacher.id} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xl" style={{ background: gradients[i] }}>
                  <div className="absolute top-2 right-3 text-4xl opacity-30">{medals[i]}</div>
                  <div className="text-3xl mb-2">{medals[i]}</div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black border-2 border-white/50 bg-white/20">
                      {m.teacher.first_name?.[0]}{m.teacher.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white">{m.teacher.first_name} {m.teacher.last_name}</p>
                      <p className="text-xs opacity-70">{m.teacher.tsc_number || m.teacher.email || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-2">
                    <div><p className="text-xl font-black">{m.compositeScore}</p><p className="text-[10px] opacity-70">Score</p></div>
                    <div><p className="text-xl font-black">{m.classMean?.toFixed(0) || '—'}<span className="text-sm">%</span></p><p className="text-[10px] opacity-70">Mean</p></div>
                    <div><p className="text-xl font-black">{m.cpdHours}<span className="text-sm">h</span></p><p className="text-[10px] opacity-70">CPD</p></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full ranked table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiAward size={15} className="text-yellow-500" /> Full Teacher Leaderboard</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['#', 'Teacher', 'Composite', 'Class Mean', 'Pass Rate', 'Appraisal', 'CPD Hrs', 'Leave', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allMetrics].sort((a, b) => b.compositeScore - a.compositeScore).map((m, idx) => {
                    const col = m.compositeScore >= 75 ? '#10b981' : m.compositeScore >= 55 ? '#6366f1' : m.compositeScore >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={m.teacher.id} className={`border-b border-gray-100 cursor-pointer hover:bg-cyan-50/20 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`} onClick={() => { setSelected(m.teacher.id); setActiveTab('deep'); }}>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black" style={{ background: idx < 3 ? col : '#f3f4f6', color: idx < 3 ? 'white' : '#6b7280' }}>{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ background: `linear-gradient(135deg,${col},${col}aa)` }}>{m.teacher.first_name?.[0]}{m.teacher.last_name?.[0]}</div>
                            <div><p className="text-xs font-bold text-gray-800">{m.teacher.first_name} {m.teacher.last_name}</p><p className="text-[10px] text-gray-400">{m.teacher.tsc_number || '—'}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${m.compositeScore}%`, background: col }} />
                            </div>
                            <span className="text-sm font-black" style={{ color: col }}>{m.compositeScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: m.classMean && m.classMean >= NATIONAL_MEAN ? '#10b981' : m.classMean ? '#f59e0b' : '#9ca3af' }}>{m.classMean?.toFixed(1) || '—'}%</td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-600">{m.passRate?.toFixed(1) || '—'}%</td>
                        <td className="px-4 py-3">
                          {m.appraisalRating
                            ? <span className="text-xs font-bold text-purple-600">★ {m.appraisalRating.toFixed(1)}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${m.cpdHours >= 40 ? 'text-green-600' : 'text-amber-600'}`}>{m.cpdHours}h</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.leaveDays}d</td>
                        <td className="px-4 py-3">
                          {m.riskFlag
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"><FiAlertTriangle size={9} /> Risk</span>
                            : m.compositeScore >= 75
                              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200"><FiCheckCircle size={9} /> Excellent</span>
                              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"><FiShield size={9} /> Good</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500"><span className="font-bold text-green-600">{excellentCount} excellent</span> · <span className="font-bold text-red-600">{atRiskCount} at-risk</span> · <span className="font-bold text-gray-600">{teachers.length} total</span></p>
              <p className="text-xs text-gray-400">Teacher Performance Analytics · Multi-source</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

