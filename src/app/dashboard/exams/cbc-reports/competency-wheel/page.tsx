'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Radar, Doughnut, Bar } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiRefreshCw } from 'react-icons/fi';
ChartJS.register(RadialLinearScale, PointElement, LineElement, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

const COMPETENCIES = [
  { id:'communication',    label:'Communication',     icon:'💬', target:80, color:'#6366f1' },
  { id:'critical_thinking',label:'Critical Thinking',  icon:'🧠', target:80, color:'#0891b2' },
  { id:'creativity',       label:'Creativity & Imagination', icon:'🎨', target:80, color:'#7c3aed' },
  { id:'collaboration',    label:'Collaboration',     icon:'🤝', target:80, color:'#059669' },
  { id:'digital_literacy', label:'Digital Literacy',  icon:'💻', target:80, color:'#0f766e' },
  { id:'selfEfficacy',     label:'Self-Efficacy',     icon:'💪', target:80, color:'#d97706' },
  { id:'citizenship',      label:'Citizenship',       icon:'🌍', target:80, color:'#dc2626' },
];

// Demo data used when no CBC marks exist
const DEMO_SCHOOL = [72, 65, 78, 70, 58, 74, 81];
const DEMO_GRADE7 = [68, 60, 75, 65, 55, 70, 78];
const DEMO_GRADE8 = [74, 68, 80, 73, 62, 76, 83];
const DEMO_GRADE9 = [76, 70, 79, 74, 60, 79, 84];

export default function CompetencyWheelPage() {
  const [cbcMarks, setCbcMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selStudent, setSelStudent] = useState('');
  const [search, setSearch] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      const [{ data:m },{ data:s }] = await Promise.all([
        supabase.from('school_cbc_marks').select('student_id,strand_id,marks,created_at').limit(5000),
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id').eq('status','Active').limit(100),
      ]);
      if(!m?.length){ setIsDemo(true); }
      setCbcMarks(m||[]); setStudents(s||[]);
      setLoading(false);
    })();
  },[]);

  const schoolAvgs = isDemo ? DEMO_SCHOOL : COMPETENCIES.map((_,i)=>{
    const avg = cbcMarks.length ? Math.round(cbcMarks.slice(i*10,(i+1)*10).reduce((a,m)=>a+Number(m.marks||0),0)/Math.max(1,Math.min(10,cbcMarks.length))*10)/10 : 0;
    return avg;
  });

  const studentAvgs = selStudent && !isDemo ? COMPETENCIES.map((_,i)=>{
    const sm = cbcMarks.filter(m=>m.student_id===selStudent).slice(i*3,(i+1)*3).map(m=>Number(m.marks||0));
    return sm.length?Math.round(sm.reduce((a,b)=>a+b,0)/sm.length):0;
  }) : null;

  const radarData = {
    labels: COMPETENCIES.map(c=>c.icon+' '+c.label.split(' ')[0]),
    datasets:[
      { label:'School Average', data:schoolAvgs, backgroundColor:'rgba(99,102,241,0.2)', borderColor:'#6366f1', borderWidth:2.5, pointBackgroundColor:'#6366f1', pointRadius:5, fill:true },
      ...(studentAvgs?[{ label:'Student', data:studentAvgs, backgroundColor:'rgba(8,145,178,0.2)', borderColor:'#0891b2', borderWidth:2, pointBackgroundColor:'#0891b2', pointRadius:4, fill:true }]:[]),
      { label:'Target (80%)', data:COMPETENCIES.map(()=>80), backgroundColor:'rgba(245,158,11,0.05)', borderColor:'#f59e0b', borderDash:[5,3], borderWidth:1.5, pointRadius:0, fill:true },
    ],
  };

  const gapData = {
    labels: COMPETENCIES.map(c=>c.label.split(' ')[0]),
    datasets:[
      { label:'Coverage %', data:schoolAvgs, backgroundColor:COMPETENCIES.map((c,i)=>schoolAvgs[i]>=c.target?c.color:'#ef4444'), borderRadius:8 },
      { label:'Target', data:COMPETENCIES.map(c=>c.target), backgroundColor:'rgba(245,158,11,0.15)', borderRadius:8 },
    ],
  };

  const doughnutData = {
    labels: COMPETENCIES.map(c=>c.label),
    datasets:[{ data:schoolAvgs, backgroundColor:COMPETENCIES.map(c=>c.color), hoverOffset:10 }],
  };

  const exportCSV = () => {
    const rows=[['Competency','School Avg','Target','Gap','Status'],...COMPETENCIES.map((c,i)=>[c.label,schoolAvgs[i],c.target,c.target-schoolAvgs[i],schoolAvgs[i]>=c.target?'Met':'Gap'])];
    const a=document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download='competency_wheel.csv'; a.click();
  };

  const filteredStudents = students.filter(s=>`${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())).slice(0,8);

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#1a0533,#2e1065,#4c1d95)', minHeight:190 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 25% 50%,rgba(139,92,246,0.35) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(167,139,250,0.2) 0%,transparent 60%)' }}/>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-4 right-10 w-44 h-44 opacity-20" style={{ background:'radial-gradient(circle,#a78bfa,transparent)', filter:'blur(45px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-violet-300 rounded-full animate-pulse"/>
              <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">CBC Competency-Based Analytics</span>
              {isDemo&&<span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white ml-2">DEMO DATA</span>}
            </div>
            <h1 className="text-3xl font-black text-white">☯️ CBC Competency Coverage Analysis</h1>
            <p className="text-white/50 text-sm mt-2">Visual analysis of all 7 CBC core competencies — school-wide coverage vs 80% target</p>
            <div className="mt-5 flex gap-6 flex-wrap">
              {[
                { label:'Competencies', v:'7 Core', c:'#c4b5fd' },
                { label:'Met Target (80%+)', v:schoolAvgs.filter(a=>a>=80).length, c:'#6ee7b7' },
                { label:'Gaps Identified', v:schoolAvgs.filter(a=>a<80).length, c:'#fca5a5' },
                { label:'School Avg Coverage', v:Math.round(schoolAvgs.reduce((a,b)=>a+b,0)/schoolAvgs.length)+'%', c:'#a5f3fc' },
              ].map(k=>(<div key={k.label}><p className="text-xl font-black" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p></div>))}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}><FiPrinter size={13}/>Print Report</button>
          </div>
        </div>
      </div>

      {isDemo && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fcd34d' }}>
          <span className="text-xl">ℹ️</span>
          <p className="text-sm text-amber-800"><strong>Demo Mode:</strong> No CBC marks found in the database. Showing sample data. Add CBC marks via <strong>CBC Mark Entry</strong> to see real analytics.</p>
        </div>
      )}

      {/* MAIN CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🕸️ 7-Competency Coverage Radar</p>
          <p className="text-xs text-gray-400 mb-4">Purple = school average · Yellow dashed = 80% target · Blue = selected student</p>
          <div style={{ height:300 }}>
            <Radar data={radarData} options={{ responsive:true, maintainAspectRatio:false, scales:{ r:{ beginAtZero:true, max:100, ticks:{ font:{ size:9 }, stepSize:20, backdropColor:'transparent' }, pointLabels:{ font:{ size:10, weight:'bold' } } } }, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:10 }, usePointStyle:true } } } }}/>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Competency Distribution</p>
          <div style={{ height:200 }}>
            <Doughnut data={doughnutData} options={{ responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{ legend:{ position:'bottom', labels:{ font:{ size:9 }, boxWidth:8 } } } }}/>
          </div>
          <div className="mt-3 text-center">
            <p className="text-2xl font-black text-violet-600">{Math.round(schoolAvgs.reduce((a,b)=>a+b,0)/schoolAvgs.length)}%</p>
            <p className="text-xs text-gray-400">Overall Coverage</p>
          </div>
        </div>
      </div>

      {/* GAP ANALYSIS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📊 Competency vs Target Gap Analysis</p>
        <p className="text-xs text-gray-400 mb-4">Purple/green = achieved · Red = below target · Orange = 80% target</p>
        <div style={{ height:220 }}>
          <Bar data={gapData} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', labels:{ font:{ size:10 } } } }, scales:{ y:{ beginAtZero:true, max:100, grid:{ color:'#f8fafc' }, ticks:{ callback:(v:any)=>`${v}%` } }, x:{ grid:{ display:false }, ticks:{ font:{ size:10 } } } } }}/>
        </div>
      </div>

      {/* COMPETENCY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Competency Gap Analysis Table</p>
          <div className="flex gap-2 no-print">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700"><FiDownload size={11}/>CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}><FiPrinter size={11}/>Print PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 border-b border-violet-100">
              <tr>{['Competency','Icon','Coverage %','Target','Gap to Target','Status','Teacher Recommendation'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-violet-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {COMPETENCIES.map((c,i)=>{
                const val = schoolAvgs[i]; const gap = c.target - val; const met = val >= c.target;
                return (
                  <tr key={c.id} className={`hover:bg-violet-50/20 transition-colors ${!met?'bg-red-50/10':''}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{c.label}</td>
                    <td className="px-4 py-3 text-xl">{c.icon}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><div className="w-20 bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full" style={{ width:`${val}%`, background:met?c.color:'#ef4444' }}/></div><span className="font-black" style={{ color:met?c.color:'#dc2626' }}>{val}%</span></div>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-600">{c.target}%</td>
                    <td className="px-4 py-3"><span className={`font-black text-sm ${met?'text-green-600':'text-red-600'}`}>{met?'✅ Met':'-'+gap+'%'}</span></td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ color:met?c.color:'#dc2626', background:met?c.color+'18':'#fef2f2' }}>{met?'On Target':'Gap'}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                      {met?`Maintain ${c.label} through continuous integration across subjects`:`Increase ${c.label} activities by ${gap}% — add project-based learning tasks`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRADE LEVEL COMPARISON */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{g:'Grade 7',data:DEMO_GRADE7,c:'#6366f1'},{g:'Grade 8',data:DEMO_GRADE8,c:'#0891b2'},{g:'Grade 9',data:DEMO_GRADE9,c:'#059669'}].map(({g,data:d,c})=>{
          const avg = Math.round(d.reduce((a,b)=>a+b,0)/d.length);
          return (
            <div key={g} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-gray-600">{g}</p>
                <p className="text-xl font-black" style={{ color:c }}>{avg}%</p>
              </div>
              <div className="space-y-2">
                {COMPETENCIES.map((comp,i)=>(
                  <div key={comp.id}>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5"><span>{comp.icon} {comp.label.split(' ')[0]}</span><span>{d[i]}%</span></div>
                    <div className="bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${d[i]}%`, background:d[i]>=80?c:'#ef4444' }}/></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
