'use client';

/**
 * APSIMS Student Classroom Fingerprint Scanner — Light Theme
 * ZK9500 USB Mode — Teacher walks to class with laptop + scanner
 * MUST select class first → shows only that class (~40 students)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiUsers, FiWifi, FiWifiOff, FiSearch, FiDownload,
  FiRefreshCw, FiAlertCircle, FiZap, FiCheckCircle,
  FiFingerprint, FiChevronRight,
} from 'react-icons/fi';

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
interface Stream { id: number; stream_name: string; form_id: number; }

const BRIDGE_WS = 'ws://localhost:9500';
const PAGE_SIZE = 50;
const todayStr = () => new Date().toISOString().split('T')[0];
const sessionFromHour = (h: number) => h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';

export default function StudentScannerPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [search, setSearch] = useState('');
  const [session] = useState(sessionFromHour(new Date().getHours()));

  const [bridgeStatus, setBridgeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [scanning, setScanning] = useState(false);
  const [markedToday, setMarkedToday] = useState<Set<number>>(new Set());
  const [enrolledPins, setEnrolledPins] = useState<Map<number, string>>(new Map());
  const [lastScanned, setLastScanned] = useState<{ name: string; time: string } | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<Student | null>(null);
  activeRef.current = activeStudent;

  // ── Load forms, streams, registrations ───────────────────────────────────
  useEffect(() => {
    supabase.from('school_forms').select('*').order('form_level').then(r => setForms(r.data || []));
    supabase.from('school_streams').select('*').order('stream_name').then(r => setStreams(r.data || []));
    supabase.from('school_biometric_registrations').select('person_id,biometric_pin').eq('person_type','student').eq('is_active',true)
      .then(r => setEnrolledPins(new Map((r.data || []).map((x: any) => [x.person_id, x.biometric_pin]))));
  }, []);

  // ── Load students ONLY when class selected ────────────────────────────────
  const loadStudents = useCallback(async () => {
    if (!selForm) { setStudents([]); return; }
    let q = supabase.from('school_students')
      .select('id,first_name,last_name,admission_number,admission_no,form_id,stream_id')
      .eq('form_id', selForm).order('first_name');
    if (selStream) q = q.eq('stream_id', selStream);
    const { data } = await q;
    setStudents((data || []).map((s: any) => ({ ...s, admission_number: s.admission_number || s.admission_no || '' })));

    // Load today's attendance for this class
    const { data: att } = await supabase.from('school_attendance')
      .select('student_id').eq('attendance_date', todayStr()).eq('form_id', selForm);
    setMarkedToday(new Set((att || []).map((a: any) => a.student_id)));
  }, [selForm, selStream]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // ── Bridge WebSocket ──────────────────────────────────────────────────────
  const connectBridge = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setBridgeStatus('connecting');
    try {
      const ws = new WebSocket(BRIDGE_WS);
      wsRef.current = ws;
      ws.onopen = () => { setBridgeStatus('connected'); toast.success('🟢 ZK9500 Connected!'); };
      ws.onerror = () => setBridgeStatus('disconnected');
      ws.onclose = () => {
        setBridgeStatus('disconnected');
        reconnectTimer.current = setTimeout(connectBridge, 5000);
      };
      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if ((msg.type === 'fingerprint' || msg.type === 'scan') && activeRef.current) {
            await markAndEnroll(activeRef.current);
          }
        } catch {}
      };
    } catch { setBridgeStatus('disconnected'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    connectBridge();
    return () => { wsRef.current?.close(); if (reconnectTimer.current) clearTimeout(reconnectTimer.current); };
  }, [connectBridge]);

  // ── Mark attendance + enroll ──────────────────────────────────────────────
  const markAndEnroll = useCallback(async (student: Student) => {
    setScanning(true);
    const pin = student.admission_number || String(student.id);

    if (!enrolledPins.has(student.id)) {
      await supabase.from('school_biometric_registrations').upsert({
        person_type: 'student', person_id: student.id,
        person_name: `${student.first_name} ${student.last_name}`,
        biometric_pin: pin, enroll_method: 'fingerprint', is_active: true,
      }, { onConflict: 'biometric_pin' });
      setEnrolledPins(prev => new Map([...prev, [student.id, pin]]));
    }

    const now = new Date();
    const { error } = await supabase.from('school_attendance').upsert({
      student_id: student.id, attendance_date: todayStr(), session,
      status: 'Present', form_id: student.form_id,
      stream_id: student.stream_id || null,
      notes: 'ZK9500 USB Fingerprint Scanner',
    }, { onConflict: 'student_id,attendance_date,session' });

    if (!error) {
      setMarkedToday(prev => new Set([...prev, student.id]));
      const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      setLastScanned({ name: `${student.first_name} ${student.last_name}`, time: timeStr });
      setFlashSuccess(true);
      setTimeout(() => setFlashSuccess(false), 2500);
      toast.success(`✅ ${student.first_name} ${student.last_name} — Present`, { duration: 1800 });
    } else {
      toast.error('Failed: ' + error.message);
    }
    setActiveStudent(null);
    setScanning(false);
  }, [session, enrolledPins]);

  const requestScan = (student: Student) => {
    if (markedToday.has(student.id)) return;
    setActiveStudent(student);
    if (bridgeStatus === 'connected' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'capture', student_id: student.id }));
    }
  };

  const [page, setPage] = useState(1);
  // Reset page when search/class/stream changes
  useEffect(() => { setPage(1); }, [search, selForm, selStream]);

  const filtered = students.filter(s =>
    !search || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const markedCount = filtered.filter(s => markedToday.has(s.id)).length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Success Flash Overlay ── */}
      {flashSuccess && lastScanned && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
          <div className="bg-white rounded-3xl shadow-2xl px-12 py-8 text-center border-4 border-green-400 animate-bounce">
            <div className="text-6xl mb-3">✅</div>
            <p className="text-gray-900 font-black text-2xl">{lastScanned.name}</p>
            <p className="text-green-600 font-bold text-lg mt-1">PRESENT — {lastScanned.time}</p>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>☝️</div>
            <div>
              <h1 className="text-gray-900 font-black text-lg">Student Fingerprint Scanner</h1>
              <p className="text-gray-400 text-xs">ZK9500 USB — Teacher walks to class with laptop + scanner</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bridge status pill */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${
              bridgeStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
              bridgeStatus === 'connecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'}`}>
              {bridgeStatus === 'connected' ? <><FiWifi size={12} />🟢 ZK9500 Connected</> :
               bridgeStatus === 'connecting' ? <><FiRefreshCw size={12} className="animate-spin" />Connecting…</> :
               <><FiWifiOff size={12} />Scanner Offline</>}
            </div>
            <button onClick={connectBridge} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50">
              <FiRefreshCw size={14} />
            </button>
            <a href="/dashboard/attendance/scanner-bridge" className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100">
              <FiDownload size={12} />Install Bridge
            </a>
          </div>
        </div>
      </div>

      {/* ── BRIDGE OFFLINE NOTICE ── */}
      {bridgeStatus === 'disconnected' && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <p className="text-amber-800 font-bold text-sm">Bridge not running — Manual Mode active</p>
            <p className="text-amber-600 text-xs mt-0.5">Click a student name → ask them to place finger → click <strong>"✅ Confirm Scan"</strong> button. Or <a href="/dashboard/attendance/scanner-bridge" className="underline font-semibold">install the bridge</a> for automatic scanning.</p>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex gap-5">

          {/* ── LEFT PANEL ── */}
          <div className="w-60 flex-shrink-0 space-y-4">

            {/* Class selector — REQUIRED */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">📚 Select Class First</p>
              <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:border-indigo-400 outline-none mb-2">
                <option value="">— Select Form —</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
              {formStreams.length > 0 && (
                <select value={selStream} onChange={e => setSelStream(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:border-indigo-400 outline-none">
                  <option value="">All Streams</option>
                  {formStreams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
              )}
            </div>

            {/* Stats */}
            {selForm && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">📊 Today</p>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Session</span><span className="text-xs font-black text-indigo-600">{session}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Total Students</span><span className="text-xs font-black text-gray-800">{filtered.length}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">✅ Present</span><span className="text-xs font-black text-green-600">{markedCount}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">⏳ Remaining</span><span className="text-xs font-black text-orange-500">{filtered.length - markedCount}</span></div>
                <div className="mt-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${filtered.length ? Math.round(markedCount / filtered.length * 100) : 0}%` }} />
                </div>
                <p className="text-[10px] text-center text-gray-400">{filtered.length ? Math.round(markedCount / filtered.length * 100) : 0}% marked</p>
              </div>
            )}

            {/* Active scan box */}
            {activeStudent && (
              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-4 text-center shadow-sm">
                <div className="text-4xl animate-bounce mb-2">☝️</div>
                <p className="font-black text-indigo-800 text-sm">{activeStudent.first_name} {activeStudent.last_name}</p>
                <p className="text-indigo-500 text-xs mt-1">Place finger on ZK9500</p>
                {bridgeStatus !== 'connected' && (
                  <button onClick={() => markAndEnroll(activeStudent)} disabled={scanning}
                    className="mt-3 w-full py-2.5 rounded-xl text-xs font-black text-white shadow-sm disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    {scanning ? '⏳ Saving…' : '✅ Confirm Scan'}
                  </button>
                )}
                <button onClick={() => { setActiveStudent(null); setScanning(false); }} className="mt-2 text-xs text-indigo-400 hover:text-indigo-600 font-semibold">Cancel</button>
              </div>
            )}

            {/* Last scanned */}
            {lastScanned && !activeStudent && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                <FiCheckCircle className="mx-auto text-green-500 mb-1" size={18} />
                <p className="text-xs font-bold text-green-700">{lastScanned.name}</p>
                <p className="text-[10px] text-green-500">Marked at {lastScanned.time}</p>
              </div>
            )}

            {/* How to use */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">How to Use</p>
              {['1. Plug ZK9500 into laptop USB', '2. Run APSIMS Bridge app', '3. Select form/class above', '4. Student walks to front', '5. Click student\'s name row', '6. Student places finger ☝️', '7. ✅ Auto-saved & next!'].map((s, i) => (
                <p key={i} className="text-[10px] text-gray-400 py-0.5">{s}</p>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Student Table ── */}
          <div className="flex-1">
            {!selForm ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 bg-indigo-50">📚</div>
                <h3 className="text-lg font-black text-gray-700 mb-1">Select a Class to Begin</h3>
                <p className="text-sm text-gray-400">Choose a form from the left panel<br />to see students for that class</p>
                <p className="text-xs text-indigo-500 mt-3 font-semibold">⚡ Loading all 2000 students at once is avoided — only the selected class loads</p>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative mb-4">
                  <FiSearch size={14} className="absolute left-4 top-3.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search student by name or admission number…"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 focus:border-indigo-300 outline-none shadow-sm" />
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">Admission No</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">Fingerprint</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paged.map((s, i) => {
                        const isMarked = markedToday.has(s.id);
                        const isActive = activeStudent?.id === s.id;
                        const isEnrolled = enrolledPins.has(s.id);
                        const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                        return (
                          <tr key={s.id} className={`transition-colors ${isMarked ? 'bg-green-50' : isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 text-xs text-gray-400">{rowNum}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                                  style={{ background: isMarked ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                                  {isMarked ? '✅' : s.first_name.charAt(0)}
                                </div>
                                <p className="text-sm font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.admission_number}</td>
                            <td className="px-4 py-3">
                              {isEnrolled
                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">☝️ Enrolled</span>
                                : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">⚡ Auto-enroll on scan</span>}
                            </td>
                            <td className="px-4 py-3">
                              {isMarked
                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">✅ Present</span>
                                : isActive
                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full animate-pulse">☝️ Scanning…</span>
                                : <span className="text-[10px] text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!isMarked ? (
                                <button onClick={() => requestScan(s)} disabled={scanning && !isActive}
                                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm disabled:opacity-40 transition-all ${isActive ? 'animate-pulse' : ''}`}
                                  style={{ background: isActive ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                                  ☝️ {isActive ? 'Waiting…' : 'Scan Finger'} <FiChevronRight size={11} />
                                </button>
                              ) : (
                                <span className="text-xs text-green-500 font-bold">Done ✅</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {paged.length === 0 && (
                    <div className="text-center py-16">
                      <FiUsers size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">No students found in this class</p>
                    </div>
                  )}
                </div>

                {/* ── PAGINATION BAR ── */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-5 py-3 shadow-sm">
                    <p className="text-xs text-gray-500">
                      Showing <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> students
                      &nbsp;·&nbsp; {markedCount} present
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(1)} disabled={page === 1}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30">«</button>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹ Prev</button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                        return (
                          <button key={pg} onClick={() => setPage(pg)}
                            className={`w-8 h-8 rounded-lg text-xs font-black ${pg === page ? 'text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                            style={pg === page ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' } : {}}>
                            {pg}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30">Next ›</button>
                      <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30">»</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
