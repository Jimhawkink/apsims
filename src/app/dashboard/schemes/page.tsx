'use client';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiBookOpen, FiPlus, FiSearch, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { getSchemesOfWork, deleteScheme, getSubjects, getForms, getTerms, type SchemeOfWork } from '@/lib/schemes';
import { C, statusBadge, curriculumBadge } from './helpers';
import SchemeDetail from './detail';

export default function SchemesPage() {
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list'|'detail'|'create'>('list');
    const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
    const [selectedId, setSelectedId] = useState<number|null>(null);
    const [filterSubject, setFilterSubject] = useState<number|''>('');
    const [filterForm, setFilterForm] = useState<number|''>('');
    const [filterTerm, setFilterTerm] = useState<number|''>('');
    const [search, setSearch] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, f, t, data] = await Promise.all([
                getSubjects(), getForms(), getTerms(),
                getSchemesOfWork({ subject_id: filterSubject||undefined, form_id: filterForm||undefined, term_id: filterTerm||undefined } as any)
            ]);
            setSubjects(s); setForms(f); setTerms(t); setSchemes(data);
        } catch { toast.error('Failed to load'); }
        setLoading(false);
    }, [filterSubject, filterForm, filterTerm]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this scheme and all weeks/lessons?')) return;
        try { await deleteScheme(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
    };

    const filtered = schemes.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (s.subject_name||'').toLowerCase().includes(q) || (s.form_name||'').toLowerCase().includes(q) || (s.strand_name||s.topic_name||'').toLowerCase().includes(q);
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>📚</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading schemes…</p>
        </div>
    );

    if (view === 'detail' && selectedId) return <SchemeDetail schemeId={selectedId} onBack={() => { setView('list'); setSelectedId(null); load(); }} />;

    if (view === 'create') return <SchemeCreate subjects={subjects} forms={forms} terms={terms} onBack={() => setView('list')} onCreated={(id) => { setView('detail'); setSelectedId(id); }} />;

    // ── LIST VIEW ──
    const active = schemes.filter(s => s.status === 'Active' || s.status === 'Approved').length;
    const cbc = schemes.filter(s => s.curriculum_type === 'CBC').length;
    const review = schemes.filter(s => s.status === 'HOD Review').length;

    return (
        <div className="animate-fadeIn space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-title">📚 Schemes of Work</h1>
                    <p className="text-sm text-gray-500 mt-1">{schemes.length} schemes · Kenya CBC & 8-4-4 · KICD Format</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition"><FiRefreshCw size={15} /></button>
                    <button onClick={() => setView('create')} className="btn-primary flex items-center gap-2"><FiPlus size={15} /> New Scheme</button>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    { l: 'Total', v: schemes.length, e: '📚', c: '#3b82f6', b: '#eff6ff' },
                    { l: 'Active/Approved', v: active, e: '✅', c: '#059669', b: '#ecfdf5' },
                    { l: 'CBC', v: cbc, e: '🇰🇪', c: '#7c3aed', b: '#faf5ff' },
                    { l: '8-4-4', v: schemes.length - cbc, e: '📖', c: '#1d4ed8', b: '#eef2ff' },
                    { l: 'HOD Review', v: review, e: '🔍', c: '#c2410c', b: '#fff7ed' },
                ].map((k, i) => (
                    <div key={i} className="relative p-4 rounded-2xl border-2 overflow-hidden" style={{ background: k.b, borderColor: k.c+'33' }}>
                        <div className="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-6 translate-x-6 opacity-10" style={{ background: k.c }} />
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: k.c+'99' }}>{k.e} {k.l}</p>
                        <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schemes…" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none" />
                </div>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value ? Number(e.target.value) : '')} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
                <select value={filterForm} onChange={e => setFilterForm(e.target.value ? Number(e.target.value) : '')} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">All Forms</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value ? Number(e.target.value) : '')} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">All Terms</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                </select>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16"><div className="text-5xl mb-3">📚</div><p className="text-gray-500 font-bold">No schemes found</p><p className="text-sm text-gray-400 mt-1">Create a new scheme or adjust filters</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(s => (
                        <div key={s.id} className="relative p-5 rounded-2xl border-2 bg-white overflow-hidden hover:shadow-lg transition-all group cursor-pointer" style={{ borderColor: '#e2e8f0' }} onClick={() => { setSelectedId(s.id!); setView('detail'); }}>
                            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-10 translate-x-10 opacity-5" style={{ background: s.curriculum_type === 'CBC' ? '#7c3aed' : '#1d4ed8' }} />
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">{curriculumBadge(s.curriculum_type!)}{statusBadge(s.status||'Draft')}</div>
                                <button onClick={e => { e.stopPropagation(); handleDelete(s.id!); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"><FiTrash2 size={13} /></button>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm">{s.subject_name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{s.form_name} · {s.term_name}</p>
                            {s.strand_name && <p className="text-xs text-purple-600 mt-1 font-semibold">Strand: {s.strand_name}</p>}
                            {s.topic_name && <p className="text-xs text-blue-600 mt-1 font-semibold">Topic: {s.topic_name}</p>}
                            {s.teacher_name && <p className="text-[10px] text-gray-400 mt-2">👨‍🏫 {s.teacher_name}</p>}
                            {s.approved_by && <p className="text-[10px] text-green-600 mt-1">✓ Approved by {s.approved_by}</p>}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                <span className="text-[10px] font-bold text-blue-600">{s.total_lessons||0} lessons</span>
                                <span className="text-[10px] font-bold text-amber-600">{s.total_weeks||0} weeks</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Create View (inline) ──
import { FiArrowLeft, FiZap } from 'react-icons/fi';
import { getTeachers, getStrands, getTopics, autoGenerateScheme } from '@/lib/schemes';

function SchemeCreate({ subjects, forms, terms, onBack, onCreated }: { subjects: any[]; forms: any[]; terms: any[]; onBack: () => void; onCreated: (id: number) => void }) {
    const [form, setForm] = useState({ subject_id: 0, form_id: 0, term_id: 0, teacher_id: 0, curriculum_type: 'CBC' as 'CBC'|'8-4-4', strand_id: 0, weeksCount: 14, lessonsPerWeek: 3 });
    const [teachers, setTeachers] = useState<any[]>([]);
    const [strands, setStrands] = useState<any[]>([]);
    const [generating, setGenerating] = useState(false);

    useEffect(() => { getTeachers().then(setTeachers).catch(() => {}); }, []);

    const handleSubjectChange = async (sid: number) => {
        setForm(f => ({ ...f, subject_id: sid, strand_id: 0 }));
        if (form.curriculum_type === 'CBC') { const s = await getStrands(); setStrands(s); }
        else { const t = await getTopics(sid, form.form_id||undefined); setStrands(t); }
    };

    const handleGenerate = async () => {
        if (!form.subject_id || !form.form_id || !form.term_id) { toast.error('Subject, Form & Term required'); return; }
        setGenerating(true);
        try {
            const user = JSON.parse(localStorage.getItem('school_user') || '{}');
            const scheme = await autoGenerateScheme({
                subjectId: form.subject_id, formId: form.form_id, termId: form.term_id,
                curriculumType: form.curriculum_type, teacherId: form.teacher_id||undefined,
                createdBy: user.full_name || user.username, strandId: form.strand_id||undefined,
                weeksCount: form.weeksCount, lessonsPerWeek: form.lessonsPerWeek,
            });
            toast.success('⚡ Scheme auto-generated!');
            onCreated(scheme.id!);
        } catch (err: any) { toast.error(err.message || 'Generation failed'); }
        setGenerating(false);
    };

    return (
        <div className="animate-fadeIn space-y-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200"><FiArrowLeft size={16} /></button>
                <div><h1 className="page-title">✨ New Scheme of Work</h1><p className="text-sm text-gray-500">Auto-generate from Kenya CBC / 8-4-4 syllabus</p></div>
            </div>
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Curriculum</label>
                        <select value={form.curriculum_type} onChange={e => setForm(f => ({ ...f, curriculum_type: e.target.value as any, strand_id: 0 }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">
                            <option value="CBC">🇰🇪 CBC (Competency Based)</option><option value="8-4-4">📖 8-4-4 (Legacy)</option>
                        </select></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</label>
                        <select value={form.subject_id} onChange={e => handleSubjectChange(Number(e.target.value))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                        </select></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Form</label>
                        <select value={form.form_id} onChange={e => setForm(f => ({ ...f, form_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Term</label>
                        <select value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                        </select></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teacher</label>
                        <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                        </select></div>
                    {form.curriculum_type === 'CBC' ? (
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Strand</label>
                            <select value={form.strand_id} onChange={e => setForm(f => ({ ...f, strand_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                                <option value={0}>All Strands</option>{strands.map(s => <option key={s.id} value={s.id}>{s.strand_name}</option>)}
                            </select></div>
                    ) : (
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Topic</label>
                            <select value={form.strand_id} onChange={e => setForm(f => ({ ...f, strand_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                                <option value={0}>All Topics</option>{strands.map(t => <option key={t.id} value={t.id}>{t.topic_name}</option>)}
                            </select></div>
                    )}
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weeks</label>
                        <input type="number" value={form.weeksCount} onChange={e => setForm(f => ({ ...f, weeksCount: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" min={1} max={20} /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lessons/Week</label>
                        <input type="number" value={form.lessonsPerWeek} onChange={e => setForm(f => ({ ...f, lessonsPerWeek: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" min={1} max={10} /></div>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button onClick={handleGenerate} disabled={generating} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
                        {generating ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <FiZap size={16} />}
                        {generating ? 'Generating…' : '⚡ Auto-Generate Scheme'}
                    </button>
                    <button onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
            </div>
        </div>
    );
}
