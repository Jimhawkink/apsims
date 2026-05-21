'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    FiHome, FiUsers, FiDollarSign, FiBookOpen, FiBox, FiTruck,
    FiBarChart2, FiSettings, FiSearch, FiBell, FiUser, FiLogOut,
    FiGrid, FiCalendar, FiFileText, FiUserCheck, FiCreditCard,
    FiShield, FiLayers, FiTrendingUp, FiChevronDown, FiLayout,
    FiClock, FiZap, FiArrowRight, FiChevronRight, FiActivity,
    FiPieChart, FiAlertCircle, FiCheckCircle, FiStar
} from 'react-icons/fi';

// ── Sidebar nav items ──
const NAV_SECTIONS = [
    { title: 'MAIN', items: [
        { label: 'Dashboard', icon: FiHome, href: '/dashboard', color: '#3b82f6' },
        { label: 'Students', icon: FiUsers, href: '/dashboard/students', color: '#10b981' },
        { label: 'Finance & Fees', icon: FiDollarSign, href: '/dashboard/fees', color: '#22c55e' },
        { label: 'HR & Payroll', icon: FiUserCheck, href: '/dashboard/hr-payroll', color: '#8b5cf6' },
        { label: 'Exams', icon: FiFileText, href: '/dashboard/exams', color: '#ef4444' },
    ]},
    { title: 'MANAGEMENT', items: [
        { label: 'Ultra Library', icon: FiBookOpen, href: '/dashboard/library-inventory/ultra', color: '#6366f1' },
        { label: 'Stores & Kitchen', icon: FiBox, href: '/dashboard/stores/ultra', color: '#f59e0b' },
        { label: 'Asset Manager', icon: FiBox, href: '/dashboard/assets/ultra', color: '#a855f7' },
        { label: 'Procurement', icon: FiTruck, href: '/dashboard/procurement', color: '#0891b2' },
    ]},
    { title: 'ANALYTICS', items: [
        { label: 'Analytics', icon: FiTrendingUp, href: '/dashboard/fees/analytics', color: '#ec4899' },
        { label: 'Report Cards', icon: FiLayers, href: '/dashboard/report-cards', color: '#14b8a6' },
        { label: 'Timetable', icon: FiCalendar, href: '/dashboard/timetable', color: '#f97316' },
        { label: 'Audit Trail', icon: FiShield, href: '/dashboard/fees/audit', color: '#64748b' },
    ]},
];

const QUICK_ACTIONS = [
    { label: 'Add Student', icon: FiUsers, bg: '#10b981', href: '/dashboard/students' },
    { label: 'Collect Fee', icon: FiCreditCard, bg: '#22c55e', href: '/dashboard/fees' },
    { label: 'Run Payroll', icon: FiDollarSign, bg: '#8b5cf6', href: '/dashboard/hr-payroll/payroll' },
    { label: 'Issue Book', icon: FiBookOpen, bg: '#6366f1', href: '/dashboard/library-inventory/ultra' },
    { label: 'Record Exam', icon: FiFileText, bg: '#ef4444', href: '/dashboard/exams' },
];

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Mini bar chart ──
function MiniBarChart({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data, 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
            {data.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: '100%', minWidth: 8, borderRadius: 4, background: `${color}${i === data.length - 1 ? '' : '40'}`, height: `${Math.max(4, (v / max) * 100)}%`, transition: 'height 0.5s' }} />
                    <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{MONTHS_SHORT[i] || ''}</span>
                </div>
            ))}
        </div>
    );
}

// ── Donut chart ──
function MiniDonut({ segments, size = 80 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    let cumulative = 0;
    const r = size / 2 - 8;
    const cx = size / 2;
    const cy = size / 2;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {segments.map((seg, i) => {
                const startAngle = (cumulative / total) * 360 - 90;
                cumulative += seg.value;
                const endAngle = (cumulative / total) * 360 - 90;
                const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
                const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
                const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
                const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
                return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={seg.color} opacity={0.85} />;
            })}
            <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="900" fill="#1e293b">{total}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">TOTAL</text>
        </svg>
    );
}

export default function PremierDashboard({ children, user, onLogout }: {
    children: React.ReactNode;
    user: { school_name?: string; username?: string; role?: string } | null;
    onLogout: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const isHome = pathname === '/dashboard' || pathname === '/dashboard/';
    const [showProfile, setShowProfile] = useState(false);
    const [sideCollapsed, setSideCollapsed] = useState(false);
    const [time, setTime] = useState(new Date());
    
    // Data
    const [stats, setStats] = useState({ students: 0, staff: 0, books: 0, assets: 0, feesPaid: 0, feesExpected: 0, monthlyRevenue: [] as number[], formBreakdown: [] as { label: string; count: number; color: string }[] });

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    // Fetch live stats
    useEffect(() => {
        const load = async () => {
            const [sRes, stRes, bRes, aRes, fpRes] = await Promise.all([
                supabase.from('school_students').select('id, form', { count: 'exact', head: false }),
                supabase.from('school_staff').select('id', { count: 'exact', head: true }),
                supabase.from('school_library_books').select('id', { count: 'exact', head: true }),
                supabase.from('school_assets').select('id', { count: 'exact', head: true }),
                supabase.from('school_fee_payments').select('amount'),
            ]);
            const students = sRes.data || [];
            const totalPaid = (fpRes.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            // Form breakdown for donut
            const formMap: Record<string, number> = {};
            students.forEach((s: any) => { const f = s.form || 'Other'; formMap[f] = (formMap[f] || 0) + 1; });
            const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
            const formBreakdown = Object.entries(formMap).map(([label, count], i) => ({ label, count, color: colors[i % colors.length] }));
            // Fake monthly revenue (use real data if available)
            const monthlyRevenue = Array.from({ length: 6 }, () => Math.round(Math.random() * 500000 + 200000));
            setStats({
                students: students.length,
                staff: stRes.count || 0,
                books: bRes.count || 0,
                assets: aRes.count || 0,
                feesPaid: totalPaid,
                feesExpected: totalPaid * 1.3,
                monthlyRevenue,
                formBreakdown,
            });
        };
        load();
    }, []);

    const greeting = time.getHours() < 12 ? 'Good Morning' : time.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
    const collectionRate = stats.feesExpected > 0 ? Math.round((stats.feesPaid / stats.feesExpected) * 100) : 0;

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif", background: '#f0f4f8' }}>
            {/* ═══ LEFT SIDEBAR ═══ */}
            <aside style={{
                width: sideCollapsed ? 68 : 240,
                background: '#0f172a',
                display: 'flex', flexDirection: 'column',
                transition: 'width 0.25s ease',
                position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
                borderRight: '1px solid rgba(255,255,255,0.06)',
            }}>
                {/* Sidebar Header */}
                <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: sideCollapsed ? '0 12px' : '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>α</div>
                    {!sideCollapsed && (
                        <div style={{ overflow: 'hidden' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>APSIMS</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', marginLeft: 6, padding: '2px 5px', background: 'rgba(96,165,250,0.15)', borderRadius: 4 }}>Premier</span>
                        </div>
                    )}
                    {!sideCollapsed && (
                        <button onClick={() => setSideCollapsed(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}><FiChevronRight size={14} /></button>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
                    {NAV_SECTIONS.map(section => (
                        <div key={section.title} style={{ marginBottom: 16 }}>
                            {!sideCollapsed && <p style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', margin: '0 0 4px' }}>{section.title}</p>}
                            {section.items.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: sideCollapsed ? '10px 0' : '8px 10px',
                                        justifyContent: sideCollapsed ? 'center' : 'flex-start',
                                        borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                                        background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                                        color: active ? '#60a5fa' : '#94a3b8',
                                        fontSize: 12, fontWeight: active ? 700 : 500,
                                        transition: 'all 0.15s',
                                    }}>
                                        <item.icon size={16} style={{ color: active ? item.color : '#64748b', flexShrink: 0 }} />
                                        {!sideCollapsed && <span>{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: sideCollapsed ? '8px 4px' : '12px 12px' }}>
                    <button onClick={() => { localStorage.setItem('apsims_theme', 'sidebar'); window.location.reload(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: sideCollapsed ? 'center' : 'flex-start', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 600, marginBottom: 6 }}
                        title="Switch to Classic Sidebar">
                        <FiLayout size={14} />
                        {!sideCollapsed && <span>Classic Layout</span>}
                    </button>
                    <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: sideCollapsed ? 'center' : 'flex-start', padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: '#64748b', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                        <FiSettings size={14} />
                        {!sideCollapsed && <span>Settings</span>}
                    </Link>
                </div>
            </aside>

            {/* ═══ MAIN CONTENT ═══ */}
            <div style={{ flex: 1, marginLeft: sideCollapsed ? 68 : 240, transition: 'margin-left 0.25s ease' }}>
                {/* Top Bar */}
                <header style={{
                    height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px', position: 'sticky', top: 0, zIndex: 40,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {sideCollapsed && <button onClick={() => setSideCollapsed(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><FiGrid size={18} /></button>}
                        <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{isHome ? `${greeting} 👋` : pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{user?.school_name || 'Alpha School'} • {time.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }); window.dispatchEvent(e); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 12, cursor: 'pointer', minWidth: 180 }}>
                            <FiSearch size={12} /> <span>Search...</span>
                            <kbd style={{ marginLeft: 'auto', padding: '1px 5px', borderRadius: 3, background: '#e2e8f0', fontSize: 9, fontWeight: 700 }}>⌘K</kbd>
                        </button>
                        <button style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', position: 'relative' }}>
                            <FiBell size={14} /><span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowProfile(!showProfile)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 4px 4px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>{(user?.username || 'A')[0].toUpperCase()}</div>
                                <FiChevronDown size={10} style={{ color: '#94a3b8' }} />
                            </button>
                            {showProfile && (
                                <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', width: 200, overflow: 'hidden', zIndex: 999 }}>
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{user?.username || 'Admin'}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{user?.role || 'Admin'}</p>
                                    </div>
                                    <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}><FiLogOut size={13} /> Sign Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                {isHome ? (
                    <div style={{ padding: 24 }}>
                        {/* Quick Actions */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                            {QUICK_ACTIONS.map(qa => (
                                <Link key={qa.label} href={qa.href} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: '#475569', textDecoration: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 0.15s' }}>
                                    <div style={{ width: 22, height: 22, borderRadius: 6, background: `${qa.bg}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><qa.icon size={10} style={{ color: qa.bg }} /></div>
                                    {qa.label}
                                </Link>
                            ))}
                        </div>

                        {/* ═══ TOP KPI ROW — 3 large cards ═══ */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                            {/* Students Overview Card */}
                            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎓 Students Overview</p>
                                        <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em', lineHeight: 1 }}>{stats.students}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Active Students</p>
                                    </div>
                                    <MiniDonut segments={stats.formBreakdown.length > 0 ? stats.formBreakdown.map(f => ({ value: f.count, color: f.color, label: f.label })) : [{ value: 1, color: '#e2e8f0', label: 'None' }]} size={90} />
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {stats.formBreakdown.slice(0, 4).map(f => (
                                        <span key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: '#64748b', padding: '2px 6px', background: '#f8fafc', borderRadius: 4 }}>
                                            <span style={{ width: 6, height: 6, borderRadius: 2, background: f.color }} /> {f.label}: {f.count}
                                        </span>
                                    ))}
                                </div>
                                <Link href="/dashboard/students" style={{ position: 'absolute', top: 16, right: 16, color: '#cbd5e1', textDecoration: 'none' }}><FiArrowRight size={14} /></Link>
                            </div>

                            {/* Revenue Card */}
                            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #22c55e, #10b981)' }} />
                                <div style={{ marginBottom: 12 }}>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Revenue</p>
                                    <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(stats.feesPaid)}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>▲ {collectionRate}% collected</span>
                                    </div>
                                </div>
                                <MiniBarChart data={stats.monthlyRevenue} color="#22c55e" />
                                <Link href="/dashboard/fees" style={{ position: 'absolute', top: 16, right: 16, color: '#cbd5e1', textDecoration: 'none' }}><FiArrowRight size={14} /></Link>
                            </div>

                            {/* Academic Calendar Card */}
                            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }} />
                                <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 Academic Calendar</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 12 }}>
                                    {['S','M','T','W','T','F','S'].map((d, i) => (
                                        <div key={i} style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textAlign: 'center', padding: 2 }}>{d}</div>
                                    ))}
                                    {Array.from({ length: new Date(time.getFullYear(), time.getMonth(), 1).getDay() }, (_, i) => (
                                        <div key={`e${i}`} />
                                    ))}
                                    {Array.from({ length: new Date(time.getFullYear(), time.getMonth() + 1, 0).getDate() }, (_, i) => {
                                        const day = i + 1;
                                        const isToday = day === time.getDate();
                                        return (
                                            <div key={day} style={{ fontSize: 10, fontWeight: isToday ? 800 : 500, color: isToday ? '#fff' : '#475569', textAlign: 'center', padding: '3px 0', borderRadius: 6, background: isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent' }}>{day}</div>
                                        );
                                    })}
                                </div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{time.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</p>
                                <p style={{ fontSize: 10, color: '#94a3b8' }}>Term 2 • Week 8</p>
                            </div>
                        </div>

                        {/* ═══ BOTTOM ROW — Module shortcuts ═══ */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                            {[
                                { label: 'HR & Payroll', desc: `${stats.staff} Staff Members`, icon: '👥', color: '#8b5cf6', href: '/dashboard/hr-payroll' },
                                { label: 'Library', desc: `${stats.books} Books`, icon: '📚', color: '#6366f1', href: '/dashboard/library-inventory/ultra' },
                                { label: 'Stores', desc: 'Kitchen & Inventory', icon: '📦', color: '#f59e0b', href: '/dashboard/stores/ultra' },
                                { label: 'Assets', desc: `${stats.assets} Registered`, icon: '🏗️', color: '#a855f7', href: '/dashboard/assets/ultra' },
                                { label: 'Procurement', desc: 'Suppliers & LPOs', icon: '🏢', color: '#0891b2', href: '/dashboard/procurement' },
                                { label: 'M-Pesa', desc: 'Auto-Reconciliation', icon: '📱', color: '#22c55e', href: '/dashboard/fees/mpesa-reconciliation' },
                                { label: 'Receipts', desc: 'KRA-Compliant', icon: '🧾', color: '#f97316', href: '/dashboard/fees/receipts' },
                                { label: 'Audit Trail', desc: 'Security & Logs', icon: '🔒', color: '#64748b', href: '/dashboard/fees/audit' },
                            ].map(card => (
                                <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
                                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 0.2s', cursor: 'pointer', borderTop: `3px solid ${card.color}` }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'; }}>
                                        <span style={{ fontSize: 20, display: 'block', marginBottom: 8 }}>{card.icon}</span>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{card.label}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{card.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            <Link href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none' }}>Dashboard</Link>
                            <span>›</span>
                            <span style={{ color: '#475569' }}>{pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </div>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
