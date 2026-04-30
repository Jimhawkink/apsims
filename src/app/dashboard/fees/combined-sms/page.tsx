'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSend, FiMessageSquare, FiDollarSign, FiCheckCircle, FiXCircle, FiUsers, FiZap, FiSearch, FiX, FiRefreshCw, FiPhone } from 'react-icons/fi';

// ── Color tokens per column ──
const C = {
    num:     { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    name:    { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    grade:   { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    pos:     { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    balance: { bg: '#fff1f2', text: '#be123c', head: '#fecdd3' },
    phone:   { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    sms:     { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    check:   { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
};

const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)',
    'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#d97706,#f59e0b)',
    'linear-gradient(135deg,#dc2626,#ef4444)', 'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#0284c7,#38bdf8)', 'linear-gradient(135deg,#15803d,#22c55e)',
];

function StudentAvatar({ name, size = 34 }: { name: string; size?: number }) {
    const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
    const idx = (name || '').charCodeAt(0) % GRADIENTS.length;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: GRADIENTS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.35, letterSpacing: 0.5, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
            {initials}
        </div>
    );
}

const gradeColors: Record<string, string> = {
    'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
    'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444', 'D-': '#dc2626', 'E': '#991b1b',
};

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }
export default function CombinedSmsPage() {
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [feePayments, setFeePayments] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [previewStudents, setPreviewStudents] = useState<any[]>([]);
    const [sentCount, setSentCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [smsLog, setSmsLog] = useState<{ student: string; phone: string; status: string; message: string; }[]>([]);
    const [paybill, setPaybill] = useState('123456');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, mRes, subRes, fpRes, fsRes, gRes, tRes, fRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('last_name'),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_fee_payments').select('*'),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
        ]);
        setStudents(sRes.data || []);
        setMarks(mRes.data || []);
        setSubjects(subRes.data || []);
        setFeePayments(fpRes.data || []);
        setFeeStructures(fsRes.data || []);
        setGrading(gRes.data || []);
        setTerms(tRes.data || []);
        setForms(fRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        const settings = await supabase.from('school_settings').select('*');
        if (settings.data) {
            const pb = settings.data.find((s: any) => s.setting_key === 'mpesa_paybill');
            if (pb) setPaybill(pb.setting_value || '123456');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const generatePreview = () => {
        if (!selTerm || !selForm) { toast.error('Select term and form'); return; }
        const formStudents = students.filter(s => s.form_id === Number(selForm));
        const termId = Number(selTerm);
        const feeStruct = feeStructures.find((fs: any) => fs.form_id === Number(selForm));
        const totalFees = Number(feeStruct?.total_amount || feeStruct?.tuition || 0);

        const previews = formStudents.map(student => {
            const studentMarks = marks.filter(m => m.student_id === student.id && m.term_id === termId);
            let totalPoints = 0, subjectCount = 0;
            for (const mark of studentMarks) {
                const score = Number(mark.combined_score || mark.score || 0);
                const g = getGrade(score);
                totalPoints += g.points;
                subjectCount++;
            }
            const meanGrade = subjectCount > 0 ? getGrade(totalPoints / subjectCount) : null;
            const totalPaid = feePayments.filter((fp: any) => fp.student_id === student.id).reduce((s: number, fp: any) => s + Number(fp.amount || 0), 0);
            const balance = totalFees - totalPaid;
            const allFormStudents = formStudents.map(fs => {
                const fsMarks = marks.filter(m => m.student_id === fs.id && m.term_id === termId);
                const fsTotal = fsMarks.reduce((a, m) => a + Number(m.combined_score || m.score || 0), 0);
                return { id: fs.id, avg: fsTotal / (fsMarks.length || 1) };
            }).sort((a, b) => b.avg - a.avg);
            const position = allFormStudents.findIndex(afs => afs.id === student.id) + 1;
            const message = `Dear Parent, ${student.first_name} ${student.last_name} — ${terms.find(t => t.id === termId)?.term_name || 'Term'} Results: Mean Grade ${meanGrade?.grade || 'N/A'} (Pos ${position}/${allFormStudents.length}). Fee Balance: Ksh ${balance.toLocaleString()}. Pay via Paybill ${paybill}.`;
            return { student, meanGrade: meanGrade?.grade || 'N/A', position, totalStudents: allFormStudents.length, balance, totalFees, totalPaid, phone: student.guardian_phone || '', message, selected: !!student.guardian_phone };
        });
        setPreviewStudents(previews);
    };

    const handleSendAll = async () => {
        const toSend = filtered.filter(ps => ps.selected && ps.phone);
        if (toSend.length === 0) { toast.error('No students with phone numbers selected'); return; }
        setSending(true); setSentCount(0); setFailedCount(0);
        const log: typeof smsLog = [];
        for (const ps of toSend) {
            try {
                const res = await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: ps.phone, message: ps.message }) });
                const data = await res.json();
                if (res.ok && data.success) { setSentCount(p => p + 1); log.push({ student: `${ps.student.first_name} ${ps.student.last_name}`, phone: ps.phone, status: 'Sent', message: ps.message }); }
                else { setFailedCount(p => p + 1); log.push({ student: `${ps.student.first_name} ${ps.student.last_name}`, phone: ps.phone, status: 'Failed', message: data.error || 'Unknown' }); }
            } catch { setFailedCount(p => p + 1); log.push({ student: `${ps.student.first_name} ${ps.student.last_name}`, phone: ps.phone, status: 'Failed', message: 'Network error' }); }
            await new Promise(r => setTimeout(r, 200));
        }
        setSmsLog(log); setSending(false);
        toast.success(`Sent ${log.filter(l => l.status === 'Sent').length} SMS, ${log.filter(l => l.status === 'Failed').length} failed`);
    };

    const toggleStudent = (id: number) => setPreviewStudents(prev => prev.map(ps => ps.student.id === id ? { ...ps, selected: !ps.selected } : ps));
    const toggleAll = () => {
        const allSel = filtered.filter(ps => ps.phone).every(ps => ps.selected);
        setPreviewStudents(prev => prev.map(ps => ps.phone ? { ...ps, selected: !allSel } : ps));
    };

    const filtered = useMemo(() => {
        if (!search) return previewStudents;
        const s = search.toLowerCase();
        return previewStudents.filter(ps =>
            `${ps.student.first_name} ${ps.student.last_name}`.toLowerCase().includes(s) ||
            ps.student.admission_number?.toLowerCase().includes(s) ||
            ps.phone.includes(s)
        );
    }, [previewStudents, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const withPhone = previewStudents.filter(ps => ps.phone).length;
    const selected = previewStudents.filter(ps => ps.selected).length;
    const totalBalance = previewStudents.reduce((s, ps) => s + ps.balance, 0);
    const noPhone = previewStudents.length - withPhone;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📱</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Combined SMS…</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">📱 Combined Fee + Results SMS</h1>
                    <p className="text-sm text-gray-500 mt-1">One SMS with term results AND fee balance to parents</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15} /></button>
                </div>
            </div>

            {/* ── Sample SMS Preview ── */}
            <div className="relative p-5 rounded-2xl border-2 overflow-hidden" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderColor: '#6ee7b7' }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10" style={{ background: '#10b981' }} />
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">✉️ Sample SMS</p>
                <div className="bg-white rounded-xl p-4 border border-green-100 font-mono text-sm text-gray-700 max-w-lg shadow-sm">
                    Dear Parent, John Doe — Term 2 Results: Mean Grade B+ (Pos 5/120). Fee Balance: Ksh 12,500. Pay via Paybill 123456.
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">Select Term</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                    <select value={selForm} onChange={e => setSelForm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">Select Form</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <input type="text" value={paybill} onChange={e => setPaybill(e.target.value)} placeholder="Paybill Number"
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700 w-36" />
                    <button onClick={generatePreview} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        <FiZap size={15} /> Generate Preview
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            {previewStudents.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Students', value: previewStudents.length, emoji: '👥', color: '#6366f1', bg: '#eef2ff', sub: 'In this form', pulse: false },
                        { label: 'With Phone', value: withPhone, emoji: '📞', color: '#10b981', bg: '#f0fdf4', sub: 'Can receive SMS', pulse: false },
                        { label: 'Selected', value: selected, emoji: '✅', color: '#7c3aed', bg: '#faf5ff', sub: 'Ready to send', pulse: selected > 0 },
                        { label: 'Total Balance', value: `Ksh ${totalBalance.toLocaleString()}`, emoji: '💰', color: '#c2410c', bg: '#fff7ed', sub: 'Outstanding fees', pulse: false },
                        { label: 'No Phone', value: noPhone, emoji: '⚠️', color: '#ef4444', bg: '#fef2f2', sub: 'Cannot send SMS', pulse: noPhone > 0 },
                    ].map((card, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: card.color }}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{card.label}</p>
                                <span className="text-xl">{card.emoji}</span>
                            </div>
                            <p className="text-xl font-extrabold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                            {card.pulse && <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: card.color }} />}
                            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: card.color }} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search + Send Bar ── */}
            {previewStudents.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search student name, adm no, phone…"
                                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" />
                            {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14} /></button>}
                        </div>
                        <p className="text-xs font-bold text-gray-400">{filtered.length} results</p>
                        <button onClick={handleSendAll} disabled={sending || selected === 0}
                            className={`ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${sending ? 'bg-gray-400 cursor-not-allowed' : 'hover:shadow-xl'}`}
                            style={!sending ? { background: 'linear-gradient(135deg,#10b981,#059669)' } : {}}>
                            <FiSend size={15} className={sending ? 'animate-pulse' : ''} /> {sending ? `Sending… (${sentCount})` : `Send ${selected} SMS`}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Ultra DataGrid ── */}
            {previewStudents.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                            <thead>
                                <tr>
                                    {[
                                        { label: '☑️', col: C.check },
                                        { label: '#', col: C.num },
                                        { label: '👤 Student', col: C.name },
                                        { label: '📊 Grade', col: C.grade },
                                        { label: '🏆 Position', col: C.pos },
                                        { label: '💰 Fee Balance', col: C.balance },
                                        { label: '📞 Phone', col: C.phone },
                                        { label: '✉️ SMS Preview', col: C.sms },
                                    ].map((h, i) => (
                                        <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                            style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                                        <div className="flex flex-col items-center gap-2"><span className="text-5xl">📱</span><p className="text-sm font-medium">No students found</p></div>
                                    </td></tr>
                                ) : paginated.map((ps, idx) => {
                                    const hasBalance = ps.balance > 0;
                                    return (
                                        <tr key={ps.student.id} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                            <td className="px-3 py-3 text-center" style={{ background: C.check.bg + '60' }}>
                                                <input type="checkbox" checked={ps.selected} onChange={() => toggleStudent(ps.student.id)} disabled={!ps.phone} className="rounded accent-indigo-500" />
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold" style={{ background: C.num.bg + '60', color: C.num.text }}>
                                                {(page - 1) * pageSize + idx + 1}
                                            </td>
                                            <td className="px-3 py-3" style={{ background: C.name.bg + '60' }}>
                                                <div className="flex items-center gap-2.5">
                                                    <StudentAvatar name={`${ps.student.first_name} ${ps.student.last_name}`} size={36} />
                                                    <div>
                                                        <div className="font-bold text-gray-900 whitespace-nowrap">{ps.student.first_name} {ps.student.last_name}</div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">🪪 {ps.student.admission_number}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center" style={{ background: C.grade.bg + '60' }}>
                                                <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg text-white font-black text-xs" style={{ background: gradeColors[ps.meanGrade] || '#94a3b8', boxShadow: `0 2px 6px ${gradeColors[ps.meanGrade] || '#94a3b8'}40` }}>{ps.meanGrade}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold whitespace-nowrap" style={{ background: C.pos.bg + '60', color: C.pos.text }}>
                                                🏆 {ps.position}/{ps.totalStudents}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap" style={{ background: hasBalance ? '#fff1f260' : C.balance.bg + '60' }}>
                                                {hasBalance ? (
                                                    <span className="font-extrabold text-red-600">Ksh {ps.balance.toLocaleString()}</span>
                                                ) : (
                                                    <span className="font-bold text-green-600 flex items-center gap-1"><FiCheckCircle size={11} /> Clear</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3" style={{ background: C.phone.bg + '60' }}>
                                                {ps.phone ? (
                                                    <div className="flex items-center gap-1 font-medium whitespace-nowrap" style={{ color: C.phone.text }}><FiPhone size={10} /> {ps.phone}</div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">No phone</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 max-w-[240px]" style={{ background: C.sms.bg + '60' }}>
                                                <p className="text-[10px] text-gray-500 truncate">{ps.message}</p>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 disabled:opacity-40">← Prev</button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 disabled:opacity-40">Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── SMS Log ── */}
            {smsLog.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📋 SMS Delivery Log</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                            <thead>
                                <tr>
                                    {[
                                        { label: '👤 Student', col: C.name },
                                        { label: '📞 Phone', col: C.phone },
                                        { label: '✅ Status', col: C.grade },
                                        { label: '✉️ Message', col: C.sms },
                                    ].map((h, i) => (
                                        <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                            style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>{h.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {smsLog.map((log, i) => (
                                    <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                        <td className="px-3 py-3 font-bold text-gray-900" style={{ background: C.name.bg + '60' }}>{log.student}</td>
                                        <td className="px-3 py-3 font-medium" style={{ background: C.phone.bg + '60', color: C.phone.text }}>{log.phone}</td>
                                        <td className="px-3 py-3" style={{ background: log.status === 'Sent' ? '#f0fdf460' : '#fff1f260' }}>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${log.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.status === 'Sent' ? '✅' : '❌'} {log.status}</span>
                                        </td>
                                        <td className="px-3 py-3 max-w-xs" style={{ background: C.sms.bg + '60' }}><p className="text-[10px] text-gray-500 truncate">{log.message}</p></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Empty State ── */}
            {previewStudents.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: 'linear-gradient(135deg,#eef2ff,#c7d2fe)' }}>📱</div>
                        <p className="text-lg font-black text-gray-700">Generate SMS Preview</p>
                        <p className="text-sm text-gray-400">Select a term and form, then click Generate Preview</p>
                    </div>
                </div>
            )}
        </div>
    );
}
