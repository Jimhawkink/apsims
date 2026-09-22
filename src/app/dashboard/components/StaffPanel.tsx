'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Link from 'next/link';
import {
  FiChevronRight, FiTrendingUp, FiTrendingDown, FiUsers,
  FiRefreshCw, FiAlertCircle, FiCheckCircle, FiClock,
  FiActivity, FiStar, FiCalendar,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n: number) => n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K` : `KES ${n}`;
const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

function SH({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-xs font-black text-gray-800 tracking-tight">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {href && <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">{linkLabel || 'View All'} <FiChevronRight size={11} /></Link>}
    </div>
  );
}

export default function StaffPanel() {
  const [staff, setStaff] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [cpd, setCpd] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<'overview' | 'directory' | 'payroll' | 'leave'>('overview');
  const currentYear = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: s }, { data: p }, { data: l }, { data: a }, { data: c },
      ] = await Promise.all([
        supabase.from('school_teachers').select('*').order('full_name'),
        supabase.from('school_payroll').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('school_leave_requests').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('school_teacher_appraisals').select('teacher_id,score,year').eq('year', currentYear).limit(100),
        supabase.from('school_teacher_cpd').select('teacher_id,hours,status,activity_name').limit(100),
      ]);
      setStaff(s || []);
      setPayroll(p || []);
      setLeaves(l || []);
      setAppraisals(a || []);
      setCpd(c || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentYear]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
        <FiUsers size={22} className="text-violet-600 animate-pulse" />
      </div>
      <p className="text-xs text-gray-400 font-bold">Loading staff intelligence…</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  );

  // ── Computed ──
  const active = staff.filter(s => s.status === 'Active' || s.is_active !== false);
  const teaching = staff.filter(s => s.staff_type === 'Teaching' || (!s.staff_type && s.subject_id));
  const nonTeaching = staff.filter(s => s.staff_type === 'Non-Teaching');
  const male = staff.filter(s => s.gender === 'Male').length;
  const female = staff.filter(s => s.gender === 'Female').length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  const approvedLeaves = leaves.filter(l => l.status === 'Approved').length;
  const thisMonthPayroll = payroll.filter(p => {
    const d = new Date(p.created_at || p.pay_date || '');
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === currentYear;
  });
  const payrollTotal = thisMonthPayroll.reduce((s, p) => s + Number(p.net_pay || 0), 0);
  const avgSalary = thisMonthPayroll.length > 0 ? Math.round(payrollTotal / thisMonthPayroll.length) : 0;
  const avgAppraisal = appraisals.length > 0 ? Math.round(appraisals.reduce((s, a) => s + Number(a.score || 0), 0) / appraisals.length) : 0;
  const cpdCompleted = cpd.filter(c => c.status === 'Completed').length;
  const cpdHours = cpd.reduce((s, c) => s + Number(c.hours || 0), 0);

  // Charts
  const genderChart = {
    labels: ['Male', 'Female'],
    datasets: [{ data: [male, female], backgroundColor: ['#3b82f6', '#ec4899'], borderWidth: 0, hoverOffset: 6 }],
  };
  const typeChart = {
    labels: ['Teaching', 'Non-Teaching'],
    datasets: [{ data: [teaching.length, nonTeaching.length], backgroundColor: ['#8b5cf6', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }],
  };
  const leaveStatusData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{ data: [pendingLeaves, approvedLeaves, leaves.filter(l => l.status === 'Rejected').length], backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'], borderWidth: 0 }],
  };

  // Monthly payroll trend
  const payrollTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear(); const m = d.getMonth();
    const lbl = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    const tot = payroll.filter(p => {
      const pd = new Date(p.created_at || p.pay_date || '');
      return pd.getFullYear() === y && pd.getMonth() === m;
    }).reduce((s, p) => s + Number(p.net_pay || 0), 0);
    return { month: lbl, total: tot };
  });
  const payrollTrendChart = {
    labels: payrollTrend.map(t => t.month),
    datasets: [{ label: 'Net Payroll', data: payrollTrend.map(t => t.total), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#8b5cf6', pointRadius: 4, borderWidth: 2.5 }],
  };

  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } };
  const cbOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const lineOpts = { ...cbOpts, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K`, font: { size: 9 } }, beginAtZero: true } } };

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#8b5cf6,#6366f1,#3b82f6,#06b6d4,#10b981)' }} />
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">👩‍🏫</div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Staff & HR Intelligence</h2>
              <p className="text-[10px] text-gray-400">Staff · Payroll · Leave · Appraisals · CPD</p>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-black bg-violet-100 text-violet-700 border border-violet-200 rounded-full">{currentYear}</span>
          </div>
          <div className="flex items-center gap-2">
            {(['overview', 'directory', 'payroll', 'leave'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all ${view === v ? 'bg-violet-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}>
                {v === 'overview' ? '📊 Overview' : v === 'directory' ? '👥 Directory' : v === 'payroll' ? '💰 Payroll' : '📋 Leave'}
              </button>
            ))}
            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl bg-gray-100 hover:bg-violet-50 hover:text-violet-600 text-gray-400 border border-gray-200 transition"><FiRefreshCw size={13} /></button>
          </div>
        </div>
      </div>

      {/* ══════════ OVERVIEW ══════════ */}
      {view === 'overview' && (
        <div className="space-y-4">

          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '👥', label: 'Total Staff', value: fmtN(staff.length), sub: `${active.length} active`, color: '#6366f1', bg: '#eef2ff', trend: 'up', trendVal: `${active.length} active` },
              { icon: '👨‍🏫', label: 'Teaching', value: fmtN(teaching.length), sub: `${nonTeaching.length} non-teaching`, color: '#3b82f6', bg: '#dbeafe', trend: 'neutral', trendVal: 'TSC' },
              { icon: '💰', label: 'Monthly Payroll', value: fmtShort(payrollTotal), sub: `Avg ${fmtShort(avgSalary)} per staff`, color: '#7c3aed', bg: '#f5f3ff', trend: 'up', trendVal: 'this month' },
              { icon: '📋', label: 'Pending Leaves', value: fmtN(pendingLeaves), sub: `${approvedLeaves} approved`, color: pendingLeaves > 0 ? '#d97706' : '#059669', bg: pendingLeaves > 0 ? '#fef3c7' : '#d1fae5', trend: pendingLeaves > 0 ? 'down' : 'up', trendVal: 'requests' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: m.bg }}>{m.icon}</div>
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : m.trend === 'down' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                    {m.trend === 'up' ? <FiTrendingUp size={9} /> : m.trend === 'down' ? <FiClock size={9} /> : <FiActivity size={9} />}
                    {m.trendVal}
                  </span>
                </div>
                <p className="text-2xl font-black leading-none mb-1" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Gender M:F', value: `${male}:${female}`, bar: pct(male, staff.length), color: '#3b82f6', bg: '#dbeafe', icon: '⚖️', sub: `${pct(male, staff.length)}% male` },
              { label: 'Avg Appraisal', value: avgAppraisal > 0 ? `${avgAppraisal}%` : 'N/A', bar: avgAppraisal, color: '#059669', bg: '#d1fae5', icon: '⭐', sub: `${appraisals.length} appraised` },
              { label: 'CPD Hours', value: `${cpdHours}h`, bar: Math.min(100, cpdCompleted * 10), color: '#0891b2', bg: '#e0f2fe', icon: '📚', sub: `${cpdCompleted} sessions done` },
              { label: 'Leave Requests', value: fmtN(leaves.length), bar: pct(pendingLeaves, leaves.length || 1), color: '#f59e0b', bg: '#fef3c7', icon: '📋', sub: `${pendingLeaves} pending` },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base mb-3" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400 mb-2">{m.sub}</p>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${m.bar}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gender doughnut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="⚖️ Gender Distribution" sub="All staff by gender" />
              <div style={{ height: 140 }}>
                <Doughnut data={genderChart} options={donutOpts} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                {[{ l: 'Male', v: male, c: '#3b82f6', b: '#dbeafe' }, { l: 'Female', v: female, c: '#ec4899', b: '#fce7f3' }].map(a => (
                  <div key={a.l} className="rounded-xl py-2" style={{ background: a.b }}>
                    <p className="text-lg font-black" style={{ color: a.c }}>{a.v}</p>
                    <p className="text-[9px] font-bold text-gray-500">{a.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff type doughnut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📊 Staff Type" sub="Teaching vs Non-Teaching" />
              <div style={{ height: 140 }}>
                <Doughnut data={typeChart} options={donutOpts} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                {[{ l: 'Teaching', v: teaching.length, c: '#8b5cf6', b: '#ede9fe' }, { l: 'Non-Teaching', v: nonTeaching.length, c: '#f59e0b', b: '#fef3c7' }].map(a => (
                  <div key={a.l} className="rounded-xl py-2" style={{ background: a.b }}>
                    <p className="text-lg font-black" style={{ color: a.c }}>{a.v}</p>
                    <p className="text-[9px] font-bold text-gray-500">{a.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave status doughnut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📋 Leave Status" sub={`${leaves.length} total requests`} href="/dashboard/teachers/leave" linkLabel="Manage" />
              <div style={{ height: 140 }}>
                {leaves.length > 0
                  ? <Doughnut data={leaveStatusData} options={donutOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiCalendar size={26} /><p className="text-xs text-gray-400 mt-2">No leave requests</p></div>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[{ l: 'Pending', v: pendingLeaves, c: '#f59e0b', b: '#fef3c7' }, { l: 'Approved', v: approvedLeaves, c: '#22c55e', b: '#f0fdf4' }, { l: 'Rejected', v: leaves.filter(l => l.status === 'Rejected').length, c: '#ef4444', b: '#fef2f2' }].map(a => (
                  <div key={a.l} className="rounded-xl py-1.5" style={{ background: a.b }}>
                    <p className="text-base font-black" style={{ color: a.c }}>{a.v}</p>
                    <p className="text-[8px] font-bold text-gray-500">{a.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payroll trend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SH title="💰 Payroll Trend — Last 6 Months" sub="Monthly net pay disbursed" href="/dashboard/hr-payroll/payroll" linkLabel="Full Payroll" />
            <div style={{ height: 200 }}>
              {payrollTrend.some(t => t.total > 0)
                ? <Line data={payrollTrendChart} options={lineOpts} />
                : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiActivity size={28} /><p className="text-xs text-gray-400 mt-2">No payroll data yet</p></div>}
            </div>
          </div>

          {/* Recent leave requests */}
          {leaves.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <SH title="📋 Recent Leave Requests" sub={`${pendingLeaves} pending approval`} href="/dashboard/teachers/leave" linkLabel="Manage All" />
              </div>
              <div className="divide-y divide-gray-50">
                {leaves.slice(0, 6).map((l: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm font-black text-violet-600">
                        {(l.teacher_name || l.full_name || 'S')?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{l.teacher_name || l.full_name || 'Staff'}</p>
                        <p className="text-[10px] text-gray-400">{l.leave_type || 'Personal'} · {l.start_date ? new Date(l.start_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'} – {l.end_date ? new Date(l.end_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {l.status === 'Pending' ? '⏳ Pending' : l.status === 'Approved' ? '✅ Approved' : '❌ Rejected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '💰 Payroll', href: '/dashboard/hr-payroll/payroll', desc: 'Process & manage salary', color: '#7c3aed', bg: '#f5f3ff' },
              { label: '📋 Leave Mgmt', href: '/dashboard/teachers/leave', desc: 'Approve/reject requests', color: '#d97706', bg: '#fef3c7' },
              { label: '⭐ Appraisals', href: '/dashboard/teachers/appraisal', desc: 'Performance evaluations', color: '#059669', bg: '#d1fae5' },
              { label: '📚 CPD', href: '/dashboard/teachers/cpd', desc: 'Professional development', color: '#0891b2', bg: '#e0f2fe' },
            ].map((a, i) => (
              <Link key={i} href={a.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
                style={{ borderTopWidth: 3, borderTopColor: a.color }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: a.bg }}>{a.label.split(' ')[0]}</div>
                <p className="text-xs font-black text-gray-700">{a.label.split(' ').slice(1).join(' ')}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ DIRECTORY ══════════ */}
      {view === 'directory' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SH title={`👥 Staff Directory — ${staff.length} Members`} sub="Full staff register" href="/dashboard/teachers" linkLabel="Manage" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  {['#', 'Name', 'Type', 'Gender', 'Phone', 'Email', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s: any, i: number) => {
                  const appr = appraisals.find(a => a.teacher_id === s.id);
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                            style={{ background: s.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#db2777)' : 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                            {(s.full_name || s.first_name || 'S')?.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-gray-800">{s.full_name || `${s.first_name} ${s.last_name}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.staff_type === 'Non-Teaching' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                          {s.staff_type || 'Teaching'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          {s.gender || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-500">{s.phone || s.mobile || '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500 max-w-[140px] truncate">{s.email || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full ${s.status === 'Active' || s.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {s.status === 'Active' || s.is_active !== false ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ PAYROLL ══════════ */}
      {view === 'payroll' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'This Month Total', value: fmtShort(payrollTotal), icon: '💰', color: '#7c3aed', bg: '#f5f3ff', sub: `${thisMonthPayroll.length} staff processed` },
              { label: 'Average Pay', value: fmtShort(avgSalary), icon: '📊', color: '#059669', bg: '#d1fae5', sub: 'Per staff member' },
              { label: 'Total Records', value: fmtN(payroll.length), icon: '📋', color: '#0891b2', bg: '#e0f2fe', sub: 'All payroll entries' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SH title="💰 Payroll Trend — 6 Months" sub="Total net salary by month" href="/dashboard/hr-payroll/payroll" />
            <div style={{ height: 220 }}>
              <Line data={payrollTrendChart} options={lineOpts} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📋 Recent Payroll Entries" sub={`${payroll.length} total records`} href="/dashboard/hr-payroll/payroll" linkLabel="Full Payroll" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['Staff', 'Basic Pay', 'Allowances', 'Deductions', 'Net Pay', 'Month', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {payroll.slice(0, 10).map((p: any, i: number) => {
                    const st = staff.find(s => s.id === p.teacher_id);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{st?.full_name || p.staff_name || `Staff #${p.teacher_id}`}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-600">{fmt(Number(p.basic_salary || p.basic_pay || 0))}</td>
                        <td className="px-4 py-2.5 text-[10px] text-emerald-600 font-semibold">+{fmt(Number(p.allowances || 0))}</td>
                        <td className="px-4 py-2.5 text-[10px] text-red-500 font-semibold">-{fmt(Number(p.deductions || 0))}</td>
                        <td className="px-4 py-2.5 text-sm font-black text-violet-600">{fmt(Number(p.net_pay || 0))}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-500">{p.pay_month || p.month || '—'}</td>
                        <td className="px-4 py-2.5"><span className={`text-[9px] font-black px-2 py-1 rounded-full ${p.status === 'Paid' || p.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status || 'Draft'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ LEAVE ══════════ */}
      {view === 'leave' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Requests', value: leaves.length, icon: '📋', color: '#6366f1', bg: '#eef2ff' },
              { label: 'Pending', value: pendingLeaves, icon: '⏳', color: '#d97706', bg: '#fef3c7' },
              { label: 'Approved', value: approvedLeaves, icon: '✅', color: '#059669', bg: '#d1fae5' },
              { label: 'Rejected', value: leaves.filter(l => l.status === 'Rejected').length, icon: '❌', color: '#dc2626', bg: '#fee2e2' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
              </div>
            ))}
          </div>
          {pendingLeaves > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <FiAlertCircle size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-800 flex-1">{pendingLeaves} leave {pendingLeaves === 1 ? 'request needs' : 'requests need'} your approval</p>
              <Link href="/dashboard/teachers/leave" className="text-[11px] font-black text-amber-700 underline">Review Now →</Link>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📋 All Leave Requests" sub={`${leaves.length} requests on record`} href="/dashboard/teachers/leave" linkLabel="Manage All" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['Staff', 'Type', 'From', 'To', 'Days', 'Reason', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {leaves.map((l: any, i: number) => {
                    const days = l.start_date && l.end_date ? Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1 : '—';
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{l.teacher_name || l.full_name || 'Staff'}</td>
                        <td className="px-4 py-2.5 text-[10px] font-semibold text-indigo-600">{l.leave_type || 'Personal'}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-500">{l.start_date ? new Date(l.start_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-500">{l.end_date ? new Date(l.end_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}</td>
                        <td className="px-4 py-2.5 text-[10px] font-black text-gray-700">{days}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-500 max-w-[120px] truncate">{l.reason || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {leaves.length === 0 && <div className="py-10 text-center text-gray-400"><FiCalendar size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No leave requests yet</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
