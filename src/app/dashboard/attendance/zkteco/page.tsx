'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiCpu, FiUsers, FiActivity, FiSettings, FiRefreshCw, FiSearch,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiWifi, FiWifiOff,
  FiDownload, FiUpload, FiCopy, FiEye, FiX, FiPlus, FiSave,
  FiZap, FiShield, FiBarChart2, FiClock, FiTrash2, FiFilter,
} from 'react-icons/fi';

// ── Types ──────────────────────────────────────────────────────────────────────
interface BiometricReg {
  id: number; person_type: string; person_id: number;
  person_name: string; biometric_pin: string; device_sn?: string;
  enroll_method: string; registered_at: string; is_active: boolean;
}
interface BiometricLog {
  id: number; device_sn: string; pin: string; punch_time: string;
  verify_label: string; punch_direction: string; matched_name?: string;
  matched_type?: string; processed: boolean;
}

const PUSH_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/biometric/zkteco`
  : 'https://apsims.vercel.app/api/biometric/zkteco';

const ENROLL_METHODS = ['Fingerprint', 'Face', 'RFID/Card', 'PIN'];
const TABS = ['📊 Overview', '📋 Register Users', '📡 Live Logs', '⚙️ Device Setup', '📖 Guide'] as const;
type Tab = typeof TABS[number];

export default function ZKTecoControlPanel() {
  const [tab, setTab] = useState<Tab>('📊 Overview');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<BiometricReg[]>([]);
  const [logs, setLogs] = useState<BiometricLog[]>([]);
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState<'all' | 'student' | 'staff'>('all');
  const [regFilter, setRegFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [editingPin, setEditingPin] = useState<{ id: string; type: string; pin: string } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({ total: 0, students: 0, staff: 0, fingerprint: 0, face: 0, rfid: 0 });
  const [deviceSn, setDeviceSn] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const autoRefreshRef = useRef<any>(null);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [studRes, teachRes, supRes, subRes, regRes, logRes] = await Promise.all([
      supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id').eq('status','Active').order('first_name'),
      supabase.from('school_teachers').select('id,first_name,last_name,staff_no,department').eq('status','Active'),
      supabase.from('school_support_teachers').select('id,first_name,last_name,staff_no').eq('status','Active'),
      supabase.from('school_subordinate_staff').select('id,first_name,last_name,staff_no,role').eq('status','Active'),
      supabase.from('school_biometric_registrations').select('*').eq('is_active', true).order('registered_at', { ascending: false }),
      supabase.from('school_biometric_logs').select('*').gte('punch_time', `${today}T00:00:00`).order('punch_time', { ascending: false }).limit(200),
    ]);
    setStudents(studRes.data || []);
    const allStaff = [
      ...(teachRes.data || []).map((s: any) => ({ ...s, _type: 'teacher', _typeLabel: 'TSC Teacher' })),
      ...(supRes.data || []).map((s: any) => ({ ...s, _type: 'support', _typeLabel: 'Support Teacher' })),
      ...(subRes.data || []).map((s: any) => ({ ...s, _type: 'subordinate', _typeLabel: 'Support Staff' })),
    ];
    setStaff(allStaff);
    setRegistrations(regRes.data || []);
    const todayLogs = (logRes.data || []).filter((l: any) => l.pin !== '__HEARTBEAT__');
    setLogs(todayLogs);
    const stats = { total: todayLogs.length, students: 0, staff: 0, fingerprint: 0, face: 0, rfid: 0 };
    todayLogs.forEach((l: any) => {
      if (l.matched_type === 'student') stats.students++;
      if (l.matched_type === 'staff') stats.staff++;
      if (l.verify_label === 'Fingerprint') stats.fingerprint++;
      if (l.verify_label === 'Face') stats.face++;
      if (l.verify_label?.includes('Card') || l.verify_label?.includes('RFID')) stats.rfid++;
    });
    setTodayStats(stats);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Auto-refresh live logs every 10s when on logs tab ────────────────────
  useEffect(() => {
    if (tab === '📡 Live Logs') {
      autoRefreshRef.current = setInterval(async () => {
        setLogsLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('school_biometric_logs').select('*')
          .gte('punch_time', `${today}T00:00:00`).neq('pin', '__HEARTBEAT__')
          .order('punch_time', { ascending: false }).limit(100);
        setLogs(data || []);
        setLogsLoading(false);
      }, 10000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [tab]);

  // ── Save PIN registration ─────────────────────────────────────────────────
  const savePin = async () => {
    if (!editingPin || !editingPin.pin.trim()) return;
    setSavingPin(true);
    const isStudent = editingPin.type === 'student';
    const person = isStudent
      ? students.find(s => s.id === parseInt(editingPin.id))
      : staff.find(s => `${s._type}-${s.id}` === editingPin.id);
    if (!person) { toast.error('Person not found'); setSavingPin(false); return; }

    const { error } = await supabase.from('school_biometric_registrations').upsert({
      person_type: isStudent ? 'student' : 'staff',
      person_id: person.id,
      person_name: `${person.first_name} ${person.last_name}`,
      biometric_pin: editingPin.pin.trim(),
      device_sn: deviceSn || null,
      enroll_method: 'Fingerprint',
      registered_by: JSON.parse(localStorage.getItem('school_user') || '{}').full_name || 'Super Admin',
      is_active: true,
    }, { onConflict: 'biometric_pin' });

    if (error) { toast.error('Failed: PIN might be taken by another user'); }
    else { toast.success('✅ Biometric PIN registered!'); setEditingPin(null); await loadAll(); }
    setSavingPin(false);
  };

  // ── Bulk register all (PIN = admission_no / staff_no) ─────────────────────
  const bulkRegisterAll = async () => {
    setBulkLoading(true);
    const regMap = new Set(registrations.map(r => r.biometric_pin));
    const rows: any[] = [];
    students.forEach(s => {
      const pin = s.admission_no || s.admission_number;
      if (pin && !regMap.has(String(pin))) {
        rows.push({ person_type: 'student', person_id: s.id, person_name: `${s.first_name} ${s.last_name}`, biometric_pin: String(pin), enroll_method: 'Fingerprint', is_active: true });
      }
    });
    staff.forEach(s => {
      const pin = s.staff_no;
      if (pin && !regMap.has(String(pin))) {
        rows.push({ person_type: 'staff', person_id: s.id, person_name: `${s.first_name} ${s.last_name}`, biometric_pin: String(pin), enroll_method: 'Fingerprint', is_active: true });
      }
    });
    if (rows.length === 0) { toast('Everyone is already registered!'); setBulkLoading(false); return; }
    const { error } = await supabase.from('school_biometric_registrations').upsert(rows, { onConflict: 'biometric_pin' });
    if (error) toast.error('Bulk register failed: ' + error.message);
    else { toast.success(`✅ Registered ${rows.length} users!`); await loadAll(); }
    setBulkLoading(false);
  };

  // ── Export PIN list for ZKTeco import ────────────────────────────────────
  const exportPinList = () => {
    const rows = registrations.map((r, i) => [i + 1, r.biometric_pin, r.person_name, r.person_type, r.enroll_method]);
    const csv = [['#','PIN','Name','Type','Method'], ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `zkteco_pin_list_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('PIN list exported!');
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const regPins = new Set(registrations.map(r => r.biometric_pin));
  const allPersons = [
    ...students.map(s => ({ id: String(s.id), type: 'student', name: `${s.first_name} ${s.last_name}`, pin: s.admission_no || s.admission_number || '', label: 'Student', dept: '', isReg: regPins.has(String(s.admission_no || s.admission_number)) })),
    ...staff.map(s => ({ id: `${s._type}-${s.id}`, type: 'staff', name: `${s.first_name} ${s.last_name}`, pin: s.staff_no || '', label: s._typeLabel, dept: s.department || s.role || '', isReg: regPins.has(String(s.staff_no)) })),
  ].filter(p => {
    if (personFilter === 'student' && p.type !== 'student') return false;
    if (personFilter === 'staff' && p.type !== 'staff') return false;
    if (regFilter === 'registered' && !p.isReg) return false;
    if (regFilter === 'unregistered' && p.isReg) return false;
    if (search) { const q = search.toLowerCase(); return p.name.toLowerCase().includes(q) || p.pin.toLowerCase().includes(q); }
    return true;
  });
  const regCount = allPersons.filter(p => p.isReg).length;
  const unregCount = allPersons.filter(p => !p.isReg).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
          <FiCpu className="text-white" size={26} />
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-red-200 animate-ping opacity-30" />
      </div>
      <p className="text-sm font-bold text-gray-500">Loading ZKTeco Control Panel…</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ════ HERO ════ */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 50%,#ef4444 100%)' }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fca5a5,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="relative px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-3xl" style={{ background: 'rgba(255,255,255,0.15)' }}>🔴</div>
              <div>
                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                  ZKTeco Biometric Control Panel
                  <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-red-900 text-red-200">SUPER ADMIN ONLY</span>
                </h1>
                <p className="text-red-200 text-xs mt-0.5">Fingerprint · Face Recognition · RFID · Auto Attendance · Live Dashboard</p>
                <p className="text-red-300 text-[10px] mt-0.5 font-mono">ADMS Push URL: <span className="bg-black/30 px-2 py-0.5 rounded">{PUSH_URL}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadAll} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"><FiRefreshCw size={15} /></button>
              <button onClick={exportPinList} className="px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 flex items-center gap-1.5"><FiDownload size={12} />Export PINs</button>
            </div>
          </div>
          {/* KPI Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-white/10">
            {[
              { l: "Today's Scans", v: todayStats.total, e: '📡' },
              { l: 'Students', v: todayStats.students, e: '🎓' },
              { l: 'Staff', v: todayStats.staff, e: '👔' },
              { l: 'Fingerprint', v: todayStats.fingerprint, e: '☝️' },
              { l: 'Face', v: todayStats.face, e: '😊' },
              { l: 'Registered', v: registrations.length, e: '✅' },
            ].map((c, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="flex items-center gap-1 mb-1"><span className="text-sm">{c.e}</span><span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{c.l}</span></div>
                <p className="text-xl font-black text-white">{c.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ TABS ════ */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={tab === t
              ? { background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(220,38,38,0.4)' }
              : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ════ OVERVIEW TAB ════ */}
      {tab === '📊 Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-red-50 flex items-center gap-2">
              <FiActivity className="text-red-500" size={16} /><h3 className="font-bold text-gray-800 text-sm">Today's Biometric Activity</h3>
              <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>
            </div>
            <div className="p-4 space-y-2">
              {logs.filter(l => l.pin !== '__HEARTBEAT__').slice(0, 15).map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-red-200 transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: l.matched_type === 'student' ? '#eff6ff' : l.matched_type === 'staff' ? '#f0fdf4' : '#fef2f2' }}>
                    {l.matched_type === 'student' ? '🎓' : l.matched_type === 'staff' ? '👔' : '❓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{l.matched_name || `Unknown PIN: ${l.pin}`}</p>
                    <p className="text-[10px] text-gray-400">{l.verify_label} · {new Date(l.punch_time).toLocaleTimeString('en-KE')} · {l.punch_direction}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${l.processed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {l.processed ? '✅ Matched' : '⚠️ Unknown'}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">📡</p>
                  <p className="text-sm text-gray-400">No scans today yet</p>
                  <p className="text-xs text-gray-300 mt-1">Waiting for ZKTeco device push…</p>
                </div>
              )}
            </div>
          </div>

          {/* Registration Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <FiShield className="text-red-500" size={16} /><h3 className="font-bold text-gray-800 text-sm">Registration Status</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { l: 'Total Students', v: students.length, c: '#3b82f6' },
                { l: 'Students Registered', v: students.filter(s => regPins.has(String(s.admission_no || s.admission_number))).length, c: '#059669' },
                { l: 'Total Staff', v: staff.length, c: '#8b5cf6' },
                { l: 'Staff Registered', v: staff.filter(s => regPins.has(String(s.staff_no))).length, c: '#059669' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-semibold text-gray-600">{item.l}</span>
                  <span className="text-lg font-black" style={{ color: item.c }}>{item.v}</span>
                </div>
              ))}
              <button onClick={bulkRegisterAll} disabled={bulkLoading}
                className="w-full py-3 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                {bulkLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering…</> : <><FiZap size={14} />Auto-Register All (PIN = Admission No / Staff No)</>}
              </button>
              <p className="text-[10px] text-gray-400 text-center">This maps each person's admission/staff number as their ZKTeco PIN</p>
            </div>
          </div>
        </div>
      )}

      {/* ════ REGISTER USERS TAB ════ */}
      {tab === '📋 Register Users' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or PIN…"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-100 outline-none" />
              </div>
              <div className="flex gap-1.5">
                {(['all', 'student', 'staff'] as const).map(f => (
                  <button key={f} onClick={() => setPersonFilter(f)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold capitalize transition-all"
                    style={personFilter === f ? { background: '#dc2626', color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {(['all', 'registered', 'unregistered'] as const).map(f => (
                  <button key={f} onClick={() => setRegFilter(f)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold capitalize transition-all"
                    style={regFilter === f ? { background: '#dc2626', color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>
                    {f === 'all' ? 'All' : f === 'registered' ? '✅ Registered' : '⚠️ Not Yet'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span>Showing <strong className="text-gray-800">{allPersons.length}</strong> people · <span className="text-green-600 font-bold">{regCount} registered</span> · <span className="text-amber-600 font-bold">{unregCount} not yet</span></span>
              <button onClick={bulkRegisterAll} disabled={bulkLoading}
                className="ml-auto px-3 py-1.5 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                {bulkLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiZap size={10} />}
                Auto-Register All Unregistered
              </button>
            </div>
          </div>

          {/* Edit PIN modal */}
          {editingPin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-800 flex items-center gap-2"><span className="text-2xl">☝️</span>Assign Biometric PIN</h3>
                  <button onClick={() => setEditingPin(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><FiX size={14} /></button>
                </div>
                <div className="p-3 bg-red-50 rounded-2xl text-xs text-red-700 font-medium">
                  ⚠️ This PIN must match exactly what is programmed on the ZKTeco device for this person. Typically use their <strong>Admission No</strong> or <strong>Staff No</strong>.
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">ZKTeco PIN / User ID</label>
                  <input value={editingPin.pin} onChange={e => setEditingPin(p => p ? { ...p, pin: e.target.value } : null)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-mono font-bold tracking-wider focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                    placeholder="e.g. 12345 or ADM001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Device Serial (optional)</label>
                  <input value={deviceSn} onChange={e => setDeviceSn(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:border-red-400 outline-none"
                    placeholder="e.g. ABCZ123456 (from device screen)" />
                </div>
                <div className="flex gap-2">
                  <button onClick={savePin} disabled={savingPin}
                    className="flex-1 py-3 text-sm font-bold text-white rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                    {savingPin ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
                    Save Registration
                  </button>
                  <button onClick={() => setEditingPin(null)} className="px-4 py-3 text-sm text-gray-500 bg-gray-100 rounded-2xl">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Person list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['#', 'Name', 'Type', 'Default PIN', 'Biometric PIN', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allPersons.slice(0, 200).map((p, i) => (
                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${p.isReg ? '' : 'bg-amber-50/30'}`}>
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: p.type === 'student' ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                            <p className="text-[10px] text-gray-400">{p.dept}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: p.type === 'student' ? '#eff6ff' : '#f5f3ff', color: p.type === 'student' ? '#1d4ed8' : '#6d28d9' }}>
                          {p.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-gray-600">{p.pin || '—'}</td>
                      <td className="px-4 py-3">
                        {registrations.find(r => r.person_type === p.type && r.person_id === (p.type === 'student' ? parseInt(p.id) : parseInt(p.id.split('-')[1])))?.biometric_pin
                          ? <span className="text-xs font-mono font-black text-green-700">{registrations.find(r => r.person_type === p.type && r.person_id === (p.type === 'student' ? parseInt(p.id) : parseInt(p.id.split('-')[1])))?.biometric_pin}</span>
                          : <span className="text-[10px] text-gray-300">Not assigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.isReg
                          ? <span className="text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><FiCheckCircle size={8} />Registered</span>
                          : <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">Not Enrolled</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditingPin({ id: p.id, type: p.type, pin: p.pin })}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition">
                          <FiZap size={10} />{p.isReg ? 'Update PIN' : 'Assign PIN'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════ LIVE LOGS TAB ════ */}
      {tab === '📡 Live Logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm font-bold text-gray-700">Live Biometric Feed — Auto-refresh every 10s</p>
              </div>
              <button onClick={loadAll} className="text-xs text-red-600 flex items-center gap-1 hover:underline"><FiRefreshCw size={11} />Refresh Now</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Time', 'PIN', 'Matched Person', 'Type', 'Method', 'Direction', 'Device', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 100).map(l => (
                    <tr key={l.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!l.processed ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap">{new Date(l.punch_time).toLocaleTimeString('en-KE')}</td>
                      <td className="px-4 py-2.5 text-xs font-mono font-bold text-gray-700">{l.pin}</td>
                      <td className="px-4 py-2.5">
                        {l.matched_name
                          ? <p className="text-sm font-semibold text-gray-800">{l.matched_name}</p>
                          : <p className="text-xs text-red-500 font-medium">⚠️ Unknown — PIN not registered</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: l.matched_type === 'student' ? '#eff6ff' : l.matched_type === 'staff' ? '#f0fdf4' : '#fef2f2', color: l.matched_type === 'student' ? '#1d4ed8' : l.matched_type === 'staff' ? '#15803d' : '#dc2626' }}>
                          {l.matched_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{l.verify_label || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${l.punch_direction === 'IN' ? 'bg-green-100 text-green-700' : l.punch_direction === 'OUT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {l.punch_direction}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{l.device_sn || '—'}</td>
                      <td className="px-4 py-2.5">
                        {l.processed
                          ? <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><FiCheckCircle size={8} />Matched</span>
                          : <span className="text-[9px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">No Match</span>}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                      <p className="text-3xl mb-2">📡</p>
                      <p className="text-sm font-medium">No biometric events today</p>
                      <p className="text-xs mt-1">Configure your ZKTeco device with the ADMS URL above</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════ DEVICE SETUP TAB ════ */}
      {tab === '⚙️ Device Setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ADMS Configuration */}
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-gray-800 flex items-center gap-2"><FiSettings size={16} className="text-red-500" />ZKTeco ADMS Configuration</h3>
            <p className="text-xs text-gray-500">Configure these settings on your ZKTeco device's web interface or front panel menu.</p>
            {[
              { label: 'ADMS Server URL (copy this to device)', value: PUSH_URL, copy: true, highlight: true },
              { label: 'Server Port', value: '443 (HTTPS)', copy: false },
              { label: 'Protocol', value: 'HTTPS / HTTP Push', copy: false },
              { label: 'Push Interval', value: '30 seconds (recommended)', copy: false },
              { label: 'Heartbeat Interval', value: '30 seconds', copy: false },
              { label: 'TransFlag', value: 'TransData AttLog OpLog', copy: true },
            ].map((item, i) => (
              <div key={i} className={`p-3 rounded-xl ${item.highlight ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50 border border-gray-100'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{item.label}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-xs font-mono ${item.highlight ? 'font-black text-red-700' : 'text-gray-700'} break-all flex-1`}>{item.value}</p>
                  {item.copy && (
                    <button onClick={() => { navigator.clipboard.writeText(item.value); toast.success('Copied!'); }}
                      className="flex-shrink-0 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                      <FiCopy size={11} className="text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ZKTeco Device Steps */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-gray-800 flex items-center gap-2">📱 How to Configure ZKTeco Device</h3>
            <div className="space-y-3">
              {[
                { step: 1, title: 'Access Device Menu', desc: 'On the ZKTeco device, go to Menu → Comm → Cloud Settings / ADMS Settings' },
                { step: 2, title: 'Enable ADMS', desc: 'Toggle "Enable Cloud Service" or "Enable ADMS" to ON' },
                { step: 3, title: 'Enter Server Address', desc: `Set Server Address to: ${PUSH_URL}` },
                { step: 4, title: 'Set Port to 443', desc: 'If using HTTPS. Use 80 for HTTP. Match your server protocol.' },
                { step: 5, title: 'Enroll Fingerprints', desc: 'For each student/staff: Menu → User Management → New User → Enter PIN (= Admission No) → Enroll Fingerprint (3x scan)' },
                { step: 6, title: 'PIN = Admission Number', desc: 'Set the User ID/PIN in ZKTeco to exactly match the student\'s admission number or staff\'s staff number' },
                { step: 7, title: 'Register in APSIMS', desc: 'Use the "Register Users" tab above to map each person\'s PIN. Or click "Auto-Register All" to bulk map.' },
                { step: 8, title: 'Test', desc: 'Have a student scan their finger → Check Live Logs tab → Should see their name appear within 30 seconds' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>{s.step}</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{s.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ GUIDE TAB ════ */}
      {tab === '📖 Guide' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-gray-800">🇰🇪 ZKTeco Devices Popular in Kenya</h3>
            {[
              { model: 'ZKTeco K50', type: 'Fingerprint + Card', price: '~KES 8,000', popular: true },
              { model: 'ZKTeco F22', type: 'Fingerprint Only', price: '~KES 9,000', popular: false },
              { model: 'ZKTeco uFace 800', type: 'Face + Fingerprint', price: '~KES 25,000', popular: false },
              { model: 'ZKTeco SpeedFace V5L', type: 'Face Recognition', price: '~KES 35,000', popular: false },
              { model: 'ZKTeco ZK4500', type: 'USB Fingerprint Reader', price: '~KES 4,000', popular: false },
              { model: 'Hikvision DS-K1T501SF', type: 'Fingerprint Terminal', price: '~KES 12,000', popular: false },
            ].map(d => (
              <div key={d.model} className={`flex items-center justify-between p-3 rounded-xl border ${d.popular ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div>
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">{d.model}{d.popular && <span className="text-[9px] font-black text-green-700 bg-green-200 px-1.5 py-0.5 rounded-full">POPULAR</span>}</p>
                  <p className="text-[10px] text-gray-500">{d.type}</p>
                </div>
                <span className="text-xs font-bold text-gray-600">{d.price}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-gray-800">🔄 How Auto-Attendance Works</h3>
            <div className="space-y-3">
              {[
                { icon: '☝️', title: 'Student/Staff places finger on device', desc: 'ZKTeco device reads fingerprint and matches to enrolled user' },
                { icon: '📡', title: 'Device pushes data to APSIMS', desc: 'Within 30 seconds, device sends: PIN + Timestamp + Verify Method to your server URL' },
                { icon: '🔍', title: 'APSIMS matches PIN', desc: 'System looks up PIN in student admission numbers AND staff numbers' },
                { icon: '✅', title: 'Attendance auto-marked', desc: 'Status set to "Present" in school_attendance. Session determined by time: Morning <12pm, Afternoon 12–5pm' },
                { icon: '📊', title: 'Visible immediately', desc: 'Teachers can see biometric attendance in Student Attendance page. Live feed visible in this panel.' },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl flex-shrink-0">{s.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{s.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
