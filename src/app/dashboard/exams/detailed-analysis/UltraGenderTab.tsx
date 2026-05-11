'use client';
import { Bar } from 'react-chartjs-2';

export default function UltraGenderTab({d}:any) {
  const g = d.getGenderAnalysis();
  const chartData = {
    labels: g.perSubject.map((s:any)=>s.name),
    datasets: [
      {label:'Male',data:g.perSubject.map((s:any)=>Math.round(s.maleAvg*10)/10),backgroundColor:'#3b82f6',borderRadius:6,barPercentage:0.7},
      {label:'Female',data:g.perSubject.map((s:any)=>Math.round(s.femaleAvg*10)/10),backgroundColor:'#ec4899',borderRadius:6,barPercentage:0.7},
    ],
  };
  const winner = g.maleAvg > g.femaleAvg ? 'Male' : g.femaleAvg > g.maleAvg ? 'Female' : 'Equal';
  const gap = Math.abs(g.maleAvg - g.femaleAvg);

  return (
    <div className="space-y-4">
      {/* Gender KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-blue-400 uppercase">Male Students</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{g.maleCount}</p>
          <p className="text-xs text-blue-500 mt-0.5">Mean: <strong>{g.maleAvg.toFixed(1)}</strong></p>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-pink-400 uppercase">Female Students</p>
          <p className="text-2xl font-black text-pink-700 mt-1">{g.femaleCount}</p>
          <p className="text-xs text-pink-500 mt-0.5">Mean: <strong>{g.femaleAvg.toFixed(1)}</strong></p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-indigo-400 uppercase">Gender Gap</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{gap.toFixed(1)}</p>
          <p className="text-xs text-indigo-500 mt-0.5">{winner} leads</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">Pass Rate Diff</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{Math.abs(g.malePass-g.femalePass).toFixed(1)}%</p>
          <p className="text-xs text-emerald-500 mt-0.5">M:{g.malePass.toFixed(0)}% F:{g.femalePass.toFixed(0)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">👦👧 Gender Performance by Subject</p></div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"/>Male</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold"><span className="w-2.5 h-2.5 rounded-full bg-pink-500"/>Female</span>
          </div>
        </div>
        <div className="p-5">{g.perSubject.length>0 ? (
          <div className="h-[300px]"><Bar data={chartData} options={{responsive:true,maintainAspectRatio:false,scales:{y:{max:100,grid:{color:'#f1f5f9'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}}}/></div>
        ) : <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>}</div>
      </div>

      {/* Subject-level table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📋 Subject Gender Breakdown</p></div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{fontSize:12}}>
            <thead><tr className="bg-gray-50">{['Subject','♂ Mean','♀ Mean','Gap','♂ Pass%','♀ Pass%','Advantage'].map((h,i)=>(
              <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
            ))}</tr></thead>
            <tbody>{g.perSubject.sort((a:any,b:any)=>Math.abs(b.gap)-Math.abs(a.gap)).map((s:any,i:number)=>(
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-semibold text-gray-800">{s.name}</td>
                <td className="px-4 py-3 font-bold text-blue-600">{s.maleAvg.toFixed(1)}</td>
                <td className="px-4 py-3 font-bold text-pink-600">{s.femaleAvg.toFixed(1)}</td>
                <td className="px-4 py-3 font-bold" style={{color:Math.abs(s.gap)<5?'#059669':Math.abs(s.gap)<15?'#f59e0b':'#ef4444'}}>{s.gap>0?'+':''}{s.gap.toFixed(1)}</td>
                <td className="px-4 py-3 text-blue-500">{s.maleCount>0?((s.maleAvg>=30?1:0)*100).toFixed(0):'—'}%</td>
                <td className="px-4 py-3 text-pink-500">{s.femaleCount>0?((s.femaleAvg>=30?1:0)*100).toFixed(0):'—'}%</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.gap>2?'bg-blue-50 text-blue-600':s.gap<-2?'bg-pink-50 text-pink-600':'bg-green-50 text-green-600'}`}>{s.gap>2?'♂ Male':s.gap<-2?'♀ Female':'≈ Equal'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
