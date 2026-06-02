'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    FiBell, FiDollarSign, FiAlertCircle, FiUsers, FiCalendar,
    FiCheckCircle, FiX, FiRefreshCw, FiArrowRight, FiTrendingDown,
    FiShield, FiPackage, FiBookOpen, FiAlertTriangle
} from 'react-icons/fi';

interface Notification {
    id: string;
    type: 'payment' | 'discipline' | 'attendance' | 'expense' | 'stock' | 'system';
    title: string;
    message: string;
    time: string;
    href?: string;
    read: boolean;
    icon: React.ReactNode;
    color: string;
    bg: string;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
}

const fmt = (n: number) => `KES ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export default function NotificationsDropdown() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const dropRef = useRef<HTMLDivElement>(null);
    const STORAGE_KEY = 'apsims_notif_read';

    // Load read IDs from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setReadIds(new Set(JSON.parse(stored)));
        } catch { /* ignore */ }
    }, []);

    const saveRead = (ids: Set<string>) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
    };

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

            const [payments, discipline, expenses, stores] = await Promise.all([
                supabase.from('school_fee_payments')
                    .select('id, amount, payment_date, payment_method, receipt_number, school_students(first_name, last_name)')
                    .gte('payment_date', yesterday)
                    .order('payment_date', { ascending: false })
                    .limit(8),
                supabase.from('school_discipline_records')
                    .select('id, offense, action_taken, created_at, school_students(first_name, last_name)')
                    .gte('created_at', weekAgo)
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase.from('school_expenses')
                    .select('id, amount, description, expense_date, status')
                    .gte('expense_date', yesterday)
                    .eq('status', 'pending')
                    .order('expense_date', { ascending: false })
                    .limit(5),
                supabase.from('school_store_items')
                    .select('id, item_name, quantity, reorder_level')
                    .lt('quantity', 10)
                    .order('quantity', { ascending: true })
                    .limit(5),
            ]);

            const notifs: Notification[] = [];

            // Fee payment notifications
            (payments.data || []).forEach((p: any) => {
                const student = p.school_students;
                const name = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
                notifs.push({
                    id: `pay_${p.id}`,
                    type: 'payment',
                    title: '💳 Fee Payment Received',
                    message: `${name} paid ${fmt(Number(p.amount))} via ${p.payment_method || 'Cash'}`,
                    time: timeAgo(p.payment_date),
                    href: '/dashboard/fees/collect',
                    read: false,
                    icon: <FiDollarSign size={14} />,
                    color: '#16a34a',
                    bg: '#f0fdf4',
                });
            });

            // Discipline notifications
            (discipline.data || []).forEach((d: any) => {
                const student = d.school_students;
                const name = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
                notifs.push({
                    id: `disc_${d.id}`,
                    type: 'discipline',
                    title: '⚠️ Discipline Record',
                    message: `${name} — ${d.offense || 'Offense recorded'}`,
                    time: timeAgo(d.created_at),
                    href: '/dashboard/discipline',
                    read: false,
                    icon: <FiShield size={14} />,
                    color: '#dc2626',
                    bg: '#fef2f2',
                });
            });

            // Pending expense approvals
            (expenses.data || []).forEach((e: any) => {
                notifs.push({
                    id: `exp_${e.id}`,
                    type: 'expense',
                    title: '📋 Expense Pending Approval',
                    message: `${e.description || 'Expense'} — ${fmt(Number(e.amount))}`,
                    time: timeAgo(e.expense_date),
                    href: '/dashboard/expenses',
                    read: false,
                    icon: <FiTrendingDown size={14} />,
                    color: '#d97706',
                    bg: '#fffbeb',
                });
            });

            // Low stock alerts
            (stores.data || []).forEach((s: any) => {
                notifs.push({
                    id: `stock_${s.id}`,
                    type: 'stock',
                    title: '📦 Low Stock Alert',
                    message: `${s.item_name} — only ${s.quantity} units remaining`,
                    time: 'now',
                    href: '/dashboard/stores/ultra',
                    read: false,
                    icon: <FiPackage size={14} />,
                    color: '#7c3aed',
                    bg: '#f5f3ff',
                });
            });

            // Mark read status
            const storedRead = new Set(readIds);
            const final = notifs
                .sort((a, b) => (a.type === 'stock' ? 1 : -1))
                .map(n => ({ ...n, read: storedRead.has(n.id) }));

            setNotifications(final);
        } catch (err) {
            console.error('Notifications fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [readIds]);

    useEffect(() => {
        fetchNotifications();
        // Auto-refresh every 90 seconds
        const interval = setInterval(fetchNotifications, 90000);
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        const allIds = new Set(notifications.map(n => n.id));
        setReadIds(allIds);
        saveRead(allIds);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markRead = (id: string) => {
        const newSet = new Set(readIds);
        newSet.add(id);
        setReadIds(newSet);
        saveRead(newSet);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const TYPE_LABELS: Record<string, string> = {
        payment: 'Finance',
        discipline: 'Discipline',
        attendance: 'Attendance',
        expense: 'Expenses',
        stock: 'Stores',
        system: 'System',
    };

    return (
        <div ref={dropRef} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                title="Notifications"
            >
                <FiBell size={17} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white px-[2px]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[999] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-blue-900">
                        <div className="flex items-center gap-2">
                            <FiBell size={15} className="text-white" />
                            <span className="text-white font-bold text-sm">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchNotifications}
                                className="p-1 text-white/60 hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[10px] text-blue-300 hover:text-white font-semibold transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="p-1 text-white/60 hover:text-white">
                                <FiX size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1">
                        {loading && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-3" />
                                <span className="text-xs font-medium">Loading alerts…</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <FiCheckCircle size={28} className="text-green-400 mb-2" />
                                <p className="text-sm font-semibold text-gray-600">All caught up!</p>
                                <p className="text-xs mt-1">No new notifications</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => markRead(notif.id)}
                                >
                                    {/* Icon */}
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: notif.bg, color: notif.color }}
                                    >
                                        {notif.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-[12px] font-bold truncate ${notif.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                                {notif.title}
                                            </p>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">{notif.time}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span
                                                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                                style={{ backgroundColor: notif.bg, color: notif.color }}
                                            >
                                                {TYPE_LABELS[notif.type]}
                                            </span>
                                            {!notif.read && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                            {notifications.length} alerts · Auto-refreshes every 90s
                        </span>
                        <Link
                            href="/dashboard/fees"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                        >
                            View Finance <FiArrowRight size={11} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
