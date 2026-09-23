'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Link from 'next/link';
import {
  FiChevronRight, FiTrendingUp, FiTrendingDown, FiAward,
  FiBook, FiBarChart2, FiUsers, FiRefreshCw, FiAlertCircle,
  FiCheckCircle, FiTarget, FiStar, FiActivity,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);

const GRADE_COLORS: Record<string, string> = {
  'A': '#10b981', 'A-': '#34d399', 'B+': '#3b82f6', 'B': '#60a5fa',
  'B-': '#93c5fd', 'C+': '#f59e0b', 'C': '#fbbf24', 'C-': '#fcd34d',
  'D+': '#f97316', 'D': '#ef4444', 'D-': '#f87171', 'E': '#dc2626', 'N/A': '#9ca3af',
};
const gradeToGPA: Record<string, number> = {
  'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8, 'C+': 7, 'C': 6,
  'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1,
};

// ─── Section header ───
function SH({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-xs font-black text-gray-800 tracking-tight">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
          {linkLabel || 'View All'} <FiChevronRight size={11} />
        </Link>
      )}
    </div>
  );
}

// ─── KPI Card ───
function KpiCard({ icon, label, value, sub, color, bg, trend, trendVal }: {
  icon: string; label: string; value: string; sub: string;
  color: string; bg: string; trend?: 'up' | 'down' | 'neutral'; trendVal?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: bg }}>{icon}</div>
        {trend && trendVal && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : trend === 'down' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
            {trend === 'up' ? <FiTrendingUp size={9} /> : trend === 'down' ? <FiTrendingDown size={9} /> : <FiActivity size={9} />}
            {trendVal}
          </span>
        )}
      </div>
      <p className="text-2xl font-black leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[9px] text-gray-400">{sub}</p>
    </div>
  );
}

export default function AcademicsPanel() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [cbcSba, setCbcSba] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<'overview' | 'subjects' | 'cbc' | 'teachers'>('overview');
  const currentYear = new Date().getFullYear();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: sub }, { data: ex }, { data: mk }, { data: fm },
        { data: st }, { data: tc }, { data: ts }, { data: sba }, { data: att },
      ] = await Promise.all([
        supabase.from('school_subjects').select('id,subject_name,subject_code,is_compulsory,education_system'),
        supabase.from('school_exam_types').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('school_exam_marks').select('score,marks,grade,subject_id,student_id,form_id,created_at').limit(3000),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_students').select('id,form_id,gender,status,first_name,last_name').eq('status', 'Active'),
        supabase.from('school_teachers').select('id,full_name,staff_type,status').eq('status', 'Active'),
        supabase.from('school_subject_teachers').select('teacher_id,subject_id,learning_area_id').limit(200),
        supabase.from('school_sba_marks').select('student_id,subject_id,score,strand,term').limit(500),
        supabase.from('school_daily_attendance').select('status,student_id').eq('attendance_date', new Date().toISOString().split('T')[0]),
      ]);
      setSubjects(sub || []);
      setExams(ex || []);
      setMarks(mk || []);
      setForms(fm || []);
      setStudents(st || []);
      setTeachers(tc || []);
      setTeacherSubjects(ts || []);
      setCbcSba(sba || []);
      setAttendance(att || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
        <FiBook size={22} className="text-indigo-600 animate-pulse" />
      </div>
      <p className="text-xs text-gray-400 font-bold">Loading academic intelligence…</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  );

  // ── Computed values ──
  const activeStudents = students.filter(s => s.status === 'Active');
  const allScores = marks.map(m => Number(m.score || m.marks || 0)).filter(s => s > 0);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;
  const passMark = 50;
  const passing = allScores.filter(s => s >= passMark).length;
  const passRate = pct(passing, allScores.length);
  const compulsory = subjects.filter(s => s.is_compulsory).length;
  const cbcSubjects = subjects.filter(s => (s.education_system || '').toLowerCase().includes('cbc')).length;
  const activeExams = exams.filter(e => e.is_active).length;

  // Grade distribution
  const grades: Record<string, number> = {};
  marks.forEach(m => { const g = m.grade || 'N/A'; grades[g] = (grades[g] || 0) + 1; });
  const gradeEntries = Object.entries(grades).sort((a, b) => (gradeToGPA[b[0]] || 0) - (gradeToGPA[a[0]] || 0));
  const gradeChart = {
    labels: gradeEntries.map(([g]) => g),
    datasets: [{ data: gradeEntries.map(([, v]) => v), backgroundColor: gradeEntries.map(([g]) => GRADE_COLORS[g] || '#9ca3af'), borderWidth: 0, hoverOffset: 6 }],
  };

  // Form performance
  const formPerf = forms.map(f => {
    const fm = marks.filter(m => m.form_id === f.id);
    const scores = fm.map(m => Number(m.score || m.marks || 0)).filter(s => s > 0);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const sts = activeStudents.filter(s => s.form_id === f.id);
    return { id: f.id, form: f.form_name, avg, count: scores.length, students: sts.length, male: sts.filter(s => s.gender === 'Male').length, female: sts.filter(s => s.gender === 'Female').length };
  }).filter(f => f.students > 0);

  const formPerfChart = {
    labels: formPerf.map(f => f.form),
    datasets: [
      { label: 'Avg Score', data: formPerf.map(f => f.avg), backgroundColor: formPerf.map((_, i) => ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0891b2', '#16a34a'][i % 8]), borderRadius: 8, borderSkipped: false as const },
    ],
  };

  // Student distribution stacked bar
  const formDistChart = {
    labels: formPerf.map(f => f.form),
    datasets: [
      { label: 'Male', data: formPerf.map(f => f.male), backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 6, borderSkipped: false as const },
      { label: 'Female', data: formPerf.map(f => f.female), backgroundColor: 'rgba(236,72,153,0.65)', borderRadius: 6, borderSkipped: false as const },
    ],
  };

  // Subject performance
  const subjectPerf = subjects.map(s => {
    const sm = marks.filter(m => m.subject_id === s.id);
    const scores = sm.map(m => Number(m.score || m.marks || 0)).filter(sc => sc > 0);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { name: s.subject_name, code: s.subject_code, avg, count: scores.length, compulsory: s.is_compulsory };
  }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

  // Top students
  const studentScoreMap: Record<number, number[]> = {};
  marks.forEach(m => {
    const s = Number(m.score || m.marks || 0);
    if (s > 0) { if (!studentScoreMap[m.student_id]) studentScoreMap[m.student_id] = []; studentScoreMap[m.student_id].push(s); }
  });
  const topStudents = Object.entries(studentScoreMap)
    .map(([id, arr]) => ({ id: Number(id), avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), total: arr.length }))
    .sort((a, b) => b.avg - a.avg).slice(0, 10)
    .map(({ id, avg, total }) => {
      const st = students.find(s => s.id === id);
      const form = forms.find(f => f.id === st?.form_id);
      return { name: st ? `${st.first_name} ${st.last_name}` : `Student #${id}`, form: form?.form_name || '—', avg, total };
    });

  // Grade bands
  const aCount = marks.filter(m => ['A', 'A-'].includes(m.grade || '')).length;
  const bCount = marks.filter(m => ['B+', 'B', 'B-'].includes(m.grade || '')).length;
  const cCount = marks.filter(m => ['C+', 'C', 'C-'].includes(m.grade || '')).length;
  const dCount = marks.filter(m => ['D+', 'D', 'D-', 'E'].includes(m.grade || '')).length;
  const totalGraded = aCount + bCount + cCount + dCount;

  // Monthly trend (last 6 months by created_at)
  const monthlyTrend: { month: string; avg: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const y = d.getFullYear(); const mo = d.getMonth();
    const lbl = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    const ms = marks.filter(m => { if (!m.created_at) return false; const md = new Date(m.created_at); return md.getFullYear() === y && md.getMonth() === mo; });
    const sc = ms.map(m => Number(m.score || m.marks || 0)).filter(s => s > 0);
    monthlyTrend.push({ month: lbl, avg: sc.length > 0 ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0 });
  }
  const trendChart = {
    labels: monthlyTrend.map(m => m.month),
    datasets: [{ label: 'Avg Score', data: monthlyTrend.map(m => m.avg), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 4, borderWidth: 2.5 }],
  };

  // Attendance today
  const attPresent = attendance.filter(a => a.status === 'Present').length;
  const attTotal = attendance.length;
  const attRate = pct(attPresent, attTotal);

  // Teacher coverage
  const subjectsWithTeacher = subjects.filter(s => teacherSubjects.some(ts => ts.subject_id === s.id)).length;
  const subjectCoverage = pct(subjectsWithTeacher, subjects.length);

  const cbOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const stackedOpts = { ...cbOpts, scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 } } }, y: { stacked: true, grid: { color: '#f8fafc' }, beginAtZero: true, ticks: { font: { size: 9 } } } } };
  const barOpts = { ...cbOpts, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: '#f8fafc' }, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%`, font: { size: 9 } } } } };
  const lineOpts = { ...cbOpts, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: '#f8fafc' }, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%`, font: { size: 9 } } } } };
  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } };

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6,#06b6d4,#10b981,#f59e0b,#ec4899)' }} />
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">🏫</div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Academic Intelligence Centre</h2>
              <p className="text-[10px] text-gray-400">Marks · Grades · Subjects · CBC · Teacher Coverage · Trends</p>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full uppercase">{currentYear}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sub-nav */}
            {(['overview', 'subjects', 'cbc', 'teachers'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all capitalize ${activeView === v ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                {v === 'overview' ? '📊 Overview' : v === 'subjects' ? '📚 Subjects' : v === 'cbc' ? '🌿 CBC' : '👩‍🏫 Teachers'}
              </button>
            ))}
            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl bg-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 transition">
              <FiRefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          OVERVIEW VIEW
      ══════════════════════════════════════ */}
      {activeView === 'overview' && (
        <div className="space-y-4">

          {/* ── TOP KPI CARDS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon="📚" label="Total Subjects" value={fmtN(subjects.length)} sub={`${compulsory} compulsory · ${subjects.length - compulsory} elective`} color="#4f46e5" bg="#eef2ff" trend="neutral" trendVal={`${cbcSubjects} CBC`} />
            <KpiCard icon="📝" label="Exams / Types" value={fmtN(exams.length)} sub={`${activeExams} active · ${exams.length - activeExams} closed`} color="#7c3aed" bg="#f5f3ff" trend={activeExams > 0 ? 'up' : 'neutral'} trendVal={`${activeExams} live`} />
            <KpiCard icon="📊" label="Avg Score" value={`${avgScore}%`} sub={`Pass rate ${passRate}% · ${fmtN(allScores.length)} entries`} color={avgScore >= 50 ? '#059669' : '#dc2626'} bg={avgScore >= 50 ? '#ecfdf5' : '#fef2f2'} trend={avgScore >= 50 ? 'up' : 'down'} trendVal={`${passRate}% pass`} />
            <KpiCard icon="✍️" label="Marks Entered" value={fmtN(marks.length)} sub={`Across ${subjects.length} subjects`} color="#d97706" bg="#fef3c7" trend="up" trendVal={`${fmtN(marks.length)} records`} />
          </div>

          {/* ── SECONDARY STATS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Highest Score', value: `${maxScore}%`, icon: '🏆', color: '#f59e0b', bg: '#fef3c7', sub: 'Best exam score' },
              { label: 'Lowest Score', value: `${minScore}%`, icon: '📉', color: '#ef4444', bg: '#fee2e2', sub: 'Needs intervention' },
              { label: 'Teacher Coverage', value: `${subjectCoverage}%`, icon: '👩‍🏫', color: '#0891b2', bg: '#e0f2fe', sub: `${subjectsWithTeacher}/${subjects.length} subjects` },
              { label: "Today's Attendance", value: `${attRate}%`, icon: '✅', color: attRate >= 80 ? '#059669' : '#d97706', bg: attRate >= 80 ? '#d1fae5' : '#fef3c7', sub: `${attPresent} of ${attTotal} present` },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* ── GRADE BANDS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SH title="🎯 Grade Band Distribution" sub={`${fmtN(totalGraded)} graded entries`} href="/dashboard/exams/analysis" linkLabel="Full Analysis" />
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { band: 'Grade A', count: aCount, pct: pct(aCount, totalGraded), color: '#10b981', bg: '#ecfdf5', icon: '🥇' },
                { band: 'Grade B', count: bCount, pct: pct(bCount, totalGraded), color: '#3b82f6', bg: '#dbeafe', icon: '🥈' },
                { band: 'Grade C', count: cCount, pct: pct(cCount, totalGraded), color: '#f59e0b', bg: '#fef3c7', icon: '🥉' },
                { band: 'D & Below', count: dCount, pct: pct(dCount, totalGraded), color: '#ef4444', bg: '#fee2e2', icon: '⚠️' },
              ].map((b, i) => (
                <div key={i} className="rounded-xl p-3 text-center" style={{ background: b.bg }}>
                  <div className="text-xl mb-1">{b.icon}</div>
                  <p className="text-xl font-black" style={{ color: b.color }}>{b.pct}%</p>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-wide">{b.band}</p>
                  <p className="text-[9px] text-gray-500">{fmtN(b.count)} students</p>
                </div>
              ))}
            </div>
            {/* Grade band progress bars */}
            <div className="space-y-2">
              {[
                { band: 'A & A-', count: aCount, color: '#10b981' },
                { band: 'B+, B, B-', count: bCount, color: '#3b82f6' },
                { band: 'C+, C, C-', count: cCount, color: '#f59e0b' },
                { band: 'D+, D, D-, E', count: dCount, color: '#ef4444' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 w-20 flex-shrink-0">{b.band}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct(b.count, totalGraded)}%`, background: b.color }} />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 w-12 text-right">{pct(b.count, totalGraded)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CHARTS ROW 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Form performance */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📊 Average Score by Form / Grade" sub="Based on all exam marks" href="/dashboard/exams/analysis" linkLabel="Analysis" />
              <div style={{ height: 210 }}>
                {formPerf.some(f => f.avg > 0)
                  ? <Bar data={formPerfChart} options={barOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiBarChart2 size={28} /><p className="text-xs text-gray-400 mt-2">No exam marks yet</p></div>}
              </div>
            </div>

            {/* Grade doughnut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="🎓 Grade Distribution" sub="All entered grades" />
              <div style={{ height: 160 }}>
                {gradeEntries.length > 0
                  ? <Doughnut data={gradeChart} options={donutOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiAward size={26} /><p className="text-xs text-gray-400 mt-2">No data</p></div>}
              </div>
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto pr-1">
                {gradeEntries.slice(0, 10).map(([g, v], i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: GRADE_COLORS[g] || '#9ca3af' }} />
                    <span className="text-gray-500 flex-1 font-semibold">{g}</span>
                    <span className="font-black text-gray-700">{v}</span>
                    <span className="text-gray-400">({pct(v, marks.length)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CHARTS ROW 2: Trend + Student Distribution ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📈 Score Trend — Last 6 Months" sub="Average mark by month" />
              <div style={{ height: 190 }}>
                <Line data={trendChart} options={lineOpts} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="👥 Student Distribution M:F by Form" sub="Active students per class" href="/dashboard/students" linkLabel="Students" />
              <div style={{ height: 190 }}>
                <Bar data={formDistChart} options={stackedOpts} />
              </div>
            </div>
          </div>

          {/* ── TOP 10 STUDENTS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="🏆 Academic Top 10 — Merit Ranking" sub="By average examination score" href="/dashboard/exams/merit-list" linkLabel="Merit List" />
            </div>
            <div className="divide-y divide-gray-50">
              {topStudents.map((s, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-400">{s.form} · {s.total} marks recorded</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.avg}%</p>
                    <div className="flex items-center gap-1 justify-end">
                      {s.avg >= 70 ? <FiTrendingUp size={10} className="text-emerald-500" /> : s.avg >= 50 ? <FiActivity size={10} className="text-amber-500" /> : <FiTrendingDown size={10} className="text-red-500" />}
                      <span className={`text-[9px] font-bold ${s.avg >= 70 ? 'text-emerald-500' : s.avg >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{s.avg >= 70 ? 'Excellent' : s.avg >= 50 ? 'Average' : 'At Risk'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {topStudents.length === 0 && (
                <div className="py-10 text-center text-gray-400">
                  <FiAward size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-xs">No exam marks entered yet</p>
                  <Link href="/dashboard/exams/marks" className="text-indigo-500 text-xs font-bold hover:underline mt-1 inline-block">Enter Marks →</Link>
                </div>
              )}
            </div>
          </div>

          {/* ── EXAM TYPES TABLE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📝 Exam Types & Weightings" sub={`${exams.length} total · ${activeExams} active`} href="/dashboard/exams/types" linkLabel="Manage" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">Exam</th>
                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">Code</th>
                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">Year</th>
                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">Weight</th>
                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">Max Score</th>
                    <th className="px-5 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exams.slice(0, 10).map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-2.5 text-xs font-bold text-gray-800">{e.exam_name}</td>
                      <td className="px-5 py-2.5 text-[10px] text-gray-400 font-mono">{e.exam_code || '—'}</td>
                      <td className="px-5 py-2.5 text-[10px] text-gray-500">{e.year || currentYear}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, e.weight || 0)}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-indigo-600">{e.weight || 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-[10px] font-semibold text-gray-600">{e.max_score || 100}</td>
                      <td className="px-5 py-2.5">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full ${e.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {e.is_active ? '● Active' : '○ Closed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── QUICK LINKS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '📋 Enter Marks', href: '/dashboard/exams/marks', color: '#6366f1', bg: '#eef2ff', desc: 'Record exam scores' },
              { label: '📊 Merit List', href: '/dashboard/exams/merit-list', color: '#059669', bg: '#ecfdf5', desc: 'Academic rankings' },
              { label: '📄 Report Cards', href: '/dashboard/exams/report-cards', color: '#0891b2', bg: '#e0f2fe', desc: 'Term reports' },
              { label: '🏫 CBC Reports', href: '/dashboard/exams/cbc-reports', color: '#7c3aed', bg: '#f5f3ff', desc: 'KICD analytics' },
              { label: '✏️ JSS Marks', href: '/dashboard/jss/marks', color: '#d97706', bg: '#fef3c7', desc: 'Grade 7-9 competency' },
              { label: '🏆 KPSEA', href: '/dashboard/exams/kpsea', color: '#ec4899', bg: '#fdf2f8', desc: 'Grade 6 assessment' },
              { label: '🎓 Senior School', href: '/dashboard/cbc/senior-school', color: '#8b5cf6', bg: '#f5f3ff', desc: 'Grade 10-12 hub' },
              { label: '🔍 Exam Integrity', href: '/dashboard/exams/exam-integrity', color: '#dc2626', bg: '#fef2f2', desc: 'Anti-cheating system' },
            ].map((a, i) => (
              <Link key={i} href={a.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group"
                style={{ borderLeftWidth: 3, borderLeftColor: a.color }}>
                <p className="text-sm font-black text-gray-700 mb-0.5">{a.label}</p>
                <p className="text-[10px] text-gray-400">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          SUBJECTS VIEW
      ══════════════════════════════════════ */}
      {activeView === 'subjects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Subjects', value: subjects.length, icon: '📚', color: '#4f46e5', bg: '#eef2ff' },
              { label: 'Compulsory', value: compulsory, icon: '⚠️', color: '#dc2626', bg: '#fee2e2' },
              { label: 'Elective', value: subjects.length - compulsory, icon: '✅', color: '#059669', bg: '#ecfdf5' },
              { label: 'CBC Subjects', value: cbcSubjects, icon: '🌿', color: '#0891b2', bg: '#e0f2fe' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Subject performance ranking */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📚 Subject Performance Ranking" sub="Average score per subject (most data first)" href="/dashboard/exams/analysis" />
            </div>
            <div className="p-5 space-y-3">
              {subjectPerf.length === 0
                ? <div className="py-8 text-center text-gray-400"><FiBook size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No marks entered yet</p></div>
                : subjectPerf.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
                    <div className="w-28 flex-shrink-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{s.name}</p>
                      <p className="text-[9px] text-gray-400">{s.count} entries{s.compulsory ? ' · Core' : ''}</p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-2.5 rounded-full transition-all" style={{ width: `${s.avg}%`, background: s.avg >= 70 ? '#22c55e' : s.avg >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <span className={`text-sm font-black w-10 text-right ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.avg}%</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.avg >= 70 ? 'bg-emerald-100 text-emerald-700' : s.avg >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {s.avg >= 70 ? 'Good' : s.avg >= 50 ? 'Fair' : 'Weak'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* All subjects table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📋 All Subjects Register" sub={`${subjects.length} subjects on record`} href="/dashboard/subjects" linkLabel="Manage" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    {['#', 'Subject', 'Code', 'System', 'Type', 'Teachers', 'Avg Score'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjects.map((s, i) => {
                    const perf = subjectPerf.find(sp => sp.name === s.subject_name);
                    const tCount = teacherSubjects.filter(ts => ts.subject_id === s.id).length;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{s.subject_name}</td>
                        <td className="px-4 py-2.5 text-[10px] font-mono text-gray-400">{s.subject_code || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.education_system?.toLowerCase().includes('cbc') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {s.education_system || '8-4-4'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.is_compulsory ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {s.is_compulsory ? 'Core' : 'Elective'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-600">{tCount > 0 ? `${tCount} assigned` : <span className="text-red-400">Unassigned</span>}</td>
                        <td className="px-4 py-2.5">
                          {perf ? <span className={`text-xs font-black ${perf.avg >= 70 ? 'text-emerald-600' : perf.avg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{perf.avg}%</span> : <span className="text-gray-300 text-[10px]">No data</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          CBC VIEW
      ══════════════════════════════════════ */}
      {activeView === 'cbc' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'CBC Subjects', value: cbcSubjects, icon: '🌿', color: '#059669', bg: '#d1fae5', sub: 'KICD aligned' },
              { label: 'SBA Records', value: cbcSba.length, icon: '📋', color: '#7c3aed', bg: '#ede9fe', sub: 'Strand assessments' },
              { label: 'CBC Learners', value: activeStudents.filter(s => { const f = forms.find(f => f.id === s.form_id); return (f?.form_name || '').toLowerCase().includes('grade'); }).length, icon: '🎓', color: '#0891b2', bg: '#e0f2fe', sub: 'Active CBC students' },
              { label: 'Pathways', value: 3, icon: '🛤️', color: '#d97706', bg: '#fef3c7', sub: 'STEM, Arts, Social' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* CBC quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: '🌿 CBC Reports', href: '/dashboard/exams/cbc-reports', desc: 'Full CBC analytics suite', color: '#059669', bg: '#ecfdf5' },
              { label: '✏️ JSS Marks', href: '/dashboard/jss/marks', desc: 'Grade 7-9 competency marks', color: '#7c3aed', bg: '#f5f3ff' },
              { label: '🏆 KPSEA', href: '/dashboard/exams/kpsea', desc: 'Grade 6 national assessment', color: '#d97706', bg: '#fef3c7' },
              { label: '🎓 Senior School', href: '/dashboard/cbc/senior-school', desc: 'Grade 10-12 hub', color: '#0891b2', bg: '#e0f2fe' },
              { label: '📊 Cohort Analysis', href: '/dashboard/exams/cbc-reports/cohort-analysis', desc: 'Learner cohort trends', color: '#6366f1', bg: '#eef2ff' },
              { label: '💼 SBA Manager', href: '/dashboard/exams/sba-manager', desc: 'Strand-based assessment', color: '#ec4899', bg: '#fdf2f8' },
            ].map((a, i) => (
              <Link key={i} href={a.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
                style={{ borderTopWidth: 3, borderTopColor: a.color }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: a.bg }}>{a.label.split(' ')[0]}</div>
                <p className="text-xs font-black text-gray-700">{a.label.split(' ').slice(1).join(' ')}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{a.desc}</p>
              </Link>
            ))}
          </div>

          {/* SBA records table */}
          {cbcSba.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <SH title="📋 Recent SBA Entries" sub={`${cbcSba.length} strand assessments`} href="/dashboard/exams/sba-manager" linkLabel="Full SBA" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50">{['Student', 'Subject', 'Strand', 'Term', 'Score'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {cbcSba.slice(0, 8).map((r: any, i: number) => {
                      const st = students.find(s => s.id === r.student_id);
                      const sub = subjects.find(s => s.id === r.subject_id);
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{st ? `${st.first_name} ${st.last_name}` : `#${r.student_id}`}</td>
                          <td className="px-4 py-2.5 text-[10px] text-gray-500">{sub?.subject_name || '—'}</td>
                          <td className="px-4 py-2.5 text-[10px] text-indigo-600 font-semibold">{r.strand || '—'}</td>
                          <td className="px-4 py-2.5 text-[10px] text-gray-500">T{r.term || '—'}</td>
                          <td className="px-4 py-2.5 text-sm font-black text-emerald-600">{r.score}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {cbcSba.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2">🌿</div>
              <p className="text-sm font-bold text-amber-800">No SBA records yet</p>
              <p className="text-xs text-amber-600 mt-1">Go to SBA Manager to start entering strand assessments</p>
              <Link href="/dashboard/exams/sba-manager" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-400 transition">
                Open SBA Manager <FiChevronRight size={12} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          TEACHERS VIEW
      ══════════════════════════════════════ */}
      {activeView === 'teachers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Teachers', value: teachers.length, icon: '👩‍🏫', color: '#4f46e5', bg: '#eef2ff', sub: 'Teaching staff' },
              { label: 'Subjects Covered', value: subjectsWithTeacher, icon: '📚', color: '#059669', bg: '#ecfdf5', sub: `of ${subjects.length} total` },
              { label: 'Unassigned Subjects', value: subjects.length - subjectsWithTeacher, icon: '⚠️', color: '#dc2626', bg: '#fee2e2', sub: 'Need assignment' },
              { label: 'Coverage Rate', value: `${subjectCoverage}%`, icon: '✅', color: subjectCoverage >= 80 ? '#059669' : '#d97706', bg: subjectCoverage >= 80 ? '#d1fae5' : '#fef3c7', sub: 'Subjects with teachers' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SH title="📊 Subject Coverage Rate" sub="Percentage of subjects assigned to at least one teacher" />
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-4 rounded-full transition-all duration-1000 relative" style={{ width: `${subjectCoverage}%`, background: subjectCoverage >= 80 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#f59e0b,#d97706)' }}>
                  <span className="absolute right-2 top-0.5 text-[9px] font-black text-white">{subjectCoverage}%</span>
                </div>
              </div>
              <span className={`text-lg font-black ${subjectCoverage >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{subjectCoverage}%</span>
            </div>
            {subjectCoverage < 80 && (
              <div className="flex items-center gap-2 mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <FiAlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-amber-700 font-semibold">{subjects.length - subjectsWithTeacher} subjects have no teacher assigned. <Link href="/dashboard/teacher-subjects" className="underline font-bold">Assign now →</Link></p>
              </div>
            )}
          </div>

          {/* Teacher-subject table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="👩‍🏫 Teacher Roster" sub={`${teachers.length} active teaching staff`} href="/dashboard/teachers/performance" linkLabel="Appraisals" />
            </div>
            <div className="divide-y divide-gray-50">
              {teachers.slice(0, 10).map((t: any, i: number) => {
                const assigned = teacherSubjects.filter(ts => ts.teacher_id === t.id);
                const subNames = assigned.map(ts => subjects.find(s => s.id === ts.subject_id)?.subject_name).filter(Boolean);
                return (
                  <div key={i} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, #6366f1, #4f46e5)` }}>
                        {t.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{t.full_name}</p>
                        <p className="text-[10px] text-gray-400">{t.staff_type || 'Teaching'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {subNames.length > 0
                        ? <div className="flex flex-wrap gap-1 justify-end">{subNames.slice(0, 3).map((n, j) => <span key={j} className="text-[9px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{n}</span>)}{subNames.length > 3 && <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{subNames.length - 3}</span>}</div>
                        : <span className="text-[9px] text-red-400 font-bold">No subjects assigned</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/dashboard/teacher-subjects" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4" style={{ borderLeftWidth: 3, borderLeftColor: '#6366f1' }}>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">📋</div>
              <div><p className="text-sm font-black text-gray-800">Assign Subjects</p><p className="text-[10px] text-gray-400">Manage teacher-subject mapping</p></div>
              <FiChevronRight className="ml-auto text-gray-400" size={16} />
            </Link>
            <Link href="/dashboard/teachers/appraisal" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4" style={{ borderLeftWidth: 3, borderLeftColor: '#10b981' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">⭐</div>
              <div><p className="text-sm font-black text-gray-800">Appraisal Module</p><p className="text-[10px] text-gray-400">Teacher performance evaluations</p></div>
              <FiChevronRight className="ml-auto text-gray-400" size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
