'use client';

import { useFeeData, fmt } from './useFeeData';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  FiTrendingUp, FiTrendingDown, FiCreditCard, FiUsers, FiAlertTriangle,
  FiArrowRight, FiRefreshCw, FiActivity, FiCheckCircle, FiZap,
  FiDollarSign, FiBarChart2, FiPieChart, FiCalendar, FiClock,
  FiAward, FiTarget, FiShield, FiBookOpen,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const KESM = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${n.toLocaleString()}`;
};
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

// ─── Colour palette (light theme) ───────────────────────────────────────────
const C = {
  indigo: '#4f46e5', indigoL: '#eef2ff', indigoBd: '#c7d2fe',
  green:  '#16a34a', greenL:  '#f0fdf4', greenBd:  '#bbf7d0',
  red:    '#dc2626', redL:    '#fef2f2', redBd:    '#fecaca',
  amber:  '#d97706', amberL:  '#fffbeb', amberBd:  '#fde68a',
  blue:   '#2563eb', blueL:   '#eff6ff', blueBd:   '#bfdbfe',
  purple: '#7c3aed', purpleL: '#faf5ff', purpleBd: '#ddd6fe',
  slate:  '#64748b', slateL:  '#f8fafc', slateBd:  '#e2e8f0',
  teal:   '#0d9488', tealL:   '#f0fdfa', tealBd:   '#99f6e4',
};

// ─── Tiny KPI card ───────────────────────────────────────────────────────────
function KPI({ label, value, sub, color, colorL, colorBd, icon, trend }: any) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${colorBd}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'absolute', top: -14, right: -14, width: 64, height: 64, borderRadius: '50%', background: color, opacity: 0.07 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: colorL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: trend >= 0 ? C.greenL : C.redL, color: trend >= 0 ? C.green : C.red }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 4, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate }}>{sub}</div>}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub, right }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.indigoL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: C.slate }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: 6, width: `${Math.min(100, value)}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
    </div>
  );
}

export default function FeeDashboardPage() {
  const { forms, students, payments, structures, terms, loading, fetchAll, currentTerm, getStudentFees, getFormName } = useFeeData();
  const currentYear = new Date().getFullYear();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [schoolName, setSchoolName] = useState('APSIMS School');
  const [activeTab, setActiveTab] = useState<'overview' | 'forms' | 'analysis' | 'modules'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const go = async () => {
      const [{ data: inc }, { data: exp }, { data: det }] = await Promise.all([
        supabase.from('school_income').select('amount').eq('year', currentYear),
        supabase.from('school_expenses').select('amount,status').eq('year', currentYear),
        supabase.from('school_details').select('school_name').single(),
      ]);
      setTotalIncome((inc || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0));
      setTotalExpenses((exp || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      setSchoolName((det as any)?.school_name || 'APSIMS School');
    };
    go();
  }, [currentYear]);

  const handleRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  // ─── Core metrics ──────────────────────────────────────────────────────────
  const activeStudents = useMemo(() => students.filter(s => s.status === 'Active'), [students]);
  const totalCollected  = useMemo(() => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
  const totalExpected   = useMemo(() => activeStudents.reduce((s, st) => s + getStudentFees(st.id, st.form_id).annualTotal, 0), [activeStudents, getStudentFees]);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate   = pct(totalCollected, totalExpected);
  const studentsOwing    = useMemo(() => activeStudents.filter(s => getStudentFees(s.id, s.form_id).annualBalance > 0).length, [activeStudents, getStudentFees]);
  const netPosition      = (totalCollected + totalIncome) - totalExpenses;

  const today      = new Date().toISOString().split('T')[0];
  const todayPays  = payments.filter(p => p.payment_date === today);
  const todayTotal = todayPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekTotal  = payments.filter(p => new Date(p.payment_date) >= weekStart).reduce((s, p) => s + Number(p.amount || 0), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthTotal = payments.filter(p => new Date(p.payment_date) >= monthStart).reduce((s, p) => s + Number(p.amount || 0), 0);

  // ─── 6-month trend ─────────────────────────────────────────────────────────
  const monthlyTrends = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const m = d.getMonth(), y = d.getFullYear();
      const amt = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((s, p) => s + Number(p.amount || 0), 0);
      return { month: d.toLocaleString('en', { month: 'short', year: '2-digit' }), amount: amt };
    });
  }, [payments]);

  // ─── Daily last 14 days ────────────────────────────────────────────────────
  const daily14 = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const ds = d.toISOString().split('T')[0];
      const amt = payments.filter(p => p.payment_date === ds).reduce((s, p) => s + Number(p.amount || 0), 0);
      return { day: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), amount: amt, isToday: ds === today };
    });
  }, [payments, today]);

  // ─── Payment method breakdown ──────────────────────────────────────────────
  const methodMap = useMemo(() => {
    const r: Record<string, { count: number; total: number }> = {};
    payments.forEach(p => {
      const m = (p.payment_method || 'Other').replace(/\s*\(.+\)/, '');
      if (!r[m]) r[m] = { count: 0, total: 0 };
      r[m].count++; r[m].total += Number(p.amount || 0);
    });
    return Object.entries(r).sort((a, b) => b[1].total - a[1].total);
  }, [payments]);

  // ─── Per-form collection ───────────────────────────────────────────────────
  const formCollection = useMemo(() => forms.map(form => {
    const fSts = activeStudents.filter(s => s.form_id === form.id);
    const collected = fSts.reduce((s, st) => s + payments.filter(p => p.student_id === st.id).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0);
    const expected  = fSts.reduce((s, st) => s + getStudentFees(st.id, st.form_id).annualTotal, 0);
    const rate = pct(collected, expected);
    return { name: form.form_name, collected, expected, balance: Math.max(0, expected - collected), students: fSts.length, rate };
  }).sort((a, b) => b.rate - a.rate), [forms, activeStudents, payments, getStudentFees]);

  // ─── Aging buckets (days overdue) ─────────────────────────────────────────
  const aging = useMemo(() => {
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
    const now = new Date();
    activeStudents.forEach(st => {
      const balance = getStudentFees(st.id, st.form_id).annualBalance;
      if (balance <= 0) return;
      const lastPay = payments.filter(p => p.student_id === st.id).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
      const days = lastPay ? Math.floor((now.getTime() - new Date(lastPay.payment_date).getTime()) / 86400000) : 999;
      if (days <= 30)       buckets.current += balance;
      else if (days <= 60)  buckets.d30     += balance;
      else if (days <= 90)  buckets.d60     += balance;
      else if (days <= 180) buckets.d90     += balance;
      else                  buckets.d90plus += balance;
    });
    return buckets;
  }, [activeStudents, payments, getStudentFees]);

  // ─── Collection velocity (avg per day this month) ─────────────────────────
  const daysInMonth   = new Date().getDate();
  const velocity      = daysInMonth > 0 ? Math.round(monthTotal / daysInMonth) : 0;
  const projectedMonth = velocity * new Date(currentYear, new Date().getMonth() + 1, 0).getDate();

  // ─── Recent payments ───────────────────────────────────────────────────────
  const recentPays = payments.slice(0, 8);

  const CHARTCOLORS = ['#4f46e5','#16a34a','#0ea5e9','#d97706','#8b5cf6','#ef4444','#0d9488'];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, background: '#f8fafc' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 8px 32px rgba(79,70,229,0.3)' }}>💰</div>
      <p style={{ fontWeight: 800, color: C.indigo, fontSize: 14, letterSpacing: '0.06em' }}>Loading Financial Dashboard…</p>
    </div>
  );

  // ─── Module list ───────────────────────────────────────────────────────────
  const allModules = [
    { label: 'Collect Fee',      href: '/dashboard/fees/collect',             icon: '💵', color: C.green,  tier: 'Core' },
    { label: 'Outstanding',      href: '/dashboard/fees/outstanding',          icon: '⏳', color: C.amber,  tier: 'Core' },
    { label: 'Payments List',    href: '/dashboard/fees/payments',             icon: '📋', color: C.blue,   tier: 'Core' },
    { label: 'Fee Structure',    href: '/dashboard/fees/structure',            icon: '🏗️', color: C.purple, tier: 'Core' },
    { label: 'Statements',       href: '/dashboard/fees/statements',           icon: '📄', color: '#0891b2',tier: 'Core' },
    { label: 'Receipts',         href: '/dashboard/fees/receipts',             icon: '🧾', color: C.amber,  tier: 'Core' },
    { label: 'KCB Buni Push',    href: '/dashboard/fees/mpesa-push',           icon: '📱', color: C.green,  tier: 'Ultra' },
    { label: 'Fee Defaulters',   href: '/dashboard/fees/defaulters',           icon: '🚨', color: C.red,    tier: 'Ultra' },
    { label: 'Budget Module',    href: '/dashboard/fees/budget',               icon: '📊', color: C.blue,   tier: 'Ultra' },
    { label: 'Projections',      href: '/dashboard/fees/projections',          icon: '🔮', color: C.purple, tier: 'Ultra' },
    { label: 'Board Report',     href: '/dashboard/fees/reports/board',        icon: '👔', color: '#0f172a',tier: 'Ultra' },
    { label: 'Export Centre',    href: '/dashboard/fees/exports',              icon: '📤', color: C.slate,  tier: 'Ultra' },
    { label: 'Bank Recon',       href: '/dashboard/fees/bank-reconciliation',  icon: '🏦', color: '#0c4a6e',tier: 'Ultra' },
    { label: 'Notifications',    href: '/dashboard/fees/notifications',        icon: '🔔', color: '#713f12',tier: 'Ultra' },
    { label: 'Vote Ledger',      href: '/dashboard/fees/vote-heads/ledger',    icon: '📒', color: C.purple, tier: 'Ultra' },
    { label: 'Capitation',       href: '/dashboard/fees/capitation',           icon: '🏫', color: C.green,  tier: 'Ultra' },
    { label: 'P&L Statement',    href: '/dashboard/fees/pl-statement',         icon: '📈', color: C.red,    tier: 'Finance' },
    { label: 'Trial Balance',    href: '/dashboard/fees/trial-balance',        icon: '⚖️', color: C.indigo, tier: 'Finance' },
    { label: 'Balance Sheet',    href: '/dashboard/fees/balance-sheet',        icon: '🏛️', color: C.blue,   tier: 'Finance' },
    { label: 'Cash Book',        href: '/dashboard/fees/cashbook',             icon: '📒', color: C.teal,   tier: 'Finance' },
    { label: 'Fee Analytics',    href: '/dashboard/fees/analytics',            icon: '🔬', color: C.indigo, tier: 'Finance' },
    { label: 'Bursary',          href: '/dashboard/fees/bursary',              icon: '🎓', color: '#db2777',tier: 'Finance' },
    { label: 'Fee Waiver',       href: '/dashboard/fees/fee-waiver',           icon: '🎁', color: '#c026d3',tier: 'Finance' },
    { label: 'Approvals',        href: '/dashboard/fees/approval-workflow',    icon: '✅', color: C.amber,  tier: 'Finance' },
    { label: 'Audit Trail',      href: '/dashboard/fees/audit',                icon: '🔒', color: C.slate,  tier: 'Compliance' },
    { label: 'Demand Letters',   href: '/dashboard/fees/demand-letters',       icon: '✉️', color: C.red,    tier: 'Compliance' },
    { label: 'Reminders',        href: '/dashboard/fees/reminder-scheduler',   icon: '⏰', color: C.purple, tier: 'Compliance' },
    { label: 'Govt Returns',     href: '/dashboard/fees/government-returns',   icon: '🏛️', color: '#1e293b',tier: 'Compliance' },
    { label: 'Bulk SMS/WA',      href: '/dashboard/fees/bulk-reminders',       icon: '📢', color: C.purple, tier: 'Compliance' },
    { label: 'Aging Buckets',    href: '/dashboard/fees/arrears-aging',        icon: '📅', color: '#ea580c',tier: 'Compliance' },
  ];
  const tierMeta: Record<string, { bg: string; badge: string; icon: string }> = {
    Core:       { bg: C.greenL,  badge: C.green,  icon: '⚡' },
    Ultra:      { bg: C.purpleL, badge: C.purple, icon: '🚀' },
    Finance:    { bg: C.blueL,   badge: C.blue,   icon: '📈' },
    Compliance: { bg: C.redL,    badge: C.red,    icon: '🛡️' },
  };

  const rateColor = collectionRate >= 70 ? C.green : collectionRate >= 40 ? C.amber : C.red;
  const rateGrad  = collectionRate >= 70 ? 'linear-gradient(90deg,#22c55e,#10b981)' : collectionRate >= 40 ? 'linear-gradient(90deg,#f59e0b,#fb923c)' : 'linear-gradient(90deg,#ef4444,#f87171)';

  return (
    <div style={{ fontFamily: "'Inter','Outfit','Segoe UI',system-ui,sans-serif", background: '#f8fafc', minHeight: '100vh', padding: '0 0 40px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; transition: all 0.18s; }
        .fee-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
        @keyframes slide-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .animate-in { animation: slide-in 0.35s ease forwards; }
      `}</style>

      {/* ═══════════ COMPACT LIGHT BANNER ═══════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Left: title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>💰</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', fontFamily: "'Outfit',sans-serif" }}>Financial Command Centre</h1>
                <span style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ULTRA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: C.slate }}>{schoolName} · {currentYear}</span>
                {currentTerm && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.greenL, border: `1px solid ${C.greenBd}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, color: C.green, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
                    {currentTerm.term_name} {currentTerm.year || ''}
                  </span>
                )}
                <span style={{ background: C.indigoL, border: `1px solid ${C.indigoBd}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, color: C.indigo, fontWeight: 700 }}>
                  👥 {activeStudents.length} Students
                </span>
              </div>
            </div>
          </div>

          {/* Right: 4 mini KPI tiles */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: "Today's Intake",  val: KESM(todayTotal),     sub: `${todayPays.length} payments`, color: C.green,  bg: C.greenL  },
              { label: 'Total Collected', val: KESM(totalCollected),  sub: `${payments.length} transactions`, color: C.indigo, bg: C.indigoL },
              { label: 'Outstanding',     val: KESM(totalOutstanding), sub: `${studentsOwing} students owing`, color: totalOutstanding > 0 ? C.red : C.green, bg: totalOutstanding > 0 ? C.redL : C.greenL },
              { label: 'Net Position',    val: KESM(Math.abs(netPosition)), sub: netPosition >= 0 ? 'Surplus' : 'Deficit', color: netPosition >= 0 ? C.green : C.red, bg: netPosition >= 0 ? C.greenL : C.redL },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}25`, borderRadius: 12, padding: '10px 16px', minWidth: 130 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: k.color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{k.val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 10, color: C.slate, marginTop: 1 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Collection rate bar */}
        <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiBarChart2 size={13} color={C.indigo} /> Annual Collection Rate
            </span>
            <span style={{ fontSize: 18, fontWeight: 900, color: rateColor }}>{collectionRate}%</span>
          </div>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: 8, width: `${Math.min(100, collectionRate)}%`, background: rateGrad, borderRadius: 99, transition: 'width 1.2s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 10, color: C.slate }}>{KES(totalCollected)} collected</span>
            <span style={{ fontSize: 10, color: C.slate }}>{KES(totalExpected)} expected</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: '💵 Collect Fee',   href: '/dashboard/fees/collect',    bg: C.green,  shadow: '0 3px 10px rgba(22,163,74,0.3)' },
            { label: '📱 KCB Push',      href: '/dashboard/fees/mpesa-push', bg: '#059669', shadow: '0 3px 10px rgba(5,150,105,0.3)' },
            { label: '🚨 Defaulters',    href: '/dashboard/fees/defaulters', bg: C.red,    shadow: '0 3px 10px rgba(220,38,38,0.3)' },
            { label: '📊 Budget',        href: '/dashboard/fees/budget',     bg: C.blue,   shadow: '0 3px 10px rgba(37,99,235,0.25)' },
            { label: '👔 Board Report',  href: '/dashboard/fees/reports/board', bg: '#1e293b', shadow: 'none' },
          ].map((b, i) => (
            <Link key={i} href={b.href} style={{ background: b.bg, color: '#fff', borderRadius: 9, padding: '8px 16px', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, boxShadow: b.shadow }}>
              {b.label}
            </Link>
          ))}
          <button onClick={handleRefresh} disabled={refreshing} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 14px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
            <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '0 28px' }}>
        {/* ─── Alert strip ──────────────────────────────────────────────────── */}
        {(totalOutstanding > 500000 || studentsOwing > 10) && (
          <div style={{ background: '#fff', border: `1.5px solid ${C.redBd}`, borderLeft: `4px solid ${C.red}`, borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }} className="animate-in">
            <FiAlertTriangle size={18} color={C.red} />
            <div style={{ flex: 1 }}>
              <span style={{ color: '#991b1b', fontWeight: 800, fontSize: 13 }}>ALERT: </span>
              <span style={{ color: '#b91c1c', fontSize: 13 }}>
                {studentsOwing} students have outstanding fees totalling {KES(totalOutstanding)}.
                Collection rate is {collectionRate}% — {collectionRate < 40 ? 'CRITICAL' : collectionRate < 70 ? 'NEEDS ATTENTION' : 'ON TRACK'}.
              </span>
            </div>
            <Link href="/dashboard/fees/defaulters" style={{ background: C.red, color: '#fff', borderRadius: 8, padding: '7px 16px', fontWeight: 800, fontSize: 12 }}>
              View Defaulters →
            </Link>
          </div>
        )}

        {/* ─── Tabs ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {[
            { key: 'overview',  label: '📊 Overview' },
            { key: 'forms',     label: '📚 Form Analysis' },
            { key: 'analysis',  label: '🔬 Deep Analysis' },
            { key: 'modules',   label: '🗂️ All Modules' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
              background: activeTab === t.key ? C.indigo : 'transparent',
              border: 'none', borderRadius: 9, padding: '8px 18px',
              fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
              color: activeTab === t.key ? '#fff' : C.slate,
              boxShadow: activeTab === t.key ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
              fontFamily: "'Inter',sans-serif",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ════════════ OVERVIEW TAB ════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-in">

            {/* Row 1 — P&L KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
              <KPI label="Fee Revenue"      value={KES(totalCollected)}              icon="💰" color={C.green}  colorL={C.greenL}  colorBd={C.greenBd}  sub={`${payments.length} transactions`} />
              <KPI label="Other Income"     value={KES(totalIncome)}                 icon="📈" color={C.blue}   colorL={C.blueL}   colorBd={C.blueBd}   sub="Grants & miscellaneous" />
              <KPI label="Total Expenses"   value={KES(totalExpenses)}               icon="📉" color={C.red}    colorL={C.redL}    colorBd={C.redBd}    sub="Approved expenditure" />
              <KPI label="Net Position"     value={KES(Math.abs(netPosition))}       icon={netPosition >= 0 ? '🏆' : '⚠️'} color={netPosition >= 0 ? C.green : C.red} colorL={netPosition >= 0 ? C.greenL : C.redL} colorBd={netPosition >= 0 ? C.greenBd : C.redBd} sub={netPosition >= 0 ? 'School is in surplus' : 'School has deficit'} />
              <KPI label="Outstanding Fees" value={KES(totalOutstanding)}            icon="⏳" color={C.amber}  colorL={C.amberL}  colorBd={C.amberBd}  sub={`${studentsOwing} students owing`} />
              <KPI label="This Week"        value={KES(weekTotal)}                   icon="📆" color={C.purple} colorL={C.purpleL} colorBd={C.purpleBd} sub="7-day rolling total" />
              <KPI label="This Month"       value={KES(monthTotal)}                  icon="🗓️" color={C.teal}   colorL={C.tealL}   colorBd={C.tealBd}   sub={`${daysInMonth} days so far`} />
              <KPI label="Daily Velocity"   value={KES(velocity)}                    icon="⚡" color={C.indigo} colorL={C.indigoL} colorBd={C.indigoBd} sub={`Projected: ${KES(projectedMonth)}/mo`} />
            </div>

            {/* Row 2 — Trend line + Doughnut */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <SectionHead icon={<FiTrendingUp size={15} color={C.indigo} />} title="6-Month Collection Trend" sub="Monthly fee collections vs previous periods" />
                <div style={{ height: 230 }}>
                  <Line data={{
                    labels: monthlyTrends.map(m => m.month),
                    datasets: [{
                      label: 'Collections',
                      data: monthlyTrends.map(m => m.amount),
                      borderColor: C.indigo, backgroundColor: 'rgba(79,70,229,0.07)',
                      fill: true, tension: 0.45, pointRadius: 5,
                      pointBackgroundColor: '#fff', pointBorderColor: C.indigo, pointBorderWidth: 2,
                    }],
                  }} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `${(Number(v)/1000).toFixed(0)}K`, font: { size: 10 } } },
                      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    },
                  }} />
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <SectionHead icon={<FiPieChart size={15} color={C.green} />} title="Payment Methods" />
                <div style={{ height: 180 }}>
                  {methodMap.length > 0 ? (
                    <Doughnut data={{
                      labels: methodMap.map(([m]) => m),
                      datasets: [{ data: methodMap.map(([, v]) => v.total), backgroundColor: CHARTCOLORS, borderWidth: 2, borderColor: '#fff' }],
                    }} options={{
                      responsive: true, maintainAspectRatio: false, cutout: '65%',
                      plugins: { legend: { position: 'bottom', labels: { padding: 8, usePointStyle: true, font: { size: 10, weight: 'bold' as any } } }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } },
                    }} />
                  ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13 }}>No data yet</div>}
                </div>
                {/* Method breakdown list */}
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {methodMap.slice(0, 4).map(([m, v], i) => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: CHARTCOLORS[i], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', flex: 1 }}>{m}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{KES(v.total)}</span>
                      <span style={{ fontSize: 10, color: C.slate }}>({v.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 — Daily bar + Recent payments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <SectionHead icon={<FiBarChart2 size={15} color={C.purple} />} title="Daily Collections — Last 14 Days" sub="Bar highlights today in indigo" />
                <div style={{ height: 210 }}>
                  <Bar data={{
                    labels: daily14.map(d => d.day),
                    datasets: [{ label: 'KES', data: daily14.map(d => d.amount), backgroundColor: daily14.map(d => d.isToday ? C.indigo : 'rgba(99,102,241,0.3)'), borderRadius: 6, hoverBackgroundColor: C.indigo }],
                  }} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } },
                    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `${(Number(v)/1000).toFixed(0)}K`, font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } } },
                  }} />
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiActivity size={14} color={C.green} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>Recent Payments</span>
                  </div>
                  <Link href="/dashboard/fees/payments" style={{ fontSize: 11, color: C.indigo, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>View All <FiArrowRight size={11} /></Link>
                </div>
                <div style={{ overflow: 'auto', maxHeight: 290 }}>
                  {recentPays.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No payments yet</div>
                  ) : recentPays.map((p, i) => {
                    const s = students.find(st => st.id === p.student_id);
                    const col = CHARTCOLORS[i % CHARTCOLORS.length];
                    const initials = s ? `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase() : '?';
                    return (
                      <div key={p.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: col, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s ? `${s.first_name} ${s.last_name}` : '—'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'} · {p.payment_method || '—'}
                          </div>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: 13, color: C.green, flexShrink: 0 }}>{KESM(Number(p.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 4 — Quick Finance Reports strip */}
            <div style={{ background: '#fff', border: `1px solid ${C.indigoBd}`, borderRadius: 14, padding: '14px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: C.indigo, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>⚡ Quick Finance Reports</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '📈 P&L',         href: '/dashboard/fees/pl-statement',   color: C.red    },
                  { label: '⚖️ Trial Balance', href: '/dashboard/fees/trial-balance',  color: C.indigo },
                  { label: '🏛️ Balance Sheet', href: '/dashboard/fees/balance-sheet',  color: C.blue   },
                  { label: '📒 Cash Book',    href: '/dashboard/fees/cashbook',        color: C.teal   },
                  { label: '👔 Board Report', href: '/dashboard/fees/reports/board',   color: '#1e293b'},
                  { label: '📤 Export',       href: '/dashboard/fees/exports',         color: C.slate  },
                  { label: '🔬 Analytics',    href: '/dashboard/fees/analytics',       color: C.purple },
                  { label: '📅 Aging',        href: '/dashboard/fees/arrears-aging',   color: '#ea580c'},
                ].map((l, i) => (
                  <Link key={i} href={l.href} style={{ background: `${l.color}0d`, border: `1.5px solid ${l.color}30`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 800, color: l.color }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ FORM ANALYSIS TAB ════════════ */}
        {activeTab === 'forms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-in">
            {/* Leaderboard table */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: '#0f172a', fontFamily: "'Outfit',sans-serif" }}>Form-wise Fee Collection Leaderboard</div>
                    <div style={{ fontSize: 11, color: C.slate }}>Ranked by collection rate · {currentYear} Financial Year</div>
                  </div>
                </div>
                <span style={{ background: C.indigoL, color: C.indigo, fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 99 }}>LIVE DATA</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Rank', 'Form', 'Students', 'Expected', 'Collected', 'Balance', 'Rate', 'Progress'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: ['Expected','Collected','Balance'].includes(h) ? 'right' : ['Rank','Students','Rate'].includes(h) ? 'center' : 'left', fontWeight: 800, fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formCollection.map((f, i) => {
                      const medals = ['🥇','🥈','🥉'];
                      const rc = f.rate >= 70 ? C.green : f.rate >= 40 ? C.amber : C.red;
                      return (
                        <tr key={f.name} style={{ borderBottom: '1px solid #f8fafc', background: i === 0 ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 18 }}>{medals[i] || i + 1}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit',sans-serif" }}>{f.name}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ background: C.purpleL, color: C.purple, fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>{f.students}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{KES(f.expected)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: C.green }}>{KES(f.collected)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: f.balance > 0 ? C.red : C.green }}>{KES(f.balance)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 900, fontSize: 14, color: rc }}>{f.rate}%</span>
                          </td>
                          <td style={{ padding: '14px 16px', minWidth: 160 }}>
                            <ProgressBar value={f.rate} color={rc} />
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: C.indigo }}>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: '#fff', fontSize: 15 }}>∑</td>
                      <td style={{ padding: '13px 16px', fontWeight: 900, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>ALL FORMS</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: '#c7d2fe', fontWeight: 900 }}>{activeStudents.length}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', color: '#c7d2fe', fontWeight: 900 }}>{KES(totalExpected)}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', color: '#bbf7d0', fontWeight: 900 }}>{KES(totalCollected)}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', color: '#fca5a5', fontWeight: 900 }}>{KES(totalOutstanding)}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: '#fff', fontWeight: 900, fontSize: 15 }}>{collectionRate}%</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form bar chart */}
            <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <SectionHead icon={<FiBarChart2 size={15} color={C.indigo} />} title="Expected vs Collected by Form" sub="Side-by-side comparison across all forms" />
              <div style={{ height: 280 }}>
                <Bar data={{
                  labels: formCollection.map(f => f.name),
                  datasets: [
                    { label: 'Expected', data: formCollection.map(f => f.expected), backgroundColor: 'rgba(79,70,229,0.2)', borderRadius: 6, borderColor: C.indigo, borderWidth: 2 },
                    { label: 'Collected', data: formCollection.map(f => f.collected), backgroundColor: 'rgba(22,163,74,0.7)', borderRadius: 6, borderColor: C.green, borderWidth: 2 },
                  ],
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' as const }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: KES ${Number(c.raw).toLocaleString()}` } } },
                  scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `KES ${(Number(v)/1000).toFixed(0)}K`, font: { size: 10 } } }, x: { grid: { display: false } } },
                }} />
              </div>
            </div>
          </div>
        )}

        {/* ════════════ DEEP ANALYSIS TAB ════════════ */}
        {activeTab === 'analysis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-in">

            {/* Aging Buckets */}
            <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <SectionHead icon={<FiClock size={15} color={C.amber} />} title="Arrears Aging Buckets" sub="Outstanding balances grouped by days since last payment" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
                {[
                  { label: '0–30 days',   val: aging.current,  color: C.green,  bg: C.greenL },
                  { label: '31–60 days',  val: aging.d30,      color: C.amber,  bg: C.amberL },
                  { label: '61–90 days',  val: aging.d60,      color: '#ea580c',bg: '#fff7ed' },
                  { label: '91–180 days', val: aging.d90,      color: C.red,    bg: C.redL   },
                  { label: '180+ days',   val: aging.d90plus,  color: '#7f1d1d',bg: '#fef2f2' },
                ].map((b, i) => (
                  <div key={i} style={{ background: b.bg, border: `1.5px solid ${b.color}30`, borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{KES(b.val)}</div>
                    <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>{b.val > 0 ? `${pct(b.val, totalOutstanding)}% of outstanding` : 'Clear'}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 180 }}>
                <Bar data={{
                  labels: ['0–30 days','31–60 days','61–90 days','91–180 days','180+ days'],
                  datasets: [{ label: 'Outstanding (KES)', data: [aging.current, aging.d30, aging.d60, aging.d90, aging.d90plus], backgroundColor: ['rgba(22,163,74,0.6)','rgba(217,119,6,0.6)','rgba(234,88,12,0.6)','rgba(220,38,38,0.6)','rgba(127,29,29,0.6)'], borderRadius: 8 }],
                }} options={{
                  responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } },
                  scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `${(Number(v)/1000).toFixed(0)}K`, font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } },
                }} />
              </div>
            </div>

            {/* Collection velocity + Payment frequency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Velocity card */}
              <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <SectionHead icon={<FiZap size={15} color={C.indigo} />} title="Collection Velocity" sub="Monthly pace and projection" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Avg/Day (this month)', val: KES(velocity), color: C.indigo },
                    { label: 'Month-to-date',        val: KES(monthTotal), color: C.green },
                    { label: 'Projected (full month)',val: KES(projectedMonth), color: C.blue },
                    { label: 'Payments this month',  val: String(payments.filter(p => new Date(p.payment_date) >= monthStart).length), color: C.purple },
                  ].map((m, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{m.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: m.color, marginTop: 4 }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                {/* Mini spark trend */}
                <div style={{ height: 120 }}>
                  <Line data={{
                    labels: monthlyTrends.map(m => m.month),
                    datasets: [{ label: 'Collections', data: monthlyTrends.map(m => m.amount), borderColor: C.indigo, backgroundColor: 'rgba(79,70,229,0.06)', fill: true, tension: 0.45, pointRadius: 3, pointBackgroundColor: C.indigo }],
                  }} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { display: false, beginAtZero: true }, x: { grid: { display: false }, ticks: { font: { size: 9 } } } },
                  }} />
                </div>
              </div>

              {/* Payment method deep-dive */}
              <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <SectionHead icon={<FiCreditCard size={15} color={C.green} />} title="Payment Method Analysis" sub="Breakdown by volume and value" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {methodMap.map(([m, v], i) => (
                    <div key={m}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: CHARTCOLORS[i % CHARTCOLORS.length] }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{m}</span>
                          <span style={{ fontSize: 10, color: C.slate }}>({v.count} txns)</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{KES(v.total)}</span>
                      </div>
                      <ProgressBar value={pct(v.total, totalCollected)} color={CHARTCOLORS[i % CHARTCOLORS.length]} />
                    </div>
                  ))}
                  {methodMap.length === 0 && <div style={{ textAlign: 'center', color: C.slate, padding: 30 }}>No payments recorded</div>}
                </div>
              </div>
            </div>

            {/* Financial summary card */}
            <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <SectionHead icon={<FiAward size={15} color={C.purple} />} title="Full P&L Summary" sub="Comprehensive income vs expenditure breakdown" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><FiCheckCircle size={12} /> Income</div>
                  {[
                    { label: 'Fee Collections', val: totalCollected },
                    { label: 'Other Income',    val: totalIncome },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.greenL, borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: C.green }}>{KES(r.val)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: C.green, borderRadius: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>TOTAL INCOME</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{KES(totalCollected + totalIncome)}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><FiTrendingDown size={12} /> Expenditure</div>
                  {[
                    { label: 'Total Expenses',   val: totalExpenses },
                    { label: 'Outstanding Fees',  val: totalOutstanding },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.redL, borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: C.red }}>{KES(r.val)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: netPosition >= 0 ? C.green : C.red, borderRadius: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{netPosition >= 0 ? 'NET SURPLUS' : 'NET DEFICIT'}</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{KES(Math.abs(netPosition))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ ALL MODULES TAB ════════════ */}
        {activeTab === 'modules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-in">
            {(['Core','Ultra','Finance','Compliance'] as const).map(tier => {
              const mods = allModules.filter(m => m.tier === tier);
              const tm = tierMeta[tier];
              return (
                <div key={tier}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ background: tm.bg, color: tm.badge, fontSize: 11, fontWeight: 900, padding: '5px 14px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tm.icon} {tier}</span>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <span style={{ fontSize: 11, color: C.slate, fontWeight: 700 }}>{mods.length} modules</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))', gap: 12 }}>
                    {mods.map((m, i) => (
                      <Link key={i} href={m.href} className="fee-card" style={{
                        background: '#fff', borderRadius: 16, padding: '18px 16px',
                        border: `1.5px solid ${m.color}20`, display: 'flex', flexDirection: 'column', gap: 8,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', top: -12, right: -12, width: 50, height: 50, borderRadius: '50%', background: m.color, opacity: 0.07 }} />
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${m.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', lineHeight: 1.2, fontFamily: "'Inter',sans-serif" }}>{m.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                          <span style={{ background: tm.bg, color: tm.badge, fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase' }}>{tier}</span>
                          <FiArrowRight size={11} color={m.color} />
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

      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
