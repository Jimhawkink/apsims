'use client';
import { GRADE_COLORS } from './useAnalysisData';

const KPI = ({icon,label,value,sub,color,border}:{icon:string;label:string;value:string;sub:string;color:string;border:string}) => (
  <div className="ultra-card relative overflow-hidden" style={{borderTop:`3px solid ${border}`}}>
    <div className="flex items-start justify-between">
      <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-[22px] font-extrabold mt-1" style={{color}}>{value}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:`${color}15`}}>{icon}</div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-1" style={{background:`linear-gradient(90deg,${border},transparent)`}}/>
  </div>
);

export default function UltraKPICards({d}:any) {
  const stdDev = (() => {
    const scores = d.formMarks.map((m:any)=>Number(m.combined_score||m.score||0));
    if(scores.length<2) return 0;
    const mean = scores.reduce((a:number,b:number)=>a+b,0)/scores.length;
    const variance = scores.reduce((a:number,s:number)=>a+Math.pow(s-mean,2),0)/scores.length;
    return Math.sqrt(variance);
  })();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KPI icon="📊" label="School Mean" value={d.schoolMean.toFixed(1)} sub={`Grade ${d.schoolMeanGrade.grade}`} color="#6366f1" border="#6366f1"/>
      <KPI icon="✅" label="Pass Rate" value={`${d.passRate.toFixed(1)}%`} sub={`≥30 marks`} color="#059669" border="#059669"/>
      <KPI icon="📈" label="Highest" value={String(d.highestScore)} sub="Top score" color="#0ea5e9" border="#0ea5e9"/>
      <KPI icon="📉" label="Lowest" value={String(d.lowestScore)} sub="Bottom score" color="#ef4444" border="#ef4444"/>
      <KPI icon="👥" label="Students" value={String(d.distinctStudents)} sub="With marks" color="#8b5cf6" border="#8b5cf6"/>
      <KPI icon="📋" label="Entries" value={String(d.totalEntries)} sub="Total marks" color="#f59e0b" border="#f59e0b"/>
      <KPI icon="📐" label="Std Dev" value={stdDev.toFixed(1)} sub="Score spread" color="#ec4899" border="#ec4899"/>
      <KPI icon="🎯" label="Median" value={(() => {const s=d.formMarks.map((m:any)=>Number(m.combined_score||m.score||0)).sort((a:number,b:number)=>a-b);return s.length>0?String(s[Math.floor(s.length/2)]):'0';})()}
        sub="Middle score" color="#14b8a6" border="#14b8a6"/>
    </div>
  );
}
