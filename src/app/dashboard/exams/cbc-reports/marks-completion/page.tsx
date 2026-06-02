'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData } from '@/hooks/useCBCReportData';
import { FiCheckCircle, FiArrowLeft, FiAlertCircle, FiClock, FiTrendingUp, FiDownload } from 'react-icons/fi';

export default function MarksCompletionPage() {
    const data = useCBCReportData();

    const completionData = useMemo(() => {
        const subjectIds = [...new Set(data.studentSubjects.map((ss: any) => ss.subject_id))];
        return subjectIds.map(subjectId => {
            const subject = data.subjects.find((s: any) => s.id === subjectId);
            if (!subject) return null;
            const enrolled = data.studentSubjects
                .filter((ss: any) => ss.subject_id === subjectId)
                .map((ss: any) => ss.student_id)
                .filter((id: number) => data.filteredStudentIds.has(id));
            if (enrolled.length === 0) return null;
            const withOverall = data.summaries.filter((s: any) =>
                s.subject_id === subjectId && enrolled.includes(s.student_id) && s.overall_level
            );
            const pct = Math.round((withOverall.length / enrolled.length) * 100);
            const asmts = data.assessments.filter((a: any) => a.subject_id === subjectId);
            const tIds = [...new Set(asmts.map((a: any) => a.teacher_id).filter(Boolean))];
            const last = asmts.length > 0
                ? new Date(Math.max(...asmts.map((a: any) => new Date(a.assessed_at).getTime()))).toLocaleDateString('en-KE')
                : null;
            return {
                subject, enrolled: enrolled.length,
                completed: withOverall.length, pct,
                teachers: tIds.map((id: any) => data.getStaffName(id!)).join(', '), last,
            };
        }).filter(Boolean).sort((a: any, b: any) => a!.pct - b!.pct);
    }, [data]);

    const overallPct = useMemo(() => {
        const t = completionData.reduce((a: number, c: any) => a + c.enrolled, 0);
        const d = completionData.reduce((a: number, c: any) => a + c.completed, 0);
        return t > 0 ? Math.round((d / t) * 100) : 0;
    }, [completionData]);

    const complete = completionData.filter((c: any) => c.pct >= 100).length;
    const partial = completionData.filter((c: any) => c.pct > 0 && c.pct < 100).length;
    const notStarted = completionData.filter((c: any) => c.pct === 0).length;

    const barColor = (pct: number) => pct >= 90 ? '#16a34a' : pct >= 60 ? '#d97706' : pct >= 30 ? '#ea580c' : '#dc2626';

    const exportCSV = () => {
        const rows = [
            ['Subject', 'Enrolled', 'Completed', 'Completion %', 'Teacher', 'Last Entry'],
            ...completionData.map((c: any) => [c.subject.subject_name, c.enrolled, c.completed, c.pct + '%', c.teachers || 'Unassigned', c.last || 'Never'])
        ].map(r => r.join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
        a.download = 'marks_completion.csv'; a.click();
    };

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-slate-600 animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/exams/cbc-reports"
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
                                <FiArrowLeft size={16} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-black flex items-center gap-2">
                                    <FiCheckCircle size={18} /> Marks Entry Completion
                                </h1>
                                <p className="text-slate-400 text-sm mt-0.5">
                                    Track teacher marks entry progress per subject · {data.currentTerm?.term_name}
                                </p>
                            </div>
                        </div>
                        <button onClick={exportCSV}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                            <FiDownload size={13} /> Export CSV
                        </button>
                    </div>

                    {/* KPI strip */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Overall Completion', val: `${overallPct}%`, color: overallPct >= 80 ? '#86efac' : overallPct >= 50 ? '#fcd34d' : '#fca5a5' },
                            { label: '✅ Fully Complete', val: complete, color: '#86efac' },
                            { label: '⏳ In Progress', val: partial, color: '#fcd34d' },
                            { label: '🔴 Not Started', val: notStarted, color: '#fca5a5' },
                        ].map((k, i) => (
                            <div key={i} className="bg-white/10 rounded-xl p-3">
                                <p className="text-slate-400 text-[10px] font-bold uppercase">{k.label}</p>
                                <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Master Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Overall Progress</span><span>{overallPct}%</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${overallPct}%`, background: overallPct >= 80 ? '#16a34a' : overallPct >= 50 ? '#d97706' : '#dc2626' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Form', val: data.selForm, set: data.setSelForm, opts: data.forms, key: 'id', name: 'form_name' },
                        { label: 'Stream', val: data.selStream, set: data.setSelStream, opts: data.streams, key: 'id', name: 'stream_name' },
                        { label: 'Term', val: data.selTerm, set: data.setSelTerm, opts: data.terms, key: 'id', name: 'term_name' },
                    ].map(f => (
                        <div key={f.label}>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{f.label}</label>
                            <select value={f.val} onChange={e => f.set(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                                {f.label !== 'Term' && <option value="">All</option>}
                                {f.opts.map((o: any) => (
                                    <option key={o[f.key]} value={o[f.key]}>
                                        {o[f.name]}{o.is_current ? ' ●' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subject cards */}
            {data.loadingData ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-slate-600 rounded-full animate-spin mx-auto" />
                </div>
            ) : completionData.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="font-semibold">No subject data found for selected filters</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {completionData.map((item: any) => (
                        <div key={item.subject.id}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
                            style={{ borderLeft: `4px solid ${barColor(item.pct)}` }}>
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: `${barColor(item.pct)}20` }}>
                                        {item.pct >= 100
                                            ? <FiCheckCircle size={16} style={{ color: barColor(item.pct) }} />
                                            : item.pct > 0
                                                ? <FiClock size={16} style={{ color: barColor(item.pct) }} />
                                                : <FiAlertCircle size={16} style={{ color: barColor(item.pct) }} />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800">{item.subject.subject_name}</h3>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            Teacher: <span className="font-semibold text-gray-600">{item.teachers || 'Unassigned'}</span>
                                            {item.last && <> · Last entry: <span className="font-semibold text-gray-600">{item.last}</span></>}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-2xl font-black" style={{ color: barColor(item.pct) }}>{item.pct}%</p>
                                    <p className="text-[10px] text-gray-400">{item.completed} / {item.enrolled} students</p>
                                </div>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${item.pct}%`, background: barColor(item.pct) }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
