'use client';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiRefreshCw, FiUser } from 'react-icons/fi';
import { WhatsAppLog } from '@/lib/biometric-types';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
}

interface Props {
  students: Student[];
}

const STATUS_STEPS = ['queued', 'sent', 'delivered', 'read'] as const;
type StatusStep = typeof STATUS_STEPS[number];

const stepColors: Record<string, string> = {
  queued: 'bg-gray-400',
  sent: 'bg-blue-500',
  delivered: 'bg-green-500',
  read: 'bg-purple-500',
};

function Timeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status as StatusStep);
  return (
    <div className="flex items-center gap-1 mt-2">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors ${i <= currentIdx ? stepColors[step] : 'bg-gray-200'}`}>
            {i <= currentIdx ? '✓' : ''}
          </div>
          <span className={`text-xs capitalize ${i <= currentIdx ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{step}</span>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`w-6 h-0.5 ${i < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HistoryTab({ students }: Props) {
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students.slice(0, 20);
    const q = search.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [students, search]);

  const fetchHistory = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/logs?student_id=${studentId}&limit=100`);
      const data = await res.json();
      if (res.ok) setLogs(data.logs || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleRetry = async (log: WhatsAppLog) => {
    setRetrying(log.id);
    try {
      const res = await fetch('/api/whatsapp/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term_id: log.term_id,
          recipient_filter: 'custom',
          template_key: log.template_name || 'report_card_ready',
          custom_phones: [log.recipient_phone],
        }),
      });
      if (res.ok) {
        toast.success('Message resent');
        if (selectedStudentId) fetchHistory(selectedStudentId);
      } else toast.error('Retry failed');
    } catch { toast.error('Retry failed'); } finally { setRetrying(null); }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const statusColors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    read: 'bg-purple-100 text-purple-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Student selector */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Student</h3>
        <div className="relative mb-3">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or adm no..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredStudents.map(s => (
            <button key={s.id} onClick={() => fetchHistory(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedStudentId === s.id ? 'bg-green-50 border border-green-300 text-green-800' : 'hover:bg-gray-50 border border-transparent'}`}>
              <div className="font-medium">{s.first_name} {s.last_name}</div>
              <div className="text-xs text-gray-400 font-mono">{s.admission_number}</div>
            </button>
          ))}
          {filteredStudents.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No students found</p>
          )}
        </div>
      </div>

      {/* Message history */}
      <div className="lg:col-span-2">
        {!selectedStudentId ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FiUser size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Select a student to view message history</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                History for {selectedStudent?.first_name} {selectedStudent?.last_name}
              </h3>
              <button onClick={() => selectedStudentId && fetchHistory(selectedStudentId)} disabled={loading}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-400">
                <FiRefreshCw size={24} className="animate-spin mx-auto mb-2" />Loading...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No messages sent to this student yet</div>
            ) : (
              <div className="space-y-3">
                {logs.map(l => (
                  <div key={l.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[l.status] || 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                          <span className="text-xs text-gray-500 capitalize">{l.message_type?.replace(/_/g, ' ')}</span>
                          {l.template_name && <span className="text-xs text-gray-400">· {l.template_name}</span>}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {l.sent_at && <div>Sent: {new Date(l.sent_at).toLocaleString()}</div>}
                          {l.delivered_at && <div>Delivered: {new Date(l.delivered_at).toLocaleString()}</div>}
                          {l.read_at && <div>Read: {new Date(l.read_at).toLocaleString()}</div>}
                          {l.error_message && <div className="text-red-500">Error: {l.error_message}</div>}
                        </div>
                        <Timeline status={l.status} />
                      </div>
                      {l.status === 'failed' && (
                        <button onClick={() => handleRetry(l)} disabled={retrying === l.id}
                          className="flex-shrink-0 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50">
                          {retrying === l.id ? '...' : 'Retry'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
