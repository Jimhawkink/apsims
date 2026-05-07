'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiHome, FiUsers, FiCalendar, FiAlertTriangle,
  FiCheckCircle, FiEdit2, FiGrid, FiDollarSign, FiShield,
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Hostel {
  id: number;
  dorm_name: string;
  gender: string;
  floor_number: number;
  total_capacity: number;
  matron_id?: number;
  is_active: boolean;
  occupied_beds: number;
  occupancy_rate: number;
  school_teachers?: { id: number; full_name: string };
}

interface BedAllocation {
  id: number;
  hostel_id: number;
  student_id: number;
  bed_number: string;
  term_id: number;
  allocation_date: string;
  deallocation_date?: string;
  is_active: boolean;
  school_students?: { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string };
  school_hostels?: { id: number; dorm_name: string };
}

interface AttendanceItem {
  student_id: number;
  status: 'Present' | 'Absent' | 'On Leave';
  remarks: string;
  student_name?: string;
}

interface LeavePass {
  id: number;
  student_id: number;
  departure_datetime: string;
  expected_return_datetime: string;
  actual_return_datetime?: string | null;
  destination: string;
  reason: string;
  sms_sent: boolean;
  school_students?: { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string };
}

interface DisciplineIncident {
  id: number;
  student_id: number;
  hostel_id?: number;
  incident_date: string;
  description: string;
  action_taken?: string;
  recorded_by?: number;
  school_students?: { id: number; first_name: string; last_name: string };
  school_hostels?: { id: number; dorm_name: string };
}

interface FeeOutstanding {
  student_id: number;
  student_name: string;
  admission_no: string;
  form_name: string;
  expected_fee: number;
  amount_paid: number;
  balance: number;
}

interface Term { id: number; term_name: string; academic_year: string; is_current: boolean; }
interface Teacher { id: number; full_name: string; }
interface Student { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string; }

type Tab = 'dormitories' | 'beds' | 'attendance' | 'leave-passes' | 'discipline' | 'fees';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function admNo(s: any) { return s?.admission_number || s?.admission_no || '-'; }
function sName(s: any) { return s ? `${s.first_name} ${s.last_name}` : 'Unknown'; }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all';
const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

// ─── Create Dorm Modal ────────────────────────────────────────────────────────

function CreateDormModal({ teachers, dorm, onClose, onSaved }: {
  teachers: Teacher[]; dorm?: Hostel | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    dorm_name: dorm?.dorm_name || '',
    gender: dorm?.gender || 'Male',
    floor_number: dorm?.floor_number || 1,
    total_capacity: dorm?.total_capacity || 0,
    matron_id: dorm?.matron_id || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.dorm_name.trim()) return toast.error('Dorm name is required');
    if (!form.total_capacity || form.total_capacity < 1) return toast.error('Capacity must be at least 1');
    setSaving(true);
    try {
      const url = dorm ? `/api/hostel/dormitories/${dorm.id}` : '/api/hostel/dormitories';
      const method = dorm ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, matron_id: form.matron_id || null }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save dorm');
      toast.success(dorm ? 'Dorm updated ✅' : 'Dorm created ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <h2 className="text-lg font-bold text-white">{dorm ? 'Edit Dormitory' : 'New Dormitory'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Dorm Name *</label><input type="text" value={form.dorm_name} onChange={e => setForm({ ...form, dorm_name: e.target.value })} className={inp} placeholder="e.g. Block A - Boys" /></div>
          <div><label className={lbl}>Gender *</label>
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inp}>
              <option value="Male">Male</option><option value="Female">Female</option><option value="Mixed">Mixed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Floor Number</label><input type="number" min={1} value={form.floor_number} onChange={e => setForm({ ...form, floor_number: Number(e.target.value) })} className={inp} /></div>
            <div><label className={lbl}>Total Capacity *</label><input type="number" min={1} value={form.total_capacity} onChange={e => setForm({ ...form, total_capacity: Number(e.target.value) })} className={inp} /></div>
          </div>
          <div><label className={lbl}>Matron / Warden</label>
            <select value={form.matron_id} onChange={e => setForm({ ...form, matron_id: e.target.value })} className={inp}>
              <option value="">-- None --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            {dorm ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bed Map Modal ────────────────────────────────────────────────────────────

function BedMapModal({ hostel, beds, onClose }: { hostel: Hostel; beds: BedAllocation[]; onClose: () => void; }) {
  const activeBeds = beds.filter(b => b.hostel_id === hostel.id && b.is_active);
  const occupiedNums = new Set(activeBeds.map(b => b.bed_number));
  const allBeds = Array.from({ length: hostel.total_capacity }, (_, i) => String(i + 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between border-b">
          <h3 className="font-bold text-gray-800">Bed Map — {hostel.dorm_name}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={16} /></button>
        </div>
        <div className="p-6">
          <div className="flex gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-400 inline-block" /> Occupied</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-200 inline-block" /> Available</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {allBeds.map(num => {
              const occupied = occupiedNums.has(num);
              const bed = activeBeds.find(b => b.bed_number === num);
              return (
                <div key={num} title={occupied && bed ? sName(bed.school_students) : 'Available'}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold cursor-default transition ${occupied ? 'bg-green-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {num}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">{activeBeds.length} / {hostel.total_capacity} beds occupied</p>
        </div>
      </div>
    </div>
  );
}

// ─── Allocate Bed Modal ───────────────────────────────────────────────────────

function AllocateBedModal({ hostels, students, terms, onClose, onSaved }: {
  hostels: Hostel[]; students: Student[]; terms: Term[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ student_id: 0, hostel_id: 0, bed_number: '', term_id: 0 });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? students.filter(s => `${s.first_name} ${s.last_name} ${admNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
  const selectedStudent = students.find(s => s.id === form.student_id);

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.hostel_id) return toast.error('Select a dorm');
    if (!form.bed_number.trim()) return toast.error('Enter bed number');
    if (!form.term_id) return toast.error('Select a term');
    setSaving(true);
    try {
      const res = await fetch('/api/hostel/beds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (res.status === 409) throw new Error(result.error);
      if (!res.ok) throw new Error(result.error || 'Failed to allocate bed');
      toast.success('Bed allocated successfully ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <h2 className="text-lg font-bold text-white">Allocate Bed</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Student *</label>
            <div className="relative">
              <input type="text"
                value={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name} (${admNo(selectedStudent)})` : q}
                onChange={e => { setQ(e.target.value); setForm({ ...form, student_id: 0 }); }}
                placeholder="Search student..." className={inp} />
              {q && !form.student_id && filtered.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filtered.map(s => (
                    <div key={s.id} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id }); setQ(''); }}>
                      {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">({admNo(s)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className={lbl}>Dormitory *</label>
            <select value={form.hostel_id} onChange={e => setForm({ ...form, hostel_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Dorm --</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.dorm_name} ({h.gender})</option>)}
            </select>
          </div>
          <div><label className={lbl}>Bed Number *</label>
            <input type="text" value={form.bed_number} onChange={e => setForm({ ...form, bed_number: e.target.value })} placeholder="e.g. 12" className={inp} />
          </div>
          <div><label className={lbl}>Term *</label>
            <select value={form.term_id} onChange={e => setForm({ ...form, term_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Term --</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Allocate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Leave Pass Modal ──────────────────────────────────────────────────

function CreateLeavePassModal({ students, onClose, onSaved }: {
  students: Student[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    student_id: 0,
    departure_datetime: '',
    expected_return_datetime: '',
    destination: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? students.filter(s => `${s.first_name} ${s.last_name} ${admNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
  const selectedStudent = students.find(s => s.id === form.student_id);

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.departure_datetime) return toast.error('Departure date/time is required');
    if (!form.expected_return_datetime) return toast.error('Expected return date/time is required');
    if (!form.destination.trim()) return toast.error('Destination is required');
    if (!form.reason.trim()) return toast.error('Reason is required');
    setSaving(true);
    try {
      const res = await fetch('/api/hostel/leave-passes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create leave pass');
      toast.success('Leave pass created ✅' + (result.data?.sms_sent ? ' — SMS sent to guardian' : ''));
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <h2 className="text-lg font-bold text-white">New Leave Pass</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Student *</label>
            <div className="relative">
              <input type="text"
                value={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name} (${admNo(selectedStudent)})` : q}
                onChange={e => { setQ(e.target.value); setForm({ ...form, student_id: 0 }); }}
                placeholder="Search student..." className={inp} />
              {q && !form.student_id && filtered.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filtered.map(s => (
                    <div key={s.id} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id }); setQ(''); }}>
                      {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">({admNo(s)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className={lbl}>Departure Date & Time *</label>
            <input type="datetime-local" value={form.departure_datetime} onChange={e => setForm({ ...form, departure_datetime: e.target.value })} className={inp} />
          </div>
          <div><label className={lbl}>Expected Return Date & Time *</label>
            <input type="datetime-local" value={form.expected_return_datetime} onChange={e => setForm({ ...form, expected_return_datetime: e.target.value })} className={inp} />
          </div>
          <div><label className={lbl}>Destination *</label>
            <input type="text" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Nairobi, Home" className={inp} />
          </div>
          <div><label className={lbl}>Reason *</label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Reason for leave..." className={inp} />
          </div>
          <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">📱 An SMS will be sent to the student's guardian upon saving.</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Create Pass
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Incident Modal ────────────────────────────────────────────────────

function RecordIncidentModal({ students, hostels, onClose, onSaved }: {
  students: Student[]; hostels: Hostel[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    student_id: 0, hostel_id: 0, incident_date: todayISO(), description: '', action_taken: '',
  });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? students.filter(s => `${s.first_name} ${s.last_name} ${admNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
  const selectedStudent = students.find(s => s.id === form.student_id);

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.description.trim()) return toast.error('Description is required');
    setSaving(true);
    try {
      const res = await fetch('/api/hostel/discipline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hostel_id: form.hostel_id || null }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to record incident');
      toast.success('Incident recorded ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <h2 className="text-lg font-bold text-white">Record Discipline Incident</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Student *</label>
            <div className="relative">
              <input type="text"
                value={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name} (${admNo(selectedStudent)})` : q}
                onChange={e => { setQ(e.target.value); setForm({ ...form, student_id: 0 }); }}
                placeholder="Search student..." className={inp} />
              {q && !form.student_id && filtered.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filtered.map(s => (
                    <div key={s.id} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id }); setQ(''); }}>
                      {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">({admNo(s)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className={lbl}>Dormitory</label>
            <select value={form.hostel_id} onChange={e => setForm({ ...form, hostel_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Dorm (optional) --</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.dorm_name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Incident Date *</label>
            <input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className={inp} />
          </div>
          <div><label className={lbl}>Description *</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the incident..." className={inp} />
          </div>
          <div><label className={lbl}>Action Taken</label>
            <textarea value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} rows={2} placeholder="Action taken (optional)..." className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Hostel Payment Modal ──────────────────────────────────────────────

function RecordHostelPaymentModal({ students, terms, onClose, onSaved }: {
  students: Student[]; terms: Term[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    student_id: 0, term_id: 0, amount: '', payment_method: 'Cash', receipt_number: '',
  });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? students.filter(s => `${s.first_name} ${s.last_name} ${admNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
  const selectedStudent = students.find(s => s.id === form.student_id);

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.term_id) return toast.error('Select a term');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      const res = await fetch('/api/hostel/fees/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to record payment');
      toast.success('Payment recorded ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <h2 className="text-lg font-bold text-white">Record Hostel Payment</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Student *</label>
            <div className="relative">
              <input type="text"
                value={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name} (${admNo(selectedStudent)})` : q}
                onChange={e => { setQ(e.target.value); setForm({ ...form, student_id: 0 }); }}
                placeholder="Search student..." className={inp} />
              {q && !form.student_id && filtered.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filtered.map(s => (
                    <div key={s.id} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id }); setQ(''); }}>
                      {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">({admNo(s)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className={lbl}>Term *</label>
            <select value={form.term_id} onChange={e => setForm({ ...form, term_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Term --</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Amount (KES) *</label>
            <input type="number" min={1} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 15000" className={inp} />
          </div>
          <div><label className={lbl}>Payment Method *</label>
            <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className={inp}>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="M-Pesa">M-Pesa</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div><label className={lbl}>Receipt Number</label>
            <input type="text" value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} placeholder="e.g. RCP-001" className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dormitory Grid ───────────────────────────────────────────────────────────

function DormitoryGrid({ hostels, beds, canWrite, onEdit, onViewBeds, onNew }: {
  hostels: Hostel[]; beds: BedAllocation[]; canWrite: boolean;
  onEdit: (h: Hostel) => void; onViewBeds: (h: Hostel) => void; onNew: () => void;
}) {
  const genderColor = (g: string) => g === 'Male' ? 'bg-blue-100 text-blue-700' : g === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700';
  const barColor = (rate: number) => rate >= 90 ? 'bg-red-500' : rate >= 70 ? 'bg-orange-400' : rate >= 50 ? 'bg-yellow-400' : 'bg-green-500';

  if (hostels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">🏠</span>
        <p className="text-sm font-semibold">No dormitories yet</p>
        {canWrite && <button onClick={onNew} className="mt-3 px-4 py-2 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>Add First Dorm</button>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {hostels.map(h => (
        <div key={h.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{h.dorm_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Floor {h.floor_number}</p>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${genderColor(h.gender)}`}>{h.gender}</span>
          </div>
          {h.school_teachers && (
            <p className="text-xs text-gray-500 mb-3">Matron: <span className="font-semibold">{h.school_teachers.full_name}</span></p>
          )}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Occupancy</span>
              <span className="font-bold">{h.occupied_beds}/{h.total_capacity} ({h.occupancy_rate}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${barColor(h.occupancy_rate)}`} style={{ width: `${h.occupancy_rate}%` }} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => onViewBeds(h)} className="flex-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-1">
              <FiGrid size={11} /> View Beds
            </button>
            {canWrite && (
              <button onClick={() => onEdit(h)} className="flex-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-1">
                <FiEdit2 size={11} /> Edit
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bed Allocation Table ─────────────────────────────────────────────────────

function BedAllocationTable({ beds, canWrite, onDeallocate }: {
  beds: BedAllocation[]; canWrite: boolean; onDeallocate: (b: BedAllocation) => void;
}) {
  if (beds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">🛏️</span>
        <p className="text-sm font-semibold">No bed allocations found</p>
        <p className="text-xs mt-1">Try adjusting the filters or allocate a bed</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Student Name', 'Adm No', 'Dormitory', 'Bed No', 'Allocation Date', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {beds.map(b => (
            <tr key={b.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td className="px-4 py-3 font-semibold text-gray-800">{sName(b.school_students)}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{admNo(b.school_students)}</td>
              <td className="px-4 py-3 text-gray-700">{b.school_hostels?.dorm_name || '-'}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">{b.bed_number}</span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(b.allocation_date)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.is_active ? '● Active' : '○ Deallocated'}
                </span>
              </td>
              <td className="px-4 py-3">
                {canWrite && b.is_active && (
                  <button onClick={() => onDeallocate(b)}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                    Deallocate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Roll Call Table ──────────────────────────────────────────────────────────

function RollCallTable({ items, onChange }: {
  items: AttendanceItem[];
  onChange: (studentId: number, field: 'status' | 'remarks', value: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <span className="text-4xl mb-2">📋</span>
        <p className="text-sm font-semibold">No students in this dorm for the selected term</p>
      </div>
    );
  }

  const statusBtn = (current: string, value: string, color: string) =>
    `px-3 py-1 text-xs font-bold rounded-lg border transition ${current === value ? `${color} border-transparent` : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Student', 'Status', 'Remarks'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.student_id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td className="px-4 py-3 font-semibold text-gray-800">{item.student_name}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button className={statusBtn(item.status, 'Present', 'bg-green-500 text-white')}
                    onClick={() => onChange(item.student_id, 'status', 'Present')}>Present</button>
                  <button className={statusBtn(item.status, 'Absent', 'bg-red-500 text-white')}
                    onClick={() => onChange(item.student_id, 'status', 'Absent')}>Absent</button>
                  <button className={statusBtn(item.status, 'On Leave', 'bg-orange-400 text-white')}
                    onClick={() => onChange(item.student_id, 'status', 'On Leave')}>On Leave</button>
                </div>
              </td>
              <td className="px-4 py-3">
                <input type="text" value={item.remarks} onChange={e => onChange(item.student_id, 'remarks', e.target.value)}
                  placeholder="Remarks..." className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Leave Pass Table ─────────────────────────────────────────────────────────

function LeavePassTable({ passes, canWrite, onReturn }: {
  passes: LeavePass[]; canWrite: boolean; onReturn: (p: LeavePass) => void;
}) {
  const now = new Date();

  const getStatus = (p: LeavePass) => {
    if (p.actual_return_datetime) return { label: 'Returned', cls: 'bg-green-100 text-green-700' };
    if (new Date(p.expected_return_datetime) < now) return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
    return { label: 'Active', cls: 'bg-orange-100 text-orange-700' };
  };

  if (passes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">🚪</span>
        <p className="text-sm font-semibold">No leave passes found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Student', 'Departure', 'Expected Return', 'Actual Return', 'Destination', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {passes.map(p => {
            const status = getStatus(p);
            const isActive = !p.actual_return_datetime;
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="px-4 py-3 font-semibold text-gray-800">{sName(p.school_students)}</td>
                <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDT(p.departure_datetime)}</td>
                <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDT(p.expected_return_datetime)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {p.actual_return_datetime ? fmtDT(p.actual_return_datetime) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-[120px]"><p className="line-clamp-1">{p.destination}</p></td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${status.cls}`}>{status.label}</span>
                </td>
                <td className="px-4 py-3">
                  {canWrite && isActive && (
                    <button onClick={() => onReturn(p)}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition whitespace-nowrap">
                      Record Return
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

// ─── Discipline Table ─────────────────────────────────────────────────────────

function DisciplineTable({ incidents }: { incidents: DisciplineIncident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">📝</span>
        <p className="text-sm font-semibold">No discipline incidents found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Student', 'Dormitory', 'Date', 'Description', 'Action Taken', 'Recorded By'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map(inc => (
            <tr key={inc.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td className="px-4 py-3 font-semibold text-gray-800">{sName(inc.school_students)}</td>
              <td className="px-4 py-3 text-gray-600">{inc.school_hostels?.dorm_name || '—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(inc.incident_date)}</td>
              <td className="px-4 py-3 text-gray-700 max-w-[200px]"><p className="line-clamp-2">{inc.description}</p></td>
              <td className="px-4 py-3 text-gray-600 max-w-[160px]"><p className="line-clamp-2">{inc.action_taken || '—'}</p></td>
              <td className="px-4 py-3 text-gray-400 text-xs">{inc.recorded_by ? `Staff #${inc.recorded_by}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Fee Outstanding Table ────────────────────────────────────────────────────

function FeeOutstandingTable({ fees, canWrite, onPayment }: {
  fees: FeeOutstanding[]; canWrite: boolean; onPayment: () => void;
}) {
  if (fees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">💰</span>
        <p className="text-sm font-semibold">No fee records found</p>
        <p className="text-xs mt-1">Ensure hostel fee structures are set up for this term</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {['Student', 'Form', 'Expected Fee', 'Amount Paid', 'Balance'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fees.map(f => (
            <tr key={f.student_id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-800">{f.student_name}</p>
                <p className="text-xs text-gray-400">{f.admission_no}</p>
              </td>
              <td className="px-4 py-3 text-gray-600">{f.form_name}</td>
              <td className="px-4 py-3 text-gray-700 font-medium">KES {f.expected_fee.toLocaleString()}</td>
              <td className="px-4 py-3 text-green-700 font-medium">KES {f.amount_paid.toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className={`font-bold ${f.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {f.balance > 0 ? `KES ${f.balance.toLocaleString()}` : '✓ Paid'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// â”€â”€â”€ Main Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function HostelPage() {
  const [tab, setTab] = useState<Tab>('dormitories');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [beds, setBeds] = useState<BedAllocation[]>([]);
  const [leavePasses, setLeavePasses] = useState<LeavePass[]>([]);
  const [discipline, setDiscipline] = useState<DisciplineIncident[]>([]);
  const [feeOutstanding, setFeeOutstanding] = useState<FeeOutstanding[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Modals
  const [showCreateDorm, setShowCreateDorm] = useState(false);
  const [editDorm, setEditDorm] = useState<Hostel | null>(null);
  const [bedMapDorm, setBedMapDorm] = useState<Hostel | null>(null);
  const [showAllocateBed, setShowAllocateBed] = useState(false);
  const [showLeavePass, setShowLeavePass] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Filters
  const [bedFilters, setBedFilters] = useState({ hostel_id: 0, term_id: 0 });
  const [attFilters, setAttFilters] = useState({ hostel_id: 0, date: todayISO(), roll_call_type: 'Morning' });
  const [attItems, setAttItems] = useState<AttendanceItem[]>([]);
  const [discFilters, setDiscFilters] = useState({ hostel_id: 0, date_from: '', date_to: '' });

  // Fetch session/role
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(j => { if (j.user) setUserRole(j.user.role || ''); })
      .catch(() => {});
  }, []);

  // Fetch reference data
  useEffect(() => {
    Promise.all([
      fetch('/api/teachers').then(r => r.json()).then(j => setTeachers(j.data || [])),
      fetch('/api/students').then(r => r.json()).then(j => setStudents(j.data || [])),
      fetch('/api/terms').then(r => r.json()).then(j => setTerms(j.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  // Fetch dormitories
  const fetchDorms = useCallback(async () => {
    try {
      const res = await fetch('/api/hostel/dormitories');
      const result = await res.json();
      setHostels(result.data || []);
    } catch { toast.error('Failed to load dormitories'); }
  }, []);

  // Fetch beds
  const fetchBeds = useCallback(async () => {
    const params = new URLSearchParams();
    if (bedFilters.hostel_id) params.set('hostel_id', String(bedFilters.hostel_id));
    if (bedFilters.term_id) params.set('term_id', String(bedFilters.term_id));
    try {
      const res = await fetch(`/api/hostel/beds?${params}`);
      const result = await res.json();
      setBeds(result.data || []);
    } catch { toast.error('Failed to load bed allocations'); }
  }, [bedFilters]);

  // Fetch leave passes
  const fetchLeavePasses = useCallback(async () => {
    try {
      const res = await fetch('/api/hostel/leave-passes');
      const result = await res.json();
      setLeavePasses(result.data || []);
    } catch { toast.error('Failed to load leave passes'); }
  }, []);

  // Fetch discipline
  const fetchDiscipline = useCallback(async () => {
    const params = new URLSearchParams();
    if (discFilters.hostel_id) params.set('hostel_id', String(discFilters.hostel_id));
    if (discFilters.date_from) params.set('date_from', discFilters.date_from);
    if (discFilters.date_to) params.set('date_to', discFilters.date_to);
    try {
      const res = await fetch(`/api/hostel/discipline?${params}`);
      const result = await res.json();
      setDiscipline(result.data || []);
    } catch { toast.error('Failed to load discipline records'); }
  }, [discFilters]);

  // Fetch fee outstanding
  const fetchFees = useCallback(async () => {
    try {
      const res = await fetch('/api/hostel/fees/outstanding');
      const result = await res.json();
      setFeeOutstanding(result.data || []);
    } catch { toast.error('Failed to load fee records'); }
  }, []);

  // Fetch attendance
  const fetchAttendance = useCallback(async () => {
    if (!attFilters.hostel_id) return;
    try {
      const res = await fetch(`/api/hostel/attendance?hostel_id=${attFilters.hostel_id}&date=${attFilters.date}`);
      const result = await res.json();
      const sessions = result.data || [];
      const session = sessions.find((s: any) => s.roll_call_type === attFilters.roll_call_type);
      if (session && session.school_hostel_attendance_items) {
        const items = session.school_hostel_attendance_items.map((item: any) => ({
          student_id: item.student_id,
          status: item.status,
          remarks: item.remarks || '',
          student_name: sName(item.school_students),
        }));
        setAttItems(items);
      } else {
        // No session yet, build from bed allocations
        const currentTerm = terms.find(t => t.is_current);
        if (currentTerm) {
          const bedsRes = await fetch(`/api/hostel/beds?hostel_id=${attFilters.hostel_id}&term_id=${currentTerm.id}`);
          const bedsData = await bedsRes.json();
          const activeBeds = (bedsData.data || []).filter((b: BedAllocation) => b.is_active);
          setAttItems(activeBeds.map((b: BedAllocation) => ({
            student_id: b.student_id,
            status: 'Present' as const,
            remarks: '',
            student_name: sName(b.school_students),
          })));
        }
      }
    } catch { toast.error('Failed to load attendance'); }
  }, [attFilters, terms]);

  useEffect(() => { fetchDorms(); }, [fetchDorms]);
  useEffect(() => { if (tab === 'beds') fetchBeds(); }, [tab, fetchBeds]);
  useEffect(() => { if (tab === 'leave-passes') fetchLeavePasses(); }, [tab, fetchLeavePasses]);
  useEffect(() => { if (tab === 'discipline') fetchDiscipline(); }, [tab, fetchDiscipline]);
  useEffect(() => { if (tab === 'fees') fetchFees(); }, [tab, fetchFees]);
  useEffect(() => { if (tab === 'attendance') fetchAttendance(); }, [tab, fetchAttendance]);

  const canWrite = ['admin'].includes(userRole?.toLowerCase());

  // Handlers
  const handleDeallocate = async (bed: BedAllocation) => {
    if (!confirm(`Deallocate bed ${bed.bed_number} for ${sName(bed.school_students)}?`)) return;
    try {
      const res = await fetch(`/api/hostel/beds/${bed.id}/deallocate`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to deallocate');
      toast.success('Bed deallocated âœ…');
      fetchBeds();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReturnLeave = async (pass: LeavePass) => {
    if (!confirm(`Record return for ${sName(pass.school_students)}?`)) return;
    try {
      const res = await fetch(`/api/hostel/leave-passes/${pass.id}/return`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('Failed to record return');
      toast.success('Return recorded âœ…');
      fetchLeavePasses();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveRollCall = async () => {
    if (!attFilters.hostel_id) return toast.error('Select a dorm');
    try {
      const res = await fetch('/api/hostel/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostel_id: attFilters.hostel_id,
          roll_call_type: attFilters.roll_call_type,
          roll_call_date: attFilters.date,
          items: attItems.map(item => ({ student_id: item.student_id, status: item.status, remarks: item.remarks })),
        }),
      });
      if (!res.ok) throw new Error('Failed to save roll call');
      toast.success('Roll call saved âœ…');
      fetchAttendance();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAttChange = (studentId: number, field: 'status' | 'remarks', value: string) => {
    setAttItems(prev => prev.map(item => item.student_id === studentId ? { ...item, [field]: value } : item));
  };

  const overduePasses = leavePasses.filter(p => !p.actual_return_datetime && new Date(p.expected_return_datetime) < new Date());
  const attSummary = {
    present: attItems.filter(i => i.status === 'Present').length,
    absent: attItems.filter(i => i.status === 'Absent').length,
    onLeave: attItems.filter(i => i.status === 'On Leave').length,
  };

  const tabBtn = (t: Tab, icon: any, label: string) => (
    <button onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2 ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
      {icon} {label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl px-6 py-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -left-6 -bottom-10 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">ðŸ </div>
            <div>
              <h1 className="text-xl font-extrabold">Hostel / Boarding Management</h1>
              <p className="text-sm text-white/70 mt-0.5">Manage dormitories, beds, attendance, and fees</p>
            </div>
          </div>
          {canWrite && tab === 'dormitories' && (
            <button onClick={() => setShowCreateDorm(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> New Dorm
            </button>
          )}
          {canWrite && tab === 'beds' && (
            <button onClick={() => setShowAllocateBed(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> Allocate Bed
            </button>
          )}
          {canWrite && tab === 'leave-passes' && (
            <button onClick={() => setShowLeavePass(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> New Leave Pass
            </button>
          )}
          {canWrite && tab === 'discipline' && (
            <button onClick={() => setShowIncident(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> Record Incident
            </button>
          )}
          {canWrite && tab === 'fees' && (
            <button onClick={() => setShowPayment(true)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-1 flex flex-wrap gap-1">
        {tabBtn('dormitories', <FiHome size={14} />, 'Dormitories')}
        {tabBtn('beds', <FiUsers size={14} />, 'Beds')}
        {tabBtn('attendance', <FiCalendar size={14} />, 'Attendance')}
        {tabBtn('leave-passes', <FiAlertTriangle size={14} />, 'Leave Passes')}
        {tabBtn('discipline', <FiShield size={14} />, 'Discipline')}
        {tabBtn('fees', <FiDollarSign size={14} />, 'Fees')}
      </div>

      {/* Tab Content */}
      {tab === 'dormitories' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <DormitoryGrid hostels={hostels} beds={beds} canWrite={canWrite}
            onEdit={h => { setEditDorm(h); setShowCreateDorm(true); }}
            onViewBeds={h => setBedMapDorm(h)}
            onNew={() => setShowCreateDorm(true)} />
        </div>
      )}

      {tab === 'beds' && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Dorm:</label>
            <select value={bedFilters.hostel_id} onChange={e => setBedFilters({ ...bedFilters, hostel_id: Number(e.target.value) })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value={0}>All Dorms</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.dorm_name}</option>)}
            </select>
            <label className="text-xs font-bold text-gray-500 uppercase">Term:</label>
            <select value={bedFilters.term_id} onChange={e => setBedFilters({ ...bedFilters, term_id: Number(e.target.value) })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value={0}>All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Bed Allocations</h2>
              <span className="text-xs text-gray-400">{beds.length} allocation{beds.length !== 1 ? 's' : ''}</span>
            </div>
            <BedAllocationTable beds={beds} canWrite={canWrite} onDeallocate={handleDeallocate} />
          </div>
        </>
      )}

      {tab === 'attendance' && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Dorm:</label>
            <select value={attFilters.hostel_id} onChange={e => setAttFilters({ ...attFilters, hostel_id: Number(e.target.value) })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value={0}>-- Select Dorm --</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.dorm_name}</option>)}
            </select>
            <label className="text-xs font-bold text-gray-500 uppercase">Date:</label>
            <input type="date" value={attFilters.date} onChange={e => setAttFilters({ ...attFilters, date: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
            <div className="flex gap-1">
              <button onClick={() => setAttFilters({ ...attFilters, roll_call_type: 'Morning' })}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition ${attFilters.roll_call_type === 'Morning' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Morning
              </button>
              <button onClick={() => setAttFilters({ ...attFilters, roll_call_type: 'Evening' })}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition ${attFilters.roll_call_type === 'Evening' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Evening
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-green-500">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Present</p>
              <p className="text-2xl font-extrabold text-gray-800">{attSummary.present}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-red-500">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Absent</p>
              <p className="text-2xl font-extrabold text-gray-800">{attSummary.absent}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-orange-400">
              <p className="text-[11px] font-bold text-gray-400 uppercase">On Leave</p>
              <p className="text-2xl font-extrabold text-gray-800">{attSummary.onLeave}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Roll Call</h2>
              {canWrite && attItems.length > 0 && (
                <button onClick={handleSaveRollCall}
                  className="px-4 py-2 text-xs font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  Save Roll Call
                </button>
              )}
            </div>
            <RollCallTable items={attItems} onChange={handleAttChange} />
          </div>
        </>
      )}

      {tab === 'leave-passes' && (
        <>
          {overduePasses.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FiAlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800 text-sm">Overdue Leave Passes</h3>
                  <p className="text-xs text-red-600 mt-1">The following students have not returned by their expected return date:</p>
                  <ul className="mt-2 space-y-1">
                    {overduePasses.map(p => (
                      <li key={p.id} className="text-xs text-red-700">â€¢ {sName(p.school_students)} â€” Expected: {fmtDT(p.expected_return_datetime)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Leave Passes</h2>
              <span className="text-xs text-gray-400">{leavePasses.length} pass{leavePasses.length !== 1 ? 'es' : ''}</span>
            </div>
            <LeavePassTable passes={leavePasses} canWrite={canWrite} onReturn={handleReturnLeave} />
          </div>
        </>
      )}

      {tab === 'discipline' && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Dorm:</label>
            <select value={discFilters.hostel_id} onChange={e => setDiscFilters({ ...discFilters, hostel_id: Number(e.target.value) })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value={0}>All Dorms</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.dorm_name}</option>)}
            </select>
            <label className="text-xs font-bold text-gray-500 uppercase">From:</label>
            <input type="date" value={discFilters.date_from} onChange={e => setDiscFilters({ ...discFilters, date_from: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
            <label className="text-xs font-bold text-gray-500 uppercase">To:</label>
            <input type="date" value={discFilters.date_to} onChange={e => setDiscFilters({ ...discFilters, date_to: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Discipline Incidents</h2>
              <span className="text-xs text-gray-400">{discipline.length} incident{discipline.length !== 1 ? 's' : ''}</span>
            </div>
            <DisciplineTable incidents={discipline} />
          </div>
        </>
      )}

      {tab === 'fees' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Hostel Fee Outstanding</h2>
            <span className="text-xs text-gray-400">{feeOutstanding.length} student{feeOutstanding.length !== 1 ? 's' : ''}</span>
          </div>
          <FeeOutstandingTable fees={feeOutstanding} canWrite={canWrite} onPayment={() => setShowPayment(true)} />
        </div>
      )}

      {/* Modals */}
      {showCreateDorm && (
        <CreateDormModal teachers={teachers} dorm={editDorm} onClose={() => { setShowCreateDorm(false); setEditDorm(null); }} onSaved={() => { fetchDorms(); setShowCreateDorm(false); setEditDorm(null); }} />
      )}
      {bedMapDorm && (
        <BedMapModal hostel={bedMapDorm} beds={beds} onClose={() => setBedMapDorm(null)} />
      )}
      {showAllocateBed && (
        <AllocateBedModal hostels={hostels} students={students} terms={terms} onClose={() => setShowAllocateBed(false)} onSaved={() => { fetchBeds(); setShowAllocateBed(false); }} />
      )}
      {showLeavePass && (
        <CreateLeavePassModal students={students} onClose={() => setShowLeavePass(false)} onSaved={() => { fetchLeavePasses(); setShowLeavePass(false); }} />
      )}
      {showIncident && (
        <RecordIncidentModal students={students} hostels={hostels} onClose={() => setShowIncident(false)} onSaved={() => { fetchDiscipline(); setShowIncident(false); }} />
      )}
      {showPayment && (
        <RecordHostelPaymentModal students={students} terms={terms} onClose={() => setShowPayment(false)} onSaved={() => { fetchFees(); setShowPayment(false); }} />
      )}
    </div>
  );
}
