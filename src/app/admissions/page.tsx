'use client';

import { useState } from 'react';
import { FiUser, FiPhone, FiMail, FiFileText, FiUpload, FiCheckCircle, FiCopy, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  student_first_name: string;
  student_middle_name: string;
  student_last_name: string;
  date_of_birth: string;
  gender: string;
  previous_school: string;
  kcpe_index_number: string;
  kcpe_total_marks: string;
  guardian_full_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_national_id: string;
  form_applied_for: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 transition-all';
const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';
const GRAD = 'linear-gradient(135deg, #0f766e, #0891b2)';

const FORMS = [
  { id: 1, name: 'Form 1' },
  { id: 2, name: 'Form 2' },
  { id: 3, name: 'Form 3' },
  { id: 4, name: 'Form 4' },
];

// ─── Success Modal ────────────────────────────────────────────────────────────

function SuccessModal({ referenceNumber, onClose }: { referenceNumber: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referenceNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: GRAD }}>
          <FiCheckCircle size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Your admission application has been received. Please save your reference number.
        </p>

        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 mb-6">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Reference Number</p>
          <p className="text-2xl font-black text-teal-700 tracking-widest">{referenceNumber}</p>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-teal-200 text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-all text-sm"
          >
            <FiCopy size={14} />
            {copied ? 'Copied!' : 'Copy Reference'}
          </button>
          <a
            href="/admissions/status"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-semibold rounded-xl text-sm"
            style={{ background: GRAD }}
          >
            <FiExternalLink size={14} />
            Track Status
          </a>
        </div>

        <p className="text-xs text-gray-400">
          An SMS confirmation has been sent to your phone number.
        </p>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Submit another application
        </button>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
        style={{ background: GRAD }}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-gray-700">{title}</h3>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdmissionsPage() {
  const [form, setForm] = useState<FormData>({
    student_first_name: '',
    student_middle_name: '',
    student_last_name: '',
    date_of_birth: '',
    gender: '',
    previous_school: '',
    kcpe_index_number: '',
    kcpe_total_marks: '',
    guardian_full_name: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_national_id: '',
    form_applied_for: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ─── Client-side validation ───
  const validate = (): string | null => {
    if (!form.student_first_name.trim()) return 'Student first name is required';
    if (!form.student_last_name.trim()) return 'Student last name is required';
    if (!form.date_of_birth) return 'Date of birth is required';
    if (!form.gender) return 'Gender is required';
    if (!form.kcpe_index_number.trim()) return 'KCPE index number is required';
    if (form.kcpe_total_marks) {
      const marks = Number(form.kcpe_total_marks);
      if (isNaN(marks) || marks < 0 || marks > 500) return 'KCPE total marks must be between 0 and 500';
    }
    if (!form.guardian_full_name.trim()) return 'Guardian full name is required';
    if (!form.guardian_phone.trim()) return 'Guardian phone number is required';
    // Basic phone validation
    const phoneClean = form.guardian_phone.replace(/\s+/g, '');
    if (!/^(\+254|0)[17]\d{8}$/.test(phoneClean)) return 'Enter a valid Kenyan phone number (e.g. 0712345678)';
    if (!form.guardian_national_id.trim()) return 'Guardian national ID is required';
    if (!form.form_applied_for) return 'Please select the form applied for';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        student_first_name: form.student_first_name.trim(),
        student_last_name: form.student_last_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        kcpe_index_number: form.kcpe_index_number.trim(),
        guardian_full_name: form.guardian_full_name.trim(),
        guardian_phone: form.guardian_phone.trim(),
        guardian_national_id: form.guardian_national_id.trim(),
        form_applied_for: Number(form.form_applied_for),
      };

      if (form.student_middle_name.trim()) payload.student_middle_name = form.student_middle_name.trim();
      if (form.previous_school.trim()) payload.previous_school = form.previous_school.trim();
      if (form.kcpe_total_marks) payload.kcpe_total_marks = Number(form.kcpe_total_marks);
      if (form.guardian_email.trim()) payload.guardian_email = form.guardian_email.trim();

      const res = await fetch('/api/admissions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.status === 409) {
        toast.error('A duplicate application with this KCPE index number already exists.');
        return;
      }
      if (!res.ok) {
        throw new Error(result.error || 'Submission failed. Please try again.');
      }

      setReferenceNumber(result.reference_number);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setReferenceNumber(null);
    setForm({
      student_first_name: '', student_middle_name: '', student_last_name: '',
      date_of_birth: '', gender: '', previous_school: '', kcpe_index_number: '',
      kcpe_total_marks: '', guardian_full_name: '', guardian_phone: '',
      guardian_email: '', guardian_national_id: '', form_applied_for: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─── */}
      <div className="text-white py-10 px-4" style={{ background: GRAD }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiFileText size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2">Online Admissions Portal</h1>
          <p className="text-teal-100 text-sm">
            Complete the form below to apply for admission. All fields marked * are required.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-teal-200">
            <span>Already applied?</span>
            <a href="/admissions/status" className="underline font-semibold hover:text-white">
              Track your application status →
            </a>
          </div>
        </div>
      </div>

      {/* ─── Form ─── */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1: Student Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiUser size={14} />} title="Student Information" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>First Name *</label>
                <input type="text" value={form.student_first_name}
                  onChange={e => set('student_first_name', e.target.value)}
                  placeholder="e.g. John" className={inp} />
              </div>
              <div>
                <label className={lbl}>Middle Name</label>
                <input type="text" value={form.student_middle_name}
                  onChange={e => set('student_middle_name', e.target.value)}
                  placeholder="e.g. Kamau" className={inp} />
              </div>
              <div>
                <label className={lbl}>Last Name *</label>
                <input type="text" value={form.student_last_name}
                  onChange={e => set('student_last_name', e.target.value)}
                  placeholder="e.g. Mwangi" className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={lbl}>Date of Birth *</label>
                <input type="date" value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={lbl}>Previous School</label>
                <input type="text" value={form.previous_school}
                  onChange={e => set('previous_school', e.target.value)}
                  placeholder="e.g. Nairobi Primary School" className={inp} />
              </div>
              <div>
                <label className={lbl}>KCPE Index Number *</label>
                <input type="text" value={form.kcpe_index_number}
                  onChange={e => set('kcpe_index_number', e.target.value)}
                  placeholder="e.g. 12345678901" className={inp} />
              </div>
            </div>
            <div className="mt-4 max-w-xs">
              <label className={lbl}>KCPE Total Marks (0–500)</label>
              <input type="number" min={0} max={500} value={form.kcpe_total_marks}
                onChange={e => set('kcpe_total_marks', e.target.value)}
                placeholder="e.g. 380" className={inp} />
            </div>
          </div>

          {/* Section 2: Guardian Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiPhone size={14} />} title="Guardian / Parent Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Guardian Full Name *</label>
                <input type="text" value={form.guardian_full_name}
                  onChange={e => set('guardian_full_name', e.target.value)}
                  placeholder="e.g. Jane Mwangi" className={inp} />
              </div>
              <div>
                <label className={lbl}>Guardian Phone *</label>
                <input type="tel" value={form.guardian_phone}
                  onChange={e => set('guardian_phone', e.target.value)}
                  placeholder="e.g. 0712345678" className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={lbl}>Guardian Email (optional)</label>
                <input type="email" value={form.guardian_email}
                  onChange={e => set('guardian_email', e.target.value)}
                  placeholder="e.g. jane@email.com" className={inp} />
              </div>
              <div>
                <label className={lbl}>Guardian National ID *</label>
                <input type="text" value={form.guardian_national_id}
                  onChange={e => set('guardian_national_id', e.target.value)}
                  placeholder="e.g. 12345678" className={inp} />
              </div>
            </div>
          </div>

          {/* Section 3: Form Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiFileText size={14} />} title="Form Selection" />
            <div className="max-w-xs">
              <label className={lbl}>Form Applied For *</label>
              <select value={form.form_applied_for}
                onChange={e => set('form_applied_for', e.target.value)}
                className={inp}>
                <option value="">-- Select Form --</option>
                {FORMS.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 4: Document Upload (UI only) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiUpload size={14} />} title="Supporting Documents" />
            <p className="text-xs text-gray-400 mb-4">
              Documents can be submitted in person or via email after receiving your reference number.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Birth Certificate', hint: 'PDF, JPG, or PNG — max 5 MB' },
                { label: 'KCPE Result Slip', hint: 'PDF, JPG, or PNG — max 5 MB' },
                { label: 'Passport Photo', hint: 'JPG or PNG — max 2 MB' },
              ].map(doc => (
                <div key={doc.label} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiFileText size={14} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700">{doc.label}</p>
                    <p className="text-xs text-gray-400">{doc.hint}</p>
                  </div>
                  <input
                    type="file"
                    accept={doc.label === 'Passport Photo' ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png'}
                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold rounded-2xl flex items-center justify-center gap-3 text-base disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: GRAD }}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                <FiCheckCircle size={18} />
                Submit Application
              </>
            )}
          </button>
        </form>
      </div>

      {/* ─── Success Modal ─── */}
      {referenceNumber && (
        <SuccessModal referenceNumber={referenceNumber} onClose={handleReset} />
      )}
    </div>
  );
}
