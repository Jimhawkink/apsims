'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt } from '../useFeeData';
import { FiSearch, FiUsers, FiDollarSign, FiDownload, FiPlus, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiArrowLeft, FiPhone } from 'react-icons/fi';

export default function OutstandingFeesPage() {
    const { forms, streams, students, payments, structures, terms, loading, fetchAll, currentTerm, getFormName, getStreamName, getStudentFees } = useFeeData();
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const outstanding = students
        .filter(s => s.status === 'Active')
        .filter(s => !filterForm || String(s.form_id) === filterForm)
        .filter(s => !filterStream || String(s.stream_id) === filterStream)
        .filter(s => { if (!search) return true; const q = search.toLowerCase(); return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q) || (s.guardian_phone || '').includes(q); })
        .map(s => ({ ...s, ...getStudentFees(s.id, s.form_id) }))
        .filter(s => s.termBalance > 0 || s.annualBalance > 0)
        .sort((a, b) => b.annualBalance - a.annualBalance);

    const totalPages = Math.ceil(outstanding.length / perPage);
    const paginated = outstanding.slice((page - 1) * perPage, page * perPage);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalOutstanding = outstanding.reduce((s, st) => s + st.annualBalance, 0);
    const totalTermBalance = outstanding.reduce((s, st) => s + st.termBalance, 0);

    const exportCSV = () => {
        const headers = ['#','Adm No','Student Name','Form','Stream','Guardian Phone','Total Paid','Term Balance','Annual Balance'];
        const rows = outstanding.map((s, i) => [i + 1, s.admission_no || s.admission_number, `${s.first_name} ${s.last_name}`, getFormName(s.form_id), getStreamName(s.stream_id), s.guardian_phone || '', s.totalPaid, s.termBalance, s.annualBalance]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `outstanding_fees_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const text = await file.text(); const lines = text.split('\n').filter(Boolean);
        if (lines.length < 2) { toast.error('Empty file'); return; }
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const admIdx = headers.findIndex(h => h.includes('adm'));
        const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('balance') || h.includes('paid'));
        if (admIdx < 0 || amtIdx < 0) { toast.error('CSV must have adm no and amount columns'); return; }
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            const admNo = cols[admIdx]; const amount = Number(cols[amtIdx]);
            if (!admNo || isNaN(amount) || amount <= 0) continue;
            const student = students.find(s => (s.admission_no || s.admission_number || '') == admNo);
            if (!student) continue;
            const { error } = await supabase.from('school_fee_payments').insert([{ student_id: student.id, amount, payment_date: new Date().toISOString().split('T')[0], payment_method: 'Imported', receipt_number: `IMP-${Date.now().toString().slice(-6)}-${i}`, term_id: currentTerm?.id || null, year: new Date().getFullYear() }]);
            if (!error) imported++;
        }
        toast.success(`${imported} records imported ✅`); fetchAll();
    };

    const inputCls = "px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all";

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="w-10 h-10 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading...</p></div></div>;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5"><span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><FiAlertTriangle size={18} /></span> Outstanding Fees</h1><p className="text-sm text-gray-400 mt-0.5 ml-12">Students with pending fee balances</p></div>
                <Link href="/dashboard/fees" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"><FiArrowLeft size={12} /> Fee Dashboard</Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><FiUsers size={18} className="text-red-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Students Owing</p><p className="text-xl font-extrabold text-gray-900">{outstanding.length}</p></div></div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><FiDollarSign size={18} className="text-amber-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Term Outstanding</p><p className="text-xl font-extrabold text-gray-900">{fmt(totalTermBalance)}</p></div></div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><FiDollarSign size={18} className="text-red-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Annual Outstanding</p><p className="text-xl font-extrabold text-gray-900">{fmt(totalOutstanding)}</p></div></div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><FiDollarSign size={18} className="text-emerald-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Total Collected</p><p className="text-xl font-extrabold text-gray-900">{fmt(totalCollected)}</p></div></div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, adm no, or phone..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-red-400 outline-none" /></div>
                    <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }} className={inputCls + ' min-w-[140px]'}><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
                    <select value={filterStream} onChange={e => { setFilterStream(e.target.value); setPage(1); }} className={inputCls + ' min-w-[140px]'}><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select>
                    <label className={inputCls + ' cursor-pointer flex items-center gap-1.5 text-gray-600'}><FiPlus size={14} /> Import CSV<input type="file" accept=".csv" onChange={handleImport} className="hidden" /></label>
                    <button onClick={exportCSV} className="px-5 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><FiDownload size={14} /> Export</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {paginated.length === 0 ? (
                    <div className="text-center py-20 text-gray-300"><span className="text-4xl block mb-2">✅</span><p className="font-medium text-sm">All students are up to date!</p></div>
                ) : (<>
                    <div className="overflow-x-auto"><table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stream</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Guardian Phone</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Paid</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Term Bal</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Annual Bal</th>
                        </tr></thead>
                        <tbody>{paginated.map((s, i) => (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/dashboard/fees/collect?adm=${s.admission_no || s.admission_number}`}>
                                <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                <td className="px-4 py-3"><span className="font-bold text-indigo-600">{s.admission_no || s.admission_number}</span></td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                <td className="px-4 py-3 text-xs font-medium text-gray-500">{getFormName(s.form_id)}</td>
                                <td className="px-4 py-3 text-xs font-medium text-gray-500">{getStreamName(s.stream_id)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-1">{s.guardian_phone ? <><FiPhone size={10} className="text-gray-400" />{s.guardian_phone}</> : '-'}</td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(s.totalPaid)}</td>
                                <td className="px-4 py-3 text-right"><span className={`font-bold ${s.termBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(s.termBalance)}</span></td>
                                <td className="px-4 py-3 text-right"><span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-bold">{fmt(s.annualBalance)}</span></td>
                            </tr>
                        ))}</tbody>
                        <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td colSpan={6} className="px-4 py-3 font-bold text-gray-600 text-sm">Total ({outstanding.length} students)</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">{fmt(outstanding.reduce((s, st) => s + st.totalPaid, 0))}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-700 text-sm">{fmt(totalTermBalance)}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-700 text-sm">{fmt(totalOutstanding)}</td>
                        </tr></tfoot>
                    </table></div>
                    {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between"><p className="text-xs text-gray-500">Page {page} of {totalPages} • {outstanding.length} students</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronLeft size={16} /></button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronRight size={16} /></button></div></div>}
                </>)}
            </div>
        </div>
    );
}
