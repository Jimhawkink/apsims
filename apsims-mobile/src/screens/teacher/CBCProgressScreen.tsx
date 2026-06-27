// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — CBC Progress Screen (Teacher)
// Full competency matrix per student: EE/ME/AE/BE across all subjects
// Intervention flags and teacher notes
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, getCurrentTerm } from '../../lib/supabase';
import CBCLevelBadge from '../../components/CBCLevelBadge';
import ScreenHeader from '../../components/ScreenHeader';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'CBCProgress'>;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', primaryLight: '#ede9fe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    EE: { bg: '#d1fae5', text: '#059669', label: 'Exceeding Expectation' },
    ME: { bg: '#dbeafe', text: '#2563eb', label: 'Meeting Expectation' },
    AE: { bg: '#fef3c7', text: '#d97706', label: 'Approaching Expectation' },
    BE: { bg: '#fee2e2', text: '#ef4444', label: 'Below Expectation' },
};

interface SubjectProgress {
    subject_id: number;
    subject_name: string;
    formative_level: string | null;
    summative_level: string | null;
    overall_level: string | null;
    formative_count: number;
    is_flagged: boolean;
    teacher_note?: string;
}

export default function CBCProgressScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { studentId, studentName, formLevel } = route.params;

    const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [termName, setTermName] = useState('');
    const [termId, setTermId] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            const term = await getCurrentTerm();
            setTermName(term?.term_name || '');
            setTermId(term?.id || 0);

            if (!term?.id) return;

            // Get competency summaries for this student+term
            const { data: summaries } = await supabase
                .from('cbc_competency_summaries')
                .select(`
                    id, formative_level, summative_level, overall_level, formative_count,
                    school_subjects(id, subject_name)
                `)
                .eq('student_id', studentId)
                .eq('term_id', term.id);

            // Get intervention flags
            const { data: flags } = await supabase
                .from('cbc_intervention_flags')
                .select('subject_id, status, flag_reason')
                .eq('student_id', studentId)
                .eq('term_id', term.id)
                .in('status', ['open', 'in_progress']);

            const flaggedSubjects = new Set((flags || []).map((f: any) => f.subject_id));

            // Get teacher notes
            const { data: notes } = await supabase
                .from('cbc_teacher_notes')
                .select('subject_id, note_text')
                .eq('student_id', studentId)
                .eq('term_id', term.id)
                .order('created_at', { ascending: false });

            const notesMap: Record<number, string> = {};
            (notes || []).forEach((n: any) => {
                if (!notesMap[n.subject_id]) notesMap[n.subject_id] = n.note_text;
            });

            const progress: SubjectProgress[] = (summaries || []).map((s: any) => ({
                subject_id: s.school_subjects?.id,
                subject_name: s.school_subjects?.subject_name || 'Unknown',
                formative_level: s.formative_level,
                summative_level: s.summative_level,
                overall_level: s.overall_level,
                formative_count: s.formative_count || 0,
                is_flagged: flaggedSubjects.has(s.school_subjects?.id),
                teacher_note: notesMap[s.school_subjects?.id],
            }));

            setSubjects(progress);
        } catch (e) {
            console.error('CBC Progress fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, [studentId]);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    // Count levels
    const levelCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    subjects.forEach(s => {
        const l = s.overall_level as keyof typeof levelCounts;
        if (l && levelCounts[l] !== undefined) levelCounts[l]++;
    });
    const flaggedCount = subjects.filter(s => s.is_flagged).length;

    if (loading) return (
        <View style={st.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.loadingText}>Loading CBC progress…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>

            {/* ── PREMIUM BACK NAVIGATION ── */}
            <ScreenHeader
                title="🎓 CBC Progress"
                onBack={() => navigation.goBack()}
                gradient={['#7C3AED','#6D28D9']}
            />
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#7c3aed', '#4f46e5']} style={st.header}>
                <SafeAreaView>
                    <View style={st.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={st.headerTitle}>🎓 CBC Progress</Text>
                            <Text style={st.headerName}>{studentName}</Text>
                            <Text style={st.headerTerm}>{termName}</Text>
                        </View>
                    </View>

                    {/* Level Summary */}
                    <View style={st.levelSummary}>
                        {Object.entries(LEVEL_COLORS).map(([level, colors]) => (
                            <View key={level} style={[st.levelChip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text style={st.levelChipCount}>{levelCounts[level as keyof typeof levelCounts]}</Text>
                                <View style={[st.levelBadge, { backgroundColor: colors.bg }]}>
                                    <Text style={[st.levelBadgeText, { color: colors.text }]}>{level}</Text>
                                </View>
                            </View>
                        ))}
                        {flaggedCount > 0 && (
                            <View style={[st.levelChip, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                                <Text style={[st.levelChipCount, { color: '#fca5a5' }]}>{flaggedCount}</Text>
                                <Text style={{ fontSize: 9, color: '#fca5a5', fontWeight: '700' }}>Flagged</Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
            >
                {subjects.length === 0 ? (
                    <View style={st.emptyBox}>
                        <Text style={{ fontSize: 40 }}>📊</Text>
                        <Text style={st.emptyTitle}>No CBC records yet</Text>
                        <Text style={st.emptySub}>Marks have not been entered for {termName}</Text>
                    </View>
                ) : (
                    subjects.map(subj => {
                        const overall = subj.overall_level;
                        const colors = overall ? LEVEL_COLORS[overall] : null;
                        return (
                            <View
                                key={subj.subject_id}
                                style={[st.subjectCard, subj.is_flagged && { borderLeftColor: C.danger, borderLeftWidth: 3 }]}
                            >
                                <View style={st.subjectHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={st.subjectName}>{subj.subject_name}</Text>
                                            {subj.is_flagged && (
                                                <View style={st.flagBadge}>
                                                    <Text style={st.flagText}>🚩 Intervention</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={st.subjectFormative}>{subj.formative_count} formative assessments</Text>
                                    </View>
                                    {overall && colors && (
                                        <View style={[st.overallBadge, { backgroundColor: colors.bg }]}>
                                            <Text style={[st.overallBadgeText, { color: colors.text }]}>{overall}</Text>
                                            <Text style={[st.overallBadgeSub, { color: colors.text }]}>Overall</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Formative / Summative Grid */}
                                <View style={st.levelGrid}>
                                    <View style={st.levelGridItem}>
                                        <Text style={st.levelGridLabel}>Formative</Text>
                                        {subj.formative_level ? (
                                            <View style={[st.levelPill, { backgroundColor: LEVEL_COLORS[subj.formative_level]?.bg }]}>
                                                <Text style={[st.levelPillText, { color: LEVEL_COLORS[subj.formative_level]?.text }]}>
                                                    {subj.formative_level}
                                                </Text>
                                            </View>
                                        ) : <Text style={st.levelPillNone}>—</Text>}
                                    </View>
                                    <View style={st.levelGridItem}>
                                        <Text style={st.levelGridLabel}>Summative</Text>
                                        {subj.summative_level ? (
                                            <View style={[st.levelPill, { backgroundColor: LEVEL_COLORS[subj.summative_level]?.bg }]}>
                                                <Text style={[st.levelPillText, { color: LEVEL_COLORS[subj.summative_level]?.text }]}>
                                                    {subj.summative_level}
                                                </Text>
                                            </View>
                                        ) : <Text style={st.levelPillNone}>—</Text>}
                                    </View>
                                    <View style={[st.levelGridItem, { flex: 1.2 }]}>
                                        <Text style={st.levelGridLabel}>Level Meaning</Text>
                                        <Text style={[st.levelMeaning, { color: colors?.text || C.textSub }]}>
                                            {overall ? LEVEL_COLORS[overall]?.label : 'Not assessed'}
                                        </Text>
                                    </View>
                                </View>

                                {subj.teacher_note && (
                                    <View style={st.noteBox}>
                                        <Text style={st.noteText}>📝 {subj.teacher_note}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14 },
    header: { paddingTop: 44, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerName: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    headerTerm: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    levelSummary: { flexDirection: 'row', gap: 6 },
    levelChip: { flex: 1, borderRadius: 10, padding: 8, alignItems: 'center', gap: 4 },
    levelChipCount: { fontSize: 18, fontWeight: '900', color: '#fff' },
    levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    levelBadgeText: { fontSize: 10, fontWeight: '900' },
    subjectCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 2,
    },
    subjectHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    subjectName: { fontSize: 14, fontWeight: '800', color: C.text },
    subjectFormative: { fontSize: 10, color: C.textSub, marginTop: 2 },
    flagBadge: { backgroundColor: C.dangerLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    flagText: { fontSize: 9, color: C.danger, fontWeight: '800' },
    overallBadge: { borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 52 },
    overallBadgeText: { fontSize: 20, fontWeight: '900' },
    overallBadgeSub: { fontSize: 8, fontWeight: '700', opacity: 0.8 },
    levelGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    levelGridItem: { flex: 1, alignItems: 'center' },
    levelGridLabel: { fontSize: 9, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    levelPillText: { fontSize: 13, fontWeight: '900' },
    levelPillNone: { fontSize: 13, color: C.textDim, fontWeight: '600' },
    levelMeaning: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
    noteBox: { backgroundColor: '#F8FAFF', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: C.border },
    noteText: { fontSize: 11, color: C.textSub, lineHeight: 16 },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub, textAlign: 'center' },
});
