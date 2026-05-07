'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiTruck, FiUsers, FiMap, FiDollarSign,
  FiMessageSquare, FiAlertTriangle, FiCheckCircle, FiNavigation,
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Driver {
  id: number;
  full_name: string;
  phone: string;
  national_id: string;
  licence_number: string;
  licence_expiry_date: string;
  is_active: boolean;
}

interface Vehicle {
  id: number;
  registration_no: string;
  make_model: string;
  seating_capacity: number;
  driver_id?: number;
  is_active: boolean;
  school_transport_drivers?: Driver;
}

interface RouteStop {
  order: number;
  name: string;
  distance_km: number;
}

interface TransportRoute {
  id: number;
  route_name: string;
  stops: RouteStop[];
  stops_count: number;
  total_distance_km?: number;
  vehicle_id?: number;
  is_active: boolean;
  assigned_count: number;
  vehicle_capacity: number;
  school_transport_vehicles?: Vehicle;
}

interface Assignment {
  id: number;
  student_id: number;
  route_id: number;
  pickup_stop: string;
  assignment_date: string;
  term_id: number;
  is_active: boolean;
  school_students?: { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string; form_id?: number; school_forms?: { form_name: string } };
  school_transport_routes?: { id: number; route_name: string };
}

interface FeeOutstanding {
  student_id: number;
  student_name: string;
  admission_no: string;
  form_name: string;
  route_id: number;
  route_name: string;
  expected_fee: number;
  amount_paid: number;
  balance: number;
}

interface SmsLog {
  id: number;
  route_id: number;
  notification_type: 'Departed' | 'Arrived';
  message_content: string;
  recipient_phone: string;
  student_id?: number;
  sent_at: string;
  delivery_status: string;
  school_transport_routes?: { id: number; route_name: string };
  school_students?: { id: number; first_name: string; last_name: string };
}

interface Term { id: number; term_name: string; academic_year: string; is_current: boolean; }
interface Student { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string; }

type Tab = 'vehicles' | 'drivers' | 'routes' | 'assignments' | 'fees' | 'sms-logs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function admNo(s: any) { return s?.admission_number || s?.admission_no || '-'; }
function sName(s: any) { return s ? `${s.first_name} ${s.last_name}` : 'Unknown'; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all';
const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';
const GRAD = 'linear-gradient(135deg, #0369a1, #0891b2)';

// ─── Register Vehicle Modal ───────────────────────────────────────────────────

function RegisterVehicleModal({ drivers, onClose, onSaved }: {
  drivers: Driver[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ registration_no: '', make_model: '', seating_capacity: '', driver_id: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.registration_no.trim()) return toast.error('Registration number is required');
    if (!form.make_model.trim()) return toast.error('Make/Model is required');
    if (!form.seating_capacity || Number(form.seating_capacity) < 1) return toast.error('Seating capacity must be at least 1');
    setSaving(true);
    try {
      const res = await fetch('/api/transport/vehicles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, seating_capacity: Number(form.seating_capacity), driver_id: form.driver_id ? Number(form.driver_id) : null }),
      });
      const result = await res.json();
      if (res.status === 409) throw new Error(result.error);
      if (!res.ok) throw new Error(result.error || 'Failed to register vehicle');
      toast.success('Vehicle registered ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Register Vehicle</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Registration No *</label>
            <input type="text" value={form.registration_no} onChange={e => setForm({ ...form, registration_no: e.target.value })} placeholder="e.g. KAA 123A" className={inp} />
          </div>
          <div><label className={lbl}>Make / Model *</label>
            <input type="text" value={form.make_model} onChange={e => setForm({ ...form, make_model: e.target.value })} placeholder="e.g. Toyota Coaster" className={inp} />
          </div>
          <div><label className={lbl}>Seating Capacity *</label>
            <input type="number" min={1} value={form.seating_capacity} onChange={e => setForm({ ...form, seating_capacity: e.target.value })} placeholder="e.g. 30" className={inp} />
          </div>
          <div><label className={lbl}>Assigned Driver</label>
            <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} className={inp}>
              <option value="">-- None --</option>
              {drivers.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Register Driver Modal ────────────────────────────────────────────────────

function RegisterDriverModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({ full_name: '', phone: '', national_id: '', licence_number: '', licence_expiry_date: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Full name is required');
    if (!form.phone.trim()) return toast.error('Phone is required');
    if (!form.national_id.trim()) return toast.error('National ID is required');
    if (!form.licence_number.trim()) return toast.error('Licence number is required');
    if (!form.licence_expiry_date) return toast.error('Licence expiry date is required');
    setSaving(true);
    try {
      const res = await fetch('/api/transport/drivers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to register driver');
      toast.success('Driver registered ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Register Driver</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Full Name *</label>
            <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. John Kamau" className={inp} />
          </div>
          <div><label className={lbl}>Phone *</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0712345678" className={inp} />
          </div>
          <div><label className={lbl}>National ID *</label>
            <input type="text" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} placeholder="e.g. 12345678" className={inp} />
          </div>
          <div><label className={lbl}>Licence Number *</label>
            <input type="text" value={form.licence_number} onChange={e => setForm({ ...form, licence_number: e.target.value })} placeholder="e.g. DL-2024-001" className={inp} />
          </div>
          <div><label className={lbl}>Licence Expiry Date *</label>
            <input type="date" value={form.licence_expiry_date} onChange={e => setForm({ ...form, licence_expiry_date: e.target.value })} className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Route Modal ───────────────────────────────────────────────────────

function CreateRouteModal({ vehicles, onClose, onSaved }: {
  vehicles: Vehicle[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ route_name: '', total_distance_km: '', vehicle_id: '' });
  const [stops, setStops] = useState<{ name: string; distance_km: string }[]>([{ name: '', distance_km: '0' }]);
  const [saving, setSaving] = useState(false);

  const addStop = () => setStops([...stops, { name: '', distance_km: '' }]);
  const removeStop = (i: number) => setStops(stops.filter((_, idx) => idx !== i));
  const updateStop = (i: number, field: 'name' | 'distance_km', val: string) => {
    const updated = [...stops];
    updated[i] = { ...updated[i], [field]: val };
    setStops(updated);
  };

  const handleSubmit = async () => {
    if (!form.route_name.trim()) return toast.error('Route name is required');
    const stopsPayload = stops
      .filter(s => s.name.trim())
      .map((s, i) => ({ order: i + 1, name: s.name.trim(), distance_km: Number(s.distance_km) || 0 }));
    setSaving(true);
    try {
      const res = await fetch('/api/transport/routes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_name: form.route_name.trim(),
          stops: stopsPayload,
          total_distance_km: form.total_distance_km ? Number(form.total_distance_km) : null,
          vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create route');
      toast.success('Route created ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Create Route</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Route Name *</label>
            <input type="text" value={form.route_name} onChange={e => setForm({ ...form, route_name: e.target.value })} placeholder="e.g. Nairobi CBD Route" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Total Distance (km)</label>
              <input type="number" min={0} step={0.1} value={form.total_distance_km} onChange={e => setForm({ ...form, total_distance_km: e.target.value })} placeholder="e.g. 25.5" className={inp} />
            </div>
            <div><label className={lbl}>Assigned Vehicle</label>
              <select value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className={inp}>
                <option value="">-- None --</option>
                {vehicles.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.registration_no} ({v.make_model})</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl}>Stops</label>
              <button onClick={addStop} className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1"><FiPlus size={12} /> Add Stop</button>
            </div>
            <div className="space-y-2">
              {stops.map((stop, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                  <input type="text" value={stop.name} onChange={e => updateStop(i, 'name', e.target.value)} placeholder="Stop name" className={`${inp} flex-1`} />
                  <input type="number" min={0} step={0.1} value={stop.distance_km} onChange={e => updateStop(i, 'distance_km', e.target.value)} placeholder="km" className={`${inp} w-20`} />
                  {stops.length > 1 && (
                    <button onClick={() => removeStop(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><FiX size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Create Route
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Student Modal ─────────────────────────────────────────────────────

function AssignStudentModal({ routes, terms, students, onClose, onSaved }: {
  routes: TransportRoute[]; terms: Term[]; students: Student[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ student_id: 0, route_id: 0, pickup_stop: '', term_id: 0 });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? students.filter(s => `${s.first_name} ${s.last_name} ${admNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
  const selectedStudent = students.find(s => s.id === form.student_id);
  const selectedRoute = routes.find(r => r.id === form.route_id);
  const routeStops: RouteStop[] = selectedRoute?.stops || [];

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.route_id) return toast.error('Select a route');
    if (!form.pickup_stop.trim()) return toast.error('Select a pickup stop');
    if (!form.term_id) return toast.error('Select a term');
    setSaving(true);
    try {
      const res = await fetch('/api/transport/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await res.json();
      if (res.status === 409) throw new Error(result.error);
      if (!res.ok) throw new Error(result.error || 'Failed to assign student');
      toast.success('Student assigned ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Assign Student to Route</h2>
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
                    <div key={s.id} className="px-3 py-2 hover:bg-sky-50 cursor-pointer text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id }); setQ(''); }}>
                      {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">({admNo(s)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className={lbl}>Route *</label>
            <select value={form.route_id} onChange={e => setForm({ ...form, route_id: Number(e.target.value), pickup_stop: '' })} className={inp}>
              <option value={0}>-- Select Route --</option>
              {routes.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Pickup Stop *</label>
            {routeStops.length > 0 ? (
              <select value={form.pickup_stop} onChange={e => setForm({ ...form, pickup_stop: e.target.value })} className={inp}>
                <option value="">-- Select Stop --</option>
                {routeStops.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
              </select>
            ) : (
              <input type="text" value={form.pickup_stop} onChange={e => setForm({ ...form, pickup_stop: e.target.value })} placeholder="Enter pickup stop" className={inp} />
            )}
          </div>
          <div><label className={lbl}>Term *</label>
            <select value={form.term_id} onChange={e => setForm({ ...form, term_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Term --</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Transport Payment Modal ──────────────────────────────────────────

function RecordTransportPaymentModal({ students, routes, terms, onClose, onSaved }: {
  students: Student[]; routes: TransportRoute[]; terms: Term[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ student_id: 0, route_id: 0, term_id: 0, amount: '', payment_method: 'Cash', receipt_number: '' });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? students.filter(s => `${s.first_name} ${s.last_name} ${admNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
  const selectedStudent = students.find(s => s.id === form.student_id);

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.route_id) return toast.error('Select a route');
    if (!form.term_id) return toast.error('Select a term');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      const res = await fetch('/api/transport/fees/payments', {
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
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Record Transport Payment</h2>
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
                    <div key={s.id} className="px-3 py-2 hover:bg-sky-50 cursor-pointer text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id }); setQ(''); }}>
                      {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">({admNo(s)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className={lbl}>Route *</label>
            <select value={form.route_id} onChange={e => setForm({ ...form, route_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Route --</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Term *</label>
            <select value={form.term_id} onChange={e => setForm({ ...form, term_id: Number(e.target.value) })} className={inp}>
              <option value={0}>-- Select Term --</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Amount (KES) *</label>
            <input type="number" min={1} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" className={inp} />
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
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SMS Notification Trigger ─────────────────────────────────────────────────

function SmsNotificationTrigger({ routes, onSent }: { routes: TransportRoute[]; onSent: () => void; }) {
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [sending, setSending] = useState<'Departed' | 'Arrived' | null>(null);

  const sendNotification = async (type: 'Departed' | 'Arrived') => {
    if (!selectedRoute) return toast.error('Select a route first');
    if (type === 'Departed' && !departureTime) return toast.error('Enter departure time');
    if (type === 'Arrived' && !arrivalTime) return toast.error('Enter arrival time');
    setSending(type);
    try {
      const res = await fetch('/api/transport/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: selectedRoute,
          notification_type: type,
          departure_time: departureTime || undefined,
          arrival_time: arrivalTime || undefined,
          estimated_arrival: estimatedArrival || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send notifications');
      toast.success(`${type} SMS sent to ${result.data?.sent || 0} guardians ✅`);
      onSent();
    } catch (e: any) { toast.error(e.message); } finally { setSending(null); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiMessageSquare className="text-sky-600" /> Send Bus Notification</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div><label className={lbl}>Route *</label>
          <select value={selectedRoute} onChange={e => setSelectedRoute(Number(e.target.value))} className={inp}>
            <option value={0}>-- Select Route --</option>
            {routes.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Departure Time</label>
          <input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className={inp} />
        </div>
        <div><label className={lbl}>Arrival Time</label>
          <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className={inp} />
        </div>
        <div><label className={lbl}>ETA (for Departed)</label>
          <input type="time" value={estimatedArrival} onChange={e => setEstimatedArrival(e.target.value)} className={inp} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => sendNotification('Departed')} disabled={!!sending}
          className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50 bg-amber-500 hover:bg-amber-600 transition">
          {sending === 'Departed' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiNavigation size={14} />}
          Bus Departed
        </button>
        <button onClick={() => sendNotification('Arrived')} disabled={!!sending}
          className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700 transition">
          {sending === 'Arrived' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={14} />}
          Bus Arrived
        </button>
      </div>
    </div>
  );
}

// ─── Main Transport Page ──────────────────────────────────────────────────────

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [feesOutstanding, setFeesOutstanding] = useState<FeeOutstanding[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRegisterVehicle, setShowRegisterVehicle] = useState(false);
  const [showRegisterDriver, setShowRegisterDriver] = useState(false);
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showAssignStudent, setShowAssignStudent] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  // Filters
  const [filterRoute, setFilterRoute] = useState<number>(0);
  const [filterTerm, setFilterTerm] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, dRes, rRes, tRes, sRes] = await Promise.all([
        fetch('/api/transport/vehicles'),
        fetch('/api/transport/drivers'),
        fetch('/api/transport/routes'),
        fetch('/api/terms'),
        fetch('/api/students'),
      ]);
      const [vData, dData, rData, tData, sData] = await Promise.all([
        vRes.json(), dRes.json(), rRes.json(), tRes.json(), sRes.json(),
      ]);
      setVehicles(vData.data || []);
      setDrivers(dData.data || []);
      setRoutes(rData.data || []);
      setTerms(tData.data || []);
      setStudents(sData.data || []);
    } catch (e: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterRoute) params.append('route_id', filterRoute.toString());
      if (filterTerm) params.append('term_id', filterTerm.toString());
      const res = await fetch(`/api/transport/assignments?${params}`);
      const data = await res.json();
      setAssignments(data.data || []);
    } catch (e: any) {
      toast.error('Failed to load assignments');
    }
  }, [filterRoute, filterTerm]);

  const fetchFeesOutstanding = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterRoute) params.append('route_id', filterRoute.toString());
      if (filterTerm) params.append('term_id', filterTerm.toString());
      const res = await fetch(`/api/transport/fees/outstanding?${params}`);
      const data = await res.json();
      setFeesOutstanding(data.data || []);
    } catch (e: any) {
      toast.error('Failed to load fees');
    }
  }, [filterRoute, filterTerm]);

  const fetchSmsLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterRoute) params.append('route_id', filterRoute.toString());
      const res = await fetch(`/api/transport/sms-logs?${params}`);
      const data = await res.json();
      setSmsLogs(data.data || []);
    } catch (e: any) {
      toast.error('Failed to load SMS logs');
    }
  }, [filterRoute]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === 'assignments') fetchAssignments(); }, [tab, fetchAssignments]);
  useEffect(() => { if (tab === 'fees') fetchFeesOutstanding(); }, [tab, fetchFeesOutstanding]);
  useEffect(() => { if (tab === 'sms-logs') fetchSmsLogs(); }, [tab, fetchSmsLogs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="rounded-2xl shadow-lg mb-6 overflow-hidden" style={{ background: GRAD }}>
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-white mb-2">🚌 Transport Management</h1>
          <p className="text-sky-100 text-sm">Manage vehicles, drivers, routes, assignments, fees, and SMS notifications</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-2 flex gap-2 overflow-x-auto">
        {[
          { key: 'vehicles', label: 'Vehicles', icon: FiTruck },
          { key: 'drivers', label: 'Drivers', icon: FiUsers },
          { key: 'routes', label: 'Routes', icon: FiMap },
          { key: 'assignments', label: 'Assignments', icon: FiCheckCircle },
          { key: 'fees', label: 'Fees', icon: FiDollarSign },
          { key: 'sms-logs', label: 'SMS Logs', icon: FiMessageSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${tab === key ? 'bg-sky-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'vehicles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Vehicles</h2>
            <button onClick={() => setShowRegisterVehicle(true)} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: GRAD }}>
              <FiPlus size={14} /> Register Vehicle
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Registration No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Make / Model</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Seating Capacity</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assigned Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">🚌 No vehicles registered yet</td></tr>
                ) : (
                  vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-800">{v.registration_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.make_model}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.seating_capacity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.school_transport_drivers?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Drivers</h2>
            <button onClick={() => setShowRegisterDriver(true)} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: GRAD }}>
              <FiPlus size={14} /> Register Driver
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">National ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Licence No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">👤 No drivers registered yet</td></tr>
                ) : (
                  drivers.map(d => {
                    const daysLeft = daysUntil(d.licence_expiry_date);
                    const showWarning = daysLeft <= 30 && daysLeft >= 0;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-semibold text-gray-800">{d.full_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.national_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.licence_number}</td>
                        <td className="px-4 py-3 text-sm">
                          {fmtDate(d.licence_expiry_date)}
                          {showWarning && <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-lg">⚠ Expiring soon</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded-lg ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {d.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'routes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Routes</h2>
            <button onClick={() => setShowCreateRoute(true)} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: GRAD }}>
              <FiPlus size={14} /> Create Route
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Route Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stops</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Distance (km)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assigned Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Occupancy</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">🗺️ No routes created yet</td></tr>
                ) : (
                  routes.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.route_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.stops_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.total_distance_km ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.school_transport_vehicles ? `${r.school_transport_vehicles.registration_no} (${r.school_transport_vehicles.make_model})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${r.assigned_count >= r.vehicle_capacity && r.vehicle_capacity > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {r.assigned_count} / {r.vehicle_capacity || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Assignments</h2>
            <div className="flex gap-3 items-center flex-wrap">
              <select value={filterRoute} onChange={e => setFilterRoute(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                <option value={0}>All Routes</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
              </select>
              <select value={filterTerm} onChange={e => setFilterTerm(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                <option value={0}>All Terms</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year}</option>)}
              </select>
              <button onClick={fetchAssignments} className="px-4 py-2 text-sm font-semibold text-sky-600 border border-sky-200 rounded-xl hover:bg-sky-50">Filter</button>
              <button onClick={() => setShowAssignStudent(true)} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: GRAD }}>
                <FiPlus size={14} /> Assign Student
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pickup Stop</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assignment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">📋 No assignments found</td></tr>
                ) : (
                  assignments.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-800">{sName(a.school_students)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{admNo(a.school_students)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.school_transport_routes?.route_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.pickup_stop}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(a.assignment_date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'fees' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Transport Fees</h2>
            <div className="flex gap-3 items-center flex-wrap">
              <select value={filterRoute} onChange={e => setFilterRoute(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                <option value={0}>All Routes</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
              </select>
              <button onClick={fetchFeesOutstanding} className="px-4 py-2 text-sm font-semibold text-sky-600 border border-sky-200 rounded-xl hover:bg-sky-50">Filter</button>
              <button onClick={() => setShowRecordPayment(true)} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: GRAD }}>
                <FiPlus size={14} /> Record Payment
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Expected Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feesOutstanding.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">💰 No fee records found</td></tr>
                ) : (
                  feesOutstanding.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 text-sm">{f.student_name}</div>
                        <div className="text-xs text-gray-400">{f.admission_no} · {f.form_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{f.route_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">KES {f.expected_fee.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-700">KES {f.amount_paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        <span className={f.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          KES {f.balance.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sms-logs' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800">SMS Logs</h2>
            <div className="flex gap-3 items-center flex-wrap">
              <select value={filterRoute} onChange={e => setFilterRoute(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                <option value={0}>All Routes</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
              </select>
              <button onClick={fetchSmsLogs} className="px-4 py-2 text-sm font-semibold text-sky-600 border border-sky-200 rounded-xl hover:bg-sky-50">Filter</button>
            </div>
          </div>

          <SmsNotificationTrigger routes={routes} onSent={fetchSmsLogs} />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Recipient Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sent At</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {smsLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">📱 No SMS logs yet</td></tr>
                ) : (
                  smsLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{log.school_transport_routes?.route_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg ${log.notification_type === 'Departed' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {log.notification_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.recipient_phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={log.message_content}>{log.message_content}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fmtDT(log.sent_at)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">{log.delivery_status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRegisterVehicle && (
        <RegisterVehicleModal
          drivers={drivers}
          onClose={() => setShowRegisterVehicle(false)}
          onSaved={fetchData}
        />
      )}
      {showRegisterDriver && (
        <RegisterDriverModal
          onClose={() => setShowRegisterDriver(false)}
          onSaved={fetchData}
        />
      )}
      {showCreateRoute && (
        <CreateRouteModal
          vehicles={vehicles}
          onClose={() => setShowCreateRoute(false)}
          onSaved={fetchData}
        />
      )}
      {showAssignStudent && (
        <AssignStudentModal
          routes={routes}
          terms={terms}
          students={students}
          onClose={() => setShowAssignStudent(false)}
          onSaved={fetchAssignments}
        />
      )}
      {showRecordPayment && (
        <RecordTransportPaymentModal
          students={students}
          routes={routes}
          terms={terms}
          onClose={() => setShowRecordPayment(false)}
          onSaved={fetchFeesOutstanding}
        />
      )}
    </div>
  );
}
