'use client';

import { useState } from 'react';
import {
    FiPlay, FiSearch, FiBookOpen, FiDollarSign, FiUsers,
    FiCalendar, FiSettings, FiBarChart2, FiSmartphone,
    FiClock, FiStar, FiCheckCircle, FiExternalLink, FiYoutube
} from 'react-icons/fi';

interface Tutorial {
    id: string;
    title: string;
    description: string;
    duration: string;
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    videoUrl?: string;
    thumbnail: string;
    tags: string[];
    views: number;
}

const TUTORIALS: Tutorial[] = [
    // Getting Started
    { id: '1', title: 'APSIMS Quick Start Guide', description: 'Get up and running with APSIMS in under 10 minutes. Learn the dashboard, navigation, and key features.', duration: '8:32', category: 'Getting Started', level: 'Beginner', thumbnail: '🚀', tags: ['setup', 'overview', 'dashboard'], views: 1240 },
    { id: '2', title: 'School Setup & Configuration', description: 'Configure your school name, logo, forms, streams, subjects, and academic year settings.', duration: '12:15', category: 'Getting Started', level: 'Beginner', thumbnail: '⚙️', tags: ['settings', 'setup', 'school'], views: 987 },
    { id: '3', title: 'User Roles & Permissions', description: 'Create admin, teacher, bursar, and parent accounts. Set precise role-based access control.', duration: '7:48', category: 'Getting Started', level: 'Beginner', thumbnail: '👥', tags: ['users', 'roles', 'security'], views: 764 },
    // Students
    { id: '4', title: 'Admitting New Students', description: 'Step-by-step guide to admitting new students, uploading photos, and assigning to classes.', duration: '9:20', category: 'Students', level: 'Beginner', thumbnail: '🎒', tags: ['admissions', 'students', 'enrollment'], views: 1102 },
    { id: '5', title: 'Student Promotion & Class Management', description: 'Promote students to the next form, manage transfers, and handle leavers end of year.', duration: '6:54', category: 'Students', level: 'Intermediate', thumbnail: '📈', tags: ['promotion', 'transfer', 'class'], views: 543 },
    { id: '6', title: 'Generating Student ID Cards', description: 'Design and print professional student ID cards with photos, barcodes, and school branding.', duration: '5:30', category: 'Students', level: 'Beginner', thumbnail: '🪪', tags: ['id-cards', 'printing', 'branding'], views: 678 },
    // Fees
    { id: '7', title: 'Setting Up Fee Structures', description: 'Create term-based fee structures for different forms, with optional items and scholarships.', duration: '11:05', category: 'Finance', level: 'Beginner', thumbnail: '💰', tags: ['fees', 'structure', 'setup'], views: 1389 },
    { id: '8', title: 'Collecting Fees & Generating Receipts', description: 'Process fee payments via cash, M-Pesa, bank transfer. Auto-generate professional receipts.', duration: '8:47', category: 'Finance', level: 'Beginner', thumbnail: '🧾', tags: ['fees', 'collection', 'receipts', 'mpesa'], views: 1567 },
    { id: '9', title: 'M-Pesa STK Push Integration', description: 'Enable parents to pay fees directly from their phones via M-Pesa Daraja API integration.', duration: '15:30', category: 'Finance', level: 'Advanced', thumbnail: '📱', tags: ['mpesa', 'stk-push', 'integration', 'daraja'], views: 432 },
    { id: '10', title: 'Fee Defaulter Management & SMS Reminders', description: 'Identify fee defaulters, send bulk SMS/WhatsApp reminders, and track outstanding balances.', duration: '9:10', category: 'Finance', level: 'Intermediate', thumbnail: '⚠️', tags: ['defaulters', 'sms', 'reminders', 'outstanding'], views: 876 },
    { id: '11', title: 'Budget vs Actual Tracking', description: 'Set school budgets, track expenses against targets, and generate P&L reports for governors.', duration: '10:22', category: 'Finance', level: 'Intermediate', thumbnail: '📊', tags: ['budget', 'expenses', 'reports', 'governors'], views: 324 },
    // Exams
    { id: '12', title: 'Entering Student Marks', description: 'Efficient bulk mark entry, subject-by-subject entry, and import from Excel spreadsheets.', duration: '10:15', category: 'Academics', level: 'Beginner', thumbnail: '📝', tags: ['marks', 'exams', 'entry'], views: 1234 },
    { id: '13', title: 'Generating Report Cards', description: 'Generate and print beautiful 8-4-4 and CBC report cards with class teacher comments.', duration: '8:30', category: 'Academics', level: 'Beginner', thumbnail: '📋', tags: ['report-cards', 'printing', 'grades'], views: 1456 },
    { id: '14', title: 'KCSE Grade Prediction Module', description: 'Use AI-powered grade prediction to identify at-risk students and plan intervention strategies.', duration: '12:00', category: 'Academics', level: 'Intermediate', thumbnail: '🎯', tags: ['kcse', 'prediction', 'grades', 'ai'], views: 287 },
    { id: '15', title: 'CBC Assessment & Rubric Configuration', description: 'Set up CBC learning outcomes, rubric levels (EE, ME, AE, BE), and strand-based assessment.', duration: '14:45', category: 'Academics', level: 'Intermediate', thumbnail: '🔬', tags: ['cbc', 'rubric', 'assessment', 'strands'], views: 543 },
    { id: '16', title: 'AI Question Paper Generator', description: 'Generate exam papers automatically from your question bank using AI with difficulty balancing.', duration: '7:20', category: 'Academics', level: 'Advanced', thumbnail: '🤖', tags: ['ai', 'question-bank', 'paper-generator'], views: 389 },
    // Attendance
    { id: '17', title: 'Taking Student Attendance', description: 'Mark daily attendance class-by-class, view absentee reports, and notify parents automatically.', duration: '6:15', category: 'Attendance', level: 'Beginner', thumbnail: '✅', tags: ['attendance', 'absentees', 'sms'], views: 912 },
    { id: '18', title: 'Biometric Attendance Integration', description: 'Connect ZKTeco fingerprint devices to APSIMS for automated touchless attendance marking.', duration: '18:30', category: 'Attendance', level: 'Advanced', thumbnail: '🔬', tags: ['biometric', 'fingerprint', 'zkteco', 'hardware'], views: 198 },
    // HR
    { id: '19', title: 'Staff Management & Payroll', description: 'Manage teacher profiles, TSC numbers, qualifications, and run monthly payroll with pay slips.', duration: '13:40', category: 'HR & Payroll', level: 'Intermediate', thumbnail: '👨‍🏫', tags: ['staff', 'payroll', 'payslips', 'hr'], views: 634 },
    { id: '20', title: 'Generating Teacher Pay Slips', description: 'Generate individual and bulk pay slips with deductions, allowances, NHIF and NSSF.', duration: '8:05', category: 'HR & Payroll', level: 'Intermediate', thumbnail: '💵', tags: ['payslips', 'salary', 'deductions'], views: 445 },
    // Communication
    { id: '21', title: 'Sending Bulk SMS to Parents', description: 'Send results, fee reminders, and general announcements via Africa\'s Talking SMS gateway.', duration: '7:30', category: 'Communication', level: 'Beginner', thumbnail: '📨', tags: ['sms', 'parents', 'bulk', 'communication'], views: 1087 },
    { id: '22', title: 'WhatsApp Integration Setup', description: 'Configure WhatsApp Business API to send report cards, fee statements, and alerts directly.', duration: '16:20', category: 'Communication', level: 'Advanced', thumbnail: '💬', tags: ['whatsapp', 'api', 'integration'], views: 312 },
    // Stores
    { id: '23', title: 'Library Management System', description: 'Add books, issue to students, track returns, manage overdue books and fines.', duration: '9:50', category: 'Stores & Library', level: 'Beginner', thumbnail: '📚', tags: ['library', 'books', 'catalog', 'checkout'], views: 567 },
    { id: '24', title: 'Stores & Inventory Management', description: 'Manage school stores, track items, issue to departments, set reorder alerts.', duration: '8:20', category: 'Stores & Library', level: 'Beginner', thumbnail: '📦', tags: ['stores', 'inventory', 'items', 'stock'], views: 398 },
];

const CATEGORIES = ['All', 'Getting Started', 'Students', 'Finance', 'Academics', 'Attendance', 'HR & Payroll', 'Communication', 'Stores & Library'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const LEVEL_CONFIG = {
    Beginner: { color: '#16a34a', bg: '#f0fdf4' },
    Intermediate: { color: '#d97706', bg: '#fffbeb' },
    Advanced: { color: '#dc2626', bg: '#fef2f2' },
};

const CATEGORY_ICONS: Record<string, any> = {
    'Getting Started': FiSettings, 'Students': FiUsers, 'Finance': FiDollarSign,
    'Academics': FiBookOpen, 'Attendance': FiCalendar, 'HR & Payroll': FiBarChart2,
    'Communication': FiSmartphone, 'Stores & Library': FiBookOpen,
};

export default function TutorialsPage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [level, setLevel] = useState('All');
    const [playing, setPlaying] = useState<string | null>(null);

    const filtered = TUTORIALS.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
        const matchCat = category === 'All' || t.category === category;
        const matchLevel = level === 'All' || t.level === level;
        return matchSearch && matchCat && matchLevel;
    });

    const grouped = CATEGORIES.slice(1).map(cat => ({
        cat,
        items: filtered.filter(t => t.category === cat),
    })).filter(g => g.items.length > 0);

    const totalViews = TUTORIALS.reduce((s, t) => s + t.views, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50">
            {/* Hero Header */}
            <div className="rounded-2xl p-8 mb-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #7c3aed 100%)' }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FiYoutube size={28} className="text-red-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">APSIMS Video Tutorials</h1>
                            <p className="text-purple-200 text-sm mt-0.5">Master every feature with step-by-step video guides</p>
                        </div>
                    </div>
                    <div className="flex gap-6 flex-wrap text-sm">
                        {[
                            { label: 'Total Tutorials', val: TUTORIALS.length },
                            { label: 'Categories', val: CATEGORIES.length - 1 },
                            { label: 'Total Views', val: `${(totalViews / 1000).toFixed(1)}K` },
                            { label: 'Beginner Friendly', val: TUTORIALS.filter(t => t.level === 'Beginner').length },
                        ].map(s => (
                            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[100px]">
                                <p className="text-2xl font-black">{s.val}</p>
                                <p className="text-purple-200 text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px]">
                    <FiSearch size={15} className="text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search tutorials, topics, features…"
                        className="text-sm outline-none bg-transparent w-full text-gray-700 placeholder:text-gray-400" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-all ${category === c ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {c}
                        </button>
                    ))}
                </div>
                <select value={level} onChange={e => setLevel(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">
                    {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-gray-500 flex items-center gap-2">
                <FiPlay size={13} className="text-purple-600" />
                <span><strong className="text-gray-800">{filtered.length}</strong> tutorials found</span>
                {(search || category !== 'All' || level !== 'All') && (
                    <button onClick={() => { setSearch(''); setCategory('All'); setLevel('All'); }}
                        className="text-xs text-purple-600 font-semibold hover:underline ml-2">
                        Clear filters
                    </button>
                )}
            </div>

            {/* Tutorials by Category */}
            {(category === 'All' ? grouped : [{ cat: category, items: filtered }]).map(group => {
                const CatIcon = CATEGORY_ICONS[group.cat] || FiBookOpen;
                return (
                    <div key={group.cat} className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                                <CatIcon size={15} className="text-purple-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">{group.cat}</h2>
                            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">{group.items.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {group.items.map(tutorial => {
                                const lvlCfg = LEVEL_CONFIG[tutorial.level];
                                const isPlaying = playing === tutorial.id;
                                return (
                                    <div key={tutorial.id}
                                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">
                                        {/* Thumbnail */}
                                        <div className="h-36 flex items-center justify-center text-5xl relative cursor-pointer"
                                            style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca, #6366f1)' }}
                                            onClick={() => setPlaying(isPlaying ? null : tutorial.id)}>
                                            {isPlaying ? (
                                                <div className="text-center text-white">
                                                    <FiPlay size={40} className="mx-auto mb-1 opacity-80" />
                                                    <p className="text-xs opacity-70">Click to play</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <span>{tutorial.thumbnail}</span>
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                                                            <FiPlay size={18} className="text-purple-600 ml-0.5" />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            {/* Duration badge */}
                                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-mono px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                <FiClock size={10} /> {tutorial.duration}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: lvlCfg.bg, color: lvlCfg.color }}>
                                                    {tutorial.level}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <FiStar size={9} className="text-amber-400" /> {tutorial.views.toLocaleString()} views
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{tutorial.title}</h3>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{tutorial.description}</p>
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {tutorial.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="px-4 pb-4 flex items-center justify-between">
                                            <button onClick={() => setPlaying(isPlaying ? null : tutorial.id)}
                                                className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-lg transition-all"
                                                style={{ background: isPlaying ? '#dc2626' : 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
                                                {isPlaying ? 'Close' : <><FiPlay size={11} /> Watch</>}
                                            </button>
                                            <button onClick={() => window.open(tutorial.videoUrl || 'https://youtube.com/@apsims', '_blank')}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors">
                                                <FiExternalLink size={11} /> YouTube
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <FiYoutube size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-bold text-gray-600">No tutorials found</p>
                    <p className="text-sm">Try a different search term or category</p>
                    <button onClick={() => { setSearch(''); setCategory('All'); setLevel('All'); }}
                        className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">
                        Show All Tutorials
                    </button>
                </div>
            )}

            {/* Help Banner */}
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white text-center">
                <p className="text-lg font-bold mb-1">Need personalized training?</p>
                <p className="text-purple-200 text-sm mb-4">Our support team offers live virtual training sessions for your entire staff</p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <a href="mailto:support@apsims.ac.ke" className="bg-white text-purple-700 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-purple-50 transition-colors">
                        📧 Email Support
                    </a>
                    <a href="tel:+254700000000" className="bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-white/30 transition-colors">
                        📞 Call Us
                    </a>
                </div>
            </div>
        </div>
    );
}
