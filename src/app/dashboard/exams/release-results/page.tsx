'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSend, FiLock, FiUnlock, FiRefreshCw, FiCheckCircle,
    FiAlertTriangle, FiUsers, FiSmartphone, FiBell, FiEye,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

export default function ReleaseResultsPage() {
    const [terms, setTerms]       = useState<any[]>([]);
    const [forms, setForms]       = useState<any[]>([]);
    const [releases, setReleases] = useState<any[]>([]);
    const [locks, setLocks]       = useState<any[]>([]);
    const [marks, setMarks]       = useState<any[]>([]);
    const [mobileUsers, setMobileUsers] = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState<string|null>(null);

    const [selTerm, setSelTerm]     = useState('');
    const [selExam, setSelExam]     = useState('End-Term');
    const [releaseMsg, setReleaseMsg] = useState('Dear Parent, your child\'s results for this term are now available. Open the APSIMS app to view the full report card.');

    const EXAM_TYPES = ['End-Term','Mid-Term','CAT 1','CAT 2','Mock','Pre-Mock'];

    const load = useCallback(async () => {
        setLoading(true);
        const [tRes, fRes, relRes, lockRes, muRes] = await Promise.all([
            supabase.from('school_terms').select('*').order('id', { ascending:false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_report_releases').select('*').order('released_at', { ascending:false }),
            supabase.from('school_marks_lock').select('*'),
            supabase.from('school_mobile_users').select('*').eq('is_active', true),
        ]);
        setTerms(tRes.data || []);
        setForms(fRes.data || []);
        setReleases(relRes.data || []);
        setLocks(lockRes.data || []);
        setMobileUsers(muRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current) || (tRes.data || [])[0];
        if (cur && !selTerm) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    /* Fetch marks count for selected term */
    useEffect(() => {
        if (!selTerm) return;
        supabase.from('school_exam_marks').select('student_id,subject_id').eq('term_id', Number(selTerm)).eq('exam_type', selExam)
            .then(r => setMarks(r.data || []));
    }, [selTerm, selExam]);

    const getTerm = (id: any) => terms.find(t => String(t.id) === String(id));
    const getForm = (id: any) => forms.find(f => f.id === id)?.form_name || '—';

    /* Per-form release status */
    const formReleaseStatus = useMemo(() => forms.map(f => {
        const rel = releases.find(r => String(r.term_id) === selTerm && r.form_id === f.id && r.exam_type === selExam);
        const lock = locks.find(l => String(l.term_id) === selTerm && l.form_id === f.id && l.exam_type === selExam);
        const markCount = marks.filter(m => {
            // approximate — we don't have form_id on marks directly
            return true;
        }).length;
        return { form: f, release: rel, lock, markCount };
    }), [forms, releases, locks, marks, selTerm, selExam]);

    /* Global release (all forms at once) */
    const globalRelease = releases.find(r => String(r.term_id) === selTerm && !r.form_id && r.exam_type === selExam);

    /* ─── RELEASE to mobile (all forms) ─── */
    const releaseAll = async () => {
        if (!selTerm) return toast.error('Select a term');
        if (!confirm(`Release ${getTerm(selTerm)?.term_name} ${selExam} results to ALL parents on mobile app?`)) return;

        setSaving('all');
        const { data: session } = await supabase.auth.getSession();
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');

        // Upsert global release record
        const { error } = await supabase.from('school_report_releases').upsert({
            term_id:         Number(selTerm),
            form_id:         null,
            exam_type:       selExam,
            is_released:     true,
            released_by:     user.full_name || user.username || 'System',
            released_at:     new Date().toISOString(),
            release_message: releaseMsg,
            release_type:    'full',
        }, { onConflict: 'term_id,form_id,exam_type', ignoreDuplicates: false });

        if (error) { toast.error('Release failed: ' + error.message); setSaving(null); return; }

        // Create notification records for all mobile users
        const notifInserts = mobileUsers.map(mu => ({
            student_id:     mu.student_id,
            guardian_phone: mu.guardian_phone,
            title:          `📋 ${getTerm(selTerm)?.term_name} Results Released`,
            body:           releaseMsg,
            type:           'results',
            data:           { term_id: Number(selTerm), exam_type: selExam },
        }));
        if (notifInserts.length > 0) {
            await supabase.from('school_mobile_notifications').insert(notifInserts);
        }

        setSaving(null);
        toast.success(`✅ Results released to ${mobileUsers.length} parent(s) on mobile app!`);
        load();
    };

    /* ─── RELEASE per form ─── */
    const releaseForm = async (formId: number, formName: string) => {
        if (!selTerm) return;
        setSaving(`form_${formId}`);
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');

        await supabase.from('school_report_releases').upsert({
            term_id:         Number(selTerm),
            form_id:         formId,
            exam_type:       selExam,
            is_released:     true,
            released_by:     user.full_name || user.username || 'System',
            released_at:     new Date().toISOString(),
            release_message: releaseMsg,
            release_type:    'full',
        }, { onConflict: 'term_id,form_id,exam_type', ignoreDuplicates: false });

        setSaving(null);
        toast.success(`✅ ${formName} ${selExam} results released to mobile!`);
        load();
    };

    /* ─── REVOKE ─── */
    const revokeRelease = async (formId: number | null) => {
        if (!confirm('Revoke this release? Parents will no longer see results.')) return;
        setSaving('revoke');
        let q = supabase.from('school_report_releases').update({ is_released: false }).eq('term_id', Number(selTerm)).eq('exam_type', selExam);
        if (formId === null) q = q.is('form_id', null);
        else q = q.eq('form_id', formId);
        await q;
        setSaving(null);
        toast.success('Release revoked');
        load();
    };

    /* ─── LOCK/UNLOCK marks ─── */
    const toggleLock = async (formId: number, formName: string, currentlyLocked: boolean) => {
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');
        const userName = user.full_name || user.username || 'System';

        await supabase.from('school_marks_lock').upsert({
            term_id:      Number(selTerm),
            form_id:      formId,
            exam_type:    selExam,
            is_locked:    !currentlyLocked,
            locked_by:    !currentlyLocked ? userName : undefined,
            locked_at:    !currentlyLocked ? new Date().toISOString() : undefined,
            unlocked_by:  currentlyLocked ? userName : undefined,
            unlocked_at:  currentlyLocked ? new Date().toISOString() : undefined,
        }, { onConflict: 'term_id,form_id,exam_type', ignoreDuplicates: false });

        toast.success(!currentlyLocked ? `🔒 ${formName} marks locked` : `🔓 ${formName} marks unlocked`);
        load();
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"/></div>;

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background:'linear-gradient(135deg,#0c4a6e,#0891b2,#059669)' }}>
                <h1 className="text-2xl font-black flex items-center gap-2">📱 Release Results to Mobile App</h1>
                <p className="text-sm text-white/70 mt-1">Control when parents can see results on the APSIMS parent mobile app</p>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { l:'Mobile Parents', v: mobileUsers.length, i:'📱' },
                        { l:'Released This Term', v: releases.filter(r => String(r.term_id) === selTerm && r.is_released).length, i:'✅' },
                        { l:'Marks Entered', v: marks.length, i:'📊' },
                        { l:'Locked Forms', v: locks.filter(l => String(l.term_id) === selTerm && l.is_locked).length, i:'🔒' },
                    ].map(k => (
                        <div key={k.l} className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-sm">{k.i}</p>
                            <p className="text-2xl font-black text-white">{k.v}</p>
                            <p className="text-[10px] text-white/60 uppercase font-bold">{k.l}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-3 mt-4 max-w-xl">
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase mb-1">Term</p>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white">
                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year||''}</option>)}
                        </select>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase mb-1">Exam Type</p>
                        <select value={selExam} onChange={e => setSelExam(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white">
                            {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ═══ GLOBAL RELEASE CARD ═══ */}
            <div className={`rounded-2xl border-2 p-5 ${globalRelease?.is_released ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="font-black text-gray-800 text-lg flex items-center gap-2">
                            {globalRelease?.is_released ? '✅' : '🔒'} Global Release — All Forms
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {globalRelease?.is_released
                                ? `Released by ${globalRelease.released_by} on ${fmt(globalRelease.released_at)}`
                                : `Not yet released — parents cannot see ${getTerm(selTerm)?.term_name} ${selExam} results`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {globalRelease?.is_released ? (
                            <button onClick={() => revokeRelease(null)} disabled={saving === 'revoke'}
                                className="px-5 py-2.5 text-sm font-black text-white bg-red-500 hover:bg-red-600 rounded-xl transition flex items-center gap-2 shadow">
                                <FiLock size={13}/> Revoke Release
                            </button>
                        ) : (
                            <button onClick={releaseAll} disabled={saving === 'all'}
                                className="px-6 py-3 text-sm font-black text-white rounded-xl transition flex items-center gap-2 shadow-lg"
                                style={{ background:'linear-gradient(135deg,#059669,#0891b2)' }}>
                                <FiSend size={13}/> {saving === 'all' ? 'Releasing…' : `🚀 Release to ${mobileUsers.length} Parents`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Release message customization */}
                <div className="mt-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notification Message to Parents</label>
                    <textarea value={releaseMsg} onChange={e => setReleaseMsg(e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white"/>
                </div>
            </div>

            {/* ═══ PER-FORM CARDS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formReleaseStatus.map(({ form, release, lock }) => {
                    const isReleased = release?.is_released || false;
                    const isLocked   = lock?.is_locked !== false; // default locked
                    const isSavingForm = saving === `form_${form.id}`;

                    return (
                        <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                            {/* Form header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-black text-gray-800 text-base">{form.form_name}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">{selExam}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {isLocked ? '🔒 Locked' : '🔓 Open'}
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isReleased ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {isReleased ? '📱 Released' : '🕐 Unreleased'}
                                    </span>
                                </div>
                            </div>

                            {/* Info row */}
                            {release?.released_by && (
                                <p className="text-xs text-gray-400">Released by {release.released_by} · {fmt(release.released_at)}</p>
                            )}
                            {lock?.locked_by && (
                                <p className="text-xs text-gray-400">Locked by {lock.locked_by} · {fmt(lock.locked_at)}</p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                                {/* Lock/Unlock marks */}
                                <button onClick={() => toggleLock(form.id, form.form_name, isLocked)}
                                    className={`px-3 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${isLocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                    {isLocked ? <><FiUnlock size={11}/> Unlock Marks</> : <><FiLock size={11}/> Lock Marks</>}
                                </button>

                                {/* Release/Revoke */}
                                {isReleased ? (
                                    <button onClick={() => revokeRelease(form.id)}
                                        className="px-3 py-2 text-xs font-black text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition flex items-center gap-1.5">
                                        <FiLock size={11}/> Revoke
                                    </button>
                                ) : (
                                    <button onClick={() => releaseForm(form.id, form.form_name)} disabled={isSavingForm}
                                        className="px-3 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow disabled:opacity-50">
                                        <FiSend size={11}/> {isSavingForm ? 'Releasing…' : 'Release to Mobile'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ MOBILE USERS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <p className="font-black text-gray-800">📱 Registered Mobile Parents ({mobileUsers.length})</p>
                    <p className="text-xs text-gray-400 mt-0.5">Parents who have activated the APSIMS mobile app with a PIN</p>
                </div>
                {mobileUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiSmartphone size={36} className="text-gray-200 mx-auto mb-3"/>
                        <p className="text-gray-400 font-bold">No mobile parents registered yet</p>
                        <p className="text-xs text-gray-300 mt-1">Parents self-register in the APSIMS APK using their guardian phone number</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                {['Guardian','Phone','Student Linked','Status','Last Login'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {mobileUsers.map(mu => (
                                <tr key={mu.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{mu.guardian_name || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{mu.guardian_phone}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-400">Student #{mu.student_id}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${mu.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {mu.is_active ? '✅ Active' : '❌ Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-gray-400">{mu.last_login ? fmt(mu.last_login) : 'Never'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
