'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiSearch, FiActivity, FiUser, FiAlertTriangle,
  FiCheckCircle, FiClock, FiExternalLink, FiChevronRight
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Visit {
  id: number;
  student_id: number;
  visit_date: string;
  complaint: string;
  diagnosis?: string;
  treatment?: string;
  medication_given?: string;
  temperature?: number;
  blood_pressure?: string;
  pulse_rate?: number;
  weight?: number;
  height?: number;
  referred_to?: string;
  notes?: string;
  term_id: number;
  attended_by?: number;
  discharged: boolean;
  discharge_time?: string;
  created_at?: string;
  school_students?: {
    id: number;
    first_name: string;
    last_name: string;
    admission_number?: string;
    admission_no?: string;
  };
}

interface Term {
  id: number;
  term_name: string;
  academic_year: string;
  is_current: boolean;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number?: string;
  admission_no?: string;
}

const defaultVisitForm = {
  student_id: 0,
  visit_date: new Date().toISOString().split('T')[0],
  complaint: '',
  diagnosis: '',
  treatment: '',
  medication_given: '',
  temperature: '',
  blood_pressure: '',
  pulse_rate: '',
  weight: '',
  height: '',
  referred_to: '',
  notes: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAdmNo(student: any) {
  return student?.admission_number || student?.admission_no || '-';
}

function getStudentName(visit: Visit) {
  if (!visit.school_students) return 'Unknown';
  const s = visit.school_students;
  return `${s.first_name} ${s.last_name}`;
}

function getVisitStatus(visit: Visit): 'Discharged' | 'Referred' | 'Active' {
  if (visit.discharged) return 'Discharged';
  if (visit.referred_to) return 'Referred';
  return 'Active';
}

function StatusBadge({ visit }: { visit: Visit }) {
  const status = getVisitStatus(visit);
  if (status === 'Discharged') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
        <FiCheckCircle size={10} /> Discharged
      </span>
    );
  }
  if (status === 'Referred') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
        <FiExternalLink size={10} /> Referred
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
      <FiClock size={10} /> Active
    </span>
  );
}

// ─── Student Search Picker ────────────────────────────────────────────────────

function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: Student[];
  value: number;
  onChange: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value);
  const filtered =
    q.trim().length > 0
      ? students
          .filter((s) => {
            const name = `${s.first_name} ${s.last_name} ${getAdmNo(s)}`.toLowerCase();
            return name.includes(q.toLowerCase());
          })
          .slice(0, 50)
      : [];

  return (
    <div className="relative">
      <div
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm cursor-pointer flex items-center justify-between hover:border-teal-400 transition-all"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
          {selected
            ? `${selected.first_name} ${selected.last_name} (${getAdmNo(selected)})`
            : '🔍 Search student by name or admission no…'}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type name or admission number…"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {q.trim().length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                Start typing to search from {students.length} students
              </div>
            )}
            {q.trim().length > 0 && filtered.length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                No students found for &quot;{q}&quot;
              </div>
            )}
            {filtered.map((s) => (
              <div
                key={s.id}
                className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 text-sm transition-colors ${
                  value === s.id ? 'bg-teal-50 font-bold text-teal-700' : ''
                }`}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                  setQ('');
                }}
              >
                <span className="font-semibold">
                  {s.first_name} {s.last_name}
                </span>
                <span className="text-gray-400 ml-2 text-xs">({getAdmNo(s)})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Visit Modal ──────────────────────────────────────────────────────────

function NewVisitModal({
  students,
  terms,
  currentTermId,
  userRole,
  userId,
  onClose,
  onSaved,
}: {
  students: Student[];
  terms: Term[];
  currentTermId: number;
  userRole: string;
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...defaultVisitForm });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Please select a student');
    if (!form.complaint.trim()) return toast.error('Complaint is required');

    setSaving(true);
    try {
      const res = await fetch('/api/clinic/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: form.student_id,
          visit_date: form.visit_date,
          complaint: form.complaint,
          diagnosis: form.diagnosis || undefined,
          treatment: form.treatment || undefined,
          medication_given: form.medication_given || undefined,
          temperature: form.temperature ? Number(form.temperature) : undefined,
          blood_pressure: form.blood_pressure || undefined,
          pulse_rate: form.pulse_rate ? Number(form.pulse_rate) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
          height: form.height ? Number(form.height) : undefined,
          referred_to: form.referred_to || undefined,
          notes: form.notes || undefined,
          term_id: currentTermId,
          attended_by: userId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save visit');
      toast.success('Visit recorded ✅');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save visit');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 transition-all';
  const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🏥</div>
            <div>
              <h2 className="text-lg font-bold text-white">New Clinic Visit</h2>
              <p className="text-xs text-white/70">Record a student sick bay visit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Student */}
          <div>
            <label className={lbl}>Student *</label>
            <StudentPicker
              students={students}
              value={form.student_id}
              onChange={(id) => setForm({ ...form, student_id: id })}
            />
          </div>

          {/* Visit Date */}
          <div>
            <label className={lbl}>Visit Date *</label>
            <input
              type="date"
              value={form.visit_date}
              onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              className={inp}
            />
          </div>

          {/* Complaint */}
          <div>
            <label className={lbl}>Complaint *</label>
            <textarea
              value={form.complaint}
              onChange={(e) => setForm({ ...form, complaint: e.target.value })}
              rows={2}
              placeholder="Describe the student's complaint…"
              className={inp}
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className={lbl}>Diagnosis</label>
            <textarea
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              rows={2}
              placeholder="Clinical diagnosis…"
              className={inp}
            />
          </div>

          {/* Treatment */}
          <div>
            <label className={lbl}>Treatment</label>
            <textarea
              value={form.treatment}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              rows={2}
              placeholder="Treatment given…"
              className={inp}
            />
          </div>

          {/* Medication */}
          <div>
            <label className={lbl}>Medication Given</label>
            <input
              type="text"
              value={form.medication_given}
              onChange={(e) => setForm({ ...form, medication_given: e.target.value })}
              placeholder="e.g. Paracetamol 500mg"
              className={inp}
            />
          </div>

          {/* Vitals */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
              Vitals (Optional)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                  placeholder="37.0"
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  value={form.blood_pressure}
                  onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })}
                  placeholder="120/80"
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Pulse Rate (bpm)</label>
                <input
                  type="number"
                  value={form.pulse_rate}
                  onChange={(e) => setForm({ ...form, pulse_rate: e.target.value })}
                  placeholder="72"
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="55.0"
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  placeholder="165"
                  className={inp}
                />
              </div>
            </div>
          </div>

          {/* Referred To */}
          <div>
            <label className={lbl}>Referred To (Optional)</label>
            <input
              type="text"
              value={form.referred_to}
              onChange={(e) => setForm({ ...form, referred_to: e.target.value })}
              placeholder="e.g. Kenyatta National Hospital"
              className={inp}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes…"
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
            style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiPlus size={14} />
            )}
            Record Visit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Visit History Drawer ─────────────────────────────────────────────

function StudentVisitHistoryDrawer({
  student,
  currentTermId,
  onClose,
}: {
  student: Student;
  currentTermId: number;
  onClose: () => void;
}) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clinic/visits?student_id=${student.id}`);
        const result = await res.json();
        setVisits(result.data || []);
      } catch {
        toast.error('Failed to load visit history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [student.id]);

  const currentTermVisits = visits.filter((v) => v.term_id === currentTermId);
  const showAlert = currentTermVisits.length > 3;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FiUser size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-xs text-white/70">{getAdmNo(student)} · Visit History</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition">
            <FiX size={16} />
          </button>
        </div>

        {/* Alert Banner */}
        {showAlert && (
          <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <FiAlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-700">
              ⚠ Frequent Visitor — {currentTermVisits.length} visits this term
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="bg-teal-50 rounded-xl p-3 border-l-4 border-l-teal-500">
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Total Visits</p>
            <p className="text-xl font-extrabold text-teal-700">{visits.length}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border-l-4 border-l-orange-500">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">This Term</p>
            <p className="text-xl font-extrabold text-orange-700">{currentTermVisits.length}</p>
          </div>
        </div>

        {/* Visit List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <span className="text-3xl mb-2">🏥</span>
              <p className="text-sm">No visits recorded</p>
            </div>
          ) : (
            visits.map((visit) => (
              <div
                key={visit.id}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold text-gray-700">
                      {new Date(visit.visit_date).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {visit.term_id === currentTermId && (
                      <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                        Current Term
                      </span>
                    )}
                  </div>
                  <StatusBadge visit={visit} />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{visit.complaint}</p>
                {visit.diagnosis && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Dx:</span> {visit.diagnosis}
                  </p>
                )}
                {visit.treatment && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Tx:</span> {visit.treatment}
                  </p>
                )}
                {visit.referred_to && (
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    Referred to: {visit.referred_to}
                  </p>
                )}
                {visit.discharged && visit.discharge_time && (
                  <p className="text-xs text-green-600 mt-1">
                    Discharged:{' '}
                    {new Date(visit.discharge_time).toLocaleString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Visit Table ──────────────────────────────────────────────────────────────

function VisitTable({
  visits,
  currentTermId,
  canWrite,
  onDischarge,
  onStudentClick,
}: {
  visits: Visit[];
  currentTermId: number;
  canWrite: boolean;
  onDischarge: (visit: Visit) => void;
  onStudentClick: (student: Student) => void;
}) {
  // Count visits per student in current term for alert badge
  const visitCountByStudent: Record<number, number> = {};
  visits.forEach((v) => {
    if (v.term_id === currentTermId) {
      visitCountByStudent[v.student_id] = (visitCountByStudent[v.student_id] || 0) + 1;
    }
  });

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">🏥</span>
        <p className="text-sm font-semibold">No visits recorded for this term</p>
        <p className="text-xs mt-1">Click &quot;New Visit&quot; to record the first visit</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Student', 'Adm No', 'Date', 'Complaint', 'Diagnosis', 'Status', 'Actions'].map(
              (h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    borderBottom: '2px solid #e2e8f0',
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => {
            const studentName = getStudentName(visit);
            const admNo = visit.school_students
              ? getAdmNo(visit.school_students)
              : '-';
            const isFrequent = (visitCountByStudent[visit.student_id] || 0) > 3;
            const isActive = !visit.discharged;

            return (
              <tr
                key={visit.id}
                className="hover:bg-gray-50 transition-colors"
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                {/* Student Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (visit.school_students) {
                          onStudentClick({
                            id: visit.school_students.id,
                            first_name: visit.school_students.first_name,
                            last_name: visit.school_students.last_name,
                            admission_number: visit.school_students.admission_number,
                            admission_no: visit.school_students.admission_no,
                          });
                        }
                      }}
                      className="font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 text-left"
                    >
                      {studentName}
                      <FiChevronRight size={12} />
                    </button>
                    {isFrequent && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                        <FiAlertTriangle size={9} /> Frequent
                      </span>
                    )}
                  </div>
                </td>

                {/* Adm No */}
                <td className="px-4 py-3 text-gray-500 text-xs">{admNo}</td>

                {/* Date */}
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                  {new Date(visit.visit_date).toLocaleDateString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                {/* Complaint */}
                <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                  <p className="line-clamp-2">{visit.complaint}</p>
                </td>

                {/* Diagnosis */}
                <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                  <p className="line-clamp-2">{visit.diagnosis || '-'}</p>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge visit={visit} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {canWrite && isActive && (
                    <button
                      onClick={() => onDischarge(visit)}
                      className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition whitespace-nowrap"
                    >
                      Discharge
                    </button>
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

export default function ClinicPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTermId, setSelectedTermId] = useState<number>(0);
  const [currentTermId, setCurrentTermId] = useState<number>(0);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState(0);

  // Fetch session/role
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((j) => {
        if (j.user) {
          setUserRole(j.user.role || '');
          setUserId(j.user.id || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch terms and students on mount
  const fetchInitialData = useCallback(async () => {
    const [termsRes, studentsRes] = await Promise.all([
      supabase.from('school_terms').select('*').order('start_date', { ascending: false }),
      supabase
        .from('school_students')
        .select('id, first_name, last_name, admission_number, admission_no')
        .eq('status', 'Active')
        .order('first_name'),
    ]);

    const termsData: Term[] = termsRes.data || [];
    setTerms(termsData);
    setStudents(studentsRes.data || []);

    const current = termsData.find((t) => t.is_current);
    if (current) {
      setCurrentTermId(current.id);
      setSelectedTermId(current.id);
    } else if (termsData.length > 0) {
      setCurrentTermId(termsData[0].id);
      setSelectedTermId(termsData[0].id);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch visits when term changes
  const fetchVisits = useCallback(async (termId: number) => {
    if (!termId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clinic/visits?term_id=${termId}`);
      const result = await res.json();
      setVisits(result.data || []);
    } catch {
      toast.error('Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTermId) fetchVisits(selectedTermId);
  }, [selectedTermId, fetchVisits]);

  // Discharge handler
  const handleDischarge = async (visit: Visit) => {
    if (!confirm(`Discharge ${getStudentName(visit)}?`)) return;
    try {
      const res = await fetch(`/api/clinic/visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discharged: true,
          discharge_time: new Date().toISOString(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to discharge');
      toast.success('Patient discharged ✅');
      fetchVisits(selectedTermId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to discharge');
    }
  };

  // KPI computations
  const totalVisits = visits.length;
  const activePatients = visits.filter((v) => !v.discharged).length;
  const referralsMade = visits.filter((v) => v.referred_to).length;

  const roleNorm = userRole?.toLowerCase();
  const canWrite = ['admin', 'receptionist'].includes(roleNorm);
  const canRead = ['admin', 'principal', 'teacher', 'receptionist'].includes(roleNorm);

  if (!canRead && userRole) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-4xl mb-3">🔒</span>
        <p className="text-sm font-semibold">Access Denied</p>
        <p className="text-xs mt-1">You do not have permission to view this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div
        className="rounded-2xl px-6 py-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f766e, #0891b2)' }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -left-6 -bottom-10 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
              🏥
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Clinic / Sick Bay</h1>
              <p className="text-sm text-white/70 mt-0.5">
                Student health visit tracking and management
              </p>
            </div>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowNewVisitModal(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30 backdrop-blur-sm"
            >
              <FiPlus size={16} /> New Visit
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Visits',
            value: totalVisits,
            sub: 'Current term',
            color: '#0f766e',
            borderColor: 'border-l-teal-500',
            bg: 'bg-teal-50',
            icon: <FiActivity size={20} className="text-teal-500" />,
          },
          {
            label: 'Active Patients',
            value: activePatients,
            sub: 'Not yet discharged',
            color: '#ea580c',
            borderColor: 'border-l-orange-500',
            bg: 'bg-orange-50',
            icon: <FiClock size={20} className="text-orange-500" />,
          },
          {
            label: 'Referrals Made',
            value: referralsMade,
            sub: 'External referrals',
            color: '#dc2626',
            borderColor: 'border-l-red-500',
            bg: 'bg-red-50',
            icon: <FiExternalLink size={20} className="text-red-500" />,
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 ${card.borderColor} flex items-center gap-4`}
          >
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-extrabold text-gray-800">{card.value}</p>
              <p className="text-[11px] text-gray-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Term Filter ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Filter by Term:
        </label>
        <select
          value={selectedTermId}
          onChange={(e) => setSelectedTermId(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none min-w-[200px]"
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.term_name} {t.academic_year} {t.is_current ? '(Current)' : ''}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          Showing {visits.length} visit{visits.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Visit Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <FiActivity size={16} className="text-teal-600" />
            Visit Records
          </h2>
          <span className="text-xs text-gray-400">{visits.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <VisitTable
            visits={visits}
            currentTermId={currentTermId}
            canWrite={canWrite}
            onDischarge={handleDischarge}
            onStudentClick={(student) => setHistoryStudent(student)}
          />
        )}
      </div>

      {/* ── Modals / Drawers ── */}
      {showNewVisitModal && (
        <NewVisitModal
          students={students}
          terms={terms}
          currentTermId={currentTermId}
          userRole={userRole}
          userId={userId}
          onClose={() => setShowNewVisitModal(false)}
          onSaved={() => fetchVisits(selectedTermId)}
        />
      )}

      {historyStudent && (
        <StudentVisitHistoryDrawer
          student={historyStudent}
          currentTermId={currentTermId}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </div>
  );
}
