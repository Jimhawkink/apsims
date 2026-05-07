'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    FiCalendar, FiClock, FiMapPin, FiUser, FiPhone,
    FiCheckCircle, FiX, FiAlertCircle
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
}

interface PTMSlot {
    id: number;
    start_time: string;
    end_time: string;
    teacher_name: string | null;
    is_booked: boolean;
    booking: {
        guardian_name: string;
        status: string;
    } | null;
}

interface BookSlotModalProps {
    slot: PTMSlot;
    session: PTMSession;
    onBook: (slotId: number, guardianName: string, guardianPhone: string) => void;
    onClose: () => void;
    booking: boolean;
}

function BookSlotModal({ slot, session, onBook, onClose, booking }: BookSlotModalProps) {
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');

    const handleSubmit = () => {
        if (!guardianName.trim()) { toast.error('Guardian name is required'); return; }
        if (!guardianPhone.trim()) { toast.error('Guardian phone is required'); return; }
        onBook(slot.id, guardianName.trim(), guardianPhone.trim());
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <FiCalendar size={14} /> Book PTM Slot
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <FiX size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Slot Info */}
                    <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-bold text-blue-800">{session.title}</p>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                            <FiCalendar size={12} />
                            <span>{new Date(session.session_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                            <FiClock size={12} />
                            <span>{slot.start_time} – {slot.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                            <FiMapPin size={12} />
                            <span>{session.venue}</span>
                        </div>
                        {slot.teacher_name && (
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                                <FiUser size={12} />
                                <span>Teacher: {slot.teacher_name}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Guardian / Parent Name *</label>
                        <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none"
                            placeholder="e.g. John Kamau" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Phone Number *</label>
                        <input type="tel" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none"
                            placeholder="e.g. 0712345678" />
                        <p className="text-xs text-gray-400 mt-1">A confirmation SMS will be sent to this number</p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={booking}
                        className="px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                        {booking
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Booking...</>
                            : <><FiCheckCircle size={14} /> Confirm Booking</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PTMPortalPage() {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<PTMSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<PTMSession | null>(null);
    const [slots, setSlots] = useState<PTMSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingSlot, setBookingSlot] = useState<PTMSlot | null>(null);
    const [booking, setBooking] = useState(false);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ptm/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.data || []);
            }
        } catch (e) {
            console.error('Failed to load sessions:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const handleSelectSession = async (session: PTMSession) => {
        setSelectedSession(session);
        setLoadingSlots(true);
        try {
            const res = await fetch(`/api/ptm/sessions/${session.id}/slots`);
            if (res.ok) {
                const data = await res.json();
                setSlots(data.data || []);
            }
        } catch (e) {
            console.error('Failed to load slots:', e);
        }
        setLoadingSlots(false);
    };

    const handleBookSlot = async (slotId: number, guardianName: string, guardianPhone: string) => {
        setBooking(true);
        try {
            const res = await fetch('/api/ptm/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slot_id: slotId, guardian_name: guardianName, guardian_phone: guardianPhone }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to book slot');
            } else {
                toast.success(data.message || 'Slot booked successfully! ✅');
                setBookingSlot(null);
                // Refresh slots
                if (selectedSession) handleSelectSession(selectedSession);
            }
        } catch (e) {
            toast.error('Failed to book slot');
        }
        setBooking(false);
    };

    // Group slots by teacher
    const slotsByTeacher = slots.reduce((acc: Record<string, PTMSlot[]>, slot) => {
        const key = slot.teacher_name || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
    }, {});

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading PTM Sessions...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="text-white py-8 px-4" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FiCalendar size={24} /> Parent-Teacher Meeting Portal
                    </h1>
                    <p className="text-blue-200 text-sm mt-1">
                        Book your appointment slot for the upcoming parent-teacher meeting
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Sessions List */}
                {!selectedSession ? (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-800">Available PTM Sessions</h2>
                        {sessions.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                                <FiCalendar className="mx-auto mb-3" size={32} />
                                <p className="font-medium">No PTM sessions available</p>
                                <p className="text-xs mt-1">Check back later for upcoming parent-teacher meetings</p>
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div key={session.id}
                                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
                                    onClick={() => handleSelectSession(session)}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{session.title}</h3>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <FiCalendar size={11} />
                                                    {new Date(session.session_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <FiMapPin size={11} />
                                                    {session.venue}
                                                </span>
                                                {session.form_name && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                        {session.form_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-lg font-bold text-blue-600">
                                                {session.total_slots - session.booked_slots}
                                            </p>
                                            <p className="text-xs text-gray-400">slots available</p>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                            <span>{session.booked_slots} booked</span>
                                            <span>{session.total_slots} total</span>
                                        </div>
                                        <div className="bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: session.total_slots > 0 ? `${(session.booked_slots / session.total_slots) * 100}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Back button */}
                        <button onClick={() => { setSelectedSession(null); setSlots([]); }}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                            ← Back to Sessions
                        </button>

                        {/* Session Header */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-5">
                            <h2 className="font-bold text-gray-800 text-lg">{selectedSession.title}</h2>
                            <div className="flex flex-wrap gap-3 mt-2">
                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                    <FiCalendar size={13} />
                                    {new Date(selectedSession.session_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                    <FiMapPin size={13} />
                                    {selectedSession.venue}
                                </span>
                            </div>
                        </div>

                        {loadingSlots ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Loading available slots...</p>
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                                <FiAlertCircle className="mx-auto mb-3" size={32} />
                                <p className="font-medium">No slots available for this session</p>
                            </div>
                        ) : (
                            Object.entries(slotsByTeacher).map(([teacherName, teacherSlots]) => (
                                <div key={teacherName} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                            <FiUser size={14} className="text-blue-500" />
                                            {teacherName}
                                        </h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {teacherSlots.map(slot => (
                                            <button
                                                key={slot.id}
                                                disabled={slot.is_booked}
                                                onClick={() => !slot.is_booked && setBookingSlot(slot)}
                                                className={`p-3 rounded-xl border-2 text-center transition-all ${
                                                    slot.is_booked
                                                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                                        : 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer'
                                                }`}>
                                                <FiClock size={14} className={`mx-auto mb-1 ${slot.is_booked ? 'text-gray-400' : 'text-blue-500'}`} />
                                                <p className={`text-xs font-bold ${slot.is_booked ? 'text-gray-500' : 'text-blue-700'}`}>
                                                    {slot.start_time}
                                                </p>
                                                <p className={`text-xs ${slot.is_booked ? 'text-gray-400' : 'text-blue-500'}`}>
                                                    {slot.end_time}
                                                </p>
                                                <p className={`text-xs font-semibold mt-1 ${slot.is_booked ? 'text-gray-400' : 'text-green-600'}`}>
                                                    {slot.is_booked ? 'Booked' : 'Available'}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Book Slot Modal */}
            {bookingSlot && selectedSession && (
                <BookSlotModal
                    slot={bookingSlot}
                    session={selectedSession}
                    onBook={handleBookSlot}
                    onClose={() => setBookingSlot(null)}
                    booking={booking}
                />
            )}
        </div>
    );
}
