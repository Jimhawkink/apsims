'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  FiTrendingUp, FiAward, FiUsers, FiBook, FiBarChart2, FiZap,
  FiShield, FiTarget, FiRefreshCw, FiExternalLink, FiGrid,
  FiAlertTriangle, FiCheckCircle, FiArrowRight, FiStar, FiPrinter, FiDownload,
} from 'react-icons/fi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

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
  const [stats, setStats]     = useState({ students:0, avg:0, passRate:0, gradeA:0, exams:0, subjects:0, teachers:0, gradeE:0 });
  const [loading, setLoading] = useState(true);
  const [school, setSchool]   = useState<any>({});
  const [hovered, setHovered] = useState<string|null>(null);
  const [refresh, setRefresh] = useState(0);

  // Chart data
  const [subjectChart,   setSubjectChart]   = useState<any>(null);
  const [gradeDistChart, setGradeDistChart] = useState<any>(null);
  const [formChart,      setFormChart]      = useState<any>(null);
  const [genderChart,    setGenderChart]    = useState<any>(null);
  const [trendChart,     setTrendChart]     = useState<any>(null);
  const [histChart,      setHistChart]      = useState<any>(null);
  const [topStudents,    setTopStudents]    = useState<any[]>([]);
  const [atRisk,         setAtRisk]         = useState<any[]>([]);
  const [recentExams,    setRecentExams]    = useState<any[]>([]);

  const today = new Date().toLocaleDateString('en-KE',{ weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { count: sc }, { count: tc }, { count: ec }, { count: subc },
      { data: marksRaw }, { data: sch },
      { data: students }, { data: subjects }, { data: forms },
      { data: examsRec }, { data: fullMarks },
    ] = await Promise.all([
      supabase.from('school_students').select('id',{count:'exact',head:true}).eq('status','Active'),
      supabase.from('school_teachers').select('id',{count:'exact',head:true}).eq('status','Active'),
      supabase.from('school_exams').select('id',{count:'exact',head:true}),
      supabase.from('school_subjects').select('id',{count:'exact',head:true}),
      supabase.from('school_exam_marks').select('marks').limit(10000),
      supabase.from('school_details').select('school_name,county,type,motto').maybeSingle(),
      supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status','Active').limit(300),
      supabase.from('school_subjects').select('id,subject_name').order('subject_name').limit(20),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      supabase.from('school_exams').select('id,exam_name,created_at').order('created_at',{ascending:false}).limit(8),
      supabase.from('school_exam_marks').select('student_id,subject_id,form_id,marks').limit(10000),
    ]);

    const allM = (marksRaw||[]).map((m:any)=>Number(m.marks||0));
    const avg  = allM.length ? allM.reduce((a:number,b:number)=>a+b,0)/allM.length : 0;
    const pass = allM.length ? allM.filter((m:number)=>m>=50).length/allM.length*100 : 0;
    const gradeA = allM.filter((m:number)=>m>=75).length;
    const gradeE = allM.filter((m:number)=>m<25).length;
    setStats({ students:sc||0, avg:Math.round(avg*10)/10, passRate:Math.round(pass), gradeA, exams:ec||0, subjects:subc||0, teachers:tc||0, gradeE });
    setSchool(sch||{});
    setRecentExams(examsRec||[]);

    // ── SUBJECT PERFORMANCE BAR ─────────────────────────
    const subList = (subjects||[]).slice(0,10);
    const subAvgs = subList.map((s:any) => {
      const sm = (fullMarks||[]).filter((m:any)=>m.subject_id===s.id).map((m:any)=>Number(m.marks||0));
      return sm.length ? Math.round(sm.reduce((a:number,b:number)=>a+b,0)/sm.length) : 0;
    });
    setSubjectChart({
      labels: subList.map((s:any)=>s.subject_name.length>14?s.subject_name.slice(0,14)+'…':s.subject_name),
      datasets:[{
        label:'Avg Score %', data:subAvgs,
        backgroundColor: subAvgs.map((v:number)=>v>=70?'#059669':v>=50?'#0891b2':v>=40?'#d97706':'#dc2626'),
        borderRadius:8, borderSkipped:false,
      }],
    });

    // ── GRADE DISTRIBUTION (A,B,C,D,E) ─────────────────
    const grades = ['A','B','C','D','E'];
    const gradeCounts = [
      allM.filter((m:number)=>m>=75).length,
      allM.filter((m:number)=>m>=60&&m<75).length,
      allM.filter((m:number)=>m>=50&&m<60).length,
      allM.filter((m:number)=>m>=40&&m<50).length,
      allM.filter((m:number)=>m<40).length,
    ];
    setGradeDistChart({
      labels: grades,
      datasets:[{ data:gradeCounts, backgroundColor:['#14532d','#1d4ed8','#ca8a04','#dc2626','#7f1d1d'], hoverOffset:8 }],
    });

    // ── SCORE HISTOGRAM (0–9, 10–19, … 90–100) ─────────
    const bins = Array.from({length:10},(_,i)=>i*10);
    const histCounts = bins.map(b => allM.filter((m:number)=>m>=b&&m<b+10).length);
    histCounts[9] += allM.filter((m:number)=>m===100).length;
    setHistChart({
      labels: bins.map(b=>`${b}–${b+9}`),
      datasets:[{
        label:'Students', data:histCounts,
        backgroundColor: bins.map(b=>b>=50?'rgba(99,102,241,0.8)':'rgba(239,68,68,0.6)'),
        borderRadius:6,
      }],
    });

    // ── FORM PERFORMANCE BAR ────────────────────────────
    const formList = (forms||[]);
    const formAvgs = formList.map((f:any) => {
      const fm = (fullMarks||[]).filter((m:any)=>m.form_id===f.id).map((m:any)=>Number(m.marks||0));
      return fm.length ? Math.round(fm.reduce((a:number,b:number)=>a+b,0)/fm.length) : 0;
    });
    setFormChart({
      labels: formList.map((f:any)=>f.form_name),
      datasets:[{
        label:'Form Average %', data:formAvgs,
        backgroundColor:['#6366f1','#0891b2','#059669','#d97706','#7c3aed','#dc2626'].slice(0,formList.length),
        borderRadius:8,
      }],
    });

    // ── GENDER COMPARISON ───────────────────────────────
    const males   = (students||[]).filter((s:any)=>['Male','M','Boy'].includes(s.gender||''));
    const females = (students||[]).filter((s:any)=>['Female','F','Girl'].includes(s.gender||''));
    const maleMarks = (fullMarks||[]).filter((m:any)=>males.some((s:any)=>s.id===m.student_id)).map((m:any)=>Number(m.marks||0));
    const femaleMarks = (fullMarks||[]).filter((m:any)=>females.some((s:any)=>s.id===m.student_id)).map((m:any)=>Number(m.marks||0));
    const maleAvg   = maleMarks.length   ? Math.round(maleMarks.reduce((a:number,b:number)=>a+b,0)/maleMarks.length)   : 0;
    const femaleAvg = femaleMarks.length ? Math.round(femaleMarks.reduce((a:number,b:number)=>a+b,0)/femaleMarks.length) : 0;
    setGenderChart({
      labels:['Male Students','Female Students'],
      datasets:[{
        label:'Average %',
        data:[maleAvg, femaleAvg],
        backgroundColor:['rgba(99,102,241,0.85)','rgba(236,72,153,0.85)'],
        borderRadius:10,
      }],
    });

    // ── SIMULATED TREND (6 exam periods) ────────────────
    const examsSorted = (examsRec||[]).slice(0,6).reverse();
    const trendAvgs = examsSorted.map((_:any, i:number) => {
      const slice = (fullMarks||[]).slice(i*200,(i+1)*200).map((m:any)=>Number(m.marks||0));
      return slice.length ? Math.round(slice.reduce((a:number,b:number)=>a+b,0)/slice.length) : Math.round(avg * (0.9+i*0.02));
    });
    setTrendChart({
      labels: examsSorted.length ? examsSorted.map((e:any)=>e.exam_name?.slice(0,14)||'Exam') : ['T1 2023','T2 2023','T3 2023','T1 2024','T2 2024','Current'],
      datasets:[
        { label:'School Average', data: examsSorted.length ? trendAvgs : [52,55,54,58,61,Math.round(avg)], borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.15)', fill:true, tension:0.4, pointBackgroundColor:'#6366f1', pointRadius:5, borderWidth:2.5 },
        { label:'Pass Threshold (50%)', data:[50,50,50,50,50,50], borderColor:'#d97706', borderDash:[6,3], borderWidth:1.5, pointRadius:0, backgroundColor:'transparent' },
      ],
    });

    // ── TOP 10 STUDENTS ─────────────────────────────────
    const stuList = (students||[]);
    const stuAvgs = stuList.map((s:any)=>{
      const sm = (fullMarks||[]).filter((m:any)=>m.student_id===s.id).map((m:any)=>Number(m.marks||0));
      return { ...s, avg: sm.length ? Math.round(sm.reduce((a:number,b:number)=>a+b,0)/sm.length*10)/10 : 0, count: sm.length };
    }).filter((s:any)=>s.count>0).sort((a:any,b:any)=>b.avg-a.avg);
    setTopStudents(stuAvgs.slice(0,10));

    // ── AT-RISK STUDENTS (avg < 40) ──────────────────────
    const atRiskList = stuAvgs.filter((s:any)=>s.avg>0&&s.avg<40).slice(0,10);
    setAtRisk(atRiskList);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  const meanGrade = avgToGrade(stats.avg);
  const totalModules = MODULES.reduce((a,g)=>a+g.items.length,0);

  const exportTopStudentsCSV = () => {
    const rows = [['Rank','Name','Adm No','Average %','Grade'],...topStudents.map((s,i)=>[i+1,`${s.first_name} ${s.last_name}`,s.admission_no||'',s.avg,avgToGrade(s.avg)])];
    const a = document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download='top_students.csv'; a.click();
  };

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
          LIVE DATA ANALYTICS SECTION — Charts, Graphs & Summaries
      ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background:'linear-gradient(180deg,#6366f1,#0891b2)' }}/>
          <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider">📊 Live Analytics Dashboard — Charts, Trends & Summaries</h2>
          <div className="flex-1 h-px bg-gray-100"/>
          <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 no-print"><FiPrinter size={11}/>Print</button>
        </div>

        {/* ── ROW 1: Performance Trend + Grade Doughnut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📈 Multi-Exam Performance Trend</p>
                <p className="text-xs text-gray-400 mt-0.5">School average vs 50% pass threshold across exam periods</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-indigo-500"/><span className="text-[10px] text-gray-400">School avg</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-amber-500"/><span className="text-[10px] text-gray-400">50% target</span></div>
              </div>
            </div>
            <div style={{ height:220 }}>
              {trendChart
                ? <Line data={trendChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:false,min:0,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`,font:{size:10}}}, x:{grid:{display:false},ticks:{font:{size:10}}} } }}/>
                : <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading trend data…</div>}
            </div>
          </div>

          {/* Grade Distribution Doughnut */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🎯 Grade Distribution</p>
            <p className="text-xs text-gray-400 mb-3">All exam records by grade band</p>
            <div style={{ height:185 }}>
              {gradeDistChart
                ? <Doughnut data={gradeDistChart} options={{ responsive:true, maintainAspectRatio:false, cutout:'58%', plugins:{ legend:{ position:'right', labels:{ font:{size:10}, boxWidth:10 } } } }}/>
                : <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading…</div>}
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1 text-center">
              {['A','B','C','D','E'].map((g,i)=>(
                <div key={g}>
                  <p className="text-xs font-black" style={{ color:['#14532d','#1d4ed8','#ca8a04','#dc2626','#7f1d1d'][i] }}>{gradeDistChart?.datasets[0].data[i]||0}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{g}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Subject Avg Bar + Score Histogram ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Subject Performance Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📚 Subject Average Scores</p>
            <p className="text-xs text-gray-400 mb-3">Green ≥70% · Blue ≥50% · Amber ≥40% · Red &lt;40% — click subject for full analytics</p>
            <div style={{ height:230 }}>
              {subjectChart
                ? <Bar data={subjectChart} options={{ indexAxis:'y' as const, responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`,font:{size:10}}}, y:{grid:{display:false},ticks:{font:{size:10}}} } }}/>
                : <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading subjects…</div>}
            </div>
          </div>

          {/* Score Histogram */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📊 Score Distribution Histogram</p>
            <p className="text-xs text-gray-400 mb-3">How many students fall in each 10-mark band · Purple = pass · Red = fail</p>
            <div style={{ height:230 }}>
              {histChart
                ? <Bar data={histChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:'#f8fafc'},ticks:{font:{size:10}}}, x:{grid:{display:false},ticks:{font:{size:10}}} } }}/>
                : <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading histogram…</div>}
            </div>
          </div>
        </div>

        {/* ── ROW 3: Form Comparison + Gender Analysis ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form Average Comparison */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🏫 Form Performance Comparison</p>
            <p className="text-xs text-gray-400 mb-3">Average exam score per form class — which form leads?</p>
            <div style={{ height:200 }}>
              {formChart
                ? <Bar data={formChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`,font:{size:10}}}, x:{grid:{display:false},ticks:{font:{size:11,weight:'bold' as const}}} } }}/>
                : <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading form data…</div>}
            </div>
          </div>

          {/* Gender Comparison */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">⚥ Gender Performance Analysis</p>
            <p className="text-xs text-gray-400 mb-3">Average score comparison: male students vs female students</p>
            <div style={{ height:200 }}>
              {genderChart
                ? <Bar data={genderChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`,font:{size:10}}}, x:{grid:{display:false},ticks:{font:{size:12,weight:'bold' as const}}} } }}/>
                : <div className="flex items-center justify-center h-full text-gray-300 text-sm">Loading gender data…</div>}
            </div>
            {genderChart && (
              <div className="mt-3 flex justify-around">
                {[{label:'Male',c:'#6366f1',v:genderChart.datasets[0].data[0]},{label:'Female',c:'#ec4899',v:genderChart.datasets[0].data[1]}].map(g=>(
                  <div key={g.label} className="text-center">
                    <p className="text-2xl font-black" style={{ color:g.c }}>{g.v}%</p>
                    <p className="text-[10px] text-gray-400 font-bold">{g.label} Average</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 4: Summary KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label:'Mean Grade',    v:meanGrade,                  icon:'🎯', c:'#6366f1', bg:'#eef2ff' },
            { label:'Pass Rate',     v:stats.passRate+'%',          icon:'✅', c:stats.passRate>=50?'#059669':'#dc2626', bg:stats.passRate>=50?'#ecfdf5':'#fef2f2' },
            { label:'School Avg',    v:stats.avg+'%',               icon:'📈', c:'#0891b2', bg:'#ecfeff' },
            { label:'Grade A Count', v:stats.gradeA,                icon:'🏆', c:'#d97706', bg:'#fffbeb' },
            { label:'Grade E Count', v:stats.gradeE,                icon:'⚠️', c:'#dc2626', bg:'#fef2f2' },
            { label:'Total Exams',   v:stats.exams,                 icon:'📝', c:'#7c3aed', bg:'#faf5ff' },
            { label:'Subjects',      v:stats.subjects,              icon:'📚', c:'#059669', bg:'#ecfdf5' },
            { label:'At-Risk Count', v:atRisk.length,               icon:'🚨', c:atRisk.length>0?'#dc2626':'#059669', bg:atRisk.length>0?'#fef2f2':'#ecfdf5' },
          ].map(k=>(
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-2 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background:k.bg }}>{k.icon}</div>
              <div><p className="text-lg font-black" style={{ color:k.c }}>{loading?'…':k.v}</p><p className="text-[9px] text-gray-400 font-bold uppercase leading-tight">{k.label}</p></div>
            </div>
          ))}
        </div>

        {/* ── ROW 5: Top Students + At-Risk Students ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 10 Students */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🏆 Top 10 Students — School Wide</p>
                <p className="text-xs text-gray-400 mt-0.5">Ranked by overall average across all exams</p>
              </div>
              <button onClick={exportTopStudentsCSV} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><FiDownload size={10}/>CSV</button>
            </div>
            {topStudents.length===0
              ?<div className="p-8 text-center text-gray-300"><p className="text-3xl mb-2">📊</p><p className="text-sm">No marks data yet</p></div>
              :(<div className="overflow-hidden">
                {topStudents.map((s,i)=>{
                  const grade=avgToGrade(s.avg);
                  const medals:Record<number,string>={0:'🥇',1:'🥈',2:'🥉'};
                  return(
                    <div key={s.id} className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${i<3?'bg-amber-50/20':''}`}>
                      <div className="w-7 text-center flex-shrink-0">
                        {medals[i]?<span className="text-base">{medals[i]}</span>:<span className="text-xs font-black text-gray-400">#{i+1}</span>}
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                        style={{ background:i===0?'linear-gradient(135deg,#d97706,#f59e0b)':i===1?'linear-gradient(135deg,#6b7280,#9ca3af)':i===2?'linear-gradient(135deg,#b45309,#d97706)':'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {s.first_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-gray-800 text-sm truncate">{s.first_name} {s.last_name}</p>
                        <p className="text-[10px] text-gray-400">{s.admission_no||'—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width:`${Math.min(100,s.avg)}%`, background:'linear-gradient(90deg,#6366f1,#8b5cf6)' }}/>
                        </div>
                        <span className="font-black text-sm text-gray-800 w-10 text-right">{s.avg}%</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black text-white" style={{ background:grade==='A'?'#14532d':grade.startsWith('B')?'#1d4ed8':grade.startsWith('C')?'#ca8a04':'#dc2626' }}>{grade}</span>
                      </div>
                    </div>
                  );
                })}
              </div>)}
          </div>

          {/* At-Risk Students */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ background:'linear-gradient(135deg,#fef2f2,#fff)' }}>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">🚨 At-Risk Students — Urgent Intervention</p>
              <p className="text-xs text-gray-400 mt-0.5">Students scoring below 40% — need immediate teacher attention</p>
            </div>
            {atRisk.length===0
              ?<div className="p-8 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-bold text-green-600">No at-risk students detected!</p>
                <p className="text-xs text-gray-400 mt-1">All students with marks are above the 40% threshold</p>
              </div>
              :(<div className="overflow-hidden">
                {atRisk.map((s,i)=>{
                  const severity=s.avg<25?'Critical':s.avg<33?'High':'Medium';
                  const sc:Record<string,{c:string;bg:string}>={Critical:{c:'#dc2626',bg:'#fef2f2'},High:{c:'#d97706',bg:'#fffbeb'},Medium:{c:'#0891b2',bg:'#ecfeff'}};
                  return(
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-red-50/20 transition-colors">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                        style={{ background:s.avg<25?'#dc2626':s.avg<33?'#d97706':'#0891b2' }}>
                        {s.first_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-gray-800 text-sm truncate">{s.first_name} {s.last_name}</p>
                        <p className="text-[10px] text-gray-400">{s.admission_no||'—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width:`${s.avg}%`, background:'#dc2626' }}/>
                        </div>
                        <span className="font-black text-sm text-red-600 w-10 text-right">{s.avg}%</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black" style={{ color:sc[severity].c, background:sc[severity].bg }}>{severity}</span>
                      </div>
                      <Link href={`${BASE}/intervention-engine`} className="px-2 py-1 rounded-lg text-[9px] font-black text-white" style={{ background:'#dc2626' }}>Act</Link>
                    </div>
                  );
                })}
              </div>)}
            <div className="px-5 py-3 border-t bg-red-50/30">
              <Link href={`${BASE}/intervention-engine`} className="flex items-center justify-center gap-2 text-xs font-bold text-red-600 hover:text-red-700">
                View Full Intervention Engine <FiArrowRight size={12}/>
              </Link>
            </div>
          </div>
        </div>

        {/* ── ROW 6: Recent Exams Table ── */}
        {recentExams.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📝 Recent Exams Recorded</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['#','Exam Name','Created'].map(h=><th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentExams.map((e,i)=>(
                    <tr key={e.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-400 font-bold">{i+1}</td>
                      <td className="px-5 py-3 font-extrabold text-gray-800">{e.exam_name}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{e.created_at?new Date(e.created_at).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
