'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiColumns, FiArrowLeft, FiTrendingUp, FiAward, FiDownload } from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function StreamComparisonPage() {
    const data = useCBCReportData();

    const comparison = useMemo(() => {
        const subjectIds = [...new Set(data.summaries.map((s: any) => s.subject_id))];
        return subjectIds.map(subjectId => {
            const subject = data.subjects.find((s: any) => s.id === subjectId);
            if (!subject) return null;
            const streamData = data.streams.map((stream: any) => {
                const studentIds = new Set(data.students.filter((s: any) => String(s.stream_id) === String(stream.id)).map((s: any) => s.id));
                const sums = data.summaries.filter((s: any) => s.subject_id === subjectId && studentIds.has(s.student_id) && s.overall_level);
                if (sums.length === 0) return null;
                let totalNum = 0;
                const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
                sums.forEach((s: any) => { counts[s.overall_level!]++; totalNum += rubricNumeric(s.overall_level!); });
                const avg = totalNum / sums.length;
                const meAbovePct = Math.round(((counts.EE + counts.ME) / sums.length) * 100);
                return { stream, total: sums.length, avg, meAbovePct, counts };
            }).filter(Boolean).sort((a: any, b: any) => b.avg - a.avg);
            return { subject, streamData };
        }).filter((c): c is NonNullable<typeof c> => c !== null && c.streamData.length > 0);
    }, [data]);

    const exportCSV = () => {
        const rows = [
            ['Subject', 'Stream', 'Total Students', 'EE', 'ME', 'AE', 'BE', 'ME+ %'],
            ...comparison.flatMap((comp: any) =>
                comp.streamData.map((sd: any) => [
                    comp.subject.subject_name, sd.stream.stream_name, sd.total,
                    sd.counts.EE, sd.counts.ME, sd.counts.AE, sd.counts.BE, `${sd.meAbovePct}%`
                ])
            )
        ].map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
        a.download = `stream_comparison_${data.currentTerm?.term_name || 'report'}.csv`;
        a.click();
    };

    const topStream = useMemo(() => {
        const scores: Record<string, { total: number; count: number }> = {};
        comparison.forEach((comp: any) => {
            comp.streamData.forEach((sd: any) => {
                const key = sd.stream.stream_name;
                if (!scores[key]) scores[key] = { total: 0, count: 0 };
                scores[key].total += sd.avg;
                scores[key].count++;
            });
        });
        return Object.entries(scores).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]?.[0] || '—';
    }, [comparison]);

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #6366f1 100%)' }}>
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
                                    <FiColumns size={18} /> Stream Comparison
                                </h1>
                                <p className="text-blue-200 text-sm mt-0.5">
                                    Side-by-side stream performance · {data.currentTerm?.term_name}
                                </p>
                            </div>
                        </div>
                        <button onClick={exportCSV}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                            <FiDownload size={13} /> Export CSV
                        </button>
                    </div>

                    {/* KPI strip */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        {[
                            { label: 'Subjects Compared', val: comparison.length, icon: FiColumns },
                            { label: 'Streams Tracked', val: data.streams.length, icon: FiTrendingUp },
                            { label: 'Top Stream', val: topStream, icon: FiAward },
                        ].map((k, i) => (
                            <div key={i} className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                                <k.icon size={18} className="text-blue-200 flex-shrink-0" />
                                <div>
                                    <p className="text-blue-300 text-[10px] font-bold uppercase">{k.label}</p>
                                    <p className="text-lg font-black text-white">{k.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Form</label>
                        <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                            <option value="">All</option>
                            {data.forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Term</label>
                        <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                            {data.terms.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Level legend */}
            <div className="flex gap-3 flex-wrap">
                {LEVELS.map(level => {
                    const rc = getRubricColor(level);
                    return (
                        <div key={level} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border"
                            style={{ background: rc.bg + '20', color: rc.bg, borderColor: rc.bg + '40' }}>
                            <span className="w-3 h-3 rounded-full" style={{ background: rc.bg }} />
                            {level}
                        </div>
                    );
                })}
                <p className="text-xs text-gray-400 self-center">EE=Exceeds · ME=Meets · AE=Approaching · BE=Below</p>
            </div>

            {/* Subject comparison cards */}
            {data.loadingData ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto" />
                </div>
            ) : comparison.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="font-semibold">No comparison data available for selected filters</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {comparison.map((comp: any) => (
                        <div key={comp.subject.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-5 rounded-full bg-blue-500 inline-block" />
                                    {comp.subject.subject_name}
                                </h3>
                                <span className="text-xs text-gray-400">{comp.streamData.length} streams</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                                {comp.streamData.map((sd: any, idx: number) => (
                                    <div key={sd.stream.id} className={`px-5 py-4 ${idx === 0 ? 'bg-amber-50/30' : ''}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-gray-400' : 'bg-gray-300'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm font-bold text-gray-800">{sd.stream.stream_name}</span>
                                                {idx === 0 && <span className="text-amber-500 text-xs">🏆</span>}
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-black ${sd.meAbovePct >= 70 ? 'text-emerald-600' : sd.meAbovePct >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                                                    {sd.meAbovePct}%
                                                </p>
                                                <p className="text-[10px] text-gray-400">ME+</p>
                                            </div>
                                        </div>
                                        {/* Stacked bar */}
                                        <div className="flex h-5 rounded-lg overflow-hidden gap-px">
                                            {LEVELS.map(level => {
                                                const cnt = sd.counts[level] || 0;
                                                const w = sd.total > 0 ? (cnt / sd.total) * 100 : 0;
                                                if (w === 0) return null;
                                                const rc = getRubricColor(level);
                                                return (
                                                    <div key={level}
                                                        className="flex items-center justify-center text-white text-[9px] font-bold transition-all"
                                                        style={{ width: `${w}%`, background: rc.bg }}
                                                        title={`${level}: ${cnt} students (${Math.round(w)}%)`}>
                                                        {w > 12 ? `${level} ${cnt}` : w > 7 ? level : ''}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            {LEVELS.map(level => {
                                                const cnt = sd.counts[level] || 0;
                                                const rc = getRubricColor(level);
                                                return (
                                                    <div key={level} className="text-center">
                                                        <p className="text-[9px] font-bold" style={{ color: rc.bg }}>{level}</p>
                                                        <p className="text-[10px] font-black text-gray-700">{cnt}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 text-center">{sd.total} students assessed</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
