'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2 } from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AcademicEvent {
  id: number;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  description?: string;
  target_audience?: any;
  color_code?: string;
}

interface Form {
  id: number;
  form_name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  'Exam': '#ef4444',
  'Holiday': '#22c55e',
  'Sports Day': '#f59e0b',
  'PTM': '#6366f1',
  'Cultural Day': '#ec4899',
  'Other': '#94a3b8',
};

const EVENT_TYPES = Object.keys(EVENT_COLORS);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Event Modal ──────────────────────────────────────────────────────────────

function EventModal({
  event, forms, onClose, onSaved,
}: {
  event?: AcademicEvent;
  forms: Form[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: event?.title || '',
    event_type: event?.event_type || 'Other',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    description: event?.description || '',
    target_audience: 'All',
  });
  const [saving, setSaving] = useState(false);
  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-all';
  const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Event title is required');
    if (!form.start_date) return toast.error('Start date is required');
    setSaving(true);
    try {
      const url = isEdit ? `/api/academic-events/${event!.id}` : '/api/academic-events';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, color_code: EVENT_COLORS[form.event_type] || '#94a3b8' }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save event');
      toast.success(isEdit ? 'Event updated ✅' : 'Event created ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">📅</div>
            <div><h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Event' : 'New Event'}</h2><p className="text-xs text-white/70">Academic calendar event</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Event Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Form 4 Mid-Term Exams" className={inp} /></div>
          <div>
            <label className={lbl}>Event Type</label>
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className={inp}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Start Date *</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: form.end_date || e.target.value })} className={inp} /></div>
            <div><label className={lbl}>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inp} /></div>
          </div>
          <div>
            <label className={lbl}>Target Audience</label>
            <select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className={inp}>
              <option value="All">All Forms</option>
              {forms.map((f) => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description…" className={inp} /></div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            {isEdit ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AcademicCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [allUpcoming, setAllUpcoming] = useState<AcademicEvent[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [filterFormId, setFilterFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<AcademicEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AcademicEvent | null>(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((j) => { if (j.user) setUserRole(j.user.role || ''); }).catch(() => {});
    supabase.from('school_forms').select('id, form_name').order('form_level').then(({ data }) => setForms(data || []));
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (filterFormId) params.set('form_id', filterFormId);
      const res = await fetch(`/api/academic-events?${params}`);
      const result = await res.json();
      setEvents(result.data || []);
    } catch { toast.error('Failed to load events'); } finally { setLoading(false); }
  }, [month, year, filterFormId]);

  const fetchUpcoming = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-events');
      const result = await res.json();
      const upcoming = (result.data || [])
        .filter((e: AcademicEvent) => new Date(e.start_date) >= today)
        .sort((a: AcademicEvent, b: AcademicEvent) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 10);
      setAllUpcoming(upcoming);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEvents(); fetchUpcoming(); }, [fetchEvents, fetchUpcoming]);

  const handleDelete = async (event: AcademicEvent) => {
    try {
      const res = await fetch(`/api/academic-events/${event.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Event deleted ✅');
      setDeleteConfirm(null);
      fetchEvents(); fetchUpcoming();
    } catch (e: any) { toast.error(e.message); }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.start_date <= dateStr && e.end_date >= dateStr);
  };

  const canWrite = ['admin', 'principal'].includes(userRole?.toLowerCase());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl px-6 py-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">📅</div>
            <div><h1 className="text-xl font-extrabold">Academic Calendar</h1><p className="text-sm text-white/70 mt-0.5">School events and important dates</p></div>
          </div>
          {canWrite && (
            <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> New Event
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Month Nav */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              className="p-2 rounded-xl hover:bg-gray-100 transition"><FiChevronLeft size={18} /></button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-800">{MONTHS[month]} {year}</h2>
              <select value={filterFormId} onChange={(e) => setFilterFormId(e.target.value)} className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:border-emerald-400 outline-none">
                <option value="">All Forms</option>
                {forms.map((f) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              className="p-2 rounded-xl hover:bg-gray-100 transition"><FiChevronRight size={18} /></button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const isToday = day !== null && new Date(year, month, day).toDateString() === today.toDateString();
                const dayEvents = day ? getEventsForDay(day) : [];
                return (
                  <div key={idx} className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 ${!day ? 'bg-gray-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                    {day && (
                      <>
                        <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold mb-1 ${isToday ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}>{day}</span>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((e) => (
                            <div key={e.id} className="text-[10px] font-semibold px-1 py-0.5 rounded truncate text-white cursor-pointer"
                              style={{ backgroundColor: EVENT_COLORS[e.event_type] || '#94a3b8' }}
                              onClick={() => canWrite && setEditEvent(e)}
                              title={e.title}>
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && <div className="text-[10px] text-gray-400 font-semibold">+{dayEvents.length - 2} more</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-3">
            {EVENT_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: EVENT_COLORS[type] }} />
                <span className="text-[11px] text-gray-500 font-medium">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Upcoming Events</h3>
            <p className="text-xs text-gray-400 mt-0.5">Next 10 events</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {allUpcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400"><span className="text-3xl mb-2">📅</span><p className="text-xs">No upcoming events</p></div>
            ) : allUpcoming.map((e) => (
              <div key={e.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: EVENT_COLORS[e.event_type] || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{e.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{new Date(e.start_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-white mt-1" style={{ backgroundColor: EVENT_COLORS[e.event_type] || '#94a3b8' }}>{e.event_type}</span>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditEvent(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><FiEdit2 size={12} /></button>
                      <button onClick={() => setDeleteConfirm(e)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"><FiTrash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && <EventModal forms={forms} onClose={() => setShowModal(false)} onSaved={() => { fetchEvents(); fetchUpcoming(); }} />}
      {editEvent && <EventModal event={editEvent} forms={forms} onClose={() => setEditEvent(null)} onSaved={() => { fetchEvents(); fetchUpcoming(); setEditEvent(null); }} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 mb-2">Delete Event?</h3>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? This cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
