'use client';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiToggleLeft, FiToggleRight, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';
import { SyncResult } from '@/lib/biometric-types';

interface SyncRun extends SyncResult {
  ran_at: string;
}

export default function SyncTab() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncRun | null>(null);
  const [history, setHistory] = useState<SyncRun[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState<number | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [autoInterval, setAutoInterval] = useState(5);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnsyncedCount = async () => {
    try {
      const res = await fetch('/api/biometric/logs?synced=false&limit=1000');
      const data = await res.json();
      setUnsyncedCount(data.total ?? data.logs?.length ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchUnsyncedCount(); }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/biometric/sync', { method: 'POST' });
      const data: SyncResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error);
      const run: SyncRun = { ...data, ran_at: new Date().toISOString() };
      setLastResult(run);
      setHistory(h => [run, ...h].slice(0, 10));
      toast.success(`Synced ${data.processed} logs: ${data.created} created, ${data.updated} updated, ${data.skipped} skipped${data.errors > 0 ? `, ${data.errors} errors` : ''}`);
      fetchUnsyncedCount();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally { setSyncing(false); }
  };

  // Auto-sync toggle
  useEffect(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (autoSync) {
      autoRef.current = setInterval(runSync, autoInterval * 60 * 1000);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoSync, autoInterval]);

  return (
    <div className="max-w-2xl">
      {/* Main sync card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Biometric → Attendance Sync</h3>
            <p className="text-sm text-gray-500 mt-0.5">Convert unsynced punch logs into daily attendance records</p>
          </div>
          {unsyncedCount !== null && (
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${unsyncedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {unsyncedCount} unsynced
            </span>
          )}
        </div>

        <button onClick={runSync} disabled={syncing}
          className="flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <FiRefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {lastResult && (
          <div className="mt-4 bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Last Sync Result</p>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { label: 'Processed', value: lastResult.processed, color: 'text-gray-700' },
                { label: 'Created', value: lastResult.created, color: 'text-green-600' },
                { label: 'Updated', value: lastResult.updated, color: 'text-blue-600' },
                { label: 'Skipped', value: lastResult.skipped, color: 'text-amber-600' },
                { label: 'Errors', value: lastResult.errors, color: 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">
              {new Date(lastResult.ran_at).toLocaleString()} · {lastResult.duration_ms}ms
            </p>
          </div>
        )}
      </div>

      {/* Auto-sync */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Auto-Sync</h3>
            <p className="text-sm text-gray-500 mt-0.5">Automatically sync biometric logs on a schedule</p>
          </div>
          <button onClick={() => setAutoSync(a => !a)} className="text-indigo-600 hover:text-indigo-700">
            {autoSync ? <FiToggleRight size={32} /> : <FiToggleLeft size={32} className="text-gray-400" />}
          </button>
        </div>
        {autoSync && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-gray-600">Sync every</span>
            <select value={autoInterval} onChange={e => setAutoInterval(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {[5, 10, 15, 30].map(v => <option key={v} value={v}>{v} minutes</option>)}
            </select>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <FiCheckCircle size={12} /> Active
            </span>
          </div>
        )}
      </div>

      {/* Sync history */}
      {history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Sync History</h3>
          <div className="space-y-2">
            {history.map((run, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 text-sm">
                  <FiClock size={13} className="text-gray-400" />
                  <span className="text-gray-600">{new Date(run.ran_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">{run.processed} processed</span>
                  <span className="text-green-600">{run.created} created</span>
                  {run.errors > 0 && <span className="text-red-600 flex items-center gap-0.5"><FiAlertCircle size={11} />{run.errors} errors</span>}
                  <span className="text-gray-400">{run.duration_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
