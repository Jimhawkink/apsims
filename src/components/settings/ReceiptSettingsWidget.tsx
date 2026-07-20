'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { setReceiptStart, getReceiptSettings } from '@/lib/receiptNumber';
import toast from 'react-hot-toast';
import {
    FiFileText, FiSave, FiRefreshCw, FiAlertCircle,
    FiCheckCircle, FiHash, FiEye, FiArrowRight,
} from 'react-icons/fi';

export default function ReceiptSettingsWidget() {
    const [settings, setSettings]   = useState<{ receipt_counter: number; receipt_prefix: string; receipt_start: number } | null>(null);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [startNum, setStartNum]   = useState('');
    const [prefix, setPrefix]       = useState('');
    const [preview, setPreview]     = useState('');
    const [confirmed, setConfirmed] = useState(false);

    const load = async () => {
        setLoading(true);
        const s = await getReceiptSettings(supabase);
        setSettings(s);
        setStartNum(String(s.receipt_counter));
        setPrefix(s.receipt_prefix);
        setPreview((s.receipt_prefix || '') + String(s.receipt_counter));
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    // Live preview
    useEffect(() => {
        const num = parseInt(startNum, 10);
        if (!isNaN(num) && num > 0) {
            setPreview((prefix || '') + num);
        }
    }, [startNum, prefix]);

    const handleSave = async () => {
        const num = parseInt(startNum, 10);
        if (isNaN(num) || num < 1) { toast.error('Enter a valid starting number (e.g. 89635)'); return; }
        if (!confirmed) { toast.error('Tick the confirmation checkbox first'); return; }
        setSaving(true);
        try {
            const result = await setReceiptStart(supabase, num, prefix);
            toast.success(`✅ Receipt numbering set! Next receipt: ${result}`);
            setConfirmed(false);
            await load();
        } catch (e: any) {
            toast.error('Failed: ' + e.message);
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading receipt settings…</span>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <FiFileText size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-lg">Receipt Numbering</h3>
                        <p className="text-amber-100 text-xs mt-0.5">
                            Set the starting number to match your school's receipt book
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Current Status */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-green-600 uppercase tracking-wide mb-1">Next Receipt</p>
                        <p className="text-xl font-black text-green-700">
                            {(settings?.receipt_prefix || '') + (settings?.receipt_counter || 1)}
                        </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-wide mb-1">Start From</p>
                        <p className="text-xl font-black text-blue-700">
                            {(settings?.receipt_prefix || '') + (settings?.receipt_start || 1)}
                        </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Prefix</p>
                        <p className="text-xl font-black text-gray-700">
                            {settings?.receipt_prefix || <span className="text-gray-300 italic">None</span>}
                        </p>
                    </div>
                </div>

                {/* Info box */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <FiAlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="text-xs text-blue-700 leading-relaxed">
                        <strong>How to use:</strong> Open your physical receipt book and find the first unused receipt number.
                        Enter it below. The system will start from that number and auto-increment for every payment —
                        from the <strong>web, mobile APK, and parent portal</strong> all sharing the same counter.
                        <br /><br />
                        <strong>Example:</strong> If your book starts at 89635, enter <code className="bg-blue-100 px-1 rounded">89635</code>.
                        Next receipts will be 89635, 89636, 89637…
                    </div>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                    {/* Prefix (optional) */}
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase tracking-wide block mb-1.5">
                            Prefix (optional)
                        </label>
                        <input
                            value={prefix}
                            onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9/\-]/g, ''))}
                            placeholder='e.g. RCT/ or SR/ or leave blank'
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none font-mono font-bold tracking-wider"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Letters/numbers/dash/slash only. Leave blank for plain numbers.
                        </p>
                    </div>

                    {/* Starting number */}
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase tracking-wide block mb-1.5">
                            <FiHash className="inline mr-1" size={12} />
                            Starting Receipt Number *
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={startNum}
                            onChange={e => setStartNum(e.target.value)}
                            placeholder="e.g. 89635"
                            className="w-full border-2 border-amber-300 rounded-xl px-4 py-4 text-2xl font-black text-amber-700 focus:border-amber-500 outline-none text-center tracking-widest"
                        />
                    </div>

                    {/* Live Preview */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                        <FiEye className="text-gray-400 flex-shrink-0" size={16} />
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Preview — Receipts will look like:</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[0, 1, 2, 3].map(offset => {
                                    const num = parseInt(startNum, 10) + offset;
                                    if (isNaN(num)) return null;
                                    return (
                                        <span key={offset}
                                            className={`font-mono font-black px-3 py-1 rounded-lg text-sm ${
                                                offset === 0
                                                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                                                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                                            }`}>
                                            {(prefix || '') + num}
                                        </span>
                                    );
                                })}
                                <span className="text-gray-400 text-sm font-bold">…</span>
                            </div>
                        </div>
                        <FiArrowRight className="text-gray-300" size={16} />
                    </div>

                    {/* Warning + Confirm */}
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="receiptConfirm"
                                checked={confirmed}
                                onChange={e => setConfirmed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-red-500 flex-shrink-0 cursor-pointer"
                            />
                            <label htmlFor="receiptConfirm" className="text-xs text-red-700 leading-relaxed cursor-pointer">
                                <strong>⚠️ I understand:</strong> Setting this will reset the counter to <strong>{preview}</strong>.
                                Any payments already recorded will keep their existing receipt numbers.
                                Only <strong>new payments</strong> from this point forward will use the new numbering.
                                I have confirmed this matches my physical receipt book.
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3">
                    <button onClick={load}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !confirmed || !startNum}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                            : <><FiSave size={16} /> Set Receipt Number to {preview}</>
                        }
                    </button>
                </div>

                {/* Coverage note */}
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <FiCheckCircle className="text-green-500 flex-shrink-0" size={14} />
                    <p className="text-xs text-green-700 font-semibold">
                        This applies to: <strong>Web payments</strong> · <strong>Mobile APK (bursar)</strong> · <strong>Parent portal</strong> · <strong>M-Pesa integration</strong> — all use the same atomic counter.
                    </p>
                </div>
            </div>
        </div>
    );
}
