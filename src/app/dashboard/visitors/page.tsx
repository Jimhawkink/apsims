'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiDownload, FiUser, FiLogOut, FiUsers,
  FiClock, FiCheckCircle, FiSearch,
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Visitor {
  id: number;
  visitor_full_name: string;
  visitor_id_number: string;
  phone?: string;
  purpose: string;
  host_person?: string;
  card_number: string;
  check_in_time: string;
  check_out_time?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Check-In Modal ───────────────────────────────────────────────────────────

function CheckInModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    visitor_full_name: '',
    visitor_id_number: '',
    phone: '',
    purpose: '',
    host_person: '',
    card_number: '',
  });
  const [saving, setSaving] = useState(false);

  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 transition-all';
  const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

  const handleSubmit = async () => {
    if (!form.visitor_full_name.trim()) return toast.error('Visitor name is required');
    if (!form.visitor_id_number.trim()) return toast.error('ID/Passport number is required');
    if (!form.purpose.trim()) return toast.error('Purpose of visit is required');
    if (!form.card_number.trim()) return toast.error('Card number is required');

    setSaving(true);
    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (res.status === 409) throw new Error(result.error);
      if (!res.ok) throw new Error(result.error || 'Failed to check in visitor');
      toast.success('Visitor checked in ✅');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to check in visitor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🪪</div>
            <div>
              <h2 className="text-lg font-bold text-white">Check In Visitor</h2>
              <p className="text-xs text-white/70">Register a new visitor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Visitor Full Name *</label>
            <input
              type="text"
              value={form.visitor_full_name}
              onChange={(e) => setForm({ ...form, visitor_full_name: e.target.value })}
              placeholder="e.g. John Kamau Mwangi"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>National ID / Passport Number *</label>
            <input
              type="text"
              value={form.visitor_id_number}
              onChange={(e) => setForm({ ...form, visitor_id_number: e.target.value })}
              placeholder="e.g. 12345678"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0712345678"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Purpose of Visit *</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g. Parent meeting, Delivery, Interview"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Host (Staff Member Being Visited)</label>
            <input
              type="text"
              value={form.host_person}
              onChange={(e) => setForm({ ...form, host_person: e.target.value })}
              placeholder="e.g. Mr. Odhiambo"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Card Number *</label>
            <input
              type="text"
              value={form.card_number}
              onChange={(e) => setForm({ ...form, card_number: e.target.value })}
              placeholder="e.g. V-001"
              className={inp}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiPlus size={14} />
            )}
            Check In
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Visitor Table ────────────────────────────────────────────────────────────

function VisitorTable({
  visitors,
  canWrite,
  onCheckOut,
}: {
  visitors: Visitor[];
  canWrite: boolean;
  onCheckOut: (visitor: Visitor) => void;
}) {
  if (visitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">🪪</span>
        <p className="text-sm font-semibold">No visitors for this date</p>
        <p className="text-xs mt-1">Check in a visitor using the button above</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Card No', 'Visitor Name', 'ID Number', 'Purpose', 'Host', 'Check-In', 'Check-Out', 'Actions'].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visitors.map((v) => {
            const isActive = !v.check_out_time;
            return (
              <tr
                key={v.id}
                className="hover:bg-gray-50 transition-colors"
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded-lg">
                    {v.card_number}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{v.visitor_full_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{v.visitor_id_number}</td>
                <td className="px-4 py-3 text-gray-700 max-w-[160px]">
                  <p className="line-clamp-2">{v.purpose}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{v.host_person || '-'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                  {formatDateTime(v.check_in_time)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {v.check_out_time ? (
                    <span className="text-xs text-gray-500">{formatDateTime(v.check_out_time)}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                      <FiClock size={10} /> Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canWrite && isActive && (
                    <button
                      onClick={() => onCheckOut(v)}
                      className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition whitespace-nowrap flex items-center gap-1"
                    >
                      <FiLogOut size={11} /> Check Out
                    </button>
                  )}
                  {!isActive && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <FiCheckCircle size={11} /> Done
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Fetch session/role
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((j) => { if (j.user) setUserRole(j.user.role || ''); })
      .catch(() => {});
  }, []);

  const fetchVisitors = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/visitors?date=${date}`);
      const result = await res.json();
      setVisitors(result.data || []);
    } catch {
      toast.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitors(selectedDate);
  }, [selectedDate, fetchVisitors]);

  const handleCheckOut = async (visitor: Visitor) => {
    if (!confirm(`Check out ${visitor.visitor_full_name}?`)) return;
    try {
      const res = await fetch(`/api/visitors/${visitor.id}/checkout`, { method: 'PATCH' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to check out');
      toast.success('Visitor checked out ✅');
      fetchVisitors(selectedDate);
    } catch (e: any) {
      toast.error(e.message || 'Failed to check out');
    }
  };

  const handleExportCSV = () => {
    if (visitors.length === 0) return toast.error('No visitors to export');
    const headers = ['visitor_name', 'visitor_id_number', 'visitor_purpose', 'host_person', 'card_number', 'check_in_time', 'check_out_time'];
    const rows = visitors.map((v) => [
      `"${v.visitor_full_name}"`,
      `"${v.visitor_id_number}"`,
      `"${v.purpose}"`,
      `"${v.host_person || ''}"`,
      `"${v.card_number}"`,
      `"${v.check_in_time}"`,
      `"${v.check_out_time || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Visitors_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported ✅');
  };

  const activeCount = visitors.filter((v) => !v.check_out_time).length;
  const canWrite = ['admin', 'receptionist'].includes(userRole?.toLowerCase());
  const isToday = selectedDate === todayISO();

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div
        className="rounded-2xl px-6 py-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -left-6 -bottom-10 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🪪</div>
            <div>
              <h1 className="text-xl font-extrabold">Visitor Management</h1>
              <p className="text-sm text-white/70 mt-0.5">Track and manage school visitors</p>
            </div>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30"
            >
              <FiPlus size={16} /> Check In Visitor
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-violet-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <FiUsers size={20} className="text-violet-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Today</p>
            <p className="text-2xl font-extrabold text-gray-800">{visitors.length}</p>
            <p className="text-[11px] text-gray-400">{selectedDate}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-green-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <FiClock size={20} className="text-green-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Currently On Premises</p>
            <p className="text-2xl font-extrabold text-gray-800">{activeCount}</p>
            <p className="text-[11px] text-gray-400">Not yet checked out</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-gray-400 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <FiCheckCircle size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Checked Out</p>
            <p className="text-2xl font-extrabold text-gray-800">{visitors.length - activeCount}</p>
            <p className="text-[11px] text-gray-400">Completed visits</p>
          </div>
        </div>
      </div>

      {/* ── Filters + Export ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-violet-400 outline-none"
        />
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="px-3 py-2 text-xs font-bold text-violet-600 bg-violet-50 rounded-xl hover:bg-violet-100 transition"
          >
            Back to Today
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition flex items-center gap-2"
          >
            <FiDownload size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Visitor Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <FiUser size={16} className="text-violet-600" />
            Visitor Log — {selectedDate}
          </h2>
          <span className="text-xs text-gray-400">{visitors.length} visitor{visitors.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <VisitorTable
            visitors={visitors}
            canWrite={canWrite}
            onCheckOut={handleCheckOut}
          />
        )}
      </div>

      {/* ── Modal ── */}
      {showCheckInModal && (
        <CheckInModal
          onClose={() => setShowCheckInModal(false)}
          onSaved={() => fetchVisitors(selectedDate)}
        />
      )}
    </div>
  );
}
