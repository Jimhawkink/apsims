'use client';
import type { SchemeOfWork, SchemeWeek, SchemeLesson } from '@/lib/schemes';
import { curriculumBadge, statusBadge, C } from './helpers';

export default function OverviewTab({ scheme, weeks, lessons, progress, completedLessons }: {
    scheme: SchemeOfWork; weeks: SchemeWeek[]; lessons: SchemeLesson[]; progress: number; completedLessons: number;
}) {
    const midTerm = weeks.find(w => w.is_midterm);
    const kpi = [
        { l: 'Total Weeks', v: weeks.length, e: '📅', c: '#3b82f6', b: '#eff6ff' },
        { l: 'Total Lessons', v: lessons.length, e: '📝', c: '#7c3aed', b: '#faf5ff' },
        { l: 'Completed', v: completedLessons, e: '✅', c: '#059669', b: '#ecfdf5' },
        { l: 'Progress', v: `${progress}%`, e: '📊', c: '#b45309', b: '#fffbeb' },
        { l: 'Duration', v: `${lessons[0]?.lesson_duration_minutes||40}min`, e: '⏱️', c: '#1d4ed8', b: '#eef2ff' },
    ];

    return (
        <div className="space-y-5">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {kpi.map((k, i) => (
                    <div key={i} className="relative p-4 rounded-2xl border-2 overflow-hidden" style={{ background: k.b, borderColor: k.c+'33' }}>
                        <div className="absolute top-0 right-0 w-14 h-14 rounded-full -translate-y-5 translate-x-5 opacity-10" style={{ background: k.c }} />
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: k.c+'99' }}>{k.e} {k.l}</p>
                        <p className="text-xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                    </div>
                ))}
            </div>

            {/* Scheme Info Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                <h3 className="text-sm font-black text-gray-900 mb-4">📋 Scheme Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                        ['Subject', scheme.subject_name, C.subject],
                        ['Form', scheme.form_name, C.form],
                        ['Term', scheme.term_name, C.term],
                        ['Curriculum', scheme.curriculum_type === 'CBC' ? 'CBC (Competency Based)' : '8-4-4 (Legacy)', C.cbc],
                        ['Status', scheme.status, C.status],
                        ['Teacher', scheme.teacher_name || 'Not assigned', C.teacher],
                        ...(scheme.curriculum_type === 'CBC' ? [
                            ['Strand', scheme.strand_name || '—', C.cbc],
                            ['Sub-Strand', scheme.sub_strand_name || '—', C.cbc],
                        ] : []),
                        ['Topic', scheme.topic_name || '—', C.lessons],
                        ['Created By', scheme.created_by || '—', C.teacher],
                        ['Created', scheme.created_at ? new Date(scheme.created_at).toLocaleDateString() : '—', C.teacher],
                        ['Approved By', scheme.approved_by || '—', C.approved],
                    ].map(([label, value, col], i) => (
                        <div key={i} className="p-3 rounded-xl" style={{ background: (col as any).bg }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: (col as any).text+'99' }}>{label as string}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: (col as any).text }}>{value as string}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Week Summary */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                <h3 className="text-sm font-black text-gray-900 mb-4">📅 Week Summary</h3>
                <div className="grid grid-cols-7 gap-2">
                    {weeks.map(w => {
                        const wkLessons = lessons.filter(l => l.week_id === w.id);
                        const done = wkLessons.filter(l => l.is_completed).length;
                        const pct = wkLessons.length > 0 ? Math.round((done/wkLessons.length)*100) : 0;
                        const bg = w.is_midterm ? '#fef3c7' : w.is_holiday ? '#fee2e2' : pct >= 100 ? '#d1fae5' : pct > 0 ? '#e0f2fe' : '#f8fafc';
                        return (
                            <div key={w.id} className="p-2 rounded-xl text-center border" style={{ background: bg, borderColor: '#e2e8f0' }}>
                                <p className="text-[10px] font-black text-gray-500">W{w.week_number}</p>
                                <p className="text-xs font-bold mt-0.5">{done}/{wkLessons.length}</p>
                                <div className="h-1 rounded-full bg-gray-200 mt-1"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#059669' : '#3b82f6' }} /></div>
                                {w.is_midterm && <p className="text-[8px] text-amber-600 font-bold mt-0.5">MID</p>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
