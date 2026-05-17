'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSend, FiUsers, FiAlertTriangle, FiCheck, FiSearch, FiX,
    FiMessageSquare, FiInfo,
} from 'react-icons/fi';
import { StudentAvatar, MESSAGE_TEMPLATES, QUICK_TEMPLATES } from './page';

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
interface Stream { id: number; stream_name: string; }
interface SchoolDetails { id: number; school_name?: string; [key: string]: any; }

interface ComposeTabProps {
    students: Student[];
    forms: Form[];
    streams: Stream[];
    feeDefaulters: Student[];
    schoolDetails: SchoolDetails;
    fetchData: () => void;
    smsConfigured: boolean;
}

type Channel = 'sms' | 'whatsapp' | 'both';
type RecipientMode = 'all' | 'defaulters' | 'form' | 'stream' | 'individual';
type MessageType = 'Custom' | 'Fee Reminder' | 'Exam' | 'Meeting' | 'Emergency';

export default function ComposeTab({
    students, forms, streams, feeDefaulters, schoolDetails, fetchData, smsConfigured,
}: ComposeTabProps) {
    const [channel, setChannel] = useState<Channel>('sms');
    const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [selectedStreamId, setSelectedStreamId] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
    const [studentSearch, setStudentSearch] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('Custom');
    const [sending, setSending] = useState(false);

    // ── Derived recipients ────────────────────────────────────────────────────
    const recipients = useMemo(() => {
        switch (recipientMode) {
            case 'all': return students.filter(s => s.guardian_phone);
            case 'defaulters': return feeDefaulters;
            case 'form': return students.filter(s => String(s.form_id) === selectedFormId && s.guardian_phone);
            case 'stream': return students.filter(s => String(s.stream_id) === selectedStreamId && s.guardian_phone);
            case 'individual': return students.filter(s => selectedStudentIds.has(s.id) && s.guardian_phone);
            default: return [];
        }
    }, [recipientMode, students, feeDefaulters, selectedFormId, selectedStreamId, selectedStudentIds]);

    // ── Filtered student list for individual picker ───────────────────────────
    const filteredStudents = useMemo(() => {
        if (!studentSearch) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(s =>
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
            s.admission_number.toLowerCase().includes(q)
        );
    }, [students, studentSearch]);

    const toggleStudent = (id: number) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getFormName = (formId: number | null) => forms.find(f => f.id === formId)?.form_name || '';
    const getStreamName = (streamId: number | null) => streams.find(s => s.id === streamId)?.stream_name || '';

    const getRecipientsLabel = () => {
        switch (recipientMode) {
            case 'all': return 'All Parents';
            case 'defaulters': return 'Fee Defaulters';
            case 'form': return `Form ${forms.find(f => String(f.id) === selectedFormId)?.form_name || ''}`;
            case 'stream': return `Stream ${streams.find(s => String(s.id) === selectedStreamId)?.stream_name || ''}`;
            case 'individual': return `${selectedStudentIds.size} Selected Students`;
            default: return 'Custom';
        }
    };

    // ── Send handler ──────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!message.trim()) return toast.error('Please enter a message');
        if (recipients.length === 0) return toast.error('No recipients with phone numbers selected');

        setSending(true);
        let sent = 0, failed = 0;

        for (const student of recipients) {
            if (!student.guardian_phone) { failed++; continue; }

            // Personalise message
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
                        body: JSON.stringify({ phone: student.guardian_phone, message: personalised, studentId: student.id, messageType }),
                    });
                    const result = await res.json();
                    result.success ? sent++ : failed++;
                } catch { failed++; }
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
                } catch { if (channel === 'whatsapp') failed++; }
            }
        }

        // Log to school_message_logs
        try {
            await supabase.from('school_message_logs').insert({
                message,
                recipients: getRecipientsLabel(),
                recipient_count: recipients.length,
                status: failed === 0 ? 'Sent' : sent === 0 ? 'Failed' : 'Partial',
                sent_by: 'Admin',
                sent_at: new Date().toISOString(),
                message_type: channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
                cost: sent * 1.0,
                created_at: new Date().toISOString(),
            });
        } catch (e) {
            console.warn('Failed to log message:', e);
        }

        if (failed === 0) {
            toast.success(`✅ Sent to ${sent} parent${sent !== 1 ? 's' : ''}`);
        } else if (sent > 0) {
            toast.success(`⚠️ Sent: ${sent} | Failed: ${failed}`);
        } else {
            toast.error(`❌ All ${failed} messages failed`);
        }

        setMessage('');
        setSelectedStudentIds(new Set());
        fetchData();
        setSending(false);
    };

    const showSmsWarning = !smsConfigured && (channel === 'sms' || channel === 'both');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ══ Compose Panel ══ */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-3 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white" />
                    <FiSend size={18} className="text-white" />
                    <div>
                        <h3 className="text-sm font-bold text-white">✉️ Compose Message</h3>
                        <p className="text-white/60 text-[10px]">
                            Use {'{student_name}'}, {'{balance}'}, {'{term}'}, {'{school_name}'}, {'{admission_no}'} as placeholders
                        </p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* SMS warning */}
                    {showSmsWarning && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                            <FiAlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                                <strong>SMS not configured.</strong> Go to the ⚙️ SMS Config tab to set up AfricasTalking credentials.
                            </p>
                        </div>
                    )}

                    {/* Channel selector */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">📡 Send Via</label>
                        <div className="flex gap-2">
                            {([
                                { k: 'sms', l: '💬 SMS' },
                                { k: 'whatsapp', l: '🟢 WhatsApp' },
                                { k: 'both', l: '📡 Both' },
                            ] as const).map(ch => (
                                <button key={ch.k} onClick={() => setChannel(ch.k)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${channel === ch.k ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200'}`}>
                                    {ch.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recipient mode */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">👥 Recipients</label>
                        <div className="flex flex-wrap gap-2">
                            {([
                                { k: 'all', l: `All Students (${students.filter(s => s.guardian_phone).length})` },
                                { k: 'defaulters', l: `Fee Defaulters (${feeDefaulters.length})`, danger: true },
                                { k: 'form', l: 'By Form' },
                                { k: 'stream', l: 'By Stream' },
                                { k: 'individual', l: 'Individual' },
                            ] as const).map(m => (
                                <button key={m.k} onClick={() => setRecipientMode(m.k)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                                        recipientMode === m.k
                                            ? (m as any).danger ? 'bg-red-600 text-white border-red-600' : 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200'
                                    }`}>
                                    {m.l}
                                </button>
                            ))}
                        </div>

                        {/* Form dropdown */}
                        {recipientMode === 'form' && (
                            <select value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)}
                                className="mt-2 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                                aria-label="Select form">
                                <option value="">— Select Form —</option>
                                {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                            </select>
                        )}

                        {/* Stream dropdown */}
                        {recipientMode === 'stream' && (
                            <select value={selectedStreamId} onChange={e => setSelectedStreamId(e.target.value)}
                                className="mt-2 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                                aria-label="Select stream">
                                <option value="">— Select Stream —</option>
                                {streams.map(s => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Quick templates */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">⚡ Quick Templates</label>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_TEMPLATES.map(t => (
                                <button key={t.key}
                                    onClick={() => {
                                        setMessage(MESSAGE_TEMPLATES[t.key as keyof typeof MESSAGE_TEMPLATES] || '');
                                        if (t.key.includes('fee') || t.key.includes('overdue')) setMessageType('Fee Reminder');
                                        else if (t.key.includes('exam')) setMessageType('Exam');
                                        else if (t.key.includes('meeting')) setMessageType('Meeting');
                                        else if (t.key.includes('emergency')) setMessageType('Emergency');
                                        else setMessageType('Custom');
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition hover:opacity-80 text-white"
                                    style={{ background: t.color }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message type */}
                    <div className="flex gap-2 flex-wrap">
                        {(['Custom', 'Fee Reminder', 'Exam', 'Meeting', 'Emergency'] as MessageType[]).map(t => (
                            <button key={t} onClick={() => setMessageType(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${messageType === t ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {t}
                            </button>
                        ))}
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
                            rows={5}
                            maxLength={1000}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                            placeholder="Dear Parent/Guardian of {student_name}, this is a message from {school_name}…"
                            aria-label="Message content"
                        />
                        {/* Variable hint */}
                        <div className="mt-1.5 flex items-start gap-1.5">
                            <FiInfo size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-gray-400">
                                Variables: <code className="bg-gray-100 px-1 rounded">{'{student_name}'}</code>{' '}
                                <code className="bg-gray-100 px-1 rounded">{'{balance}'}</code>{' '}
                                <code className="bg-gray-100 px-1 rounded">{'{term}'}</code>{' '}
                                <code className="bg-gray-100 px-1 rounded">{'{school_name}'}</code>{' '}
                                <code className="bg-gray-100 px-1 rounded">{'{admission_no}'}</code>
                            </p>
                        </div>
                    </div>

                    {/* Recipient count + Send button */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                            <FiUsers size={14} className="text-indigo-500" />
                            <span className="text-sm font-bold text-gray-700">
                                {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                            </span>
                            {recipients.length > 0 && (
                                <span className="text-[10px] text-gray-400">({getRecipientsLabel()})</span>
                            )}
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition shadow-md hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                            aria-label={`Send ${channel.toUpperCase()} to ${recipients.length} recipients`}>
                            {sending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <FiSend size={14} />
                                    Send {channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : 'Both'} to {recipients.length}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ══ Recipient Picker ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {recipientMode === 'individual' ? '👤 Pick Students' : '📋 Recipients Preview'}
                    </p>
                    <span className="text-[10px] font-bold text-indigo-600">{recipients.length} selected</span>
                </div>

                {/* Individual search */}
                {recipientMode === 'individual' && (
                    <div className="px-3 pt-3">
                        <div className="relative">
                            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                placeholder="Search by name or admission no…"
                                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-300 transition-all"
                                aria-label="Search students"
                            />
                            {studentSearch && (
                                <button onClick={() => setStudentSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                    <FiX size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="max-h-[480px] overflow-y-auto p-2 space-y-1">
                    {recipientMode === 'individual' ? (
                        filteredStudents.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">
                                <FiMessageSquare size={28} className="mx-auto mb-2 text-gray-200" />
                                <p className="text-xs">No students found</p>
                            </div>
                        ) : filteredStudents.map(s => {
                            const isSelected = selectedStudentIds.has(s.id);
                            return (
                                <button key={s.id} onClick={() => toggleStudent(s.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                    aria-pressed={isSelected}
                                    aria-label={`${isSelected ? 'Deselect' : 'Select'} ${s.first_name} ${s.last_name}`}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                        {isSelected && <FiCheck size={10} className="text-white" />}
                                    </div>
                                    <StudentAvatar name={`${s.first_name} ${s.last_name}`} size={28} />
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="font-bold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {getFormName(s.form_id)} {getStreamName(s.stream_id)} · {s.guardian_phone || 'No phone'}
                                        </p>
                                    </div>
                                    {(s.fee_balance || 0) > 0 && (
                                        <span className="text-[10px] font-bold text-red-500 flex-shrink-0">
                                            ⚠️ KES {(s.fee_balance || 0).toLocaleString()}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        recipients.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">
                                <FiUsers size={28} className="mx-auto mb-2 text-gray-200" />
                                <p className="text-xs">No recipients match the current filter</p>
                            </div>
                        ) : recipients.slice(0, 50).map(s => (
                            <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                                <StudentAvatar name={`${s.first_name} ${s.last_name}`} size={28} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 text-xs truncate">{s.first_name} {s.last_name}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{s.guardian_phone}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {recipientMode !== 'individual' && recipients.length > 50 && (
                        <p className="text-center text-[10px] text-gray-400 py-2">
                            +{recipients.length - 50} more recipients
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
