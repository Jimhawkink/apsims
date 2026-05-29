// ═══════════════════════════════════════════════════════════════════════════
// APSIMS Ultra — 8-4-4 Marks Hub (Teacher)
// Kenya's most comprehensive traditional-curriculum marks management module
//
// Features:
//  ① Class overview — grade distribution bar chart (A–E)
//  ② Subject mean score tracker & rank table
//  ③ Inline marks entry per student (tap-to-edit)
//  ④ Exam type selector — CAT 1 / CAT 2 / Mid-Term / End-Term / KCSE Mock
//  ⑤ Auto-grade calculation (KNEC grading scale)
//  ⑥ Top 5 / Bottom 5 performers panel
//  ⑦ Students below 50% — at-risk list with one-tap flag
//  ⑧ Term comparison — is this term better than last?
//  ⑨ Marks sheet summary (printable-ready view)
//  ⑩ Save progress — offline-first with sync indicator
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, ActivityIndicator, StatusBar, SafeAreaView,
    RefreshControl, TextInput, Modal, Alert, Dimensions,
    Keyboard, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, getCurrentTerm, saveMarks, formatDate } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const W = Dimensions.get('window').width;

// ──────────────────────────────────────────────────────────────
// KNEC GRADING SYSTEM
// ──────────────────────────────────────────────────────────────
export const KNEC_GRADES = [
    { grade: 'A',  min: 75, max: 100, label: 'Excellent',      color: '#059669', bg: '#d1fae5', points: 12 },
    { grade: 'A-', min: 70, max: 74,  label: 'Very Good',      color: '#10b981', bg: '#d1fae5', points: 11 },
    { grade: 'B+', min: 65, max: 69,  label: 'Good',           color: '#2563eb', bg: '#dbeafe', points: 10 },
    { grade: 'B',  min: 60, max: 64,  label: 'Good',           color: '#3b82f6', bg: '#dbeafe', points: 9 },
    { grade: 'B-', min: 55, max: 59,  label: 'Above Average',  color: '#6366f1', bg: '#e0e7ff', points: 8 },
    { grade: 'C+', min: 50, max: 54,  label: 'Average',        color: '#7c3aed', bg: '#ede9fe', points: 7 },
    { grade: 'C',  min: 45, max: 49,  label: 'Average',        color: '#f59e0b', bg: '#fef3c7', points: 6 },
    { grade: 'C-', min: 40, max: 44,  label: 'Below Average',  color: '#d97706', bg: '#fef3c7', points: 5 },
    { grade: 'D+', min: 35, max: 39,  label: 'Weak',           color: '#f97316', bg: '#ffedd5', points: 4 },
    { grade: 'D',  min: 30, max: 34,  label: 'Weak',           color: '#ea580c', bg: '#ffedd5', points: 3 },
    { grade: 'D-', min: 25, max: 29,  label: 'Very Weak',      color: '#ef4444', bg: '#fee2e2', points: 2 },
    { grade: 'E',  min: 0,  max: 24,  label: 'Fail',           color: '#dc2626', bg: '#fee2e2', points: 1 },
] as const;

export function getKNECGrade(score: number): typeof KNEC_GRADES[number] {
    return KNEC_GRADES.find(g => score >= g.min && score <= g.max) || KNEC_GRADES[KNEC_GRADES.length - 1];
}

export function getSimpleGrade(score: number): string {
    return getKNECGrade(score).grade;
}

// ──────────────────────────────────────────────────────────────
// EXAM TYPES
// ──────────────────────────────────────────────────────────────
const EXAM_TYPES = [
    { key: 'CAT 1',     label: '📝 CAT 1',      max: 30,  color: '#7c3aed' },
    { key: 'CAT 2',     label: '📝 CAT 2',      max: 30,  color: '#6366f1' },
    { key: 'Mid-Term',  label: '📋 Mid-Term',   max: 100, color: '#2563eb' },
    { key: 'End-Term',  label: '🏆 End-Term',   max: 100, color: '#059669' },
    { key: 'KCSE Mock', label: '🎯 KCSE Mock',  max: 100, color: '#e11d48' },
    { key: 'KCPE Mock', label: '🎯 KCPE Mock',  max: 100, color: '#f59e0b' },
    { key: 'OPENER',    label: '🔓 Opener',     max: 100, color: '#0d9488' },
];

// ──────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ──────────────────────────────────────────────────────────────
const C = {
    bg: '#f0f9ff',
    card: '#ffffff',
    border: '#e2e8f0',
    primary: '#2563eb',
    primaryD: '#1d4ed8',
    primaryL: '#dbeafe',
    emerald: '#059669',
    emeraldL: '#d1fae5',
    amber: '#d97706',
    amberL: '#fef3c7',
    rose: '#e11d48',
    roseL: '#ffe4e6',
    violet: '#7c3aed',
    violetL: '#ede9fe',
    text: '#0f172a',
    textSub: '#475569',
    textDim: '#94a3b8',
};

// ──────────────────────────────────────────────────────────────
// DATA TYPES
// ──────────────────────────────────────────────────────────────
interface StudentMark {
    studentId: number;
    studentName: string;
    admission: string;
    streamName: string;
    score: number | null;
    grade: string | null;
    points: number;
    rank?: number;
    prevScore?: number | null;
    isDirty: boolean;
}

interface SubjectStats {
    subjectId: number;
    subjectName: string;
    mean: number;
    highest: number;
    lowest: number;
    passRate: number; // % scoring ≥ 50
    gradeDistribution: Record<string, number>;
    count: number;
}

type ViewMode = 'entry' | 'analysis' | 'leaderboard' | 'sheet';

// ──────────────────────────────────────────────────────────────
// GRADE BADGE
// ──────────────────────────────────────────────────────────────
function GradeBadge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
    if (score === null) {
        return (
            <View style={[gb.base, gb[size], { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                <Text style={[gb.text, { color: '#94a3b8', fontSize: size === 'sm' ? 9 : 11 }]}>—</Text>
            </View>
        );
    }
    const g = getKNECGrade(score);
    return (
        <View style={[gb.base, gb[size], { backgroundColor: g.bg, borderColor: g.color + '66' }]}>
            <Text style={[gb.text, { color: g.color, fontSize: size === 'sm' ? 9 : size === 'lg' ? 15 : 11 }]}>{g.grade}</Text>
        </View>
    );
}
const gb = StyleSheet.create({
    base: { borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    sm: { paddingHorizontal: 5, paddingVertical: 2 },
    md: { paddingHorizontal: 8, paddingVertical: 4 },
    lg: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    text: { fontWeight: '900' },
});

// ──────────────────────────────────────────────────────────────
// SCORE INPUT MODAL
// ──────────────────────────────────────────────────────────────
function ScoreInputModal({
    visible, student, examType, maxScore,
    onSave, onClose,
}: {
    visible: boolean;
    student: StudentMark | null;
    examType: string;
    maxScore: number;
    onSave: (studentId: number, score: number) => void;
    onClose: () => void;
}) {
    const [value, setValue] = useState('');
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (visible) {
            setValue(student?.score !== null && student?.score !== undefined ? String(student.score) : '');
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [visible, student]);

    const numScore = parseFloat(value);
    const isValid = !isNaN(numScore) && numScore >= 0 && numScore <= maxScore;
    const grade = isValid ? getKNECGrade(numScore) : null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={sim.overlay}
            >
                <View style={sim.sheet}>
                    {/* Header */}
                    <LinearGradient colors={['#2563eb', '#1d4ed8']} style={sim.header}>
                        <Text style={sim.headerTitle}>✏️ Enter Score</Text>
                        <Text style={sim.headerSub}>{student?.studentName} · {examType}</Text>
                        <Text style={sim.headerMax}>Max: {maxScore} marks</Text>
                    </LinearGradient>

                    <View style={sim.body}>
                        {/* Score input */}
                        <View style={sim.inputWrap}>
                            <TextInput
                                ref={inputRef}
                                style={sim.input}
                                value={value}
                                onChangeText={setValue}
                                keyboardType="numeric"
                                placeholder={`0 – ${maxScore}`}
                                placeholderTextColor="#94a3b8"
                                returnKeyType="done"
                                onSubmitEditing={() => {
                                    if (isValid && student) {
                                        onSave(student.studentId, numScore);
                                        onClose();
                                    }
                                }}
                            />
                            {grade && (
                                <View style={[sim.gradePreview, { backgroundColor: grade.bg }]}>
                                    <Text style={[sim.gradeText, { color: grade.color }]}>{grade.grade}</Text>
                                    <Text style={[sim.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
                                </View>
                            )}
                        </View>

                        {/* Quick score buttons */}
                        <Text style={sim.quickLabel}>Quick Select</Text>
                        <View style={sim.quickGrid}>
                            {[...Array(maxScore <= 30 ? 7 : 10)].map((_, i) => {
                                const quickScore = maxScore <= 30
                                    ? [0, 5, 10, 15, 20, 25, 30][i]
                                    : [0, 20, 30, 40, 50, 60, 70, 80, 90, 100][i];
                                const g = getKNECGrade(quickScore);
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[sim.quickBtn, { backgroundColor: g.bg, borderColor: g.color + '44' }]}
                                        onPress={() => setValue(String(quickScore))}
                                    >
                                        <Text style={[sim.quickBtnScore, { color: g.color }]}>{quickScore}</Text>
                                        <Text style={[sim.quickBtnGrade, { color: g.color }]}>{g.grade}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* KNEC grade scale */}
                        <Text style={sim.quickLabel}>KNEC Grading Scale</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                {KNEC_GRADES.slice(0, 7).map(g => (
                                    <View key={g.grade} style={[sim.scaleChip, { backgroundColor: g.bg }]}>
                                        <Text style={[sim.scaleGrade, { color: g.color }]}>{g.grade}</Text>
                                        <Text style={[sim.scaleRange, { color: g.color }]}>{g.min}–{g.max}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <View style={sim.actions}>
                        <TouchableOpacity style={sim.cancelBtn} onPress={onClose}>
                            <Text style={sim.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[sim.saveBtn, !isValid && { opacity: 0.4 }]}
                            disabled={!isValid}
                            onPress={() => {
                                if (isValid && student) {
                                    onSave(student.studentId, numScore);
                                    onClose();
                                }
                            }}
                        >
                            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={sim.saveBtnGrad}>
                                <Text style={sim.saveText}>💾 Save Score</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
const sim = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    header: { padding: 20, paddingTop: 24 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    headerMax: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    body: { padding: 16 },
    inputWrap: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
    input: {
        flex: 1, borderRadius: 16, borderWidth: 2, borderColor: '#93c5fd',
        padding: 16, fontSize: 32, fontWeight: '900', color: C.text,
        backgroundColor: '#f0f9ff', textAlign: 'center',
    },
    gradePreview: { width: 70, height: 70, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
    gradeText: { fontSize: 24, fontWeight: '900' },
    gradeLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
    quickLabel: { fontSize: 10, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    quickBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 44 },
    quickBtnScore: { fontSize: 14, fontWeight: '900' },
    quickBtnGrade: { fontSize: 9, fontWeight: '700' },
    scaleChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', minWidth: 40 },
    scaleGrade: { fontSize: 12, fontWeight: '900' },
    scaleRange: { fontSize: 8, fontWeight: '600', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
    cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '800', color: '#475569' },
    saveBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { padding: 14, alignItems: 'center' },
    saveText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});

// ──────────────────────────────────────────────────────────────
// GRADE DISTRIBUTION BAR
// ──────────────────────────────────────────────────────────────
function GradeDistBar({ marks, total }: { marks: StudentMark[]; total: number }) {
    const gradeGroups = [
        { label: 'A / A-',  grades: ['A', 'A-'],         color: '#059669', bg: '#d1fae5' },
        { label: 'B+ / B',  grades: ['B+', 'B', 'B-'],   color: '#2563eb', bg: '#dbeafe' },
        { label: 'C+ / C',  grades: ['C+', 'C', 'C-'],   color: '#7c3aed', bg: '#ede9fe' },
        { label: 'D+ / D',  grades: ['D+', 'D', 'D-'],   color: '#f97316', bg: '#ffedd5' },
        { label: 'E',       grades: ['E'],                color: '#e11d48', bg: '#fee2e2' },
    ];

    const entered = marks.filter(m => m.score !== null);
    const n = entered.length || 1;

    return (
        <View style={gdb.container}>
            <Text style={gdb.title}>📊 Grade Distribution</Text>
            <View style={gdb.barTrack}>
                {gradeGroups.map(grp => {
                    const count = entered.filter(m => m.grade && grp.grades.includes(m.grade)).length;
                    const pct = (count / n) * 100;
                    return pct > 0 ? (
                        <View
                            key={grp.label}
                            style={[gdb.barSegment, { flex: count, backgroundColor: grp.color }]}
                        />
                    ) : null;
                })}
            </View>
            <View style={gdb.legendRow}>
                {gradeGroups.map(grp => {
                    const count = entered.filter(m => m.grade && grp.grades.includes(m.grade)).length;
                    const pct = n > 1 ? Math.round((count / n) * 100) : 0;
                    return (
                        <View key={grp.label} style={[gdb.legendItem, { backgroundColor: grp.bg }]}>
                            <View style={[gdb.legendDot, { backgroundColor: grp.color }]} />
                            <Text style={[gdb.legendGrade, { color: grp.color }]}>{grp.label}</Text>
                            <Text style={[gdb.legendCount, { color: grp.color }]}>{count}</Text>
                            <Text style={[gdb.legendPct, { color: grp.color }]}>{pct}%</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
const gdb = StyleSheet.create({
    container: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
    title: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
    barTrack: { height: 20, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#f1f5f9', marginBottom: 10 },
    barSegment: { height: '100%' },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendGrade: { fontSize: 9, fontWeight: '700' },
    legendCount: { fontSize: 12, fontWeight: '900' },
    legendPct: { fontSize: 9, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
export default function MarksHubScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();
    const teacherId = session?.linked_teacher_id || 0;

    // Data
    const [marks, setMarks] = useState<StudentMark[]>([]);
    const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
    const [forms, setForms] = useState<{ id: number; name: string; level: number }[]>([]);
    const [streams, setStreams] = useState<{ id: number; name: string }[]>([]);
    const [termId, setTermId] = useState(0);
    const [termName, setTermName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Selectors
    const [selectedFormId, setSelectedFormId] = useState(0);
    const [selectedStreamId, setSelectedStreamId] = useState(0);
    const [selectedSubjectId, setSelectedSubjectId] = useState(0);
    const [selectedExamType, setSelectedExamType] = useState('End-Term');

    // UI
    const [viewMode, setViewMode] = useState<ViewMode>('entry');
    const [searchQuery, setSearchQuery] = useState('');
    const [scoreModal, setScoreModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentMark | null>(null);

    const maxScore = EXAM_TYPES.find(e => e.key === selectedExamType)?.max || 100;
    const examColor = EXAM_TYPES.find(e => e.key === selectedExamType)?.color || C.primary;

    // ── Fetch students & marks ─────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const term = await getCurrentTerm();
            setTermId(term?.id || 0);
            setTermName(term?.term_name || '');

            // Get teacher assignments
            const { data: assignments } = await supabase
                .from('school_subject_teachers')
                .select('form_id, stream_id, subject_id, school_forms(form_name, form_level), school_subjects(subject_name)')
                .eq('teacher_id', teacherId);

            // Build selectable forms & subjects
            const formMap: Record<number, { name: string; level: number }> = {};
            const subjMap: Record<number, string> = {};
            (assignments || []).forEach((a: any) => {
                if (a.form_id) formMap[a.form_id] = { name: a.school_forms?.form_name || '', level: a.school_forms?.form_level || 0 };
                if (a.subject_id) subjMap[a.subject_id] = a.school_subjects?.subject_name || '';
            });

            const formList = Object.entries(formMap).map(([id, v]) => ({ id: Number(id), name: v.name, level: v.level }));
            const subjList = Object.entries(subjMap).map(([id, name]) => ({ id: Number(id), name }));

            setForms(formList);
            setSubjects(subjList);

            const activeFormId = selectedFormId || formList[0]?.id || 0;
            const activeSubjId = selectedSubjectId || subjList[0]?.id || 0;
            if (!selectedFormId && formList[0]) setSelectedFormId(formList[0].id);
            if (!selectedSubjectId && subjList[0]) setSelectedSubjectId(subjList[0].id);

            if (!activeFormId || !activeSubjId) { setLoading(false); setRefreshing(false); return; }

            // Get streams for this form
            const { data: streamData } = await supabase
                .from('school_streams').select('id, stream_name').eq('form_id', activeFormId);
            setStreams((streamData || []).map((s: any) => ({ id: s.id, name: s.stream_name })));

            // Fetch students
            let studQuery = supabase
                .from('school_students')
                .select('id, first_name, last_name, admission_number, stream_id, school_streams(stream_name)')
                .eq('form_id', activeFormId)
                .eq('status', 'Active')
                .order('first_name');
            if (selectedStreamId) studQuery = studQuery.eq('stream_id', selectedStreamId);
            const { data: students } = await studQuery;

            // Fetch existing marks
            const studentIds = (students || []).map((s: any) => s.id);
            const { data: marksData } = await supabase
                .from('school_exam_marks')
                .select('id, student_id, score, grade, exam_type, term_id')
                .eq('subject_id', activeSubjId)
                .eq('exam_type', selectedExamType)
                .eq('term_id', term?.id || 0)
                .in('student_id', studentIds);

            const marksMap: Record<number, any> = {};
            (marksData || []).forEach((m: any) => { marksMap[m.student_id] = m; });

            // Fetch previous term marks for comparison
            const { data: terms } = await supabase
                .from('school_terms').select('id').order('start_date', { ascending: false }).limit(5);
            const prevTermId = (terms || []).find((t: any) => t.id !== term?.id)?.id;
            let prevMarksMap: Record<number, number> = {};
            if (prevTermId && studentIds.length > 0) {
                const { data: prevMarks } = await supabase
                    .from('school_exam_marks')
                    .select('student_id, score')
                    .eq('subject_id', activeSubjId)
                    .eq('exam_type', selectedExamType)
                    .eq('term_id', prevTermId)
                    .in('student_id', studentIds);
                (prevMarks || []).forEach((m: any) => { prevMarksMap[m.student_id] = m.score; });
            }

            const studentMarks: StudentMark[] = (students || []).map((s: any, idx: number) => {
                const existing = marksMap[s.id];
                const score = existing?.score !== null && existing?.score !== undefined ? Number(existing.score) : null;
                const grade = existing?.grade || (score !== null ? getSimpleGrade(score) : null);
                const gradeInfo = score !== null ? getKNECGrade(score) : null;
                return {
                    studentId: s.id,
                    studentName: `${s.first_name} ${s.last_name}`,
                    admission: s.admission_number || '—',
                    streamName: s.school_streams?.stream_name || '—',
                    score,
                    grade,
                    points: gradeInfo?.points || 0,
                    prevScore: prevMarksMap[s.id] ?? null,
                    isDirty: false,
                };
            });

            // Assign ranks
            const sorted = [...studentMarks].filter(m => m.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            sorted.forEach((s, i) => { s.rank = i + 1; });

            setMarks(studentMarks);
        } catch (e: any) {
            console.error('MarksHub fetch error:', e.message);
        }
        setLoading(false);
        setRefreshing(false);
    }, [teacherId, selectedFormId, selectedStreamId, selectedSubjectId, selectedExamType]);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    // ── Update score locally ────────────────────────────────────
    const updateScore = (studentId: number, score: number) => {
        setMarks(prev => prev.map(m => {
            if (m.studentId !== studentId) return m;
            const g = getKNECGrade(score);
            return { ...m, score, grade: g.grade, points: g.points, isDirty: true };
        }));
    };

    // ── Save all dirty marks ────────────────────────────────────
    const saveAll = async () => {
        const dirty = marks.filter(m => m.isDirty && m.score !== null);
        if (dirty.length === 0) { Alert.alert('No changes', 'No marks have been modified.'); return; }
        setSyncStatus('saving'); setSaving(true);
        try {
            const payload = dirty.map(m => ({
                student_id: m.studentId,
                subject_id: selectedSubjectId,
                score: m.score!,
                exam_type: selectedExamType,
                term_id: termId,
                grade: m.grade || '',
            }));
            const result = await saveMarks(payload);
            if (result.success) {
                setMarks(prev => prev.map(m => ({ ...m, isDirty: false })));
                setSyncStatus('saved');
                setLastSaved(new Date());
                Alert.alert('✅ Saved!', `${dirty.length} marks saved successfully.`);
            } else {
                setSyncStatus('error');
                Alert.alert('❌ Error', result.error || 'Failed to save marks.');
            }
        } catch (e: any) {
            setSyncStatus('error');
            Alert.alert('Error', e.message);
        }
        setSaving(false);
        setTimeout(() => setSyncStatus('idle'), 3000);
    };

    // ── Analytics ───────────────────────────────────────────────
    const entered = marks.filter(m => m.score !== null);
    const mean = entered.length > 0
        ? Math.round(entered.reduce((s, m) => s + (m.score || 0), 0) / entered.length)
        : 0;
    const highest = entered.length > 0 ? Math.max(...entered.map(m => m.score || 0)) : 0;
    const lowest = entered.length > 0 ? Math.min(...entered.map(m => m.score || 0)) : 0;
    const passRate = entered.length > 0 ? Math.round(entered.filter(m => (m.score || 0) >= 50).length / entered.length * 100) : 0;
    const dirtyCount = marks.filter(m => m.isDirty).length;
    const meanGrade = getKNECGrade(mean);

    const top5 = [...entered].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
    const bottom5 = [...entered].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 5);
    const atRisk = entered.filter(m => (m.score || 0) < 50);
    const filtered = searchQuery.trim()
        ? marks.filter(m =>
            m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.admission.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : marks;

    if (loading) return (
        <View style={s.loadingScreen}>
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={StyleSheet.absoluteFillObject as any} />
            <View style={s.loadingCard}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📝</Text>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={s.loadingTitle}>Loading Marks Hub</Text>
                <Text style={s.loadingText}>Fetching marks data…</Text>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />

            {/* ── HEADER ─────────────────────────────────────────── */}
            <LinearGradient colors={['#1d4ed8', '#2563eb', '#3b82f6']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>📝 8-4-4 Marks Hub</Text>
                            <Text style={s.headerSub}>{termName} · {marks.length} students</Text>
                        </View>
                        {/* Sync indicator */}
                        <View style={s.syncBadge}>
                            {syncStatus === 'saving' && <ActivityIndicator size="small" color="#fff" />}
                            {syncStatus === 'saved' && <Text style={s.syncText}>✅ Saved</Text>}
                            {syncStatus === 'error' && <Text style={s.syncText}>❌ Error</Text>}
                            {syncStatus === 'idle' && dirtyCount > 0 && (
                                <Text style={[s.syncText, { color: '#fcd34d' }]}>● {dirtyCount} unsaved</Text>
                            )}
                        </View>
                    </View>

                    {/* ── KPI ROW ──────────────────────────────── */}
                    <View style={s.kpiRow}>
                        <View style={s.kpiCard}>
                            <Text style={s.kpiLabel}>Mean</Text>
                            <Text style={s.kpiVal}>{mean}</Text>
                            <View style={[s.kpiGrade, { backgroundColor: meanGrade.bg }]}>
                                <Text style={[s.kpiGradeText, { color: meanGrade.color }]}>{meanGrade.grade}</Text>
                            </View>
                        </View>
                        <View style={s.kpiCard}>
                            <Text style={s.kpiLabel}>Highest</Text>
                            <Text style={[s.kpiVal, { color: '#86efac' }]}>{highest}</Text>
                            <Text style={s.kpiSub}>{entered.length > 0 ? getSimpleGrade(highest) : '—'}</Text>
                        </View>
                        <View style={s.kpiCard}>
                            <Text style={s.kpiLabel}>Lowest</Text>
                            <Text style={[s.kpiVal, { color: '#fca5a5' }]}>{lowest}</Text>
                            <Text style={s.kpiSub}>{entered.length > 0 ? getSimpleGrade(lowest) : '—'}</Text>
                        </View>
                        <View style={s.kpiCard}>
                            <Text style={s.kpiLabel}>Pass Rate</Text>
                            <Text style={[s.kpiVal, { color: passRate >= 50 ? '#86efac' : '#fca5a5' }]}>{passRate}%</Text>
                            <Text style={s.kpiSub}>{entered.filter(m => (m.score || 0) >= 50).length}/{entered.length}</Text>
                        </View>
                    </View>

                    {/* View mode tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                        {([
                            ['entry',       '✏️ Marks Entry'],
                            ['analysis',    '📊 Analysis'],
                            ['leaderboard', `🏆 Rankings`],
                            ['sheet',       '📋 Mark Sheet'],
                        ] as [ViewMode, string][]).map(([mode, label]) => (
                            <TouchableOpacity key={mode} onPress={() => setViewMode(mode)}
                                style={[s.modeBtn, viewMode === mode && s.modeBtnActive]}>
                                <Text style={[s.modeBtnText, viewMode === mode && s.modeBtnTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>

            {/* ── SELECTORS ───────────────────────────────────────── */}
            <View style={s.selectors}>
                {/* Form */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                    {forms.map(f => (
                        <TouchableOpacity key={f.id} onPress={() => { setSelectedFormId(f.id); setSelectedStreamId(0); }}
                            style={[s.chip, selectedFormId === f.id && s.chipActive]}>
                            <Text style={[s.chipText, selectedFormId === f.id && s.chipTextActive]}>{f.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                {/* Stream */}
                {streams.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                        <TouchableOpacity onPress={() => setSelectedStreamId(0)}
                            style={[s.chip, !selectedStreamId && s.chipActive]}>
                            <Text style={[s.chipText, !selectedStreamId && s.chipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {streams.map(st => (
                            <TouchableOpacity key={st.id} onPress={() => setSelectedStreamId(st.id)}
                                style={[s.chip, selectedStreamId === st.id && s.chipActive]}>
                                <Text style={[s.chipText, selectedStreamId === st.id && s.chipTextActive]}>{st.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
                {/* Subject */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                    {subjects.map(subj => (
                        <TouchableOpacity key={subj.id} onPress={() => setSelectedSubjectId(subj.id)}
                            style={[s.chip, selectedSubjectId === subj.id && { ...s.chipActive, backgroundColor: C.violet, borderColor: C.violet }]}>
                            <Text style={[s.chipText, selectedSubjectId === subj.id && { ...s.chipTextActive }]}>{subj.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                {/* Exam type */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                    {EXAM_TYPES.map(et => (
                        <TouchableOpacity key={et.key} onPress={() => setSelectedExamType(et.key)}
                            style={[s.chip, selectedExamType === et.key && { backgroundColor: et.color, borderColor: et.color }]}>
                            <Text style={[s.chipText, selectedExamType === et.key && { color: '#fff' }]}>{et.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* ══════════════════════════════════════════
                  MARKS ENTRY VIEW
              ══════════════════════════════════════════ */}
            {viewMode === 'entry' && (
                <>
                    <View style={s.searchSave}>
                        <View style={s.searchBar}>
                            <Text>🔍</Text>
                            <TextInput
                                style={s.searchInput}
                                placeholder="Search student…"
                                placeholderTextColor={C.textDim}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Text style={{ color: C.textDim }}>✕</Text></TouchableOpacity> : null}
                        </View>
                        <TouchableOpacity style={[s.saveAllBtn, saving && { opacity: 0.6 }]} onPress={saveAll} disabled={saving}>
                            <LinearGradient colors={['#059669', '#047857']} style={s.saveAllGrad}>
                                {saving
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={s.saveAllText}>💾 Save All{dirtyCount > 0 ? ` (${dirtyCount})` : ''}</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={filtered}
                        keyExtractor={item => String(item.studentId)}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                        renderItem={({ item, index }) => {
                            const g = item.score !== null ? getKNECGrade(item.score) : null;
                            const trend = item.prevScore !== null && item.prevScore !== undefined && item.score !== null
                                ? (item.score > item.prevScore ? '📈' : item.score < item.prevScore ? '📉' : '➡️')
                                : null;
                            return (
                                <TouchableOpacity
                                    style={[s.studentRow,
                                        index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#f8fafc' },
                                        item.isDirty && s.studentRowDirty,
                                    ]}
                                    onPress={() => { setSelectedStudent(item); setScoreModal(true); }}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.rankBadge}>
                                        <Text style={s.rankText}>{item.rank ?? '—'}</Text>
                                    </View>
                                    <View style={s.studentAvatar}>
                                        <Text style={s.avatarText}>{item.studentName[0]}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={s.studentName}>{item.studentName}</Text>
                                            {item.isDirty && <View style={s.dirtyDot} />}
                                        </View>
                                        <Text style={s.studentMeta}>📋 {item.admission} · {item.streamName}</Text>
                                        {trend && (
                                            <Text style={s.trendText}>
                                                {trend} vs prev: {item.prevScore ?? '—'} → {item.score ?? '—'}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={s.scoreWrap}>
                                        {item.score !== null ? (
                                            <View style={[s.scoreBox, { backgroundColor: g?.bg || '#f1f5f9', borderColor: g?.color || '#e2e8f0' }]}>
                                                <Text style={[s.scoreNum, { color: g?.color }]}>{item.score}</Text>
                                                <Text style={[s.scoreSub, { color: g?.color }]}>/{maxScore}</Text>
                                            </View>
                                        ) : (
                                            <View style={s.emptyScore}>
                                                <Text style={s.emptyScoreText}>Tap to enter</Text>
                                            </View>
                                        )}
                                        <GradeBadge score={item.score} size="sm" />
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListHeaderComponent={() => (
                            <View style={s.listHeader}>
                                <Text style={[s.listHeaderText, { flex: 0.4 }]}>#</Text>
                                <Text style={[s.listHeaderText, { flex: 2 }]}>Student</Text>
                                <Text style={[s.listHeaderText, { flex: 1, textAlign: 'right' }]}>Score / Grade</Text>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={s.emptyBox}>
                                <Text style={{ fontSize: 44 }}>📝</Text>
                                <Text style={s.emptyTitle}>No Students Found</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </>
            )}

            {/* ══════════════════════════════════════════
                  ANALYSIS VIEW
              ══════════════════════════════════════════ */}
            {viewMode === 'analysis' && (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                    contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
                >
                    <GradeDistBar marks={marks} total={marks.length} />

                    {/* Pass/Fail summary */}
                    <View style={s.analysisCard}>
                        <Text style={s.analysisTitle}>📈 Class Summary</Text>
                        <View style={s.analysisStat}>
                            <Text style={s.analysisLabel}>Students Entered</Text>
                            <Text style={s.analysisValue}>{entered.length} / {marks.length}</Text>
                        </View>
                        <View style={s.analysisStat}>
                            <Text style={s.analysisLabel}>Class Mean Score</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[s.analysisValue, { color: meanGrade.color }]}>{mean}</Text>
                                <GradeBadge score={mean} size="md" />
                            </View>
                        </View>
                        <View style={s.analysisStat}>
                            <Text style={s.analysisLabel}>Pass Rate (≥50)</Text>
                            <Text style={[s.analysisValue, { color: passRate >= 50 ? C.emerald : C.rose }]}>{passRate}%</Text>
                        </View>
                        <View style={s.analysisStat}>
                            <Text style={s.analysisLabel}>Highest Score</Text>
                            <Text style={[s.analysisValue, { color: C.emerald }]}>{highest} ({entered.length > 0 ? getSimpleGrade(highest) : '—'})</Text>
                        </View>
                        <View style={s.analysisStat}>
                            <Text style={s.analysisLabel}>Lowest Score</Text>
                            <Text style={[s.analysisValue, { color: C.rose }]}>{lowest} ({entered.length > 0 ? getSimpleGrade(lowest) : '—'})</Text>
                        </View>
                    </View>

                    {/* Subject grade count table */}
                    <View style={s.analysisCard}>
                        <Text style={s.analysisTitle}>🎯 Grade Breakdown</Text>
                        <View style={s.gradeTable}>
                            <View style={s.gradeTableHeader}>
                                <Text style={[s.gradeTableCell, { color: C.textSub }]}>Grade</Text>
                                <Text style={[s.gradeTableCell, { color: C.textSub }]}>Count</Text>
                                <Text style={[s.gradeTableCell, { color: C.textSub }]}>%</Text>
                                <Text style={[s.gradeTableCell, { color: C.textSub }]}>Points</Text>
                            </View>
                            {KNEC_GRADES.map(g => {
                                const count = entered.filter(m => m.grade === g.grade).length;
                                const pct = entered.length > 0 ? Math.round(count / entered.length * 100) : 0;
                                if (count === 0) return null;
                                return (
                                    <View key={g.grade} style={[s.gradeTableRow, { backgroundColor: g.bg }]}>
                                        <View style={s.gradeTableCell}>
                                            <GradeBadge score={g.min} size="sm" />
                                        </View>
                                        <Text style={[s.gradeTableCell, { color: g.color, fontWeight: '900' }]}>{count}</Text>
                                        <Text style={[s.gradeTableCell, { color: g.color }]}>{pct}%</Text>
                                        <Text style={[s.gradeTableCell, { color: g.color }]}>{g.points}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* At-risk */}
                    {atRisk.length > 0 && (
                        <View style={s.atRiskCard}>
                            <LinearGradient colors={['#e11d48', '#be123c']} style={s.atRiskHeader}>
                                <Text style={s.atRiskHeaderTitle}>⚠️ {atRisk.length} Students Below 50%</Text>
                                <Text style={s.atRiskHeaderSub}>Require immediate attention</Text>
                            </LinearGradient>
                            {atRisk.map(m => (
                                <View key={m.studentId} style={s.atRiskRow}>
                                    <Text style={s.atRiskName}>{m.studentName}</Text>
                                    <Text style={s.atRiskAdm}>{m.admission}</Text>
                                    <View style={{ flex: 1 }} />
                                    <View style={[s.atRiskScore, { backgroundColor: getKNECGrade(m.score || 0).bg }]}>
                                        <Text style={[s.atRiskScoreText, { color: getKNECGrade(m.score || 0).color }]}>
                                            {m.score} · {m.grade}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* ══════════════════════════════════════════
                  LEADERBOARD VIEW
              ══════════════════════════════════════════ */}
            {viewMode === 'leaderboard' && (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                    contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
                >
                    {/* Top 5 */}
                    <Text style={s.rankSectionTitle}>🥇 Top Performers</Text>
                    {top5.map((m, i) => {
                        const g = m.score !== null ? getKNECGrade(m.score) : null;
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                        return (
                            <View key={m.studentId} style={[s.leaderCard,
                                i === 0 && { borderColor: '#fbbf24', borderWidth: 2, backgroundColor: '#fffbeb' }
                            ]}>
                                <Text style={s.medal}>{medals[i]}</Text>
                                <View style={s.leaderAvatar}>
                                    <Text style={s.leaderAvatarText}>{m.studentName[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.leaderName}>{m.studentName}</Text>
                                    <Text style={s.leaderMeta}>{m.admission} · {m.streamName}</Text>
                                </View>
                                <View style={[s.leaderScore, { backgroundColor: g?.bg }]}>
                                    <Text style={[s.leaderScoreNum, { color: g?.color }]}>{m.score}</Text>
                                    <Text style={[s.leaderScoreGrade, { color: g?.color }]}>{g?.grade}</Text>
                                </View>
                            </View>
                        );
                    })}

                    {/* Full ranked table */}
                    <Text style={[s.rankSectionTitle, { marginTop: 16 }]}>📋 Full Rankings</Text>
                    <View style={s.rankTable}>
                        <View style={s.rankTableHeader}>
                            <Text style={[s.rankTableCell, { flex: 0.4 }]}>Rank</Text>
                            <Text style={[s.rankTableCell, { flex: 2 }]}>Student</Text>
                            <Text style={[s.rankTableCell, { flex: 0.7, textAlign: 'right' }]}>Score</Text>
                            <Text style={[s.rankTableCell, { flex: 0.5, textAlign: 'center' }]}>Grade</Text>
                        </View>
                        {[...entered]
                            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                            .map((m, i) => {
                                const g = getKNECGrade(m.score!);
                                return (
                                    <View key={m.studentId} style={[s.rankTableRow,
                                        i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#f8fafc' }
                                    ]}>
                                        <Text style={[s.rankTableCell, { flex: 0.4, fontWeight: '900', color: C.primary }]}>{i + 1}</Text>
                                        <View style={{ flex: 2 }}>
                                            <Text style={s.rankName}>{m.studentName}</Text>
                                            <Text style={s.rankAdm}>{m.admission}</Text>
                                        </View>
                                        <Text style={[s.rankTableCell, { flex: 0.7, textAlign: 'right', fontWeight: '900', color: g.color }]}>{m.score}</Text>
                                        <View style={{ flex: 0.5, alignItems: 'center' }}>
                                            <GradeBadge score={m.score} size="sm" />
                                        </View>
                                    </View>
                                );
                            })}
                    </View>
                </ScrollView>
            )}

            {/* ══════════════════════════════════════════
                  MARK SHEET VIEW
              ══════════════════════════════════════════ */}
            {viewMode === 'sheet' && (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View style={s.sheetHeader}>
                        <Text style={s.sheetTitle}>📋 Official Mark Sheet</Text>
                        <Text style={s.sheetSub}>{forms.find(f => f.id === selectedFormId)?.name || ''} · {subjects.find(s => s.id === selectedSubjectId)?.name || ''}</Text>
                        <Text style={s.sheetSub2}>{selectedExamType} · {termName}</Text>
                    </View>
                    <View style={s.sheetTable}>
                        <View style={s.sheetTableHeader}>
                            <Text style={[s.sheetCell, { flex: 0.4 }]}>#</Text>
                            <Text style={[s.sheetCell, { flex: 0.7 }]}>Adm.</Text>
                            <Text style={[s.sheetCell, { flex: 1.8 }]}>Name</Text>
                            <Text style={[s.sheetCell, { flex: 0.6, textAlign: 'center' }]}>Score</Text>
                            <Text style={[s.sheetCell, { flex: 0.5, textAlign: 'center' }]}>Grade</Text>
                            <Text style={[s.sheetCell, { flex: 0.5, textAlign: 'center' }]}>Pts</Text>
                        </View>
                        {marks.map((m, i) => {
                            const g = m.score !== null ? getKNECGrade(m.score) : null;
                            return (
                                <View key={m.studentId} style={[s.sheetTableRow,
                                    i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#f8fafc' }
                                ]}>
                                    <Text style={[s.sheetCell, { flex: 0.4, color: C.textSub }]}>{i + 1}</Text>
                                    <Text style={[s.sheetCell, { flex: 0.7, color: C.textSub, fontSize: 10 }]}>{m.admission}</Text>
                                    <Text style={[s.sheetCell, { flex: 1.8, fontWeight: '700' }]}>{m.studentName}</Text>
                                    <Text style={[s.sheetCell, { flex: 0.6, textAlign: 'center', fontWeight: '900', color: g?.color || C.textDim }]}>
                                        {m.score ?? '—'}
                                    </Text>
                                    <Text style={[s.sheetCell, { flex: 0.5, textAlign: 'center', fontWeight: '900', color: g?.color || C.textDim }]}>
                                        {m.grade ?? '—'}
                                    </Text>
                                    <Text style={[s.sheetCell, { flex: 0.5, textAlign: 'center', color: C.textSub }]}>
                                        {g?.points ?? '—'}
                                    </Text>
                                </View>
                            );
                        })}
                        {/* Totals row */}
                        <View style={[s.sheetTableRow, { backgroundColor: '#dbeafe' }]}>
                            <Text style={[s.sheetCell, { flex: 0.4, fontWeight: '900', color: C.primary }]}>—</Text>
                            <Text style={[s.sheetCell, { flex: 0.7 }]}></Text>
                            <Text style={[s.sheetCell, { flex: 1.8, fontWeight: '900', color: C.primary }]}>Class Mean</Text>
                            <Text style={[s.sheetCell, { flex: 0.6, textAlign: 'center', fontWeight: '900', color: meanGrade.color }]}>{mean}</Text>
                            <Text style={[s.sheetCell, { flex: 0.5, textAlign: 'center', fontWeight: '900', color: meanGrade.color }]}>{meanGrade.grade}</Text>
                            <Text style={[s.sheetCell, { flex: 0.5, textAlign: 'center', fontWeight: '900', color: C.primary }]}>{meanGrade.points}</Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Score Input Modal */}
            <ScoreInputModal
                visible={scoreModal}
                student={selectedStudent}
                examType={selectedExamType}
                maxScore={maxScore}
                onSave={updateScore}
                onClose={() => setScoreModal(false)}
            />
        </View>
    );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', margin: 32, elevation: 10 },
    loadingTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 12 },
    loadingText: { fontSize: 12, color: C.textSub, marginTop: 4 },

    header: { paddingTop: 44, paddingBottom: 12, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    syncBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', minWidth: 60 },
    syncText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    kpiCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
    kpiLabel: { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase' },
    kpiVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
    kpiSub: { fontSize: 9, color: 'rgba(255,255,255,0.65)' },
    kpiGrade: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    kpiGradeText: { fontSize: 11, fontWeight: '900' },

    modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 6 },
    modeBtnActive: { backgroundColor: '#fff' },
    modeBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    modeBtnTextActive: { color: C.primary },

    selectors: { backgroundColor: '#fff', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: 2 },
    chipRow: { paddingHorizontal: 12, gap: 6, paddingVertical: 2 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: '#f8fafc' },
    chipActive: { backgroundColor: C.primary, borderColor: C.primary },
    chipText: { fontSize: 10, fontWeight: '700', color: C.textSub },
    chipTextActive: { color: '#fff' },

    searchSave: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, fontSize: 13, color: C.text },
    saveAllBtn: { borderRadius: 12, overflow: 'hidden' },
    saveAllGrad: { paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
    saveAllText: { fontSize: 11, fontWeight: '900', color: '#fff' },

    listHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    listHeaderText: { fontSize: 9, fontWeight: '800', color: C.primary, textTransform: 'uppercase' },

    studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    studentRowDirty: { borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
    rankBadge: { width: 24, alignItems: 'center' },
    rankText: { fontSize: 10, fontWeight: '900', color: C.textSub },
    studentAvatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontWeight: '900', color: C.primary },
    studentName: { fontSize: 13, fontWeight: '800', color: C.text },
    studentMeta: { fontSize: 10, color: C.textSub, marginTop: 1 },
    trendText: { fontSize: 9, color: C.textDim, marginTop: 1 },
    dirtyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
    scoreWrap: { alignItems: 'flex-end', gap: 4 },
    scoreBox: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'baseline', gap: 1 },
    scoreNum: { fontSize: 18, fontWeight: '900' },
    scoreSub: { fontSize: 10, fontWeight: '600', opacity: 0.7 },
    emptyScore: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 8, borderStyle: 'dashed' },
    emptyScoreText: { fontSize: 9, color: C.textDim, fontWeight: '600' },

    analysisCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
    analysisTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
    analysisStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    analysisLabel: { fontSize: 12, color: C.textSub, fontWeight: '600' },
    analysisValue: { fontSize: 15, fontWeight: '900', color: C.text },

    gradeTable: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
    gradeTableHeader: { flexDirection: 'row', backgroundColor: '#e0e7ff', padding: 8 },
    gradeTableRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
    gradeTableCell: { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },

    atRiskCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12 },
    atRiskHeader: { padding: 14 },
    atRiskHeaderTitle: { fontSize: 14, fontWeight: '900', color: '#fff' },
    atRiskHeaderSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    atRiskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#fecdd3', backgroundColor: '#fff' },
    atRiskName: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1.5 },
    atRiskAdm: { fontSize: 10, color: C.textSub },
    atRiskScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    atRiskScoreText: { fontSize: 12, fontWeight: '900' },

    rankSectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10 },
    leaderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
    medal: { fontSize: 24 },
    leaderAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    leaderAvatarText: { fontSize: 16, fontWeight: '900', color: C.primary },
    leaderName: { fontSize: 14, fontWeight: '800', color: C.text },
    leaderMeta: { fontSize: 10, color: C.textSub, marginTop: 2 },
    leaderScore: { padding: 12, borderRadius: 14, alignItems: 'center' },
    leaderScoreNum: { fontSize: 20, fontWeight: '900' },
    leaderScoreGrade: { fontSize: 11, fontWeight: '800', marginTop: 2 },

    rankTable: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    rankTableHeader: { flexDirection: 'row', backgroundColor: '#dbeafe', padding: 10 },
    rankTableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    rankTableCell: { flex: 1, fontSize: 10, fontWeight: '700', color: C.textSub, textTransform: 'uppercase' },
    rankName: { fontSize: 12, fontWeight: '800', color: C.text },
    rankAdm: { fontSize: 9, color: C.textSub },

    sheetHeader: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff' },
    sheetTitle: { fontSize: 15, fontWeight: '900', color: C.text },
    sheetSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
    sheetSub2: { fontSize: 10, color: C.textDim, marginTop: 2 },
    sheetTable: { backgroundColor: '#fff' },
    sheetTableHeader: { flexDirection: 'row', backgroundColor: '#dbeafe', padding: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    sheetTableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    sheetCell: { flex: 1, fontSize: 10, fontWeight: '700', color: C.textSub },

    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
});
