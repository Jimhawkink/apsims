'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSmartphone, FiDollarSign, FiCheckCircle, FiXCircle, FiClock,
    FiRefreshCw, FiSearch, FiDownload, FiSend, FiAlertTriangle,
    FiTrendingUp, FiUsers, FiCreditCard, FiActivity, FiSettings,
    FiCopy, FiEye, FiEyeOff, FiSave, FiLink
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

type STKStatus = 'pending' | 'success' | 'failed' | 'cancelled';

interface STKRequest {
    id: string;
    phone: string;
    amount: number;
    student_name: string;
    admission_no: string;
    checkout_request_id: string;
    status: STKStatus;
    result_desc: string;
    created_at: string;
    mpesa_receipt?: string;
}

const STATUS_CONFIG: Record<STKStatus, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: '#d97706', bg: '#fffbeb', icon: FiClock },
    success: { label: 'Success', color: '#16a34a', bg: '#f0fdf4', icon: FiCheckCircle },
    failed: { label: 'Failed', color: '#dc2626', bg: '#fef2f2', icon: FiXCircle },
    cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f9fafb', icon: FiXCircle },
};

export default function MpesaIntegrationPage() {
    const [tab, setTab] = useState<'push' | 'history' | 'config' | 'webhook'>('push');
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [requests, setRequests] = useState<STKRequest[]>([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [config, setConfig] = useState({
        consumer_key: '',
        consumer_secret: '',
        shortcode: '',
        passkey: '',
        callback_url: '',
        environment: 'sandbox',
    });
    const [showSecrets, setShowSecrets] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, amount: 0 });
    const [filterStatus, setFilterStatus] = useState<STKStatus | 'all'>('all');
    const [histSearch, setHistSearch] = useState('');

    const loadStudents = useCallback(async () => {
        const { data } = await supabase
            .from('school_students')
            .select('id, first_name, last_name, admission_no, admission_number, guardian_phone, form_id, school_forms(form_name)')
            .order('first_name')
            .limit(5000);
        setStudents(data || []);
    }, []);

    const loadConfig = useCallback(async () => {
        const { data } = await supabase
            .from('school_details')
            .select('mpesa_consumer_key, mpesa_consumer_secret, mpesa_shortcode, mpesa_passkey, mpesa_callback_url, mpesa_environment')
            .single();
        if (data) {
            setConfig({
                consumer_key: data.mpesa_consumer_key || '',
                consumer_secret: data.mpesa_consumer_secret || '',
                shortcode: data.mpesa_shortcode || '',
                passkey: data.mpesa_passkey || '',
                callback_url: data.mpesa_callback_url || '',
                environment: data.mpesa_environment || 'sandbox',
            });
        }
    }, []);

    const loadHistory = useCallback(async () => {
        setLoadingHist(true);
        try {
            const { data } = await supabase
                .from('school_mpesa_stk_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);
            const rows = (data || []) as STKRequest[];
            setRequests(rows);
            setStats({
                total: rows.length,
                success: rows.filter(r => r.status === 'success').length,
                failed: rows.filter(r => r.status === 'failed').length,
                amount: rows.filter(r => r.status === 'success').reduce((s, r) => s + Number(r.amount), 0),
            });
        } finally {
            setLoadingHist(false);
        }
    }, []);

    useEffect(() => { loadStudents(); loadConfig(); loadHistory(); }, [loadStudents, loadConfig, loadHistory]);

    const filteredStudents = students.filter(s => {
        const q = search.toLowerCase();
        const name = `${s.first_name} ${s.last_name}`.toLowerCase();
        const adm = (s.admission_no || s.admission_number || '').toLowerCase();
        return name.includes(q) || adm.includes(q);
    }).slice(0, 8);

    const handleSelectStudent = (s: any) => {
        setSelectedStudent(s);
        setPhone(s.guardian_phone || '');
        setSearch(`${s.first_name} ${s.last_name}`);
    };

    const handleSendSTK = async () => {
        if (!selectedStudent || !amount || !phone) {
            toast.error('Please select a student, enter amount and phone number'); return;
        }
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 1) { toast.error('Invalid amount'); return; }
        // Format phone: 07XXXXXXXX → 2547XXXXXXXX
        let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (!formattedPhone.startsWith('254')) { toast.error('Invalid Kenyan phone number'); return; }

        setSending(true);
        try {
            const res = await fetch('/api/mpesa/stk-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: formattedPhone,
                    amount: numAmount,
                    student_id: selectedStudent.id,
                    student_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                    admission_no: selectedStudent.admission_no || selectedStudent.admission_number,
                    account_ref: selectedStudent.admission_no || selectedStudent.admission_number || 'SCHOOL',
                    description: `School Fees - ${selectedStudent.first_name} ${selectedStudent.last_name}`,
                }),
            });
            const result = await res.json();
            if (res.ok && result.success) {
                toast.success('✅ STK Push sent! Ask parent to check their phone and enter M-Pesa PIN');
                setAmount(''); setSelectedStudent(null); setSearch(''); setPhone('');
                setTimeout(loadHistory, 3000);
            } else {
                toast.error(result.error || 'Failed to send STK Push');
            }
        } catch (err) {
            toast.error('Network error. Check your M-Pesa configuration.');
        } finally {
            setSending(false);
        }
    };

    const saveConfig = async () => {
        setSavingConfig(true);
        try {
            const { error } = await supabase.from('school_details').update({
                mpesa_consumer_key: config.consumer_key,
                mpesa_consumer_secret: config.consumer_secret,
                mpesa_shortcode: config.shortcode,
                mpesa_passkey: config.passkey,
                mpesa_callback_url: config.callback_url,
                mpesa_environment: config.environment,
            }).eq('id', 1);
            if (error) throw error;
            toast.success('M-Pesa configuration saved!');
        } catch {
            toast.error('Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const filteredHistory = requests.filter(r => {
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        const q = histSearch.toLowerCase();
        const matchSearch = !q || r.student_name?.toLowerCase().includes(q) ||
            r.admission_no?.toLowerCase().includes(q) || r.phone?.includes(q) ||
            r.mpesa_receipt?.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    const TABS = [
        { key: 'push', label: '📲 STK Push', icon: FiSend },
        { key: 'history', label: '📋 Transaction History', icon: FiActivity },
        { key: 'config', label: '⚙️ M-Pesa Config', icon: FiSettings },
        { key: 'webhook', label: '🔗 Webhook Setup', icon: FiLink },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl mb-6 p-6 text-white"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #34d399, transparent)', transform: 'translate(30%, -30%)' }} />
                <div className="relative z-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                    <FiSmartphone size={24} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight">M-Pesa STK Push</h1>
                                    <p className="text-green-200 text-sm">Parents pay directly from their phones — no cash needed</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {[
                                { label: 'Total Requests', val: stats.total, icon: FiActivity },
                                { label: 'Successful', val: stats.success, icon: FiCheckCircle },
                                { label: 'Amount Collected', val: fmt(stats.amount), icon: FiDollarSign },
                            ].map(s => (
                                <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[110px]">
                                    <p className="text-2xl font-black text-white">{s.val}</p>
                                    <p className="text-green-200 text-[11px] mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            tab === t.key
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* STK PUSH TAB */}
            {tab === 'push' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Send Form */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <FiSend className="text-green-600" /> Initiate STK Push Payment
                        </h2>

                        {/* Student Search */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Search Student</label>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setSelectedStudent(null); }}
                                    placeholder="Name or admission number..."
                                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                />
                            </div>
                            {search && !selectedStudent && filteredStudents.length > 0 && (
                                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-48 overflow-y-auto">
                                    {filteredStudents.map(s => (
                                        <button key={s.id} onClick={() => handleSelectStudent(s)}
                                            className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm border-b border-gray-50 last:border-0">
                                            <p className="font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                            <p className="text-gray-500 text-xs">{s.admission_no || s.admission_number} · {s.school_forms?.form_name}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedStudent && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                                    {selectedStudent.first_name[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-green-900 text-sm">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                                    <p className="text-green-600 text-xs">{selectedStudent.admission_no || selectedStudent.admission_number}</p>
                                </div>
                                <FiCheckCircle className="ml-auto text-green-600" size={18} />
                            </div>
                        )}

                        {/* Phone */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Parent/Guardian Phone</label>
                            <input value={phone} onChange={e => setPhone(e.target.value)}
                                placeholder="07XXXXXXXX"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                            <p className="text-xs text-gray-400 mt-1">Format: 0712345678 or 254712345678</p>
                        </div>

                        {/* Amount */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Amount (KES)</label>
                            <input value={amount} onChange={e => setAmount(e.target.value)}
                                type="number" placeholder="e.g. 5000"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none font-mono" />
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {[500, 1000, 2000, 5000, 10000].map(v => (
                                    <button key={v} onClick={() => setAmount(String(v))}
                                        className={`text-xs px-3 py-1 rounded-lg border transition-all ${amount === String(v) ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
                                        {fmt(v)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleSendSTK} disabled={sending}
                            className="w-full py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
                            style={{ background: sending ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)' }}>
                            {sending ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending STK Push...</>) :
                                (<><FiSmartphone size={18} /> Send Payment Request to Phone</>)}
                        </button>

                        <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-700 font-semibold mb-1">📱 How it works:</p>
                            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                                <li>Parent receives a prompt on their M-Pesa phone</li>
                                <li>They enter their M-Pesa PIN to confirm</li>
                                <li>Payment is automatically recorded in the system</li>
                                <li>Receipt is generated and SMS sent to parent</li>
                            </ol>
                        </div>
                    </div>

                    {/* Live Status */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FiActivity className="text-green-600" /> Recent Requests
                            </h2>
                            <button onClick={loadHistory} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                <FiRefreshCw size={15} className={loadingHist ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[480px] overflow-y-auto">
                            {requests.slice(0, 10).map(req => {
                                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                const Icon = cfg.icon;
                                return (
                                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 truncate">{req.student_name}</p>
                                            <p className="text-xs text-gray-500">{req.phone} · {req.admission_no}</p>
                                            {req.mpesa_receipt && <p className="text-xs font-mono text-green-600">Ref: {req.mpesa_receipt}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-sm" style={{ color: cfg.color }}>{fmt(req.amount)}</p>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {requests.length === 0 && (
                                <div className="text-center py-10 text-gray-400">
                                    <FiSmartphone size={32} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No STK Push requests yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY TAB */}
            {tab === 'history' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
                        <div className="flex gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                <FiSearch size={14} className="text-gray-400" />
                                <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
                                    placeholder="Search..." className="text-sm outline-none bg-transparent w-40" />
                            </div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                                className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
                                <option value="all">All Status</option>
                                <option value="success">✅ Success</option>
                                <option value="pending">⏳ Pending</option>
                                <option value="failed">❌ Failed</option>
                                <option value="cancelled">🚫 Cancelled</option>
                            </select>
                            <button onClick={() => {
                                const csv = ['Date,Student,Admission,Phone,Amount,Status,Receipt'].join('\n') + '\n' +
                                    filteredHistory.map(r => `${r.created_at},${r.student_name},${r.admission_no},${r.phone},${r.amount},${r.status},${r.mpesa_receipt || ''}`).join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = 'mpesa_history.csv'; a.click();
                            }} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                                <FiDownload size={14} /> Export CSV
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Date & Time', 'Student', 'Phone', 'Amount', 'Status', 'M-Pesa Receipt', 'Description'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredHistory.map(r => {
                                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleString('en-KE')}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-800">{r.student_name}</p>
                                                <p className="text-xs text-gray-400">{r.admission_no}</p>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.phone}</td>
                                            <td className="px-4 py-3 font-bold text-green-700">{fmt(r.amount)}</td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit"
                                                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                    <Icon size={10} /> {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.mpesa_receipt || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.result_desc || '—'}</td>
                                        </tr>
                                    );
                                })}
                                {filteredHistory.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No transactions found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONFIG TAB */}
            {tab === 'config' && (
                <div className="max-w-2xl">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">M-Pesa Daraja API Configuration</h2>
                            <button onClick={() => setShowSecrets(!showSecrets)}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
                                {showSecrets ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                {showSecrets ? 'Hide' : 'Show'} secrets
                            </button>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5">
                            <p className="text-sm text-blue-800 font-semibold">📋 How to get M-Pesa credentials:</p>
                            <ol className="text-xs text-blue-700 mt-1 space-y-1 list-decimal list-inside">
                                <li>Go to <strong>developer.safaricom.co.ke</strong> and create an account</li>
                                <li>Create a new app and note the Consumer Key & Secret</li>
                                <li>For production, register your Paybill/Till number</li>
                                <li>Get your Passkey from Safaricom Business</li>
                            </ol>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Environment</label>
                                <select value={config.environment} onChange={e => setConfig(c => ({ ...c, environment: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="sandbox">🧪 Sandbox (Testing)</option>
                                    <option value="production">🚀 Production (Live)</option>
                                </select>
                            </div>
                            {[
                                { key: 'consumer_key', label: 'Consumer Key', placeholder: 'Daraja API Consumer Key' },
                                { key: 'consumer_secret', label: 'Consumer Secret', placeholder: 'Daraja API Consumer Secret', secret: true },
                                { key: 'shortcode', label: 'Shortcode (Paybill/Till)', placeholder: 'e.g. 174379' },
                                { key: 'passkey', label: 'Lipa Na M-Pesa Passkey', placeholder: 'Online passkey from Safaricom', secret: true },
                                { key: 'callback_url', label: 'Callback URL', placeholder: 'https://yourschool.com/api/mpesa/callback' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">{field.label}</label>
                                    <div className="relative">
                                        <input
                                            type={field.secret && !showSecrets ? 'password' : 'text'}
                                            value={(config as any)[field.key]}
                                            onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 font-mono"
                                        />
                                        <button onClick={() => { navigator.clipboard.writeText((config as any)[field.key]); toast.success('Copied!'); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
                                            <FiCopy size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={saveConfig} disabled={savingConfig}
                            className="mt-6 w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all"
                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                            {savingConfig ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={16} />}
                            {savingConfig ? 'Saving...' : 'Save M-Pesa Configuration'}
                        </button>
                    </div>
                </div>
            )}

            {/* WEBHOOK TAB */}
            {tab === 'webhook' && (
                <div className="max-w-2xl space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">🔗 Webhook & API Setup</h2>
                        <p className="text-sm text-gray-600 mb-4">Configure these endpoints in your Safaricom Daraja portal:</p>
                        {[
                            { label: 'STK Push Callback URL', url: `${typeof window !== 'undefined' ? window.location.origin : 'https://yourschool.com'}/api/mpesa/callback`, desc: 'Receives payment confirmations from Safaricom' },
                            { label: 'Validation URL', url: `${typeof window !== 'undefined' ? window.location.origin : 'https://yourschool.com'}/api/mpesa/validate`, desc: 'Validates incoming C2B payment requests' },
                            { label: 'Confirmation URL', url: `${typeof window !== 'undefined' ? window.location.origin : 'https://yourschool.com'}/api/mpesa/confirm`, desc: 'Confirms completed C2B transactions' },
                        ].map(ep => (
                            <div key={ep.label} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{ep.label}</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono text-green-700 flex-1 break-all">{ep.url}</code>
                                    <button onClick={() => { navigator.clipboard.writeText(ep.url); toast.success('Copied!'); }}
                                        className="p-2 text-gray-400 hover:text-gray-700 flex-shrink-0">
                                        <FiCopy size={14} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{ep.desc}</p>
                            </div>
                        ))}
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                <FiAlertTriangle size={14} /> Important Notes
                            </p>
                            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                <li>Your server must be accessible from the internet (HTTPS required)</li>
                                <li>Whitelist Safaricom IP ranges in your firewall</li>
                                <li>Test with sandbox credentials before going live</li>
                                <li>Ensure your SSL certificate is valid and not self-signed</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
