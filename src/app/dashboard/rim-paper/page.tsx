'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiCheck, FiX, FiDownload, FiList, FiBarChart2,
    FiUsers, FiAlertTriangle, FiCheckCircle, FiFilter, FiFileText
} from 'react-icons/fi';

type RimTab = 'register' | 'brought' | 'not_brought' | 'reports';
const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];

export default function RimPaperPage() {
    const [tab, setTab] = useState<RimTab>('register');
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const [selTerm, setSelTerm] = useState('Term 1');
    const [selYear, setSelYear] = useState(currentYear);
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<number | null>(null);

    // Report filters
    const [rptForm, setRptForm] = useState('');
    const [rptStream, setRptStream] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, r] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_rim_paper').select('*').order('created_at', { ascending: false }),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setRecords(r.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (fid: any) => forms.find(f => f.id === fid)?.form_name || '-';
    const getStreamName = (sid: any) => streams.find(s => s.id === sid)?.stream_name || '-';

    // Get record for a student in current term/year
    const getRecord = (studentId: number) => records.find(r => r.student_id === studentId && r.term_name === selTerm && r.year === selYear);

    // Filter students for register tab
    const registerStudents = students.filter(s => {
        if (selForm && s.form_id !== Number(selForm)) return false;
        if (selStream && s.stream_id !== Number(selStream)) return false;
        if (search) {
            const txt = `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase();
            if (!txt.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    const handleToggle = async (student: any, brought: boolean) => {
        setSaving(student.id);
        const existing = getRecord(student.id);
        if (existing) {
            await supabase.from('school_rim_paper').update({
                brought, brought_date: brought ? new Date().toISOString().split('T')[0] : null
            }).eq('id', existing.id);
        } else {
            await supabase.from('school_rim_paper').upsert([{
                student_id: student.id, term_name: selTerm, year: selYear,
                brought, brought_date: brought ? new Date().toISOString().split('T')[0] : null,
                registered_by: 'admin'
            }], { onConflict: 'student_id,term_name,year' });
        }
        await fetchAll();
        setSaving(null);
        toast.success(`${student.first_name} ${student.last_name} - ${brought ? 'Brought' : 'Not Brought'}`);
    };

    // Bulk mark all filtered as brought
    const handleBulkMark = async (brought: boolean) => {
        const toUpdate = registerStudents.filter(s => {
            const rec = getRecord(s.id);
            return !rec || rec.brought !== brought;
        });
        if (toUpdate.length === 0) { toast('All already marked'); return; }
        setSaving(-1);
        const rows = toUpdate.map(s => ({
            student_id: s.id, term_name: selTerm, year: selYear,
            brought, brought_date: brought ? new Date().toISOString().split('T')[0] : null,
            registered_by: 'admin'
        }));
        await supabase.from('school_rim_paper').upsert(rows, { onConflict: 'student_id,term_name,year' });
        await fetchAll();
        setSaving(null);
        toast.success(`${toUpdate.length} students marked as ${brought ? 'Brought' : 'Not Brought'}`);
    };

    // Stats
    const termRecords = records.filter(r => r.term_name === selTerm && r.year === selYear);
    const broughtCount = termRecords.filter(r => r.brought).length;
    const totalStudents = students.length;
    const notBrought = totalStudents - broughtCount;

    // Brought list
    const broughtStudents = students.filter(s => {
        const rec = getRecord(s.id);
        if (!rec || !rec.brought) return false;
        if (rptForm && s.form_id !== Number(rptForm)) return false;
        if (rptStream && s.stream_id !== Number(rptStream)) return false;
        return true;
    });

    // Not brought list
    const notBroughtStudents = students.filter(s => {
        const rec = getRecord(s.id);
        if (rec && rec.brought) return false;
        if (rptForm && s.form_id !== Number(rptForm)) return false;
        if (rptStream && s.stream_id !== Number(rptStream)) return false;
        return true;
    });

    // Report by form
    const formStats = forms.map(f => {
        const formStudents = students.filter(s => s.form_id === f.id);
        const brought = formStudents.filter(s => { const r = getRecord(s.id); return r && r.brought; }).length;
        return { form: f.form_name, total: formStudents.length, brought, notBrought: formStudents.length - brought, pct: formStudents.length ? Math.round(brought / formStudents.length * 100) : 0 };
    });

    // Report by stream
    const streamStats = streams.map(st => {
        const stStudents = students.filter(s => s.stream_id === st.id);
        const brought = stStudents.filter(s => { const r = getRecord(s.id); return r && r.brought; }).length;
        return { stream: st.stream_name, total: stStudents.length, brought, notBrought: stStudents.length - brought, pct: stStudents.length ? Math.round(brought / stStudents.length * 100) : 0 };
    });

    const exportCSV = (data: any[], filename: string, headers: string[], rowFn: (item: any, i: number) => any[]) => {
        const rows = data.map((d, i) => rowFn(d, i));
        const csv = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = filename; a.click(); toast.success('Exported');
    };

    const TABS: { key: RimTab; label: string; icon: any }[] = [
        { key: 'register', label: 'Register / Tick', icon: FiCheck },
        { key: 'brought', label: 'Brought', icon: FiCheckCircle },
        { key: 'not_brought', label: 'Not Brought', icon: FiAlertTriangle },
        { key: 'reports', label: 'Reports', icon: FiBarChart2 },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Rim Paper...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiFileText className="text-teal-500" /> Rim Paper Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Track student rim copy paper submissions per term</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold">
                        <FiCheckCircle className="inline mr-1" size={14} /> {broughtCount} Brought
                    </div>
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-bold">
                        <FiAlertTriangle className="inline mr-1" size={14} /> {notBrought} Pending
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold">
                        {totalStudents > 0 ? Math.round(broughtCount / totalStudents * 100) : 0}%
                    </div>
                </div>
            </div>

            {/* Term/Year Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Term</label>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 outline-none">
                            {TERM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Year</label>
                        <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 outline-none">
                            {[currentYear, currentYear - 1, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                        <select value={tab === 'register' ? selForm : rptForm} onChange={e => { if (tab === 'register') setSelForm(e.target.value); else setRptForm(e.target.value); }} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 outline-none">
                            <option value="">All Forms</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                        <select value={tab === 'register' ? selStream : rptStream} onChange={e => { if (tab === 'register') setSelStream(e.target.value); else setRptStream(e.target.value); }} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 outline-none">
                            <option value="">All Streams</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            tab === t.key
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600'
                        }`}>
                        <t.icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            {/* TAB: Register / Tick */}
            {tab === 'register' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-teal-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiCheck size={16} className="text-teal-500" /> Tick Students Who Brought Rim Paper</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selTerm} {selYear} &bull; {registerStudents.length} student(s)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-2 text-gray-400" size={14} />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                                    className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-48 focus:border-teal-400 outline-none" />
                            </div>
                            <button onClick={() => handleBulkMark(true)} disabled={saving !== null}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200">
                                <FiCheckCircle className="inline mr-1" size={12} /> Mark All Brought
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase w-12">#</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Form</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Stream</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase w-32">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registerStudents.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No students found. Select a form/stream.</td></tr>
                                ) : registerStudents.map((s, i) => {
                                    const rec = getRecord(s.id);
                                    const brought = rec?.brought || false;
                                    return (
                                        <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50/50 ${brought ? 'bg-green-50/30' : ''}`}>
                                            <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-2 font-semibold text-blue-600">{s.admission_number || '-'}</td>
                                            <td className="px-4 py-2 font-medium">{s.first_name} {s.last_name}</td>
                                            <td className="px-4 py-2 text-center text-xs">{getFormName(s.form_id)}</td>
                                            <td className="px-4 py-2 text-center text-xs">{getStreamName(s.stream_id)}</td>
                                            <td className="px-4 py-2 text-center">
                                                {brought ? (
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-green-100 text-green-700">Brought</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-600">Not Brought</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-center text-xs text-gray-500">
                                                {rec?.brought_date ? new Date(rec.brought_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                {saving === s.id ? (
                                                    <div className="w-4 h-4 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" />
                                                ) : brought ? (
                                                    <button onClick={() => handleToggle(s, false)} className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-all">
                                                        <FiX className="inline mr-0.5" size={11} /> Undo
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleToggle(s, true)} className="px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-all">
                                                        <FiCheck className="inline mr-0.5" size={11} /> Tick
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: Brought */}
            {tab === 'brought' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-green-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiCheckCircle size={16} className="text-green-500" /> Students Who Brought Rim Paper</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selTerm} {selYear} &bull; {broughtStudents.length} student(s)</p>
                        </div>
                        <button onClick={() => exportCSV(broughtStudents, `rim_brought_${selTerm}_${selYear}.csv`,
                            ['#','Adm No','Student','Form','Stream','Date Brought'],
                            (s, i) => { const r = getRecord(s.id); return [i+1, s.admission_number||'', `${s.first_name} ${s.last_name}`, getFormName(s.form_id), getStreamName(s.stream_id), r?.brought_date||'']; }
                        )} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                            <FiDownload size={12} /> Export
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b">{['#','Adm No','Student','Form','Stream','Date Brought'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                            <tbody>
                                {broughtStudents.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">No students have brought rim paper yet</td></tr> :
                                    broughtStudents.map((s, i) => {
                                        const rec = getRecord(s.id);
                                        return (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-green-50/30">
                                                <td className="px-4 py-2 text-gray-400">{i+1}</td>
                                                <td className="px-4 py-2 font-semibold text-blue-600">{s.admission_number||'-'}</td>
                                                <td className="px-4 py-2 font-medium">{s.first_name} {s.last_name}</td>
                                                <td className="px-4 py-2 text-xs">{getFormName(s.form_id)}</td>
                                                <td className="px-4 py-2 text-xs">{getStreamName(s.stream_id)}</td>
                                                <td className="px-4 py-2 text-xs">{rec?.brought_date ? new Date(rec.brought_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '-'}</td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: Not Brought */}
            {tab === 'not_brought' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-red-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiAlertTriangle size={16} className="text-red-500" /> Students Who Have NOT Brought Rim Paper</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selTerm} {selYear} &bull; {notBroughtStudents.length} student(s) to follow up</p>
                        </div>
                        <button onClick={() => exportCSV(notBroughtStudents, `rim_not_brought_${selTerm}_${selYear}.csv`,
                            ['#','Adm No','Student','Form','Stream','Guardian','Phone'],
                            (s, i) => [i+1, s.admission_number||'', `${s.first_name} ${s.last_name}`, getFormName(s.form_id), getStreamName(s.stream_id), s.guardian_name||'', s.guardian_phone||'']
                        )} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                            <FiDownload size={12} /> Export List
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b">{['#','Adm No','Student','Form','Stream','Guardian','Phone'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                            <tbody>
                                {notBroughtStudents.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-green-500 font-semibold">All students have brought rim paper!</td></tr> :
                                    notBroughtStudents.map((s, i) => (
                                        <tr key={s.id} className="border-b border-gray-100 hover:bg-red-50/30">
                                            <td className="px-4 py-2 text-gray-400">{i+1}</td>
                                            <td className="px-4 py-2 font-semibold text-blue-600">{s.admission_number||'-'}</td>
                                            <td className="px-4 py-2 font-medium">{s.first_name} {s.last_name}</td>
                                            <td className="px-4 py-2 text-xs">{getFormName(s.form_id)}</td>
                                            <td className="px-4 py-2 text-xs">{getStreamName(s.stream_id)}</td>
                                            <td className="px-4 py-2 text-xs">{s.guardian_name||'-'}</td>
                                            <td className="px-4 py-2 text-xs font-semibold">{s.guardian_phone||'-'}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: Reports */}
            {tab === 'reports' && (
                <div className="space-y-4">
                    {/* School-wide stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-700">{totalStudents}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Students</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{broughtCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Brought</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{notBrought}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Not Brought</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-teal-600">{totalStudents > 0 ? Math.round(broughtCount / totalStudents * 100) : 0}%</p>
                            <p className="text-xs text-gray-500 mt-0.5">Compliance</p>
                        </div>
                    </div>

                    {/* By Form */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiBarChart2 size={16} /> Report by Form</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b">{['Form','Total Students','Brought','Not Brought','% Compliance'].map(h => <th key={h} className={`px-4 py-2.5 text-xs font-bold text-gray-500 uppercase ${h.includes('%')||h.includes('Total')||h.includes('Brought')?'text-center':'text-left'}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {formStats.map(f => (
                                    <tr key={f.form} className="border-b border-gray-100 hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 font-bold">{f.form}</td>
                                        <td className="px-4 py-2.5 text-center">{f.total}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-green-600">{f.brought}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-red-600">{f.notBrought}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.pct >= 80 ? '#22c55e' : f.pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                                <span className={`text-xs font-bold ${f.pct >= 80 ? 'text-green-600' : f.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{f.pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* By Stream */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiUsers size={16} /> Report by Stream</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b">{['Stream','Total','Brought','Not Brought','% Compliance'].map(h => <th key={h} className={`px-4 py-2.5 text-xs font-bold text-gray-500 uppercase ${h!=='Stream'?'text-center':'text-left'}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {streamStats.map(s => (
                                    <tr key={s.stream} className="border-b border-gray-100 hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 font-bold">{s.stream}</td>
                                        <td className="px-4 py-2.5 text-center">{s.total}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-green-600">{s.brought}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-red-600">{s.notBrought}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.pct >= 80 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                                <span className={`text-xs font-bold ${s.pct >= 80 ? 'text-green-600' : s.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.pct}%</span>
                                            </div>
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
