'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

function stdDev(arr: number[]) {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length);
}
function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? (s.length % 2 === 0 ? (s[s.length / 2 - 1] + s[s.length / 2]) / 2 : s[Math.floor(s.length / 2)]) : 0;
}
function percentile(arr: number[], p: number) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * s.length) - 1;
  return s[Math.max(0, idx)] || 0;
}

const GRADE_BANDS = [
  { label: 'A (75-100)', min: 75, max: 100, color: '#14532d' },
  { label: 'B (55-74)', min: 55, max: 74, color: '#15803d' },
  { label: 'C (40-54)', min: 40, max: 54, color: '#ca8a04' },
  { label: 'D (25-39)', min: 25, max: 39, color: '#dc2626' },
  { label: 'E (0-24)',  min: 0,  max: 24, color: '#7f1d1d' },
];

export default function GradeDistributionPage() {
  const [marks, setMarks]       = useState<number[]>([]);
  const [exams, setExams]       = useState<any[]>([]);
  const [forms, setForms]       = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selExam, setSelExam]   = useState('');
  const [selForm, setSelForm]   = useState('');
  const [selSubj, setSelSubj]   = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: f }, { data: s }] = await Promise.all([
        supabase.from('school_exams').select('id,exam_name').order('created_at', { ascending: false }).limit(20),
        supabase.from('school_forms').select('id,form_name').order('form_level'),
        supabase.from('school_subjects').select('id,subject_name').order('subject_name'),
      ]);
      setExams(e || []); setForms(f || []); setSubjects(s || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase.from('school_exam_marks').select('marks').limit(5000);
      if (selExam) q = q.eq('exam_id', selExam);
      if (selForm) q = q.eq('form_id', selForm);
      if (selSubj) q = q.eq('subject_id', selSubj);
      const { data } = await q;
      setMarks((data || []).map(d => Number(d.marks || 0)));
    })();
  }, [selExam, selForm, selSubj]);

  const mean    = marks.length ? Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10) / 10 : 0;
  const med     = Math.round(median(marks) * 10) / 10;
  const sd      = Math.round(stdDev(marks) * 10) / 10;
  const minMark = marks.length ? Math.min(...marks) : 0;
  const maxMark = marks.length ? Math.max(...marks) : 0;
  const passRate = marks.length ? Math.round((marks.filter(m => m >= 50).length / marks.length) * 100) : 0;

  // Frequency distribution (bins of 10)
  const bins: number[] = Array(11).fill(0);
  marks.forEach(m => { const b = Math.min(10, Math.floor(m / 10)); bins[b]++; });
  const binLabels = ['0-9','10-19','20-29','30-39','40-49','50-59','60-69','70-79','80-89','90-99','100'];

  const distChart = {
    labels: binLabels,
    datasets: [{
      label: 'Students',
      data: bins,
      backgroundColor: binLabels.map((_, i) => i >= 5 ? '#16a34a' : i >= 4 ? '#ca8a04' : '#dc2626'),
      borderRadius: 6,
    }],
  };

  const gradeBandData = GRADE_BANDS.map(b => ({ ...b, count: marks.filter(m => m >= b.min && m <= b.max).length, pct: marks.length ? Math.round(marks.filter(m => m >= b.min && m <= b.max).length / marks.length * 100) : 0 }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0c0a1e,#1e1b4b,#312e81)', minHeight: 140 }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">🔔 Statistical Analysis</p>
          <h1 className="text-2xl font-black text-white">Grade Distribution Analytics</h1>
          <p className="text-white/50 text-sm mt-1">Bell curves, percentiles, standard deviation, and grade band breakdown</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        {[
          { label: 'Exam', value: selExam, setter: setSelExam, opts: exams.map(e => ({ v: e.id, l: e.exam_name })) },
          { label: 'Form', value: selForm, setter: setSelForm, opts: forms.map(f => ({ v: f.id, l: f.form_name })) },
          { label: 'Subject', value: selSubj, setter: setSelSubj, opts: subjects.map(s => ({ v: s.id, l: s.subject_name })) },
        ].map(({ label, value, setter, opts }) => (
          <div key={label}>
            <label className="text-xs font-bold text-gray-500 block mb-1">{label.toUpperCase()}</label>
            <select value={value} onChange={e => setter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-300">
              <option value="">All {label}s</option>
              {opts.map(o => <option key={String(o.v)} value={String(o.v)}>{o.l}</option>)}
            </select>
          </div>
        ))}
        <div className="ml-auto flex items-end">
          <span className="text-xs text-gray-400 pb-2">{marks.length.toLocaleString()} marks</span>
        </div>
      </div>

      {/* Stats KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Mean', value: mean + '%', color: '#6366f1' },
          { label: 'Median', value: med + '%', color: '#0891b2' },
          { label: 'Std Dev', value: sd + '%', color: '#7c3aed' },
          { label: 'Min Score', value: minMark + '%', color: '#dc2626' },
          { label: 'Max Score', value: maxMark + '%', color: '#059669' },
          { label: 'Pass Rate', value: passRate + '%', color: passRate >= 50 ? '#16a34a' : '#dc2626' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-black" style={{ color: s.color }}>{loading ? '…' : s.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Distribution chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Score Frequency Distribution</p>
        <p className="text-xs text-gray-400 mb-4">Number of students in each score range · Green = Pass · Red = Fail</p>
        <div style={{ height: 240 }}>
          {marks.length > 0
            ? <Bar data={distChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
            : <div className="flex items-center justify-center h-full text-gray-400">No marks data — select exam or form to view</div>}
        </div>
      </div>

      {/* Percentile + Grade bands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Percentile Rankings</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-400">Percentile</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-400">Score</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-400">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[10, 25, 50, 75, 90, 95].map(p => (
                <tr key={p} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-indigo-600">{p}th</td>
                  <td className="px-4 py-2 font-black text-gray-800">{marks.length ? percentile(marks, p) : '—'}%</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{p === 50 ? 'Median (middle student)' : p === 90 ? 'Top 10%' : p === 10 ? 'Bottom 10%' : `Better than ${p}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Grade Band Breakdown</p>
          </div>
          <div className="p-5 space-y-3">
            {gradeBandData.map(b => (
              <div key={b.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-gray-600">{b.label}</span>
                  <span className="text-xs font-black text-gray-800">{b.count} students ({b.pct}%)</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${b.pct}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
