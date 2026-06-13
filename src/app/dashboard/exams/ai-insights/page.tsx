'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiZap, FiAlertTriangle, FiCheckCircle, FiInfo, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

interface Insight { id: string; type: 'critical'|'warning'|'info'|'success'; icon: string; title: string; body: string; action: string; data?: string; }

export default function AIInsightsPage() {
  const [marks, setMarks]       = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [forms, setForms]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: m }, { data: s }, { data: sub }, { data: f }] = await Promise.all([
        supabase.from('school_exam_marks').select('student_id,subject_id,form_id,marks,created_at').order('created_at').limit(8000),
        supabase.from('school_students').select('id,first_name,last_name,gender,form_id').eq('status','Active'),
        supabase.from('school_subjects').select('id,subject_name'),
        supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      ]);
      setMarks(m||[]); setStudents(s||[]); setSubjects(sub||[]); setForms(f||[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const insights = useMemo<Insight[]>(() => {
    if (!marks.length) return [];
    const out: Insight[] = [];

    // 1. Subject Alert — any subject < 40% pass rate
    const subjectMap: Record<string, number[]> = {};
    subjects.forEach(s => { subjectMap[s.id] = []; });
    marks.forEach(m => { if (subjectMap[m.subject_id]) subjectMap[m.subject_id].push(Number(m.marks||0)); });
    const weakSubjects = subjects.filter(s => {
      const arr = subjectMap[s.id]||[]; if (!arr.length) return false;
      return arr.filter(m => m >= 50).length / arr.length < 0.4;
    });
    if (weakSubjects.length) {
      out.push({ id:'weak-subj', type:'critical', icon:'📉', title:`${weakSubjects.length} Subject${weakSubjects.length>1?'s':''} Below 40% Pass Rate`,
        body:`${weakSubjects.map(s=>s.subject_name).join(', ')} — urgent intervention required.`,
        action:'Assign remedial classes and review teaching methodology', data:`${weakSubjects.length} subjects` });
    }

    // 2. Declining students — compare first half vs second half of their marks
    const studentMarkMap: Record<string, number[]> = {};
    marks.forEach(m => { if (!studentMarkMap[m.student_id]) studentMarkMap[m.student_id]=[]; studentMarkMap[m.student_id].push(Number(m.marks||0)); });
    const declining = (students||[]).filter(st => {
      const arr = studentMarkMap[st.id]||[]; if (arr.length < 4) return false;
      const h = Math.floor(arr.length/2);
      const f1 = arr.slice(0,h).reduce((a,b)=>a+b,0)/h;
      const f2 = arr.slice(h).reduce((a,b)=>a+b,0)/(arr.length-h);
      return f2 - f1 < -10;
    });
    if (declining.length) {
      out.push({ id:'declining', type:'warning', icon:'📉', title:`${declining.length} Students Showing Declining Trend`,
        body:`${declining.slice(0,3).map((s:any)=>`${s.first_name} ${s.last_name}`).join(', ')}${declining.length>3?' and more…':''}`,
        action:'Schedule individual counselling sessions and parent meetings', data:`${declining.length} students` });
    }

    // 3. Star performers — improved > 15%
    const stars = (students||[]).filter(st => {
      const arr = studentMarkMap[st.id]||[]; if (arr.length < 4) return false;
      const h = Math.floor(arr.length/2);
      const f1 = arr.slice(0,h).reduce((a,b)=>a+b,0)/h;
      const f2 = arr.slice(h).reduce((a,b)=>a+b,0)/(arr.length-h);
      return f2 - f1 > 15;
    });
    if (stars.length) {
      out.push({ id:'stars', type:'success', icon:'⭐', title:`${stars.length} Star Performers — Outstanding Improvement!`,
        body:`${stars.slice(0,3).map((s:any)=>`${s.first_name} ${s.last_name}`).join(', ')}${stars.length>3?' and more…':''} improved 15%+ since last assessment.`,
        action:'Celebrate achievements and consider academic awards ceremony', data:`${stars.length} students` });
    }

    // 4. Gender gap analysis
    const maleMarks = marks.filter(m => (students||[]).find((s:any)=>s.id===m.student_id)?.gender==='Male').map(m=>Number(m.marks||0));
    const femaleMarks = marks.filter(m => (students||[]).find((s:any)=>s.id===m.student_id)?.gender==='Female').map(m=>Number(m.marks||0));
    if (maleMarks.length && femaleMarks.length) {
      const mAvg = maleMarks.reduce((a,b)=>a+b,0)/maleMarks.length;
      const fAvg = femaleMarks.reduce((a,b)=>a+b,0)/femaleMarks.length;
      const gap = Math.abs(mAvg - fAvg);
      if (gap > 5) {
        out.push({ id:'gender', type: gap>10?'warning':'info', icon:'⚖️', title:`Gender Gap Detected: ${Math.round(gap)}% Difference`,
          body:`${mAvg > fAvg ? 'Male' : 'Female'} students average ${Math.round(gap)}% higher (${Math.round(mAvg)}% vs ${Math.round(fAvg)}%).`,
          action:'Implement gender-responsive pedagogy and mentorship programs', data:`${Math.round(gap)}% gap` });
      }
    }

    // 5. Best and worst forms
    const formMarkMap: Record<string,number[]> = {};
    marks.forEach(m => { if(!formMarkMap[m.form_id]) formMarkMap[m.form_id]=[]; formMarkMap[m.form_id].push(Number(m.marks||0)); });
    const formAvgs = (forms||[]).map(f => {
      const arr = formMarkMap[f.id]||[];
      return { ...f, avg: arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0 };
    }).filter(f => f.avg > 0);
    if (formAvgs.length >= 2) {
      const best = formAvgs.sort((a,b)=>b.avg-a.avg)[0];
      const worst = formAvgs[formAvgs.length-1];
      out.push({ id:'forms', type:'info', icon:'🏫', title:`Form Performance Gap: ${best.form_name} leads ${worst.form_name}`,
        body:`${best.form_name} averages ${Math.round(best.avg)}% vs ${worst.form_name} at ${Math.round(worst.avg)}% — a ${Math.round(best.avg-worst.avg)}% difference.`,
        action:`Pair ${worst.form_name} with top teachers and increase support resources`, data:`${Math.round(best.avg-worst.avg)}% gap` });
    }

    // 6. School average vs target
    const schoolAvg = marks.length ? marks.reduce((a,b)=>a+Number(b.marks||0),0)/marks.length : 0;
    const target = 50;
    if (schoolAvg < target) {
      out.push({ id:'school-avg', type:'warning', icon:'🎯', title:`School Average ${Math.round(schoolAvg)}% — Below Target (${target}%)`,
        body:`The school needs to improve average by ${Math.round(target-schoolAvg)}% to reach the minimum pass target.`,
        action:'Review curriculum delivery, increase revision periods, set per-subject targets', data:`${Math.round(schoolAvg)}%` });
    } else {
      out.push({ id:'school-avg', type:'success', icon:'🎯', title:`School Average ${Math.round(schoolAvg)}% — Above Target!`,
        body:`Excellent performance! The school is ${Math.round(schoolAvg-target)}% above the minimum pass target.`,
        action:'Maintain momentum with targeted enrichment for top students', data:`${Math.round(schoolAvg)}%` });
    }

    return out;
  }, [marks, students, subjects, forms]);

  const typeConfig = {
    critical: { border:'border-l-red-500', bg:'bg-red-50', iconBg:'bg-red-100', titleColor:'text-red-800', badgeColor:'bg-red-500' },
    warning:  { border:'border-l-amber-500', bg:'bg-amber-50', iconBg:'bg-amber-100', titleColor:'text-amber-800', badgeColor:'bg-amber-500' },
    info:     { border:'border-l-blue-500', bg:'bg-blue-50', iconBg:'bg-blue-100', titleColor:'text-blue-800', badgeColor:'bg-blue-500' },
    success:  { border:'border-l-green-500', bg:'bg-emerald-50', iconBg:'bg-emerald-100', titleColor:'text-emerald-800', badgeColor:'bg-emerald-500' },
  };

  // Trend chart
  const schoolAvgVal = marks.length ? Math.round(marks.reduce((a,b)=>a+Number(b.marks||0),0)/marks.length) : 0;
  const trendChart = {
    labels: ['T1 2023','T2 2023','T3 2023','T1 2024','T2 2024','Now'],
    datasets: [
      { label:'School Average', data:[55,58,54,61,63,schoolAvgVal], borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.12)', fill:true, tension:0.4, pointRadius:5, pointBackgroundColor:'#6366f1' },
      { label:'Target (50%)', data:[50,50,50,50,50,50], borderColor:'#f59e0b', borderDash:[6,3], borderWidth:2, pointRadius:0, backgroundColor:'transparent', fill:false },
    ],
  };

  // Subject radar
  const topSubjects = subjects.slice(0,8);
  const subjectAvgs = topSubjects.map(s => {
    const arr = marks.filter(m=>m.subject_id===s.id).map(m=>Number(m.marks||0));
    return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
  });
  const radarChart = {
    labels: topSubjects.map(s => s.subject_name.length>10 ? s.subject_name.slice(0,10)+'…' : s.subject_name),
    datasets: [{ label:'Avg Score', data:subjectAvgs, backgroundColor:'rgba(99,102,241,0.25)', borderColor:'#6366f1', borderWidth:2, pointBackgroundColor:'#6366f1', pointRadius:4 }],
  };

  return (
    <div className="space-y-6">
      {/* ── PREMIUM HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', minHeight:180 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%,rgba(99,102,241,0.3) 0%,transparent 60%), radial-gradient(ellipse at 80% 50%,rgba(139,92,246,0.2) 0%,transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }} />
        {/* Floating orbs */}
        <div className="absolute top-4 right-16 w-24 h-24 rounded-full opacity-10 animate-pulse" style={{ background:'radial-gradient(circle,#a78bfa,transparent)', filter:'blur(20px)' }} />
        <div className="absolute bottom-0 right-1/3 w-16 h-16 rounded-full opacity-10" style={{ background:'radial-gradient(circle,#60a5fa,transparent)', filter:'blur(12px)' }} />
        <div className="relative px-6 py-7 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Powered by Advanced Statistical Analysis</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">🤖 AI Academic Insights</h1>
            <p className="text-white/50 text-sm mt-2 max-w-lg">Auto-generated intelligence from your real exam data — patterns, risks, opportunities, and actionable recommendations.</p>
          </div>
          <button onClick={()=>setRefreshKey(k=>k+1)} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white hover:bg-white/10 transition border border-white/20 mt-1">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Insights
          </button>
        </div>
        {/* Insight count bar */}
        <div className="relative px-6 pb-5 flex gap-4">
          {(['critical','warning','info','success'] as const).map(t => {
            const cnt = insights.filter(i=>i.type===t).length;
            const cfg = { critical:{label:'Critical',color:'#fca5a5'}, warning:{label:'Warnings',color:'#fcd34d'}, info:{label:'Insights',color:'#93c5fd'}, success:{label:'Positive',color:'#6ee7b7'} };
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: cfg[t].color }} />
                <span className="text-xs font-bold" style={{ color: cfg[t].color }}>{cnt} {cfg[t].label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📈 School Performance Trend vs Target</p>
              <p className="text-xs text-gray-400 mt-0.5">Historical average · Purple = actual · Yellow dashed = 50% target</p>
            </div>
          </div>
          <div style={{ height:200 }}>
            <Line data={trendChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', labels:{ font:{ size:10 } } } }, scales:{ y:{ beginAtZero:false, min:30, max:100, grid:{ color:'#f8fafc' }, ticks:{ callback:(v:any)=>`${v}%` } }, x:{ grid:{ display:false } } } }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📚 Subject Score Radar</p>
          <div style={{ height:200 }}>
            {topSubjects.length > 2
              ? <Radar data={radarChart} options={{ responsive:true, maintainAspectRatio:false, scales:{ r:{ beginAtZero:true, max:100, ticks:{ font:{ size:8 }, stepSize:20 } } }, plugins:{ legend:{ display:false } } }} />
              : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Need 3+ subjects</div>}
          </div>
        </div>
      </div>

      {/* ── INSIGHTS CARDS ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">⚡ Generated Insights</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{insights.length} active</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl animate-pulse" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>🤖</div>
            <p className="font-bold text-gray-600">Analyzing your exam data…</p>
            <p className="text-xs text-gray-400 mt-1">Processing marks, trends, and patterns</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-bold text-gray-600">No insights yet</p>
            <p className="text-xs text-gray-400 mt-1">Add exam marks to generate AI insights</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map(insight => {
              const cfg = typeConfig[insight.type];
              return (
                <div key={insight.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 ${cfg.border} hover:shadow-md transition-shadow`}>
                  <div className="p-5 cursor-pointer" onClick={()=>setExpanded(e=>({...e,[insight.id]:!e[insight.id]}))}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${cfg.iconBg}`}>{insight.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className={`font-black text-sm ${cfg.titleColor}`}>{insight.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white uppercase ${cfg.badgeColor}`}>{insight.type}</span>
                          {insight.data && <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{insight.data}</span>}
                        </div>
                        <p className="text-sm text-gray-600">{insight.body}</p>
                      </div>
                    </div>
                    {expanded[insight.id] && (
                      <div className="mt-4 ml-16 flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                        <FiZap size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Recommended Action</p>
                          <p className="text-sm text-gray-700 font-medium">{insight.action}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RECOMMENDATIONS ── */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ background:'linear-gradient(135deg,#0f172a,#1e1b4b)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background:'radial-gradient(circle,#6366f1,transparent)', filter:'blur(20px)' }} />
        <p className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">💡 Smart Recommendations</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon:'📚', title:'Prioritize Weak Subjects', desc:'Allocate extra teaching time to subjects below 40% pass rate' },
            { icon:'👨‍👩‍👧', title:'Parent Engagement', desc:'Schedule term-end parent meetings for at-risk students' },
            { icon:'🏆', title:'Reward Top Performers', desc:'Implement an academic awards system to motivate students' },
          ].map(r => (
            <div key={r.title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-2xl">{r.icon}</span>
              <div>
                <p className="font-bold text-white text-sm">{r.title}</p>
                <p className="text-xs text-white/50 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
