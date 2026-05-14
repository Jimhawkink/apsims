'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiPrinter, FiDownload, FiSend, FiCheckCircle, FiAlertTriangle,
    FiClock, FiUser, FiPhone, FiArrowLeft, FiX, FiPlus, FiList, FiBarChart2,
    FiCalendar, FiShield, FiActivity, FiMapPin, FiRefreshCw, FiMessageSquare,
    FiAlertCircle, FiTrendingUp, FiEye
} from 'react-icons/fi';

import IssueLeaveTab from './IssueLeaveTab';
import ActiveLeavesTab from './ActiveLeavesTab';
import LeaveReportsTab from './LeaveReportsTab';

const LEAVE_REASONS = ['Medication', 'Discipline', 'Personal', 'Emergency', 'Appointment', 'Illness', 'Family', 'Other'];

type LeaveTab = 'issue' | 'active' | 'reports';

export default function LeaveOutPage() {
    const [activeTab, setActiveTab] = useState<LeaveTab>('issue');
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [leaveOuts, setLeaveOuts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());

    // Live clock for duration counters
    useEffect(() => {
        const iv = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(iv);
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, t, f, st, lo] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_leave_outs').select('*, school_students(id, first_name, last_name, admission_number, form_id, stream_id, guardian_phone, guardian_name)').order('created_at', { ascending: false }).limit(500),
        ]);
        setStudents(s.data || []);
        setTeachers(t.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setLeaveOuts(lo.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── Computed Stats ───
    const activeLeaves = useMemo(() => leaveOuts.filter(l => l.status === 'Out'), [leaveOuts]);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLeaves = useMemo(() => leaveOuts.filter(l => new Date(l.created_at).toISOString().split('T')[0] === todayStr), [leaveOuts, todayStr]);
    const todayReturned = useMemo(() => todayLeaves.filter(l => l.status === 'Returned'), [todayLeaves]);
    const smsSent = useMemo(() => todayLeaves.filter(l => l.sms_sent), [todayLeaves]);

    const overdueLeaves = useMemo(() => activeLeaves.filter(l => {
        const mins = Math.round((now - new Date(l.time_left).getTime()) / 60000);
        return mins > 180; // Over 3 hours
    }), [activeLeaves, now]);

    const reasonStats: Record<string, number> = {};
    todayLeaves.forEach(l => { reasonStats[l.reason] = (reasonStats[l.reason] || 0) + 1; });
    const topReason = Object.entries(reasonStats).sort((a, b) => b[1] - a[1])[0];

    // Week stats
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekLeaves = leaveOuts.filter(l => new Date(l.created_at) >= weekAgo);
    const avgDaily = weekLeaves.length > 0 ? Math.round(weekLeaves.length / 7 * 10) / 10 : 0;

    // ─── Shared Handlers ───
    const handleMarkReturned = async (leaveId: number) => {
        const { error } = await (supabase.from('school_leave_outs') as any)
            .update({ status: 'Returned', time_returned: new Date().toISOString() })
            .eq('id', leaveId);
        if (error) { toast.error('Failed to mark returned'); return; }
        toast.success('Student marked as returned ✅');
        fetchAll();
    };

    const handleSendSMS = async (leave: any) => {
        const student = leave.student || leave.school_students;
        const phone = student?.guardian_phone || leave.sms_phone || '';
        if (!phone) { toast.error('No guardian phone number available'); return; }

        const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
        const admNo = student?.admission_number || '';
        const time = new Date(leave.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        const msg = `APSIMS: Dear parent/guardian, ${name} (${admNo}) has been given leave out at ${time}. Reason: ${leave.reason}${leave.reason_details ? ' - ' + leave.reason_details : ''}. Please ensure they arrive home safely.`;

        try {
            const res = await fetch('/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, message: msg }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`SMS sent to ${phone} ✅`, { duration: 4000 });
                await (supabase.from('school_leave_outs') as any).update({ sms_sent: true }).eq('id', leave.id);
                fetchAll();
            } else {
                toast.error(`SMS failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('SMS error:', err);
            toast.error('Failed to send SMS. Check network.');
        }
    };

    const TABS: { key: LeaveTab; label: string; icon: any; desc: string; count?: number }[] = [
        { key: 'issue', label: 'Issue Leave', icon: FiPlus, desc: 'Create new leave pass' },
        { key: 'active', label: 'Active Leaves', icon: FiActivity, desc: 'Students currently out', count: activeLeaves.length },
        { key: 'reports', label: 'Reports & Analytics', icon: FiBarChart2, desc: 'Historical records' },
    ];

    // KPI data
    const kpis = [
        { label: 'Currently Out', value: activeLeaves.length, icon: FiMapPin, color: '#f97316', bg: 'linear-gradient(135deg, #f97316, #ea580c)', pulse: activeLeaves.length > 0 },
        { label: 'Today Issued', value: todayLeaves.length, icon: FiCalendar, color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
        { label: 'Returned Today', value: todayReturned.length, icon: FiCheckCircle, color: '#22c55e', bg: 'linear-gradient(135deg, #22c55e, #16a34a)' },
        { label: 'SMS Sent', value: smsSent.length, icon: FiMessageSquare, color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
        { label: 'Overdue (3h+)', value: overdueLeaves.length, icon: FiAlertTriangle, color: '#ef4444', bg: 'linear-gradient(135deg, #ef4444, #dc2626)', pulse: overdueLeaves.length > 0 },
        { label: 'Avg/Day (7d)', value: avgDaily, icon: FiTrendingUp, color: '#06b6d4', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
        { label: 'Top Reason', value: topReason ? topReason[1] : 0, icon: FiShield, color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', sub: topReason?.[0] || '-' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-orange-200 rounded-full" />
                    <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full animate-spin" />
                    <FiShield className="absolute inset-0 m-auto text-orange-500" size={20} />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading Leave Out System...</p>
                <p className="text-gray-400 text-xs mt-1">Syncing student records</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                            <FiShield className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                Leave Out Command Center
                                {activeLeaves.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse" style={{ background: 'rgba(249,115,22,0.3)', color: '#fdba74', border: '1px solid rgba(249,115,22,0.4)' }}>
                                        {activeLeaves.length} LIVE
                                    </span>
                                )}
                            </h1>
                            <p className="text-indigo-300 text-xs mt-0.5 font-medium">Issue passes • Track students • Auto-notify parents • Real-time analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchAll} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                        <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: '#c4b5fd' }}>
                            <FiClock className="inline mr-1" size={12} />
                            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* ─── KPI Command Strip ─── */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                        {kpis.map((k, i) => {
                            const Icon = k.icon;
                            return (
                                <div key={i} className={`relative rounded-xl p-3 overflow-hidden cursor-default group transition-all hover:scale-[1.03] hover:shadow-xl ${k.pulse ? 'animate-pulse' : ''}`}
                                    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: k.color, transform: 'translate(30%, -30%)' }} />
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${k.color}22` }}>
                                            <Icon size={12} style={{ color: k.color }} />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{k.label}</span>
                                    </div>
                                    <p className="text-xl font-black text-white">{k.value}</p>
                                    {(k as any).sub && <p className="text-[9px] text-white/40 font-medium mt-0.5">{(k as any).sub}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Reason Breakdown Mini Bar ─── */}
                {todayLeaves.length > 0 && (
                    <div className="px-6 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Today&apos;s Reasons</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>
                        <div className="flex gap-1.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            {LEAVE_REASONS.map(r => {
                                const count = reasonStats[r] || 0;
                                if (count === 0) return null;
                                const pct = (count / todayLeaves.length) * 100;
                                const colors: Record<string, string> = { Medication: '#3b82f6', Discipline: '#ef4444', Personal: '#8b5cf6', Emergency: '#f97316', Appointment: '#06b6d4', Illness: '#22c55e', Family: '#f59e0b', Other: '#6b7280' };
                                return <div key={r} style={{ width: `${pct}%`, background: colors[r] || '#6b7280', borderRadius: 4 }} title={`${r}: ${count}`} />;
                            })}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2">
                            {LEAVE_REASONS.map(r => {
                                const count = reasonStats[r] || 0;
                                if (count === 0) return null;
                                const colors: Record<string, string> = { Medication: '#3b82f6', Discipline: '#ef4444', Personal: '#8b5cf6', Emergency: '#f97316', Appointment: '#06b6d4', Illness: '#22c55e', Family: '#f59e0b', Other: '#6b7280' };
                                return (
                                    <span key={r} className="flex items-center gap-1 text-[10px] text-white/60 font-medium">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors[r] }} />
                                        {r}: {count}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ TAB NAVIGATION ═══ */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all relative overflow-hidden"
                            style={isActive ? {
                                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                color: '#fff',
                                boxShadow: '0 8px 25px -5px rgba(249,115,22,0.4)',
                            } : {
                                background: '#fff',
                                color: '#6b7280',
                                border: '1px solid #e5e7eb',
                            }}>
                            {isActive && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.4), transparent 60%)' }} />}
                            <Icon size={15} />
                            <span className="relative">{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black min-w-[18px] text-center"
                                    style={isActive ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: '#fee2e2', color: '#dc2626' }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ═══ TAB CONTENT ═══ */}
            {activeTab === 'issue' && (
                <IssueLeaveTab
                    students={students} teachers={teachers} forms={forms} streams={streams}
                    leaveOuts={leaveOuts} fetchAll={fetchAll} handleSendSMS={handleSendSMS}
                />
            )}

            {activeTab === 'active' && (
                <ActiveLeavesTab
                    activeLeaves={activeLeaves} forms={forms} streams={streams} now={now}
                    handleMarkReturned={handleMarkReturned} handleSendSMS={handleSendSMS}
                />
            )}

            {activeTab === 'reports' && (
                <LeaveReportsTab
                    leaveOuts={leaveOuts} forms={forms} streams={streams}
                    LEAVE_REASONS={LEAVE_REASONS}
                />
            )}
        </div>
    );
}
