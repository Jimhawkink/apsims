'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import { FiSearch, FiPrinter, FiDownload, FiUser, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#6366f1','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#0f766e','#be185d'];

export default function StudentTrajectoryPage() {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selected, setSelected]       = useState<any | null>(null);
  const [subjects, setSubjects]       = useState<any[]>([]);
  const [exams, setExams]             = useState<any[]>([]);
  const [marks, setMarks]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: sub }, { data: ex }, { data: m }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status','Active').order('first_name').limit(200),
        supabase.from('school_subjects').select('id,subject_name'),
        supabase.from('school_exams').select('id,exam_name,year').order('created_at'),
        supabase.from('school_exam_marks').select('student_id,subject_id,exam_id,marks').limit(10000),
      ]);
      setAllStudents(s || []); setSubjects(sub || []); setExams(ex || []); setMarks(m || []);
      setLoading(false);
    })();
  }, []);

  const filteredStudents = allStudents.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.admission_no || '').includes(search)
  ).slice(0, 10);

  // Compute trajectory for selected student
  const studentMarks = selected ? marks.filter(m => m.student_id === selected.id) : [];
  const studentExams = exams.filter(e => studentMarks.some(m => m.exam_id === e.id));

  // Per-exam average
  const examAvgs = studentExams.map(ex => {
    const em = studentMarks.filter(m => m.exam_id === ex.id).map(m => Number(m.marks || 0));
    return { exam: ex.exam_name, avg: em.length ? Math.round(em.reduce((a, b) => a + b, 0) / em.length) : 0 };
  });

  // Per-subject scores across all exams
  const activeSubjects = subjects.filter(s => studentMarks.some(m => m.subject_id === s.id));
  const subjectAvgs = activeSubjects.map(s => {
    const sm = studentMarks.filter(m => m.subject_id === s.id).map(m => Number(m.marks || 0));
    return { ...s, avg: sm.length ? Math.round(sm.reduce((a, b) => a + b, 0) / sm.length) : 0, marks: sm };
  });
  const bestSubject  = [...subjectAvgs].sort((a, b) => b.avg - a.avg)[0];
  const worstSubject = [...subjectAvgs].sort((a, b) => a.avg - b.avg)[0];
  const mostImproved = activeSubjects.map(s => {
    const sm = studentMarks.filter(m => m.subject_id === s.id).map(m => Number(m.marks || 0));
    if (sm.length < 2) return { ...s, improvement: 0 };
    return { ...s, improvement: sm[sm.length - 1] - sm[0] };
  }).sort((a, b) => b.improvement - a.improvement)[0];

  const overallAvg = studentMarks.length ? Math.round(studentMarks.reduce((a, m) => a + Number(m.marks || 0), 0) / studentMarks.length) : 0;
  const schoolAvg  = marks.length ? Math.round(marks.reduce((a, m) => a + Number(m.marks || 0), 0) / marks.length) : 0;
  const classAvg   = schoolAvg; // approximate

  const trajectoryChart = {
    labels: examAvgs.map(e => e.exam),
    datasets: [
      { label: 'Student Avg', data: examAvgs.map(e => e.avg), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 6, borderWidth: 3 },
      { label: 'School Avg',  data: examAvgs.map(() => schoolAvg), borderColor: '#f59e0b', borderDash: [6,3], pointRadius: 0, backgroundColor: 'transparent', fill: false, borderWidth: 2 },
    ],
  };

  const radarChart = {
    labels: subjectAvgs.slice(0, 8).map(s => s.subject_name.length > 10 ? s.subject_name.slice(0,10)+'…' : s.subject_name),
    datasets: [
      { label: selected?.first_name || 'Student', data: subjectAvgs.slice(0, 8).map(s => s.avg), backgroundColor: 'rgba(99,102,241,0.25)', borderColor: '#6366f1', borderWidth: 2, pointBackgroundColor: '#6366f1', pointRadius: 4 },
      { label: 'School Avg', data: subjectAvgs.slice(0, 8).map(() => schoolAvg), backgroundColor: 'rgba(251,191,36,0.1)', borderColor: '#f59e0b', borderDash: [4,2], borderWidth: 2, pointBackgroundColor: '#f59e0b', pointRadius: 3 },
    ],
  };

  const exportCSV = () => {
    if (!selected) return;
    const rows = [['Exam', 'Average']];
    examAvgs.forEach(e => rows.push([e.exam, String(e.avg)]));
    rows.push([]);
    rows.push(['Subject', 'Average']);
    subjectAvgs.forEach(s => rows.push([s.subject_name, String(s.avg)]));
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = `${selected.first_name}_trajectory.csv`; a.click();
  };

  const printReport = () => window.print();

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display:none!important; } .print-full { width:100%!important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl no-print" style={{ background: 'linear-gradient(135deg,#0c0a1e,#1e1b4b,#2e1065)', minHeight: 180 }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%,rgba(99,102,241,0.3) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(139,92,246,0.2) 0%,transparent 50%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-4 right-10 w-36 h-36 opacity-15" style={{ background: 'radial-gradient(circle,#a78bfa,transparent)', filter: 'blur(40px)' }} />
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" /><span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Individual Progress Tracker</span></div>
            <h1 className="text-3xl font-black text-white">📈 Student Learning Trajectory</h1>
            <p className="text-white/50 text-sm mt-2">Search any student to see their complete academic journey — trends, subjects, and predictions</p>
          </div>
          <div className="flex gap-2 mt-1">
            {selected && <>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition"><FiDownload size={13}/>CSV</button>
              <button onClick={printReport} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><FiPrinter size={13}/>Print PDF</button>
            </>}
          </div>
        </div>
      </div>

      {/* STUDENT SEARCH */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 no-print">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🔍 Search Student</p>
        <div className="relative w-full max-w-md">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type student name or admission number…"
            className="w-full border-2 border-indigo-100 focus:border-indigo-400 rounded-xl pl-9 pr-4 py-3 text-sm font-medium focus:outline-none transition-colors" />
          {showDropdown && filteredStudents.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-50 mt-1 overflow-hidden">
              {filteredStudents.map(st => (
                <button key={st.id} onClick={() => { setSelected(st); setSearch(`${st.first_name} ${st.last_name}`); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{st.first_name[0]}</div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{st.first_name} {st.last_name}</p>
                    <p className="text-xs text-gray-400">{st.admission_no || 'No Adm No'} · {st.gender}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {!selected && !loading && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allStudents.slice(0,8).map(st => (
              <button key={st.id} onClick={() => { setSelected(st); setSearch(`${st.first_name} ${st.last_name}`); setShowDropdown(false); }}
                className="p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left">
                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{st.first_name[0]}</div>
                  <p className="font-medium text-xs text-gray-700 truncate">{st.first_name} {st.last_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* STUDENT PROFILE — shown when selected */}
      {selected && (
        <div ref={printRef} className="space-y-5">
          {/* Profile Card */}
          <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '1px solid #c7d2fe' }}>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>{selected.first_name[0]}</div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-gray-800">{selected.first_name} {selected.last_name}</h2>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {[['Adm No', selected.admission_no || '—'], ['Gender', selected.gender || '—'], ['Total Marks', studentMarks.length], ['Overall Avg', overallAvg + '%']].map(([k,v]) => (
                    <span key={String(k)} className="text-xs text-gray-500"><strong className="text-gray-800">{v}</strong> {k}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black" style={{ color: overallAvg >= 50 ? '#059669' : '#dc2626' }}>{overallAvg}%</p>
                <p className="text-xs text-gray-400">Overall Average</p>
                <p className="text-xs mt-1" style={{ color: overallAvg > schoolAvg ? '#059669' : '#dc2626' }}>
                  {overallAvg > schoolAvg ? '▲' : '▼'} {Math.abs(overallAvg - schoolAvg)}% vs school avg
                </p>
              </div>
            </div>
            {/* Mini KPI strip */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Best Subject', value: bestSubject?.subject_name || '—', icon: '🏆', color: '#f59e0b' },
                { label: 'Weakest Subject', value: worstSubject?.subject_name || '—', icon: '📉', color: '#dc2626' },
                { label: 'Most Improved', value: mostImproved?.subject_name || '—', icon: '🚀', color: '#059669' },
                { label: 'Exams Sat', value: studentExams.length, icon: '📝', color: '#6366f1' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <p className="text-base mb-1">{k.icon}</p>
                  <p className="text-xs font-black truncate" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-gray-400">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📈 Performance Trajectory</p>
              <p className="text-xs text-gray-400 mb-4">Average score per exam · Purple = student · Yellow dashed = school avg</p>
              <div style={{ height: 220 }}>
                {examAvgs.length > 1
                  ? <Line data={trajectoryChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top',labels:{font:{size:10}}}}, scales:{y:{beginAtZero:false,min:0,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`}},x:{grid:{display:false},ticks:{font:{size:10}}}} }} />
                  : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Need 2+ exams to show trajectory</div>}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🕸️ Subject Balance Radar</p>
              <p className="text-xs text-gray-400 mb-3">Student vs school average by subject</p>
              <div style={{ height: 220 }}>
                {subjectAvgs.length >= 3
                  ? <Radar data={radarChart} options={{ responsive:true, maintainAspectRatio:false, scales:{r:{beginAtZero:true,max:100,ticks:{font:{size:8},stepSize:25}}}, plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:10}}} }} />
                  : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Need 3+ subjects</div>}
              </div>
            </div>
          </div>

          {/* Subject breakdown table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Performance Breakdown</p>
              <div className="flex gap-2 no-print">
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"><FiDownload size={11}/>CSV</button>
                <button onClick={printReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><FiPrinter size={11}/>Print PDF</button>
              </div>
            </div>
            {subjectAvgs.length === 0
              ? <div className="p-8 text-center text-gray-400">No marks found for this student</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['Subject','Avg Score','vs School','Marks Count','Status'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {subjectAvgs.sort((a,b) => b.avg - a.avg).map(s => {
                        const diff = s.avg - schoolAvg;
                        const status = s.avg >= 70 ? 'Excellent' : s.avg >= 50 ? 'Pass' : s.avg >= 40 ? 'Borderline' : 'Fail';
                        const statusColor = s.avg >= 70 ? '#059669' : s.avg >= 50 ? '#0891b2' : s.avg >= 40 ? '#d97706' : '#dc2626';
                        return (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-800">{s.subject_name}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width:`${Math.min(100,s.avg)}%`, background: statusColor }} /></div>
                                <span className="font-black text-gray-800">{s.avg}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: diff >= 0 ? '#059669' : '#dc2626' }}>
                                {diff >= 0 ? <FiTrendingUp size={12}/> : <FiTrendingDown size={12}/>} {diff >= 0 ? '+' : ''}{diff}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-center">{s.marks.length}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: statusColor, background: `${statusColor}18` }}>{status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
