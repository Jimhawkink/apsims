'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiX, FiFilter, FiEye, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiClock, FiUser, FiPrinter, FiUserPlus, FiRefreshCw,
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Application {
  id: number;
  reference_number: string;
  student_first_name: string;
  student_middle_name?: string;
  student_last_name: string;
  date_of_birth: string;
  gender: string;
  previous_school?: string;
  kcpe_index_number: string;
  kcpe_total_marks?: number;
  form_applied_for?: number;
  guardian_full_name: string;
  guardian_phone: string;
  guardian_email?: string;
  guardian_national_id: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted';
  review_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  converted_student_id?: number;
  submitted_at: string;
  school_forms?: { id: number; form_name: string };
}

interface SchoolForm { id: number; form_name: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 transition-all';
const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';
const GRAD = 'linear-gradient(135deg, #7c3aed, #4f46e5)';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function sName(a: Application) {
  return [a.student_first_name, a.student_middle_name, a.student_last_name].filter(Boolean).join(' ');
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Submitted:      { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: <FiClock size={12} /> },
  'Under Review': { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <FiAlertCircle size={12} /> },
  Approved:       { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: <FiCheckCircle size={12} /> },
  Rejected:       { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <FiXCircle size={12} /> },
  Waitlisted:     { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <FiAlertCircle size={12} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Submitted'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon}{status}
    </span>
  );
}

// ─── Status Change Modal ──────────────────────────────────────────────────────

function StatusChangeModal({ application, onClose, onSaved }: {
  application: Application; onClose: () => void; onSaved: () => void;
}) {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.review_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admissions/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_notes: notes }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update status');
      toast.success('Status updated ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Update Application Status</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Application</p>
            <p className="font-bold text-gray-800">{sName(application)}</p>
            <p className="text-xs text-gray-500">{application.reference_number}</p>
          </div>
          <div>
            <label className={lbl}>New Status *</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className={inp}>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Waitlisted">Waitlisted</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Review Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes for the guardian..."
              className={`${inp} resize-none`}
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={14} />}
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Convert to Student Modal ─────────────────────────────────────────────────

function ConvertToStudentModal({ application, onClose, onSaved }: {
  application: Application; onClose: () => void; onSaved: () => void;
}) {
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await fetch(`/api/admissions/applications/${application.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (res.status === 409) throw new Error(result.error);
      if (!res.ok) throw new Error(result.error || 'Failed to convert application');
      toast.success('Student record created ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setConverting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between rounded-t-2xl" style={{ background: GRAD }}>
          <h2 className="text-lg font-bold text-white">Convert to Student Record</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-violet-800 mb-3">The following student record will be created:</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-semibold text-gray-800">{sName(application)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date of Birth</span>
                <span className="font-semibold text-gray-800">{fmtDate(application.date_of_birth)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="font-semibold text-gray-800">{application.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Form</span>
                <span className="font-semibold text-gray-800">{application.school_forms?.form_name || `Form ${application.form_applied_for}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian</span>
                <span className="font-semibold text-gray-800">{application.guardian_full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian Phone</span>
                <span className="font-semibold text-gray-800">{application.guardian_phone}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            An admission number will be auto-generated. You can update additional details from the student profile.
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleConvert} disabled={converting} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: GRAD }}>
            {converting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiUserPlus size={14} />}
            Create Student Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Application Detail Drawer ────────────────────────────────────────────────

function ApplicationDetailDrawer({ application, onClose, onStatusChange, onConvert }: {
  application: Application;
  onClose: () => void;
  onStatusChange: () => void;
  onConvert: () => void;
}) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admission Letter - ${sName(application)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
          .school-name { font-size: 24px; font-weight: bold; color: #7c3aed; }
          .letter-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px; text-decoration: underline; text-align: center; }
          .field { margin: 8px 0; }
          .field strong { display: inline-block; width: 180px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }
          ul { margin: 8px 0; padding-left: 20px; }
          li { margin: 4px 0; }
          .footer { margin-top: 40px; }
          .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">APSIMS SCHOOL</div>
          <div>P.O. Box 0000, Nairobi, Kenya</div>
          <div>Tel: +254 700 000 000 | Email: info@school.ac.ke</div>
        </div>
        <div class="letter-title">ADMISSION LETTER</div>
        <p>Date: ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>Dear <strong>${application.guardian_full_name}</strong>,</p>
        <p>We are pleased to inform you that your child has been offered admission to our school for the upcoming academic year.</p>
        <div class="section">
          <div class="section-title">Student Details</div>
          <div class="field"><strong>Full Name:</strong> ${sName(application)}</div>
          <div class="field"><strong>Admission Number:</strong> To be assigned on reporting</div>
          <div class="field"><strong>Form Admitted:</strong> ${application.school_forms?.form_name || `Form ${application.form_applied_for}`}</div>
          <div class="field"><strong>KCPE Index No:</strong> ${application.kcpe_index_number}</div>
          ${application.kcpe_total_marks ? `<div class="field"><strong>KCPE Marks:</strong> ${application.kcpe_total_marks}/500</div>` : ''}
          <div class="field"><strong>Reference No:</strong> ${application.reference_number}</div>
        </div>
        <div class="section">
          <div class="section-title">Reporting Instructions</div>
          <p>Please report to school on the agreed date with the following items:</p>
          <ul>
            <li>Original KCPE result slip and 2 certified copies</li>
            <li>Original birth certificate and 2 certified copies</li>
            <li>4 recent passport-size photographs</li>
            <li>School fees as per the fee structure (available at the school office)</li>
            <li>School uniform (available at the school shop)</li>
            <li>Bedding and personal effects (for boarding students)</li>
            <li>Medical examination report from a registered doctor</li>
          </ul>
        </div>
        <div class="footer">
          <p>We look forward to welcoming your child to our school community.</p>
          <p>Yours faithfully,</p>
          <div class="signature-line"></div>
          <p><strong>The Principal</strong><br>APSIMS School</p>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ background: GRAD }}>
            <div>
              <h2 className="text-lg font-bold text-white">{sName(application)}</h2>
              <p className="text-violet-200 text-xs">{application.reference_number}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
          </div>

          {/* Status + Actions */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <StatusBadge status={application.status} />
            <div className="flex gap-2">
              {application.status === 'Approved' && !application.converted_student_id && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                  style={{ background: GRAD }}
                >
                  <FiUserPlus size={12} /> Enroll Student
                </button>
              )}
              {application.status === 'Approved' && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <FiPrinter size={12} /> Admission Letter
                </button>
              )}
              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100"
              >
                <FiRefreshCw size={12} /> Change Status
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 p-6 space-y-6">
            {/* Student Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Student Information</h3>
              <div className="space-y-2">
                {[
                  ['Full Name', sName(application)],
                  ['Date of Birth', fmtDate(application.date_of_birth)],
                  ['Gender', application.gender],
                  ['Previous School', application.previous_school || '—'],
                  ['KCPE Index No', application.kcpe_index_number],
                  ['KCPE Marks', application.kcpe_total_marks ? `${application.kcpe_total_marks}/500` : '—'],
                  ['Form Applied', application.school_forms?.form_name || `Form ${application.form_applied_for}` || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-700 text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guardian Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Guardian Information</h3>
              <div className="space-y-2">
                {[
                  ['Full Name', application.guardian_full_name],
                  ['Phone', application.guardian_phone],
                  ['Email', application.guardian_email || '—'],
                  ['National ID', application.guardian_national_id],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Review Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Submitted</span>
                  <span className="font-semibold text-gray-700">{fmtDT(application.submitted_at)}</span>
                </div>
                {application.reviewed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Reviewed</span>
                    <span className="font-semibold text-gray-700">{fmtDT(application.reviewed_at)}</span>
                  </div>
                )}
                {application.converted_student_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Enrolled</span>
                    <span className="font-semibold text-green-600">Student ID #{application.converted_student_id}</span>
                  </div>
                )}
              </div>
              {application.review_notes && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Review Notes</p>
                  <p className="text-sm text-gray-700">{application.review_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <StatusChangeModal
          application={application}
          onClose={() => setShowStatusModal(false)}
          onSaved={() => { setShowStatusModal(false); onStatusChange(); }}
        />
      )}
      {showConvertModal && (
        <ConvertToStudentModal
          application={application}
          onClose={() => setShowConvertModal(false)}
          onSaved={() => { setShowConvertModal(false); onConvert(); }}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAdmissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [forms, setForms] = useState<SchoolForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterForm) params.set('form_id', filterForm);
      if (filterDateFrom) params.set('date_from', filterDateFrom);
      if (filterDateTo) params.set('date_to', filterDateTo);

      const res = await fetch(`/api/admissions/applications?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load applications');
      setApplications(result.data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterForm, filterDateFrom, filterDateTo]);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/forms');
      if (res.ok) {
        const result = await res.json();
        setForms(result.data || []);
      }
    } catch {
      // Forms are optional for filtering
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    fetchForms();
  }, [fetchApplications, fetchForms]);

  const handleDrawerClose = () => {
    setSelectedApp(null);
    fetchApplications();
  };

  // KPI counts
  const counts = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'Submitted').length,
    underReview: applications.filter(a => a.status === 'Under Review').length,
    approved: applications.filter(a => a.status === 'Approved').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
    waitlisted: applications.filter(a => a.status === 'Waitlisted').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─── */}
      <div className="text-white px-6 py-8" style={{ background: GRAD }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black mb-1">Admissions Review</h1>
          <p className="text-violet-200 text-sm">Review and manage online admission applications</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: counts.total, color: 'border-violet-400' },
            { label: 'Submitted', value: counts.submitted, color: 'border-blue-400' },
            { label: 'Under Review', value: counts.underReview, color: 'border-yellow-400' },
            { label: 'Approved', value: counts.approved, color: 'border-green-400' },
            { label: 'Rejected', value: counts.rejected, color: 'border-red-400' },
            { label: 'Waitlisted', value: counts.waitlisted, color: 'border-orange-400' },
          ].map(kpi => (
            <div key={kpi.label} className={`bg-white rounded-xl p-4 border-l-4 ${kpi.color} shadow-sm`}>
              <p className="text-2xl font-black text-gray-800">{kpi.value}</p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* ─── Filters ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiFilter size={14} className="text-violet-500" />
            <span className="text-sm font-bold text-gray-600">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inp}>
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Waitlisted">Waitlisted</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Form</label>
              <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className={inp}>
                <option value="">All Forms</option>
                {forms.length > 0
                  ? forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)
                  : [1, 2, 3, 4].map(n => <option key={n} value={n}>Form {n}</option>)
                }
              </select>
            </div>
            <div>
              <label className={lbl}>Date From</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Date To</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={inp} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={fetchApplications}
              className="px-4 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2"
              style={{ background: GRAD }}
            >
              <FiFilter size={12} /> Apply Filters
            </button>
            <button
              onClick={() => { setFilterStatus(''); setFilterForm(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ─── Applications Table ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-700">Applications ({applications.length})</h2>
            <button onClick={fetchApplications} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
              <FiRefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-400 font-semibold">No applications found</p>
              <p className="text-sm text-gray-300 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">KCPE Marks</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Form Applied</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-violet-700">{app.reference_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{sName(app)}</div>
                        <div className="text-xs text-gray-400">{app.guardian_phone}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {app.kcpe_total_marks !== undefined && app.kcpe_total_marks !== null
                          ? `${app.kcpe_total_marks}/500`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {app.school_forms?.form_name || (app.form_applied_for ? `Form ${app.form_applied_for}` : '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(app.submitted_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-all"
                        >
                          <FiEye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail Drawer ─── */}
      {selectedApp && (
        <ApplicationDetailDrawer
          application={selectedApp}
          onClose={handleDrawerClose}
          onStatusChange={() => { fetchApplications(); setSelectedApp(null); }}
          onConvert={() => { fetchApplications(); setSelectedApp(null); }}
        />
      )}
    </div>
  );
}
