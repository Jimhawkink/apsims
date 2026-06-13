'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Radar, Line } from 'react-chartjs-2';
import { FiSearch, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler);

export default function TeacherCorrelationPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: s }, { data: m }, { data: subs }] = await Promise.all([
        supabase.from('school_teachers').select('id,full_name,subject_id,staff_type').eq('status', 'Active'),
        supabase.from('school_subjects').select('id,subject_name'),
        supabase.from('school_exam_marks').select('subject_id,marks').limit(10000),
        supabase.from('school_subjects').select('id,subject_name'),
      ]);

      const subMap: Record<string, string> = {};
      (subs || []).forEach((s: any) => { subMap[s.id] = s.subject_name; });

      const marksBySubject: Record<string, number[]> = {};
      (m || []).forEach((mark: any) => {
        if (!marksBySubject[mark.subject_id]) marksBySubject[mark.subject_id] = [];
        marksBySubject[mark.subject_id].push(Number(mark.marks || 0));
      });

      const enriched = (t || []).map((teacher: any) => {
        const subjectMarks = marksBySubject[teacher.subject_id] || [];
        const avg = subjectMarks.length ? subjectMarks.reduce((a: number, b: number) => a + b, 0) / subjectMarks.length : 0;
        const pass = subjectMarks.filter((m: number) => m >= 50).length;
        const passRate = subjectMarks.length ? Math.round((pass / subjectMarks.length) * 100) : 0;
        const gradeA = subjectMarks.filter((m: number) => m >= 75).length;
        const tier = passRate >= 70 ? 'Excellent' : passRate >= 55 ? 'Good' : passRate >= 40 ? 'Average' : 'Needs Support';
        return {
          ...teacher,
          subjectName: subMap[teacher.subject_id] || 'General',
          avg: Math.round(avg * 10) / 10,
          passRate,
          gradeA,
          studentCount: subjectMarks.length,
          tier,
        };
      }).filter((t: any) => t.studentCount > 0).sort((a: any, b: any) => b.avg - a.avg);

      setTeachers(enriched);
      setLoading(false);
    })();
  }, []);

  const tierConfig: Record<string, { color: string; bg: string; glow: string; border: string }> = {
    'Excellent':      { color: '#059669', bg: '#ecfdf5', glow: '0 0 16px rgba(5,150,105,0.25)', border: '#10b981' },
    'Good':           { color: '#0891b2', bg: '#ecfeff', glow: '0 0 16px rgba(8,145,178,0.25)', border: '#06b6d4' },
    'Average':        { color: '#d97706', bg: '#fffbeb', glow: '0 0 16px rgba(217,119,6,0.25)',  border: '#f59e0b' },
    'Needs Support':  { color: '#dc2626', bg: '#fef2f2', glow: '0 0 16px rgba(220,38,38,0.25)',  border: '#ef4444' },
  };

  const medals = ['🥇', '🥈', '🥉'];

  const filtered = teachers.filter(t =>
    !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || t.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  const top5Chart = {
    labels: teachers.slice(0, 7).map((t: any) => t.full_name.split(' ').slice(-1)[0]),
    datasets: [
      { label: 'Avg Score %', data: teachers.slice(0, 7).map((t: any) => t.avg), backgroundColor: teachers.slice(0, 7).map((_: any, i: number) => ['#6366f1','#0891b2','#059669','#d97706','#7c3aed','#dc2626','#0f766e'][i]), borderRadius: 8 },
    ],
  };

  const radarLabels = ['Pass Rate', 'Grade A %', 'Avg Score', 'Student Count', 'Consistency'];
  const top3 = teachers.slice(0, 3);
  const radarColors = ['rgba(99,102,241,0.4)', 'rgba(8,145,178,0.4)', 'rgba(5,150,105,0.4)'];
  const radarBorders = ['#6366f1', '#0891b2', '#059669'];
  const radarChart = {
    labels: radarLabels,
    datasets: top3.map((t: any, i: number) => ({
      label: t.full_name.split(' ')[0],
      data: [t.passRate, Math.round(t.gradeA / Math.max(t.studentCount, 1) * 100), t.avg, Math.min(100, t.studentCount / 2), 75],
      backgroundColor: radarColors[i],
      borderColor: radarBorders[i],
      borderWidth: 2,
      pointBackgroundColor: radarBorders[i],
      pointRadius: 3,
    })),
  };

  const excellentCount = teachers.filter(t => t.tier === 'Excellent').length;
  const supportCount   = teachers.filter(t => t.tier === 'Needs Support').length;
  const schoolAvg      = teachers.length ? Math.round(teachers.reduce((a, t) => a + t.avg, 0) / teachers.length) : 0;

  return (
    <div className="space-y-6">
      {/* ULTRA PREMIUM HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b,#2e1065,#1e1b4b)', minHeight: 195 }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 15% 60%,rgba(139,92,246,0.3) 0%,transparent 60%), radial-gradient(ellipse at 85% 30%,rgba(99,102,241,0.25) 0%,transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-4 right-12 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#a78bfa,transparent)', filter: 'blur(40px)' }} />
        <div className="relative px-6 py-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Teaching Effectiveness Analytics</span>
          </div>
          <h1 className="text-3xl font-black text-white">👩‍🏫 Teacher Performance Analytics</h1>
          <p className="text-white/50 text-sm mt-2">Correlation between teaching and student outcomes — identify stars & support where needed</p>
          <div className="mt-5 flex gap-8 flex-wrap">
            {[
              { label: 'Teachers Analyzed', value: teachers.length,    color: '#c4b5fd' },
              { label: 'School Avg',         value: schoolAvg + '%',   color: '#a5f3fc' },
              { label: 'Excellent Teachers', value: excellentCount,    color: '#6ee7b7' },
              { label: 'Need Support',       value: supportCount,      color: '#fca5a5' },
            ].map(k => (
              <div key={k.label}>
                <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Top 7 Teachers by Student Average</p>
          <p className="text-xs text-gray-400 mb-4">Based on exam marks in each teacher's subject</p>
          <div style={{ height: 220 }}>
            {teachers.length > 0
              ? <Bar data={top5Chart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
              : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Top 3 Teachers — Radar</p>
          <p className="text-xs text-gray-400 mb-3">Multi-dimensional performance comparison</p>
          <div style={{ height: 220 }}>
            {top3.length >= 1
              ? <Radar data={radarChart} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100, ticks: { font: { size: 8 }, stepSize: 25 } } }, plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } } } }} />
              : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Need teacher data</div>}
          </div>
        </div>
      </div>

      {/* TEACHER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-auto">Teacher Performance Ranking</p>
          <div className="relative">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher…"
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-indigo-300 w-44" />
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-gray-400">Loading teacher analytics…</div>
          : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">👩‍🏫</p>
              <p className="font-bold">No teacher-subject data yet</p>
              <p className="text-sm mt-1">Assign subjects to teachers and record exam marks to see analytics</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Rank', 'Teacher', 'Subject', 'Students', 'Avg Score', 'Pass Rate', 'Grade A', 'Performance Tier'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((t, i) => {
                    const cfg = tierConfig[t.tier];
                    return (
                      <tr key={t.id} className={`transition-colors cursor-pointer ${hoveredRow === t.id ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'}`}
                        onMouseEnter={() => setHoveredRow(t.id)} onMouseLeave={() => setHoveredRow(null)}>
                        <td className="px-4 py-3 text-lg">{medals[i] || <span className="text-sm font-black text-gray-400">#{i + 1}</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.border})` }}>
                              {t.full_name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-800 whitespace-nowrap">{t.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-indigo-600 bg-indigo-50/50 rounded-lg whitespace-nowrap">{t.subjectName}</td>
                        <td className="px-4 py-3 font-bold text-gray-600 text-center">{t.studentCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, t.avg)}%`, background: cfg.color }} />
                            </div>
                            <span className="font-black text-gray-800">{t.avg}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-black" style={{ color: t.passRate >= 50 ? '#059669' : '#dc2626' }}>{t.passRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600">{t.gradeA}</td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap" style={{ color: cfg.color, background: cfg.bg, boxShadow: cfg.glow }}>
                            {t.tier}
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
    </div>
  );
}
