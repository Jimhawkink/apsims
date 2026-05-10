'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Doughnut } from 'react-chartjs-2';

export default function AcademicsPanel() {
  const [data, setData] = useState<any>({ subjects: [], exams: [], marks: [], forms: [], students: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: subjects }, { data: exams }, { data: marks }, { data: forms }, { data: students }] = await Promise.all([
        supabase.from('school_subjects').select('*'),
        supabase.from('school_exam_types').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('school_exam_marks').select('score, grade, subject_id, student_id').limit(500),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_students').select('id, form_id, gender, status').eq('status', 'Active'),
      ]);
      setData({ subjects: subjects || [], exams: exams || [], marks: marks || [], forms: forms || [], students: students || [] });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Loading academics data...</div>;

  const totalSubjects = data.subjects.length;
  const totalExams = data.exams.length;
  const avgScore = data.marks.length > 0 ? Math.round(data.marks.reduce((s: number, m: any) => s + Number(m.score || 0), 0) / data.marks.length) : 0;

  // Grade distribution
  const grades: Record<string, number> = {};
  data.marks.forEach((m: any) => { const g = m.grade || 'N/A'; grades[g] = (grades[g] || 0) + 1; });
  const gradeColors: Record<string, string> = { 'A': '#10b981', 'A-': '#34d399', 'B+': '#3b82f6', 'B': '#60a5fa', 'B-': '#93c5fd', 'C+': '#f59e0b', 'C': '#fbbf24', 'C-': '#fcd34d', 'D+': '#f97316', 'D': '#ef4444', 'D-': '#f87171', 'E': '#dc2626' };
  const gradeChart = {
    labels: Object.keys(grades),
    datasets: [{ data: Object.values(grades), backgroundColor: Object.keys(grades).map(g => gradeColors[g] || '#9ca3af'), borderWidth: 0 }],
  };

  // Students per form
  const formDist = data.forms.map((f: any) => ({
    form: f.form_name,
    count: data.students.filter((s: any) => s.form_id === f.id).length,
    male: data.students.filter((s: any) => s.form_id === f.id && s.gender === 'Male').length,
    female: data.students.filter((s: any) => s.form_id === f.id && s.gender === 'Female').length,
  }));
  const formChart = {
    labels: formDist.map((f: any) => f.form),
    datasets: [
      { label: 'Male', data: formDist.map((f: any) => f.male), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
      { label: 'Female', data: formDist.map((f: any) => f.female), backgroundColor: 'rgba(236,72,153,0.6)', borderRadius: 4 },
    ],
  };

  const dOpts = { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false } } };
  const bOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, stacked: true, ticks: { font: { size: 10 } } }, y: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 } }, beginAtZero: true } } };

  return (
    <div className="space-y-4 ultra-animate">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Subjects', value: totalSubjects, icon: '📖', color: '#3b82f6' },
          { label: 'Exams Created', value: totalExams, icon: '📝', color: '#8b5cf6' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: '📊', color: avgScore >= 50 ? '#10b981' : '#ef4444' },
          { label: 'Marks Entered', value: data.marks.length.toLocaleString(), icon: '✍️', color: '#f59e0b' },
        ].map((c, i) => (
          <div key={i} className="ultra-card">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: c.color }} />
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-[9px] text-gray-400 uppercase font-semibold">{c.label}</span></div>
            <p className="text-[22px] font-bold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📊 Student Distribution by Form</h3>
          <div style={{ height: 200 }}><Bar data={formChart} options={bOpts} /></div>
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">🎓 Grade Distribution</h3>
          <div className="flex gap-4">
            <div style={{ height: 160, width: 160, flexShrink: 0 }}>{Object.keys(grades).length > 0 ? <Doughnut data={gradeChart} options={dOpts} /> : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>}</div>
            <div className="space-y-1 flex-1">{Object.entries(grades).slice(0, 8).map(([g, v], i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: gradeColors[g] || '#9ca3af' }} /><span className="text-gray-400 flex-1">{g}</span><span className="font-semibold text-gray-700">{v}</span></div>
            ))}</div>
          </div>
        </div>
      </div>
      <div className="ultra-panel">
        <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📝 Recent Exams</h3>
        <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Exam</th><th>Code</th><th>Year</th><th>Weight</th><th>Status</th></tr></thead><tbody>
          {data.exams.slice(0, 8).map((e: any, i: number) => (
            <tr key={i}><td className="font-medium text-[11px]">{e.exam_name}</td><td className="text-[10px] text-gray-400 font-mono">{e.exam_code || '—'}</td><td className="text-[10px]">{e.year}</td>
              <td className="text-[10px] font-semibold text-blue-600">{e.weight}%</td>
              <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${e.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>{e.is_active ? 'Active' : 'Closed'}</span></td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}
