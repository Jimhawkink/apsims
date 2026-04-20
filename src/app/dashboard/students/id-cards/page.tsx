'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCreditCard, FiPrinter, FiSearch, FiFilter } from 'react-icons/fi';

export default function IDCardsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [search, setSearch] = useState('');
    const [selStudents, setSelStudents] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, sd] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_details').select('*').limit(1).maybeSingle(),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSchoolDetails(sd.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    const filtered = students.filter(s => {
        if (selForm && String(s.form_id) !== selForm) return false;
        if (selStream && String(s.stream_id) !== selStream) return false;
        if (search) { const q = search.toLowerCase(); if (!`${s.first_name} ${s.last_name} ${s.admission_no || ''}`.toLowerCase().includes(q)) return false; }
        return true;
    });

    useEffect(() => {
        setSelStudents(selectAll ? new Set(filtered.map(s => s.id)) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectAll]);

    const selectedStudents = students.filter(s => selStudents.has(s.id));

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <style jsx global>{`
                @media print { body * { visibility: hidden; } .print-cards, .print-cards * { visibility: visible; } .print-cards { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } @page { margin: 5mm; } }
            `}</style>

            <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiCreditCard className="text-indigo-500" /> Student ID Cards</h1>
                <p className="text-sm text-gray-500 mt-1">Generate and print student identity cards</p></div>
                {selectedStudents.length > 0 && (
                    <button onClick={() => window.print()} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <FiPrinter size={14} /> Print {selectedStudents.length} Card(s)
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="lbl">Form</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelStudents(new Set()); setSelectAll(false); }} className="select-modern w-full text-sm"><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Search</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or Adm No..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none" /></div>
                    <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer py-2.5"><input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm font-semibold text-gray-600">Select All ({filtered.length})</span></label></div>
                </div>
            </div>

            {/* Student selection list */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <th className="px-3 py-2 w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Stream</th>
                    </tr></thead><tbody>
                        {filtered.map(s => (
                            <tr key={s.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 cursor-pointer ${selStudents.has(s.id) ? 'bg-indigo-50' : ''}`}
                                onClick={() => { const n = new Set(selStudents); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setSelStudents(n); }}>
                                <td className="px-3 py-2"><input type="checkbox" checked={selStudents.has(s.id)} readOnly className="w-4 h-4 rounded pointer-events-none" /></td>
                                <td className="px-3 py-2 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                <td className="px-3 py-2 text-sm">{getFormName(s.form_id)}</td>
                                <td className="px-3 py-2 text-sm">{getStreamName(s.stream_id)}</td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">{selStudents.size} of {filtered.length} selected</div>
            </div>

            {/* ID Cards Preview */}
            {selectedStudents.length > 0 && (
                <div className="print-cards">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedStudents.map(s => (
                            <div key={s.id} className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white shadow-lg" style={{ maxWidth: 350 }}>
                                {/* Card Header */}
                                <div className="py-3 px-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                                    <p className="text-xs font-bold uppercase tracking-wider">{schoolDetails?.school_name || 'Alpha School'}</p>
                                    {schoolDetails?.motto && <p className="text-[9px] italic opacity-80 mt-0.5">"{schoolDetails.motto}"</p>}
                                    <p className="text-[8px] mt-1 font-semibold uppercase tracking-widest bg-white/20 inline-block px-3 py-0.5 rounded-full">Student Identity Card</p>
                                </div>
                                {/* Card Body */}
                                <div className="px-4 py-3 flex gap-3">
                                    <div className="w-20 h-24 rounded-lg border-2 border-gray-200 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                                        style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                                        {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-1.5 text-xs">
                                        <div><span className="text-gray-400 font-semibold">Name:</span><p className="font-bold text-gray-800 text-sm">{s.first_name} {s.last_name}</p></div>
                                        <div><span className="text-gray-400 font-semibold">Adm No:</span><p className="font-bold text-blue-700">{s.admission_no || s.admission_number}</p></div>
                                        <div className="flex gap-4">
                                            <div><span className="text-gray-400 font-semibold">Form:</span><p className="font-bold text-gray-700">{getFormName(s.form_id)}</p></div>
                                            <div><span className="text-gray-400 font-semibold">Stream:</span><p className="font-bold text-gray-700">{getStreamName(s.stream_id)}</p></div>
                                        </div>
                                        <div><span className="text-gray-400 font-semibold">DOB:</span><span className="font-medium text-gray-700 ml-1">{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB') : '-'}</span></div>
                                    </div>
                                </div>
                                {/* Card Footer */}
                                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-[9px] text-gray-400"><p>Guardian: {s.guardian_name || '-'}</p><p>Tel: {s.guardian_phone || '-'}</p></div>
                                    <div className="text-right"><p className="text-[8px] text-gray-400">Valid: {new Date().getFullYear()}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
