'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function TermTrendPage() {
  const [exams, setExams]     = useState<any[]>([]);
  const [marks, setMarks]     = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: m }, { data: s }] = await Promise.all([
        supabase.from('school_exams').select('id,exam_name,year').order('created_at').limit(20),
        supabase.from('school_exam_marks').select('exam_id,subject_id,marks').limit(10000),
        supabase.from('school_subjects').select('id,subject_name').order('subject_name').limit(10),
      ]);
      setExams(e || []); setMarks(m || []); setSubjects(s || []);
      setLoading(false);
    })();
  }, []);

  // Per-exam school average + pass rate
  const examStats = exams.map(ex => {
    const em = marks.filter(m => m.exam_id === ex.id).map(m => Number(m.marks || 0));
    const avg = em.length ? Math.round(em.reduce((a, b) => a + b, 0) / em.length * 10) / 10 : 0;
    const passRate = em.length ? Math.round(em.filter(m => m >= 50).length / em.length * 100) : 0;
    const gradeAp  = em.length ? Math.round(em.filter(m => m >= 75).length / em.length * 100) : 0;
    const gradeEp  = em.length ? Math.round(em.filter(m => m < 25).length / em.length * 100) : 0;
    return { ...ex, avg, passRate, gradeAp, gradeEp, total: em.length };
  }).filter(e => e.total > 0);

  const best  = [...examStats].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...examStats].sort((a, b) => a.avg - b.avg)[0];
  const trendDir = examStats.length >= 2
    ? examStats[examStats.length - 1].avg - examStats[0].avg
    : 0;

  // Subject trend lines (up to 6 subjects)
  const COLORS = ['#6366f1','#0891b2','#059669','#d97706','#dc2626','#7c3aed'];
  const subjectTrend = {
    labels: examStats.map(e => e.exam_name.length > 14 ? e.exam_name.slice(0,14)+'…' : e.exam_name),
    datasets: subjects.slice(0, 6).map((s, i) => ({
      label: s.subject_name.length > 12 ? s.subject_name.slice(0,12)+'…' : s.subject_name,
      data: examStats.map(ex => {
        const sm = marks.filter(m => m.exam_id === ex.id && m.subject_id === s.id).map(m => Number(m.marks || 0));
        return sm.length ? Math.round(sm.reduce((a,b) => a+b,0)/sm.length) : null;
      }),
      borderColor: COLORS[i],
      backgroundColor: COLORS[i] + '20',
      tension: 0.4,
      pointRadius: 5,
      borderWidth: 2,
    })),
  };

  const schoolTrend = {
    labels: examStats.map(e => e.exam_name.length > 14 ? e.exam_name.slice(0,14)+'…' : e.exam_name),
    datasets: [
      { label:'School Average %', data: examStats.map(e => e.avg), borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.12)', fill:true, tension:0.4, pointBackgroundColor:'#6366f1', pointRadius:6, borderWidth:3 },
      { label:'Pass Rate %', data: examStats.map(e => e.passRate), borderColor:'#10b981', borderDash:[5,3], pointRadius:4, backgroundColor:'transparent', fill:false, borderWidth:2, tension:0.4 },
      { label:'Target (50%)', data: examStats.map(()=>50), borderColor:'#f59e0b', borderDash:[6,3], pointRadius:0, backgroundColor:'transparent', fill:false, borderWidth:1.5 },
    ],
  };

  const comparisonTable = examStats;

  const exportCSV = () => {
    const rows = [['Exam','Year','Avg Score','Pass Rate %','Grade A %','Grade E %','Total Records']];
    examStats.forEach(e => rows.push([e.exam_name, e.year||'', String(e.avg), String(e.passRate), String(e.gradeAp), String(e.gradeEp), String(e.total)]));
    const el = document.createElement('a'); el.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); el.download='term_trend_report.csv'; el.click();
  };

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#0c1445,#1a237e,#283593)', minHeight:190 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%,rgba(63,81,181,0.35) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(57,73,171,0.25) 0%,transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }} />
        <div className="absolute top-4 right-8 w-40 h-40 opacity-20" style={{ background:'radial-gradient(circle,#7986cb,transparent)', filter:'blur(40px)' }} />
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"/><span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Longitudinal Performance Analysis</span></div>
            <h1 className="text-3xl font-black text-white">📆 Multi-Term Performance Trends</h1>
            <p className="text-white/50 text-sm mt-2">Track how the school's performance evolves across every examination period</p>
            <div className="mt-5 flex gap-8 flex-wrap">
              {[
                { label:'Exams Tracked',  v: examStats.length, c:'#c5cae9' },
                { label:'Overall Trend',  v: trendDir >= 0 ? `+${Math.round(trendDir)}%` : `${Math.round(trendDir)}%`, c: trendDir >= 0 ? '#a5f3fc' : '#fca5a5' },
                { label:'Best Exam',      v: best?.exam_name || '—', c:'#6ee7b7' },
                { label:'Best Avg',       v: best ? best.avg+'%' : '—', c:'#fde68a' },
              ].map(k=>(
                <div key={k.label}><p className="text-lg font-black leading-tight" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p></div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'rgba(255,255,255,0.15)' }}><FiPrinter size={13}/>Print PDF</button>
          </div>
        </div>
      </div>

      {/* Best / Worst highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#ecfdf5,#d1fae5)', border:'1px solid #a7f3d0' }}>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">🏆 Best Exam Period</p>
          <p className="text-xl font-black text-emerald-800">{best?.exam_name || '—'}</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{best?.avg || 0}% avg</p>
          <p className="text-xs text-emerald-600 mt-1">Pass Rate: {best?.passRate || 0}%</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#fff7ed,#fde68a20)', border:'1px solid #fcd34d' }}>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">📈 Overall Trend</p>
          <p className="text-xl font-black text-amber-800">{examStats.length >= 2 ? `${examStats[0].exam_name} → ${examStats[examStats.length-1].exam_name}` : 'Need 2+ exams'}</p>
          <p className="text-3xl font-black mt-1" style={{ color: trendDir >= 0 ? '#059669' : '#dc2626' }}>{trendDir >= 0 ? '+' : ''}{Math.round(trendDir)}%</p>
          <p className="text-xs text-amber-600 mt-1">{trendDir >= 0 ? '▲ Improving performance' : '▼ Declining — needs attention'}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'1px solid #fca5a5' }}>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">⚠️ Lowest Exam Period</p>
          <p className="text-xl font-black text-red-800">{worst?.exam_name || '—'}</p>
          <p className="text-3xl font-black text-red-600 mt-1">{worst?.avg || 0}% avg</p>
          <p className="text-xs text-red-600 mt-1">Pass Rate: {worst?.passRate || 0}%</p>
        </div>
      </div>

      {/* MAIN TREND CHART */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📊 School Average & Pass Rate Trend</p>
        <p className="text-xs text-gray-400 mb-4">Purple = school average · Green dashed = pass rate · Yellow = 50% target</p>
        <div style={{ height:260 }}>
          {examStats.length < 2
            ? <div className="flex items-center justify-center h-full text-gray-400">Need 2+ exams to display trend chart</div>
            : <Line data={schoolTrend} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', labels:{ font:{ size:10 }, usePointStyle:true } } }, scales:{ y:{ beginAtZero:false, min:0, max:100, grid:{ color:'#f8fafc' }, ticks:{ callback:(v:any)=>`${v}%` } }, x:{ grid:{ display:false }, ticks:{ font:{ size:10 } } } } }} />}
        </div>
      </div>

      {/* SUBJECT TREND CHART */}
      {subjects.length > 0 && examStats.length >= 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📚 Subject-wise Performance Trends</p>
          <p className="text-xs text-gray-400 mb-4">Individual subject averages across all exam periods</p>
          <div style={{ height:260 }}>
            <Line data={subjectTrend} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', labels:{ font:{ size:10 }, usePointStyle:true } } }, scales:{ y:{ beginAtZero:false, min:0, max:100, grid:{ color:'#f8fafc' }, ticks:{ callback:(v:any)=>`${v}%` } }, x:{ grid:{ display:false }, ticks:{ font:{ size:10 } } } }, spanGaps:true }} />
          </div>
        </div>
      )}

      {/* COMPARISON TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exam-by-Exam Comparison Table</p>
          <div className="flex gap-2 no-print">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"><FiDownload size={11}/>CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><FiPrinter size={11}/>Print PDF</button>
          </div>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading trend data…</div>
          : comparisonTable.length === 0 ? (
            <div className="p-10 text-center text-gray-400"><p className="text-4xl mb-3">📆</p><p className="font-bold">No exam data</p><p className="text-sm">Record marks for multiple exams to see trends</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Exam','Year','Avg Score','Pass Rate','Grade A%','Grade E%','Records','Trend'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparisonTable.map((ex, i) => {
                    const prev = comparisonTable[i-1];
                    const diff = prev ? Math.round((ex.avg - prev.avg) * 10) / 10 : null;
                    return (
                      <tr key={ex.id} className={`hover:bg-gray-50 transition-colors ${ex.id === best?.id ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                          {ex.id === best?.id && <span className="mr-1">🏆</span>}{ex.exam_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{ex.year || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2"><div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${Math.min(100,ex.avg)}%`, background:'#6366f1' }} /></div><span className="font-black text-gray-800">{ex.avg}%</span></div>
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color:ex.passRate>=50?'#059669':'#dc2626' }}>{ex.passRate}%</td>
                        <td className="px-4 py-3 font-bold text-amber-600">{ex.gradeAp}%</td>
                        <td className="px-4 py-3 font-bold text-red-500">{ex.gradeEp}%</td>
                        <td className="px-4 py-3 text-gray-500 text-center">{ex.total.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {diff === null ? <FiMinus className="text-gray-300" size={14}/>
                            : diff > 0 ? <span className="flex items-center gap-1 text-xs font-bold text-green-600"><FiTrendingUp size={12}/>+{diff}%</span>
                            : <span className="flex items-center gap-1 text-xs font-bold text-red-500"><FiTrendingDown size={12}/>{diff}%</span>}
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
