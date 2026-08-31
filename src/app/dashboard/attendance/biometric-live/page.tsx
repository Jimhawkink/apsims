'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ScanLog {
  id: number;
  pin: string;
  punch_time: string;
  verify_label: string;
  punch_direction: string;
  matched_name?: string;
  matched_type?: string;
  processed: boolean;
  device_sn?: string;
}

export default function BiometricLiveDisplay() {
  const [lastScan, setLastScan] = useState<ScanLog | null>(null);
  const [prevScanId, setPrevScanId] = useState<number | null>(null);
  const [recentScans, setRecentScans] = useState<ScanLog[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const prevIdRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // ── Play success beep ─────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Poll biometric logs every 3 seconds ───────────────────────────────────
  const pollLogs = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('school_biometric_logs')
      .select('*')
      .gte('punch_time', `${today}T00:00:00`)
      .neq('pin', '__HEARTBEAT__')
      .order('punch_time', { ascending: false })
      .limit(20);

    if (!data || data.length === 0) return;

    const latest = data[0];
    setRecentScans(data.slice(0, 10));
    setTodayCount(data.length);

    // If new scan detected
    if (prevIdRef.current !== latest.id) {
      prevIdRef.current = latest.id;
      setLastScan(latest);
      setPrevScanId(latest.id);
      setFlash(true);
      playBeep();
      setTimeout(() => setFlash(false), 3000);
    }
  }, [playBeep]);

  useEffect(() => {
    pollLogs();
    const interval = setInterval(pollLogs, 3000);
    return () => clearInterval(interval);
  }, [pollLogs]);

  const verifyIcon = (label?: string) => {
    if (!label) return '🔐';
    if (label.includes('Face')) return '😊';
    if (label.includes('Card') || label.includes('RFID')) return '💳';
    if (label.includes('Fingerprint')) return '☝️';
    return '🔐';
  };

  const timeAgo = (t: string) => {
    const diff = Math.floor((Date.now() - new Date(t).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(t).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)' }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
            ☝️
          </div>
          <div>
            <p className="text-white font-black text-lg">AlphaSchool Biometric</p>
            <p className="text-indigo-300 text-xs">ZKTeco Attendance System</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-2xl tabular-nums tracking-widest">{currentTime}</p>
          <p className="text-indigo-300 text-xs">{currentDate}</p>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 lg:p-8">

        {/* ── LEFT: LIVE SCAN DISPLAY ── */}
        <div className="flex-1 flex flex-col items-center justify-center">

          {/* Flash overlay */}
          {flash && (
            <div className="fixed inset-0 pointer-events-none z-50 animate-pulse"
              style={{ background: 'rgba(16,185,129,0.08)', border: '4px solid rgba(16,185,129,0.3)' }} />
          )}

          {lastScan ? (
            <div className={`w-full max-w-lg transition-all duration-500 ${flash ? 'scale-105' : 'scale-100'}`}>

              {/* Status badge */}
              <div className="flex justify-center mb-6">
                <div className={`px-6 py-2 rounded-full text-sm font-black tracking-wider transition-all ${flash ? 'bg-green-500 text-white shadow-lg shadow-green-500/40' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                  {flash ? '✅ ATTENDANCE SAVED!' : '✅ LAST SCAN'}
                </div>
              </div>

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <div className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl font-black shadow-2xl transition-all duration-300 ${flash ? 'shadow-green-500/50 scale-110' : ''}`}
                  style={{
                    background: lastScan.matched_type === 'student'
                      ? 'linear-gradient(135deg,#3b82f6,#6366f1)'
                      : lastScan.matched_type === 'staff'
                      ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
                      : 'linear-gradient(135deg,#ef4444,#dc2626)',
                    border: flash ? '4px solid #10b981' : '4px solid rgba(255,255,255,0.1)',
                  }}>
                  {lastScan.matched_name
                    ? lastScan.matched_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                    : '?'}
                </div>
              </div>

              {/* Name */}
              <div className="text-center mb-4">
                {lastScan.matched_name ? (
                  <>
                    <p className="text-white font-black text-4xl lg:text-5xl leading-tight">{lastScan.matched_name}</p>
                    <p className="text-indigo-300 text-sm mt-2 capitalize font-semibold">
                      {lastScan.matched_type === 'student' ? '🎓 Student' : '👔 Staff Member'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-red-400 font-black text-3xl">Unknown PIN</p>
                    <p className="text-red-300 text-sm mt-1 font-mono">{lastScan.pin}</p>
                    <p className="text-red-400 text-xs mt-1">Not enrolled in system</p>
                  </>
                )}
              </div>

              {/* Details row */}
              <div className="flex justify-center gap-4 mt-4">
                <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl">{verifyIcon(lastScan.verify_label)}</p>
                  <p className="text-xs text-indigo-300 mt-1">{lastScan.verify_label || 'Scan'}</p>
                </div>
                <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl">{lastScan.punch_direction === 'IN' ? '🟢' : '🔴'}</p>
                  <p className="text-xs text-indigo-300 mt-1">{lastScan.punch_direction}</p>
                </div>
                <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl">🕐</p>
                  <p className="text-xs text-indigo-300 mt-1">{new Date(lastScan.punch_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Success message */}
              {lastScan.processed && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-green-400"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Attendance recorded in APSIMS
                  </div>
                </div>
              )}
              {!lastScan.processed && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    ⚠️ PIN not registered — enroll this person first
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Waiting state */
            <div className="text-center">
              <div className="w-40 h-40 mx-auto rounded-full flex items-center justify-center mb-6 animate-pulse"
                style={{ background: 'rgba(99,102,241,0.1)', border: '2px dashed rgba(99,102,241,0.4)' }}>
                <span className="text-6xl">☝️</span>
              </div>
              <p className="text-white font-black text-3xl mb-2">Ready to Scan</p>
              <p className="text-indigo-400 text-sm">Place finger or card on ZKTeco device</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                <span className="text-green-400 text-xs font-bold">System Active — Waiting for scan…</span>
              </div>
            </div>
          )}

          {/* Today counter */}
          <div className="mt-8 flex items-center gap-6">
            <div className="text-center px-6 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-3xl font-black text-white">{todayCount}</p>
              <p className="text-xs text-indigo-300 mt-0.5 font-semibold">Scans Today</p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-3xl font-black text-white">{recentScans.filter(s => s.processed).length}</p>
              <p className="text-xs text-indigo-300 mt-0.5 font-semibold">Matched</p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-3xl font-black text-white">{recentScans.filter(s => !s.processed).length}</p>
              <p className="text-xs text-red-300 mt-0.5 font-semibold">Unknown</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT: RECENT SCANS FEED ── */}
        <div className="w-full lg:w-80 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-white font-bold text-sm">Recent Scans — Live Feed</p>
          </div>
          {recentScans.length === 0 && (
            <div className="text-center py-10 text-indigo-400">
              <p className="text-3xl mb-2">📡</p>
              <p className="text-sm">No scans yet today</p>
            </div>
          )}
          {recentScans.map((scan, i) => (
            <div key={scan.id}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${i === 0 ? 'border-2 border-green-500/40' : 'border border-white/10'}`}
              style={{ background: i === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{
                  background: scan.matched_type === 'student' ? 'rgba(59,130,246,0.2)'
                    : scan.matched_type === 'staff' ? 'rgba(139,92,246,0.2)'
                    : 'rgba(239,68,68,0.2)'
                }}>
                {scan.matched_type === 'student' ? '🎓' : scan.matched_type === 'staff' ? '👔' : '❓'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {scan.matched_name || <span className="text-red-400">PIN: {scan.pin}</span>}
                </p>
                <p className="text-[10px] text-indigo-400">{verifyIcon(scan.verify_label)} {scan.verify_label} · {timeAgo(scan.punch_time)}</p>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${scan.processed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {scan.processed ? '✅' : '⚠️'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="px-8 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <p className="text-xs text-green-400 font-semibold">APSIMS Biometric — Server Active 24/7</p>
        </div>
        <p className="text-xs text-indigo-400">Auto-refreshing every 3 seconds · No page needs to stay open for attendance to save</p>
        <a href="/dashboard/attendance/zkteco"
          className="text-xs text-indigo-400 hover:text-white transition-colors font-semibold">
          Admin Panel →
        </a>
      </div>
    </div>
  );
}
