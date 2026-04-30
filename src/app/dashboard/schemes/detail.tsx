'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPrinter, FiCopy, FiCheck, FiX, FiSend, FiEdit3, FiTrash2, FiPlus, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { getSchemeById, getSchemeWeeks, getSchemeLessons, updateScheme, deleteScheme, cloneScheme, submitForApproval, approveScheme, rejectScheme, type SchemeOfWork, type SchemeWeek, type SchemeLesson } from '@/lib/schemes';
import { statusBadge, curriculumBadge, C } from './helpers';
import OverviewTab from './tab-overview';
import WeeklyTab from './tab-weekly';
import LessonsTab from './tab-lessons';
import ResourcesTab from './tab-resources';
import RemarksTab from './tab-remarks';

const TABS = ['Overview', 'Weekly Table', 'Lessons', 'Resources', 'Remarks'];

export default function SchemeDetail({ schemeId, onBack }: { schemeId: number; onBack: () => void }) {
    const [scheme, setScheme] = useState<SchemeOfWork | null>(null);
    const [weeks, setWeeks] = useState<SchemeWeek[]>([]);
    const [lessons, setLessons] = useState<SchemeLesson[]>([]);
    const [tab, setTab] = useState(0);
    const [printing, setPrinting] = useState(false);
    const [cloning, setCloning] = useState(false);
    const [showApprove, setShowApprove] = useState(false);

    const load = async () => {
        try {
            const [s, w, l] = await Promise.all([getSchemeById(schemeId), getSchemeWeeks(schemeId), getSchemeLessons(schemeId)]);
            setScheme(s); setWeeks(w); setLessons(l);
        } catch { toast.error('Failed to load scheme'); }
    };
    useEffect(() => { load(); }, [schemeId]);

    if (!scheme) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

    const completedLessons = lessons.filter(l => l.is_completed).length;
    const progress = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;
    const pColor = progress >= 80 ? '#059669' : progress >= 50 ? '#b45309' : '#dc2626';

    const handleDelete = async () => { if (!confirm('Delete this scheme?')) return; await deleteScheme(schemeId); toast.success('Deleted'); onBack(); };
    const handleClone = async () => { setCloning(true); try { const user = JSON.parse(localStorage.getItem('school_user')||'{}'); const terms = await (await import('@/lib/schemes')).getTerms(); const next = terms[0]; if (!next) { toast.error('No terms available'); return; } const ns = await cloneScheme(schemeId, next.id!, user.full_name||user.username); toast.success('📋 Scheme cloned!'); onBack(); } catch(e:any){toast.error(e.message);} setCloning(false); };
    const handleApprove = async () => { const user = JSON.parse(localStorage.getItem('school_user')||'{}'); await approveScheme(schemeId, user.full_name||user.username); toast.success('✅ Approved'); setShowApprove(false); load(); };
    const handleReject = async () => { await rejectScheme(schemeId); toast.error('Rejected'); setShowApprove(false); load(); };
    const handleSubmit = async () => { await submitForApproval(schemeId); toast.success('📤 Submitted for HOD review'); load(); };
    const handlePrint = () => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 300); };

    return (
        <div className="animate-fadeIn space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200"><FiArrowLeft size={16} /></button>
                    <div>
                        <h1 className="page-title">{scheme.subject_name}</h1>
                        <p className="text-sm text-gray-500">{scheme.form_name} · {scheme.term_name} · {scheme.teacher_name||'No teacher'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {curriculumBadge(scheme.curriculum_type!)}{statusBadge(scheme.status||'Draft')}
                    <button onClick={handlePrint} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600" title="Print"><FiPrinter size={15} /></button>
                    <button onClick={handleClone} disabled={cloning} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-purple-600" title="Clone"><FiCopy size={15} /></button>
                    {scheme.status === 'Draft' && <button onClick={handleSubmit} className="px-3 py-2 rounded-xl text-xs font-bold border-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"><FiSend size={12}/> Submit to HOD</button>}
                    {scheme.status === 'HOD Review' && <button onClick={() => setShowApprove(!showApprove)} className="px-3 py-2 rounded-xl text-xs font-bold border-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 flex items-center gap-1"><FiCheck size={12}/> HOD Action</button>}
                    <button onClick={handleDelete} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600" title="Delete"><FiTrash2 size={15} /></button>
                </div>
            </div>

            {/* HOD Approval Panel */}
            {showApprove && (
                <div className="print:hidden p-4 rounded-2xl border-2 border-green-200 bg-green-50 flex items-center gap-3">
                    <p className="text-sm font-bold text-green-800">HOD Review — Approve or return this scheme?</p>
                    <button onClick={handleApprove} className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 flex items-center gap-1"><FiCheck/> Approve</button>
                    <button onClick={handleReject} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center gap-1"><FiX/> Return to Draft</button>
                </div>
            )}

            {/* Progress */}
            <div className="print:hidden p-4 rounded-2xl border-2 bg-white" style={{ borderColor: pColor+'33' }}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500">Completion Progress</span>
                    <span className="text-xs font-black" style={{ color: pColor }}>{completedLessons}/{lessons.length} lessons ({progress}%)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: pColor }} /></div>
            </div>

            {/* Tabs */}
            <div className="print:hidden flex items-center gap-1 p-1 rounded-2xl bg-gray-100 overflow-x-auto">
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tab===i ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 0 && <OverviewTab scheme={scheme} weeks={weeks} lessons={lessons} progress={progress} completedLessons={completedLessons} />}
            {tab === 1 && <WeeklyTab scheme={scheme} weeks={weeks} lessons={lessons} />}
            {tab === 2 && <LessonsTab scheme={scheme} weeks={weeks} lessons={lessons} onRefresh={load} />}
            {tab === 3 && <ResourcesTab scheme={scheme} lessons={lessons} onRefresh={load} />}
            {tab === 4 && <RemarksTab scheme={scheme} weeks={weeks} lessons={lessons} onRefresh={load} />}

            {/* Print Header */}
            <div className="hidden print:block mb-6">
                <div className="text-center border-b-2 border-black pb-4 mb-4">
                    <h1 className="text-xl font-black uppercase">{scheme.subject_name} — Scheme of Work</h1>
                    <p className="text-sm mt-1">{scheme.form_name} · {scheme.term_name} · {scheme.curriculum_type} Curriculum</p>
                    {scheme.teacher_name && <p className="text-sm">Teacher: {scheme.teacher_name}</p>}
                </div>
            </div>
        </div>
    );
}
