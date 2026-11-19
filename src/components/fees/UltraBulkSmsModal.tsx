/**
 * UltraBulkSmsModal.tsx
 * Bulk Fee Reminder SMS Dispatcher
 * Features: Variable tags ([STUDENT_NAME], [ADM_NO], [BALANCE], [PAYBILL]),
 * Phone number verification, real-time message length & SMS credit counter, and dispatch progress.
 */

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiSend, FiX, FiCheckCircle, FiUsers, FiAlertTriangle } from 'react-icons/fi';
import { fmt } from '@/hooks/useUltraFeeCollect';

interface DefaulterTarget {
  id: number;
  first_name: string;
  last_name: string;
  admission_no?: string;
  admission_number?: string;
  guardian_phone?: string;
  annualBalance: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targets: DefaulterTarget[];
  schoolName?: string;
}

export default function UltraBulkSmsModal({ isOpen, onClose, targets, schoolName = 'Alpha Premier School' }: Props) {
  const [template, setTemplate] = useState(
    `Dear Parent/Guardian of [STUDENT_NAME] (Adm: [ADM_NO]), your school fee arrears of [BALANCE] is overdue. Please settle promptly via Paybill to ensure uninterrupted learning. Thank you, ${schoolName}.`
  );
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  if (!isOpen) return null;

  // Filter only those with guardian phones
  const validTargets = targets.filter(t => Boolean(t.guardian_phone && t.guardian_phone.trim().length >= 9));
  const missingPhoneCount = targets.length - validTargets.length;

  // Character calculations
  const charLength = template.length;
  const smsSegments = Math.ceil(charLength / 160) || 1;
  const totalCreditsNeeded = validTargets.length * smsSegments;

  // Sample preview with first student
  const sampleStudent = validTargets[0] || targets[0];
  const sampleAdm = sampleStudent?.admission_no || sampleStudent?.admission_number || '2026/001';
  const sampleName = sampleStudent ? `${sampleStudent.first_name} ${sampleStudent.last_name}` : 'Aaron Koech';
  const sampleBal = sampleStudent ? fmt(sampleStudent.annualBalance) : 'KES 15,000';

  const previewMessage = template
    .replace(/\[STUDENT_NAME\]/g, sampleName)
    .replace(/\[ADM_NO\]/g, sampleAdm)
    .replace(/\[BALANCE\]/g, sampleBal);

  const handleBulkSend = async () => {
    if (validTargets.length === 0) {
      toast.error('No selected students have valid guardian phone numbers.');
      return;
    }

    setIsSending(true);
    setSentCount(0);
    setFailedCount(0);
    const toastId = toast.loading(`Dispatching SMS queue to ${validTargets.length} parents...`);

    let success = 0;
    let failed = 0;

    for (const st of validTargets) {
      const adm = st.admission_no || st.admission_number || '';
      const name = `${st.first_name} ${st.last_name}`;
      const bal = fmt(st.annualBalance);

      const personalized = template
        .replace(/\[STUDENT_NAME\]/g, name)
        .replace(/\[ADM_NO\]/g, adm)
        .replace(/\[BALANCE\]/g, bal);

      try {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: st.guardian_phone,
            message: personalized,
            messageType: 'Fee Reminder',
          }),
        });
        const result = await res.json();
        if (result.success && result.status !== 'skipped') {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      setSentCount(success);
      setFailedCount(failed);
    }

    setIsSending(false);
    toast.dismiss(toastId);
    if (success > 0) {
      toast.success(`Dispatched ${success} fee reminder SMS successfully!`);
      onClose();
    } else {
      toast.error('Failed to dispatch SMS or SMS gateway not configured.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-5 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-lg w-full overflow-hidden my-auto animate-slideUpIn flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <FiMessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Bulk Fee Reminder SMS
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Dispatch personalized SMS to {validTargets.length} selected parent phones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center text-xs font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Stats Strip */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Selected</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{targets.length}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Valid Phones</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">{validTargets.length}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/80">
              <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Est. Credits</div>
              <div className="text-sm font-black text-amber-800 mt-0.5 font-mono">{totalCreditsNeeded}</div>
            </div>
          </div>

          {missingPhoneCount > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{missingPhoneCount} selected student(s) have no guardian phone and will be skipped.</span>
            </div>
          )}

          {/* Template Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                SMS Template
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {charLength} chars ({smsSegments} credit{smsSegments > 1 ? 's' : ''}/SMS)
              </span>
            </div>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none"
            />
            {/* Template Variable Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold">Dynamic Tags:</span>
              {[
                { tag: '[STUDENT_NAME]', label: 'Student Name' },
                { tag: '[ADM_NO]', label: 'Adm No' },
                { tag: '[BALANCE]', label: 'Fee Balance' },
              ].map((chip) => (
                <button
                  key={chip.tag}
                  type="button"
                  onClick={() => setTemplate((prev) => `${prev} ${chip.tag}`)}
                  className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold border border-indigo-200 transition-colors"
                >
                  +{chip.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
              Sample Parent Preview ({sampleName})
            </span>
            <p className="text-xs text-slate-700 font-sans italic bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
              &quot;{previewMessage}&quot;
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkSend}
            disabled={isSending || validTargets.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending ({sentCount}/{validTargets.length})…</span>
              </>
            ) : (
              <>
                <FiSend className="w-3.5 h-3.5" />
                <span>Dispatch to {validTargets.length} Parents</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
