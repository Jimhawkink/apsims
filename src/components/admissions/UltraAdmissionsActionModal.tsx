'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiX, FiCheck, FiAlertCircle, FiMail } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

interface UltraAdmissionsActionModalProps {
  app: any;
  action: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES: Record<string, string[]> = {
  Rejected: [
    'KCPE merit score does not meet the current intake cut-off.',
    'Class capacity for the selected curriculum level has been reached.',
    'Supporting documents (Birth Certificate / KCPE Slip) were incomplete or unverified.',
    'Age outside the admissible criteria for this grade level.',
  ],
  Waitlisted: [
    'Application has been placed on the priority waitlist pending vacancy opening.',
    'Merit review completed; awaiting final capacity allocation for this stream.',
  ],
  'Under Review': [
    'Academic credentials are under active review by the admissions committee.',
    'Pending verification of KCPE results with the Kenya National Examinations Council.',
  ],
  Approved: [
    'Provisional admission approved. Applicant may proceed to class placement and reporting.',
  ],
};

export function UltraAdmissionsActionModal({
  app,
  action,
  isOpen,
  onClose,
  onSuccess,
}: UltraAdmissionsActionModalProps) {
  const [notes, setNotes] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !app) return null;

  const fullName = [app.student_first_name, app.student_middle_name, app.student_last_name]
    .filter(Boolean)
    .join(' ');

  const statusThemes: Record<string, { bg: string; text: string; btn: string; icon: string }> = {
    Approved: { bg: 'bg-emerald-50 text-emerald-900 border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', icon: '✅' },
    Rejected: { bg: 'bg-rose-50 text-rose-900 border-rose-200', text: 'text-rose-700', btn: 'bg-rose-600 hover:bg-rose-700', icon: '❌' },
    Waitlisted: { bg: 'bg-purple-50 text-purple-900 border-purple-200', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', icon: '⏳' },
    'Under Review': { bg: 'bg-amber-50 text-amber-900 border-amber-200', text: 'text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700', icon: '🔍' },
  };

  const theme = statusThemes[action] || statusThemes['Under Review'];
  const reasonTemplates = TEMPLATES[action] || [];

  const handleConfirm = async () => {
    if (action === 'Rejected' && !notes.trim()) {
      toast.error('A reason is required when rejecting an application.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('school_admission_applications')
        .update({
          status: action,
          review_notes: notes.trim() || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);

      if (error) throw error;

      // Send email notification to parent if enabled and email exists
      if (notifyParent && app.guardian_email) {
        try {
          await fetch('/api/admissions/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to_email: app.guardian_email,
              to_name: app.guardian_full_name || 'Guardian',
              student_name: fullName,
              reference_number: app.reference_number,
              status: action,
              notes: notes.trim() || undefined,
              school_name: 'APSIMS Senior Academy',
            }),
          });
        } catch {}
      }

      toast.success(`Application updated to "${action}".`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error updating application: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 my-4">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${theme.bg}`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{theme.icon}</span>
            <div>
              <h3 className="text-base font-black tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Set Status: {action}
              </h3>
              <p className="text-xs opacity-80">
                {fullName} · {app.reference_number}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg opacity-60 hover:opacity-100 transition">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Quick Templates */}
          {reasonTemplates.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Quick Reason Templates
              </p>
              <div className="space-y-1.5">
                {reasonTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNotes(tmpl)}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Review Notes &amp; Decision Summary {action === 'Rejected' ? '*' : '(Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={action === 'Rejected' ? 'State clear reasons for rejection...' : 'Internal notes or instructions for applicant...'}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition"
            />
          </div>

          {/* Email Notification Option */}
          {app.guardian_email && (
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyParent}
                onChange={(e) => setNotifyParent(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <FiMail size={13} className="text-slate-400" />
              <span className="text-[11px] font-medium text-slate-700">
                Email automated status update to <span className="font-bold">{app.guardian_email}</span>
              </span>
            </label>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || (action === 'Rejected' && !notes.trim())}
            className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition disabled:opacity-50 active:scale-95 ${theme.btn}`}
          >
            {saving ? 'Updating...' : `Confirm ${action}`}
          </button>
        </div>

      </div>
    </div>
  );
}
