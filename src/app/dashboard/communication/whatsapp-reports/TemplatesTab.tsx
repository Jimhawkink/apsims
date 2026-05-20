'use client';
import { useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiEye, FiMessageSquare } from 'react-icons/fi';

interface Template {
  key: string;
  name: string;
  language: string;
  category: string;
  parameters: string[];
  approved: boolean;
  sampleBody: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    key: 'report_card_ready', name: 'Report Card Ready', language: 'en', category: 'UTILITY',
    parameters: ['student_name', 'term', 'school_name'], approved: true,
    sampleBody: 'Dear Parent, {{1}}\'s report card for {{2}} is ready. Please visit {{3}} to collect it or view it online.',
    description: 'Notify parents that report cards are ready for collection',
  },
  {
    key: 'fee_reminder', name: 'Fee Reminder', language: 'en', category: 'UTILITY',
    parameters: ['student_name', 'amount', 'due_date'], approved: true,
    sampleBody: 'Dear Parent, {{1}} has an outstanding fee balance of KES {{2}}. Please pay by {{3}} to avoid disruption.',
    description: 'Remind parents of outstanding fee balances',
  },
  {
    key: 'exam_results', name: 'Exam Results', language: 'en', category: 'UTILITY',
    parameters: ['student_name', 'exam_name', 'position'], approved: true,
    sampleBody: 'Dear Parent, {{1}} scored in position {{3}} in the {{2}} examination. Well done!',
    description: 'Share exam results and positions with parents',
  },
  {
    key: 'meeting_notice', name: 'Meeting Notice', language: 'en', category: 'UTILITY',
    parameters: ['date', 'time', 'venue'], approved: true,
    sampleBody: 'Dear Parent, you are cordially invited to a school meeting on {{1}} at {{2}} at {{3}}. Your attendance is important.',
    description: 'Invite parents to school meetings and events',
  },
  {
    key: 'emergency_alert', name: 'Emergency Alert', language: 'en', category: 'UTILITY',
    parameters: ['message'], approved: true,
    sampleBody: 'URGENT NOTICE: {{1}}',
    description: 'Send urgent emergency alerts to all parents',
  },
  {
    key: 'holiday_notice', name: 'Holiday Notice', language: 'en', category: 'UTILITY',
    parameters: ['holiday_name', 'date'], approved: true,
    sampleBody: 'Dear Parent, school will be closed for {{1}} on {{2}}. School reopens the following day.',
    description: 'Notify parents of upcoming school holidays',
  },
];

export default function TemplatesTab() {
  const [selected, setSelected] = useState<Template>(TEMPLATES[0]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const renderPreview = () => {
    let body = selected.sampleBody;
    selected.parameters.forEach((p, i) => {
      body = body.replace(`{{${i + 1}}}`, params[p] || `[${p}]`);
    });
    return body;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Template list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Templates</h3>
        <div className="space-y-2">
          {TEMPLATES.map(t => (
            <button key={t.key} onClick={() => { setSelected(t); setParams({}); setShowPreview(false); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selected.key === t.key ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FiMessageSquare size={13} className={selected.key === t.key ? 'text-green-600' : 'text-gray-400'} />
                    <span className="font-semibold text-sm text-gray-900">{t.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t.description}</p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.category}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.language.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {t.approved
                    ? <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><FiCheckCircle size={10} />Approved</span>
                    : <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><FiAlertCircle size={10} />Not Approved</span>
                  }
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Template detail & preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Template Details</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-900">{selected.name}</h4>
            {!selected.approved && (
              <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                <FiAlertCircle size={11} /> Not approved for bulk send
              </span>
            )}
          </div>

          {/* Template body */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Template Body</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.sampleBody}</p>
          </div>

          {/* Parameter inputs */}
          {selected.parameters.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase">Parameters</p>
              {selected.parameters.map((p, i) => (
                <div key={p}>
                  <label className="block text-xs text-gray-600 mb-1">
                    {`{{${i + 1}}}`} — <span className="font-medium">{p.replace(/_/g, ' ')}</span>
                  </label>
                  <input value={params[p] || ''} onChange={e => setParams(prev => ({ ...prev, [p]: e.target.value }))}
                    placeholder={`Enter ${p.replace(/_/g, ' ')}...`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                </div>
              ))}
            </div>
          )}

          {/* Preview button */}
          <button onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 mb-3">
            <FiEye size={13} /> {showPreview ? 'Hide' : 'Show'} Preview
          </button>

          {showPreview && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 mb-2">📱 Message Preview</p>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{renderPreview()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
