'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiCheck, FiX, FiDownload, FiBarChart2,
    FiUsers, FiAlertTriangle, FiCheckCircle, FiRefreshCw,
    FiPrinter, FiFileText, FiFilter,
} from 'react-icons/fi';

type RimTab = 'register' | 'brought' | 'not_brought' | 'reports' | 'print';
const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear();
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function RimPaperPage() {
    const [tab, setTab] = useState<RimTab>('register');
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const [selTerm, setSelTerm] = useState('Term 1');
    const [selYear, setSelYear] = useState(CURRENT_YEAR);
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<number | null>(null);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [rptForm, setRptForm] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, r, sc] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_rim_paper').select('*').order('created_at', { ascending: false }),
            supabase.from('school_details').select('*').maybeSingle(),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setRecords(r.data || []);
        setSchoolInfo(sc.data || {});
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (fid: any) => forms.find(f => f.id === fid)?.form_name || '—';
    const getStreamName = (sid: any) => streams.find(s => s.id === sid)?.stream_name || '—';
    const getRecord = (studentId: number) => records.find(r => r.student_id === studentId && r.term_name === selTerm && r.year === selYear);

    /* ─── filtered students ─── */
    const filterStudents = (list: any[]) => list.filter(s => {
        if (selForm && s.form_id !== Number(selForm)) return false;
        if (selStream && s.stream_id !== Number(selStream)) return false;
        if (search) {
            const txt = `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase();
            if (!txt.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    const registerStudents = useMemo(() => filterStudents(students), [students, selForm, selStream, search]);
    const termRecords = useMemo(() => records.filter(r => r.term_name === selTerm && r.year === selYear), [records, selTerm, selYear]);
    const broughtCount = termRecords.filter(r => r.brought).length;
    const totalStudents = students.length;
    const compliancePct = totalStudents > 0 ? Math.round(broughtCount / totalStudents * 100) : 0;
    const todayCollected = termRecords.filter(r => r.brought && r.brought_date === new Date().toISOString().split('T')[0]).length;

    const broughtStudents = useMemo(() => students.filter(s => {
        const rec = getRecord(s.id); if (!rec?.brought) return false;
        if (rptForm && s.form_id !== Number(rptForm)) return false;
        return true;
    }), [students, records, selTerm, selYear, rptForm]);

    const notBroughtStudents = useMemo(() => students.filter(s => {
        const rec = getRecord(s.id); if (rec?.brought) return false;
        if (rptForm && s.form_id !== Number(rptForm)) return false;
        return true;
    }), [students, records, selTerm, selYear, rptForm]);

    /* ─── form stats for chart ─── */
    const formStats = useMemo(() => forms.map(f => {
        const fs = students.filter(s => s.form_id === f.id);
        const b = fs.filter(s => { const r = getRecord(s.id); return r?.brought; }).length;
        const pct = fs.length ? Math.round(b / fs.length * 100) : 0;
        return { form: f.form_name, total: fs.length, brought: b, notBrought: fs.length - b, pct };
    }), [forms, students, records, selTerm, selYear]);

    const streamStats = useMemo(() => streams.map(st => {
        const ss = students.filter(s => s.stream_id === st.id);
        const b = ss.filter(s => { const r = getRecord(s.id); return r?.brought; }).length;
        const pct = ss.length ? Math.round(b / ss.length * 100) : 0;
        return { stream: st.stream_name, total: ss.length, brought: b, notBrought: ss.length - b, pct };
    }), [streams, students, records, selTerm, selYear]);

    /* ─── TOGGLE ─── */
    const handleToggle = async (student: any, brought: boolean) => {
        setSaving(student.id);
        const existing = getRecord(student.id);
        const payload = { student_id: student.id, term_name: selTerm, year: selYear, brought, brought_date: brought ? new Date().toISOString().split('T')[0] : null, registered_by: 'admin' };
        if (existing) {
            await supabase.from('school_rim_paper').update({ brought, brought_date: payload.brought_date }).eq('id', existing.id);
        } else {
            await supabase.from('school_rim_paper').upsert([payload], { onConflict: 'student_id,term_name,year' });
        }
        await fetchAll(); setSaving(null);
        toast.success(`${student.first_name} — ${brought ? '✅ Brought' : '❌ Unmarked'}`);
    };

    /* ─── BULK MARK ─── */
    const handleBulkMark = async (brought: boolean) => {
        const toUpdate = registerStudents.filter(s => { const r = getRecord(s.id); return !r || r.brought !== brought; });
        if (!toUpdate.length) { toast('All already marked'); return; }
        setBulkSaving(true);
        const rows = toUpdate.map(s => ({ student_id: s.id, term_name: selTerm, year: selYear, brought, brought_date: brought ? new Date().toISOString().split('T')[0] : null, registered_by: 'admin' }));
        await supabase.from('school_rim_paper').upsert(rows, { onConflict: 'student_id,term_name,year' });
        await fetchAll(); setBulkSaving(false);
        toast.success(`${toUpdate.length} student(s) marked as ${brought ? 'Brought' : 'Not Brought'}`);
    };

    /* ─── EXPORT CSV ─── */
    const exportCSV = (data: any[], filename: string, headers: string[], rowFn: (item: any, i: number) => any[]) => {
        const csv = [headers.join(','), ...data.map((d, i) => rowFn(d, i).map((c: any) => `"${c}"`).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = filename; a.click(); toast.success('Exported ✅');
    };

    /* ─── PRINT ─── */
    const printList = (type: 'register' | 'brought' | 'not_brought') => {
        const list = type === 'brought' ? broughtStudents : type === 'not_brought' ? notBroughtStudents : registerStudents;
        const title = type === 'brought' ? 'Students Who Brought Rim Paper' : type === 'not_brought' ? 'Students Who Have NOT Brought Rim Paper' : 'Rim Paper Register';
        const accentColor = type === 'brought' ? '#16a34a' : type === 'not_brought' ? '#dc2626' : '#4338ca';
        const w = window.open('', '_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b;font-size:12px;}
.h{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid ${accentColor};}
.hn{font-size:18px;font-weight:900;color:${accentColor};}.meta{font-size:11px;color:#64748b;margin-top:4px;}
table{width:100%;border-collapse:collapse;margin:12px 0;}
th{background:${accentColor};color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;}
td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;}
tr:nth-child(even)td{background:#f8fafc;}
${type === 'register' ? '.cb{width:16px;height:16px;border:2px solid #64748b;display:inline-block;}' : ''}
.footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;}
.sign{border-top:2px solid #334155;padding-top:8px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;}
.summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px;display:flex;gap:24px;}
.s-card{text-align:center;}.s-val{font-size:20px;font-weight:900;color:${accentColor};}.s-lbl{font-size:10px;color:#64748b;text-transform:uppercase;}
</style></head><body>
<div class="h">
<div><p class="hn">${schoolInfo?.school_name || 'APSIMS School'}</p><p class="meta">${schoolInfo?.address || ''} | ${schoolInfo?.phone || ''}</p></div>
<div style="text-align:right"><p style="font-size:10px;text-transform:uppercase;color:#64748b">${title}</p>
<p style="font-size:14px;font-weight:900;color:${accentColor}">${selTerm} ${selYear}</p>
<p style="font-size:10px;color:#94a3b8">Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div></div>
<div class="summary">
<div class="s-card"><div class="s-val">${totalStudents}</div><div class="s-lbl">Total Students</div></div>
<div class="s-card"><div class="s-val" style="color:#16a34a">${broughtCount}</div><div class="s-lbl">Brought</div></div>
<div class="s-card"><div class="s-val" style="color:#dc2626">${totalStudents - broughtCount}</div><div class="s-lbl">Not Brought</div></div>
<div class="s-card"><div class="s-val">${compliancePct}%</div><div class="s-lbl">Compliance</div></div>
</div>
<table><thead><tr>
<th>#</th><th>Adm No</th><th>Student Name</th><th>Form</th><th>Stream</th>
${type === 'not_brought' ? '<th>Guardian</th><th>Phone</th>' : type === 'brought' ? '<th>Date Brought</th>' : '<th>Status</th><th style="width:60px">✓</th>'}
</tr></thead><tbody>
${list.map((s, i) => {
    const rec = records.find(r => r.student_id === s.id && r.term_name === selTerm && r.year === selYear);
    return `<tr>
<td>${i + 1}</td><td style="font-weight:700;color:#1e40af">${s.admission_number || '—'}</td>
<td style="font-weight:600">${s.first_name} ${s.last_name}</td>
<td>${getFormName(s.form_id)}</td><td>${getStreamName(s.stream_id)}</td>
${type === 'not_brought' ? `<td>${s.guardian_name || '—'}</td><td style="font-weight:700">${s.guardian_phone || '—'}</td>` : ''}
${type === 'brought' ? `<td>${rec?.brought_date ? new Date(rec.brought_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>` : ''}
${type === 'register' ? `<td><span style="background:${rec?.brought ? '#dcfce7' : '#fee2e2'};color:${rec?.brought ? '#166534' : '#991b1b'};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">${rec?.brought ? 'Brought' : 'Not Brought'}</span></td><td><div class="cb"></div></td>` : ''}
</tr>`;
}).join('')}
</tbody></table>
<div class="footer">
<div class="sign">Class Teacher<br/>${new Date().toLocaleDateString('en-KE')}</div>
<div class="sign">Dean of Students<br/>___________</div>
<div class="sign">Principal<br/>___________</div>
</div>
<p style="text-align:center;margin-top:24px;font-size:10px;color:#94a3b8">APSIMS Rim Paper Tracker · ${new Date().toLocaleString('en-KE')}</p>
<script>window.onload=()=>{window.print();}<\/script></body></html>`);
        w?.document.close();
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200 bg-white transition';

    const TABS = [
        { key: 'register', label: '📋 Register', icon: FiCheck },
        { key: 'brought', label: '✅ Brought', count: broughtCount },
        { key: 'not_brought', label: '❌ Not Brought', count: totalStudents - broughtCount },
        { key: 'reports', label: '📊 Reports' },
        { key: 'print', label: '🖨️ Print' },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)' }}>📄</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Rim Paper Tracker…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ════ HERO ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#a5b4fc,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                <FiFileText className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    📄 Rim Paper Tracker
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>ULTRA</span>
                                </h1>
                                <p className="text-indigo-300 text-xs mt-0.5 font-medium">Track student rim paper submissions · {selTerm} {selYear}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => handleBulkMark(true)} disabled={bulkSaving}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                <FiCheckCircle size={12} /> Mark All Brought
                            </button>
                            <button onClick={() => exportCSV(broughtStudents, `rim_${selTerm}_${selYear}.csv`, ['#', 'Adm No', 'Name', 'Form', 'Stream', 'Date'],
                                (s, i) => { const r = getRecord(s.id); return [i + 1, s.admission_number || '', `${s.first_name} ${s.last_name}`, getFormName(s.form_id), getStreamName(s.stream_id), r?.brought_date || '']; })}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition">
                                <FiDownload size={12} /> Export
                            </button>
                            <button onClick={fetchAll} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"><FiRefreshCw size={14} /></button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Collection Progress</span>
                            <span className="text-lg font-black text-white">{compliancePct}%</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${compliancePct}%`, background: compliancePct >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : compliancePct >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-4">
                        {[
                            { label: 'Total Students', value: totalStudents, icon: '👥' },
                            { label: 'Brought', value: broughtCount, icon: '✅' },
                            { label: 'Not Brought', value: totalStudents - broughtCount, icon: '❌', pulse: (totalStudents - broughtCount) > 0 },
                            { label: 'Compliance', value: `${compliancePct}%`, icon: '📊' },
                            { label: "Today's Collection", value: todayCollected, icon: '📅' },
                        ].map((c: any, i) => (
                            <div key={i} className={`rounded-xl p-3 ${c.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{c.icon}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span>
                                </div>
                                <p className="text-xl font-black text-white">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ════ TERM / YEAR / FORM / STREAM SELECTOR ════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5"><FiFilter size={11} /> Filter Context</p>
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Term pills */}
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Term</p>
                        <div className="flex gap-1.5">
                            {TERM_OPTIONS.map(t => (
                                <button key={t} onClick={() => setSelTerm(t)}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all"
                                    style={selTerm === t ? { background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', boxShadow: '0 4px 12px -2px rgba(99,102,241,0.4)' } : { background: '#f8fafc', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="min-w-[90px]">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Year</p>
                        <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} className={inputCls}>
                            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[110px]">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Form</p>
                        <select value={tab === 'register' ? selForm : rptForm} onChange={e => tab === 'register' ? setSelForm(e.target.value) : setRptForm(e.target.value)} className={inputCls}>
                            <option value="">All Forms</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[110px]">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Stream</p>
                        <select value={selStream} onChange={e => setSelStream(e.target.value)} className={inputCls}>
                            <option value="">All Streams</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Search</p>
                        <div className="relative">
                            <FiSearch size={13} className="absolute left-3 top-2.5 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or Adm No…" className={`${inputCls} pl-9`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ════ TABS ════ */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as RimTab)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                        style={tab === t.key
                            ? { background: 'linear-gradient(135deg,#312e81,#4338ca)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(67,56,202,0.4)' }
                            : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                        {t.label}
                        {'count' in t && t.count !== undefined && <span className="text-[10px] font-black opacity-60">({t.count})</span>}
                    </button>
                ))}
            </div>

            {/* ════ REGISTER TAB ════ */}
            {tab === 'register' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiCheck size={15} className="text-indigo-500" /> Tick Students Who Brought Rim Paper</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selTerm} {selYear} · {registerStudents.length} student(s)</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => handleBulkMark(true)} disabled={bulkSaving}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white disabled:opacity-50 transition"
                                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                <FiCheckCircle className="inline mr-1" size={10} /> All Brought
                            </button>
                            <button onClick={() => handleBulkMark(false)} disabled={bulkSaving}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition">
                                <FiX className="inline mr-1" size={10} /> Clear All
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {['#', 'Adm No', 'Student Name', 'Form', 'Stream', 'Status', 'Date Brought', 'Action'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {registerStudents.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                                        <FiUsers className="mx-auto mb-2" size={28} />
                                        <p className="text-sm font-medium">Select a form or stream to view students</p>
                                    </td></tr>
                                ) : registerStudents.map((s, i) => {
                                    const rec = getRecord(s.id);
                                    const brought = rec?.brought || false;
                                    return (
                                        <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${brought ? 'bg-green-50/30' : ''}`}>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-indigo-600">{s.admission_number || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{getFormName(s.form_id)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{getStreamName(s.stream_id)}</td>
                                            <td className="px-3 py-2.5">
                                                {brought
                                                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1 w-fit"><FiCheckCircle size={9} /> Brought</span>
                                                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1 w-fit"><FiX size={9} /> Not Brought</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">
                                                {rec?.brought_date ? new Date(rec.brought_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {saving === s.id || bulkSaving ? (
                                                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                                ) : brought ? (
                                                    <button onClick={() => handleToggle(s, false)}
                                                        className="px-3 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-all flex items-center gap-1">
                                                        <FiX size={10} /> Undo
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleToggle(s, true)}
                                                        className="px-3 py-1 rounded-lg text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-all flex items-center gap-1">
                                                        <FiCheck size={10} /> ✓ Tick
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
                        <span>{registerStudents.filter(s => getRecord(s.id)?.brought).length} / {registerStudents.length} brought</span>
                        <span className="font-bold" style={{ color: compliancePct >= 80 ? '#16a34a' : compliancePct >= 50 ? '#d97706' : '#dc2626' }}>{compliancePct}% compliance</span>
                    </div>
                </div>
            )}

            {/* ════ BROUGHT LIST ════ */}
            {tab === 'brought' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-green-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiCheckCircle size={15} className="text-green-500" /> Students Who Brought Rim Paper</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selTerm} {selYear} · {broughtStudents.length} students</p>
                        </div>
                        <button onClick={() => exportCSV(broughtStudents, `rim_brought_${selTerm}_${selYear}.csv`, ['#', 'Adm No', 'Name', 'Form', 'Stream', 'Date'],
                            (s, i) => { const r = getRecord(s.id); return [i + 1, s.admission_number || '', `${s.first_name} ${s.last_name}`, getFormName(s.form_id), getStreamName(s.stream_id), r?.brought_date || '']; })}
                            className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl flex items-center gap-1 transition">
                            <FiDownload size={12} /> Export
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Adm No', 'Student Name', 'Form', 'Stream', 'Date Brought'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {broughtStudents.length === 0
                                    ? <tr><td colSpan={6} className="text-center py-16 text-gray-400"><FiCheckCircle className="mx-auto mb-2 text-green-300" size={28} /><p className="text-sm">No students have brought rim paper yet</p></td></tr>
                                    : broughtStudents.map((s, i) => {
                                        const rec = getRecord(s.id);
                                        return (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-green-50/30">
                                                <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                <td className="px-3 py-2.5 text-xs font-bold text-indigo-600">{s.admission_number || '—'}</td>
                                                <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-500">{getFormName(s.form_id)}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-500">{getStreamName(s.stream_id)}</td>
                                                <td className="px-3 py-2.5 text-xs font-semibold text-green-700">{rec?.brought_date ? fmtDate(rec.brought_date) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ NOT BROUGHT ════ */}
            {tab === 'not_brought' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {notBroughtStudents.length > 0 && (
                        <div className="px-5 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2">
                            <FiAlertTriangle className="text-red-500" size={14} />
                            <p className="text-xs font-bold text-red-700">⚠️ {notBroughtStudents.length} students have NOT brought rim paper this {selTerm}</p>
                        </div>
                    )}
                    <div className="px-5 py-3 border-b border-gray-100 bg-red-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiAlertTriangle size={15} className="text-red-500" /> Not Brought List</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selTerm} {selYear} · {notBroughtStudents.length} students to follow up</p>
                        </div>
                        <button onClick={() => exportCSV(notBroughtStudents, `rim_not_brought_${selTerm}_${selYear}.csv`, ['#', 'Adm No', 'Name', 'Form', 'Stream', 'Guardian', 'Phone'],
                            (s, i) => [i + 1, s.admission_number || '', `${s.first_name} ${s.last_name}`, getFormName(s.form_id), getStreamName(s.stream_id), s.guardian_name || '', s.guardian_phone || ''])}
                            className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl flex items-center gap-1 transition">
                            <FiDownload size={12} /> Export with Contacts
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Adm No', 'Student Name', 'Form', 'Stream', 'Guardian', 'Phone'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {notBroughtStudents.length === 0
                                    ? <tr><td colSpan={7} className="text-center py-16 text-green-500 font-bold"><FiCheckCircle className="mx-auto mb-2" size={28} /><p>All students have brought rim paper! 🎉</p></td></tr>
                                    : notBroughtStudents.map((s, i) => (
                                        <tr key={s.id} className="border-b border-gray-100 hover:bg-red-50/20">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-indigo-600">{s.admission_number || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{getFormName(s.form_id)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{getStreamName(s.stream_id)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{s.guardian_name || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-gray-700">{s.guardian_phone || '—'}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ REPORTS TAB ════ */}
            {tab === 'reports' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Students', value: totalStudents, color: '#4338ca' },
                            { label: 'Brought', value: broughtCount, color: '#16a34a' },
                            { label: 'Not Brought', value: totalStudents - broughtCount, color: '#dc2626' },
                            { label: 'Compliance', value: `${compliancePct}%`, color: compliancePct >= 80 ? '#16a34a' : compliancePct >= 50 ? '#d97706' : '#dc2626' },
                        ].map((c, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="text-2xl font-black" style={{ color: c.color }}>{c.value}</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium">{c.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* By Form - CSS bar chart */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                            <FiBarChart2 size={16} className="text-indigo-500" />
                            <h3 className="font-bold text-gray-800">Compliance by Form</h3>
                        </div>
                        <div className="p-5 space-y-3">
                            {formStats.map(f => (
                                <div key={f.form} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-gray-700 w-20">{f.form}</span>
                                        <span className="text-gray-400">{f.brought}/{f.total}</span>
                                        <span className="font-black w-12 text-right" style={{ color: f.pct >= 80 ? '#16a34a' : f.pct >= 50 ? '#d97706' : '#dc2626' }}>{f.pct}%</span>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${f.pct}%`, background: f.pct >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : f.pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* By Stream */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                            <FiUsers size={16} className="text-purple-500" />
                            <h3 className="font-bold text-gray-800">Compliance by Stream</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200">
                                    {['Stream', 'Total', 'Brought', 'Not Brought', 'Compliance'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {streamStats.map(s => (
                                        <tr key={s.stream} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-2.5 font-bold text-gray-800">{s.stream}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600">{s.total}</td>
                                            <td className="px-4 py-2.5 text-sm font-bold text-green-600">{s.brought}</td>
                                            <td className="px-4 py-2.5 text-sm font-bold text-red-600">{s.notBrought}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.pct >= 80 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                                                    </div>
                                                    <span className="text-xs font-black" style={{ color: s.pct >= 80 ? '#16a34a' : s.pct >= 50 ? '#d97706' : '#dc2626' }}>{s.pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ PRINT TAB ════ */}
            {tab === 'print' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {([
                        { type: 'register' as const, title: '📋 Print Register', desc: 'Full student list with checkbox columns for manual ticking', color: '#4338ca', bg: 'linear-gradient(135deg,#312e81,#4338ca)' },
                        { type: 'brought' as const, title: '✅ Print Brought List', desc: `Official list of ${broughtStudents.length} students who brought rim paper`, color: '#16a34a', bg: 'linear-gradient(135deg,#166534,#22c55e)' },
                        { type: 'not_brought' as const, title: '❌ Print Not-Brought', desc: `Follow-up list of ${notBroughtStudents.length} students with guardian contacts`, color: '#dc2626', bg: 'linear-gradient(135deg,#991b1b,#ef4444)' },
                    ]).map(p => (
                        <div key={p.type} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="px-5 py-4" style={{ background: p.bg }}>
                                <h3 className="text-base font-extrabold text-white">{p.title}</h3>
                                <p className="text-white/70 text-xs mt-1">{p.desc}</p>
                            </div>
                            <div className="p-5 space-y-3">
                                <p className="text-xs text-gray-500">Includes school header, term info, student table, and signature lines.</p>
                                <button onClick={() => printList(p.type)}
                                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md transition hover:opacity-90"
                                    style={{ background: p.bg }}>
                                    <FiPrinter size={14} /> Print {p.type === 'register' ? 'Register' : p.type === 'brought' ? 'Brought List' : 'Not Brought List'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
