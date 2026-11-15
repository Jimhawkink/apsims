'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { usePageIcon } from '@/lib/usePageIcon';

/* ─── Golden Laurel School Crest (Matches Image 2) ─── */
function SchoolCrest({ logoUrl, className = 'w-16 h-16' }: { logoUrl?: string | null; className?: string }) {
    if (logoUrl) {
        return (
            <div className={`relative rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg shadow-purple-950/40 ${className}`}>
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
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
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
                {/* Wreath branch stem */}
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
                {/* Wreath branch stem */}
                <path d="M98 36c7 20 6 44-14 66" stroke="url(#crestGold)" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>

            {/* Central Shield */}
            <g filter="url(#crestGlow)">
                {/* Outer Gold Border */}
                <path d="M60 16L86 28v32c0 20-11 34-26 40-15-6-26-20-26-40V28L60 16z" fill="url(#crestGold)" />
                {/* Inner Purple Shield */}
                <path d="M60 20L82 30v30c0 17-9 29-22 35-13-6-22-18-22-35V30L60 20z" fill="url(#crestPurple)" />
            </g>

            {/* Shield Interior: Open Book and Graduation Cap */}
            <g fill="#ffffff">
                {/* Cap */}
                <polygon points="60,33 46,40 60,47 74,40" />
                <polygon points="58,47 54,49 54,54 60,56 66,54 66,49 62,47" opacity="0.9" />
                {/* Tassel */}
                <line x1="46" y1="40" x2="43" y2="47" stroke="#fef08a" strokeWidth="1.5" />
                <circle cx="43" cy="48" r="1.5" fill="#fef08a" />
                {/* Open Book */}
                <path d="M60 56c-4-2-9-3-15-2v15c6-1 11 0 15 2 4-2 9-3 15-2V54c-6-1-11 0-15 2z" opacity="0.95" />
                <path d="M60 56v15" stroke="url(#crestGold)" strokeWidth="1.5" />
            </g>

            {/* Golden Ribbon Banner Below */}
            <g filter="url(#crestGlow)">
                <path d="M30 96l10-4h40l10 4-4 8H34l-4-8z" fill="url(#crestGold)" />
                <polygon points="30,96 34,104 22,106 27,99 22,93" fill="#b45309" />
                <polygon points="90,96 86,104 98,106 93,99 98,93" fill="#b45309" />
                <line x1="38" y1="100" x2="82" y2="100" stroke="#78350f" strokeWidth="1.5" strokeDasharray="2 2" />
            </g>
        </svg>
    );
}

/* ─── 3D Circular Emblem for the Login Card ─── */
function CardEmblem() {
    return (
        <div className="relative w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-100 shadow-[0_10px_30px_rgba(124,58,237,0.45)]">
            <div className="w-full h-full rounded-full p-[2px] bg-amber-500/80">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 flex items-center justify-center shadow-inner relative overflow-hidden">
                    {/* Glossy sheen reflection */}
                    <div className="absolute -top-3 -left-3 w-14 h-14 bg-white/20 rounded-full blur-sm pointer-events-none"></div>

                    {/* Graduation Cap & Open Book Graphic */}
                    <svg className="w-10 h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 64 64" fill="currentColor">
                        {/* Mortarboard */}
                        <polygon points="32,14 10,24 32,34 54,24" fill="#ffffff" />
                        <polygon points="28,34 23,37 23,43 32,47 41,43 41,37 36,34" fill="#e0e7ff" />
                        {/* Tassel */}
                        <path d="M10 24v13" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="10" cy="38" r="2" fill="#fef08a" />
                        {/* Open Book */}
                        <path d="M32 44c-5-3-12-4-20-3v12c8-1 15 0 20 3 5-3 12-4 20-3V41c-8-1-15 0-20 3z" fill="#ffffff" opacity="0.95" />
                        <line x1="32" y1="44" x2="32" y2="56" stroke="#fbbf24" strokeWidth="2" />
                    </svg>
                </div>
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
    const [schoolName, setSchoolName] = useState('SUNSHINE ACADEMY');
    const [schoolMotto, setSchoolMotto] = useState('');
    const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

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

    useEffect(() => {
        setMounted(true);

        // Load saved remember me username
        try {
            const saved = localStorage.getItem('apsims_remember_user');
            if (saved) {
                setUsername(saved);
                setRememberMe(true);
            }
        } catch {
            // Ignore
        }

        // Load school details from Supabase (school_name, motto, logo_url)
        const loadSchoolDetails = async () => {
            try {
                const { data } = await supabase
                    .from('school_details')
                    .select('school_name, motto, logo_url')
                    .limit(1)
                    .single();
                if (data?.school_name) {
                    setSchoolName(data.school_name);
                    document.title = `${data.school_name} - Login`;
                } else {
                    document.title = 'APSIMS - Login';
                }
                if (data?.motto) setSchoolMotto(data.motto);
                if (data?.logo_url) setSchoolLogoUrl(data.logo_url);
            } catch {
                document.title = 'APSIMS - Login';
            }
        };
        loadSchoolDetails();
    }, []);

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

            // Handle Remember Me
            try {
                if (rememberMe) {
                    localStorage.setItem('apsims_remember_user', username.trim());
                } else {
                    localStorage.removeItem('apsims_remember_user');
                }
            } catch {
                // Ignore storage error
            }

            // Store user data in localStorage for UI
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

            // Smart redirect
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
        <div className="min-h-screen w-full relative overflow-x-hidden bg-[#0d1224] text-slate-100 flex flex-col justify-between select-none">
            {/* Google Fonts: Caveat & Dancing Script for the exact cursive golden motto */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Dancing+Script:wght@700&display=swap');

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    15%, 45%, 75% { transform: translateX(-5px); }
                    30%, 60%, 90% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
                }
            `}</style>

            {/* Background Master Graphic (Matches Image 2 exactly) */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
                style={{ backgroundImage: `url('/login-bg-master.jpg')` }}
            >
                {/* Subtle atmospheric vignette */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-indigo-950/20"></div>
                {/* Soft right-side blur mask to guarantee 100% clean backdrop for HTML inputs across any aspect ratio */}
                <div className="absolute inset-y-0 right-0 w-full lg:w-[48%] bg-indigo-950/15 backdrop-blur-[2px]"></div>
            </div>

            {/* Main Content Layout */}
            <div className="relative z-10 w-full flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-10 min-h-screen max-w-[1920px] mx-auto">

                {/* Top Section */}
                <div className="w-full flex items-start justify-between">
                    {/* Top-Left School Branding (Dynamic from Database) */}
                    <div className="flex items-start gap-3 sm:gap-4 group">
                        <SchoolCrest logoUrl={schoolLogoUrl} className="w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0 drop-shadow-xl" />
                        <div className="pt-1">
                            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] leading-none">
                                {schoolName}
                            </h1>
                            <p className="text-cyan-300 text-[10px] sm:text-xs lg:text-sm font-bold tracking-[0.22em] uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] mt-1.5">
                                SCHOOL MANAGEMENT SYSTEM
                            </p>
                            {/* Cursive Golden Motto */}
                            <div
                                className="mt-2 text-amber-300 text-lg sm:text-2xl lg:text-3xl font-bold italic tracking-wide drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]"
                                style={{ fontFamily: "'Caveat', 'Dancing Script', cursive" }}
                            >
                                {schoolMotto ? (
                                    <span>{schoolMotto}</span>
                                ) : (
                                    <div className="leading-tight">
                                        <span>Learning Today...</span>
                                        <span className="block ml-6 sm:ml-8">Leading Tomorrow!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center / Body Section: Floating Login Card */}
                <div className="w-full flex items-center justify-center lg:justify-end my-8 lg:my-0 lg:pr-12 xl:pr-20">
                    <div className="w-full max-w-[430px] relative">
                        {/* 3D Circular Floating Emblem on Top of Card */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
                            <CardEmblem />
                        </div>

                        {/* Glassmorphic Login Card */}
                        <div className="relative rounded-[36px] bg-white/94 sm:bg-white/92 backdrop-blur-2xl border-2 border-white/80 shadow-[0_25px_60px_-15px_rgba(79,70,229,0.38),0_0_40px_rgba(168,85,247,0.22)] p-7 sm:p-9 pt-12 text-slate-800 overflow-hidden">
                            {/* Purple wave ribbon glow at top of card */}
                            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-purple-600/35 via-indigo-600/10 to-transparent rounded-t-[36px] pointer-events-none"></div>

                            {/* Card Header */}
                            <div className="text-center relative z-10">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                                    <span>Welcome Back!</span>
                                    <span className="inline-block transform hover:rotate-12 transition-transform">👋</span>
                                </h2>
                                <div className="flex items-center justify-center gap-3 mt-2 mb-6">
                                    <div className="h-[1px] flex-1 max-w-[50px] bg-gradient-to-r from-transparent to-purple-300"></div>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-500">Sign in to access your school system</p>
                                    <div className="h-[1px] flex-1 max-w-[50px] bg-gradient-to-l from-transparent to-purple-300"></div>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                                {/* Error Alert */}
                                {error && (
                                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold animate-shake">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Username Pill Input */}
                                <div className="space-y-1">
                                    <div className="relative flex items-center bg-white rounded-full border-2 border-purple-200/90 hover:border-purple-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/15 transition-all shadow-sm px-4 py-3 sm:py-3.5">
                                        <div className="text-purple-600 mr-3 flex-shrink-0">
                                            {/* Solid Royal Purple User Silhouette Icon */}
                                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            id="username-input"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter your username"
                                            autoFocus
                                            autoComplete="username"
                                            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Password Pill Input */}
                                <div className="space-y-1">
                                    <div className="relative flex items-center bg-white rounded-full border-2 border-purple-200/90 hover:border-purple-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/15 transition-all shadow-sm px-4 py-3 sm:py-3.5">
                                        <div className="text-purple-600 mr-3 flex-shrink-0">
                                            {/* Solid Royal Purple Lock Icon */}
                                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            id="password-input"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none pr-8"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                            className="absolute right-4 text-slate-400 hover:text-purple-700 transition-colors p-1"
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Options Row: Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between text-xs sm:text-sm pt-1 px-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                                        />
                                        <span className="font-semibold text-slate-800">Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgot(true)}
                                        className="font-bold text-indigo-700 hover:text-purple-700 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* 3D Glossy Pill Submit Button */}
                                <button
                                    id="login-button"
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-3 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-800 hover:via-indigo-700 hover:to-purple-900 text-white font-black text-base sm:text-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_12px_28px_-5px_rgba(124,58,237,0.55)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_16px_36px_-5px_rgba(124,58,237,0.65)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2.5"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span>Sign In</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Card Security Badge */}
                            <div className="mt-7 flex items-center justify-center gap-3 text-xs font-bold text-slate-700">
                                <div className="h-[1px] w-12 bg-slate-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-purple-700 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Secure & Encrypted</span>
                                </div>
                                <div className="h-[1px] w-12 bg-slate-200"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: 4 Interactive Feature Badges (Matches Image 2) */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    {/* 4 Feature Badges in Glassmorphic Bar */}
                    <div className="flex items-center flex-wrap gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/15 shadow-2xl">
                        {/* 1. Manage Students */}
                        <div className="flex items-center gap-2.5 py-1 px-1.5">
                            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                            </svg>
                            <div className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                                <div>Manage</div>
                                <div>Students</div>
                            </div>
                        </div>

                        <div className="h-7 w-[1px] bg-white/20 hidden sm:block"></div>

                        {/* 2. Track Performance */}
                        <div className="flex items-center gap-2.5 py-1 px-1.5">
                            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            <div className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                                <div>Track</div>
                                <div>Performance</div>
                            </div>
                        </div>

                        <div className="h-7 w-[1px] bg-white/20 hidden sm:block"></div>

                        {/* 3. Monitor Progress */}
                        <div className="flex items-center gap-2.5 py-1 px-1.5">
                            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                            </svg>
                            <div className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                                <div>Monitor</div>
                                <div>Progress</div>
                            </div>
                        </div>

                        <div className="h-7 w-[1px] bg-white/20 hidden sm:block"></div>

                        {/* 4. Secure & Reliable */}
                        <div className="flex items-center gap-2.5 py-1 px-1.5">
                            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                                <div>Secure &</div>
                                <div>Reliable</div>
                            </div>
                        </div>
                    </div>

                    {/* Subtitle / Powered by Footer */}
                    <div className="text-right text-[11px] text-white/70 drop-shadow hidden lg:block">
                        <p>© {new Date().getFullYear()} APSIMS • Powered by <span className="text-cyan-300 font-bold">Hawkinsoft Solutions</span></p>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal — 3-Step Self-Service Reset */}
            {showForgot && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
                    onClick={closeForgot}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 border border-purple-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 px-6 py-5 text-center relative text-white">
                            <button
                                onClick={closeForgot}
                                className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                &times;
                            </button>
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl mb-3">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="font-extrabold text-lg">
                                {forgotStep === 'request' ? 'Forgot Password' : forgotStep === 'verify' ? 'Verify Code' : 'Set New Password'}
                            </h3>
                            {/* Step indicators */}
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
                            {/* Step 1: Request reset */}
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

                            {/* Step 2: Verify code */}
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

                            {/* Step 3: Set new password */}
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
