import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSession, SubjectCard, getTeacherSubjectCards, getCurrentTerm } from '../../lib/supabase';

interface Props {
    session: UserSession;
    onLogout: () => void;
    onOpenMarks: (params: {
        subject_id: number; subject_name: string;
        form_id: number; form_name: string;
        stream_id: number; stream_name: string;
    }) => void;
    onOpenTimetable: () => void;
}

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryDark: '#1d4ed8', primaryLight: '#dbeafe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    teal: '#0d9488', tealLight: '#ccfbf1',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function TeacherDashboard({ session, onLogout, onOpenMarks, onOpenTimetable }: Props) {
    const [cards, setCards] = useState<SubjectCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [termName, setTermName] = useState('');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (session.linked_teacher_id) {
                const [subjects, term] = await Promise.all([
                    getTeacherSubjectCards(session.linked_teacher_id),
                    getCurrentTerm(),
                ]);
                setCards(subjects);
                setTermName(term?.term_name || '');
            }
        } catch (err: any) {
            console.error('Teacher load error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session.linked_teacher_id]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalSubjects = cards.length;
    const fullyEntered = cards.filter(c => c.percentage === 100).length;
    const notStarted = cards.filter(c => c.percentage === 0).length;
    const avgPercent = cards.length > 0
        ? Math.round(cards.reduce((s, c) => s + c.percentage, 0) / cards.length)
        : 0;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading dashboard…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

            {/* Header */}
            <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerRow}>
                        <View style={styles.avatarWrap}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {session.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.avatarOnline} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerName}>{session.full_name}</Text>
                            <Text style={styles.headerSub}>👩‍🏫 Teacher{session.teacher_tsc ? ` · TSC: ${session.teacher_tsc}` : ''}</Text>
                            {termName ? <Text style={styles.headerTerm}>📅 {termName}</Text> : null}
                        </View>
                        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                            <Text style={styles.logoutText}>🚪</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* KPI Cards */}
                <View style={styles.kpiGrid}>
                    <KPI emoji="📚" label="My Subjects" value={String(totalSubjects)} color={C.primary} bg={C.primaryLight} />
                    <KPI emoji="✅" label="Fully Entered" value={String(fullyEntered)} color={C.accent} bg={C.accentLight} />
                    <KPI emoji="⚠️" label="Not Started" value={String(notStarted)} color={C.danger} bg={C.dangerLight} />
                    <KPI emoji="📊" label="Avg Progress" value={`${avgPercent}%`} color={C.purple} bg={C.purpleLight} />
                </View>

                {/* Timetable CTA */}
                <TouchableOpacity onPress={onOpenTimetable} activeOpacity={0.85} style={{ marginBottom: 16 }}>
                    <LinearGradient colors={['#0d9488', '#059669']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <View style={styles.ctaDecor} />
                        <Text style={styles.ctaEmoji}>🗓️</Text>
                        <View>
                            <Text style={styles.ctaText}>My Timetable</Text>
                            <Text style={styles.ctaSub}>View your weekly teaching schedule</Text>
                        </View>
                        <Text style={styles.ctaArrow}>→</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Subject Cards */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📚 My Subjects & Marks</Text>
                    <Text style={styles.sectionSub}>{cards.length} subject{cards.length !== 1 ? 's' : ''} assigned</Text>
                </View>

                {cards.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyTitle}>No Subjects Assigned</Text>
                        <Text style={styles.emptySub}>Contact admin to assign subjects in the timetable</Text>
                    </View>
                ) : (
                    cards.map((card, idx) => (
                        <TouchableOpacity
                            key={`${card.subject_id}-${card.form_id}-${card.stream_id}`}
                            onPress={() => onOpenMarks({
                                subject_id: card.subject_id,
                                subject_name: card.subject_name,
                                form_id: card.form_id,
                                form_name: card.form_name,
                                stream_id: card.stream_id,
                                stream_name: card.stream_name,
                            })}
                            activeOpacity={0.85}
                            style={styles.subjectCard}
                        >
                            <View style={styles.subjectCardHeader}>
                                <View style={[styles.subjectIcon, {
                                    backgroundColor: card.percentage === 100 ? C.accentLight
                                        : card.percentage > 0 ? C.warningLight : C.dangerLight
                                }]}>
                                    <Text style={styles.subjectIconText}>
                                        {card.percentage === 100 ? '✅' : card.percentage > 0 ? '📝' : '⚠️'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subjectName}>{card.subject_name}</Text>
                                    <Text style={styles.subjectMeta}>
                                        {card.form_name} • {card.stream_name}
                                    </Text>
                                </View>
                                <View style={[styles.percentBadge, {
                                    backgroundColor: card.percentage === 100 ? C.accentLight
                                        : card.percentage > 0 ? C.warningLight : C.dangerLight
                                }]}>
                                    <Text style={[styles.percentText, {
                                        color: card.percentage === 100 ? C.accent
                                            : card.percentage > 0 ? C.warning : C.danger
                                    }]}>
                                        {card.percentage}%
                                    </Text>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressWrap}>
                                <View style={styles.progressBg}>
                                    <View style={[styles.progressFill, {
                                        width: `${card.percentage}%`,
                                        backgroundColor: card.percentage === 100 ? C.accent
                                            : card.percentage > 0 ? C.warning : C.danger,
                                    }]} />
                                </View>
                                <Text style={styles.progressLabel}>
                                    {card.marks_entered}/{card.total_students} students
                                </Text>
                            </View>

                            {/* Action */}
                            <View style={styles.subjectAction}>
                                <Text style={styles.subjectActionText}>
                                    {card.percentage === 100 ? '✅ All marks entered — Tap to review'
                                        : card.percentage > 0 ? `📝 ${card.total_students - card.marks_entered} marks remaining — Tap to continue`
                                            : '⚠️ No marks entered — Tap to start'}
                                </Text>
                                <Text style={styles.subjectActionArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function KPI({ emoji, label, value, color, bg }: {
    emoji: string; label: string; value: string; color: string; bg: string;
}) {
    return (
        <View style={[styles.kpiCard, { borderLeftColor: color }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: bg }]}>
                <Text style={styles.kpiEmoji}>{emoji}</Text>
            </View>
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },

    // Header
    header: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarWrap: { position: 'relative' },
    avatar: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
    avatarOnline: {
        position: 'absolute', bottom: -2, right: -2,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff',
    },
    headerName: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    headerTerm: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
    logoutBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    logoutText: { fontSize: 18 },

    // KPI
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: {
        flex: 1, minWidth: '45%',
        backgroundColor: C.card, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: C.border, borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    kpiIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    kpiEmoji: { fontSize: 18 },
    kpiValue: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
    kpiLabel: { fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    // CTA
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 18, borderRadius: 20, overflow: 'hidden',
        shadowColor: '#0d9488', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    ctaDecor: {
        position: 'absolute', right: -20, top: -20,
        width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)',
    },
    ctaEmoji: { fontSize: 28 },
    ctaText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    ctaSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    ctaArrow: { marginLeft: 'auto', fontSize: 22, color: '#fff', fontWeight: '700' },

    // Section
    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    sectionSub: { fontSize: 11, color: C.textSub, marginTop: 2 },

    // Empty
    emptyBox: {
        alignItems: 'center', paddingVertical: 40, gap: 8,
        backgroundColor: C.card, borderRadius: 20,
        borderWidth: 1, borderColor: C.border,
    },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub },

    // Subject Cards
    subjectCard: {
        backgroundColor: C.card, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: C.border, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    subjectCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    subjectIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    subjectIconText: { fontSize: 20 },
    subjectName: { fontSize: 15, fontWeight: '800', color: C.text },
    subjectMeta: { fontSize: 11, color: C.textSub, fontWeight: '500', marginTop: 2 },
    percentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    percentText: { fontSize: 14, fontWeight: '900' },

    // Progress
    progressWrap: { marginBottom: 12 },
    progressBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
    progressFill: { height: '100%', borderRadius: 4 },
    progressLabel: { fontSize: 10, color: C.textSub, fontWeight: '600' },

    // Action
    subjectAction: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8fafc', borderRadius: 12, padding: 10,
        borderWidth: 1, borderColor: '#e2e8f0',
    },
    subjectActionText: { flex: 1, fontSize: 11, color: C.textSub, fontWeight: '600' },
    subjectActionArrow: { fontSize: 16, color: C.primary, fontWeight: '700' },
});
