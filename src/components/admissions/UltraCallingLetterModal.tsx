'use client';

import React from 'react';
import {
  FiPrinter,
  FiX,
  FiDownload,
  FiAward,
  FiCheckCircle,
  FiCalendar,
  FiShield,
  FiFileText,
} from 'react-icons/fi';

interface UltraCallingLetterModalProps {
  app: any;
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  schoolPoBox?: string;
  schoolEmail?: string;
  schoolPhone?: string;
}

export function UltraCallingLetterModal({
  app,
  isOpen,
  onClose,
  schoolName = 'APSIMS HIGH SCHOOL & SENIOR ACADEMY',
  schoolPoBox = 'P.O. BOX 1042 - 00100, NAIROBI, KENYA',
  schoolEmail = 'admissions@apsims.edu.ke',
  schoolPhone = '+254 712 345 075 / +254 722 000 111',
}: UltraCallingLetterModalProps) {
  if (!isOpen || !app) return null;

  const fullName = [app.student_first_name, app.student_middle_name, app.student_last_name]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  const formApplied = Number(app.form_applied_for);
  const classLabel =
    formApplied === 10
      ? 'GRADE 10 (CBC SENIOR SCHOOL)'
      : formApplied === 11
      ? 'GRADE 11 (CBC SENIOR SCHOOL)'
      : formApplied === 12
      ? 'GRADE 12 (CBC SENIOR SCHOOL)'
      : formApplied >= 7 && formApplied <= 9
      ? `GRADE ${formApplied} (JUNIOR SECONDARY CBC)`
      : `FORM ${formApplied || 1} (8-4-4 SECONDARY)`;

  const today = new Date().toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const reportingDate = app.reporting_date
    ? new Date(app.reporting_date).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Monday, 12th January 2026 at 8:00 AM';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      {/* Control bar above sheet */}
      <div className="w-full max-w-3xl flex flex-col items-center gap-3 my-4">
        
        {/* Floating Print Bar (Hidden in print) */}
        <div className="print:hidden w-full flex items-center justify-between bg-white border border-slate-200 shadow-xl rounded-2xl p-3 px-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">
              Official Ministry Formatted Admission Calling Letter
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <FiPrinter size={14} />
              <span>Print Official Letter (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* ── Official Letter Body (A4 Styled Printable Sheet) ── */}
        <div
          id="printable-calling-letter"
          className="w-full bg-white text-slate-900 rounded-3xl sm:rounded-2xl p-6 sm:p-12 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {/* Letterhead Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl border border-slate-900 flex items-center justify-center text-2xl font-black">
                🇰🇪
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  REPUBLIC OF KENYA · MINISTRY OF EDUCATION
                </p>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  {schoolName}
                </h1>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              {schoolPoBox} · Tel: {schoolPhone} · Email: {schoolEmail}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              School Registration No: MOE/SEC/2026/089 · KNEC Center Code: 12345678
            </p>
          </div>

          {/* Reference & Date Bar */}
          <div className="flex items-center justify-between text-xs font-mono mb-6">
            <div>
              <span className="font-bold text-slate-500">REF NO: </span>
              <span className="font-black text-slate-900">{app.reference_number || `ADM-2026-${app.id}`}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">DATE: </span>
              <span className="font-bold text-slate-900">{today}</span>
            </div>
          </div>

          {/* Recipient Box */}
          <div className="mb-6 text-xs text-slate-800 leading-relaxed">
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">TO THE GUARDIAN / PARENT OF:</p>
            <p className="text-sm font-black text-slate-900 mt-0.5">{fullName}</p>
            {app.guardian_full_name && <p className="font-medium">C/O: {app.guardian_full_name}</p>}
            {app.guardian_phone && <p className="font-mono text-slate-600">Contact: {app.guardian_phone}</p>}
            {app.county && <p className="text-slate-600">County: {app.county}</p>}
          </div>

          {/* Letter Subject */}
          <div className="border-y border-slate-900/40 py-2.5 my-4 bg-slate-50/50">
            <p className="text-center font-black text-xs sm:text-sm tracking-wide text-slate-900 uppercase">
              RE: PROVISIONAL OFFER OF ADMISSION TO {classLabel} — ACADEMIC YEAR 2026
            </p>
          </div>

          {/* Body Content */}
          <div className="space-y-3.5 text-xs text-slate-800 leading-relaxed">
            <p>
              I am delighted to inform you that following your application and subsequent merit evaluation of the Kenya Certificate of Primary Education (KCPE) / Junior Secondary Assessment, <strong className="text-slate-900">{fullName}</strong> has been offered provisional admission to <strong>{classLabel}</strong> at {schoolName}.
            </p>

            {/* Merit Summary */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">KCPE Index</p>
                <p className="font-black text-slate-900">{app.kcpe_index_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total Marks</p>
                <p className="font-black text-blue-700">{app.kcpe_total_marks ? `${app.kcpe_total_marks} / 500` : 'Assessed'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Previous School</p>
                <p className="font-bold text-slate-900 truncate">{app.previous_school || 'Primary'}</p>
              </div>
            </div>

            {/* Reporting Instructions */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <p className="font-bold text-blue-900 text-xs mb-1">
                📅 REPORTING DATE &amp; ORIENTATION:
              </p>
              <p className="text-blue-800 text-[11px]">
                The student is expected to report on <strong>{reportingDate}</strong> accompanied by a parent or legal guardian. Failure to report within 5 days without written communication will lead to forfeiture of this admission offer.
              </p>
            </div>

            {/* Required Documents Checklist */}
            <div>
              <p className="font-black uppercase tracking-wider text-[11px] text-slate-900 mb-1.5">
                MANDATORY REQUIREMENTS TO PRESENT ON REPORTING DAY:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700 list-disc list-inside">
                <li>Original and 2 photocopies of Birth Certificate</li>
                <li>Original and 2 photocopies of KCPE Result Slip</li>
                <li>Primary School Leaving Certificate (Stamped)</li>
                <li>Certified Medical Examination Form by Government Doctor</li>
                <li>Two (2) recent passport size photographs</li>
                <li>Official Bank Deposit Slip for First Term Fees</li>
              </ul>
            </div>

            {/* Fee Payment Channels */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-black uppercase tracking-wider text-[11px] text-slate-900 mb-1">
                OFFICIAL SCHOOL FEES PAYMENT CHANNELS:
              </p>
              <p className="text-[11px] text-slate-600 mb-2">
                Fees must be paid directly to the school accounts below. <em>No cash is accepted at the school premises.</em>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-blue-900 block">KCB BANK KENYA</span>
                  <span>A/C: 1122334455</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-red-900 block">EQUITY BANK</span>
                  <span>A/C: 0102030405</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-900 block">M-PESA PAYBILL</span>
                  <span>Paybill: 522522</span>
                  <span className="text-[9px] block text-slate-400">A/C: {app.reference_number}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Signatures & Official Stamp */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 items-end">
            <div>
              <p className="text-xs font-serif italic text-slate-500 mb-6">Signed on behalf of the Board of Management:</p>
              <div className="w-44 border-b-2 border-slate-900 pb-1 mb-1 font-serif text-sm font-black text-slate-900">
                Dr. J. K. Mukhwana, PhD
              </div>
              <p className="text-xs font-black text-slate-900">CHIEF PRINCIPAL &amp; SECRETARY TO B.O.M</p>
              <p className="text-[10px] text-slate-400 font-mono">APSIMS Senior Academy</p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-2 text-slate-400">
                <span className="text-[9px] font-black tracking-widest uppercase">OFFICIAL</span>
                <span className="text-[8px] font-bold">SCHOOL STAMP</span>
                <span className="text-[7px]">APSIMS ACADEMY</span>
              </div>
            </div>
          </div>

          {/* Letter Footer */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-mono">
            This document is computer-generated by APSIMS Enterprise School Information System · Reference: {app.reference_number}
          </div>

        </div>

      </div>
    </div>
  );
}
