'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiZap, FiX, FiDollarSign, FiCalendar, FiTrendingDown,
    FiMessageSquare, FiUsers, FiBookOpen, FiPrinter, FiSend,
    FiUserPlus, FiAlertTriangle, FiBarChart2, FiPackage
} from 'react-icons/fi';

const ACTIONS = [
    { icon: FiDollarSign, label: 'Collect Fee', href: '/dashboard/fees/collect', color: '#16a34a', bg: '#f0fdf4', desc: 'Record student payment' },
    { icon: FiCalendar, label: 'Mark Attendance', href: '/dashboard/attendance', color: '#2563eb', bg: '#eff6ff', desc: 'Today\'s class attendance' },
    { icon: FiTrendingDown, label: 'Add Expense', href: '/dashboard/expenses', color: '#dc2626', bg: '#fef2f2', desc: 'Record school expense' },
    { icon: FiMessageSquare, label: 'Send SMS', href: '/dashboard/communication', color: '#7c3aed', bg: '#f5f3ff', desc: 'SMS to parents/staff' },
    { icon: FiUsers, label: 'New Student', href: '/dashboard/students/admissions', color: '#0891b2', bg: '#ecfeff', desc: 'Admit new student' },
    { icon: FiBookOpen, label: 'Enter Marks', href: '/dashboard/exams/marks', color: '#d97706', bg: '#fffbeb', desc: 'Record exam marks' },
    { icon: FiPrinter, label: 'Print Receipt', href: '/dashboard/fees/receipts', color: '#059669', bg: '#ecfdf5', desc: 'Generate fee receipt' },
    { icon: FiAlertTriangle, label: 'Defaulters', href: '/dashboard/fees/outstanding', color: '#ea580c', bg: '#fff7ed', desc: 'Fee defaulter list' },
    { icon: FiBarChart2, label: 'Reports', href: '/dashboard/analytics', color: '#6366f1', bg: '#eef2ff', desc: 'Analytics & reports' },
    { icon: FiPackage, label: 'Issue Item', href: '/dashboard/stores/ultra', color: '#92400e', bg: '#fef3c7', desc: 'Issue store item' },
    { icon: FiSend, label: 'Bulk Reminder', href: '/dashboard/fees/bulk-reminders', color: '#be185d', bg: '#fdf2f8', desc: 'Send bulk fee SMS' },
    { icon: FiUserPlus, label: 'Leave Out', href: '/dashboard/leave-out', color: '#475569', bg: '#f8fafc', desc: 'Student leave request' },
];

export default function QuickActionsButton() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
            // Open with Alt+Q
            if (e.altKey && e.key === 'q') setOpen(prev => !prev);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const filtered = search
        ? ACTIONS.filter(a =>
            a.label.toLowerCase().includes(search.toLowerCase()) ||
            a.desc.toLowerCase().includes(search.toLowerCase())
          )
        : ACTIONS;

    const handleAction = (href: string) => {
        router.push(href);
        setOpen(false);
        setSearch('');
    };

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998]"
                    onClick={() => { setOpen(false); setSearch(''); }}
                />
            )}

            {/* Quick Actions Panel */}
            {open && (
                <div className="fixed bottom-24 right-6 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[999] overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                        <div className="flex items-center gap-2">
                            <FiZap size={15} className="text-yellow-400" />
                            <span className="text-white font-bold text-sm">Quick Actions</span>
                            <span className="text-[10px] text-gray-400 font-mono bg-white/10 px-1.5 py-0.5 rounded">Alt+Q</span>
                        </div>
                        <button onClick={() => { setOpen(false); setSearch(''); }}
                            className="text-white/60 hover:text-white transition-colors">
                            <FiX size={14} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 border-b border-gray-100">
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search actions..."
                            className="w-full text-[13px] text-gray-800 outline-none placeholder:text-gray-400 bg-gray-50 rounded-lg px-3 py-2"
                        />
                    </div>

                    {/* Actions Grid */}
                    <div className="p-3 grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto">
                        {filtered.map(action => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.href}
                                    onClick={() => handleAction(action.href)}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:scale-105 transition-all duration-150 text-center group"
                                    style={{ backgroundColor: action.bg }}
                                >
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                                        style={{ backgroundColor: action.color + '18', color: action.color }}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-800 leading-tight">{action.label}</span>
                                    <span className="text-[9px] text-gray-500 leading-tight hidden group-hover:block">{action.desc}</span>
                                </button>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="col-span-3 py-6 text-center text-gray-400 text-sm">
                                No actions found for &ldquo;{search}&rdquo;
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-400 text-center">
                        {filtered.length} actions available · Press Esc to close
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={() => setOpen(!open)}
                title="Quick Actions (Alt+Q)"
                className="fixed bottom-6 right-6 z-[997] w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                    background: open
                        ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                        : 'linear-gradient(135deg, #1e40af, #3b82f6, #6366f1)',
                    boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
                }}
            >
                {open ? <FiX size={22} /> : <FiZap size={22} />}
            </button>
        </>
    );
}
