'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSend, FiMessageSquare, FiSettings, FiClock, FiUsers,
    FiAlertTriangle, FiCheck, FiX, FiRefreshCw, FiPlus,
    FiSearch, FiChevronLeft, FiChevronRight, FiSave, FiZap,
    FiPhone, FiMail, FiInfo, FiCheckCircle, FiDollarSign,
} from 'react-icons/fi';

import ComposeTab from './ComposeTab';
import BulkBlastTab from './BulkBlastTab';
import HistoryTab from './HistoryTab';
import ConfigTab from './ConfigTab';
// helpers imported by sub-components via ./helpers

export default function CommunicationHubPage() {
    const [tab, setTab] = useState<'compose' | 'blast' | 'history' | 'config'>('compose');
    const [loading, setLoading] = useState(true);

    // Core data
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [messageLogs, setMessageLogs] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [studentsRes, formsRes, streamsRes, logsRes, detailsRes] = await Promise.all([
                supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id, stream_id, guardian_name, guardian_phone, guardian_email, status, fee_balance').eq('status', 'Active'),
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_streams').select('*').order('stream_name'),
                supabase.from('school_message_logs').select('*').order('created_at', { ascending: false }).limit(500),
                supabase.from('school_details').select('*').limit(1).single(),
            ]);
            setStudents(studentsRes.data || []);
            setForms(formsRes.data || []);
            setStreams(streamsRes.data || []);
            setMessageLogs(logsRes.data || []);
            if (detailsRes.data) setSchoolDetails(detailsRes.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Derived stats
    const parentsWithPhone = useMemo(() => students.filter(s => s.guardian_phone), [students]);
    const feeDefaulters = useMemo(() => students.filter(s => (s.fee_balance || 0) > 0 && s.guardian_phone), [students]);
    const smsSent = messageLogs.filter(l => l.message_type === 'sms' || l.message_type === 'SMS').length;
    const waSent = messageLogs.filter(l => l.message_type === 'whatsapp' || l.message_type === 'WhatsApp').length;
    const totalSent = messageLogs.length;
    const smsConfigured = !!(schoolDetails.sms_api_key && schoolDetails.sms_username);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📡</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Communication Hub…</p>
        </div>
    );

    return (
        <div className="space-y-5" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <FiMessageSquare className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                📡 Communication Hub
                                {feeDefaulters.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                                        {feeDefaulters.length} DEFAULTERS
                                    </span>
                                )}
                            </h1>
                            <p className="text-indigo-300 text-xs mt-0.5 font-medium">SMS via AfricasTalking · WhatsApp · Bulk Blast · Auto-Reminders</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border ${smsConfigured ? 'text-green-300 border-green-500/30' : 'text-amber-300 border-amber-500/30'}`} style={{ background: smsConfigured ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)' }}>
                            💬 SMS {smsConfigured ? '✅' : '⚠️'}
                        </span>
                        <button onClick={fetchData} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ─── KPI Command Strip ─── */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Students', value: students.length, emoji: '🎓', color: '#6366f1' },
                            { label: 'Parents w/ Phone', value: parentsWithPhone.length, emoji: '📱', color: '#0891b2' },
                            { label: 'Fee Defaulters', value: feeDefaulters.length, emoji: '⚠️', color: '#ef4444', pulse: feeDefaulters.length > 0 },
                            { label: 'SMS Sent', value: smsSent, emoji: '💬', color: '#4338ca' },
                            { label: 'WhatsApp Sent', value: waSent, emoji: '🟢', color: '#15803d' },
                            { label: 'Total Messages', value: totalSent, emoji: '📊', color: '#c2410c' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden cursor-default group transition-all hover:scale-[1.03] ${(card as any).pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: card.color, transform: 'translate(30%, -30%)' }} />
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">{card.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Tab Navigation ─── */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { k: 'compose', l: '✉️ Compose', icon: FiSend },
                    { k: 'blast', l: '🚀 Bulk Blast', icon: FiZap },
                    { k: 'history', l: '📋 History', icon: FiClock },
                    { k: 'config', l: '⚙️ SMS Config', icon: FiSettings },
                ].map(t => {
                    const isActive = tab === t.k;
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k as any)}
                            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all relative overflow-hidden"
                            style={isActive ? {
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)',
                            } : {
                                background: '#fff',
                                color: '#6b7280',
                                border: '1px solid #e5e7eb',
                            }}>
                            {isActive && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.4), transparent 60%)' }} />}
                            <Icon size={15} />
                            <span className="relative">{t.l}</span>
                        </button>
                    );
                })}
            </div>

            {/* ─── Tab Content ─── */}
            {tab === 'compose' && (
                <ComposeTab
                    students={students} forms={forms} streams={streams}
                    feeDefaulters={feeDefaulters} schoolDetails={schoolDetails}
                    fetchData={fetchData} smsConfigured={smsConfigured}
                />
            )}
            {tab === 'blast' && (
                <BulkBlastTab
                    students={students} forms={forms} feeDefaulters={feeDefaulters}
                    schoolDetails={schoolDetails} fetchData={fetchData} smsConfigured={smsConfigured}
                />
            )}
            {tab === 'history' && (
                <HistoryTab messageLogs={messageLogs} fetchData={fetchData} />
            )}
            {tab === 'config' && (
                <ConfigTab schoolDetails={schoolDetails} fetchData={fetchData} />
            )}
        </div>
    );
}
