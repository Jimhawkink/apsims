'use client';
import { useState } from 'react';
import { FiBarChart2, FiTrendingUp, FiPieChart, FiUsers, FiTarget, FiAlertTriangle, FiBookOpen, FiHeart } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useAnalysisData, GRADE_COLORS } from './useAnalysisData';
import UltraKPICards from './UltraKPICards';
import UltraGenderTab from './UltraGenderTab';
import UltraQuartileTab from './UltraQuartileTab';
import '../../components/ultra-dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

type Tab = 'grade_dist'|'subject_comp'|'longitudinal'|'stream_comp'|'teacher_perf'|'kcse_pred'|'at_risk'|'gender'|'quartile';

const TABS:{key:Tab;label:string;icon:any;color:string}[] = [
  {key:'grade_dist',label:'Grade Distribution',icon:FiPieChart,color:'#6366f1'},
  {key:'subject_comp',label:'Subject Ranking',icon:FiBarChart2,color:'#0ea5e9'},
  {key:'longitudinal',label:'Trend Analysis',icon:FiTrendingUp,color:'#8b5cf6'},
  {key:'stream_comp',label:'Stream Battle',icon:FiUsers,color:'#f59e0b'},
  {key:'teacher_perf',label:'Teacher Rating',icon:FiBookOpen,color:'#059669'},
  {key:'gender',label:'Gender Analysis',icon:FiHeart,color:'#ec4899'},
  {key:'quartile',label:'Quartile Analysis',icon:FiBarChart2,color:'#14b8a6'},
  {key:'kcse_pred',label:'KCSE Prediction',icon:FiTarget,color:'#dc2626'},
  {key:'at_risk',label:'At-Risk Alert',icon:FiAlertTriangle,color:'#f97316'},
];

export default function DetailedAnalysisPage() {
  const d = useAnalysisData();
  const [tab, setTab] = useState<Tab>('grade_dist');

  if (d.loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>📊</div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30"/>
      </div>
      <p className="text-sm font-bold text-gray-500">Loading Ultra Analysis Engine…</p>
    </div>
  );

  const gradeDistData = d.getGradeDistribution();

  return (
    <div className="space-y-4 ultra-animate">
      {/* Ultra Header */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{background:'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)'}}>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">🔬 Ultra Exam Analysis Engine</h1>
            <p className="text-xs text-indigo-200 mt-1">9 analysis modules · KPI metrics · KCSE prediction · Gender · Quartile · At-Risk detection</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={d.selTerm} onChange={e=>d.setSelTerm(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white backdrop-blur-sm focus:outline-none">
              <option value="" className="text-gray-800">All Terms</option>
              {d.terms.map((t:any)=><option key={t.id} value={t.id} className="text-gray-800">{t.term_name} {t.academic_year||t.year||''}</option>)}
            </select>
            <select value={d.selForm} onChange={e=>d.setSelForm(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white backdrop-blur-sm focus:outline-none">
              <option value="" className="text-gray-800">All Forms</option>
              {d.forms.map((f:any)=><option key={f.id} value={f.id} className="text-gray-800">{f.form_name}</option>)}
            </select>
            <select value={d.selSubject} onChange={e=>d.setSelSubject(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white backdrop-blur-sm focus:outline-none">
              <option value="" className="text-gray-800">All Subjects</option>
              {d.subjects.map((s:any)=><option key={s.id} value={s.id} className="text-gray-800">{s.subject_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <UltraKPICards d={d}/>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(t=>{const Icon=t.icon;const active=tab===t.key;return(
          <button key={t.key} type="button" onClick={()=>setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${active?'text-white shadow-md':'text-gray-600 hover:bg-gray-100'}`} style={active?{background:`linear-gradient(135deg,${t.color},${t.color}cc)`}:{}}>
            <Icon size={13}/>{t.label}
          </button>
        );})}
      </div>

      {/* === GRADE DISTRIBUTION === */}
      {tab==='grade_dist'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="ultra-card">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">📊 Grade Distribution {d.selSubject?`— ${d.subjects.find((s:any)=>s.id===Number(d.selSubject))?.subject_name}`:''}</p>
            {Object.values(gradeDistData).some(v=>v>0)?(
              <div className="h-[300px] flex items-center justify-center">
                <Doughnut data={{labels:Object.keys(gradeDistData),datasets:[{data:Object.values(gradeDistData),backgroundColor:Object.keys(gradeDistData).map(g=>GRADE_COLORS[g]||'#94a3b8'),borderWidth:0,borderRadius:4}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{boxWidth:12,padding:6,font:{size:11,weight:'bold' as const}}}},cutout:'60%'}}/>
              </div>
            ):<div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No data available</div>}
          </div>
          <div className="ultra-card">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">📈 Grade Count Breakdown</p>
            <div className="space-y-2">{Object.entries(gradeDistData).map(([grade,count])=>{
              const total=Object.values(gradeDistData).reduce((s,v)=>s+v,0)||1;
              const pct=(count/total)*100;
              return(<div key={grade} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{background:GRADE_COLORS[grade]||'#94a3b8'}}>{grade}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden relative">
                  <div className="h-7 rounded-full flex items-center px-3 transition-all" style={{width:`${Math.max(pct,3)}%`,background:GRADE_COLORS[grade]||'#94a3b8',opacity:0.85}}>
                    {pct>=10&&<span className="text-white text-[10px] font-bold">{pct.toFixed(0)}%</span>}
                  </div>
                </div>
                <span className="text-sm font-extrabold text-gray-700 w-10 text-right">{count}</span>
              </div>);
            })}</div>
          </div>
        </div>
      )}

      {/* === SUBJECT COMPARISON === */}
      {tab==='subject_comp'&&(
        <div className="ultra-card overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">🏆 Subject Performance Ranking</p>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:12}}>
              <thead><tr className="bg-gradient-to-r from-sky-50 to-blue-50">{['#','Subject','Mean','Grade','Entries','Pass %','Fail %','Performance'].map((h,i)=>(
                <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-sky-700 uppercase tracking-wider">{h}</th>
              ))}</tr></thead>
              <tbody>{d.subjectAvgs.map((s:any,i:number)=>{const g=d.getGrade(s.avg);return(
                <tr key={s.name} className="border-b border-gray-50 hover:bg-sky-50/30 transition-colors">
                  <td className="px-4 py-3"><span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black ${i<3?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500'}`}>{i+1}</span></td>
                  <td className="px-4 py-3 font-bold text-gray-800">{i===0&&'🥇 '}{i===1&&'🥈 '}{i===2&&'🥉 '}{s.name}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-900">{s.avg.toFixed(1)}</td>
                  <td className="px-4 py-3"><span className="w-8 h-7 rounded-lg text-white font-bold text-xs inline-flex items-center justify-center" style={{background:GRADE_COLORS[g.grade]||'#94a3b8'}}>{g.grade}</span></td>
                  <td className="px-4 py-3 text-gray-500">{s.count}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{s.passRate.toFixed(0)}%</td>
                  <td className="px-4 py-3 font-bold text-red-500">{s.failRate.toFixed(0)}%</td>
                  <td className="px-4 py-3"><div className="w-28 bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full transition-all" style={{width:`${s.avg}%`,background:s.avg>=50?'#22c55e':s.avg>=30?'#f59e0b':'#ef4444'}}/></div></td>
                </tr>
              );})}</tbody>
            </table>
            {d.subjectAvgs.length===0&&<p className="text-center py-8 text-gray-400 text-sm">No subject data</p>}
          </div>
        </div>
      )}

      {/* === LONGITUDINAL TREND === */}
      {tab==='longitudinal'&&(
        <div className="ultra-card">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">📈 Performance Trend Over Time</p>
          <p className="text-[10px] text-gray-400 mb-4">Select a specific subject and form to track progress</p>
          {d.selSubject&&d.selForm?(
            <div className="h-[350px]"><Line data={d.getLongitudinalData()} options={{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:100,grid:{color:'#f1f5f9'}},x:{grid:{display:false}}},plugins:{legend:{display:true,position:'top'}}}}/></div>
          ):<div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2"><span className="text-4xl">📊</span><p className="text-sm font-semibold">Select a Form and Subject above</p></div>}
        </div>
      )}

      {/* === STREAM COMPARISON === */}
      {tab==='stream_comp'&&(
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {d.streamComparison.slice(0,4).map((s:any,i:number)=>{const g=d.getGrade(s.avg);const colors=['#059669','#3b82f6','#f59e0b','#ef4444'];return(
              <div key={s.name} className="ultra-card text-center" style={{borderTop:`3px solid ${colors[i]}`}}>
                <p className="text-2xl">{['🥇','🥈','🥉','4️⃣'][i]}</p>
                <p className="text-sm font-black text-gray-800 mt-1">{s.name}</p>
                <p className="text-xl font-extrabold mt-1" style={{color:colors[i]}}>{s.avg.toFixed(1)}</p>
                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-white font-bold text-[10px] mt-1" style={{background:GRADE_COLORS[g.grade]||'#94a3b8'}}>{g.grade}</span>
              </div>
            );})}
          </div>
          <div className="ultra-card">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">⚔️ Stream Performance Battle</p>
            {d.streamComparison.length>0?(
              <div className="h-[300px]"><Bar data={{labels:d.streamComparison.map((s:any)=>s.name),datasets:[{label:'Mean Score',data:d.streamComparison.map((s:any)=>Math.round(s.avg*10)/10),backgroundColor:d.streamComparison.map((_:any,i:number)=>['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444'][i%5]),borderWidth:0,borderRadius:8}]}} options={{responsive:true,maintainAspectRatio:false,scales:{y:{max:100,grid:{color:'#f1f5f9'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}}}/></div>
            ):<div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No stream data</div>}
          </div>
        </div>
      )}

      {/* === TEACHER PERFORMANCE === */}
      {tab==='teacher_perf'&&(
        <div className="ultra-card overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">👨‍🏫 Teacher Performance Scorecard</p>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:12}}>
              <thead><tr className="bg-gradient-to-r from-emerald-50 to-green-50">{['Teacher','Subject','Form','Mean','Grade','Pass %','Rating'].map((h,i)=>(
                <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-emerald-700 uppercase">{h}</th>
              ))}</tr></thead>
              <tbody>{d.teacherPerformance.map((t:any,i:number)=>{const g=d.getGrade(t.avg);const rating=t.avg>=70?'⭐ Excellent':t.avg>=50?'👍 Good':t.avg>=30?'📋 Improve':'🔴 Concern';const rc=t.avg>=70?'#059669':t.avg>=50?'#3b82f6':t.avg>=30?'#f59e0b':'#ef4444';return(
                <tr key={i} className="border-b border-gray-50 hover:bg-emerald-50/30">
                  <td className="px-4 py-3 font-bold text-gray-800">{t.teacherName}</td>
                  <td className="px-4 py-3 text-gray-600">{t.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{t.form}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-900">{t.avg.toFixed(1)}</td>
                  <td className="px-4 py-3"><span className="w-8 h-6 rounded-md text-white font-bold text-[10px] inline-flex items-center justify-center" style={{background:GRADE_COLORS[g.grade]||'#94a3b8'}}>{g.grade}</span></td>
                  <td className="px-4 py-3 font-bold text-green-600">{t.passRate.toFixed(0)}%</td>
                  <td className="px-4 py-3"><span className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{background:rc}}>{rating}</span></td>
                </tr>
              );})}{d.teacherPerformance.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No teacher assignments found</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* === GENDER ANALYSIS === */}
      {tab==='gender'&&<UltraGenderTab d={d}/>}

      {/* === QUARTILE ANALYSIS === */}
      {tab==='quartile'&&<UltraQuartileTab d={d}/>}

      {/* === KCSE PREDICTION === */}
      {tab==='kcse_pred'&&(
        <div className="ultra-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4"><FiTarget className="text-red-500" size={16}/><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🎯 KCSE Grade Prediction</p><p className="text-[10px] text-gray-400">Best 7 subjects (Maths + English compulsory + best 5)</p></div></div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:12}}>
              <thead><tr className="bg-gradient-to-r from-red-50 to-orange-50">{['#','Student','Mean Pts','Predicted','Subj.','Strongest','Weakest'].map((h,i)=>(
                <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-red-700 uppercase">{h}</th>
              ))}</tr></thead>
              <tbody>{d.getKCSEPredictions().map((pred:any,i:number)=>(
                <tr key={pred.student.id} className="border-b border-gray-50 hover:bg-red-50/20">
                  <td className="px-4 py-3 font-mono text-gray-400">{i+1}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{pred.student.first_name} {pred.student.last_name}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-900">{pred.meanPoints}</td>
                  <td className="px-4 py-3"><span className="w-10 h-8 rounded-lg text-white font-black text-sm inline-flex items-center justify-center shadow-sm" style={{background:GRADE_COLORS[pred.predictedGrade]||'#94a3b8'}}>{pred.predictedGrade}</span></td>
                  <td className="px-4 py-3 text-gray-500">{pred.subjectsCount}/7</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">{pred.topSubject?`${d.subjects.find((s:any)=>s.id===pred.topSubject.subject_id)?.subject_name||'N/A'} (${pred.topSubject.grade})`:'-'}</td>
                  <td className="px-4 py-3 text-red-500 font-semibold">{pred.weakSubject?`${d.subjects.find((s:any)=>s.id===pred.weakSubject.subject_id)?.subject_name||'N/A'} (${pred.weakSubject.grade})`:'-'}</td>
                </tr>
              ))}{d.getKCSEPredictions().length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">{d.selForm?'No predictions available':'Select a form to view KCSE predictions'}</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* === AT-RISK === */}
      {tab==='at_risk'&&(
        <div className="ultra-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4"><FiAlertTriangle className="text-amber-500" size={16}/><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🚨 At-Risk Student Early Warning</p><p className="text-[10px] text-gray-400">Flagged by low scores, multiple failures, or poor attendance</p></div></div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:12}}>
              <thead><tr className="bg-gradient-to-r from-amber-50 to-orange-50">{['Student','Mean','Failed','Attend.','Risk Factors','Level'].map((h,i)=>(
                <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-amber-700 uppercase">{h}</th>
              ))}</tr></thead>
              <tbody>{d.getAtRiskStudents().map((s:any)=>{const rc:Record<string,string>={Critical:'#dc2626',High:'#ef4444',Medium:'#f59e0b'};return(
                <tr key={s.student.id} className="border-b border-gray-50 hover:bg-amber-50/30">
                  <td className="px-4 py-3 font-bold text-gray-800">{s.student.first_name} {s.student.last_name}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-900">{s.avgScore.toFixed(1)}</td>
                  <td className="px-4 py-3 font-bold text-red-500">{s.failedSubjects}</td>
                  <td className="px-4 py-3 font-bold text-gray-600">{s.attendanceRate.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.riskFactors.join(' · ')}</td>
                  <td className="px-4 py-3"><span className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{background:rc[s.riskLevel]||'#94a3b8'}}>{s.riskLevel==='Critical'?'🔴':s.riskLevel==='High'?'🟠':'🟡'} {s.riskLevel}</span></td>
                </tr>
              );})}{d.getAtRiskStudents().length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">{d.selForm?'✅ No at-risk students — excellent!':'Select a form to detect at-risk students'}</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-2 text-[9px] text-gray-300 font-medium">APSIMS Ultra Analysis Engine · Powered by Advanced Analytics</div>
    </div>
  );
}
