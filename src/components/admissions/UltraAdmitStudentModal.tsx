'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FiX,
  FiAward,
  FiCheck,
  FiCalendar,
  FiLayers,
  FiUserCheck,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

interface UltraAdmitStudentModalProps {
  app: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  forms: any[];
  streams: any[];
  streamCounts: Record<string, number>;
}

export function UltraAdmitStudentModal({
  app,
  isOpen,
  onClose,
  onSuccess,
  forms,
  streams,
  streamCounts,
}: UltraAdmitStudentModalProps) {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [streamId, setStreamId] = useState('');
  const [reportingDate, setReportingDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-generate admission number on open
  useEffect(() => {
    if (!isOpen || !app) return;

    const fetchNextNumber = async () => {
      const year = new Date().getFullYear();
      try {
        const { data } = await supabase
          .from('school_students')
          .select('admission_number')
          .ilike('admission_number', `ADM/${year}/%`)
          .order('admission_number', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const last = data[0].admission_number;
          const parts = last.split('/');
          const seq = parseInt(parts[parts.length - 1] || '0', 10);
          setAdmissionNumber(`ADM/${year}/${String(seq + 1).padStart(4, '0')}`);
          return;
        }
      } catch {}

      const { count } = await supabase
        .from('school_students')
        .select('id', { count: 'exact', head: true });
      setAdmissionNumber(`ADM/${year}/${String((count || 0) + 1).padStart(4, '0')}`);
    };

    fetchNextNumber();
    setReportingDate(new Date().toISOString().split('T')[0]);
  }, [isOpen, app]);

  if (!isOpen || !app) return null;

  const fullName = [app.student_first_name, app.student_middle_name, app.student_last_name]
    .filter(Boolean)
    .join(' ');

  const handleAdmit = async () => {
    if (!admissionNumber.trim()) {
      toast.error('Admission number is required.');
      return;
    }

    setSaving(true);
    try {
      // Find matching form record from school_forms
      const matchedForm = forms.find(
        (f) => String(f.form_level) === String(app.form_applied_for)
      );
      const formId = matchedForm ? Number(matchedForm.id) : null;

      // 1. Insert into school_students
      const { data: stu, error: stuError } = await supabase
        .from('school_students')
        .insert([
          {
            admission_number: admissionNumber.trim(),
            first_name: app.student_first_name,
            middle_name: app.student_middle_name || null,
            last_name: app.student_last_name,
            date_of_birth: app.date_of_birth || null,
            gender: app.gender || null,
            form_id: formId,
            stream_id: streamId ? Number(streamId) : null,
            admission_date: reportingDate || new Date().toISOString().split('T')[0],
            status: 'Active',
            guardian_name: app.guardian_full_name || null,
            guardian_phone: app.guardian_phone || null,
            guardian_email: app.guardian_email || null,
            county: app.county || null,
            blood_group: app.blood_group || null,
            kcpe_marks: app.kcpe_total_marks || null,
            previous_school: app.previous_school || null,
            nationality: app.nationality || null,
          },
        ])
        .select()
        .single();

      if (stuError) throw stuError;

      // 2. Update school_admission_applications record
      await supabase
        .from('school_admission_applications')
        .update({
          converted_student_id: stu.id,
          status: 'Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);

      // 3. Send automated email notification to guardian if email exists
      if (app.guardian_email) {
        try {
          await fetch('/api/admissions/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to_email: app.guardian_email,
              to_name: app.guardian_full_name || 'Guardian',
              student_name: fullName,
              reference_number: app.reference_number,
              status: 'Approved',
              notes: `Admission confirmed. Permanent Admission Number: ${admissionNumber.trim()}. Assigned Stream: ${
                streams.find((s) => String(s.id) === String(streamId))?.stream_name || 'Main Stream'
              }. Please report with original documents on ${reportingDate}.`,
              school_name: 'APSIMS Senior Academy',
            }),
          });
        } catch {}
      }

      toast.success(`🎉 ${fullName} admitted successfully as ${admissionNumber.trim()}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Admit failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 my-4">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-emerald-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm">
              🎓
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Admit Student &amp; Assign Class
              </h3>
              <p className="text-xs text-emerald-700">
                Enroll {fullName} permanently into the school roster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Pre-filled Dossier Snapshot */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Student Name:</span>
              <p className="font-black text-slate-800">{fullName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Application Ref:</span>
              <p className="font-mono font-bold text-slate-800">{app.reference_number}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Target Curriculum:</span>
              <p className="font-bold text-blue-700">Form/Grade {app.form_applied_for}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">KCPE Marks:</span>
              <p className="font-mono font-black text-slate-800">{app.kcpe_total_marks ? `${app.kcpe_total_marks} / 500` : '—'}</p>
            </div>
          </div>

          {/* Admission Number */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Official Admission Number *
            </label>
            <input
              type="text"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="e.g. ADM/2026/0014"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Auto-generated sequentially from student register. You may edit if using a custom sequence.
            </p>
          </div>

          {/* Stream / Class Placement */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Stream / Section Placement
            </label>
            <select
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            >
              <option value="">— Select Assigned Stream —</option>
              {streams.map((s) => {
                const count = streamCounts[String(s.id)] || 0;
                return (
                  <option key={s.id} value={s.id}>
                    {s.stream_name} Stream — ({count} current students)
                  </option>
                );
              })}
            </select>

            {/* Stream Capacity Meter */}
            {streamId && (() => {
              const count = streamCounts[String(streamId)] || 0;
              const isFull = count >= 45;
              const isBusy = count >= 35;
              return (
                <div className={`mt-2 p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between ${
                  isFull
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : isBusy
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  <span>
                    {isFull
                      ? '⚠️ Stream at maximum capacity (45+ students)'
                      : isBusy
                      ? `⚡ Stream near capacity (${count} enrolled)`
                      : `✓ Stream has ample vacancies (${count} enrolled)`}
                  </span>
                  <span className="font-mono text-xs">{count}/45</span>
                </div>
              );
            })()}
          </div>

          {/* Reporting Date */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Official Reporting Date
            </label>
            <input
              type="date"
              value={reportingDate}
              onChange={(e) => setReportingDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

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
            onClick={handleAdmit}
            disabled={saving || !admissionNumber.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 transition active:scale-95"
          >
            <FiUserCheck size={14} />
            <span>{saving ? 'Admitting...' : 'Confirm & Enroll Student'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
