'use client';
import { GRADE_COLORS } from './useAnalysisData';

export default function UltraQuartileTab({d}:any) {
  const q = d.getQuartileAnalysis();
  const quartiles = [
    {label:'Q1 — Top 25%',data:q.q1,color:'#059669',bg:'#ecfdf5',icon:'🏆'},
    {label:'Q2 — Upper Middle',data:q.q2,color:'#3b82f6',bg:'#eff6ff',icon:'📈'},
    {label:'Q3 — Lower Middle',data:q.q3,color:'#f59e0b',bg:'#fffbeb',icon:'📊'},
    {label:'Q4 — Bottom 25%',data:q.q4,color:'#ef4444',bg:'#fef2f2',icon:'⚠️'},
  ];
  const total = q.q1.length+q.q2.length+q.q3.length+q.q4.length;

  if(!d.selForm) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-4xl mb-3">📊</p>
      <p className="text-sm font-bold text-gray-500">Select a Form to view Quartile Analysis</p>
      <p className="text-xs text-gray-400 mt-1">Students ranked into 4 performance quartiles</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Quartile summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quartiles.map((qt,i) => {
          const avg = qt.data.length>0 ? qt.data.reduce((a:any,s:any)=>a+s.avg,0)/qt.data.length : 0;
          const g = d.getGrade(avg);
          return (
            <div key={i} className="rounded-2xl border p-4 relative overflow-hidden" style={{background:qt.bg,borderColor:`${qt.color}30`}}>
              <div className="absolute top-2 right-2 text-2xl opacity-20">{qt.icon}</div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{color:qt.color}}>{qt.label}</p>
              <p className="text-2xl font-black mt-1" style={{color:qt.color}}>{qt.data.length}</p>
              <p className="text-[10px] mt-0.5" style={{color:qt.color}}>Mean: {avg.toFixed(1)} ({g.grade})</p>
              <div className="mt-2 bg-white/60 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${total>0?(qt.data.length/total*100):0}%`,background:qt.color}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Median indicator */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl">🎯</div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase">Median Score</p>
            <p className="text-2xl font-black">{q.median.toFixed(1)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/70">Total students analyzed</p>
          <p className="text-xl font-bold">{total}</p>
        </div>
      </div>

      {/* Quartile detail tables */}
      {quartiles.map((qt,qi) => (
        <div key={qi} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{borderColor:`${qt.color}20`,background:qt.bg}}>
            <span className="text-lg">{qt.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{color:qt.color}}>{qt.label} — {qt.data.length} students</span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{background:qt.color}}>
              {qt.data.length>0?(qt.data.reduce((a:any,s:any)=>a+s.avg,0)/qt.data.length).toFixed(1):'0'} avg
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:12}}>
              <thead><tr className="bg-gray-50">
                {['#','Student','Mean','Grade','Bar'].map((h,i)=>(
                  <th key={i} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>{qt.data.slice(0,10).map((s:any,i:number) => {
                const g = d.getGrade(s.avg);
                return (
                  <tr key={s.student.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-400 font-mono">{qi*Math.ceil(total/4)+i+1}</td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{s.student.first_name} {s.student.last_name}</td>
                    <td className="px-4 py-2 font-bold" style={{color:qt.color}}>{s.avg.toFixed(1)}</td>
                    <td className="px-4 py-2"><span className="w-7 h-6 rounded-md text-white font-bold text-[10px] inline-flex items-center justify-center" style={{background:GRADE_COLORS[g.grade]||'#94a3b8'}}>{g.grade}</span></td>
                    <td className="px-4 py-2"><div className="w-24 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${s.avg}%`,background:qt.color}}/></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {qt.data.length>10 && <p className="text-center py-2 text-[10px] text-gray-400">+{qt.data.length-10} more students</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
