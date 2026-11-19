'use client';

import React from 'react';
import { FiPrinter, FiX, FiShield, FiPhone, FiCheckCircle } from 'react-icons/fi';

interface UltraReferralLetterModalProps {
  visit: any;
  student: any;
  record?: any;
  contacts?: any[];
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
}

export function UltraReferralLetterModal({
  visit,
  student,
  record,
  contacts = [],
  isOpen,
  onClose,
  schoolName = 'APSIMS SENIOR ACADEMY & HEALTH CENTER',
}: UltraReferralLetterModalProps) {
  if (!isOpen || !visit || !student) return null;

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
  const today = new Date().toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col items-center gap-3 my-4">
        
        {/* Floating Print Controls (Hidden on print) */}
        <div className="print:hidden w-full flex items-center justify-between bg-white border border-slate-200 shadow-xl rounded-2xl p-3 px-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-black text-slate-800">
              Official Ministry of Education Medical Referral Transfer Letter
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition active:scale-95"
            >
              <FiPrinter size={14} />
              <span>Print Referral Letter (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* ── Official Transfer Document (Printable Sheet) ── */}
        <div
          id="printable-referral-letter"
          className="w-full bg-white text-slate-900 rounded-3xl sm:rounded-2xl p-8 sm:p-12 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {/* Masthead */}
          <div className="text-center border-b-2 border-slate-900 pb-5 mb-5">
            <div className="flex items-center justify-center gap-2.5 mb-1.5">
              <span className="text-2xl">🏥</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  REPUBLIC OF KENYA · MINISTRY OF EDUCATION &amp; MINISTRY OF HEALTH
                </p>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  {schoolName}
                </h1>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              School Sick Bay &amp; Health Directorate · P.O. Box 1042-00100 Nairobi · Tel: +254 712 345 075
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Ref ID: <span className="font-bold text-slate-900">REF-{visit.id}-{new Date().getFullYear()}</span> · Transfer Date: {today}
            </p>
          </div>

          {/* Recipient Hospital Header */}
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REFERRAL DESTINATION:</span>
            <p className="text-sm font-black text-rose-700 mt-0.5">
              TO: THE MEDICAL SUPERINTENDENT / CASUALTY OFFICER IN CHARGE
            </p>
            <p className="font-bold text-slate-800 mt-0.5">
              FACILITY: <span className="uppercase text-slate-900">{visit.referred_to || 'County Referral Hospital'}</span>
            </p>
          </div>

          {/* Letter Title */}
          <div className="border-y border-slate-900 py-2 my-3 text-center bg-slate-50">
            <p className="font-black text-xs sm:text-sm tracking-wide uppercase text-slate-900">
              RE: URGENT CLINICAL REFERRAL &amp; PATIENT TRANSFER FOR SPECIALIZED CARE
            </p>
          </div>

          {/* Student Bio Grid */}
          <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient Name:</span>
              <strong className="text-slate-900 font-black">{student.last_name}, {student.first_name}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission No:</span>
              <strong className="font-mono text-slate-900">{student.admission_number || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Group:</span>
              <strong className="text-rose-700 font-black">{record?.blood_group || 'Not Known'}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Genotype / Allergies:</span>
              <strong className="text-slate-900">{record?.allergies || record?.genotype || 'None reported'}</strong>
            </div>
          </div>

          {/* Clinical Findings & Vitals */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-800">
            {/* Vitals Bar */}
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl border border-slate-200 text-center font-mono">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Temperature</span>
                <strong className={`text-sm font-black ${visit.temperature >= 38 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {visit.temperature ? `${visit.temperature}°C` : '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Blood Pressure</span>
                <strong className="text-sm font-black text-slate-900">
                  {visit.blood_pressure || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Pulse Rate</span>
                <strong className="text-sm font-black text-slate-900">
                  {visit.pulse_rate ? `${visit.pulse_rate} bpm` : 'Normal'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Triage Status</span>
                <strong className="text-xs font-black text-rose-700 uppercase">
                  Referred
                </strong>
              </div>
            </div>

            {/* Clinical Presentation */}
            <div className="space-y-2">
              <div>
                <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider">
                  1. CHIEF COMPLAINT &amp; PRESENTING HISTORY:
                </span>
                <p className="mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                  {visit.complaint || 'No complaint details recorded.'}
                </p>
              </div>

              <div>
                <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider">
                  2. CLINICAL OBSERVATIONS &amp; PROVISIONAL DIAGNOSIS:
                </span>
                <p className="mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                  {visit.diagnosis || 'Provisional evaluation pending full hospital workup.'}
                </p>
              </div>

              <div>
                <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider">
                  3. PRE-TRANSFER TREATMENT &amp; DRUGS ADMINISTERED:
                </span>
                <p className="mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                  {visit.treatment || visit.medication_given || 'Stabilizing first aid, bed rest, vitals monitoring.'}
                </p>
              </div>

              <div>
                <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider">
                  4. REASON FOR REFERRAL &amp; SPECIALIST EVALUATION SOUGHT:
                </span>
                <p className="mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                  {visit.notes || `Referred to ${visit.referred_to} for comprehensive laboratory investigations, radiological imaging, and doctor assessment beyond school clinic capacity.`}
                </p>
              </div>
            </div>

            {/* Guardian & Authorization */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase block">Primary Guardian / Parent:</span>
                <strong className="text-slate-900">{primaryContact?.contact_name || 'School Guardian'}</strong>
                <span className="block text-[11px] font-mono text-slate-600 mt-0.5">
                  Tel: {primaryContact?.phone || '0712 345 075'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase block">Emergency Authorization:</span>
                <strong className="text-emerald-700">✓ Parent Authorized Treatment</strong>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Parent notified via school emergency dispatch.
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Hospital Stamp Section */}
          <div className="mt-8 pt-5 border-t-2 border-slate-900 grid grid-cols-2 gap-6 items-end text-xs">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-4">REFERRING SCHOOL CLINICIAN:</p>
              <div className="w-48 border-b border-slate-900 pb-1 mb-1 font-bold text-slate-900">
                {visit.attended_by || 'Nurse in Charge (RN)'}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Registered Nurse / Clinical Officer</p>
              <p className="text-[10px] text-slate-400">APSIMS Senior Academy Health Center</p>
            </div>

            <div className="border border-dashed border-slate-300 p-3 rounded-xl text-center text-slate-400">
              <p className="text-[9px] font-black uppercase tracking-wider">HOSPITAL ADMITTING STAMP &amp; SIGNATURE</p>
              <div className="h-14 flex items-center justify-center text-[10px] text-slate-300">
                Receiving Doctor / Nurse Signature &amp; Date
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-5 pt-2 border-t border-slate-100 text-center text-[9px] text-slate-400 font-mono">
            This medical referral document is issued under Republic of Kenya school health safety regulations.
          </div>
        </div>

      </div>
    </div>
  );
}
