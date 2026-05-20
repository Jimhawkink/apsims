'use client';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiSend, FiEye, FiWifiOff, FiCheckCircle } from 'react-icons/fi';
import { useOffline } from '@/hooks/useOffline';
import { WhatsAppTemplate } from '@/lib/biometric-types';

interface Term { id: number; term_name: string; academic_year: string; }
interface Form { id: number; form_name: string; }
interface Stream { id: number; stream_name: string; form_id: number; }

const BUILT_IN_TEMPLATES: WhatsAppTemplate[] = [
  { key: 'report_card_ready', name: 'Report Card Ready', language: 'en', category: 'UTILITY', parameters: ['student_name', 'term', 'school_name'], approved: true, sampleBody: 'Dear Parent, {{1}}\'s report card for {{2}} is ready. Please visit {{3}} to collect it.', description: 'Notify parents that report cards are ready' },
  { key: 'fee_reminder', name: 'Fee Reminder', language: 'en', category: 'UTILITY', parameters: ['student_name', 'amount', 'due_date'], approved: true, sampleBody: 'Dear Parent, {{1}} has an outstanding fee balance of KES {{2}}. Please pay by {{3}}.', description: 'Remind parents of outstanding fees' },
  { key: 'exam_results', name: 'Exam Results', language: 'en', category: 'UTILITY', parameters: ['student_name', 'exam_name', 'position'], approved: true, sampleBody: 'Dear Parent, {{1}} scored in position {{3}} in the {{2}} examination.', description: 'Share exam results with parents' },
  { key: 'meeting_notice', name: 'Meeting Notice', language: 'en', category: 'UTILITY', parameters: ['date', 'time', 'venue'], approved: true, sampleBody: 'Dear Parent, you are invited to a school meeting on {{1}} at {{2}} at {{3}}.', description: 'Invite parents to school meetings' },
  { key: 'emergency_alert', name: 'Emergency Alert', language: 'en', category: 'UTILITY', parameters: ['message'], approved: true, sampleBody: 'URGENT: {{1}}', description: 'Send emergency alerts to parents' },
  { key: 'holiday_notice', name: 'Holiday Notice', language: 'en', category: 'UTILITY', parameters: ['holiday_name', 'date'], approved: true, sampleBody: 'Dear Parent, school will be closed for {{1}} on {{2}}.', description: 'Notify parents of school holidays' },
];

interface Props {
  terms: Term[];
  forms: Form[];
  streams: Stream[];
}

export default function SendTab({ terms, forms, streams }: Props) {
  const { isOffline } = useOffline();
  const [selectedTerm, setSelectedTerm] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'by_form' | 'by_stream' | 'custom'>('all');
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [customPhones, setCustomPhones] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(BUILT_IN_TEMPLATES[0].key);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [progress, setProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const template = BUILT_IN_TEMPLATES.find(t => t.key === selectedTemplate)!;

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const handleSend = async () => {
    if (!selectedTerm) { toast.error('Please select a term'); return; }
    if (isOffline) { toast.error('Cannot send while offline'); return; }

    setSending(true);
    setResult(null);
    setProgress({ sent: 0, failed: 0, total: 0 });

    try {
      const body: Record<string, unknown> = {
        term_id: parseInt(selectedTerm),
        recipient_filter: recipientFilter,
        template_key: selectedTemplate,
      };
      if (recipientFilter === 'by_form' && selectedForm) body.form_id = parseInt(selectedForm);
      if (recipientFilter === 'by_stream' && selectedStream) body.stream_id = parseInt(selectedStream);
      if (recipientFilter === 'custom') {
        body.custom_phones = customPhones.split('\n').map(p => p.trim()).filter(Boolean);
      }

      // Poll for progress every 2 seconds
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/whatsapp/logs?term_id=${selectedTerm}&limit=1000`);
        const data = await res.json();
        if (data.stats) setProgress({ sent: data.stats.sent, failed: data.stats.failed, total: data.stats.total });
      }, 2000);

      const res = await fetch('/api/whatsapp/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      stopPolling();

      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setProgress(null);
      toast.success(`Sent ${data.sent}/${data.total} messages`);
    } catch (e: unknown) {
      stopPolling();
      setProgress(null);
      toast.error(e instanceof Error ? e.message : 'Send failed');
    } finally { setSending(false); }
  };

  useEffect(() => () => stopPolling(), []);

  const filteredStreams = streams.filter(s => !selectedForm || s.form_id === parseInt(selectedForm));

  return (
    <div className="max-w-2xl space-y-5">
      {/* Term selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Term *</label>
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
          <option value="">Select term...</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} — {t.academic_year}</option>)}
        </select>
      </div>

      {/* Recipient filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Recipients</label>
        <div className="grid grid-cols-2 gap-2">
          {(['all', 'by_form', 'by_stream', 'custom'] as const).map(f => (
            <label key={f} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${recipientFilter === f ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="filter" value={f} checked={recipientFilter === f} onChange={() => setRecipientFilter(f)} className="text-green-600" />
              <span className="text-sm font-medium capitalize">{f === 'by_form' ? 'By Form' : f === 'by_stream' ? 'By Stream' : f === 'custom' ? 'Custom Phones' : 'All Students'}</span>
            </label>
          ))}
        </div>
        {recipientFilter === 'by_form' && (
          <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)} className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
            <option value="">Select form...</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select>
        )}
        {recipientFilter === 'by_stream' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
              <option value="">All forms</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
              <option value="">Select stream...</option>
              {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
        )}
        {recipientFilter === 'custom' && (
          <textarea value={customPhones} onChange={e => setCustomPhones(e.target.value)} rows={4}
            placeholder="Enter phone numbers, one per line&#10;e.g. 0712345678&#10;0723456789"
            className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none font-mono" />
        )}
      </div>

      {/* Template selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message Template</label>
        <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
          {BUILT_IN_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        <button onClick={() => setShowPreview(p => !p)} className="mt-2 flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700">
          <FiEye size={13} /> {showPreview ? 'Hide' : 'Preview'} message
        </button>
        {showPreview && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-1">Preview</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{template.sampleBody}</p>
            <p className="text-xs text-gray-400 mt-2">Parameters: {template.parameters.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {(sending || progress) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Sending messages...</span>
            <span className="text-gray-500">{progress?.sent ?? 0} / {progress?.total ?? '?'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: progress?.total ? `${Math.round(((progress.sent + progress.failed) / progress.total) * 100)}%` : '0%' }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="text-green-600">✓ {progress?.sent ?? 0} sent</span>
            <span className="text-red-500">✗ {progress?.failed ?? 0} failed</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <FiCheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Send Complete</p>
            <p className="text-sm text-green-700 mt-0.5">
              {result.sent} sent · {result.failed} failed · {result.total} total
            </p>
          </div>
        </div>
      )}

      {/* Send button */}
      <button onClick={handleSend} disabled={sending || isOffline || !selectedTerm}
        className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
        {isOffline ? <FiWifiOff size={16} /> : <FiSend size={16} />}
        {sending ? 'Sending...' : isOffline ? 'Offline — Cannot Send' : 'Send Report Cards'}
      </button>
    </div>
  );
}
