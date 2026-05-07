import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import {
    getCBCStudentsForSubject, saveCBCMarks, getCurrentTerm,
    CBCLevel, CBCMarkInput,
} from '../../lib/supabase';
import { queueOfflineRecord, getQueueCount } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';
import CBCLevelBadge from '../../components/CBCLevelBadge';
import OfflineBanner from '../../components/OfflineBanner';

type RouteProps = RouteProp<RootStackParamList, 'CBCMarksEntry'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', warning: '#f59e0b',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const LEVELS: CBCLevel[] = ['EE', 'ME', 'AE', 'BE'];
const LEVEL_COLORS: Record<CBCLevel, { bg: string; text: string; label: string; range: string }> = {
    EE: { bg: '#d1fae5', text: '#065f46', label: 'Exceeds Expectation', range: '75–100%' },
    ME: { bg: '#dbeafe', text: '#1e40af', label: 'Meets Expectation', range: '50–74%' },
    AE: { bg: '#fef3c7', text: '#92400e', label: 'Approaches Expectation', range: '25–49%' },
    BE: { bg: '#fee2e2', text: '#991b1b', label: 'Below Expectation', range: '0–24%' },
};

/**
 * Kenya CBC Senior School (Grade 10) rubric mapping — KICD standard:
 * EE: 75–100  (Exceeds Expectation)
 * ME: 50–74   (Meets Expectation)
 * AE: 25–49   (Approaches Expectation)
 * BE: 0–24    (Below Expectation)
 */
function scoreToRubric(score: number): CBCLevel {
    if (score >= 75) return 'EE';
    if (score >= 50) return 'ME';
    if (score >= 25) return 'AE';
    return 'BE';
}

export default function CBCMarksEntryScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { subjectId, subjectName, formId, formName, streamId, streamName } = route.params;
    const { isConnected } = useNetworkStatus();

    const [students, setStudents] = useState<{
        student_id: number;
        student_name: string;
        admission_number: string;
        current_level: CBCLevel | null;
    }[]>([]);
    const [levels, setLevels] = useState<Record<number, CBCLevel>>({});
    const [scores, setScores] = useState<Record<number, string>>({});
    const [assessmentType, setAssessmentType] = useState<'Formative' | 'Summative'>('Formative');
    const [taskName, setTaskName] = useState('');
    const [termId, setTermId] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [toast, setToast] = useState('');
    const [entryMode, setEntryMode] = useState<'score' | 'direct'>('score');

    const teacherId = session?.linked_teacher_id || 0;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const term = await getCurrentTerm();
            if (term) setTermId(term.id);
            const data = await getCBCStudentsForSubject(subjectId, formId, streamId, term?.id || 0);
            setStudents(data);
            const initialLevels: Record<number, CBCLevel> = {};
            data.forEach(s => { if (s.current_level) initialLevels[s.student_id] = s.current_level; });
            setLevels(initialLevels);
            const count = await getQueueCount();
            setPendingCount(count);
        } catch (err: any) {
            console.error('CBCMarksEntryScreen error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [subjectId, formId, streamId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleScoreChange = (studentId: number, scoreStr: string) => {
        const clean = scoreStr.replace(/[^0-9]/g, '');
        setScores(prev => ({ ...prev, [studentId]: clean }));
        if (clean !== '') {
            const num = parseInt(clean, 10);
            if (!isNaN(num) && num >= 0 && num <= 100) {
                setLevels(prev => ({ ...prev, [studentId]: scoreToRubric(num) }));
            }
        }
    };

    const setLevel = (studentId: number, level: CBCLevel) => {
        setLevels(prev => ({ ...prev, [studentId]: level }));
    };

    const handleSave = async () => {
        const records: CBCMarkInput[] = students
            .filter(s => levels[s.student_id])
            .map(s => ({
                student_id: s.student_id,
                subject_id: subjectId,
                term_id: termId,
                assessment_type: assessmentType,
                task_name: taskName || `${assessmentType} Task`,
                rubric_level: levels[s.student_id],
                teacher_id: teacherId,
            }));

        if (records.length === 0) { showToast('⚠️ No levels selected'); return; }

        setSaving(true);
        try {
            if (isConnected) {
                const result = await saveCBCMarks(records);
                if (result.success) {
                    showToast(`✅ CBC marks saved for ${records.length} students.`);
                } else {
                    showToast(`❌ Error: ${result.error}`);
                }
            } else {
                await queueOfflineRecord('cbc_marks', records);
                const count = await getQueueCount();
                setPendingCount(count);
                showToast('📡 Saved offline — will sync when connected.');
            }
        } catch (err: any) {
            showToast(`❌ Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading students…</Text>
            </View>
        );
    }

    const assessed = Object.keys(levels).length;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        accessibilityLabel="Go back"
                        style={styles.backBtn}
                    >
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>🎓 CBC Marks Entry</Text>
                    <Text style={styles.headerSub}>{subjectName} • {formName} {streamName}</Text>
                    <View style={styles.headerStats}>
                        <View style={styles.headerChip}>
                            <Text style={styles.headerChipText}>📊 {assessed}/{students.length} assessed</Text>
                        </View>
                        <View style={styles.headerChip}>
                            <Text style={styles.headerChipText}>📋 {assessmentType}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <OfflineBanner pendingCount={pendingCount} />

            {toast ? (
                <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>
            ) : null}

            {/* Controls */}
            <View style={styles.controls}>
                {/* Assessment Type */}
                <View style={styles.typeRow}>
                    {(['Formative', 'Summative'] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setAssessmentType(t)}
                            style={[styles.typeBtn, assessmentType === t && styles.typeBtnActive]}
                            accessibilityLabel={`Select ${t} assessment`}
                        >
                            <Text style={[styles.typeBtnText, assessmentType === t && styles.typeBtnTextActive]}>
                                {t === 'Formative' ? '📝 Formative' : '📊 Summative'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Entry Mode Toggle */}
                <View style={styles.typeRow}>
                    <TouchableOpacity
                        onPress={() => setEntryMode('score')}
                        style={[styles.typeBtn, entryMode === 'score' && { backgroundColor: '#059669', borderColor: '#059669' }]}
                        accessibilityLabel="Enter by score"
                    >
                        <Text style={[styles.typeBtnText, entryMode === 'score' && styles.typeBtnTextActive]}>
                            🔢 Enter Score (auto-rubric)
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setEntryMode('direct')}
                        style={[styles.typeBtn, entryMode === 'direct' && { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }]}
                        accessibilityLabel="Select rubric directly"
                    >
                        <Text style={[styles.typeBtnText, entryMode === 'direct' && styles.typeBtnTextActive]}>
                            🎯 Select Rubric Directly
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Rubric Legend */}
                {entryMode === 'score' && (
                    <View style={styles.legendRow}>
                        {LEVELS.map(l => (
                            <View key={l} style={[styles.legendItem, { backgroundColor: LEVEL_COLORS[l].bg }]}>
                                <Text style={[styles.legendLevel, { color: LEVEL_COLORS[l].text }]}>{l}</Text>
                                <Text style={[styles.legendRange, { color: LEVEL_COLORS[l].text }]}>{LEVEL_COLORS[l].range}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Task Name */}
                <TextInput
                    style={styles.taskInput}
                    value={taskName}
                    onChangeText={setTaskName}
                    placeholder="Task name (e.g. Task 1, Project, CAT)"
                    placeholderTextColor={C.textDim}
                    accessibilityLabel="Task name input"
                />
            </View>

            <FlatList
                data={students}
                keyExtractor={item => String(item.student_id)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🎓</Text>
                        <Text style={styles.emptyText}>No students found for this subject.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const currentLevel = levels[item.student_id];
                    const currentScore = scores[item.student_id] || '';

                    return (
                        <TouchableOpacity
                            onLongPress={() => navigation.navigate('StudentProfile', { studentId: item.student_id })}
                            style={[styles.studentRow, index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}
                            accessibilityLabel={`${item.student_name} CBC level`}
                            activeOpacity={0.9}
                        >
                            <View style={styles.studentInfo}>
                                <Text style={styles.studentName}>{item.student_name}</Text>
                                <Text style={styles.studentAdm}>{item.admission_number}</Text>
                                {currentLevel && (
                                    <View style={[styles.currentLevelBadge, { backgroundColor: LEVEL_COLORS[currentLevel].bg }]}>
                                        <Text style={[styles.currentLevelText, { color: LEVEL_COLORS[currentLevel].text }]}>
                                            {currentLevel} — {LEVEL_COLORS[currentLevel].label}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {entryMode === 'score' ? (
                                // Score entry mode — type score, rubric auto-assigned
                                <View style={styles.scoreEntry}>
                                    <TextInput
                                        style={[
                                            styles.scoreInput,
                                            currentLevel && { borderColor: LEVEL_COLORS[currentLevel].text, backgroundColor: LEVEL_COLORS[currentLevel].bg + '40' },
                                        ]}
                                        value={currentScore}
                                        onChangeText={t => handleScoreChange(item.student_id, t)}
                                        placeholder="0-100"
                                        placeholderTextColor={C.textDim}
                                        keyboardType="numeric"
                                        maxLength={3}
                                        returnKeyType="next"
                                        accessibilityLabel={`Score for ${item.student_name}`}
                                    />
                                    {currentLevel && (
                                        <View style={[styles.autoRubricBadge, { backgroundColor: LEVEL_COLORS[currentLevel].bg }]}>
                                            <Text style={[styles.autoRubricText, { color: LEVEL_COLORS[currentLevel].text }]}>
                                                {currentLevel}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                // Direct rubric selection mode
                                <View style={styles.levelBtns}>
                                    {LEVELS.map(level => {
                                        const isSelected = levels[item.student_id] === level;
                                        const cfg = LEVEL_COLORS[level];
                                        return (
                                            <TouchableOpacity
                                                key={level}
                                                onPress={() => setLevel(item.student_id, level)}
                                                style={[
                                                    styles.levelBtn,
                                                    isSelected && { backgroundColor: cfg.bg, borderColor: cfg.text, borderWidth: 2 },
                                                ]}
                                                accessibilityLabel={`Mark ${item.student_name} as ${level}`}
                                            >
                                                <Text style={[styles.levelBtnText, isSelected && { color: cfg.text, fontWeight: '900' as const }]}>
                                                    {level}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />

            <View style={styles.saveBar}>
                <View>
                    <Text style={styles.saveCount}>{assessed}/{students.length} assessed</Text>
                    {entryMode === 'score' && assessed > 0 && (
                        <Text style={styles.saveCountSub}>Scores auto-mapped to rubric</Text>
                    )}
                </View>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || assessed === 0}
                    style={styles.saveBtn}
                    accessibilityLabel="Save CBC marks"
                >
                    <LinearGradient
                        colors={assessed > 0 ? ['#2563eb', '#1d4ed8'] : ['#94a3b8', '#64748b']}
                        style={styles.saveBtnGrad}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>
                                {isConnected ? `💾 Save ${assessed} CBC Marks` : '📡 Save Offline'}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    headerStats: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    headerChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    headerChipText: { fontSize: 11, color: '#fff', fontWeight: '700' },
    controls: { backgroundColor: C.card, padding: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    typeBtnText: { fontSize: 11, fontWeight: '800', color: C.textSub },
    typeBtnTextActive: { color: '#fff' },
    legendRow: { flexDirection: 'row', gap: 4 },
    legendItem: { flex: 1, borderRadius: 8, padding: 6, alignItems: 'center' },
    legendLevel: { fontSize: 12, fontWeight: '900' },
    legendRange: { fontSize: 9, fontWeight: '600', marginTop: 1 },
    taskInput: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: C.text },
    listContent: { paddingBottom: 100 },
    studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    studentInfo: { flex: 1, marginRight: 8 },
    studentName: { fontSize: 13, fontWeight: '700', color: C.text },
    studentAdm: { fontSize: 10, color: C.textDim, marginTop: 1 },
    currentLevelBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
    currentLevelText: { fontSize: 9, fontWeight: '800' },
    // Score entry mode
    scoreEntry: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    scoreInput: {
        width: 60, height: 40, borderRadius: 10, borderWidth: 1.5,
        borderColor: C.border, backgroundColor: '#f1f5f9',
        textAlign: 'center', fontSize: 16, fontWeight: '900', color: C.text,
    },
    autoRubricBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    autoRubricText: { fontSize: 13, fontWeight: '900' },
    // Direct rubric mode
    levelBtns: { flexDirection: 'row', gap: 4 },
    levelBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    levelBtnText: { fontSize: 10, fontWeight: '700', color: C.textSub },
    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
    saveCount: { fontSize: 12, color: C.textSub, fontWeight: '700' },
    saveCountSub: { fontSize: 10, color: C.textDim, marginTop: 1 },
    saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
    toast: { backgroundColor: '#1e293b', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12 },
    toastText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center' },
});
