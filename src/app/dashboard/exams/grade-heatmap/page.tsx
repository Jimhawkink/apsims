'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FiDownload, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GRADES = [
  { label: 'A',  min: 75, color: '#14532d', text: '#fff' },
  { label: 'A-', min: 70, color: '#166534', text: '#fff' },
  { label: 'B+', min: 65, color: '#15803d', text: '#fff' },
  { label: 'B',  min: 60, color: '#16a34a', text: '#fff' },
  { label: 'B-', min: 55, color: '#65a30d', text: '#fff' },
  { label: 'C+', min: 50, color: '#ca8a04', text: '#fff' },
  { label: 'C',  min: 45, color: '#d97706', text: '#fff' },
  { label: 'C-', min: 40, color: '#ea580c', text: '#fff' },
  { label: 'D+', min: 35, color: '#dc2626', text: '#fff' },
  { label: 'D',  min: 30, color: '#b91c1c', text: '#fff' },
  { label: 'D-', min: 25, color: '#991b1b', text: '#fff' },
  { label: 'E',  min: 0,  color: '#7f1d1d', text: '#fff' },
];

function getGrade(score: number) {
  for (const g of GRADES) { if (score >= g.min) return g.label; }
  return 'E';
}

export default function GradeHeatmapPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams]       = useState<any[]>([]);
  const [forms, setForms]       = useState<any[]>([]);
  const [marks, setMarks]       = useState<any[]>([]);
  const [selExam, setSelExam]   = useState('');
  const [selForm, setSelForm]   = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: e }, { data: f }] = await Promise.all([
        supabase.from('school_subjects').select('id,subject_name').order('subject_name'),
        supabase.from('school_exams').select('id,exam_name').order('created_at', { ascending: false }).limit(20),
        supabase.from('school_forms').select('id,form_name').order('form_level'),
      ]);
      setSubjects(s || []); setExams(e || []); setForms(f || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase.from('school_exam_marks').select('marks,subject_id,form_id,exam_id').limit(5000);
      if (selExam) q = q.eq('exam_id', selExam);
      if (selForm) q = q.eq('form_id', selForm);
      const { data } = await q;
      setMarks(data || []);
    })();
  }, [selExam, selForm]);

  // Build heatmap: subject → grade → count
  const heatmap: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  subjects.forEach(s => { heatmap[s.id] = {}; GRADES.forEach(g => { heatmap[s.id][g.label] = 0; }); });
  marks.forEach(m => {
    const g = getGrade(Number(m.marks));
    if (heatmap[m.subject_id]) { heatmap[m.subject_id][g] = (heatmap[m.subject_id][g] || 0) + 1; }
    totals[g] = (totals[g] || 0) + 1;
  });

  const activeSubjects = subjects.filter(s => marks.some(m => m.subject_id === s.id));

  const exportCSV = () => {
    const rows = [['Subject', ...GRADES.map(g => g.label)]];
    activeSubjects.forEach(s => rows.push([s.subject_name, ...GRADES.map(g => String(heatmap[s.id]?.[g.label] || 0))]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'grade_heatmap.csv'; a.click();
  };

  const chartData = {
    labels: GRADES.map(g => g.label),
    datasets: [{ label: 'Total Students', data: GRADES.map(g => totals[g.label] || 0), backgroundColor: GRADES.map(g => g.color), borderRadius: 6 }],
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)', minHeight: 140 }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">🌡️ Grade Distribution Heatmap</p>
          <h1 className="text-2xl font-black text-white">Subject × Grade Matrix</h1>
          <p className="text-white/50 text-sm mt-1">Color-coded distribution of grades across all subjects — 8-4-4 Kenya</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">EXAM</label>
          <select value={selExam} onChange={e => setSelExam(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-300">
            <option value="">All Exams</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">FORM/GRADE</label>
          <select value={selForm} onChange={e => setSelForm(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-300">
            <option value="">All Forms</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <FiDownload size={14} /> Export CSV
        </button>
        <div className="ml-auto text-xs text-gray-400">{marks.length.toLocaleString()} marks records</div>
      </div>

      {/* Color Legend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Grade Legend</p>
        <div className="flex flex-wrap gap-2">
          {GRADES.map(g => (
            <div key={g.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: g.color, color: g.text }}>
              {g.label} ({g.min}%+)
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Grade Distribution Heatmap</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : activeSubjects.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-bold">No exam marks recorded yet</p>
            <p className="text-sm mt-1">Enter marks in the Exam Marks page to see the heatmap</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-black text-gray-500 sticky left-0 bg-white z-10 min-w-[160px]">Subject</th>
                  {GRADES.map(g => <th key={g.label} className="px-2 py-3 text-center font-black" style={{ color: g.color, minWidth: 48 }}>{g.label}</th>)}
                  <th className="px-3 py-3 text-center font-black text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {activeSubjects.map((sub, i) => {
                  const subTotal = Object.values(heatmap[sub.id] || {}).reduce((a: number, b) => a + (b as number), 0);
                  return (
                    <tr key={sub.id} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                      <td className="px-4 py-2 font-semibold text-gray-700 sticky left-0 bg-inherit z-10">{sub.subject_name}</td>
                      {GRADES.map(g => {
                        const cnt = heatmap[sub.id]?.[g.label] || 0;
                        const pct = subTotal > 0 ? Math.round((cnt / subTotal) * 100) : 0;
                        return (
                          <td key={g.label} className="px-1 py-1 text-center">
                            {cnt > 0 ? (
                              <div className="rounded px-1 py-1 text-[10px] font-bold text-white" style={{ background: g.color }} title={`${cnt} students (${pct}%)`}>
                                {cnt}<br /><span className="opacity-70">{pct}%</span>
                              </div>
                            ) : <span className="text-gray-200">-</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-bold text-gray-700">{subTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade Distribution Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Overall Grade Distribution — All Subjects</p>
        <p className="text-xs text-gray-400 mb-4">Total count of each grade across all subjects and students</p>
        <div style={{ height: 220 }}>
          <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } } }} />
        </div>
      </div>
    </div>
  );
}
