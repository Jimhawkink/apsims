'use client';

/**
 * APSIMS Student Classroom Fingerprint Scanner
 * ─────────────────────────────────────────────
 * Uses ZK9500 USB Fingerprint Scanner (same as SHA hospitals in Kenya)
 * Teacher plugs USB scanner into laptop → walks to class → students scan at front
 *
 * TWO modes:
 * 1. APSIMS Bridge (recommended) — small app running on laptop, connects via WebSocket
 * 2. Manual confirmation fallback — teacher taps student name, student scans on device
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiUsers, FiWifi, FiWifiOff, FiCheckCircle, FiSearch,
  FiDownload, FiRefreshCw, FiAlertCircle, FiZap, FiX,
} from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  admission_no?: string;
  form_id: number;
  stream_id?: number;
}
interface Form { id: number; form_name: string; form_level: number; }

const BRIDGE_WS = 'ws://localhost:9500';
const todayStr = () => new Date().toISOString().split('T')[0];
const sessionFromHour = (h: number) => h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';

export default function StudentScannerPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [forms, setForms] = useState<Form[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selForm, setSelForm] = useState('');
  const [search, setSearch] = useState('');
  const [date] = useState(todayStr());
  const [session] = useState(sessionFromHour(new Date().getHours()));

  const [bridgeStatus, setBridgeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [scanning, setScanning] = useState(false);
  const [markedToday, setMarkedToday] = useState<Set<number>>(new Set());
  const [enrolledPins, setEnrolledPins] = useState<Map<number, string>>(new Map());
  const [lastScanned, setLastScanned] = useState<Student | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<any>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [fRes, sRes, regRes, attRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_students').select('id,first_name,last_name,admission_number,admission_no,form_id,stream_id').order('first_name').limit(2000),
      supabase.from('school_biometric_registrations').select('person_id,biometric_pin').eq('person_type','student').eq('is_active',true),
      supabase.from('school_attendance').select('student_id').eq('attendance_date', todayStr()),
    ]);
    setForms(fRes.data || []);
    setStudents((sRes.data || []).map((s: any) => ({ ...s, admission_number: s.admission_number || s.admission_no || '' })));
    const pins = new Map((regRes.data || []).map((r: any) => [r.person_id, r.biometric_pin]));
    setEnrolledPins(pins);
    const marked = new Set<number>((attRes.data || []).map((a: any) => a.student_id));
    setMarkedToday(marked);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Connect to APSIMS Bridge WebSocket ─────────────────────────────────────
  const connectBridge = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setBridgeStatus('connecting');
    try {
      const ws = new WebSocket(BRIDGE_WS);
      wsRef.current = ws;
      ws.onopen = () => { setBridgeStatus('connected'); toast.success('🟢 ZK9500 Scanner connected!'); };
      ws.onerror = () => setBridgeStatus('disconnected');
      ws.onclose = () => {
        setBridgeStatus('disconnected');
        reconnectTimer.current = setTimeout(connectBridge, 5000);
      };
      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'fingerprint' || msg.type === 'scan') {
            // Fingerprint data received from bridge
            if (activeStudent) {
              await markAndEnroll(activeStudent, msg.template || msg.data || 'captured');
            }
          }
          if (msg.type === 'quality') {
            // Scan quality update
          }
        } catch {}
      };
    } catch { setBridgeStatus('disconnected'); }
  }, [activeStudent]);

  useEffect(() => {
    connectBridge();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mark attendance + enroll fingerprint ──────────────────────────────────
  const markAndEnroll = useCallback(async (student: Student, fingerprintData?: string) => {
    setScanning(true);
    const pin = student.admission_number || String(student.id);

    // 1. Enroll fingerprint in biometric registrations if not already
    if (!enrolledPins.has(student.id)) {
      await supabase.from('school_biometric_registrations').upsert({
        person_type: 'student',
        person_id: student.id,
        person_name: `${student.first_name} ${student.last_name}`,
        biometric_pin: pin,
        enroll_method: 'fingerprint',
        is_active: true,
      }, { onConflict: 'biometric_pin' });
      setEnrolledPins(prev => new Map([...prev, [student.id, pin]]));
    }

    // 2. Mark attendance
    const { error } = await supabase.from('school_attendance').upsert({
      student_id: student.id,
      attendance_date: date,
      session,
      status: 'Present',
      form_id: student.form_id,
      stream_id: student.stream_id || null,
      notes: `Fingerprint scan — ZK9500 USB Scanner`,
    }, { onConflict: 'student_id,attendance_date,session' });

    if (!error) {
      setMarkedToday(prev => new Set([...prev, student.id]));
      setLastScanned(student);
      setFlashSuccess(true);
      setTimeout(() => setFlashSuccess(false), 3000);
      toast.success(`✅ ${student.first_name} ${student.last_name} — Present`, { duration: 2000 });
    } else {
      toast.error('Failed to mark attendance: ' + error.message);
    }
    setActiveStudent(null);
    setScanning(false);
  }, [date, session, enrolledPins]);

  // ── Tell bridge to capture fingerprint for active student ─────────────────
  const requestScan = (student: Student) => {
    setActiveStudent(student);
    if (bridgeStatus === 'connected' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'capture', student_id: student.id, name: `${student.first_name} ${student.last_name}` }));
      setScanning(true);
      // Auto timeout after 15 seconds
      setTimeout(() => { if (scanning) { setScanning(false); setActiveStudent(null); } }, 15000);
    }
    // If not connected to bridge, manual confirm will work
  };

  // ── Manual confirm (when bridge not available) ─────────────────────────────
  const manualConfirm = () => {
    if (activeStudent) markAndEnroll(activeStudent);
  };

  const filteredStudents = students
    .filter(s => !selForm || String(s.form_id) === selForm)
    .filter(s => !search || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(search.toLowerCase()));

  const marked = filteredStudents.filter(s => markedToday.has(s.id)).length;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)' }}>
      {/* ── Success Flash ── */}
      {flashSuccess && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(16,185,129,0.12)' }} />
          <div className="relative text-center animate-bounce">
            <div className="text-8xl mb-4">✅</div>
            <p className="text-white font-black text-3xl">{lastScanned?.first_name} {lastScanned?.last_name}</p>
            <p className="text-green-400 font-bold text-xl mt-2">ATTENDANCE SAVED!</p>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(99,102,241,0.2)' }}>☝️</div>
          <div>
            <h1 className="text-white font-black text-lg">Student Fingerprint Scanner</h1>
            <p className="text-indigo-300 text-xs">ZK9500 USB Mode — Teacher walks to class with laptop + scanner</p>
          </div>
        </div>
        {/* Bridge connection status */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${bridgeStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : bridgeStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {bridgeStatus === 'connected' ? <><FiWifi size={12} />🟢 ZK9500 Connected</> : bridgeStatus === 'connecting' ? <><FiRefreshCw size={12} className="animate-spin" />Connecting…</> : <><FiWifiOff size={12} />Scanner Offline</>}
          </div>
          <button onClick={connectBridge} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10"><FiRefreshCw size={14} /></button>
        </div>
      </div>

      {/* ── BRIDGE NOT CONNECTED BANNER ── */}
      {bridgeStatus === 'disconnected' && (
        <div className="mx-6 mt-4 p-4 rounded-2xl border border-amber-500/40" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-amber-300 font-bold text-sm">APSIMS Scanner Bridge not running</p>
              <p className="text-amber-400/70 text-xs mt-1">
                To use the ZK9500 USB scanner automatically, install the APSIMS Bridge app on this laptop.
                <br />Without it, use <strong>Manual Mode</strong> below — click student name → student puts finger → click Confirm.
              </p>
            </div>
            <a href="/dashboard/attendance/scanner-bridge" className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: 'rgba(245,158,11,0.3)' }}>
              <FiDownload size={11} />Install Bridge
            </a>
          </div>
        </div>
      )}

      <div className="flex gap-4 p-6">
        {/* ── LEFT: Controls & Stats ── */}
        <div className="w-64 flex-shrink-0 space-y-3">
          {/* Stats */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Today — {date}</p>
            {[
              { l: 'Session', v: session, c: '#a78bfa' },
              { l: 'Marked Present', v: marked, c: '#34d399' },
              { l: 'Remaining', v: filteredStudents.length - marked, c: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-white/50">{s.l}</span>
                <span className="text-sm font-black" style={{ color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>

          {/* Class selector */}
          <div className="rounded-2xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-bold text-indigo-300">Select Class</p>
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-3 py-2 text-sm outline-none">
              <option value="">All Classes</option>
              {forms.map(f => <option key={f.id} value={f.id} className="text-black">{f.form_name}</option>)}
            </select>
          </div>

          {/* Scanning status */}
          {activeStudent && (
            <div className="rounded-2xl p-4 text-center animate-pulse" style={{ background: 'rgba(99,102,241,0.2)', border: '2px solid rgba(99,102,241,0.5)' }}>
              <div className="text-4xl mb-2">☝️</div>
              <p className="text-white font-black text-sm">{activeStudent.first_name}</p>
              <p className="text-indigo-300 text-xs">Place finger on scanner</p>
              {bridgeStatus !== 'connected' && (
                <button onClick={manualConfirm}
                  className="mt-3 w-full py-2 rounded-xl text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                  ✅ Confirm Scan (Manual)
                </button>
              )}
              <button onClick={() => { setActiveStudent(null); setScanning(false); }}
                className="mt-2 w-full py-1.5 rounded-xl text-xs text-white/50 hover:text-white">
                Cancel
              </button>
            </div>
          )}

          {/* How to use */}
          <div className="rounded-2xl p-3 space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">How to Use</p>
            {[
              '1. Plug ZK9500 USB into laptop',
              '2. Run APSIMS Bridge app',
              '3. Select class above',
              '4. Student walks to front',
              '5. Click student name →',
              '6. Student places finger',
              '7. ✅ Attendance auto-saved!',
            ].map((s, i) => <p key={i} className="text-[10px] text-white/40">{s}</p>)}
          </div>
        </div>

        {/* ── RIGHT: Student List ── */}
        <div className="flex-1">
          {/* Search */}
          <div className="relative mb-4">
            <FiSearch size={13} className="absolute left-4 top-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student by name or admission no…"
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
          </div>

          {/* Grid of students */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredStudents.map(s => {
              const isMarked = markedToday.has(s.id);
              const isActive = activeStudent?.id === s.id;
              const isEnrolled = enrolledPins.has(s.id);
              return (
                <button key={s.id}
                  onClick={() => !isMarked && requestScan(s)}
                  disabled={isMarked || scanning}
                  className={`relative p-4 rounded-2xl text-center transition-all duration-200 ${isMarked ? 'opacity-60 cursor-default' : 'hover:scale-105 active:scale-95 cursor-pointer'} ${isActive ? 'ring-2 ring-indigo-400' : ''}`}
                  style={{
                    background: isMarked ? 'rgba(16,185,129,0.15)' : isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                    border: isMarked ? '1px solid rgba(16,185,129,0.4)' : isActive ? '2px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  {/* Avatar */}
                  <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg font-black mb-2"
                    style={{ background: isMarked ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)' }}>
                    {isMarked ? '✅' : isActive ? '☝️' : s.first_name.charAt(0)}
                  </div>
                  <p className="text-white text-xs font-bold leading-tight">{s.first_name}</p>
                  <p className="text-white text-xs font-bold leading-tight">{s.last_name}</p>
                  <p className="text-white/30 text-[9px] mt-1 font-mono">{s.admission_number}</p>
                  {/* Enrollment badge */}
                  {!isEnrolled && !isMarked && (
                    <span className="absolute top-1 right-1 text-[8px] bg-amber-500/30 text-amber-300 px-1 rounded">NEW</span>
                  )}
                  {/* Marked badge */}
                  {isMarked && (
                    <span className="absolute top-1 right-1 text-[8px] bg-green-500/30 text-green-400 px-1 rounded">✅</span>
                  )}
                </button>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-20">
              <FiUsers size={40} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">Select a class to see students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
