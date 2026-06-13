'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiPrinter, FiDownload } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function stdDev(arr: number[]) { if(!arr.length)return 0; const m=arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/arr.length); }

export default function SubjectDifficultyPage() {
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'difficulty'|'avg'|'name'>('difficulty');

  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: marks }] = await Promise.all([
        supabase.from('school_subjects').select('id,subject_name').order('subject_name'),
        supabase.from('school_exam_marks').select('subject_id,marks').limit(10000),
      ]);
      const stats = (subs||[]).map((s:any) => {
        const sm = (marks||[]).filter((m:any)=>m.subject_id===s.id).map((m:any)=>Number(m.marks||0));
        if (!sm.length) return null;
        const avg = sm.reduce((a:number,b:number)=>a+b,0)/sm.length;
        const pass = sm.filter((m:number)=>m>=50).length;
        const passRate = Math.round((pass/sm.length)*100);
        const di = 100 - passRate; // difficulty index
        const sd = Math.round(stdDev(sm)*10)/10;
        const disc = sm.length>0 ? Math.round((sd/avg)*100)/100 : 0; // discrimination index
        const cat = di>=70?'Very Hard':di>=50?'Hard':di>=30?'Moderate':di>=10?'Easy':'Very Easy';
        const catColor = di>=70?'#7f1d1d':di>=50?'#9a3412':di>=30?'#92400e':di>=10?'#14532d':'#052e16';
        const catBg = di>=70?'#fef2f2':di>=50?'#fff7ed':di>=30?'#fffbeb':di>=10?'#f0fdf4':'#ecfdf5';
        return { ...s, avg:Math.round(avg*10)/10, passRate, di, sd, disc, cat, catColor, catBg, count:sm.length };
      }).filter(Boolean);
      setSubjectStats(stats as any[]);
      setLoading(false);
    })();
  }, []);

  let sorted = [...subjectStats];
  if (sort==='difficulty') sorted = sorted.sort((a,b)=>b.di-a.di);
  if (sort==='avg')        sorted = sorted.sort((a,b)=>a.avg-b.avg);
  if (sort==='name')       sorted = sorted.sort((a,b)=>a.subject_name.localeCompare(b.subject_name));

  const chartData = {
    labels: sorted.map(s=>s.subject_name.length>12?s.subject_name.slice(0,12)+'…':s.subject_name),
    datasets:[
      { label:'Difficulty Index (100-Pass%)', data:sorted.map(s=>s.di), backgroundColor:sorted.map(s=>s.catColor), borderRadius:8 },
    ],
  };

  const passChart = {
    labels: sorted.map(s=>s.subject_name.length>12?s.subject_name.slice(0,12)+'…':s.subject_name),
    datasets:[
      { label:'Pass Rate %', data:sorted.map(s=>s.passRate), backgroundColor:sorted.map(s=>s.passRate>=50?'#059669':'#dc2626'), borderRadius:8 },
    ],
  };

  const exportCSV = () => {
    const rows=[['Subject','Avg Score','Pass Rate%','Difficulty Index','Category','Std Dev','Count'],...sorted.map(s=>[s.subject_name,s.avg,s.passRate,s.di,s.cat,s.sd,s.count])];
    const a=document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download='subject_difficulty.csv'; a.click();
  };

  const hardest = sorted[0];
  const easiest = [...sorted].sort((a,b)=>a.di-b.di)[0];

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#1c0a00,#431407,#7c2d12)', minHeight:185 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 25% 50%,rgba(234,88,12,0.3) 0%,transparent 65%)' }}/>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-6 right-10 w-36 h-36 opacity-20" style={{ background:'radial-gradient(circle,#fb923c,transparent)', filter:'blur(35px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 bg-orange-300 rounded-full animate-pulse"/><span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Curriculum Difficulty Analysis</span></div>
            <h1 className="text-3xl font-black text-white">📊 Subject Difficulty Index</h1>
            <p className="text-white/50 text-sm mt-2">Rank subjects by difficulty — guide resource allocation and support programs</p>
            <div className="mt-5 flex gap-8 flex-wrap">
              {[
                { label:'Subjects Analyzed', v:subjectStats.length, c:'#fed7aa' },
                { label:'Hardest Subject',   v:hardest?.subject_name||'—', c:'#fca5a5' },
                { label:'Easiest Subject',   v:easiest?.subject_name||'—', c:'#a7f3d0' },
                { label:'Avg Difficulty',    v:subjectStats.length?Math.round(subjectStats.reduce((a,s)=>a+s.di,0)/subjectStats.length)+'%':'—', c:'#fde68a' },
              ].map(k=>(<div key={k.label}><p className="text-lg font-black" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p></div>))}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiPrinter size={13}/>Print PDF</button>
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Difficulty Legend:</p>
        {[['Very Hard','#7f1d1d','#fef2f2'],['Hard','#9a3412','#fff7ed'],['Moderate','#92400e','#fffbeb'],['Easy','#14532d','#f0fdf4'],['Very Easy','#052e16','#ecfdf5']].map(([l,c,bg])=>(
          <span key={l} className="px-3 py-1 rounded-full text-xs font-bold" style={{ color:c, background:bg }}>{l}</span>
        ))}
        <div className="ml-auto flex gap-2">
          {(['difficulty','avg','name'] as const).map(v=>(
            <button key={v} onClick={()=>setSort(v)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${sort===v?'bg-orange-600 text-white':'bg-gray-100 text-gray-600'}`}>
              {v==='difficulty'?'By Hardest':v==='avg'?'By Avg Score':'By Name'}
            </button>
          ))}
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Difficulty Index (Hardest → Easiest)</p>
          <p className="text-xs text-gray-400 mb-4">Higher bar = harder subject · Calculated from fail rate</p>
          <div style={{ height:240 }}>
            {sorted.length>0?<Bar data={chartData} options={{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true,max:100,grid:{color:'#f8fafc'}}, y:{grid:{display:false},ticks:{font:{size:10}}} } }}/>
              :<div className="flex items-center justify-center h-full text-gray-400">No data</div>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pass Rate by Subject</p>
          <p className="text-xs text-gray-400 mb-4">Green = above 50% · Red = below pass threshold</p>
          <div style={{ height:240 }}>
            {sorted.length>0?<Bar data={passChart} options={{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true,max:100,grid:{color:'#f8fafc'}}, y:{grid:{display:false},ticks:{font:{size:10}}} } }}/>
              :<div className="flex items-center justify-center h-full text-gray-400">No data</div>}
          </div>
        </div>
      </div>

      {/* DETAIL TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Difficulty Analytics Table</p>
          <div className="flex gap-2 no-print">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700"><FiDownload size={11}/>CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#ea580c,#dc2626)' }}><FiPrinter size={11}/>Print PDF</button>
          </div>
        </div>
        {loading?<div className="p-8 text-center text-gray-400">Calculating difficulty indices…</div>
          :sorted.length===0?<div className="p-8 text-center text-gray-400"><p className="text-4xl mb-3">📊</p><p className="font-bold">No subject marks data</p></div>
          :(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Rank','Subject','Avg Score','Pass Rate','Difficulty Index','Std Dev','Category','Recommendation'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((s,i)=>(
                    <tr key={s.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="px-4 py-3 font-black text-gray-400">#{i+1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{s.subject_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2"><div className="w-14 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${Math.min(100,s.avg)}%`, background:s.catColor }} /></div><span className="font-black text-gray-800">{s.avg}%</span></div>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color:s.passRate>=50?'#059669':'#dc2626' }}>{s.passRate}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width:`${s.di}%`, background:s.catColor }} /></div>
                          <span className="font-black" style={{ color:s.catColor }}>{s.di}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{s.sd}%</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap" style={{ color:s.catColor, background:s.catBg }}>{s.cat}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                        {s.di>=70?'Urgent: increase teaching hours & remedial support'
                          :s.di>=50?'Assign best teacher, review assessment approach'
                          :s.di>=30?'Monitor closely, targeted revision sessions'
                          :'Maintain standards, use as confidence builder'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
