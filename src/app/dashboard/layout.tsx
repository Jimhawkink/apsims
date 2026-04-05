'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FiHome, FiUsers, FiDollarSign, FiFileText, FiUserCheck, FiCreditCard,
    FiTrendingDown, FiTrendingUp, FiBox, FiLogOut, FiMenu, FiX,
    FiChevronLeft, FiChevronRight, FiBell, FiSearch, FiSettings, FiKey, FiCalendar
} from 'react-icons/fi';

interface UserSession {
    id: number;
    username: string;
    full_name: string;
    role: string;
    email: string;
}

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: FiHome, emoji: '📊', perm: 'dashboard' },
    { href: '/dashboard/students', label: 'Students', icon: FiUsers, emoji: '👨‍🎓', perm: 'students' },
    { href: '/dashboard/fees', label: 'Fees & Accounts', icon: FiDollarSign, emoji: '💰', perm: 'fees' },
    { href: '/dashboard/exams', label: 'Exams', icon: FiFileText, emoji: '📝', perm: 'exams' },
    { href: '/dashboard/staff', label: 'Staff', icon: FiUserCheck, emoji: '👨‍🏫', perm: 'staff' },
    { href: '/dashboard/payroll', label: 'Payroll', icon: FiCreditCard, emoji: '💵', perm: 'payroll' },
    { href: '/dashboard/expenses', label: 'Expenses', icon: FiTrendingDown, emoji: '📉', perm: 'expenses' },
    { href: '/dashboard/income', label: 'Income', icon: FiTrendingUp, emoji: '💼', perm: 'income' },
    { href: '/dashboard/assets', label: 'Assets', icon: FiBox, emoji: '🏢', perm: 'assets' },
    { href: '/dashboard/attendance', label: 'Attendance', icon: FiCalendar, emoji: '📋', perm: 'attendance' },
    { href: '/dashboard/settings', label: 'Settings', icon: FiSettings, emoji: '⚙️', perm: 'settings' },
    { href: '/dashboard/users', label: 'Users', icon: FiKey, emoji: '🔑', perm: 'users' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<UserSession | null>(null);
    const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
    const [userRole, setUserRole] = useState('admin');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const prevPathRef = useRef(pathname);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('school_user');
        if (!stored) {
            router.push('/');
            return;
        }
        try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            setUserRole(parsed.role || 'admin');
            setUserPermissions(parsed.permissions || {});
        } catch {
            router.push('/');
        }
    }, [router]);

    // SHA-style loading bar on route change
    useEffect(() => {
        if (prevPathRef.current !== pathname) {
            setPageLoading(true);
            prevPathRef.current = pathname;
            const timer = setTimeout(() => setPageLoading(false), 800);
            return () => clearTimeout(timer);
        }
    }, [pathname]);

    // Filter nav items based on user role and permissions
    const isAdmin = userRole === 'admin' || userRole === 'principal';
    const filteredNavItems = navItems.filter(item => {
        if (isAdmin) return true; // Admin and Principal see everything
        if (item.perm === 'dashboard') return true; // Everyone sees dashboard
        return userPermissions[item.perm] === true;
    });

    const handleLogout = () => {
        localStorage.removeItem('school_user');
        router.push('/');
    };

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    if (!mounted || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="spinner mx-auto mb-3" style={{ borderTopColor: '#3b82f6', borderColor: '#e2e8f0', width: 36, height: 36, borderWidth: 3 }} />
                    <p className="text-gray-500 text-sm">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0f4f8] flex">
            {/* SHA-style thin green loading bar */}
            {pageLoading && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
                    background: 'linear-gradient(90deg, transparent 0%, #22c55e 40%, #4ade80 60%, transparent 100%)',
                    animation: 'loadbar 0.8s ease-in-out',
                }}>
                    <div style={{
                        position: 'absolute', right: 0, top: 0, width: '30%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.6))',
                        animation: 'loadglow 0.8s ease-in-out',
                    }} />
                </div>
            )}
            <style jsx>{`
                @keyframes loadbar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0); }
                }
                @keyframes loadglow {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full z-50 bg-white border-r border-gray-200 shadow-sm
                transition-all duration-300 ease-in-out flex flex-col
                ${sidebarCollapsed ? 'w-[70px]' : 'w-[270px]'}
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'} py-5 border-b border-gray-100`}>
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <span className="text-xl">🏫</span>
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-gray-800" style={{ fontFamily: 'Outfit, sans-serif' }}>AlphaSchool</h1>
                                <p className="text-[10px] text-gray-400 font-medium">Management System</p>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && <span className="text-2xl">🏫</span>}

                    {/* Collapse button (desktop) */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors ml-auto"
                    >
                        {sidebarCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
                    </button>

                    {/* Close button (mobile) */}
                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden ml-auto text-gray-400 hover:text-gray-600">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {filteredNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-200 group
                                ${isActive(item.href)
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }
                                ${sidebarCollapsed ? 'justify-center' : ''}
                            `}
                            title={sidebarCollapsed ? item.label : undefined}
                        >
                            <div className={`
                                flex items-center justify-center w-8 h-8 rounded-lg text-base
                                ${isActive(item.href) ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-gray-200'}
                                transition-colors
                            `}>
                                {item.emoji}
                            </div>
                            {!sidebarCollapsed && <span>{item.label}</span>}
                            {!sidebarCollapsed && isActive(item.href) && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* User section */}
                <div className={`border-t border-gray-100 p-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
                    {!sidebarCollapsed ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow">
                                {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-700 truncate">{user.full_name}</p>
                                <p className="text-[11px] text-gray-400 capitalize">{user.role}</p>
                            </div>
                            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                                <FiLogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleLogout} className="w-full flex justify-center py-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                            <FiLogOut size={18} />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[270px]'}`}>
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 lg:px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
                                <FiMenu size={22} />
                            </button>
                            <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 w-72">
                                <FiSearch className="text-gray-400" size={16} />
                                <input type="text" placeholder="Search anything..." className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder:text-gray-400" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="relative p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                                <FiBell size={18} />
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">3</span>
                            </button>
                            <button className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                                <FiSettings size={18} />
                            </button>
                            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                    {user.full_name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-700">{user.full_name}</p>
                                    <p className="text-[10px] text-gray-400 capitalize">{user.role}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
