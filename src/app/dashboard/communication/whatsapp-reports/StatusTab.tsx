'use client';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiMessageSquare, FiCheckCircle, FiEye, FiAlertCircle, FiClock, FiDollarSign } from 'react-icons/fi';
import { WhatsAppLog, WhatsAppStats, calculateCostSavings } from '@/lib/biometric-types';
import * as XLSX from 'xlsx';

interface Term { id: number; term_name: string; academic_year: string; }
interface Form { id: number; form_name: string; }

interface Props {
  terms: Term[];
  forms: Form[];
}

const statusColors: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  read: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

export default function StatusTab({ terms, forms }: Props) {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [stats, setStats] = useState<WhatsAppStats>({ queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [filters, setFilters] = useState({ status: '', term_id: '', form_id: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (filters.status) params.set('status', filters.status);
      if (filters.term_id) params.set('term_id', filters.term_id);
      const res = await fetch(`/api/whatsapp/logs?${params}`);
      const data = await res.json();
      if (res.ok) { setLogs(data.logs || []); setStats(data.stats || {}); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRetry = async (log: WhatsAppLog) => {
    if (!log.student_id) return;
    setRetrying(log.id);
    try {
      const res = await fetch('/api/whatsapp/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term_id: log.term_id, recipient_filter: 'custom', template_key: log.template_name || 'report_card_ready', custom_phones: [log.recipient_phone] }),
      });
      if (res.ok) { toast.success('Message resent'); fetchLogs(); }
      else toast.error('Retry failed');
    } catch { toast.error('Retry failed'); } finally { setRetrying(null); }
  };

  const handleRetryAll = async () => {
    const failed = logs.filter(l => l.status === 'failed');
    if (failed.length === 0) { toast('No failed messages to retry'); return; }
    toast(`Retrying ${failed.length} failed messages...`);
    const BATCH = 20;
    for (let i = 0; i < failed.length; i += BATCH) {
      const batch = failed.slice(i, i + BATCH);
      await Promise.all(batch.map(l => handleRetry(l)));
      if (i + BATCH < failed.length) await new Promise(r => setTimeout(r, 1000));
    }
    fetchLogs();
  };

  const exportCSV = () => {
    const rows = logs.map(l => ({
      'Student': l.student ? `${l.student.first_name} ${l.student.last_name}` : '',
      'Admission No': l.student?.admission_number || '',
      'Guardian': l.recipient_name || '',
      'Phone': l.recipient_phone,
      'Status': l.status,
      'Sent At': l.sent_at ? new Date(l.sent_at).toLocaleString() : '',
      'Delivered At': l.delivered_at ? new Date(l.delivered_at).toLocaleString() : '',
      'Read At': l.read_at ? new Date(l.read_at).toLocaleString() : '',
      'Template': l.template_name || '',
      'Error': l.error_message || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'WhatsApp Logs');
    XLSX.writeFile(wb, `whatsapp_delivery_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalSent = stats.sent + stats.delivered + stats.read;
  const savings = calculateCostSavings(totalSent);

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Queued', value: stats.queued, icon: FiClock, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Sent', value: stats.sent, icon: FiMessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Delivered', value: stats.delivered, icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Read', value: stats.read, icon: FiEye, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Failed', value: stats.failed, icon: FiAlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
            <Icon size={20} className={`${color} mx-auto mb-1`} />
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Cost savings */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
          <FiDollarSign className="text-white" size={18} />
        </div>
        <div>
          <p className="font-semibold text-green-800">Cost Savings vs SMS</p>
          <p className="text-sm text-green-700">
            {totalSent} messages × KES 1.00 = <span className="font-bold">KES {savings.toFixed(2)} saved</span>
          </p>
        </div>
      </div>

      {/* Filters & actions */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
          <option value="">All Statuses</option>
          {['queued', 'sent', 'delivered', 'read', 'failed'].map(s => <option key={s} className="capitalize">{s}</option>)}
        </select>
        <select value={filters.term_id} onChange={e => setFilters(f => ({ ...f, term_id: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
          <option value="">All Terms</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          {stats.failed > 0 && (
            <button onClick={handleRetryAll} className="flex items-center gap-1.5 text-sm text-red-600 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50">
              <FiRefreshCw size={13} /> Retry All Failed ({stats.failed})
            </button>
          )}
          <button onClick={fetchLogs} disabled={loading} className="flex items-center gap-1.5 text-sm text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <FiDownload size={13} /> Export
          </button>
        </div>
      </div>

      {/* Delivery log table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Guardian</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Delivered</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Read</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 text-xs">
                  {l.student ? `${l.student.first_name} ${l.student.last_name}` : '—'}
                  {l.student?.admission_number && <div className="text-gray-400 font-mono">{l.student.admission_number}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{l.recipient_name || '—'}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{l.recipient_phone}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[l.status] || 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{l.sent_at ? new Date(l.sent_at).toLocaleTimeString() : '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{l.delivered_at ? new Date(l.delivered_at).toLocaleTimeString() : '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{l.read_at ? new Date(l.read_at).toLocaleTimeString() : '—'}</td>
                <td className="px-4 py-3">
                  {l.status === 'failed' && (
                    <button onClick={() => handleRetry(l)} disabled={retrying === l.id}
                      className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-100 disabled:opacity-50">
                      {retrying === l.id ? '...' : 'Retry'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-400 text-sm">No delivery logs found</div>
        )}
      </div>
    </div>
  );
}
