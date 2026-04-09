'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiGrid, FiSettings, FiEdit3, FiEye, FiUser, FiBarChart2,
    FiPlus, FiTrash2, FiSave, FiPrinter, FiCheck, FiX,
    FiZap, FiList, FiClock, FiAlertTriangle, FiRefreshCw,
    FiChevronDown, FiChevronUp, FiTarget, FiSliders, FiCopy
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────
type TTab = 'requirements' | 'generate' | 'build' | 'class' | 'teacher' | 'stats' | 'setup';

interface Period { id: number; period_number: number; period_name: string; start_time: string; end_time: string; period_type: string; }
interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; }
interface Subject { id: number; subject_name: string; subject_code?: string; }
interface Teacher { id: number; first_name: string; last_name: string; tsc_number?: string; status: string; }
interface Requirement { id?: number; form_id: number; stream_id: number; subject_id: number; teacher_id: number | null; lessons_per_week: number; max_per_day: number; allow_double: boolean; term: string; year: number; }
interface Entry { id?: number; day_of_week: string; period_id: number; form_id: number; stream_id: number; subject_id: number | null; teacher_id: number | null; room: string | null; is_double: boolean; term: string; year: number; }
interface UnplacedCard { req: Requirement; remaining: number; reason: string; }
interface GenSettings { maxConsecutiveSameSubject: number; spreadEvenly: boolean; avoidLastPeriod: string[]; maxTeacherLessonsPerDay: number; }

// ─── Constants ───────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };

// ─── Subject Color System (ASC-style) ────────────────────────────
const SUBJECT_COLORS = [
    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },  // Blue
    { bg: '#dcfce7', text: '#166534', border: '#86efac' },  // Green
    { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },  // Amber
    { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },  // Pink
    { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },  // Indigo
    { bg: '#fed7d7', text: '#9b2c2c', border: '#feb2b2' },  // Red
    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },  // Emerald
    { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },  // Violet
    { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },  // Orange
    { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },  // Cyan
    { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },  // Yellow
    { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },  // Purple
    { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },  // Sky
    { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1' },  // Rose
    { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },  // Light Green
    { bg: '#fff3e0', text: '#e65100', border: '#ffb74d' },  // Deep Orange
];

function getSubjectColor(subjectId: number, subjects: Subject[]) {
    const idx = subjects.findIndex(s => s.id === subjectId);
    return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
}

// ─── Auto-Generation Algorithm ───────────────────────────────────
interface Card { reqId: number; formId: number; streamId: number; subjectId: number; teacherId: number | null; lessonIndex: number; maxPerDay: number; }

function autoGenerateTimetable(
    requirements: Requirement[],
    lessonPeriods: Period[],
    existingEntries: Entry[],
    settings: GenSettings,
    term: string,
    year: number,
): { placed: Entry[]; unplaced: UnplacedCard[] } {
    const placed: Entry[] = [];
    const unplaced: UnplacedCard[] = [];

    // Build grid: track what's placed where
    // grid[day][periodId] = { classKey -> entry, teacherId -> entry }
    const classGrid: Record<string, Record<number, Record<string, Entry>>> = {};
    const teacherGrid: Record<string, Record<number, Set<number>>> = {};

    DAYS.forEach(day => {
        classGrid[day] = {};
        teacherGrid[day] = {};
        lessonPeriods.forEach(p => {
            classGrid[day][p.id] = {};
            teacherGrid[day][p.id] = new Set();
        });
    });

    // Pre-populate from existing entries (keep manually placed ones)
    existingEntries.forEach(e => {
        if (e.term === term && e.year === year) {
            const ck = `${e.form_id}-${e.stream_id}`;
            if (classGrid[e.day_of_week]?.[e.period_id]) {
                classGrid[e.day_of_week][e.period_id][ck] = e;
                if (e.teacher_id) teacherGrid[e.day_of_week][e.period_id].add(e.teacher_id);
            }
        }
    });

    // Create cards from requirements
    const cards: Card[] = [];
    requirements.forEach(req => {
        if (req.term !== term || req.year !== year) return;
        // Count how many are already placed for this requirement
        const ck = `${req.form_id}-${req.stream_id}`;
        let alreadyPlaced = 0;
        DAYS.forEach(day => {
            lessonPeriods.forEach(p => {
                const entry = classGrid[day][p.id][ck];
                if (entry && entry.subject_id === req.subject_id) alreadyPlaced++;
            });
        });
        const remaining = Math.max(0, req.lessons_per_week - alreadyPlaced);
        for (let i = 0; i < remaining; i++) {
            cards.push({
                reqId: req.id || 0,
                formId: req.form_id,
                streamId: req.stream_id,
                subjectId: req.subject_id,
                teacherId: req.teacher_id,
                lessonIndex: i,
                maxPerDay: req.max_per_day,
            });
        }
    });

    // Sort cards by most constrained first
    cards.sort((a, b) => {
        // Cards with a specific teacher are more constrained
        const aHasTeacher = a.teacherId ? 1 : 0;
        const bHasTeacher = b.teacherId ? 1 : 0;
        if (bHasTeacher !== aHasTeacher) return bHasTeacher - aHasTeacher;
        // Fewer max per day = more constrained
        if (a.maxPerDay !== b.maxPerDay) return a.maxPerDay - b.maxPerDay;
        return 0;
    });

    // Helper: count subject lessons on a day for a class
    const countSubjectOnDay = (day: string, formId: number, streamId: number, subjectId: number): number => {
        const ck = `${formId}-${streamId}`;
        let count = 0;
        lessonPeriods.forEach(p => {
            const entry = classGrid[day][p.id][ck];
            if (entry && entry.subject_id === subjectId) count++;
        });
        return count;
    };

    // Helper: count teacher lessons on a day
    const countTeacherOnDay = (day: string, teacherId: number): number => {
        let count = 0;
        lessonPeriods.forEach(p => {
            if (teacherGrid[day][p.id].has(teacherId)) count++;
        });
        return count;
    };

    // Helper: check consecutive same subject
    const wouldCreateExcessiveConsecutive = (day: string, periodIdx: number, formId: number, streamId: number, subjectId: number): boolean => {
        const ck = `${formId}-${streamId}`;
        let consecutive = 1;

        // Check before
        for (let i = periodIdx - 1; i >= 0; i--) {
            const entry = classGrid[day][lessonPeriods[i].id]?.[ck];
            if (entry && entry.subject_id === subjectId) consecutive++;
            else break;
        }
        // Check after
        for (let i = periodIdx + 1; i < lessonPeriods.length; i++) {
            const entry = classGrid[day][lessonPeriods[i].id]?.[ck];
            if (entry && entry.subject_id === subjectId) consecutive++;
            else break;
        }

        return consecutive > settings.maxConsecutiveSameSubject;
    };

    // Try to place each card
    for (const card of cards) {
        const ck = `${card.formId}-${card.streamId}`;
        let bestSlot: { day: string; periodId: number; score: number } | null = null;

        // Shuffle days for randomness (better distribution)
        const shuffledDays = [...DAYS].sort(() => Math.random() - 0.3);

        for (const day of shuffledDays) {
            // Check max per day constraint
            const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
            if (dayCount >= card.maxPerDay) continue;

            for (let pi = 0; pi < lessonPeriods.length; pi++) {
                const period = lessonPeriods[pi];

                // Slot must be empty for this class
                if (classGrid[day][period.id][ck]) continue;

                // Teacher must be free
                if (card.teacherId && teacherGrid[day][period.id].has(card.teacherId)) continue;

                // Check teacher max lessons per day
                if (card.teacherId && countTeacherOnDay(day, card.teacherId) >= settings.maxTeacherLessonsPerDay) continue;

                // Check consecutive constraint
                if (wouldCreateExcessiveConsecutive(day, pi, card.formId, card.streamId, card.subjectId)) continue;

                // Score this slot (higher = better)
                let score = 100;

                // Prefer days where this subject isn't placed yet (spreading)
                if (settings.spreadEvenly) {
                    score -= dayCount * 30;
                }

                // Prefer earlier periods slightly
                score -= pi * 0.5;

                // Add slight randomness
                score += Math.random() * 5;

                // Prefer middle periods over first/last
                if (pi === 0 || pi === lessonPeriods.length - 1) score -= 5;

                if (!bestSlot || score > bestSlot.score) {
                    bestSlot = { day, periodId: period.id, score };
                }
            }
        }

        if (bestSlot) {
            const entry: Entry = {
                day_of_week: bestSlot.day,
                period_id: bestSlot.periodId,
                form_id: card.formId,
                stream_id: card.streamId,
                subject_id: card.subjectId,
                teacher_id: card.teacherId,
                room: null,
                is_double: false,
                term, year,
            };
            classGrid[bestSlot.day][bestSlot.periodId][ck] = entry;
            if (card.teacherId) teacherGrid[bestSlot.day][bestSlot.periodId].add(card.teacherId);
            placed.push(entry);
        } else {
            // Find the requirement for this card to report
            const req = requirements.find(r => r.form_id === card.formId && r.stream_id === card.streamId && r.subject_id === card.subjectId && r.term === term && r.year === year);
            if (req) {
                const existing = unplaced.find(u => u.req.form_id === req.form_id && u.req.stream_id === req.stream_id && u.req.subject_id === req.subject_id);
                if (existing) {
                    existing.remaining++;
                } else {
                    unplaced.push({
                        req,
                        remaining: 1,
                        reason: card.teacherId
                            ? 'Teacher has no available slots (busy or max lessons reached)'
                            : 'No available slots for this class (all periods full)',
                    });
                }
            }
        }
    }

    return { placed, unplaced };
}

// ─── Main Component ──────────────────────────────────────────────
export default function TimetablePage() {
    const [tab, setTab] = useState<TTab>('requirements');
    const [periods, setPeriods] = useState<Period[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [loading, setLoading] = useState(true);

    // Term/year selectors
    const [bTerm, setBTerm] = useState('Term 1');
    const [bYear, setBYear] = useState(new Date().getFullYear());

    // Build tab
    const [bForm, setBForm] = useState('');
    const [bStream, setBStream] = useState('');
    const [editCell, setEditCell] = useState<{ day: string; periodId: number } | null>(null);
    const [cellSubject, setCellSubject] = useState('');
    const [cellTeacher, setCellTeacher] = useState('');
    const [cellRoom, setCellRoom] = useState('');
    const [savingCell, setSavingCell] = useState(false);

    // Class view
    const [cForm, setCForm] = useState('');
    const [cStream, setCStream] = useState('');

    // Teacher view
    const [tTeacher, setTTeacher] = useState('');

    // Setup
    const [editPeriod, setEditPeriod] = useState<any>(null);
    const [newPeriod, setNewPeriod] = useState({ period_number: 0, period_name: '', start_time: '', end_time: '', period_type: 'lesson' });

    // Requirements tab
    const [reqForm, setReqForm] = useState('');
    const [reqStream, setReqStream] = useState('');
    const [showAddReq, setShowAddReq] = useState(false);
    const [newReqSubject, setNewReqSubject] = useState('');
    const [newReqTeacher, setNewReqTeacher] = useState('');
    const [newReqLessons, setNewReqLessons] = useState(3);
    const [newReqMaxPerDay, setNewReqMaxPerDay] = useState(2);
    const [savingReq, setSavingReq] = useState(false);

    // Generate tab
    const [generating, setGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [genResults, setGenResults] = useState<{ placed: Entry[]; unplaced: UnplacedCard[] } | null>(null);
    const [genSettings, setGenSettings] = useState<GenSettings>({
        maxConsecutiveSameSubject: 2,
        spreadEvenly: true,
        avoidLastPeriod: [],
        maxTeacherLessonsPerDay: 7,
    });
    const [showGenSettings, setShowGenSettings] = useState(false);

    // ─── Data Fetching ───────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [p, e, f, st, su, t, req] = await Promise.all([
            supabase.from('school_timetable_periods').select('*').order('period_number'),
            supabase.from('school_timetable_entries').select('*').order('day_of_week'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_timetable_requirements').select('*').order('form_id'),
        ]);
        setPeriods(p.data || []);
        setEntries(e.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(su.data || []);
        setTeachers(t.data || []);
        setRequirements(req.data || []);
        if (f.data?.length && !bForm) setBForm(String(f.data[0].id));
        if (st.data?.length && !bStream) setBStream(String(st.data[0].id));
        if (f.data?.length && !cForm) setCForm(String(f.data[0].id));
        if (st.data?.length && !cStream) setCStream(String(st.data[0].id));
        if (f.data?.length && !reqForm) setReqForm(String(f.data[0].id));
        if (st.data?.length && !reqStream) setReqStream(String(st.data[0].id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const lessonPeriods = periods.filter(p => p.period_type === 'lesson');
    const allPeriodsSorted = [...periods].sort((a, b) => a.period_number - b.period_number);

    // ─── Helpers ─────────────────────────────────────────────────
    const getSubjectName = (id: any) => subjects.find(s => s.id === id)?.subject_name || '';
    const getSubjectCode = (id: any) => {
        const s = subjects.find(x => x.id === id);
        return s?.subject_code || s?.subject_name?.substring(0, 4).toUpperCase() || '';
    };
    const getTeacherName = (id: any) => { const t = teachers.find(x => x.id === id); return t ? `${t.first_name} ${t.last_name}` : ''; };
    const getTeacherShort = (id: any) => { const t = teachers.find(x => x.id === id); return t ? `${t.first_name?.charAt(0)}. ${t.last_name}` : ''; };
    const getFormName = (id: any) => forms.find(f => f.id === id)?.form_name || '';
    const getStreamName = (id: any) => streams.find(s => s.id === id)?.stream_name || '';

    const getEntry = (day: string, periodId: number, formId?: number, streamId?: number) => {
        const fid = formId || Number(bForm);
        const sid = streamId || Number(bStream);
        return entries.find(e => e.day_of_week === day && e.period_id === periodId && e.form_id === fid && e.stream_id === sid && e.term === bTerm && e.year === bYear);
    };

    const isTeacherBusy = (teacherId: number, day: string, periodId: number, excludeFormId?: number, excludeStreamId?: number) => {
        return entries.find(e => e.teacher_id === teacherId && e.day_of_week === day && e.period_id === periodId && e.term === bTerm && e.year === bYear &&
            !(e.form_id === excludeFormId && e.stream_id === excludeStreamId));
    };

    // Get current requirements for selected class
    const classRequirements = requirements.filter(r => r.form_id === Number(reqForm) && r.stream_id === Number(reqStream) && r.term === bTerm && r.year === bYear);
    const totalRequiredLessons = classRequirements.reduce((sum, r) => sum + r.lessons_per_week, 0);
    const totalAvailableSlots = lessonPeriods.length * DAYS.length;

    // ─── Requirement Handlers ────────────────────────────────────
    const handleAddRequirement = async () => {
        if (!newReqSubject || !reqForm || !reqStream) { toast.error('Select a subject'); return; }
        setSavingReq(true);
        const data = {
            form_id: Number(reqForm), stream_id: Number(reqStream), subject_id: Number(newReqSubject),
            teacher_id: newReqTeacher ? Number(newReqTeacher) : null,
            lessons_per_week: newReqLessons, max_per_day: newReqMaxPerDay, allow_double: false,
            term: bTerm, year: bYear,
        };
        const { error } = await supabase.from('school_timetable_requirements').upsert([data], {
            onConflict: 'form_id,stream_id,subject_id,term,year'
        });
        if (error) toast.error(error.message);
        else { toast.success('Requirement saved'); setShowAddReq(false); setNewReqSubject(''); setNewReqTeacher(''); setNewReqLessons(3); }
        await fetchAll(); setSavingReq(false);
    };

    const handleDeleteRequirement = async (id: number) => {
        if (!confirm('Remove this subject requirement?')) return;
        await supabase.from('school_timetable_requirements').delete().eq('id', id);
        toast.success('Removed'); fetchAll();
    };

    const handleUpdateReqLessons = async (req: Requirement, newLessons: number) => {
        if (newLessons < 1 || newLessons > 10) return;
        await supabase.from('school_timetable_requirements').update({ lessons_per_week: newLessons }).eq('id', req.id);
        fetchAll();
    };

    const handleUpdateReqTeacher = async (req: Requirement, teacherId: string) => {
        await supabase.from('school_timetable_requirements').update({ teacher_id: teacherId ? Number(teacherId) : null }).eq('id', req.id);
        fetchAll();
    };

    const handleCopyRequirements = async () => {
        // Copy requirements from current class to all other streams of same form
        if (!confirm(`Copy all requirements from ${getFormName(Number(reqForm))} ${getStreamName(Number(reqStream))} to all other streams of ${getFormName(Number(reqForm))}?`)) return;
        const sourceReqs = classRequirements;
        if (!sourceReqs.length) { toast.error('No requirements to copy'); return; }

        const targetStreams = streams.filter(s => String(s.id) !== reqStream);
        let count = 0;
        for (const stream of targetStreams) {
            for (const req of sourceReqs) {
                const data = {
                    form_id: req.form_id, stream_id: stream.id, subject_id: req.subject_id,
                    teacher_id: null, // Don't copy teacher assignments
                    lessons_per_week: req.lessons_per_week, max_per_day: req.max_per_day,
                    allow_double: req.allow_double, term: bTerm, year: bYear,
                };
                await supabase.from('school_timetable_requirements').upsert([data], {
                    onConflict: 'form_id,stream_id,subject_id,term,year'
                });
                count++;
            }
        }
        toast.success(`Copied ${count} requirements to ${targetStreams.length} streams`);
        fetchAll();
    };

    // ─── Auto-Generate Handlers ──────────────────────────────────
    const handleGenerate = async () => {
        if (requirements.length === 0) {
            toast.error('Add lesson requirements first (Requirements tab)');
            return;
        }

        const confirmed = entries.filter(e => e.term === bTerm && e.year === bYear).length > 0
            ? confirm('This will CLEAR all existing timetable entries for this term and regenerate. Continue?')
            : true;
        if (!confirmed) return;

        setGenerating(true);
        setGenProgress(0);
        setGenResults(null);

        // Clear existing entries for this term
        await supabase.from('school_timetable_entries').delete().eq('term', bTerm).eq('year', bYear);
        setGenProgress(20);

        // Small delay for UI
        await new Promise(r => setTimeout(r, 300));

        // Run the algorithm
        const termReqs = requirements.filter(r => r.term === bTerm && r.year === bYear);
        setGenProgress(40);
        await new Promise(r => setTimeout(r, 200));

        const result = autoGenerateTimetable(termReqs, lessonPeriods, [], genSettings, bTerm, bYear);
        setGenProgress(70);
        await new Promise(r => setTimeout(r, 200));

        // Save placed entries to database
        if (result.placed.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < result.placed.length; i += batchSize) {
                const batch = result.placed.slice(i, i + batchSize).map(e => ({
                    day_of_week: e.day_of_week, period_id: e.period_id, form_id: e.form_id,
                    stream_id: e.stream_id, subject_id: e.subject_id, teacher_id: e.teacher_id,
                    room: e.room, is_double: e.is_double, term: e.term, year: e.year,
                }));
                const { error } = await supabase.from('school_timetable_entries').insert(batch);
                if (error) {
                    console.error('Insert error:', error);
                    toast.error(`Error saving batch: ${error.message}`);
                }
                setGenProgress(70 + Math.round((i / result.placed.length) * 25));
            }
        }

        setGenProgress(100);
        setGenResults(result);
        await fetchAll();
        setGenerating(false);

        if (result.unplaced.length === 0) {
            toast.success(`🎉 Perfect! All ${result.placed.length} lessons placed successfully!`);
        } else {
            toast(`${result.placed.length} placed, ${result.unplaced.reduce((s, u) => s + u.remaining, 0)} couldn't be placed`, { icon: '⚠️' });
        }
    };

    // ─── Build Tab Handlers ──────────────────────────────────────
    const handleSaveCell = async () => {
        if (!editCell || !bForm || !bStream) return;
        setSavingCell(true);
        const { day, periodId } = editCell;
        const existing = getEntry(day, periodId);

        if (!cellSubject) {
            if (existing) {
                await supabase.from('school_timetable_entries').delete().eq('id', existing.id);
                toast.success('Slot cleared');
            }
        } else {
            if (cellTeacher) {
                const conflict = isTeacherBusy(Number(cellTeacher), day, periodId, Number(bForm), Number(bStream));
                if (conflict) {
                    toast.error(`⚠️ ${getTeacherName(Number(cellTeacher))} is already teaching ${getFormName(conflict.form_id)} ${getStreamName(conflict.stream_id)}`);
                    setSavingCell(false); return;
                }
            }
            const data = {
                day_of_week: day, period_id: periodId, form_id: Number(bForm), stream_id: Number(bStream),
                subject_id: Number(cellSubject) || null, teacher_id: Number(cellTeacher) || null,
                room: cellRoom || null, term: bTerm, year: bYear,
            };
            if (existing) {
                await supabase.from('school_timetable_entries').update(data).eq('id', existing.id);
            } else {
                await supabase.from('school_timetable_entries').upsert([data], { onConflict: 'day_of_week,period_id,form_id,stream_id,term,year' });
            }
            toast.success('Saved');
        }
        setEditCell(null); setCellSubject(''); setCellTeacher(''); setCellRoom('');
        await fetchAll(); setSavingCell(false);
    };

    const openEdit = (day: string, periodId: number) => {
        const ex = getEntry(day, periodId);
        setEditCell({ day, periodId });
        setCellSubject(ex?.subject_id ? String(ex.subject_id) : '');
        setCellTeacher(ex?.teacher_id ? String(ex.teacher_id) : '');
        setCellRoom(ex?.room || '');
    };

    // Period setup
    const handleSavePeriod = async (p: any) => {
        const { error } = await supabase.from('school_timetable_periods').update({
            period_name: p.period_name, start_time: p.start_time, end_time: p.end_time, period_type: p.period_type
        }).eq('id', p.id);
        if (error) toast.error(error.message); else { toast.success('Period updated'); setEditPeriod(null); fetchAll(); }
    };

    const handleAddPeriod = async () => {
        if (!newPeriod.period_name || !newPeriod.start_time || !newPeriod.end_time) { toast.error('Fill all fields'); return; }
        const num = periods.length ? Math.max(...periods.map(p => p.period_number)) + 1 : 1;
        await supabase.from('school_timetable_periods').insert([{ ...newPeriod, period_number: num }]);
        toast.success('Period added'); setNewPeriod({ period_number: 0, period_name: '', start_time: '', end_time: '', period_type: 'lesson' }); fetchAll();
    };

    const handleDeletePeriod = async (id: number) => {
        if (!confirm('Delete this period? Related entries will also be removed.')) return;
        await supabase.from('school_timetable_entries').delete().eq('period_id', id);
        await supabase.from('school_timetable_periods').delete().eq('id', id);
        toast.success('Deleted'); fetchAll();
    };

    // ─── Print ───────────────────────────────────────────────────
    const printTimetable = (title: string, rows: { period: string; time: string; type: string; cells: { subj: string; teacher: string; room: string; color?: typeof SUBJECT_COLORS[0] }[] }[]) => {
        const w = window.open('', '_blank'); if (!w) return;
        const dayHeaders = DAYS.map(d => `<th style="background:#1e40af;color:#fff;padding:10px 8px;font-size:11px;text-align:center;border:1px solid #1e3a8a">${d}</th>`).join('');
        const bodyRows = rows.map(r => {
            if (r.type !== 'lesson') {
                return `<tr><td style="background:#fef3c7;padding:8px;font-size:10px;font-weight:700;border:1px solid #e5e7eb;text-align:center;color:#92400e" colspan="${DAYS.length + 2}">☕ ${r.period} (${r.time})</td></tr>`;
            }
            const cells = r.cells.map(c => {
                if (!c.subj) return `<td style="padding:8px;border:1px solid #e5e7eb;text-align:center;min-width:110px"><span style="color:#d1d5db">—</span></td>`;
                const bg = c.color?.bg || '#dbeafe';
                const txt = c.color?.text || '#1e40af';
                const brd = c.color?.border || '#93c5fd';
                return `<td style="padding:4px;border:1px solid #e5e7eb;text-align:center;min-width:110px"><div style="background:${bg};border:1px solid ${brd};border-radius:6px;padding:6px 4px"><div style="font-weight:700;color:${txt};font-size:11px">${c.subj}</div><div style="font-size:9px;color:#6b7280;margin-top:2px">${c.teacher}</div>${c.room ? `<div style="font-size:8px;color:#9ca3af">${c.room}</div>` : ''}</div></td>`;
            }).join('');
            return `<tr><td style="background:#f8fafc;padding:8px;font-size:10px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">${r.period}</td><td style="background:#f8fafc;padding:8px;font-size:9px;color:#6b7280;border:1px solid #e5e7eb;white-space:nowrap">${r.time}</td>${cells}</tr>`;
        }).join('');
        w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>@page{size:A4 landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:15px}
.hdr{text-align:center;margin-bottom:15px}.hdr h1{font-size:20px;color:#1e3a8a;text-transform:uppercase;letter-spacing:1px}.hdr p{font-size:12px;color:#6b7280;margin-top:4px}
table{width:100%;border-collapse:collapse}@media print{body{padding:0}}</style></head><body>
<div class="hdr"><h1>ALPHA SCHOOL</h1><p>${title} — ${bTerm} ${bYear}</p></div>
<table><thead><tr><th style="background:#0f172a;color:#fff;padding:10px;font-size:11px;border:1px solid #1e293b">Period</th><th style="background:#0f172a;color:#fff;padding:10px;font-size:11px;border:1px solid #1e293b">Time</th>${dayHeaders}</tr></thead><tbody>${bodyRows}</tbody></table>
<div style="margin-top:12px;text-align:center;font-size:8px;color:#9ca3af">Generated by APSIMS — ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
</body></html>`);
        w.document.close(); setTimeout(() => w.print(), 500);
    };

    const printClassTT = () => {
        const rows = allPeriodsSorted.map(p => ({
            period: p.period_name, time: `${p.start_time?.substring(0,5)} - ${p.end_time?.substring(0,5)}`, type: p.period_type,
            cells: DAYS.map(day => {
                const e = getEntry(day, p.id, Number(cForm), Number(cStream));
                const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
                return { subj: e ? getSubjectName(e.subject_id) : '', teacher: e ? getTeacherShort(e.teacher_id) : '', room: e?.room || '', color };
            })
        }));
        printTimetable(`Class Timetable — ${getFormName(Number(cForm))} ${getStreamName(Number(cStream))}`, rows);
    };

    const printTeacherTT = () => {
        const tid = Number(tTeacher);
        const rows = allPeriodsSorted.map(p => ({
            period: p.period_name, time: `${p.start_time?.substring(0,5)} - ${p.end_time?.substring(0,5)}`, type: p.period_type,
            cells: DAYS.map(day => {
                const e = entries.find(x => x.teacher_id === tid && x.day_of_week === day && x.period_id === p.id && x.term === bTerm && x.year === bYear);
                const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
                return { subj: e ? getSubjectName(e.subject_id) : '', teacher: e ? `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : '', room: e?.room || '', color };
            })
        }));
        printTimetable(`Teacher Timetable — ${getTeacherName(tid)}`, rows);
    };

    // ─── Stats ───────────────────────────────────────────────────
    const termEntries = entries.filter(e => e.term === bTerm && e.year === bYear);
    const teacherLoads = teachers.map(t => ({
        id: t.id, name: `${t.first_name} ${t.last_name}`,
        count: termEntries.filter(e => e.teacher_id === t.id).length,
    })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
    const maxLoad = teacherLoads.length ? teacherLoads[0].count : 1;

    const formStreamCombos = forms.flatMap(f => streams.map(s => ({ formId: f.id, streamId: s.id, formName: f.form_name, streamName: s.stream_name })));
    const classStats = formStreamCombos.map(c => {
        const filled = termEntries.filter(e => e.form_id === c.formId && e.stream_id === c.streamId).length;
        const required = requirements.filter(r => r.form_id === c.formId && r.stream_id === c.streamId && r.term === bTerm && r.year === bYear)
            .reduce((sum, r) => sum + r.lessons_per_week, 0);
        return { ...c, filled, required, total: totalAvailableSlots, pct: required ? Math.round(filled / required * 100) : 0 };
    }).filter(c => c.required > 0).sort((a, b) => b.pct - a.pct);

    // ─── Tabs ────────────────────────────────────────────────────
    const TABS_LIST: { key: TTab; label: string; icon: any; badge?: string }[] = [
        { key: 'requirements', label: 'Requirements', icon: FiList, badge: requirements.filter(r => r.term === bTerm && r.year === bYear).length ? String(requirements.filter(r => r.term === bTerm && r.year === bYear).length) : undefined },
        { key: 'generate', label: 'Auto Generate', icon: FiZap },
        { key: 'build', label: 'Manual Build', icon: FiEdit3 },
        { key: 'class', label: 'Class View', icon: FiEye },
        { key: 'teacher', label: 'Teacher View', icon: FiUser },
        { key: 'stats', label: 'Statistics', icon: FiBarChart2 },
        { key: 'setup', label: 'Period Setup', icon: FiSettings },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 text-sm">Loading Timetable System...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <FiGrid className="text-white" size={20} />
                        </div>
                        Timetable Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">ASC-style automatic timetable generation with smart scheduling</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={bTerm} onChange={e => setBTerm(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        {['Term 1','Term 2','Term 3'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={bYear} onChange={e => setBYear(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        {[bYear-1, bYear, bYear+1].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="px-3 py-2 bg-blue-50 rounded-lg text-xs font-bold text-blue-700">
                        {termEntries.length} lessons placed
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS_LIST.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            tab === t.key ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:shadow-sm'
                        }`}>
                        <t.icon size={15} /> {t.label}
                        {t.badge && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.key ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>{t.badge}</span>}
                    </button>
                ))}
            </div>

            {/* ═══════════════ REQUIREMENTS TAB ═══════════════ */}
            {tab === 'requirements' && (
                <div className="space-y-4">
                    {/* Info Banner */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FiTarget className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900 text-sm">Step 1: Define Lesson Requirements</h3>
                            <p className="text-xs text-blue-700 mt-1">Like ASC Timetable &quot;cards&quot; — specify how many lessons per week each subject needs for each class, and assign teachers. The auto-generator will use these to build your timetable.</p>
                        </div>
                    </div>

                    {/* Class Selector */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                            <select value={reqForm} onChange={e => setReqForm(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none">
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                            <select value={reqStream} onChange={e => setReqStream(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none">
                                {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1" />
                        <div className="text-xs bg-gray-100 px-3 py-2 rounded-lg">
                            <span className="font-bold text-gray-700">{totalRequiredLessons}</span>
                            <span className="text-gray-500"> / {totalAvailableSlots} slots used</span>
                            {totalRequiredLessons > totalAvailableSlots && <span className="text-red-600 font-bold ml-2">⚠️ OVER CAPACITY!</span>}
                        </div>
                        <button onClick={() => setShowAddReq(true)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow hover:shadow-lg transition-shadow">
                            <FiPlus size={14} /> Add Subject
                        </button>
                        {classRequirements.length > 0 && (
                            <button onClick={handleCopyRequirements} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-gray-50" title="Copy requirements to other streams of same form">
                                <FiCopy size={14} /> Copy to Streams
                            </button>
                        )}
                    </div>

                    {/* Add Requirement Modal */}
                    {showAddReq && (
                        <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-lg">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiPlus className="text-blue-500" /> Add Subject Requirement for {getFormName(Number(reqForm))} {getStreamName(Number(reqStream))}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Subject *</label>
                                    <select value={newReqSubject} onChange={e => setNewReqSubject(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                                        <option value="">— Select Subject —</option>
                                        {subjects.filter(s => !classRequirements.some(r => r.subject_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Assign Teacher</label>
                                    <select value={newReqTeacher} onChange={e => setNewReqTeacher(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                                        <option value="">— Any Available —</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Lessons / Week</label>
                                    <input type="number" min={1} max={10} value={newReqLessons} onChange={e => setNewReqLessons(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max Per Day</label>
                                    <input type="number" min={1} max={4} value={newReqMaxPerDay} onChange={e => setNewReqMaxPerDay(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={handleAddRequirement} disabled={savingReq} className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5">
                                    <FiSave size={14} /> {savingReq ? 'Saving...' : 'Save Requirement'}
                                </button>
                                <button onClick={() => setShowAddReq(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Requirements List — ASC Card Style */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">Subject Cards — {getFormName(Number(reqForm))} {getStreamName(Number(reqStream))}</h3>
                            <div className="text-xs text-gray-500">{classRequirements.length} subjects</div>
                        </div>
                        {classRequirements.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <FiList size={40} className="mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No requirements defined yet</p>
                                <p className="text-xs mt-1">Click &quot;Add Subject&quot; to start building your timetable cards</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                                {classRequirements.map(req => {
                                    const color = getSubjectColor(req.subject_id, subjects);
                                    const placedCount = termEntries.filter(e => e.form_id === req.form_id && e.stream_id === req.stream_id && e.subject_id === req.subject_id).length;
                                    return (
                                        <div key={req.id} className="rounded-xl border-2 p-4 transition-all hover:shadow-md" style={{ borderColor: color.border, background: color.bg }}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-bold text-sm" style={{ color: color.text }}>{getSubjectName(req.subject_id)}</h4>
                                                    <p className="text-xs mt-0.5" style={{ color: color.text, opacity: 0.7 }}>{getSubjectCode(req.subject_id)}</p>
                                                </div>
                                                <button onClick={() => handleDeleteRequirement(req.id!)} className="text-gray-400 hover:text-red-500 p-1"><FiTrash2 size={13} /></button>
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1">
                                                    <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week - 1)} className="text-gray-500 hover:text-gray-800"><FiChevronDown size={12} /></button>
                                                    <span className="text-sm font-bold min-w-[20px] text-center" style={{ color: color.text }}>{req.lessons_per_week}</span>
                                                    <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week + 1)} className="text-gray-500 hover:text-gray-800"><FiChevronUp size={12} /></button>
                                                    <span className="text-[10px] text-gray-500">L/wk</span>
                                                </div>
                                                <div className="text-[10px] bg-white/60 rounded-lg px-2 py-1" style={{ color: color.text }}>
                                                    max {req.max_per_day}/day
                                                </div>
                                                {placedCount > 0 && (
                                                    <div className={`text-[10px] rounded-lg px-2 py-1 font-bold ${placedCount >= req.lessons_per_week ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {placedCount}/{req.lessons_per_week} placed
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Teacher</label>
                                                <select value={req.teacher_id || ''} onChange={e => handleUpdateReqTeacher(req, e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg text-xs border border-gray-200 bg-white/80">
                                                    <option value="">— Any Available —</option>
                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════ AUTO GENERATE TAB ═══════════════ */}
            {tab === 'generate' && (
                <div className="space-y-4">
                    {/* Generation Control Panel */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2"><FiZap size={24} /> Auto-Generate Timetable</h2>
                            <p className="text-indigo-200 text-sm mb-5">Smart constraint-based scheduling engine — like ASC Timetable</p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold">{requirements.filter(r => r.term === bTerm && r.year === bYear).length}</p>
                                    <p className="text-[10px] text-indigo-200 uppercase">Subject Cards</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold">{requirements.filter(r => r.term === bTerm && r.year === bYear).reduce((s, r) => s + r.lessons_per_week, 0)}</p>
                                    <p className="text-[10px] text-indigo-200 uppercase">Total Lessons</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold">{new Set(requirements.filter(r => r.term === bTerm && r.year === bYear).map(r => `${r.form_id}-${r.stream_id}`)).size}</p>
                                    <p className="text-[10px] text-indigo-200 uppercase">Classes</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold">{lessonPeriods.length * DAYS.length}</p>
                                    <p className="text-[10px] text-indigo-200 uppercase">Slots / Class</p>
                                </div>
                            </div>

                            <div className="flex gap-3 items-center flex-wrap">
                                <button onClick={handleGenerate} disabled={generating || requirements.filter(r => r.term === bTerm && r.year === bYear).length === 0}
                                    className="px-6 py-3 bg-white text-indigo-700 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2">
                                    {generating ? (
                                        <><div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin" /> Generating...</>
                                    ) : (
                                        <><FiZap size={16} /> Generate Timetable</>
                                    )}
                                </button>
                                <button onClick={() => setShowGenSettings(!showGenSettings)} className="px-4 py-3 bg-white/10 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-white/20">
                                    <FiSliders size={16} /> Settings
                                </button>
                                {requirements.filter(r => r.term === bTerm && r.year === bYear).length === 0 && (
                                    <p className="text-sm text-indigo-200 italic">→ Add requirements first in the Requirements tab</p>
                                )}
                            </div>

                            {/* Generation Progress */}
                            {generating && (
                                <div className="mt-5">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span>Processing...</span>
                                        <span>{genProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full transition-all duration-500" style={{ width: `${genProgress}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Settings Panel */}
                    {showGenSettings && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiSliders className="text-blue-500" /> Generation Settings</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max Consecutive Same Subject</label>
                                    <input type="number" min={1} max={4} value={genSettings.maxConsecutiveSameSubject}
                                        onChange={e => setGenSettings({...genSettings, maxConsecutiveSameSubject: Number(e.target.value)})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                                    <p className="text-[10px] text-gray-400 mt-1">Prevents same subject back-to-back more than this</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max Teacher Lessons / Day</label>
                                    <input type="number" min={3} max={10} value={genSettings.maxTeacherLessonsPerDay}
                                        onChange={e => setGenSettings({...genSettings, maxTeacherLessonsPerDay: Number(e.target.value)})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                                    <p className="text-[10px] text-gray-400 mt-1">Maximum lessons a single teacher can have per day</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={genSettings.spreadEvenly}
                                        onChange={e => setGenSettings({...genSettings, spreadEvenly: e.target.checked})}
                                        className="w-4 h-4 rounded border-gray-300" id="spreadEvenly" />
                                    <label htmlFor="spreadEvenly" className="text-sm text-gray-700">
                                        <span className="font-medium">Spread Evenly Across Days</span>
                                        <span className="block text-[10px] text-gray-400">Distributes subjects evenly Monday-Friday</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generation Results */}
                    {genResults && (
                        <div className="space-y-4">
                            {/* Success Summary */}
                            <div className={`rounded-2xl p-5 border-2 ${genResults.unplaced.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    {genResults.unplaced.length === 0 ? (
                                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><FiCheck className="text-green-600" size={24} /></div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center"><FiAlertTriangle className="text-amber-600" size={24} /></div>
                                    )}
                                    <div>
                                        <h3 className={`font-bold text-lg ${genResults.unplaced.length === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                                            {genResults.unplaced.length === 0 ? '🎉 Perfect Generation!' : '⚠️ Partial Generation'}
                                        </h3>
                                        <p className="text-sm text-gray-600">{genResults.placed.length} lessons placed successfully</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold text-green-600">{genResults.placed.length}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Placed</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold text-red-500">{genResults.unplaced.reduce((s, u) => s + u.remaining, 0)}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Unplaced</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold text-blue-600">
                                            {genResults.placed.length + genResults.unplaced.reduce((s, u) => s + u.remaining, 0) > 0
                                                ? Math.round(genResults.placed.length / (genResults.placed.length + genResults.unplaced.reduce((s, u) => s + u.remaining, 0)) * 100)
                                                : 0}%
                                        </p>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Success Rate</p>
                                    </div>
                                </div>
                            </div>

                            {/* Unplaced Cards */}
                            {genResults.unplaced.length > 0 && (
                                <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
                                    <div className="p-4 border-b border-red-100 bg-red-50/50">
                                        <h3 className="font-bold text-red-800 flex items-center gap-2"><FiAlertTriangle size={16} /> Unplaced Lessons ({genResults.unplaced.reduce((s, u) => s + u.remaining, 0)})</h3>
                                        <p className="text-xs text-red-600 mt-1">These lessons couldn&apos;t be placed automatically. Go to Manual Build tab to place them.</p>
                                    </div>
                                    <div className="divide-y divide-red-100">
                                        {genResults.unplaced.map((u, i) => {
                                            const color = getSubjectColor(u.req.subject_id, subjects);
                                            return (
                                                <div key={i} className="p-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: color.bg, color: color.text }}>{u.remaining}</div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-800">{getSubjectName(u.req.subject_id)} — {getFormName(u.req.form_id)} {getStreamName(u.req.stream_id)}</p>
                                                        <p className="text-xs text-gray-500">{u.reason}</p>
                                                    </div>
                                                    {u.req.teacher_id && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{getTeacherShort(u.req.teacher_id)}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button onClick={() => { setTab('class'); }} className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 flex items-center gap-2">
                                <FiEye size={14} /> View Generated Timetable
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════ MANUAL BUILD TAB ═══════════════ */}
            {tab === 'build' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex gap-3 items-end flex-wrap">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                                <select value={bForm} onChange={e => setBForm(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none">
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                                <select value={bStream} onChange={e => setBStream(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none">
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                </select>
                            </div>
                            <div className="text-xs font-bold text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                                {getFormName(Number(bForm))} {getStreamName(Number(bStream))} — {bTerm} {bYear}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="bg-gray-800 text-white px-3 py-3 text-left text-xs font-bold uppercase sticky left-0 z-10 min-w-[100px]">Period</th>
                                        <th className="bg-gray-800 text-white px-2 py-3 text-left text-xs font-bold uppercase min-w-[55px]">Time</th>
                                        {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-500 to-indigo-600 text-white px-3 py-3 text-center text-xs font-bold uppercase min-w-[140px]">{d}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPeriodsSorted.map(p => {
                                        if (p.period_type !== 'lesson') {
                                            return (
                                                <tr key={p.id}>
                                                    <td colSpan={DAYS.length + 2} className="text-center py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100">
                                                        ☕ {p.period_name} ({p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)})
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <tr key={p.id}>
                                                <td className="bg-gray-50 px-3 py-2 font-bold text-xs border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                                                <td className="bg-gray-50 px-2 py-2 text-[10px] text-gray-500 border border-gray-200">{p.start_time?.substring(0,5)}<br/>{p.end_time?.substring(0,5)}</td>
                                                {DAYS.map(day => {
                                                    const entry = getEntry(day, p.id);
                                                    const isEditing = editCell?.day === day && editCell?.periodId === p.id;
                                                    const color = entry?.subject_id ? getSubjectColor(entry.subject_id, subjects) : null;
                                                    return (
                                                        <td key={day} className="border border-gray-200 p-0 relative" style={{ minWidth: 140 }}>
                                                            {isEditing ? (
                                                                <div className="p-2 bg-blue-50 space-y-1.5">
                                                                    <select value={cellSubject} onChange={e => setCellSubject(e.target.value)} className="w-full px-2 py-1 border rounded text-xs">
                                                                        <option value="">— No Subject —</option>
                                                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                                                    </select>
                                                                    <select value={cellTeacher} onChange={e => setCellTeacher(e.target.value)} className="w-full px-2 py-1 border rounded text-xs">
                                                                        <option value="">— No Teacher —</option>
                                                                        {teachers.map(t => {
                                                                            const busy = isTeacherBusy(t.id, day, p.id, Number(bForm), Number(bStream));
                                                                            return <option key={t.id} value={t.id} disabled={!!busy}>{t.first_name} {t.last_name}{busy?' ⚠️ BUSY':''}</option>;
                                                                        })}
                                                                    </select>
                                                                    <input value={cellRoom} onChange={e => setCellRoom(e.target.value)} placeholder="Room" className="w-full px-2 py-1 border rounded text-xs" />
                                                                    <div className="flex gap-1">
                                                                        <button onClick={handleSaveCell} disabled={savingCell} className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold"><FiSave className="inline mr-0.5" size={10} /> Save</button>
                                                                        <button onClick={() => setEditCell(null)} className="px-2 py-1 bg-gray-200 rounded text-xs"><FiX size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => openEdit(day, p.id)} className="w-full h-full min-h-[56px] p-1 hover:bg-blue-50 transition-colors text-center">
                                                                    {entry && entry.subject_id ? (
                                                                        <div className="rounded-lg p-1.5 mx-0.5" style={{ background: color?.bg, border: `1px solid ${color?.border}` }}>
                                                                            <div className="font-bold text-xs" style={{ color: color?.text }}>{getSubjectCode(entry.subject_id)}</div>
                                                                            <div className="text-[10px] text-gray-500">{getTeacherShort(entry.teacher_id)}</div>
                                                                            {entry.room && <div className="text-[9px] text-gray-400">{entry.room}</div>}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-300 text-lg">+</span>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ CLASS VIEW TAB ═══════════════ */}
            {tab === 'class' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                            <select value={cForm} onChange={e => setCForm(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                            <select value={cStream} onChange={e => setCStream(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select>
                        </div>
                        <button onClick={printClassTT} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow"><FiPrinter size={14} /> Print Timetable</button>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-blue-50/50">
                            <h3 className="font-bold text-lg text-gray-800">{getFormName(Number(cForm))} {getStreamName(Number(cStream))} — {bTerm} {bYear}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="bg-gray-800 text-white px-4 py-3 text-left text-xs font-bold">Period</th>
                                        <th className="bg-gray-800 text-white px-3 py-3 text-left text-xs font-bold">Time</th>
                                        {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-500 to-indigo-600 text-white px-4 py-3 text-center text-xs font-bold">{d}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPeriodsSorted.map(p => {
                                        if (p.period_type !== 'lesson') {
                                            return <tr key={p.id}><td colSpan={DAYS.length+2} className="text-center py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100">☕ {p.period_name} ({p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)})</td></tr>;
                                        }
                                        return (
                                            <tr key={p.id}>
                                                <td className="bg-gray-50 px-4 py-3 font-bold text-xs border border-gray-200">{p.period_name}</td>
                                                <td className="bg-gray-50 px-3 py-3 text-[10px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)}</td>
                                                {DAYS.map(day => {
                                                    const e = getEntry(day, p.id, Number(cForm), Number(cStream));
                                                    const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : null;
                                                    return (
                                                        <td key={day} className="border border-gray-200 text-center p-1">
                                                            {e && e.subject_id ? (
                                                                <div className="rounded-lg p-2 mx-0.5" style={{ background: color?.bg, border: `1px solid ${color?.border}` }}>
                                                                    <div className="font-bold text-xs" style={{ color: color?.text }}>{getSubjectName(e.subject_id)}</div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">{getTeacherShort(e.teacher_id)}</div>
                                                                    {e.room && <div className="text-[9px] text-gray-400">{e.room}</div>}
                                                                </div>
                                                            ) : <span className="text-gray-300">—</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Subject Legend */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Subject Legend</h4>
                        <div className="flex flex-wrap gap-2">
                            {subjects.filter(s => termEntries.some(e => e.subject_id === s.id && e.form_id === Number(cForm) && e.stream_id === Number(cStream))).map(s => {
                                const color = getSubjectColor(s.id, subjects);
                                return (
                                    <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color.text }} />
                                        {s.subject_name}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ TEACHER VIEW TAB ═══════════════ */}
            {tab === 'teacher' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Teacher</label>
                            <select value={tTeacher} onChange={e => setTTeacher(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[200px]">
                                <option value="">— Select —</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                            </select>
                        </div>
                        {tTeacher && (
                            <>
                                <div className="text-xs bg-blue-50 px-3 py-2 rounded-lg font-bold text-blue-700">
                                    {termEntries.filter(e => e.teacher_id === Number(tTeacher)).length} lessons/week
                                </div>
                                <button onClick={printTeacherTT} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow"><FiPrinter size={14} /> Print</button>
                            </>
                        )}
                    </div>
                    {tTeacher && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-blue-50/50">
                                <h3 className="font-bold text-lg text-gray-800">{getTeacherName(Number(tTeacher))} — {bTerm} {bYear}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead><tr><th className="bg-gray-800 text-white px-4 py-3 text-left text-xs font-bold">Period</th><th className="bg-gray-800 text-white px-3 py-3 text-xs font-bold">Time</th>{DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-500 to-indigo-600 text-white px-4 py-3 text-center text-xs font-bold">{d}</th>)}</tr></thead>
                                    <tbody>
                                        {allPeriodsSorted.map(p => {
                                            if (p.period_type !== 'lesson') return <tr key={p.id}><td colSpan={DAYS.length+2} className="text-center py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100">☕ {p.period_name}</td></tr>;
                                            return (
                                                <tr key={p.id}>
                                                    <td className="bg-gray-50 px-4 py-3 font-bold text-xs border border-gray-200">{p.period_name}</td>
                                                    <td className="bg-gray-50 px-3 py-3 text-[10px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0,5)}-{p.end_time?.substring(0,5)}</td>
                                                    {DAYS.map(day => {
                                                        const e = termEntries.find(x => x.teacher_id === Number(tTeacher) && x.day_of_week === day && x.period_id === p.id);
                                                        const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : null;
                                                        return (
                                                            <td key={day} className={`border border-gray-200 text-center p-1`}>
                                                                {e && e.subject_id ? (
                                                                    <div className="rounded-lg p-2 mx-0.5" style={{ background: color?.bg, border: `1px solid ${color?.border}` }}>
                                                                        <div className="font-bold text-xs" style={{ color: color?.text }}>{getSubjectName(e.subject_id)}</div>
                                                                        <div className="text-[10px] text-gray-600 font-semibold mt-0.5">{getFormName(e.form_id)} {getStreamName(e.stream_id)}</div>
                                                                    </div>
                                                                ) : <span className="text-green-300 text-xs font-medium">FREE</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════ STATISTICS TAB ═══════════════ */}
            {tab === 'stats' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { val: termEntries.length, label: 'Lessons Placed', color: 'text-blue-600', bg: 'bg-blue-50' },
                            { val: requirements.filter(r => r.term === bTerm && r.year === bYear).reduce((s, r) => s + r.lessons_per_week, 0), label: 'Lessons Required', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { val: lessonPeriods.length * DAYS.length, label: 'Slots / Class', color: 'text-gray-700', bg: 'bg-gray-50' },
                            { val: teacherLoads.length, label: 'Teachers Active', color: 'text-green-600', bg: 'bg-green-50' },
                            { val: new Set(termEntries.map(e => e.subject_id)).size, label: 'Subjects Scheduled', color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} border border-gray-200 rounded-xl p-4 text-center`}>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Teacher Workload */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiUser size={16} /> Teacher Workload ({bTerm} {bYear})</h3>
                        <div className="space-y-2">
                            {teacherLoads.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No assignments yet</p> :
                                teacherLoads.map(t => (
                                    <div key={t.id} className="flex items-center gap-3">
                                        <div className="w-40 text-xs font-medium text-gray-600 truncate">{t.name}</div>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-end pr-2"
                                                style={{ width: `${Math.max((t.count / maxLoad) * 100, 8)}%` }}>
                                                <span className="text-[10px] font-bold text-white">{t.count}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 w-16 text-right">{t.count} L/wk</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Class Completion */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800">Class Timetable Completion</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b">{['Class','Placed','Required','Completion'].map(h => <th key={h} className={`px-4 py-2.5 text-xs font-bold text-gray-500 uppercase ${h!=='Class'?'text-center':'text-left'}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {classStats.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">No data — add requirements first</td></tr> :
                                    classStats.map(c => (
                                        <tr key={`${c.formId}-${c.streamId}`} className="border-b border-gray-100">
                                            <td className="px-4 py-2.5 font-bold">{c.formName} {c.streamName}</td>
                                            <td className="px-4 py-2.5 text-center font-bold text-blue-600">{c.filled}</td>
                                            <td className="px-4 py-2.5 text-center">{c.required}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(c.pct, 100)}%`, background: c.pct >= 100 ? '#22c55e' : c.pct >= 70 ? '#f59e0b' : '#ef4444' }} /></div>
                                                    <span className={`text-xs font-bold ${c.pct >= 100 ? 'text-green-600' : c.pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{c.pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════ PERIOD SETUP TAB ═══════════════ */}
            {tab === 'setup' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-blue-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiSettings size={16} /> School Day Period Configuration</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Pre-loaded with Kenya MoE standard (8 lessons + breaks)</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b">{['#','Period Name','Start','End','Type','Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                        <tbody>
                            {allPeriodsSorted.map(p => (
                                <tr key={p.id} className={`border-b border-gray-100 ${p.period_type === 'break' ? 'bg-amber-50/50' : p.period_type === 'assembly' ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-2 text-gray-400">{p.period_number}</td>
                                    {editPeriod?.id === p.id ? (
                                        <>
                                            <td className="px-4 py-1"><input value={editPeriod.period_name} onChange={e => setEditPeriod({ ...editPeriod, period_name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" /></td>
                                            <td className="px-4 py-1"><input type="time" value={editPeriod.start_time} onChange={e => setEditPeriod({ ...editPeriod, start_time: e.target.value })} className="px-2 py-1 border rounded text-sm" /></td>
                                            <td className="px-4 py-1"><input type="time" value={editPeriod.end_time} onChange={e => setEditPeriod({ ...editPeriod, end_time: e.target.value })} className="px-2 py-1 border rounded text-sm" /></td>
                                            <td className="px-4 py-1"><select value={editPeriod.period_type} onChange={e => setEditPeriod({ ...editPeriod, period_type: e.target.value })} className="px-2 py-1 border rounded text-sm"><option value="lesson">Lesson</option><option value="break">Break</option><option value="assembly">Assembly</option></select></td>
                                            <td className="px-4 py-1 flex gap-1"><button onClick={() => handleSavePeriod(editPeriod)} className="px-2 py-1 bg-green-500 text-white rounded text-xs"><FiCheck size={12} /></button><button onClick={() => setEditPeriod(null)} className="px-2 py-1 bg-gray-300 rounded text-xs"><FiX size={12} /></button></td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-2 font-medium">{p.period_name}</td>
                                            <td className="px-4 py-2 text-xs">{p.start_time?.substring(0,5)}</td>
                                            <td className="px-4 py-2 text-xs">{p.end_time?.substring(0,5)}</td>
                                            <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.period_type==='lesson'?'bg-blue-100 text-blue-700':p.period_type==='break'?'bg-amber-100 text-amber-700':'bg-purple-100 text-purple-700'}`}>{p.period_type}</span></td>
                                            <td className="px-4 py-2 flex gap-1">
                                                <button onClick={() => setEditPeriod({...p})} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"><FiEdit3 size={12} /></button>
                                                <button onClick={() => handleDeletePeriod(p.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"><FiTrash2 size={12} /></button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Add New Period</p>
                        <div className="flex gap-2 items-end flex-wrap">
                            <input placeholder="Period Name" value={newPeriod.period_name} onChange={e => setNewPeriod({...newPeriod, period_name: e.target.value})} className="px-3 py-2 border rounded-lg text-sm w-40" />
                            <input type="time" value={newPeriod.start_time} onChange={e => setNewPeriod({...newPeriod, start_time: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                            <input type="time" value={newPeriod.end_time} onChange={e => setNewPeriod({...newPeriod, end_time: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
                            <select value={newPeriod.period_type} onChange={e => setNewPeriod({...newPeriod, period_type: e.target.value})} className="px-3 py-2 border rounded-lg text-sm"><option value="lesson">Lesson</option><option value="break">Break</option><option value="assembly">Assembly</option></select>
                            <button onClick={handleAddPeriod} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 flex items-center gap-1"><FiPlus size={14} /> Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
