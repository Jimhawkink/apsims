'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GRADE_POINTS: Record<string, number> = { A: 12, 'A-': 11, 'B+': 10, B: 9, 'B-': 8, 'C+': 7, C: 6, 'C-': 5, 'D+': 4, D: 3, 'D-': 2, E: 1 };
function avgToGrade(avg: number) {
  if (avg >= 75) return 'A'; if (avg >= 70) return 'A-'; if (avg >= 65) return 'B+';
  if (avg >= 60) return 'B'; if (avg >= 55) return 'B-'; if (avg >= 50) return 'C+';
  if (avg >= 45) return 'C'; if (avg >= 40) return 'C-'; if (avg >= 35) return 'D+';
  if (avg >= 30) return 'D'; if (avg >= 25) return 'D-'; return 'E';
}
function gradeColor(g: string) {
  if (['A','A-'].includes(g)) return '#14532d';
  if (['B+','B','B-'].includes(g)) return '#15803d';
  if (['C+','C','C-'].includes(g)) return '#ca8a04';
  if (['D+','D','D-'].includes(g)) return '#dc2626';
  return '#7f1d1d';
}
function riskLevel(avg: number) {
  if (avg >= 50) return { label: 'On Track', color: '#059669', bg: '#ecfdf5' };
  if (avg >= 40) return { label: 'Monitor', color: '#0891b2', bg: '#ecfeff' };
  if (avg >= 30) return { label: 'At Risk', color: '#d97706', bg: '#fffbeb' };
  return { label: 'Critical', color: '#dc2626', bg: '#fef2f2' };
}

export default function NationalReadinessPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectAvgs, setSubjectAvgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [{ data: allStudents }, { data: allMarks }, { data: allSubjects }, { data: forms }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status', 'Active'),
        supabase.from('school_exam_marks').select('student_id,subject_id,marks,form_id').limit(10000),
        supabase.from('school_subjects').select('id,subject_name'),
        supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      ]);

      // Find Form 4 students (or take all if no form data)
      const form4 = (forms || []).find(f => f.form_level === 4 || f.form_name?.includes('4') || f.form_name?.includes('IV'));
      const targetStudents = form4
        ? (allStudents || []).filter(s => s.form_id === form4.id)
        : (allStudents || []).slice(0, 50);

      // Compute per-student average
      const withAvg = targetStudents.map(st => {
        const stMarks = (allMarks || []).filter(m => m.student_id === st.id).map(m => Number(m.marks || 0));
        const avg = stMarks.length ? stMarks.reduce((a, b) => a + b, 0) / stMarks.length : 0;
        const grade = avgToGrade(avg);
        return { ...st, avg: Math.round(avg * 10) / 10, grade, points: GRADE_POINTS[grade] || 1 };
      }).sort((a, b) => b.avg - a.avg);

      // Subject readiness (class average per subject)
      const sAvgs = (allSubjects || []).map(s => {
        const sMarks = (allMarks || []).filter(m => m.subject_id === s.id).map(m => Number(m.marks || 0));
        return { name: s.subject_name, avg: sMarks.length ? Math.round(sMarks.reduce((a, b) => a + b, 0) / sMarks.length) : 0 };
      }).filter(s => s.avg > 0).sort((a, b) => a.avg - b.avg);

      setStudents(withAvg);
      setSubjects(allSubjects || []);
      setSubjectAvgs(sAvgs);
      setLoading(false);
    })();
  }, []);

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (s.admission_no || '').includes(search);
    const risk = riskLevel(s.avg);
    const matchFilter = filter === 'all' || risk.label.toLowerCase().replace(' ', '-') === filter;
    return matchSearch && matchFilter;
  });

  const critical = students.filter(s => s.avg < 30).length;
  const atRisk   = students.filter(s => s.avg >= 30 && s.avg < 40).length;
  const onTrack  = students.filter(s => s.avg >= 50).length;
  const meanPoints = students.length ? Math.round(students.reduce((a, b) => a + (b.points || 1), 0) / students.length * 10) / 10 : 0;
  const meanGrade = Object.entries(GRADE_POINTS).sort((a, b) => Math.abs(b[1] - meanPoints) - Math.abs(a[1] - meanPoints))[0]?.[0] || '-';

  const readinessChart = {
    labels: subjectAvgs.map(s => s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name),
    datasets: [
      { label: 'Class Average', data: subjectAvgs.map(s => s.avg), backgroundColor: subjectAvgs.map(s => s.avg >= 45 ? '#16a34a' : '#dc2626'), borderRadius: 6 },
      { label: 'C Plain Target (45)', data: subjectAvgs.map(() => 45), backgroundColor: 'rgba(0,0,0,0)', borderColor: '#f59e0b', type: 'line' as const, borderDash: [4, 4], borderWidth: 2, pointRadius: 0 },
    ] as any,
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#052e16,#064e3b,#065f46)', minHeight: 140 }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🇰🇪</span>
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Kenya Certificate of Secondary Education</span>
          </div>
          <h1 className="text-2xl font-black text-white">KCSE National Exam Readiness Tracker</h1>
          <p className="text-white/50 text-sm mt-1">Predictive analysis for Form 4 national examinations</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Students Analyzed', value: students.length, icon: '👥', bg: '#eff6ff', color: '#3b82f6' },
          { label: 'Predicted Mean Grade', value: meanGrade, icon: '🎓', bg: '#ecfdf5', color: '#059669' },
          { label: 'On Track (C+ & above)', value: onTrack, icon: '✅', bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Critical (below D+)', value: critical, icon: '🚨', bg: '#fef2f2', color: '#dc2626' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: k.bg }}>{k.icon}</div>
              <p className="text-2xl font-black" style={{ color: k.color }}>{loading ? '…' : k.value}</p>
            </div>
            <p className="text-xs text-gray-400 font-semibold">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mr-auto">Form 4 Students — KCSE Readiness</p>
          <input placeholder="Search by name or adm no…" value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-indigo-300" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
            <option value="all">All Students</option>
            <option value="on-track">On Track</option>
            <option value="monitor">Monitor</option>
            <option value="at-risk">At Risk</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">🇰🇪</p>
            <p className="font-bold">No Form 4 data yet</p>
            <p className="text-sm mt-1">Add Form 4 students and exam marks to see KCSE predictions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#','Name','Adm No','Avg %','Predicted Grade','Predicted Points','Risk Level'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((st, i) => {
                  const risk = riskLevel(st.avg);
                  return (
                    <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{st.first_name} {st.last_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{st.admission_no || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, st.avg)}%`, background: st.avg >= 50 ? '#16a34a' : st.avg >= 30 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span className="font-bold text-gray-800">{st.avg}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-lg text-xs font-black text-white" style={{ background: gradeColor(st.grade) }}>{st.grade}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">{st.points} pts</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subject Readiness Chart */}
      {subjectAvgs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject Readiness vs C Plain Target (45%)</p>
          <p className="text-xs text-gray-400 mb-4">🟢 Above C plain · 🔴 Below C plain · Yellow dashed = minimum target</p>
          <div style={{ height: 250 }}>
            <Bar data={readinessChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const, labels: { font: { size: 11 } } } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
          </div>
        </div>
      )}
    </div>
  );
}
