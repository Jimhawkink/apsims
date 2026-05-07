import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { getCBCCompetencySummaries, getCurrentTerm, CBCCompetencySummary } from '../../lib/supabase';
import CBCLevelBadge from '../../components/CBCLevelBadge';

type RouteProps = RouteProp<RootStackParamList, 'CBCAssessment'>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#0d9488', accent: '#059669',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function CBCAssessmentScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { studentId } = route.params;

    const [terms, setTerms] = useState<{ id: number; term_name: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState(0);
    const [summaries, setSummaries] = useState<CBCCompetencySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTerms = useCallback(async () => {
        const term = await getCurrentTerm();
        if (term) { setTerms([term]); setSelectedTermId(term.id); }
    }, []);

    const loadData = useCallback(async (termId: number, silent = false) => {
        if (!termId) return;
        if (!silent) setLoading(true);
        try {
            const data = await getCBCCompetencySummaries(studentId, termId);
            setSummaries(data);
        } catch (err: any) {
            console.error('CBCAssessmentScreen error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId]);

    useEffect(() => { loadTerms(); }, [loadTerms]);
    useEffect(() => { if (selectedTermId) loadData(selectedTermId); }, [selectedTermId, loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(selectedTermId, true); };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading CBC levels…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#0d9488" />
            <LinearGradient colors={['#0d9488', '#059669']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>🎓 CBC Levels</Text>
                    <Text style={styles.headerSub}>Grade 10 Competency Assessment</Text>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Term Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.termScroll}>
                    {terms.map(t => (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setSelectedTermId(t.id)}
                            style={[styles.termPill, selectedTermId === t.id && styles.termPillActive]}
                            accessibilityLabel={`Select ${t.term_name}`}
                        >
                            <Text style={[styles.termPillText, selectedTermId === t.id && styles.termPillTextActive]}>
                                {t.term_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {summaries.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🎓</Text>
                        <Text style={styles.emptyText}>No CBC assessment data available for this term.</Text>
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📊 Competency Summary</Text>
                        {/* Header */}
                        <View style={styles.gridHeader}>
                            <Text style={[styles.gridHText, { flex: 2 }]}>Subject</Text>
                            <Text style={[styles.gridHText, { flex: 1, textAlign: 'center' }]}>Formative</Text>
                            <Text style={[styles.gridHText, { flex: 1, textAlign: 'center' }]}>Summative</Text>
                            <Text style={[styles.gridHText, { flex: 1, textAlign: 'center' }]}>Overall</Text>
                        </View>
                        {summaries.map((s, idx) => (
                            <View key={s.id} style={[styles.gridRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <Text style={[styles.gridCell, { flex: 2, fontWeight: '700' }]}>{s.subject_name}</Text>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <CBCLevelBadge level={s.formative_level} size="sm" />
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <CBCLevelBadge level={s.summative_level} size="sm" />
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <CBCLevelBadge level={s.overall_level} size="sm" />
                                </View>
                            </View>
                        ))}
                        {/* Legend */}
                        <View style={styles.legend}>
                            {[
                                { level: 'EE', label: 'Exceeds Expectation', color: '#059669' },
                                { level: 'ME', label: 'Meets Expectation', color: '#2563eb' },
                                { level: 'AE', label: 'Approaches Expectation', color: '#f59e0b' },
                                { level: 'BE', label: 'Below Expectation', color: '#ef4444' },
                            ].map(l => (
                                <View key={l.level} style={styles.legendRow}>
                                    <Text style={[styles.legendLevel, { color: l.color }]}>{l.level}</Text>
                                    <Text style={styles.legendLabel}>{l.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    termScroll: { marginBottom: 16 },
    termPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: C.border },
    termPillActive: { backgroundColor: C.primary, borderColor: C.primary },
    termPillText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    termPillTextActive: { color: '#fff' },
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
    gridHText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },
    legend: { padding: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendLevel: { fontSize: 11, fontWeight: '900', width: 28 },
    legendLabel: { fontSize: 11, color: C.textSub },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },
});
