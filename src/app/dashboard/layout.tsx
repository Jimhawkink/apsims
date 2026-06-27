'use client';

import { useState, useEffect, useRef } from 'react';
import { usePageIcon } from '@/lib/usePageIcon';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FiHome, FiUsers, FiDollarSign, FiFileText, FiUserCheck, FiCreditCard,
    FiTrendingDown, FiTrendingUp, FiBox, FiLogOut, FiMenu, FiX,
    FiChevronLeft, FiChevronRight, FiChevronDown, FiBell, FiSearch, 
    FiSettings, FiKey, FiCalendar, FiExternalLink, FiBookOpen, FiCopy, 
    FiShield, FiGrid, FiBriefcase, FiMessageSquare, FiPieChart, FiClock, FiAlertCircle, FiZap,
    FiHeart, FiGlobe, FiSend, FiSmartphone, FiLayers, FiBarChart2, FiHardDrive,
    FiWifi, FiWifiOff, FiTruck, FiAward
} from 'react-icons/fi';
import OfflineBanner from '@/components/pwa/OfflineBanner';
import CommandPalette from '@/components/CommandPalette';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LayoutThemeExtras, { ThemeSwitcher } from '@/components/LayoutThemeExtras';
import PremierDashboard from '@/components/PremierDashboard';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import QuickActionsButton from '@/components/QuickActionsButton';
import { useOffline } from '@/hooks/useOffline';
import RealtimeProvider from '@/components/RealtimeProvider';

interface UserSession {
    id: number;
    username: string;
    full_name: string;
    role: string;
    email: string;
}

// Structured Menu configuration
const menuGroups = [
    {
        label: "", 
        collapsible: false,
        name: 'main',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: FiHome, perm: 'dashboard' },
        ]
    },
    {
        label: "Student Information",
        icon: FiUsers,
        name: 'students',
        collapsible: true,
        items: [
            { href: '/dashboard/students', label: 'Students List', icon: FiUsers, perm: 'students' },
            { href: '/dashboard/students/profile', label: 'Student Profiles', icon: FiFileText, perm: 'students' },
            { href: '/dashboard/students/admissions', label: 'Admissions', icon: FiUserCheck, perm: 'students' },
            { href: '/dashboard/students/promotion', label: 'Promotion', icon: FiTrendingUp, perm: 'students' },
            { href: '/dashboard/students/id-cards', label: 'ID Cards', icon: FiCreditCard, perm: 'students' },
            { href: '/dashboard/discipline', label: 'Discipline', icon: FiShield, perm: 'discipline' },
            { href: '/dashboard/leave-out', label: 'Leave Out', icon: FiExternalLink, perm: 'leave-out' },
            { href: '/dashboard/students/health', label: 'Health Records', icon: FiHeart, perm: 'students' },
        ]
    },
    {
        label: "Academics",
        icon: FiBookOpen,
        name: 'academics',
        collapsible: true,
        items: [
            { href: '/dashboard/curriculum', label: 'Ultra Academics Hub', icon: FiBookOpen, perm: 'curriculum' },
            { href: '/dashboard/curriculum/cbc-tracking', label: 'CBC Tracking', icon: FiTrendingUp, perm: 'curriculum' },
            { href: '/dashboard/curriculum/cbc-assessment', label: 'CBC Assessment', icon: FiFileText, perm: 'curriculum' },
            { href: '/dashboard/curriculum/kicd-alignment', label: '🏅 KICD Alignment & Badges', icon: FiAward, perm: 'curriculum' },
            { href: '/dashboard/schemes', label: 'Schemes of Work', icon: FiLayers, perm: 'curriculum' },
            { href: '/dashboard/subjects', label: 'Subjects', icon: FiFileText, perm: 'subjects' },
            { href: '/dashboard/timetable', label: 'Timetable', icon: FiGrid, perm: 'timetable' },
            { href: '/dashboard/exams', label: 'Exam Dashboard', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/marks', label: 'Mark Entry', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/broadsheet', label: 'Broadsheet', icon: FiGrid, perm: 'exams' },
            { href: '/dashboard/exams/merit-list', label: 'Merit List', icon: FiTrendingUp, perm: 'exams' },
            { href: '/dashboard/exams/report-cards', label: 'Report Cards', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/digital-delivery', label: '📤 Digital Report Delivery', icon: FiSend, perm: 'exams' },
            { href: '/dashboard/exams/ai-insights', label: '🤖 AI Performance Chatbot', icon: FiZap, perm: 'exams' },
            { href: '/dashboard/exams/analysis', label: 'Performance Analysis', icon: FiPieChart, perm: 'exams' },
            { href: '/dashboard/exams/manage', label: 'Exam Manager', icon: FiSettings, perm: 'exams' },
            { href: '/dashboard/exams/question-bank', label: 'Question Bank', icon: FiCopy, perm: 'exams' },
            { href: '/dashboard/exams/paper-generator', label: 'Paper Generator', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/ai-generate', label: 'AI Question Gen', icon: FiZap, perm: 'exams' },
            { href: '/dashboard/exams/weighted', label: 'Weighted Exam Config', icon: FiSettings, perm: 'exams' },
            { href: '/dashboard/exams/ultra-report-cards', label: 'Ultra Report Cards', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/detailed-analysis', label: 'Detailed Analysis', icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/exams/cbc-marks', label: 'CBC Mark Entry', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/cbc-report-cards', label: 'CBC Report Cards', icon: FiFileText, perm: 'exams' },
            { href: '/dashboard/exams/cbc-reports', label: '📊 CBC Reports Hub', icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/students/subject-combinations', label: 'CBC Subject Combos', icon: FiGrid, perm: 'students' },
            { href: '/dashboard/remedial', label: 'Remedial Programs', icon: FiTrendingUp, perm: 'remedial' },
            { href: '/dashboard/exams/kcse-prediction', label: '🎯 KCSE/KCPE Prediction', icon: FiBarChart2, perm: 'exams' },
        ]
    },
    {
        label: "🏆 Exam Analytics",
        icon: FiBarChart2,
        name: 'exam-analytics',
        collapsible: true,
        items: [
            { href: '/dashboard/exams/analytics-hub',        label: '📊 Analytics Command Center', icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/exams/executive-dashboard',  label: '🏛️ Executive Dashboard',      icon: FiPieChart,  perm: 'exams' },
            { href: '/dashboard/exams/ai-insights',          label: '🤖 AI Insights Engine',       icon: FiZap,       perm: 'exams' },
            { href: '/dashboard/exams/grade-heatmap',        label: '🌡️ Grade Heatmap',            icon: FiGrid,      perm: 'exams' },
            { href: '/dashboard/exams/student-trajectory',   label: '📈 Student Trajectory',       icon: FiTrendingUp, perm: 'exams' },
            { href: '/dashboard/exams/national-readiness',   label: '🇰🇪 KCSE Readiness',          icon: FiAward,     perm: 'exams' },
            { href: '/dashboard/exams/value-added',          label: '➕ Value-Added Analysis',     icon: FiTrendingUp, perm: 'exams' },
            { href: '/dashboard/exams/teacher-correlation',  label: '👩‍🏫 Teacher Analytics',       icon: FiUsers,     perm: 'exams' },
            { href: '/dashboard/exams/stream-battle',        label: '⚡ Stream Battle',            icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/exams/grade-distribution',   label: '🔔 Grade Distribution',       icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/exams/intervention-engine',  label: '🚨 Intervention Engine',      icon: FiAlertCircle, perm: 'exams' },
            { href: '/dashboard/exams/exam-integrity',       label: '🛡️ Exam Integrity',           icon: FiShield,    perm: 'exams' },
            { href: '/dashboard/exams/term-trend',           label: '📆 Multi-Term Trend',         icon: FiTrendingUp, perm: 'exams' },
            { href: '/dashboard/exams/subject-difficulty',   label: '📊 Subject Difficulty',       icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/exams/peer-comparison',      label: '👥 Peer Comparison',          icon: FiUsers,     perm: 'exams' },
            { href: '/dashboard/exams/school-ranking',       label: '🎖️ School Rankings',          icon: FiAward,     perm: 'exams' },
            { href: '/dashboard/exams/cbc-reports/competency-wheel', label: '☯️ CBC Competency Wheel', icon: FiGrid, perm: 'exams' },
            { href: '/dashboard/exams/cbc-reports/pathway-engine',   label: '🛤️ CBC Pathway Engine',  icon: FiTrendingUp, perm: 'exams' },
            { href: '/dashboard/exams/cbc-reports/rubric-analytics', label: '📏 CBC Rubric Analytics', icon: FiBarChart2, perm: 'exams' },
        ]
    },
    {
        label: "Attendance & Leave",
        icon: FiCalendar,
        name: 'attendance',
        collapsible: true,
        items: [
            { href: '/dashboard/attendance', label: 'Student Attendance', icon: FiCalendar, perm: 'attendance' },
            { href: '/dashboard/attendance/staff', label: 'Staff Attendance', icon: FiUserCheck, perm: 'attendance' },
            { href: '/dashboard/attendance/biometric', label: '🔬 Biometric Attendance', icon: FiShield, perm: 'attendance' },
        ]
    },
    {
        label: "HR & Payroll",
        icon: FiBriefcase,
        name: 'hr',
        collapsible: true,
        items: [
            { href: '/dashboard/hr-payroll', label: 'Overview', icon: FiBriefcase, perm: 'payroll' },
            { href: '/dashboard/hr-payroll/staff', label: 'Staff Directory', icon: FiUserCheck, perm: 'staff' },
            { href: '/dashboard/hr-payroll/payroll', label: 'Run Payroll', icon: FiCreditCard, perm: 'payroll' },
            { href: '/dashboard/staff/salary-slips', label: '💰 Salary Slips / Payslips', icon: FiCreditCard, perm: 'payroll' },
        ]
    },
    {
        label: "Finance",
        icon: FiDollarSign,
        name: 'finance',
        collapsible: true,
        items: [
            { href: '/dashboard/fees', label: 'Fee Dashboard', icon: FiPieChart, perm: 'fees' },
            { href: '/dashboard/fees/collect', label: 'Collect Fee', icon: FiCreditCard, perm: 'fees' },
            { href: '/dashboard/fees/outstanding', label: 'Outstanding Fees', icon: FiUsers, perm: 'fees' },
            { href: '/dashboard/fees/payments', label: 'Payment History', icon: FiFileText, perm: 'fees' },
            { href: '/dashboard/fees/structure', label: 'Fee Structure', icon: FiGrid, perm: 'fees' },
            { href: '/dashboard/fees/statements', label: 'Fee Statements', icon: FiFileText, perm: 'fees' },
            { href: '/dashboard/fees/payment-plans', label: '📅 Payment Plans & Pledges', icon: FiCalendar, perm: 'fees' },
            { href: '/dashboard/fees/demand-letters', label: '📨 Auto Demand Letters', icon: FiSend, perm: 'fees' },
            { href: '/dashboard/fees/combined-sms', label: 'Fee+Results SMS', icon: FiMessageSquare, perm: 'fees' },
            { href: '/dashboard/fees/structure-improvements', label: 'Fee Structure & Waivers', icon: FiDollarSign, perm: 'fees' },
            { href: '/dashboard/fees/invoices-demand', label: 'Invoices & Demand Letters', icon: FiFileText, perm: 'fees' },
            { href: '/dashboard/budget', label: 'Budget vs Actual', icon: FiBarChart2, perm: 'fees' },
            { href: '/dashboard/bursary', label: 'HELB & Bursary', icon: FiUsers, perm: 'fees' },
            { href: '/dashboard/capitation', label: 'Capitation Grants', icon: FiLayers, perm: 'fees' },
            { href: '/dashboard/etims', label: 'KRA eTIMS', icon: FiShield, perm: 'fees' },
            { href: '/dashboard/bank-reconciliation', label: 'Bank Reconciliation', icon: FiCreditCard, perm: 'fees' },
            { href: '/dashboard/expenses', label: '📉 Expenses (Ultra)', icon: FiTrendingDown, perm: 'expenses' },
            { href: '/dashboard/income', label: '📈 Income (Ultra)', icon: FiTrendingUp, perm: 'income' },
            { href: '/dashboard/fees/bulk-reminders', label: '📱 Bulk SMS/WA Reminders', icon: FiSend, perm: 'fees' },
            { href: '/dashboard/fees/reports/pl', label: '📊 P&L Report', icon: FiBarChart2, perm: 'fees' },
            { href: '/dashboard/payments/integration', label: 'Payment Integration', icon: FiSmartphone, perm: 'fees' },
            { href: '/dashboard/fees/analytics', label: '📊 Financial Analytics', icon: FiBarChart2, perm: 'fees' },
            { href: '/dashboard/fees/mpesa-reconciliation', label: '💳 M-Pesa Reconciliation', icon: FiCreditCard, perm: 'fees' },
            { href: '/dashboard/fees/receipt', label: '🧾 Pro Receipts & PDF', icon: FiFileText, perm: 'fees' },
            { href: '/dashboard/fees/plans-scholarships', label: '💰 Plans & Scholarships', icon: FiCalendar, perm: 'fees' },
            { href: '/dashboard/fees/audit', label: '🔒 Fee Audit Trail', icon: FiShield, perm: 'fees' },
            { href: '/dashboard/payments/integration', label: '📲 M-Pesa STK Push', icon: FiSmartphone, perm: 'fees' },
        ]
    },
    {
        label: "Stores & Library",
        icon: FiBox,
        name: 'stores',
        collapsible: true,
        items: [
            { href: '/dashboard/library-inventory', label: 'Library Dashboard', icon: FiBookOpen, perm: 'library' },
            { href: '/dashboard/library-inventory/catalog', label: 'Book Catalog', icon: FiBookOpen, perm: 'library' },
            { href: '/dashboard/library-inventory/checkout', label: 'Issue & Return', icon: FiClock, perm: 'library' },
            { href: '/dashboard/library-inventory/overdue', label: 'Overdue Books', icon: FiAlertCircle, perm: 'library' },
            { href: '/dashboard/library-inventory/ultra', label: '📚 Ultra Library', icon: FiBookOpen, perm: 'library' },
            { href: '/dashboard/assets', label: 'Assets Register', icon: FiBox, perm: 'assets' },
            { href: '/dashboard/assets/ultra', label: '🏗️ Ultra Asset Manager', icon: FiBox, perm: 'assets' },
            { href: '/dashboard/stores', label: 'Store Items', icon: FiCopy, perm: 'stores' },
            { href: '/dashboard/stores/ultra', label: '📦 Ultra Stores & Kitchen', icon: FiBox, perm: 'stores' },
            { href: '/dashboard/procurement', label: '🏢 Procurement & Suppliers', icon: FiTruck, perm: 'expenses' },
            { href: '/dashboard/rim-paper', label: 'Rim Paper', icon: FiCopy, perm: 'rim-paper' },
        ]
    },
    {
        label: "Cutting-Edge Features",
        icon: FiZap,
        name: 'cutting-edge',
        collapsible: true,
        items: [
            { href: '/dashboard/students/clinic', label: 'Clinic / Sick Bay', icon: FiHeart, perm: 'students' },
            { href: '/dashboard/visitors', label: 'Visitor Management', icon: FiUsers, perm: 'students' },
            { href: '/dashboard/students/bus-passes', label: 'Bus Pass Cards', icon: FiSmartphone, perm: 'students' },
            { href: '/dashboard/students/alumni', label: 'Alumni Tracking', icon: FiUsers, perm: 'students' },
            { href: '/dashboard/academic-calendar', label: 'Academic Calendar', icon: FiCalendar, perm: 'students' },
            { href: '/dashboard/hostel', label: 'Hostel / Boarding', icon: FiHome, perm: 'students' },
            { href: '/dashboard/transport', label: 'Transport Management', icon: FiSmartphone, perm: 'students' },
            { href: '/dashboard/analytics', label: 'Advanced Analytics', icon: FiBarChart2, perm: 'reports' },
            { href: '/dashboard/admissions/applications', label: 'Online Admissions', icon: FiUserCheck, perm: 'students' },
            { href: '/dashboard/lms', label: 'LMS / E-Learning', icon: FiBookOpen, perm: 'curriculum' },
            { href: '/dashboard/ptm', label: 'PTM Scheduler', icon: FiCalendar, perm: 'students' },
            { href: '/dashboard/fees/defaulter-automation', label: 'Fee Defaulter Automation', icon: FiAlertCircle, perm: 'fees' },
            { href: '/dashboard/knec-compliance', label: 'KNEC / NEMIS Compliance', icon: FiShield, perm: 'reports' },
            { href: '/dashboard/tutorials', label: '🎬 Video Tutorials', icon: FiBookOpen, perm: 'dashboard' },
            { href: '/dashboard/exams/kcse-prediction', label: '🎯 KCSE/KCPE Prediction AI', icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/exams/digital-delivery', label: '📲 Digital Report Delivery', icon: FiSend, perm: 'exams' },
        ]
    },
    {
        label: "Parent & Portals",
        icon: FiMessageSquare,
        name: 'comms',
        collapsible: true,
        items: [
            { href: '/dashboard/communication', label: '📡 SMS & Broadcasting', icon: FiMessageSquare, perm: 'fees' },
            { href: '/dashboard/communication/whatsapp-reports', label: '💬 WhatsApp Reports', icon: FiSend, perm: 'fees' },
            { href: '/dashboard/portals', label: 'Parent & Student Portal', icon: FiUsers, perm: 'students' },
        ]
    },
    {
        label: "Administration",
        icon: FiSettings,
        name: 'admin',
        collapsible: true,
        items: [
            { href: '/dashboard/multi-campus', label: '🏫 Multi-Campus Dashboard', icon: FiGlobe, perm: 'reports' },
            { href: '/dashboard/reports', label: 'Reports & NEMIS Export', icon: FiPieChart, perm: 'reports' },
            { href: '/dashboard/students/nemis-export', label: '📋 NEMIS Data Export', icon: FiFileText, perm: 'reports' },
            { href: '/dashboard/users', label: 'User Roles', icon: FiKey, perm: 'users' },
            { href: '/dashboard/settings', label: 'System Settings', icon: FiSettings, perm: 'settings' },
            { href: '/dashboard/website-builder', label: '🌐 School Website Builder', icon: FiGlobe, perm: 'settings' },
            { href: '/dashboard/super-admin', label: 'Multi-School / Super Admin', icon: FiGlobe, perm: 'super-admin' },
            { href: '/dashboard/cbc-analytics', label: 'CBC Analytics', icon: FiBarChart2, perm: 'exams' },
            { href: '/dashboard/backup', label: 'Ultra Database Backup', icon: FiHardDrive, perm: 'settings' },
        ]
    }
];

// Check permissions
const filterMenuGroups = (groups: typeof menuGroups, isAdmin: boolean, permissions: Record<string, boolean>) => {
    return groups.map(group => {
        const filteredItems = group.items.filter(item => {
            if (isAdmin) return true;
            if (item.perm === 'dashboard') return true;
            return permissions[item.perm] === true;
        });
        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    usePageIcon(pathname);
    const [user, setUser] = useState<UserSession | null>(null);
    const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
    const [userRole, setUserRole] = useState('admin');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const prevPathRef = useRef(pathname);

    // Track which groups are expanded
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const { isOffline } = useOffline();
    const [dashTheme, setDashTheme] = useState<'sidebar' | 'premier'>('sidebar');

    useEffect(() => {
        setMounted(true);
        // Load theme preference
        const savedTheme = localStorage.getItem('apsims_theme') as 'sidebar' | 'premier' | null;
        if (savedTheme) setDashTheme(savedTheme);

        // Verify session server-side (httpOnly cookie) before trusting localStorage
        const verifySession = async () => {
            try {
                const res = await fetch('/api/auth/session');
                if (!res.ok) {
                    // No valid server session — redirect to login
                    localStorage.removeItem('school_user');
                    router.push('/');
                    return;
                }
                const { user: serverUser } = await res.json();
                // Use server-verified user data (authoritative)
                const stored = localStorage.getItem('school_user');
                const localUser = stored ? JSON.parse(stored) : null;
                // If server user doesn't match local, use server data
                const userData = serverUser || localUser;
                if (!userData) { router.push('/'); return; }
                setUser(userData);
                setUserRole(userData.role || 'admin');
                setUserPermissions(userData.permissions || {});
                // Sync localStorage with verified data
                localStorage.setItem('school_user', JSON.stringify(userData));
            } catch {
                // Network error — fall back to localStorage but flag as unverified
                const stored = localStorage.getItem('school_user');
                if (!stored) { router.push('/'); return; }
                try {
                    const parsed = JSON.parse(stored);
                    setUser(parsed);
                    setUserRole(parsed.role || 'admin');
                    setUserPermissions(parsed.permissions || {});
                } catch { router.push('/'); }
            }
        };
        verifySession();
    }, [router]);

    // Setup initial expanded groups based on current path
    useEffect(() => {
        if (!mounted) return;
        
        const newExpandedState: Record<string, boolean> = { ...expandedGroups };
        let stateChanged = false;
        
        menuGroups.forEach(group => {
            const isGroupActive = group.items.some(item => 
                item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
            );
            if (isGroupActive && !expandedGroups[group.name]) {
                newExpandedState[group.name] = true;
                stateChanged = true;
            }
        });
        
        if (stateChanged) {
            setExpandedGroups(newExpandedState);
        }
    }, [pathname, mounted]);

    // SHA-style loading bar on route change
    useEffect(() => {
        if (prevPathRef.current !== pathname) {
            setPageLoading(true);
            prevPathRef.current = pathname;
            const timer = setTimeout(() => setPageLoading(false), 800);
            return () => clearTimeout(timer);
        }
    }, [pathname]);

    const isAdmin = userRole === 'admin' || userRole === 'principal';
    const filteredGroups = filterMenuGroups(menuGroups, isAdmin, userPermissions);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('school_user');
        router.push('/');
    };

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    const toggleGroup = (groupName: string) => {
        if (sidebarCollapsed) {
            setSidebarCollapsed(false);
            setExpandedGroups({ [groupName]: true });
        } else {
            setExpandedGroups(prev => ({
                ...prev,
                [groupName]: !prev[groupName]
            }));
        }
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

    // ═══ PREMIER THEME ═══
    if (dashTheme === 'premier') {
        return (
            <ThemeProvider>
                <LayoutThemeExtras>
                    <CommandPalette />
                    <QuickActionsButton />
                    <PremierDashboard user={user} onLogout={handleLogout}>
                        {children}
                    </PremierDashboard>
                </LayoutThemeExtras>
            </ThemeProvider>
        );
    }

    // ═══ SIDEBAR THEME (default) ═══
    return (
        <ThemeProvider>
        <LayoutThemeExtras>
        <div className="min-h-screen bg-[#f0f2f5] flex font-sans text-gray-800">
            <CommandPalette />
            <QuickActionsButton />
            {pageLoading && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
                    background: 'linear-gradient(90deg, transparent 0%, #3b82f6 40%, #60a5fa 60%, transparent 100%)',
                    animation: 'loadbar 0.8s ease-in-out',
                }}>
                    <div style={{
                        position: 'absolute', right: 0, top: 0, width: '30%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.6))',
                        animation: 'loadglow 0.8s ease-in-out',
                    }} />
                </div>
            )}
            <style jsx>{`
                @keyframes loadbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }
                @keyframes loadglow { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
                .sidebar-scroll::-webkit-scrollbar { width: 4px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
            `}</style>
            
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* ═══ LIGHT THEME SIDEBAR ═══ */}
            <aside className={`
                fixed top-0 left-0 h-full z-50 bg-white border-r border-gray-200 shadow-sm
                transition-all duration-300 ease-in-out flex flex-col
                ${sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'}
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo Header */}
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'} h-[60px] border-b border-gray-100`}>
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                <FiHome size={16} />
                            </div>
                            <div>
                                <h1 className="text-[16px] font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Alpha<span className="text-blue-600">School</span></h1>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiHome size={16} /></div>}

                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors ml-auto text-gray-400 hover:text-gray-600"
                    >
                        {sidebarCollapsed ? <FiChevronRight size={12} /> : <FiChevronLeft size={12} />}
                    </button>

                    {!sidebarCollapsed && (
                        <button
                            onClick={() => { localStorage.setItem('apsims_theme', 'premier'); setDashTheme('premier'); }}
                            title="Switch to Premier Layout"
                            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-500 hover:text-blue-700 ml-1"
                        >
                            <FiGrid size={12} />
                        </button>
                    )}

                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden ml-auto text-gray-400 hover:text-gray-600">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll py-3 px-3 space-y-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {filteredGroups.map((group) => {
                        const isExpanded = expandedGroups[group.name];
                        const GroupIcon = group.icon;
                        const isGroupActive = group.items.some(item => isActive(item.href));

                        // Dashboard link (non-collapsible)
                        if (!group.label || !group.collapsible) {
                            return group.items.map(item => {
                                const ItemIcon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all mb-2
                                            ${active
                                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                            ${sidebarCollapsed ? 'justify-center' : ''}`}
                                        title={sidebarCollapsed ? item.label : undefined}
                                    >
                                        <ItemIcon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
                                        {!sidebarCollapsed && <span>{item.label}</span>}
                                        {active && !sidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                    </Link>
                                );
                            });
                        }

                        // Collapsible Group
                        return (
                            <div key={group.name} className="mb-0.5">
                                {/* Group Header */}
                                <button
                                    onClick={() => toggleGroup(group.name)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all
                                        ${isGroupActive
                                            ? 'text-blue-700 bg-blue-50/50'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                        ${sidebarCollapsed ? 'justify-center' : ''}`}
                                    title={sidebarCollapsed ? group.label : undefined}
                                >
                                    {GroupIcon && <GroupIcon size={17} className={isGroupActive ? 'text-blue-600' : 'text-gray-400'} />}
                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="flex-1 text-left">{group.label}</span>
                                            <FiChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </>
                                    )}
                                </button>
                                
                                {/* Sub Items */}
                                <div className={`overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out
                                    ${isExpanded && !sidebarCollapsed ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
                                `}>
                                    <div className="ml-[22px] pl-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100">
                                        {group.items.map(item => {
                                            const ItemIcon = item.icon;
                                            const active = isActive(item.href);
                                            return (
                                                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                                                    className={`flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[12.5px] transition-all
                                                        ${active
                                                            ? 'text-blue-700 bg-blue-50 font-semibold border-l-2 border-blue-500 -ml-[3px] pl-[11px]'
                                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
                                                    `}
                                                >
                                                    <ItemIcon size={14} className={active ? 'text-blue-600' : 'text-gray-400'} />
                                                    <span>{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User Panel */}
                <div className={`border-t border-gray-100 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
                    {!sidebarCollapsed ? (
                        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-semibold text-gray-800 truncate">{user.full_name}</p>
                                <p className="text-[10.5px] text-blue-600 capitalize font-medium">{user.role}</p>
                            </div>
                            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Logout">
                                <FiLogOut size={15} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Logout">
                                <FiLogOut size={15} />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* ═══ MAIN CONTENT ═══ */}
            <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[260px]'}`}>
                <OfflineBanner />
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/70 px-4 lg:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-800">
                            <FiMenu size={22} />
                        </button>
                        <div
                            className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-72 cursor-pointer hover:bg-white hover:border-blue-300 transition-all duration-300"
                            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                            title="Search (Ctrl+K)"
                        >
                            <FiSearch className="text-gray-400" size={15} />
                            <span className="text-[13px] text-gray-400 select-none">Search students, staff, reports…</span>
                            <span className="ml-auto text-[10px] text-gray-300 font-mono bg-gray-100 px-1.5 py-0.5 rounded">⌘K</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Network status indicator */}
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full ${isOffline ? 'bg-amber-100' : 'bg-green-100'}`} title={isOffline ? 'Offline' : 'Online'}>
                          {isOffline 
                            ? <FiWifiOff size={13} className="text-amber-600" />
                            : <FiWifi size={13} className="text-green-600" />
                          }
                        </div>
                        {/* Notifications - LIVE */}
                        <NotificationsDropdown />
                        {/* Settings */}
                        <Link href="/dashboard/settings" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title="Settings">
                            <FiSettings size={17} />
                        </Link>
                        {/* 🎨 Theme Switcher */}
                        <ThemeSwitcher />
                    </div>
                </header>

                {/* 🔴 LIVE: Supabase Realtime — fee payments, attendance, discipline */}
                    <RealtimeProvider />
                {/* Page Content */}
                <div className="p-4 lg:p-6 flex-1 overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
        </LayoutThemeExtras>
        </ThemeProvider>
    );
}

