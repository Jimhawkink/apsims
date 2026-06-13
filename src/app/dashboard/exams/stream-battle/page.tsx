'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function StreamBattlePage() {
  const [forms, setForms] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState<[string, string]>(['', '']);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: m }] = await Promise.all([
        supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
        supabase.from('school_exam_marks').select('marks,form_id,subject_id').limit(10000),
      ]);
      setForms(f || []); setMarks(m || []);
      setLoading(false);
    })();
  }, []);

  const formStats = forms.map((f, i) => {
    const fm = (marks || []).filter(m => m.form_id === f.id).map(m => Number(m.marks || 0));
    const avg = fm.length ? fm.reduce((a, b) => a + b, 0) / fm.length : 0;
    const pass = fm.filter(m => m >= 50).length;
    const gradeA = fm.filter(m => m >= 75).length;
    const passRate = fm.length ? Math.round((pass / fm.length) * 100) : 0;
    const colors = ['#6366f1','#0891b2','#059669','#d97706','#dc2626','#7c3aed'];
    return { ...f, avg: Math.round(avg * 10) / 10, passRate, gradeA, total: fm.length, color: colors[i % colors.length] };
  }).filter(f => f.total > 0).sort((a, b) => b.avg - a.avg);

  const medals = ['🥇', '🥈', '🥉'];

  const leaderboardChart = {
    labels: formStats.map(f => f.form_name),
    datasets: [
      { label: 'Average Score %', data: formStats.map(f => f.avg), backgroundColor: formStats.map(f => f.color), borderRadius: 8 },
    ],
  };

  const cmpA = formStats.find(f => f.id === compare[0]);
  const cmpB = formStats.find(f => f.id === compare[1]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1b69,#1a0a2e)', minHeight: 140 }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6">
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">⚡ Performance Tournament</p>
          <h1 className="text-2xl font-black text-white">🏆 Stream Battle: Class vs Class</h1>
          <p className="text-white/50 text-sm mt-1">Real-time performance tournament — which class reigns supreme?</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">🏆 Performance Leaderboard</p>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : formStats.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">⚡</p>
            <p className="font-bold">No exam data yet</p>
            <p className="text-sm">Enter marks to see the Stream Battle leaderboard</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {formStats.map((f, i) => (
              <div key={f.id} className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${i === 0 ? 'bg-amber-50/50' : ''}`}>
                <span className="text-2xl w-8">{medals[i] || `#${i + 1}`}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: f.color }}>{f.form_name.slice(0, 2)}</div>
                <div className="flex-1">
                  <p className="font-black text-gray-800">{f.form_name}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Pass Rate: <strong className={f.passRate >= 50 ? 'text-green-600' : 'text-red-500'}>{f.passRate}%</strong></span>
                    <span>Grade A: <strong className="text-amber-600">{f.gradeA}</strong></span>
                    <span>Records: {f.total}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black" style={{ color: f.color }}>{f.avg}%</p>
                  <p className="text-xs text-gray-400">avg score</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      {formStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Class Average Score Comparison</p>
          <div style={{ height: 240 }}>
            <Bar data={leaderboardChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, x: { grid: { display: false } } } }} />
          </div>
        </div>
      )}

      {/* Head-to-Head */}
      {formStats.length >= 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">⚔️ Head-to-Head Comparison</p>
          <div className="flex gap-4 mb-4">
            <select value={compare[0]} onChange={e => setCompare([e.target.value, compare[1]])} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none">
              <option value="">Select Class A</option>
              {formStats.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <span className="flex items-center font-black text-gray-400">VS</span>
            <select value={compare[1]} onChange={e => setCompare([compare[0], e.target.value])} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none">
              <option value="">Select Class B</option>
              {formStats.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          {cmpA && cmpB && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Average Score', a: cmpA.avg + '%', b: cmpB.avg + '%', winner: cmpA.avg > cmpB.avg ? 'a' : 'b' },
                { label: 'Pass Rate', a: cmpA.passRate + '%', b: cmpB.passRate + '%', winner: cmpA.passRate > cmpB.passRate ? 'a' : 'b' },
                { label: 'Grade A Count', a: String(cmpA.gradeA), b: String(cmpB.gradeA), winner: cmpA.gradeA > cmpB.gradeA ? 'a' : 'b' },
              ].map(row => (
                <div key={row.label} className="text-center">
                  <p className="text-xs text-gray-400 font-bold mb-2">{row.label}</p>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className={`p-3 rounded-xl text-center ${row.winner === 'a' ? 'bg-green-50 border-2 border-green-400' : 'bg-gray-50'}`}>
                      <p className="font-black text-gray-800">{row.a}</p>
                      <p className="text-xs text-gray-400">{cmpA.form_name}</p>
                    </div>
                    <span className="text-gray-300 text-xs font-bold">vs</span>
                    <div className={`p-3 rounded-xl text-center ${row.winner === 'b' ? 'bg-green-50 border-2 border-green-400' : 'bg-gray-50'}`}>
                      <p className="font-black text-gray-800">{row.b}</p>
                      <p className="text-xs text-gray-400">{cmpB.form_name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
