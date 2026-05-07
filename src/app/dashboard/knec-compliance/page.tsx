'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiDownload, FiAlertTriangle, FiCheckCircle, FiUsers,
    FiFileText, FiRefreshCw, FiShield, FiDatabase
} from 'react-icons/fi';

export default function KnecCompliancePage() {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState('');
    const [tab, setTab] = useState<'overview' | 'nemis' | 'knec-cba' | 'kcse-reg'>('overview');
    const [stats, setStats] = useState({
        totalStudents: 0, withNemis: 0, withBirthCert: 0, withDob: 0,
        withGuardian: 0, withCounty: 0, totalTeachers: 0, forms: [] as any[], terms: [] as any[],
    });
    const [students, setStudents] = useState<any[]>([]);
    const [selForm, setSelForm] = useState('');
    const [selTerm, setSelTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [studentsRes, formsRes, termsRes, teachersRes] = await Promise.all([
            supabase.from('school_students').select('id, first_name, last_name, admission_number, nemis_no, birth_cert_no, date_of_birth, gender, guardian_name, guardian_phone, county, sub_county, form_id, status').eq('status', 'Active'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('year', { ascending: false }),
            supabase.from('school_teachers').select('id').eq('status', 'Active'),
        ]);
        const s = studentsRes.data || [];
        setStudents(s);
        setStats({
            totalStudents: s.length,
            withNemis: s.filter(st => st.nemis_no).length,
            withBirthCert: s.filter(st => st.birth_cert_no).length,
            withDob: s.filter(st => st.date_of_birth).length,
            withGuardian: s.filter(st => st.guardian_phone).length,
            withCounty: s.filter(st => st.county).length,
            totalTeachers: (teachersRes.data || []).length,
            forms: formsRes.data || [],
            terms: termsRes.data || [],
        });
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const pct = (n: number) => stats.totalStudents ? Math.round((n / stats.totalStudents) * 100) : 0;

    const handleExport = async (type: 'nemis' | 'knec-cba' | 'kcse-reg') => {
        setExporting(type);
        try {
            const params = new URLSearchParams();
            if (selForm) params.set('form_id', selForm);
            if (selTerm) params.set('term_id', selTerm);

            const url = type === 'nemis' ? `/api/nemis-export?${params}`
                : type === 'knec-cba' ? `/api/knec-cba-export?${params}`
                : `/api/knec-registration?${params}`;

            const res = await fetch(url);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Export failed');
                setExporting('');
                return;
            }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}_export.csv`;
            a.click();
            toast.success(`${type.toUpperCase()} export downloaded ✅`);
        } catch { toast.error('Export failed'); }
        setExporting('');
    };

    const missingNemis = students.filter(s => !s.nemis_no);
    const missingBirthCert = students.filter(s => !s.birth_cert_no);
    const missingDob = students.filter(s => !s.date_of_birth);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Compliance Data...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiShield className="text-indigo-500" /> KNEC / NEMIS Compliance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Government data compliance exports &amp; validation for KNEC CBA, KCSE Registration, and NEMIS</p>
                </div>
                <button onClick={fetchData} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 self-start">
                    <FiRefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* Compliance Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'NEMIS No.', val: stats.withNemis, color: '#3b82f6' },
                    { label: 'Birth Cert', val: stats.withBirthCert, color: '#22c55e' },
                    { label: 'Date of Birth', val: stats.withDob, color: '#8b5cf6' },
                    { label: 'Guardian Phone', val: stats.withGuardian, color: '#f59e0b' },
                    { label: 'County', val: stats.withCounty, color: '#ef4444' },
                    { label: 'Total Students', val: stats.totalStudents, color: '#6366f1' },
                ].map((card, i) => (
                    <div key={i} className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)` }}>
                        <p className="text-[10px] font-semibold opacity-80 uppercase">{card.label}</p>
                        <p className="text-xl font-extrabold mt-1">{card.val}</p>
                        {i < 5 && <p className="text-[10px] opacity-70 mt-1">{pct(card.val)}% complete</p>}
                    </div>
                ))}
            </div>

            {/* Overall Compliance Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-700 text-sm">Overall NEMIS Compliance</h3>
                    <span className={`text-sm font-bold ${pct(stats.withNemis) >= 90 ? 'text-green-600' : pct(stats.withNemis) >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct(stats.withNemis)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{
                        width: `${pct(stats.withNemis)}%`,
                        background: pct(stats.withNemis) >= 90 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : pct(stats.withNemis) >= 70 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
                    }} />
                </div>
                {pct(stats.withNemis) < 100 && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <FiAlertTriangle size={12} /> {stats.totalStudents - stats.withNemis} students missing NEMIS numbers
                    </p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'overview', label: 'Data Warnings', icon: FiAlertTriangle },
                    { key: 'nemis', label: 'NEMIS Export', icon: FiDatabase },
                    { key: 'knec-cba', label: 'KNEC CBA Export', icon: FiFileText },
                    { key: 'kcse-reg', label: 'KCSE Registration', icon: FiUsers },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === t.key ? 'bg-white shadow-md text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={14} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Filter Bar (shared) */}
            {tab !== 'overview' && (
                <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Form</label>
                        <select value={selForm} onChange={e => setSelForm(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none">
                            <option value="">All Forms</option>
                            {stats.forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                        </select>
                    </div>
                    {tab === 'knec-cba' && (
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Term</label>
                            <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none">
                                <option value="">All Terms</option>
                                {stats.terms.map(t => <option key={t.id} value={String(t.id)}>{t.term_name} {t.year}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex items-end">
                        <button onClick={() => handleExport(tab as any)} disabled={!!exporting}
                            className="px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                            style={{ background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            {exporting === tab
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting...</>
                                : <><FiDownload size={14} /> Download CSV</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Overview Tab — Data Warnings */}
            {tab === 'overview' && (
                <div className="space-y-4">
                    {/* Missing NEMIS */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-red-50">
                            <h3 className="font-bold text-red-700 text-sm flex items-center gap-2">
                                <FiAlertTriangle size={14} /> Missing NEMIS Numbers ({missingNemis.length})
                            </h3>
                        </div>
                        {missingNemis.length === 0 ? (
                            <div className="p-8 text-center text-green-600">
                                <FiCheckCircle className="mx-auto mb-2" size={24} />
                                <p className="font-medium">All students have NEMIS numbers ✅</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="table-modern">
                                    <thead><tr><th>#</th><th>Adm No</th><th>Name</th><th>Form</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {missingNemis.slice(0, 50).map((s, i) => (
                                            <tr key={s.id}>
                                                <td className="text-xs text-gray-400">{i + 1}</td>
                                                <td className="font-mono text-sm">{s.admission_number}</td>
                                                <td className="font-semibold">{s.first_name} {s.last_name}</td>
                                                <td>{stats.forms.find(f => f.id === s.form_id)?.form_name || '-'}</td>
                                                <td><span className="badge badge-danger">Missing</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {missingNemis.length > 50 && <p className="text-xs text-gray-500 p-3">+ {missingNemis.length - 50} more...</p>}
                            </div>
                        )}
                    </div>

                    {/* Missing Birth Certs */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-amber-50">
                            <h3 className="font-bold text-amber-700 text-sm flex items-center gap-2">
                                <FiAlertTriangle size={14} /> Missing Birth Certificate Numbers ({missingBirthCert.length})
                            </h3>
                        </div>
                        {missingBirthCert.length === 0 ? (
                            <div className="p-8 text-center text-green-600">
                                <FiCheckCircle className="mx-auto mb-2" size={24} />
                                <p className="font-medium">All students have birth certificate numbers ✅</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[250px]">
                                <table className="table-modern">
                                    <thead><tr><th>#</th><th>Adm No</th><th>Name</th><th>Form</th></tr></thead>
                                    <tbody>
                                        {missingBirthCert.slice(0, 30).map((s, i) => (
                                            <tr key={s.id}>
                                                <td className="text-xs text-gray-400">{i + 1}</td>
                                                <td className="font-mono text-sm">{s.admission_number}</td>
                                                <td className="font-semibold">{s.first_name} {s.last_name}</td>
                                                <td>{stats.forms.find(f => f.id === s.form_id)?.form_name || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NEMIS Export Tab */}
            {tab === 'nemis' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-bold text-gray-800 text-lg mb-2">NEMIS Student Data Export</h3>
                    <p className="text-sm text-gray-500 mb-4">Export active student data in NEMIS-compatible CSV format for upload to the NEMIS portal.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs font-bold text-blue-700 uppercase mb-2">Included Fields</p>
                            <ul className="text-xs text-blue-600 space-y-1">
                                <li>• Admission Number, NEMIS No, Birth Cert No</li>
                                <li>• Full Name, Gender, Date of Birth</li>
                                <li>• Form, Stream, County, Sub-County</li>
                                <li>• Nationality, Special Needs</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs font-bold text-green-700 uppercase mb-2">Export Info</p>
                            <ul className="text-xs text-green-600 space-y-1">
                                <li>• {students.filter(s => !selForm || String(s.form_id) === selForm).length} students will be exported</li>
                                <li>• {stats.withNemis} have NEMIS numbers</li>
                                <li>• {stats.withBirthCert} have birth certificates</li>
                                <li>• Format: CSV (comma-separated values)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* KNEC CBA Tab */}
            {tab === 'knec-cba' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-bold text-gray-800 text-lg mb-2">KNEC CBA Assessment Export</h3>
                    <p className="text-sm text-gray-500 mb-4">Export CBC assessment data aligned with the KNEC CBA portal (cba.knec.ac.ke) format.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <p className="text-xs font-bold text-purple-700 uppercase mb-2">KNEC CBA Fields</p>
                            <ul className="text-xs text-purple-600 space-y-1">
                                <li>• UPI (NEMIS Number), Student Name</li>
                                <li>• Subject Code, Subject Name</li>
                                <li>• Assessment Type, Rubric Level (EE/ME/AE/BE)</li>
                                <li>• Score, Term, Year, Remarks</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-700 uppercase mb-2">Rubric Levels</p>
                            <div className="space-y-1.5">
                                {[
                                    { code: 'EE', label: 'Exceeding Expectations', color: '#16a34a' },
                                    { code: 'ME', label: 'Meeting Expectations', color: '#2563eb' },
                                    { code: 'AE', label: 'Approaching Expectations', color: '#d97706' },
                                    { code: 'BE', label: 'Below Expectations', color: '#dc2626' },
                                ].map(r => (
                                    <div key={r.code} className="flex items-center gap-2">
                                        <span className="w-8 text-center text-[10px] font-bold text-white rounded px-1.5 py-0.5" style={{ background: r.color }}>{r.code}</span>
                                        <span className="text-xs text-gray-600">{r.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KCSE Registration Tab */}
            {tab === 'kcse-reg' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-bold text-gray-800 text-lg mb-2">KCSE Exam Registration Export</h3>
                    <p className="text-sm text-gray-500 mb-4">Export Form 4 student data for KCSE exam registration with KNEC.</p>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
                        <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                            <FiAlertTriangle size={12} /> Select Form 4 from the filter above before exporting
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                            <p className="text-xs font-bold text-teal-700 uppercase mb-2">Registration Fields</p>
                            <ul className="text-xs text-teal-600 space-y-1">
                                <li>• Index Number (auto-generated)</li>
                                <li>• KNEC Code, Sub-County Code</li>
                                <li>• Full Name, Gender, DOB, Nationality</li>
                                <li>• Guardian Details, Registered Subjects</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs font-bold text-green-700 uppercase mb-2">Readiness Check</p>
                            <ul className="text-xs text-green-600 space-y-1">
                                <li className="flex items-center gap-1">
                                    {stats.withNemis === stats.totalStudents ? <FiCheckCircle className="text-green-600" size={10} /> : <FiAlertTriangle className="text-amber-600" size={10} />}
                                    NEMIS Numbers: {pct(stats.withNemis)}%
                                </li>
                                <li className="flex items-center gap-1">
                                    {stats.withBirthCert === stats.totalStudents ? <FiCheckCircle className="text-green-600" size={10} /> : <FiAlertTriangle className="text-amber-600" size={10} />}
                                    Birth Certificates: {pct(stats.withBirthCert)}%
                                </li>
                                <li className="flex items-center gap-1">
                                    {stats.withDob === stats.totalStudents ? <FiCheckCircle className="text-green-600" size={10} /> : <FiAlertTriangle className="text-amber-600" size={10} />}
                                    Date of Birth: {pct(stats.withDob)}%
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
