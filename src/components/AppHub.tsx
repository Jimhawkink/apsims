'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

// ── All modules ──────────────────────────────────────────────────────────────
const MODULES = [
    // Students
    { href: '/dashboard/students',           icon: '👨‍🎓', label: 'Students',         desc: 'Records & profiles',        color: '#3b82f6', cat: 'Students' },
    { href: '/dashboard/students/admissions',icon: '📋', label: 'Admissions',         desc: 'Enrol new students',        color: '#06b6d4', cat: 'Students' },
    { href: '/dashboard/students/promotion', icon: '⬆️', label: 'Promotion',          desc: 'Year promotion',            color: '#8b5cf6', cat: 'Students' },
    { href: '/dashboard/students/health',    icon: '🏥', label: 'Health Records',     desc: 'Medical & clinic',          color: '#ec4899', cat: 'Students' },
    { href: '/dashboard/students/id-cards',  icon: '🪪', label: 'ID Cards',           desc: 'Print student IDs',         color: '#64748b', cat: 'Students' },
    { href: '/dashboard/discipline',         icon: '⚖️', label: 'Discipline',         desc: 'Cases & punishments',       color: '#f43f5e', cat: 'Students' },
    // Finance
    { href: '/dashboard/fees/collect',       icon: '💰', label: 'Fee Collection',     desc: 'Collect school fees',       color: '#10b981', cat: 'Finance' },
    { href: '/dashboard/fees',               icon: '📊', label: 'Fees Overview',      desc: 'Summary & analytics',       color: '#059669', cat: 'Finance' },
    { href: '/dashboard/fees/outstanding',   icon: '⚠️', label: 'Outstanding Fees',  desc: 'Defaulter list',            color: '#f59e0b', cat: 'Finance' },
    { href: '/dashboard/fees/mpesa-reconciliation', icon: '📱', label: 'M-Pesa',      desc: 'Auto-reconcile payments',   color: '#22c55e', cat: 'Finance' },
    { href: '/dashboard/expenses',           icon: '📉', label: 'Expenses',           desc: 'Track school expenses',     color: '#ef4444', cat: 'Finance' },
    { href: '/dashboard/income',             icon: '📈', label: 'Income',             desc: 'Revenue tracking',          color: '#16a34a', cat: 'Finance' },
    // Academics
    { href: '/dashboard/exams/marks',        icon: '📝', label: 'Enter Marks',        desc: 'Exam marks entry',          color: '#8b5cf6', cat: 'Academics' },
    { href: '/dashboard/exams/report-cards', icon: '📄', label: 'Report Cards',       desc: 'Generate & print',          color: '#7c3aed', cat: 'Academics' },
    { href: '/dashboard/exams/merit-list',   icon: '🏆', label: 'Merit List',         desc: 'Class rankings',            color: '#d97706', cat: 'Academics' },
    { href: '/dashboard/schemes',            icon: '📚', label: 'Schemes of Work',    desc: 'Lesson planning',           color: '#0891b2', cat: 'Academics' },
    { href: '/dashboard/timetable',          icon: '📅', label: 'Timetable',          desc: 'Class scheduling',          color: '#0284c7', cat: 'Academics' },
    { href: '/dashboard/learning',           icon: '🎬', label: 'Learning Videos',    desc: 'KICD curriculum videos',    color: '#7c3aed', cat: 'Academics' },
    // HR
    { href: '/dashboard/staff',              icon: '👥', label: 'Staff',              desc: 'Teacher & staff records',   color: '#0ea5e9', cat: 'HR & Payroll' },
    { href: '/dashboard/hr-payroll/payroll', icon: '💵', label: 'Payroll',            desc: 'Staff salaries',            color: '#2563eb', cat: 'HR & Payroll' },
    // Communication
    { href: '/dashboard/fees/bulk-reminders',icon: '📣', label: 'Bulk SMS',          desc: 'Fee reminders campaign',    color: '#db2777', cat: 'Communication' },
    { href: '/dashboard/ptm',                icon: '🤝', label: 'Parent Meetings',    desc: 'PTM scheduling',            color: '#7c3aed', cat: 'Communication' },
    // Administration
    { href: '/dashboard/library-inventory',  icon: '📖', label: 'Library',            desc: 'Books & checkout',          color: '#78350f', cat: 'Administration' },
    { href: '/dashboard/hostel',             icon: '🏠', label: 'Hostel',             desc: 'Boarding management',       color: '#6d28d9', cat: 'Administration' },
    { href: '/dashboard/transport',          icon: '🚌', label: 'Transport',          desc: 'Bus routes & passes',       color: '#b45309', cat: 'Administration' },
    { href: '/dashboard/reports',            icon: '📊', label: 'Reports',            desc: 'All school reports',        color: '#475569', cat: 'Administration' },
    { href: '/dashboard/settings',           icon: '⚙️', label: 'Settings',           desc: 'System configuration',      color: '#64748b', cat: 'Administration' },
];

const CATS = ['Students', 'Finance', 'Academics', 'HR & Payroll', 'Communication', 'Administration'];

// ── Light Soft Gradients Theme ────────────────────────────────────────────────
function LightSoftHub({ stats }: { stats: any }) {
    const [search, setSearch] = useState('');
    const filtered = search
        ? MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()))
        : MODULES;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fdf4ff 0%,#f0f9ff 50%,#fef9ee 100%)', paddingBottom: 100 }}>

            {/* ── Header ── */}
            <div style={{
                background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🎓 APSIMS
                    </h1>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{dateStr} · {timeStr}</p>
                </div>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search modules… (Ctrl+K)"
                        style={{
                            width: '100%', padding: '10px 16px 10px 40px',
                            borderRadius: 12, border: '1.5px solid #e2e8f0',
                            background: 'rgba(255,255,255,0.9)', fontSize: 13,
                            outline: 'none', boxSizing: 'border-box',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                    />
                    <kbd style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6,
                        padding: '2px 6px', fontSize: 10, color: '#94a3b8', fontFamily: 'monospace',
                    }}>Ctrl K</kbd>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                        {stats.userName || 'Admin'}
                    </span>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 }}>
                        {(stats.userName || 'A')[0]}
                    </div>
                </div>
            </div>

            <div style={{ padding: '32px 32px 0' }}>
                {/* ── KPI Strip ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 40 }}>
                    {[
                        { label: 'Total Students', value: stats.students || '…', icon: '👨‍🎓', from: '#ede9fe', to: '#dbeafe', border: '#c4b5fd' },
                        { label: 'Fees Collected', value: stats.fees || '…', icon: '💰', from: '#dcfce7', to: '#d1fae5', border: '#86efac' },
                        { label: 'Staff Members', value: stats.staff || '…', icon: '👥', from: '#fce7f3', to: '#fdf4ff', border: '#f9a8d4' },
                        { label: 'Active Exams', value: stats.exams || '0', icon: '📝', from: '#fef3c7', to: '#fef9c3', border: '#fde68a' },
                    ].map(k => (
                        <div key={k.label} style={{
                            background: `linear-gradient(135deg,${k.from},${k.to})`,
                            border: `1.5px solid ${k.border}`, borderRadius: 20,
                            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        }}>
                            <span style={{ fontSize: 32 }}>{k.icon}</span>
                            <div>
                                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#1e293b' }}>{k.value}</p>
                                <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>{k.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Module Grid by Category ── */}
                {search ? (
                    <div>
                        <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 16 }}>
                            {filtered.length} results for "{search}"
                        </p>
                        <ModuleGrid modules={filtered} />
                    </div>
                ) : (
                    CATS.map(cat => {
                        const mods = MODULES.filter(m => m.cat === cat);
                        return (
                            <div key={cat} style={{ marginBottom: 40 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {cat}
                                    </h2>
                                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,#e2e8f0,transparent)' }} />
                                </div>
                                <ModuleGrid modules={mods} />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function ModuleGrid({ modules }: { modules: typeof MODULES }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {modules.map(m => (
                <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
                            border: `1.5px solid ${m.color}30`,
                            borderRadius: 18, padding: '18px 20px',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                            position: 'relative', overflow: 'hidden',
                        }}
                        onMouseEnter={e => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'translateY(-4px)';
                            el.style.boxShadow = `0 12px 32px ${m.color}22`;
                            el.style.borderColor = `${m.color}60`;
                        }}
                        onMouseLeave={e => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'translateY(0)';
                            el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
                            el.style.borderColor = `${m.color}30`;
                        }}
                    >
                        {/* Soft gradient bg blob */}
                        <div style={{
                            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                            borderRadius: '50%', background: `${m.color}15`, pointerEvents: 'none',
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: `linear-gradient(135deg,${m.color}22,${m.color}11)`,
                                border: `1px solid ${m.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                                flexShrink: 0,
                            }}>
                                {m.icon}
                            </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{m.label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{m.desc}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

// ── Full System / Dark Glassmorphism Theme ─────────────────────────────────────
function FullSystemHub({ stats }: { stats: any }) {
    const [search, setSearch] = useState('');
    const filtered = search
        ? MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()))
        : MODULES;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0f1e 0%,#0f172a 40%,#1e1b4b 100%)', paddingBottom: 120 }}>
            {/* Particle dots bg */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.04,
                backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)',
                backgroundSize: '28px 28px' }} />

            {/* ── Header ── */}
            <div style={{
                background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, background: 'linear-gradient(135deg,#818cf8,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🎓 APSIMS
                    </h1>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{timeStr} — Kenya Curriculum System</p>
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search anything… (Ctrl+K)"
                        style={{
                            width: '100%', padding: '9px 16px 9px 38px',
                            borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.07)', fontSize: 13, color: '#fff',
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                    <kbd style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 6, padding: '2px 6px', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace',
                    }}>Ctrl K</kbd>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#818cf8,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13 }}>
                        {(stats.userName || 'A')[0]}
                    </div>
                </div>
            </div>

            <div style={{ padding: '28px 32px 0' }}>
                {/* ── KPI Strip ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 36 }}>
                    {[
                        { label: 'Students', value: stats.students || '…', icon: '👨‍🎓', color: '#3b82f6' },
                        { label: 'Fees Collected', value: stats.fees || '…', icon: '💰', color: '#10b981' },
                        { label: 'Staff', value: stats.staff || '…', icon: '👥', color: '#8b5cf6' },
                        { label: 'Active Exams', value: stats.exams || '0', icon: '📝', color: '#f59e0b' },
                    ].map(k => (
                        <div key={k.label} style={{
                            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
                            border: `1px solid ${k.color}30`, borderRadius: 18,
                            padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
                            boxShadow: `0 4px 24px ${k.color}15`,
                        }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: `1px solid ${k.color}30`, flexShrink: 0 }}>
                                {k.icon}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>{k.value}</p>
                                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{k.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Module Grid ── */}
                {search ? (
                    <div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 16 }}>
                            {filtered.length} results for "{search}"
                        </p>
                        <DarkModuleGrid modules={filtered} />
                    </div>
                ) : (
                    CATS.map(cat => {
                        const mods = MODULES.filter(m => m.cat === cat);
                        return (
                            <div key={cat} style={{ marginBottom: 36 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <h2 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2 }}>
                                        {cat}
                                    </h2>
                                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(255,255,255,0.1),transparent)' }} />
                                </div>
                                <DarkModuleGrid modules={mods} />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function DarkModuleGrid({ modules }: { modules: typeof MODULES }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
            {modules.map(m => (
                <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
                            border: `1px solid ${m.color}25`,
                            borderRadius: 18, padding: '18px 20px',
                            cursor: 'pointer', transition: 'all 0.2s',
                            position: 'relative', overflow: 'hidden',
                        }}
                        onMouseEnter={e => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'translateY(-4px)';
                            el.style.background = `rgba(255,255,255,0.08)`;
                            el.style.boxShadow = `0 12px 40px ${m.color}20`;
                            el.style.borderColor = `${m.color}50`;
                        }}
                        onMouseLeave={e => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'translateY(0)';
                            el.style.background = 'rgba(255,255,255,0.04)';
                            el.style.boxShadow = 'none';
                            el.style.borderColor = `${m.color}25`;
                        }}
                    >
                        <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: `${m.color}12`, pointerEvents: 'none' }} />
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${m.color}18`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
                            {m.icon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>{m.label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{m.desc}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function AppHub() {
    const { theme } = useTheme();
    const [stats, setStats] = useState({ students: '…', fees: '…', staff: '…', exams: '0', userName: 'Admin' });

    useEffect(() => {
        // Load user
        const u = localStorage.getItem('user_session');
        if (u) { try { const p = JSON.parse(u); setStats(s => ({ ...s, userName: p.full_name || p.username || 'Admin' })); } catch {} }

        // Load stats from Supabase
        Promise.all([
            supabase.from('students').select('id', { count: 'exact', head: true }),
            supabase.from('school_staff').select('id', { count: 'exact', head: true }),
        ]).then(([students, staff]) => {
            setStats(s => ({
                ...s,
                students: String(students.count ?? '…'),
                staff: String(staff.count ?? '…'),
            }));
        });
    }, []);

    if (theme === 'light-soft') return <LightSoftHub stats={stats} />;
    if (theme === 'full-system') return <FullSystemHub stats={stats} />;

    // Default theme — return null (original dashboard renders)
    return null;
}
