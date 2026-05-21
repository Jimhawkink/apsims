'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    FiSearch, FiUsers, FiDollarSign, FiBookOpen, FiBox, FiTruck,
    FiBarChart2, FiSettings, FiArrowRight, FiClock, FiZap, FiPlus,
    FiCreditCard, FiFileText, FiShield, FiLayers, FiHome, FiCalendar,
    FiUserCheck, FiTrendingUp, FiCommand, FiCornerDownLeft
} from 'react-icons/fi';

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: any;
    color: string;
    href?: string;
    action?: () => void;
    category: 'recent' | 'module' | 'action' | 'settings';
    keywords?: string[];
}

const ALL_COMMANDS: CommandItem[] = [
    // ── MODULES ──
    { id: 'home', label: 'Dashboard Home', description: 'Main dashboard overview', icon: FiHome, color: '#3b82f6', href: '/dashboard', category: 'module', keywords: ['home', 'main', 'overview'] },
    { id: 'students', label: 'Students & Admissions', description: 'Manage student records', icon: FiUsers, color: '#10b981', href: '/dashboard/students', category: 'module', keywords: ['students', 'admission', 'enrollment', 'learners'] },
    { id: 'fees', label: 'Fee Collection', description: 'Collect and manage school fees', icon: FiDollarSign, color: '#22c55e', href: '/dashboard/fees', category: 'module', keywords: ['fees', 'payment', 'collection', 'money', 'mpesa'] },
    { id: 'finance-analytics', label: 'Financial Analytics', description: 'Revenue intelligence & forecasting', icon: FiTrendingUp, color: '#6366f1', href: '/dashboard/fees/analytics', category: 'module', keywords: ['analytics', 'revenue', 'finance', 'reports', 'intelligence'] },
    { id: 'mpesa', label: 'M-Pesa Reconciliation', description: 'Auto-match M-Pesa payments', icon: FiCreditCard, color: '#22c55e', href: '/dashboard/fees/mpesa-reconciliation', category: 'module', keywords: ['mpesa', 'mobile', 'reconciliation', 'safaricom'] },
    { id: 'receipts', label: 'Professional Receipts', description: 'Generate KRA-compliant receipts', icon: FiFileText, color: '#f59e0b', href: '/dashboard/fees/receipts', category: 'module', keywords: ['receipts', 'kra', 'invoice', 'print'] },
    { id: 'audit', label: 'Financial Audit Trail', description: 'Track all financial transactions', icon: FiShield, color: '#ef4444', href: '/dashboard/fees/audit', category: 'module', keywords: ['audit', 'trail', 'log', 'security'] },
    { id: 'hr', label: 'HR & Staff', description: 'Human resources management', icon: FiUserCheck, color: '#8b5cf6', href: '/dashboard/hr-payroll', category: 'module', keywords: ['hr', 'staff', 'employees', 'teachers', 'human'] },
    { id: 'payroll', label: 'Payroll & Salaries', description: 'PAYE, NSSF Tier I/II, SHIF calculator', icon: FiDollarSign, color: '#7c3aed', href: '/dashboard/hr-payroll/payroll', category: 'module', keywords: ['payroll', 'salary', 'paye', 'nssf', 'shif', 'tax', 'deductions'] },
    { id: 'library', label: 'Ultra Library', description: 'Book catalog, barcode scan, issue/return', icon: FiBookOpen, color: '#6366f1', href: '/dashboard/library-inventory/ultra', category: 'module', keywords: ['library', 'books', 'catalog', 'barcode', 'isbn'] },
    { id: 'stores', label: 'Ultra Stores & Kitchen', description: 'Inventory, GRN, issuances, kitchen', icon: FiBox, color: '#f59e0b', href: '/dashboard/stores/ultra', category: 'module', keywords: ['stores', 'kitchen', 'inventory', 'stock', 'provisions'] },
    { id: 'assets', label: 'Ultra Asset Management', description: 'Asset register, depreciation, maintenance', icon: FiBox, color: '#8b5cf6', href: '/dashboard/assets/ultra', category: 'module', keywords: ['assets', 'register', 'depreciation', 'maintenance', 'furniture'] },
    { id: 'procurement', label: 'Procurement & Suppliers', description: 'LPOs, supplier invoices, payments', icon: FiTruck, color: '#0891b2', href: '/dashboard/procurement', category: 'module', keywords: ['procurement', 'suppliers', 'purchase', 'lpo', 'orders'] },
    { id: 'exams', label: 'Exams & Results', description: 'Exam management and grading', icon: FiFileText, color: '#ef4444', href: '/dashboard/exams', category: 'module', keywords: ['exams', 'results', 'grades', 'marks', 'assessment'] },
    { id: 'reports', label: 'Report Cards', description: 'Generate and print report cards', icon: FiLayers, color: '#ec4899', href: '/dashboard/report-cards', category: 'module', keywords: ['reports', 'cards', 'academic', 'print'] },
    { id: 'timetable', label: 'Timetable', description: 'Class scheduling and timetable', icon: FiCalendar, color: '#14b8a6', href: '/dashboard/timetable', category: 'module', keywords: ['timetable', 'schedule', 'classes', 'lessons'] },
    { id: 'settings', label: 'System Settings', description: 'Configure school & system settings', icon: FiSettings, color: '#64748b', href: '/dashboard/settings', category: 'settings', keywords: ['settings', 'configuration', 'setup', 'school'] },
    
    // ── QUICK ACTIONS ──
    { id: 'add-student', label: 'Add New Student', description: 'Register a new student', icon: FiPlus, color: '#10b981', href: '/dashboard/students', category: 'action', keywords: ['add', 'new', 'student', 'register'] },
    { id: 'record-payment', label: 'Record Fee Payment', description: 'Collect fees from student', icon: FiCreditCard, color: '#22c55e', href: '/dashboard/fees', category: 'action', keywords: ['record', 'payment', 'fee', 'collect'] },
    { id: 'run-payroll', label: 'Process Payroll', description: 'Run monthly salary processing', icon: FiDollarSign, color: '#7c3aed', href: '/dashboard/hr-payroll/payroll', category: 'action', keywords: ['run', 'payroll', 'process', 'salary'] },
    { id: 'issue-book', label: 'Issue Library Book', description: 'Check out a book to student', icon: FiBookOpen, color: '#6366f1', href: '/dashboard/library-inventory/ultra', category: 'action', keywords: ['issue', 'book', 'library', 'checkout'] },
    { id: 'receive-stock', label: 'Receive Store Stock', description: 'Record goods received note (GRN)', icon: FiBox, color: '#f59e0b', href: '/dashboard/stores/ultra', category: 'action', keywords: ['receive', 'stock', 'grn', 'goods'] },
];

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Recent: last 3 visited pages (stored in localStorage)
    const [recent, setRecent] = useState<string[]>([]);

    useEffect(() => {
        try { setRecent(JSON.parse(localStorage.getItem('apsims_recent_nav') || '[]')); } catch { }
    }, [open]);

    useEffect(() => {
        if (pathname) {
            try {
                const stored = JSON.parse(localStorage.getItem('apsims_recent_nav') || '[]') as string[];
                const updated = [pathname, ...stored.filter(p => p !== pathname)].slice(0, 5);
                localStorage.setItem('apsims_recent_nav', JSON.stringify(updated));
            } catch { }
        }
    }, [pathname]);

    // Ctrl+K / Cmd+K toggle
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
                setQuery('');
                setSelectedIdx(0);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    // Filter commands
    const filtered = query.trim()
        ? ALL_COMMANDS.filter(c => {
            const q = query.toLowerCase();
            return c.label.toLowerCase().includes(q) ||
                (c.description || '').toLowerCase().includes(q) ||
                (c.keywords || []).some(k => k.includes(q));
        })
        : ALL_COMMANDS;

    // Group by category
    const recentItems = filtered.filter(c => recent.includes(c.href || '')).slice(0, 3);
    const modules = filtered.filter(c => c.category === 'module');
    const actions = filtered.filter(c => c.category === 'action');
    const allGrouped = [
        ...(recentItems.length > 0 ? [{ group: '🕐 Recent', items: recentItems }] : []),
        ...(modules.length > 0 ? [{ group: '📦 Modules', items: modules }] : []),
        ...(actions.length > 0 ? [{ group: '⚡ Quick Actions', items: actions }] : []),
    ];
    const flatList = allGrouped.flatMap(g => g.items);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, flatList.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && flatList[selectedIdx]) {
            e.preventDefault();
            const item = flatList[selectedIdx];
            if (item.href) router.push(item.href);
            if (item.action) item.action();
            setOpen(false);
        }
    };

    useEffect(() => { setSelectedIdx(0); }, [query]);

    // Scroll selected into view
    useEffect(() => {
        const el = document.getElementById(`cmd-item-${selectedIdx}`);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx]);

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '12vh',
                background: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(8px)',
                animation: 'cmdFadeIn 0.15s ease',
            }}
            onClick={() => setOpen(false)}
        >
            <style>{`
                @keyframes cmdFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes cmdSlideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 620,
                    background: '#ffffff',
                    borderRadius: 20,
                    boxShadow: '0 40px 100px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    animation: 'cmdSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    fontFamily: "'Inter','Segoe UI',sans-serif",
                    maxHeight: '70vh',
                    display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Search Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                }}>
                    <FiSearch size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search modules, students, actions..."
                        style={{
                            flex: 1, border: 'none', outline: 'none',
                            fontSize: 15, fontWeight: 500, color: '#1e293b',
                            background: 'transparent',
                            fontFamily: "'Inter','Segoe UI',sans-serif",
                        }}
                    />
                    <kbd style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: '#f1f5f9', border: '1px solid #e2e8f0',
                        fontSize: 10, fontWeight: 700, color: '#94a3b8',
                        fontFamily: "'Inter',sans-serif", letterSpacing: '0.02em',
                    }}>Ctrl+K</kbd>
                </div>

                {/* Results */}
                <div ref={listRef} style={{ overflowY: 'auto', flex: 1, padding: '8px 8px 12px' }}>
                    {flatList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🔍</span>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>No results for "{query}"</p>
                            <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>Try searching for a module name or action</p>
                        </div>
                    ) : (
                        allGrouped.map(group => (
                            <div key={group.group} style={{ marginBottom: 8 }}>
                                <p style={{
                                    fontSize: 10, fontWeight: 800, color: '#94a3b8',
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    padding: '8px 12px 4px', margin: 0,
                                }}>{group.group}</p>
                                {group.items.map(item => {
                                    const globalIdx = flatList.indexOf(item);
                                    const isSelected = globalIdx === selectedIdx;
                                    return (
                                        <div
                                            id={`cmd-item-${globalIdx}`}
                                            key={item.id}
                                            onClick={() => {
                                                if (item.href) router.push(item.href);
                                                if (item.action) item.action();
                                                setOpen(false);
                                            }}
                                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 12px', borderRadius: 12,
                                                cursor: 'pointer',
                                                background: isSelected ? '#f1f5ff' : 'transparent',
                                                border: isSelected ? '1px solid #e0e7ff' : '1px solid transparent',
                                                transition: 'all 0.1s',
                                                marginBottom: 2,
                                            }}
                                        >
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10,
                                                background: `${item.color}12`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: item.color, flexShrink: 0,
                                            }}>
                                                <item.icon size={16} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, lineHeight: 1.3 }}>{item.label}</p>
                                                {item.description && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.2 }}>{item.description}</p>}
                                            </div>
                                            {isSelected && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                    <kbd style={{
                                                        padding: '2px 6px', borderRadius: 4,
                                                        background: '#e0e7ff', border: '1px solid #c7d2fe',
                                                        fontSize: 9, fontWeight: 700, color: '#6366f1',
                                                        display: 'flex', alignItems: 'center', gap: 2,
                                                    }}>
                                                        <FiCornerDownLeft size={8} /> Enter
                                                    </kbd>
                                                </div>
                                            )}
                                            {!isSelected && (
                                                <FiArrowRight size={12} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#fafbfc',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 9 }}>↑</kbd>
                            <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 9 }}>↓</kbd>
                            Navigate
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 9 }}>↵</kbd>
                            Open
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 9 }}>Esc</kbd>
                            Close
                        </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1' }}>APSIMS Ultra</span>
                </div>
            </div>
        </div>
    );
}
