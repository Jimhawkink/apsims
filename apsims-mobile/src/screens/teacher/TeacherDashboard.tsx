// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — Teacher Dashboard v3.0
// Ultra-light bright theme · Premium cards · Live data
// Kenya's #1 School Management System
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, StatusBar, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { clearSession } from '../../lib/security';
import { SubjectCard, getTeacherSubjectCards, getCurrentTerm, getUnreadNotificationCount } from '../../lib/supabase';
import { cacheData, getQueueCount } from '../../lib/offline';
import { T, fmtPct } from '../../theme/PremiumTheme';
import {
    MetricCard, SectionLabel, ProgressBar, EmptyState,
    SkeletonCard, QuickActionItem,
} from '../../components/PremiumUI';
import OfflineBanner from '../../components/OfflineBanner';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const { width: W } = Dimensions.get('window');

export default function TeacherDashboard() {
    const { session, setSession } = useSession();
    const navigation = useNavigation<NavProp>();
    const insets = useSafeAreaInsets();
    const [cards, setCards] = useState<SubjectCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [termName, setTermName] = useState('');
    const [pendingCount, setPendingCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const portalUserId = session?.portal_user_id || 0;

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const greetEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (session?.linked_teacher_id) {
                const [subjects, term] = await Promise.all([
                    getTeacherSubjectCards(session.linked_teacher_id),
                    getCurrentTerm(),
                ]);
                setCards(subjects);
                setTermName(term?.term_name || '');
                await cacheData(`teacher_${session.portal_user_id}_dashboard`, subjects);
            }
            const count = await getQueueCount();
            setPendingCount(count);
            if (portalUserId) {
                const notifCount = await getUnreadNotificationCount(portalUserId);
                setUnreadCount(notifCount);
            }
        } catch (err: any) {
            console.error('Teacher load error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session?.linked_teacher_id]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalSubjects = cards.length;
    const fullyEntered = cards.filter(c => c.percentage === 100).length;
    const notStarted = cards.filter(c => c.percentage === 0).length;
    const inProgress = cards.filter(c => c.percentage > 0 && c.percentage < 100).length;
    const avgPct = cards.length > 0
        ? Math.round(cards.reduce((s, c) => s + c.percentage, 0) / cards.length) : 0;

    const initials = (session?.full_name || 'T')
        .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

    return (
        <View style={[styles.root, { backgroundColor: T.bg }]}>
            <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

            {/* ─── Sticky Top Bar ─────────────────────────────────── */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                {/* Avatar + Greeting */}
                <View style={styles.topLeft}>
                    <LinearGradient colors={T.gradPrimary} style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                    <View>
                        <Text style={styles.greeting}>{greetEmoji} {greeting}</Text>
                        <Text style={styles.name} numberOfLines={1}>
                            {session?.full_name || 'Teacher'}
                        </Text>
                    </View>
                </View>
                {/* Right icons */}
                <View style={styles.topRight}>
                    {/* Notification bell */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications', { portalUserId })}
                        style={styles.iconBtn}
                        accessibilityLabel="Notifications"
                    >
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {/* Logout */}
                    <TouchableOpacity
                        onPress={() => { setSession(null); clearSession(); }}
                        style={styles.iconBtn}
                        accessibilityLabel="Logout"
                    >
                        <Text style={{ fontSize: 20 }}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── Term badge ─────────────────────────────────────── */}
            {termName ? (
                <View style={styles.termPill}>
                    <View style={styles.liveDoc} />
                    <Text style={styles.termText}>{termName}</Text>
                    {session?.teacher_tsc && (
                        <Text style={styles.tscText}> · TSC {session.teacher_tsc}</Text>
                    )}
                </View>
            ) : null}

            <OfflineBanner pendingCount={pendingCount} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.indigo} colors={[T.indigo]} />}
            >
                {/* ─── Hero Stats ───────────────────────────────── */}
                {loading ? (
                    <>
                        <SkeletonCard rows={2} style={{ marginBottom: 12 }} />
                        <SkeletonCard rows={2} />
                    </>
                ) : (
                    <>
                        {/* Big progress hero */}
                        <LinearGradient colors={T.gradPrimary} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <View style={styles.heroDecor1} />
                            <View style={styles.heroDecor2} />
                            <View style={styles.heroRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.heroLabel}>Overall Marks Progress</Text>
                                    <Text style={styles.heroValue}>{avgPct}%</Text>
                                    <Text style={styles.heroSub}>{fullyEntered}/{totalSubjects} subjects complete</Text>
                                </View>
                                {/* Circle indicator */}
                                <View style={styles.heroCircle}>
                                    <Text style={styles.heroCircleNum}>{totalSubjects}</Text>
                                    <Text style={styles.heroCircleLabel}>Subjects</Text>
                                </View>
                            </View>
                            {/* Progress bar */}
                            <View style={styles.heroBar}>
                                <View style={[styles.heroBarFill, { width: `${avgPct}%` }]} />
                            </View>
                            <Text style={styles.heroBarLabel}>{avgPct}% marks entered</Text>
                        </LinearGradient>

                        {/* KPI 2×2 grid */}
                        <View style={styles.kpiGrid}>
                            {[
                                { icon: '✅', label: 'Complete', value: String(fullyEntered), grad: T.gradGreen },
                                { icon: '📝', label: 'In Progress', value: String(inProgress), grad: T.gradGold },
                                { icon: '⚠️', label: 'Not Started', value: String(notStarted), grad: T.gradRed },
                                { icon: '📊', label: 'Avg Entry', value: `${avgPct}%`, grad: T.gradPurple },
                            ].map((k, i) => (
                                <View key={i} style={styles.kpiItem}>
                                    <MetricCard icon={k.icon} label={k.label} value={k.value} gradient={k.grad} />
                                </View>
                            ))}
                        </View>

                        {/* Quick actions */}
                        <SectionLabel title="Quick Actions" subtitle="Tap to navigate" />
                        <View style={styles.qaRow}>
                            <QuickActionItem icon="🗓️" label="Timetable" gradient={T.gradTeal} onPress={() => navigation.navigate('TeacherTimetable')} />
                            <QuickActionItem icon="📢" label="Announce" gradient={T.gradPurple} onPress={() => navigation.navigate('Announcement')} />
                            <QuickActionItem icon="📤" label="Export" gradient={['#475569', '#334155']} onPress={() => navigation.navigate('Export')} />
                            <QuickActionItem icon="🔔" label="Alerts" gradient={T.gradPink} onPress={() => navigation.navigate('Notifications', { portalUserId })} badge={unreadCount > 0 ? String(unreadCount) : undefined} />
                        </View>

                        {/* Subject cards */}
                        <SectionLabel
                            title="📚 My Subjects"
                            subtitle={`${totalSubjects} subject${totalSubjects !== 1 ? 's' : ''} assigned`}
                        />

                        {cards.length === 0 ? (
                            <EmptyState
                                icon="📭"
                                title="No Subjects Assigned"
                                sub="Contact admin to assign subjects in the web portal"
                            />
                        ) : (
                            cards.map((card) => {
                                const isCBC = card.form_name?.toLowerCase().includes('grade');
                                const pct = card.percentage;
                                const statusColor = pct === 100 ? T.green : pct > 0 ? T.amber : T.red;
                                const statusBg = pct === 100 ? T.greenLight : pct > 0 ? T.amberLight : T.redLight;
                                const statusIcon = pct === 100 ? '✅' : pct > 0 ? '📝' : '⚠️';
                                const statusLabel = pct === 100 ? 'Complete'
                                    : pct > 0 ? `${card.total_students - card.marks_entered} remaining`
                                    : 'Not started';

                                return (
                                    <TouchableOpacity
                                        key={`${card.subject_id}-${card.form_id}-${card.stream_id}`}
                                        onPress={() => {
                                            if (isCBC) {
                                                navigation.navigate('CBCMarksEntry', {
                                                    subjectId: card.subject_id, subjectName: card.subject_name,
                                                    formId: card.form_id, formName: card.form_name,
                                                    streamId: card.stream_id, streamName: card.stream_name,
                                                });
                                            } else {
                                                navigation.navigate('MarksEntry', {
                                                    subject_id: card.subject_id, subject_name: card.subject_name,
                                                    form_id: card.form_id, form_name: card.form_name,
                                                    stream_id: card.stream_id, stream_name: card.stream_name,
                                                });
                                            }
                                        }}
                                        activeOpacity={0.82}
                                        style={styles.subjectCard}
                                    >
                                        {/* Left color strip */}
                                        <View style={[styles.subjectStrip, { backgroundColor: statusColor }]} />

                                        <View style={{ flex: 1, padding: 14, gap: 10 }}>
                                            {/* Header row */}
                                            <View style={styles.subjectHeader}>
                                                <View style={[styles.subjectIcon, { backgroundColor: statusBg }]}>
                                                    <Text style={{ fontSize: 20 }}>{statusIcon}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.subjectName}>{card.subject_name}</Text>
                                                    <Text style={styles.subjectMeta}>
                                                        {card.form_name} · {card.stream_name}
                                                        {isCBC ? ' 🎓 CBC' : ' 📚 8-4-4'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.pctBadge, { backgroundColor: statusBg }]}>
                                                    <Text style={[styles.pctText, { color: statusColor }]}>{pct}%</Text>
                                                </View>
                                            </View>

                                            {/* Progress bar */}
                                            <ProgressBar pct={pct} color={statusColor} height={6} />

                                            {/* Footer row */}
                                            <View style={styles.subjectFooter}>
                                                <Text style={[styles.subjectStatus, { color: statusColor }]}>
                                                    {statusLabel}
                                                </Text>
                                                <Text style={styles.subjectCount}>
                                                    {card.marks_entered}/{card.total_students} students
                                                </Text>
                                                <Text style={[styles.subjectArrow, { color: T.indigo }]}>→</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </>
                )}
                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Top bar
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 12,
        backgroundColor: T.bg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: T.indigo, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
    greeting: { fontSize: 11, color: T.textSub, fontWeight: '600' },
    name: { fontSize: 16, fontWeight: '900', color: T.text, maxWidth: W * 0.45 },
    topRight: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: T.bgSoft, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: T.border, position: 'relative',
    },
    notifBadge: {
        position: 'absolute', top: 5, right: 5,
        minWidth: 16, height: 16, borderRadius: 8,
        backgroundColor: T.red, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: T.bg,
    },
    notifBadgeText: { fontSize: 8, color: '#fff', fontWeight: '900' },

    // Term pill
    termPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginHorizontal: 20, marginBottom: 4,
        backgroundColor: T.indigoLight, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start',
    },
    liveDoc: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: T.green,
    },
    termText: { fontSize: 12, fontWeight: '700', color: T.indigo },
    tscText: { fontSize: 11, color: T.textSub, fontWeight: '600' },

    // Scroll
    scroll: { padding: 20, paddingTop: 12 },

    // Hero
    hero: {
        borderRadius: 24, padding: 22, marginBottom: 16,
        overflow: 'hidden', position: 'relative',
        shadowColor: T.indigo, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 24, elevation: 8,
    },
    heroDecor1: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
    heroDecor2: { position: 'absolute', top: 40, right: 60, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.07)' },
    heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    heroValue: { fontSize: 40, fontWeight: '900', color: '#fff', lineHeight: 44 },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    heroCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    },
    heroCircleNum: { fontSize: 24, fontWeight: '900', color: '#fff' },
    heroCircleLabel: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
    heroBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    heroBarFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
    heroBarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

    // KPI grid
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    kpiItem: { width: (W - 50) / 2 },

    // Quick actions
    qaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },

    // Subject cards
    subjectCard: {
        backgroundColor: T.bgCard, borderRadius: 20,
        borderWidth: 1, borderColor: T.border, marginBottom: 12,
        flexDirection: 'row', overflow: 'hidden',
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    subjectStrip: { width: 4 },
    subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    subjectIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    subjectName: { fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 2 },
    subjectMeta: { fontSize: 11, color: T.textSub, fontWeight: '500' },
    pctBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    pctText: { fontSize: 14, fontWeight: '900' },
    subjectFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subjectStatus: { fontSize: 11, fontWeight: '700', flex: 1 },
    subjectCount: { fontSize: 10, color: T.textDim, fontWeight: '600' },
    subjectArrow: { fontSize: 16, fontWeight: '800' },
});
