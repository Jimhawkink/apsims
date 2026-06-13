'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, RadialLinearScale, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { FiSearch, FiPrinter, FiDownload, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, RadialLinearScale, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

function pctRank(arr: number[], val: number) { return arr.length ? Math.round(arr.filter(x => x <= val).length / arr.length * 100) : 0; }

export default function PeerComparisonPage() {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selected, setSelected]       = useState<any | null>(null);
  const [search, setSearch]           = useState('');
  const [showDrop, setShowDrop]       = useState(false);
  const [marks, setMarks]             = useState<any[]>([]);
  const [subjects, setSubjects]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(()=>{
    (async()=>{
      const [{ data:s },{ data:m },{ data:sub }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status','Active').order('first_name').limit(200),
        supabase.from('school_exam_marks').select('student_id,subject_id,marks').limit(10000),
        supabase.from('school_subjects').select('id,subject_name').order('subject_name'),
      ]);
      setAllStudents(s||[]); setMarks(m||[]); setSubjects(sub||[]);
      setLoading(false);
    })();
  },[]);

  const filtered = allStudents.filter(s=>`${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())||(s.admission_no||'').includes(search)).slice(0,10);

  // Compute student avg overall and per subject
  const schoolAvgAll = marks.length ? marks.reduce((a,m)=>a+Number(m.marks||0),0)/marks.length : 0;
  const allStudentAvgs = allStudents.map(st=>{ const sm=marks.filter(m=>m.student_id===st.id).map(m=>Number(m.marks||0)); return sm.length?sm.reduce((a,b)=>a+b,0)/sm.length:0; });

  const studentData = selected ? (() => {
    const sm = marks.filter(m=>m.student_id===selected.id).map(m=>Number(m.marks||0));
    const avg = sm.length?sm.reduce((a,b)=>a+b,0)/sm.length:0;
    const pct = pctRank(allStudentAvgs, avg);
    const classMarks = marks.filter(m=>{ const st=allStudents.find(s=>s.id===m.student_id); return st?.form_id===selected.form_id; }).map(m=>Number(m.marks||0));
    const classAvg = classMarks.length?classMarks.reduce((a,b)=>a+b,0)/classMarks.length:0;

    // per-subject breakdown
    const subStats = subjects.map(s=>{
      const myMarks = marks.filter(m=>m.student_id===selected.id&&m.subject_id===s.id).map(m=>Number(m.marks||0));
      const classSubMarks = marks.filter(m=>{ const st=allStudents.find(st2=>st2.id===m.student_id); return st?.form_id===selected.form_id&&m.subject_id===s.id; }).map(m=>Number(m.marks||0));
      const schoolSubMarks = marks.filter(m=>m.subject_id===s.id).map(m=>Number(m.marks||0));
      const myAvg = myMarks.length?Math.round(myMarks.reduce((a,b)=>a+b,0)/myMarks.length):null;
      const classSubAvg = classSubMarks.length?Math.round(classSubMarks.reduce((a,b)=>a+b,0)/classSubMarks.length):0;
      const schoolSubAvg = schoolSubMarks.length?Math.round(schoolSubMarks.reduce((a,b)=>a+b,0)/schoolSubMarks.length):0;
      return { ...s, myAvg, classSubAvg, schoolSubAvg };
    }).filter(s=>s.myAvg!==null);

    // Position in school
    const sortedAvgs = [...allStudentAvgs].sort((a,b)=>b-a);
    const pos = sortedAvgs.findIndex(a=>Math.abs(a-avg)<0.1)+1;

    return { avg:Math.round(avg), pct, classAvg:Math.round(classAvg), schoolAvg:Math.round(schoolAvgAll), pos, total:allStudents.length, subStats };
  })() : null;

  const radarData = studentData && subjects.length ? {
    labels: studentData.subStats.slice(0,8).map((s:any)=>s.subject_name.length>10?s.subject_name.slice(0,10)+'…':s.subject_name),
    datasets:[
      { label:'Student', data:studentData.subStats.slice(0,8).map((s:any)=>s.myAvg||0), backgroundColor:'rgba(99,102,241,0.25)', borderColor:'#6366f1', borderWidth:2, pointBackgroundColor:'#6366f1', pointRadius:4 },
      { label:'Class Avg', data:studentData.subStats.slice(0,8).map((s:any)=>s.classSubAvg), backgroundColor:'rgba(8,145,178,0.1)', borderColor:'#0891b2', borderDash:[4,2], borderWidth:2, pointBackgroundColor:'#0891b2', pointRadius:3 },
      { label:'School Avg', data:studentData.subStats.slice(0,8).map((s:any)=>s.schoolSubAvg), backgroundColor:'rgba(245,158,11,0.1)', borderColor:'#f59e0b', borderDash:[6,3], borderWidth:1.5, pointBackgroundColor:'#f59e0b', pointRadius:2 },
    ],
  } : null;

  const barData = studentData ? {
    labels:['This Student','Class Average','School Average','Target (50%)'],
    datasets:[{ label:'Score %', data:[studentData.avg,studentData.classAvg,studentData.schoolAvg,50], backgroundColor:['#6366f1','#0891b2','#059669','#f59e0b'], borderRadius:10 }],
  } : null;

  const exportCSV = () => {
    if(!studentData||!selected) return;
    const rows=[['Subject','Student %','Class Avg %','School Avg %','vs Class','vs School'],...studentData.subStats.map((s:any)=>[s.subject_name,s.myAvg,s.classSubAvg,s.schoolSubAvg,s.myAvg-s.classSubAvg,s.myAvg-s.schoolSubAvg])];
    const a=document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download=`${selected.first_name}_peer_comparison.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#0f172a,#1e3a5f,#0c4a6e)', minHeight:185 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%,rgba(14,165,233,0.25) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(6,182,212,0.15) 0%,transparent 60%)' }}/>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-5 right-10 w-36 h-36 opacity-20" style={{ background:'radial-gradient(circle,#38bdf8,transparent)', filter:'blur(35px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"/><span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest">Benchmarking & Comparison Engine</span></div>
            <h1 className="text-3xl font-black text-white">👥 Peer Comparison Engine</h1>
            <p className="text-white/50 text-sm mt-2">See exactly where any student stands vs their class, school, and targets</p>
          </div>
          {selected && (
            <div className="flex flex-col gap-2 mt-1 no-print">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
              <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiPrinter size={13}/>Print PDF</button>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 no-print">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🔍 Select Student to Compare</p>
        <div className="relative w-full max-w-md">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setShowDrop(true);}} onFocus={()=>setShowDrop(true)}
            placeholder="Type student name or admission number…"
            className="w-full border-2 border-sky-100 focus:border-sky-400 rounded-xl pl-9 pr-4 py-3 text-sm font-medium focus:outline-none transition-colors"/>
          {showDrop && filtered.length>0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-50 mt-1 overflow-hidden">
              {filtered.map(st=>(
                <button key={st.id} onClick={()=>{setSelected(st);setSearch(`${st.first_name} ${st.last_name}`);setShowDrop(false);}}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>{st.first_name[0]}</div>
                  <div><p className="font-semibold text-gray-800 text-sm">{st.first_name} {st.last_name}</p><p className="text-xs text-gray-400">{st.admission_no||'No Adm No'}</p></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && studentData && (
        <div className="space-y-5">
          {/* Profile + Percentile */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 relative overflow-hidden rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#ecfeff,#e0f2fe)', border:'1px solid #bae6fd' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)', boxShadow:'0 0 25px rgba(8,145,178,0.4)' }}>{selected.first_name[0]}</div>
                <div>
                  <h2 className="text-lg font-black text-gray-800">{selected.first_name} {selected.last_name}</h2>
                  <p className="text-xs text-gray-500">{selected.admission_no||'No Adm'} · {selected.gender}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 text-center shadow-sm"><p className="text-2xl font-black text-indigo-600">{studentData.avg}%</p><p className="text-[10px] text-gray-400 uppercase font-bold">Overall Avg</p></div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm"><p className="text-2xl font-black text-sky-600">#{studentData.pos}</p><p className="text-[10px] text-gray-400 uppercase font-bold">School Rank</p></div>
              </div>
            </div>
            <div className="sm:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Percentile Position</p>
              <div className="relative pt-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>0%</span><span className="font-black text-indigo-600">{studentData.pct}th percentile</span><span>100%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-4 relative">
                  <div className="h-4 rounded-full transition-all" style={{ width:`${studentData.pct}%`, background:'linear-gradient(90deg,#6366f1,#0891b2)' }}/>
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow" style={{ left:`calc(${studentData.pct}% - 8px)` }}/>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Performs better than <strong className="text-indigo-600">{studentData.pct}%</strong> of all students in school</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[{label:'Student',v:studentData.avg+'%',c:'#6366f1'},{label:'Class Avg',v:studentData.classAvg+'%',c:'#0891b2'},{label:'School Avg',v:studentData.schoolAvg+'%',c:'#059669'}].map(k=>(
                  <div key={k.label} className="p-2 rounded-xl bg-gray-50"><p className="text-base font-black" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-gray-400">{k.label}</p></div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Score Comparison Overview</p>
              <div style={{ height:200 }}>
                <Bar data={barData!} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`}},x:{grid:{display:false}}} }}/>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Subject Radar — Student vs Peers</p>
              <div style={{ height:200 }}>
                {radarData && studentData.subStats.length>=3
                  ?<Radar data={radarData} options={{ responsive:true, maintainAspectRatio:false, scales:{r:{beginAtZero:true,max:100,ticks:{font:{size:8},stepSize:25}}}, plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:8}}} }}/>
                  :<div className="flex items-center justify-center h-full text-gray-400 text-sm">Need 3+ subjects with marks</div>}
              </div>
            </div>
          </div>

          {/* Subject Comparison Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject-by-Subject Comparison</p>
              <div className="flex gap-2 no-print">
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700"><FiDownload size={11}/>CSV</button>
                <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiPrinter size={11}/>Print PDF</button>
              </div>
            </div>
            {studentData.subStats.length===0?<div className="p-8 text-center text-gray-400">No subject marks found for this student</div>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Subject','Student','Class Avg','School Avg','Expected (50%)','vs Class','vs School','Status'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {studentData.subStats.sort((a:any,b:any)=>b.myAvg-a.myAvg).map((s:any)=>{
                      const vsClass=s.myAvg-s.classSubAvg; const vsSchool=s.myAvg-s.schoolSubAvg;
                      const status=s.myAvg>=70?'Excellent':s.myAvg>=50?'Pass':s.myAvg>=40?'Borderline':'Fail';
                      const sc=s.myAvg>=70?'#059669':s.myAvg>=50?'#0891b2':s.myAvg>=40?'#d97706':'#dc2626';
                      return (
                        <tr key={s.id} className={`hover:bg-sky-50/20 transition-colors ${s.myAvg<s.classSubAvg?'bg-red-50/20':''}`}>
                          <td className="px-4 py-3 font-semibold text-gray-800">{s.subject_name}</td>
                          <td className="px-4 py-3 font-black text-gray-800">{s.myAvg}%</td>
                          <td className="px-4 py-3 text-gray-500">{s.classSubAvg}%</td>
                          <td className="px-4 py-3 text-gray-500">{s.schoolSubAvg}%</td>
                          <td className="px-4 py-3 text-amber-600 font-medium">50%</td>
                          <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs font-bold" style={{ color:vsClass>=0?'#059669':'#dc2626' }}>{vsClass>=0?<FiTrendingUp size={11}/>:<FiTrendingDown size={11}/>}{vsClass>=0?'+':''}{vsClass}%</span></td>
                          <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs font-bold" style={{ color:vsSchool>=0?'#059669':'#dc2626' }}>{vsSchool>=0?<FiTrendingUp size={11}/>:<FiTrendingDown size={11}/>}{vsSchool>=0?'+':''}{vsSchool}%</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color:sc, background:`${sc}18` }}>{status}</span></td>
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
