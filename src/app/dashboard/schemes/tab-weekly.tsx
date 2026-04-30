'use client';
import type { SchemeOfWork, SchemeWeek, SchemeLesson } from '@/lib/schemes';

export default function WeeklyTab({ scheme, weeks, lessons }: {
    scheme: SchemeOfWork; weeks: SchemeWeek[]; lessons: SchemeLesson[];
}) {
    const isCBC = scheme.curriculum_type === 'CBC';

    const CBC_COLS = ['Week', 'Lesson', 'Strand/Sub-Strand', 'Learning Outcomes', 'Key Inquiry Questions', 'Learning Activities', 'Learning Resources', 'Assessment Methods', 'Core Competencies & Values', 'Remarks'];
    const EIGHT44_COLS = ['Week', 'Lesson', 'Topic/Sub-Topic', 'Objectives', 'Learning Activities', 'Learning Resources', 'Assessment Methods', 'Remarks', 'Teacher Reflection', 'Date Completed'];
    const cols = isCBC ? CBC_COLS : EIGHT44_COLS;

    // Build flat rows: one row per lesson, with week rowspan
    type Row = { week: SchemeWeek; lesson: SchemeLesson | null; weekRowSpan: number };
    const rows: Row[] = [];
    for (const w of weeks) {
        const wkLessons = lessons.filter(l => l.week_id === w.id);
        if (w.is_midterm || w.is_holiday || wkLessons.length === 0) {
            rows.push({ week: w, lesson: null, weekRowSpan: 1 });
        } else {
            wkLessons.forEach((l, i) => {
                rows.push({ week: w, lesson: l, weekRowSpan: i === 0 ? wkLessons.length : 0 });
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">📋 KICD/MoE Official Scheme Table</h3>
                <span className="text-[10px] font-bold text-gray-400">{isCBC ? 'CBC 9-Column Format' : '8-4-4 Format'}</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-gray-100">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                            {cols.map((c, i) => (
                                <th key={i} className="px-3 py-3 text-left font-black text-gray-700 border-b-2 border-gray-200 whitespace-nowrap">{c}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => {
                            const { week: w, lesson: l, weekRowSpan } = row;
                            if (!l) {
                                // Mid-term / holiday row
                                return (
                                    <tr key={ri} className={w.is_midterm ? 'bg-amber-50' : 'bg-red-50'}>
                                        <td colSpan={cols.length} className="px-3 py-4 text-center font-bold border-b border-gray-100" style={{ color: w.is_midterm ? '#b45309' : '#dc2626' }}>
                                            {w.is_midterm ? '🏖️ MID-TERM BREAK' : '🎉 HOLIDAY'} — Week {w.week_number}
                                        </td>
                                    </tr>
                                );
                            }
                            const bgClass = ri % 2 === 0 ? '' : 'bg-gray-50/50';
                            return (
                                <tr key={ri} className={`${bgClass} hover:bg-blue-50/30 transition border-b border-gray-100`}>
                                    {weekRowSpan > 0 && (
                                        <td rowSpan={weekRowSpan} className="px-3 py-3 font-black text-blue-700 align-top whitespace-nowrap border-r border-gray-200">W{w.week_number}</td>
                                    )}
                                    {isCBC ? (
                                        <>
                                            <td className="px-2 py-2 align-top font-bold text-purple-600 text-[10px]">L{l.lesson_number}</td>
                                            <td className="px-3 py-2 align-top"><span className="font-bold text-purple-700">{l.sub_strand_name || l.lesson_title}</span></td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.learning_outcomes||[]).map((o, j) => <p key={j} className="text-[11px] text-gray-700 leading-tight">• {o}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.key_inquiry_questions||[]).map((q, j) => <p key={j} className="text-[11px] text-blue-700 leading-tight italic">❓ {q}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.learning_activities||[]).map((a, j) => <p key={j} className="text-[11px] text-gray-700 leading-tight">▸ {a}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.learning_resources||[]).map((r, j) => <p key={j} className="text-[11px] text-teal-700 leading-tight">📎 {r}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.assessment_methods||[]).map((a, j) => <p key={j} className="text-[11px] text-amber-700 leading-tight">✎ {a}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="flex flex-wrap gap-1 mb-1">
                                                    {(l.core_competencies||[]).map((c, j) => <span key={j} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">{c}</span>)}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(l.values||[]).map((v, j) => <span key={j} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">{v}</span>)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-top text-gray-400 text-[10px]">
                                                {l.is_completed ? <span className="text-green-600 font-bold">✓</span> : '—'}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-2 py-2 align-top font-bold text-indigo-600 text-[10px]">L{l.lesson_number}</td>
                                            <td className="px-3 py-2 align-top font-bold text-gray-800">{l.topic_name || l.lesson_title}</td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.learning_outcomes||[]).map((o, j) => <p key={j} className="text-[11px] text-gray-700 leading-tight">• {o}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.learning_activities||[]).map((a, j) => <p key={j} className="text-[11px] text-gray-700 leading-tight">▸ {a}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.learning_resources||[]).map((r, j) => <p key={j} className="text-[11px] text-teal-700 leading-tight">📎 {r}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                {(l.assessment_methods||[]).map((a, j) => <p key={j} className="text-[11px] text-amber-700 leading-tight">✎ {a}</p>)}
                                            </td>
                                            <td className="px-3 py-2 align-top text-gray-400 text-[10px]">—</td>
                                            <td className="px-3 py-2 align-top text-gray-400 text-[10px]">—</td>
                                            <td className="px-3 py-2 align-top text-gray-400 text-[10px]">—</td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="text-[10px] text-gray-400 text-center print:hidden">💡 Use Print Preview (🖨️) for official document format</p>
        </div>
    );
}
