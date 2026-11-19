'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
import {
  FiUser,
  FiPhone,
  FiMail,
  FiFileText,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiChevronRight,
  FiChevronLeft,
  FiStar,
  FiShield,
  FiClock,
  FiBook,
  FiAlertCircle,
  FiUpload,
  FiRefreshCw,
  FiLock,
  FiCalendar,
  FiMapPin,
  FiHeart,
  FiInfo,
  FiAward,
  FiPrinter,
  FiCheck,
  FiLayers,
  FiShare2,
} from 'react-icons/fi';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const KENYAN_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii',
  'Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera',
  'Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi',
  'Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River',
  'Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

function getAge(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  const n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) age--;
  return age;
}

const formLabel = (v: string | number) => {
  const n = Number(v);
  if (n === 10) return 'Grade 10 (CBC Senior School)';
  if (n === 11) return 'Grade 11 (CBC Senior School)';
  if (n === 12) return 'Grade 12 (CBC Senior School)';
  if (n >= 7 && n <= 9) return `Grade ${n} (Junior Secondary CBC)`;
  if (n >= 1 && n <= 4) return `Form ${n} (8-4-4 Secondary)`;
  return String(v);
};

/* ── Date Picker ─────────────────────────────────────────────────────────── */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function DatePicker({
  value,
  onChange,
  required,
  minAge = 10,
  maxAge = 22,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minAge?: number;
  maxAge?: number;
}) {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const initYear = parsed ? parsed.getFullYear() : maxDate.getFullYear();
  const initMonth = parsed ? parsed.getMonth() : maxDate.getMonth();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const age = value ? getAge(value) : null;
  const valid = age !== null && age >= minAge && age <= maxAge;
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMon }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const isDayDisabled = (day: number) => {
    const dt = new Date(viewYear, viewMonth, day);
    return dt > maxDate || dt < minDate;
  };

  const isDaySelected = (day: number) => {
    if (!parsed) return false;
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
  };

  const yearRange = Array.from({ length: maxAge - minAge + 1 }, (_, i) => maxDate.getFullYear() - i);
  const displayVal = parsed
    ? parsed.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Select date of birth';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
          open
            ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
            : value
            ? 'border-blue-200 bg-blue-50/40 text-slate-900'
            : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400'
        }`}
      >
        <FiCalendar size={15} className={value ? 'text-blue-600' : 'text-slate-400'} />
        <span className="flex-1 text-left truncate">{displayVal}</span>
        {age !== null && (
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {age} yrs {valid ? '✓' : '✕'}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 min-w-[280px]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 outline-none"
            >
              {yearRange.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
            {DAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const disabled = isDayDisabled(day);
              const sel = isDaySelected(day);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && selectDay(day)}
                  className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${
                    sel
                      ? 'bg-blue-600 text-white shadow-xs'
                      : disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Admissible Age: {minAge}–{maxAge} years
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Otp Input ───────────────────────────────────────────────────────────── */
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join('').slice(0, 6));
    if (d && i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(p);
    if (p.length === 6) inputs.current[5]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-11 h-12 text-center text-xl font-mono font-black border-2 rounded-xl outline-none transition-all ${
            digits[i]
              ? 'border-blue-600 bg-blue-50/50 text-blue-900'
              : 'border-slate-200 bg-white text-slate-800'
          } focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50`}
        />
      ))}
    </div>
  );
}

/* ── Form Data Types ─────────────────────────────────────────────────────── */
interface FormData {
  // Student
  student_first_name: string;
  student_middle_name: string;
  student_last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  // Location
  county: string;
  sub_county: string;
  village_estate: string;
  // Academic & Curriculum Track
  curriculum_track: 'cbc' | '8-4-4';
  form_applied_for: string; // 1, 2, 3, 4, 10, 11, 12
  cbc_pathway: string; // STEM, Arts & Sports, Social Sciences
  previous_school: string;
  previous_school_county: string;
  kcpe_index_number: string;
  kcpe_total_marks: string;
  kcpe_year: string;
  // Guardian
  guardian_full_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_alt_phone: string;
  guardian_email: string;
  guardian_national_id: string;
  guardian_occupation: string;
  guardian_county: string;
  // Emergency
  emergency_name: string;
  emergency_phone: string;
  emergency_relationship: string;
  // Medical
  blood_group: string;
  has_disability: boolean;
  disability_details: string;
  allergies: string;
  medical_conditions: string;
}

const INITIAL_FORM: FormData = {
  student_first_name: '',
  student_middle_name: '',
  student_last_name: '',
  date_of_birth: '',
  gender: '',
  nationality: 'Kenyan',
  county: '',
  sub_county: '',
  village_estate: '',
  curriculum_track: 'cbc',
  form_applied_for: '10', // Default Grade 10 CBC
  cbc_pathway: 'STEM (Science, Tech, Engineering & Mathematics)',
  previous_school: '',
  previous_school_county: '',
  kcpe_index_number: '',
  kcpe_total_marks: '',
  kcpe_year: String(new Date().getFullYear() - 1),
  guardian_full_name: '',
  guardian_relationship: 'Parent',
  guardian_phone: '',
  guardian_alt_phone: '',
  guardian_email: '',
  guardian_national_id: '',
  guardian_occupation: '',
  guardian_county: '',
  emergency_name: '',
  emergency_phone: '',
  emergency_relationship: '',
  blood_group: '',
  has_disability: false,
  disability_details: '',
  allergies: '',
  medical_conditions: '',
};

const inputClass =
  'w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition';
const labelClass = 'block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1';

/* ── Steps Definition ────────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, label: 'Student', icon: '🧑', desc: 'Personal Bio' },
  { n: 2, label: 'Academic', icon: '📚', desc: 'CBC & 8-4-4 Track' },
  { n: 3, label: 'Guardian', icon: '👪', desc: 'Parents & Emergency' },
  { n: 4, label: 'Medical', icon: '🏥', desc: 'Welfare Profile' },
  { n: 5, label: 'Documents', icon: '📄', desc: 'Scans & Certificate' },
  { n: 6, label: 'Security', icon: '✉️', desc: 'Email OTP Check' },
  { n: 7, label: 'Submit', icon: '🎓', desc: 'Review & Enrol' },
];

/* ── Document Upload Box ─────────────────────────────────────────────────── */
function DocUploadBox({
  label,
  icon,
  accept,
  onUpload,
  uploadedUrl,
}: {
  label: string;
  icon: string;
  accept: string;
  onUpload: (url: string) => void;
  uploadedUrl?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File exceeds 8MB limit.');
      return;
    }

    setUploading(true);
    try {
      const sb = createClient(supabaseUrl, supabaseAnon);
      const ext = file.name.split('.').pop();
      const path = `online-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('admission-docs').upload(path, file, { upsert: true });

      if (error) {
        // Fallback to FileReader base64 if storage policy blocked
        const reader = new FileReader();
        reader.onloadend = () => {
          onUpload(reader.result as string);
          toast.success(`✓ ${label} attached!`);
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data } = sb.storage.from('admission-docs').getPublicUrl(path);
      onUpload(data.publicUrl);
      toast.success(`✓ ${label} uploaded securely!`);
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`border rounded-2xl p-3.5 transition-all cursor-pointer flex items-center gap-3 ${
        uploadedUrl
          ? 'bg-emerald-50/50 border-emerald-300'
          : 'bg-slate-50/70 border-slate-200/90 hover:bg-blue-50/30 hover:border-blue-300'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-800 truncate">{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {uploading
            ? 'Uploading document...'
            : uploadedUrl
            ? '✓ Verified & Attached — Click to replace'
            : 'Click to attach PDF, JPG or PNG (Max 8MB)'}
        </p>
      </div>
      {uploading ? (
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : uploadedUrl ? (
        <span className="text-emerald-700 text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 flex-shrink-0">
          Attached
        </span>
      ) : (
        <FiUpload size={14} className="text-slate-400 flex-shrink-0" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PUBLIC ADMISSIONS COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function AdmissionsPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);

  // Documents State
  const [photoUrl, setPhotoUrl] = useState('');
  const [birthCertUrl, setBirthCertUrl] = useState('');
  const [kcpeSlipUrl, setKcpeSlipUrl] = useState('');
  const [otherDocUrl, setOtherDocUrl] = useState('');

  // Email OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verToken, setVerToken] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const updateField = (key: keyof FormData, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  /* ── Validation Engine ─────────────────────────────────────────────────── */
  const validateCurrentStep = (): string | null => {
    if (step === 1) {
      if (!form.student_first_name.trim()) return 'Please enter student first name';
      if (!form.student_last_name.trim()) return 'Please enter student last name';
      if (!form.date_of_birth) return 'Date of birth is required';
      if (!form.gender) return 'Please select student gender';
      const a = getAge(form.date_of_birth);
      if (a < 10 || a > 22) return `Student age (${a}) must be between 10 and 22 years for secondary/CBC admission.`;
    }
    if (step === 2) {
      if (!form.form_applied_for) return 'Please select target form or grade.';
      if (form.curriculum_track === '8-4-4') {
        const k = form.kcpe_index_number.replace(/\s+/g, '');
        if (!k) return 'KCPE index number is required for 8-4-4 track.';
        if (!/^\d{11,12}$/.test(k)) return 'KCPE index must be 11 to 12 digits.';
        if (form.kcpe_total_marks) {
          const m = Number(form.kcpe_total_marks);
          if (isNaN(m) || m < 100 || m > 500) return 'KCPE marks must be between 100 and 500.';
        }
      }
    }
    if (step === 3) {
      if (!form.guardian_full_name.trim()) return 'Guardian full name is required.';
      const phone = form.guardian_phone.replace(/\s+/g, '');
      if (!phone) return 'Primary phone number is required.';
      if (!/^(\+254|0)[17]\d{8}$/.test(phone)) return 'Please enter a valid Kenyan phone number (e.g. 0712345678).';
      if (!form.guardian_national_id.trim()) return 'Guardian National ID / Passport is required.';
      if (!/^\d{6,10}$/.test(form.guardian_national_id.replace(/\s+/g, ''))) return 'National ID must be 6 to 10 digits.';
      if (!form.guardian_email.trim()) return 'Guardian email is required for confirmation.';
    }
    if (step === 6) {
      if (!otpVerified) return 'Please complete email OTP verification before proceeding.';
    }
    if (step === 7) {
      if (!termsAgreed) return 'You must agree to the declaration and document verification terms.';
    }
    return null;
  };

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Send OTP ──────────────────────────────────────────────────────────── */
  const handleSendOtp = async () => {
    const phone = form.guardian_phone.replace(/\s+/g, '');
    const email = form.guardian_email.trim();
    if (!email) {
      toast.error('Guardian email is missing. Please return to Step 3.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/admissions/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch code');

      setOtpSent(true);
      setOtpCode('');
      setCountdown(60);
      toast.success(`Verification code dispatched to ${email}!`);
    } catch (err: any) {
      toast.error(err.message || 'Error sending verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  /* ── Verify OTP ────────────────────────────────────────────────────────── */
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('Enter the full 6-digit code.');
      return;
    }
    if (otpAttempts >= 5) {
      toast.error('Too many attempts. Please request a fresh code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const phone = form.guardian_phone.replace(/\s+/g, '');
      const res = await fetch('/api/admissions/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpAttempts((a) => a + 1);
        throw new Error(data.error || 'Invalid code');
      }

      setOtpVerified(true);
      setVerToken(data.token);
      toast.success('✓ Guardian email verified successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  /* ── Final Submission ──────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!termsAgreed) {
      toast.error('Please accept the declaration terms.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        // Student Basic
        student_first_name: form.student_first_name.trim().toUpperCase(),
        student_middle_name: form.student_middle_name.trim().toUpperCase() || undefined,
        student_last_name: form.student_last_name.trim().toUpperCase(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        nationality: form.nationality || 'Kenyan',
        // Location
        county: form.county || undefined,
        sub_county: form.sub_county.trim() || undefined,
        village_estate: form.village_estate.trim() || undefined,
        // Academic
        form_applied_for: Number(form.form_applied_for),
        previous_school: form.previous_school.trim() || undefined,
        previous_school_county: form.previous_school_county || undefined,
        kcpe_index_number: form.kcpe_index_number ? form.kcpe_index_number.replace(/\s+/g, '').toUpperCase() : undefined,
        kcpe_total_marks: form.kcpe_total_marks ? Number(form.kcpe_total_marks) : undefined,
        kcpe_year: form.kcpe_year ? Number(form.kcpe_year) : undefined,
        // Guardian
        guardian_full_name: form.guardian_full_name.trim().toUpperCase(),
        guardian_relationship: form.guardian_relationship || 'Parent',
        guardian_phone: form.guardian_phone.replace(/\s+/g, ''),
        guardian_alt_phone: form.guardian_alt_phone.replace(/\s+/g, '') || undefined,
        guardian_email: form.guardian_email.trim() || undefined,
        guardian_national_id: form.guardian_national_id.replace(/\s+/g, ''),
        guardian_occupation: form.guardian_occupation.trim() || undefined,
        guardian_county: form.guardian_county || undefined,
        // Emergency
        emergency_name: form.emergency_name.trim() || undefined,
        emergency_phone: form.emergency_phone.replace(/\s+/g, '') || undefined,
        emergency_relationship: form.emergency_relationship || undefined,
        // Medical
        blood_group: form.blood_group || undefined,
        has_disability: form.has_disability,
        disability_details: form.disability_details.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        medical_conditions: form.medical_conditions.trim() || undefined,
        // Documents
        photo_url: photoUrl || undefined,
        birth_cert_url: birthCertUrl || undefined,
        kcpe_slip_url: kcpeSlipUrl || undefined,
        other_doc_url: otherDocUrl || undefined,
        other_doc_name: form.curriculum_track === 'cbc' ? `CBC Pathway: ${form.cbc_pathway}` : undefined,
        // Security
        verification_token: verToken,
        terms_agreed: true,
        honeypot: '',
      };

      const res = await fetch('/api/admissions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 409) {
        toast.error('An application with this KCPE / Assessment Index already exists.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setRefNo(data.reference_number);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('🎉 Application successfully registered with the school admissions office!');
    } catch (err: any) {
      toast.error(err.message || 'Error submitting application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRefNo(null);
    setForm(INITIAL_FORM);
    setStep(1);
    setPhotoUrl('');
    setBirthCertUrl('');
    setKcpeSlipUrl('');
    setOtherDocUrl('');
    setOtpSent(false);
    setOtpCode('');
    setOtpVerified(false);
    setVerToken('');
    setTermsAgreed(false);
  };

  /* ── Merit Score Evaluation Badge ── */
  const kcpeNumeric = Number(form.kcpe_total_marks);
  const meritEvaluation = form.kcpe_total_marks && !isNaN(kcpeNumeric)
    ? kcpeNumeric >= 400
      ? { label: '🌟 National School Distinction', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      : kcpeNumeric >= 350
      ? { label: '🎖️ High Honors Track (STEM/Honors)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : kcpeNumeric >= 300
      ? { label: '✓ Standard Secondary Admissible', color: 'text-blue-700 bg-blue-50 border-blue-200' }
      : { label: '📘 Qualified Candidate', color: 'text-slate-700 bg-slate-100 border-slate-200' }
    : null;

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 pb-16"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  APSIMS SENIOR ACADEMY
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  2026 Intake Open
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Official Online Admissions &amp; Enrolment Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/admissions/status"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-xs"
            >
              <span>Track Application</span>
              <FiChevronRight size={13} />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Executive Hero Header ── */}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-blue-50/30 py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-xs">
            <span>🇰🇪 Republic of Kenya</span>
            <span className="opacity-50">•</span>
            <span>MOE Reg: MOE/SEC/2026/089</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
            Online Student Admission Portal
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Dual-Track intake for <strong className="text-slate-800">CBC Senior School (Grades 10–12)</strong> and <strong className="text-slate-800">8-4-4 Secondary (Forms 1–4)</strong>. All information must match original certificates presented on reporting day.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <FiShield size={12} className="text-blue-600" />
              <span>SSL 256-Bit Encrypted</span>
            </span>
            <span className="flex items-center gap-1">
              <FiClock size={12} className="text-emerald-600" />
              <span>~3 Min Self-Service</span>
            </span>
            <span className="flex items-center gap-1">
              <FiLock size={12} className="text-purple-600" />
              <span>Email OTP Security</span>
            </span>
            <span className="flex items-center gap-1">
              <FiCheckCircle size={12} className="text-teal-600" />
              <span>Free to Apply</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Container ── */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        
        {/* Success View */}
        {refNo ? (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/20 mx-auto mb-4">
              🎉
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
              Application Successfully Registered!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Thank you, <strong className="text-slate-800">{form.guardian_full_name}</strong>. The Admissions Committee has received the dossier for{' '}
              <strong className="text-slate-800">{form.student_first_name} {form.student_last_name}</strong>.
            </p>

            {/* Reference Card */}
            <div className="my-6 p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border-2 border-blue-200 text-center max-w-sm mx-auto">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1">
                Official Admission Reference Number
              </p>
              <p className="text-2xl font-black font-mono text-blue-900 tracking-wider">
                {refNo}
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Save or print this reference number to track admission status.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(refNo);
                  toast.success('Reference number copied to clipboard!');
                }}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-xs"
              >
                <FiCopy size={13} />
                <span>Copy Reference</span>
              </button>

              <a
                href="/admissions/status"
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-md shadow-blue-500/20"
              >
                <FiExternalLink size={13} />
                <span>Track Status Online</span>
              </a>

              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-xs"
                title="Print Admission Summary"
              >
                <FiPrinter size={13} />
                <span>Print Slip</span>
              </button>
            </div>

            {/* Next Steps Card */}
            <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto text-xs space-y-2">
              <p className="font-black text-slate-800 text-[11px] uppercase tracking-wider">
                📋 Next Steps for Admitted Students:
              </p>
              <ul className="text-slate-600 text-[11px] space-y-1 list-disc list-inside">
                <li>Admissions committee evaluates credentials within 3–5 business days.</li>
                <li>An official SMS / Email decision notification will be dispatched.</li>
                <li>Upon provisional approval, download the Calling Letter from the status page.</li>
                <li>Present original birth certificate and KCPE/KPSEA slip on reporting day.</li>
              </ul>
            </div>

            <button
              onClick={handleReset}
              className="mt-6 text-xs text-slate-400 hover:text-slate-700 underline font-medium"
            >
              Submit another applicant registration
            </button>
          </div>
        ) : (
          /* Form Wizard */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-5 sm:p-8">
            
            {/* Step Progress Ribbon */}
            <div className="mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Step {step} of 7: <strong className="text-slate-900">{STEPS[step - 1].desc}</strong></span>
                <span className="font-mono text-[11px]">{Math.round((step / 7) * 100)}% Complete</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 7) * 100}%` }}
                />
              </div>

              {/* Step Badges Strip */}
              <div className="flex items-center justify-between gap-1 mt-3 overflow-x-auto pb-1">
                {STEPS.map((s) => {
                  const isDone = step > s.n;
                  const isCurrent = step === s.n;
                  return (
                    <div
                      key={s.n}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      <span>{isDone ? '✓' : s.icon}</span>
                      <span>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══ STEP 1: STUDENT PERSONAL INFO ══════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    🧑
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Student Personal Details
                    </h3>
                    <p className="text-[11px] text-slate-400">Enter student bio matching official birth certificate</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input
                      type="text"
                      value={form.student_first_name}
                      onChange={(e) => updateField('student_first_name', e.target.value)}
                      placeholder="e.g. BRIAN"
                      className={inputClass}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Middle Name</label>
                    <input
                      type="text"
                      value={form.student_middle_name}
                      onChange={(e) => updateField('student_middle_name', e.target.value)}
                      placeholder="e.g. KIPROTICH"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input
                      type="text"
                      value={form.student_last_name}
                      onChange={(e) => updateField('student_last_name', e.target.value)}
                      placeholder="e.g. KOECH"
                      className={inputClass}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Date of Birth *</label>
                    <DatePicker
                      value={form.date_of_birth}
                      onChange={(v) => updateField('date_of_birth', v)}
                      minAge={10}
                      maxAge={22}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Gender *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Male', 'Female'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateField('gender', g)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            form.gender === g
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {g === 'Male' ? '👦 Male' : '👧 Female'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Location / County */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FiMapPin size={12} />
                    <span>Home Residence &amp; County</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelClass}>County *</label>
                      <select
                        value={form.county}
                        onChange={(e) => updateField('county', e.target.value)}
                        className={inputClass}
                      >
                        <option value="">— Select County —</option>
                        {KENYAN_COUNTIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Sub-County</label>
                      <input
                        type="text"
                        value={form.sub_county}
                        onChange={(e) => updateField('sub_county', e.target.value)}
                        placeholder="e.g. Lang'ata"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Village / Estate</label>
                      <input
                        type="text"
                        value={form.village_estate}
                        onChange={(e) => updateField('village_estate', e.target.value)}
                        placeholder="e.g. Karen South"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2: DUAL-TRACK CBC & 8-4-4 ACADEMIC INFO ═══════════════ */}
            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    📚
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Academic &amp; Curriculum Track Selection
                    </h3>
                    <p className="text-[11px] text-slate-400">Choose between CBC Senior School and 8-4-4 Secondary</p>
                  </div>
                </div>

                {/* Track Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CBC Card */}
                  <div
                    onClick={() => {
                      updateField('curriculum_track', 'cbc');
                      updateField('form_applied_for', '10');
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      form.curriculum_track === 'cbc'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-indigo-900">🇰🇪 CBC Senior School</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          form.curriculum_track === 'cbc' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}
                      >
                        {form.curriculum_track === 'cbc' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Competency Based Curriculum Grades 10–12 with specialized pathways in STEM, Arts, or Social Sciences.
                    </p>
                  </div>

                  {/* 8-4-4 Card */}
                  <div
                    onClick={() => {
                      updateField('curriculum_track', '8-4-4');
                      updateField('form_applied_for', '1');
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      form.curriculum_track === '8-4-4'
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-blue-900">📘 8-4-4 Secondary Track</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          form.curriculum_track === '8-4-4' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {form.curriculum_track === '8-4-4' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Traditional 8-4-4 National curriculum leading to the Kenya Certificate of Secondary Education (KCSE).
                    </p>
                  </div>
                </div>

                {/* Class / Grade Selector Pills */}
                <div>
                  <label className={labelClass}>Target Entry Class / Level *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {form.curriculum_track === 'cbc' ? (
                      [
                        { id: '10', label: 'Grade 10 (Senior Entry)' },
                        { id: '11', label: 'Grade 11' },
                        { id: '12', label: 'Grade 12' },
                        { id: '9', label: 'Grade 9 (JSS)' },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => updateField('form_applied_for', lvl.id)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                            form.form_applied_for === lvl.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))
                    ) : (
                      [
                        { id: '1', label: 'Form 1 (Intake)' },
                        { id: '2', label: 'Form 2' },
                        { id: '3', label: 'Form 3' },
                        { id: '4', label: 'Form 4' },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => updateField('form_applied_for', lvl.id)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                            form.form_applied_for === lvl.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* CBC Pathway selector if CBC */}
                {form.curriculum_track === 'cbc' && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900">
                      Select Preferred Senior School Pathway
                    </p>
                    <select
                      value={form.cbc_pathway}
                      onChange={(e) => updateField('cbc_pathway', e.target.value)}
                      className={inputClass}
                    >
                      <option value="STEM (Science, Tech, Engineering & Mathematics)">
                        🧪 STEM Pathway (Pure Sciences, Technical &amp; Engineering)
                      </option>
                      <option value="Arts & Sports Science Pathway">
                        🎨 Arts &amp; Sports Science (Visual, Performing Arts &amp; Athletics)
                      </option>
                      <option value="Social Sciences Pathway">
                        ⚖️ Social Sciences (Humanities, Business Studies &amp; Languages)
                      </option>
                    </select>
                  </div>
                )}

                {/* Examination Credentials Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                    Primary / Junior Secondary Assessment Performance
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelClass}>
                        {form.curriculum_track === 'cbc' ? 'Assessment / UPI Number' : 'KCPE Index Number *'}
                      </label>
                      <input
                        type="text"
                        value={form.kcpe_index_number}
                        onChange={(e) => updateField('kcpe_index_number', e.target.value)}
                        placeholder="11–12 digits"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        {form.curriculum_track === 'cbc' ? 'Assessment Total Score' : 'KCPE Total Marks (100–500)'}
                      </label>
                      <input
                        type="number"
                        min={100}
                        max={500}
                        value={form.kcpe_total_marks}
                        onChange={(e) => updateField('kcpe_total_marks', e.target.value)}
                        placeholder="e.g. 385"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Exam Year</label>
                      <select
                        value={form.kcpe_year}
                        onChange={(e) => updateField('kcpe_year', e.target.value)}
                        className={inputClass}
                      >
                        {[0, 1, 2, 3].map((i) => {
                          const y = new Date().getFullYear() - i;
                          return (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Live Merit Badge Meter */}
                  {meritEvaluation && (
                    <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${meritEvaluation.color}`}>
                      <span>{meritEvaluation.label}</span>
                      <span className="font-mono">{form.kcpe_total_marks} / 500</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className={labelClass}>Previous Primary / Prep School</label>
                      <input
                        type="text"
                        value={form.previous_school}
                        onChange={(e) => updateField('previous_school', e.target.value)}
                        placeholder="e.g. St. Andrews Academy"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Previous School County</label>
                      <select
                        value={form.previous_school_county}
                        onChange={(e) => updateField('previous_school_county', e.target.value)}
                        className={inputClass}
                      >
                        <option value="">— Select County —</option>
                        {KENYAN_COUNTIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 3: GUARDIAN & EMERGENCY CONTACTS ══════════════════════ */}
            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                    👪
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Parent / Guardian Information
                    </h3>
                    <p className="text-[11px] text-slate-400">Primary contact for notifications and student oversight</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Guardian Full Name *</label>
                    <input
                      type="text"
                      value={form.guardian_full_name}
                      onChange={(e) => updateField('guardian_full_name', e.target.value)}
                      placeholder="e.g. FELIX K. KOECH"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Relationship *</label>
                    <select
                      value={form.guardian_relationship}
                      onChange={(e) => updateField('guardian_relationship', e.target.value)}
                      className={inputClass}
                    >
                      {['Parent', 'Mother', 'Father', 'Legal Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Sponsor'].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Primary Phone (SMS Verified) *</label>
                    <input
                      type="tel"
                      value={form.guardian_phone}
                      onChange={(e) => updateField('guardian_phone', e.target.value)}
                      placeholder="0712 345 678"
                      className={inputClass}
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Alternative Phone</label>
                    <input
                      type="tel"
                      value={form.guardian_alt_phone}
                      onChange={(e) => updateField('guardian_alt_phone', e.target.value)}
                      placeholder="Optional second line"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>
                      Email Address * <span className="text-blue-600 normal-case font-normal">(OTP sent here)</span>
                    </label>
                    <input
                      type="email"
                      value={form.guardian_email}
                      onChange={(e) => updateField('guardian_email', e.target.value)}
                      placeholder="parent@example.com"
                      className={inputClass}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>National ID / Passport Number *</label>
                    <input
                      type="text"
                      value={form.guardian_national_id}
                      onChange={(e) => updateField('guardian_national_id', e.target.value)}
                      placeholder="7–8 digit national ID"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Occupation / Business</label>
                    <input
                      type="text"
                      value={form.guardian_occupation}
                      onChange={(e) => updateField('guardian_occupation', e.target.value)}
                      placeholder="e.g. Civil Servant, Engineer"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Guardian County</label>
                    <select
                      value={form.guardian_county}
                      onChange={(e) => updateField('guardian_county', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">— Select County —</option>
                      {KENYAN_COUNTIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                    🆘 Alternative Emergency Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelClass}>Contact Person Name</label>
                      <input
                        type="text"
                        value={form.emergency_name}
                        onChange={(e) => updateField('emergency_name', e.target.value)}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Emergency Phone</label>
                      <input
                        type="tel"
                        value={form.emergency_phone}
                        onChange={(e) => updateField('emergency_phone', e.target.value)}
                        placeholder="0700 000 000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Relationship</label>
                      <input
                        type="text"
                        value={form.emergency_relationship}
                        onChange={(e) => updateField('emergency_relationship', e.target.value)}
                        placeholder="e.g. Aunt, Family Doctor"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 4: MEDICAL & WELFARE ══════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
                    🏥
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Medical Profile &amp; Special Needs
                    </h3>
                    <p className="text-[11px] text-slate-400">Strictly confidential student health and dietary record</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Blood Group</label>
                    <select
                      value={form.blood_group}
                      onChange={(e) => updateField('blood_group', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">— Not Known / Select —</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Disability Toggle */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Does the student have any disability or require special educational accommodations?
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateField('has_disability', true)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                          form.has_disability ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('has_disability', false)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                          !form.has_disability ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {form.has_disability && (
                    <textarea
                      value={form.disability_details}
                      onChange={(e) => updateField('disability_details', e.target.value)}
                      rows={2}
                      className={inputClass}
                      placeholder="Specify the physical, visual, hearing, or learning accommodation needed..."
                    />
                  )}
                </div>

                <div>
                  <label className={labelClass}>Known Allergies (Food, Environmental, Medication)</label>
                  <textarea
                    value={form.allergies}
                    onChange={(e) => updateField('allergies', e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="e.g. Peanuts, Penicillin, Dust. Leave blank if none."
                  />
                </div>

                <div>
                  <label className={labelClass}>Chronic Medical Conditions / Doctor Notes</label>
                  <textarea
                    value={form.medical_conditions}
                    onChange={(e) => updateField('medical_conditions', e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="e.g. Asthma, Diabetes, Sickle Cell. Leave blank if none."
                  />
                </div>
              </div>
            )}

            {/* ══ STEP 5: DOCUMENT VAULT ═════════════════════════════════════ */}
            {step === 5 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                    📄
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Document Vault &amp; Certifications
                    </h3>
                    <p className="text-[11px] text-slate-400">Attach clear scans or camera photos to expedite clearance</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <DocUploadBox
                    label="Student Passport Photo"
                    icon="📸"
                    accept="image/*"
                    onUpload={setPhotoUrl}
                    uploadedUrl={photoUrl}
                  />

                  <DocUploadBox
                    label="Official Birth Certificate"
                    icon="📜"
                    accept="application/pdf,image/*"
                    onUpload={setBirthCertUrl}
                    uploadedUrl={birthCertUrl}
                  />

                  <DocUploadBox
                    label="KCPE / Assessment Result Slip"
                    icon="🏆"
                    accept="application/pdf,image/*"
                    onUpload={setKcpeSlipUrl}
                    uploadedUrl={kcpeSlipUrl}
                  />

                  <DocUploadBox
                    label="Leaving Certificate / Medical Assessment Report (Optional)"
                    icon="📎"
                    accept="application/pdf,image/*"
                    onUpload={setOtherDocUrl}
                    uploadedUrl={otherDocUrl}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                  <p className="font-bold text-slate-700 mb-0.5">ℹ️ Reporting Day Verification:</p>
                  <p>Original copies of certificates must be presented on physical reporting day for formal verification.</p>
                </div>
              </div>
            )}

            {/* ══ STEP 6: EMAIL OTP VERIFICATION ═════════════════════════════ */}
            {step === 6 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    ✉️
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Guardian Email Verification
                    </h3>
                    <p className="text-[11px] text-slate-400">Verifying authenticity of applicant guardian</p>
                  </div>
                </div>

                {otpVerified ? (
                  <div className="p-8 text-center space-y-2 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xl mx-auto shadow-md shadow-emerald-500/20">
                      ✓
                    </div>
                    <h4 className="text-base font-black text-emerald-950">Email Verified Successfully!</h4>
                    <p className="text-xs text-emerald-800">
                      We have confirmed ownership of <strong className="font-mono">{form.guardian_email}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400 pt-2">
                      Click <strong>Continue</strong> below to proceed to the final review and submission.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">A 6-digit confirmation code will be sent to:</p>
                      <p className="text-sm font-black font-mono text-blue-900">{form.guardian_email || '—'}</p>
                      <button
                        onClick={() => setStep(3)}
                        className="text-[10px] text-blue-600 underline font-bold mt-1"
                      >
                        Edit email address
                      </button>
                    </div>

                    {!otpSent ? (
                      <button
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !form.guardian_email.trim()}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {sendingOtp ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <FiMail size={14} />
                            <span>Send 6-Digit Verification Code</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <p className="text-center text-xs font-bold text-slate-700">
                          Enter the 6-digit code sent to your inbox:
                        </p>
                        <OtpInput value={otpCode} onChange={setOtpCode} disabled={verifyingOtp} />

                        {otpAttempts > 0 && (
                          <p className="text-center text-xs text-rose-600 font-bold">
                            ⚠️ Incorrect code. {5 - otpAttempts} attempts remaining.
                          </p>
                        )}

                        <button
                          onClick={handleVerifyOtp}
                          disabled={otpCode.length < 6 || verifyingOtp || otpAttempts >= 5}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {verifyingOtp ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <FiCheck size={14} />
                              <span>Verify Code</span>
                            </>
                          )}
                        </button>

                        <div className="text-center pt-1">
                          {countdown > 0 ? (
                            <span className="text-xs text-slate-400 font-mono">
                              Resend code in {countdown}s
                            </span>
                          ) : (
                            <button
                              onClick={handleSendOtp}
                              disabled={sendingOtp}
                              className="text-xs text-blue-600 font-bold underline hover:text-blue-800"
                            >
                              Resend Verification Code
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 7: REVIEW & FINAL SUBMISSION ══════════════════════════ */}
            {step === 7 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    🎓
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      Review Dossier &amp; Final Declaration
                    </h3>
                    <p className="text-[11px] text-slate-400">Verify your information before permanent submission</p>
                  </div>
                </div>

                {/* Summary Panels */}
                <div className="space-y-3 text-xs">
                  {/* Student */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Student Identity</span>
                      <button onClick={() => setStep(1)} className="text-[10px] text-blue-600 font-bold underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-800">
                      <div><span className="text-slate-400">Full Name:</span> <strong className="block">{[form.student_first_name, form.student_middle_name, form.student_last_name].filter(Boolean).join(' ')}</strong></div>
                      <div><span className="text-slate-400">DOB &amp; Gender:</span> <strong className="block">{form.date_of_birth} ({form.gender})</strong></div>
                      <div><span className="text-slate-400">County:</span> <strong className="block">{form.county || 'Kenyan'}</strong></div>
                    </div>
                  </div>

                  {/* Academic */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Curriculum &amp; Placement</span>
                      <button onClick={() => setStep(2)} className="text-[10px] text-blue-600 font-bold underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-800">
                      <div><span className="text-slate-400">Target Track:</span> <strong className="block text-blue-700">{formLabel(form.form_applied_for)}</strong></div>
                      <div><span className="text-slate-400">KCPE Marks / Assessment:</span> <strong className="block font-mono">{form.kcpe_total_marks ? `${form.kcpe_total_marks} / 500` : 'Assessed'}</strong></div>
                      {form.curriculum_track === 'cbc' && (
                        <div className="col-span-2"><span className="text-slate-400">CBC Pathway:</span> <strong className="block text-indigo-700">{form.cbc_pathway}</strong></div>
                      )}
                    </div>
                  </div>

                  {/* Guardian */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Guardian &amp; Emergency</span>
                      <button onClick={() => setStep(3)} className="text-[10px] text-blue-600 font-bold underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-800">
                      <div><span className="text-slate-400">Guardian:</span> <strong className="block">{form.guardian_full_name} ({form.guardian_relationship})</strong></div>
                      <div><span className="text-slate-400">Contact:</span> <strong className="block font-mono">{form.guardian_phone}</strong></div>
                      <div className="col-span-2"><span className="text-slate-400">Email:</span> <strong className="block font-mono text-emerald-700">✓ {form.guardian_email}</strong></div>
                    </div>
                  </div>

                  {/* Documents Attached */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Documents Attached</span>
                      <button onClick={() => setStep(5)} className="text-[10px] text-blue-600 font-bold underline">Edit</button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full ${photoUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400'}`}>📸 Photo {photoUrl ? '✓' : '✕'}</span>
                      <span className={`px-2 py-0.5 rounded-full ${birthCertUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400'}`}>📜 Birth Cert {birthCertUrl ? '✓' : '✕'}</span>
                      <span className={`px-2 py-0.5 rounded-full ${kcpeSlipUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400'}`}>🏆 Result Slip {kcpeSlipUrl ? '✓' : '✕'}</span>
                    </div>
                  </div>
                </div>

                {/* Declaration Checkbox */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="text-[11px] text-amber-900 leading-relaxed">
                      <strong>Solemn Declaration &amp; Integrity Agreement:</strong>
                      <p className="mt-0.5">
                        I hereby certify that all information submitted in this application is accurate and matches the original Kenya Certificate of Primary Education / Assessment certificates and Birth Certificate. I understand that misrepresentation will result in immediate disqualification.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ── Wizard Navigation Controls ── */}
            <div className={`mt-6 pt-4 border-t border-slate-100 flex items-center ${step > 1 ? 'justify-between' : 'justify-end'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
                >
                  <FiChevronLeft size={14} />
                  <span>Back</span>
                </button>
              )}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-md shadow-blue-500/20 active:scale-95"
                >
                  <span>Continue</span>
                  <FiChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !termsAgreed}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md shadow-emerald-500/20 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiCheckCircle size={15} />
                      <span>Submit Official Application</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
