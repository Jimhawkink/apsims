'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiMessageSquare, FiSend, FiSettings, FiUsers, FiCheckCircle,
    FiXCircle, FiClock, FiRefreshCw, FiDownload, FiSearch,
    FiPhone, FiAlertTriangle, FiSave, FiEye, FiEyeOff, FiCopy,
    FiActivity, FiZap, FiLink
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const TEMPLATES = [
    {
        id: 'fee_balance',
        name: '💰 Fee Balance Inquiry',
        description: 'Parent queries remaining fee balance',
        trigger: 'BALANCE',
        response: 'Dear Parent, {student_name} ({form}) has an outstanding balance of {balance}. Pay via M-Pesa Paybill {paybill}, Account: {admission_no}. Thank you. - {school_name}',
    },
    {
        id: 'results',
        name: '📊 Results Notification',
        description: 'Send exam results to parent via WhatsApp',
        trigger: 'RESULTS',
        response: 'Dear Parent, {student_name}\'s latest exam results:\n{results_summary}\nMean Grade: {mean_grade}\nPosition: {position}/{total_students}\nFor full report card, visit: {portal_link}\n- {school_name}',
    },
    {
        id: 'attendance',
        name: '📅 Attendance Alert',
        description: 'Notify parent of absent student',
        trigger: 'ATTENDANCE',
        response: 'ALERT: Dear Parent, {student_name} was marked ABSENT today ({date}). Please contact the school if there is a valid reason. School: {school_phone}. - {school_name}',
    },
    {
        id: 'receipt',
        name: '🧾 Payment Receipt',
        description: 'Auto-send receipt after fee payment',
        trigger: 'PAYMENT',
        response: 'Dear Parent, Payment of {amount} for {student_name} ({admission_no}) has been received. Receipt No: {receipt_no}. Balance: {balance}. Thank you! - {school_name} Accounts',
    },
    {
        id: 'report_card',
        name: '📋 Report Card Delivery',
        description: 'Send digital report card link',
        trigger: 'REPORT',
        response: 'Dear Parent of {student_name}, Your child\'s {term} {year} report card is ready. Download: {report_link}\nVerification Code: {qr_code}\nFor queries call: {school_phone}. - {school_name}',
    },
];

const MERGE_FIELDS = ['{student_name}', '{form}', '{balance}', '{admission_no}', '{school_name}', '{paybill}', '{amount}', '{receipt_no}', '{term}', '{year}', '{date}', '{report_link}', '{portal_link}', '{school_phone}', '{mean_grade}', '{position}', '{total_students}', '{qr_code}', '{results_summary}'];

export default function WhatsAppReportsPage() {
    const [tab, setTab] = useState<'send' | 'templates' | 'logs' | 'config'>('send');
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [logs, setLogs] = useState<any[]>([]);
    const [config, setConfig] = useState({ api_url: '', api_key: '', instance_id: '', provider: 'whatsapp-business', from_name: '' });
    const [showKey, setShowKey] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const [results, setResults] = useState<{ name: string; phone: string; status: 'sent' | 'failed' | 'skipped'; error?: string }[]>([]);

    const loadStudents = useCallback(async () => {
        const { data } = await supabase.from('school_students')
            .select('id,first_name,last_name,admission_no,admission_number,guardian_phone,form_id,school_forms(form_name)')
            .order('first_name').limit(5000);
        setStudents(data || []);
    }, []);

    const loadLogs = useCallback(async () => {
        const { data } = await supabase.from('school_communication_logs')
            .select('*').eq('channel', 'whatsapp').order('created_at', { ascending: false }).limit(100);
        setLogs(data || []);
    }, []);

    const loadConfig = useCallback(async () => {
        const { data } = await supabase.from('school_details')
            .select('whatsapp_api_url,whatsapp_api_key,whatsapp_instance_id,whatsapp_provider,whatsapp_from_name').single();
        if (data) setConfig({
            api_url: data.whatsapp_api_url || '',
            api_key: data.whatsapp_api_key || '',
            instance_id: data.whatsapp_instance_id || '',
            provider: data.whatsapp_provider || 'whatsapp-business',
            from_name: data.whatsapp_from_name || '',
        });
    }, []);

    useEffect(() => { loadStudents(); loadLogs(); loadConfig(); }, [loadStudents, loadLogs, loadConfig]);

    const filteredStudents = students.filter(s => {
        const q = search.toLowerCase();
        return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
            (s.admission_no || s.admission_number || '').toLowerCase().includes(q);
    }).slice(0, 20);

    const toggleStudent = (s: any) => {
        setSelected(prev => prev.find(p => p.id === s.id) ? prev.filter(p => p.id !== s.id) : [...prev, s]);
    };

    const handleSelectAll = () => {
        if (selectAll) { setSelected([]); setSelectAll(false); }
        else { setSelected(students.filter(s => s.guardian_phone)); setSelectAll(true); }
    };

    const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
        setMessage(tpl.response);
        setActiveTemplate(tpl.id);
    };

    const sendMessages = async () => {
        if (selected.length === 0) { toast.error('Select at least one recipient'); return; }
        if (!message.trim()) { toast.error('Write a message first'); return; }
        setSending(true); setSendProgress(0); setResults([]);
        const res: typeof results = [];
        for (let i = 0; i < selected.length; i++) {
            const student = selected[i];
            const phone = student.guardian_phone;
            if (!phone) { res.push({ name: `${student.first_name} ${student.last_name}`, phone: '—', status: 'skipped', error: 'No phone number' }); continue; }
            let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
            const personalizedMsg = message
                .replace(/{student_name}/g, `${student.first_name} ${student.last_name}`)
                .replace(/{admission_no}/g, student.admission_no || student.admission_number || '')
                .replace(/{form}/g, student.school_forms?.form_name || '');
            try {
                const r = await fetch('/api/whatsapp/send', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: formattedPhone, message: personalizedMsg, student_id: student.id }),
                });
                const data = await r.json();
                res.push({ name: `${student.first_name} ${student.last_name}`, phone: formattedPhone, status: r.ok ? 'sent' : 'failed', error: data.error });
            } catch { res.push({ name: `${student.first_name} ${student.last_name}`, phone: formattedPhone, status: 'failed', error: 'Network error' }); }
            setSendProgress(Math.round(((i + 1) / selected.length) * 100));
            await new Promise(r => setTimeout(r, 300));
        }
        setResults(res);
        setSending(false);
        const sent = res.filter(r => r.status === 'sent').length;
        toast.success(`Sent ${sent}/${selected.length} WhatsApp messages`);
        loadLogs();
    };

    const saveConfig = async () => {
        setSavingConfig(true);
        try {
            await supabase.from('school_details').update({
                whatsapp_api_url: config.api_url, whatsapp_api_key: config.api_key,
                whatsapp_instance_id: config.instance_id, whatsapp_provider: config.provider,
                whatsapp_from_name: config.from_name,
            }).eq('id', 1);
            toast.success('WhatsApp configuration saved!');
        } catch { toast.error('Failed to save'); } finally { setSavingConfig(false); }
    };

    const charCount = message.length;
    const TABS = [
        { key: 'send', label: '💬 Send Messages' },
        { key: 'templates', label: '📋 Message Templates' },
        { key: 'logs', label: '📋 Message Logs' },
        { key: 'config', label: '⚙️ API Config' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
            {/* Header */}
            <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #15803d 60%, #16a34a 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">💬</div>
                        <div>
                            <h1 className="text-2xl font-black">WhatsApp Reports & Alerts</h1>
                            <p className="text-green-200 text-sm mt-0.5">Send results, receipts & fee reminders via WhatsApp</p>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { label: 'Messages Sent', val: logs.filter(l => l.status === 'sent').length },
                            { label: 'Recipients', val: students.filter(s => s.guardian_phone).length },
                            { label: 'Templates', val: TEMPLATES.length },
                        ].map(s => (
                            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center">
                                <p className="text-2xl font-black">{s.val}</p>
                                <p className="text-green-200 text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-green-700 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* SEND TAB */}
            {tab === 'send' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recipients */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2"><FiUsers size={16} className="text-green-600" /> Select Recipients</h2>
                            <button onClick={handleSelectAll} className="text-xs text-green-600 font-semibold hover:underline">
                                {selectAll ? 'Deselect All' : 'Select All with Phone'}
                            </button>
                        </div>
                        <div className="relative mb-3">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
                                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                            {filteredStudents.map(s => {
                                const isSelected = selected.some(p => p.id === s.id);
                                return (
                                    <button key={s.id} onClick={() => toggleStudent(s)}
                                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-sm ${isSelected ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                                            {isSelected && <FiCheckCircle size={12} className="text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                                            <p className="text-xs text-gray-400">{s.admission_no || s.admission_number} · {s.school_forms?.form_name}</p>
                                        </div>
                                        {s.guardian_phone ? (
                                            <span className="text-xs text-green-600 flex items-center gap-0.5"><FiPhone size={10} /> {s.guardian_phone}</span>
                                        ) : (
                                            <span className="text-xs text-red-400">No phone</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                            <span>{selected.length} recipients selected</span>
                            <span>{students.filter(s => s.guardian_phone).length} have phone numbers</span>
                        </div>
                    </div>

                    {/* Message Composer */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><FiMessageSquare size={16} className="text-green-600" /> Compose Message</h2>
                        <div className="flex gap-2 flex-wrap mb-3">
                            {TEMPLATES.slice(0, 3).map(tpl => (
                                <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${activeTemplate === tpl.id ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
                                    {tpl.name}
                                </button>
                            ))}
                        </div>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={8}
                            placeholder="Type your WhatsApp message here. Use merge fields like {student_name}, {balance}, {school_name}..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono" />
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-1 mb-4">
                            <span>{charCount} characters</span>
                            <div className="flex gap-2 flex-wrap">
                                {MERGE_FIELDS.slice(0, 5).map(f => (
                                    <button key={f} onClick={() => setMessage(prev => prev + f)}
                                        className="text-green-600 hover:underline">{f}</button>
                                ))}
                                <button onClick={() => setTab('templates')} className="text-blue-500 hover:underline">+more fields</button>
                            </div>
                        </div>

                        {/* Send Button */}
                        {!sending && results.length === 0 && (
                            <button onClick={sendMessages} disabled={selected.length === 0 || !message.trim()}
                                className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)' }}>
                                <FiSend size={16} /> Send to {selected.length} Recipients
                            </button>
                        )}
                        {sending && (
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="font-semibold text-gray-700">Sending messages…</span>
                                    <span className="text-green-600 font-bold">{sendProgress}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${sendProgress}%` }} />
                                </div>
                            </div>
                        )}
                        {results.length > 0 && (
                            <div>
                                <div className="flex gap-3 mb-3">
                                    {[
                                        { label: 'Sent', val: results.filter(r => r.status === 'sent').length, color: '#16a34a' },
                                        { label: 'Failed', val: results.filter(r => r.status === 'failed').length, color: '#dc2626' },
                                        { label: 'Skipped', val: results.filter(r => r.status === 'skipped').length, color: '#d97706' },
                                    ].map(s => (
                                        <div key={s.label} className="flex-1 text-center p-2 rounded-xl bg-gray-50">
                                            <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                                            <p className="text-xs text-gray-500">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="max-h-36 overflow-y-auto space-y-1">
                                    {results.map((r, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                                            style={{ backgroundColor: r.status === 'sent' ? '#f0fdf4' : r.status === 'failed' ? '#fef2f2' : '#fffbeb' }}>
                                            {r.status === 'sent' ? <FiCheckCircle size={12} className="text-green-500" /> :
                                                r.status === 'failed' ? <FiXCircle size={12} className="text-red-500" /> :
                                                    <FiClock size={12} className="text-amber-500" />}
                                            <span className="font-semibold text-gray-700">{r.name}</span>
                                            <span className="text-gray-400">{r.phone}</span>
                                            {r.error && <span className="text-red-400 ml-auto">{r.error}</span>}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setResults([]); setSendProgress(0); }}
                                    className="mt-3 w-full py-2 text-sm text-green-600 font-semibold border border-green-200 rounded-xl hover:bg-green-50">
                                    Send Another Message
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TEMPLATES TAB */}
            {tab === 'templates' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h2 className="font-bold text-gray-900 mb-1">📋 Message Templates</h2>
                        <p className="text-sm text-gray-500 mb-4">Click &quot;Use Template&quot; to load into composer. All merge fields are automatically replaced with real student data.</p>
                        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs font-bold text-gray-600 mb-2">Available Merge Fields:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {MERGE_FIELDS.map(f => (
                                    <span key={f} className="text-xs bg-green-100 text-green-700 font-mono px-2 py-0.5 rounded-lg">{f}</span>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {TEMPLATES.map(tpl => (
                                <div key={tpl.id} className="border border-gray-200 rounded-2xl p-4 hover:border-green-300 hover:shadow-sm transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{tpl.name}</p>
                                            <p className="text-xs text-gray-500">{tpl.description}</p>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-700 font-mono px-2 py-1 rounded-lg">Trigger: {tpl.trigger}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 font-mono leading-relaxed mb-3 whitespace-pre-wrap">{tpl.response}</p>
                                    <button onClick={() => { applyTemplate(tpl); setTab('send'); }}
                                        className="w-full py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all">
                                        Use This Template →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LOGS TAB */}
            {tab === 'logs' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">Message Logs</h2>
                        <button onClick={loadLogs} className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50">
                            <FiRefreshCw size={14} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>{['Date', 'Recipient', 'Phone', 'Message Preview', 'Status'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">No WhatsApp logs yet</td></tr>
                                ) : logs.map((log, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(log.created_at).toLocaleString('en-KE')}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{log.recipient_name || '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.phone || '—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{log.message || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {log.status || 'sent'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONFIG TAB */}
            {tab === 'config' && (
                <div className="max-w-2xl">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-1">⚙️ WhatsApp API Configuration</h2>
                        <p className="text-sm text-gray-500 mb-5">Supports WhatsApp Business API, Twilio, Africa&apos;s Talking, and WhatsMate</p>
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5 text-xs text-blue-700">
                            <strong>Recommended providers for Kenya:</strong> WhatsMate, UltraMsg, Twilio, or register for official WhatsApp Business API at business.whatsapp.com
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Provider</label>
                                <select value={config.provider} onChange={e => setConfig(c => ({ ...c, provider: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="whatsapp-business">Official WhatsApp Business API</option>
                                    <option value="ultramsg">UltraMsg (Easy setup)</option>
                                    <option value="twilio">Twilio WhatsApp</option>
                                    <option value="whatsmate">WhatsMate</option>
                                    <option value="africas-talking">Africa&apos;s Talking</option>
                                </select>
                            </div>
                            {[
                                { key: 'api_url', label: 'API Base URL', placeholder: 'https://api.ultramsg.com/instance123' },
                                { key: 'api_key', label: 'API Key / Token', placeholder: 'Your API authentication key', secret: true },
                                { key: 'instance_id', label: 'Instance ID', placeholder: 'WhatsApp instance identifier' },
                                { key: 'from_name', label: 'Sender Name', placeholder: 'e.g. ABC School' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">{f.label}</label>
                                    <div className="relative">
                                        <input type={f.secret && !showKey ? 'password' : 'text'}
                                            value={(config as any)[f.key]} placeholder={f.placeholder}
                                            onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 font-mono" />
                                        {f.secret && (
                                            <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                                                {showKey ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={saveConfig} disabled={savingConfig}
                            className="mt-6 w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)' }}>
                            {savingConfig ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={16} />}
                            Save WhatsApp Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
