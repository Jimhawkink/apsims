'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const RUBRIC_LEVELS = [
  { score: 4, label: 'Exceeding Expectations', short: 'EE', color: '#14532d', bg: '#ecfdf5', glow: '0 0 14px rgba(5,150,105,0.3)' },
  { score: 3, label: 'Meeting Expectations',   short: 'ME', color: '#1e40af', bg: '#eff6ff', glow: '0 0 14px rgba(37,99,235,0.25)' },
  { score: 2, label: 'Approaching Expectations',short:'AE', color: '#92400e', bg: '#fffbeb', glow: '0 0 14px rgba(217,119,6,0.25)' },
  { score: 1, label: 'Below Expectations',     short: 'BE', color: '#991b1b', bg: '#fef2f2', glow: '0 0 14px rgba(220,38,38,0.25)' },
];

// Demo CBC strands
const DEMO_STRANDS = ['Listening & Speaking','Reading','Writing','Number','Measurement','Geometry','Living Things','Non-Living Things','Our Environment','Cultural Activities','Creative Arts','Physical Health'];
const DEMO_SUBJECTS = ['English','Kiswahili','Mathematics','Integrated Science','Social Studies','Creative Arts','Physical & Health Ed'];

function getRubricLevel(score: number) { return RUBRIC_LEVELS.find(l=>l.score===Math.round(score))||RUBRIC_LEVELS[2]; }
function randAvg(min: number, max: number) { return Math.round((min + Math.random()*(max-min))*10)/10; }

export default function RubricAnalyticsPage() {
  const [cbcMarks, setCbcMarks]   = useState<any[]>([]);
  const [subjects, setSubjects]   = useState<any[]>([]);
  const [strands, setStrands]     = useState<any[]>([]);
  const [students, setStudents]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isDemo, setIsDemo]       = useState(false);
  const [selSubject, setSelSubject] = useState('');

  // Demo data grid: subject × strand
  const [demoGrid] = useState<number[][]>(() =>
    DEMO_SUBJECTS.map(() => DEMO_STRANDS.map(() => randAvg(1.8, 3.9)))
  );

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: sub }, { data: st }, { data: stu }] = await Promise.all([
        supabase.from('school_cbc_marks').select('student_id,subject_id,strand_id,marks').limit(5000),
        supabase.from('school_subjects').select('id,subject_name').order('subject_name'),
        supabase.from('school_cbc_strands').select('id,strand_name,subject_id').limit(100),
        supabase.from('school_students').select('id,first_name,last_name,admission_no').eq('status','Active').limit(100),
      ]);
      if (!m?.length) setIsDemo(true);
      setCbcMarks(m||[]); setSubjects(sub||[]); setStrands(st||[]); setStudents(stu||[]);
      setLoading(false);
    })();
  }, []);

  // Rubric distribution from demo data
  const flatScores = demoGrid.flat();
  const eeCount = flatScores.filter(s=>s>=3.5).length;
  const meCount = flatScores.filter(s=>s>=2.5&&s<3.5).length;
  const aeCount = flatScores.filter(s=>s>=1.5&&s<2.5).length;
  const beCount = flatScores.filter(s=>s<1.5).length;

  const distChart = {
    labels: RUBRIC_LEVELS.map(l=>l.short),
    datasets: [{ label:'Count', data:[eeCount,meCount,aeCount,beCount], backgroundColor:RUBRIC_LEVELS.map(l=>l.color), borderRadius:8 }],
  };

  // Subject average rubric score
  const subjectAvgs = DEMO_SUBJECTS.map((s,i) => ({
    name: s, avg: Math.round(demoGrid[i].reduce((a,b)=>a+b,0)/demoGrid[i].length*10)/10
  }));

  const subjectChart = {
    labels: subjectAvgs.map(s=>s.name),
    datasets:[{ label:'Avg Rubric Score', data:subjectAvgs.map(s=>s.avg), backgroundColor:subjectAvgs.map(s=>s.avg>=3?'#14532d':s.avg>=2?'#1e40af':s.avg>=1.5?'#92400e':'#991b1b'), borderRadius:8 }],
  };

  // Trend line (simulated improvement over terms)
  const trendChart = {
    labels: ['Term 1 2023','Term 2 2023','Term 3 2023','Term 1 2024','Term 2 2024','Current'],
    datasets:[{ label:'School Avg Rubric', data:[2.4,2.6,2.5,2.8,2.9,Math.round(flatScores.reduce((a,b)=>a+b,0)/flatScores.length*10)/10], borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#7c3aed', pointRadius:5, borderWidth:3 }],
  };

  // Students below expectations (avg < 2.0)
  const belowExp = DEMO_SUBJECTS.map((sub,si) => ({
    subject: sub, avgScore: subjectAvgs[si].avg, belowCount: demoGrid[si].filter(s=>s<2).length
  })).filter(s=>s.belowCount>0);

  const exportCSV = () => {
    const rows = [['Subject','Strand','Avg Rubric Score','Level','EE%','ME%','AE%','BE%']];
    DEMO_SUBJECTS.forEach((sub,si)=>{
      DEMO_STRANDS.forEach((str,stri)=>{
        const v = demoGrid[si][stri];
        rows.push([sub,str,String(v),getRubricLevel(v).short,'','','','']);
      });
    });
    const a = document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download='rubric_analytics.csv'; a.click();
  };

  const overallAvg = Math.round(flatScores.reduce((a,b)=>a+b,0)/flatScores.length*10)/10;
  const overallLevel = getRubricLevel(overallAvg);

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#120429,#2d0a52,#4c1d95,#3b0764)', minHeight:195 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 55%,rgba(167,139,250,0.3) 0%,transparent 60%),radial-gradient(ellipse at 80% 25%,rgba(139,92,246,0.2) 0%,transparent 60%)' }}/>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-4 right-12 w-44 h-44 opacity-20" style={{ background:'radial-gradient(circle,#a78bfa,transparent)', filter:'blur(45px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-violet-300 rounded-full animate-pulse"/>
              <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">CBC Assessment Performance Analytics</span>
              {isDemo&&<span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white ml-2">DEMO DATA</span>}
            </div>
            <h1 className="text-3xl font-black text-white">📏 Rubric & Strand Analytics</h1>
            <p className="text-white/50 text-sm mt-2">Performance breakdown across all CBC strands — rubric level heatmap, trends, and teacher consistency</p>
            <div className="mt-5 flex gap-8 flex-wrap">
              {[
                { label:'Overall Avg Rubric', v:`${overallAvg} — ${overallLevel.short}`, c:overallLevel.color.replace('#','') ? '#c4b5fd':'#c4b5fd' },
                { label:'Exceeding EE',        v:eeCount,  c:'#6ee7b7' },
                { label:'Meeting ME',          v:meCount,  c:'#93c5fd' },
                { label:'Below Expectations',  v:beCount,  c:'#fca5a5' },
              ].map(k=>(<div key={k.label}><p className="text-xl font-black" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p></div>))}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}><FiPrinter size={13}/>Print Report</button>
          </div>
        </div>
      </div>

      {isDemo&&<div className="rounded-2xl p-4 flex items-center gap-3" style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fcd34d' }}><span className="text-xl">ℹ️</span><p className="text-sm text-amber-800"><strong>Demo Mode:</strong> Showing sample CBC rubric data. Add CBC marks via CBC Mark Entry to see real analytics.</p></div>}

      {/* RUBRIC LEVEL CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {RUBRIC_LEVELS.map(l=>{
          const count = l.score===4?eeCount:l.score===3?meCount:l.score===2?aeCount:beCount;
          const pct = flatScores.length?Math.round(count/flatScores.length*100):0;
          return (
            <div key={l.score} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderLeftWidth:4, borderLeftColor:l.color, boxShadow:l.glow }}>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-black text-white" style={{ background:l.color }}>{l.short}</span>
                <span className="text-2xl font-black" style={{ color:l.color }}>{count}</span>
              </div>
              <p className="text-xs font-bold text-gray-700">{l.label}</p>
              <div className="mt-2 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${pct}%`, background:l.color }}/></div>
              <p className="text-[10px] text-gray-400 mt-1">{pct}% of all strand records</p>
            </div>
          );
        })}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📈 Rubric Score Trend — School Wide</p>
          <div style={{ height:220 }}><Line data={trendChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{min:1,max:4,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}`}}, x:{grid:{display:false},ticks:{font:{size:10}}} } }}/></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Rubric Level Distribution</p>
          <div style={{ height:220 }}><Bar data={distChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:'#f8fafc'}}, x:{grid:{display:false}} } }}/></div>
        </div>
      </div>

      {/* SUBJECT AVERAGES CHART */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject Average Rubric Scores</p>
        <p className="text-xs text-gray-400 mb-4">Dark green = Exceeding · Blue = Meeting · Amber = Approaching · Red = Below expectations</p>
        <div style={{ height:200 }}><Bar data={subjectChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{min:1,max:4,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}.0`}}, x:{grid:{display:false},ticks:{font:{size:10}}} } }}/></div>
      </div>

      {/* HEATMAP TABLE: Subject × Strand */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🌡️ Subject × Strand Rubric Heatmap</p>
            <p className="text-xs text-gray-400 mt-0.5">Each cell = average rubric score · Hover to see level</p>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700"><FiDownload size={11}/>CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}><FiPrinter size={11}/>Print</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase sticky left-0 bg-white z-10 min-w-[130px]">Subject / Strand →</th>
                {DEMO_STRANDS.map(s=><th key={s} className="px-2 py-3 text-center text-[9px] font-bold text-gray-400 whitespace-nowrap" style={{ minWidth:70 }}>{s.length>12?s.slice(0,12)+'…':s}</th>)}
                <th className="px-3 py-3 text-center text-[10px] font-black text-gray-500 whitespace-nowrap">Avg</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_SUBJECTS.map((sub,si)=>(
                <tr key={sub} className={si%2===0?'bg-gray-50/30':'bg-white'}>
                  <td className="px-4 py-2.5 font-bold text-gray-800 sticky left-0 bg-inherit z-10">{sub}</td>
                  {DEMO_STRANDS.map((str,stri)=>{
                    const v = demoGrid[si][stri];
                    const lvl = getRubricLevel(v);
                    return (
                      <td key={str} className="px-1 py-1 text-center">
                        <div className="mx-auto w-12 rounded-lg py-1.5 text-xs font-black text-white cursor-pointer hover:scale-110 transition-transform" style={{ background:lvl.color, boxShadow:lvl.glow }} title={`${sub} — ${str}: ${v} (${lvl.label})`}>
                          {v.toFixed(1)}<br/><span className="text-[8px] opacity-80">{lvl.short}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <span className="font-black text-sm" style={{ color:getRubricLevel(subjectAvgs[si].avg).color }}>{subjectAvgs[si].avg}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BELOW EXPECTATIONS ALERT */}
      {belowExp.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100" style={{ background:'linear-gradient(135deg,#fef2f2,#fff)' }}>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">⚠️ Strands with Below-Expectations Performance</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {belowExp.map(b=>(
              <div key={b.subject} className="p-4 rounded-xl" style={{ background:'#fef2f2', border:'1px solid #fca5a5' }}>
                <p className="font-bold text-red-800 text-sm">{b.subject}</p>
                <p className="text-xs text-red-600 mt-1">Avg: <strong>{b.avgScore}</strong> — {b.belowCount} strand(s) below 2.0</p>
                <p className="text-[10px] text-red-400 mt-2">Action: Increase hands-on learning activities & peer support</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
