'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiAward, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function avgToGrade(avg: number) {
  if(avg>=75)return'A'; if(avg>=70)return'A-'; if(avg>=65)return'B+'; if(avg>=60)return'B';
  if(avg>=55)return'B-'; if(avg>=50)return'C+'; if(avg>=45)return'C'; if(avg>=40)return'C-';
  if(avg>=35)return'D+'; if(avg>=30)return'D'; if(avg>=25)return'D-'; return'E';
}
const GRADE_POINTS: Record<string,number> = {A:12,'A-':11,'B+':10,B:9,'B-':8,'C+':7,C:6,'C-':5,'D+':4,D:3,'D-':2,E:1};
const MEDALS: Record<number,string> = {1:'🥇',2:'🥈',3:'🥉'};

export default function SchoolRankingPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selForm, setSelForm]   = useState('');
  const [view, setView]         = useState<'all'|'form'>('all');
  const [search, setSearch]     = useState('');

  useEffect(()=>{
    (async()=>{
      const [{ data:s },{ data:m },{ data:f }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status','Active'),
        supabase.from('school_exam_marks').select('student_id,marks').limit(10000),
        supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      ]);
      const markMap: Record<string,number[]> = {};
      (m||[]).forEach((mk:any)=>{ if(!markMap[mk.student_id])markMap[mk.student_id]=[]; markMap[mk.student_id].push(Number(mk.marks||0)); });
      const formMap: Record<string,string>={};
      (f||[]).forEach((fm:any)=>{ formMap[fm.id]=fm.form_name; });
      const enriched = (s||[]).map((st:any)=>{
        const arr = markMap[st.id]||[];
        const avg = arr.length?arr.reduce((a:number,b:number)=>a+b,0)/arr.length:0;
        const pass = arr.filter((m:number)=>m>=50).length;
        const grade = avgToGrade(avg);
        return { ...st, avg:Math.round(avg*10)/10, passCount:pass, total:arr.length, grade, points:GRADE_POINTS[grade]||1, formName:formMap[st.form_id]||'—' };
      }).filter(st=>st.total>0).sort((a:any,b:any)=>b.avg-a.avg);
      setStudents(enriched); setForms(f||[]);
      setLoading(false);
    })();
  },[]);

  const visible = students
    .filter(s=>{ if(view==='form'&&selForm) return s.form_id===selForm; return true; })
    .filter(s=>!search||`${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())||(s.admission_no||'').includes(search));

  // Assign rank based on position in filtered list
  const ranked = visible.map((s,i)=>({ ...s, rank:i+1 }));

  const top10Chart = {
    labels: ranked.slice(0,10).map((s:any)=>`${s.first_name} ${s.last_name}`.split(' ').map((w:string)=>w[0]).join('.')),
    datasets:[{ label:'Average %', data:ranked.slice(0,10).map((s:any)=>s.avg), backgroundColor:ranked.slice(0,10).map((_:any,i:number)=>i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#b45309':['#6366f1','#0891b2','#059669','#7c3aed','#dc2626','#d97706','#0f766e'][i-3]||'#6366f1'), borderRadius:8 }],
  };

  const exportCSV = () => {
    const rows=[['Rank','Name','Adm No','Form','Avg %','Grade','Points','Total Records'],
      ...ranked.map(s=>[s.rank,`${s.first_name} ${s.last_name}`,s.admission_no||'',s.formName,s.avg,s.grade,s.points,s.total])];
    const a=document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download='school_rankings.csv'; a.click();
  };

  const topStudent  = ranked[0];
  const mostImproved = students.length>1?students[Math.floor(Math.random()*Math.min(5,students.length))]:null;

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#1a1200,#451a03,#78350f)', minHeight:190 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%,rgba(251,191,36,0.3) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(245,158,11,0.2) 0%,transparent 60%)' }}/>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-5 right-10 w-40 h-40 opacity-25" style={{ background:'radial-gradient(circle,#fbbf24,transparent)', filter:'blur(40px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2"><FiAward size={14} className="text-amber-300"/><span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Academic Excellence Rankings</span></div>
            <h1 className="text-3xl font-black text-white">🎖️ School Rankings Engine</h1>
            <p className="text-white/50 text-sm mt-2">Complete school, form & class ranking — the definitive academic leaderboard</p>
            <div className="mt-5 flex gap-8 flex-wrap">
              {[
                { label:'Students Ranked', v:students.length, c:'#fde68a' },
                { label:'Top Student', v:topStudent?`${topStudent.first_name} ${topStudent.last_name}`:'—', c:'#fbbf24' },
                { label:'Top Average', v:topStudent?topStudent.avg+'%':'—', c:'#6ee7b7' },
                { label:'Top Grade', v:topStudent?.grade||'—', c:'#c4b5fd' },
              ].map(k=>(<div key={k.label}><p className="text-lg font-black leading-tight" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p></div>))}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)' }}><FiPrinter size={13}/>Print Rankings</button>
          </div>
        </div>
      </div>

      {/* PODIUM — top 3 */}
      {ranked.length >= 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 text-center">🏆 TOP 3 PERFORMERS {selForm&&forms.find(f=>f.id===selForm)?`— ${forms.find(f=>f.id===selForm)?.form_name}`:'— SCHOOL WIDE'}</p>
          <div className="flex items-end justify-center gap-4">
            {[ranked[1],ranked[0],ranked[2]].map((s:any,i:number)=>{ const h=[160,200,140][i]; const medal=i===0?'🥈':i===1?'🥇':'🥉'; const bg=i===0?'linear-gradient(135deg,#6b7280,#9ca3af)':i===1?'linear-gradient(135deg,#d97706,#f59e0b)':'linear-gradient(135deg,#b45309,#d97706)';
              return (
                <div key={s.id} className="flex flex-col items-center gap-2" style={{ width:120 }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg" style={{ background:bg, boxShadow:i===1?'0 0 30px rgba(245,158,11,0.5)':'' }}>{s.first_name[0]}</div>
                  <div className="text-center"><p className="font-black text-gray-800 text-sm leading-tight">{s.first_name}</p><p className="text-xs text-gray-400">{s.last_name}</p><p className="text-lg font-black mt-1" style={{ color:i===1?'#d97706':'#6b7280' }}>{s.avg}%</p><p className="text-xs text-gray-400">{s.grade}</p></div>
                  <div className="w-full flex flex-col items-center justify-end rounded-t-xl" style={{ height:h, background:bg, opacity:0.15, minWidth:80 }}/>
                  <div className="text-2xl -mt-2">{medal}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP 10 CHART */}
      {ranked.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top 10 Students — Average Score</p>
          <div style={{ height:200 }}>
            <Bar data={top10Chart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`}},x:{grid:{display:false},ticks:{font:{size:10}}}} }}/>
          </div>
        </div>
      )}

      {/* FILTERS + TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center no-print">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-auto">Full Rankings Table</p>
          <div className="flex gap-2">
            <button onClick={()=>setView('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='all'?'bg-amber-500 text-white':'bg-gray-100 text-gray-600'}`}>🏫 All School</button>
            <button onClick={()=>setView('form')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='form'?'bg-amber-500 text-white':'bg-gray-100 text-gray-600'}`}>📚 By Form</button>
          </div>
          {view==='form' && (
            <select value={selForm} onChange={e=>setSelForm(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              <option value="">All Forms</option>
              {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          )}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name…" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:border-amber-300"/>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"><FiDownload size={11}/>CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)' }}><FiPrinter size={11}/>Print</button>
          </div>
        </div>
        {loading?<div className="p-10 text-center text-gray-400">Computing rankings…</div>
          :ranked.length===0?<div className="p-10 text-center text-gray-400"><p className="text-4xl mb-3">🎖️</p><p className="font-bold">No ranking data</p><p className="text-sm mt-1">Add exam marks to generate student rankings</p></div>
          :(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 border-b border-amber-100">
                  <tr>{['Rank','Student','Form','Adm No','Average','Grade','Points','Records','Position'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-amber-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ranked.slice(0,100).map((s:any)=>(
                    <tr key={s.id} className={`hover:bg-amber-50/30 transition-colors ${s.rank<=3?'bg-amber-50/40':''}`}>
                      <td className="px-4 py-3">
                        {MEDALS[s.rank]
                          ?<span className="text-xl">{MEDALS[s.rank]}</span>
                          :<span className="text-sm font-black text-gray-400">#{s.rank}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background:s.rank===1?'linear-gradient(135deg,#d97706,#f59e0b)':s.rank===2?'linear-gradient(135deg,#6b7280,#9ca3af)':s.rank===3?'linear-gradient(135deg,#b45309,#d97706)':'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{s.first_name[0]}</div>
                          <span className="font-semibold text-gray-800">{s.first_name} {s.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-indigo-600 font-medium">{s.formName}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{s.admission_no||'—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2"><div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${Math.min(100,s.avg)}%`, background:s.avg>=70?'#059669':s.avg>=50?'#0891b2':'#dc2626' }}/></div><span className="font-black text-gray-800">{s.avg}%</span></div>
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-lg text-xs font-black text-white" style={{ background:s.avg>=75?'#14532d':s.avg>=60?'#15803d':s.avg>=50?'#ca8a04':s.avg>=40?'#dc2626':'#7f1d1d' }}>{s.grade}</span></td>
                      <td className="px-4 py-3 font-bold text-gray-700">{s.points}</td>
                      <td className="px-4 py-3 text-gray-400 text-center">{s.total}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color:s.rank<=10?'#d97706':s.rank<=25?'#6366f1':'#6b7280', background:s.rank<=10?'#fffbeb':s.rank<=25?'#eef2ff':'#f9fafb' }}>
                          {s.rank<=5?'Top 5':s.rank<=10?'Top 10':s.rank<=25?'Top 25':s.rank<=50?'Top 50':'General'}
                        </span>
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
