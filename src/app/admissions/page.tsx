'use client';

import { useState, useCallback } from 'react';
import {
    FiUser, FiPhone, FiMail, FiFileText, FiCheckCircle,
    FiCopy, FiExternalLink, FiChevronRight, FiChevronLeft,
    FiArrowRight, FiStar, FiShield, FiClock, FiBook,
    FiAlertCircle, FiUpload,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
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

const EMPTY: FormData = {
    student_first_name: '', student_middle_name: '', student_last_name: '',
    date_of_birth: '', gender: '', previous_school: '', kcpe_index_number: '',
    kcpe_total_marks: '', guardian_full_name: '', guardian_phone: '',
    guardian_email: '', guardian_national_id: '', form_applied_for: '',
};

const inp = 'w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none transition-all placeholder-gray-300';
const lbl = 'block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5';

// ── Step Indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
    const steps = [
        { n: 1, label: 'Student Info', icon: '🎓' },
        { n: 2, label: 'Guardian Info', icon: '👨‍👩‍👧' },
        { n: 3, label: 'Review & Submit', icon: '✅' },
    ];
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {steps.map((s, i) => (
                <div key={s.n} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 shadow-md
                            ${step === s.n ? 'text-white scale-110' : step > s.n ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                            style={step >= s.n ? { background: 'linear-gradient(135deg,#0f766e,#0891b2)' } : {}}>
                            {step > s.n ? <FiCheckCircle size={18} /> : <span>{s.icon}</span>}
                        </div>
                        <span className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${step === s.n ? 'text-teal-700' : step > s.n ? 'text-green-600' : 'text-gray-400'}`}>
                            {s.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all duration-500 ${step > s.n ? 'bg-teal-500' : 'bg-gray-200'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ referenceNumber, studentName, onReset }: {
    referenceNumber: string; studentName: string; onReset: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(referenceNumber).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <div className="text-center py-4">
            {/* Animated checkmark */}
            <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl"
                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                    <FiCheckCircle size={48} className="text-white" />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }} />
            </div>

            <h2 className="text-2xl font-black text-gray-800 mb-2">Application Submitted! 🎉</h2>
            <p className="text-gray-500 text-sm mb-1">Dear <strong className="text-gray-700">{studentName}</strong>'s guardian,</p>
            <p className="text-gray-400 text-sm mb-6">Your admission application has been received successfully.<br />The school will review and contact you within 3–5 working days.</p>

            {/* Reference number */}
            <div className="bg-gradient-to-r from-teal-50 to-sky-50 border-2 border-teal-200 rounded-2xl p-6 mb-6 mx-auto max-w-xs">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                    <FiShield size={12} /> Your Reference Number
                </p>
                <p className="text-2xl font-black text-teal-700 tracking-widest font-mono">{referenceNumber}</p>
                <p className="text-[11px] text-gray-400 mt-2">Save this number to track your application</p>
            </div>

            <div className="flex gap-3 mb-5 max-w-sm mx-auto">
                <button onClick={copy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-teal-300 text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition-all text-sm">
                    <FiCopy size={14} /> {copied ? '✓ Copied!' : 'Copy Ref'}
                </button>
                <a href="/admissions/status"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-2xl text-sm shadow-lg transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                    <FiExternalLink size={14} /> Track Status
                </a>
            </div>

            {/* What next */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-5 max-w-sm mx-auto">
                <p className="text-xs font-black text-amber-700 uppercase mb-2">📋 What Happens Next?</p>
                <div className="space-y-1.5 text-xs text-amber-800">
                    <p>1. School reviews your application (3–5 days)</p>
                    <p>2. You'll receive an SMS on <strong>{' '}your guardian's phone</strong></p>
                    <p>3. If approved, visit school with original documents</p>
                    <p>4. Track status anytime at <strong>apsims.vercel.app/admissions/status</strong></p>
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
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(EMPTY);
    const [submitting, setSubmitting] = useState(false);
    const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

    const set = useCallback((field: keyof FormData, value: string) =>
        setForm(prev => ({ ...prev, [field]: value })), []);

    // Per-step validation
    const validateStep1 = (): string | null => {
        if (!form.student_first_name.trim()) return 'Student first name is required';
        if (!form.student_last_name.trim()) return 'Student last name is required';
        if (!form.date_of_birth) return 'Date of birth is required';
        if (!form.gender) return 'Please select gender';
        if (!form.kcpe_index_number.trim()) return 'KCPE index number is required';
        if (form.kcpe_total_marks) {
            const m = Number(form.kcpe_total_marks);
            if (isNaN(m) || m < 0 || m > 500) return 'KCPE marks must be between 0 and 500';
        }
        if (!form.form_applied_for) return 'Please select the form you are applying for';
        return null;
    };

    const validateStep2 = (): string | null => {
        if (!form.guardian_full_name.trim()) return 'Guardian full name is required';
        const phone = form.guardian_phone.replace(/\s+/g, '');
        if (!phone) return 'Guardian phone number is required';
        if (!/^(\+254|0)[17]\d{8}$/.test(phone)) return 'Enter a valid Kenyan phone (e.g. 0712345678)';
        if (!form.guardian_national_id.trim()) return 'Guardian National ID is required';
        return null;
    };

    const nextStep = () => {
        if (step === 1) {
            const err = validateStep1();
            if (err) { toast.error(err); return; }
        }
        if (step === 2) {
            const err = validateStep2();
            if (err) { toast.error(err); return; }
        }
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prevStep = () => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const handleSubmit = async () => {
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
            if (form.previous_school.trim())     payload.previous_school     = form.previous_school.trim();
            if (form.kcpe_total_marks)            payload.kcpe_total_marks    = Number(form.kcpe_total_marks);
            if (form.guardian_email.trim())       payload.guardian_email      = form.guardian_email.trim();

            const res    = await fetch('/api/admissions/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await res.json();

            if (res.status === 409) { toast.error('An application with this KCPE index number already exists.'); return; }
            if (!res.ok)            { throw new Error(result.error || 'Submission failed. Please try again.'); }

            setReferenceNumber(result.reference_number);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => { setReferenceNumber(null); setForm(EMPTY); setStep(1); };

    const kcpeColor = form.kcpe_total_marks
        ? Number(form.kcpe_total_marks) >= 350 ? 'text-green-600' : Number(form.kcpe_total_marks) >= 250 ? 'text-amber-600' : 'text-red-500'
        : '';

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfeff 50%,#f0f9ff 100%)' }}>

            {/* ── NAV BAR ── */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                            style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                            <FiBook size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-gray-800">APSIMS School</p>
                            <p className="text-[10px] text-gray-400 font-medium">Online Admissions Portal</p>
                        </div>
                    </div>
                    <a href="/admissions/status"
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all">
                        <FiExternalLink size={11} /> Track Application
                    </a>
                </div>
            </nav>

            {/* ── HERO ── */}
            <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f766e 0%,#0891b2 60%,#0369a1 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#ffffff,transparent)' }} />
                <div className="relative max-w-4xl mx-auto px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                        <FiStar size={11} /> Academic Year 2025–2026 Admissions Open
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
                        Apply for Admission
                    </h1>
                    <p className="text-teal-100 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                        Fill in the form below to apply for a place at our school. Your application will be reviewed by our admissions team within <strong className="text-white">3–5 working days</strong>.
                    </p>
                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 flex-wrap text-teal-200 text-xs">
                        <span className="flex items-center gap-1.5"><FiShield size={12} /> Secure & Confidential</span>
                        <span className="flex items-center gap-1.5"><FiClock size={12} /> Takes ~5 minutes</span>
                        <span className="flex items-center gap-1.5"><FiCheckCircle size={12} /> Free to Apply</span>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="max-w-2xl mx-auto px-4 py-8">

                {referenceNumber ? (
                    /* ── SUCCESS ── */
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                        <SuccessScreen
                            referenceNumber={referenceNumber}
                            studentName={`${form.student_first_name} ${form.student_last_name}`}
                            onReset={handleReset}
                        />
                    </div>
                ) : (
                    /* ── WIZARD ── */
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
                        <StepIndicator step={step} />

                        {/* ════ STEP 1: STUDENT INFO ════ */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                                        style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiUser size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Student Information</h2>
                                        <p className="text-xs text-gray-400">Tell us about the student applying</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={lbl}>First Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.student_first_name} onChange={e => set('student_first_name', e.target.value)}
                                            placeholder="e.g. John" className={inp} autoComplete="given-name" />
                                    </div>
                                    <div>
                                        <label className={lbl}>Middle Name <span className="text-gray-300">(optional)</span></label>
                                        <input type="text" value={form.student_middle_name} onChange={e => set('student_middle_name', e.target.value)}
                                            placeholder="e.g. Kamau" className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>Last Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.student_last_name} onChange={e => set('student_last_name', e.target.value)}
                                            placeholder="e.g. Mwangi" className={inp} autoComplete="family-name" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Date of Birth <span className="text-red-400">*</span></label>
                                        <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                                            max={new Date().toISOString().split('T')[0]} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>Gender <span className="text-red-400">*</span></label>
                                        <div className="flex gap-3">
                                            {['Male', 'Female'].map(g => (
                                                <button key={g} type="button" onClick={() => set('gender', g)}
                                                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${form.gender === g ? 'text-white border-transparent shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'}`}
                                                    style={form.gender === g ? { background: 'linear-gradient(135deg,#0f766e,#0891b2)' } : {}}>
                                                    {g === 'Male' ? '👦' : '👧'} {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Previous School <span className="text-gray-300">(optional)</span></label>
                                        <input type="text" value={form.previous_school} onChange={e => set('previous_school', e.target.value)}
                                            placeholder="e.g. Nairobi Primary School" className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>Form Applying For <span className="text-red-400">*</span></label>
                                        <select value={form.form_applied_for} onChange={e => set('form_applied_for', e.target.value)} className={inp}>
                                            <option value="">— Select Form —</option>
                                            <option value="1">Form 1</option>
                                            <option value="2">Form 2</option>
                                            <option value="3">Form 3</option>
                                            <option value="4">Form 4</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                                    <p className="text-xs font-bold text-teal-700 mb-3 flex items-center gap-1.5">
                                        <FiFileText size={12} /> KCPE Examination Details
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={lbl}>KCPE Index Number <span className="text-red-400">*</span></label>
                                            <input type="text" value={form.kcpe_index_number} onChange={e => set('kcpe_index_number', e.target.value)}
                                                placeholder="e.g. 12345678901" className={inp} />
                                        </div>
                                        <div>
                                            <label className={lbl}>KCPE Total Marks (0–500)</label>
                                            <div className="relative">
                                                <input type="number" min={0} max={500} value={form.kcpe_total_marks} onChange={e => set('kcpe_total_marks', e.target.value)}
                                                    placeholder="e.g. 380" className={inp} />
                                                {form.kcpe_total_marks && (
                                                    <span className={`absolute right-3 top-3 text-xs font-black ${kcpeColor}`}>
                                                        {Number(form.kcpe_total_marks) >= 350 ? '🌟 Excellent' : Number(form.kcpe_total_marks) >= 250 ? '👍 Good' : '📚 Basic'}
                                                    </span>
                                                )}
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
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                                        style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiPhone size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Parent / Guardian Information</h2>
                                        <p className="text-xs text-gray-400">We'll contact this person regarding the application</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className={lbl}>Guardian Full Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.guardian_full_name} onChange={e => set('guardian_full_name', e.target.value)}
                                            placeholder="e.g. Jane Kamau Mwangi" className={inp} autoComplete="name" />
                                    </div>
                                    <div>
                                        <label className={lbl}>Phone Number <span className="text-red-400">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-sm font-bold text-gray-400">🇰🇪</span>
                                            <input type="tel" value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)}
                                                placeholder="0712 345 678" className={`${inp} pl-10`} autoComplete="tel" />
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1 ml-1">SMS confirmation will be sent here</p>
                                    </div>
                                    <div>
                                        <label className={lbl}>National ID Number <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.guardian_national_id} onChange={e => set('guardian_national_id', e.target.value)}
                                            placeholder="e.g. 12345678" className={inp} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={lbl}>Email Address <span className="text-gray-300">(optional)</span></label>
                                        <div className="relative">
                                            <FiMail className="absolute left-4 top-3.5 text-gray-400" size={14} />
                                            <input type="email" value={form.guardian_email} onChange={e => set('guardian_email', e.target.value)}
                                                placeholder="e.g. parent@gmail.com" className={`${inp} pl-10`} autoComplete="email" />
                                        </div>
                                    </div>
                                </div>

                                {/* Documents section */}
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FiUpload size={14} className="text-teal-600" />
                                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Supporting Documents</p>
                                        <span className="text-[10px] text-gray-400 font-medium">(Can be submitted in person)</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {[
                                            { name: 'Birth Certificate', hint: 'PDF, JPG or PNG · Max 5MB', required: true },
                                            { name: 'KCPE Result Slip', hint: 'PDF, JPG or PNG · Max 5MB', required: true },
                                            { name: 'Passport Photo', hint: 'JPG or PNG · Max 2MB', required: false },
                                            { name: 'Medical Report', hint: 'PDF, JPG or PNG · Max 5MB', required: false },
                                        ].map(doc => (
                                            <div key={doc.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-teal-200 transition-all">
                                                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 text-teal-600 text-xs font-bold">
                                                    📄
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-700">{doc.name} {doc.required && <span className="text-red-400 text-xs">*</span>}</p>
                                                    <p className="text-[11px] text-gray-400">{doc.hint}</p>
                                                </div>
                                                <input type="file"
                                                    accept={doc.name === 'Passport Photo' ? 'image/*' : 'application/pdf,image/*'}
                                                    className="text-[11px] text-gray-500 max-w-[120px] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-2.5 flex items-center gap-1">
                                        <FiAlertCircle size={11} /> Documents can also be physically submitted when reporting to school.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ════ STEP 3: REVIEW ════ */}
                        {step === 3 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                                        style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiCheckCircle size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-800">Review Your Application</h2>
                                        <p className="text-xs text-gray-400">Please verify all details are correct before submitting</p>
                                    </div>
                                </div>

                                {/* Student card */}
                                <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        🎓 Student Details
                                        <button onClick={() => setStep(1)} className="ml-auto text-[10px] text-teal-600 underline font-bold normal-case">Edit</button>
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        {[
                                            ['Full Name', `${form.student_first_name} ${form.student_middle_name} ${form.student_last_name}`.replace(/\s+/g, ' ').trim()],
                                            ['Date of Birth', form.date_of_birth ? new Date(form.date_of_birth).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                                            ['Gender', form.gender || '—'],
                                            ['Form Applied', form.form_applied_for ? `Form ${form.form_applied_for}` : '—'],
                                            ['KCPE Index', form.kcpe_index_number || '—'],
                                            ['KCPE Marks', form.kcpe_total_marks ? `${form.kcpe_total_marks}/500` : '—'],
                                            ['Previous School', form.previous_school || '—'],
                                        ].map(([l, v]) => (
                                            <div key={l}>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{l}</p>
                                                <p className="font-semibold text-gray-800 text-xs mt-0.5">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Guardian card */}
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        👨‍👩‍👧 Guardian Details
                                        <button onClick={() => setStep(2)} className="ml-auto text-[10px] text-blue-600 underline font-bold normal-case">Edit</button>
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        {[
                                            ['Full Name', form.guardian_full_name || '—'],
                                            ['Phone', form.guardian_phone || '—'],
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

                                {/* Declaration */}
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                    <div className="flex items-start gap-3">
                                        <FiShield className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                            <strong>Declaration:</strong> I confirm that all information provided in this application is true and accurate. I understand that providing false information may result in the application being rejected or admission being revoked.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── NAV BUTTONS ── */}
                        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
                            {step > 1 ? (
                                <button onClick={prevStep}
                                    className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                                    <FiChevronLeft size={16} /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 3 ? (
                                <button onClick={nextStep}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all text-sm"
                                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                    Continue <FiChevronRight size={16} />
                                </button>
                            ) : (
                                <button onClick={handleSubmit} disabled={submitting}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-black rounded-2xl shadow-xl disabled:opacity-60 transition-all text-sm hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)', boxShadow: '0 8px 32px -4px rgba(15,118,110,0.5)' }}>
                                    {submitting ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                                    ) : (
                                        <><FiCheckCircle size={16} /> Submit Application</>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Step counter */}
                        <p className="text-center text-[11px] text-gray-300 mt-3">Step {step} of 3</p>
                    </div>
                )}

                {/* ── BOTTOM INFO ── */}
                {!referenceNumber && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { icon: '🔒', title: 'Secure & Private', desc: 'Your data is encrypted and safe' },
                            { icon: '📱', title: 'SMS Updates', desc: 'Get notified on your phone' },
                            { icon: '⚡', title: 'Fast Review', desc: '3–5 working days processing' },
                        ].map(f => (
                            <div key={f.title} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
                                <div className="text-xl mb-1">{f.icon}</div>
                                <p className="text-xs font-bold text-gray-700">{f.title}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-center text-[11px] text-gray-300 mt-6">
                    Powered by APSIMS · Secure Online Admissions · {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
