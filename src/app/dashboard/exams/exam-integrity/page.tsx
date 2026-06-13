'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiRefreshCw, FiShield, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

function stdDev(arr: number[]) { if (!arr.length) return 0; const m = arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/arr.length); }

export default function ExamIntegrityPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all'|'High'|'Medium'|'Low'>('all');
  const [flagged, setFlagged]     = useState<Set<string>>(new Set());
  const [cleared, setCleared]     = useState<Set<string>>(new Set());
  const [refresh, setRefresh]     = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: marks }, { data: students }, { data: subjects }, { data: exams }] = await Promise.all([
        supabase.from('school_exam_marks').select('id,student_id,subject_id,exam_id,marks,created_at').order('created_at').limit(10000),
        supabase.from('school_students').select('id,first_name,last_name,admission_no'),
        supabase.from('school_subjects').select('id,subject_name'),
        supabase.from('school_exams').select('id,exam_name'),
      ]);

      const studentMap: Record<string,any> = {};
      (students||[]).forEach((s:any) => { studentMap[s.id] = s; });
      const subjectMap: Record<string,string> = {};
      (subjects||[]).forEach((s:any) => { subjectMap[s.id] = s.subject_name; });
      const examMap: Record<string,string> = {};
      (exams||[]).forEach((e:any) => { examMap[e.id] = e.exam_name; });

      // Build student-subject history
      const history: Record<string,number[]> = {};
      (marks||[]).forEach((m:any) => {
        const key = `${m.student_id}_${m.subject_id}`;
        if (!history[key]) history[key] = [];
        history[key].push(Number(m.marks||0));
      });

      // Class averages per exam+subject
      const classAvg: Record<string,{ sum:number; cnt:number }> = {};
      (marks||[]).forEach((m:any) => {
        const key = `${m.exam_id}_${m.subject_id}`;
        if (!classAvg[key]) classAvg[key] = { sum:0, cnt:0 };
        classAvg[key].sum += Number(m.marks||0);
        classAvg[key].cnt++;
      });

      const detected: any[] = [];
      (marks||[]).forEach((m:any) => {
        const score = Number(m.marks||0);
        const key = `${m.student_id}_${m.subject_id}`;
        const hist = history[key] || [];
        const prevScores = hist.slice(0, hist.length - 1);
        const prevAvg = prevScores.length ? prevScores.reduce((a,b)=>a+b,0)/prevScores.length : null;
        const classKey = `${m.exam_id}_${m.subject_id}`;
        const ca = classAvg[classKey];
        const mean = ca ? ca.sum / ca.cnt : null;

        const issues: { type:string; severity:'High'|'Medium'|'Low' }[] = [];

        // Anomaly 1: Score spike (>25 above their own average)
        if (prevAvg !== null && prevScores.length >= 2 && score - prevAvg > 25) {
          issues.push({ type: `Score Spike: +${Math.round(score-prevAvg)}% above own average`, severity: score - prevAvg > 40 ? 'High' : 'Medium' });
        }
        // Anomaly 2: Perfect score
        if (score === 100) issues.push({ type: 'Perfect Score (100%)', severity: 'Medium' });
        // Anomaly 3: Outlier from class mean
        if (mean !== null) {
          const allScores = (marks||[]).filter((mm:any)=>mm.exam_id===m.exam_id&&mm.subject_id===m.subject_id).map((mm:any)=>Number(mm.marks||0));
          const sd = stdDev(allScores);
          if (sd > 0 && Math.abs(score - mean) > 2.5 * sd) {
            issues.push({ type: `Statistical Outlier: ${Math.round(Math.abs(score-mean)/sd*10)/10}σ from class mean`, severity: Math.abs(score-mean)/sd > 3 ? 'High' : 'Medium' });
          }
        }
        // Anomaly 4: Dramatic improvement >30 points
        if (prevAvg !== null && prevScores.length >= 1 && score - prevAvg > 30 && score - prevAvg <= 25 === false) {
          if (issues.length === 0) issues.push({ type: `Dramatic Improvement: +${Math.round(score-prevAvg)}pts from previous avg`, severity: 'Low' });
        }

        if (issues.length > 0) {
          const st = studentMap[m.student_id] || {};
          detected.push({
            id: m.id,
            studentName: `${st.first_name||'Unknown'} ${st.last_name||''}`,
            admNo: st.admission_no || '—',
            exam: examMap[m.exam_id] || '—',
            subject: subjectMap[m.subject_id] || '—',
            score,
            prevAvg: prevAvg !== null ? Math.round(prevAvg) : null,
            deviation: prevAvg !== null ? Math.round(score - prevAvg) : null,
            anomalyType: issues[0].type,
            severity: issues[0].severity,
          });
        }
      });

      setAnomalies(detected.sort((a,b) => { const ord = { High:0, Medium:1, Low:2 }; return ord[a.severity]-ord[b.severity]; }));
      setLoading(false);
    })();
  }, [refresh]);

  const filtered = anomalies.filter(a => filter === 'all' || a.severity === filter).filter(a => !cleared.has(a.id));
  const high   = anomalies.filter(a=>a.severity==='High'&&!cleared.has(a.id)).length;
  const medium = anomalies.filter(a=>a.severity==='Medium'&&!cleared.has(a.id)).length;
  const low    = anomalies.filter(a=>a.severity==='Low'&&!cleared.has(a.id)).length;
  const clean  = Math.max(0, (anomalies.length > 0 ? 100 : 100) - Math.round(filtered.length / Math.max(1, anomalies.length + 50) * 100));

  const sevCfg: Record<string,{ color:string; bg:string; glow:string }> = {
    High:   { color:'#dc2626', bg:'#fef2f2', glow:'0 0 12px rgba(220,38,38,0.3)' },
    Medium: { color:'#d97706', bg:'#fffbeb', glow:'0 0 12px rgba(217,119,6,0.25)' },
    Low:    { color:'#0891b2', bg:'#ecfeff', glow:'0 0 12px rgba(8,145,178,0.2)' },
  };

  const exportCSV = () => {
    const rows = [['Student','Adm No','Exam','Subject','Score','Prev Avg','Deviation','Anomaly Type','Severity'],
      ...filtered.map(a=>[a.studentName,a.admNo,a.exam,a.subject,a.score,a.prevAvg??'N/A',a.deviation??'N/A',a.anomalyType,a.severity])];
    const el = document.createElement('a'); el.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); el.download='integrity_report.csv'; el.click();
  };

  const integrityBar = { labels:['High Risk','Medium','Low Risk','Clean'], datasets:[{ data:[high,medium,low,clean], backgroundColor:['#dc2626','#d97706','#0891b2','#059669'], borderRadius:8 }] };

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print{display:none!important;} body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} }`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#1a0000,#450a0a,#7f1d1d)', minHeight:185 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 10% 50%,rgba(239,68,68,0.3) 0%,transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }} />
        <div className="absolute top-4 right-10 w-32 h-32 opacity-20" style={{ background:'radial-gradient(circle,#fca5a5,transparent)', filter:'blur(30px)' }} />
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2"><FiShield size={14} className="text-red-300"/><span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Examination Security System</span></div>
            <h1 className="text-3xl font-black text-white">🛡️ Exam Integrity Monitor</h1>
            <p className="text-white/50 text-sm mt-2">Statistical anomaly detection — identify irregularities before they become problems</p>
            <div className="mt-5 flex gap-8">
              {[{ label:'High Severity', v:high, c:'#fca5a5' },{ label:'Medium', v:medium, c:'#fcd34d' },{ label:'Low', v:low, c:'#93c5fd' },{ label:'Integrity Score', v:clean+'%', c:'#6ee7b7' }].map(k=>(
                <div key={k.label}><p className="text-2xl font-black" style={{ color:k.c }}>{k.v}</p><p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p></div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-col mt-1 no-print">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Export CSV</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiPrinter size={13}/>Print Report</button>
            <button onClick={()=>setRefresh(r=>r+1)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiRefreshCw size={13}/>Re-scan</button>
          </div>
        </div>
      </div>

      {/* CHART + SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Integrity Score Breakdown</p>
          <div style={{ height:200 }}>
            <Bar data={integrityBar} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:'#f8fafc'}}, x:{grid:{display:false}} } }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Anomaly Types Detected</p>
          {[
            { icon:'📈', label:'Score Spike', desc:'Score >25pts above own avg' },
            { icon:'💯', label:'Perfect Score', desc:'Student scored exactly 100%' },
            { icon:'📊', label:'Statistical Outlier', desc:'>2.5σ from class mean' },
            { icon:'🚀', label:'Dramatic Improvement', desc:'>30 point jump from prior avg' },
          ].map(t => (
            <div key={t.label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <span className="text-xl">{t.icon}</span>
              <div><p className="text-xs font-bold text-gray-800">{t.label}</p><p className="text-[10px] text-gray-400">{t.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER + ANOMALY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center no-print">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-auto">Detected Anomalies</p>
          {(['all','High','Medium','Low'] as const).map(v=>(
            <button key={v} onClick={()=>setFilter(v)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filter===v?'text-white shadow-sm':'bg-gray-100 text-gray-600'}`}
              style={filter===v?{ background: v==='High'?'#dc2626':v==='Medium'?'#d97706':v==='Low'?'#0891b2':'#6366f1' }:{}}>
              {v==='all'?'All':v}
            </button>
          ))}
          <span className="text-xs text-gray-400">{filtered.length} records</span>
        </div>
        {loading ? <div className="p-10 text-center text-gray-400">Scanning exam data for anomalies…</div>
          : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FiCheckCircle size={40} className="text-green-400 mx-auto mb-3" />
              <p className="font-bold text-gray-700">No anomalies detected{filter!=='all'?' in this category':''}!</p>
              <p className="text-sm text-gray-400 mt-1">{anomalies.length === 0 ? 'Add exam marks to begin integrity monitoring' : 'All records appear statistically normal'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Student','Adm No','Exam','Subject','Score','Prev Avg','Deviation','Anomaly Type','Severity','Actions'].map(h=>(
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(a=>{
                    const cfg = sevCfg[a.severity] || sevCfg.Low;
                    return (
                      <tr key={a.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{a.studentName}</td>
                        <td className="px-3 py-3 text-xs font-mono text-gray-400">{a.admNo}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{a.exam}</td>
                        <td className="px-3 py-3 text-xs text-indigo-600 font-medium whitespace-nowrap">{a.subject}</td>
                        <td className="px-3 py-3 font-black text-gray-800">{a.score}%</td>
                        <td className="px-3 py-3 text-gray-500">{a.prevAvg!=null?a.prevAvg+'%':'—'}</td>
                        <td className="px-3 py-3 font-bold" style={{ color:a.deviation>=0?'#059669':'#dc2626' }}>{a.deviation!=null?(a.deviation>=0?'+':'')+a.deviation:'—'}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 max-w-[180px] truncate" title={a.anomalyType}>{a.anomalyType}</td>
                        <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap" style={{ color:cfg.color, background:cfg.bg, boxShadow:cfg.glow }}>{a.severity}</span></td>
                        <td className="px-3 py-3 no-print">
                          <div className="flex gap-1">
                            <button onClick={()=>setFlagged(s=>new Set([...s,a.id]))} className={`px-2 py-1 rounded text-[10px] font-bold ${flagged.has(a.id)?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600 hover:bg-red-50'}`}>🚩 Flag</button>
                            <button onClick={()=>setCleared(s=>new Set([...s,a.id]))} className="px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-green-50">✅ Clear</button>
                          </div>
                        </td>
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
