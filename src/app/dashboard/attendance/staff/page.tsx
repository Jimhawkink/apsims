'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    FiUserCheck, FiSave, FiDownload, FiCalendar, FiCheckCircle,
    FiXCircle, FiClock, FiSearch, FiRefreshCw, FiFilter,
    FiUsers, FiAlertCircle, FiTrendingUp
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

type StaffAttStatus = 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Half Day';

interface StaffMember {
    id: number;
    first_name: string;
    last_name: string;
    staff_no?: string;
    phone?: string;
    department?: string;
    designation?: string;
    role?: string;
    status: string;
    _type: string;
    _typeLabel: string;
}

const statusColors: Record<StaffAttStatus, { bg: string; text: string; border: string; emoji: string }> = {
    'Present': { bg: '#dcfce7', text: '#166534', border: '#86efac', emoji: '✅' },
    'Absent': { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', emoji: '❌' },
    'Late': { bg: '#fef9c3', text: '#854d0e', border: '#fde047', emoji: '⏰' },
    'On Leave': { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', emoji: '📋' },
    'Half Day': { bg: '#faf5ff', text: '#6b21a8', border: '#d8b4fe', emoji: '🕐' },
};

export default function StaffAttendancePage() {
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [tab, setTab] = useState<'mark' | 'report'>('mark');

    // Attendance state
    const [attendance, setAttendance] = useState<Record<string, { status: StaffAttStatus; time_in?: string; time_out?: string; notes?: string }>>({});
    const [savedAttendance, setSavedAttendance] = useState<Record<string, StaffAttStatus>>({});

    // Report state
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [monthlyData, setMonthlyData] = useState<any[]>([]);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const [teachersRes, supportRes, subRes] = await Promise.all([
                supabase.from('school_teachers').select('id, first_name, last_name, staff_no, phone, department, designation, status').eq('status', 'Active'),
                supabase.from('school_support_teachers').select('id, first_name, last_name, staff_no, phone, status').eq('status', 'Active'),
                supabase.from('school_subordinate_staff').select('id, first_name, last_name, staff_no, phone, role, department, status').eq('status', 'Active'),
            ]);

            const teachers: StaffMember[] = (teachersRes.data || []).map(t => ({ ...t, _type: 'teacher', _typeLabel: 'TSC Teacher' }));
            const support: StaffMember[] = (supportRes.data || []).map(s => ({ ...s, _type: 'support', _typeLabel: 'Support Teacher' }));
            const subordinate: StaffMember[] = (subRes.data || []).map(s => ({ ...s, _type: 'subordinate', _typeLabel: 'Support Staff' }));

            setAllStaff([...teachers, ...support, ...subordinate]);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    // Load existing attendance for selected date
    useEffect(() => {
        if (!selDate || allStaff.length === 0) return;
        const loadAttendance = async () => {
            const { data } = await supabase.from('school_staff_attendance')
                .select('*').eq('attendance_date', selDate);
            const map: Record<string, { status: StaffAttStatus; time_in?: string; time_out?: string; notes?: string }> = {};
            const savedMap: Record<string, StaffAttStatus> = {};
            (data || []).forEach((r: any) => {
                const key = `${r.staff_type}-${r.staff_id}`;
                map[key] = { status: r.status, time_in: r.time_in, time_out: r.time_out, notes: r.notes };
                savedMap[key] = r.status;
            });
            setAttendance(map);
            setSavedAttendance(savedMap);
        };
        loadAttendance();
    }, [selDate, allStaff]);

    // Load monthly report data
    useEffect(() => {
        if (tab !== 'report') return;
        const loadMonthlyReport = async () => {
            const startDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(reportYear, reportMonth, 0).getDate();
            const endDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${lastDay}`;

            const { data } = await supabase.from('school_staff_attendance')
                .select('*')
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate);
            setMonthlyData(data || []);
        };
        loadMonthlyReport();
    }, [tab, reportMonth, reportYear]);

    const filtered = allStaff.filter(s => {
        if (filterType !== 'all' && s._type !== filterType) return false;
        if (search) {
            const q = search.toLowerCase();
            return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
                (s.staff_no || '').toLowerCase().includes(q);
        }
        return true;
    });

    const setStaffStatus = (staff: StaffMember, status: StaffAttStatus) => {
        const key = `${staff._type}-${staff.id}`;
        setAttendance(prev => ({
            ...prev,
            [key]: { ...prev[key], status }
        }));
    };

    const setTimeIn = (staff: StaffMember, time: string) => {
        const key = `${staff._type}-${staff.id}`;
        setAttendance(prev => ({
            ...prev,
            [key]: { ...prev[key], status: prev[key]?.status || 'Present', time_in: time }
        }));
    };

    const setTimeOut = (staff: StaffMember, time: string) => {
        const key = `${staff._type}-${staff.id}`;
        setAttendance(prev => ({
            ...prev,
            [key]: { ...prev[key], status: prev[key]?.status || 'Present', time_out: time }
        }));
    };

    const markAllPresent = () => {
        const map: typeof attendance = {};
        filtered.forEach(s => {
            const key = `${s._type}-${s.id}`;
            map[key] = { status: 'Present', time_in: '08:00' };
        });
        setAttendance(prev => ({ ...prev, ...map }));
    };

    const handleSaveAll = async () => {
        if (filtered.length === 0) return;
        setSaving(true);
        let saved = 0;
        try {
            for (const staff of allStaff) {
                const key = `${staff._type}-${staff.id}`;
                const entry = attendance[key];
                if (!entry) continue;

                const payload = {
                    staff_type: staff._type,
                    staff_id: staff.id,
                    staff_name: `${staff.first_name} ${staff.last_name}`,
                    attendance_date: selDate,
                    status: entry.status,
                    time_in: entry.time_in || null,
                    time_out: entry.time_out || null,
                    notes: entry.notes || null,
                    recorded_by: JSON.parse(localStorage.getItem('school_user') || '{}').full_name || 'Admin',
                };

                const { data: existing } = await supabase.from('school_staff_attendance')
                    .select('id').eq('staff_type', staff._type).eq('staff_id', staff.id).eq('attendance_date', selDate).maybeSingle();

                let error;
                if (existing) {
                    ({ error } = await supabase.from('school_staff_attendance').update(payload).eq('id', existing.id));
                } else {
                    ({ error } = await supabase.from('school_staff_attendance').insert([payload]));
                }
                if (!error) saved++;
            }
            setSavedAttendance(Object.fromEntries(Object.entries(attendance).map(([k, v]) => [k, v.status])));
            toast.success(`${saved} staff attendance records saved ✅`);
        } catch (e) { toast.error('Failed to save'); console.error(e); }
        setSaving(false);
    };

    // Stats
    const presentCount = filtered.filter(s => attendance[`${s._type}-${s.id}`]?.status === 'Present').length;
    const absentCount = filtered.filter(s => attendance[`${s._type}-${s.id}`]?.status === 'Absent').length;
    const lateCount = filtered.filter(s => attendance[`${s._type}-${s.id}`]?.status === 'Late').length;
    const leaveCount = filtered.filter(s => attendance[`${s._type}-${s.id}`]?.status === 'On Leave').length;
    const halfDayCount = filtered.filter(s => attendance[`${s._type}-${s.id}`]?.status === 'Half Day').length;
    const totalMarked = presentCount + absentCount + lateCount + leaveCount + halfDayCount;
    const attendanceRate = filtered.length > 0 ? Math.round(((presentCount + lateCount + halfDayCount) / filtered.length) * 100) : 0;

    // Monthly report stats
    const getMonthlyStaffStats = (staff: StaffMember) => {
        const records = monthlyData.filter(d => d.staff_id === staff.id && d.staff_type === staff._type);
        return {
            present: records.filter(r => r.status === 'Present').length,
            absent: records.filter(r => r.status === 'Absent').length,
            late: records.filter(r => r.status === 'Late').length,
            leave: records.filter(r => r.status === 'On Leave').length,
            total: records.length,
        };
    };

    const exportCSV = () => {
        const headers = ['#', 'Staff No', 'Name', 'Type', 'Status', 'Time In', 'Time Out'];
        const rows = filtered.map((s, i) => {
            const key = `${s._type}-${s.id}`;
            const entry = attendance[key];
            return [i + 1, s.staff_no || '', `${s.first_name} ${s.last_name}`, s._typeLabel, entry?.status || 'Not Marked', entry?.time_in || '', entry?.time_out || ''];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `staff_attendance_${selDate}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const attendanceDoughnut = {
        labels: ['Present', 'Absent', 'Late', 'On Leave', 'Half Day'],
        datasets: [{ data: [presentCount, absentCount, lateCount, leaveCount, halfDayCount], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'], borderWidth: 0 }],
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Staff Attendance...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiUserCheck className="text-amber-500" /> Staff Attendance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Daily clock-in/out tracking for all staff members</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center gap-2"><FiDownload size={14} /> Export</button>
                    <button onClick={handleSaveAll} disabled={saving || totalMarked === 0}
                        className="px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                        style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={14} /> Save Attendance</>}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-md">
                {[
                    { key: 'mark', label: 'Mark Attendance', icon: FiCalendar },
                    { key: 'report', label: 'Monthly Report', icon: FiTrendingUp },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === t.key ? 'bg-white shadow-md text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={14} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {tab === 'mark' && (
                <>
                    {/* Filters */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Date</label>
                                <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-amber-400 outline-none" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Search</label>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" placeholder="Search by name or staff no..." value={search} onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Type</label>
                                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-amber-400 outline-none">
                                    <option value="all">All Staff</option>
                                    <option value="teacher">TSC Teachers</option>
                                    <option value="support">Support Teachers</option>
                                    <option value="subordinate">Support Staff</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-gray-800">{filtered.length}</p><p className="text-xs text-gray-500 mt-1">Total Staff</p></div>
                        <div className="rounded-xl p-4 text-center" style={{ background: '#dcfce7', border: '1px solid #86efac' }}><p className="text-2xl font-bold text-green-800">{presentCount}</p><p className="text-xs text-green-700 mt-1 flex items-center justify-center gap-1"><FiCheckCircle size={11} /> Present</p></div>
                        <div className="rounded-xl p-4 text-center" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}><p className="text-2xl font-bold text-red-800">{absentCount}</p><p className="text-xs text-red-700 mt-1 flex items-center justify-center gap-1"><FiXCircle size={11} /> Absent</p></div>
                        <div className="rounded-xl p-4 text-center" style={{ background: '#fef9c3', border: '1px solid #fde047' }}><p className="text-2xl font-bold text-yellow-800">{lateCount}</p><p className="text-xs text-yellow-700 mt-1 flex items-center justify-center gap-1"><FiClock size={11} /> Late</p></div>
                        <div className="rounded-xl p-4 text-center" style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}><p className="text-2xl font-bold text-blue-800">{leaveCount}</p><p className="text-xs text-blue-700 mt-1">On Leave</p></div>
                        <div className="rounded-xl p-4 text-center" style={{ background: '#faf5ff', border: '1px solid #d8b4fe' }}><p className="text-2xl font-bold text-purple-800">{halfDayCount}</p><p className="text-xs text-purple-700 mt-1">Half Day</p></div>
                        <div className="rounded-xl p-4 text-center text-white" style={{ background: attendanceRate >= 80 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : attendanceRate >= 50 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                            <p className="text-2xl font-bold">{attendanceRate}%</p><p className="text-xs opacity-80 mt-1">Attendance Rate</p>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-600"><strong>{totalMarked}</strong> of <strong>{filtered.length}</strong> marked
                                {totalMarked === filtered.length && <span className="ml-2 text-green-600 font-bold">✅ All marked!</span>}
                            </p>
                            <button onClick={markAllPresent} className="px-4 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg flex items-center gap-1">
                                <FiCheckCircle size={12} /> Mark All Present
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-10">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Staff</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Time In</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Time Out</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-16 text-gray-400">No staff found</td></tr>
                                    ) : filtered.map((staff, i) => {
                                        const key = `${staff._type}-${staff.id}`;
                                        const entry = attendance[key];
                                        const isSaved = savedAttendance[key] === entry?.status;
                                        return (
                                            <tr key={key} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${entry && !isSaved ? 'bg-amber-50/40' : ''}`}>
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: staff._type === 'teacher' ? '#3b82f6' : staff._type === 'support' ? '#8b5cf6' : '#f59e0b' }}>
                                                            {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800">{staff.first_name} {staff.last_name}</p>
                                                            <p className="text-xs text-gray-400">{staff.staff_no || staff.department || staff.role || ''}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5"><span className={`badge ${staff._type === 'teacher' ? 'badge-blue' : staff._type === 'support' ? 'badge-purple' : 'badge-warning'}`}>{staff._typeLabel}</span></td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input type="time" value={entry?.time_in || ''} onChange={e => setTimeIn(staff, e.target.value)}
                                                        className="px-2 py-1 border border-gray-200 rounded text-xs text-center focus:border-amber-400 outline-none w-24" />
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input type="time" value={entry?.time_out || ''} onChange={e => setTimeOut(staff, e.target.value)}
                                                        className="px-2 py-1 border border-gray-200 rounded text-xs text-center focus:border-amber-400 outline-none w-24" />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                                        {(Object.keys(statusColors) as StaffAttStatus[]).map(s => {
                                                            const active = entry?.status === s;
                                                            const colors = statusColors[s];
                                                            return (
                                                                <button key={s} onClick={() => setStaffStatus(staff, s)}
                                                                    className="px-2 py-1 text-[11px] font-bold transition-all rounded"
                                                                    style={{
                                                                        background: active ? colors.bg : 'transparent',
                                                                        color: active ? colors.text : '#9ca3af',
                                                                        border: active ? `2px solid ${colors.border}` : '2px solid transparent',
                                                                        transform: active ? 'scale(1.05)' : 'scale(1)',
                                                                    }}>
                                                                    {colors.emoji} {s}
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
                </>
            )}

            {tab === 'report' && (
                <>
                    {/* Report Filters */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Month</label>
                                <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}
                                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-amber-400 outline-none">
                                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Year</label>
                                <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))}
                                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-amber-400 outline-none">
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <p className="text-sm text-gray-500"><strong>{monthlyData.length}</strong> records found for selected period</p>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="chart-container">
                            <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2"><FiUserCheck className="text-amber-500" /> Monthly Attendance Summary</h3>
                            <div style={{ height: 260 }}>
                                {totalMarked > 0 ? (
                                    <Doughnut data={attendanceDoughnut} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' as const, labels: { padding: 12, usePointStyle: true } } } }} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data for this period</div>
                                )}
                            </div>
                        </div>

                        {/* Chronic Absentees */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                                <FiAlertCircle className="text-red-500" size={16} />
                                <h3 className="font-bold text-gray-700 text-sm">Staff with Most Absences</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-modern">
                                    <thead><tr><th>#</th><th>Staff Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th></tr></thead>
                                    <tbody>
                                        {allStaff
                                            .map(s => ({ ...s, stats: getMonthlyStaffStats(s) }))
                                            .filter(s => s.stats.total > 0)
                                            .sort((a, b) => b.stats.absent - a.stats.absent)
                                            .slice(0, 10)
                                            .map((s, i) => (
                                                <tr key={`${s._type}-${s.id}`}>
                                                    <td className="text-xs text-gray-400">{i + 1}</td>
                                                    <td className="font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                                    <td className="text-green-600 font-bold">{s.stats.present}</td>
                                                    <td className="text-red-600 font-bold">{s.stats.absent}</td>
                                                    <td className="text-yellow-600 font-bold">{s.stats.late}</td>
                                                    <td className="text-blue-600 font-bold">{s.stats.leave}</td>
                                                </tr>
                                            ))}
                                        {allStaff.filter(s => getMonthlyStaffStats(s).total > 0).length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No records for this period</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
