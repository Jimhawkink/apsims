'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiCalendar, FiPlus, FiSearch, FiFilter, FiSave, FiUsers, FiBook,
    FiCheckCircle, FiClock, FiAlertCircle, FiX, FiChevronDown, FiChevronLeft,
    FiChevronRight, FiEdit2, FiTrash2, FiDownload, FiRefreshCw, FiEye,
    FiAward, FiBarChart2, FiTrendingUp, FiFileText, FiGrid, FiList,
    FiStar, FiZap, FiActivity, FiUser, FiMessageSquare, FiLayers,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';

interface Observation {
    id: string;
    student_id: number;
    student_name?: string;
    form_name?: string;
    teacher_id?: string;
    teacher_name?: string;
    learning_area: string;
    strand?: string;
    sub_strand?: string;
    competency_level: CompLevel;
    observation_note?: string;
    date_observed: string;
    term?: string;
    year: number;
    created_at: string;
}

interface Student { id: number; first_name: string; last_name: string; admission_no?: string; form_id?: number; form_name?: string; }
interface Form { id: number; name: string; }

const COMP: Record<CompLevel, { label: string; color: string; bg: string; border: string; emoji: string; score: number }> = {
    EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', emoji: '🌟', score: 4 },
    ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', emoji: '✅', score: 3 },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', emoji: '⚡', score: 2 },
    BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', emoji: '🔴', score: 1 },
};

const LEARNING_AREAS = [
    'Literacy Activities', 'Kiswahili', 'English', 'Mathematics Activities',
    'Environmental Activities', 'Hygiene & Nutrition', 'Religious Education',
    'Creative Arts', 'Physical Education', 'Pre-Technical Studies',
    'Agriculture', 'Social Studies', 'Business Studies', 'ICT',
];

const STRANDS: Record<string, string[]> = {
    'Literacy Activities': ['Listening & Speaking', 'Reading', 'Writing', 'Grammar'],
    'Mathematics Activities': ['Numbers', 'Measurement', 'Geometry', 'Data Handling'],
    'English': ['Listening & Speaking', 'Reading', 'Writing', 'Grammar & Vocabulary'],
    'Kiswahili': ['Kusikiliza na Kuzungumza', 'Kusoma', 'Kuandika', 'Sarufi'],
    'Environmental Activities': ['Physical Environment', 'Living Things', 'Social Environment'],
    'Pre-Technical Studies': ['Materials & Tools', 'Structures', 'Energy', 'Electronics'],
    'Agriculture': ['Crop Production', 'Animal Production', 'Farm Structures', 'Agricultural Economics'],
    'ICT': ['Digital Citizenship', 'Hardware & Software', 'Programming', 'Internet Safety'],
    'Creative Arts': ['Visual Arts', 'Performing Arts', 'Music', 'Drama'],
    'Physical Education': ['Athletics', 'Games & Sports', 'Gymnastics', 'Swimming'],
};

const DEMO_OBS: Observation[] = [
    { id: 'o1', student_id: 1, student_name: 'Amina Otieno', form_name: 'Grade 7A', learning_area: 'Literacy Activities', strand: 'Reading', sub_strand: 'Comprehension', competency_level: 'EE', observation_note: 'Student demonstrates excellent reading fluency and critical analysis skills above grade level.', date_observed: new Date().toISOString().slice(0,10), term: 'Term 2', year: 2025, created_at: new Date().toISOString() },
    { id: 'o2', student_id: 2, student_name: 'Brian Mwangi', form_name: 'Grade 7A', learning_area: 'Mathematics Activities', strand: 'Numbers', sub_strand: 'Fractions', competency_level: 'ME', observation_note: 'Correctly solves fraction problems. Shows clear working and explains reasoning well.', date_observed: new Date().toISOString().slice(0,10), term: 'Term 2', year: 2025, created_at: new Date().toISOString() },
    { id: 'o3', student_id: 3, student_name: 'Chloe Wanjiku', form_name: 'Grade 8B', learning_area: 'Pre-Technical Studies', strand: 'Electronics', sub_strand: 'Circuit Design', competency_level: 'AE', observation_note: 'Making progress but needs more practice with circuit connections. Will need additional support.', date_observed: new Date(Date.now()-86400000).toISOString().slice(0,10), term: 'Term 2', year: 2025, created_at: new Date().toISOString() },
    { id: 'o4', student_id: 4, student_name: 'David Kipkoech', form_name: 'Grade 9A', learning_area: 'Agriculture', strand: 'Crop Production', sub_strand: 'Soil Preparation', competency_level: 'ME', observation_note: 'Demonstrates proper soil preparation techniques and understands importance of pH testing.', date_observed: new Date(Date.now()-86400000).toISOString().slice(0,10), term: 'Term 2', year: 2025, created_at: new Date().toISOString() },
    { id: 'o5', student_id: 5, student_name: 'Eva Moraa', form_name: 'Grade 7B', learning_area: 'Creative Arts', strand: 'Visual Arts', sub_strand: 'Drawing', competency_level: 'EE', observation_note: 'Exceptional creativity and fine motor skills. Artwork shows depth of understanding.', date_observed: new Date(Date.now()-172800000).toISOString().slice(0,10), term: 'Term 2', year: 2025, created_at: new Date().toISOString() },
    { id: 'o6', student_id: 6, student_name: 'Felix Omondi', form_name: 'Grade 8A', learning_area: 'Kiswahili', strand: 'Kusoma', sub_strand: 'Ufahamu', competency_level: 'BE', observation_note: 'Needs significant support with reading comprehension in Kiswahili. Intervention plan being prepared.', date_observed: new Date(Date.now()-172800000).toISOString().slice(0,10), term: 'Term 2', year: 2025, created_at: new Date().toISOString() },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' });
const today = () => new Date().toISOString().slice(0,10);

export default function FormativeDailyTrackerPage() {
    const [obs, setObs] = useState<Observation[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbReady, setDbReady] = useState(false);
    const [view, setView] = useState<'log' | 'calendar' | 'analytics'>('log');
    const [search, setSearch] = useState('');
    const [fArea, setFArea] = useState('');
    const [fLevel, setFLevel] = useState<CompLevel | ''>('');
    const [fForm, setFForm] = useState('');
    const [fDate, setFDate] = useState(today());
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editItem, setEditItem] = useState<Observation | null>(null);

    const emptyForm = {
        student_id: '', learning_area: '', strand: '', sub_strand: '',
        competency_level: 'ME' as CompLevel, observation_note: '',
        date_observed: today(), term: 'Term 2', year: new Date().getFullYear(),
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [fmsR, stR] = await Promise.all([
                sb.from('school_forms').select('id,name').order('name'),
                sb.from('school_students').select('id,first_name,last_name,admission_no,form_id,school_forms(name)').eq('status','Active').order('first_name').limit(500),
            ]);
            if (fmsR.data) setForms(fmsR.data);
            if (stR.data) setStudents(stR.data.map((s: any) => ({ ...s, form_name: s.school_forms?.name })));

            const { data, error } = await sb.from('school_cbc_observations').select('*').order('date_observed', { ascending: false }).limit(200);
            if (error?.code === '42P01') { setObs(DEMO_OBS); setDbReady(false); }
            else if (data) { setObs(data.length ? data : DEMO_OBS); setDbReady(true); }
        } catch { setObs(DEMO_OBS); }
        setLoading(false);
    }

    const filtered = useMemo(() => obs.filter(o =>
        (!search || `${o.student_name} ${o.learning_area} ${o.strand}`.toLowerCase().includes(search.toLowerCase()))
        && (!fArea || o.learning_area === fArea)
        && (!fLevel || o.competency_level === fLevel)
        && (!fForm || o.form_name === fForm)
    ), [obs, search, fArea, fLevel, fForm]);

    const stats = useMemo(() => {
        const total = obs.length;
        const today_ = obs.filter(o => o.date_observed === today()).length;
        const ee = obs.filter(o => o.competency_level === 'EE').length;
        const be = obs.filter(o => o.competency_level === 'BE').length;
        const students_ = new Set(obs.map(o => o.student_id)).size;
        const areas = new Set(obs.map(o => o.learning_area)).size;
        return { total, today: today_, ee, be, students: students_, areas };
    }, [obs]);

    const calendarDays = useMemo(() => {
        const counts: Record<string, number> = {};
        obs.forEach(o => { counts[o.date_observed] = (counts[o.date_observed] || 0) + 1; });
        return counts;
    }, [obs]);

    const areaStats = useMemo(() => {
        const map: Record<string, Record<CompLevel, number>> = {};
        obs.forEach(o => {
            if (!map[o.learning_area]) map[o.learning_area] = { EE: 0, ME: 0, AE: 0, BE: 0 };
            map[o.learning_area][o.competency_level]++;
        });
        return Object.entries(map).map(([area, counts]) => ({ area, ...counts, total: counts.EE + counts.ME + counts.AE + counts.BE })).sort((a, b) => b.total - a.total);
    }, [obs]);

    async function saveObs() {
        if (!form.student_id || !form.learning_area) { toast.error('Select student and learning area'); return; }
        setSaving(true);
        const student = students.find(s => s.id === Number(form.student_id));
        const payload = {
            ...form,
            student_id: Number(form.student_id),
            student_name: student ? `${student.first_name} ${student.last_name}` : '',
            form_name: student?.form_name || '',
        };
        if (!dbReady) {
            const newObs: Observation = { id: `demo-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
            setObs(prev => [newObs, ...prev]);
            toast.success('Observation recorded (demo mode)');
        } else {
            const { error } = editItem
                ? await sb.from('school_cbc_observations').update(payload).eq('id', editItem.id)
                : await sb.from('school_cbc_observations').insert(payload);
            if (error) { toast.error('Failed to save: ' + error.message); }
            else { toast.success(editItem ? 'Observation updated!' : 'Observation recorded!'); await load(); }
        }
        setSaving(false);
        setShowModal(false);
        setForm(emptyForm);
        setEditItem(null);
    }

    async function deleteObs(id: string) {
        if (!confirm('Delete this observation?')) return;
        if (!dbReady) { setObs(prev => prev.filter(o => o.id !== id)); toast.success('Deleted'); return; }
        const { error } = await sb.from('school_cbc_observations').delete().eq('id', id);
        if (error) toast.error('Failed to delete'); else { toast.success('Deleted'); await load(); }
    }

    function openEdit(o: Observation) {
        setEditItem(o);
        setForm({ student_id: String(o.student_id), learning_area: o.learning_area, strand: o.strand || '', sub_strand: o.sub_strand || '', competency_level: o.competency_level, observation_note: o.observation_note || '', date_observed: o.date_observed, term: o.term || 'Term 2', year: o.year });
        setShowModal(true);
    }

    function exportCSV() {
        const rows = [['Date','Student','Form','Learning Area','Strand','Sub-Strand','Level','Notes']];
        filtered.forEach(o => rows.push([o.date_observed, o.student_name||'', o.form_name||'', o.learning_area, o.strand||'', o.sub_strand||'', o.competency_level, o.observation_note||'']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
        a.download = `cbc-formative-observations-${today()}.csv`; a.click();
        toast.success('Exported!');
    }

    const SQL = `-- Run in Supabase SQL Editor to enable this feature
CREATE TABLE IF NOT EXISTS school_cbc_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       bigint REFERENCES school_students(id) ON DELETE CASCADE,
  student_name     text,
  form_name        text,
  teacher_id       text,
  teacher_name     text,
  learning_area    text NOT NULL,
  strand           text,
  sub_strand       text,
  competency_level text DEFAULT 'ME',
  observation_note text,
  date_observed    date NOT NULL DEFAULT CURRENT_DATE,
  term             text,
  year             int DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE school_cbc_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_cbc_observations FOR ALL USING (true) WITH CHECK (true);`;

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
                <p className="text-gray-400 text-sm">Loading Formative Tracker...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdf4 100%)' }}>
            <Toaster position="top-right" />

            {/* ── HERO HEADER ── */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#1e40af 100%)' }} className="px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-indigo-300 text-xs mb-4">
                        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                        <FiChevronRight size={12} />
                        <Link href="/dashboard/exams" className="hover:text-white transition-colors">Exams</Link>
                        <FiChevronRight size={12} />
                        <span className="text-white font-medium">📅 Formative Daily Tracker</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <span className="text-4xl">📅</span> CBC Formative Daily Tracker
                            </h1>
                            <p className="text-indigo-200 text-sm">Continuous assessment — observe, record & track every learner every day</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={exportCSV} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
                                <FiDownload size={15} /> Export CSV
                            </button>
                            <button onClick={() => { setForm(emptyForm); setEditItem(null); setShowModal(true); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all">
                                <FiPlus size={15} /> Record Observation
                            </button>
                        </div>
                    </div>
                    {/* KPI Bar */}
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                        {[
                            { label: 'Total Obs.', value: stats.total, icon: '📝', color: 'text-indigo-200' },
                            { label: 'Today', value: stats.today, icon: '📅', color: 'text-emerald-300' },
                            { label: 'Students', value: stats.students, icon: '👩‍🎓', color: 'text-blue-200' },
                            { label: 'EE Achieved', value: stats.ee, icon: '🌟', color: 'text-yellow-300' },
                            { label: 'Need Support', value: stats.be, icon: '🔴', color: 'text-red-300' },
                            { label: 'Learning Areas', value: stats.areas, icon: '📚', color: 'text-purple-200' },
                        ].map(k => (
                            <div key={k.label} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                                <div className="text-lg mb-0.5">{k.icon}</div>
                                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                                <div className="text-indigo-300 text-[10px] font-medium">{k.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 space-y-5">
                {/* DB Setup Alert */}
                {!dbReady && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">⚙️</span>
                            <div className="flex-1">
                                <p className="font-semibold text-amber-800 text-sm mb-1">Database table not found — showing demo data</p>
                                <p className="text-amber-700 text-xs mb-2">Run this SQL in Supabase SQL Editor to enable full functionality:</p>
                                <pre className="bg-amber-900/10 text-amber-900 text-[10px] p-2 rounded overflow-x-auto">{SQL}</pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Tabs */}
                <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
                    {[
                        { key: 'log', label: '📋 Observation Log', icon: FiList },
                        { key: 'calendar', label: '📅 Calendar View', icon: FiCalendar },
                        { key: 'analytics', label: '📊 Analytics', icon: FiBarChart2 },
                    ].map(t => (
                        <button key={t.key} onClick={() => setView(t.key as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === t.key ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <t.icon size={14} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* LOG VIEW */}
                {view === 'log' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="relative col-span-2 lg:col-span-1">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, area..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                </div>
                                <select value={fForm} onChange={e => setFForm(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">All Classes</option>
                                    {forms.map(f => <option key={f.id}>{f.name}</option>)}
                                </select>
                                <select value={fArea} onChange={e => setFArea(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">All Learning Areas</option>
                                    {LEARNING_AREAS.map(a => <option key={a}>{a}</option>)}
                                </select>
                                <select value={fLevel} onChange={e => setFLevel(e.target.value as any)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">All Levels</option>
                                    {(Object.keys(COMP) as CompLevel[]).map(k => <option key={k} value={k}>{COMP[k].emoji} {k} — {COMP[k].label}</option>)}
                                </select>
                                <button onClick={load} className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600">
                                    <FiRefreshCw size={13} /> Refresh
                                </button>
                            </div>
                        </div>

                        {/* Observation Cards */}
                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-200">
                                <div className="text-5xl mb-3">📋</div>
                                <p className="text-gray-500 font-medium">No observations found</p>
                                <p className="text-gray-400 text-sm mt-1">Record your first observation using the button above</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map(o => {
                                    const c = COMP[o.competency_level];
                                    return (
                                        <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                                            <div className="flex items-start gap-4 p-4">
                                                {/* Level Badge */}
                                                <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center border-2" style={{ background: c.bg, borderColor: c.border }}>
                                                    <span className="text-lg">{c.emoji}</span>
                                                    <span className="text-[10px] font-bold" style={{ color: c.color }}>{o.competency_level}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{o.student_name}</p>
                                                            <p className="text-xs text-gray-500">{o.form_name} • {o.learning_area}{o.strand ? ` → ${o.strand}` : ''}{o.sub_strand ? ` → ${o.sub_strand}` : ''}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-1"><FiCalendar size={10} /> {fmtDate(o.date_observed)}</span>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: c.bg, color: c.color }}>{c.label}</span>
                                                        </div>
                                                    </div>
                                                    {o.observation_note && (
                                                        <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 italic border-l-3 border-l-gray-300" style={{ borderLeft: '3px solid #d1d5db' }}>
                                                            💬 {o.observation_note}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1.5 flex-shrink-0">
                                                    <button onClick={() => openEdit(o)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><FiEdit2 size={13} /></button>
                                                    <button onClick={() => deleteObs(o.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={13} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* CALENDAR VIEW */}
                {view === 'calendar' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiCalendar className="text-indigo-600" /> Monthly Observation Heatmap</h2>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                                <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: 35 }, (_, i) => {
                                const d = new Date(); d.setDate(d.getDate() - 34 + i);
                                const key = d.toISOString().slice(0,10);
                                const count = calendarDays[key] || 0;
                                const isToday = key === today();
                                return (
                                    <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border ${isToday ? 'border-indigo-500 border-2' : 'border-gray-100'} ${count === 0 ? 'bg-gray-50 hover:bg-gray-100' : count < 3 ? 'bg-blue-100 hover:bg-blue-200' : count < 6 ? 'bg-indigo-200 hover:bg-indigo-300' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                                        <span className={`text-[10px] font-medium ${count > 5 ? 'text-white' : 'text-gray-600'}`}>{d.getDate()}</span>
                                        {count > 0 && <span className={`text-[8px] font-bold ${count > 5 ? 'text-white' : 'text-indigo-700'}`}>{count}</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> 0 obs</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100" /> 1–2 obs</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-200" /> 3–5 obs</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500" /> 6+ obs</div>
                        </div>
                    </div>
                )}

                {/* ANALYTICS VIEW */}
                {view === 'analytics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Competency Distribution */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 className="text-indigo-600" /> Overall Competency Distribution</h2>
                            <div className="space-y-3">
                                {(Object.keys(COMP) as CompLevel[]).map(k => {
                                    const cnt = obs.filter(o => o.competency_level === k).length;
                                    const pct = obs.length ? Math.round(cnt / obs.length * 100) : 0;
                                    const c = COMP[k];
                                    return (
                                        <div key={k}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium text-gray-700">{c.emoji} {k} — {c.label}</span>
                                                <span className="font-bold" style={{ color: c.color }}>{cnt} ({pct}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* By Learning Area */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBook className="text-emerald-600" /> By Learning Area</h2>
                            <div className="space-y-2 overflow-y-auto max-h-64">
                                {areaStats.map(a => (
                                    <div key={a.area} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                        <span className="text-xs font-medium text-gray-700 w-36 truncate">{a.area}</span>
                                        <div className="flex-1 flex gap-1">
                                            {(['EE','ME','AE','BE'] as CompLevel[]).map(k => {
                                                const cnt = (a as any)[k] || 0;
                                                const pct = a.total ? (cnt / a.total * 100) : 0;
                                                return pct > 0 ? (
                                                    <div key={k} className="h-5 rounded text-[9px] font-bold flex items-center justify-center text-white" style={{ width: `${pct}%`, background: COMP[k].color, minWidth: cnt > 0 ? '18px' : '0' }}>
                                                        {cnt}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                        <span className="text-xs text-gray-400 w-8 text-right">{a.total}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="lg:col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
                            <h2 className="font-bold text-gray-800 mb-3 text-sm">🔗 Quick Links — CBC Assessment Suite</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { href: '/dashboard/exams/cbc-marks', label: 'CBC Mark Entry', icon: '📝' },
                                    { href: '/dashboard/exams/sba-manager', label: 'SBA Manager', icon: '📋' },
                                    { href: '/dashboard/cbc/portfolio', label: 'Student Portfolio', icon: '🗂️' },
                                    { href: '/dashboard/exams/cbc-report-cards', label: 'CBC Report Cards', icon: '📄' },
                                ].map(l => (
                                    <Link key={l.href} href={l.href} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-indigo-100 transition-all shadow-sm">
                                        <span>{l.icon}</span> {l.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── RECORD OBSERVATION MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-xl">📅</span> {editItem ? 'Edit Observation' : 'Record New Observation'}
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditItem(null); setForm(emptyForm); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Student *</label>
                                <select value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">Select Student</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.form_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date Observed *</label>
                                    <input type="date" value={form.date_observed} onChange={e => setForm(p => ({...p, date_observed: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Term</label>
                                    <select value={form.term} onChange={e => setForm(p => ({...p, term: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {['Term 1','Term 2','Term 3'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Learning Area *</label>
                                <select value={form.learning_area} onChange={e => setForm(p => ({...p, learning_area: e.target.value, strand: '', sub_strand: ''}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">Select Learning Area</option>
                                    {LEARNING_AREAS.map(a => <option key={a}>{a}</option>)}
                                </select>
                            </div>
                            {form.learning_area && STRANDS[form.learning_area] && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Strand</label>
                                    <select value={form.strand} onChange={e => setForm(p => ({...p, strand: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">Select Strand</option>
                                        {STRANDS[form.learning_area].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Sub-Strand / Activity</label>
                                <input value={form.sub_strand} onChange={e => setForm(p => ({...p, sub_strand: e.target.value}))} placeholder="e.g. Reading Fluency, Fraction Division..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">Competency Level *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(COMP) as CompLevel[]).map(k => {
                                        const c = COMP[k];
                                        const selected = form.competency_level === k;
                                        return (
                                            <button key={k} onClick={() => setForm(p => ({...p, competency_level: k}))}
                                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-left"
                                                style={selected ? { background: c.bg, borderColor: c.color, color: c.color } : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' }}>
                                                <span className="text-base">{c.emoji}</span>
                                                <div><div>{k}</div><div className="font-normal text-[10px]">{c.label.split(' ').slice(0,2).join(' ')}</div></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Observation Note</label>
                                <textarea value={form.observation_note} onChange={e => setForm(p => ({...p, observation_note: e.target.value}))} rows={3} placeholder="Describe what you observed — specific behaviors, evidence of learning, areas for improvement..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => { setShowModal(false); setEditItem(null); setForm(emptyForm); }} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={saveObs} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20">
                                {saving ? <><FiRefreshCw className="animate-spin" size={14} /> Saving...</> : <><FiSave size={14} /> {editItem ? 'Update' : 'Save Observation'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
