'use client';

import Link from 'next/link';
import { FiActivity, FiCalendar, FiUsers, FiChevronRight } from 'react-icons/fi';

interface ActivityItem {
    text: string;
    time: string;
    dotColor: string;
}

interface EventItem {
    day: string;
    month: string;
    title: string;
    time: string;
    category: 'Meeting' | 'Exam' | 'Event' | 'Holiday';
}

interface StudentRankItem {
    rank: number;
    initials: string;
    name: string;
    form: string;
    score: number;
}

interface UltraActivityRowProps {
    activities?: ActivityItem[];
    events?: EventItem[];
    topStudents?: StudentRankItem[];
}

export default function UltraActivityRow({
    activities = [],
    events = [],
    topStudents = [],
}: UltraActivityRowProps) {
    const displayActivities = activities;
    const displayEvents = events;
    const displayTopStudents = topStudents;

    const getCategoryBadge = (cat: EventItem['category']) => {
        switch (cat) {
            case 'Meeting':
                return 'bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]';
            case 'Exam':
                return 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]';
            case 'Event':
                return 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]';
            default:
                return 'bg-blue-50 text-blue-700 border border-blue-200';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* ══════════════════════════════════════════════════
                CARD 1: Recent Activity
            ══════════════════════════════════════════════════ */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <FiActivity size={15} className="text-blue-600" />
                            <h3 className="text-xs font-black text-slate-800 tracking-tight">Recent Activity</h3>
                        </div>
                        <Link
                            href="/dashboard/audit"
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 group transition-colors"
                        >
                            <span>View All</span>
                            <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {displayActivities.slice(0, 5).map((act, i) => (
                            <div key={i} className="flex items-center justify-between gap-2.5 text-xs py-0.5 group">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
                                        style={{ backgroundColor: act.dotColor }}
                                    />
                                    <span className="text-[11px] font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                                        {act.text}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                                    {act.time}
                                </span>
                            </div>
                        ))}
                        {displayActivities.length === 0 && (
                            <div className="py-6 text-center text-slate-400 text-xs">No recent activity</div>
                        )}
                    </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Feed Active
                    </span>
                    <span>Encrypted Audit Trail</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                CARD 2: Upcoming Events
            ══════════════════════════════════════════════════ */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <FiCalendar size={15} className="text-blue-600" />
                            <h3 className="text-xs font-black text-slate-800 tracking-tight">Upcoming Events</h3>
                        </div>
                        <Link
                            href="/dashboard/academic-calendar"
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 group transition-colors"
                        >
                            <span>View All</span>
                            <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {displayEvents.slice(0, 3).map((evt, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-blue-50/40 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Date Box */}
                                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100/80 flex flex-col items-center justify-center flex-shrink-0 text-center shadow-xs">
                                        <span className="text-sm font-black text-blue-600 leading-none">
                                            {evt.day}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">
                                            {evt.month}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">
                                            {evt.title}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            {evt.time}
                                        </p>
                                    </div>
                                </div>

                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-tight ${getCategoryBadge(evt.category)}`}>
                                    {evt.category}
                                </span>
                            </div>
                        ))}
                        {displayEvents.length === 0 && (
                            <div className="py-6 text-center text-slate-400 text-xs">No upcoming events scheduled</div>
                        )}
                    </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Term Calendar</span>
                    <span className="text-blue-600 font-bold hover:underline cursor-pointer">Sync to Google</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                CARD 3: Top Performing Students
            ══════════════════════════════════════════════════ */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <FiUsers size={15} className="text-blue-600" />
                            <h3 className="text-xs font-black text-slate-800 tracking-tight">Top Performing Students</h3>
                        </div>
                        <Link
                            href="/dashboard/exams/merit-list"
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 group transition-colors"
                        >
                            <span>View All</span>
                            <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {displayTopStudents.slice(0, 5).map((st) => (
                            <div key={st.rank} className="flex items-center justify-between gap-2.5 py-1 px-1 rounded-xl hover:bg-blue-50/40 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-[11px] font-black text-slate-400 w-3 text-center">
                                        {st.rank}
                                    </span>
                                    {/* Initials Avatar */}
                                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-xs">
                                        {st.initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                            {st.name} <span className="text-slate-400 font-normal">· {st.form}</span>
                                        </p>
                                    </div>
                                </div>

                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] font-mono flex-shrink-0">
                                    {st.score.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                        {displayTopStudents.length === 0 && (
                            <div className="py-6 text-center text-slate-400 text-xs">No exam rankings recorded</div>
                        )}
                    </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Ranked by Mean Aggregate</span>
                    <span className="text-emerald-600 font-bold">KNEC Grade A Standard</span>
                </div>
            </div>
        </div>
    );
}
