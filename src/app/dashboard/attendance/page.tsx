'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSave, FiDownload, FiCalendar, FiCheckCircle, FiXCircle, FiClock,
    FiUsers, FiActivity, FiFilter, FiZap, FiBarChart2, FiChevronLeft, FiChevronRight,
    FiArrowLeft, FiAlertTriangle
} from 'react-icons/fi';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export default function AttendancePage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [leaveOuts, setLeaveOuts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');

    // { [studentId]: status }
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceStatus>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [f, st, s, lo] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_leave_outs').select('*').eq('status', 'Out'),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setStudents(s.data || []);
        setLeaveOuts(lo.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Filter students by form + stream
    const classStudents = useMemo(() => students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .filter(s => !search || `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''))
    , [students, selForm, selStream, search]);

    // Leave-out map: { studentId -> leaveOut record }
    const leaveOutMap = useMemo(() => {
        const map: Record<string, any> = {};
        leaveOuts.forEach(lo => {
            map[String(lo.student_id)] = lo;
        });
        return map;
    }, [leaveOuts]);

    // Calculate leave days for a student
    const getLeaveDays = (lo: any) => {
        if (!lo?.time_left) return 0;
        const left = new Date(lo.time_left);
        const now = new Date();
        const diffMs = now.getTime() - left.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(1, days);
    };

    // Load attendance when selection changes
    useEffect(() => {
        if (!selForm || !selDate) return;
        const loadAttendance = async () => {
            const studentIds = classStudents.map(s => s.id);
            if (studentIds.length === 0) return;
            const { data } = await supabase.from('school_daily_attendance')
                .select('*')
                .in('student_id', studentIds)
                .eq('attendance_date', selDate);
            const map: Record<string, AttendanceStatus> = {};
            (data || []).forEach((r: any) => { map[String(r.student_id)] = r.status; });
            // Auto-mark students on active leave as Excused
            classStudents.forEach(s => {
                const lo = leaveOutMap[String(s.id)];
                if (lo && !map[String(s.id)]) {
                    map[String(s.id)] = 'Excused';
                }
            });
            setAttendance(map);
            setSavedAttendance(map);
        };
        loadAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selDate, students, leaveOuts]);

    const setStatus = (studentId: number, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [String(studentId)]: status }));
    };

    // Bulk marking functions
    const markAllPresent = () => {
        const map: Record<string, AttendanceStatus> = {};
        classStudents.forEach(s => { map[String(s.id)] = 'Present'; });
        setAttendance(map);
    };

    const markAllAbsent = () => {
        const map: Record<string, AttendanceStatus> = {};
        classStudents.forEach(s => { map[String(s.id)] = 'Absent'; });
        setAttendance(map);
    };

    const markUnmarkedPresent = () => {
        const map = { ...attendance };
        classStudents.forEach(s => { if (!map[String(s.id)]) map[String(s.id)] = 'Present'; });
        setAttendance(map);
    };

    const markUnmarkedAbsent = () => {
        const map = { ...attendance };
        classStudents.forEach(s => { if (!map[String(s.id)]) map[String(s.id)] = 'Absent'; });
        setAttendance(map);
    };

    const clearAll = () => {
        setAttendance({});
    };

    // Save all attendance
    const handleSaveAll = async () => {
        if (classStudents.length === 0) return;
        setSaving(true);
        let saved = 0;
        for (const student of classStudents) {
            const status = attendance[String(student.id)] || 'Present';
            const payload = {
                student_id: student.id,
                attendance_date: selDate,
                status,
                term_id: null,
                recorded_by: null,
            };
            // Upsert
            const { data: existing } = await supabase.from('school_daily_attendance')
                .select('id')
                .eq('student_id', student.id)
                .eq('attendance_date', selDate)
                .maybeSingle();

            let error;
            if (existing) {
                ({ error } = await (supabase.from('school_daily_attendance') as any).update({ status }).eq('id', (existing as any).id));
            } else {
                ({ error } = await (supabase.from('school_daily_attendance') as any).insert([payload]));
            }
            if (!error) saved++;
        }
        setSavedAttendance({ ...attendance });
        setSaving(false);
        toast.success(`${saved} records saved ✅`);
    };

    // Stats
    const presentCount = classStudents.filter(s => attendance[String(s.id)] === 'Present').length;
    const absentCount = classStudents.filter(s => attendance[String(s.id)] === 'Absent').length;
    const lateCount = classStudents.filter(s => attendance[String(s.id)] === 'Late').length;
    const excusedCount = classStudents.filter(s => attendance[String(s.id)] === 'Excused').length;
    const onLeaveCount = classStudents.filter(s => !!leaveOutMap[String(s.id)]).length;
    const totalMarked = presentCount + absentCount + lateCount + excusedCount;
    const attendanceRate = classStudents.length > 0 ? Math.round(((presentCount + lateCount) / classStudents.length) * 100) : 0;

    // Export CSV
    const exportCSV = () => {
        if (classStudents.length === 0) return;
        const headers = ['#', 'Adm No', 'Student Name', 'Status', 'Leave Out', 'Leave Days', 'Leave Reason'];
        const rows = classStudents.map((s, i) => {
            const lo = leaveOutMap[String(s.id)];
            return [
                i + 1,
                s.admission_no || s.admission_number || '',
                `${s.first_name} ${s.last_name}`,
                attendance[String(s.id)] || 'Not Marked',
                lo ? 'On Leave' : '',
                lo ? getLeaveDays(lo) : '',
                lo ? lo.reason : '',
            ];
        });
        const csv = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `attendance_${selDate}.csv`; a.click();
        toast.success('Exported ✅');
    };

    // Navigate dates
    const shiftDate = (days: number) => {
        const d = new Date(selDate);
        d.setDate(d.getDate() + days);
        setSelDate(d.toISOString().split('T')[0]);
    };

    const isToday = selDate === new Date().toISOString().split('T')[0];
    const dayName = new Date(selDate).toLocaleDateString('en-US', { weekday: 'long' });
    const dateDisplay = new Date(selDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formName = forms.find(f => String(f.id) === selForm)?.form_name || '';
    const streamName = streams.find(s => String(s.id) === selStream)?.stream_name || '';

    const statusConfig: Record<AttendanceStatus, { icon: any; color: string; bg: string; activeBg: string; label: string }> = {
        Present: { icon: FiCheckCircle, color: '#059669', bg: '#ecfdf5', activeBg: '#d1fae5', label: 'P' },
        Absent: { icon: FiXCircle, color: '#dc2626', bg: '#fef2f2', activeBg: '#fee2e2', label: 'A' },
        Late: { icon: FiClock, color: '#d97706', bg: '#fffbeb', activeBg: '#fef3c7', label: 'L' },
        Excused: { icon: FiCalendar, color: '#4f46e5', bg: '#eef2ff', activeBg: '#e0e7ff', label: 'E' },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                        <FiUsers className="absolute inset-0 m-auto text-indigo-500" size={20} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading Attendance System...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ─── Ultra Premium Header ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #4f46e5 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            <FiCheckCircle className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                Ultra Attendance System
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-sm">ULTRA</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {formName ? `${formName}${streamName ? ` — ${streamName}` : ''} • ` : ''}
                                {dayName}, {dateDisplay}
                                {isToday && <span className="ml-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Today</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={exportCSV} disabled={classStudents.length === 0} className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-1.5 disabled:opacity-40">
                            <FiDownload size={13} /> Export
                        </button>
                        <button onClick={handleSaveAll} disabled={saving || classStudents.length === 0}
                            className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: !saving ? '0 4px 14px rgba(79,70,229,0.4)' : 'none' }}>
                            {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={13} /> Save Attendance</>}
                        </button>
                    </div>
                </div>

                {/* ─── Date Navigator + Filters ─── */}
                <div className="border-t border-gray-100 px-5 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Form / Class</label>
                            <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all">
                                <option value="">— Select Form —</option>
                                {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Stream</label>
                            <select value={selStream} onChange={e => setSelStream(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all">
                                <option value="">All Streams</option>
                                {streams.filter(s => !selForm || String(s.form_id) === selForm).map(s => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Date</label>
                            <div className="flex items-center gap-1">
                                <button onClick={() => shiftDate(-1)} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><FiChevronLeft size={14} /></button>
                                <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all" />
                                <button onClick={() => shiftDate(1)} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><FiChevronRight size={14} /></button>
                                {!isToday && <button onClick={() => setSelDate(new Date().toISOString().split('T')[0])} className="px-2.5 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">Today</button>}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Search</label>
                            <div className="relative">
                                <FiFilter size={12} className="absolute left-3 top-3 text-gray-400" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── KPI Command Strip ─── */}
            {selForm && classStudents.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-7 gap-3">
                        {[
                            { label: 'Total', value: classStudents.length, color: '#374151', bg: '#f9fafb', icon: FiUsers },
                            { label: 'Present', value: presentCount, color: '#059669', bg: '#ecfdf5', icon: FiCheckCircle },
                            { label: 'Absent', value: absentCount, color: '#dc2626', bg: '#fef2f2', icon: FiXCircle, alert: absentCount > 0 },
                            { label: 'Late', value: lateCount, color: '#d97706', bg: '#fffbeb', icon: FiClock },
                            { label: 'Excused', value: excusedCount, color: '#4f46e5', bg: '#eef2ff', icon: FiCalendar },
                            { label: 'On Leave', value: onLeaveCount, color: '#ea580c', bg: '#fff7ed', icon: FiArrowLeft, alert: onLeaveCount > 0 },
                            { label: 'Rate', value: `${attendanceRate}%`, color: attendanceRate >= 80 ? '#059669' : '#dc2626', bg: attendanceRate >= 80 ? '#ecfdf5' : '#fef2f2', icon: FiBarChart2 },
                        ].map((kpi, i) => (
                            <div key={i} className="relative rounded-xl p-3 text-center transition-all hover:shadow-sm" style={{ backgroundColor: kpi.bg }}>
                                {kpi.alert && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-white" />}
                                <kpi.icon size={14} className="mx-auto mb-1" style={{ color: kpi.color }} />
                                <p className="text-xl font-extrabold" style={{ color: kpi.color }}>{kpi.value}</p>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                            </div>
                        ))}
                    </div>
                    {/* Attendance progress bar */}
                    <div className="px-4 pb-3 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            {presentCount > 0 && <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(presentCount / classStudents.length) * 100}%` }} />}
                            {lateCount > 0 && <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(lateCount / classStudents.length) * 100}%` }} />}
                            {excusedCount > 0 && <div className="h-full bg-indigo-400 transition-all duration-500" style={{ width: `${(excusedCount / classStudents.length) * 100}%` }} />}
                            {onLeaveCount > 0 && <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${(onLeaveCount / classStudents.length) * 100}%` }} />}
                            {absentCount > 0 && <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${(absentCount / classStudents.length) * 100}%` }} />}
                        </div>
                        <span className="text-xs font-bold text-gray-500 min-w-[70px] text-right">{totalMarked}/{classStudents.length}</span>
                    </div>
                </div>
            )}

            {/* ─── Attendance Table ─── */}
            {!selForm ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <FiCheckCircle size={28} className="text-indigo-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Select a Form to mark attendance</p>
                    <p className="text-xs text-gray-400 mt-1">Choose a class from the filter above to get started</p>
                </div>
            ) : classStudents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                        <FiUsers size={28} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">No students found in this class</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different form or stream</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Ultra Quick Action Bar */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-600">{totalMarked} of {classStudents.length} marked</span>
                                {totalMarked === classStudents.length && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><FiCheckCircle size={10} /> Complete</span>}
                                {totalMarked > 0 && totalMarked < classStudents.length && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{classStudents.length - totalMarked} remaining</span>}
                            </div>
                            <button onClick={handleSaveAll} disabled={saving || classStudents.length === 0}
                                className="px-3 py-1.5 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50"
                                style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                                {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={11} /> Save</>}
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={markAllPresent}
                                className="px-3 py-1.5 text-xs font-bold text-white rounded-lg flex items-center gap-1 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(5,150,105,0.25)' }}>
                                <FiZap size={11} /> All Present
                            </button>
                            <button onClick={markAllAbsent}
                                className="px-3 py-1.5 text-xs font-bold text-white rounded-lg flex items-center gap-1 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 2px 8px rgba(220,38,38,0.25)' }}>
                                <FiXCircle size={11} /> All Absent
                            </button>
                            <div className="w-px h-5 bg-gray-300 mx-0.5" />
                            <button onClick={markUnmarkedPresent} disabled={totalMarked === classStudents.length}
                                className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 rounded-lg flex items-center gap-1 hover:bg-green-100 transition-all disabled:opacity-40">
                                <FiCheckCircle size={11} /> Unmarked → Present
                            </button>
                            <button onClick={markUnmarkedAbsent} disabled={totalMarked === classStudents.length}
                                className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 rounded-lg flex items-center gap-1 hover:bg-red-100 transition-all disabled:opacity-40">
                                <FiXCircle size={11} /> Unmarked → Absent
                            </button>
                            <div className="w-px h-5 bg-gray-300 mx-0.5" />
                            <button onClick={clearAll} disabled={totalMarked === 0}
                                className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg flex items-center gap-1 hover:bg-gray-200 transition-all disabled:opacity-40">
                                <FiFilter size={11} /> Clear All
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 sticky top-0 z-10">
                                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Adm No</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-bold text-orange-500 uppercase tracking-wider">Leave Out</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStudents.map((student, i) => {
                                    const status = attendance[String(student.id)];
                                    const isSaved = savedAttendance[String(student.id)] === status;
                                    const leaveOut = leaveOutMap[String(student.id)];
                                    const leaveDays = leaveOut ? getLeaveDays(leaveOut) : 0;
                                    const isOnLeave = !!leaveOut;
                                    return (
                                        <tr key={student.id} className={`border-b border-gray-100 hover:bg-indigo-50/20 transition-all duration-150 ${isOnLeave ? 'bg-orange-50/40' : !isSaved && status ? 'bg-amber-50/30' : ''}`}>
                                            <td className="px-3 py-2 text-xs text-gray-400 font-medium">{i + 1}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-blue-600">{student.admission_no || student.admission_number || '-'}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-800">{student.first_name} {student.last_name}</span>
                                                    {isOnLeave && <FiAlertTriangle size={12} className="text-orange-500" />}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                {isOnLeave ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                            <FiArrowLeft size={9} /> ON LEAVE
                                                        </span>
                                                        <span className="text-[10px] font-bold text-orange-600">
                                                            {leaveDays} day{leaveDays !== 1 ? 's' : ''} • {leaveOut.reason}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400">
                                                            Left: {new Date(leaveOut.time_left).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {new Date(leaveOut.time_left).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="text-[10px] text-gray-300 font-medium">—</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    {(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map(s => {
                                                        const active = status === s;
                                                        const cfg = statusConfig[s];
                                                        const Icon = cfg.icon;
                                                        const isLeaveExcused = isOnLeave && s === 'Excused';
                                                        return (
                                                            <button key={s} onClick={() => setStatus(student.id, s)}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200"
                                                                style={{
                                                                    background: active ? cfg.activeBg : 'transparent',
                                                                    color: active ? cfg.color : '#9ca3af',
                                                                    border: active ? `2px solid ${cfg.color}30` : '2px solid transparent',
                                                                    transform: active ? 'scale(1.05)' : 'scale(1)',
                                                                    boxShadow: active ? `0 2px 8px ${cfg.color}20` : 'none',
                                                                    animation: isLeaveExcused && active ? 'pulse 2s infinite' : 'none',
                                                                }}>
                                                                <Icon size={11} /> {s}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom summary bar */}
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {Object.entries(statusConfig).map(([key, cfg]) => {
                                const count = key === 'Present' ? presentCount : key === 'Absent' ? absentCount : key === 'Late' ? lateCount : excusedCount;
                                return (
                                    <span key={key} className="flex items-center gap-1 text-xs font-semibold" style={{ color: cfg.color }}>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                                        {key}: {count}
                                    </span>
                                );
                            })}
                            {onLeaveCount > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    On Leave: {onLeaveCount}
                                </span>
                            )}
                        </div>
                        <span className="text-xs font-bold" style={{ color: attendanceRate >= 80 ? '#059669' : '#dc2626' }}>
                            <FiActivity size={12} className="inline mr-1" />
                            {attendanceRate}% attendance rate
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
