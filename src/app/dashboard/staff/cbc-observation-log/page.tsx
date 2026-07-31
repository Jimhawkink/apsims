'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiEye, FiPlus, FiSearch, FiSave, FiTrash2, FiEdit2, FiX,
    FiChevronRight, FiDownload, FiRefreshCw, FiUser, FiUsers,
    FiBook, FiCalendar, FiBarChart2, FiStar, FiCheckCircle,
    FiAlertCircle, FiMessageSquare, FiActivity, FiFilter,
    FiTrendingUp, FiFileText, FiLayers, FiClock, FiAward,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type ObsType = 'classroom' | 'peer' | 'hod' | 'principal' | 'external';
type Rating = 1 | 2 | 3 | 4 | 5;

interface TeacherObs {
    id: string;
    teacher_id?: string;
    teacher_name: string;
    subject: string;
    class_observed: string;
    observer_name: string;
    observer_role: string;
    obs_type: ObsType;
    obs_date: string;
    lesson_topic: string;
    learning_area: string;
    strand?: string;
    rating_lesson_planning: Rating;
    rating_cbc_delivery: Rating;
    rating_student_engagement: Rating;
    rating_assessment: Rating;
    rating_differentiation: Rating;
    strengths: string;
    areas_for_improvement: string;
    action_plan: string;
    overall_rating: Rating;
    follow_up_date?: string;
    status: 'draft' | 'submitted' | 'reviewed' | 'acknowledged';
    created_at: string;
}

const RATING_LABELS: Record<Rating, { label: string; color: string; bg: string }> = {
    1: { label: 'Unsatisfactory', color: '#DC2626', bg: '#FEF2F2' },
    2: { label: 'Developing',     color: '#D97706', bg: '#FFFBEB' },
    3: { label: 'Proficient',     color: '#2563EB', bg: '#EFF6FF' },
    4: { label: 'Accomplished',   color: '#059669', bg: '#ECFDF5' },
    5: { label: 'Distinguished',  color: '#7C3AED', bg: '#F5F3FF' },
};

const OBS_TYPES: Record<ObsType, { label: string; color: string; icon: string }> = {
    classroom:  { label: 'Self/Classroom',   color: '#2563EB', icon: '🏫' },
    peer:       { label: 'Peer Review',      color: '#059669', icon: '🤝' },
    hod:        { label: 'HOD Observation',  color: '#D97706', icon: '📋' },
    principal:  { label: 'Principal Visit',  color: '#7C3AED', icon: '👔' },
    external:   { label: 'External Review',  color: '#DC2626', icon: '🔍' },
};

const LEARNING_AREAS = [
    'Literacy Activities','Kiswahili','English','Mathematics Activities',
    'Environmental Activities','Pre-Technical Studies','Agriculture',
    'Social Studies','Business Studies','ICT','Creative Arts',
    'Physical Education','Religious Education','Hygiene & Nutrition',
];

const DEMO: TeacherObs[] = [
    { id:'to1', teacher_name:'Ms. Akinyi Odhiambo', subject:'Mathematics', class_observed:'Grade 7A', observer_name:'Mr. Kamau (HOD)', observer_role:'HOD Mathematics', obs_type:'hod', obs_date: new Date().toISOString().slice(0,10), lesson_topic:'Introduction to Algebra — Forming Equations', learning_area:'Mathematics Activities', strand:'Algebra', rating_lesson_planning:4, rating_cbc_delivery:4, rating_student_engagement:5, rating_assessment:3, rating_differentiation:4, strengths:'Excellent use of real-life contexts to introduce algebra. Students were highly engaged in forming equations from word problems. CBC strand-based delivery was clear and well-structured.', areas_for_improvement:'Assessment tasks could be more differentiated — advanced learners need extension activities. Consider including more peer-assessment opportunities as per CBC framework.', action_plan:'Design 3 differentiated worksheets for next algebra lesson. Attend upcoming SBA workshop on 15th Aug.', overall_rating:4, follow_up_date: new Date(Date.now()+1209600000).toISOString().slice(0,10), status:'reviewed', created_at: new Date().toISOString() },
    { id:'to2', teacher_name:'Mr. Otieno Wycliffe', subject:'Pre-Technical Studies', class_observed:'Grade 8B', observer_name:'Mrs. Wangari (Principal)', observer_role:'Principal', obs_type:'principal', obs_date: new Date(Date.now()-86400000).toISOString().slice(0,10), lesson_topic:'Circuit Design — Series & Parallel Circuits', learning_area:'Pre-Technical Studies', strand:'Electronics', rating_lesson_planning:5, rating_cbc_delivery:5, rating_student_engagement:5, rating_assessment:4, rating_differentiation:3, strengths:'Masterful lesson planning with clear CBC strand alignment. Students were hands-on building circuits throughout. Excellent use of local materials. Strong formative assessment through questioning.', areas_for_improvement:'Differentiation needs improvement — some students finished early with no extension. Portfolio evidence collection could be better documented.', action_plan:'Prepare extension challenge cards for fast finishers. Introduce portfolio templates next week.', overall_rating:5, status:'acknowledged', created_at: new Date().toISOString() },
    { id:'to3', teacher_name:'Ms. Chebet Faith', subject:'Creative Arts', class_observed:'Grade 6A', observer_name:'Ms. Chebet Faith', observer_role:'Teacher (Self-Review)', obs_type:'classroom', obs_date: new Date(Date.now()-172800000).toISOString().slice(0,10), lesson_topic:'Clay Modelling — 3D Sculptures', learning_area:'Creative Arts', strand:'Visual Arts', rating_lesson_planning:3, rating_cbc_delivery:3, rating_student_engagement:4, rating_assessment:2, rating_differentiation:3, strengths:'Good student engagement with the clay activity. Students enjoyed the practical work and showed creativity.', areas_for_improvement:'Assessment was informal only — need to use CBC rubrics more systematically. Better documentation of EE/ME/AE/BE for each student.', action_plan:'Create competency rubric for visual arts. Use observation checklist during next practical lesson.', overall_rating:3, status:'draft', created_at: new Date().toISOString() },
];

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const avgRating = (o: TeacherObs): number => Math.round((o.rating_lesson_planning + o.rating_cbc_delivery + o.rating_student_engagement + o.rating_assessment + o.rating_differentiation) / 5);

export default function TeacherObservationLogPage() {
    const [obs, setObs] = useState<TeacherObs[]>(DEMO);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [fType, setFType] = useState<ObsType | ''>('');
    const [fStatus, setFStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewItem, setViewItem] = useState<TeacherObs | null>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'log' | 'analytics'>('log');

    const emptyForm: Omit<TeacherObs, 'id' | 'created_at'> = {
        teacher_name:'', subject:'', class_observed:'', observer_name:'', observer_role:'',
        obs_type:'classroom', obs_date: new Date().toISOString().slice(0,10),
        lesson_topic:'', learning_area:'', strand:'',
        rating_lesson_planning:3, rating_cbc_delivery:3, rating_student_engagement:3,
        rating_assessment:3, rating_differentiation:3,
        strengths:'', areas_for_improvement:'', action_plan:'',
        overall_rating:3, follow_up_date:'', status:'draft',
    };
    const [form, setForm] = useState(emptyForm);

    const filtered = useMemo(() => obs.filter(o =>
        (!search || `${o.teacher_name} ${o.subject} ${o.lesson_topic}`.toLowerCase().includes(search.toLowerCase()))
        && (!fType || o.obs_type === fType)
        && (!fStatus || o.status === fStatus)
    ), [obs, search, fType, fStatus]);

    const stats = useMemo(() => ({
        total: obs.length,
        distinguished: obs.filter(o => o.overall_rating === 5).length,
        needSupport: obs.filter(o => o.overall_rating <= 2).length,
        pending: obs.filter(o => o.status === 'draft' || o.status === 'submitted').length,
        avgScore: obs.length ? (obs.reduce((a,b) => a + b.overall_rating, 0) / obs.length).toFixed(1) : '0',
    }), [obs]);

    function saveObs() {
        if (!form.teacher_name || !form.lesson_topic) { toast.error('Teacher name and lesson topic required'); return; }
        const newObs: TeacherObs = { ...form, id: `obs-${Date.now()}`, created_at: new Date().toISOString() };
        setObs(p => [newObs, ...p]);
        toast.success('Observation logged!');
        setShowModal(false);
        setForm(emptyForm);
    }

    function deleteObs(id: string) {
        if (!confirm('Delete this observation?')) return;
        setObs(p => p.filter(o => o.id !== id));
        toast.success('Deleted');
    }

    function exportCSV() {
        const rows = [['Date','Teacher','Subject','Class','Observer','Type','Lesson Topic','Overall Rating','Status','Strengths','Areas for Improvement','Action Plan']];
        filtered.forEach(o => rows.push([o.obs_date, o.teacher_name, o.subject, o.class_observed, o.observer_name, OBS_TYPES[o.obs_type].label, o.lesson_topic, String(o.overall_rating), o.status, o.strengths, o.areas_for_improvement, o.action_plan]));
        const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `teacher-obs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
        toast.success('Exported!');
    }

    const RatingStars = ({ value, onChange }: { value: Rating; onChange?: (v: Rating) => void }) => (
        <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => onChange?.(n as Rating)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all ${n <= value ? 'bg-amber-400 text-white shadow' : 'bg-gray-100 text-gray-300 hover:bg-amber-100'} ${!onChange ? 'cursor-default' : 'cursor-pointer'}`}>
                    ★
                </button>
            ))}
            <span className="ml-2 text-xs font-medium" style={{ color: RATING_LABELS[value]?.color }}>{RATING_LABELS[value]?.label}</span>
        </div>
    );

    return (
        <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(135deg,#fdf4ff 0%,#f0f9ff 50%,#f0fdf4 100%)' }}>
            <Toaster position="top-right" />

            {/* HERO */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#4a1942 50%,#0f172a 100%)' }} className="px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-purple-300 text-xs mb-4">
                        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                        <FiChevronRight size={12} />
                        <Link href="/dashboard/staff" className="hover:text-white transition-colors">Staff</Link>
                        <FiChevronRight size={12} />
                        <span className="text-white font-medium">👁️ Teacher Observation Log</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <span className="text-4xl">👁️</span> Teacher CBC Observation Log
                            </h1>
                            <p className="text-purple-200 text-sm">Record, track & improve CBC lesson delivery across all classes — build a professional teaching culture</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={exportCSV} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
                                <FiDownload size={15} /> Export CSV
                            </button>
                            <button onClick={() => { setForm(emptyForm); setShowModal(true); }} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all">
                                <FiPlus size={15} /> Log Observation
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
                        {[
                            { label: 'Total Observations', value: stats.total, icon: '📋', color: 'text-purple-200' },
                            { label: 'Avg Rating', value: `${stats.avgScore}/5`, icon: '⭐', color: 'text-yellow-300' },
                            { label: 'Distinguished', value: stats.distinguished, icon: '🏆', color: 'text-emerald-300' },
                            { label: 'Need Support', value: stats.needSupport, icon: '⚠️', color: 'text-red-300' },
                            { label: 'Pending Review', value: stats.pending, icon: '🕐', color: 'text-blue-300' },
                        ].map(k => (
                            <div key={k.label} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                                <div className="text-lg">{k.icon}</div>
                                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                                <div className="text-purple-300 text-[10px]">{k.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 space-y-5">
                {/* Tabs */}
                <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
                    {[{ key:'log', label:'📋 Observation Log' }, { key:'analytics', label:'📊 Analytics' }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'log' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="relative col-span-2 lg:col-span-1">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher, subject..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <select value={fType} onChange={e => setFType(e.target.value as any)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">All Types</option>
                                    {(Object.keys(OBS_TYPES) as ObsType[]).map(k => <option key={k} value={k}>{OBS_TYPES[k].icon} {OBS_TYPES[k].label}</option>)}
                                </select>
                                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">All Statuses</option>
                                    {['draft','submitted','reviewed','acknowledged'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                                </select>
                                <button onClick={() => setSearch('')} className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm px-3 py-2 hover:bg-gray-50 transition-colors text-gray-500">
                                    <FiRefreshCw size={13} /> Clear
                                </button>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-200">
                                <div className="text-5xl mb-3">👁️</div>
                                <p className="text-gray-500 font-medium">No observations found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filtered.map(o => {
                                    const type = OBS_TYPES[o.obs_type];
                                    const rating = RATING_LABELS[o.overall_rating];
                                    const avg = avgRating(o);
                                    return (
                                        <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-4">
                                                        {/* Rating Circle */}
                                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border-2" style={{ background: rating.bg, borderColor: rating.color }}>
                                                            <div className="text-center">
                                                                <div className="text-lg font-bold" style={{ color: rating.color }}>{o.overall_rating}</div>
                                                                <div className="text-[8px] font-medium" style={{ color: rating.color }}>/ 5</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <h3 className="font-bold text-gray-900">{o.teacher_name}</h3>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ background: rating.color }}>{rating.label}</span>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{type.icon} {type.label}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 font-medium">{o.lesson_topic}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{o.subject} • {o.class_observed} • {o.learning_area}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">Observed by: {o.observer_name} • {fmtDate(o.obs_date)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                                                            o.status === 'acknowledged' ? 'bg-emerald-100 text-emerald-700' :
                                                            o.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                                                            o.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-600'}`}>
                                                            {o.status}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => setViewItem(o)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><FiEye size={13} /></button>
                                                            <button onClick={() => deleteObs(o.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={13} /></button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Rating bars */}
                                                <div className="mt-4 grid grid-cols-5 gap-2">
                                                    {[
                                                        { label: 'Planning', val: o.rating_lesson_planning },
                                                        { label: 'CBC Delivery', val: o.rating_cbc_delivery },
                                                        { label: 'Engagement', val: o.rating_student_engagement },
                                                        { label: 'Assessment', val: o.rating_assessment },
                                                        { label: 'Differentiation', val: o.rating_differentiation },
                                                    ].map(r => (
                                                        <div key={r.label} className="text-center">
                                                            <div className="text-[9px] text-gray-500 mb-1">{r.label}</div>
                                                            <div className="bg-gray-100 rounded-full h-1.5">
                                                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${r.val/5*100}%`, background: RATING_LABELS[r.val as Rating]?.color }} />
                                                            </div>
                                                            <div className="text-[9px] font-bold text-gray-600 mt-0.5">{r.val}/5</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {o.strengths && (
                                                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
                                                        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                                                            <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">💪 Strengths</p>
                                                            <p className="text-[11px] text-emerald-800">{o.strengths.slice(0,120)}{o.strengths.length > 120 ? '...' : ''}</p>
                                                        </div>
                                                        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                                                            <p className="text-[10px] font-semibold text-amber-700 mb-0.5">📈 Areas for Growth</p>
                                                            <p className="text-[11px] text-amber-800">{o.areas_for_improvement.slice(0,120)}{o.areas_for_improvement.length > 120 ? '...' : ''}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'analytics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 className="text-purple-600" /> Overall Rating Distribution</h2>
                            {[5,4,3,2,1].map(n => {
                                const cnt = obs.filter(o => o.overall_rating === n).length;
                                const pct = obs.length ? cnt/obs.length*100 : 0;
                                const r = RATING_LABELS[n as Rating];
                                return (
                                    <div key={n} className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-bold w-4 text-right" style={{ color: r.color }}>{n}★</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                                            <div className="h-3 rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                                        </div>
                                        <span className="text-xs text-gray-500 w-20">{r.label} ({cnt})</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiActivity className="text-purple-600" /> CBC Delivery Domains Average</h2>
                            {[
                                { label: 'Lesson Planning', key: 'rating_lesson_planning' },
                                { label: 'CBC Delivery', key: 'rating_cbc_delivery' },
                                { label: 'Student Engagement', key: 'rating_student_engagement' },
                                { label: 'Assessment Practice', key: 'rating_assessment' },
                                { label: 'Differentiation', key: 'rating_differentiation' },
                            ].map(d => {
                                const avg = obs.length ? obs.reduce((a,b) => a + (b as any)[d.key], 0) / obs.length : 0;
                                return (
                                    <div key={d.label} className="mb-2">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-700">{d.label}</span>
                                            <span className="font-bold text-purple-700">{avg.toFixed(1)}/5</span>
                                        </div>
                                        <div className="bg-gray-100 rounded-full h-2">
                                            <div className="h-2 rounded-full bg-purple-500" style={{ width: `${avg/5*100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="lg:col-span-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-5">
                            <h2 className="font-bold text-gray-800 mb-3 text-sm">🔗 Related Modules</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { href: '/dashboard/staff/cbc-professional-dev', label: 'CBC Prof. Development', icon: '📈' },
                                    { href: '/dashboard/exams/cbc-formative', label: 'Formative Tracker', icon: '📅' },
                                    { href: '/dashboard/exams/sba-manager', label: 'SBA Manager', icon: '📋' },
                                    { href: '/dashboard/hr-payroll/staff', label: 'Staff Directory', icon: '👥' },
                                ].map(l => (
                                    <Link key={l.href} href={l.href} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 border border-purple-100 transition-all shadow-sm">
                                        <span>{l.icon}</span> {l.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* LOG OBSERVATION MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2"><span className="text-xl">👁️</span> Log CBC Teacher Observation</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher Name *</label>
                                    <input value={form.teacher_name} onChange={e => setForm(p=>({...p,teacher_name:e.target.value}))} placeholder="e.g. Ms. Akinyi Odhiambo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                                    <input value={form.subject} onChange={e => setForm(p=>({...p,subject:e.target.value}))} placeholder="e.g. Mathematics" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Class Observed</label>
                                    <input value={form.class_observed} onChange={e => setForm(p=>({...p,class_observed:e.target.value}))} placeholder="e.g. Grade 7A" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Observation Date</label>
                                    <input type="date" value={form.obs_date} onChange={e => setForm(p=>({...p,obs_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Observer Name</label>
                                    <input value={form.observer_name} onChange={e => setForm(p=>({...p,observer_name:e.target.value}))} placeholder="e.g. Mr. Kamau (HOD)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Observation Type</label>
                                    <select value={form.obs_type} onChange={e => setForm(p=>({...p,obs_type:e.target.value as ObsType}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                        {(Object.keys(OBS_TYPES) as ObsType[]).map(k => <option key={k} value={k}>{OBS_TYPES[k].icon} {OBS_TYPES[k].label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Lesson Topic *</label>
                                <input value={form.lesson_topic} onChange={e => setForm(p=>({...p,lesson_topic:e.target.value}))} placeholder="e.g. Introduction to Algebra — Forming Equations" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">CBC Delivery Ratings (1=Unsatisfactory → 5=Distinguished)</label>
                                <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                                    {[
                                        { label:'Lesson Planning & CBC Alignment', key:'rating_lesson_planning' },
                                        { label:'CBC Strand-Based Delivery', key:'rating_cbc_delivery' },
                                        { label:'Student Engagement & Participation', key:'rating_student_engagement' },
                                        { label:'Formative Assessment Practices', key:'rating_assessment' },
                                        { label:'Differentiated Learning', key:'rating_differentiation' },
                                    ].map(r => (
                                        <div key={r.key} className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-gray-700 w-48 flex-shrink-0">{r.label}</span>
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map(n => (
                                                    <button key={n} type="button"
                                                        onClick={() => setForm(p => ({...p, [r.key]: n}))}
                                                        className={`w-7 h-7 rounded-lg text-sm transition-all ${n <= (form as any)[r.key] ? 'bg-purple-500 text-white' : 'bg-white text-gray-300 border border-gray-200 hover:bg-purple-50'}`}>
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">💪 Strengths Observed</label>
                                <textarea value={form.strengths} onChange={e => setForm(p=>({...p,strengths:e.target.value}))} rows={2} placeholder="What did the teacher do well in this CBC lesson?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">📈 Areas for Improvement</label>
                                <textarea value={form.areas_for_improvement} onChange={e => setForm(p=>({...p,areas_for_improvement:e.target.value}))} rows={2} placeholder="What CBC delivery aspects need development?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">🎯 Action Plan</label>
                                <textarea value={form.action_plan} onChange={e => setForm(p=>({...p,action_plan:e.target.value}))} rows={2} placeholder="Specific steps to improve — include dates & support resources" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Overall Rating</label>
                                    <select value={form.overall_rating} onChange={e => setForm(p=>({...p,overall_rating:Number(e.target.value) as Rating}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} — {RATING_LABELS[n as Rating].label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Follow-up Date</label>
                                    <input type="date" value={form.follow_up_date} onChange={e => setForm(p=>({...p,follow_up_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={saveObs} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg">
                                <FiSave size={14} /> Save Observation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
