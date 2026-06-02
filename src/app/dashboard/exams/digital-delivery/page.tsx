'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiSend, FiDownload, FiSearch, FiCheckCircle, FiUsers,
    FiMessageSquare, FiRefreshCw, FiSmartphone, FiArrowRight,
    FiCopy, FiShield, FiExternalLink, FiPrinter, FiZap
} from 'react-icons/fi';

function generateQRCode(text: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=1e40af&qzone=2`;
}

function generateToken(studentId: number, termId: number): string {
    const raw = `APSIMS-${studentId}-${termId}-${Math.floor(Date.now() / 86400000)}`;
    return btoa(raw).replace(/[^A-Z0-9]/gi, '').slice(0, 14).toUpperCase();
}

export default function DigitalDeliveryPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedForm, setSelectedForm] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [results, setResults] = useState<any[]>([]);
    const [tab, setTab] = useState<'send' | 'preview' | 'logs'>('send');
    const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'both'>('whatsapp');
    const [sentLog, setSentLog] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [studRes, termRes, formRes, etRes, sdRes, logRes] = await Promise.all([
            supabase.from('school_students')
                .select('id,first_name,last_name,admission_no,admission_number,guardian_phone,guardian_name,form_id,stream_id,school_forms(form_name,form_level),school_streams(stream_name)')
                .order('first_name').limit(5000),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_exam_types').select('*').eq('is_active', true).order('id'),
            supabase.from('school_details').select('school_name,school_phone,school_email,principal_name').single(),
            supabase.from('school_communication_logs').select('*').eq('type', 'report_card')
                .order('created_at', { ascending: false }).limit(100),
        ]);
        setStudents(studRes.data || []);
        setTerms(termRes.data || []);
        setForms(formRes.data || []);
        setExamTypes(etRes.data || []);
        setSchoolDetails(sdRes.data);
        setSentLog(logRes.data || []);
        if (termRes.data?.[0]) setSelectedTerm(String(termRes.data[0].id));
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = students.filter(s => {
        if (selectedForm !== 'all' && String(s.form_id) !== selectedForm) return false;
        const q = search.toLowerCase();
        return !q || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
            (s.admission_no || s.admission_number || '').toLowerCase().includes(q);
    });

    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map(s => s.id)));
    };
    const toggleOne = (id: number) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const selectedTermData = terms.find(t => String(t.id) === selectedTerm);
    const schoolName = schoolDetails?.school_name || 'APSIMS School';

    const buildMessage = (student: any, token: string, verifyUrl: string) => {
        const name = `${student.first_name} ${student.last_name}`;
        const adm = student.admission_no || student.admission_number;
        const form = student.school_forms?.form_name || '';
        const termLabel = selectedTermData ? `${selectedTermData.term_name || 'Term'} ${selectedTermData.year || ''}` : 'Current Term';
        if (channel === 'sms' || channel === 'both') {
            return `Dear Parent/Guardian of ${name} (${adm}), ${form} ${termLabel} report card is ready. View at: ${verifyUrl} Code: ${token}. ${schoolName} Accounts.`;
        }
        return `📊 *Report Card Ready!*\n\nDear Parent of *${name}* (${adm})\n\n📚 *${form}* — ${termLabel}\n\n🔗 View Report Card:\n${verifyUrl}\n\n🔐 Verification Code:\n\`${token}\`\n\n_Scan the QR code to verify authenticity_\n\n— *${schoolName}*`;
    };

    const sendReportCards = async () => {
        if (selected.size === 0) { toast.error('Select at least one student'); return; }
        if (!selectedTerm) { toast.error('Select a term first'); return; }
        setSending(true); setSendProgress(0); setResults([]);

        const toSend = filtered.filter(s => selected.has(s.id));
        const res: any[] = [];
        const origin = window.location.origin;

        for (let i = 0; i < toSend.length; i++) {
            const student = toSend[i];
            const token = generateToken(student.id, Number(selectedTerm));
            const verifyUrl = `${origin}/verify/${token}?sid=${student.id}&tid=${selectedTerm}`;
            const phone = student.guardian_phone;
            const message = buildMessage(student, token, verifyUrl);

            // Always log to DB
            await supabase.from('school_communication_logs').insert({
                type: 'report_card',
                channel: channel,
                student_id: student.id,
                recipient_name: `${student.first_name} ${student.last_name}`,
                phone: phone || null,
                message: message.slice(0, 200),
                verify_token: token,
                term_id: Number(selectedTerm),
                status: phone ? 'sent' : 'skipped',
                created_at: new Date().toISOString(),
            }).select();

            if (!phone) {
                res.push({ name: `${student.first_name} ${student.last_name}`, adm: student.admission_no || student.admission_number, phone: '—', status: 'skipped', reason: 'No phone', token, verifyUrl });
            } else {
                let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
                if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
                let status = 'failed';
                try {
                    if (channel === 'sms' || channel === 'both') {
                        await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: formattedPhone, message }) });
                    }
                    if (channel === 'whatsapp' || channel === 'both') {
                        await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: formattedPhone, message, student_id: student.id }) });
                    }
                    status = 'sent';
                } catch { status = 'failed'; }
                res.push({ name: `${student.first_name} ${student.last_name}`, adm: student.admission_no || student.admission_number, phone: formattedPhone, status, token, verifyUrl });
            }
            setSendProgress(Math.round(((i + 1) / toSend.length) * 100));
            await new Promise(r => setTimeout(r, 200));
        }

        setResults(res);
        setSending(false);
        const sent = res.filter(r => r.status === 'sent').length;
        toast.success(`Report cards delivered to ${sent}/${toSend.length} parents!`);
        loadData();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #3b82f6 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            <FiSend size={24} /> Digital Report Card Delivery
                        </h1>
                        <p className="text-blue-200 text-sm mt-1">Send term report cards to parents via WhatsApp & SMS with QR verification</p>
                        <div className="flex gap-3 mt-3">
                            <Link href="/dashboard/exams/report-cards"
                                className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold transition-all">
                                <FiPrinter size={12} /> Standard Report Cards
                            </Link>
                            <Link href="/dashboard/exams/ultra-report-cards"
                                className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold transition-all">
                                <FiZap size={12} /> Ultra Report Cards
                            </Link>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { label: 'Total Students', val: students.length },
                            { label: 'Have Phone', val: students.filter(s => s.guardian_phone).length },
                            { label: 'Sent Today', val: sentLog.filter(l => l.created_at?.startsWith(new Date().toISOString().split('T')[0])).length },
                            { label: 'All Time Sent', val: sentLog.filter(l => l.status === 'sent').length },
                        ].map(s => (
                            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center">
                                <p className="text-2xl font-black">{s.val}</p>
                                <p className="text-blue-200 text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {[{ key: 'send', label: '📤 Send to Parents' }, { key: 'preview', label: '🔐 QR Codes Preview' }, { key: 'logs', label: '📋 Delivery Logs' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-blue-700 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* SEND TAB */}
            {tab === 'send' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Config */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h2 className="font-bold text-gray-900">Delivery Settings</h2>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Select Term</label>
                            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Filter by Form</label>
                            <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="all">All Forms ({students.length} students)</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Delivery Channel</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['sms', 'whatsapp', 'both'] as const).map(ch => (
                                    <button key={ch} onClick={() => setChannel(ch)}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all ${channel === ch ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                        {ch === 'sms' ? '📱 SMS' : ch === 'whatsapp' ? '💬 WA' : '📡 Both'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {selectedTermData && (
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-700">📅 {selectedTermData.term_name} {selectedTermData.year}</p>
                                {selectedTermData.start_date && <p className="text-xs text-blue-500 mt-0.5">Opens: {selectedTermData.start_date}</p>}
                                {selectedTermData.end_date && <p className="text-xs text-blue-500">Closes: {selectedTermData.end_date}</p>}
                            </div>
                        )}
                        <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                            <p className="text-xs font-bold text-green-800 flex items-center gap-1.5"><FiShield size={12} /> QR Verification</p>
                            <p className="text-xs text-green-600 mt-1">Each message includes a unique QR code and token. Parents can scan to verify the report is authentic and from your school.</p>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-xs font-bold text-amber-800">📋 Already have report cards?</p>
                            <p className="text-xs text-amber-600 mt-1">Generate report cards first from the links above, then use this page to send to parents digitally.</p>
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input type="checkbox"
                                    checked={selected.size > 0 && selected.size === filtered.length}
                                    onChange={toggleAll}
                                    className="w-4 h-4 accent-blue-600" />
                                <span className="text-sm font-semibold text-gray-700">
                                    {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} students`}
                                </span>
                                {selected.size > 0 && (
                                    <button onClick={() => setSelected(new Set())} className="text-xs text-red-500 hover:underline">Clear</button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                <FiSearch size={13} className="text-gray-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search name or admission no..." className="text-sm outline-none bg-transparent w-44" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="flex-1 divide-y divide-gray-50 overflow-y-auto max-h-[420px]">
                                {filtered.map(s => (
                                    <label key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/30 cursor-pointer">
                                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)}
                                            className="w-4 h-4 accent-blue-600 flex-shrink-0" />
                                        <div className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #1d4ed8, #6366f1)' }}>
                                            {s.first_name?.[0]}{s.last_name?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm">{s.first_name} {s.last_name}</p>
                                            <p className="text-xs text-gray-400">{s.admission_no || s.admission_number} · {s.school_forms?.form_name} {s.school_streams?.stream_name}</p>
                                        </div>
                                        {s.guardian_phone ? (
                                            <span className="text-[11px] text-green-600 flex items-center gap-1 flex-shrink-0">
                                                <FiSmartphone size={10} /> {s.guardian_phone}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-red-400 flex-shrink-0">No phone</span>
                                        )}
                                    </label>
                                ))}
                                {filtered.length === 0 && (
                                    <div className="text-center py-10 text-gray-400">
                                        <FiUsers size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No students match your filters</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-4 border-t border-gray-100">
                            {!sending && results.length === 0 && (
                                <button onClick={sendReportCards} disabled={selected.size === 0 || !selectedTerm}
                                    className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                                    <FiSend size={16} /> Send to {selected.size || 0} Parent{selected.size !== 1 ? 's' : ''} via {channel === 'both' ? 'SMS + WhatsApp' : channel.toUpperCase()}
                                </button>
                            )}
                            {sending && (
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-semibold text-gray-700">Sending report cards…</span>
                                        <span className="text-blue-600 font-bold">{sendProgress}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${sendProgress}%`, background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)' }} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 text-center">Please wait — sending to each parent with a 200ms delay to avoid rate limits</p>
                                </div>
                            )}
                            {results.length > 0 && (
                                <div>
                                    <div className="flex gap-3 mb-3">
                                        {[
                                            { label: '✅ Sent', val: results.filter(r => r.status === 'sent').length, c: '#16a34a' },
                                            { label: '❌ Failed', val: results.filter(r => r.status === 'failed').length, c: '#dc2626' },
                                            { label: '⏭ Skipped', val: results.filter(r => r.status === 'skipped').length, c: '#d97706' },
                                        ].map(s => (
                                            <div key={s.label} className="flex-1 text-center p-2 bg-gray-50 rounded-xl">
                                                <p className="text-xl font-black" style={{ color: s.c }}>{s.val}</p>
                                                <p className="text-xs text-gray-500">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setTab('preview')} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                                            View QR Codes →
                                        </button>
                                        <button onClick={() => { setResults([]); setSendProgress(0); setSelected(new Set()); }}
                                            className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                                            Send Another
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* QR PREVIEW TAB */}
            {tab === 'preview' && (
                <div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5 flex items-start gap-3">
                        <FiShield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-blue-800">QR Verification System</p>
                            <p className="text-sm text-blue-600 mt-0.5">Each parent receives a unique token. When they scan the QR code or visit the link, they see a verification page confirming the report card is genuine and issued by your school. Tokens expire daily for security.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {(results.length > 0 ? results : filtered.slice(0, 10).map(s => ({
                            name: `${s.first_name} ${s.last_name}`,
                            adm: s.admission_no || s.admission_number,
                            phone: s.guardian_phone,
                            status: 'preview',
                            token: generateToken(s.id, Number(selectedTerm || 1)),
                            verifyUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${generateToken(s.id, Number(selectedTerm || 1))}?sid=${s.id}&tid=${selectedTerm}`,
                        }))).map((r, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="font-bold text-gray-900 text-xs mb-0.5 truncate">{r.name}</p>
                                <p className="text-[10px] text-gray-400 mb-2">{r.adm}</p>
                                <img src={generateQRCode(r.verifyUrl)} alt="QR" className="mx-auto w-24 h-24 rounded-xl mb-2 border border-gray-100" />
                                <div className="bg-blue-50 rounded-xl p-1.5 mb-2">
                                    <p className="font-mono text-[10px] font-bold text-blue-700 break-all">{r.token}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { navigator.clipboard.writeText(r.token); toast.success('Copied!'); }}
                                        className="flex-1 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-0.5 hover:bg-gray-200">
                                        <FiCopy size={9} /> Copy
                                    </button>
                                    <button onClick={() => window.open(generateQRCode(r.verifyUrl), '_blank')}
                                        className="flex-1 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-0.5 hover:bg-blue-700">
                                        <FiDownload size={9} /> QR
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LOGS TAB */}
            {tab === 'logs' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">Delivery Logs ({sentLog.length})</h2>
                        <button onClick={loadData} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                            <FiRefreshCw size={14} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>{['Date & Time', 'Student', 'Phone', 'Channel', 'Verify Code', 'Status'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sentLog.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                                        <FiMessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                                        No delivery logs yet. Send report cards to track delivery.
                                    </td></tr>
                                ) : sentLog.map((log, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-KE')}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{log.recipient_name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.phone || '—'}</td>
                                        <td className="px-4 py-3 text-xs capitalize font-semibold text-gray-600">{log.channel}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{log.verify_token || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${log.status === 'sent' ? 'bg-green-100 text-green-700' : log.status === 'skipped' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
