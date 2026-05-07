import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import {
    supabase, ExamMark,
    getStudentsForMarksEntry, saveMarks, getCurrentTerm, getGrade,
} from '../../lib/supabase';
import { queueOfflineRecord, getQueueCount } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';

type RouteProps = RouteProp<RootStackParamList, 'MarksEntry'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', danger: '#ef4444',
    warning: '#f59e0b', text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const EXAM_TYPES = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock'];

export default function MarksEntryScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const params = route.params;
    const { isConnected } = useNetworkStatus();

    // ── Detect Grade 10+ (CBC) and redirect to CBC marks entry ──
    useEffect(() => {
        const checkFormLevel = async () => {
            const { data } = await supabase
                .from('school_forms')
                .select('form_level, education_system')
                .eq('id', params.form_id)
                .single();

            if (data && (data.form_level >= 10 || data.education_system === 'CBC_Senior_School')) {
                // Replace this screen with CBC marks entry
                navigation.replace('CBCMarksEntry', {
                    subjectId: params.subject_id,
                    subjectName: params.subject_name,
                    formId: params.form_id,
                    formName: params.form_name,
                    streamId: params.stream_id,
                    streamName: params.stream_name,
                });
            }
        };
        checkFormLevel();
    }, [params.form_id]);
    const [allStudents, setAllStudents] = useState<ExamMark[]>([]);
    const [scores, setScores] = useState<Record<number, string>>({});
    const [examType, setExamType] = useState('CAT 1');
    const [loading, setLoading] = useState(true);
    const [loadingMarks, setLoadingMarks] = useState(false);
    const [saving, setSaving] = useState(false);
    const [termId, setTermId] = useState(0);
    const [termName, setTermName] = useState('');
    const [search, setSearch] = useState('');

    // Filtered students based on search
    const students = search.trim()
        ? allStudents.filter(s =>
            s.student_name.toLowerCase().includes(search.toLowerCase()) ||
            s.admission_number.toLowerCase().includes(search.toLowerCase())
          )
        : allStudents;

    // Load students once on mount
    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const [studentsList, term] = await Promise.all([
                getStudentsForMarksEntry(params.subject_id, params.form_id, params.stream_id),
                getCurrentTerm(),
            ]);
            setAllStudents(studentsList);
            if (term) {
                setTermId(term.id);
                setTermName(term.term_name);
            }
        } catch (err: any) {
            console.error('MarksEntry load error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    // Load marks for selected exam type — runs when examType, students, or termId changes
    const loadMarksForExamType = useCallback(async (type: string, studentList: ExamMark[], tId: number) => {
        if (studentList.length === 0 || tId === 0) return;
        setLoadingMarks(true);
        setScores({});
        try {
            const studentIds = studentList.map(s => s.student_id);
            const { data, error } = await supabase
                .from('school_exam_marks')
                .select('student_id, score')
                .eq('subject_id', params.subject_id)
                .eq('term_id', tId)
                .eq('exam_type', type)
                .in('student_id', studentIds);

            if (error) {
                console.error('Load marks error:', error.message);
                setScores({});
                return;
            }

            const loaded: Record<number, string> = {};
            (data || []).forEach((m: any) => {
                if (m.score !== null && m.score !== undefined) {
                    loaded[m.student_id] = String(m.score);
                }
            });
            setScores(loaded);
        } catch (err: any) {
            console.error('Load marks exception:', err.message);
            setScores({});
        } finally {
            setLoadingMarks(false);
        }
    }, [params.subject_id]);

    useEffect(() => {
        if (allStudents.length > 0 && termId > 0) {
            loadMarksForExamType(examType, allStudents, termId);
        }
    }, [examType, allStudents, termId, loadMarksForExamType]);

    const handleSave = async () => {
        const marksToSave = Object.entries(scores)
            .filter(([_, v]) => v.trim() !== '')
            .map(([studentId, scoreStr]) => {
                const score = parseInt(scoreStr, 10);
                return {
                    student_id: parseInt(studentId, 10),
                    subject_id: params.subject_id,
                    score: isNaN(score) ? 0 : Math.min(100, Math.max(0, score)),
                    exam_type: examType,
                    term_id: termId,
                    grade: getGrade(isNaN(score) ? 0 : score),
                };
            });

        if (marksToSave.length === 0) {
            Alert.alert('No Marks', 'Enter at least one mark before saving.');
            return;
        }

        setSaving(true);
        const result = await saveMarks(marksToSave);
        setSaving(false);

        if (result.success) {
            Alert.alert('✅ Saved!', `${marksToSave.length} marks saved for ${examType}.`, [
                { text: 'Continue Editing' },
                { text: 'Go Back', onPress: () => navigation.goBack() },
            ]);
        } else {
            Alert.alert('❌ Error', result.error || 'Failed to save marks.');
        }
    };

    const entered = Object.values(scores).filter(v => v.trim() !== '').length;
    const total = allStudents.length;
    const avg = entered > 0
        ? Math.round(Object.values(scores).filter(v => v.trim() !== '').reduce((s, v) => s + parseInt(v, 10), 0) / entered)
        : 0;

    const scopeLabel = !params.stream_id || params.stream_id === 0 || params.stream_name === 'All Streams'
        ? `${params.form_name} — All Streams`
        : `${params.form_name} • ${params.stream_name}`;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading students…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

            {/* Header */}
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>📝 {params.subject_name}</Text>
                    <Text style={styles.headerSub}>{scopeLabel}</Text>
                    <View style={styles.headerStats}>
                        <View style={styles.headerChip}>
                            <Text style={styles.headerChipText}>📊 {entered}/{total}</Text>
                        </View>
                        <View style={styles.headerChip}>
                            <Text style={styles.headerChipText}>📋 {examType}</Text>
                        </View>
                        {termName ? (
                            <View style={styles.headerChip}>
                                <Text style={styles.headerChipText}>📅 {termName}</Text>
                            </View>
                        ) : null}
                        {entered > 0 && (
                            <View style={styles.headerChip}>
                                <Text style={styles.headerChipText}>📈 Avg: {avg}%</Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Exam Type Selector */}
                <View style={styles.examTypeRow}>
                    <Text style={styles.examTypeLabel}>📋</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                        <View style={styles.examTypeChips}>
                            {EXAM_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setExamType(t)}
                                    style={[styles.examTypeChip, examType === t && styles.examTypeChipActive]}
                                    disabled={loadingMarks}
                                >
                                    <Text style={[styles.examTypeChipText, examType === t && styles.examTypeChipTextActive]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Search Bar */}
                <View style={styles.searchRow}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search student name or adm no…"
                        placeholderTextColor={C.textDim}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
                            <Text style={styles.searchClearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Loading marks indicator */}
                {loadingMarks ? (
                    <View style={styles.loadingMarksRow}>
                        <ActivityIndicator size="small" color={C.primary} />
                        <Text style={styles.loadingMarksText}>Loading {examType} marks…</Text>
                    </View>
                ) : (
                    <>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>#</Text>
                            <Text style={[styles.tableHeaderText, { flex: 2.2 }]}>Student</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Adm No</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Score</Text>
                            <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>Grade</Text>
                        </View>

                        {/* Student Rows */}
                        {students.map((s, idx) => {
                            const scoreVal = scores[s.student_id] || '';
                            const numScore = parseInt(scoreVal, 10);
                            const grade = scoreVal.trim() ? getGrade(isNaN(numScore) ? 0 : numScore) : '-';
                            const gradeColor = grade === 'A' ? '#059669'
                                : grade === 'B' ? '#2563eb'
                                : grade === 'C' ? C.warning
                                : grade === '-' ? C.textDim : C.danger;

                            return (
                                <View key={s.student_id} style={[styles.studentRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                                    <Text style={[styles.cellText, { flex: 0.4, color: C.textDim }]}>{idx + 1}</Text>
                                    <Text style={[styles.cellText, styles.cellName, { flex: 2.2 }]} numberOfLines={1}>
                                        {s.student_name}
                                    </Text>
                                    <Text style={[styles.cellText, { flex: 1, color: C.textSub, fontSize: 10 }]}>{s.admission_number}</Text>
                                    <View style={{ flex: 1 }}>
                                        <TextInput
                                            style={[styles.scoreInput, scoreVal ? styles.scoreInputFilled : {}]}
                                            value={scoreVal}
                                            onChangeText={t => {
                                                const clean = t.replace(/[^0-9]/g, '');
                                                const num = parseInt(clean, 10);
                                                if (clean === '' || (num >= 0 && num <= 100)) {
                                                    setScores(prev => ({ ...prev, [s.student_id]: clean }));
                                                }
                                            }}
                                            placeholder="—"
                                            placeholderTextColor={C.textDim}
                                            keyboardType="numeric"
                                            maxLength={3}
                                            returnKeyType="next"
                                        />
                                    </View>
                                    <View style={{ flex: 0.6, alignItems: 'center' }}>
                                        <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '20' }]}>
                                            <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        {students.length === 0 && (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyEmoji}>{search ? '🔍' : '📭'}</Text>
                                <Text style={styles.emptyTitle}>{search ? 'No students match' : 'No Students Found'}</Text>
                                <Text style={styles.emptySub}>{search ? `No results for "${search}"` : `No active students in ${scopeLabel}`}</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Save Button */}
            {allStudents.length > 0 && !loadingMarks && (
                <View style={styles.saveBar}>
                    <View style={styles.saveBarInfo}>
                        <Text style={styles.saveBarInfoText}>
                            {entered > 0 ? `${entered}/${total} marks entered` : 'No marks entered yet'}
                        </Text>
                        {entered > 0 && <Text style={styles.saveBarAvg}>Avg: {avg}% ({getGrade(avg)})</Text>}
                    </View>
                    <TouchableOpacity onPress={handleSave} disabled={saving || entered === 0} activeOpacity={0.85} style={{ flex: 1 }}>
                        <LinearGradient
                            colors={entered > 0 ? ['#059669', '#047857'] : ['#94a3b8', '#94a3b8']}
                            style={styles.saveBtn}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.saveBtnEmoji}>💾</Text>
                                    <Text style={styles.saveBtnText}>
                                        {entered > 0 ? `Save ${entered} Marks — ${examType}` : 'Enter marks to save'}
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    scroll: { flex: 1 },
    content: { paddingBottom: 150 },

    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    headerStats: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
    headerChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    headerChipText: { fontSize: 11, color: '#fff', fontWeight: '700' },

    examTypeRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff' },
    examTypeLabel: { fontSize: 14 },
    examTypeChips: { flexDirection: 'row', gap: 6 },
    examTypeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border },
    examTypeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    examTypeChipText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    examTypeChipTextActive: { color: '#fff' },

    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border,
    },
    searchIcon: { fontSize: 14 },
    searchInput: {
        flex: 1, fontSize: 13, color: C.text, fontWeight: '500',
        paddingVertical: 6, paddingHorizontal: 10,
        backgroundColor: '#f1f5f9', borderRadius: 10,
        borderWidth: 1, borderColor: C.border,
    },
    searchClear: { padding: 4 },
    searchClearText: { fontSize: 12, color: C.textDim, fontWeight: '700' },

    loadingMarksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
    loadingMarksText: { color: C.textSub, fontSize: 13, fontWeight: '500' },

    tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
    tableHeaderText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },

    studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rowEven: { backgroundColor: '#fff' },
    rowOdd: { backgroundColor: '#fafbfc' },
    cellText: { fontSize: 12, color: C.text, fontWeight: '500' },
    cellName: { fontWeight: '700', fontSize: 12 },

    scoreInput: {
        backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: C.border,
        borderRadius: 8, paddingHorizontal: 6, paddingVertical: 5,
        fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'center',
    },
    scoreInputFilled: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
    gradeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    gradeText: { fontSize: 11, fontWeight: '900' },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub },

    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
    saveBarInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
    saveBarInfoText: { fontSize: 12, color: C.textSub, fontWeight: '600' },
    saveBarAvg: { fontSize: 12, color: C.accent, fontWeight: '800' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
    saveBtnEmoji: { fontSize: 16 },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
