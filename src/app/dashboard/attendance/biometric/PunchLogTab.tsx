'use client';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiDownload, FiSearch, FiThermometer, FiCheckCircle, FiClock } from 'react-icons/fi';
import { BiometricDevice, BiometricLog } from '@/lib/biometric-types';
import * as XLSX from 'xlsx';

interface Props {
  devices: BiometricDevice[];
}

const today = new Date().toISOString().split('T')[0];

export default function PunchLogTab({ devices }: Props) {
  const [logs, setLogs] = useState<BiometricLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filters, setFilters] = useState({
    date_from: today, date_to: today, device_id: '', punch_type: '', student_name: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.set('date_from', filters.date_from + 'T00:00:00');
      if (filters.date_to) params.set('date_to', filters.date_to + 'T23:59:59');
      if (filters.device_id) params.set('device_id', filters.device_id);
      if (filters.punch_type) params.set('punch_type', filters.punch_type);
      params.set('limit', '200');

      const res = await fetch(`/api/biometric/logs?${params}`);
      const data = await res.json();
      if (res.ok) {
        let result = data.logs || [];
        if (filters.student_name) {
          const q = filters.student_name.toLowerCase();
          result = result.filter((l: BiometricLog) => {
            const s = l.student;
            return s && `${s.first_name} ${s.last_name}`.toLowerCase().includes(q);
          });
        }
        setLogs(result);
        setLastRefresh(new Date());
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const todayLogs = logs.filter(l => l.punch_time.startsWith(today));
  const checkIns = todayLogs.filter(l => l.punch_type === 'check_in').length;
  const checkOuts = todayLogs.filter(l => l.punch_type === 'check_out').length;
  const unsynced = logs.filter(l => !l.synced_to_attendance).length;

  const exportCSV = () => {
    const rows = logs.map(l => ({
      'Punch Time': new Date(l.punch_time).toLocaleString(),
      'Student': l.student ? `${l.student.first_name} ${l.student.last_name}` : l.device_user_id,
      'Admission No': l.student?.admission_number || '',
      'Punch Type': l.punch_type,
      'Verify Method': l.verify_method,
      'Device': (l.device as { device_name?: string })?.device_name || '',
      'Temperature': l.temperature ?? '',
      'Synced': l.synced_to_attendance ? 'Yes' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Punch Logs');
    XLSX.writeFile(wb, `biometric_logs_${today}.xlsx`);
  };

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-700">{todayLogs.length}</div>
          <div className="text-xs text-indigo-500">Total Today</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-700">{checkIns}</div>
          <div className="text-xs text-green-500">Check-ins</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-700">{checkOuts}</div>
          <div className="text-xs text-blue-500">Check-outs</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-700">{unsynced}</div>
          <div className="text-xs text-amber-500">Unsynced</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <select value={filters.device_id} onChange={e => setFilters(f => ({ ...f, device_id: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Devices</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.device_name}</option>)}
        </select>
        <select value={filters.punch_type} onChange={e => setFilters(f => ({ ...f, punch_type: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Types</option>
          <option value="check_in">Check In</option>
          <option value="check_out">Check Out</option>
        </select>
        <div className="relative">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.student_name} onChange={e => setFilters(f => ({ ...f, student_name: e.target.value }))}
            placeholder="Student name..." className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {lastRefresh ? `${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <FiDownload size={13} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Device</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Temp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Synced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                  {new Date(l.punch_time).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {l.photo_url && (
                      <img src={l.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 text-xs">
                        {l.student ? `${l.student.first_name} ${l.student.last_name}` : l.device_user_id || '—'}
                      </div>
                      {l.student?.admission_number && (
                        <div className="text-gray-400 text-xs font-mono">{l.student.admission_number}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${l.punch_type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {l.punch_type === 'check_in' ? '↓ In' : '↑ Out'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs capitalize">{l.verify_method}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{(l.device as { device_name?: string })?.device_name || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {l.temperature ? (
                    <span className="flex items-center gap-1"><FiThermometer size={11} />{l.temperature}°C</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {l.synced_to_attendance
                    ? <span className="flex items-center gap-1 text-green-600 text-xs"><FiCheckCircle size={11} />Synced</span>
                    : <span className="flex items-center gap-1 text-amber-600 text-xs"><FiClock size={11} />Pending</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-400 text-sm">No punch logs found for the selected filters</div>
        )}
        {loading && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <FiRefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading...
          </div>
        )}
      </div>
    </div>
  );
}
