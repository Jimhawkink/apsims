'use client';

import { useFeeData, fmt } from './useFeeData';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler, RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  FiTrendingUp, FiTrendingDown, FiCreditCard, FiUsers, FiAlertTriangle,
  FiArrowRight, FiRefreshCw, FiActivity, FiCheckCircle, FiZap,
  FiDollarSign, FiBarChart2, FiPieChart, FiCalendar, FiClock,
  FiAward, FiTarget, FiShield, FiBookOpen, FiStar, FiThumbsUp,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

/* ═══════════════ HELPERS ═══════════════ */
const KES   = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const KESM  = (n: number) => { if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`; if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`; return `KES ${n.toLocaleString()}`; };
const pct   = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
const today = new Date().toISOString().split('T')[0];

/* ═══════════════ COLOUR SYSTEM ═══════════════ */
const C = {
  indigo: '#4f46e5', indigoL: '#eef2ff', indigoBd: '#c7d2fe',
  green:  '#16a34a', greenL:  '#f0fdf4', greenBd:  '#bbf7d0',
  red:    '#dc2626', redL:    '#fef2f2', redBd:    '#fecaca',
  amber:  '#d97706', amberL:  '#fffbeb', amberBd:  '#fde68a',
  blue:   '#2563eb', blueL:   '#eff6ff', blueBd:   '#bfdbfe',
  purple: '#7c3aed', purpleL: '#faf5ff', purpleBd: '#ddd6fe',
  teal:   '#0d9488', tealL:   '#f0fdfa', tealBd:   '#99f6e4',
  pink:   '#db2777', pinkL:   '#fdf4ff', pinkBd:   '#f5d0fe',
  slate:  '#64748b', slateL:  '#f8fafc', slateBd:  '#e2e8f0',
};
const CHART_PALETTE = ['#4f46e5','#16a34a','#0ea5e9','#d97706','#8b5cf6','#ef4444','#0d9488','#db2777'];

/* ═══════════════ MINI COMPONENTS ═══════════════ */
function KPICard({ label, value, sub, color, colorL, colorBd, icon, trend, onClick }: any) {
  return (
    <div onClick={onClick} style={{ background:'#fff', border:`1.5px solid ${colorBd}`, borderRadius:18, padding:'20px 22px', position:'relative', overflow:'hidden', fontFamily:"'Inter','Outfit',sans-serif", cursor: onClick ? 'pointer' : 'default' }}
      className="fee-kpi-card">
      <div style={{ position:'absolute', top:-18, right:-18, width:80, height:80, borderRadius:'50%', background:color, opacity:0.06 }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:colorL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{icon}</div>
        {trend !== undefined && <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:99, background:trend>=0?C.greenL:C.redL, color:trend>=0?C.green:C.red }}>{trend>=0?'▲':'▼'} {Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:900, color:'#0f172a', lineHeight:1, letterSpacing:'-0.025em' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.slate, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ icon, title, sub, right, accent = C.indigo }: any) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:C.indigoL, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
        <div>
          <div style={{ fontWeight:900, fontSize:15, color:'#0f172a', fontFamily:"'Outfit',sans-serif" }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:C.slate, marginTop:1 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

function PBar({ value, color, height = 7 }: { value:number; color:string; height?:number }) {
  return (
    <div style={{ height, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
      <div style={{ height, width:`${Math.min(100,value)}%`, background:color, borderRadius:99, transition:'width 1s ease' }} />
    </div>
  );
}

function Badge({ label, color, bg }: { label:string; color:string; bg:string }) {
  return <span style={{ fontSize:10, fontWeight:900, color, background:bg, padding:'3px 9px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</span>;
}

/* ═══════════════ HEALTH SCORE RING ═══════════════ */
function HealthRing({ score }: { score:number }) {
  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  const label = score >= 75 ? 'EXCELLENT' : score >= 50 ? 'FAIR' : 'CRITICAL';
  const r = 50, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 60 60)" style={{ transition:'stroke-dashoffset 1.5s ease' }} />
        <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a" fontFamily="Outfit,sans-serif">{score}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fontWeight="700" fill={C.slate} fontFamily="Inter,sans-serif">/ 100</text>
      </svg>
      <div style={{ fontSize:11, fontWeight:900, color, textTransform:'uppercase', letterSpacing:'0.09em' }}>{label}</div>
      <div style={{ fontSize:10, color:C.slate, textAlign:'center', maxWidth:120 }}>Financial Health Score</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function FeeDashboardPage() {
  const { forms, students, payments, structures, terms, loading, fetchAll, currentTerm, getStudentFees, getFormName } = useFeeData();
  const currentYear = new Date().getFullYear();

  const [totalIncome,    setTotalIncome]    = useState(0);
  const [totalExpenses,  setTotalExpenses]  = useState(0);
  const [schoolName,     setSchoolName]     = useState('APSIMS School');
  const [activeTab,      setActiveTab]      = useState<'overview'|'forms'|'analysis'|'students'|'modules'>('overview');
  const [refreshing,     setRefreshing]     = useState(false);
  const [topStudentsN,   setTopStudentsN]   = useState(10);

  useEffect(() => {
    const go = async () => {
      const [{ data:inc }, { data:exp }, { data:det }] = await Promise.all([
        supabase.from('school_income').select('amount').eq('year', currentYear),
        supabase.from('school_expenses').select('amount,status').eq('year', currentYear),
        supabase.from('school_details').select('school_name').single(),
      ]);
      setTotalIncome((inc||[]).reduce((s:number,i:any)=>s+Number(i.amount||0),0));
      setTotalExpenses((exp||[]).filter((e:any)=>(e.status||'approved')==='approved').reduce((s:number,e:any)=>s+Number(e.amount||0),0));
      setSchoolName((det as any)?.school_name || 'APSIMS School');
    };
    go();
  }, [currentYear]);

  const handleRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  /* ─── Core Metrics ─── */
  const activeStudents   = useMemo(() => students.filter(s=>s.status==='Active'), [students]);
  const totalCollected   = useMemo(() => payments.reduce((s,p)=>s+Number(p.amount||0),0), [payments]);
  const totalExpected    = useMemo(() => activeStudents.reduce((s,st)=>s+getStudentFees(st.id,st.form_id).annualTotal,0), [activeStudents,getStudentFees]);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate   = pct(totalCollected, totalExpected);
  const studentsOwing    = useMemo(() => activeStudents.filter(s=>getStudentFees(s.id,s.form_id).annualBalance>0).length, [activeStudents,getStudentFees]);
  const studentsCleared  = activeStudents.length - studentsOwing;
  const netPosition      = (totalCollected + totalIncome) - totalExpenses;

  /* ─── Time-scoped ─── */
  const todayPays    = payments.filter(p=>p.payment_date===today);
  const todayTotal   = todayPays.reduce((s,p)=>s+Number(p.amount||0),0);
  const weekStart    = new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const weekTotal    = payments.filter(p=>new Date(p.payment_date)>=weekStart).reduce((s,p)=>s+Number(p.amount||0),0);
  const monthStart   = new Date(currentYear, new Date().getMonth(), 1);
  const monthPays    = payments.filter(p=>new Date(p.payment_date)>=monthStart);
  const monthTotal   = monthPays.reduce((s,p)=>s+Number(p.amount||0),0);
  const daysElapsed  = new Date().getDate();
  const velocity     = daysElapsed > 0 ? Math.round(monthTotal / daysElapsed) : 0;
  const daysInMonth  = new Date(currentYear, new Date().getMonth()+1, 0).getDate();
  const projected    = velocity * daysInMonth;

  /* ─── 12-month trend ─── */
  const monthly12 = useMemo(() => Array.from({length:12},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-(11-i));
    const m=d.getMonth(), y=d.getFullYear();
    const amt=payments.filter(p=>{const pd=new Date(p.payment_date);return pd.getMonth()===m&&pd.getFullYear()===y;}).reduce((s,p)=>s+Number(p.amount||0),0);
    return { month:d.toLocaleString('en',{month:'short'}), year:String(y).slice(2), amount:amt };
  }), [payments]);

  /* ─── Daily 30 days ─── */
  const daily30 = useMemo(() => Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(29-i));
    const ds=d.toISOString().split('T')[0];
    const amt=payments.filter(p=>p.payment_date===ds).reduce((s,p)=>s+Number(p.amount||0),0);
    return { day:d.toLocaleDateString('en',{month:'short',day:'numeric'}), amount:amt, isToday:ds===today };
  }), [payments, today]);

  /* ─── Method breakdown ─── */
  const methodMap = useMemo(() => {
    const r: Record<string,{count:number;total:number}> = {};
    payments.forEach(p=>{const m=(p.payment_method||'Other').replace(/\s*\(.+\)/,''); if(!r[m])r[m]={count:0,total:0}; r[m].count++; r[m].total+=Number(p.amount||0);});
    return Object.entries(r).sort((a,b)=>b[1].total-a[1].total);
  }, [payments]);

  /* ─── Term breakdown ─── */
  const termMap = useMemo(() => {
    const r: Record<string,{count:number;total:number}> = {};
    payments.forEach(p=>{const t=terms.find((tm:any)=>Number(tm.id)===Number(p.term_id)); const tn=t?.term_name||'No Term'; if(!r[tn])r[tn]={count:0,total:0}; r[tn].count++; r[tn].total+=Number(p.amount||0);});
    return Object.entries(r).sort((a,b)=>b[1].total-a[1].total);
  }, [payments, terms]);

  /* ─── Per-form collection ─── */
  const formCollection = useMemo(() => forms.map(form=>{
    const fSts=activeStudents.filter(s=>s.form_id===form.id);
    const collected=fSts.reduce((s,st)=>s+payments.filter(p=>p.student_id===st.id).reduce((s2,p)=>s2+Number(p.amount||0),0),0);
    const expected=fSts.reduce((s,st)=>s+getStudentFees(st.id,st.form_id).annualTotal,0);
    const rate=pct(collected,expected);
    const owing=fSts.filter(st=>getStudentFees(st.id,st.form_id).annualBalance>0).length;
    return { name:form.form_name, collected, expected, balance:Math.max(0,expected-collected), students:fSts.length, rate, owing };
  }).sort((a,b)=>b.rate-a.rate), [forms,activeStudents,payments,getStudentFees]);

  /* ─── Aging buckets ─── */
  const aging = useMemo(()=>{
    const buckets={d0:0, d30:0, d60:0, d90:0, d180:0};
    const now=new Date();
    activeStudents.forEach(st=>{
      const balance=getStudentFees(st.id,st.form_id).annualBalance;
      if(balance<=0)return;
      const lastPay=payments.filter(p=>p.student_id===st.id).sort((a,b)=>new Date(b.payment_date).getTime()-new Date(a.payment_date).getTime())[0];
      const days=lastPay?Math.floor((now.getTime()-new Date(lastPay.payment_date).getTime())/86400000):999;
      if(days<=30)buckets.d0+=balance;
      else if(days<=60)buckets.d30+=balance;
      else if(days<=90)buckets.d60+=balance;
      else if(days<=180)buckets.d90+=balance;
      else buckets.d180+=balance;
    });
    return buckets;
  }, [activeStudents,payments,getStudentFees]);

  /* ─── Top payers ─── */
  const studentPaySummary = useMemo(() => activeStudents.map(st=>{
    const paid=payments.filter(p=>p.student_id===st.id).reduce((s,p)=>s+Number(p.amount||0),0);
    const fees=getStudentFees(st.id,st.form_id);
    return { ...st, paid, balance:fees.annualBalance, rate:pct(paid,fees.annualTotal), formName:getFormName(st.form_id) };
  }).sort((a,b)=>b.paid-a.paid), [activeStudents,payments,getStudentFees,getFormName]);

  /* ─── Defaulters (worst balance) ─── */
  const worstDefaulters = useMemo(() => [...studentPaySummary].sort((a,b)=>b.balance-a.balance).filter(s=>s.balance>0), [studentPaySummary]);

  /* ─── Financial Health Score (0-100) ─── */
  const healthScore = useMemo(()=>{
    let score=0;
    score += Math.min(40, collectionRate * 0.4);               // 40pts: collection rate
    score += studentsCleared/Math.max(activeStudents.length,1)*20; // 20pts: cleared ratio
    score += netPosition>=0 ? 20 : 0;                          // 20pts: surplus
    score += Math.min(20, pct(monthTotal, projected) * 0.2);   // 20pts: monthly velocity
    return Math.round(Math.min(100, score));
  }, [collectionRate,studentsCleared,activeStudents.length,netPosition,monthTotal,projected]);

  /* ─── YoY comparison (prev year) ─── */
  const prevYearTotal = useMemo(()=>{
    return payments.filter(p=>{ const y=new Date(p.payment_date).getFullYear(); return y===currentYear-1; }).reduce((s,p)=>s+Number(p.amount||0),0);
  }, [payments, currentYear]);
  const yoyChange = prevYearTotal > 0 ? Math.round(((totalCollected-prevYearTotal)/prevYearTotal)*100) : null;

  /* ─── Modules ─── */
  const allModules = [
    {label:'Collect Fee',     href:'/dashboard/fees/collect',            icon:'💵',color:C.green,  tier:'Core'},
    {label:'Outstanding',     href:'/dashboard/fees/outstanding',         icon:'⏳',color:C.amber,  tier:'Core'},
    {label:'Payments List',   href:'/dashboard/fees/payments',            icon:'📋',color:C.blue,   tier:'Core'},
    {label:'Fee Structure',   href:'/dashboard/fees/structure',           icon:'🏗️',color:C.purple, tier:'Core'},
    {label:'Statements',      href:'/dashboard/fees/statements',          icon:'📄',color:'#0891b2', tier:'Core'},
    {label:'Receipts',        href:'/dashboard/fees/receipts',            icon:'🧾',color:C.amber,  tier:'Core'},
    {label:'KCB Buni Push',   href:'/dashboard/fees/mpesa-push',          icon:'📱',color:C.green,  tier:'Ultra'},
    {label:'Fee Defaulters',  href:'/dashboard/fees/defaulters',          icon:'🚨',color:C.red,    tier:'Ultra'},
    {label:'Budget Module',   href:'/dashboard/fees/budget',              icon:'📊',color:C.blue,   tier:'Ultra'},
    {label:'Projections',     href:'/dashboard/fees/projections',         icon:'🔮',color:C.purple, tier:'Ultra'},
    {label:'Board Report',    href:'/dashboard/fees/reports/board',       icon:'👔',color:'#0f172a', tier:'Ultra'},
    {label:'Export Centre',   href:'/dashboard/fees/exports',             icon:'📤',color:C.slate,  tier:'Ultra'},
    {label:'Bank Recon',      href:'/dashboard/fees/bank-reconciliation', icon:'🏦',color:'#0c4a6e', tier:'Ultra'},
    {label:'Vote Ledger',     href:'/dashboard/fees/vote-heads/ledger',   icon:'📒',color:C.purple, tier:'Ultra'},
    {label:'Capitation',      href:'/dashboard/fees/capitation',          icon:'🏫',color:C.green,  tier:'Ultra'},
    {label:'Notifications',   href:'/dashboard/fees/notifications',       icon:'🔔',color:'#713f12', tier:'Ultra'},
    {label:'P&L Statement',   href:'/dashboard/fees/pl-statement',        icon:'📈',color:C.red,    tier:'Finance'},
    {label:'Trial Balance',   href:'/dashboard/fees/trial-balance',       icon:'⚖️',color:C.indigo, tier:'Finance'},
    {label:'Balance Sheet',   href:'/dashboard/fees/balance-sheet',       icon:'🏛️',color:C.blue,   tier:'Finance'},
    {label:'Cash Book',       href:'/dashboard/fees/cashbook',            icon:'📒',color:C.teal,   tier:'Finance'},
    {label:'Fee Analytics',   href:'/dashboard/fees/analytics',           icon:'🔬',color:C.indigo, tier:'Finance'},
    {label:'Bursary',         href:'/dashboard/fees/bursary',             icon:'🎓',color:C.pink,   tier:'Finance'},
    {label:'Fee Waiver',      href:'/dashboard/fees/fee-waiver',          icon:'🎁',color:'#c026d3', tier:'Finance'},
    {label:'Approvals',       href:'/dashboard/fees/approval-workflow',   icon:'✅',color:C.amber,  tier:'Finance'},
    {label:'Audit Trail',     href:'/dashboard/fees/audit',               icon:'🔒',color:C.slate,  tier:'Compliance'},
    {label:'Demand Letters',  href:'/dashboard/fees/demand-letters',      icon:'✉️',color:C.red,    tier:'Compliance'},
    {label:'Reminders',       href:'/dashboard/fees/reminder-scheduler',  icon:'⏰',color:C.purple, tier:'Compliance'},
    {label:'Govt Returns',    href:'/dashboard/fees/government-returns',  icon:'🏛️',color:'#1e293b', tier:'Compliance'},
    {label:'Bulk SMS/WA',     href:'/dashboard/fees/bulk-reminders',      icon:'📢',color:C.purple, tier:'Compliance'},
    {label:'Aging Buckets',   href:'/dashboard/fees/arrears-aging',       icon:'📅',color:'#ea580c', tier:'Compliance'},
  ];
  const tierMeta: Record<string,{bg:string;badge:string;icon:string}> = {
    Core:       {bg:C.greenL,  badge:C.green,  icon:'⚡'},
    Ultra:      {bg:C.purpleL, badge:C.purple, icon:'🚀'},
    Finance:    {bg:C.blueL,   badge:C.blue,   icon:'📈'},
    Compliance: {bg:C.redL,    badge:C.red,    icon:'🛡️'},
  };

  const rateColor = collectionRate>=70?C.green:collectionRate>=40?C.amber:C.red;
  const rateGrad  = collectionRate>=70?'linear-gradient(90deg,#22c55e,#10b981)':collectionRate>=40?'linear-gradient(90deg,#f59e0b,#fb923c)':'linear-gradient(90deg,#ef4444,#f87171)';

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16,background:'#f8fafc'}}>
      <div style={{width:64,height:64,borderRadius:20,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,boxShadow:'0 8px 32px rgba(79,70,229,0.3)'}}>💰</div>
      <p style={{fontWeight:800,color:C.indigo,fontSize:14,letterSpacing:'0.06em',fontFamily:"'Outfit',sans-serif"}}>Loading Financial Command Centre…</p>
      <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  /* ═══ CHART DATA ═══ */
  const lineData = {
    labels: monthly12.map(m=>`${m.month}'${m.year}`),
    datasets: [{
      label:'Collections', data:monthly12.map(m=>m.amount),
      borderColor:C.indigo, backgroundColor:'rgba(79,70,229,0.07)',
      fill:true, tension:0.45, pointRadius:4, pointBackgroundColor:'#fff',
      pointBorderColor:C.indigo, pointBorderWidth:2,
    }],
  };
  const barDaily = {
    labels: daily30.map(d=>d.day),
    datasets:[{
      label:'KES', data:daily30.map(d=>d.amount),
      backgroundColor:daily30.map(d=>d.isToday?C.indigo:'rgba(99,102,241,0.35)'),
      borderRadius:5, hoverBackgroundColor:C.indigo,
    }],
  };
  const doughnutData = {
    labels: methodMap.map(([m])=>m),
    datasets:[{data:methodMap.map(([,v])=>v.total), backgroundColor:CHART_PALETTE, borderWidth:2, borderColor:'#fff'}],
  };
  const formBarData = {
    labels: formCollection.map(f=>f.name),
    datasets:[
      {label:'Expected', data:formCollection.map(f=>f.expected), backgroundColor:'rgba(79,70,229,0.2)', borderColor:C.indigo, borderWidth:2, borderRadius:6},
      {label:'Collected',data:formCollection.map(f=>f.collected),backgroundColor:'rgba(22,163,74,0.7)',  borderColor:C.green,  borderWidth:2, borderRadius:6},
    ],
  };
  const agingBarData = {
    labels:['0–30 days','31–60 days','61–90 days','91–180 days','180+ days'],
    datasets:[{
      label:'Outstanding KES',
      data:[aging.d0,aging.d30,aging.d60,aging.d90,aging.d180],
      backgroundColor:['rgba(22,163,74,0.7)','rgba(217,119,6,0.7)','rgba(234,88,12,0.7)','rgba(220,38,38,0.7)','rgba(127,29,29,0.8)'],
      borderRadius:7,
    }],
  };
  const termBarData = {
    labels: termMap.map(([t])=>t),
    datasets:[{label:'KES Collected', data:termMap.map(([,v])=>v.total), backgroundColor:CHART_PALETTE.map(c=>`${c}cc`), borderRadius:8}],
  };

  const chartOpts = (label='KES'): any => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c:any)=>`KES ${Number(c.raw).toLocaleString()}`}}},
    scales:{
      y:{beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{callback:(v:any)=>`${(Number(v)/1000).toFixed(0)}K`,font:{size:10}}},
      x:{grid:{display:false}, ticks:{font:{size:10}}},
    },
  });

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{fontFamily:"'Inter','Outfit',system-ui,sans-serif", background:'#f8fafc', minHeight:'100vh', paddingBottom:48}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; }
        a { text-decoration:none; transition:all 0.18s; }
        .fee-kpi-card { transition:all 0.18s; }
        .fee-kpi-card:hover { transform:translateY(-3px); box-shadow:0 10px 30px rgba(0,0,0,0.1) !important; }
        .fee-mod-card { transition:all 0.18s; }
        .fee-mod-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.1) !important; }
        .fee-tab-btn { transition:all 0.15s; }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .slide-up { animation:slideUp 0.32s ease forwards; }
        @keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
      `}</style>

      {/* ══════════════════════ COMPACT PREMIUM BANNER ══════════════════════ */}
      <div style={{background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'20px 28px 0'}}>
        {/* Top row */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16, paddingBottom:18}}>
          {/* Brand */}
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:50,height:50,borderRadius:15,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,boxShadow:'0 6px 18px rgba(79,70,229,0.35)',flexShrink:0}}>💰</div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <h1 style={{margin:0,fontSize:22,fontWeight:900,color:'#0f172a',letterSpacing:'-0.028em',fontFamily:"'Outfit',sans-serif"}}>Financial Command Centre</h1>
                <span style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',fontSize:9,fontWeight:900,padding:'3px 9px',borderRadius:99,letterSpacing:'0.12em',textTransform:'uppercase'}}>ULTRA</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:5,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:C.slate}}>{schoolName} · {currentYear} Financial Year</span>
                {currentTerm && (
                  <span style={{display:'flex',alignItems:'center',gap:5,background:C.greenL,border:`1px solid ${C.greenBd}`,borderRadius:99,padding:'2px 11px',fontSize:11,color:C.green,fontWeight:700}}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:C.green,display:'inline-block'}} /> {currentTerm.term_name} {currentTerm.year||''}
                  </span>
                )}
                <span style={{background:C.indigoL,border:`1px solid ${C.indigoBd}`,borderRadius:99,padding:'2px 11px',fontSize:11,color:C.indigo,fontWeight:700}}>👥 {activeStudents.length} Active Students</span>
                <span style={{background:healthScore>=75?C.greenL:healthScore>=50?C.amberL:C.redL,border:`1px solid ${healthScore>=75?C.greenBd:healthScore>=50?C.amberBd:C.redBd}`,borderRadius:99,padding:'2px 11px',fontSize:11,color:healthScore>=75?C.green:healthScore>=50?C.amber:C.red,fontWeight:700}}>
                  ❤️ Health: {healthScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* 4 KPI tiles */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {[
              {label:"Today's Intake",   val:KESM(todayTotal),            sub:`${todayPays.length} payments`, color:C.green,  bg:C.greenL},
              {label:'Total Collected',  val:KESM(totalCollected),         sub:`${payments.length} transactions`, color:C.indigo, bg:C.indigoL},
              {label:'Outstanding',      val:KESM(totalOutstanding),       sub:`${studentsOwing} students owing`, color:totalOutstanding>0?C.red:C.green, bg:totalOutstanding>0?C.redL:C.greenL},
              {label:'Net Position',     val:KESM(Math.abs(netPosition)),  sub:netPosition>=0?'Surplus ✅':'Deficit ⚠️', color:netPosition>=0?C.green:C.red, bg:netPosition>=0?C.greenL:C.redL},
            ].map((k,i)=>(
              <div key={i} style={{background:k.bg,border:`1px solid ${k.color}25`,borderRadius:14,padding:'10px 16px',minWidth:132}}>
                <div style={{fontSize:19,fontWeight:900,color:k.color,letterSpacing:'-0.025em',lineHeight:1.1}}>{k.val}</div>
                <div style={{fontSize:9,fontWeight:800,color:k.color,textTransform:'uppercase',letterSpacing:'0.09em',marginTop:3}}>{k.label}</div>
                <div style={{fontSize:10,color:C.slate,marginTop:2}}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Collection rate bar */}
        <div style={{background:C.slateL,border:`1px solid ${C.slateBd}`,borderRadius:12,padding:'10px 18px',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontSize:12,fontWeight:700,color:'#475569',display:'flex',alignItems:'center',gap:6}}><FiBarChart2 size={13} color={C.indigo} /> Annual Fee Collection Rate</span>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {yoyChange !== null && <span style={{fontSize:11,fontWeight:700,color:yoyChange>=0?C.green:C.red}}>{yoyChange>=0?'▲':'▼'} {Math.abs(yoyChange)}% YoY</span>}
              <span style={{fontSize:20,fontWeight:900,color:rateColor}}>{collectionRate}%</span>
            </div>
          </div>
          <PBar value={collectionRate} color={rateGrad} height={9} />
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:10,color:C.slate}}>{KES(totalCollected)} collected · {studentsCleared} students cleared</span>
            <span style={{fontSize:10,color:C.slate}}>{KES(totalExpected)} expected · {studentsOwing} defaulters</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:'flex',gap:8,paddingBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          {[
            {label:'💵 Collect Fee',  href:'/dashboard/fees/collect',    bg:C.green,  sh:'0 3px 10px rgba(22,163,74,0.3)'},
            {label:'📱 KCB Push',     href:'/dashboard/fees/mpesa-push', bg:'#059669', sh:'0 3px 10px rgba(5,150,105,0.3)'},
            {label:'🚨 Defaulters',   href:'/dashboard/fees/defaulters', bg:C.red,    sh:'0 3px 10px rgba(220,38,38,0.3)'},
            {label:'📊 Budget',       href:'/dashboard/fees/budget',     bg:C.blue,   sh:'0 3px 10px rgba(37,99,235,0.25)'},
            {label:'👔 Board Report', href:'/dashboard/fees/reports/board', bg:'#1e293b', sh:'none'},
            {label:'📈 P&L',          href:'/dashboard/fees/pl-statement', bg:C.purple, sh:'none'},
            {label:'📤 Export',       href:'/dashboard/fees/exports',    bg:C.teal,   sh:'none'},
          ].map((b,i)=>(
            <Link key={i} href={b.href} style={{background:b.bg,color:'#fff',borderRadius:10,padding:'8px 16px',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:5,boxShadow:b.sh}}>
              {b.label}
            </Link>
          ))}
          <button onClick={handleRefresh} disabled={refreshing} style={{background:'#fff',border:`1.5px solid ${C.slateBd}`,borderRadius:10,padding:'8px 14px',color:'#475569',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700}}>
            <FiRefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':'none'}} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:0,background:'transparent',overflowX:'auto'}}>
          {[
            {key:'overview',  label:'📊 Overview'},
            {key:'forms',     label:'📚 Form Analysis'},
            {key:'analysis',  label:'🔬 Deep Analysis'},
            {key:'students',  label:'👤 Student Ledger'},
            {key:'modules',   label:'🗂️ All Modules'},
          ].map(t=>(
            <button key={t.key} className="fee-tab-btn" onClick={()=>setActiveTab(t.key as any)} style={{
              border:'none', borderRadius:0, padding:'11px 20px', fontWeight:800, fontSize:12, cursor:'pointer',
              fontFamily:"'Inter',sans-serif", whiteSpace:'nowrap', background:'transparent',
              color: activeTab===t.key?C.indigo:C.slate,
              borderBottom: activeTab===t.key?`2.5px solid ${C.indigo}`:'2.5px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'24px 28px'}}>

        {/* ─── Alert strip ─── */}
        {(totalOutstanding>500000||studentsOwing>10)&&(
          <div style={{background:'#fff',border:`1.5px solid ${C.redBd}`,borderLeft:`4px solid ${C.red}`,borderRadius:14,padding:'13px 20px',marginBottom:22,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}} className="slide-up">
            <FiAlertTriangle size={18} color={C.red}/>
            <div style={{flex:1}}>
              <span style={{color:'#991b1b',fontWeight:800,fontSize:13}}>ALERT: </span>
              <span style={{color:'#b91c1c',fontSize:13}}>{studentsOwing} students have outstanding fees totalling {KES(totalOutstanding)}. Collection rate {collectionRate}% — {collectionRate<40?'CRITICAL':collectionRate<70?'NEEDS ATTENTION':'ON TRACK'}.</span>
            </div>
            <Link href="/dashboard/fees/defaulters" style={{background:C.red,color:'#fff',borderRadius:9,padding:'7px 16px',fontWeight:800,fontSize:12}}>View Defaulters →</Link>
          </div>
        )}

        {/* ════════════ OVERVIEW ════════════ */}
        {activeTab==='overview'&&(
          <div style={{display:'flex',flexDirection:'column',gap:22}} className="slide-up">
            {/* Row 1: 8 KPI cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))',gap:14}}>
              <KPICard label="Fee Revenue"       value={KES(totalCollected)}             icon="💰" color={C.green}  colorL={C.greenL}  colorBd={C.greenBd}  sub={`${payments.length} transactions`} />
              <KPICard label="Other Income"      value={KES(totalIncome)}                icon="📈" color={C.blue}   colorL={C.blueL}   colorBd={C.blueBd}   sub="Grants & miscellaneous" />
              <KPICard label="Total Expenses"    value={KES(totalExpenses)}              icon="📉" color={C.red}    colorL={C.redL}    colorBd={C.redBd}    sub="Approved expenditure" />
              <KPICard label="Net Position"      value={KES(Math.abs(netPosition))}      icon={netPosition>=0?'🏆':'⚠️'} color={netPosition>=0?C.green:C.red} colorL={netPosition>=0?C.greenL:C.redL} colorBd={netPosition>=0?C.greenBd:C.redBd} sub={netPosition>=0?'School is in surplus':'School has deficit'} />
              <KPICard label="Outstanding Fees"  value={KES(totalOutstanding)}           icon="⏳" color={C.amber}  colorL={C.amberL}  colorBd={C.amberBd}  sub={`${studentsOwing} students owing`} />
              <KPICard label="This Month"        value={KES(monthTotal)}                 icon="🗓️" color={C.teal}   colorL={C.tealL}   colorBd={C.tealBd}   sub={`${daysElapsed} days collected`} />
              <KPICard label="Daily Velocity"    value={KES(velocity)}                   icon="⚡" color={C.indigo} colorL={C.indigoL} colorBd={C.indigoBd} sub={`Projected: ${KESM(projected)}/mo`} />
              <KPICard label="Students Cleared"  value={`${studentsCleared} / ${activeStudents.length}`} icon="✅" color={C.green} colorL={C.greenL} colorBd={C.greenBd} sub={`${pct(studentsCleared,activeStudents.length)}% compliance rate`} />
            </div>

            {/* Row 2: 12-month line chart + health ring */}
            <div style={{display:'grid',gridTemplateColumns:'2.5fr 1fr',gap:18}}>
              <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
                <SectionHead icon={<FiTrendingUp size={15} color={C.indigo}/>} title="12-Month Collection Trend" sub="Monthly fee collections vs prior periods" right={yoyChange!==null&&<Badge label={`${yoyChange>=0?'+':''}${yoyChange}% vs last year`} color={yoyChange>=0?C.green:C.red} bg={yoyChange>=0?C.greenL:C.redL}/>} />
                <div style={{height:240}}>
                  <Line data={lineData} options={{...chartOpts(), plugins:{legend:{display:false},tooltip:{callbacks:{label:(c:any)=>`KES ${Number(c.raw).toLocaleString()}`}}}}} />
                </div>
              </div>
              <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
                <HealthRing score={healthScore}/>
                <div style={{width:'100%',display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {label:'Collection Rate', val:`${collectionRate}%`,  color:rateColor},
                    {label:'Cleared Students',val:`${studentsCleared}`,  color:C.green},
                    {label:'Net Position',    val:netPosition>=0?'Surplus':'Deficit', color:netPosition>=0?C.green:C.red},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${C.slateBd}`}}>
                      <span style={{fontSize:11,color:C.slate,fontWeight:600}}>{r.label}</span>
                      <span style={{fontSize:12,fontWeight:900,color:r.color}}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Daily bars + Doughnut + Method breakdown */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:18}}>
              <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
                <SectionHead icon={<FiBarChart2 size={15} color={C.purple}/>} title="Daily Collections — Last 30 Days" sub="Indigo bar = today"/>
                <div style={{height:220}}>
                  <Bar data={barDaily} options={{...chartOpts(), scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{callback:(v:any)=>`${(Number(v)/1000).toFixed(0)}K`,font:{size:9}}},x:{grid:{display:false},ticks:{font:{size:8},maxRotation:45,maxTicksLimit:10}}}}} />
                </div>
              </div>
              <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
                <SectionHead icon={<FiPieChart size={15} color={C.green}/>} title="Payment Methods"/>
                <div style={{height:180}}>
                  {methodMap.length>0?(
                    <Doughnut data={doughnutData} options={{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false},tooltip:{callbacks:{label:(c:any)=>`KES ${Number(c.raw).toLocaleString()}`}}}}}/>
                  ):<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:C.slate}}>No data</div>}
                </div>
                <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:6}}>
                  {methodMap.slice(0,5).map(([m,v],i)=>(
                    <div key={m} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:9,height:9,borderRadius:2,background:CHART_PALETTE[i%CHART_PALETTE.length],flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:700,color:'#374151',flex:1}}>{m}</span>
                      <span style={{fontSize:11,fontWeight:900,color:'#0f172a'}}>{KESM(v.total)}</span>
                      <span style={{fontSize:10,color:C.slate}}>({v.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 4: Recent payments + Quick Reports */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
              {/* Recent payments */}
              <div style={{background:'#fff',borderRadius:20,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)',overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.slateBd}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><FiActivity size={14} color={C.green}/><span style={{fontWeight:900,fontSize:13,color:'#0f172a',fontFamily:"'Outfit',sans-serif"}}>Recent Payments</span></div>
                  <Link href="/dashboard/fees/payments" style={{fontSize:11,color:C.indigo,fontWeight:800,display:'flex',alignItems:'center',gap:3}}>View All <FiArrowRight size={11}/></Link>
                </div>
                <div style={{overflow:'auto',maxHeight:280}}>
                  {payments.slice(0,10).length===0?<div style={{padding:40,textAlign:'center',color:C.slate}}>No payments yet</div>:
                  payments.slice(0,10).map((p,i)=>{
                    const s=students.find(st=>st.id===p.student_id);
                    const col=CHART_PALETTE[i%CHART_PALETTE.length];
                    const initials=s?`${s.first_name?.[0]||''}${s.last_name?.[0]||''}`.toUpperCase():'?';
                    return(
                      <div key={p.id} style={{padding:'10px 20px',display:'flex',alignItems:'center',gap:10,borderBottom:`1px solid ${C.slateL}`}}>
                        <div style={{width:32,height:32,borderRadius:10,background:`${col}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:col,flexShrink:0}}>{initials}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:12,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s?`${s.first_name} ${s.last_name}`:'—'}</div>
                          <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{p.payment_date?new Date(p.payment_date).toLocaleDateString('en-KE',{day:'numeric',month:'short'}):'—'} · {p.payment_method||'—'}</div>
                        </div>
                        <span style={{fontWeight:900,fontSize:13,color:C.green,flexShrink:0}}>{KESM(Number(p.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick reports + term breakdown */}
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{background:'#fff',border:`1px solid ${C.indigoBd}`,borderRadius:16,padding:'16px 20px',flex:1}}>
                  <div style={{fontSize:11,fontWeight:900,color:C.indigo,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>⚡ Finance Reports</div>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    {[
                      {label:'📈 P&L',          href:'/dashboard/fees/pl-statement',   color:C.red},
                      {label:'⚖️ Trial Balance', href:'/dashboard/fees/trial-balance',  color:C.indigo},
                      {label:'🏛️ Balance Sheet', href:'/dashboard/fees/balance-sheet',  color:C.blue},
                      {label:'📒 Cash Book',     href:'/dashboard/fees/cashbook',       color:C.teal},
                      {label:'👔 Board Report',  href:'/dashboard/fees/reports/board',  color:'#1e293b'},
                      {label:'📤 Export',        href:'/dashboard/fees/exports',        color:C.slate},
                      {label:'🔬 Analytics',     href:'/dashboard/fees/analytics',      color:C.purple},
                      {label:'📅 Aging',         href:'/dashboard/fees/arrears-aging',  color:'#ea580c'},
                    ].map((l,i)=>(
                      <Link key={i} href={l.href} style={{background:`${l.color}0d`,border:`1.5px solid ${l.color}30`,borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:800,color:l.color}}>{l.label}</Link>
                    ))}
                  </div>
                </div>
                {/* Term collection summary */}
                <div style={{background:'#fff',border:`1px solid ${C.slateBd}`,borderRadius:16,padding:'16px 20px'}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:12,fontFamily:"'Outfit',sans-serif"}}>📅 By Term</div>
                  {termMap.slice(0,4).map(([t,v],i)=>(
                    <div key={t} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>{t}</span>
                        <span style={{fontSize:12,fontWeight:900,color:'#0f172a'}}>{KES(v.total)}</span>
                      </div>
                      <PBar value={pct(v.total,totalCollected)} color={CHART_PALETTE[i%CHART_PALETTE.length]} height={5}/>
                      <span style={{fontSize:10,color:C.slate}}>{v.count} payments</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ FORM ANALYSIS ════════════ */}
        {activeTab==='forms'&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}} className="slide-up">
            {/* Leaderboard */}
            <div style={{background:'#fff',borderRadius:20,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)',overflow:'hidden'}}>
              <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.slateBd}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:22}}>🏆</span><div><div style={{fontWeight:900,fontSize:16,color:'#0f172a',fontFamily:"'Outfit',sans-serif"}}>Form-wise Fee Collection Leaderboard</div><div style={{fontSize:11,color:C.slate}}>Ranked by collection rate · {currentYear} Financial Year</div></div></div>
                <Badge label="LIVE DATA" color={C.indigo} bg={C.indigoL}/>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                  <thead><tr style={{background:'#f8fafc',borderBottom:`2px solid ${C.slateBd}`}}>
                    {['Rank','Form','Students','Expected','Collected','Balance','Owing','Rate','Progress'].map(h=>(
                      <th key={h} style={{padding:'11px 16px',textAlign:['Expected','Collected','Balance'].includes(h)?'right':['Rank','Students','Owing','Rate'].includes(h)?'center':'left',fontWeight:800,fontSize:10,color:C.slate,textTransform:'uppercase',letterSpacing:'0.07em'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {formCollection.map((f,i)=>{
                      const medals=['🥇','🥈','🥉'];
                      const rc=f.rate>=70?C.green:f.rate>=40?C.amber:C.red;
                      return(
                        <tr key={f.name} style={{borderBottom:`1px solid ${C.slateL}`,background:i===0?'#fffbeb':i%2===0?'#fff':'#fafafa'}}>
                          <td style={{padding:'14px 16px',textAlign:'center',fontSize:20}}>{medals[i]||i+1}</td>
                          <td style={{padding:'14px 16px',fontWeight:900,color:'#0f172a',fontFamily:"'Outfit',sans-serif"}}>{f.name}</td>
                          <td style={{padding:'14px 16px',textAlign:'center'}}><Badge label={String(f.students)} color={C.purple} bg={C.purpleL}/></td>
                          <td style={{padding:'14px 16px',textAlign:'right',fontWeight:700,color:'#374151'}}>{KES(f.expected)}</td>
                          <td style={{padding:'14px 16px',textAlign:'right',fontWeight:900,color:C.green}}>{KES(f.collected)}</td>
                          <td style={{padding:'14px 16px',textAlign:'right',fontWeight:900,color:f.balance>0?C.red:C.green}}>{KES(f.balance)}</td>
                          <td style={{padding:'14px 16px',textAlign:'center'}}><Badge label={String(f.owing)} color={f.owing>0?C.red:C.green} bg={f.owing>0?C.redL:C.greenL}/></td>
                          <td style={{padding:'14px 16px',textAlign:'center',fontSize:15,fontWeight:900,color:rc}}>{f.rate}%</td>
                          <td style={{padding:'14px 16px',minWidth:160}}><PBar value={f.rate} color={rc}/></td>
                        </tr>
                      );
                    })}
                    <tr style={{background:C.indigo,fontWeight:900}}>
                      <td style={{padding:'13px 16px',textAlign:'center',color:'#fff',fontSize:16}}>∑</td>
                      <td style={{padding:'13px 16px',fontWeight:900,color:'#fff',fontFamily:"'Outfit',sans-serif"}}>ALL FORMS</td>
                      <td style={{padding:'13px 16px',textAlign:'center',color:'#c7d2fe',fontWeight:900}}>{activeStudents.length}</td>
                      <td style={{padding:'13px 16px',textAlign:'right',color:'#c7d2fe',fontWeight:900}}>{KES(totalExpected)}</td>
                      <td style={{padding:'13px 16px',textAlign:'right',color:'#bbf7d0',fontWeight:900}}>{KES(totalCollected)}</td>
                      <td style={{padding:'13px 16px',textAlign:'right',color:'#fca5a5',fontWeight:900}}>{KES(totalOutstanding)}</td>
                      <td style={{padding:'13px 16px',textAlign:'center',color:'#fca5a5',fontWeight:900}}>{studentsOwing}</td>
                      <td style={{padding:'13px 16px',textAlign:'center',color:'#fff',fontWeight:900,fontSize:16}}>{collectionRate}%</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form grouped bar chart */}
            <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
              <SectionHead icon={<FiBarChart2 size={15} color={C.indigo}/>} title="Expected vs Collected by Form" sub="Side-by-side across all forms"/>
              <div style={{height:280}}><Bar data={formBarData} options={{...chartOpts(),plugins:{legend:{position:'top' as const},tooltip:{callbacks:{label:(c:any)=>`${c.dataset.label}: KES ${Number(c.raw).toLocaleString()}`}}},scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{callback:(v:any)=>`KES ${(Number(v)/1000).toFixed(0)}K`,font:{size:10}}},x:{grid:{display:false}}}}}/></div>
            </div>

            {/* Term bar chart */}
            <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
              <SectionHead icon={<FiCalendar size={15} color={C.purple}/>} title="Collections by Term" sub="All-time fee collections per academic term"/>
              <div style={{height:220}}><Bar data={termBarData} options={{...chartOpts(),scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{callback:(v:any)=>`${(Number(v)/1000).toFixed(0)}K`,font:{size:10}}},x:{grid:{display:false}}}}}/></div>
            </div>
          </div>
        )}

        {/* ════════════ DEEP ANALYSIS ════════════ */}
        {activeTab==='analysis'&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}} className="slide-up">
            {/* Aging buckets */}
            <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
              <SectionHead icon={<FiClock size={15} color={C.amber}/>} title="Arrears Aging Analysis" sub="Outstanding balances grouped by days since last payment"/>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:14,marginBottom:22}}>
                {[
                  {label:'Current (0–30d)',  val:aging.d0,   color:C.green,     bg:C.greenL},
                  {label:'Overdue 31–60d',   val:aging.d30,  color:C.amber,     bg:C.amberL},
                  {label:'Overdue 61–90d',   val:aging.d60,  color:'#ea580c',   bg:'#fff7ed'},
                  {label:'Overdue 91–180d',  val:aging.d90,  color:C.red,       bg:C.redL},
                  {label:'Overdue 180d+',    val:aging.d180, color:'#7f1d1d',   bg:'#fef2f2'},
                ].map((b,i)=>(
                  <div key={i} style={{background:b.bg,border:`1.5px solid ${b.color}30`,borderRadius:16,padding:'16px 18px'}}>
                    <div style={{fontSize:10,fontWeight:800,color:b.color,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{b.label}</div>
                    <div style={{fontSize:20,fontWeight:900,color:'#0f172a',fontFamily:"'Outfit',sans-serif"}}>{KES(b.val)}</div>
                    <div style={{fontSize:10,color:C.slate,marginTop:4}}>{b.val>0?`${pct(b.val,totalOutstanding)}% of total outstanding`:'All clear'}</div>
                  </div>
                ))}
              </div>
              <div style={{height:180}}><Bar data={agingBarData} options={{responsive:true,maintainAspectRatio:false,indexAxis:'y' as const,plugins:{legend:{display:false},tooltip:{callbacks:{label:(c:any)=>`KES ${Number(c.raw).toLocaleString()}`}}},scales:{x:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{callback:(v:any)=>`${(Number(v)/1000).toFixed(0)}K`,font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:11}}}}}}/></div>
            </div>

            {/* Collection velocity + Full P&L */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
              {/* Velocity */}
              <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
                <SectionHead icon={<FiZap size={15} color={C.indigo}/>} title="Collection Velocity" sub="This month's pace and projection"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
                  {[
                    {label:'Avg/Day this month', val:KES(velocity),   color:C.indigo},
                    {label:'Month-to-date',       val:KES(monthTotal), color:C.green},
                    {label:'Projected full month',val:KES(projected),  color:C.blue},
                    {label:'Payments this month', val:String(monthPays.length), color:C.purple},
                  ].map((m,i)=>(
                    <div key={i} style={{background:C.slateL,borderRadius:12,padding:'12px 14px'}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.slate,textTransform:'uppercase',letterSpacing:'0.07em'}}>{m.label}</div>
                      <div style={{fontSize:18,fontWeight:900,color:m.color,marginTop:4,fontFamily:"'Outfit',sans-serif"}}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:110}}><Line data={{labels:monthly12.map(m=>`${m.month}'${m.year}`),datasets:[{label:'Collections',data:monthly12.map(m=>m.amount),borderColor:C.indigo,backgroundColor:'rgba(79,70,229,0.06)',fill:true,tension:0.45,pointRadius:3,pointBackgroundColor:C.indigo}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{display:false,beginAtZero:true},x:{grid:{display:false},ticks:{font:{size:9}}}}}}/></div>
              </div>

              {/* Full P&L */}
              <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
                <SectionHead icon={<FiAward size={15} color={C.purple}/>} title="P&L Summary" sub="Income vs expenditure breakdown"/>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {label:'Fee Collections', val:totalCollected, color:C.green,  bg:C.greenL, type:'INCOME'},
                    {label:'Other Income',    val:totalIncome,    color:C.blue,   bg:C.blueL,  type:'INCOME'},
                    {label:'Total Expenses',  val:totalExpenses,  color:C.red,    bg:C.redL,   type:'EXPENSE'},
                    {label:'Outstanding',     val:totalOutstanding,color:C.amber, bg:C.amberL, type:'PENDING'},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:r.bg,borderRadius:10}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:800,color:r.color,textTransform:'uppercase',letterSpacing:'0.07em'}}>{r.type}</div>
                        <div style={{fontSize:13,fontWeight:700,color:'#374151'}}>{r.label}</div>
                      </div>
                      <div style={{fontSize:16,fontWeight:900,color:r.color,fontFamily:"'Outfit',sans-serif"}}>{KES(r.val)}</div>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:netPosition>=0?C.green:C.red,borderRadius:12,marginTop:4}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#fff'}}>{netPosition>=0?'NET SURPLUS':'NET DEFICIT'}</span>
                    <span style={{fontSize:16,fontWeight:900,color:'#fff',fontFamily:"'Outfit',sans-serif"}}>{KES(Math.abs(netPosition))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Method deep-dive */}
            <div style={{background:'#fff',borderRadius:20,padding:26,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
              <SectionHead icon={<FiCreditCard size={15} color={C.green}/>} title="Payment Method Deep-Dive" sub="Breakdown by volume, value and share"/>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {methodMap.map(([m,v],i)=>(
                  <div key={m}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:10,height:10,borderRadius:3,background:CHART_PALETTE[i%CHART_PALETTE.length],flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>{m}</span>
                        <Badge label={`${v.count} txns`} color={C.slate} bg={C.slateL}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:12,color:C.slate}}>{pct(v.total,totalCollected)}%</span>
                        <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{KES(v.total)}</span>
                      </div>
                    </div>
                    <PBar value={pct(v.total,totalCollected)} color={CHART_PALETTE[i%CHART_PALETTE.length]}/>
                  </div>
                ))}
                {methodMap.length===0&&<div style={{textAlign:'center',color:C.slate,padding:30}}>No payments recorded</div>}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ STUDENT LEDGER ════════════ */}
        {activeTab==='students'&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}} className="slide-up">
            {/* Top payers */}
            <div style={{background:'#fff',borderRadius:20,border:`1px solid ${C.slateBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)',overflow:'hidden'}}>
              <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.slateBd}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:22}}>🏅</span><div><div style={{fontWeight:900,fontSize:15,color:'#0f172a',fontFamily:"'Outfit',sans-serif"}}>Top Fee Payers</div><div style={{fontSize:11,color:C.slate}}>Students ranked by total amount paid</div></div></div>
                <select value={topStudentsN} onChange={e=>setTopStudentsN(Number(e.target.value))} style={{background:C.slateL,border:`1px solid ${C.slateBd}`,borderRadius:9,padding:'5px 10px',fontSize:12,fontWeight:700,color:'#374151',cursor:'pointer'}}>
                  {[5,10,20,50].map(n=><option key={n} value={n}>Top {n}</option>)}
                </select>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                  <thead><tr style={{background:'#f8fafc',borderBottom:`2px solid ${C.slateBd}`}}>
                    {['#','Student','Adm No','Form','Total Paid','Balance','Rate','Status'].map(h=>(
                      <th key={h} style={{padding:'10px 16px',textAlign:h==='#'?'center':['Total Paid','Balance'].includes(h)?'right':'left',fontWeight:800,fontSize:10,color:C.slate,textTransform:'uppercase',letterSpacing:'0.07em'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {studentPaySummary.slice(0,topStudentsN).map((st,i)=>{
                      const statusColor=st.balance===0?C.green:st.rate>=50?C.amber:C.red;
                      const statusLabel=st.balance===0?'CLEARED':st.rate>=50?'PARTIAL':'DEFAULTER';
                      const medals=['🥇','🥈','🥉'];
                      return(
                        <tr key={st.id} style={{borderBottom:`1px solid ${C.slateL}`,background:i<3?'#fffbeb':'#fff'}}>
                          <td style={{padding:'12px 16px',textAlign:'center',fontSize:18}}>{medals[i]||i+1}</td>
                          <td style={{padding:'12px 16px'}}>
                            <div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>{st.first_name} {st.last_name}</div>
                          </td>
                          <td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:11,color:C.slate}}>{st.admission_no||st.admission_number||'—'}</td>
                          <td style={{padding:'12px 16px'}}><Badge label={st.formName} color={C.indigo} bg={C.indigoL}/></td>
                          <td style={{padding:'12px 16px',textAlign:'right',fontWeight:900,color:C.green,fontSize:14}}>{KES(st.paid)}</td>
                          <td style={{padding:'12px 16px',textAlign:'right',fontWeight:900,color:st.balance>0?C.red:C.green}}>{KES(st.balance)}</td>
                          <td style={{padding:'12px 16px',minWidth:120}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:12,fontWeight:900,color:statusColor,minWidth:30}}>{st.rate}%</span>
                              <div style={{flex:1}}><PBar value={st.rate} color={statusColor} height={5}/></div>
                            </div>
                          </td>
                          <td style={{padding:'12px 16px'}}><Badge label={statusLabel} color={statusColor} bg={st.balance===0?C.greenL:st.rate>=50?C.amberL:C.redL}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Worst defaulters */}
            <div style={{background:'#fff',borderRadius:20,border:`1px solid ${C.redBd}`,boxShadow:'0 1px 6px rgba(0,0,0,0.05)',overflow:'hidden'}}>
              <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.redBd}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:22}}>🚨</span><div><div style={{fontWeight:900,fontSize:15,color:'#0f172a',fontFamily:"'Outfit',sans-serif"}}>Top Defaulters — Highest Outstanding</div><div style={{fontSize:11,color:C.slate}}>Students with largest unpaid fee balances</div></div></div>
                <Link href="/dashboard/fees/defaulters" style={{background:C.red,color:'#fff',borderRadius:9,padding:'7px 16px',fontWeight:800,fontSize:12}}>Manage All →</Link>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                  <thead><tr style={{background:'#fef2f2',borderBottom:`2px solid ${C.redBd}`}}>
                    {['#','Student','Form','Amount Paid','Balance Due','Rate','Action'].map(h=>(
                      <th key={h} style={{padding:'10px 16px',textAlign:['Amount Paid','Balance Due'].includes(h)?'right':'left',fontWeight:800,fontSize:10,color:C.red,textTransform:'uppercase',letterSpacing:'0.07em'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {worstDefaulters.slice(0,10).map((st,i)=>(
                      <tr key={st.id} style={{borderBottom:`1px solid ${C.slateL}`,background:i%2===0?'#fff':'#fafafa'}}>
                        <td style={{padding:'12px 16px',fontWeight:900,color:C.red,fontSize:14}}>{i+1}</td>
                        <td style={{padding:'12px 16px',fontWeight:800,color:'#0f172a'}}>{st.first_name} {st.last_name}</td>
                        <td style={{padding:'12px 16px'}}><Badge label={st.formName} color={C.indigo} bg={C.indigoL}/></td>
                        <td style={{padding:'12px 16px',textAlign:'right',fontWeight:700,color:C.green}}>{KES(st.paid)}</td>
                        <td style={{padding:'12px 16px',textAlign:'right',fontWeight:900,color:C.red,fontSize:14}}>{KES(st.balance)}</td>
                        <td style={{padding:'12px 16px',minWidth:120}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:12,fontWeight:900,color:C.red,minWidth:30}}>{st.rate}%</span>
                            <div style={{flex:1}}><PBar value={st.rate} color={C.red} height={5}/></div>
                          </div>
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <Link href={`/dashboard/fees/statements?student=${st.id}`} style={{background:C.amberL,color:C.amber,border:`1px solid ${C.amberBd}`,borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:800}}>Statement</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ ALL MODULES ════════════ */}
        {activeTab==='modules'&&(
          <div style={{display:'flex',flexDirection:'column',gap:26}} className="slide-up">
            {(['Core','Ultra','Finance','Compliance'] as const).map(tier=>{
              const mods=allModules.filter(m=>m.tier===tier);
              const tm=tierMeta[tier];
              return(
                <div key={tier}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                    <span style={{background:tm.bg,color:tm.badge,fontSize:11,fontWeight:900,padding:'5px 14px',borderRadius:99,textTransform:'uppercase',letterSpacing:'0.08em'}}>{tm.icon} {tier}</span>
                    <div style={{flex:1,height:1,background:C.slateBd}}/>
                    <span style={{fontSize:11,color:C.slate,fontWeight:700}}>{mods.length} modules</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))',gap:12}}>
                    {mods.map((m,i)=>(
                      <Link key={i} href={m.href} className="fee-mod-card" style={{background:'#fff',borderRadius:16,padding:'18px 16px',border:`1.5px solid ${m.color}20`,display:'flex',flexDirection:'column',gap:8,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',position:'relative',overflow:'hidden',color:'inherit'}}>
                        <div style={{position:'absolute',top:-12,right:-12,width:50,height:50,borderRadius:'50%',background:m.color,opacity:0.07}}/>
                        <div style={{width:40,height:40,borderRadius:12,background:`${m.color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{m.icon}</div>
                        <div style={{fontWeight:800,fontSize:13,color:'#0f172a',lineHeight:1.2,fontFamily:"'Inter',sans-serif"}}>{m.label}</div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:2}}>
                          <Badge label={tier} color={tm.badge} bg={tm.bg}/>
                          <FiArrowRight size={11} color={m.color}/>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
