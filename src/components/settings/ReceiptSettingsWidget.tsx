'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getAllDocumentSettings, setDocumentStart, DocType, DocumentCounter } from '@/lib/receiptNumber';
import toast from 'react-hot-toast';
import { FiSave, FiRefreshCw, FiCheck, FiEdit2, FiX } from 'react-icons/fi';

// Editing modal for one document type
function DocEditModal({ doc, onClose, onSaved }: { doc: DocumentCounter; onClose: () => void; onSaved: () => void }) {
    const [startNum, setStartNum] = useState(String(doc.counter));
    const [prefix, setPrefix]   = useState(doc.doc_prefix || '');
    const [confirmed, setConfirmed] = useState(false);
    const [saving, setSaving] = useState(false);

    const previewNum = parseInt(startNum, 10);
    const valid = !isNaN(previewNum) && previewNum > 0;
    const preview = valid ? (prefix || '') + previewNum : '—';

    const handleSave = async () => {
        if (!valid)     { toast.error('Enter a valid number'); return; }
        if (!confirmed) { toast.error('Please confirm first'); return; }
        setSaving(true);
        try {
            await setDocumentStart(supabase, doc.doc_code as DocType, previewNum, prefix);
            toast.success(`${doc.doc_label}: next number set to ${preview}`);
            onSaved();
            onClose();
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{doc.doc_icon}</span>
                        <div>
                            <h3 className="font-black text-gray-800 text-sm leading-none">{doc.doc_label}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{doc.doc_description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><FiX size={15} /></button>
                </div>

                <div className="px-5 py-5 space-y-4">
                    {/* Current status */}
                    <div className="flex gap-4">
                        <div className="text-center flex-1 bg-gray-50 rounded-xl py-2.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Current Next</p>
                            <p className="text-lg font-black text-blue-600 mt-0.5">{(doc.doc_prefix || '') + doc.counter}</p>
                        </div>
                        <div className="text-center flex-1 bg-gray-50 rounded-xl py-2.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Started At</p>
                            <p className="text-lg font-black text-gray-600 mt-0.5">{(doc.doc_prefix || '') + doc.start_num}</p>
                        </div>
                    </div>

                    {/* Inputs row */}
                    <div className="flex gap-3 items-end">
                        <div className="w-24 flex-shrink-0">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Prefix</label>
                            <input value={prefix}
                                onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9/\-]/g, ''))}
                                placeholder="PV/"
                                maxLength={8}
                                className="w-full border-2 border-gray-200 rounded-xl px-2 py-2 text-sm font-bold font-mono text-center focus:border-amber-400 outline-none transition placeholder:text-gray-300 placeholder:font-normal"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Set Next Number *</label>
                            <input type="number" min={1} value={startNum} onChange={e => setStartNum(e.target.value)}
                                placeholder="1001"
                                className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 text-xl font-black text-amber-700 text-center focus:border-amber-500 outline-none transition placeholder:text-amber-200 placeholder:font-normal"
                            />
                        </div>
                        <div className="flex-shrink-0 pb-0.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Preview</p>
                            <div className="flex gap-1">
                                {[0,1,2].map(o => (
                                    <span key={o} className={`font-mono font-black text-[11px] px-2 py-2 rounded-lg border-2 ${o===0 ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                        {valid ? (prefix||'')+(previewNum+o) : '—'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Confirm */}
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100">
                        <input type="checkbox" id={`confirm-${doc.doc_code}`} checked={confirmed}
                            onChange={e => setConfirmed(e.target.checked)}
                            className="mt-0.5 w-3.5 h-3.5 accent-red-500 flex-shrink-0 cursor-pointer" />
                        <label htmlFor={`confirm-${doc.doc_code}`} className="text-xs text-red-600 leading-relaxed cursor-pointer select-none">
                            I confirm: next <strong>{doc.doc_label}</strong> will be <strong className="font-black">{preview}</strong>. Existing records keep their numbers.
                        </label>
                    </div>

                    {/* Save */}
                    <button onClick={handleSave} disabled={saving || !confirmed || !valid}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm
                            bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20
                            hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100">
                        {saving
                            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</>
                            : <><FiSave size={13}/> Set → {preview}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// Category color map
const CAT_COLORS: Record<string, string> = {
    Finance:     'bg-blue-50 border-blue-200 text-blue-700',
    Payroll:     'bg-purple-50 border-purple-200 text-purple-700',
    Procurement: 'bg-orange-50 border-orange-200 text-orange-700',
    Accounting:  'bg-indigo-50 border-indigo-200 text-indigo-700',
    Stores:      'bg-green-50 border-green-200 text-green-700',
};

export default function ReceiptSettingsWidget() {
    const [docs, setDocs]         = useState<DocumentCounter[]>([]);
    const [loading, setLoading]   = useState(true);
    const [editing, setEditing]   = useState<DocumentCounter | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const all = await getAllDocumentSettings(supabase);
            setDocs(all);
        } catch (e: any) { toast.error('Failed to load: ' + e.message); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    // Group by category
    const grouped = docs.reduce((acc, d) => {
        const cat = d.doc_category || 'Finance';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(d);
        return acc;
    }, {} as Record<string, DocumentCounter[]>);

    if (loading) return (
        <div className="flex items-center gap-3 p-6">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin"/>
            <span className="text-sm text-gray-400">Loading document counters…</span>
        </div>
    );

    return (
        <div className="max-w-3xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-gray-800">📋 School Document Numbering</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Set starting numbers to match your physical books — all platforms use the same counter</p>
                </div>
                <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition">
                    <FiRefreshCw size={12}/> Refresh
                </button>
            </div>

            {/* Coverage badge */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <FiCheck className="text-emerald-500 flex-shrink-0" size={13}/>
                <p className="text-xs text-emerald-700 font-semibold">
                    All counters are <strong>atomic</strong> — Web · Mobile APK · Parent Portal · M-Pesa all share the same sequence. No duplicates ever.
                </p>
            </div>

            {/* Document cards grouped by category */}
            {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5 px-1">{category}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map(doc => (
                            <div key={doc.doc_code}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all p-4 flex items-center gap-3 group">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                                    {doc.doc_icon}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-gray-800 text-sm truncate">{doc.doc_label}</p>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${CAT_COLORS[doc.doc_category] || 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                            {doc.doc_code}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div>
                                            <p className="text-[10px] text-gray-400 leading-none">Next</p>
                                            <p className="font-black text-blue-600 text-sm leading-tight">{(doc.doc_prefix||'')+doc.counter}</p>
                                        </div>
                                        <div className="w-px h-6 bg-gray-100"/>
                                        <div>
                                            <p className="text-[10px] text-gray-400 leading-none">Prefix</p>
                                            <p className="font-mono font-bold text-gray-500 text-xs leading-tight">{doc.doc_prefix || '(none)'}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Edit button */}
                                <button onClick={() => setEditing(doc)}
                                    className="p-2 rounded-xl bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-400 border border-gray-200 hover:border-amber-200 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                                    <FiEdit2 size={13}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Edit modal */}
            {editing && (
                <DocEditModal
                    doc={editing}
                    onClose={() => setEditing(null)}
                    onSaved={load}
                />
            )}
        </div>
    );
}
