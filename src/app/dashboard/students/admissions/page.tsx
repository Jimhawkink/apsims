'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiUserCheck, FiSearch, FiCheck, FiX, FiUpload, FiDownload, FiPlus, FiFilter, FiCalendar, FiUsers } from 'react-icons/fi';

export default function AdmissionsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
    const [filterStatus, setFilterStatus] = useState('');
    const [tab, setTab] = useState<'all' | 'recent' | 'stats'>('all');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st] = await Promise.all([
            supabase.from('school_students').select('*').order('admission_date', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    const filtered = students.filter(s => {
        if (search) { const q = search.toLowerCase(); if (!`${s.first_name} ${s.last_name} ${s.admission_no || ''}`.toLowerCase().includes(q)) return false; }
        if (filterYear && s.admission_date && !s.admission_date.startsWith(filterYear)) return false;
        if (filterStatus && s.status !== filterStatus) return false;
        return true;
    });

    const recentAdmissions = students.filter(s => {
        if (!s.admission_date) return false;
        const d = new Date(s.admission_date);
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return d >= thirtyDaysAgo;
    });

    const years = Array.from(new Set(students.filter(s => s.admission_date).map(s => s.admission_date?.substring(0, 4)))).sort().reverse();
    
    // Stats by form
    const formStats = forms.map(f => ({
        ...f,
        total: students.filter(s => s.form_id === f.id && s.status === 'Active').length,
        male: students.filter(s => s.form_id === f.id && s.gender === 'Male' && s.status === 'Active').length,
        female: students.filter(s => s.form_id === f.id && s.gender === 'Female' && s.status === 'Active').length,
    }));

    // Stats by stream
    const streamStats = streams.map(s => ({
        ...s,
        total: students.filter(st => st.stream_id === s.id && st.status === 'Active').length,
    }));

    const totalActive = students.filter(s => s.status === 'Active').length;
    const totalMale = students.filter(s => s.gender === 'Male' && s.status === 'Active').length;
    const totalFemale = students.filter(s => s.gender === 'Female' && s.status === 'Active').length;

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-green-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiUserCheck className="text-green-500" /> Admissions</h1>
                <p className="text-sm text-gray-500 mt-1">Enrollment tracking, admissions statistics & student population management</p></div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total Active', value: totalActive, bg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                    { label: 'Male', value: totalMale, bg: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
                    { label: 'Female', value: totalFemale, bg: 'linear-gradient(135deg, #ec4899, #db2777)' },
                    { label: 'This Year', value: students.filter(s => s.admission_date?.startsWith(String(new Date().getFullYear()))).length, bg: 'linear-gradient(135deg, #10b981, #059669)' },
                    { label: 'Last 30 Days', value: recentAdmissions.length, bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-4 text-white" style={{ background: s.bg }}>
                        <p className="text-xs font-semibold opacity-80 uppercase">{s.label}</p>
                        <p className="text-2xl font-extrabold mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[{key:'all',label:`All Students (${students.length})`},{key:'recent',label:`Recent (${recentAdmissions.length})`},{key:'stats',label:'Population Stats'}].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white shadow-md text-green-700' : 'text-gray-500'}`}>{t.label}</button>
                ))}
            </div>

            {tab === 'all' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-green-400 outline-none" /></div>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="select-modern text-sm"><option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-modern text-sm"><option value="">All Statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Graduated">Graduated</option><option value="Transferred">Transferred</option></select>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Gender</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stream</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">KCPE</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                        </tr></thead><tbody>
                            {filtered.slice(0, 100).map((s, i) => (
                                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-2.5 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                    <td className="px-4 py-2.5 text-center text-sm">{s.gender === 'Male' ? '👦' : '👧'} {s.gender}</td>
                                    <td className="px-4 py-2.5 text-sm">{getFormName(s.form_id)}</td>
                                    <td className="px-4 py-2.5 text-sm">{getStreamName(s.stream_id)}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-600">{s.admission_date ? new Date(s.admission_date).toLocaleDateString('en-GB') : '-'}</td>
                                    <td className="px-4 py-2.5 text-sm font-medium text-purple-600">{s.kcpe_marks || '-'}</td>
                                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                                </tr>
                            ))}
                        </tbody></table>
                        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">{filtered.length} students</div>
                    </div>
                </div>
            )}

            {tab === 'stats' && (
                <div className="space-y-5">
                    {/* Enrollment by Form */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">📊 Enrollment by Form</h3></div>
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Male</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Female</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Distribution</th>
                        </tr></thead><tbody>
                            {formStats.map((f, i) => (
                                <tr key={f.id} className="border-b border-gray-100">
                                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{f.form_name}</td>
                                    <td className="px-4 py-3 text-center text-sm font-extrabold text-gray-800">{f.total}</td>
                                    <td className="px-4 py-3 text-center text-sm font-medium text-blue-600">{f.male}</td>
                                    <td className="px-4 py-3 text-center text-sm font-medium text-pink-600">{f.female}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                                            <div className="bg-blue-400 h-full" style={{ width: `${f.total > 0 ? (f.male / f.total) * 100 : 0}%` }} title={`Male: ${f.male}`} />
                                            <div className="bg-pink-400 h-full" style={{ width: `${f.total > 0 ? (f.female / f.total) * 100 : 0}%` }} title={`Female: ${f.female}`} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot><tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                            <td className="px-4 py-3 text-sm text-gray-700">TOTAL</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-800">{totalActive}</td>
                            <td className="px-4 py-3 text-center text-sm text-blue-600">{totalMale}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-600">{totalFemale}</td>
                            <td className="px-4 py-3" />
                        </tr></tfoot></table>
                    </div>

                    {/* By Stream */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-700 text-sm mb-4">🏫 Enrollment by Stream</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {streamStats.map((s, i) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                                return (
                                    <div key={s.id} className="border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition-all">
                                        <p className="text-sm font-bold text-gray-800">{s.stream_name}</p>
                                        <p className="text-3xl font-extrabold mt-2" style={{ color: colors[i % colors.length] }}>{s.total}</p>
                                        <div className="w-full bg-gray-100 rounded-full h-2 mt-2"><div className="h-2 rounded-full" style={{ width: `${totalActive > 0 ? (s.total / totalActive) * 100 : 0}%`, background: colors[i % colors.length] }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'recent' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">🆕 Recently Admitted (Last 30 Days)</h3></div>
                    {recentAdmissions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400"><p>No recent admissions</p></div>
                    ) : (
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Previous School</th>
                        </tr></thead><tbody>
                            {recentAdmissions.map((s, i) => (
                                <tr key={s.id} className="border-b border-gray-100 hover:bg-green-50/30">
                                    <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-2.5 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                    <td className="px-4 py-2.5 text-sm">{getFormName(s.form_id)}</td>
                                    <td className="px-4 py-2.5 text-sm text-green-600 font-medium">{s.admission_date ? new Date(s.admission_date).toLocaleDateString('en-GB') : '-'}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-500">{s.previous_school || '-'}</td>
                                </tr>
                            ))}
                        </tbody></table>
                    )}
                </div>
            )}
        </div>
    );
}
