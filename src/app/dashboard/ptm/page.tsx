'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiCalendar, FiUsers, FiPlus, FiX, FiSend, FiRefreshCw,
  FiMapPin, FiClock, FiTrash2, FiEye, FiBell, FiSearch,
  FiFilter, FiDownload, FiCheckCircle, FiAlertCircle,
  FiTrendingUp, FiUser, FiPhone, FiEdit3, FiMoreVertical,
  FiChevronRight, FiActivity, FiZap, FiStar, FiGrid,
  FiList, FiPrinter, FiShare2, FiCheck, FiInfo,
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

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
    id: number;
    guardian_name: string;
    guardian_phone: string;
    status: string;
    booked_at: string;
    student_id: number | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getSessionStatus(session: PTMSession): { label: string; color: string; bg: string; dot: string } {
  const date = new Date(session.session_date);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = diff / 86400000;
  if (days < -1) return { label: 'Completed', color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' };
  if (days < 0) return { label: 'Today', color: '#0891b2', bg: '#e0f2fe', dot: '#0891b2' };
  if (days < 1) return { label: 'Tomorrow', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' };
  if (days < 7) return { label: 'This Week', color: '#059669', bg: '#d1fae5', dot: '#10b981' };
  return { label: 'Upcoming', color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' };
}

function bookingPct(session: PTMSession) {
  return session.total_slots > 0 ? Math.round((session.booked_slots / session.total_slots) * 100) : 0;
}

// ─── Create Session Modal ─────────────────────────────────────────────────────

function CreateSessionModal({ forms, teachers, onSave, onClose }: {
  forms: any[]; teachers: any[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: '', session_date: '', venue: '', target_form_id: '', notes: '' });
  const [slots, setSlots] = useState([{ start_time: '09:00', end_time: '09:30', teacher_id: '' }]);
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStart, setBulkStart] = useState('08:00');
  const [bulkDuration, setBulkDuration] = useState('30');
  const [bulkCount, setBulkCount] = useState('8');
  const [bulkTeacher, setBulkTeacher] = useState('');

  const generateBulkSlots = () => {
    const [h, m] = bulkStart.split(':').map(Number);
    const dur = Number(bulkDuration);
    const count = Number(bulkCount);
    const generated = [];
    let cur = h * 60 + m;
    for (let i = 0; i < count; i++) {
      const sh = String(Math.floor(cur / 60)).padStart(2, '0');
      const sm = String(cur % 60).padStart(2, '0');
      cur += dur;
      const eh = String(Math.floor(cur / 60)).padStart(2, '0');
      const em = String(cur % 60).padStart(2, '0');
      generated.push({ start_time: `${sh}:${sm}`, end_time: `${eh}:${em}`, teacher_id: bulkTeacher });
    }
    setSlots(generated);
    setBulkMode(false);
  };

  const addSlot = () => setSlots(p => [...p, { start_time: '', end_time: '', teacher_id: '' }]);
  const removeSlot = (i: number) => setSlots(p => p.filter((_, j) => j !== i));
  const updateSlot = (i: number, f: string, v: string) => setSlots(p => p.map((s, j) => j === i ? { ...s, [f]: v } : s));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.session_date || !form.venue.trim()) {
      toast.error('Title, date, and venue are required'); return;
    }
    if (slots.some(s => !s.start_time || !s.end_time)) {
      toast.error('All slots must have start and end times'); return;
    }
    setSaving(true);
    await onSave({
      ...form,
      target_form_id: form.target_form_id ? Number(form.target_form_id) : null,
      slots: slots.map(s => ({ start_time: s.start_time, end_time: s.end_time, teacher_id: s.teacher_id ? Number(s.teacher_id) : null })),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0891b2 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <FiCalendar size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">New PTM Session</h3>
              <p className="text-blue-200 text-xs">Step {step} of 2 — {step === 1 ? 'Session Details' : 'Time Slots'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all">
            <FiX size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                  style={step >= s ? { background: 'linear-gradient(135deg, #1e40af, #0891b2)' } : {}}>
                  {step > s ? <FiCheck size={12} /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-blue-700' : 'text-gray-400'}`}>
                  {s === 1 ? 'Details' : 'Slots'}
                </span>
                {s < 2 && <div className={`w-8 h-0.5 rounded ${step > s ? 'bg-blue-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Session Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none transition-colors"
                  placeholder="e.g. Form 3 Parent-Teacher Meeting — Term 2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Date *</label>
                  <input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Target Form</label>
                  <select value={form.target_form_id} onChange={e => setForm(f => ({ ...f, target_form_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none transition-colors">
                    <option value="">All Forms</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Venue *</label>
                <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none transition-colors"
                  placeholder="e.g. School Hall, Library, Classroom 4A" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none transition-colors resize-none"
                  placeholder="Any additional instructions for parents..." />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bulk generator */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiZap size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Auto-Generate Slots</span>
                  </div>
                  <button onClick={() => setBulkMode(b => !b)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${bulkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-200'}`}>
                    {bulkMode ? 'Hide' : 'Configure'}
                  </button>
                </div>
                {bulkMode && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Start Time</label>
                      <input type="time" value={bulkStart} onChange={e => setBulkStart(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Duration (min)</label>
                      <select value={bulkDuration} onChange={e => setBulkDuration(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:border-blue-400 outline-none">
                        {['15','20','30','45','60'].map(d => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Number of Slots</label>
                      <input type="number" min={1} max={50} value={bulkCount} onChange={e => setBulkCount(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Assign Teacher</label>
                      <select value={bulkTeacher} onChange={e => setBulkTeacher(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:border-blue-400 outline-none">
                        <option value="">Any Teacher</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <button onClick={generateBulkSlots}
                        className="w-full py-2 text-xs font-bold text-white rounded-lg flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
                        <FiZap size={12} /> Generate {bulkCount} Slots
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Slot list */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{slots.length} Slots</span>
                <button onClick={addSlot}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1">
                  <FiPlus size={11} /> Add Slot
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {slots.map((slot, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                    <div className="col-span-1 text-center text-xs text-gray-400 font-bold">{i + 1}</div>
                    <div className="col-span-3">
                      <input type="time" value={slot.start_time} onChange={e => updateSlot(i, 'start_time', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:border-blue-400 outline-none" />
                    </div>
                    <div className="col-span-1 text-center text-xs text-gray-400">→</div>
                    <div className="col-span-3">
                      <input type="time" value={slot.end_time} onChange={e => updateSlot(i, 'end_time', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:border-blue-400 outline-none" />
                    </div>
                    <div className="col-span-3">
                      <select value={slot.teacher_id} onChange={e => updateSlot(i, 'teacher_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:border-blue-400 outline-none">
                        <option value="">Any</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {slots.length > 1 && (
                        <button onClick={() => removeSlot(i)} className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
                          <FiX size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
          <button onClick={step === 1 ? onClose : () => setStep(1)}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all font-medium">
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step === 1 ? (
            <button onClick={() => {
              if (!form.title.trim() || !form.session_date || !form.venue.trim()) { toast.error('Fill in all required fields'); return; }
              setStep(2);
            }} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
              Next: Add Slots <FiChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={14} />}
              Create Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Detail Drawer ────────────────────────────────────────────────────

function SessionDetailDrawer({ session, slots, onClose, onSendReminders, sendingReminders }: {
  session: PTMSession; slots: PTMSlot[];
  onClose: () => void;
  onSendReminders: (id: number) => void;
  sendingReminders: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'slots' | 'booked' | 'available'>('slots');
  const [search, setSearch] = useState('');

  const byTeacher = useMemo(() => {
    return slots.reduce((acc: Record<string, PTMSlot[]>, slot) => {
      const key = slot.teacher_name || 'Unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const filtered = useMemo(() => {
    let list = slots;
    if (activeTab === 'booked') list = slots.filter(s => s.is_booked);
    if (activeTab === 'available') list = slots.filter(s => !s.is_booked);
    if (search) list = list.filter(s =>
      s.booking?.guardian_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.teacher_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.start_time.includes(search)
    );
    return list;
  }, [slots, activeTab, search]);

  const pct = bookingPct(session);
  const status = getSessionStatus(session);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50">
      <div className="bg-white w-full sm:w-[520px] h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0891b2 100%)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                  {status.label}
                </span>
              </div>
              <h3 className="font-bold text-white text-base leading-tight">{session.title}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-blue-200 text-xs">
                  <FiCalendar size={11} /> {formatDate(session.session_date)}
                </span>
                <span className="flex items-center gap-1 text-blue-200 text-xs">
                  <FiMapPin size={11} /> {session.venue}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all flex-shrink-0">
              <FiX size={16} />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total', value: session.total_slots, color: 'bg-white/20' },
              { label: 'Booked', value: session.booked_slots, color: 'bg-green-500/30' },
              { label: 'Free', value: session.total_slots - session.booked_slots, color: 'bg-white/10' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.color} rounded-xl p-3 text-center`}>
                <p className="text-xl font-extrabold text-white">{stat.value}</p>
                <p className="text-blue-200 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-blue-200 mb-1">
              <span>Booking Progress</span>
              <span className="font-bold text-white">{pct}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#60a5fa' }} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0 bg-gray-50">
          <button onClick={() => onSendReminders(session.id)} disabled={sendingReminders}
            className="flex-1 py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
            {sendingReminders ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiBell size={12} />}
            Send Reminders
          </button>
          <button className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-1.5 transition-all">
            <FiDownload size={12} /> Export
          </button>
          <button className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-1.5 transition-all">
            <FiPrinter size={12} /> Print
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 pb-0 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { id: 'slots', label: `All (${slots.length})` },
              { id: 'booked', label: `Booked (${slots.filter(s => s.is_booked).length})` },
              { id: 'available', label: `Free (${slots.filter(s => !s.is_booked).length})` },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-2 mb-3 relative">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search guardian, teacher, time..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-all" />
          </div>
        </div>

        {/* Slot list */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FiCalendar size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No slots found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(slot => (
                <div key={slot.id}
                  className={`rounded-xl border p-3.5 transition-all ${slot.is_booked ? 'bg-white border-gray-200' : 'bg-green-50/50 border-green-200/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${slot.is_booked ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <FiClock size={14} className={slot.is_booked ? 'text-blue-600' : 'text-green-600'} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{slot.start_time} – {slot.end_time}</p>
                        {slot.teacher_name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <FiUser size={10} /> {slot.teacher_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {slot.is_booked && slot.booking ? (
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800">{slot.booking.guardian_name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                          <FiPhone size={10} /> {slot.booking.guardian_phone}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {slot.booking.status}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full flex-shrink-0">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, index, onView }: { session: PTMSession; index: number; onView: () => void }) {
  const status = getSessionStatus(session);
  const pct = bookingPct(session);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #1e40af, #0891b2)' }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                ● {status.label}
              </span>
              {session.form_name && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {session.form_name}
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{session.title}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
            {index + 1}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <FiCalendar size={11} className="text-blue-400" /> {formatDate(session.session_date)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <FiMapPin size={11} className="text-gray-400" /> {session.venue}
          </span>
        </div>

        {/* Booking progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-medium">Booking Progress</span>
            <span className="font-bold text-gray-700">{session.booked_slots}/{session.total_slots} slots</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                  pct >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                    'linear-gradient(90deg, #1e40af, #0891b2)'
              }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{pct}% booked</span>
            <span>{session.total_slots - session.booked_slots} available</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Total', value: session.total_slots, bg: 'bg-blue-50', color: 'text-blue-700' },
            { label: 'Booked', value: session.booked_slots, bg: 'bg-green-50', color: 'text-green-700' },
            { label: 'Free', value: session.total_slots - session.booked_slots, bg: 'bg-gray-50', color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
              <p className={`text-base font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <button onClick={onView}
          className="w-full py-2.5 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md transition-all"
          style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
          <FiEye size={13} /> View Details & Slots
        </button>
      </div>
    </div>
  );
}

// ─── Session Table Row ────────────────────────────────────────────────────────

function SessionTableRow({ session, index, onView }: { session: PTMSession; index: number; onView: () => void }) {
  const status = getSessionStatus(session);
  const pct = bookingPct(session);

  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group">
      <td className="px-4 py-3 text-xs text-gray-400 font-medium">{index + 1}</td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{session.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <FiMapPin size={10} /> {session.venue}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <FiCalendar size={11} className="text-blue-400" />
          {formatDate(session.session_date)}
        </span>
      </td>
      <td className="px-4 py-3">
        {session.form_name
          ? <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{session.form_name}</span>
          : <span className="text-xs text-gray-400">All Forms</span>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
            <div className="h-1.5 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#3b82f6'
              }} />
          </div>
          <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
            {session.booked_slots}/{session.total_slots}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <button onClick={onView}
          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1.5 group-hover:shadow-sm">
          <FiEye size={11} /> View
        </button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, formsRes, teachersRes] = await Promise.all([
        fetch('/api/ptm/sessions'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_teachers').select('id, first_name, last_name').eq('status', 'Active').order('first_name'),
      ]);
      if (sessionsRes.ok) { const d = await sessionsRes.json(); setSessions(d.data || []); }
      setForms(formsRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateSession = async (data: any) => {
    try {
      const res = await fetch('/api/ptm/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || 'Failed to create session'); }
      else { toast.success('PTM session created ✅'); setShowCreateModal(false); fetchData(); }
    } catch { toast.error('Failed to create session'); }
  };

  const handleViewSession = async (session: PTMSession) => {
    setSelectedSession(session);
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/ptm/sessions/${session.id}/slots`);
      if (res.ok) { const d = await res.json(); setSelectedSlots(d.data || []); }
    } catch (e) { console.error(e); }
    setLoadingSlots(false);
  };

  const handleSendReminders = async (sessionId: number) => {
    setSendingReminders(true);
    try {
      const res = await fetch(`/api/ptm/sessions/${sessionId}/reminders`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Failed to send reminders');
      else toast.success(`${data.message} ✅`);
    } catch { toast.error('Failed to send reminders'); }
    setSendingReminders(false);
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.venue.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter) {
        const st = getSessionStatus(s).label;
        if (st !== statusFilter) return false;
      }
      return true;
    });
  }, [sessions, search, statusFilter]);

  const stats = useMemo(() => ({
    total: sessions.length,
    totalSlots: sessions.reduce((a, s) => a + s.total_slots, 0),
    booked: sessions.reduce((a, s) => a + s.booked_slots, 0),
    available: sessions.reduce((a, s) => a + (s.total_slots - s.booked_slots), 0),
    upcoming: sessions.filter(s => new Date(s.session_date) >= new Date()).length,
  }), [sessions]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
          <FiCalendar size={22} className="text-white" />
        </div>
        <p className="text-gray-500 text-sm font-medium">Loading PTM Scheduler...</p>
        <p className="text-gray-400 text-xs mt-1">Fetching sessions and slots</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Hero Header ── */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #0891b2 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <FiCalendar size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">PTM Scheduler</h1>
                <p className="text-blue-200 text-xs mt-0.5">Parent-Teacher Meeting Management · AlphaSIMS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData}
                className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all backdrop-blur-sm">
                <FiRefreshCw size={13} /> Refresh
              </button>
              <button onClick={() => setShowCreateModal(true)}
                className="px-5 py-2 bg-white text-blue-700 text-xs font-extrabold rounded-xl flex items-center gap-1.5 hover:bg-blue-50 shadow-lg transition-all">
                <FiPlus size={13} /> New Session
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-5 gap-3 mt-5">
            {[
              { label: 'Sessions', value: stats.total, icon: FiCalendar, color: 'bg-white/20' },
              { label: 'Total Slots', value: stats.totalSlots, icon: FiGrid, color: 'bg-white/15' },
              { label: 'Booked', value: stats.booked, icon: FiCheckCircle, color: 'bg-green-500/30' },
              { label: 'Available', value: stats.available, icon: FiActivity, color: 'bg-white/10' },
              { label: 'Upcoming', value: stats.upcoming, icon: FiTrendingUp, color: 'bg-indigo-500/30' },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.color} backdrop-blur-sm rounded-xl p-3 text-center`}>
                <kpi.icon size={14} className="text-white/70 mx-auto mb-1" />
                <p className="text-lg font-extrabold text-white">{kpi.value}</p>
                <p className="text-blue-200 text-[10px] font-medium">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions, venues..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-all" />
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-medium text-gray-700">
          <option value="">All Status</option>
          {['Today', 'Tomorrow', 'This Week', 'Upcoming', 'Completed'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <FiGrid size={14} />
          </button>
          <button onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <FiList size={14} />
          </button>
        </div>

        <span className="text-xs text-gray-400 font-medium">{filteredSessions.length} sessions</span>
      </div>

      {/* ── Sessions ── */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #dbeafe, #e0f2fe)' }}>
            <FiCalendar size={28} className="text-blue-400" />
          </div>
          <p className="font-bold text-gray-700 text-base">No PTM sessions found</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">
            {search || statusFilter ? 'Try adjusting your filters' : 'Schedule your first parent-teacher meeting'}
          </p>
          {!search && !statusFilter && (
            <button onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl inline-flex items-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
              <FiPlus size={14} /> Create First Session
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session, i) => (
            <SessionCard key={session.id} session={session} index={i} onView={() => handleViewSession(session)} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <FiCalendar size={14} className="text-blue-500" /> PTM Sessions
            </h3>
            <span className="text-xs text-gray-400">{filteredSessions.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#', 'Session', 'Date', 'Form', 'Status', 'Booking', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, i) => (
                  <SessionTableRow key={session.id} session={session} index={i} onView={() => handleViewSession(session)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreateSessionModal forms={forms} teachers={teachers} onSave={handleCreateSession} onClose={() => setShowCreateModal(false)} />
      )}

      {selectedSession && (
        loadingSlots ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse"
                style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
                <FiCalendar size={18} className="text-white" />
              </div>
              <p className="text-gray-600 text-sm font-medium">Loading session details...</p>
            </div>
          </div>
        ) : (
          <SessionDetailDrawer
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
