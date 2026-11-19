'use client';

import React, { useState } from 'react';
import {
  FiX,
  FiUser,
  FiBook,
  FiAward,
  FiPhone,
  FiMail,
  FiMapPin,
  FiHeart,
  FiShield,
  FiFileText,
  FiExternalLink,
  FiDownload,
  FiCalendar,
  FiCheck,
  FiClock,
  FiPrinter,
  FiStar,
} from 'react-icons/fi';

interface UltraAdmissionDetailModalProps {
  app: any;
  onClose: () => void;
  onAction: (app: any, action: string) => void;
  onConvert: (app: any) => void;
  onPrintCallingLetter: (app: any) => void;
}

export function UltraAdmissionDetailModal({
  app,
  onClose,
  onAction,
  onConvert,
  onPrintCallingLetter,
}: UltraAdmissionDetailModalProps) {
  const [tab, setTab] = useState<'student' | 'academic' | 'guardian' | 'medical' | 'documents'>('student');

  if (!app) return null;

  const fullName = [app.student_first_name, app.student_middle_name, app.student_last_name]
    .filter(Boolean)
    .join(' ');

  const formApplied = Number(app.form_applied_for);
  const classLabel =
    formApplied === 10
      ? 'Grade 10 (CBC Senior School)'
      : formApplied === 11
      ? 'Grade 11 (CBC Senior School)'
      : formApplied === 12
      ? 'Grade 12 (CBC Senior School)'
      : formApplied >= 7 && formApplied <= 9
      ? `Grade ${formApplied} (Junior Secondary CBC)`
      : `Form ${formApplied || 1} (8-4-4 Secondary)`;

  const calcAge = (dob?: string) => {
    if (!dob) return '—';
    const d = new Date(dob);
    const n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a > 0 ? `${a} yrs` : '—';
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const statusStyles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    Submitted: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '📥' },
    'Under Review': { bg: '#fefce8', text: '#a16207', border: '#fde68a', icon: '🔍' },
    Approved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: '✅' },
    Rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: '❌' },
    Waitlisted: { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', icon: '⏳' },
  };

  const currentStatus = statusStyles[app.status] || statusStyles.Submitted;

  const Row = ({ icon, label, value, mono = false }: { icon?: React.ReactNode; label: string; value?: any; mono?: boolean }) => (
    <div className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-none">
      {icon && <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-xs font-bold text-slate-800 mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>
          {value === true ? '✅ Yes' : value === false ? '❌ No' : value || '—'}
        </p>
      </div>
    </div>
  );

  const DocCard = ({ url, label, icon }: { url?: string | null; label: string; icon: string }) => (
    <div className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
      url ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200/60 opacity-60'
    }`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-800 truncate">{label}</p>
        <p className="text-[10px] font-medium text-slate-400">{url ? 'Document Verified & Uploaded' : 'Not Uploaded'}</p>
      </div>
      {url && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            title="Open document in new tab"
          >
            <FiExternalLink size={13} />
          </a>
          <a
            href={url}
            download
            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            title="Download document"
          >
            <FiDownload size={13} />
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-4">
        
        {/* Executive Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md flex-shrink-0">
                {(app.student_first_name || 'A')[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                    {fullName}
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    style={{ background: currentStatus.bg, color: currentStatus.text, borderColor: currentStatus.border }}
                  >
                    {currentStatus.icon} {app.status}
                  </span>
                  {app.converted_student_id && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      🎓 ADMITTED (ID: {app.converted_student_id})
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Ref: <span className="font-bold text-slate-800">{app.reference_number}</span> · Submitted {formatDateTime(app.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex-shrink-0"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-100 bg-white px-4 gap-1 overflow-x-auto">
          {[
            { id: 'student', label: 'Student Profile', icon: '🧑' },
            { id: 'academic', label: 'Academic & KCPE', icon: '📚' },
            { id: 'guardian', label: 'Guardian Details', icon: '👪' },
            { id: 'medical', label: 'Medical & Integrity', icon: '🏥' },
            { id: 'documents', label: 'Document Vault', icon: '📄' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-black border-b-2 whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* ── 1. STUDENT PROFILE TAB ── */}
          {tab === 'student' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Personal Information</p>
                <Row label="First Name" value={app.student_first_name} />
                <Row label="Middle Name" value={app.student_middle_name} />
                <Row label="Last Name" value={app.student_last_name} />
                <Row label="Date of Birth" value={`${formatDate(app.date_of_birth)} (${calcAge(app.date_of_birth)})`} />
                <Row label="Gender" value={app.gender} />
                <Row label="Nationality" value={app.nationality || 'Kenyan'} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Location &amp; Residence</p>
                <Row icon={<FiMapPin size={12} />} label="County of Residence" value={app.county} />
                <Row label="Sub-County" value={app.sub_county} />
                <Row label="Village / Estate" value={app.village_estate} />
                {app.photo_url && (
                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Passport Photo</p>
                    <img
                      src={app.photo_url}
                      alt="Student"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 2. ACADEMIC & KCPE TAB ── */}
          {tab === 'academic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Target Class &amp; Track</p>
                <Row icon={<FiBook size={12} />} label="Curriculum Class" value={classLabel} />
                <Row label="Previous Primary School" value={app.previous_school} />
                <Row label="Previous School County" value={app.previous_school_county} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Merit Credentials</p>
                <Row icon={<FiAward size={12} />} label="KCPE Index Number" value={app.kcpe_index_number} mono />
                <Row label="KCPE Total Marks" value={app.kcpe_total_marks ? `${app.kcpe_total_marks} / 500` : '—'} mono />
                <Row label="Examination Year" value={app.kcpe_year} />
                {app.kcpe_total_marks && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs font-bold text-slate-800">
                      {app.kcpe_total_marks >= 350
                        ? '🌟 High Honors Candidate (Meets STEM / Top Track Criteria)'
                        : app.kcpe_total_marks >= 250
                        ? '✓ Standard Admissible Candidate'
                        : '⚠️ Remedial Academic Program Candidate'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 3. GUARDIAN DETAILS TAB ── */}
          {tab === 'guardian' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Primary Guardian</p>
                <Row icon={<FiUser size={12} />} label="Full Name" value={app.guardian_full_name} />
                <Row label="Relationship" value={app.guardian_relationship || 'Parent'} />
                <Row icon={<FiPhone size={12} />} label="Primary Phone" value={app.guardian_phone} mono />
                <Row label="Alternative Phone" value={app.guardian_alt_phone} mono />
                <Row icon={<FiMail size={12} />} label="Email Address" value={app.guardian_email} />
                <Row label="National ID Number" value={app.guardian_national_id} mono />
                <Row label="Occupation" value={app.guardian_occupation} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Emergency Contact &amp; Notes</p>
                <Row label="Emergency Name" value={app.emergency_name} />
                <Row icon={<FiPhone size={12} />} label="Emergency Phone" value={app.emergency_phone} mono />
                <Row label="Relationship" value={app.emergency_relationship} />
                {app.review_notes && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Internal Review Notes</p>
                    <p className="text-xs text-amber-900 mt-1">{app.review_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 4. MEDICAL & INTEGRITY TAB ── */}
          {tab === 'medical' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Medical Profile</p>
                <Row icon={<FiHeart size={12} />} label="Blood Group" value={app.blood_group} />
                <Row label="Special Educational Needs / Disability" value={app.has_disability} />
                {app.has_disability && <Row label="Disability Details" value={app.disability_details} />}
                <Row label="Known Allergies" value={app.allergies} />
                <Row label="Chronic Medical Conditions" value={app.medical_conditions} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Security &amp; Audit Trail</p>
                <Row icon={<FiShield size={12} />} label="Phone OTP Verified" value={app.phone_verified ?? true} />
                <Row label="Email Verified" value={app.email_verified} />
                <Row label="Terms &amp; Declaration Agreed" value={app.terms_agreed} />
                <Row label="Submitter IP Address" value={app.submitter_ip} mono />
              </div>
            </div>
          )}

          {/* ── 5. DOCUMENT VAULT TAB ── */}
          {tab === 'documents' && (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Attached Documents</p>
              <DocCard url={app.photo_url} label="Student Passport Photo" icon="📸" />
              <DocCard url={app.birth_cert_url} label="Official Birth Certificate" icon="📜" />
              <DocCard url={app.kcpe_slip_url} label="KNEC KCPE Result Slip" icon="🏆" />
              <DocCard url={app.other_doc_url} label={app.other_doc_name || 'Leaving Certificate / Other Document'} icon="📎" />
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onPrintCallingLetter(app)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <FiPrinter size={13} />
              <span>Calling Letter</span>
            </button>

            {!app.converted_student_id && (
              <>
                <button
                  onClick={() => onAction(app, 'Approved')}
                  className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => onAction(app, 'Under Review')}
                  className="px-3 py-2 rounded-xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                >
                  🔍 Review
                </button>
                <button
                  onClick={() => onAction(app, 'Rejected')}
                  className="px-3 py-2 rounded-xl text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
                >
                  ✕ Reject
                </button>
                {app.status === 'Approved' && (
                  <button
                    onClick={() => onConvert(app)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:opacity-90 transition"
                  >
                    <FiStar size={13} />
                    <span>Admit Student</span>
                  </button>
                )}
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
}
