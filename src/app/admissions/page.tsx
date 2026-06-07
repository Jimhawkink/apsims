'use client';

// Form/Grade display helper (8-4-4 and CBC systems)
const formLabel = (v: string | number) => {
    const n = Number(v);
    if (n === 10) return 'Grade 10 (CBC)';
    if (n === 11) return 'Grade 11 (CBC)';
    if (n === 12) return 'Grade 12 (CBC)';
    if (n >= 1 && n <= 4) return `Form ${n} (8-4-4)`;
    return String(v);
};

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiUser, FiPhone, FiMail, FiFileText, FiCheckCircle,
    FiCopy, FiExternalLink, FiChevronRight, FiChevronLeft,
    FiStar, FiShield, FiClock, FiBook, FiAlertCircle,
    FiUpload, FiRefreshCw, FiLock, FiCalendar,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Premium DatePicker Component ─────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function getAge(dob: string): number {
    if (!dob) return 0;
    const d = new Date(dob); const n = new Date();
    let age = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) age--;
    return age;
}

interface DatePickerProps {
    value: string;                 // ISO 'YYYY-MM-DD'
    onChange: (v: string) => void;
    label?: string;
    required?: boolean;
    minAge?: number;               // student must be at least this old
    maxAge?: number;               // student must be at most this old
    className?: string;
}

function DatePicker({ value, onChange, required, minAge = 10, maxAge = 22, className }: DatePickerProps) {
    const today    = new Date();
    const maxDate  = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    const minDate  = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());

    const parsed   = value ? new Date(value + 'T00:00:00') : null;
    const initYear = parsed ? parsed.getFullYear() : maxDate.getFullYear();
    const initMonth= parsed ? parsed.getMonth()    : maxDate.getMonth();

    const [open, setOpen]       = useState(false);
    const [viewYear, setViewYear] = useState(initYear);
    const [viewMonth, setViewMonth] = useState(initMonth);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // When value changes externally, sync view
    useEffect(() => {
        if (value) { const d = new Date(value + 'T00:00:00'); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }, [value]);

    const age   = value ? getAge(value) : null;
    const valid = age !== null && age >= minAge && age <= maxAge;

    // Calendar grid
    const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
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
        <div ref={ref} style={{ position: 'relative' }} className={className}>
            {/* Trigger button */}
            <button type="button" onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    border: `2px solid ${open ? '#0d9488' : value ? '#99f6e4' : '#e2e8f0'}`,
                    borderRadius: 14, background: value ? '#f0fdfa' : '#fff',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: open ? '0 0 0 4px rgba(13,148,136,0.12)' : 'none',
                }}>
                <FiCalendar size={16} color={value ? '#0d9488' : '#94a3b8'} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: value ? 700 : 400, color: value ? '#0f172a' : '#94a3b8' }}>
                    {displayVal}
                </span>
                {age !== null && (
                    <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: valid ? '#ccfbf1' : '#fee2e2',
                        color: valid ? '#0d9488' : '#dc2626',
                    }}>
                        {age} yrs {valid ? '✓' : '✗'}
                    </span>
                )}
                <span style={{ fontSize: 10, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {/* Calendar Popover */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
                    background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0', minWidth: 300, overflow: 'hidden',
                    animation: 'dpFadeIn 0.18s ease',
                }}>
                    <style>{`
                        @keyframes dpFadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
                        .dp-day:hover:not(:disabled) { background: #0d9488 !important; color: #fff !important; }
                    `}</style>

                    {/* Header */}
                    <div style={{ background: 'linear-gradient(135deg,#0f766e,#0d9488)', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <FiCalendar size={14} color="#99f6e4" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#99f6e4', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Date of Birth</span>
                            {age !== null && (
                                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: valid ? '#ccfbf1' : '#fca5a5' }}>
                                    Age: {age} {valid ? '✓ Valid' : `✗ Must be ${minAge}–${maxAge} yrs`}
                                </span>
                            )}
                        </div>
                        {/* Month + Year selectors */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))}
                                style={{ flex: 2, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                                {MONTHS.map((m, i) => <option key={i} value={i} style={{ background: '#0f766e', color: '#fff' }}>{m}</option>)}
                            </select>
                            <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                                {yearRange.map(y => <option key={y} value={y} style={{ background: '#0f766e', color: '#fff' }}>{y}</option>)}
                            </select>
                            {/* Prev / Next month arrows */}
                            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}
                                style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>‹</button>
                            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }}
                                style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>›</button>
                        </div>
                    </div>

                    {/* Day grid */}
                    <div style={{ padding: '12px 14px 16px' }}>
                        {/* Weekday labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                            {DAYS.map(d => (
                                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
                            ))}
                        </div>
                        {/* Day cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                            {cells.map((day, idx) => {
                                if (!day) return <div key={idx} />;
                                const disabled = isDayDisabled(day);
                                const selected = isDaySelected(day);
                                return (
                                    <button key={idx} type="button" className="dp-day"
                                        disabled={disabled}
                                        onClick={() => !disabled && selectDay(day)}
                                        style={{
                                            width: '100%', aspectRatio: '1', borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                                            fontSize: 12, fontWeight: selected ? 900 : 500, transition: 'all 0.15s',
                                            background: selected ? '#0d9488' : 'transparent',
                                            color: selected ? '#fff' : disabled ? '#d1d5db' : '#0f172a',
                                            boxShadow: selected ? '0 2px 8px rgba(13,148,136,0.4)' : 'none',
                                        }}>
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Footer hint */}
                        <p style={{ margin: '10px 0 0', fontSize: 10, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                            Valid age range: {minAge}–{maxAge} years · Greyed dates are outside range
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}


// ── Types ─────────────────────────────────────────────────────────────────────
interface FormData {
    student_first_name: string;   student_middle_name: string;
    student_last_name: string;    date_of_birth: string;
    gender: string;               previous_school: string;
    kcpe_index_number: string;    kcpe_total_marks: string;
    guardian_full_name: string;   guardian_phone: string;
    guardian_email: string;       guardian_national_id: string;
    form_applied_for: string;
}
const EMPTY: FormData = {
    student_first_name: '', student_middle_name: '', student_last_name: '',
    date_of_birth: '', gender: '', previous_school: '', kcpe_index_number: '',
    kcpe_total_marks: '', guardian_full_name: '', guardian_phone: '',
    guardian_email: '', guardian_national_id: '', form_applied_for: '',
};

const inp = 'w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none transition-all placeholder-gray-300';
const lbl = 'block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAge(dob: string): number {
    const born = new Date(dob); const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
    return age;
}

// ── Step Indicator ─────────────────────────────────────────────────────────────
const STEPS = [
    { n: 1, label: 'Student',  icon: '🎓' },
    { n: 2, label: 'Guardian', icon: '👨‍👩‍👧' },
    { n: 3, label: 'Verify',   icon: '📱' },
    { n: 4, label: 'Submit',   icon: '✅' },
];
function StepIndicator({ step }: { step: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 shadow-md
                            ${step === s.n ? 'scale-110 text-white' : step > s.n ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                            style={step >= s.n ? { background: 'linear-gradient(135deg,#0f766e,#0891b2)' } : {}}>
                            {step > s.n ? <FiCheckCircle size={18} /> : s.icon}
                        </div>
                        <span className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${step === s.n ? 'text-teal-700' : step > s.n ? 'text-green-600' : 'text-gray-400'}`}>
                            {s.label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`w-10 sm:w-16 h-0.5 mx-1.5 mb-5 transition-all duration-500 ${step > s.n ? 'bg-teal-500' : 'bg-gray-200'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = value.padEnd(6, '').split('').slice(0, 6);

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    };
    const handleChange = (i: number, v: string) => {
        const d = v.replace(/\D/g, '').slice(-1);
        const next = [...digits]; next[i] = d;
        onChange(next.join('').slice(0, 6));
        if (d && i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
    };
    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        onChange(pasted);
        if (pasted.length === 6) inputs.current[5]?.focus();
    };

    return (
        <div className="flex gap-2 justify-center">
            {[0,1,2,3,4,5].map(i => (
                <input
                    key={i}
                    ref={el => { inputs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digits[i] || ''}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKey(i, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={`w-12 h-14 text-center text-2xl font-black border-2 rounded-2xl outline-none transition-all
                        ${digits[i] ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 bg-white text-gray-800'}
                        focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:opacity-50`}
                />
            ))}
        </div>
    );
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ referenceNumber, studentName, phone, onReset }: {
    referenceNumber: string; studentName: string; phone: string; onReset: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(referenceNumber).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    };
    return (
        <div className="text-center py-4">
            <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl"
                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                    <FiCheckCircle size={48} className="text-white" />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Application Submitted! 🎉</h2>
            <p className="text-gray-500 text-sm mb-1">Dear {studentName}'s guardian,</p>
            <p className="text-gray-400 text-sm mb-2">Your application has been received. An SMS confirmation was sent to <strong className="text-gray-700">{phone}</strong>.</p>
            <p className="text-gray-400 text-sm mb-6">The school will review within <strong>3–5 working days</strong>.</p>

            <div className="bg-gradient-to-r from-teal-50 to-sky-50 border-2 border-teal-200 rounded-2xl p-6 mb-6 mx-auto max-w-xs">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                    <FiShield size={12} /> Reference Number
                </p>
                <p className="text-2xl font-black text-teal-700 tracking-widest font-mono">{referenceNumber}</p>
                <p className="text-[11px] text-gray-400 mt-2">Use this to track your application</p>
            </div>

            <div className="flex gap-3 mb-5 max-w-sm mx-auto">
                <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-teal-300 text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition-all text-sm">
                    <FiCopy size={14} /> {copied ? '✓ Copied!' : 'Copy Ref'}
                </button>
                <a href="/admissions/status" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-2xl text-sm shadow-lg hover:opacity-90 transition-all"
                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                    <FiExternalLink size={14} /> Track Status
                </a>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-5 max-w-sm mx-auto">
                <p className="text-xs font-black text-amber-700 uppercase mb-2">📋 What Happens Next?</p>
                <div className="space-y-1.5 text-xs text-amber-800">
                    <p>1. School reviews your application (3–5 working days)</p>
                    <p>2. You'll receive an SMS on {phone}</p>
                    <p>3. If approved, visit school with original documents</p>
                    <p>4. Track status: <strong>apsims.vercel.app/admissions/status</strong></p>
                </div>
            </div>

            <button onClick={onReset} className="text-sm text-gray-400 hover:text-teal-600 underline transition-colors">
                Submit another application
            </button>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdmissionsPage() {
    const [step, setStep]                       = useState(1);
    const [form, setForm]                       = useState<FormData>(EMPTY);
    const [submitting, setSubmitting]           = useState(false);
    const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

    // OTP state
    const [otpSent, setOtpSent]               = useState(false);
    const [otpCode, setOtpCode]               = useState('');
    const [otpVerified, setOtpVerified]       = useState(false);
    const [verificationToken, setVerificationToken] = useState('');
    const [sendingOtp, setSendingOtp]         = useState(false);
    const [verifyingOtp, setVerifyingOtp]     = useState(false);
    const [otpAttempts, setOtpAttempts]       = useState(0);
    const [countdown, setCountdown]           = useState(0);

    // Terms
    const [termsAgreed, setTermsAgreed] = useState(false);

    const setField = useCallback((field: keyof FormData, value: string) =>
        setForm(prev => ({ ...prev, [field]: value })), []);

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // ── Step validation ───────────────────────────────────────────────────────
    const validateStep1 = (): string | null => {
        if (!form.student_first_name.trim()) return 'Student first name is required';
        if (!form.student_last_name.trim())  return 'Student last name is required';
        if (!form.date_of_birth)             return 'Date of birth is required';
        if (!form.gender)                    return 'Please select gender';
        if (!form.kcpe_index_number.trim())  return 'KCPE index number is required';
        const kcpe = form.kcpe_index_number.replace(/\s+/g, '');
        if (!/^\d{11,12}$/.test(kcpe))       return 'KCPE index must be 11–12 digits (e.g. 10100101001)';
        if (form.kcpe_total_marks) {
            const m = Number(form.kcpe_total_marks);
            if (isNaN(m) || m < 100 || m > 500) return 'KCPE marks must be between 100 and 500';
        }
        if (!form.form_applied_for)          return 'Please select the form you are applying for';
        if (![1,2,3,4,10,11,12].includes(Number(form.form_applied_for))) return 'Please select a valid form or grade';
        const age = getAge(form.date_of_birth);
        if (age < 10 || age > 22)            return `Student age (${age}) is outside the valid range. Please check date of birth.`;
        return null;
    };

    const validateStep2 = (): string | null => {
        if (!form.guardian_full_name.trim())   return 'Guardian full name is required';
        const phone = form.guardian_phone.replace(/\s+/g, '');
        if (!phone)                             return 'Guardian phone number is required';
        if (!/^(\+254|0)[17]\d{8}$/.test(phone)) return 'Enter a valid Kenyan phone (e.g. 0712345678)';
        const id = form.guardian_national_id.trim().replace(/\s+/g, '');
        if (!id)                               return 'Guardian National ID is required';
        if (!/^\d{7,8}$/.test(id))            return 'National ID must be 7–8 digits';
        return null;
    };

    const nextStep = () => {
        if (step === 1) { const e = validateStep1(); if (e) { toast.error(e); return; } }
        if (step === 2) { const e = validateStep2(); if (e) { toast.error(e); return; } }
        if (step === 3 && !otpVerified) { toast.error('Please verify your phone number to continue'); return; }
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const prevStep = () => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    // ── Send OTP ──────────────────────────────────────────────────────────────
    const sendOTP = async () => {
        const phone = form.guardian_phone.replace(/\s+/g, '');
        setSendingOtp(true);
        try {
            const res = await fetch('/api/admissions/send-otp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const r = await res.json();
            if (!res.ok) { toast.error(r.error || 'Failed to send OTP'); return; }
            setOtpSent(true); setOtpCode(''); setCountdown(60);
            toast.success(`✅ Code sent to ${phone}`);
        } catch { toast.error('Network error. Please try again.'); }
        finally { setSendingOtp(false); }
    };

    // ── Verify OTP ────────────────────────────────────────────────────────────
    const verifyOTP = async () => {
        if (otpCode.length !== 6) { toast.error('Enter the full 6-digit code'); return; }
        if (otpAttempts >= 5)     { toast.error('Too many attempts. Request a new code.'); return; }
        setVerifyingOtp(true);
        try {
            const phone = form.guardian_phone.replace(/\s+/g, '');
            const res = await fetch('/api/admissions/verify-otp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp: otpCode }),
            });
            const r = await res.json();
            if (!res.ok) {
                setOtpAttempts(a => a + 1);
                toast.error(r.error || 'Incorrect code');
                return;
            }
            setOtpVerified(true);
            setVerificationToken(r.token);
            toast.success('📱 Phone verified!');
        } catch { toast.error('Network error. Please try again.'); }
        finally { setVerifyingOtp(false); }
    };

    // ── Final submit ──────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!termsAgreed) { toast.error('Please agree to the declaration before submitting'); return; }
        setSubmitting(true);
        try {
            const phone = form.guardian_phone.replace(/\s+/g, '');
            const payload: any = {
                student_first_name:   form.student_first_name.trim(),
                student_last_name:    form.student_last_name.trim(),
                date_of_birth:        form.date_of_birth,
                gender:               form.gender,
                kcpe_index_number:    form.kcpe_index_number.replace(/\s+/g, ''),
                guardian_full_name:   form.guardian_full_name.trim(),
                guardian_phone:       phone,
                guardian_national_id: form.guardian_national_id.replace(/\s+/g, ''),
                form_applied_for:     Number(form.form_applied_for),
                verification_token:   verificationToken,
                terms_agreed:         termsAgreed,
                honeypot:             '',   // real users never fill this
            };
            if (form.student_middle_name.trim()) payload.student_middle_name = form.student_middle_name.trim();
            if (form.previous_school.trim())     payload.previous_school     = form.previous_school.trim();
            if (form.kcpe_total_marks)            payload.kcpe_total_marks    = Number(form.kcpe_total_marks);
            if (form.guardian_email.trim())       payload.guardian_email      = form.guardian_email.trim();

            const res    = await fetch('/api/admissions/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await res.json();

            if (res.status === 409) { toast.error('An application with this KCPE index number already exists.'); return; }
            if (res.status === 429) { toast.error(result.error || 'Too many applications. Please try again later.'); return; }
            if (res.status === 403) { toast.error('Phone verification required. Please go back and verify your phone.'); return; }
            if (!res.ok)            { throw new Error(result.error || 'Submission failed. Please try again.'); }

            setReferenceNumber(result.reference_number);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: any) { toast.error(e.message); }
        finally { setSubmitting(false); }
    };

    const handleReset = () => {
        setReferenceNumber(null); setForm(EMPTY); setStep(1);
        setOtpSent(false); setOtpCode(''); setOtpVerified(false);
        setVerificationToken(''); setTermsAgreed(false); setCountdown(0); setOtpAttempts(0);
    };

    const kcpeRating = form.kcpe_total_marks
        ? Number(form.kcpe_total_marks) >= 350 ? '🌟 Excellent' : Number(form.kcpe_total_marks) >= 250 ? '👍 Good' : '📚 Needs Support'
        : '';

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfeff 50%,#f0f9ff 100%)' }}>

            {/* NAV */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                            <FiBook size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-gray-800">APSIMS School</p>
                            <p className="text-[10px] text-gray-400 font-medium">Online Admissions Portal</p>
                        </div>
                    </div>
                    <a href="/admissions/status" className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all">
                        <FiExternalLink size={11} /> Track Application
                    </a>
                </div>
            </nav>

            {/* HERO */}
            <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f766e 0%,#0891b2 60%,#0369a1 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#ffffff,transparent)' }} />
                <div className="relative max-w-4xl mx-auto px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                        <FiStar size={11} /> Academic Year 2025–2026 Admissions Open
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">Apply for Admission</h1>
                    <p className="text-teal-100 text-sm max-w-md mx-auto mb-5 leading-relaxed">
                        Complete the 4-step form below. Your guardian's phone will be verified via SMS to ensure your application is genuine.
                    </p>
                    <div className="flex items-center justify-center gap-5 flex-wrap text-teal-200 text-xs">
                        <span className="flex items-center gap-1.5"><FiShield size={12} /> Secure & Confidential</span>
                        <span className="flex items-center gap-1.5"><FiClock size={12} /> ~5 minutes</span>
                        <span className="flex items-center gap-1.5"><FiLock size={12} /> Phone Verified</span>
                        <span className="flex items-center gap-1.5"><FiCheckCircle size={12} /> Free to Apply</span>
                    </div>
                </div>
            </div>

            {/* MAIN */}
            <div className="max-w-2xl mx-auto px-4 py-8">

                {referenceNumber ? (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                        <SuccessScreen
                            referenceNumber={referenceNumber}
                            studentName={`${form.student_first_name} ${form.student_last_name}`}
                            phone={form.guardian_phone.replace(/\s+/g, '')}
                            onReset={handleReset}
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
                        <StepIndicator step={step} />

                        {/* ════ STEP 1: STUDENT INFO ════ */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiUser size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Student Information</h2>
                                        <p className="text-xs text-gray-400">Tell us about the student applying</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div><label className={lbl}>First Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.student_first_name} onChange={e => setField('student_first_name', e.target.value)} placeholder="e.g. John" className={inp} autoComplete="given-name" /></div>
                                    <div><label className={lbl}>Middle Name <span className="text-gray-300">(opt.)</span></label>
                                        <input type="text" value={form.student_middle_name} onChange={e => setField('student_middle_name', e.target.value)} placeholder="e.g. Kamau" className={inp} /></div>
                                    <div><label className={lbl}>Last Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.student_last_name} onChange={e => setField('student_last_name', e.target.value)} placeholder="e.g. Mwangi" className={inp} autoComplete="family-name" /></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Date of Birth <span className="text-red-400">*</span></label>
                                        <DatePicker
                                            value={form.date_of_birth}
                                            onChange={v => setField('date_of_birth', v)}
                                            minAge={10}
                                            maxAge={22}
                                            required
                                        /></div>
                                    <div><label className={lbl}>Gender <span className="text-red-400">*</span></label>
                                        <div className="flex gap-3">
                                            {['Male', 'Female'].map(g => (
                                                <button key={g} type="button" onClick={() => setField('gender', g)}
                                                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${form.gender === g ? 'text-white border-transparent shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'}`}
                                                    style={form.gender === g ? { background: 'linear-gradient(135deg,#0f766e,#0891b2)' } : {}}>
                                                    {g === 'Male' ? '👦' : '👧'} {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Form Applying For <span className="text-red-400">*</span></label>
                                        <select value={form.form_applied_for} onChange={e => setField('form_applied_for', e.target.value)} className={inp}>
                                            <option value="">— Select Form / Grade —</option>
                                            <optgroup label="─── 8-4-4 System ───">
                                                <option value="1">Form 1</option>
                                                <option value="2">Form 2</option>
                                                <option value="3">Form 3</option>
                                                <option value="4">Form 4</option>
                                            </optgroup>
                                            <optgroup label="─── CBC System ───">
                                                <option value="10">Grade 10</option>
                                                <option value="11">Grade 11</option>
                                                <option value="12">Grade 12</option>
                                            </optgroup>
                                        </select></div>
                                    <div><label className={lbl}>Previous School <span className="text-gray-300">(opt.)</span></label>
                                        <input type="text" value={form.previous_school} onChange={e => setField('previous_school', e.target.value)} placeholder="e.g. Nairobi Primary" className={inp} /></div>
                                </div>
                                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                                    <p className="text-xs font-bold text-teal-700 mb-3 flex items-center gap-1.5"><FiFileText size={12} /> KCPE Examination Details</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className={lbl}>KCPE Index Number <span className="text-red-400">*</span></label>
                                            <input type="text" value={form.kcpe_index_number} onChange={e => setField('kcpe_index_number', e.target.value)} placeholder="11–12 digits e.g. 10100101001" className={inp} /></div>
                                        <div><label className={lbl}>KCPE Total Marks <span className="text-gray-300">(100–500)</span></label>
                                            <div className="relative">
                                                <input type="number" min={100} max={500} value={form.kcpe_total_marks} onChange={e => setField('kcpe_total_marks', e.target.value)} placeholder="e.g. 380" className={inp} />
                                                {kcpeRating && <span className="absolute right-3 top-3 text-[10px] font-black text-teal-600">{kcpeRating}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ STEP 2: GUARDIAN INFO ════ */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiPhone size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Parent / Guardian Information</h2>
                                        <p className="text-xs text-gray-400">We'll verify this phone number via SMS in the next step</p>
                                    </div>
                                </div>
                                <div>
                                    <label className={lbl}>Guardian Full Name <span className="text-red-400">*</span></label>
                                    <input type="text" value={form.guardian_full_name} onChange={e => setField('guardian_full_name', e.target.value)} placeholder="e.g. Jane Kamau Mwangi" className={inp} autoComplete="name" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Phone Number <span className="text-red-400">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-sm">🇰🇪</span>
                                            <input type="tel" value={form.guardian_phone} onChange={e => { setField('guardian_phone', e.target.value); setOtpSent(false); setOtpVerified(false); setVerificationToken(''); }}
                                                placeholder="0712 345 678" className={`${inp} pl-10`} autoComplete="tel" />
                                        </div>
                                        <p className="text-[11px] text-amber-600 mt-1 ml-1 font-medium">⚠️ SMS verification code will be sent here</p>
                                    </div>
                                    <div>
                                        <label className={lbl}>National ID <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.guardian_national_id} onChange={e => setField('guardian_national_id', e.target.value)} placeholder="7–8 digit ID e.g. 12345678" className={inp} />
                                    </div>
                                </div>
                                <div>
                                    <label className={lbl}>Email Address <span className="text-gray-300">(optional)</span></label>
                                    <div className="relative">
                                        <FiMail className="absolute left-4 top-3.5 text-gray-400" size={14} />
                                        <input type="email" value={form.guardian_email} onChange={e => setField('guardian_email', e.target.value)} placeholder="parent@gmail.com" className={`${inp} pl-10`} autoComplete="email" />
                                    </div>
                                </div>
                                {/* Documents */}
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FiUpload size={14} className="text-teal-600" />
                                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Supporting Documents</p>
                                        <span className="text-[10px] text-gray-400">(Can be submitted in person)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {['Birth Certificate', 'KCPE Result Slip', 'Passport Photo', 'Medical Report'].map(doc => (
                                            <div key={doc} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                                <span className="text-lg">📄</span>
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-gray-700">{doc}</p>
                                                    <p className="text-[10px] text-gray-400">PDF, JPG or PNG · Max 5MB</p>
                                                </div>
                                                <input type="file" accept="application/pdf,image/*" className="text-[10px] text-gray-500 max-w-[110px] file:mr-1 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-teal-50 file:text-teal-700" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1"><FiAlertCircle size={11} /> Documents can also be physically submitted when reporting.</p>
                                </div>
                            </div>
                        )}

                        {/* ════ STEP 3: PHONE OTP VERIFICATION ════ */}
                        {step === 3 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiLock size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Verify Guardian Phone</h2>
                                        <p className="text-xs text-gray-400">This ensures genuine applications only</p>
                                    </div>
                                </div>

                                {otpVerified ? (
                                    /* Already verified */
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl"
                                            style={{ background: 'linear-gradient(135deg,#15803d,#22c55e)' }}>
                                            <FiCheckCircle size={40} className="text-white" />
                                        </div>
                                        <h3 className="text-xl font-extrabold text-green-700 mb-1">Phone Verified! ✅</h3>
                                        <p className="text-sm text-gray-500">{form.guardian_phone.replace(/\s+/g, '')} has been confirmed.</p>
                                        <p className="text-xs text-gray-400 mt-2">Click Continue to review your application.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Phone display */}
                                        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center">
                                            <p className="text-xs text-gray-500 mb-1">Verification code will be sent to</p>
                                            <p className="text-xl font-black text-sky-700 font-mono">{form.guardian_phone.replace(/\s+/g, '')}</p>
                                            <button onClick={prevStep} className="text-xs text-sky-500 underline mt-1 hover:text-sky-700">Wrong number? Go back</button>
                                        </div>

                                        {!otpSent ? (
                                            /* Send button */
                                            <button onClick={sendOTP} disabled={sendingOtp}
                                                className="w-full py-4 text-white font-extrabold rounded-2xl flex items-center justify-center gap-3 text-base disabled:opacity-60 shadow-lg hover:opacity-90 transition-all"
                                                style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                                {sendingOtp ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</> : <><FiPhone size={18} /> Send Verification Code</>}
                                            </button>
                                        ) : (
                                            /* OTP entry */
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-center text-sm font-semibold text-gray-700 mb-1">Enter the 6-digit code sent via SMS</p>
                                                    <p className="text-center text-xs text-gray-400 mb-4">Check your messages. The code expires in 5 minutes.</p>
                                                    <OtpInput value={otpCode} onChange={setOtpCode} disabled={verifyingOtp} />
                                                </div>

                                                {otpAttempts > 0 && (
                                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                                                        <FiAlertCircle className="text-red-500 flex-shrink-0" size={14} />
                                                        <p className="text-xs text-red-700 font-medium">Incorrect code. {5 - otpAttempts} attempt(s) remaining.</p>
                                                    </div>
                                                )}

                                                <button onClick={verifyOTP} disabled={otpCode.length < 6 || verifyingOtp || otpAttempts >= 5}
                                                    className="w-full py-3.5 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg transition-all hover:opacity-90"
                                                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                                    {verifyingOtp ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</> : <><FiCheckCircle size={16} /> Verify Code</>}
                                                </button>

                                                <div className="text-center">
                                                    {countdown > 0 ? (
                                                        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                                                            <FiClock size={11} /> Resend available in {countdown}s
                                                        </p>
                                                    ) : (
                                                        <button onClick={sendOTP} disabled={sendingOtp}
                                                            className="text-xs text-teal-600 font-bold underline hover:text-teal-800 flex items-center gap-1 mx-auto disabled:opacity-50">
                                                            <FiRefreshCw size={11} /> {sendingOtp ? 'Sending…' : 'Resend Code'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                            <FiShield className="text-amber-600 flex-shrink-0 mt-0.5" size={13} />
                                            <p className="text-xs text-amber-800">Phone verification ensures only genuine applications are submitted. It protects the school from abuse and ensures we can reach you about your application.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ════ STEP 4: REVIEW & SUBMIT ════ */}
                        {step === 4 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiCheckCircle size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Review & Submit</h2>
                                        <p className="text-xs text-gray-400">Check everything is correct before submitting</p>
                                    </div>
                                </div>

                                {/* Student summary */}
                                <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-teal-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                                        🎓 Student Details
                                        <button onClick={() => setStep(1)} className="text-[10px] text-teal-600 underline font-bold normal-case">Edit</button>
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {[
                                            ['Full Name', `${form.student_first_name} ${form.student_middle_name} ${form.student_last_name}`.replace(/\s+/g, ' ').trim()],
                                            ['Date of Birth', form.date_of_birth ? new Date(form.date_of_birth).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                                            ['Gender', form.gender || '—'],
                                            ['Form Applied', form.form_applied_for ? formLabel(form.form_applied_for) : '—'],
                                            ['KCPE Index', form.kcpe_index_number || '—'],
                                            ['KCPE Marks', form.kcpe_total_marks ? `${form.kcpe_total_marks}/500` : '—'],
                                        ].map(([l, v]) => (
                                            <div key={l}>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{l}</p>
                                                <p className="font-semibold text-gray-800 text-xs mt-0.5">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Guardian summary */}
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                                        👨‍👩‍👧 Guardian Details
                                        <button onClick={() => setStep(2)} className="text-[10px] text-blue-600 underline font-bold normal-case">Edit</button>
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {[
                                            ['Full Name', form.guardian_full_name || '—'],
                                            ['Phone ✅ Verified', form.guardian_phone || '—'],
                                            ['National ID', form.guardian_national_id || '—'],
                                            ['Email', form.guardian_email || '—'],
                                        ].map(([l, v]) => (
                                            <div key={l}>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{l}</p>
                                                <p className="font-semibold text-gray-800 text-xs mt-0.5">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Honeypot — invisible to humans, bots fill it */}
                                <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} />

                                {/* Terms & Declaration */}
                                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                                    <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1.5"><FiShield size={12} /> Declaration</p>
                                    <p className="text-xs text-amber-800 leading-relaxed mb-3">
                                        I, <strong>{form.guardian_full_name || '(guardian name)'}</strong>, confirm that all information provided is <strong>true, accurate, and genuine</strong>. I understand that providing false information may result in the application being rejected, admission being revoked, and potential legal consequences.
                                    </p>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)}
                                            className="w-5 h-5 mt-0.5 rounded border-2 border-amber-400 accent-teal-600 flex-shrink-0 cursor-pointer" />
                                        <span className="text-xs text-amber-800 font-semibold leading-relaxed">
                                            I confirm the above declaration and agree to the school's terms and conditions. I understand this is a legally binding statement.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* ── NAV BUTTONS ── */}
                        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
                            {step > 1 ? (
                                <button onClick={prevStep} className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                                    <FiChevronLeft size={16} /> Back
                                </button>
                            ) : <div />}

                            {step < 4 ? (
                                <button onClick={nextStep} disabled={step === 3 && !otpVerified}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all text-sm disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                    Continue <FiChevronRight size={16} />
                                </button>
                            ) : (
                                <button onClick={handleSubmit} disabled={submitting || !termsAgreed}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-black rounded-2xl shadow-xl disabled:opacity-50 transition-all text-sm hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)', boxShadow: '0 8px 32px -4px rgba(15,118,110,0.5)' }}>
                                    {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</> : <><FiCheckCircle size={16} /> Submit Application</>}
                                </button>
                            )}
                        </div>
                        <p className="text-center text-[11px] text-gray-300 mt-3">Step {step} of 4</p>
                    </div>
                )}

                {!referenceNumber && (
                    <div className="mt-6 grid grid-cols-3 gap-3">
                        {[
                            { icon: '📱', title: 'SMS Verified', desc: 'Phone OTP confirms genuine applications' },
                            { icon: '🛡️', title: 'Rate Limited', desc: 'Max 3 applications per phone/year' },
                            { icon: '⚡', title: 'Fast Review', desc: '3–5 working days processing' },
                        ].map(f => (
                            <div key={f.title} className="bg-white/80 rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
                                <div className="text-xl mb-1">{f.icon}</div>
                                <p className="text-xs font-bold text-gray-700">{f.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-center text-[11px] text-gray-300 mt-6">Powered by APSIMS · Secure Online Admissions · {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}
