'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { setReceiptStart, getReceiptSettings } from '@/lib/receiptNumber';
import toast from 'react-hot-toast';
import { FiFileText, FiSave, FiRefreshCw, FiCheck, FiZap } from 'react-icons/fi';

export default function ReceiptSettingsWidget() {
    const [settings, setSettings]   = useState<{ receipt_counter: number; receipt_prefix: string; receipt_start: number } | null>(null);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [startNum, setStartNum]   = useState('');
    const [prefix, setPrefix]       = useState('');
    const [confirmed, setConfirmed] = useState(false);

    const load = async () => {
        setLoading(true);
        const s = await getReceiptSettings(supabase);
        setSettings(s);
        setStartNum(String(s.receipt_counter));
        setPrefix(s.receipt_prefix || '');
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const previewNum = parseInt(startNum, 10);
    const previewValid = !isNaN(previewNum) && previewNum > 0;
    const previewFull = previewValid ? (prefix || '') + previewNum : '—';

    const handleSave = async () => {
        if (!previewValid) { toast.error('Enter a valid number'); return; }
        if (!confirmed)    { toast.error('Please tick the confirmation box first'); return; }
        setSaving(true);
        try {
            await setReceiptStart(supabase, previewNum, prefix);
            toast.success(`Receipt numbering set! Next: ${previewFull}`);
            setConfirmed(false);
            await load();
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center gap-3 p-6">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading…</span>
        </div>
    );

    return (
        <div className="max-w-2xl">

            {/* ── Header card ── */}
            <div className="rounded-2xl overflow-hidden border border-amber-200/60 shadow-lg shadow-amber-500/10">
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiFileText className="text-white" size={17} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-base leading-none">Receipt Numbering</h3>
                        <p className="text-amber-100 text-xs mt-0.5">Match your physical receipt book</p>
                    </div>
                </div>

                {/* ── Status row ── */}
                <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Receipt</p>
                        <p className="text-xl font-black text-emerald-600 mt-0.5">
                            {(settings?.receipt_prefix || '') + (settings?.receipt_counter || 1)}
                        </p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Started At</p>
                        <p className="text-xl font-black text-blue-600 mt-0.5">
                            {(settings?.receipt_prefix || '') + (settings?.receipt_start || 1)}
                        </p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prefix</p>
                        <p className="text-xl font-black text-gray-700 mt-0.5">
                            {settings?.receipt_prefix || <span className="text-gray-300 font-semibold text-sm">None</span>}
                        </p>
                    </div>
                    <button onClick={load} className="ml-auto p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                        <FiRefreshCw size={13} />
                    </button>
                </div>

                {/* ── Form body ── */}
                <div className="bg-white px-5 py-5 space-y-5">

                    {/* Info tip */}
                    <div className="flex gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <FiZap className="text-blue-400 flex-shrink-0 mt-0.5" size={13} />
                        <p className="text-xs text-blue-600 leading-relaxed">
                            Open your receipt book → enter the <strong>first unused number</strong> below.
                            All payments (web, mobile, parent portal) will auto-number from there.
                        </p>
                    </div>

                    {/* ── Inputs row ── */}
                    <div className="flex items-end gap-3">

                        {/* Prefix */}
                        <div className="w-28 flex-shrink-0">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                Prefix
                            </label>
                            <input
                                value={prefix}
                                onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9/\-]/g, ''))}
                                placeholder="RCT/"
                                maxLength={8}
                                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold font-mono text-center focus:border-amber-400 outline-none transition-all placeholder:text-gray-300 placeholder:font-normal"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 text-center">Optional</p>
                        </div>

                        {/* Starting number — the hero input */}
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                Starting Receipt Number *
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={startNum}
                                onChange={e => setStartNum(e.target.value)}
                                placeholder="89635"
                                className="w-full border-2 border-amber-300 rounded-xl px-4 py-2.5 text-2xl font-black text-amber-700 text-center focus:border-amber-500 outline-none transition-all placeholder:text-amber-200 placeholder:font-normal"
                            />
                        </div>

                        {/* Live preview badge */}
                        <div className="flex-shrink-0 pb-0.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Preview</p>
                            <div className="flex items-center gap-1">
                                {previewValid ? (
                                    [0, 1, 2].map(offset => (
                                        <span key={offset}
                                            className={`font-mono font-black text-xs px-2.5 py-2.5 rounded-xl border-2 transition-all ${
                                                offset === 0
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                                                    : 'bg-gray-50 text-gray-400 border-gray-200'
                                            }`}>
                                            {(prefix || '') + (previewNum + offset)}
                                        </span>
                                    ))
                                ) : (
                                    <span className="font-mono text-xs px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-300">—</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Confirmation ── */}
                    <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl border border-red-100">
                        <input
                            type="checkbox"
                            id="receiptConfirm"
                            checked={confirmed}
                            onChange={e => setConfirmed(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-red-500 flex-shrink-0 cursor-pointer rounded"
                        />
                        <label htmlFor="receiptConfirm" className="text-xs text-red-600 leading-relaxed cursor-pointer select-none">
                            I confirm: counter will reset to <strong className="font-black">{previewFull}</strong>.
                            Existing receipts keep their numbers. Only <strong>new payments</strong> use the new sequence.
                        </label>
                    </div>

                    {/* ── Save button ── */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving || !confirmed || !previewValid}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all
                                bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25
                                hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99]
                                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100">
                            {saving
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                                : <><FiSave size={14} /> Set Next Receipt → {previewFull}</>
                            }
                        </button>
                    </div>
                </div>

                {/* ── Footer coverage note ── */}
                <div className="bg-emerald-50 border-t border-emerald-100 px-5 py-3 flex items-center gap-2">
                    <FiCheck className="text-emerald-500 flex-shrink-0" size={13} />
                    <p className="text-xs text-emerald-700 font-semibold">
                        Applies to: <strong>Web</strong> · <strong>Mobile APK</strong> · <strong>Parent Portal</strong> · <strong>M-Pesa</strong>
                        <span className="text-emerald-400 font-normal ml-1">— all use the same atomic counter</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
