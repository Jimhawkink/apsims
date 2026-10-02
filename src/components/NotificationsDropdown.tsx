'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    FiBell, FiDollarSign, FiAlertCircle, FiUsers, FiCalendar,
    FiCheckCircle, FiX, FiRefreshCw, FiArrowRight, FiTrendingDown,
    FiShield, FiPackage, FiBookOpen, FiAlertTriangle, FiVolume2
} from 'react-icons/fi';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface Notification {
    id: string;
    type: 'payment' | 'discipline' | 'attendance' | 'expense' | 'stock' | 'system' | 'store_issue' | 'approval';
    title: string;
    message: string;
    time: string;
    href?: string;
    read: boolean;
    icon: React.ReactNode;
    color: string;
    bg: string;
    urgency?: 'urgent' | 'alert' | 'info' | 'success';
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
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [lastCount, setLastCount] = useState(0);
    const dropRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);
    const STORAGE_KEY = 'apsims_notif_read';
    const SOUND_KEY = 'apsims_notif_sound';
    const { play } = useNotificationSound();

    // Load preferences
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setReadIds(new Set(JSON.parse(stored)));
            const soundPref = localStorage.getItem(SOUND_KEY);
            if (soundPref !== null) setSoundEnabled(soundPref === 'true');
        } catch { /* ignore */ }
    }, []);

    const saveRead = (ids: Set<string>) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
    };

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        localStorage.setItem(SOUND_KEY, String(next));
        if (next) play('info'); // play sample when enabling
    };

    const buildNotifications = useCallback((
        payments: any[], discipline: any[], expenses: any[],
        stores: any[], storeIssues: any[], storedRead: Set<string>
    ): Notification[] => {
        const notifs: Notification[] = [];

        // 🔴 URGENT — Pending store issuance requests needing Bursar/Principal
        storeIssues.forEach((s: any) => {
            notifs.push({
                id: `issue_${s.id}`,
                type: 'store_issue',
                urgency: 'urgent',
                title: '🏪 Store Issue Request — ACTION NEEDED',
                message: `${s.item_name} × ${s.quantity} ${s.unit || ''} requested by ${s.requested_by || 'Store Keeper'} — Status: ${s.status}`,
                time: timeAgo(s.created_at),
                href: '/dashboard/stores/ultra',
                read: storedRead.has(`issue_${s.id}`),
                icon: <FiPackage size={14} />,
                color: '#7c3aed',
                bg: '#f5f3ff',
            });
        });

        // 💳 Fee payments
        payments.forEach((p: any) => {
            const student = p.school_students;
            const name = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
            notifs.push({
                id: `pay_${p.id}`,
                type: 'payment',
                urgency: 'success',
                title: '💳 Fee Payment Received',
                message: `${name} paid ${fmt(Number(p.amount))} via ${p.payment_method || 'Cash'}`,
                time: timeAgo(p.payment_date),
                href: '/dashboard/fees/collect',
                read: storedRead.has(`pay_${p.id}`),
                icon: <FiDollarSign size={14} />,
                color: '#16a34a',
                bg: '#f0fdf4',
            });
        });

        // ⚠️ Discipline
        discipline.forEach((d: any) => {
            const student = d.school_students;
            const name = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
            notifs.push({
                id: `disc_${d.id}`,
                type: 'discipline',
                urgency: 'alert',
                title: '⚠️ Discipline Record',
                message: `${name} — ${d.offense || 'Offense recorded'}`,
                time: timeAgo(d.created_at),
                href: '/dashboard/discipline',
                read: storedRead.has(`disc_${d.id}`),
                icon: <FiShield size={14} />,
                color: '#dc2626',
                bg: '#fef2f2',
            });
        });

        // 📋 Pending expenses
        expenses.forEach((e: any) => {
            notifs.push({
                id: `exp_${e.id}`,
                type: 'expense',
                urgency: 'alert',
                title: '📋 Expense Pending Approval',
                message: `${e.description || 'Expense'} — ${fmt(Number(e.amount))}`,
                time: timeAgo(e.expense_date),
                href: '/dashboard/expenses',
                read: storedRead.has(`exp_${e.id}`),
                icon: <FiTrendingDown size={14} />,
                color: '#d97706',
                bg: '#fffbeb',
            });
        });

        // 📦 Low stock
        stores.forEach((s: any) => {
            notifs.push({
                id: `stock_${s.id}`,
                type: 'stock',
                urgency: 'alert',
                title: '📦 Low Stock Alert',
                message: `${s.item_name} — only ${s.quantity} units remaining`,
                time: 'now',
                href: '/dashboard/stores/ultra',
                read: storedRead.has(`stock_${s.id}`),
                icon: <FiPackage size={14} />,
                color: '#7c3aed',
                bg: '#f5f3ff',
            });
        });

        // Sort: urgent first (unread pending issues at top)
        return notifs.sort((a, b) => {
            if (a.urgency === 'urgent' && b.urgency !== 'urgent') return -1;
            if (b.urgency === 'urgent' && a.urgency !== 'urgent') return 1;
            if (!a.read && b.read) return -1;
            if (a.read && !b.read) return 1;
            return 0;
        });
    }, []);

    const fetchNotifications = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

            const [payments, discipline, expenses, stores, storeIssues] = await Promise.all([
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
                // 🆕 STORE ISSUE REQUESTS — pending Bursar/Principal action
                supabase.from('school_store_issuances')
                    .select('id, item_name, quantity, unit, requested_by, status, created_at')
                    .in('status', ['Pending', 'Verified'])
                    .order('created_at', { ascending: false })
                    .limit(10),
            ]);

            const storedRead = new Set(readIds);
            const final = buildNotifications(
                payments.data || [], discipline.data || [],
                expenses.data || [], stores.data || [],
                storeIssues.data || [], storedRead
            );

            setNotifications(final);

            // Sound alert for new unread urgent notifications
            const newUnreadCount = final.filter(n => !n.read).length;
            const urgentCount = final.filter(n => !n.read && n.urgency === 'urgent').length;

            if (soundEnabled && newUnreadCount > lastCount) {
                if (urgentCount > 0) {
                    play('urgent'); // LOUD 3-beep for store issues
                } else {
                    play('alert'); // two-tone chime for other alerts
                }
                // Shake the bell icon
                if (bellRef.current) {
                    bellRef.current.classList.add('animate-bounce');
                    setTimeout(() => bellRef.current?.classList.remove('animate-bounce'), 600);
                }
            }
            setLastCount(newUnreadCount);
        } catch (err) {
            console.error('Notifications fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [readIds, soundEnabled, lastCount, play, buildNotifications]);

    // Initial load
    useEffect(() => {
        fetchNotifications();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => fetchNotifications(true), 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // 🔴 SUPABASE REALTIME — instant notifications without polling
    useEffect(() => {
        const channel = supabase
            .channel('store-issuances-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_store_issuances' },
                (payload) => {
                    // New store issuance request — play LOUD urgent alert
                    if (soundEnabled) play('urgent');
                    // Refetch to show it
                    fetchNotifications(true);
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_fee_payments' },
                () => {
                    if (soundEnabled) play('success');
                    fetchNotifications(true);
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'school_discipline_records' },
                () => {
                    if (soundEnabled) play('alert');
                    fetchNotifications(true);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [soundEnabled, play, fetchNotifications]);

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
    const urgentUnread = notifications.filter(n => !n.read && n.urgency === 'urgent').length;

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
        payment: 'Finance', discipline: 'Discipline', attendance: 'Attendance',
        expense: 'Expenses', stock: 'Low Stock', system: 'System',
        store_issue: '🔴 STORE REQUEST', approval: 'Approval',
    };

    const URGENCY_COLORS: Record<string, string> = {
        urgent: '#dc2626', alert: '#d97706', success: '#16a34a', info: '#2563eb',
    };

    return (
        <div ref={dropRef} className="relative">
            {/* Bell Button — pulses red when urgent unread */}
            <button
                ref={bellRef}
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                className={`relative p-2 rounded-lg transition-colors ${urgentUnread > 0 ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-500 hover:bg-gray-100'}`}
                title={urgentUnread > 0 ? `⚠️ ${urgentUnread} URGENT action(s) needed!` : 'Notifications'}
            >
                <FiBell size={17} className={urgentUnread > 0 ? 'animate-pulse' : ''} />
                {unreadCount > 0 && (
                    <span className={`absolute top-1 right-1 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white px-[2px] ${urgentUnread > 0 ? 'bg-red-600 animate-pulse' : 'bg-red-500'}`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-[400px] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[999] flex flex-col">
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 ${urgentUnread > 0 ? 'bg-gradient-to-r from-red-700 to-red-900' : 'bg-gradient-to-r from-slate-900 to-blue-900'}`}>
                        <div className="flex items-center gap-2">
                            <FiBell size={15} className="text-white" />
                            <span className="text-white font-bold text-sm">Notifications</span>
                            {urgentUnread > 0 && (
                                <span className="bg-white text-red-700 text-[9px] font-black rounded-full px-2 py-0.5 animate-pulse">
                                    ⚠️ {urgentUnread} URGENT
                                </span>
                            )}
                            {unreadCount > 0 && urgentUnread === 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sound toggle */}
                            <button
                                onClick={toggleSound}
                                className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? 'text-green-300 hover:text-white' : 'text-white/30 hover:text-white/60'}`}
                                title={soundEnabled ? 'Sound ON — click to mute' : 'Sound MUTED — click to enable'}
                            >
                                <FiVolume2 size={13} />
                            </button>
                            <button
                                onClick={() => fetchNotifications()}
                                className="p-1 text-white/60 hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            </button>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-[10px] text-blue-300 hover:text-white font-semibold transition-colors">
                                    Mark all read
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="p-1 text-white/60 hover:text-white">
                                <FiX size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Urgent banner */}
                    {urgentUnread > 0 && (
                        <div className="bg-red-50 border-b-2 border-red-200 px-4 py-2 flex items-center gap-2">
                            <span className="text-red-600 text-lg animate-pulse">🚨</span>
                            <div>
                                <p className="text-red-800 font-black text-xs">{urgentUnread} store issue request{urgentUnread > 1 ? 's' : ''} awaiting Bursar/Principal approval</p>
                                <p className="text-red-500 text-[10px]">Scroll down to review and approve</p>
                            </div>
                            <Link href="/dashboard/stores/ultra" onClick={() => setOpen(false)}
                                className="ml-auto flex-shrink-0 px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition">
                                Open Stores →
                            </Link>
                        </div>
                    )}

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
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group ${
                                        !notif.read && notif.urgency === 'urgent'
                                            ? 'bg-red-50/60 border-l-4 border-l-red-500'
                                            : !notif.read ? 'bg-blue-50/30' : ''
                                    }`}
                                    onClick={() => markRead(notif.id)}
                                >
                                    {/* Icon */}
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
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
                                            <div className="flex items-center gap-1">
                                                {notif.href && (
                                                    <Link href={notif.href} onClick={e => { e.stopPropagation(); markRead(notif.id); setOpen(false); }}
                                                        className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                                                        View →
                                                    </Link>
                                                )}
                                                {!notif.read && (
                                                    <div className="w-2 h-2 rounded-full flex-shrink-0 ml-1"
                                                        style={{ background: URGENCY_COLORS[notif.urgency || 'info'] }} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                            {notifications.length} alerts · {soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'} · Live via Realtime
                        </span>
                        <Link
                            href="/dashboard/notifications"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                        >
                            All Notifications <FiArrowRight size={11} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
