'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData } from '@/hooks/useCBCReportData';
import { FiFlag, FiArrowLeft, FiDownload, FiPrinter, FiAlertTriangle, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';

export default function BERegisterPage() {
    const data = useCBCReportData();

    const beStudents = useMemo(() => {
        const results: any[] = [];
        data.filteredStudents.forEach((student: any) => {
            const sums = data.filteredSummaries.filter((s: any) => s.student_id === student.id && s.overall_level === 'BE');
            if (sums.length === 0) return;
            const subjects = sums.map((s: any) => data.getSubjectName(s.subject_id));
            const intervention = data.interventions.find((i: any) => i.student_id === student.id);
            results.push({ student, beSubjects: subjects, beCount: sums.length, intervention });
        });
        return results.sort((a, b) => b.beCount - a.beCount);
    }, [data]);

    const withIntervention = beStudents.filter(r => r.intervention).length;
    const notFlagged = beStudents.filter(r => !r.intervention).length;
    const resolved = beStudents.filter(r => r.intervention?.status === 'resolved').length;
    const totalBEInstances = beStudents.reduce((a, b) => a + b.beCount, 0);

    const exportCSV = () => {
        const headers = ['#', 'Adm No', 'Name', 'Gender', 'Stream', 'BE Subjects', 'BE Count', 'Intervention Status', 'Assigned Teacher'];
        const rows = beStudents.map((r, i) => [
            i + 1,
            r.student.admission_no || r.student.admission_number,
            `${r.student.first_name} ${r.student.last_name}`,
            r.student.gender,
            data.getStreamName(r.student.stream_id),
            r.beSubjects.join('; '),
            r.beCount,
            r.intervention?.status || 'Not flagged',
            r.intervention ? data.getStaffName(r.intervention.flagged_by) : '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `be-register-${data.currentTerm?.term_name || 'report'}.csv`;
        a.click();
    };

    const getStatusConfig = (status?: string) => {
        if (!status) return { label: 'Not Flagged', bg: 'bg-gray-100', text: 'text-gray-500', icon: FiAlertTriangle };
        if (status === 'resolved') return { label: 'Resolved', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: FiCheckCircle };
        if (status === 'in_progress') return { label: 'In Progress', bg: 'bg-amber-100', text: 'text-amber-700', icon: FiClock };
        return { label: 'Open', bg: 'bg-red-100', text: 'text-red-700', icon: FiAlertTriangle };
    };

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-red-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-500 animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #ef4444 100%)' }}>
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
                                    <FiFlag size={18} /> BE Intervention Register
                                </h1>
                                <p className="text-red-200 text-sm mt-0.5">
                                    Students performing Below Expectation — intervention tracking · {data.currentTerm?.term_name}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                                <FiPrinter size={13} /> Print
                            </button>
                            <button onClick={exportCSV}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-red-700 rounded-xl text-xs font-black shadow-lg hover:shadow-xl transition">
                                <FiDownload size={13} /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'BE Students', val: beStudents.length, color: '#fca5a5' },
                            { label: 'BE Instances', val: totalBEInstances, color: '#fdba74' },
                            { label: 'With Intervention', val: withIntervention, color: '#86efac' },
                            { label: 'Not Yet Flagged', val: notFlagged, color: '#fcd34d' },
                        ].map((k, i) => (
                            <div key={i} className="bg-white/10 rounded-xl p-3">
                                <p className="text-red-200 text-[10px] font-bold uppercase">{k.label}</p>
                                <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Form', val: data.selForm, set: data.setSelForm, opts: data.forms, name: 'form_name', all: true },
                        { label: 'Stream', val: data.selStream, set: data.setSelStream, opts: data.streams, name: 'stream_name', all: true },
                        { label: 'Term', val: data.selTerm, set: data.setSelTerm, opts: data.terms, name: 'term_name', all: false },
                    ].map(f => (
                        <div key={f.label}>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{f.label}</label>
                            <select value={f.val} onChange={e => f.set(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                                {f.all && <option value="">All</option>}
                                {f.opts.map((o: any) => (
                                    <option key={o.id} value={o.id}>{o[f.name]}{o.is_current ? ' ●' : ''}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Urgency alert */}
            {notFlagged > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <FiAlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">
                            {notFlagged} student{notFlagged !== 1 ? 's' : ''} need immediate intervention!
                        </p>
                        <p className="text-xs text-amber-600">These students are performing below expectation with no active support plan.</p>
                    </div>
                </div>
            )}

            {/* Table */}
            {data.loadingData ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
                    <div className="w-8 h-8 border-4 border-red-100 border-t-red-500 rounded-full animate-spin mx-auto" />
                </div>
            ) : beStudents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-20">
                    <p className="text-5xl mb-4">🎉</p>
                    <p className="font-bold text-lg text-emerald-600">No BE Students!</p>
                    <p className="text-sm text-gray-400 mt-1">All students are performing at or above expectation</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 13 }}>
                            <thead>
                                <tr>
                                    {['#', 'Adm No', 'Student Name', 'G', 'Stream', 'BE Subjects', 'Count', 'Intervention', 'Support Teacher'].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                            style={{ background: '#fef2f2', color: '#b91c1c', borderBottom: '2px solid #fecaca' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {beStudents.map((row, i) => {
                                    const statusCfg = getStatusConfig(row.intervention?.status);
                                    const StatusIcon = statusCfg.icon;
                                    return (
                                        <tr key={row.student.id}
                                            className={`border-b border-gray-50 hover:bg-red-50/20 transition-colors ${row.beCount >= 4 ? 'bg-red-50/10' : ''}`}>
                                            <td className="px-3 py-3 text-gray-400 text-xs text-center font-bold">{i + 1}</td>
                                            <td className="px-3 py-3">
                                                <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    {row.student.admission_no || row.student.admission_number}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                        style={{ background: row.student.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#db2777)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                                                        {row.student.first_name?.[0]}{row.student.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-sm">{row.student.first_name} {row.student.last_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.student.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {row.student.gender === 'Female' ? 'F' : 'M'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-xs text-gray-600 font-medium">
                                                {data.getStreamName(row.student.stream_id)}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.beSubjects.map((s: string, j: number) => (
                                                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-black ${row.beCount >= 4 ? 'bg-red-600' : row.beCount >= 2 ? 'bg-orange-500' : 'bg-amber-400'}`}>
                                                    {row.beCount}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                                                    <StatusIcon size={10} />
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-600">
                                                {row.intervention ? (
                                                    <span className="flex items-center gap-1">
                                                        <FiUser size={10} className="text-gray-400" />
                                                        {data.getStaffName(row.intervention.flagged_by)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 italic">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 bg-red-50 border-t border-red-100 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-red-700">
                            {beStudents.length} students below expectation · {totalBEInstances} total BE instances
                        </p>
                        <p className="text-sm text-emerald-700 font-bold">
                            {resolved} resolved · {withIntervention - resolved} active interventions
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
