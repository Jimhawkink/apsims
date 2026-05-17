'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiZap, FiUsers, FiAlertTriangle, FiCheckCircle,
} from 'react-icons/fi';
import { MESSAGE_TEMPLATES, QUICK_TEMPLATES } from './page';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    admission_number: string;
    form_id: number | null;
    stream_id: number | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    status: string;
    fee_balance?: number;
}

interface Form { id: number; form_name: string; form_level: number; }
interface SchoolDetails { id: number; school_name?: string; [key: string]: any; }

interface BulkBlastTabProps {
    students: Student[];
    forms: Form[];
    feeDefaulters: Student[];
    schoolDetails: SchoolDetails;
    fetchData: () => void;
    smsConfigured: boolean;
}

type Audience = 'defaulters' | 'all' | 'form';
type Channel = 'sms' | 'whatsapp' | 'both';

export default function BulkBlastTab({
    students, forms, feeDefaulters, schoolDetails, fetchData, smsConfigured,
}: BulkBlastTabProps) {
    const [audience, setAudience] = useState<Audience>('defaulters');
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [channel, setChannel] = useState<Channel>('sms');
    const [message, setMessage] = useState('');
    const [blasting, setBlasting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [blastResult, setBlastResult] = useState<{ sent: number; failed: number } | null>(null);

    // ── Derived recipients ────────────────────────────────────────────────────
    const recipients = useMemo(() => {
        switch (audience) {
            case 'defaulters': return feeDefaulters;
            case 'all': return students.filter(s => s.guardian_phone);
            case 'form': return students.filter(s => String(s.form_id) === selectedFormId && s.guardian_phone);
            default: return [];
        }
    }, [audience, students, feeDefaulters, selectedFormId]);

    // ── Preview with school_name substituted ─────────────────────────────────
    const preview = message.replace(/\{school_name\}/g, schoolDetails.school_name || 'School');

    const showSmsWarning = !smsConfigured && (channel === 'sms' || channel === 'both');

    // ── Blast handler ─────────────────────────────────────────────────────────
    const handleBlast = async () => {
        if (!message.trim()) return toast.error('Please enter or select a message template');
        if (recipients.length === 0) return toast.error('No recipients found for the selected audience');

        setBlasting(true);
        setProgress(0);
        setBlastResult(null);
        let sent = 0, failed = 0;

        for (let i = 0; i < recipients.length; i++) {
            const student = recipients[i];
            if (!student.guardian_phone) { failed++; setProgress(i + 1); continue; }

            // Personalise
            const personalised = message
                .replace(/\{student_name\}/g, `${student.first_name} ${student.last_name}`)
                .replace(/\{admission_no\}/g, student.admission_number)
                .replace(/\{balance\}/g, String(student.fee_balance || 0))
                .replace(/\{school_name\}/g, schoolDetails.school_name || 'School')
                .replace(/\{term\}/g, 'Current Term');

            // SMS
            if (channel === 'sms' || channel === 'both') {
                try {
                    const res = await fetch('/api/sms/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: student.guardian_phone, message: personalised, studentId: student.id, messageType: 'Blast' }),
                    });
                    const result = await res.json();
                    if (channel === 'sms') result.success ? sent++ : failed++;
                    else if (result.success) sent++;
                } catch { if (channel === 'sms') failed++; }
            }

            // WhatsApp
            if (channel === 'whatsapp' || channel === 'both') {
                try {
                    const res = await fetch('/api/whatsapp/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: student.guardian_phone, message: personalised }),
                    });
                    const result = await res.json();
                    if (channel === 'whatsapp') result.success ? sent++ : failed++;
                    else if (!result.success) failed++;
                } catch { if (channel === 'whatsapp') failed++; }
            }

            setProgress(i + 1);
        }

        // Determine final status
        const finalStatus = failed === 0 ? 'Sent' : sent === 0 ? 'Failed' : 'Partial';

        // Log summary
        try {
            await supabase.from('school_message_logs').insert({
                message,
                recipients: audience === 'defaulters' ? 'Fee Defaulters' : audience === 'all' ? 'All Parents' : `Form ${forms.find(f => String(f.id) === selectedFormId)?.form_name || ''}`,
                recipient_count: recipients.length,
                status: finalStatus,
                sent_by: 'Admin Blast',
                sent_at: new Date().toISOString(),
                message_type: channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
                cost: sent * 1.0,
                created_at: new Date().toISOString(),
            });
        } catch (e) {
            console.warn('Failed to log blast:', e);
        }

        setBlastResult({ sent, failed });

        if (failed === 0) {
            toast.success(`🚀 Blast complete! Sent to ${sent} parent${sent !== 1 ? 's' : ''}`);
        } else if (sent > 0) {
            toast.success(`⚠️ Blast done — Sent: ${sent} | Failed: ${failed}`);
        } else {
            toast.error(`❌ Blast failed for all ${failed} recipients`);
        }

        fetchData();
        setBlasting(false);
    };

    const progressPct = recipients.length > 0 ? Math.round((progress / recipients.length) * 100) : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ══ Blast Config Panel ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-3 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                    <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white" />
                    <FiZap size={18} className="text-white" />
                    <div>
                        <h3 className="text-sm font-bold text-white">🚀 Bulk Blast</h3>
                        <p className="text-white/60 text-[10px]">Send templated messages to many parents at once</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* SMS warning */}
                    {showSmsWarning && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                            <FiAlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                                <strong>SMS not configured.</strong> Go to the ⚙️ SMS Config tab first.
                            </p>
                        </div>
                    )}

                    {/* Audience */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">🎯 Target Audience</label>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setAudience('defaulters')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${audience === 'defaulters' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-200'}`}>
                                ⏰ Fee Defaulters ({feeDefaulters.length})
                            </button>
                            <button onClick={() => setAudience('all')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${audience === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200'}`}>
                                👥 All Parents ({students.filter(s => s.guardian_phone).length})
                            </button>
                            <button onClick={() => setAudience('form')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${audience === 'form' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200'}`}>
                                📚 By Form
                            </button>
                        </div>

                        {audience === 'form' && (
                            <select value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)}
                                className="mt-2 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                                aria-label="Select form for blast">
                                <option value="">— Select Form —</option>
                                {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                            </select>
                        )}

                        {/* Recipient count */}
                        <div className="mt-2 flex items-center gap-2">
                            <FiUsers size={13} className="text-indigo-500" />
                            <span className="text-xs font-bold text-gray-700">
                                {recipients.length} parent{recipients.length !== 1 ? 's' : ''} will receive this message
                            </span>
                        </div>
                    </div>

                    {/* Channel */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">📡 Channel</label>
                        <div className="flex gap-2">
                            {([
                                { k: 'sms', l: '💬 SMS' },
                                { k: 'whatsapp', l: '🟢 WhatsApp' },
                                { k: 'both', l: '📡 Both' },
                            ] as const).map(ch => (
                                <button key={ch.k} onClick={() => setChannel(ch.k)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${channel === ch.k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200'}`}>
                                    {ch.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick templates */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">📝 Message Template</label>
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_TEMPLATES.map(t => {
                                const tmplText = MESSAGE_TEMPLATES[t.key as keyof typeof MESSAGE_TEMPLATES] || '';
                                const isActive = message === tmplText && tmplText !== '';
                                return (
                                    <button key={t.key}
                                        onClick={() => setMessage(tmplText)}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border text-left ${isActive ? 'text-white border-transparent shadow' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200'}`}
                                        style={isActive ? { background: t.color } : {}}>
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Message textarea */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Message</label>
                            <span className="text-[10px] text-gray-400">{message.length}/1000</span>
                        </div>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                            placeholder="Select a template above or type a custom message…"
                            aria-label="Blast message content"
                        />
                    </div>

                    {/* Progress bar */}
                    {blasting && (
                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-indigo-700">
                                    🚀 Sending… {progress}/{recipients.length}
                                </p>
                                <p className="text-xs text-indigo-600">{progressPct}%</p>
                            </div>
                            <div className="w-full bg-indigo-200 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                    role="progressbar"
                                    aria-valuenow={progressPct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            </div>
                        </div>
                    )}

                    {/* Blast result */}
                    {blastResult && !blasting && (
                        <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                            blastResult.failed === 0 ? 'bg-green-50 border-green-200' :
                            blastResult.sent === 0 ? 'bg-red-50 border-red-200' :
                            'bg-amber-50 border-amber-200'
                        }`}>
                            <FiCheckCircle size={14} className={blastResult.failed === 0 ? 'text-green-600' : blastResult.sent === 0 ? 'text-red-600' : 'text-amber-600'} />
                            <div>
                                <p className={`text-xs font-bold ${blastResult.failed === 0 ? 'text-green-800' : blastResult.sent === 0 ? 'text-red-800' : 'text-amber-800'}`}>
                                    Blast Complete
                                </p>
                                <p className="text-xs mt-0.5">
                                    ✅ Sent: <strong>{blastResult.sent}</strong>
                                    {blastResult.failed > 0 && <> · ❌ Failed: <strong>{blastResult.failed}</strong></>}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Blast button */}
                    <button
                        onClick={handleBlast}
                        disabled={blasting}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                        aria-label={`Blast to ${recipients.length} parents`}>
                        {blasting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Blasting…
                            </>
                        ) : (
                            <>
                                <FiZap size={14} />
                                🚀 Blast to {recipients.length} Parent{recipients.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ══ Preview Panel ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📱 Message Preview</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">How the message will appear to parents</p>
                </div>

                <div className="p-4 space-y-4">
                    {/* Phone mockup */}
                    <div className="mx-auto max-w-[260px]">
                        <div className="bg-gray-900 rounded-3xl p-3 shadow-xl">
                            <div className="bg-gray-800 rounded-2xl p-3 min-h-[200px]">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                        {(schoolDetails.school_name || 'S').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-bold">{schoolDetails.school_name || 'School'}</p>
                                        <p className="text-gray-400 text-[10px]">SMS</p>
                                    </div>
                                </div>
                                <div className="bg-indigo-600 rounded-2xl rounded-tl-sm p-3">
                                    <p className="text-white text-xs leading-relaxed">
                                        {preview || 'Select a template or type a message to preview it here…'}
                                    </p>
                                </div>
                                <p className="text-gray-500 text-[10px] mt-2 text-right">
                                    {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                            <p className="text-xl font-black text-indigo-700">{recipients.length}</p>
                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Recipients</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
                            <p className="text-xl font-black text-purple-700">{message.length}</p>
                            <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Characters</p>
                        </div>
                    </div>

                    {/* Audience breakdown */}
                    {recipients.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sample Recipients</p>
                            {recipients.slice(0, 5).map(s => (
                                <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold flex-shrink-0">
                                        {s.first_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">{s.first_name} {s.last_name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{s.guardian_phone}</p>
                                    </div>
                                </div>
                            ))}
                            {recipients.length > 5 && (
                                <p className="text-[10px] text-gray-400 text-center">+{recipients.length - 5} more</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
