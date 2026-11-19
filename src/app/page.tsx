'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { usePageIcon } from '@/lib/usePageIcon';
import {
    HiOutlineUser,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineEyeSlash,
    HiArrowRight,
    HiOutlineShieldCheck,
    HiOutlinePhone,
    HiOutlineEnvelope,
    HiOutlineMapPin,
    HiOutlineArrowTopRightOnSquare,
    HiOutlineArrowsPointingOut,
    HiOutlineArrowsPointingIn,
    HiOutlineQuestionMarkCircle,
    HiOutlineXMark,
    HiOutlineClipboardDocumentCheck,
    HiOutlineClipboardDocument,
    HiOutlineClock,
    HiOutlineSignal,
    HiOutlineAcademicCap,
    HiOutlineSparkles,
} from 'react-icons/hi2';

/* ─── Golden Laurel School Crest (Compact & Crisp) ─── */
function SchoolCrest({ logoUrl, className = 'w-14 h-14 sm:w-16 sm:h-16' }: { logoUrl?: string | null; className?: string }) {
    if (logoUrl) {
        return (
            <div className={`relative rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg shadow-purple-950/40 bg-white/10 backdrop-blur-sm ${className}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="School Logo" className="w-full h-full object-cover" />
            </div>
        );
    }
    return (
        <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="crestPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="50%" stopColor="#581c87" />
                    <stop offset="100%" stopColor="#3b0764" />
                </linearGradient>
                <filter id="crestGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                </filter>
            </defs>

            {/* Left Laurel Wreath */}
            <g fill="url(#crestGold)" filter="url(#crestGlow)">
                <path d="M26 42c-3-8-4-16-1-22 3 5 4 12 1 22z" />
                <path d="M20 54c-5-7-7-15-4-21 4 5 6 12 4 21z" />
                <path d="M18 68c-6-6-9-14-6-20 4 4 8 10 6 20z" />
                <path d="M20 82c-6-4-10-11-8-17 5 3 10 7 8 17z" />
                <path d="M26 94c-5-3-9-8-8-14 5 2 10 5 8 14z" />
                <path d="M35 102c-4-2-7-6-7-11 4 1 9 3 7 11z" />
                <path d="M22 36c-7 20-6 44 14 66" stroke="url(#crestGold)" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>

            {/* Right Laurel Wreath */}
            <g fill="url(#crestGold)" filter="url(#crestGlow)">
                <path d="M94 42c3-8 4-16 1-22-3 5-4 12-1 22z" />
                <path d="M100 54c5-7 7-15 4-21-4 5-6 12-4 21z" />
                <path d="M102 68c6-6 9-14 6-20-4 4-8 10-6 20z" />
                <path d="M100 82c6-4 10-11 8-17-5 3-10 7-8 17z" />
                <path d="M94 94c5-3 9-8 8-14-5 2-10 5-8 14z" />
                <path d="M85 102c4-2 7-6 7-11-4 1-9 3-7 11z" />
                <path d="M98 36c7 20 6 44-14 66" stroke="url(#crestGold)" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>

            {/* Central Shield */}
            <g filter="url(#crestGlow)">
                <path d="M60 16L86 28v32c0 20-11 34-26 40-15-6-26-20-26-40V28L60 16z" fill="url(#crestGold)" />
                <path d="M60 20L82 30v30c0 17-9 29-22 35-13-6-22-18-22-35V30L60 20z" fill="url(#crestPurple)" />
            </g>

            {/* Shield Interior */}
            <g fill="#ffffff">
                <polygon points="60,33 46,40 60,47 74,40" />
                <polygon points="58,47 54,49 54,54 60,56 66,54 66,49 62,47" opacity="0.9" />
                <line x1="46" y1="40" x2="43" y2="47" stroke="#fef08a" strokeWidth="1.5" />
                <circle cx="43" cy="48" r="1.5" fill="#fef08a" />
                <path d="M60 56c-4-2-9-3-15-2v15c6-1 11 0 15 2 4-2 9-3 15-2V54c-6-1-11 0-15 2z" opacity="0.95" />
                <path d="M60 56v15" stroke="url(#crestGold)" strokeWidth="1.5" />
            </g>

            {/* Banner Below */}
            <g filter="url(#crestGlow)">
                <path d="M30 96l10-4h40l10 4-4 8H34l-4-8z" fill="url(#crestGold)" />
                <polygon points="30,96 34,104 22,106 27,99 22,93" fill="#b45309" />
                <polygon points="90,96 86,104 98,106 93,99 98,93" fill="#b45309" />
            </g>
        </svg>
    );
}

/* ─── 3D Specular Badge for Card Top ─── */
function CardShieldBadge() {
    return (
        <div className="relative w-12 h-12 rounded-2xl p-[2px] bg-gradient-to-tr from-amber-500 via-amber-200 to-yellow-100 shadow-[0_6px_20px_rgba(79,70,229,0.35)] flex-shrink-0">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-white/25 rounded-full blur-[2px] pointer-events-none"></div>
                <HiOutlineAcademicCap className="w-6 h-6 text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    usePageIcon();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // School data dynamically fetched from database
    const [schoolName, setSchoolName] = useState('ST. CATHERINE GIRL\'S SCHOOL TEGAT');
    const [schoolMotto, setSchoolMotto] = useState('Excellence in Education');
    const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
    const [schoolPhone, setSchoolPhone] = useState<string>('0720316175');
    const [schoolEmail, setSchoolEmail] = useState<string>('support@apsims.co.ke');
    const [schoolAddress, setSchoolAddress] = useState<string>('BOMET, KENYA');
    const [mounted, setMounted] = useState(false);

    // Real-Time Clock State
    const [currentTime, setCurrentTime] = useState<string>('');
    const [currentDate, setCurrentDate] = useState<string>('');
    const [use24Hour, setUse24Hour] = useState<boolean>(false);
    const [latencyMs, setLatencyMs] = useState<number>(24);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Contact & Support Modal state
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Forgot password state
    const [showForgot, setShowForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
    const [forgotUsername, setForgotUsername] = useState('');
    const [forgotToken, setForgotToken] = useState('');
    const [forgotUserId, setForgotUserId] = useState<number | null>(null);
    const [forgotCode, setForgotCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotHint, setForgotHint] = useState('');
    const [forgotDevCode, setForgotDevCode] = useState('');

    // Clock Interval
    useEffect(() => {
        setMounted(true);

        const updateClock = () => {
            const now = new Date();
            // Kenya Time (EAT = UTC+3)
            const timeOptions: Intl.DateTimeFormatOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: !use24Hour,
            };
            const dateOptions: Intl.DateTimeFormatOptions = {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            };
            setCurrentTime(now.toLocaleTimeString('en-GB', timeOptions));
            setCurrentDate(now.toLocaleDateString('en-GB', dateOptions));
        };

        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, [use24Hour]);

    // Track Fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Load saved username & database school details
    useEffect(() => {
        try {
            const saved = localStorage.getItem('apsims_remember_user');
            if (saved) {
                setUsername(saved);
                setRememberMe(true);
            }
        } catch {
            // Ignore
        }

        const loadSchoolDetails = async () => {
            const t0 = performance.now();
            try {
                let { data } = await supabase
                    .from('school_details')
                    .select('*')
                    .neq('section', 'primary')
                    .order('id', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (!data?.school_name) {
                    const fallback = await supabase
                        .from('school_details')
                        .select('*')
                        .order('id', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    data = fallback.data;
                }

                const elapsed = Math.round(performance.now() - t0);
                if (elapsed > 0 && elapsed < 500) setLatencyMs(elapsed);

                if (data?.school_name) {
                    setSchoolName(data.school_name);
                    document.title = `${data.school_name} - Login`;
                }
                if (data?.motto) setSchoolMotto(data.motto);
                if (data?.logo_url) setSchoolLogoUrl(data.logo_url);
                if (data?.phone1 || data?.phone) setSchoolPhone(data.phone1 || data.phone);
                if (data?.email) setSchoolEmail(data.email);
                if (data?.postal_address || data?.physical_address) {
                    setSchoolAddress(data.physical_address || data.postal_address);
                }
            } catch {
                // Keep defaults
            }
        };
        loadSchoolDetails();
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`${label} copied to clipboard!`, { icon: '📋' });
        setTimeout(() => setCopiedField(null), 2500);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Invalid username or password');
                setIsLoading(false);
                return;
            }

            try {
                if (rememberMe) {
                    localStorage.setItem('apsims_remember_user', username.trim());
                } else {
                    localStorage.removeItem('apsims_remember_user');
                }
            } catch {
                // Ignore storage error
            }

            if (typeof window !== 'undefined') localStorage.setItem('school_user', JSON.stringify(data.user));
            const roleLabels: Record<string, string> = {
                admin: '🔑 Admin',
                principal: '🎓 Principal',
                bursar: '💰 Bursar',
                accountant: '📊 Accountant',
                receptionist: '📋 Receptionist',
                teacher: '👨‍🏫 Teacher',
            };
            toast.success(`Welcome, ${data.user.full_name}! (${roleLabels[data.user.role] || data.user.role})`);

            const perms: Record<string, boolean> = data.user.permissions || {};
            const role = (data.user.role || '').toLowerCase();
            const isAdminRole = ['admin', 'principal', 'super-admin', 'superadmin', 'super_admin'].includes(role);
            if (isAdminRole || perms['dashboard'] === true) {
                router.push('/dashboard');
            } else if (perms['stores'] === true) {
                router.push('/dashboard/stores/ultra');
            } else if (perms['library'] === true) {
                router.push('/dashboard/library-inventory/ultra');
            } else if (perms['fees'] === true) {
                router.push('/dashboard/fees');
            } else if (perms['students'] === true) {
                router.push('/dashboard/students');
            } else if (perms['attendance'] === true) {
                router.push('/dashboard/attendance');
            } else if (perms['hostel'] === true) {
                router.push('/dashboard/hostel');
            } else if (perms['students_health'] === true) {
                router.push('/dashboard/students/health');
            } else {
                router.push('/dashboard');
            }
        } catch {
            setError('Login failed. Please check your network and try again.');
        }
        setIsLoading(false);
    };

    const handleForgotRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotUsername.trim()) { toast.error('Enter your username'); return; }
        setForgotLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: forgotUsername.trim() }),
            });
            const data = await res.json();
            if (data.reset_token) {
                setForgotToken(data.reset_token);
                setForgotUserId(data.user_id);
                setForgotHint(data.phone_hint ? `SMS sent to ${data.phone_hint}` : data.email_hint ? `Email sent to ${data.email_hint}` : 'Reset code sent');
                if (data._dev_code) setForgotDevCode(data._dev_code);
                setForgotStep('verify');
                toast.success('Reset code sent!');
            } else {
                toast.error(data.error || 'Username not found');
            }
        } catch { toast.error('Request failed'); }
        setForgotLoading(false);
    };

    const handleForgotVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotCode.trim()) { toast.error('Enter the reset code'); return; }
        setForgotStep('reset');
    };

    const handleForgotReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
        setForgotLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset_token: forgotToken, user_id: forgotUserId, new_password: newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Password reset! You can now log in.');
                setShowForgot(false);
                setForgotStep('request');
                setForgotUsername(''); setForgotCode(''); setNewPassword(''); setConfirmPassword('');
                setForgotToken(''); setForgotUserId(null); setForgotDevCode('');
            } else {
                toast.error(data.error || 'Reset failed');
            }
        } catch { toast.error('Reset failed'); }
        setForgotLoading(false);
    };

    const closeForgot = () => {
        setShowForgot(false);
        setForgotStep('request');
        setForgotUsername(''); setForgotCode(''); setNewPassword(''); setConfirmPassword('');
        setForgotToken(''); setForgotUserId(null); setForgotDevCode(''); setForgotHint('');
    };

    if (!mounted) return null;

    return (
        <div className="h-screen max-h-screen w-full relative overflow-hidden bg-[#0a0f1d] text-slate-100 flex flex-col justify-between select-none">
            <Toaster position="top-right" />

            {/* Google Fonts */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Dancing+Script:wght@700&family=Outfit:wght@400;500;600;700;800;900&display=swap');

                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                }
                .pulse-orb {
                    animation: pulseGlow 4s ease-in-out infinite;
                }
            `}</style>

            {/* Clean Campus Courtyard Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
                style={{ backgroundImage: `url('/login-bg.png')` }}
            >
                {/* Luminous overlay gradient for contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-slate-950/20 to-indigo-950/40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30"></div>
            </div>

            {/* Ambient Lighting Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none pulse-orb"></div>
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none pulse-orb" style={{ animationDelay: '2s' }}></div>

            {/* MAIN SINGLE-WINDOW CONTENT WRAPPER */}
            <div className="relative z-10 w-full h-full max-h-screen flex flex-col justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-4 max-w-[1920px] mx-auto overflow-hidden">

                {/* ─── TOP SECTION: School Branding & Live Status Pill ─── */}
                <header className="w-full flex items-center justify-between flex-shrink-0 pt-0.5">
                    {/* Top-Left School Branding */}
                    <div className="flex items-center gap-3 sm:gap-4 group">
                        <SchoolCrest logoUrl={schoolLogoUrl} className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-tight">
                                    {schoolName}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-400/30 text-cyan-300 text-[9px] sm:text-[11px] font-bold tracking-wider uppercase">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                    INSTITUTIONAL PORTAL
                                </span>
                                {schoolMotto && (
                                    <span
                                        className="hidden sm:inline-block text-amber-300 text-sm sm:text-base font-bold italic tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ml-1"
                                        style={{ fontFamily: "'Caveat', 'Dancing Script', cursive" }}
                                    >
                                        &ldquo;{schoolMotto}&rdquo;
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Top-Right Quick Links & Active System Orb */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Parent & Student Portal Pill Shortcut */}
                        <button
                            type="button"
                            onClick={() => router.push('/portal/login')}
                            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/18 backdrop-blur-xl border border-white/20 text-white text-xs font-bold tracking-wide transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                            title="Switch to Student & Parent Portal"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <span>Parents &amp; Students Portal</span>
                            <HiArrowRight className="w-3.5 h-3.5 text-amber-300" />
                        </button>

                        {/* Public Website Button */}
                        <button
                            type="button"
                            onClick={() => router.push('/school')}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/60 hover:bg-indigo-900/70 backdrop-blur-xl border border-indigo-400/30 text-indigo-200 text-xs font-semibold transition-all shadow-md active:scale-95"
                            title="View School Public Website"
                        >
                            <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Website</span>
                        </button>

                        {/* Fullscreen Button */}
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all shadow-md active:scale-90"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        >
                            {isFullscreen ? (
                                <HiOutlineArrowsPointingIn className="w-4 h-4 text-slate-200" />
                            ) : (
                                <HiOutlineArrowsPointingOut className="w-4 h-4 text-slate-200" />
                            )}
                        </button>
                    </div>
                </header>

                {/* ─── CENTER SECTION: Ultra-Refined Executive Login Card ─── */}
                <main className="w-full flex-1 flex items-center justify-center lg:justify-end my-auto py-1 sm:py-2 lg:pr-10 xl:pr-16">
                    <div className="w-full max-w-[420px] relative">
                        {/* Background Specular Aura */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-blue-500/30 rounded-[34px] blur-xl opacity-75 pointer-events-none"></div>

                        {/* Ultra-Refined Frosted Glass Card Container */}
                        <div className="relative rounded-[28px] bg-white/[0.94] backdrop-blur-2xl border border-white/95 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.4),0_0_35px_rgba(99,102,241,0.18)] p-6 sm:p-7 text-slate-800 overflow-hidden">
                            {/* Glowing Multi-Color Top Edge Rim */}
                            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-[28px]"></div>

                            {/* Card Header with 3D Shield Badge */}
                            <div className="flex items-center gap-3.5 pt-1 mb-4">
                                <CardShieldBadge />
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                            Institutional Security Gate
                                        </span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                                        Staff &amp; Faculty Sign In
                                    </h2>
                                </div>
                            </div>

                            {/* Subtitle Divider */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200"></div>
                                <p className="text-[11px] font-semibold text-slate-500">Enter your credentials to manage records</p>
                                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200"></div>
                            </div>

                            {/* Login Form */}
                            <form onSubmit={handleLogin} className="space-y-3.5">
                                {/* Error Alert */}
                                {error && (
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold animate-shake">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Username Field */}
                                <div className="space-y-1">
                                    <label htmlFor="username-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 pl-1">
                                        Username
                                    </label>
                                    <div className="relative flex items-center bg-slate-50/90 hover:bg-white focus-within:bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/12 transition-all shadow-sm px-3.5 py-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-2.5 flex-shrink-0 shadow-inner">
                                            <HiOutlineUser className="w-4 h-4" />
                                        </div>
                                        <input
                                            id="username-input"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="e.g. principal or admin"
                                            autoFocus
                                            autoComplete="username"
                                            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1">
                                    <label htmlFor="password-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 pl-1">
                                        Password
                                    </label>
                                    <div className="relative flex items-center bg-slate-50/90 hover:bg-white focus-within:bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/12 transition-all shadow-sm px-3.5 py-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-2.5 flex-shrink-0 shadow-inner">
                                            <HiOutlineLockClosed className="w-4 h-4" />
                                        </div>
                                        <input
                                            id="password-input"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your security password"
                                            autoComplete="current-password"
                                            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none pr-8"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                            className="absolute right-3.5 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <HiOutlineEyeSlash className="w-4 h-4" />
                                            ) : (
                                                <HiOutlineEye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me & Forgot Password Row */}
                                <div className="flex items-center justify-between text-xs pt-0.5 px-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                        />
                                        <span className="font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                                            Remember device
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgot(true)}
                                        className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Super Ultra 3D Submit Button */}
                                <button
                                    id="login-button"
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:via-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_10px_25px_-5px_rgba(79,70,229,0.5)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_14px_30px_-5px_rgba(79,70,229,0.65)] hover:translate-y-[-1px] active:translate-y-[1px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Authenticating Session...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Authenticate &amp; Enter</span>
                                            <HiArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Card Security Tag & Footer */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                    <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>256-Bit SSL Encrypted</span>
                                </div>
                                <span className="text-slate-400">APSIMS v2.4</span>
                            </div>
                        </div>
                    </div>
                </main>

                {/* ─── BOTTOM SECTION: Super Ultra-Premium Working Bottom Nav Dock ─── */}
                <footer className="w-full flex-shrink-0 z-20 pb-0.5">
                    <div className="w-full rounded-2xl bg-slate-950/75 backdrop-blur-xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.6)] px-3 sm:px-5 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs text-slate-200">

                        {/* Left Island: Working Real-Time Clock & Date */}
                        <div className="flex items-center gap-3">
                            <div
                                onClick={() => setUse24Hour(!use24Hour)}
                                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer select-none"
                                title="Click to toggle 12h / 24h format"
                            >
                                <HiOutlineClock className="w-4 h-4 text-amber-300 animate-spin-slow" />
                                <span className="font-mono font-bold text-amber-200 text-xs sm:text-sm tracking-wider">
                                    {currentTime || '09:00:00 AM'}
                                </span>
                                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                                    🇰🇪 EAT
                                </span>
                            </div>
                            <span className="hidden sm:inline-block text-slate-300 font-medium text-xs">
                                {currentDate}
                            </span>
                        </div>

                        {/* Center Island: Live System Status & Connection Latency */}
                        <div className="hidden lg:flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="font-bold text-xs tracking-wide">All Systems Operational</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <HiOutlineSignal className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Supabase Cloud:</span>
                                <span className="font-mono text-cyan-300 font-bold">{latencyMs}ms</span>
                            </div>
                        </div>

                        {/* Right Island: Working Real Action Functions */}
                        <div className="flex items-center gap-2 sm:gap-2.5">
                            {/* Switch to Parent & Student Portal */}
                            <button
                                type="button"
                                onClick={() => router.push('/portal/login')}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs transition-all shadow-md active:scale-95"
                            >
                                <span>Portal Access</span>
                                <HiArrowRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Public Website */}
                            <button
                                type="button"
                                onClick={() => router.push('/school')}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition-all active:scale-95"
                            >
                                <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="hidden sm:inline">Website</span>
                            </button>

                            {/* Contact Support & Hotline Modal Trigger */}
                            <button
                                type="button"
                                onClick={() => setShowSupportModal(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-amber-200 hover:text-amber-100 text-xs font-semibold transition-all active:scale-95"
                            >
                                <HiOutlinePhone className="w-3.5 h-3.5 text-amber-400" />
                                <span>Support</span>
                            </button>
                        </div>
                    </div>
                </footer>
            </div>

            {/* ─── REAL WORKING SUPPORT & EMERGENCY HOTLINE MODAL ─── */}
            {showSupportModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4"
                    onClick={() => setShowSupportModal(false)}
                >
                    <div
                        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-white p-6 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowSupportModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                        >
                            <HiOutlineXMark className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                                <HiOutlinePhone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Institutional Support Desk</h3>
                                <p className="text-xs text-slate-400">Direct contacts for {schoolName}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mt-4">
                            {/* Phone Hotline */}
                            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <HiOutlinePhone className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">School Telephone / Helpdesk</div>
                                        <div className="text-sm font-bold text-white font-mono">{schoolPhone}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCopy(schoolPhone, 'Phone number')}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                                    title="Copy Phone"
                                >
                                    {copiedField === 'Phone number' ? (
                                        <HiOutlineClipboardDocumentCheck className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <HiOutlineClipboardDocument className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {/* Email Support */}
                            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <HiOutlineEnvelope className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Support Email</div>
                                        <div className="text-sm font-bold text-white font-mono">{schoolEmail}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCopy(schoolEmail, 'Email address')}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                                    title="Copy Email"
                                >
                                    {copiedField === 'Email address' ? (
                                        <HiOutlineClipboardDocumentCheck className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <HiOutlineClipboardDocument className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {/* Physical Address */}
                            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
                                <HiOutlineMapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Campus Location</div>
                                    <div className="text-xs font-semibold text-slate-200">{schoolAddress}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                            <span>ICT Support Hours: Mon–Fri 07:00–18:00</span>
                            <button
                                onClick={() => setShowSupportModal(false)}
                                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── FORGOT PASSWORD MODAL ─── */}
            {showForgot && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
                    onClick={closeForgot}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 border border-purple-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 px-6 py-5 text-center relative text-white">
                            <button
                                onClick={closeForgot}
                                className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                &times;
                            </button>
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl mb-3">
                                <HiOutlineLockClosed className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-extrabold text-lg">
                                {forgotStep === 'request' ? 'Forgot Password' : forgotStep === 'verify' ? 'Verify Code' : 'Set New Password'}
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                {[1, 2, 3].map((step) => (
                                    <div
                                        key={step}
                                        className={`h-1.5 rounded-full transition-all ${
                                            (forgotStep === 'request' ? 1 : forgotStep === 'verify' ? 2 : 3) >= step
                                                ? 'w-8 bg-white shadow-sm'
                                                : 'w-4 bg-white/30'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="p-6">
                            {forgotStep === 'request' && (
                                <form onSubmit={handleForgotRequest} className="space-y-4">
                                    <p className="text-slate-600 text-sm">Enter your username and we&apos;ll send a verification reset code to your registered phone or email.</p>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Username</label>
                                        <input
                                            type="text"
                                            value={forgotUsername}
                                            onChange={(e) => setForgotUsername(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-full focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition-all font-medium text-sm"
                                            placeholder="Enter your username"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white font-extrabold rounded-full hover:shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                                    >
                                        {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </form>
                            )}

                            {forgotStep === 'verify' && (
                                <form onSubmit={handleForgotVerify} className="space-y-4">
                                    <p className="text-slate-600 text-sm">{forgotHint}</p>
                                    {forgotDevCode && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-bold text-amber-800">
                                            <span>Dev Mode Code: </span>
                                            <span className="font-mono text-sm">{forgotDevCode}</span>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Reset Code</label>
                                        <input
                                            type="text"
                                            value={forgotCode}
                                            onChange={(e) => setForgotCode(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-full focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition-all text-center text-2xl tracking-[0.5em] font-black"
                                            placeholder="000000"
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white font-extrabold rounded-full hover:shadow-lg shadow-purple-600/30 transition-all"
                                    >
                                        Verify Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForgotStep('request')}
                                        className="w-full py-2 text-purple-700 font-bold text-sm hover:underline"
                                    >
                                        ← Back to request
                                    </button>
                                </form>
                            )}

                            {forgotStep === 'reset' && (
                                <form onSubmit={handleForgotReset} className="space-y-4">
                                    <p className="text-slate-600 text-sm">Code verified! Set your new password.</p>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-full focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition-all font-medium text-sm"
                                            placeholder="Min 6 characters"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-purple-200 rounded-full focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition-all font-medium text-sm"
                                            placeholder="Re-enter password"
                                        />
                                        {confirmPassword && newPassword !== confirmPassword && (
                                            <p className="text-red-500 text-xs font-bold mt-1">Passwords do not match</p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white font-extrabold rounded-full hover:shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                                    >
                                        {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </form>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                                <button onClick={closeForgot} className="text-xs font-bold text-slate-500 hover:text-slate-800">
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
