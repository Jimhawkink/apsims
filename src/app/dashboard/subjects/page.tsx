'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ─── Kenyan KCSE 2025/2026 Subject Data ───────────────────────────────────────
const KENYAN_SUBJECTS = [
    { name: 'Mathematics', code: '121', category: 'Compulsory', max_score: 100, group: 1, initials: 'MAT', icon: '∑' },
    { name: 'English', code: '101', category: 'Compulsory', max_score: 100, group: 1, initials: 'ENG', icon: 'Aa' },
    { name: 'Kiswahili', code: '102', category: 'Compulsory', max_score: 100, group: 1, initials: 'KIS', icon: 'Sw' },
    { name: 'Biology', code: '231', category: 'Science', max_score: 100, group: 2, initials: 'BIO', icon: '🧬' },
    { name: 'Physics', code: '232', category: 'Science', max_score: 100, group: 2, initials: 'PHY', icon: '⚡' },
    { name: 'Chemistry', code: '233', category: 'Science', max_score: 100, group: 2, initials: 'CHE', icon: '⚗️' },
    { name: 'History & Government', code: '311', category: 'Humanities', max_score: 100, group: 3, initials: 'HIS', icon: '🏛️' },
    { name: 'Geography', code: '312', category: 'Humanities', max_score: 100, group: 3, initials: 'GEO', icon: '🌍' },
    { name: 'CRE', code: '313', category: 'Humanities', max_score: 100, group: 3, initials: 'CRE', icon: '✝️' },
    { name: 'IRE', code: '314', category: 'Humanities', max_score: 100, group: 3, initials: 'IRE', icon: '☪️' },
    { name: 'HRE', code: '315', category: 'Humanities', max_score: 100, group: 3, initials: 'HRE', icon: '☸️' },
    { name: 'Home Science', code: '441', category: 'Technical', max_score: 100, group: 4, initials: 'HSC', icon: '🏠' },
    { name: 'Art & Design', code: '442', category: 'Technical', max_score: 100, group: 4, initials: 'ART', icon: '🎨' },
    { name: 'Agriculture', code: '443', category: 'Technical', max_score: 100, group: 4, initials: 'AGR', icon: '🌱' },
    { name: 'Woodwork', code: '444', category: 'Technical', max_score: 100, group: 4, initials: 'WOO', icon: '🪵' },
    { name: 'Metalwork', code: '445', category: 'Technical', max_score: 100, group: 4, initials: 'MET', icon: '⚙️' },
    { name: 'Building Construction', code: '446', category: 'Technical', max_score: 100, group: 4, initials: 'BLD', icon: '🏗️' },
    { name: 'Power Mechanics', code: '447', category: 'Technical', max_score: 100, group: 4, initials: 'POW', icon: '🔧' },
    { name: 'Electricity', code: '448', category: 'Technical', max_score: 100, group: 4, initials: 'ELE', icon: '💡' },
    { name: 'Drawing & Design', code: '449', category: 'Technical', max_score: 100, group: 4, initials: 'DRW', icon: '📐' },
    { name: 'Aviation Technology', code: '450', category: 'Technical', max_score: 100, group: 4, initials: 'AVI', icon: '✈️' },
    { name: 'Computer Studies', code: '451', category: 'Technical', max_score: 100, group: 4, initials: 'COM', icon: '💻' },
    { name: 'French', code: '501', category: 'Languages', max_score: 100, group: 5, initials: 'FRE', icon: '🇫🇷' },
    { name: 'German', code: '502', category: 'Languages', max_score: 100, group: 5, initials: 'GER', icon: '🇩🇪' },
    { name: 'Arabic', code: '503', category: 'Languages', max_score: 100, group: 5, initials: 'ARA', icon: '🕌' },
    { name: 'Kenya Sign Language', code: '504', category: 'Languages', max_score: 100, group: 5, initials: 'KSL', icon: '🤟' },
    { name: 'Music', code: '511', category: 'Creative', max_score: 100, group: 5, initials: 'MUS', icon: '🎵' },
    { name: 'Business Studies', code: '565', category: 'Applied', max_score: 100, group: 5, initials: 'BST', icon: '📊' },
];

const CATEGORY_META: Record<string, { color: string; bg: string; border: string; dot: string; badge: string }> = {
    Compulsory: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200' },
    Science: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    Humanities: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', badge: 'bg-green-100 text-green-700 border-green-200' },
    Technical: { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', dot: '#f97316', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
    Languages: { color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', dot: '#a855f7', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
    Creative: { color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8', dot: '#ec4899', badge: 'bg-pink-100 text-pink-700 border-pink-200' },
    Applied: { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', dot: '#06b6d4', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    Core: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200' },
    Elective: { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe', dot: '#6366f1', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

const getCategoryMeta = (cat: string) => CATEGORY_META[cat] || { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', dot: '#9ca3af', badge: 'bg-gray-100 text-gray-600 border-gray-200' };

const KCSE_GRADES = [
    { grade: 'A', range: '80–100', pts: 12, color: '#15803d' },
    { grade: 'A-', range: '75–79', pts: 11, color: '#16a34a' },
    { grade: 'B+', range: '70–74', pts: 10, color: '#4ade80' },
    { grade: 'B', range: '65–69', pts: 9, color: '#2563eb' },
    { grade: 'B-', range: '60–64', pts: 8, color: '#60a5fa' },
    { grade: 'C+', range: '55–59', pts: 7, color: '#7c3aed' },
    { grade: 'C', range: '50–54', pts: 6, color: '#d97706' },
    { grade: 'C-', range: '45–49', pts: 5, color: '#f59e0b' },
    { grade: 'D+', range: '40–44', pts: 4, color: '#ea580c' },
    { grade: 'D', range: '35–39', pts: 3, color: '#f97316' },
    { grade: 'D-', range: '30–34', pts: 2, color: '#dc2626' },
    { grade: 'E', range: '0–29', pts: 1, color: '#991b1b' },
];

// ─── Icons (inline SVGs to avoid react-icons dep issues) ─────────────────────
const Icon = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>,
    X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    Link: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
    Save: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
    Toggle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="5" width="22" height="14" rx="7" /><circle cx="16" cy="12" r="3" fill="currentColor" /></svg>,
    Teachers: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
    Grid: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    List: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    Seed: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22V12M12 12C12 12 6 10 6 4a6 6 0 0112 0c0 6-6 8-6 8z" /></svg>,
    Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
};

function generateInitials(teacher: any) {
    const parts = [teacher.first_name, teacher.middle_name, teacher.last_name].filter(Boolean);
    return parts.map((p: string) => p.charAt(0).toUpperCase()).join('');
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, sub }: { label: string; value: number | string; icon: string; accent: string; sub?: string }) {
    return (
        <div className="relative overflow-hidden rounded-2xl p-5 border border-white/60" style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`, borderColor: `${accent}30` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{ background: accent, transform: 'translate(30%,-30%)' }} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
                    <p className="text-3xl font-black mt-1 text-gray-800">{value}</p>
                    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

// ─── Subject Card (Grid view) ─────────────────────────────────────────────────
function SubjectCard({ subject, teacherCount, onEdit, onDelete, onAssign }: any) {
    const meta = getCategoryMeta(subject.category);
    const ks = KENYAN_SUBJECTS.find(k => k.code === subject.subject_code || k.name === subject.subject_name);
    return (
        <div
            className="group relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
            style={{ borderColor: meta.border }}
            onClick={() => onEdit(subject)}
        >
            {/* Top accent stripe */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.dot}88)` }} />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold"
                            style={{ background: meta.bg, color: meta.color }}>
                            {ks?.icon || subject.subject_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-sm leading-tight truncate">{subject.subject_name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {subject.subject_code && (
                                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md"
                                        style={{ background: meta.bg, color: meta.color }}>{subject.subject_code}</span>
                                )}
                                {subject.initials && (
                                    <span className="text-[10px] font-bold font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{subject.initials}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${subject.is_active !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                        {subject.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: meta.border }}>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${meta.badge}`}>{subject.category}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{subject.max_score || 100} pts</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {teacherCount > 0
                            ? <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Icon.Teachers /> {teacherCount} teacher{teacherCount > 1 ? 's' : ''}</span>
                            : <span className="text-[10px] text-gray-300 italic">No teachers</span>
                        }
                    </div>
                </div>

                {/* Hover actions */}
                <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-10 overflow-hidden transition-all duration-200 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 flex items-center justify-center gap-2">
                    <button onClick={e => { e.stopPropagation(); onEdit(subject); }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Icon.Edit /> Edit
                    </button>
                    <button onClick={e => { e.stopPropagation(); onAssign(subject); }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Icon.Link /> Assign
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(subject.id); }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Icon.Trash /> Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button onClick={() => onChange(!checked)}
            className={`relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${checked ? 'bg-emerald-500 focus:ring-emerald-400' : 'bg-gray-300 focus:ring-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${checked ? 'left-6' : 'left-0.5'}`} />
        </button>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubjectsPage() {
    const [activeTab, setActiveTab] = useState<'subjects' | 'assignments' | 'grades'>('subjects');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'code' | 'category' | 'teachers'>('code');
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Modals
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editSubject, setEditSubject] = useState<any>(null);
    const [subjectForm, setSubjectForm] = useState({ subject_name: '', subject_code: '', category: 'Compulsory', max_score: 100, is_active: true, initials: '', group_number: 1 });

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ subject_id: 0, teacher_id: 0, form_id: 0, stream_id: 0, teacher_initials: '' });

    const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
    const [seeding, setSeeding] = useState(false);
    const [saving, setSaving] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [subRes, teachRes, formRes, streamRes, assignRes] = await Promise.all([
            supabase.from('school_subjects').select('*').order('subject_code'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').eq('is_active', true).order('form_level'),
            supabase.from('school_streams').select('*').eq('is_active', true).order('stream_name'),
            supabase.from('school_subject_teachers').select('*, school_subjects(subject_name, subject_code), school_teachers(first_name, last_name, middle_name), school_forms(form_name)').order('id'),
        ]);
        setSubjects(subRes.data || []);
        setTeachers(teachRes.data || []);
        setForms(formRes.data || []);
        setStreams(streamRes.data || []);
        setAssignments(assignRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Keyboard shortcut
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
            if (e.key === 'Escape') { setShowSubjectModal(false); setShowAssignModal(false); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // ── Derived data ──────────────────────────────────────────────────────────
    const filtered = subjects
        .filter(s => {
            const q = search.toLowerCase();
            const matchSearch = !q || `${s.subject_name} ${s.subject_code || ''} ${s.initials || ''}`.toLowerCase().includes(q);
            const matchCat = !filterCategory || s.category === filterCategory;
            const matchStatus = !filterStatus || (filterStatus === 'active' ? s.is_active !== false : s.is_active === false);
            return matchSearch && matchCat && matchStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.subject_name.localeCompare(b.subject_name);
            if (sortBy === 'code') return (a.subject_code || '').localeCompare(b.subject_code || '');
            if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
            if (sortBy === 'teachers') {
                const ta = assignments.filter(x => x.subject_id === a.id).length;
                const tb = assignments.filter(x => x.subject_id === b.id).length;
                return tb - ta;
            }
            return 0;
        });

    const categories = Array.from(new Set(subjects.map(s => s.category).filter(Boolean)));
    const activeSubjects = subjects.filter(s => s.is_active !== false);
    const unassigned = subjects.filter(s => !assignments.find(a => a.subject_id === s.id));

    // Group by category
    const grouped: Record<string, any[]> = {};
    filtered.forEach(s => {
        const cat = s.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
    });

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const openAddSubject = () => {
        setEditSubject(null);
        setSubjectForm({ subject_name: '', subject_code: '', category: 'Compulsory', max_score: 100, is_active: true, initials: '', group_number: 1 });
        setShowSubjectModal(true);
    };

    const openEditSubject = (sub: any) => {
        setEditSubject(sub);
        setSubjectForm({
            subject_name: sub.subject_name,
            subject_code: sub.subject_code || '',
            category: sub.category || 'Core',
            max_score: sub.max_score || 100,
            is_active: sub.is_active !== false,
            initials: sub.initials || sub.subject_code || '',
            group_number: sub.group_number || 1,
        });
        setShowSubjectModal(true);
    };

    const openAssignForSubject = (sub: any) => {
        setAssignForm({ subject_id: sub.id, teacher_id: 0, form_id: 0, stream_id: 0, teacher_initials: '' });
        setShowAssignModal(true);
    };

    const handleSaveSubject = async () => {
        if (!subjectForm.subject_name.trim()) { toast.error('Subject name is required'); return; }
        setSaving(true);
        const payload = {
            subject_name: subjectForm.subject_name.trim(),
            subject_code: subjectForm.subject_code || subjectForm.initials,
            category: subjectForm.category,
            max_score: subjectForm.max_score,
            is_active: subjectForm.is_active,
            initials: subjectForm.initials || subjectForm.subject_code,
            group_number: subjectForm.group_number,
        };
        let error;
        if (editSubject?.id) {
            ({ error } = await supabase.from('school_subjects').update(payload).eq('id', editSubject.id));
        } else {
            ({ error } = await supabase.from('school_subjects').insert([payload]));
        }
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success(editSubject ? '✅ Subject updated' : '✅ Subject added');
        setShowSubjectModal(false);
        fetchAll();
    };

    const handleToggleActive = async (sub: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from('school_subjects').update({ is_active: sub.is_active === false }).eq('id', sub.id);
        if (!error) {
            toast.success(sub.is_active === false ? '✅ Subject activated' : '⚠️ Subject deactivated');
            fetchAll();
        }
    };

    const handleDeleteSubject = async (id: number) => {
        if (!confirm('Delete this subject? All teacher assignments will also be removed.')) return;
        await supabase.from('school_subject_teachers').delete().eq('subject_id', id);
        const { error } = await supabase.from('school_subjects').delete().eq('id', id);
        if (error) { toast.error('Cannot delete – subject may be in use'); return; }
        toast.success('Subject removed');
        fetchAll();
    };

    const handleBulkDelete = async () => {
        if (!bulkSelected.size) return;
        if (!confirm(`Delete ${bulkSelected.size} subjects? This cannot be undone.`)) return;
        for (const id of Array.from(bulkSelected)) {
            await supabase.from('school_subject_teachers').delete().eq('subject_id', id);
            await supabase.from('school_subjects').delete().eq('id', id);
        }
        setBulkSelected(new Set());
        toast.success(`Deleted ${bulkSelected.size} subjects`);
        fetchAll();
    };

    const seedKenyanSubjects = async () => {
        if (!confirm(`Add all ${KENYAN_SUBJECTS.length} Kenyan KCSE subjects? Existing subjects will not be duplicated.`)) return;
        setSeeding(true);
        let added = 0;
        for (const sub of KENYAN_SUBJECTS) {
            const existing = subjects.find(s => s.subject_code === sub.code || s.subject_name === sub.name);
            if (!existing) {
                const { error } = await supabase.from('school_subjects').insert([{
                    subject_name: sub.name, subject_code: sub.code,
                    category: sub.category, max_score: sub.max_score,
                    is_active: true, initials: sub.initials, group_number: sub.group,
                }]);
                if (!error) added++;
            }
        }
        setSeeding(false);
        toast.success(`🇰🇪 Added ${added} new subjects`);
        fetchAll();
    };

    // ── Assignments ───────────────────────────────────────────────────────────
    const openAddAssignment = () => {
        setAssignForm({ subject_id: 0, teacher_id: 0, form_id: 0, stream_id: 0, teacher_initials: '' });
        setShowAssignModal(true);
    };

    const handleSaveAssignment = async () => {
        if (!assignForm.subject_id || !assignForm.teacher_id) { toast.error('Select both subject and teacher'); return; }
        const teacher = teachers.find(t => t.id === assignForm.teacher_id);
        const initials = assignForm.teacher_initials || (teacher ? generateInitials(teacher) : '');
        const payload: any = {
            subject_id: assignForm.subject_id,
            teacher_id: assignForm.teacher_id,
            form_id: assignForm.form_id || null,
            stream_id: assignForm.stream_id || null,
            teacher_initials: initials,
        };
        const { error } = await supabase.from('school_subject_teachers').insert([payload]);
        if (error) { toast.error(error.message?.includes('unique') ? 'This assignment already exists' : error.message); return; }
        toast.success('✅ Assignment saved');
        setShowAssignModal(false);
        fetchAll();
    };

    const handleDeleteAssignment = async (id: number) => {
        if (!confirm('Remove this teacher-subject assignment?')) return;
        await supabase.from('school_subject_teachers').delete().eq('id', id);
        toast.success('Assignment removed');
        fetchAll();
    };

    const filteredAssignments = assignments.filter(a => {
        if (!search) return true;
        const s = a.school_subjects?.subject_name || '';
        const t = `${a.school_teachers?.first_name || ''} ${a.school_teachers?.last_name || ''}`;
        return `${s} ${t}`.toLowerCase().includes(search.toLowerCase());
    });

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
                .subj-page { font-family: 'Sora', sans-serif; }
                .mono { font-family: 'JetBrains Mono', monospace; }
                .tab-pill { @apply px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200; }
                .tab-pill.active { background: white; color: #4f46e5; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
                .tab-pill.inactive { color: #9ca3af; }
                .tab-pill.inactive:hover { color: #4b5563; background: rgba(255,255,255,0.5); }
                .btn-primary {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 8px 18px; border-radius: 12px; font-size: 13px; font-weight: 600;
                    background: linear-gradient(135deg, #4f46e5, #7c3aed);
                    color: white; border: none; cursor: pointer;
                    box-shadow: 0 1px 6px rgba(79,70,229,0.35);
                    transition: all 0.15s ease;
                }
                .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.4); }
                .btn-primary:active { transform: translateY(0); }
                .btn-secondary {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600;
                    background: white; color: #374151; border: 1.5px solid #e5e7eb; cursor: pointer;
                    transition: all 0.15s ease;
                }
                .btn-secondary:hover { border-color: #d1d5db; background: #f9fafb; transform: translateY(-1px); }
                .btn-danger {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 7px 14px; border-radius: 10px; font-size: 12px; font-weight: 600;
                    background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; cursor: pointer;
                    transition: all 0.15s ease;
                }
                .btn-danger:hover { background: #fee2e2; }
                .search-input {
                    width: 100%; padding: 10px 12px 10px 40px;
                    border: 1.5px solid #e5e7eb; border-radius: 12px;
                    font-size: 13px; font-family: 'Sora', sans-serif;
                    background: white; outline: none; transition: border-color 0.15s;
                }
                .search-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
                .select-ctrl {
                    padding: 9px 36px 9px 12px; border: 1.5px solid #e5e7eb;
                    border-radius: 12px; font-size: 13px; font-family: 'Sora', sans-serif;
                    background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
                    appearance: none; outline: none; cursor: pointer; transition: border-color 0.15s;
                }
                .select-ctrl:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
                .lbl { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
                .field-input {
                    width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb;
                    border-radius: 12px; font-size: 13px; font-family: 'Sora', sans-serif;
                    background: #fafafa; outline: none; transition: all 0.15s;
                }
                .field-input:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
                .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.15s ease; }
                .modal-box { background: white; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.18); width: 100%; max-width: 540px; animation: slideUp 0.2s ease; overflow: hidden; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .grid-row:hover { background: #f8faff; }
                .action-btn { padding: 6px; border-radius: 8px; border: none; cursor: pointer; transition: all 0.12s; background: transparent; display: inline-flex; align-items: center; justify-content: center; }
                .action-btn:hover { transform: scale(1.1); }
                .pulse-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
                .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; border: 1px solid; }
                .section-header { display: flex; align-items: center; gap-10: 0; padding: 10px 16px; border-radius: 12px; cursor: pointer; transition: background 0.15s; }
                .section-header:hover { background: #f8faff; }
                .sort-btn { padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 1.5px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.12s; color: #6b7280; }
                .sort-btn.active { border-color: #6366f1; background: #eef2ff; color: #4f46e5; }
                .sort-btn:hover { border-color: #d1d5db; }
            `}</style>

            <div className="subj-page space-y-5 p-1">

                {/* ─── Header ────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-black shadow-lg">📚</div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 leading-none">Subjects & Assignments</h1>
                                <p className="text-xs text-gray-400 mt-0.5 font-medium">Kenyan KCSE 2025/2026 Curriculum</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={seedKenyanSubjects} disabled={seeding} className="btn-secondary text-sm">
                            {seeding ? '⏳ Seeding…' : <><Icon.Seed /> 🇰🇪 Seed KCSE Subjects</>}
                        </button>
                        <button onClick={() => setShowAssignModal(true)} className="btn-secondary">
                            <Icon.Link /> Assign Teacher
                        </button>
                        <button onClick={openAddSubject} className="btn-primary">
                            <Icon.Plus /> Add Subject
                        </button>
                    </div>
                </div>

                {/* ─── Stats ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="Total" value={subjects.length} icon="📚" accent="#6366f1" />
                    <StatCard label="Active" value={activeSubjects.length} icon="✅" accent="#16a34a" />
                    <StatCard label="Compulsory" value={subjects.filter(s => s.category === 'Compulsory' || s.category === 'Core').length} icon="📕" accent="#dc2626" />
                    <StatCard label="Sciences" value={subjects.filter(s => s.category === 'Science').length} icon="🔬" accent="#2563eb" />
                    <StatCard label="Assignments" value={assignments.length} icon="🔗" accent="#d97706" />
                    <StatCard label="Unassigned" value={unassigned.length} icon="⚠️" accent="#ef4444" sub="Need teachers" />
                </div>

                {/* ─── Tabs ──────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-1 bg-gray-100/80 p-1 rounded-2xl">
                        {([
                            { id: 'subjects', label: '📚 Subjects', count: subjects.length },
                            { id: 'assignments', label: '🔗 Assignments', count: assignments.length },
                            { id: 'grades', label: '📊 Grade Scale', count: 12 },
                        ] as const).map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={`tab-pill ${activeTab === t.id ? 'active' : 'inactive'}`}>
                                {t.label}
                                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═══════════ SUBJECTS TAB ═══════════════════════════════ */}
                {activeTab === 'subjects' && (
                    <>
                        {/* Toolbar */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative flex-1 min-w-[220px] max-w-sm">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon.Search /></span>
                                <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search subjects… ⌘K"
                                    className="search-input" />
                                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Icon.X /></button>}
                            </div>

                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="select-ctrl">
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-ctrl">
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            <div className="flex items-center gap-1 ml-auto">
                                {/* Sort */}
                                <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
                                    {(['code', 'name', 'category', 'teachers'] as const).map(s => (
                                        <button key={s} onClick={() => setSortBy(s)}
                                            className={`sort-btn capitalize ${sortBy === s ? 'active' : ''}`}>{s}</button>
                                    ))}
                                </div>
                                {/* View toggle */}
                                <div className="flex items-center border border-gray-200 rounded-xl p-1 bg-white ml-1">
                                    <button onClick={() => setViewMode('list')} className={`action-btn ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><Icon.List /></button>
                                    <button onClick={() => setViewMode('grid')} className={`action-btn ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><Icon.Grid /></button>
                                </div>
                            </div>
                        </div>

                        {/* Bulk actions */}
                        {bulkSelected.size > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
                                <span className="font-semibold text-indigo-700">{bulkSelected.size} selected</span>
                                <button onClick={handleBulkDelete} className="btn-danger ml-auto">
                                    <Icon.Trash /> Delete Selected
                                </button>
                                <button onClick={() => setBulkSelected(new Set())} className="text-gray-500 hover:text-gray-700 text-xs">Clear</button>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                                <p className="text-sm text-gray-400 font-medium">Loading subjects…</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <span className="text-5xl mb-4">📚</span>
                                <p className="font-bold text-gray-600 text-lg">No subjects found</p>
                                <p className="text-sm mt-1">Try seeding KCSE subjects or adding manually</p>
                                <button onClick={openAddSubject} className="btn-primary mt-4"><Icon.Plus /> Add Subject</button>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* ── GRID VIEW ── */
                            <div className="space-y-6">
                                {Object.entries(grouped).map(([cat, subs]) => {
                                    const meta = getCategoryMeta(cat);
                                    return (
                                        <div key={cat}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="pulse-dot" style={{ background: meta.dot }} />
                                                <h3 className="text-sm font-bold text-gray-700">{cat}</h3>
                                                <span className="text-xs text-gray-400 font-semibold">{subs.length} subjects</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                                {subs.map(s => (
                                                    <SubjectCard key={s.id} subject={s}
                                                        teacherCount={assignments.filter(a => a.subject_id === s.id).length}
                                                        onEdit={openEditSubject}
                                                        onDelete={handleDeleteSubject}
                                                        onAssign={openAssignForSubject}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ── LIST VIEW ── */
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="w-10 p-3 text-left">
                                                <input type="checkbox"
                                                    checked={bulkSelected.size === filtered.length && filtered.length > 0}
                                                    onChange={e => setBulkSelected(e.target.checked ? new Set(filtered.map(s => s.id)) : new Set())}
                                                    className="w-4 h-4 rounded accent-indigo-600" />
                                            </th>
                                            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-16">Code</th>
                                            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Subject Name</th>
                                            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-20">Initials</th>
                                            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</th>
                                            <th className="p-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 w-20">Max Score</th>
                                            <th className="p-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 w-28">Teachers</th>
                                            <th className="p-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 w-20">Status</th>
                                            <th className="p-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 w-28">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((s) => {
                                            const meta = getCategoryMeta(s.category);
                                            const teacherCount = assignments.filter(a => a.subject_id === s.id).length;
                                            const ks = KENYAN_SUBJECTS.find(k => k.code === s.subject_code);
                                            const isSelected = bulkSelected.has(s.id);
                                            return (
                                                <tr key={s.id}
                                                    className={`grid-row border-b border-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                    onClick={() => openEditSubject(s)}>
                                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                                        <input type="checkbox" checked={isSelected}
                                                            onChange={e => {
                                                                const next = new Set(bulkSelected);
                                                                e.target.checked ? next.add(s.id) : next.delete(s.id);
                                                                setBulkSelected(next);
                                                            }}
                                                            className="w-4 h-4 rounded accent-indigo-600" />
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="mono text-[11px] font-bold px-2 py-1 rounded-lg"
                                                            style={{ background: meta.bg, color: meta.color }}>
                                                            {s.subject_code || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                                                                style={{ background: meta.bg }}>
                                                                {ks?.icon || s.subject_name.charAt(0)}
                                                            </span>
                                                            <span className="font-semibold text-gray-800 text-sm">{s.subject_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="mono text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                                            {s.initials || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`chip ${meta.badge}`}>
                                                            <span className="pulse-dot" style={{ background: meta.dot, width: 5, height: 5 }} />
                                                            {s.category || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="font-bold text-gray-600 text-sm">{s.max_score || 100}</span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {teacherCount > 0 ? (
                                                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                                                {teacherCount} teacher{teacherCount > 1 ? 's' : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-amber-500 font-semibold bg-amber-50 px-2 py-1 rounded-full">⚠️ None</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center" onClick={e => handleToggleActive(s, e)}>
                                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${s.is_active !== false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                                            {s.is_active !== false ? '● Active' : '○ Off'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={() => openAssignForSubject(s)}
                                                                className="action-btn text-emerald-600 hover:bg-emerald-50" title="Assign Teacher">
                                                                <Icon.Link />
                                                            </button>
                                                            <button onClick={() => openEditSubject(s)}
                                                                className="action-btn text-indigo-600 hover:bg-indigo-50" title="Edit">
                                                                <Icon.Edit />
                                                            </button>
                                                            <button onClick={() => handleDeleteSubject(s.id)}
                                                                className="action-btn text-red-500 hover:bg-red-50" title="Delete">
                                                                <Icon.Trash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                    <p className="text-xs text-gray-400 font-medium">{filtered.length} of {subjects.length} subjects</p>
                                    {(search || filterCategory || filterStatus) && (
                                        <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterStatus(''); }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════ ASSIGNMENTS TAB ════════════════════════════ */}
                {activeTab === 'assignments' && (
                    <>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative flex-1 min-w-[220px] max-w-sm">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon.Search /></span>
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by subject or teacher…"
                                    className="search-input" />
                            </div>
                            <button onClick={openAddAssignment} className="btn-primary ml-auto">
                                <Icon.Link /> Assign Teacher to Subject
                            </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200">
                            <p className="font-bold text-indigo-800 text-sm">🔗 Teacher–Subject–Form–Stream Matrix</p>
                            <p className="text-xs text-indigo-600 mt-1">Link teachers to specific subjects per form and stream. Teacher initials (e.g. JKM) appear on mark sheets and report forms.</p>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" /></div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                {filteredAssignments.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <span className="text-5xl block mb-3">🔗</span>
                                        <p className="font-bold text-gray-600">No assignments yet</p>
                                        <p className="text-sm mt-1">Click "Assign Teacher to Subject" to get started</p>
                                    </div>
                                ) : (
                                    <>
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    {['#', 'Subject', 'Code', 'Teacher', 'Initials', 'Form', 'Stream', 'Actions'].map(h => (
                                                        <th key={h} className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAssignments.map((a, i) => {
                                                    const form = forms.find(f => f.id === a.form_id);
                                                    const stream = streams.find(s => s.id === a.stream_id);
                                                    const subMeta = getCategoryMeta(a.school_subjects?.category || '');
                                                    return (
                                                        <tr key={a.id} className="grid-row border-b border-gray-50">
                                                            <td className="p-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                                                            <td className="p-3 font-semibold text-gray-800 text-sm">{a.school_subjects?.subject_name || '—'}</td>
                                                            <td className="p-3">
                                                                <span className="mono text-[11px] font-bold px-2 py-1 rounded-lg"
                                                                    style={{ background: subMeta.bg, color: subMeta.color }}>
                                                                    {a.school_subjects?.subject_code || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-medium text-gray-700 text-sm">
                                                                {a.school_teachers?.first_name} {a.school_teachers?.last_name}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="mono text-[11px] font-black bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg tracking-wide">
                                                                    {a.teacher_initials || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-sm text-gray-600">{form?.form_name || <span className="text-gray-300 text-xs italic">All Forms</span>}</td>
                                                            <td className="p-3 text-sm text-gray-600">{stream?.stream_name || <span className="text-gray-300 text-xs italic">All Streams</span>}</td>
                                                            <td className="p-3">
                                                                <button onClick={() => handleDeleteAssignment(a.id)}
                                                                    className="action-btn text-red-500 hover:bg-red-50">
                                                                    <Icon.Trash />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                                            <p className="text-xs text-gray-400 font-medium">{filteredAssignments.length} assignments</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════ GRADE SCALE TAB ════════════════════════════ */}
                {activeTab === 'grades' && (
                    <>
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                            <p className="font-bold text-amber-800">📊 Kenya KCSE Grading Scale 2025/2026</p>
                            <p className="text-xs text-amber-700 mt-1">12-point grading system used across all KCSE subjects. Mean grade is calculated from best 7 subjects (including 3 compulsory).</p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-3">
                            {KCSE_GRADES.map(g => (
                                <div key={g.grade} className="rounded-2xl p-4 text-center border transition-transform hover:-translate-y-0.5"
                                    style={{ background: `${g.color}12`, borderColor: `${g.color}30` }}>
                                    <div className="text-2xl font-black" style={{ color: g.color }}>{g.grade}</div>
                                    <div className="text-[10px] text-gray-500 mt-1 font-semibold">{g.range}</div>
                                    <div className="text-xs font-bold mt-0.5" style={{ color: g.color }}>{g.pts} pts</div>
                                </div>
                            ))}
                        </div>

                        {/* Subject groups reference */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {[
                                { group: 'Group I – Compulsory', subjects: KENYAN_SUBJECTS.filter(s => s.group === 1), cat: 'Compulsory' },
                                { group: 'Group II – Sciences', subjects: KENYAN_SUBJECTS.filter(s => s.group === 2), cat: 'Science' },
                                { group: 'Group III – Humanities', subjects: KENYAN_SUBJECTS.filter(s => s.group === 3), cat: 'Humanities' },
                                { group: 'Group IV – Technical/Applied', subjects: KENYAN_SUBJECTS.filter(s => s.group === 4), cat: 'Technical' },
                                { group: 'Group V – Languages & Creative', subjects: KENYAN_SUBJECTS.filter(s => s.group === 5), cat: 'Languages' },
                            ].map(g => {
                                const meta = getCategoryMeta(g.cat);
                                return (
                                    <div key={g.group} className="rounded-2xl border p-4" style={{ borderColor: meta.border, background: meta.bg + '60' }}>
                                        <p className="font-bold text-sm mb-3" style={{ color: meta.color }}>{g.group}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {g.subjects.map(s => (
                                                <span key={s.code} className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                                                    style={{ background: 'white', color: meta.color, border: `1px solid ${meta.border}` }}>
                                                    {s.icon} {s.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ═══════════ SUBJECT MODAL ══════════════════════════════════ */}
            {showSubjectModal && (
                <div className="modal-backdrop" onClick={() => setShowSubjectModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                                    {editSubject ? '✏️' : '➕'}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-800">{editSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                                    <p className="text-xs text-gray-400">Kenya KCSE 2025/2026</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSubjectModal(false)}
                                className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400">
                                <Icon.X />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Quick fill (add mode only) */}
                            {!editSubject && (
                                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                                    <label className="lbl text-indigo-700">⚡ Quick Fill from KCSE List</label>
                                    <select className="select-ctrl w-full mt-1" onChange={e => {
                                        const sub = KENYAN_SUBJECTS.find(s => s.code === e.target.value);
                                        if (sub) setSubjectForm({ ...subjectForm, subject_name: sub.name, subject_code: sub.code, category: sub.category, max_score: sub.max_score, initials: sub.initials, group_number: sub.group });
                                    }}>
                                        <option value="">Select a KCSE subject…</option>
                                        {KENYAN_SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.icon} {s.code} — {s.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="lbl">Subject Name *</label>
                                    <input type="text" value={subjectForm.subject_name}
                                        onChange={e => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                                        className="field-input" placeholder="e.g. Mathematics" />
                                </div>
                                <div>
                                    <label className="lbl">KNEC Code</label>
                                    <input type="text" value={subjectForm.subject_code}
                                        onChange={e => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                                        className="field-input mono" placeholder="e.g. 121" />
                                </div>
                                <div>
                                    <label className="lbl">Initials (for mark sheets)</label>
                                    <input type="text" value={subjectForm.initials}
                                        onChange={e => setSubjectForm({ ...subjectForm, initials: e.target.value.toUpperCase() })}
                                        className="field-input mono font-bold tracking-wider" placeholder="e.g. MAT" maxLength={6} />
                                </div>
                                <div>
                                    <label className="lbl">Category</label>
                                    <select value={subjectForm.category}
                                        onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value })}
                                        className="select-ctrl w-full">
                                        <option value="Compulsory">Compulsory (Group I)</option>
                                        <option value="Science">Science (Group II)</option>
                                        <option value="Humanities">Humanities (Group III)</option>
                                        <option value="Technical">Technical (Group IV)</option>
                                        <option value="Languages">Languages (Group V)</option>
                                        <option value="Creative">Creative (Group V)</option>
                                        <option value="Applied">Applied (Group V)</option>
                                        <option value="Core">Core</option>
                                        <option value="Elective">Elective</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="lbl">Max Score</label>
                                    <input type="number" value={subjectForm.max_score}
                                        onChange={e => setSubjectForm({ ...subjectForm, max_score: Number(e.target.value) })}
                                        className="field-input" min={0} max={200} />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-700">Subject Active</p>
                                    <p className="text-xs text-gray-400">Inactive subjects won't appear in mark entry</p>
                                </div>
                                <Toggle checked={subjectForm.is_active} onChange={v => setSubjectForm({ ...subjectForm, is_active: v })} />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                            <button onClick={() => setShowSubjectModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSaveSubject} disabled={saving} className="btn-primary">
                                <Icon.Save /> {saving ? 'Saving…' : editSubject ? 'Update Subject' : 'Add Subject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ASSIGNMENT MODAL ═══════════════════════════════ */}
            {showAssignModal && (
                <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-lg">🔗</div>
                                <div>
                                    <h3 className="font-black text-gray-800">Assign Teacher to Subject</h3>
                                    <p className="text-xs text-gray-400">Link per form & stream</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAssignModal(false)}
                                className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400">
                                <Icon.X />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                💡 Teacher initials (e.g. JKM) will appear automatically on mark sheets and report forms.
                            </div>
                            <div>
                                <label className="lbl">Subject *</label>
                                <select value={assignForm.subject_id}
                                    onChange={e => setAssignForm({ ...assignForm, subject_id: Number(e.target.value) })}
                                    className="select-ctrl w-full">
                                    <option value={0}>Select Subject…</option>
                                    {subjects.filter(s => s.is_active !== false).map(s => (
                                        <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Teacher *</label>
                                <select value={assignForm.teacher_id}
                                    onChange={e => {
                                        const tid = Number(e.target.value);
                                        const t = teachers.find(x => x.id === tid);
                                        setAssignForm({ ...assignForm, teacher_id: tid, teacher_initials: t ? generateInitials(t) : '' });
                                    }}
                                    className="select-ctrl w-full">
                                    <option value={0}>Select Teacher…</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name}{t.tsc_number ? ` (${t.tsc_number})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Teacher Initials</label>
                                <input type="text" value={assignForm.teacher_initials}
                                    onChange={e => setAssignForm({ ...assignForm, teacher_initials: e.target.value.toUpperCase() })}
                                    className="field-input mono font-black tracking-widest text-center text-lg" placeholder="JKM" maxLength={5} />
                                <p className="text-[10px] text-gray-400 mt-1">Auto-generated from name. Edit to customize.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="lbl">Form (optional)</label>
                                    <select value={assignForm.form_id}
                                        onChange={e => setAssignForm({ ...assignForm, form_id: Number(e.target.value) })}
                                        className="select-ctrl w-full">
                                        <option value={0}>All Forms</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="lbl">Stream (optional)</label>
                                    <select value={assignForm.stream_id}
                                        onChange={e => setAssignForm({ ...assignForm, stream_id: Number(e.target.value) })}
                                        className="select-ctrl w-full">
                                        <option value={0}>All Streams</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                            <button onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSaveAssignment} className="btn-primary">
                                <Icon.Save /> Save Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
