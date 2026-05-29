// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Student Dashboard v2.0
// Today's class widget, motivational streak, quick actions,
// assignments / past papers / results tabs
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { clearSession } from '../../lib/security';
import {
    HomeworkItem, getStudentHomework, getPastPapers,
    getStudentResults, formatDate, getGrade,
    getUnreadNotificationCount, supabase, getCurrentTerm,
} from '../../lib/supabase';
import { cacheData } from '../../lib/offline';
import OfflineBanner from '../../components/OfflineBanner';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'assignments' | 'papers' | 'results';

const W = Dimensions.get('window').width;

const C = {
    bg: '#f1f5f9', card: '#fff', border: '#e2e8f0',
    primary: '#0d9488', primaryLight: '#ccfbf1',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    blue: '#2563eb', blueLight: '#dbeafe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentDashboard() {
    const { session, setSession } = useSession();
    const navigation = useNavigation<NavProp>();
    const [tab, setTab] = useState<Tab>('assignments');
    const [homework, setHomework] = useState<HomeworkItem[]>([]);
    const [papers, setPapers] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [todayClasses, setTodayClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const portalUserId = session?.portal_user_id || 0;

    // Clock tick
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [hw, pp, res] = await Promise.all([
                session?.student_form_id ? getStudentHomework(session.student_form_id) : Promise.resolve([]),
                getPastPapers(),
                session?.linked_student_id ? getStudentResults(session.linked_student_id) : Promise.resolve([]),
            ]);
            setHomework(hw); setPapers(pp); setResults(res);
            await cacheData(`student_${session?.portal_user_id}_dashboard`, { hw, pp, res });

            // Load today's timetable
            if (session?.student_form_id && session?.student_stream_id) {
                const todayName = DAYS[new Date().getDay()];
                const { data: ttData } = await supabase
                    .from('school_timetable_entries')
                    .select(`
                        id, day_of_week, room, is_double,
                        school_timetable_periods(period_name, start_time, end_time, period_type),
                        school_subjects(subject_name),
                        school_teachers(first_name, last_name)
                    `)
                    .eq('form_id', session.student_form_id)
                    .eq('stream_id', session.student_stream_id)
                    .ilike('day_of_week', todayName)
                    .order('period_id');

                setTodayClasses((ttData || []).filter((e: any) =>
                    e.school_timetable_periods?.period_type !== 'break' &&
                    e.school_timetable_periods?.period_type !== 'lunch'
                ));
            }

            if (portalUserId) {
                const count = await getUnreadNotificationCount(portalUserId);
                setUnreadCount(count);
            }
        } catch (err: any) { console.error('Student load error:', err.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, [session]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const avgMarks = results.length > 0
        ? Math.round(results.reduce((s: number, r: any) => s + Number(r.score || 0), 0) / results.length)
        : 0;
    const pendingHw = homework.filter(h => h.status === 'Active' || h.status === 'active').length;

    // Find next/current class
    const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    const currentClass = todayClasses.find(c =>
        c.school_timetable_periods?.start_time <= nowStr &&
        c.school_timetable_periods?.end_time >= nowStr
    );
    const nextClass = !currentClass
        ? todayClasses.find(c => c.school_timetable_periods?.start_time > nowStr)
        : null;

    const fmt12h = (t: string) => {
        if (!t) return '';
        const [h, m] = t.split(':');
        const hr = parseInt(h, 10);
        return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    };

    if (loading) return (
        <View style={st.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.loadingText}>Loading dashboard…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#0d9488', '#059669']} style={st.header}>
                <SafeAreaView>
                    <View style={st.headerRow}>
                        <View style={st.avatar}>
                            <Text style={st.avatarText}>
                                {(session?.student_name || 'S').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={st.headerName}>{session?.student_name || 'Student'}</Text>
                            <Text style={st.headerSub}>🎓 {session?.student_admission} · {session?.student_form}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setSession(null); clearSession(); }} style={st.iconBtn}>
                            <Text style={{ fontSize: 18 }}>🚪</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications', { portalUserId })}
                            style={[st.iconBtn, { position: 'relative' }]}
                        >
                            <Text style={{ fontSize: 20 }}>🔔</Text>
                            {unreadCount > 0 && (
                                <View style={st.notifBadge}>
                                    <Text style={st.notifBadgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={st.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <OfflineBanner />

                {/* ── TODAY'S CLASS WIDGET ─────────────────────── */}
                {(currentClass || nextClass || todayClasses.length > 0) && (
                    <View style={st.todayCard}>
                        <LinearGradient
                            colors={currentClass ? ['#059669', '#0d9488'] : ['#4f46e5', '#7c3aed']}
                            style={st.todayGradient}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <View style={st.todayDecor} />
                            <View style={{ flex: 1 }}>
                                <View style={st.todayLiveRow}>
                                    {currentClass && (
                                        <View style={st.liveDot}>
                                            <View style={st.liveDotInner} />
                                            <Text style={st.liveText}>NOW</Text>
                                        </View>
                                    )}
                                    <Text style={st.todayLabel}>
                                        {currentClass ? 'Current Class' : nextClass ? 'Next Class' : `Today — ${todayClasses.length} lessons`}
                                    </Text>
                                </View>
                                <Text style={st.todaySubject}>
                                    {currentClass
                                        ? currentClass.school_subjects?.subject_name
                                        : nextClass
                                            ? nextClass.school_subjects?.subject_name
                                            : `${DAYS[new Date().getDay()]}'s Schedule`}
                                </Text>
                                {(currentClass || nextClass) && (
                                    <Text style={st.todayMeta}>
                                        ⏰ {fmt12h((currentClass || nextClass)?.school_timetable_periods?.start_time)} –{' '}
                                        {fmt12h((currentClass || nextClass)?.school_timetable_periods?.end_time)}
                                        {(currentClass || nextClass)?.room ? ` · 🏫 Room ${(currentClass || nextClass)?.room}` : ''}
                                    </Text>
                                )}
                                {(currentClass || nextClass)?.school_teachers && (
                                    <Text style={st.todayTeacher}>
                                        👩‍🏫 {(currentClass || nextClass)?.school_teachers?.first_name} {(currentClass || nextClass)?.school_teachers?.last_name}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Timetable')}
                                style={st.todayArrow}
                            >
                                <Text style={{ color: '#fff', fontSize: 22 }}>→</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                )}

                {/* ── KPI GRID ─────────────────────────────────── */}
                <View style={st.kpiGrid}>
                    <View style={[st.kpiCard, { borderLeftColor: C.primary }]}>
                        <Text style={{ fontSize: 18 }}>📝</Text>
                        <Text style={[st.kpiVal, { color: C.primary }]}>{pendingHw}</Text>
                        <Text style={st.kpiLabel}>Assignments</Text>
                    </View>
                    <View style={[st.kpiCard, { borderLeftColor: C.purple }]}>
                        <Text style={{ fontSize: 18 }}>📄</Text>
                        <Text style={[st.kpiVal, { color: C.purple }]}>{papers.length}</Text>
                        <Text style={st.kpiLabel}>Past Papers</Text>
                    </View>
                    <View style={[st.kpiCard, { borderLeftColor: C.blue }]}>
                        <Text style={{ fontSize: 18 }}>📊</Text>
                        <Text style={[st.kpiVal, { color: C.blue }]}>{avgMarks}%</Text>
                        <Text style={st.kpiLabel}>Avg Marks</Text>
                    </View>
                    <View style={[st.kpiCard, { borderLeftColor: C.accent }]}>
                        <Text style={{ fontSize: 18 }}>🏆</Text>
                        <Text style={[st.kpiVal, { color: C.accent }]}>{getGrade(avgMarks)}</Text>
                        <Text style={st.kpiLabel}>Grade</Text>
                    </View>
                </View>

                {/* ── QUICK ACTIONS ─────────────────────────────── */}
                <View style={st.quickRow}>
                    {[
                        { emoji: '💰', label: 'Fee Balance', color: C.accent, onPress: () => navigation.navigate('FeeBalance') },
                        { emoji: '📄', label: 'Report Card', color: C.blue, onPress: () => navigation.navigate('ReportCard', { studentId: session?.linked_student_id || 0, formId: session?.student_form_id || 0, formLevel: session?.student_form_level || 0, isParent: false }) },
                        { emoji: '🎓', label: 'CBC Levels', color: C.purple, onPress: () => navigation.navigate('CBCAssessment', { studentId: session?.linked_student_id || 0 }) },
                        { emoji: '🔔', label: 'Alerts', color: '#ec4899', onPress: () => navigation.navigate('Notifications', { portalUserId }) },
                    ].map(item => (
                        <TouchableOpacity key={item.label} onPress={item.onPress} style={st.quickCard}>
                            <View style={[st.quickIconWrap, { backgroundColor: item.color + '15' }]}>
                                <Text style={st.quickEmoji}>{item.emoji}</Text>
                            </View>
                            <Text style={[st.quickLabel, { color: item.color }]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── TABS ─────────────────────────────────────── */}
                <View style={st.tabRow}>
                    {([
                        ['assignments', '📝 Tasks', homework.length],
                        ['papers', '📄 Papers', papers.length],
                        ['results', '📊 Results', results.length],
                    ] as [Tab, string, number][]).map(([k, l, c]) => (
                        <TouchableOpacity key={k} onPress={() => setTab(k)} style={[st.tabBtn, tab === k && st.tabBtnActive]}>
                            <Text style={[st.tabText, tab === k && st.tabTextActive]}>{l}</Text>
                            <View style={[st.tabCount, tab === k && st.tabCountActive]}>
                                <Text style={[st.tabCountText, tab === k && st.tabCountTextActive]}>{c}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── ASSIGNMENTS TAB ──────────────────────────── */}
                {tab === 'assignments' && (
                    <View style={st.section}>
                        <Text style={st.sectionTitle}>📝 Assignments & Homework</Text>
                        {homework.length === 0 ? (
                            <View style={st.emptyBox}>
                                <Text style={{ fontSize: 36 }}>🎉</Text>
                                <Text style={st.emptyText}>No assignments right now!</Text>
                            </View>
                        ) : homework.map((h, i) => {
                            const overdue = h.due_date && new Date(h.due_date) < new Date();
                            return (
                                <View key={h.id} style={[st.itemCard, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                    <View style={st.itemHeader}>
                                        <View style={[st.itemIcon, { backgroundColor: overdue ? C.dangerLight : C.accentLight }]}>
                                            <Text style={{ fontSize: 16 }}>{overdue ? '⏰' : '📝'}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={st.itemTitle}>{h.title}</Text>
                                            <Text style={st.itemMeta}>📚 {h.subject_name} · 👩‍🏫 {h.teacher_name}</Text>
                                        </View>
                                        <View style={[st.dueBadge, { backgroundColor: overdue ? C.dangerLight : C.blueLight }]}>
                                            <Text style={[st.dueText, { color: overdue ? C.danger : C.blue }]}>
                                                {h.due_date ? formatDate(h.due_date) : 'No date'}
                                            </Text>
                                        </View>
                                    </View>
                                    {h.description ? (
                                        <Text style={st.itemDesc} numberOfLines={2}>{h.description}</Text>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* ── PAST PAPERS TAB ──────────────────────────── */}
                {tab === 'papers' && (
                    <View style={st.section}>
                        <Text style={st.sectionTitle}>📄 Past Papers</Text>
                        {papers.length === 0 ? (
                            <View style={st.emptyBox}>
                                <Text style={{ fontSize: 36 }}>📭</Text>
                                <Text style={st.emptyText}>No past papers uploaded yet</Text>
                            </View>
                        ) : papers.map((p: any, i: number) => (
                            <View key={p.id} style={[st.itemCard, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <View style={st.itemHeader}>
                                    <View style={[st.itemIcon, { backgroundColor: C.purpleLight }]}>
                                        <Text style={{ fontSize: 16 }}>📄</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.itemTitle}>{p.title || p.paper_name || 'Past Paper'}</Text>
                                        <Text style={st.itemMeta}>📚 {p.school_subjects?.subject_name || 'General'} · {p.year || ''} {p.term || ''}</Text>
                                    </View>
                                    <View style={[st.dueBadge, { backgroundColor: C.purpleLight }]}>
                                        <Text style={[st.dueText, { color: C.purple }]}>{p.exam_type || 'Exam'}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── RESULTS TAB ──────────────────────────────── */}
                {tab === 'results' && (
                    <View style={st.section}>
                        <Text style={st.sectionTitle}>📊 My Exam Results</Text>
                        <View style={st.gridHeader}>
                            <Text style={[st.gridHText, { flex: 2 }]}>Subject</Text>
                            <Text style={[st.gridHText, { flex: 1 }]}>Exam</Text>
                            <Text style={[st.gridHText, { flex: 0.6 }]}>Score</Text>
                            <Text style={[st.gridHText, { flex: 0.5 }]}>Grade</Text>
                        </View>
                        {results.length === 0 ? (
                            <View style={st.emptyBox}>
                                <Text style={{ fontSize: 36 }}>📊</Text>
                                <Text style={st.emptyText}>No results yet</Text>
                            </View>
                        ) : results.map((r: any, i: number) => {
                            const score = Number(r.score || 0);
                            const grade = getGrade(score);
                            const gc = score >= 50 ? C.accent : C.danger;
                            return (
                                <View key={r.id} style={[st.gridRow, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                    <Text style={[st.gridCell, { flex: 2, fontWeight: '700' }]}>{r.school_subjects?.subject_name || '—'}</Text>
                                    <Text style={[st.gridCell, { flex: 1, color: C.textSub }]}>{r.exam_type || '—'}</Text>
                                    <Text style={[st.gridCell, { flex: 0.6, fontWeight: '900', color: gc }]}>{score}%</Text>
                                    <View style={{ flex: 0.5, alignItems: 'center' }}>
                                        <View style={{ backgroundColor: gc + '18', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '900', color: gc }}>{grade}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    content: { padding: 16, paddingBottom: 40 },
    header: { paddingTop: 44, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerName: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
    notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

    // Today's class card
    todayCard: { marginBottom: 14, borderRadius: 20, overflow: 'hidden', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
    todayGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, position: 'relative' },
    todayDecor: { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.07)' },
    todayLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    liveDot: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    liveText: { fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
    todayLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase' },
    todaySubject: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
    todayMeta: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
    todayTeacher: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
    todayArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    kpiCard: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, elevation: 2 },
    kpiVal: { fontSize: 20, fontWeight: '900' },
    kpiLabel: { fontSize: 9, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 6 },
    quickIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    quickEmoji: { fontSize: 20 },
    quickLabel: { fontSize: 9, fontWeight: '800', textAlign: 'center' },

    tabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border },
    tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    tabText: { fontSize: 10, fontWeight: '700', color: C.textSub },
    tabTextActive: { color: '#fff' },
    tabCount: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
    tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabCountText: { fontSize: 9, fontWeight: '900', color: C.textSub },
    tabCountTextActive: { color: '#fff' },

    section: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 14 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
    emptyText: { fontSize: 12, color: C.textSub },
    itemCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 13, fontWeight: '800', color: C.text },
    itemMeta: { fontSize: 10, color: C.textSub, marginTop: 2 },
    itemDesc: { fontSize: 11, color: C.textSub, marginTop: 8, lineHeight: 16 },
    dueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    dueText: { fontSize: 9, fontWeight: '800' },
    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
    gridHText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },
});
