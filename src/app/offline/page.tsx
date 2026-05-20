'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCount } from '@/lib/indexeddb';
import { getQueueCount } from '@/lib/offline-sync';
import { FiWifiOff, FiRefreshCw, FiUsers, FiClock, FiDatabase } from 'react-icons/fi';

export default function OfflinePage() {
  const router = useRouter();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Load IndexedDB stats
    const loadStats = async () => {
      try {
        const [sc, qc] = await Promise.all([
          getCount('students'),
          getQueueCount(),
        ]);
        setStudentCount(sc);
        setQueueCount(qc);
      } catch { /* ignore */ }
      const ls = localStorage.getItem('apsims-last-sync');
      if (ls) setLastSync(new Date(parseInt(ls)).toLocaleString());
    };
    loadStats();

    // Auto-redirect when back online
    const handleOnline = () => {
      setCountdown(3);
    };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { router.push('/dashboard'); return; }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FiWifiOff className="text-white" size={36} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">You are offline</h1>
        <p className="text-gray-500 mb-6">
          APSIMS is running in offline mode. Your data is safe and will sync automatically when you reconnect.
        </p>

        {/* Reconnecting banner */}
        {countdown !== null && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6 flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
            <FiRefreshCw size={14} className="animate-spin" />
            Back online! Redirecting in {countdown}s...
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-indigo-50 rounded-xl p-3">
            <FiUsers className="text-indigo-600 mx-auto mb-1" size={20} />
            <div className="text-xl font-bold text-indigo-700">{studentCount ?? '—'}</div>
            <div className="text-xs text-indigo-500">Cached Students</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <FiDatabase className="text-amber-600 mx-auto mb-1" size={20} />
            <div className="text-xl font-bold text-amber-700">{queueCount ?? '—'}</div>
            <div className="text-xs text-amber-500">Pending Sync</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <FiClock className="text-gray-500 mx-auto mb-1" size={20} />
            <div className="text-xs font-bold text-gray-700 leading-tight">{lastSync ?? 'Never'}</div>
            <div className="text-xs text-gray-400">Last Sync</div>
          </div>
        </div>

        {/* Cached pages */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Available Offline</p>
          {['/dashboard', '/dashboard/attendance', '/dashboard/students', '/dashboard/fees/outstanding'].map(p => (
            <div key={p} className="flex items-center gap-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">{p}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <FiRefreshCw size={16} />
          Try Again
        </button>

        <p className="text-xs text-gray-400 mt-4">APSIMS — AlphaSchool Management System</p>
      </div>
    </div>
  );
}
