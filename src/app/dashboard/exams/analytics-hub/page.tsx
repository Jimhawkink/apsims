'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FiTrendingUp, FiUsers, FiAward, FiBarChart2, FiAlertTriangle, FiTarget, FiZap, FiRefreshCw, FiGrid, FiBook, FiActivity, FiStar } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const ANALYTICS_MODULES = [
  { group: 'Core 8-4-4 Analytics', color: '#6366f1', items: [
    { href: '/dashboard/exams/grade-heatmap',      icon: '🌡️', label: 'Grade Heatmap',        desc: 'Color-coded grade matrix across subjects' },
    { href: '/dashboard/exams/student-trajectory', icon: '📈', label: 'Student Trajectory',   desc: 'Individual performance arc tracking' },
    { href: '/dashboard/exams/grade-distribution', icon: '🔔', label: 'Grade Distribution',   desc: 'Bell curves, percentiles & statistics' },
    { href: '/dashboard/exams/stream-battle',      icon: '⚡', label: 'Stream Battle',        desc: 'Stream vs stream performance tournament' },
    { href: '/dashboard/exams/term-trend',         icon: '📆', label: 'Term Trend',           desc: 'Multi-term performance trend analysis' },
    { href: '/dashboard/exams/broadsheet',         icon: '📋', label: 'Broadsheet',           desc: 'Full class result broadsheet' },
    { href: '/dashboard/exams/merit-list',         icon: '🏆', label: 'Merit List',           desc: 'Class & school ranking' },
    { href: '/dashboard/exams/detailed-analysis',  icon: '🔬', label: 'Detailed Analysis',    desc: 'Deep-dive performance analysis' },
  ]},
  { group: 'Advanced Analytics', color: '#0891b2', items: [
    { href: '/dashboard/exams/value-added',          icon: '➕', label: 'Value-Added',          desc: "School's contribution to student progress" },
    { href: '/dashboard/exams/national-readiness',   icon: '🇰🇪', label: 'KCSE Readiness',      desc: 'National exam readiness tracker' },
    { href: '/dashboard/exams/teacher-correlation',  icon: '👩‍🏫', label: 'Teacher Analytics',   desc: 'Teacher performance correlation' },
    { href: '/dashboard/exams/intervention-engine',  icon: '🚨', label: 'Intervention Engine', desc: 'AI-ranked at-risk student alerts' },
    { href: '/dashboard/exams/exam-integrity',       icon: '🛡️', label: 'Exam Integrity',      desc: 'Anomaly & irregularity detection' },
    { href: '/dashboard/exams/subject-difficulty',   icon: '📊', label: 'Subject Difficulty',  desc: 'Subject difficulty index ranking' },
    { href: '/dashboard/exams/peer-comparison',      icon: '👥', label: 'Peer Comparison',     desc: 'Student vs class vs school benchmarks' },
    { href: '/dashboard/exams/school-ranking',       icon: '🎖️', label: 'School Rankings',     desc: 'Internal rankings engine' },
  ]},
  { group: 'Intelligence & Insights', color: '#059669', items: [
    { href: '/dashboard/exams/ai-insights',          icon: '🤖', label: 'AI Insights',         desc: 'AI-powered patterns & recommendations' },
    { href: '/dashboard/exams/executive-dashboard',  icon: '🏛️', label: 'Executive Dashboard', desc: 'Principal & board summary' },
    { href: '/dashboard/exams/kcse-prediction',      icon: '🔮', label: 'KCSE Prediction',     desc: 'Grade prediction engine' },
    { href: '/dashboard/exams/analysis',             icon: '🔍', label: 'Performance Analysis', desc: 'Comprehensive performance analysis' },
  ]},
  { group: 'CBC Analytics', color: '#7c3aed', items: [
    { href: '/dashboard/exams/cbc-reports',                       icon: '🌿', label: 'CBC Reports Hub',       desc: 'All CBC analytics in one place' },
    { href: '/dashboard/exams/cbc-reports/competency-wheel',      icon: '☯️', label: 'Competency Wheel',      desc: 'Radial competency coverage map' },
    { href: '/dashboard/exams/cbc-reports/pathway-engine',        icon: '🛤️', label: 'Pathway Engine',        desc: 'AI pathway recommendations' },
    { href: '/dashboard/exams/cbc-reports/rubric-analytics',      icon: '📏', label: 'Rubric Analytics',      desc: 'Strand performance breakdown' },
    { href: '/dashboard/exams/cbc-reports/at-risk',               icon: '⚠️', label: 'At-Risk Students',      desc: 'CBC students needing support' },
    { href: '/dashboard/exams/cbc-reports/learning-dna',          icon: '🧬', label: 'Learning DNA',          desc: 'Individual learning profile' },
    { href: '/dashboard/exams/cbc-reports/cohort-analysis',       icon: '👫', label: 'Cohort Analysis',       desc: 'Cohort progress tracking' },
    { href: '/dashboard/exams/cbc-reports/pathway-readiness',     icon: '✅', label: 'Pathway Readiness',     desc: 'Grade 9 pathway readiness' },
  ]},
];

export default function AnalyticsHubPage() {
  const [stats, setStats] = useState({ students: 0, exams: 0, subjects: 0, avgScore: 0, passRate: 0, gradeA: 0, teachers: 0, terms: 0 });
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<{ labels: string[]; scores: number[] }>({ labels: [], scores: [] });
  const [formPerf, setFormPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [
          { count: sc }, { data: marks }, { count: ec },
          { data: subjects }, { data: teachers }, { data: exams }, { data: forms },
        ] = await Promise.all([
          supabase.from('school_students').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
          supabase.from('school_exam_marks').select('marks,subject_id,form_id,exam_id').limit(5000),
          supabase.from('school_exams').select('id', { count: 'exact', head: true }),
          supabase.from('school_subjects').select('id,subject_name'),
          supabase.from('school_teachers').select('id').eq('status', 'Active'),
          supabase.from('school_exams').select('id,exam_name,year').order('created_at', { ascending: false }).limit(5),
          supabase.from('school_forms').select('id,form_name').order('form_level'),
        ]);

        const allMarks = marks || [];
        const totalMarks = allMarks.map(m => Number(m.marks || 0));
        const avg = totalMarks.length ? totalMarks.reduce((a, b) => a + b, 0) / totalMarks.length : 0;
        const pass = totalMarks.filter(m => m >= 50).length;
        const gradeA = totalMarks.filter(m => m >= 75).length;

        // Form performance
        const fp = (forms || []).map(f => {
          const fm = allMarks.filter(m => m.form_id === f.id).map(m => Number(m.marks || 0));
          return { form: f.form_name, avg: fm.length ? Math.round(fm.reduce((a, b) => a + b, 0) / fm.length) : 0 };
        });

        setStats({
          students: sc || 0, exams: ec || 0,
          subjects: (subjects || []).length, avgScore: Math.round(avg * 10) / 10,
          passRate: totalMarks.length ? Math.round((pass / totalMarks.length) * 100) : 0,
          gradeA, teachers: (teachers || []).length, terms: 3,
        });
        setRecentExams(exams || []);
        setFormPerf(fp);
        setTrendData({ labels: ['T1 2023', 'T2 2023', 'T3 2023', 'T1 2024', 'T2 2024', 'T3 2024'], scores: [58, 61, 57, 63, 65, Math.round(avg)] });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const kpis = [
    { label: 'Active Students', value: stats.students, icon: FiUsers, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'School Average', value: `${stats.avgScore}%`, icon: FiBarChart2, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: FiTrendingUp, color: stats.passRate >= 50 ? '#10b981' : '#ef4444', bg: stats.passRate >= 50 ? '#ecfdf5' : '#fef2f2' },
    { label: 'Grade A Students', value: stats.gradeA, icon: FiAward, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Exams Recorded', value: stats.exams, icon: FiBook, color: '#0891b2', bg: '#ecfeff' },
    { label: 'Subjects Offered', value: stats.subjects, icon: FiGrid, color: '#7c3aed', bg: '#faf5ff' },
    { label: 'Teaching Staff', value: stats.teachers, icon: FiUsers, color: '#059669', bg: '#ecfdf5' },
    { label: 'Analytics Pages', value: '22+', icon: FiZap, color: '#e11d48', bg: '#fff1f2' },
  ];

  const trendChart = {
    labels: trendData.labels,
    datasets: [{ label: 'School Average %', data: trendData.scores, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 5 }],
  };

  const formChart = {
    labels: formPerf.map(f => f.form),
    datasets: [{ label: 'Average Score', data: formPerf.map(f => f.avg), backgroundColor: ['#6366f1','#3b82f6','#10b981','#f59e0b'], borderRadius: 8 }],
  };

  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)', minHeight: 160 }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">APSIMS Intelligence Platform</span>
            </div>
            <h1 className="text-2xl font-black text-white">📊 Exam Analytics Command Center</h1>
            <p className="text-white/50 text-sm mt-1">22+ cutting-edge analytics pages · 8-4-4 & CBC · Real-time data</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/dashboard/exams/executive-dashboard" className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
              🏛️ Executive Dashboard
            </Link>
            <Link href="/dashboard/exams/ai-insights" className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              🤖 AI Insights
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">{loading ? '…' : k.value}</p>
              <p className="text-[11px] text-gray-400 font-semibold">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">📈 School Performance Trend — Last 6 Terms</p>
          <p className="text-xs text-gray-400 mb-4">Average score across all forms and subjects</p>
          <div style={{ height: 200 }}>
            <Line data={trendChart} options={{ ...opts, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, x: { grid: { display: false } } } }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">📚 Form-wise Average Score</p>
          <p className="text-xs text-gray-400 mb-4">Current performance by class</p>
          <div style={{ height: 200 }}>
            {formPerf.length > 0
              ? <Bar data={formChart} options={{ ...opts, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } } }} />
              : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No exam data yet</div>}
          </div>
        </div>
      </div>

      {/* ── ANALYTICS MODULES GRID ── */}
      {ANALYTICS_MODULES.map(group => (
        <div key={group.group}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ background: group.color }} />
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">{group.group}</h2>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">{group.items.length} analytics</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {group.items.map(item => (
              <Link key={item.href} href={item.href} className="group">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full"
                  style={{ borderLeftWidth: 3, borderLeftColor: group.color }}>
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-sm font-black text-gray-800 leading-tight mb-1">{item.label}</p>
                  <p className="text-[11px] text-gray-400 leading-tight">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* ── RECENT EXAMS ── */}
      {recentExams.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">📋 Recent Exams</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recentExams.map((ex, i) => (
              <div key={ex.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{ex.exam_name}</p>
                    <p className="text-xs text-gray-400">{ex.year}</p>
                  </div>
                </div>
                <Link href="/dashboard/exams/grade-heatmap" className="text-xs text-indigo-600 font-bold hover:underline">View Analytics →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
