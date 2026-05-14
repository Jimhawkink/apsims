'use client';
import { useState, useMemo } from 'react';
import { FiSearch, FiCheckCircle, FiClock, FiAlertTriangle, FiMessageSquare, FiMapPin, FiFilter, FiPhone, FiUser } from 'react-icons/fi';

interface Props {
    activeLeaves: any[]; forms: any[]; streams: any[]; now: number;
    handleMarkReturned: (id: number) => void; handleSendSMS: (leave: any) => void;
}

export default function ActiveLeavesTab({ activeLeaves, forms, streams, now, handleMarkReturned, handleSendSMS }: Props) {
    const [search, setSearch] = useState('');
    const [filterReason, setFilterReason] = useState('');
    const [filterForm, setFilterForm] = useState('');

    const fn = (id: number) => forms.find((f:any) => f.id === id)?.form_name || '';
    const sn = (id: number) => streams.find((s:any) => s.id === id)?.stream_name || '';

    const getDuration = (timeLeft: string) => {
        const mins = Math.round((now - new Date(timeLeft).getTime()) / 60000);
        if (mins < 60) return { text: `${mins}m`, color: '#22c55e', level: 'ok' };
        const hrs = Math.floor(mins / 60);
        const rm = mins % 60;
        if (hrs < 3) return { text: `${hrs}h ${rm}m`, color: '#f59e0b', level: 'warn' };
        return { text: `${hrs}h ${rm}m`, color: '#ef4444', level: 'danger' };
    };

    const filtered = useMemo(() => {
        return activeLeaves.filter(l => {
            const st = l.school_students;
            const name = st ? `${st.first_name} ${st.last_name} ${st.admission_number}`.toLowerCase() : '';
            if (search && !name.includes(search.toLowerCase())) return false;
            if (filterReason && l.reason !== filterReason) return false;
            if (filterForm && st?.form_id !== parseInt(filterForm)) return false;
            return true;
        });
    }, [activeLeaves, search, filterReason, filterForm]);

    const reasons = [...new Set(activeLeaves.map(l => l.reason))];

    if (activeLeaves.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
                    <FiCheckCircle size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">All Students Accounted For</h3>
                <p className="text-sm text-gray-500 mt-2">No students are currently on leave. Great! 🎉</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition" />
                    </div>
                    <select value={filterReason} onChange={e => setFilterReason(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition">
                        <option value="">All Reasons</option>
                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={filterForm} onChange={e => setFilterForm(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition">
                        <option value="">All Forms</option>
                        {forms.map((f:any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        <FiMapPin size={12} /> {filtered.length} currently out
                    </div>
                </div>
            </div>

            {/* Active Leaves Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(leave => {
                    const st = leave.school_students;
                    const dur = getDuration(leave.time_left);
                    const RC: Record<string,string> = { Medication:'#3b82f6', Discipline:'#ef4444', Personal:'#8b5cf6', Emergency:'#f97316', Appointment:'#06b6d4', Illness:'#22c55e', Family:'#f59e0b', Other:'#6b7280' };
                    const reasonColor = RC[leave.reason] || '#6b7280';

                    return (
                        <div key={leave.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-all group"
                            style={{ borderColor: dur.level === 'danger' ? '#fecaca' : dur.level === 'warn' ? '#fde68a' : '#e5e7eb',
                                borderLeftWidth: 4, borderLeftColor: dur.color }}>
                            <div className="p-4">
                                {/* Header: Student + Duration */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow" style={{ background: `linear-gradient(135deg,${reasonColor},${reasonColor}dd)` }}>
                                            {st?.first_name?.[0]}{st?.last_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{st?.first_name} {st?.last_name}</p>
                                            <p className="text-[10px] text-gray-400">{st?.admission_number} · {fn(st?.form_id)} {sn(st?.stream_id)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="px-2 py-1 rounded-lg text-xs font-black" style={{ background: `${dur.color}15`, color: dur.color }}>
                                            <FiClock size={10} className="inline mr-1" />{dur.text}
                                        </div>
                                        {dur.level === 'danger' && (
                                            <p className="text-[9px] text-red-500 font-bold mt-0.5 animate-pulse flex items-center gap-0.5 justify-end">
                                                <FiAlertTriangle size={8} /> OVERDUE
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Info Row */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${reasonColor}12`, color: reasonColor }}>{leave.reason}</span>
                                    {leave.leave_days > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">{leave.leave_days} days</span>}
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                                        Left {new Date(leave.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {leave.sms_sent && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600">📱 SMS ✓</span>}
                                </div>

                                {leave.reason_details && <p className="text-[10px] text-gray-500 mb-2 italic line-clamp-1">{leave.reason_details}</p>}

                                {leave.expected_return && (
                                    <p className="text-[10px] text-gray-400 mb-2">
                                        Expected back: <span className="font-bold text-gray-600">{new Date(leave.expected_return).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </p>
                                )}

                                <p className="text-[10px] text-gray-400">Auth: <span className="font-semibold text-gray-600">{leave.teacher_name}</span></p>

                                {/* Actions */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <button onClick={() => handleMarkReturned(leave.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-md"
                                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff' }}>
                                        <FiCheckCircle size={12} /> Mark Returned
                                    </button>
                                    {!leave.sms_sent && st?.guardian_phone && (
                                        <button onClick={() => handleSendSMS(leave)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition">
                                            <FiMessageSquare size={12} /> SMS
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
