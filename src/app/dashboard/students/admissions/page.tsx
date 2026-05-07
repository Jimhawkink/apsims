'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiSearch, FiDownload, FiEye, FiUsers, FiUserPlus, FiUserCheck,
    FiChevronLeft, FiChevronRight, FiX, FiRefreshCw, FiPrinter,
    FiEdit2, FiCreditCard, FiBarChart2, FiTrendingUp, FiAward,
} from 'react-icons/fi';

// ── Color tokens per column ────────────────────────────────────────────────────
const C = {
    num:     { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    name:    { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    adm:     { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    gender:  { bg: '#fdf4ff', text: '#7c3aed', head: '#e9d5ff' },
    form:    { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    stream:  { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    date:    { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    kcpe:    { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    prev:    { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
    status:  { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    actions: { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
};

const PAGE_SIZES = [10, 25, 50, 100];

const FORM_COLORS = [
    { bg: '#eef2ff', border: '#818cf8', text: '#4338ca' },
    { bg: '#f0fdfa', border: '#2dd4bf', text: '#0f766e' },
    { bg: '#faf5ff', border: '#a78bfa', text: '#7c3aed' },
    { bg: '#fff7ed', border: '#fb923c', text: '#c2410c' },
    { bg: '#f0fdf4', border: '#4ade80', text: '#15803d' },
    { bg: '#eff6ff', border: '#60a5fa', text: '#1d4ed8' },
    { bg: '#fdf4ff', border: '#e879f9', text: '#a21caf' },
    { bg: '#fefce8', border: '#facc15', text: '#a16207' },
];

// ── Avatar with gradient initials ─────────────────────────────────────────────
function StudentAvatar({ name, gender, size = 34 }: { name: string; gender: string; size?: number }) {
    const initials = (name || '?').split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() || '').join('') || '?';
    const GRADIENTS = [
        'linear-gradient(135deg,#3b82f6,#6366f1)',
        'linear-gradient(135deg,#0891b2,#06b6d4)',
        'linear-gradient(135deg,#059669,#10b981)',
        'linear-gradient(135deg,#d97706,#f59e0b)',
        'linear-gradient(135deg,#dc2626,#ef4444)',
        'linear-gradient(135deg,#7c3aed,#a855f7)',
        'linear-gradient(135deg,#0284c7,#38bdf8)',
        'linear-gradient(135deg,#15803d,#22c55e)',
    ];
    const femaleGrads = [
        'linear-gradient(135deg,#ec4899,#db2777)',
        'linear-gradient(135deg,#f43f5e,#e11d48)',
        'linear-gradient(135deg,#a855f7,#9333ea)',
    ];
    const pool = gender === 'Female' ? femaleGrads : GRADIENTS;
    const idx = (name || '').charCodeAt(0) % pool.length;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', background: pool[idx],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: size * 0.35, letterSpacing: 0.5,
            flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
        }}>
            {initials}
        </div>
    );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; border: string; icon: string }> = {
        Active:      { bg: '#f0fdf4', color: '#15803d', border: '#86efac', icon: '✅' },
        Inactive:    { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1', icon: '⏸️' },
        Graduated:   { bg: '#f5f3ff', color: '#7c3aed', border: '#c4b5fd', icon: '🎓' },
        Transferred: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: '🔄' },
        Suspended:   { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: '⛔' },
    };
    const s = map[status] || map['Inactive'];
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap"
            style={{ background: s.bg, color: s.color, borderColor: s.border }}>
            {s.icon} {status}
        </span>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdmissionsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'adm' | 'form' | 'date' | 'kcpe'>('name');
    const [activeFormFilter, setActiveFormFilter] = useState<number | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [jumpPage, setJumpPage] = useState('');

    // Tab
    const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [s, f, st] = await Promise.all([
                supabase.from('school_students').select('*').order('first_name'),
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_streams').select('*').order('stream_name'),
            ]);
            setStudents(s.data || []);
            setForms(f.data || []);
            setStreams(st.data || []);
        } catch {
            toast.error('Failed to load data');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getFormName = (id: number | null) => forms.find(f => f.id === id)?.form_name || '—';
    const getStreamName = (id: number | null) => streams.find(s => s.id === id)?.stream_name || '—';
    const getAdmNo = (s: any) => s.admission_no || s.admission_number || '—';
    const getFullName = (s: any) => `${s.first_name || ''} ${s.last_name || ''}`.trim();

    // ── KPI Stats ──────────────────────────────────────────────────────────────
    const now = new Date();
    const thisYear = now.getFullYear();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const totalEnrolled   = students.length;
    const activeStudents  = students.filter(s => s.status === 'Active').length;
    const maleCount       = students.filter(s => s.gender === 'Male').length;
    const femaleCount     = students.filter(s => s.gender === 'Female').length;
    const newThisYear     = students.filter(s => (s.admission_date || '').startsWith(String(thisYear))).length;
    const last30Days      = students.filter(s => (s.admission_date || '') >= thirtyDaysAgo).length;
    const graduatedCount  = students.filter(s => s.status === 'Graduated').length;

    // ── Recently admitted (last 30 days) ──────────────────────────────────────
    const recentlyAdmitted = useMemo(() =>
        students
            .filter(s => (s.admission_date || '') >= thirtyDaysAgo)
            .sort((a, b) => (b.admission_date || '').localeCompare(a.admission_date || ''))
            .slice(0, 9),
        [students, thirtyDaysAgo]
    );

    // ── Form distribution stats ────────────────────────────────────────────────
    const formStats = useMemo(() =>
        forms.map(f => {
            const inForm = students.filter(s => s.form_id === f.id && s.status === 'Active');
            const male   = inForm.filter(s => s.gender === 'Male').length;
            const female = inForm.filter(s => s.gender === 'Female').length;
            return { id: f.id, name: f.form_name, total: inForm.length, male, female };
        }),
        [forms, students]
    );

    // ── Stream distribution stats ──────────────────────────────────────────────
    const streamStats = useMemo(() =>
        streams.map(st => {
            const inStream = students.filter(s => s.stream_id === st.id && s.status === 'Active');
            return { id: st.id, name: st.stream_name, total: inStream.length };
        }).filter(s => s.total > 0),
        [streams, students]
    );

    // ── Monthly admissions trend (last 12 months) ─────────────────────────────
    const monthlyTrend = useMemo(() => {
        const months: { label: string; key: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
            const count = students.filter(s => (s.admission_date || '').startsWith(key)).length;
            months.push({ label, key, count });
        }
        return months;
    }, [students]);

    const maxMonthly = Math.max(...monthlyTrend.map(m => m.count), 1);

    // ── KCPE distribution ─────────────────────────────────────────────────────
    const kcpeRanges = useMemo(() => {
        const ranges = [
            { label: '400–500', min: 400, max: 500, color: '#10b981' },
            { label: '300–399', min: 300, max: 399, color: '#3b82f6' },
            { label: '200–299', min: 200, max: 299, color: '#f59e0b' },
            { label: '0–199',   min: 0,   max: 199, color: '#ef4444' },
        ];
        return ranges.map(r => ({
            ...r,
            count: students.filter(s => {
                const m = Number(s.kcpe_marks);
                return !isNaN(m) && m >= r.min && m <= r.max;
            }).length,
        }));
    }, [students]);

    // ── Admission years for filter ─────────────────────────────────────────────
    const admissionYears = useMemo(() => {
        const years = new Set<string>();
        students.forEach(s => {
            const y = (s.admission_date || '').slice(0, 4);
            if (y) years.add(y);
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [students]);

    // ── Filtered + sorted list ─────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let result = students.filter(s => {
            const name = getFullName(s).toLowerCase();
            const adm  = getAdmNo(s).toLowerCase();
            const q    = search.toLowerCase();
            const matchSearch  = !search || name.includes(q) || adm.includes(q);
            const matchForm    = !filterForm   || String(s.form_id)   === filterForm;
            const matchStream  = !filterStream || String(s.stream_id) === filterStream;
            const matchGender  = !filterGender || s.gender === filterGender;
            const matchStatus  = !filterStatus || s.status === filterStatus;
            const matchYear    = !filterYear   || (s.admission_date || '').startsWith(filterYear);
            const matchFormCard = activeFormFilter === null || s.form_id === activeFormFilter;
            return matchSearch && matchForm && matchStream && matchGender && matchStatus && matchYear && matchFormCard;
        });

        result.sort((a, b) => {
            if (sortBy === 'name')  return getFullName(a).localeCompare(getFullName(b));
            if (sortBy === 'adm')   return getAdmNo(a).localeCompare(getAdmNo(b));
            if (sortBy === 'form')  return (a.form_id || 0) - (b.form_id || 0);
            if (sortBy === 'date')  return (b.admission_date || '').localeCompare(a.admission_date || '');
            if (sortBy === 'kcpe')  return (Number(b.kcpe_marks) || 0) - (Number(a.kcpe_marks) || 0);
            return 0;
        });

        return result;
    }, [students, search, filterForm, filterStream, filterGender, filterStatus, filterYear, sortBy, activeFormFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const headers = ['Adm No', 'First Name', 'Last Name', 'Gender', 'Form', 'Stream', 'Adm Date', 'KCPE Marks', 'Previous School', 'Status'];
        const rows = filtered.map(s => [
            getAdmNo(s), s.first_name || '', s.last_name || '', s.gender || '',
            getFormName(s.form_id), getStreamName(s.stream_id),
            s.admission_date || '', s.kcpe_marks || '', s.previous_school || '', s.status || '',
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Admissions_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported ✅');
    };

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrint = () => window.print();

    // ── Clear filters ─────────────────────────────────────────────────────────
    const hasFilters = search || filterForm || filterStream || filterGender || filterStatus || filterYear || activeFormFilter !== null;
    const clearFilters = () => {
        setSearch(''); setFilterForm(''); setFilterStream('');
        setFilterGender(''); setFilterStatus(''); setFilterYear('');
        setActiveFormFilter(null); setPage(1);
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>🎓</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading admissions…</p>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                            <FiUsers size={18} />
                        </div>
                        Admissions Register
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {activeStudents} active · {totalEnrolled} total enrolled · {last30Days} admitted in last 30 days
                    </p>
                </div>
                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    <button onClick={handlePrint} title="Print List"
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all">
                        <FiPrinter size={16} />
                    </button>
                    <button onClick={exportCSV} title="Export CSV"
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all">
                        <FiDownload size={16} />
                    </button>
                    <button onClick={fetchData} title="Refresh"
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        <FiRefreshCw size={15} />
                    </button>
                    <Link href="/dashboard/students?openAdd=true"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                        <FiUserPlus size={15} /> Enroll New
                    </Link>
                    <Link href="/dashboard/analytics" title="View Analytics"
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all">
                        <FiBarChart2 size={16} />
                    </Link>
                    <Link href="/dashboard/students/promotion" title="Promotions"
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all">
                        <FiTrendingUp size={16} />
                    </Link>
                    <Link href="/dashboard/students/id-cards" title="ID Cards"
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all">
                        <FiCreditCard size={16} />
                    </Link>
                </div>
            </div>

            {/* ── KPI Cards (border-l-4 style) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Total Enrolled', value: totalEnrolled,  emoji: '🎓', color: '#3b82f6', bg: '#eff6ff', sub: 'All records',          pulse: false },
                    { label: 'Active Students', value: activeStudents, emoji: '✅', color: '#10b981', bg: '#f0fdf4', sub: 'Currently enrolled',    pulse: false },
                    { label: 'Male',            value: maleCount,      emoji: '👦', color: '#6366f1', bg: '#eef2ff', sub: `${activeStudents > 0 ? ((maleCount / totalEnrolled) * 100).toFixed(0) : 0}% of total`, pulse: false },
                    { label: 'Female',          value: femaleCount,    emoji: '👧', color: '#db2777', bg: '#fdf2f8', sub: `${activeStudents > 0 ? ((femaleCount / totalEnrolled) * 100).toFixed(0) : 0}% of total`, pulse: false },
                    { label: 'New This Year',   value: newThisYear,    emoji: '🆕', color: '#0891b2', bg: '#ecfeff', sub: String(thisYear),        pulse: newThisYear > 0 },
                    { label: 'Last 30 Days',    value: last30Days,     emoji: '📅', color: '#d97706', bg: '#fffbeb', sub: 'Recent admissions',     pulse: last30Days > 0 },
                    { label: 'Graduated',       value: graduatedCount, emoji: '🏆', color: '#7c3aed', bg: '#f5f3ff', sub: 'Alumni',               pulse: false },
                ].map((card, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                        style={{ borderLeftWidth: 4, borderLeftColor: card.color }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{card.label}</p>
                            <span className="text-xl">{card.emoji}</span>
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{card.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                        {card.pulse && (
                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: card.color }} />
                        )}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: card.color }} />
                    </div>
                ))}
            </div>

            {/* ── Recently Admitted Showcase (last 30 days) ── */}
            {recentlyAdmitted.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">🎉 Recently Admitted (Last 30 Days)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recentlyAdmitted.map(s => (
                            <div key={s.id}
                                className="relative flex items-center gap-3.5 p-4 rounded-2xl border-2 overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
                                style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderColor: '#6ee7b7' }}>
                                <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 opacity-10"
                                    style={{ background: '#10b981' }} />
                                <StudentAvatar name={getFullName(s)} gender={s.gender || ''} size={48} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-green-900 truncate text-sm">{getFullName(s)}</p>
                                    <p className="text-xs text-green-700 mt-0.5 truncate">
                                        📋 {getAdmNo(s)} · {getFormName(s.form_id)}
                                        {s.stream_id ? ` · ${getStreamName(s.stream_id)}` : ''}
                                    </p>
                                    <p className="text-[10px] text-green-600 mt-1">
                                        📅 {s.admission_date
                                            ? new Date(s.admission_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </p>
                                </div>
                                <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-green-300 text-green-900 animate-pulse">
                                    🆕 NEW
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Form Distribution Cards ── */}
            {formStats.some(f => f.total > 0) && (
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">📚 Enrollment Per Form</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {formStats.filter(f => f.total > 0).map((f, i) => {
                            const clr = FORM_COLORS[i % FORM_COLORS.length];
                            const isActive = activeFormFilter === f.id;
                            return (
                                <div key={f.id}
                                    className="p-4 rounded-2xl border-2 relative overflow-hidden cursor-pointer transition-all hover:shadow-md"
                                    style={{
                                        background: isActive ? clr.text : clr.bg,
                                        borderColor: clr.border,
                                        transform: isActive ? 'scale(1.03)' : undefined,
                                    }}
                                    onClick={() => setActiveFormFilter(isActive ? null : f.id)}>
                                    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-10"
                                        style={{ background: clr.text }} />
                                    <p className="text-[10px] font-bold uppercase tracking-wider truncate"
                                        style={{ color: isActive ? '#fff' : clr.text }}>{f.name}</p>
                                    <p className="text-2xl font-black mt-1"
                                        style={{ color: isActive ? '#fff' : clr.text }}>{f.total}</p>
                                    {/* Gender split bar */}
                                    {f.total > 0 && (
                                        <div className="mt-2 flex rounded-full overflow-hidden h-1.5">
                                            <div style={{ width: `${(f.male / f.total) * 100}%`, background: '#6366f1' }} />
                                            <div style={{ width: `${(f.female / f.total) * 100}%`, background: '#ec4899' }} />
                                        </div>
                                    )}
                                    <p className="text-[9px] mt-1" style={{ color: isActive ? '#ffffffaa' : `${clr.text}99` }}>
                                        👦 {f.male} · 👧 {f.female}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Tab Switcher ── */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                {([['list', '📋 Student List'], ['stats', '📊 Statistics']] as const).map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                STATS TAB
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'stats' && (
                <div className="space-y-5">

                    {/* Enrollment by Form table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700">📚 Enrollment by Form</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Form</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-blue-600">Male</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-pink-600">Female</th>
                                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Distribution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formStats.map((f, i) => {
                                        const maxTotal = Math.max(...formStats.map(x => x.total), 1);
                                        return (
                                            <tr key={f.id} style={{ borderTop: '1px solid #f1f5f9' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                                <td className="px-5 py-3 font-bold text-gray-800">{f.name}</td>
                                                <td className="px-4 py-3 text-center font-extrabold text-indigo-700">{f.total}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-blue-600">{f.male}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-pink-600">{f.female}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 flex rounded-full overflow-hidden h-2 bg-gray-100">
                                                            <div style={{ width: `${(f.male / Math.max(f.total, 1)) * 100}%`, background: '#6366f1' }} />
                                                            <div style={{ width: `${(f.female / Math.max(f.total, 1)) * 100}%`, background: '#ec4899' }} />
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                            {maxTotal > 0 ? ((f.total / maxTotal) * 100).toFixed(0) : 0}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Stream cards + KCPE distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Enrollment by Stream */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-4">🌊 Enrollment by Stream</h3>
                            {streamStats.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-8">No stream data available</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {streamStats.map((st, i) => {
                                        const clr = FORM_COLORS[i % FORM_COLORS.length];
                                        return (
                                            <div key={st.id} className="p-3 rounded-xl border-2 relative overflow-hidden"
                                                style={{ background: clr.bg, borderColor: clr.border }}>
                                                <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full opacity-10"
                                                    style={{ background: clr.text }} />
                                                <p className="text-[10px] font-bold uppercase tracking-wider truncate"
                                                    style={{ color: clr.text }}>{st.name}</p>
                                                <p className="text-xl font-black mt-0.5" style={{ color: clr.text }}>{st.total}</p>
                                                <p className="text-[9px] mt-0.5" style={{ color: `${clr.text}99` }}>students</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* KCPE Marks Distribution */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-4">📊 KCPE Marks Distribution</h3>
                            <div className="space-y-3">
                                {kcpeRanges.map(r => {
                                    const withKcpe = students.filter(s => s.kcpe_marks).length;
                                    const pct = withKcpe > 0 ? (r.count / withKcpe) * 100 : 0;
                                    return (
                                        <div key={r.label}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-700">{r.label}</span>
                                                <span className="text-xs font-extrabold" style={{ color: r.color }}>{r.count}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all"
                                                    style={{ width: `${pct}%`, background: r.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Admissions Trend */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">📈 Monthly Admissions Trend (Last 12 Months)</h3>
                        <div className="flex items-end gap-2 h-32">
                            {monthlyTrend.map((m, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                    <span className="text-[9px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {m.count}
                                    </span>
                                    <div className="w-full rounded-t-lg transition-all hover:opacity-80 cursor-default"
                                        style={{
                                            height: `${Math.max((m.count / maxMonthly) * 100, m.count > 0 ? 8 : 2)}%`,
                                            background: m.count > 0
                                                ? 'linear-gradient(180deg,#6366f1,#3b82f6)'
                                                : '#e2e8f0',
                                            minHeight: 4,
                                        }}
                                        title={`${m.label}: ${m.count} admissions`} />
                                    <span className="text-[9px] text-gray-400 font-medium">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                LIST TAB
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'list' && (
                <div className="space-y-4">

                    {/* ── Search & Filter Bar ── */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[220px]">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                <input
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search name, admission number…"
                                    className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                                {search && (
                                    <button onClick={() => { setSearch(''); setPage(1); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                        <FiX size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Form */}
                            <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600 min-w-[110px]">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>

                            {/* Stream */}
                            <select value={filterStream} onChange={e => { setFilterStream(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600 min-w-[110px]">
                                <option value="">All Streams</option>
                                {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>

                            {/* Gender */}
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                                {[['', 'All'], ['Male', '👦'], ['Female', '👧']].map(([val, label]) => (
                                    <button key={val} onClick={() => { setFilterGender(val); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterGender === val ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Status */}
                            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600 min-w-[120px]">
                                <option value="">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Graduated">Graduated</option>
                                <option value="Transferred">Transferred</option>
                                <option value="Suspended">Suspended</option>
                            </select>

                            {/* Year */}
                            <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600 min-w-[100px]">
                                <option value="">All Years</option>
                                {admissionYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>

                            {/* Sort */}
                            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600 min-w-[130px]">
                                <option value="name">Sort: Name A-Z</option>
                                <option value="adm">Sort: Adm No</option>
                                <option value="form">Sort: Form</option>
                                <option value="date">Sort: ↓ Recent</option>
                                <option value="kcpe">Sort: ↓ KCPE</option>
                            </select>

                            {/* Page size */}
                            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600">
                                {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
                            </select>

                            {/* Active form filter pill */}
                            {activeFormFilter !== null && (
                                <button onClick={() => setActiveFormFilter(null)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition">
                                    📚 {getFormName(activeFormFilter)}
                                    <FiX size={11} />
                                </button>
                            )}

                            {/* Clear all */}
                            {hasFilters && (
                                <button onClick={clearFilters}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition">
                                    <FiX size={11} /> Clear
                                </button>
                            )}

                            <p className="ml-auto text-xs font-bold text-gray-400">
                                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* ── Ultra DataGrid ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        {[
                                            { label: '#',               col: C.num     },
                                            { label: '🎓 Student',      col: C.name    },
                                            { label: '⚧ Gender',        col: C.gender  },
                                            { label: '📚 Form',         col: C.form    },
                                            { label: '🌊 Stream',       col: C.stream  },
                                            { label: '📅 Adm Date',     col: C.date    },
                                            { label: '📊 KCPE',         col: C.kcpe    },
                                            { label: '🏫 Prev School',  col: C.prev    },
                                            { label: '✅ Status',       col: C.status  },
                                            { label: '⚙️ Actions',      col: C.actions },
                                        ].map((h, i) => (
                                            <th key={i}
                                                className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                                style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>
                                                {h.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-16 text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-5xl">🎓</span>
                                                    <p className="text-sm font-medium">No students found</p>
                                                    <p className="text-xs">Try adjusting your filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginated.map((s, idx) => {
                                        const fullName = getFullName(s);
                                        const admNo    = getAdmNo(s);
                                        const isNew    = (s.admission_date || '') >= thirtyDaysAgo;
                                        const daysAgo  = s.admission_date
                                            ? Math.floor((Date.now() - new Date(s.admission_date).getTime()) / 86400000)
                                            : null;
                                        return (
                                            <tr key={s.id}
                                                className="transition-colors"
                                                style={{ borderBottom: '1px solid #f1f5f9' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>

                                                {/* # */}
                                                <td className="px-3 py-3 text-center font-bold whitespace-nowrap"
                                                    style={{ background: C.num.bg + '60', color: C.num.text }}>
                                                    {(page - 1) * pageSize + idx + 1}
                                                </td>

                                                {/* Student: avatar + name + adm no */}
                                                <td className="px-3 py-3" style={{ background: C.name.bg + '60' }}>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="relative flex-shrink-0">
                                                            <StudentAvatar name={fullName} gender={s.gender || ''} size={36} />
                                                            {isNew && (
                                                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 flex items-center gap-1.5 whitespace-nowrap">
                                                                {fullName}
                                                                {isNew && (
                                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 animate-pulse">🆕</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                                                📋 {admNo}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Gender */}
                                                <td className="px-3 py-3 whitespace-nowrap font-semibold"
                                                    style={{ background: C.gender.bg + '60', color: C.gender.text }}>
                                                    {s.gender === 'Male' ? '👦' : s.gender === 'Female' ? '👧' : '—'} {s.gender || '—'}
                                                </td>

                                                {/* Form */}
                                                <td className="px-3 py-3 whitespace-nowrap font-bold"
                                                    style={{ background: C.form.bg + '60', color: C.form.text }}>
                                                    {getFormName(s.form_id)}
                                                </td>

                                                {/* Stream */}
                                                <td className="px-3 py-3 whitespace-nowrap font-semibold"
                                                    style={{ background: C.stream.bg + '60', color: C.stream.text }}>
                                                    {s.stream_id ? getStreamName(s.stream_id) : <span className="text-gray-300">—</span>}
                                                </td>

                                                {/* Adm Date */}
                                                <td className="px-3 py-3" style={{ background: C.date.bg + '60' }}>
                                                    <div className="font-semibold whitespace-nowrap" style={{ color: C.date.text }}>
                                                        {s.admission_date
                                                            ? new Date(s.admission_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : '—'}
                                                    </div>
                                                    {daysAgo !== null && (
                                                        <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                                            {daysAgo === 0 ? '🆕 Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo}d ago`}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* KCPE Marks */}
                                                <td className="px-3 py-3 whitespace-nowrap font-bold text-center"
                                                    style={{ background: C.kcpe.bg + '60', color: C.kcpe.text }}>
                                                    {s.kcpe_marks ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <FiAward size={10} /> {s.kcpe_marks}
                                                        </span>
                                                    ) : <span className="text-gray-300">—</span>}
                                                </td>

                                                {/* Previous School */}
                                                <td className="px-3 py-3 max-w-[160px]"
                                                    style={{ background: C.prev.bg + '60', color: C.prev.text }}>
                                                    <span className="truncate block text-xs" title={s.previous_school || ''}>
                                                        {s.previous_school || <span className="text-gray-300">—</span>}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-3 py-3" style={{ background: C.status.bg + '60' }}>
                                                    <StatusBadge status={s.status || 'Active'} />
                                                </td>

                                                {/* Actions */}
                                                <td className="px-3 py-3" style={{ background: C.actions.bg + '60' }}>
                                                    <div className="flex items-center gap-1.5">
                                                        <Link href={`/dashboard/students/profile?id=${s.id}`}
                                                            title="View Profile"
                                                            className="p-2 rounded-xl transition hover:scale-110"
                                                            style={{ background: C.name.head, color: C.name.text }}>
                                                            <FiEye size={12} />
                                                        </Link>
                                                        <Link href="/dashboard/students/id-cards"
                                                            title="ID Card"
                                                            className="p-2 rounded-xl transition hover:scale-110"
                                                            style={{ background: C.adm.head, color: C.adm.text }}>
                                                            <FiCreditCard size={12} />
                                                        </Link>
                                                        <Link href={`/dashboard/students?edit=${s.id}`}
                                                            title="Edit Student"
                                                            className="p-2 rounded-xl transition hover:scale-110"
                                                            style={{ background: C.form.head, color: C.form.text }}>
                                                            <FiEdit2 size={12} />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Pagination ── */}
                        {totalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                                <p className="text-xs text-gray-500 font-medium">
                                    Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} students
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <FiChevronLeft size={14} />
                                    </button>

                                    {/* Page numbers */}
                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                            let p: number;
                                            if (totalPages <= 7) {
                                                p = i + 1;
                                            } else if (page <= 4) {
                                                p = i + 1;
                                            } else if (page >= totalPages - 3) {
                                                p = totalPages - 6 + i;
                                            } else {
                                                p = page - 3 + i;
                                            }
                                            return (
                                                <button key={p} onClick={() => setPage(p)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === p ? 'text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                                                    style={page === p ? { background: 'linear-gradient(135deg,#6366f1,#3b82f6)' } : {}}>
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <FiChevronRight size={14} />
                                    </button>

                                    {/* Jump to page */}
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <span className="text-xs text-gray-400">Go to</span>
                                        <input
                                            type="number" min={1} max={totalPages}
                                            value={jumpPage}
                                            onChange={e => setJumpPage(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    const n = parseInt(jumpPage);
                                                    if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); setJumpPage(''); }
                                                }
                                            }}
                                            placeholder={String(page)}
                                            className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-indigo-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Build: 2026-05-05 21:24:13
