'use client';
/**
 * APSIMS Biometric Live Kiosk — Light SHA-style Theme
 * Shows BOTH:
 *  • Student fingerprint scans (from school_attendance via USB ZK9500)
 *  • Staff/Teacher wall device scans (from school_biometric_logs via ZKTeco F18)
 * Polls every 3 seconds, plays beep on new scan, big flash display
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ScanEntry {
  id: string;          // unique key
  name: string;
  type: 'student' | 'staff' | 'unknown';
  status: string;      // Present / Check-In / Check-Out
  time: string;        // HH:MM:SS
  source: 'usb' | 'zkteco';
  raw_time: string;    // ISO for sorting
}

const todayStr = () => new Date().toISOString().split('T')[0];

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
}

export default function BiometricLiveKiosk() {
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [lastScan, setLastScan] = useState<ScanEntry | null>(null);
  const [flash, setFlash] = useState(false);
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const lastIdRef = useRef<string>('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Beep ─────────────────────────────────────────────────────────────────
  const beep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.35);
    } catch {}
  }, []);

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Poll both sources ─────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    const today = todayStr();
    const entries: ScanEntry[] = [];

    // 1. Student attendance (from USB ZK9500 scanner)
    const { data: attData } = await supabase
      .from('school_attendance')
      .select('id, student_id, attendance_date, status, created_at, notes, school_students(first_name, last_name)')
      .eq('attendance_date', today)
      .order('created_at', { ascending: false })
      .limit(50);

    (attData || []).forEach((a: any) => {
      const name = a.school_students
        ? `${a.school_students.first_name} ${a.school_students.last_name}`
        : `Student #${a.student_id}`;
      entries.push({
        id: `att-${a.id}`,
        name,
        type: 'student',
        status: a.status || 'Present',
        time: fmtTime(a.created_at),
        source: 'usb',
        raw_time: a.created_at,
      });
    });

    // 2. Staff biometric logs (from ZKTeco F18 wall device)
    const { data: logData } = await supabase
      .from('school_biometric_logs')
      .select('id, matched_name, matched_type, punch_time, punch_direction, processed')
      .gte('punch_time', today)
      .order('punch_time', { ascending: false })
      .limit(50);

    (logData || []).forEach((l: any) => {
      entries.push({
        id: `log-${l.id}`,
        name: l.matched_name || 'Unknown',
        type: l.matched_type === 'student' ? 'student' : 'staff',
        status: l.punch_direction === '1' ? 'Check-Out' : 'Check-In',
        time: fmtTime(l.punch_time),
        source: 'zkteco',
        raw_time: l.punch_time,
      });
    });

    // Sort all combined entries by time desc
    entries.sort((a, b) => new Date(b.raw_time).getTime() - new Date(a.raw_time).getTime());

    // Count students & staff
    const studCount = entries.filter(e => e.type === 'student').length;
    const stfCount = entries.filter(e => e.type === 'staff').length;
    setStudentCount(studCount);
    setStaffCount(stfCount);

    // Detect new scan
    const newest = entries[0];
    if (newest && newest.id !== lastIdRef.current) {
      lastIdRef.current = newest.id;
      setLastScan(newest);
      setFlash(true);
      beep();
      setTimeout(() => setFlash(false), 2500);
    }

    setScans(entries.slice(0, 30));
  }, [beep]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  const typeColor = (type: string) =>
    type === 'student' ? '#4f46e5' : type === 'staff' ? '#059669' : '#6b7280';
  const typeBg = (type: string) =>
    type === 'student' ? '#eef2ff' : type === 'staff' ? '#d1fae5' : '#f3f4f6';
  const sourceLabel = (src: string) => src === 'usb' ? '☝️ USB' : '📡 ZKTeco';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Flash overlay ── */}
      {flash && lastScan && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          style={{ background: lastScan.type === 'student' ? 'rgba(79,70,229,0.07)' : 'rgba(5,150,105,0.07)' }}>
          <div className="bg-white rounded-3xl shadow-2xl px-14 py-10 text-center border-4 animate-bounce"
            style={{ borderColor: lastScan.type === 'student' ? '#6366f1' : '#10b981' }}>
            <div className="text-6xl mb-3">
              {lastScan.type === 'student' ? '☝️' : '✅'}
            </div>
            <p className="font-black text-3xl text-gray-900">{lastScan.name}</p>
            <p className="font-bold text-lg mt-1" style={{ color: typeColor(lastScan.type) }}>
              {lastScan.status} · {lastScan.time}
            </p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black text-white"
              style={{ background: typeColor(lastScan.type) }}>
              {lastScan.type === 'student' ? '🎓 Student' : '👔 Staff'}
            </span>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>☝️</div>
          <div>
            <h1 className="text-gray-900 font-black text-lg">APSIMS Live Attendance Kiosk</h1>
            <p className="text-gray-400 text-xs">Students + Staff · USB ZK9500 + ZKTeco F18 · Auto-refresh every 3s</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-900 font-black text-2xl tracking-tight">{time}</p>
          <p className="text-gray-400 text-xs">{date}</p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-4 px-6 pt-5">
        {[
          { label: 'Students Present', val: studentCount, icon: '🎓', color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Staff Checked In', val: staffCount, icon: '👔', color: '#059669', bg: '#d1fae5' },
          { label: 'Total Scans Today', val: scans.length, icon: '📊', color: '#0891b2', bg: '#e0f2fe' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: k.bg }}>{k.icon}</div>
            <div>
              <p className="text-3xl font-black" style={{ color: k.color }}>{k.val}</p>
              <p className="text-xs text-gray-500 font-semibold">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-5 px-6 py-5 flex-1">

        {/* ── LEFT: Big last scan ── */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center h-full flex flex-col items-center justify-center">
            {lastScan ? (
              <>
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 shadow-inner"
                  style={{ background: typeBg(lastScan.type) }}>
                  {lastScan.type === 'student' ? '🎓' : '👔'}
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-black text-white mb-3"
                  style={{ background: typeColor(lastScan.type) }}>
                  {lastScan.type === 'student' ? 'STUDENT' : 'STAFF'} · {sourceLabel(lastScan.source)}
                </div>
                <p className="font-black text-2xl text-gray-900 leading-tight">{lastScan.name}</p>
                <p className="font-bold text-base mt-2" style={{ color: typeColor(lastScan.type) }}>{lastScan.status}</p>
                <p className="text-gray-400 text-sm mt-1">{lastScan.time}</p>
                <div className="mt-4 w-full p-3 rounded-2xl" style={{ background: typeBg(lastScan.type) }}>
                  <p className="text-xs font-black" style={{ color: typeColor(lastScan.type) }}>✅ ATTENDANCE SAVED</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-5xl mb-4">☝️</div>
                <p className="font-black text-xl text-gray-700">Ready to Scan</p>
                <p className="text-gray-400 text-sm mt-2">Place finger on ZK9500<br />or ZKTeco F18 device</p>
                <div className="mt-4 flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-xs text-green-600 font-bold">System Active</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Live feed ── */}
        <div className="flex-1">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <p className="font-black text-gray-800 text-sm">Live Feed — Students & Staff</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-black">☝️ USB = Student</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-black">📡 ZKTeco = Staff</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <span className="text-5xl mb-3">📡</span>
                  <p className="font-semibold text-sm">No scans yet today</p>
                  <p className="text-xs mt-1">Waiting for fingerprint scans…</p>
                </div>
              ) : scans.map((s, i) => (
                <div key={s.id}
                  className={`flex items-center gap-4 px-5 py-3 transition-colors ${i === 0 ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: typeBg(s.type) }}>
                    {s.type === 'student' ? '🎓' : '👔'}
                  </div>
                  {/* Name & details */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${i === 0 ? 'text-indigo-900' : 'text-gray-800'}`}>{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                        style={{ background: typeBg(s.type), color: typeColor(s.type) }}>
                        {s.type === 'student' ? 'Student' : 'Staff'}
                      </span>
                      <span className="text-[10px] text-gray-400">{sourceLabel(s.source)}</span>
                      <span className="text-[10px] text-gray-400">{s.status}</span>
                    </div>
                  </div>
                  {/* Time */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-black ${i === 0 ? 'text-indigo-700' : 'text-gray-600'}`}>{s.time}</p>
                    {i === 0 && (
                      <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">LATEST</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">Showing last 30 scans · Auto-refresh every 3s</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] text-gray-400">Student (USB ZK9500)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[10px] text-gray-400">Staff (ZKTeco F18)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">APSIMS · Alpha School Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs text-green-600 font-bold">Live · Updating every 3 seconds</p>
        </div>
        <p className="text-xs text-gray-400">📅 {new Date().toLocaleDateString('en-KE')}</p>
      </div>
    </div>
  );
}
