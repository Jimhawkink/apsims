'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSave, FiDownload, FiCalendar, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export default function AttendancePage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);

    // { [studentId]: status }
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceStatus>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [f, st, s] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setStudents(s.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Filter students by form + stream
    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''));

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
            setAttendance(map);
            setSavedAttendance(map);
        };
        loadAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selDate, students]);

    const setStatus = (studentId: number, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [String(studentId)]: status }));
    };

    // Mark all as Present
    const markAllPresent = () => {
        const map: Record<string, AttendanceStatus> = {};
        classStudents.forEach(s => { map[String(s.id)] = 'Present'; });
        setAttendance(map);
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
                ({ error } = await supabase.from('school_daily_attendance').update({ status }).eq('id', existing.id));
            } else {
                ({ error } = await supabase.from('school_daily_attendance').insert([payload]));
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
    const totalMarked = presentCount + absentCount + lateCount + excusedCount;

    // Export CSV
    const exportCSV = () => {
        if (classStudents.length === 0) return;
        const headers = ['#', 'Adm No', 'Student Name', 'Status'];
        const rows = classStudents.map((s, i) => [
            i + 1,
            s.admission_no || s.admission_number || '',
            `${s.first_name} ${s.last_name}`,
            attendance[String(s.id)] || 'Not Marked',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `attendance_${selDate}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const statusColors: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
        Present: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
        Absent: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
        Late: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
        Excused: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading Attendance...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📋 Attendance</h1>
                    <p className="text-sm text-gray-500 mt-1">Mark daily student attendance by class</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2" style={{ borderRadius: 6 }}>
                        <FiDownload size={14} /> Export
                    </button>
                    <button onClick={handleSaveAll} disabled={saving || classStudents.length === 0}
                        className="px-6 py-2 text-sm font-bold text-white transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg"
                        style={{ borderRadius: 6, background: saving ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={14} /> Save Attendance</>}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 p-4" style={{ borderRadius: 8 }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Form / Class</label>
                        <select value={selForm} onChange={e => setSelForm(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 text-sm font-medium bg-white focus:border-blue-400 outline-none transition-all" style={{ borderRadius: 6 }}>
                            <option value="">— Select Form —</option>
                            {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Stream</label>
                        <select value={selStream} onChange={e => setSelStream(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 text-sm font-medium bg-white focus:border-blue-400 outline-none transition-all" style={{ borderRadius: 6 }}>
                            <option value="">All Streams</option>
                            {streams.map(s => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Date</label>
                        <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 text-sm font-medium bg-white focus:border-blue-400 outline-none transition-all" style={{ borderRadius: 6 }} />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {selForm && classStudents.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-white border border-gray-200 p-4 text-center" style={{ borderRadius: 8 }}>
                        <p className="text-2xl font-bold text-gray-800">{classStudents.length}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Total Students</p>
                    </div>
                    <div className="p-4 text-center" style={{ borderRadius: 8, background: '#dcfce7', border: '1px solid #86efac' }}>
                        <p className="text-2xl font-bold text-green-800">{presentCount}</p>
                        <p className="text-xs text-green-700 font-medium mt-1 flex items-center justify-center gap-1"><FiCheckCircle size={12} /> Present</p>
                    </div>
                    <div className="p-4 text-center" style={{ borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5' }}>
                        <p className="text-2xl font-bold text-red-800">{absentCount}</p>
                        <p className="text-xs text-red-700 font-medium mt-1 flex items-center justify-center gap-1"><FiXCircle size={12} /> Absent</p>
                    </div>
                    <div className="p-4 text-center" style={{ borderRadius: 8, background: '#fef9c3', border: '1px solid #fde047' }}>
                        <p className="text-2xl font-bold text-yellow-800">{lateCount}</p>
                        <p className="text-xs text-yellow-700 font-medium mt-1 flex items-center justify-center gap-1"><FiClock size={12} /> Late</p>
                    </div>
                    <div className="p-4 text-center" style={{ borderRadius: 8, background: '#eff6ff', border: '1px solid #93c5fd' }}>
                        <p className="text-2xl font-bold text-blue-800">{excusedCount}</p>
                        <p className="text-xs text-blue-700 font-medium mt-1">Excused</p>
                    </div>
                </div>
            )}

            {/* Attendance Table */}
            {!selForm ? (
                <div className="bg-white border border-gray-200 p-16 text-center" style={{ borderRadius: 8 }}>
                    <span className="text-4xl mb-3 block">📋</span>
                    <p className="text-gray-500 font-medium">Select a Form to mark attendance</p>
                </div>
            ) : classStudents.length === 0 ? (
                <div className="bg-white border border-gray-200 p-16 text-center" style={{ borderRadius: 8 }}>
                    <span className="text-4xl mb-3 block">👨‍🎓</span>
                    <p className="text-gray-500 font-medium">No students found in this class</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 overflow-hidden" style={{ borderRadius: 8 }}>
                    {/* Quick Action */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            <span className="font-bold">{totalMarked}</span> of <span className="font-bold">{classStudents.length}</span> marked
                            {totalMarked === classStudents.length && <span className="ml-2 text-green-600 font-bold">✅ All marked!</span>}
                        </p>
                        <button onClick={markAllPresent}
                            className="px-4 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-all flex items-center gap-1"
                            style={{ borderRadius: 6 }}>
                            <FiCheckCircle size={12} /> Mark All Present
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-12">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Adm No</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Student Name</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStudents.map((student, i) => {
                                    const status = attendance[String(student.id)];
                                    const isSaved = savedAttendance[String(student.id)] === status;
                                    return (
                                        <tr key={student.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!isSaved && status ? 'bg-amber-50/40' : ''}`}>
                                            <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">{student.admission_no || student.admission_number || '-'}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-800">{student.first_name} {student.last_name}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map(s => {
                                                        const active = status === s;
                                                        const colors = statusColors[s];
                                                        return (
                                                            <button key={s} onClick={() => setStatus(student.id, s)}
                                                                className="px-3 py-1.5 text-xs font-bold transition-all"
                                                                style={{
                                                                    borderRadius: 4,
                                                                    background: active ? colors.bg : 'transparent',
                                                                    color: active ? colors.text : '#9ca3af',
                                                                    border: active ? `2px solid ${colors.border}` : '2px solid transparent',
                                                                    transform: active ? 'scale(1.05)' : 'scale(1)',
                                                                }}>
                                                                {s === 'Present' ? '✅' : s === 'Absent' ? '❌' : s === 'Late' ? '⏰' : '📝'} {s}
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
                </div>
            )}
        </div>
    );
}
