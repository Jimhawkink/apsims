import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { getClassPerformance, getGrade } from '../../lib/supabase';

type RouteProps = RouteProp<RootStackParamList, 'ClassPerformance'>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', purple: '#7c3aed',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const GRADE_COLORS: Record<string, string> = {
    A: '#059669', B: '#2563eb', C: '#f59e0b', D: '#f97316', E: '#ef4444',
};

export default function ClassPerformanceScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { subjectId, subjectName, formId, streamId, streamName } = route.params;

    const [performance, setPerformance] = useState<{ studentId: number; studentName: string; score: number; grade: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await getClassPerformance(subjectId, formId, streamId);
                setPerformance(data);
            } catch (err: any) {
                console.error('ClassPerformanceScreen error:', err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [subjectId, formId, streamId]);

    const avg = performance.length > 0
        ? parseFloat((performance.reduce((s, p) => s + p.score, 0) / performance.length).toFixed(1))
        : 0;

    // Grade distribution
    const gradeDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    performance.forEach(p => {
        const g = p.grade || getGrade(p.score);
        if (gradeDist[g] !== undefined) gradeDist[g]++;
    });

    const top3 = performance.slice(0, 3);
    const bottom3 = performance.slice(-3).reverse();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading performance…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>📊 Class Performance</Text>
                    <Text style={styles.headerSub}>{subjectName} • {streamName}</Text>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {performance.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📊</Text>
                        <Text style={styles.emptyText}>No marks entered yet for this subject.</Text>
                    </View>
                ) : (
                    <>
                        {/* Class Average */}
                        <View style={styles.avgCard}>
                            <Text style={styles.avgLabel}>Class Average</Text>
                            <Text style={[styles.avgNum, { color: avg >= 50 ? C.accent : C.danger }]}>
                                {avg}%
                            </Text>
                            <Text style={styles.avgGrade}>{getGrade(avg)}</Text>
                            <Text style={styles.avgSub}>{performance.length} students</Text>
                        </View>

                        {/* Grade Distribution */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📈 Grade Distribution</Text>
                            {Object.entries(gradeDist).map(([grade, count]) => {
                                const pct = performance.length > 0 ? Math.round((count / performance.length) * 100) : 0;
                                return (
                                    <View key={grade} style={styles.gradeRow}>
                                        <View style={[styles.gradeLabelBox, { backgroundColor: GRADE_COLORS[grade] + '20' }]}>
                                            <Text style={[styles.gradeLabel, { color: GRADE_COLORS[grade] }]}>{grade}</Text>
                                        </View>
                                        <View style={styles.gradeBarBg}>
                                            <View style={[styles.gradeBarFill, { width: `${pct}%`, backgroundColor: GRADE_COLORS[grade] }]} />
                                        </View>
                                        <Text style={styles.gradeCount}>{count} ({pct}%)</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Top 3 */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🏆 Top Performers</Text>
                            {top3.map((s, i) => (
                                <View key={s.studentId} style={styles.rankRow}>
                                    <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#fef3c7' }]}>
                                        <Text style={styles.rankNum}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                                    </View>
                                    <Text style={styles.rankName}>{s.studentName}</Text>
                                    <Text style={[styles.rankScore, { color: C.accent }]}>{s.score}%</Text>
                                    <View style={[styles.rankGrade, { backgroundColor: (GRADE_COLORS[s.grade || getGrade(s.score)] || C.accent) + '20' }]}>
                                        <Text style={[styles.rankGradeText, { color: GRADE_COLORS[s.grade || getGrade(s.score)] || C.accent }]}>
                                            {s.grade || getGrade(s.score)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Bottom 3 */}
                        {bottom3.length > 0 && bottom3[0].studentId !== top3[0]?.studentId && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📉 Needs Support</Text>
                                {bottom3.map((s, i) => (
                                    <View key={s.studentId} style={styles.rankRow}>
                                        <View style={[styles.rankBadge, { backgroundColor: C.dangerLight }]}>
                                            <Text style={styles.rankNum}>⚠️</Text>
                                        </View>
                                        <Text style={styles.rankName}>{s.studentName}</Text>
                                        <Text style={[styles.rankScore, { color: C.danger }]}>{s.score}%</Text>
                                        <View style={[styles.rankGrade, { backgroundColor: C.dangerLight }]}>
                                            <Text style={[styles.rankGradeText, { color: C.danger }]}>
                                                {s.grade || getGrade(s.score)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
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
    avgCard: { backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border },
    avgLabel: { fontSize: 12, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    avgNum: { fontSize: 48, fontWeight: '900', marginTop: 4 },
    avgGrade: { fontSize: 20, fontWeight: '900', color: C.text, marginTop: 2 },
    avgSub: { fontSize: 11, color: C.textDim, marginTop: 4 },
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    gradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    gradeLabelBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    gradeLabel: { fontSize: 14, fontWeight: '900' },
    gradeBarBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    gradeBarFill: { height: '100%', borderRadius: 4 },
    gradeCount: { fontSize: 11, color: C.textSub, fontWeight: '700', width: 60, textAlign: 'right' },
    rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rankBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rankNum: { fontSize: 18 },
    rankName: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text },
    rankScore: { fontSize: 14, fontWeight: '900' },
    rankGrade: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    rankGradeText: { fontSize: 11, fontWeight: '900' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
});
