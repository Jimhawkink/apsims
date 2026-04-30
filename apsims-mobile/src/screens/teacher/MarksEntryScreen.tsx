import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSession, ExamMark, getStudentsForMarksEntry, saveMarks, getCurrentTerm, getGrade } from '../../lib/supabase';

interface Props {
    session: UserSession;
    params: {
        subject_id: number; subject_name: string;
        form_id: number; form_name: string;
        stream_id: number; stream_name: string;
    };
    onBack: () => void;
}

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', danger: '#ef4444',
    warning: '#f59e0b', text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function MarksEntryScreen({ session, params, onBack }: Props) {
    const [students, setStudents] = useState<ExamMark[]>([]);
    const [scores, setScores] = useState<Record<number, string>>({});
    const [examType, setExamType] = useState('Mid-Term');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [termId, setTermId] = useState(0);

    const EXAM_TYPES = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock'];

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [studentsList, term] = await Promise.all([
                getStudentsForMarksEntry(params.subject_id, params.form_id, params.stream_id),
                getCurrentTerm(),
            ]);
            setStudents(studentsList);
            if (term) setTermId(term.id);
            const initial: Record<number, string> = {};
            studentsList.forEach(s => { if (s.score !== null) initial[s.student_id] = String(s.score); });
            setScores(initial);
        } catch (err: any) {
            console.error('MarksEntry load error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => { loadData(); }, [loadData]);

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
            Alert.alert('✅ Saved!', `${marksToSave.length} marks saved successfully.`, [
                { text: 'Continue Editing' },
                { text: 'Go Back', onPress: onBack },
            ]);
        } else {
            Alert.alert('❌ Error', result.error || 'Failed to save marks.');
        }
    };

    const entered = Object.values(scores).filter(v => v.trim() !== '').length;
    const total = students.length;

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
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>📝 {params.subject_name}</Text>
                    <Text style={styles.headerSub}>{params.form_name} • {params.stream_name}</Text>
                    <View style={styles.headerStats}>
                        <View style={styles.headerChip}>
                            <Text style={styles.headerChipText}>📊 {entered}/{total} entered</Text>
                        </View>
                        <View style={styles.headerChip}>
                            <Text style={styles.headerChipText}>📋 {examType}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Exam Type Selector */}
                <View style={styles.examTypeRow}>
                    <Text style={styles.examTypeLabel}>📋 Exam Type:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                        <View style={styles.examTypeChips}>
                            {EXAM_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setExamType(t)}
                                    style={[styles.examTypeChip, examType === t && styles.examTypeChipActive]}
                                >
                                    <Text style={[styles.examTypeChipText, examType === t && styles.examTypeChipTextActive]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>#</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Student</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Adm No</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Score</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>Grade</Text>
                </View>

                {/* Student Rows */}
                {students.map((s, idx) => {
                    const scoreVal = scores[s.student_id] || '';
                    const numScore = parseInt(scoreVal, 10);
                    const grade = scoreVal.trim() ? getGrade(isNaN(numScore) ? 0 : numScore) : '-';
                    const gradeColor = grade === 'A' || grade === 'B' ? C.accent
                        : grade === 'C' ? C.warning : grade === '-' ? C.textDim : C.danger;

                    return (
                        <View key={s.student_id} style={[styles.studentRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                            <Text style={[styles.cellText, { flex: 0.5 }]}>{idx + 1}</Text>
                            <Text style={[styles.cellText, styles.cellName, { flex: 2 }]} numberOfLines={1}>
                                {s.student_name}
                            </Text>
                            <Text style={[styles.cellText, { flex: 1, color: C.textSub }]}>{s.admission_number}</Text>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={styles.scoreInput}
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
                                />
                            </View>
                            <View style={{ flex: 0.6, alignItems: 'center' }}>
                                <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '18' }]}>
                                    <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {students.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyTitle}>No Students Found</Text>
                        <Text style={styles.emptySub}>No active students in {params.form_name} {params.stream_name}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Save Button */}
            {students.length > 0 && (
                <View style={styles.saveBar}>
                    <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ flex: 1 }}>
                        <LinearGradient colors={['#059669', '#047857']} style={styles.saveBtn}>
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.saveBtnEmoji}>💾</Text>
                                    <Text style={styles.saveBtnText}>Save {entered} Marks</Text>
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
    content: { paddingBottom: 100 },

    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    headerStats: { flexDirection: 'row', gap: 8, marginTop: 10 },
    headerChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    headerChipText: { fontSize: 11, color: '#fff', fontWeight: '700' },

    examTypeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    examTypeLabel: { fontSize: 12, fontWeight: '700', color: C.text },
    examTypeChips: { flexDirection: 'row', gap: 6 },
    examTypeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border },
    examTypeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    examTypeChipText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    examTypeChipTextActive: { color: '#fff' },

    tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
    tableHeaderText: { fontSize: 10, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },

    studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rowEven: { backgroundColor: '#fff' },
    rowOdd: { backgroundColor: '#fafbfc' },
    cellText: { fontSize: 12, color: C.text, fontWeight: '500' },
    cellName: { fontWeight: '700' },

    scoreInput: {
        backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
        fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'center',
    },
    gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    gradeText: { fontSize: 12, fontWeight: '900' },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub },

    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 16 },
    saveBtnEmoji: { fontSize: 18 },
    saveBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
