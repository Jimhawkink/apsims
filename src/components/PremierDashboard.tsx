'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FiHome, FiUsers, FiDollarSign, FiBookOpen, FiBox, FiTruck,
    FiBarChart2, FiSettings, FiSearch, FiBell, FiUser, FiLogOut,
    FiMenu, FiGrid, FiCalendar, FiFileText, FiUserCheck, FiCreditCard,
    FiShield, FiLayers, FiTrendingUp, FiChevronDown, FiCommand,
    FiClock, FiZap, FiPieChart, FiStar, FiArrowRight, FiLayout
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

// ── Module definitions with colors and routes ──
const MODULES = [
    { id: 'students', label: 'Students & Admissions', desc: 'Manage student records & enrollment', icon: FiUsers, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', href: '/dashboard/students', stat: 'Students', emoji: '🎓' },
    { id: 'fees', label: 'Finance & Fees', desc: 'Fee collection, M-Pesa, receipts', icon: FiDollarSign, color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', href: '/dashboard/fees', stat: 'Revenue', emoji: '💰' },
    { id: 'hr', label: 'HR & Payroll', desc: 'Staff management, PAYE, NSSF Tier I/II', icon: FiUserCheck, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', href: '/dashboard/hr-payroll', stat: 'Staff', emoji: '👥' },
    { id: 'exams', label: 'Exams & Results', desc: 'Exam entry, analysis & report cards', icon: FiFileText, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', href: '/dashboard/exams', stat: 'Exams', emoji: '📝' },
    { id: 'library', label: 'Ultra Library', desc: 'Catalog, barcode scan, issue/return', icon: FiBookOpen, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', href: '/dashboard/library-inventory/ultra', stat: 'Books', emoji: '📚' },
    { id: 'stores', label: 'Stores & Kitchen', desc: 'Inventory, GRN, issuances, kitchen', icon: FiBox, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', href: '/dashboard/stores/ultra', stat: 'Items', emoji: '📦' },
    { id: 'assets', label: 'Asset Management', desc: 'Register, depreciation, maintenance', icon: FiBox, color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #9333ea)', href: '/dashboard/assets/ultra', stat: 'Assets', emoji: '🏗️' },
    { id: 'procurement', label: 'Procurement', desc: 'Suppliers, LPOs, invoices', icon: FiTruck, color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #0e7490)', href: '/dashboard/procurement', stat: 'Suppliers', emoji: '🏢' },
    { id: 'analytics', label: 'Financial Analytics', desc: 'Revenue intelligence & forecasting', icon: FiTrendingUp, color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', href: '/dashboard/fees/analytics', stat: 'Analytics', emoji: '📊' },
    { id: 'reports', label: 'Report Cards', desc: 'Generate & print report cards', icon: FiLayers, color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', href: '/dashboard/report-cards', stat: 'Reports', emoji: '📄' },
    { id: 'timetable', label: 'Timetable', desc: 'Class scheduling & lessons', icon: FiCalendar, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ea580c)', href: '/dashboard/timetable', stat: 'Schedule', emoji: '📅' },
    { id: 'settings', label: 'Settings', desc: 'System configuration & setup', icon: FiSettings, color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)', href: '/dashboard/settings', stat: 'Config', emoji: '⚙️' },
];

const QUICK_ACTIONS = [
    { label: 'Add Student', icon: FiUsers, color: '#10b981', href: '/dashboard/students' },
    { label: 'Collect Fee', icon: FiCreditCard, color: '#22c55e', href: '/dashboard/fees' },
    { label: 'Run Payroll', icon: FiDollarSign, color: '#8b5cf6', href: '/dashboard/hr-payroll/payroll' },
    { label: 'Issue Book', icon: FiBookOpen, color: '#6366f1', href: '/dashboard/library-inventory/ultra' },
    { label: 'Record Exam', icon: FiFileText, color: '#ef4444', href: '/dashboard/exams' },
    { label: 'Receive Stock', icon: FiBox, color: '#f59e0b', href: '/dashboard/stores/ultra' },
];

export default function PremierDashboard({ children, user, onLogout }: {
    children: React.ReactNode;
    user: { school_name?: string; username?: string; role?: string } | null;
    onLogout: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const isHome = pathname === '/dashboard' || pathname === '/dashboard/';
    const [showProfile, setShowProfile] = useState(false);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const greeting = time.getHours() < 12 ? 'Good Morning' : time.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* ═══ TOP NAVIGATION BAR ═══ */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
                    {/* Left: Logo + Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 }}>α</div>
                            <div>
                                <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>APSIMS</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', marginLeft: 6, padding: '2px 6px', background: '#eff6ff', borderRadius: 4 }}>Premier</span>
                            </div>
                        </Link>

                        {/* Nav Links */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 20 }}>
                            {[
                                { label: 'Dashboard', href: '/dashboard', icon: FiHome },
                                { label: 'Students', href: '/dashboard/students', icon: FiUsers },
                                { label: 'Finance', href: '/dashboard/fees', icon: FiDollarSign },
                                { label: 'HR', href: '/dashboard/hr-payroll', icon: FiUserCheck },
                                { label: 'Exams', href: '/dashboard/exams', icon: FiFileText },
                            ].map(link => {
                                const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                                return (
                                    <Link key={link.href} href={link.href} style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
                                        fontSize: 12, fontWeight: 600,
                                        color: active ? '#3b82f6' : '#64748b',
                                        background: active ? '#eff6ff' : 'transparent',
                                        transition: 'all 0.15s',
                                    }}>
                                        <link.icon size={13} /> {link.label}
                                    </Link>
                                );
                            })}
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => {}} style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    fontSize: 12, fontWeight: 600, color: '#64748b', background: 'transparent',
                                }}>
                                    <FiGrid size={13} /> More <FiChevronDown size={10} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Search + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Search trigger */}
                        <button onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }); window.dispatchEvent(e); }} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 14px', borderRadius: 10,
                            background: '#f1f5f9', border: '1px solid #e2e8f0',
                            color: '#94a3b8', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            transition: 'all 0.15s', minWidth: 200,
                        }}>
                            <FiSearch size={13} />
                            <span>Search...</span>
                            <kbd style={{ marginLeft: 'auto', padding: '1px 5px', borderRadius: 4, background: '#e2e8f0', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>Ctrl+K</kbd>
                        </button>

                        {/* Theme Switch */}
                        <button onClick={() => { localStorage.setItem('apsims_theme', 'sidebar'); window.location.reload(); }}
                            title="Switch to Sidebar Layout"
                            style={{
                                width: 34, height: 34, borderRadius: 10,
                                background: '#f1f5f9', border: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#64748b', cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                            <FiLayout size={14} />
                        </button>

                        {/* Notifications */}
                        <button style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: '#f1f5f9', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#64748b', cursor: 'pointer', position: 'relative',
                        }}>
                            <FiBell size={14} />
                            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />
                        </button>

                        {/* Profile */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowProfile(!showProfile)} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '4px 8px 4px 4px', borderRadius: 10,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                            }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: 12, fontWeight: 800,
                                }}>{(user?.username || 'A')[0].toUpperCase()}</div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{user?.username || 'Admin'}</p>
                                    <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{user?.role || 'Administrator'}</p>
                                </div>
                                <FiChevronDown size={10} style={{ color: '#94a3b8' }} />
                            </button>
                            {showProfile && (
                                <div style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                                    background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                                    boxShadow: '0 16px 48px rgba(0,0,0,0.12)', width: 200, overflow: 'hidden', zIndex: 999,
                                }}>
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{user?.school_name || 'Alpha School'}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{user?.role}</p>
                                    </div>
                                    <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none' }}><FiSettings size={13} /> Settings</Link>
                                    <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}><FiLogOut size={13} /> Sign Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══ CONTENT ═══ */}
            {isHome ? (
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
                    {/* Welcome Header */}
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                            {greeting}, {user?.username || 'Admin'} 👋
                        </h1>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
                            {user?.school_name || 'Alpha School'} • {time.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    {/* Quick Actions Bar */}
                    <div style={{
                        display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4,
                    }}>
                        {QUICK_ACTIONS.map(qa => (
                            <Link key={qa.label} href={qa.href} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 10,
                                background: '#fff', border: '1px solid #e2e8f0',
                                fontSize: 11, fontWeight: 700, color: '#475569',
                                textDecoration: 'none', whiteSpace: 'nowrap',
                                transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${qa.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <qa.icon size={11} style={{ color: qa.color }} />
                                </div>
                                {qa.label}
                            </Link>
                        ))}
                    </div>

                    {/* ═══ BENTO GRID ═══ */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 16,
                    }}>
                        {MODULES.map((mod, i) => (
                            <Link key={mod.id} href={mod.href} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#fff',
                                    borderRadius: 16,
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    position: 'relative',
                                }}
                                    onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)'; el.style.borderColor = mod.color + '40'; }}
                                    onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; el.style.borderColor = '#e2e8f0'; }}
                                >
                                    {/* Color accent bar */}
                                    <div style={{ height: 3, background: mod.gradient }} />
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 12,
                                                background: `${mod.color}10`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 20,
                                            }}>{mod.emoji}</div>
                                            <FiArrowRight size={14} style={{ color: '#cbd5e1', marginTop: 4 }} />
                                        </div>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{mod.label}</h3>
                                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{mod.desc}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px' }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        <Link href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none' }}>Dashboard</Link>
                        <span>›</span>
                        <span style={{ color: '#475569' }}>{pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </div>
                    {children}
                </div>
            )}
        </div>
    );
}
