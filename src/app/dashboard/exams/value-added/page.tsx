'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiDownload, FiRefreshCw } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

function trend(arr: number[]) {
  if (arr.length < 2) return 0;
  const h = Math.floor(arr.length / 2);
  const a = arr.slice(0, h).reduce((s, v) => s + v, 0) / h;
  const b = arr.slice(h).reduce((s, v) => s + v, 0) / (arr.length - h);
  return Math.round((b - a) * 10) / 10;
}

export default function ValueAddedPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sortKey, setSortKey]   = useState<'va'|'name'|'current'>('va');
  const [filter, setFilter]     = useState<'all'|'high'|'pos'|'neg'>('all');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: sts }, { data: marks }, { data: forms }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status', 'Active'),
        supabase.from('school_exam_marks').select('student_id,marks,created_at').order('created_at').limit(10000),
        supabase.from('school_forms').select('id,form_name'),
      ]);
      const formMap: Record<string, string> = {};
      (forms || []).forEach((f: any) => { formMap[f.id] = f.form_name; });
      const markMap: Record<string, number[]> = {};
      (marks || []).forEach((m: any) => {
        if (!markMap[m.student_id]) markMap[m.student_id] = [];
        markMap[m.student_id].push(Number(m.marks || 0));
      });
      const enriched = (sts || []).map((st: any) => {
        const arr = markMap[st.id] || [];
        if (arr.length < 2) return null;
        const h = Math.floor(arr.length / 2);
        const baseline = Math.round(arr.slice(0, h).reduce((a, b) => a + b, 0) / h * 10) / 10;
        const current  = Math.round(arr.slice(h).reduce((a, b) => a + b, 0) / (arr.length - h) * 10) / 10;
        const va = Math.round((current - baseline) * 10) / 10;
        const cat = va > 10 ? 'High VA' : va > 0 ? 'Positive' : va > -5 ? 'Neutral' : 'Negative VA';
        return { ...st, baseline, current, va, cat, formName: formMap[st.form_id] || '-', arr };
      }).filter(Boolean) as any[];
      setStudents(enriched);
      setLoading(false);
    })();
  }, []);

  const catConfig: Record<string, { color: string; bg: string; glow: string }> = {
    'High VA':   { color: '#059669', bg: '#ecfdf5', glow: '0 0 20px rgba(5,150,105,0.3)' },
    'Positive':  { color: '#0891b2', bg: '#ecfeff', glow: '0 0 20px rgba(8,145,178,0.3)' },
    'Neutral':   { color: '#6366f1', bg: '#eef2ff', glow: '0 0 20px rgba(99,102,241,0.3)' },
    'Negative VA': { color: '#dc2626', bg: '#fef2f2', glow: '0 0 20px rgba(220,38,38,0.3)' },
  };

  const schoolVA = students.length ? Math.round(students.reduce((a, s) => a + s.va, 0) / students.length * 10) / 10 : 0;
  const highVA   = students.filter(s => s.cat === 'High VA').length;
  const negVA    = students.filter(s => s.cat === 'Negative VA').length;

  // VA distribution chart
  const bins = [-30, -20, -10, 0, 10, 20, 30];
  const binCounts = bins.map((b, i) => students.filter(s => s.va >= b && s.va < (bins[i + 1] ?? 999)).length);
  const distChart = {
    labels: ['>-30', '-20', '-10', '0', '10', '20', '30+'],
    datasets: [{ label: 'Students', data: binCounts, backgroundColor: binCounts.map((_, i) => i >= 3 ? '#059669' : '#dc2626'), borderRadius: 8 }],
  };

  let filtered = students.filter(s => {
    const nm = `${s.first_name} ${s.last_name}`.toLowerCase();
    if (search && !nm.includes(search.toLowerCase()) && !(s.admission_no || '').includes(search)) return false;
    if (filter === 'high') return s.cat === 'High VA';
    if (filter === 'pos') return s.va >= 0;
    if (filter === 'neg') return s.va < 0;
    return true;
  });
  if (sortKey === 'va')      filtered = [...filtered].sort((a, b) => b.va - a.va);
  if (sortKey === 'current') filtered = [...filtered].sort((a, b) => b.current - a.current);
  if (sortKey === 'name')    filtered = [...filtered].sort((a, b) => a.first_name.localeCompare(b.first_name));

  const exportCSV = () => {
    const rows = [['Name', 'Form', 'Adm No', 'Baseline %', 'Current %', 'VA Score', 'Category'],
      ...filtered.map(s => [`${s.first_name} ${s.last_name}`, s.formName, s.admission_no || '', s.baseline, s.current, s.va, s.cat])];
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = 'value_added.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      {/* PREMIUM HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46,#047857)', minHeight: 190 }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%,rgba(16,185,129,0.25) 0%,transparent 70%), radial-gradient(ellipse at 80% 20%,rgba(5,150,105,0.2) 0%,transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-6 right-8 w-32 h-32 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#34d399,transparent)', filter: 'blur(30px)' }} />
        <div className="relative px-6 py-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Impact Measurement Analytics</span>
          </div>
          <h1 className="text-3xl font-black text-white">➕ Value-Added Analysis</h1>
          <p className="text-white/50 text-sm mt-2 max-w-xl">Measures the school's contribution to student growth — beyond what baseline scores alone would predict.</p>
          <div className="mt-5 flex gap-6">
            {[
              { label: 'School VA Score', value: (schoolVA >= 0 ? '+' : '') + schoolVA + '%', color: schoolVA >= 0 ? '#6ee7b7' : '#fca5a5' },
              { label: 'High VA Students', value: highVA, color: '#a7f3d0' },
              { label: 'Negative VA', value: negVA, color: '#fca5a5' },
              { label: 'Students Analyzed', value: students.length, color: '#e0f2fe' },
            ].map(k => (
              <div key={k.label}>
                <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EXPLAINER BANNER */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#eef2ff,#f0fdf4)', border: '1px solid #c7d2fe' }}>
        <p className="text-sm font-bold text-indigo-800 mb-1">📖 What is Value-Added?</p>
        <p className="text-xs text-indigo-700/80">Value-Added (VA) measures how much each student has grown beyond their starting point. A <strong>High VA (+10%)</strong> means the school significantly accelerated learning. A <strong>Negative VA</strong> means the student's performance declined from their baseline — an early warning signal.</p>
      </div>

      {/* DISTRIBUTION CHART */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">VA Score Distribution</p>
        <p className="text-xs text-gray-400 mb-4">Green bars = positive growth · Red bars = regression · Wider spread = more diverse outcomes</p>
        <div style={{ height: 200 }}>
          <Bar data={distChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } } }} />
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-auto">Student Value-Added Scores</p>
          <input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-indigo-300" />
          <div className="flex gap-1">
            {(['all','high','pos','neg'] as const).map(v => (
              <button key={v} onClick={() => setFilter(v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {v === 'all' ? 'All' : v === 'high' ? '⭐ High' : v === 'pos' ? '🟢 Positive' : '🔴 Negative'}
              </button>
            ))}
          </div>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none">
            <option value="va">Sort: VA Score</option>
            <option value="current">Sort: Current %</option>
            <option value="name">Sort: Name</option>
          </select>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <FiDownload size={12} /> Export
          </button>
        </div>
        {loading ? <div className="p-10 text-center text-gray-400">Analyzing student trajectories…</div>
          : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">➕</p>
              <p className="font-bold">No trajectory data available</p>
              <p className="text-sm mt-1">Students need at least 2 exam records to calculate Value-Added</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['#','Student','Form','Adm No','Baseline','Current','VA Score','Category','Trend'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((st, i) => {
                    const cfg = catConfig[st.cat] || catConfig['Neutral'];
                    const trendVal = trend(st.arr);
                    return (
                      <tr key={st.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-[11px] text-gray-400 font-bold">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0" style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.color}99)` }}>{st.first_name[0]}</div>
                            <span className="font-semibold text-gray-800 whitespace-nowrap">{st.first_name} {st.last_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{st.formName}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">{st.admission_no || '—'}</td>
                        <td className="px-4 py-3 font-bold text-gray-500">{st.baseline}%</td>
                        <td className="px-4 py-3 font-black text-gray-800">{st.current}%</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black" style={{ color: cfg.color, background: cfg.bg, boxShadow: cfg.glow }}>
                            {st.va >= 0 ? '+' : ''}{st.va}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: cfg.color, background: cfg.bg }}>{st.cat}</span>
                        </td>
                        <td className="px-4 py-3">
                          {trendVal > 0
                            ? <FiTrendingUp className="text-green-500" size={16} />
                            : trendVal < 0 ? <FiTrendingDown className="text-red-500" size={16} />
                            : <FiMinus className="text-gray-300" size={16} />}
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
