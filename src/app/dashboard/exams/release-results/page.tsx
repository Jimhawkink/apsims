'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSend, FiLock, FiUnlock, FiRefreshCw, FiSmartphone, FiFilter, FiChevronDown } from 'react-icons/fi';

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

export default function ReleaseResultsPage() {
    const [terms, setTerms]           = useState<any[]>([]);
    const [forms, setForms]           = useState<any[]>([]);
    const [streams, setStreams]        = useState<any[]>([]);
    const [releases, setReleases]     = useState<any[]>([]);
    const [locks, setLocks]           = useState<any[]>([]);
    const [mobileUsers, setMobileUsers] = useState<any[]>([]);
    const [markCounts, setMarkCounts] = useState<Record<string,number>>({});
    const [loading, setLoading]       = useState(true);
    const [saving, setSaving]         = useState<string|null>(null);

    const [selTerm, setSelTerm]       = useState('');
    const [selExam, setSelExam]       = useState('End-Term');
    const [selForm, setSelForm]       = useState('');
    const [selStream, setSelStream]   = useState('');
    const [selLevel, setSelLevel]     = useState('');
    const [releaseMsg, setReleaseMsg] = useState("Dear Parent, your child's results are now available. Open the APSIMS app to view the full report card.");

    const EXAM_TYPES = ['End-Term','Mid-Term','CAT 1','CAT 2','Mock','Pre-Mock','KCPE Mock'];

    const load = useCallback(async () => {
        setLoading(true);
        const [tR, fR, stR, relR, lockR, muR] = await Promise.all([
            supabase.from('school_terms').select('*').order('id', { ascending:false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_report_releases').select('*').order('released_at', { ascending:false }),
            supabase.from('school_marks_lock').select('*'),
            supabase.from('school_mobile_users')
                .select('*, school_students(first_name,last_name,admission_number,form_id,school_forms(form_name,form_level))')
                .eq('is_active', true),
        ]);
        setTerms(tR.data || []);
        setForms(fR.data || []);
        setStreams(stR.data || []);
        setReleases(relR.data || []);
        setLocks(lockR.data || []);
        setMobileUsers(muR.data || []);
        const cur = (tR.data || []).find((t:any) => t.is_current) || (tR.data || [])[0];
        if (cur) setSelTerm(prev => prev || String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!selTerm) return;
        supabase.from('school_exam_marks')
            .select('student_id, school_students!inner(form_id)')
            .eq('term_id', Number(selTerm)).eq('exam_type', selExam)
            .then(({ data }) => {
                const counts: Record<string,number> = {};
                (data || []).forEach((r:any) => {
                    const k = String((r.school_students as any)?.form_id);
                    counts[k] = (counts[k] || 0) + 1;
                });
                setMarkCounts(counts);
            }).catch(() => {});
    }, [selTerm, selExam]);

    const getUser = () => { try { return JSON.parse(localStorage.getItem('school_user') || '{}'); } catch { return {}; } };
    const getTerm = (id:any) => terms.find(t => String(t.id) === String(id));

    const filteredForms = useMemo(() => {
        let f = forms;
        if (selForm) f = f.filter(x => x.id === Number(selForm));
        if (selLevel === '844') f = f.filter(x => x.form_level >= 1 && x.form_level <= 4);
        else if (selLevel === 'cbc_junior') f = f.filter(x => x.form_level >= 5 && x.form_level <= 9);
        else if (selLevel === 'cbc_senior') f = f.filter(x => x.form_level >= 10);
        return f;
    }, [forms, selForm, selLevel]);

    const formStatus = useMemo(() => filteredForms.map(f => ({
        form: f,
        release: releases.find(r => r.form_id === f.id && String(r.term_id) === selTerm && r.exam_type === selExam && r.is_released),
        lock: locks.find(l => String(l.term_id) === selTerm && l.form_id === f.id && l.exam_type === selExam),
        marks: markCounts[String(f.id)] || 0,
        parents: mobileUsers.filter(mu => (mu.school_students as any)?.form_id === f.id).length,
    })), [filteredForms, releases, locks, markCounts, mobileUsers, selTerm, selExam]);

    const globalRelease = releases.find(r =>
        String(r.term_id) === selTerm && !r.form_id && r.exam_type === selExam && r.is_released
    );

    const releaseAll = async () => {
        if (!selTerm) return toast.error('Select a term first');
        if (!confirm('Release results to ALL parents on the mobile app?')) return;
        setSaving('all');
        const user = getUser();
        const termName = getTerm(selTerm)?.term_name || '';
        const { error } = await supabase.from('school_report_releases').upsert({
            term_id: Number(selTerm), form_id: null, exam_type: selExam, is_released: true,
            released_by: user.full_name || 'Admin', released_at: new Date().toISOString(),
            release_message: releaseMsg, release_type: 'full',
        }, { onConflict: 'term_id,form_id,exam_type', ignoreDuplicates: false });
        if (error) { toast.error(error.message); setSaving(null); return; }
        const notifs = mobileUsers.map(mu => ({
            student_id: mu.student_id, guardian_phone: mu.guardian_phone,
            title: termName + ' Results Released',
            body: releaseMsg, type: 'results',
            data: { term_id: Number(selTerm), exam_type: selExam },
        }));
        if (notifs.length) await supabase.from('school_mobile_notifications').insert(notifs);
        setSaving(null);
        toast.success('Released to ' + mobileUsers.length + ' parent(s)!');
        load();
    };

    const releaseForm = async (formId: number, formName: string, streamId?: number, streamName?: string) => {
        if (!selTerm) return;
        const key = streamId ? ('f' + formId + '_s' + streamId) : ('f' + formId);
        setSaving(key);
        const user = getUser();
        const row: any = {
            term_id: Number(selTerm), form_id: formId, exam_type: selExam, is_released: true,
            released_by: user.full_name || 'Admin', released_at: new Date().toISOString(),
            release_message: releaseMsg, release_type: streamId ? 'stream' : 'form',
        };
        if (streamId) row.stream_id = streamId;
        await supabase.from('school_report_releases').upsert(row,
            { onConflict: streamId ? 'term_id,form_id,stream_id,exam_type' : 'term_id,form_id,exam_type', ignoreDuplicates: false });
        const targets = mobileUsers.filter(mu => (mu.school_students as any)?.form_id === formId);
        const label = formName + (streamName ? ' ' + streamName : '');
        if (targets.length) {
            await supabase.from('school_mobile_notifications').insert(targets.map(mu => ({
                student_id: mu.student_id, guardian_phone: mu.guardian_phone,
                title: label + ' Results Out',
                body: releaseMsg, type: 'results',
                data: { term_id: Number(selTerm), exam_type: selExam },
            })));
        }
        setSaving(null);
        toast.success(label + ' results released!');
        load();
    };

    const revokeRelease = async (formId: number | null, streamId?: number) => {
        if (!confirm('Revoke? Parents will immediately see a locked screen.')) return;
        setSaving('revoke');
        let q = supabase.from('school_report_releases')
            .update({ is_released: false })
            .eq('term_id', Number(selTerm)).eq('exam_type', selExam);
        if (formId === null) q = q.is('form_id', null); else q = q.eq('form_id', formId);
        if (streamId) q = (q as any).eq('stream_id', streamId);
        await q;
        setSaving(null);
        toast.success('Release revoked');
        load();
    };

    const toggleLock = async (formId: number, formName: string, locked: boolean) => {
        const user = getUser();
        const uname = user.full_name || 'Admin';
        await supabase.from('school_marks_lock').upsert({
            term_id: Number(selTerm), form_id: formId, exam_type: selExam,
            is_locked: !locked,
            locked_by: !locked ? uname : undefined,
            locked_at: !locked ? new Date().toISOString() : undefined,
            unlocked_by: locked ? uname : undefined,
            unlocked_at: locked ? new Date().toISOString() : undefined,
        }, { onConflict: 'term_id,form_id,exam_type', ignoreDuplicates: false });
        toast.success((!locked ? 'Locked ' : 'Unlocked ') + formName);
        load();
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"/>
        </div>
    );

    const releasedCount = formStatus.filter(s => s.release).length;
    const lockedCount   = formStatus.filter(s => s.lock?.is_locked !== false).length;
    const totalMarks    = Object.values(markCounts).reduce((a,b) => a+b, 0);

    return (
        <div className="space-y-6 pb-16">

            {/* HERO */}
            <div className="rounded-2xl p-6 text-white" style={{ background:'linear-gradient(135deg,#0c4a6e,#0891b2,#7c3aed)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-black">📱 Release Results to Mobile App</h1>
                        <p className="text-sm text-white/70 mt-1">Control when parents can see results in the APSIMS app — per form, stream, or global</p>
                    </div>
                    <button onClick={load} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition">
                        <FiRefreshCw size={14}/> Refresh
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { l:'Mobile Parents', v: mobileUsers.length,  i:'👪' },
                        { l:'Released Forms',  v: releasedCount,       i:'✅' },
                        { l:'Total Marks',     v: totalMarks,          i:'📊' },
                        { l:'Locked Forms',    v: lockedCount,         i:'🔒' },
                    ].map(k => (
                        <div key={k.l} className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-lg">{k.i}</p>
                            <p className="text-2xl font-black text-white">{k.v}</p>
                            <p className="text-[10px] text-white/60 uppercase font-bold mt-0.5">{k.l}</p>
                        </div>
                    ))}
                </div>

                {/* SUPER FILTERS */}
                <div className="mt-5 p-4 bg-white/10 rounded-2xl">
                    <p className="text-[10px] text-white/60 font-black uppercase mb-3 flex items-center gap-1.5">
                        <FiFilter size={11}/> Super Filters
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                            <p className="text-[9px] text-white/50 font-bold uppercase mb-1">Term *</p>
                            <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white font-semibold">
                                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year||''}</option>)}
                            </select>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/50 font-bold uppercase mb-1">Exam Type *</p>
                            <select value={selExam} onChange={e => setSelExam(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white font-semibold">
                                {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/50 font-bold uppercase mb-1">Curriculum</p>
                            <select value={selLevel} onChange={e => setSelLevel(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white font-semibold">
                                <option value="">All Levels</option>
                                <option value="844">8-4-4 (Form 1-4)</option>
                                <option value="cbc_junior">CBC Junior (Gr 5-9)</option>
                                <option value="cbc_senior">CBC Senior (Gr 10-12)</option>
                            </select>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/50 font-bold uppercase mb-1">Form / Grade</p>
                            <select value={selForm} onChange={e => setSelForm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white font-semibold">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/50 font-bold uppercase mb-1">Stream</p>
                            <select value={selStream} onChange={e => setSelStream(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white font-semibold">
                                <option value="">All Streams</option>
                                {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* GLOBAL RELEASE */}
            <div className={`rounded-2xl border-2 p-5 ${globalRelease ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="font-black text-gray-800 text-lg">
                            {globalRelease ? '✅' : '🔒'} Global Release — All Forms
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {globalRelease
                                ? ('Released by ' + globalRelease.released_by + ' · ' + fmt(globalRelease.released_at))
                                : ('Not released for ' + (getTerm(selTerm)?.term_name || '') + ' ' + selExam)}
                        </p>
                        {globalRelease && (
                            <p className="text-xs text-green-600 font-bold mt-1">
                                {mobileUsers.length} parent(s) can view results in the APSIMS app
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {globalRelease ? (
                            <button onClick={() => revokeRelease(null)} disabled={saving === 'revoke'}
                                className="px-4 py-2 text-xs font-black text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center gap-1.5">
                                <FiLock size={12}/> Revoke All
                            </button>
                        ) : (
                            <button onClick={releaseAll} disabled={saving === 'all'}
                                className="px-5 py-2.5 text-sm font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition flex items-center gap-2 shadow-md disabled:opacity-50">
                                <FiSend size={14}/> {saving === 'all' ? 'Releasing…' : 'Release ALL Forms to Mobile'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notification Message</label>
                    <textarea value={releaseMsg} onChange={e => setReleaseMsg(e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white"/>
                </div>
            </div>

            {/* PER-FORM CARDS */}
            <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <p className="font-black text-gray-800">
                        📋 Per-Form Release Control
                        {filteredForms.length < forms.length && (
                            <span className="ml-2 text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                {filteredForms.length}/{forms.length} forms shown
                            </span>
                        )}
                    </p>
                    <button onClick={() => filteredForms.forEach(f => releaseForm(f.id, f.form_name))}
                        className="text-xs font-black text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 transition">
                        Release All Filtered Forms
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {formStatus.map(({ form, release, lock, marks, parents }) => {
                        const isReleased = !!release;
                        const isLocked   = lock?.is_locked !== false;
                        const isCBC      = form.form_level >= 10;
                        const fKey       = 'f' + form.id;

                        return (
                            <div key={form.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3 transition ${isReleased ? 'border-green-200' : 'border-gray-100'}`}>
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-gray-800 text-base">{isCBC ? '🌱' : '🎓'} {form.form_name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                            {isCBC ? 'CBC' : '8-4-4'} · Level {form.form_level} · {selExam}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {isLocked ? '🔒 Locked' : '🔓 Open'}
                                        </span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isReleased ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {isReleased ? '📱 Released' : 'Unreleased'}
                                        </span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                                    {[{ l:'Marks', v: marks }, { l:'Parents', v: parents }, { l:'Level', v: form.form_level }].map(s => (
                                        <div key={s.l} className="text-center">
                                            <p className="text-lg font-black text-gray-800">{s.v}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p>
                                        </div>
                                    ))}
                                </div>

                                {release?.released_by && (
                                    <p className="text-xs text-gray-400">Released by <strong>{release.released_by}</strong> · {fmt(release.released_at)}</p>
                                )}
                                {lock?.locked_by && (
                                    <p className="text-xs text-gray-400">Locked by <strong>{lock.locked_by}</strong> · {fmt(lock.locked_at)}</p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => toggleLock(form.id, form.form_name, isLocked)}
                                        className={`px-3 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 ${isLocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                        {isLocked ? <><FiUnlock size={11}/> Unlock</> : <><FiLock size={11}/> Lock</>}
                                    </button>
                                    {isReleased ? (
                                        <button onClick={() => revokeRelease(form.id)}
                                            className="px-3 py-2 text-xs font-black text-red-700 bg-red-50 hover:bg-red-100 rounded-xl flex items-center gap-1">
                                            <FiLock size={11}/> Revoke
                                        </button>
                                    ) : (
                                        <button onClick={() => releaseForm(form.id, form.form_name)} disabled={saving === fKey}
                                            className="px-3 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow disabled:opacity-50">
                                            <FiSend size={11}/> {saving === fKey ? 'Releasing…' : 'Release Form'}
                                        </button>
                                    )}
                                </div>

                                {/* Per-stream release */}
                                <details className="group">
                                    <summary className="cursor-pointer text-[11px] font-bold text-indigo-600 hover:text-indigo-800 list-none flex items-center gap-1 mt-1">
                                        <FiChevronDown size={11} className="group-open:rotate-180 transition-transform"/>
                                        Release by Individual Stream
                                    </summary>
                                    <div className="mt-2 space-y-1.5 pl-2">
                                        {streams.map(stream => {
                                            const sRel = releases.find(r =>
                                                r.form_id === form.id && r.stream_id === stream.id &&
                                                String(r.term_id) === selTerm && r.exam_type === selExam && r.is_released
                                            );
                                            const sk = 'f' + form.id + '_s' + stream.id;
                                            return (
                                                <div key={stream.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                                                    <span className="text-xs font-semibold text-gray-700">
                                                        {form.form_name} {stream.stream_name}
                                                    </span>
                                                    <div className="flex gap-1.5 items-center">
                                                        {sRel && (
                                                            <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Released</span>
                                                        )}
                                                        {sRel ? (
                                                            <button onClick={() => revokeRelease(form.id, stream.id)}
                                                                className="text-[10px] font-bold text-red-600 hover:text-red-800 underline">
                                                                Revoke
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => releaseForm(form.id, form.form_name, stream.id, stream.stream_name)}
                                                                disabled={saving === sk}
                                                                className="text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
                                                                {saving === sk ? '…' : 'Release'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </details>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MOBILE PARENTS TABLE */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <p className="font-black text-gray-800">
                        👪 Registered Mobile Parents ({mobileUsers.filter(mu => !selForm || (mu.school_students as any)?.form_id === Number(selForm)).length})
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Parents with active APSIMS app accounts</p>
                </div>
                {mobileUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiSmartphone size={36} className="text-gray-200 mx-auto mb-3"/>
                        <p className="text-gray-400 font-bold">No mobile parents registered yet</p>
                        <p className="text-xs text-gray-300 mt-1">Parents self-register using their guardian phone in the APSIMS app</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['#','Guardian','Phone','Student','Form','Adm No.','Status','Last Login'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {mobileUsers
                                    .filter(mu => !selForm || (mu.school_students as any)?.form_id === Number(selForm))
                                    .map((mu, idx) => {
                                        const st = mu.school_students as any;
                                        return (
                                            <tr key={mu.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{idx+1}</td>
                                                <td className="px-4 py-2.5 font-bold text-gray-800 text-xs whitespace-nowrap">{mu.guardian_name || '—'}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{mu.guardian_phone}</td>
                                                <td className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap">
                                                    {st ? (st.first_name + ' ' + st.last_name) : ('#' + mu.student_id)}
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{st?.school_forms?.form_name || '—'}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{st?.admission_number || '—'}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${mu.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                        {mu.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                                                    {mu.last_login ? fmt(mu.last_login) : 'Never'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
