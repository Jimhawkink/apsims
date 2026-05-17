'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSave, FiSend, FiInfo, FiToggleLeft, FiToggleRight,
    FiMessageSquare, FiGlobe, FiKey, FiUser, FiPhone,
} from 'react-icons/fi';

interface SchoolDetails {
    id: number;
    school_name?: string;
    sms_enabled?: boolean;
    sms_api_key?: string;
    sms_username?: string;
    sms_sender_id?: string;
    sms_is_sandbox?: boolean;
    whatsapp_phone_id?: string;
    whatsapp_token?: string;
    whatsapp_business_id?: string;
    [key: string]: any;
}

interface ConfigTabProps {
    schoolDetails: SchoolDetails;
    fetchData: () => void;
}

export default function ConfigTab({ schoolDetails, fetchData }: ConfigTabProps) {
    // ── SMS state ─────────────────────────────────────────────────────────────
    const [apiKey, setApiKey] = useState('');
    const [username, setUsername] = useState('');
    const [senderId, setSenderId] = useState('');
    const [isSandbox, setIsSandbox] = useState(true);
    const [savingSms, setSavingSms] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testingSms, setTestingSms] = useState(false);

    // ── WhatsApp state ────────────────────────────────────────────────────────
    const [waPhoneId, setWaPhoneId] = useState('');
    const [waToken, setWaToken] = useState('');
    const [waBusinessId, setWaBusinessId] = useState('');
    const [savingWa, setSavingWa] = useState(false);
    const [testingWa, setTestingWa] = useState(false);

    // ── Pre-populate from schoolDetails ──────────────────────────────────────
    useEffect(() => {
        setApiKey(schoolDetails.sms_api_key || '');
        setUsername(schoolDetails.sms_username || '');
        setSenderId(schoolDetails.sms_sender_id || '');
        setIsSandbox(schoolDetails.sms_is_sandbox !== false);
        setWaPhoneId(schoolDetails.whatsapp_phone_id || '');
        setWaToken(schoolDetails.whatsapp_token || '');
        setWaBusinessId(schoolDetails.whatsapp_business_id || '');
    }, [schoolDetails]);

    // ── Save SMS Config ───────────────────────────────────────────────────────
    const handleSaveSMS = async () => {
        setSavingSms(true);
        try {
            const { error } = await supabase
                .from('school_details')
                .update({
                    sms_api_key: apiKey,
                    sms_username: username,
                    sms_sender_id: senderId,
                    sms_is_sandbox: isSandbox,
                    sms_enabled: true,
                    sms_provider: 'AfricasTalking',
                })
                .eq('id', schoolDetails.id);
            if (error) throw error;
            toast.success('✅ SMS config saved successfully');
            fetchData();
        } catch (e: any) {
            toast.error(`❌ ${e.message || 'Failed to save SMS config'}`);
        } finally {
            setSavingSms(false);
        }
    };

    // ── Test SMS ──────────────────────────────────────────────────────────────
    const handleTestSMS = async () => {
        if (!testPhone.trim()) return toast.error('Enter a test phone number');
        setTestingSms(true);
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: testPhone,
                    message: `✅ APSIMS SMS test message. Your school SMS system is connected! - ${schoolDetails.school_name || 'AlphaSchool'}`,
                    messageType: 'Test',
                }),
            });
            const result = await res.json();
            if (result.success && result.status !== 'skipped') {
                toast.success('✅ Test SMS sent successfully!');
            } else if (result.status === 'skipped') {
                toast.error('⚠️ SMS not configured. Save your credentials first.');
            } else {
                toast.error(`❌ ${result.error || 'SMS test failed'}`);
            }
        } catch (e: any) {
            toast.error(`❌ Network error: ${e.message}`);
        } finally {
            setTestingSms(false);
        }
    };

    // ── Save WhatsApp Config ──────────────────────────────────────────────────
    const handleSaveWA = async () => {
        if (!waPhoneId || !waToken) return toast.error('Phone Number ID and Access Token are required');
        setSavingWa(true);
        try {
            const { error } = await supabase
                .from('school_details')
                .update({
                    whatsapp_phone_id: waPhoneId,
                    whatsapp_token: waToken,
                    whatsapp_business_id: waBusinessId,
                })
                .eq('id', schoolDetails.id);
            if (error) throw error;
            toast.success('✅ WhatsApp config saved successfully');
            fetchData();
        } catch (e: any) {
            toast.error(`❌ ${e.message || 'Failed to save WhatsApp config'}`);
        } finally {
            setSavingWa(false);
        }
    };

    // ── Test WhatsApp ─────────────────────────────────────────────────────────
    const handleTestWA = async () => {
        if (!testPhone.trim()) return toast.error('Enter a test phone number');
        setTestingWa(true);
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: testPhone,
                    message: `✅ APSIMS WhatsApp test message. Your school WhatsApp system is connected! - ${schoolDetails.school_name || 'AlphaSchool'}`,
                }),
            });
            const result = await res.json();
            if (result.success && result.status !== 'skipped') {
                toast.success(`✅ WhatsApp test sent! Message ID: ${result.messageId || 'N/A'}`);
            } else if (result.status === 'skipped') {
                toast.error('⚠️ WhatsApp not configured. Set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN env vars.');
            } else {
                toast.error(`❌ ${result.error || 'WhatsApp test failed'}`);
            }
        } catch (e: any) {
            toast.error(`❌ Network error: ${e.message}`);
        } finally {
            setTestingWa(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all";
    const labelClass = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ══ SMS Config Card ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-3 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white" />
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <FiMessageSquare size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">💬 AfricasTalking SMS</h3>
                        <p className="text-white/60 text-[10px]">Configure SMS credentials for parent notifications</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Info box */}
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5">
                        <FiInfo size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-blue-800">How to get credentials</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Sign up at{' '}
                                <a href="https://africastalking.com" target="_blank" rel="noopener noreferrer"
                                    className="underline font-semibold">africastalking.com</a>
                                {' '}→ Dashboard → Settings → API Key. Use Sandbox for testing.
                            </p>
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className={labelClass}>
                            <FiKey size={10} className="inline mr-1" /> API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="Enter AfricasTalking API Key"
                            className={inputClass}
                            aria-label="AfricasTalking API Key"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className={labelClass}>
                            <FiUser size={10} className="inline mr-1" /> Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="e.g. sandbox (for testing) or your AT username"
                            className={inputClass}
                            aria-label="AfricasTalking Username"
                        />
                    </div>

                    {/* Sender ID */}
                    <div>
                        <label className={labelClass}>Sender ID (optional)</label>
                        <input
                            type="text"
                            value={senderId}
                            onChange={e => setSenderId(e.target.value)}
                            placeholder="e.g. APSIMS or your school name"
                            className={inputClass}
                            aria-label="SMS Sender ID"
                        />
                    </div>

                    {/* Sandbox toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <div>
                            <p className="text-xs font-bold text-gray-700">Sandbox Mode</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Use sandbox for testing — no real SMS sent</p>
                        </div>
                        <button
                            onClick={() => setIsSandbox(!isSandbox)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isSandbox ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                            aria-label={`Sandbox mode is ${isSandbox ? 'on' : 'off'}`}>
                            {isSandbox ? <FiToggleLeft size={14} /> : <FiToggleRight size={14} />}
                            {isSandbox ? 'Sandbox ON' : 'Live Mode'}
                        </button>
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSaveSMS}
                        disabled={savingSms}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        <FiSave size={14} />
                        {savingSms ? 'Saving…' : 'Save SMS Config'}
                    </button>

                    {/* Test section */}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🧪 Test SMS</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FiPhone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="tel"
                                    value={testPhone}
                                    onChange={e => setTestPhone(e.target.value)}
                                    placeholder="e.g. 0712345678"
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                                    aria-label="Test phone number"
                                />
                            </div>
                            <button
                                onClick={handleTestSMS}
                                disabled={testingSms}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition disabled:opacity-50 flex items-center gap-1.5">
                                <FiSend size={12} />
                                {testingSms ? 'Sending…' : 'Test SMS'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ WhatsApp Config Card ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-3 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                    <div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white" />
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg">
                        🟢
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">🟢 WhatsApp Business API</h3>
                        <p className="text-white/60 text-[10px]">Meta Cloud API for WhatsApp parent notifications</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Info box */}
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2.5">
                        <FiInfo size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-green-800">Meta WhatsApp Business API</p>
                            <p className="text-xs text-green-700 mt-0.5">
                                Set up at{' '}
                                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                                    className="underline font-semibold">developers.facebook.com</a>
                                {' '}→ WhatsApp → API Setup. Also set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN in your .env.local.
                            </p>
                        </div>
                    </div>

                    {/* Phone Number ID */}
                    <div>
                        <label className={labelClass}>
                            <FiPhone size={10} className="inline mr-1" /> Phone Number ID
                        </label>
                        <input
                            type="text"
                            value={waPhoneId}
                            onChange={e => setWaPhoneId(e.target.value)}
                            placeholder="e.g. 123456789012345"
                            className={inputClass}
                            aria-label="WhatsApp Phone Number ID"
                        />
                    </div>

                    {/* Access Token */}
                    <div>
                        <label className={labelClass}>
                            <FiKey size={10} className="inline mr-1" /> Access Token
                        </label>
                        <input
                            type="password"
                            value={waToken}
                            onChange={e => setWaToken(e.target.value)}
                            placeholder="Enter Meta Access Token"
                            className={inputClass}
                            aria-label="WhatsApp Access Token"
                        />
                    </div>

                    {/* Business Account ID */}
                    <div>
                        <label className={labelClass}>
                            <FiGlobe size={10} className="inline mr-1" /> Business Account ID (optional)
                        </label>
                        <input
                            type="text"
                            value={waBusinessId}
                            onChange={e => setWaBusinessId(e.target.value)}
                            placeholder="e.g. 987654321098765"
                            className={inputClass}
                            aria-label="WhatsApp Business Account ID"
                        />
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSaveWA}
                        disabled={savingWa}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                        <FiSave size={14} />
                        {savingWa ? 'Saving…' : 'Save WhatsApp Config'}
                    </button>

                    {/* Test section */}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🧪 Test WhatsApp</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FiPhone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="tel"
                                    value={testPhone}
                                    onChange={e => setTestPhone(e.target.value)}
                                    placeholder="e.g. 0712345678"
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-300 focus:ring-4 focus:ring-green-50 transition-all"
                                    aria-label="Test phone number for WhatsApp"
                                />
                            </div>
                            <button
                                onClick={handleTestWA}
                                disabled={testingWa}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition disabled:opacity-50 flex items-center gap-1.5">
                                <FiSend size={12} />
                                {testingWa ? 'Sending…' : 'Test WA'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400">
                            💡 The test phone number is shared between SMS and WhatsApp tests above.
                        </p>
                    </div>
                </div>
            </div>

            {/* ══ Status Summary Card ══ */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">📊 Configuration Status</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'SMS Provider',
                            value: schoolDetails.sms_provider || 'AfricasTalking',
                            status: !!(schoolDetails.sms_api_key && schoolDetails.sms_username),
                            icon: '💬',
                        },
                        {
                            label: 'SMS Mode',
                            value: schoolDetails.sms_is_sandbox !== false ? 'Sandbox' : 'Live',
                            status: schoolDetails.sms_is_sandbox === false,
                            icon: '🔧',
                            warnIfFalse: false,
                        },
                        {
                            label: 'WhatsApp',
                            value: schoolDetails.whatsapp_phone_id ? 'Configured' : 'Not set',
                            status: !!(schoolDetails.whatsapp_phone_id && schoolDetails.whatsapp_token),
                            icon: '🟢',
                        },
                        {
                            label: 'SMS Enabled',
                            value: schoolDetails.sms_enabled !== false ? 'Yes' : 'No',
                            status: schoolDetails.sms_enabled !== false,
                            icon: '✅',
                        },
                    ].map((item, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${item.status ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">{item.icon}</span>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</p>
                            </div>
                            <p className={`text-sm font-bold ${item.status ? 'text-green-700' : 'text-amber-700'}`}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
