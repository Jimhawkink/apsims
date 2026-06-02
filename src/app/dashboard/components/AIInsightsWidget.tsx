'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    FiAlertTriangle, FiTrendingUp, FiTrendingDown, FiUsers,
    FiDollarSign, FiCalendar, FiRefreshCw, FiChevronRight,
    FiZap, FiCheckCircle, FiAlertCircle, FiStar
} from 'react-icons/fi';

interface Insight {
    id: string;
    type: 'warning' | 'success' | 'info' | 'critical';
    icon: string;
    title: string;
    detail: string;
    action?: string;
    href?: string;
    value?: string;
}

const TYPE_STYLE = {
    critical: { border: '#dc2626', bg: '#fef2f2', text: '#991b1b', badge: '#fca5a5' },
    warning:  { border: '#d97706', bg: '#fffbeb', text: '#92400e', badge: '#fde68a' },
    success:  { border: '#16a34a', bg: '#f0fdf4', text: '#14532d', badge: '#bbf7d0' },
    info:     { border: '#2563eb', bg: '#eff6ff', text: '#1e3a5f', badge: '#bfdbfe' },
};

export default function AIInsightsWidget() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const generateInsights = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

            const [
                studentsRes, paymentsRes, attendanceRes,
                disciplineRes, expensesRes, storesRes, staffRes
            ] = await Promise.all([
                supabase.from('school_students').select('id,status,form_id,school_forms(form_name)').limit(5000),
                supabase.from('school_fee_payments').select('id,amount,payment_date,student_id').gte('payment_date', monthAgo),
                supabase.from('school_attendance').select('id,status,date,form_id,school_forms(form_name)').gte('date', weekAgo),
                supabase.from('school_discipline_records').select('id,created_at,school_students(first_name,last_name)').gte('created_at', weekAgo),
                supabase.from('school_expenses').select('id,amount,status,expense_date').gte('expense_date', monthAgo),
                supabase.from('school_store_items').select('id,item_name,quantity,reorder_level').lt('quantity', 10),
                supabase.from('school_teachers').select('id,status').limit(200),
            ]);

            const newInsights: Insight[] = [];
            const students = studentsRes.data || [];
            const payments = paymentsRes.data || [];
            const attendance = attendanceRes.data || [];
            const discipline = disciplineRes.data || [];
            const expenses = expensesRes.data || [];
            const storeItems = storesRes.data || [];

            // 1. Fee collection insight
            const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
            const todayPayments = payments.filter(p => p.payment_date === today);
            if (todayPayments.length > 0) {
                const todayAmt = todayPayments.reduce((s, p) => s + Number(p.amount), 0);
                newInsights.push({
                    id: 'today_fees',
                    type: 'success',
                    icon: '💰',
                    title: `${todayPayments.length} fee payment${todayPayments.length > 1 ? 's' : ''} received today`,
                    detail: `KES ${todayAmt.toLocaleString('en-KE')} collected today. Month total: KES ${totalCollected.toLocaleString('en-KE')}`,
                    action: 'View Payments',
                    href: '/dashboard/fees/payments',
                    value: `KES ${todayAmt.toLocaleString('en-KE')}`,
                });
            }

            // 2. Attendance alert by form
            const absentToday = attendance.filter(a => a.status === 'Absent' && a.date === today);
            if (absentToday.length > 0) {
                const byForm: Record<string, number> = {};
                absentToday.forEach(a => {
                    const fn = (a as any).school_forms?.form_name || 'Unknown';
                    byForm[fn] = (byForm[fn] || 0) + 1;
                });
                const worstForm = Object.entries(byForm).sort((a, b) => b[1] - a[1])[0];
                newInsights.push({
                    id: 'attendance_alert',
                    type: absentToday.length > 20 ? 'critical' : 'warning',
                    icon: '📅',
                    title: `${absentToday.length} students absent today`,
                    detail: `Highest in ${worstForm?.[0] || 'Unknown'}: ${worstForm?.[1] || 0} absent. Consider SMS alerts to parents.`,
                    action: 'Mark Attendance',
                    href: '/dashboard/attendance',
                    value: `${absentToday.length} absent`,
                });
            }

            // 3. Discipline incidents this week
            if (discipline.length > 0) {
                const names = discipline.slice(0, 2).map(d => {
                    const s = (d as any).school_students;
                    return s ? `${s.first_name} ${s.last_name}` : 'Student';
                });
                newInsights.push({
                    id: 'discipline',
                    type: discipline.length > 5 ? 'critical' : 'warning',
                    icon: '⚠️',
                    title: `${discipline.length} discipline incident${discipline.length > 1 ? 's' : ''} this week`,
                    detail: `Recent: ${names.join(', ')}${discipline.length > 2 ? ` and ${discipline.length - 2} more` : ''}. Review and take action.`,
                    action: 'View Discipline',
                    href: '/dashboard/discipline',
                    value: `${discipline.length} this week`,
                });
            }

            // 4. Pending expense approvals
            const pendingExpenses = expenses.filter(e => e.status === 'pending');
            if (pendingExpenses.length > 0) {
                const pendingAmt = pendingExpenses.reduce((s, e) => s + Number(e.amount), 0);
                newInsights.push({
                    id: 'pending_expenses',
                    type: 'warning',
                    icon: '📋',
                    title: `${pendingExpenses.length} expense${pendingExpenses.length > 1 ? 's' : ''} pending approval`,
                    detail: `KES ${pendingAmt.toLocaleString('en-KE')} awaiting your approval. Review and approve/reject.`,
                    action: 'Review Expenses',
                    href: '/dashboard/expenses',
                    value: `KES ${pendingAmt.toLocaleString('en-KE')}`,
                });
            }

            // 5. Low stock alerts
            if (storeItems.length > 0) {
                const critical = storeItems.filter(s => s.quantity === 0);
                newInsights.push({
                    id: 'low_stock',
                    type: critical.length > 0 ? 'critical' : 'warning',
                    icon: '📦',
                    title: `${storeItems.length} store item${storeItems.length > 1 ? 's' : ''} running low`,
                    detail: `${critical.length > 0 ? `${critical.length} item(s) out of stock. ` : ''}Items below reorder level: ${storeItems.slice(0, 3).map(s => s.item_name).join(', ')}${storeItems.length > 3 ? '...' : ''}`,
                    action: 'View Stores',
                    href: '/dashboard/stores/ultra',
                    value: `${storeItems.length} items`,
                });
            }

            // 6. Student enrollment insight
            const totalStudents = students.length;
            if (totalStudents > 0) {
                const byForm: Record<string, number> = {};
                students.forEach(s => {
                    const fn = (s as any).school_forms?.form_name || 'Unassigned';
                    byForm[fn] = (byForm[fn] || 0) + 1;
                });
                const largest = Object.entries(byForm).sort((a, b) => b[1] - a[1])[0];
                newInsights.push({
                    id: 'enrollment',
                    type: 'info',
                    icon: '🎓',
                    title: `${totalStudents.toLocaleString()} total students enrolled`,
                    detail: `Largest class: ${largest?.[0]} with ${largest?.[1]} students. Click to view full breakdown.`,
                    action: 'View Students',
                    href: '/dashboard/students',
                    value: `${totalStudents} students`,
                });
            }

            // 7. KCSE Prediction teaser
            newInsights.push({
                id: 'kcse_prediction',
                type: 'info',
                icon: '🎯',
                title: 'KCSE/KCPE Grade Prediction available',
                detail: 'AI-powered grade prediction based on continuous assessment. View predicted grades, at-risk students, and intervention recommendations.',
                action: 'View Predictions',
                href: '/dashboard/exams/kcse-prediction',
            });

            // 8. Quick wins — if no issues
            if (newInsights.filter(i => i.type === 'critical' || i.type === 'warning').length === 0) {
                newInsights.push({
                    id: 'all_good',
                    type: 'success',
                    icon: '✅',
                    title: 'All systems looking great!',
                    detail: 'No critical alerts today. Attendance is on track, no pending approvals, and store levels are healthy.',
                    value: '100% healthy',
                });
            }

            setInsights(newInsights.slice(0, 7));
            setLastUpdated(new Date());
        } catch (err) {
            console.error('AI Insights error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        generateInsights();
        const interval = setInterval(generateInsights, 5 * 60 * 1000); // refresh every 5 mins
        return () => clearInterval(interval);
    }, [generateInsights]);

    const criticalCount = insights.filter(i => i.type === 'critical').length;
    const warningCount = insights.filter(i => i.type === 'warning').length;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                        <FiZap size={18} className="text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">AI Insights & Alerts</h3>
                        <p className="text-slate-400 text-xs">Smart analysis of your school data</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {criticalCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {criticalCount} critical
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {warningCount} alerts
                        </span>
                    )}
                    <button onClick={generateInsights} title="Refresh insights"
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Insights List */}
            <div className="divide-y divide-gray-50">
                {loading ? (
                    <div className="py-10 text-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">Analyzing your school data…</p>
                        <p className="text-xs text-gray-400 mt-1">Checking fees, attendance, discipline & stores</p>
                    </div>
                ) : insights.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">
                        <FiCheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                        <p className="font-semibold text-gray-600">No alerts right now</p>
                    </div>
                ) : (
                    insights.map(insight => {
                        const style = TYPE_STYLE[insight.type];
                        return (
                            <div key={insight.id}
                                className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors group"
                                style={{ borderLeft: `3px solid ${style.border}` }}>
                                {/* Icon */}
                                <div className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-[13px] font-bold text-gray-900 leading-tight">{insight.title}</p>
                                        {insight.value && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                                                style={{ backgroundColor: style.badge, color: style.text }}>
                                                {insight.value}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{insight.detail}</p>
                                    {insight.href && insight.action && (
                                        <Link href={insight.href}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold mt-1.5 transition-colors"
                                            style={{ color: style.border }}>
                                            {insight.action} <FiChevronRight size={10} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {lastUpdated && !loading && (
                <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                        Last updated: {lastUpdated.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 5 min
                    </span>
                    <Link href="/dashboard/analytics"
                        className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1">
                        Full Analytics <FiChevronRight size={9} />
                    </Link>
                </div>
            )}
        </div>
    );
}
