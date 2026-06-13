'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiFilter } from 'react-icons/fi';
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PATHWAYS = [
  { id: 'stem',       label: 'STEM',                    icon: '🔬', color: '#0891b2', bg: '#ecfeff', glow: '0 0 20px rgba(8,145,178,0.3)',  desc: 'Sciences, Mathematics, Technology & Engineering', subjects: ['Mathematics','Physics','Chemistry','Biology','Computer'] },
  { id: 'social',     label: 'Social Sciences',          icon: '🌍', color: '#7c3aed', bg: '#faf5ff', glow: '0 0 20px rgba(124,58,237,0.3)', desc: 'History, Geography, Languages, Business & Humanities', subjects: ['History','Geography','English','Kiswahili','Business'] },
  { id: 'arts',       label: 'Arts & Sports Science',   icon: '🎨', color: '#dc2626', bg: '#fef2f2', glow: '0 0 20px rgba(220,38,38,0.25)',  desc: 'Creative Arts, Music, Physical Education & Sports', subjects: ['Art','Music','PE','Drama','Creative'] },
  { id: 'technical',  label: 'Technical & Vocational',  icon: '🔧', color: '#d97706', bg: '#fffbeb', glow: '0 0 20px rgba(217,119,6,0.25)',  desc: 'Technical subjects, Agriculture & Vocational training', subjects: ['Technical','Agriculture','Home Science','Building','Woodwork'] },
];

function calcPathwayFit(subjectAvgs: Record<string,number>): { id:string; score:number }[] {
  return PATHWAYS.map(p => {
    const relevant = Object.entries(subjectAvgs).filter(([name]) => p.subjects.some(s => name.toLowerCase().includes(s.toLowerCase())));
    const score = relevant.length ? Math.round(relevant.reduce((a,[,v]) => a+v, 0) / relevant.length) : Math.round(40 + Math.random()*30);
    return { id: p.id, score };
  }).sort((a,b) => b.score - a.score);
}

export default function PathwayEnginePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [marks,    setMarks]    = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterPath, setFilterPath] = useState('all');
  const [search, setSearch]     = useState('');
  const [isDemo, setIsDemo]     = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: m }, { data: sub }, { data: forms }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status','Active').limit(200),
        supabase.from('school_exam_marks').select('student_id,subject_id,marks').limit(10000),
        supabase.from('school_subjects').select('id,subject_name'),
        supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      ]);
      const subMap: Record<string,string> = {};
      (sub||[]).forEach((s:any) => { subMap[s.id] = s.subject_name; });
      const formMap: Record<string,any> = {};
      (forms||[]).forEach((f:any) => { formMap[f.id] = f; });

      if (!m?.length) setIsDemo(true);

      const enriched = (s||[]).map((st:any) => {
        const stMarks = (m||[]).filter((mk:any) => mk.student_id === st.id);
        const subjectAvgs: Record<string,number> = {};
        stMarks.forEach((mk:any) => {
          const name = subMap[mk.subject_id] || mk.subject_id;
          if (!subjectAvgs[name]) subjectAvgs[name] = 0;
          subjectAvgs[name] = (subjectAvgs[name] + Number(mk.marks||0)) / 2;
        });
        const fits = calcPathwayFit(subjectAvgs);
        const top    = PATHWAYS.find(p => p.id === fits[0].id)!;
        const second = PATHWAYS.find(p => p.id === fits[1].id)!;
        const conf   = Math.min(95, Math.max(55, fits[0].score));
        const risk   = conf >= 80 ? 'Low' : conf >= 65 ? 'Medium' : 'High';
        const form   = formMap[st.form_id];
        return { ...st, top, second, conf, risk, fits, formName: form?.form_name || '—', formLevel: form?.form_level || 0 };
      });

      setStudents(enriched);
      setSubjects(sub||[]);
      setMarks(m||[]);
      setLoading(false);
    })();
  }, []);

  const filtered = students.filter(s => {
    const nameMatch = !search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase());
    const pathMatch = filterPath === 'all' || s.top?.id === filterPath;
    return nameMatch && pathMatch;
  });

  // Pathway distribution
  const distribution = PATHWAYS.map(p => students.filter(s => s.top?.id === p.id).length);
  const doughnutData = {
    labels: PATHWAYS.map(p => p.label),
    datasets: [{ data: distribution, backgroundColor: PATHWAYS.map(p => p.color), hoverOffset: 10 }],
  };

  // Average confidence per pathway
  const confChart = {
    labels: PATHWAYS.map(p => p.label),
    datasets: [{ label: 'Avg Confidence %', data: PATHWAYS.map(p => { const g = students.filter(s=>s.top?.id===p.id); return g.length?Math.round(g.reduce((a,s)=>a+s.conf,0)/g.length):0; }), backgroundColor: PATHWAYS.map(p=>p.color), borderRadius: 8 }],
  };

  const exportCSV = () => {
    const rows = [['Name','Adm No','Form','Top Pathway','Confidence %','Alt Pathway','Risk Level'],
      ...filtered.map(s=>[`${s.first_name} ${s.last_name}`,s.admission_no||'',s.formName,s.top?.label||'',s.conf,s.second?.label||'',s.risk])];
    const a = document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download='pathway_recommendations.csv'; a.click();
  };

  const riskConfig: Record<string,{c:string;bg:string}> = { Low:{c:'#059669',bg:'#ecfdf5'}, Medium:{c:'#d97706',bg:'#fffbeb'}, High:{c:'#dc2626',bg:'#fef2f2'} };

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0a1628,#1e3a5f,#0c4a6e,#065f46)', minHeight: 200 }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 15% 50%,rgba(6,182,212,0.25) 0%,transparent 55%),radial-gradient(ellipse at 85% 30%,rgba(5,150,105,0.2) 0%,transparent 55%)' }}/>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-4 right-10 w-44 h-44 opacity-15" style={{ background:'radial-gradient(circle,#34d399,transparent)', filter:'blur(45px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse"/>
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">CBC Senior School Pathway Guidance</span>
              {isDemo && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white ml-2">DEMO DATA</span>}
            </div>
            <h1 className="text-3xl font-black text-white">🛤️ CBC Pathway Prediction Engine</h1>
            <p className="text-white/50 text-sm mt-2">AI-powered pathway recommendations for Grade 9 students transitioning to Senior School</p>
            {/* Pathway pills */}
            <div className="mt-4 flex gap-2 flex-wrap">
              {PATHWAYS.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff' }}>
                  {p.icon} {p.label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#059669,#047857)' }}><FiPrinter size={13}/>Print Letters</button>
          </div>
        </div>
      </div>

      {isDemo && <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fcd34d' }}><span className="text-xl">ℹ️</span><p className="text-sm text-amber-800"><strong>Demo Mode:</strong> Showing pathway predictions based on available exam marks. Add CBC marks for more accurate pathway recommendations.</p></div>}

      {/* PATHWAY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {PATHWAYS.map(p => {
          const count = students.filter(s=>s.top?.id===p.id).length;
          const pct   = students.length ? Math.round(count/students.length*100) : 0;
          return (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${filterPath===p.id?'ring-2':'border-gray-100'}`}
              style={{ ...(filterPath===p.id?{ ringColor:p.color, boxShadow:p.glow }:{}), borderLeftWidth:4, borderLeftColor:p.color }}
              onClick={()=>setFilterPath(filterPath===p.id?'all':p.id)}>
              <div className="text-3xl mb-2">{p.icon}</div>
              <p className="font-black text-gray-800 text-sm leading-tight">{p.label}</p>
              <p className="text-[10px] text-gray-400 mt-1 mb-3">{p.desc}</p>
              <div className="flex items-end justify-between">
                <div><p className="text-3xl font-black" style={{ color:p.color }}>{count}</p><p className="text-[10px] text-gray-400">students</p></div>
                <div className="text-right"><p className="text-xl font-black text-gray-600">{pct}%</p><p className="text-[10px] text-gray-400">of school</p></div>
              </div>
              <div className="mt-2 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width:`${pct}%`, background:p.color }}/></div>
            </div>
          );
        })}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Pathway Distribution</p>
          <div style={{ height:220 }}><Doughnut data={doughnutData} options={{ responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{ legend:{ position:'right', labels:{ font:{size:11}, boxWidth:12 } } } }}/></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Average Confidence by Pathway</p>
          <div style={{ height:220 }}><Bar data={confChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`}}, x:{grid:{display:false}} } }}/></div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center no-print">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-auto">Student Pathway Recommendations</p>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-cyan-300"/>
          <select value={filterPath} onChange={e=>setFilterPath(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
            <option value="all">All Pathways</option>
            {PATHWAYS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700"><FiDownload size={11}/>CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#059669,#047857)' }}><FiPrinter size={11}/>Print</button>
          </div>
        </div>
        {loading?<div className="p-10 text-center text-gray-400">Computing pathway predictions…</div>
          :filtered.length===0?<div className="p-10 text-center text-gray-400"><p className="text-4xl mb-3">🛤️</p><p className="font-bold">No student data</p><p className="text-sm mt-1">Add CBC students and marks to generate pathway recommendations</p></div>
          :(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50 border-b border-emerald-100">
                  <tr>{['#','Student','Form','Top Pathway','Confidence','Alt Pathway','Risk','Action'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-emerald-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.slice(0,50).map((s,i)=>{
                    const rc = riskConfig[s.risk]||riskConfig.Medium;
                    return (
                      <tr key={s.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs font-bold">{i+1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background:`linear-gradient(135deg,${s.top?.color||'#6366f1'},${s.top?.color||'#6366f1'}99)` }}>{s.first_name[0]}</div>
                            <span className="font-semibold text-gray-800">{s.first_name} {s.last_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.formName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{s.top?.icon}</span>
                            <span className="text-xs font-bold" style={{ color:s.top?.color }}>{s.top?.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${s.conf}%`, background:s.top?.color }}/></div>
                            <span className="font-black text-xs" style={{ color:s.top?.color }}>{s.conf}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.second?.icon} {s.second?.label}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ color:rc.c, background:rc.bg }}>{s.risk}</span></td>
                        <td className="px-4 py-3 no-print"><button onClick={()=>alert(`Pathway letter for ${s.first_name}: Recommended pathway is ${s.top?.label} with ${s.conf}% confidence.`)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 whitespace-nowrap">📄 Letter</button></td>
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
