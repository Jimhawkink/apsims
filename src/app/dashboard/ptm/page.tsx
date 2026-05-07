'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiCalendar, FiUsers, FiPlus, FiX, FiSend, FiRefreshCw,
    FiMapPin, FiClock, FiTrash2, FiEye, FiAlertCircle, FiBell
} from 'react-icons/fi';

interface PTMSession {
    id: number;
    title: string;
    session_date: string;
    venue: string;
    target_form_id: number | null;
    form_name: string | null;
    total_slots: number;
    booked_slots: number;
    created_at: string;
}

interface PTMSlot {
    id: number;
    session_id: number;
    start_time: string;
    end_time: string;
    teacher_id: number | null;
    teacher_name: string | null;
    is_booked: boolean;
    booking: {
        guardian_name: string;
        guardian_phone: string;
        status: string;
    } | null;
}

interface CreateSessionModalProps {
    forms: any[];
    teachers: any[];
    onSave: (data: any) => void;
    onClose: () => void;
}

function CreateSessionModal({ forms, teachers, onSave, onClose }: CreateSessionModalProps) {
    const [form, setForm] = useState({
        title: '',
        session_date: '',
        venue: '',
        target_form_id: '',
    });
    const [slots, setSlots] = useState([
        { start_time: '09:00', end_time: '09:30', teacher_id: '' },
    ]);
    const [saving, setSaving] = useState(false);

    const addSlot = () => {
        setSlots(prev => [...prev, { start_time: '', end_time: '', teacher_id: '' }]);
    };

    const removeSlot = (index: number) => {
        setSlots(prev => prev.filter((_, i) => i !== index));
    };

    const updateSlot = (index: number, field: string, value: string) => {
        setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.session_date || !form.venue.trim()) {
            toast.error('Title, date, and venue are required');
            return;
        }
        if (slots.some(s => !s.start_time || !s.end_time)) {
            toast.error('All slots must have start and end times');
            return;
        }
        setSaving(true);
        await onSave({
            ...form,
            target_form_id: form.target_form_id ? Number(form.target_form_id) : null,
            slots: slots.map(s => ({
                start_time: s.start_time,
                end_time: s.end_time,
                teacher_id: s.teacher_id ? Number(s.teacher_id) : null,
            })),
        });
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10"
                    style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <FiPlus size={14} /> Create PTM Session
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <FiX size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    {/* Session Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Session Title *</label>
                            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none"
                                placeholder="e.g. Form 3 Parent-Teacher Meeting - Term 2" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Date *</label>
                            <input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Venue *</label>
                            <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none"
                                placeholder="e.g. School Hall, Library" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Target Form</label>
                            <select value={form.target_form_id} onChange={e => setForm(f => ({ ...f, target_form_id: e.target.value }))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Slots Builder */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Time Slots</label>
                            <button onClick={addSlot}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1">
                                <FiPlus size={11} /> Add Slot
                            </button>
                        </div>
                        <div className="space-y-2">
                            {slots.map((slot, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                                    <div className="col-span-3">
                                        <input type="time" value={slot.start_time}
                                            onChange={e => updateSlot(i, 'start_time', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-medium bg-white focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="col-span-1 text-center text-xs text-gray-400">to</div>
                                    <div className="col-span-3">
                                        <input type="time" value={slot.end_time}
                                            onChange={e => updateSlot(i, 'end_time', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-medium bg-white focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="col-span-4">
                                        <select value={slot.teacher_id}
                                            onChange={e => updateSlot(i, 'teacher_id', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-medium bg-white focus:border-blue-400 outline-none">
                                            <option value="">Any Teacher</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {slots.length > 1 && (
                                            <button onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-600 transition-colors">
                                                <FiTrash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
                        Create Session
                    </button>
                </div>
            </div>
        </div>
    );
}

interface BookingSummaryDrawerProps {
    session: PTMSession;
    slots: PTMSlot[];
    onClose: () => void;
    onSendReminders: (sessionId: number) => void;
    sendingReminders: boolean;
}

function BookingSummaryDrawer({ session, slots, onClose, onSendReminders, sendingReminders }: BookingSummaryDrawerProps) {
    // Group slots by teacher
    const byTeacher = slots.reduce((acc: Record<string, PTMSlot[]>, slot) => {
        const key = slot.teacher_name || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-end z-50">
            <div className="bg-white w-full sm:w-[480px] h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl sm:rounded-l-2xl">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10"
                    style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                    <div>
                        <h3 className="font-bold text-white text-sm">{session.title}</h3>
                        <p className="text-blue-200 text-xs mt-0.5">{session.session_date} · {session.venue}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <FiX size={18} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-blue-700">{session.total_slots}</p>
                            <p className="text-xs text-blue-500">Total Slots</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-green-700">{session.booked_slots}</p>
                            <p className="text-xs text-green-500">Booked</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-gray-700">{session.total_slots - session.booked_slots}</p>
                            <p className="text-xs text-gray-500">Available</p>
                        </div>
                    </div>

                    {/* Send Reminders */}
                    <button onClick={() => onSendReminders(session.id)} disabled={sendingReminders}
                        className="w-full py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                        {sendingReminders
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                            : <><FiBell size={14} /> Send Reminders</>}
                    </button>

                    {/* Slots by Teacher */}
                    {Object.entries(byTeacher).map(([teacherName, teacherSlots]) => (
                        <div key={teacherName} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <span className="font-semibold text-gray-700 text-sm">{teacherName}</span>
                                <span className="text-xs text-gray-500">
                                    {teacherSlots.filter(s => s.is_booked).length}/{teacherSlots.length} booked
                                </span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {teacherSlots.map(slot => (
                                    <div key={slot.id} className="px-4 py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FiClock size={12} className="text-gray-400" />
                                            <span className="text-xs font-medium text-gray-700">
                                                {slot.start_time} – {slot.end_time}
                                            </span>
                                        </div>
                                        {slot.is_booked && slot.booking ? (
                                            <div className="text-right">
                                                <p className="text-xs font-semibold text-gray-700">{slot.booking.guardian_name}</p>
                                                <p className="text-xs text-gray-400">{slot.booking.guardian_phone}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Available</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function PTMPage() {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<PTMSession[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<PTMSession | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<PTMSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessionsRes, formsRes, teachersRes] = await Promise.all([
                fetch('/api/ptm/sessions'),
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_teachers').select('id, first_name, last_name').eq('status', 'Active').order('first_name'),
            ]);

            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                setSessions(data.data || []);
            }
            setForms(formsRes.data || []);
            setTeachers(teachersRes.data || []);
        } catch (e) {
            console.error('Failed to load PTM data:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateSession = async (data: any) => {
        try {
            const res = await fetch('/api/ptm/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                toast.error(result.error || 'Failed to create session');
            } else {
                toast.success('PTM session created successfully ✅');
                setShowCreateModal(false);
                fetchData();
            }
        } catch (e) {
            toast.error('Failed to create session');
        }
    };

    const handleViewSession = async (session: PTMSession) => {
        setSelectedSession(session);
        setLoadingSlots(true);
        try {
            const res = await fetch(`/api/ptm/sessions/${session.id}/slots`);
            if (res.ok) {
                const data = await res.json();
                setSelectedSlots(data.data || []);
            }
        } catch (e) {
            console.error('Failed to load slots:', e);
        }
        setLoadingSlots(false);
    };

    const handleSendReminders = async (sessionId: number) => {
        setSendingReminders(true);
        try {
            const res = await fetch(`/api/ptm/sessions/${sessionId}/reminders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to send reminders');
            } else {
                toast.success(`${data.message} ✅`);
            }
        } catch (e) {
            toast.error('Failed to send reminders');
        }
        setSendingReminders(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading PTM Scheduler...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FiCalendar size={24} /> PTM Scheduler
                        </h1>
                        <p className="text-blue-200 text-sm mt-1">
                            Schedule parent-teacher meetings and manage slot bookings
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchData}
                            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl flex items-center gap-2 transition-all">
                            <FiRefreshCw size={14} /> Refresh
                        </button>
                        <button onClick={() => setShowCreateModal(true)}
                            className="px-5 py-2.5 bg-white text-blue-700 font-bold rounded-xl flex items-center gap-2 transition-all hover:bg-blue-50 shadow-lg">
                            <FiPlus size={14} /> New Session
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                    <p className="text-xs font-semibold opacity-80">TOTAL SESSIONS</p>
                    <p className="text-xl font-extrabold mt-1">{sessions.length}</p>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    <p className="text-xs font-semibold opacity-80">TOTAL SLOTS</p>
                    <p className="text-xl font-extrabold mt-1">{sessions.reduce((a, s) => a + s.total_slots, 0)}</p>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <p className="text-xs font-semibold opacity-80">BOOKED SLOTS</p>
                    <p className="text-xl font-extrabold mt-1">{sessions.reduce((a, s) => a + s.booked_slots, 0)}</p>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <p className="text-xs font-semibold opacity-80">AVAILABLE</p>
                    <p className="text-xl font-extrabold mt-1">{sessions.reduce((a, s) => a + (s.total_slots - s.booked_slots), 0)}</p>
                </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <FiCalendar className="text-blue-500" /> PTM Sessions
                    </h3>
                </div>
                {sessions.length === 0 ? (
                    <div className="p-16 text-center text-gray-400">
                        <FiCalendar className="mx-auto mb-3" size={32} />
                        <p className="font-medium">No PTM sessions yet</p>
                        <p className="text-xs mt-1">Click &quot;New Session&quot; to schedule a parent-teacher meeting</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Venue</th>
                                    <th>Form</th>
                                    <th>Slots</th>
                                    <th>Booked</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session, i) => (
                                    <tr key={session.id}>
                                        <td className="text-xs text-gray-400">{i + 1}</td>
                                        <td className="font-semibold text-gray-800">{session.title}</td>
                                        <td>
                                            <span className="flex items-center gap-1 text-sm">
                                                <FiCalendar size={12} className="text-blue-400" />
                                                {new Date(session.session_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="flex items-center gap-1 text-sm text-gray-600">
                                                <FiMapPin size={12} className="text-gray-400" />
                                                {session.venue}
                                            </span>
                                        </td>
                                        <td>
                                            {session.form_name
                                                ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{session.form_name}</span>
                                                : <span className="text-xs text-gray-400">All Forms</span>}
                                        </td>
                                        <td className="font-bold text-gray-700">{session.total_slots}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                                                    <div
                                                        className="bg-blue-500 h-1.5 rounded-full"
                                                        style={{ width: session.total_slots > 0 ? `${(session.booked_slots / session.total_slots) * 100}%` : '0%' }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600">
                                                    {session.booked_slots}/{session.total_slots}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <button onClick={() => handleViewSession(session)}
                                                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1">
                                                <FiEye size={11} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Session Modal */}
            {showCreateModal && (
                <CreateSessionModal
                    forms={forms}
                    teachers={teachers}
                    onSave={handleCreateSession}
                    onClose={() => setShowCreateModal(false)}
                />
            )}

            {/* Booking Summary Drawer */}
            {selectedSession && (
                loadingSlots ? (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Loading slots...</p>
                        </div>
                    </div>
                ) : (
                    <BookingSummaryDrawer
                        session={selectedSession}
                        slots={selectedSlots}
                        onClose={() => { setSelectedSession(null); setSelectedSlots([]); }}
                        onSendReminders={handleSendReminders}
                        sendingReminders={sendingReminders}
                    />
                )
            )}
        </div>
    );
}
