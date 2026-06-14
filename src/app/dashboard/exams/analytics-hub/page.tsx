'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  FiTrendingUp, FiAward, FiUsers, FiBook, FiBarChart2, FiZap,
  FiShield, FiTarget, FiRefreshCw, FiExternalLink, FiGrid,
  FiAlertTriangle, FiCheckCircle, FiArrowRight, FiStar,
} from 'react-icons/fi';

const BASE = '/dashboard/exams';

const MODULES = [
  // ── 8-4-4 ANALYTICS ────────────────────────────────────
  {
    group: '8-4-4 Core Analytics',
    color: '#6366f1',
    items: [
      {
        href: `${BASE}/grade-heatmap`,
        icon: '🌡️',
        title: 'Grade Heatmap',
        badge: 'HOT',
        badgeColor: '#ef4444',
        tagline: 'Subject × Grade Color Matrix',
        desc: 'A full heat-map grid showing every subject vs every grade boundary (A–E). See instantly which subjects are red-hot with failures and which glow green with excellence. Drill into any cell for individual student counts.',
        features: ['Subject × Grade matrix', 'Color intensity encoding', 'Pass/fail boundary lines', 'Click-to-drill student list'],
        color: '#6366f1',
        bg: 'linear-gradient(135deg,#6366f1,#4f46e5)',
      },
      {
        href: `${BASE}/national-readiness`,
        icon: '🎯',
        title: 'KCSE Readiness Tracker',
        badge: 'KCSE',
        badgeColor: '#059669',
        tagline: 'Predicted Mean Grade per Student',
        desc: 'The most important page for Form 4 teachers and the principal. Predicts each student\'s KCSE mean grade based on current performance — grades A through E, points, and probability of hitting each threshold.',
        features: ['Mean grade prediction', 'Per-student KCSE forecast', 'Pass rate projections', 'Target vs current gap'],
        color: '#059669',
        bg: 'linear-gradient(135deg,#059669,#047857)',
      },
      {
        href: `${BASE}/grade-distribution`,
        icon: '📊',
        title: 'Grade Distribution Analysis',
        badge: 'STATS',
        badgeColor: '#7c3aed',
        tagline: 'Bell Curve, Percentiles & Standard Deviation',
        desc: 'Statistical distribution engine showing the full spread of student performance: bell curves, percentile rankings, standard deviation, skewness, and kurtosis — giving you data-science-grade insight into your exam results.',
        features: ['Bell curve visualization', 'Percentile rankings (P25/P50/P75)', 'Standard deviation analysis', 'Export percentile report'],
        color: '#7c3aed',
        bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
      },
      {
        href: `${BASE}/stream-battle`,
        icon: '⚔️',
        title: 'Stream Battle Leaderboard',
        badge: 'NEW',
        badgeColor: '#0891b2',
        tagline: 'Class vs Class Head-to-Head Tournament',
        desc: 'Turn academics into a competition. Ranks every class/stream against each other with a live leaderboard, head-to-head matchups, trophy icons for top 3, and animated score bars. Schools love this for motivation.',
        features: ['Class-vs-class rankings', 'Head-to-head subject matchups', 'Trophy podium for top 3', 'Per-subject class comparison'],
        color: '#0891b2',
        bg: 'linear-gradient(135deg,#0891b2,#0e7490)',
      },
      {
        href: `${BASE}/term-trend`,
        icon: '📆',
        title: 'Multi-Term Performance Trends',
        badge: 'TREND',
        badgeColor: '#1e40af',
        tagline: 'Longitudinal School Performance Tracker',
        desc: 'Tracks how the school performs across every exam period — from Term 1 to Term 3 across multiple years. See if you\'re improving, plateauing, or declining. Essential for Board of Management reports and TSC accountability.',
        features: ['Term-by-term trend lines', 'Subject-wise trend comparison', 'Best/worst period highlights', 'Print-ready BOM report'],
        color: '#1e40af',
        bg: 'linear-gradient(135deg,#1e40af,#1e3a8a)',
      },
      {
        href: `${BASE}/subject-difficulty`,
        icon: '📉',
        title: 'Subject Difficulty Index',
        badge: 'INDEX',
        badgeColor: '#ea580c',
        tagline: 'Rank Subjects by Difficulty — Guide Resources',
        desc: 'Calculates a Difficulty Index for every subject based on pass rates, standard deviation, and mean score. Know exactly which subjects are killing your results and which need more teacher support or teaching hours.',
        features: ['Difficulty Index (DI) ranking', 'Pass rate by subject', 'Std deviation analysis', 'Action recommendations'],
        color: '#ea580c',
        bg: 'linear-gradient(135deg,#ea580c,#dc2626)',
      },
    ],
  },
  // ── STUDENT INTELLIGENCE ───────────────────────────────
  {
    group: 'Student Intelligence',
    color: '#0891b2',
    items: [
      {
        href: `${BASE}/student-trajectory`,
        icon: '📈',
        title: 'Student Learning Trajectory',
        badge: 'INDIVIDUAL',
        badgeColor: '#6366f1',
        tagline: 'Complete Academic Journey Per Student',
        desc: 'Search any student and see their entire academic history visualized — performance trajectory across exams, subject radar chart, best/weakest subjects, improvement indicators, and comparison against class and school averages.',
        features: ['Individual trajectory chart', 'Subject radar vs school avg', 'Best/worst subject detection', 'CSV export per student'],
        color: '#6366f1',
        bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      },
      {
        href: `${BASE}/peer-comparison`,
        icon: '👥',
        title: 'Peer Comparison Engine',
        badge: 'BENCHMARK',
        badgeColor: '#0891b2',
        tagline: 'Percentile Ranking vs Class & School',
        desc: 'Tells a student exactly where they stand relative to their peers. Percentile bar, rank in school, subject-by-subject comparison against class average and school average — all in one premium view with color-coded gaps.',
        features: ['Percentile position bar', 'Rank in school + class', 'Subject vs class + school table', 'Print individual report'],
        color: '#0891b2',
        bg: 'linear-gradient(135deg,#0891b2,#0e7490)',
      },
      {
        href: `${BASE}/value-added`,
        icon: '➕',
        title: 'Value-Added Analysis',
        badge: 'IMPACT',
        badgeColor: '#059669',
        tagline: 'Measure School\'s True Impact on Student Growth',
        desc: 'Value-Added (VA) measures how much the school has accelerated each student beyond their baseline prediction. A high VA means the school is adding real value. A negative VA is an early warning that needs investigation.',
        features: ['Baseline vs current comparison', 'VA score per student (+/−)', 'VA distribution histogram', 'High VA recognition'],
        color: '#059669',
        bg: 'linear-gradient(135deg,#059669,#047857)',
      },
      {
        href: `${BASE}/intervention-engine`,
        icon: '🚨',
        title: 'Intervention Priority Engine',
        badge: 'URGENT',
        badgeColor: '#dc2626',
        tagline: 'AI Risk Scores — Act Before It\'s Too Late',
        desc: 'The most powerful welfare tool in the system. Automatically ranks every at-risk student by severity score, shows their risk factors, and lets you send SMS to parents, assign mentors, or create intervention plans — all in one click.',
        features: ['Risk score per student (0–10)', 'Critical/High/Medium tiers', '1-click SMS to parents', 'Assign mentor + create plan'],
        color: '#dc2626',
        bg: 'linear-gradient(135deg,#dc2626,#991b1b)',
      },
    ],
  },
  // ── MANAGEMENT ANALYTICS ──────────────────────────────
  {
    group: 'Management & Leadership',
    color: '#d97706',
    items: [
      {
        href: `${BASE}/executive-dashboard`,
        icon: '🏛️',
        title: 'Executive Dashboard',
        badge: 'BOD',
        badgeColor: '#1a1a2e',
        tagline: 'Board-Ready School Health Scorecard',
        desc: 'A single-page report designed for principals, BOG members, and TSC inspection readiness. School health scorecard, KPI summary, grade distribution doughnut, form-wise bar chart, trend line, and auto-generated smart insights.',
        features: ['School health scorecard (0–100%)', 'KCSE mean grade prediction', 'Auto-generated smart insights', 'Print confidential report'],
        color: '#1a1a2e',
        bg: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
      },
      {
        href: `${BASE}/teacher-correlation`,
        icon: '👩‍🏫',
        title: 'Teacher Performance Analytics',
        badge: 'TSC',
        badgeColor: '#7c3aed',
        tagline: 'Correlate Teaching Effectiveness with Outcomes',
        desc: 'Links each teacher to their subject\'s exam performance. Radar chart comparison of top 3 teachers, performance tier badges (Excellent / Good / Average / Needs Support), pass rates per teacher, and actionable CPD recommendations.',
        features: ['Teacher ranking by subject avg', 'Multi-axis radar comparison', 'Performance tier classification', 'CPD recommendations'],
        color: '#7c3aed',
        bg: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
      },
      {
        href: `${BASE}/school-ranking`,
        icon: '🎖️',
        title: 'School Rankings Engine',
        badge: 'TOP',
        badgeColor: '#d97706',
        tagline: 'Complete Academic Leaderboard by Form & Class',
        desc: 'The definitive academic leaderboard. Animated gold/silver/bronze podium for top 3, bar chart of top 10, and a full paginated rankings table with grade badges, form filter, and search — filterable by form or school-wide.',
        features: ['Gold/silver/bronze podium UI', 'School-wide or per-form filter', 'Grade + points per student', 'Export & print rankings'],
        color: '#d97706',
        bg: 'linear-gradient(135deg,#d97706,#b45309)',
      },
      {
        href: `${BASE}/exam-integrity`,
        icon: '🛡️',
        title: 'Exam Integrity Monitor',
        badge: 'SECURITY',
        badgeColor: '#dc2626',
        tagline: 'Statistical Anomaly Detection Engine',
        desc: 'Uses statistical methods to automatically flag suspicious exam results: score spikes above personal average, statistical outliers (>2.5σ from class mean), perfect 100% scores, and dramatic improvements. Assign flags or clear records.',
        features: ['Score spike detection', 'Statistical outlier (z-score)', 'Flag / Clear workflow', 'Integrity score 0–100'],
        color: '#dc2626',
        bg: 'linear-gradient(135deg,#dc2626,#7f1d1d)',
      },
    ],
  },
  // ── AI INTELLIGENCE ───────────────────────────────────
  {
    group: 'AI & Intelligence',
    color: '#059669',
    items: [
      {
        href: `${BASE}/ai-insights`,
        icon: '🤖',
        title: 'AI Academic Insights',
        badge: 'AI',
        badgeColor: '#6366f1',
        tagline: 'Auto-Generated Intelligence from Real Data',
        desc: 'No manual analysis needed. The AI engine scans your exam marks and auto-generates critical insights: weak subjects, declining students, star performers, gender gaps, form performance gaps — all with recommended actions.',
        features: ['Auto-detects weak subjects', 'Identifies star performers', 'Gender gap analysis', 'Actionable recommendations'],
        color: '#6366f1',
        bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      },
    ],
  },
  // ── CBC ANALYTICS ─────────────────────────────────────
  {
    group: 'CBC Competency Analytics',
    color: '#7c3aed',
    items: [
      {
        href: `${BASE}/cbc-reports/competency-wheel`,
        icon: '☯️',
        title: 'CBC Competency Coverage',
        badge: 'CBC',
        badgeColor: '#7c3aed',
        tagline: '7-Axis Competency Radar vs 80% Target',
        desc: 'Visualizes all 7 CBC core competencies on a radar wheel and compares school performance against the 80% target. Doughnut chart, per-grade breakdown (Grade 7/8/9), and a gap analysis table with teacher recommendations.',
        features: ['7-axis competency radar', 'Per-grade (7/8/9) comparison', 'Gap to target analysis', 'Teacher recommendations'],
        color: '#7c3aed',
        bg: 'linear-gradient(135deg,#7c3aed,#4c1d95)',
      },
      {
        href: `${BASE}/cbc-reports/pathway-engine`,
        icon: '🛤️',
        title: 'CBC Pathway Prediction',
        badge: 'SENIOR',
        badgeColor: '#059669',
        tagline: 'AI-Powered Senior School Pathway Guidance',
        desc: 'Predicts the best Senior School pathway (STEM / Social Sciences / Arts / Technical & Vocational) for every Grade 9 student based on their competency and subject performance scores. Generates formal pathway recommendation letters.',
        features: ['4-pathway prediction engine', 'Confidence score per student', 'Pathway recommendation letters', 'Counsellor guidance export'],
        color: '#059669',
        bg: 'linear-gradient(135deg,#059669,#065f46)',
      },
      {
        href: `${BASE}/cbc-reports/rubric-analytics`,
        icon: '📏',
        title: 'Rubric & Strand Analytics',
        badge: 'RUBRIC',
        badgeColor: '#be185d',
        tagline: 'Subject × Strand Performance Heatmap',
        desc: 'The deepest CBC analytics page. A full Subject × Strand heatmap showing rubric levels (EE/ME/AE/BE) for every cell, trend line showing improvement over terms, and below-expectations alerts with corrective action guidance.',
        features: ['Subject × strand heatmap', 'EE/ME/AE/BE rubric levels', 'Term trend line chart', 'Below-expectations alerts'],
        color: '#be185d',
        bg: 'linear-gradient(135deg,#be185d,#9d174d)',
      },
    ],
  },
];

function avgToGrade(avg: number) {
  if (avg>=75)return'A'; if(avg>=70)return'A-'; if(avg>=65)return'B+'; if(avg>=60)return'B';
  if(avg>=55)return'B-'; if(avg>=50)return'C+'; if(avg>=45)return'C'; if(avg>=40)return'C-';
  if(avg>=35)return'D+'; if(avg>=30)return'D'; if(avg>=25)return'D-'; return'E';
}

export default function AnalyticsHubPage() {
  const [stats, setStats]   = useState({ students:0, avg:0, passRate:0, gradeA:0, exams:0, subjects:0, teachers:0 });
  const [loading, setLoading] = useState(true);
  const [school, setSchool]   = useState<any>({});
  const [hovered, setHovered] = useState<string|null>(null);
  const [refresh, setRefresh] = useState(0);
  const today = new Date().toLocaleDateString('en-KE',{ weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { count: sc }, { count: tc }, { count: ec }, { count: subc },
      { data: marks }, { data: sch }
    ] = await Promise.all([
      supabase.from('school_students').select('id',{count:'exact',head:true}).eq('status','Active'),
      supabase.from('school_teachers').select('id',{count:'exact',head:true}).eq('status','Active'),
      supabase.from('school_exams').select('id',{count:'exact',head:true}),
      supabase.from('school_subjects').select('id',{count:'exact',head:true}),
      supabase.from('school_exam_marks').select('marks').limit(10000),
      supabase.from('school_details').select('school_name,county,type,motto').maybeSingle(),
    ]);
    const allM = (marks||[]).map((m:any)=>Number(m.marks||0));
    const avg = allM.length ? allM.reduce((a:number,b:number)=>a+b,0)/allM.length : 0;
    const pass = allM.length ? allM.filter((m:number)=>m>=50).length/allM.length*100 : 0;
    const gradeA = allM.filter((m:number)=>m>=75).length;
    setStats({ students:sc||0, avg:Math.round(avg*10)/10, passRate:Math.round(pass), gradeA, exams:ec||0, subjects:subc||0, teachers:tc||0 });
    setSchool(sch||{});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  const meanGrade = avgToGrade(stats.avg);
  const totalModules = MODULES.reduce((a,g)=>a+g.items.length,0);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════
          HERO HEADER — same design pattern as stores/ultra
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#2e1065 40%,#1e3a8a 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'24px 24px' }}/>
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#a78bfa,transparent)', transform:'translate(30%,-30%)' }}/>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#38bdf8,transparent)', transform:'translateY(40%)' }}/>

        <div className="relative px-6 py-5">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl text-2xl"
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📊</div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-violet-300">APSIMS Intelligence Platform</span>
                  <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse"/>
                </div>
                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                  Exam Analytics Command Center
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full"
                    style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {totalModules} MODULES
                  </span>
                </h1>
                <p className="text-violet-300 text-xs mt-0.5 font-medium">
                  {school?.school_name || 'APSIMS School'} · {school?.county||'Kenya'} · {today}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`${BASE}/executive-dashboard`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition hover:bg-white/10"
                style={{ border:'1px solid rgba(255,255,255,0.2)' }}>
                <FiGrid size={12}/> Executive Dashboard
              </Link>
              <Link href={`${BASE}/ai-insights`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition"
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <FiZap size={12}/> AI Insights
              </Link>
              <button onClick={()=>setRefresh(r=>r+1)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition">
                <FiRefreshCw size={14} className={loading?'animate-spin':''}/>
              </button>
            </div>
          </div>

          {/* ── KPI STRIP (glassmorphism pills — same as stores/ultra) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-5 pt-4 border-t border-white/10">
            {[
              { label:'Active Students', value: stats.students,       icon:'👨‍🎓', pulse:false },
              { label:'School Average',  value: loading?'…':stats.avg+'%', icon:'📈', pulse:false },
              { label:'Pass Rate',       value: loading?'…':stats.passRate+'%', icon:'✅', pulse:stats.passRate>0&&stats.passRate<50 },
              { label:'Mean Grade',      value: loading?'…':meanGrade, icon:'🎯', pulse:false },
              { label:'Grade A Students',value: loading?'…':stats.gradeA, icon:'🏆', pulse:false },
              { label:'Exams Recorded',  value: loading?'…':stats.exams, icon:'📝', pulse:false },
              { label:'Subjects Offered',value: loading?'…':stats.subjects, icon:'📚', pulse:false },
              { label:'Analytics Pages', value: '22+',               icon:'⚡', pulse:false },
            ].map((c,i) => (
              <div key={i}
                className={`rounded-xl p-3 transition-all hover:scale-[1.04] ${c.pulse?'animate-pulse':''}`}
                style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{c.icon}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span>
                </div>
                <p className="text-xl font-black text-white">{loading&&c.label!=='Analytics Pages'?'…':c.value}</p>
              </div>
            ))}
          </div>

          {/* ── SCHOOL HEALTH BAR ── */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">School Performance Health</span>
              <span className="text-[10px] font-black text-white/60">
                {stats.passRate>=70?'🟢 Excellent':stats.passRate>=50?'🟡 Good':stats.passRate>0?'🔴 Needs Attention':'⚪ No Data'}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-1000"
                style={{ width:`${stats.passRate}%`, background:'linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)' }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          QUICK ACTIONS STRIP
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href:`${BASE}/intervention-engine`, icon:'🚨', label:'Priority Interventions', desc:'Students needing urgent action', color:'#dc2626', bg:'linear-gradient(135deg,#fef2f2,#fff)' },
          { href:`${BASE}/executive-dashboard`, icon:'🏛️', label:'Executive Report',       desc:'Board-ready summary report',   color:'#1e1b4b', bg:'linear-gradient(135deg,#eef2ff,#fff)' },
          { href:`${BASE}/school-ranking`,       icon:'🥇', label:'School Rankings',        desc:'Full academic leaderboard',    color:'#d97706', bg:'linear-gradient(135deg,#fffbeb,#fff)' },
          { href:`${BASE}/ai-insights`,          icon:'🤖', label:'AI Insights',            desc:'Auto-generated intelligence',  color:'#6366f1', bg:'linear-gradient(135deg,#f5f3ff,#fff)' },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            style={{ background:q.bg }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
              style={{ background:'#fff' }}>{q.icon}</div>
            <div className="min-w-0">
              <p className="font-extrabold text-gray-800 text-sm truncate">{q.label}</p>
              <p className="text-xs text-gray-400 truncate">{q.desc}</p>
            </div>
            <FiArrowRight size={14} className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color:q.color }}/>
          </Link>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODULE GROUPS
      ═══════════════════════════════════════════════════════════ */}
      {MODULES.map(group => (
        <div key={group.group} className="space-y-3">
          {/* Group Header */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background:group.color }}/>
            <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider">{group.group}</h2>
            <div className="flex-1 h-px bg-gray-100"/>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {group.items.length} modules
            </span>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.items.map(mod => (
              <Link key={mod.href} href={mod.href}
                onMouseEnter={()=>setHovered(mod.href)}
                onMouseLeave={()=>setHovered(null)}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-white flex flex-col">

                {/* Colour accent top bar */}
                <div className="h-1.5 w-full" style={{ background:mod.bg }}/>

                {/* Card top — icon + badge + title */}
                <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
                    style={{ background:mod.bg }}>
                    {mod.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-gray-900 text-sm leading-snug">{mod.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black text-white flex-shrink-0"
                        style={{ background:mod.badgeColor }}>
                        {mod.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{mod.tagline}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="px-5 pb-3 flex-1">
                  <p className="text-xs text-gray-500 leading-relaxed">{mod.desc}</p>
                </div>

                {/* Feature bullets */}
                <div className="px-5 pb-4">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {mod.features.map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:mod.color }}/>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between"
                  style={{ background: hovered===mod.href ? '#fafafa' : '#fff' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color:mod.color }}>
                    Open Analytics
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-white text-[10px] font-bold shadow-sm group-hover:shadow-md transition-all"
                    style={{ background:mod.bg }}>
                    <FiExternalLink size={10}/>
                    Launch
                  </div>
                </div>

                {/* Hover glow overlay */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow:`inset 0 0 0 1.5px ${mod.color}40` }}/>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* ═══════════════════════════════════════════════════════════
          FOOTER INTELLIGENCE BANNER
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-6"
        style={{ background:'linear-gradient(135deg,#0f172a,#1e1b4b,#0c4a6e)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'24px 24px' }}/>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10"
          style={{ background:'radial-gradient(circle,#6366f1,transparent)', transform:'translate(30%,-30%)' }}/>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
              🇰🇪 Defeating Zeraki · Built for Kenyan Schools
            </p>
            <h3 className="text-lg font-extrabold text-white">APSIMS — Africa's Most Advanced School Analytics</h3>
            <p className="text-white/50 text-xs mt-1 max-w-lg">
              {totalModules} analytics pages · 8-4-4 & CBC support · Real-time data · Export CSV · Print PDF · AI-powered insights
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`${BASE}/executive-dashboard`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <FiGrid size={12}/> Executive Report
            </Link>
            <Link href={`${BASE}/ai-insights`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white border border-white/20 hover:bg-white/10">
              <FiZap size={12}/> AI Insights
            </Link>
          </div>
        </div>
        {/* Module count strip */}
        <div className="relative mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-4">
          {MODULES.map(g => (
            <div key={g.group} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background:g.color }}/>
              <span className="text-[10px] text-white/40 font-bold">{g.group} ({g.items.length})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
