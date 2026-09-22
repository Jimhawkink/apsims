'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import Link from 'next/link';
import {
  FiChevronRight, FiRefreshCw, FiShield, FiUsers,
  FiKey, FiActivity, FiAlertCircle, FiCheckCircle,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const ROLE_COLORS: Record<string, string> = {
  admin: '#dc2626', Admin: '#dc2626',
  principal: '#7c3aed', Principal: '#7c3aed',
  teacher: '#3b82f6', Teacher: '#3b82f6',
  parent: '#ec4899', Parent: '#ec4899',
  student: '#f59e0b', Student: '#f59e0b',
  bursar: '#0891b2', Bursar: '#0891b2',
  staff: '#10b981', Staff: '#10b981',
};
const ROLE_BG: Record<string, string> = {
  admin: '#fee2e2', Admin: '#fee2e2',
  principal: '#f5f3ff', Principal: '#f5f3ff',
  teacher: '#dbeafe', Teacher: '#dbeafe',
  parent: '#fdf2f8', Parent: '#fdf2f8',
  student: '#fef3c7', Student: '#fef3c7',
  bursar: '#e0f2fe', Bursar: '#e0f2fe',
  staff: '#ecfdf5', Staff: '#ecfdf5',
};
const ROLE_ICONS: Record<string, string> = {
  admin: '🔑', Admin: '🔑', principal: '👑', Principal: '👑',
  teacher: '👨‍🏫', Teacher: '👨‍🏫', parent: '👨‍👩‍👧', Parent: '👨‍👩‍👧',
  student: '🎓', Student: '🎓', bursar: '💰', Bursar: '💰',
  staff: '👥', Staff: '👥',
};

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

export default function PortalsPanel() {
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<'overview' | 'admins' | 'portal' | 'visitors'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: au }, { data: pu }, { data: vi }, { data: ll },
      ] = await Promise.all([
        supabase.from('school_users').select('*').order('created_at', { ascending: false }),
        supabase.from('school_portal_users').select('*').order('created_at', { ascending: false }),
        supabase.from('school_visitors').select('*').order('visit_date', { ascending: false }).limit(30),
        supabase.from('school_login_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setAdminUsers(au || []);
      setPortalUsers(pu || []);
      setVisitors(vi || []);
      setLoginLogs(ll || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
        <FiShield size={22} className="text-indigo-600 animate-pulse" />
      </div>
      <p className="text-xs text-gray-400 font-bold">Loading portal intelligence…</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  );

  // ── Computed ──
  const allUsers = [...adminUsers, ...portalUsers];
  const activeAdmins = adminUsers.filter(u => u.is_active !== false && u.status !== 'Inactive');
  const activePortal = portalUsers.filter(u => u.is_active !== false && u.status !== 'Inactive');

  // Group portal users by role
  const byRole: Record<string, any[]> = {};
  [...adminUsers, ...portalUsers].forEach(u => {
    const r = u.role || u.user_type || 'user';
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(u);
  });

  // Recent logins (today)
  const today = new Date().toISOString().split('T')[0];
  const todayLogins = loginLogs.filter(l => (l.created_at || '').startsWith(today));
  const todayVisitors = visitors.filter(v => (v.visit_date || '').startsWith(today));

  // Role chart
  const roleEntries = Object.entries(byRole).sort((a, b) => b[1].length - a[1].length);
  const roleColors = roleEntries.map(([r]) => ROLE_COLORS[r] || '#6b7280');
  const roleChart = {
    labels: roleEntries.map(([r]) => r.charAt(0).toUpperCase() + r.slice(1)),
    datasets: [{ data: roleEntries.map(([, v]) => v.length), backgroundColor: roleColors, borderWidth: 0, hoverOffset: 6 }],
  };

  // Monthly portal sign-ups (last 6)
  const signUpTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear(); const m = d.getMonth();
    const lbl = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    const count = allUsers.filter(u => {
      const ud = new Date(u.created_at || '');
      return ud.getFullYear() === y && ud.getMonth() === m;
    }).length;
    return { month: lbl, count };
  });
  const signUpChart = {
    labels: signUpTrend.map(t => t.month),
    datasets: [{ label: 'New Users', data: signUpTrend.map(t => t.count), backgroundColor: '#6366f1', borderRadius: 8, borderSkipped: false as const }],
  };

  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } };
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: '#f8fafc' }, ticks: { font: { size: 9 } }, beginAtZero: true } } };

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899,#f59e0b,#10b981)' }} />
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">🔐</div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Portal Users & Access Intelligence</h2>
              <p className="text-[10px] text-gray-400">Admin · Teacher · Parent · Student Portals · Visitors</p>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full">
              {fmtN(allUsers.length)} Total Users
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(['overview', 'admins', 'portal', 'visitors'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all ${view === v ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                {v === 'overview' ? '📊 Overview' : v === 'admins' ? '🔑 Admins' : v === 'portal' ? '👥 Portal' : '🚶 Visitors'}
              </button>
            ))}
            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 border border-gray-200 transition"><FiRefreshCw size={13} /></button>
          </div>
        </div>
      </div>

      {/* ══════════ OVERVIEW ══════════ */}
      {view === 'overview' && (
        <div className="space-y-4">

          {/* KPI Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🔑', label: 'Admin Users', value: fmtN(adminUsers.length), sub: `${activeAdmins.length} active`, color: '#dc2626', bg: '#fee2e2', tag: `${activeAdmins.length} active` },
              { icon: '👥', label: 'Portal Users', value: fmtN(portalUsers.length), sub: `${activePortal.length} active portals`, color: '#4f46e5', bg: '#eef2ff', tag: `${activePortal.length} active` },
              { icon: '📱', label: "Today's Logins", value: fmtN(todayLogins.length), sub: 'System sign-ins today', color: '#059669', bg: '#ecfdf5', tag: 'Live' },
              { icon: '🚶', label: "Today's Visitors", value: fmtN(todayVisitors.length), sub: `${visitors.length} total logged`, color: '#d97706', bg: '#fef3c7', tag: 'Today' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: m.bg }}>{m.icon}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{m.tag}</span>
                </div>
                <p className="text-2xl font-black leading-none mb-1" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Role tiles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SH title="👥 User Distribution by Role" sub={`${allUsers.length} total system users`} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {roleEntries.map(([role, users], i) => (
                <div key={i} className="rounded-2xl p-4 text-center border" style={{ background: ROLE_BG[role] || '#f9fafb', borderColor: (ROLE_COLORS[role] || '#6b7280') + '30' }}>
                  <div className="text-2xl mb-2">{ROLE_ICONS[role] || '👤'}</div>
                  <p className="text-2xl font-black" style={{ color: ROLE_COLORS[role] || '#374151' }}>{users.length}</p>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider mt-1 capitalize">{role}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{users.filter(u => u.is_active !== false).length} active</p>
                </div>
              ))}
              {roleEntries.length === 0 && (
                <div className="col-span-4 py-8 text-center text-gray-400">
                  <FiUsers size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-xs">No users created yet</p>
                  <Link href="/dashboard/users" className="text-indigo-500 text-xs font-bold hover:underline mt-1 inline-block">Create Users →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Role doughnut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="🔐 Role Distribution" sub="Users by access level" />
              <div style={{ height: 160 }}>
                {roleEntries.length > 0
                  ? <Doughnut data={roleChart} options={donutOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiShield size={26} /><p className="text-xs text-gray-400 mt-2">No users yet</p></div>}
              </div>
              <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                {roleEntries.map(([r, v], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: ROLE_COLORS[r] || '#6b7280' }} />
                    <span className="text-[10px] text-gray-500 flex-1 font-semibold capitalize">{r}</span>
                    <span className="text-[10px] font-black text-gray-700">{v.length}</span>
                    <span className="text-[9px] text-gray-400">({pct(v.length, allUsers.length)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign-up trend bar */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📈 New User Sign-ups — Last 6 Months" sub="Admin + portal user registrations" href="/dashboard/users" linkLabel="Manage Users" />
              <div style={{ height: 220 }}>
                {signUpTrend.some(t => t.count > 0)
                  ? <Bar data={signUpChart} options={barOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiActivity size={26} /><p className="text-xs text-gray-400 mt-2">No sign-up data</p></div>}
              </div>
            </div>
          </div>

          {/* Recent activity: admin users + visitors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Admin users list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <SH title="🔑 System Administrators" sub={`${adminUsers.length} admin accounts`} href="/dashboard/users" linkLabel="Manage" />
              </div>
              <div className="divide-y divide-gray-50">
                {adminUsers.slice(0, 6).map((u: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: ROLE_COLORS[u.role || 'admin'] || '#6366f1' }}>
                        {(u.full_name || u.username || 'A')?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{u.full_name || u.name || u.username}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{u.username} · {u.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: (ROLE_BG[u.role || 'admin']) || '#eef2ff', color: ROLE_COLORS[u.role || 'admin'] || '#4f46e5' }}>
                        {ROLE_ICONS[u.role || 'admin']} {u.role || 'Admin'}
                      </span>
                      <p className={`text-[9px] font-bold mt-1 ${u.is_active !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                        {u.is_active !== false ? '● Active' : '○ Inactive'}
                      </p>
                    </div>
                  </div>
                ))}
                {adminUsers.length === 0 && <div className="py-8 text-center text-gray-400"><FiKey size={24} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No admin users yet</p></div>}
              </div>
            </div>

            {/* Recent visitors */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <SH title="🚶 Recent Visitors" sub={`${visitors.length} total · ${todayVisitors.length} today`} href="/dashboard/visitors" linkLabel="Visitor Log" />
              </div>
              <div className="divide-y divide-gray-50">
                {visitors.slice(0, 6).map((v: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-black text-orange-600 flex-shrink-0">
                        {(v.visitor_name || 'V')?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{v.visitor_name || 'Visitor'}</p>
                        <p className="text-[10px] text-gray-400">{v.purpose || 'General visit'} · {v.host_name ? `Visiting: ${v.host_name}` : '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-500">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${v.status === 'Checked Out' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                        {v.status || 'Signed In'}
                      </span>
                    </div>
                  </div>
                ))}
                {visitors.length === 0 && <div className="py-8 text-center text-gray-400"><FiUsers size={24} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No visitor records</p></div>}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '🔑 Admin Users', href: '/dashboard/users', desc: 'Manage system access', color: '#dc2626', bg: '#fee2e2' },
              { label: '👨‍🏫 Teacher Portal', href: '/dashboard/portal/teachers', desc: 'Teacher online access', color: '#3b82f6', bg: '#dbeafe' },
              { label: '👨‍👩‍👧 Parent Portal', href: '/dashboard/portal/parents', desc: 'Parent & guardian access', color: '#ec4899', bg: '#fdf2f8' },
              { label: '🚶 Visitor Log', href: '/dashboard/visitors', desc: 'Gate & visitor records', color: '#d97706', bg: '#fef3c7' },
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

      {/* ══════════ ADMINS VIEW ══════════ */}
      {view === 'admins' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SH title={`🔑 System Admin Users — ${adminUsers.length} accounts`} sub="Full administrator register" href="/dashboard/users" linkLabel="Add User" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50">{['#', 'Name', 'Username', 'Email', 'Role', 'Last Login', 'Created', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {adminUsers.map((u: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: ROLE_COLORS[u.role || 'admin'] || '#6366f1' }}>
                          {(u.full_name || u.username || 'A')?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-gray-800">{u.full_name || u.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] font-mono text-indigo-600">{u.username || '—'}</td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-500 max-w-[140px] truncate">{u.email || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[9px] font-black px-2 py-1 rounded-full capitalize" style={{ background: (ROLE_BG[u.role || 'admin']) || '#eef2ff', color: ROLE_COLORS[u.role || 'admin'] || '#4f46e5' }}>
                        {ROLE_ICONS[u.role || 'admin']} {u.role || 'Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Never'}</td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-black px-2 py-1 rounded-full ${u.is_active !== false && u.status !== 'Inactive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{u.is_active !== false && u.status !== 'Inactive' ? '● Active' : '○ Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {adminUsers.length === 0 && <div className="py-10 text-center text-gray-400"><FiKey size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No admin users yet</p><Link href="/dashboard/users" className="text-indigo-500 text-xs font-bold hover:underline mt-1 inline-block">Add Admin →</Link></div>}
          </div>
        </div>
      )}

      {/* ══════════ PORTAL USERS VIEW ══════════ */}
      {view === 'portal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Portal Users', value: portalUsers.length, icon: '👥', color: '#4f46e5', bg: '#eef2ff' },
              { label: 'Active', value: activePortal.length, icon: '✅', color: '#059669', bg: '#ecfdf5' },
              { label: 'Inactive', value: portalUsers.length - activePortal.length, icon: '○', color: '#9ca3af', bg: '#f9fafb' },
              { label: 'Role Types', value: Object.keys(byRole).length, icon: '🗂️', color: '#7c3aed', bg: '#f5f3ff' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📱 Portal Users Register" sub={`${portalUsers.length} users with portal access`} href="/dashboard/users/portal" linkLabel="Manage" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['#', 'Username', 'Full Name', 'Role', 'Phone', 'Last Login', 'Created', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {portalUsers.map((u: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono font-bold text-indigo-600">{u.username || '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{u.full_name || u.name || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] font-black px-2 py-1 rounded-full capitalize" style={{ background: (ROLE_BG[u.role || u.user_type || 'user']) || '#eef2ff', color: ROLE_COLORS[u.role || u.user_type || 'user'] || '#4f46e5' }}>
                          {ROLE_ICONS[u.role || u.user_type || 'user'] || '👤'} {u.role || u.user_type || 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-500">{u.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : 'Never'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5"><span className={`text-[9px] font-black px-2 py-1 rounded-full ${u.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{u.is_active !== false ? '● Active' : '○ Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {portalUsers.length === 0 && <div className="py-10 text-center text-gray-400"><FiUsers size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No portal users yet</p><Link href="/dashboard/users/portal" className="text-indigo-500 text-xs font-bold hover:underline mt-1 inline-block">Create Portal Users →</Link></div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ VISITORS VIEW ══════════ */}
      {view === 'visitors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Visitors', value: visitors.length, icon: '🚶', color: '#d97706', bg: '#fef3c7', sub: 'All time' },
              { label: "Today's Visitors", value: todayVisitors.length, icon: '📅', color: '#059669', bg: '#ecfdf5', sub: 'Logged today' },
              { label: 'Checked In', value: visitors.filter(v => v.status !== 'Checked Out').length, icon: '✅', color: '#0891b2', bg: '#e0f2fe', sub: 'Currently on campus' },
              { label: 'Checked Out', value: visitors.filter(v => v.status === 'Checked Out').length, icon: '🚪', color: '#9ca3af', bg: '#f9fafb', sub: 'Already departed' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="🚶 Visitor Log" sub={`${visitors.length} total visitor records`} href="/dashboard/visitors" linkLabel="Log Visitor" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['#', 'Visitor', 'Phone', 'Purpose', 'Host', 'Date', 'Time In', 'Time Out', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {visitors.map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{v.visitor_name || 'Visitor'}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-500">{v.phone || v.visitor_phone || '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] font-semibold text-indigo-600">{v.purpose || 'General'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{v.host_name || v.person_to_see || '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-500">{v.time_in || v.check_in || '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-500">{v.time_out || v.check_out || '—'}</td>
                      <td className="px-4 py-2.5"><span className={`text-[9px] font-black px-2 py-1 rounded-full ${v.status === 'Checked Out' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>{v.status || 'Signed In'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visitors.length === 0 && <div className="py-10 text-center text-gray-400"><FiUsers size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No visitor records yet</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
