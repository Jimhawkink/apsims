'use client';

import { useFeeData, fmt } from './useFeeData';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiCreditCard, FiUsers,
  FiAlertTriangle, FiFileText, FiGrid, FiBarChart2, FiBookOpen,
  FiArrowRight, FiRefreshCw, FiPieChart, FiSend, FiActivity,
  FiCheckCircle, FiZap, FiBell, FiDownload, FiPrinter, FiPhone,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmt2 = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
};

export default function FeeDashboardPage() {
  const { forms, students, payments, structures, terms, loading, fetchAll, currentTerm, getStudentFees } = useFeeData();
  const currentYear = new Date().getFullYear();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [schoolName, setSchoolName] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'forms' | 'modules'>('overview');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const fetchExtra = async () => {
      const [{ data: inc }, { data: exp }, { data: det }, { data: notif }] = await Promise.all([
        supabase.from('school_income').select('amount').eq('year', currentYear),
        supabase.from('school_expenses').select('amount,status').eq('year', currentYear),
        supabase.from('school_details').select('school_name').single(),
        supabase.from('school_notifications').select('id,status').limit(100),
      ]);
      setTotalIncome((inc || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0));
      setTotalExpenses((exp || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      setSchoolName((det as any)?.school_name || 'APSIMS School');
      setNotifications(notif || []);
    };
    fetchExtra();
    // Pulse animation
    const t = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(t);
  }, [currentYear]);

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Active'), [students]);
  const totalCollected = useMemo(() => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
  const totalExpected = useMemo(() => activeStudents.reduce((s, st) => s + getStudentFees(st.id, st.form_id).annualTotal, 0), [activeStudents, getStudentFees]);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const studentsOwing = useMemo(() => activeStudents.filter(s => getStudentFees(s.id, s.form_id).annualBalance > 0).length, [activeStudents, getStudentFees]);
  const netPosition = (totalCollected + totalIncome) - totalExpenses;

  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.payment_date === today);
  const todayTotal = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekTotal = payments.filter(p => new Date(p.payment_date) >= weekStart).reduce((s, p) => s + Number(p.amount || 0), 0);

  const monthlyTrends = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.getMonth(); const y = d.getFullYear();
      const amt = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((s, p) => s + Number(p.amount || 0), 0);
      arr.push({ month: d.toLocaleString('en', { month: 'short' }), amount: amt });
    }
    return arr;
  }, [payments]);

  const methodBreakdown = useMemo(() => {
    const r: Record<string, number> = {};
    payments.forEach(p => { const m = (p.payment_method || 'Other').replace(/\s*\(.+\)/, ''); r[m] = (r[m] || 0) + Number(p.amount || 0); });
    return r;
  }, [payments]);

  const formCollection = useMemo(() => forms.map(form => {
    const fStudents = activeStudents.filter(s => s.form_id === form.id);
    const collected = fStudents.reduce((s, st) => s + payments.filter(p => p.student_id === st.id).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0);
    const expected = fStudents.reduce((s, st) => s + getStudentFees(st.id, st.form_id).annualTotal, 0);
    const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    return { name: form.form_name, collected, expected, balance: Math.max(0, expected - collected), students: fStudents.length, pct };
  }), [forms, activeStudents, payments, getStudentFees]);

  const daily = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const amt = payments.filter(p => p.payment_date === ds).reduce((s, p) => s + Number(p.amount || 0), 0);
      arr.push({ day: d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }), amount: amt });
    }
    return arr;
  }, [payments]);

  const recentPayments = payments.slice(0, 10);
  const pendingNotifs = notifications.filter(n => n.status === 'Queued').length;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>💰</div>
        <div style={{ position: 'absolute', inset: -6, borderRadius: 26, border: '3px solid #818cf8', opacity: 0.4, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      </div>
      <p style={{ fontWeight: 900, color: '#6366f1', fontSize: 14, letterSpacing: '0.1em' }}>LOADING FINANCIAL COMMAND CENTRE…</p>
      <style>{`@keyframes ping{75%,100%{transform:scale(1.4);opacity:0}}`}</style>
    </div>
  );

  const TABS = ['overview', 'forms', 'modules'] as const;

  // All modules
  const allModules = [
    // Tier 1 — Core
    { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💵', color: '#16a34a', tier: 'Core' },
    { label: 'Outstanding', href: '/dashboard/fees/outstanding', icon: '⚠️', color: '#dc2626', tier: 'Core' },
    { label: 'Payments List', href: '/dashboard/fees/payments', icon: '📋', color: '#2563eb', tier: 'Core' },
    { label: 'Fee Structure', href: '/dashboard/fees/structure', icon: '🏗️', color: '#7c3aed', tier: 'Core' },
    { label: 'Statements', href: '/dashboard/fees/statements', icon: '📄', color: '#0891b2', tier: 'Core' },
    { label: 'Receipts', href: '/dashboard/fees/receipts', icon: '🧾', color: '#d97706', tier: 'Core' },
    // Tier 2 — Ultra NEW
    { label: 'KCB Buni Push', href: '/dashboard/fees/mpesa-push', icon: '📱', color: '#15803d', tier: 'Ultra' },
    { label: 'Fee Defaulters', href: '/dashboard/fees/defaulters', icon: '🚨', color: '#b91c1c', tier: 'Ultra' },
    { label: 'Budget Module', href: '/dashboard/fees/budget', icon: '📊', color: '#1d4ed8', tier: 'Ultra' },
    { label: 'Projections', href: '/dashboard/fees/projections', icon: '🔮', color: '#7c3aed', tier: 'Ultra' },
    { label: 'Board Report', href: '/dashboard/fees/reports/board', icon: '👔', color: '#0f172a', tier: 'Ultra' },
    { label: 'Export Centre', href: '/dashboard/fees/exports', icon: '📤', color: '#374151', tier: 'Ultra' },
    { label: 'Bank Recon', href: '/dashboard/fees/bank-reconciliation', icon: '🧾', color: '#0c4a6e', tier: 'Ultra' },
    { label: 'Notifications', href: '/dashboard/fees/notifications', icon: '🔔', color: '#713f12', tier: 'Ultra' },
    { label: 'Vote Ledger', href: '/dashboard/fees/vote-heads/ledger', icon: '📋', color: '#4c1d95', tier: 'Ultra' },
    { label: 'Capitation', href: '/dashboard/fees/capitation', icon: '🏫', color: '#14532d', tier: 'Ultra' },
    // Tier 3 — Finance
    { label: 'P&L Statement', href: '/dashboard/fees/pl-statement', icon: '📈', color: '#dc2626', tier: 'Finance' },
    { label: 'Trial Balance', href: '/dashboard/fees/trial-balance', icon: '⚖️', color: '#4f46e5', tier: 'Finance' },
    { label: 'Balance Sheet', href: '/dashboard/fees/balance-sheet', icon: '🏛️', color: '#0369a1', tier: 'Finance' },
    { label: 'Cash Book', href: '/dashboard/fees/cashbook', icon: '📒', color: '#059669', tier: 'Finance' },
    { label: 'Fee Analytics', href: '/dashboard/fees/analytics', icon: '🔬', color: '#6366f1', tier: 'Finance' },
    { label: 'Bursary', href: '/dashboard/fees/bursary', icon: '🎓', color: '#db2777', tier: 'Finance' },
    { label: 'Fee Waiver', href: '/dashboard/fees/fee-waiver', icon: '🎁', color: '#c026d3', tier: 'Finance' },
    { label: 'Approvals', href: '/dashboard/fees/approval-workflow', icon: '✅', color: '#d97706', tier: 'Finance' },
    // Tier 4 — Compliance
    { label: 'Audit Trail', href: '/dashboard/fees/audit', icon: '🔒', color: '#475569', tier: 'Compliance' },
    { label: 'Demand Letters', href: '/dashboard/fees/demand-letters', icon: '✉️', color: '#b91c1c', tier: 'Compliance' },
    { label: 'Reminders', href: '/dashboard/fees/reminder-scheduler', icon: '⏰', color: '#8b5cf6', tier: 'Compliance' },
    { label: 'Govt Returns', href: '/dashboard/fees/government-returns', icon: '🏛️', color: '#1e293b', tier: 'Compliance' },
    { label: 'Bulk SMS/WA', href: '/dashboard/fees/bulk-reminders', icon: '📢', color: '#7c3aed', tier: 'Compliance' },
    { label: 'Aging Buckets', href: '/dashboard/fees/arrears-aging', icon: '📅', color: '#ea580c', tier: 'Compliance' },
  ];

  const tierColors: Record<string, { badge: string; bg: string }> = {
    Core: { badge: '#16a34a', bg: '#dcfce7' },
    Ultra: { badge: '#7c3aed', bg: '#ede9fe' },
    Finance: { badge: '#1d4ed8', bg: '#dbeafe' },
    Compliance: { badge: '#dc2626', bg: '#fee2e2' },
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }}>
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <div style={{ background: 'linear-gradient(135deg,#0c0a2a 0%,#1e1b4b 40%,#312e81 70%,#4f46e5 100%)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(129,140,248,0.3),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 100, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,139,250,0.2),transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.4))', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid rgba(255,255,255,0.2)' }}>💰</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Financial Command Centre</h1>
                  <span style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 9, fontWeight: 900, color: '#fff', padding: '3px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ULTRA</span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{schoolName} — {currentYear} Financial Year</p>
              </div>
            </div>

            {/* Live status strip */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {currentTerm && (
                <span style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 99, padding: '4px 12px', fontSize: 11, color: '#86efac', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: pulse ? '0 0 0 4px rgba(34,197,94,0.3)' : 'none', transition: 'box-shadow 0.4s' }} />
                  {currentTerm.term_name} {currentTerm.academic_year || currentTerm.year || ''}
                </span>
              )}
              <span style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 99, padding: '4px 12px', fontSize: 11, color: '#a5b4fc', fontWeight: 700 }}>
                👥 {activeStudents.length} Active Students
              </span>
              {pendingNotifs > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 99, padding: '4px 12px', fontSize: 11, color: '#fcd34d', fontWeight: 700 }}>
                  🔔 {pendingNotifs} Pending Notifications
                </span>
              )}
            </div>
          </div>

          {/* Right — Mega KPIs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: "Today's Intake", value: fmt2(todayTotal), sub: `${todayPayments.length} payments`, color: '#22c55e', icon: '📅' },
              { label: 'Total Collected', value: fmt2(totalCollected), sub: `${payments.length} transactions`, color: '#818cf8', icon: '✅' },
              { label: 'Outstanding', value: fmt2(totalOutstanding), sub: `${studentsOwing} students owing`, color: totalOutstanding > 0 ? '#f87171' : '#22c55e', icon: '⚠️' },
              { label: 'Net Position', value: fmt2(Math.abs(netPosition)), sub: netPosition >= 0 ? 'Surplus ✅' : 'Deficit ⚠️', color: netPosition >= 0 ? '#34d399' : '#f87171', icon: netPosition >= 0 ? '📈' : '📉' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '16px 20px', minWidth: 140, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: k.color, opacity: 0.15 }} />
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{k.sub}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Collection Rate Mega Bar */}
        <div style={{ position: 'relative', marginTop: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>📊 Annual Fee Collection Rate</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: collectionRate >= 70 ? '#22c55e' : collectionRate >= 40 ? '#f59e0b' : '#f87171' }}>{collectionRate}%</span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: 10, width: `${Math.min(100, collectionRate)}%`, background: collectionRate >= 70 ? 'linear-gradient(90deg,#22c55e,#10b981)' : collectionRate >= 40 ? 'linear-gradient(90deg,#f59e0b,#fb923c)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 99, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{KES(totalCollected)} collected</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{KES(totalExpected)} expected</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ position: 'relative', display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/dashboard/fees/collect" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(34,197,94,0.4)' }}>💵 Collect Fee</Link>
          <Link href="/dashboard/fees/mpesa-push" style={{ background: 'linear-gradient(135deg,#15803d,#059669)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(21,128,61,0.4)' }}>📱 KCB Push</Link>
          <Link href="/dashboard/fees/defaulters" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(220,38,38,0.4)' }}>🚨 Defaulters</Link>
          <Link href="/dashboard/fees/budget" style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>📊 Budget</Link>
          <Link href="/dashboard/fees/reports/board" style={{ background: 'linear-gradient(135deg,#374151,#1f2937)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>👔 Board Report</Link>
          <button onClick={fetchAll} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}><FiRefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {/* ═══════════════ ALERTS STRIP ═══════════════ */}
      {(totalOutstanding > 500000 || studentsOwing > 10) && (
        <div style={{ background: 'linear-gradient(90deg,#7f1d1d,#991b1b)', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#fca5a5', fontWeight: 900, fontSize: 13 }}>ALERT: </span>
            <span style={{ color: '#fecaca', fontSize: 13 }}>
              {studentsOwing} students have outstanding fees totalling {KES(totalOutstanding)}.
              Collection rate is {collectionRate}% — {collectionRate < 40 ? 'CRITICAL' : collectionRate < 70 ? 'NEEDS ATTENTION' : 'ON TRACK'}.
            </span>
          </div>
          <Link href="/dashboard/fees/defaulters" style={{ background: '#dc2626', color: '#fff', borderRadius: 8, padding: '7px 14px', fontWeight: 900, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>View Defaulters →</Link>
        </div>
      )}

      {/* ═══════════════ TABS ═══════════════ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'forms', label: '📚 Form Analysis' },
          { key: 'modules', label: '🗂️ All Modules' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{ background: activeTab === t.key ? '#fff' : 'transparent', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 900, fontSize: 13, color: activeTab === t.key ? '#4f46e5' : '#64748b', cursor: 'pointer', boxShadow: activeTab === t.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* P&L Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
            {[
              { label: 'Fee Revenue', value: KES(totalCollected), icon: '💰', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', sub: `${payments.length} transactions`, badge: 'INCOME' },
              { label: 'Other Income', value: KES(totalIncome), icon: '📈', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', sub: 'Grants & miscellaneous', badge: 'INCOME' },
              { label: 'Total Expenses', value: KES(totalExpenses), icon: '📉', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', sub: 'Approved expenditure', badge: 'EXPENSE' },
              { label: 'Net Position', value: KES(Math.abs(netPosition)), icon: netPosition >= 0 ? '🏆' : '⚠️', color: netPosition >= 0 ? '#059669' : '#dc2626', bg: netPosition >= 0 ? '#f0fdf4' : '#fef2f2', border: netPosition >= 0 ? '#86efac' : '#fca5a5', sub: netPosition >= 0 ? 'School is in surplus' : 'School has deficit', badge: netPosition >= 0 ? 'SURPLUS' : 'DEFICIT' },
              { label: 'Outstanding Fees', value: KES(totalOutstanding), icon: '⏳', color: '#d97706', bg: '#fffbeb', border: '#fde68a', sub: `${studentsOwing} students owing`, badge: 'PENDING' },
              { label: 'Week Collection', value: KES(weekTotal), icon: '📆', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', sub: '7-day rolling total', badge: 'WEEK' },
            ].map((c, i) => (
              <div key={i} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -12, right: -12, width: 60, height: 60, borderRadius: '50%', background: c.color, opacity: 0.08 }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: c.color, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${c.color}18`, padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 8 }}>{c.badge}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{c.value}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{c.sub}</div>
                  </div>
                  <span style={{ fontSize: 28 }}>{c.icon}</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.color, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <FiTrendingUp size={16} color="#6366f1" />
                <span style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>6-Month Collection Trend</span>
              </div>
              <div style={{ height: 240 }}>
                <Line data={{ labels: monthlyTrends.map(m => m.month), datasets: [{ label: 'Collections', data: monthlyTrends.map(m => m.amount), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointRadius: 6, pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v) => `KES ${Number(v).toLocaleString()}` } }, x: { grid: { display: false } } } }} />
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <FiCreditCard size={16} color="#22c55e" />
                <span style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Methods</span>
              </div>
              <div style={{ height: 240 }}>
                {Object.keys(methodBreakdown).length > 0 ? (
                  <Doughnut data={{ labels: Object.keys(methodBreakdown), datasets: [{ data: Object.values(methodBreakdown), backgroundColor: ['#22c55e','#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4'], borderWidth: 2, borderColor: '#fff' }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, font: { size: 10, weight: 'bold' as any } } }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } } }} />
                ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13 }}>No data yet</div>}
              </div>
            </div>
          </div>

          {/* Daily Chart + Recent Payments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <FiBarChart2 size={16} color="#8b5cf6" />
                <span style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Collections — Last 7 Days</span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={{ labels: daily.map(d => d.day), datasets: [{ label: 'KES', data: daily.map(d => d.amount), backgroundColor: daily.map(d => d.day.includes(new Date().toLocaleDateString('en',{weekday:'short',day:'numeric'})) ? '#4f46e5' : 'rgba(99,102,241,0.4)'), borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `KES ${Number(c.raw).toLocaleString()}` } } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } } }} />
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiActivity size={15} color="#22c55e" />
                  <span style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Payments</span>
                </div>
                <Link href="/dashboard/fees/payments" style={{ fontSize: 12, color: '#6366f1', fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>View All <FiArrowRight size={12} /></Link>
              </div>
              <div style={{ overflow: 'auto', maxHeight: 280 }}>
                {recentPayments.map((p, i) => {
                  const s = students.find(st => st.id === p.student_id);
                  const initials = s ? `${s.first_name[0]}${s.last_name[0]}`.toUpperCase() : '?';
                  const colors = ['#6366f1','#22c55e','#f59e0b','#0891b2','#ec4899','#8b5cf6','#14b8a6'];
                  const col = colors[i % colors.length];
                  return (
                    <div key={p.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: col, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s ? `${s.first_name} ${s.last_name}` : '—'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'} · {p.payment_method || '—'}</div>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: 14, color: '#16a34a', flexShrink: 0 }}>{fmt2(Number(p.amount))}</span>
                    </div>
                  );
                })}
                {recentPayments.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No payments recorded yet</div>}
              </div>
            </div>
          </div>

          {/* Quick links row */}
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #ddd6fe', borderRadius: 16, padding: '14px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>⚡ Quick Finance Reports</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: '📈 P&L Statement', href: '/dashboard/fees/pl-statement', color: '#dc2626' },
                { label: '⚖️ Trial Balance', href: '/dashboard/fees/trial-balance', color: '#4f46e5' },
                { label: '🏛️ Balance Sheet', href: '/dashboard/fees/balance-sheet', color: '#0369a1' },
                { label: '📒 Cash Book', href: '/dashboard/fees/cashbook', color: '#059669' },
                { label: '👔 Board Report', href: '/dashboard/fees/reports/board', color: '#0f172a' },
                { label: '📤 Export Centre', href: '/dashboard/fees/exports', color: '#374151' },
                { label: '🔬 Analytics', href: '/dashboard/fees/analytics', color: '#6366f1' },
              ].map((l, i) => (
                <Link key={i} href={l.href} style={{ background: '#fff', border: `1.5px solid ${l.color}30`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 900, color: l.color, textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ FORM ANALYSIS TAB ═══════════════ */}
      {activeTab === 'forms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Form leaderboard */}
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                <span style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>Form-wise Fee Collection Leaderboard</span>
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{currentYear} — Real DB Data</span>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                    {['Rank','Form','Students','Expected','Collected','Balance','Rate','Progress'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Rank' || h === 'Students' || h === 'Rate' ? 'center' : h === 'Expected' || h === 'Collected' || h === 'Balance' ? 'right' : 'left', fontWeight: 900, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formCollection.sort((a, b) => b.pct - a.pct).map((f, i) => {
                    const medals = ['🥇','🥈','🥉'];
                    return (
                      <tr key={f.name} style={{ borderBottom: '1px solid #f8fafc', background: i === 0 ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '16px', textAlign: 'center', fontSize: 20 }}>{medals[i] || i + 1}</td>
                        <td style={{ padding: '16px', fontWeight: 900, fontSize: 15, color: '#0f172a' }}>{f.name}</td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 900, fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>{f.students}</span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{KES(f.expected)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>{KES(f.collected)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 900, color: f.balance > 0 ? '#dc2626' : '#16a34a' }}>{KES(f.balance)}</td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: 15, color: f.pct >= 70 ? '#16a34a' : f.pct >= 40 ? '#d97706' : '#dc2626' }}>{f.pct}%</span>
                        </td>
                        <td style={{ padding: '16px', minWidth: 160 }}>
                          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: 10, width: `${Math.min(100, f.pct)}%`, background: f.pct >= 70 ? 'linear-gradient(90deg,#22c55e,#10b981)' : f.pct >= 40 ? 'linear-gradient(90deg,#f59e0b,#fb923c)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', fontWeight: 900 }}>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 16, color: '#fff' }}>∑</td>
                    <td style={{ padding: '14px 16px', fontWeight: 900, color: '#fff', fontSize: 14 }}>ALL FORMS</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#c7d2fe', fontWeight: 900 }}>{activeStudents.length}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#c7d2fe', fontWeight: 900 }}>{KES(totalExpected)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#86efac', fontWeight: 900 }}>{KES(totalCollected)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#fca5a5', fontWeight: 900 }}>{KES(totalOutstanding)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: collectionRate >= 70 ? '#86efac' : '#fcd34d', fontWeight: 900, fontSize: 16 }}>{collectionRate}%</td>
                    <td style={{ padding: '14px 16px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form bar chart */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>📊 Expected vs Collected by Form</div>
            <div style={{ height: 280 }}>
              <Bar data={{ labels: formCollection.map(f => f.name), datasets: [{ label: 'Expected', data: formCollection.map(f => f.expected), backgroundColor: 'rgba(99,102,241,0.3)', borderRadius: 6, borderColor: '#6366f1', borderWidth: 2 }, { label: 'Collected', data: formCollection.map(f => f.collected), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6, borderColor: '#22c55e', borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: KES ${Number(c.raw).toLocaleString()}` } } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v) => `KES ${(Number(v)/1000).toFixed(0)}K` } }, x: { grid: { display: false } } } }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODULES TAB ═══════════════ */}
      {activeTab === 'modules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(['Core','Ultra','Finance','Compliance'] as const).map(tier => {
            const tierModules = allModules.filter(m => m.tier === tier);
            const tc = tierColors[tier];
            return (
              <div key={tier}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ background: tc.bg, color: tc.badge, fontSize: 11, fontWeight: 900, padding: '4px 12px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tier}</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{tierModules.length} modules</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
                  {tierModules.map((m, i) => (
                    <Link key={i} href={m.href} style={{ textDecoration: 'none', background: '#fff', borderRadius: 16, padding: '18px 16px', border: `1.5px solid ${m.color}20`, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${m.color}25`; (e.currentTarget as HTMLElement).style.borderColor = `${m.color}60`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = `${m.color}20`; }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: m.color, opacity: 0.08 }} />
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}>{m.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ background: tc.bg, color: tc.badge, fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tier}</span>
                        <FiArrowRight size={10} color={m.color} style={{ marginLeft: 'auto' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(1.5); opacity: 0; } }
        a { transition: all 0.2s; }
      `}</style>
    </div>
  );
}
