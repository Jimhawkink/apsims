// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — Student Dashboard v3.0
// Ultra-light bright theme · Live timetable · Results · Homework
// Kenya's #1 School Management System
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { clearSession } from '../../lib/security';
import {
    HomeworkItem, getStudentHomework, getPastPapers,
    getStudentResults, getUnreadNotificationCount, supabase, getCurrentTerm,
} from '../../lib/supabase';
import { cacheData } from '../../lib/offline';
import OfflineBanner from '../../components/OfflineBanner';
import { T, fmtKESShort } from '../../theme/PremiumTheme';
import {
    SectionLabel, ProgressBar, EmptyState, SkeletonCard,
    SkeletonRow, QuickActionItem,
} from '../../components/PremiumUI';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const { width: W } = Dimensions.get('window');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentDashboard() {
    const { session, setSession } = useSession();
    const navigation = useNavigation<NavProp>();
    const insets = useSafeAreaInsets();

    const [homework, setHomework] = useState<HomeworkItem[]>([]);
    const [papers, setPapers] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [todayClasses, setTodayClasses] = useState<any[]>([]);
    const [feeData, setFeeData] = useState({ balance: 0, totalDue: 0, totalPaid: 0, collectionRate: 0 });
    const [attendanceData, setAttendanceData] = useState({ present: 0, total: 0, rate: 0 });
    const [termName, setTermName] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'hw' | 'results' | 'papers'>('hw');

    const portalUserId = session?.portal_user_id || 0;
    const studentId = session?.linked_student_id || 0;
    const formId = session?.student_form_id || 0;
    const streamId = session?.student_stream_id || 0;

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const hour = currentTime.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const greetEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';
    const todayName = DAYS[currentTime.getDay()];

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [hw, pps, res, term] = await Promise.all([
                getStudentHomework(studentId),
                getPastPapers(),
                getStudentResults(studentId),
                getCurrentTerm(),
            ]);
            setHomework(hw);
            setPapers(pps);
            setResults(res);
            setTermName(term?.term_name || '');

            // Today's timetable
            const { data: tt } = await supabase
                .from('school_timetable')
                .select(`
                    id, period_number, start_time, end_time,
                    school_subjects(subject_name),
                    school_teachers(full_name),
                    school_classrooms(room_name)
                `)
                .eq('form_id', formId)
                .eq('stream_id', streamId)
                .eq('day_of_week', currentTime.getDay())
                .order('period_number');
            setTodayClasses(tt || []);

            // Fee data — filter structures by current year (fall back to latest year if none)
            const currentYear = new Date().getFullYear();
            const [{ data: pays }, { data: allStructsRaw }] = await Promise.all([
                supabase.from('school_fee_payments').select('amount').eq('student_id', studentId),
                supabase.from('school_fee_structures').select('amount, year, form_id').eq('form_id', formId),
            ]);
            let structs = (allStructsRaw || []).filter((f: any) => !f.year || Number(f.year) === currentYear);
            if (structs.length === 0 && allStructsRaw && allStructsRaw.length > 0) {
                const maxYear = Math.max(...allStructsRaw.map((f: any) => Number(f.year) || 0));
                structs = allStructsRaw.filter((f: any) => !f.year || Number(f.year) === maxYear);
            }
            const due = structs.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
            const paid = (pays || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const bal = Math.max(0, due - paid);
            const rate = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 100;
            setFeeData({ balance: bal, totalDue: due, totalPaid: paid, collectionRate: rate });

            // Attendance (last 30 days)
            const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            const { data: att } = await supabase
                .from('school_attendance')
                .select('status')
                .eq('student_id', studentId)
                .gte('attendance_date', since);
            const total = (att || []).length;
            const present = (att || []).filter((a: any) => a.status === 'Present').length;
            setAttendanceData({ present, total, rate: total > 0 ? Math.round((present / total) * 100) : 100 });

            if (portalUserId) {
                const count = await getUnreadNotificationCount(portalUserId);
                setUnreadCount(count);
            }

            await cacheData(`student_${portalUserId}_dashboard`, { hw, pps, res });
        } catch (err: any) {
            console.error('Student load error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, formId, streamId, portalUserId]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const initials = (session?.full_name || 'S')
        .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

    // Current class highlight
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const currentClass = todayClasses.find((c: any) => {
        if (!c.start_time || !c.end_time) return false;
        const [sh, sm] = c.start_time.split(':').map(Number);
        const [eh, em] = c.end_time.split(':').map(Number);
        return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
    });

    // Results avg
    const avgScore = results.length > 0
        ? Math.round(results.reduce((s: number, r: any) => s + Number(r.percentage || r.score || 0), 0) / results.length) : 0;
    const gradeColor = avgScore >= 75 ? T.green : avgScore >= 50 ? T.amber : T.red;
    const gradeBg = avgScore >= 75 ? T.greenLight : avgScore >= 50 ? T.amberLight : T.redLight;

    const pendingHW = homework.filter((h: any) => !h.submitted).length;
    const submittedHW = homework.filter((h: any) => h.submitted).length;

    return (
        <View style={[styles.root, { backgroundColor: T.bg }]}>
            <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

            {/* ─── Top Bar ──────────────────────────────────────── */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <View style={styles.topLeft}>
                    <LinearGradient colors={T.gradTeal} style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                    <View>
                        <Text style={styles.greeting}>{greetEmoji} {greeting}</Text>
                        <Text style={styles.name} numberOfLines={1}>{session?.full_name || 'Student'}</Text>
                    </View>
                </View>
                <View style={styles.topRight}>
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
                    <TouchableOpacity
                        onPress={() => { setSession(null); clearSession(); }}
                        style={[styles.iconBtn, { backgroundColor: T.redLight, borderColor: '#fca5a5' }]}
                        accessibilityLabel="Logout"
                    >
                        <Text style={{ fontSize: 20 }}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <OfflineBanner pendingCount={0} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} colors={[T.teal]} />}
            >
                {loading ? (
                    <>
                        <SkeletonCard rows={3} style={{ marginBottom: 12 }} />
                        <SkeletonCard rows={2} style={{ marginBottom: 12 }} />
                        <SkeletonRow /><SkeletonRow /><SkeletonRow />
                    </>
                ) : (
                    <>
                        {/* ─── Hero stats banner ─────────────────── */}
                        <LinearGradient colors={T.gradTeal} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <View style={styles.heroDecor1} />
                            <View style={styles.heroDecor2} />

                            {/* Term + date row */}
                            <View style={styles.heroTopRow}>
                                <View style={styles.termPill}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.termText}>{termName || 'School Term'}</Text>
                                </View>
                                <Text style={styles.heroDate}>
                                    {currentTime.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </Text>
                            </View>

                            {/* KPI row */}
                            <View style={styles.heroKpiRow}>
                                {[
                                    { icon: '📊', label: 'Avg Score', value: `${avgScore}%` },
                                    { icon: '✅', label: 'Attendance', value: `${attendanceData.rate}%` },
                                    { icon: '📝', label: 'Pending HW', value: String(pendingHW) },
                                    { icon: '💰', label: 'Fee Status', value: feeData.balance > 0 ? `⚠ Bal` : '✅ Paid' },
                                ].map((k, i) => (
                                    <View key={i} style={[styles.heroKpiItem, i < 3 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }]}>
                                        <Text style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</Text>
                                        <Text style={styles.heroKpiVal}>{k.value}</Text>
                                        <Text style={styles.heroKpiLbl}>{k.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </LinearGradient>

                        {/* ─── TODAY'S CLASS WIDGET ──────────────── */}
                        <SectionLabel
                            title={`🗓️ Today — ${todayName}`}
                            subtitle={`${todayClasses.length} period${todayClasses.length !== 1 ? 's' : ''}`}
                            action="Full Timetable"
                            onAction={() => navigation.navigate('StudentTimetable' as any)}
                        />

                        {currentClass && (
                            <LinearGradient colors={['#FFF9C4', '#FFF176']} style={styles.nowPlayingCard}>
                                <View style={styles.nowPlayingDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.nowPlayingLabel}>NOW IN CLASS</Text>
                                    <Text style={styles.nowPlayingSubject}>
                                        {(currentClass.school_subjects as any)?.subject_name || 'Class'}
                                    </Text>
                                    <Text style={styles.nowPlayingMeta}>
                                        {currentClass.start_time} – {currentClass.end_time}
                                        {(currentClass.school_classrooms as any)?.room_name ? ` · ${(currentClass.school_classrooms as any).room_name}` : ''}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 32 }}>📚</Text>
                            </LinearGradient>
                        )}

                        {todayClasses.length === 0 ? (
                            <EmptyState icon="🎉" title="No Classes Today" sub="Enjoy your day off!" />
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodsScroll}>
                                {todayClasses.map((c: any, i: number) => {
                                    const [sh, sm] = (c.start_time || '0:0').split(':').map(Number);
                                    const classMins = sh * 60 + sm;
                                    const isCurrent = !!currentClass && currentClass.id === c.id;
                                    const isPast = nowMins > classMins + 40;
                                    return (
                                        <View key={i} style={[
                                            styles.periodCard,
                                            isCurrent && styles.periodCardCurrent,
                                            isPast && !isCurrent && styles.periodCardPast,
                                        ]}>
                                            <Text style={[styles.periodTime, isCurrent && { color: '#fff' }]}>
                                                {c.start_time?.slice(0, 5) || '--:--'}
                                            </Text>
                                            <Text style={[styles.periodSubject, isCurrent && { color: '#fff' }]} numberOfLines={2}>
                                                {(c.school_subjects as any)?.subject_name || 'Free'}
                                            </Text>
                                            <Text style={[styles.periodTeacher, isCurrent && { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
                                                {(c.school_teachers as any)?.full_name?.split(' ')[0] || ''}
                                            </Text>
                                            {isCurrent && <View style={styles.periodLiveDot} />}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* ─── Quick Actions ─────────────────────── */}
                        <SectionLabel title="Quick Actions" subtitle="Tap to navigate" />
                        <View style={styles.qaGrid}>
                            <QuickActionItem icon="📊" label="My Results" gradient={T.gradBlue} onPress={() => navigation.navigate('StudentResults' as any)} />
                            <QuickActionItem icon="📋" label="Attendance" gradient={T.gradTeal} onPress={() => navigation.navigate('StudentAttendance' as any)} />
                            <QuickActionItem icon="💰" label="Fee Balance" gradient={feeData.balance > 0 ? T.gradRed : T.gradGreen} onPress={() => navigation.navigate('FeeBalance' as any)} />
                            <QuickActionItem icon="📄" label="Report Card" gradient={T.gradPurple} onPress={() => navigation.navigate('ReportCard' as any)} />
                        </View>

                        {/* ─── Fee Balance Gauge ─────────────────── */}
                        {feeData.totalDue > 0 && (
                            <TouchableOpacity onPress={() => navigation.navigate('FeeBalance' as any)} activeOpacity={0.85}>
                                <View style={styles.feeCard}>
                                    <View style={styles.feeCardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.feeCardTitle}>💰 Fee Balance</Text>
                                            <Text style={[styles.feeCardBal, { color: feeData.balance > 0 ? T.red : T.green }]}>
                                                {feeData.balance > 0 ? fmtKESShort(feeData.balance) + ' outstanding' : '✅ Fully Paid'}
                                            </Text>
                                        </View>
                                        <View style={[styles.feePctBadge, { backgroundColor: gradeBg, borderColor: gradeColor + '40' }]}>
                                            <Text style={[styles.feePctText, { color: feeData.collectionRate >= 80 ? T.green : feeData.collectionRate >= 50 ? T.amber : T.red }]}>
                                                {feeData.collectionRate}%
                                            </Text>
                                        </View>
                                    </View>
                                    <ProgressBar
                                        pct={feeData.collectionRate}
                                        color={feeData.collectionRate >= 80 ? T.green : feeData.collectionRate >= 50 ? T.amber : T.red}
                                        height={10}
                                    />
                                    <View style={styles.feeCardFooter}>
                                        <Text style={styles.feeCardFooterText}>Paid: {fmtKESShort(feeData.totalPaid)}</Text>
                                        <Text style={styles.feeCardFooterText}>Total: {fmtKESShort(feeData.totalDue)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* ─── Tab: Homework / Results / Papers ──── */}
                        <View style={styles.tabBar}>
                            {[
                                { id: 'hw', label: `📝 Homework (${pendingHW})` },
                                { id: 'results', label: `📊 Results (${results.length})` },
                                { id: 'papers', label: `📄 Papers (${papers.length})` },
                            ].map(tab => (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => setActiveTab(tab.id as any)}
                                    style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                                >
                                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]} numberOfLines={1}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Homework tab */}
                        {activeTab === 'hw' && (
                            homework.length === 0 ? (
                                <EmptyState icon="✅" title="No Homework" sub="You're all caught up!" />
                            ) : homework.slice(0, 8).map((h: any, i: number) => {
                                const due = h.due_date ? new Date(h.due_date) : null;
                                const overdue = due && due < new Date() && !h.submitted;
                                return (
                                    <View key={i} style={[styles.hwCard, { borderLeftColor: h.submitted ? T.green : overdue ? T.red : T.amber }]}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.hwTopRow}>
                                                <Text style={styles.hwSubject}>{h.subject_name || 'Assignment'}</Text>
                                                <View style={[styles.hwStatusBadge, {
                                                    backgroundColor: h.submitted ? T.greenLight : overdue ? T.redLight : T.amberLight
                                                }]}>
                                                    <Text style={[styles.hwStatusText, { color: h.submitted ? T.green : overdue ? T.red : T.amber }]}>
                                                        {h.submitted ? '✅ Done' : overdue ? '⚠ Overdue' : '⏳ Pending'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.hwTitle} numberOfLines={2}>{h.title || h.description || 'Homework'}</Text>
                                            {due && <Text style={styles.hwDue}>Due: {due.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</Text>}
                                        </View>
                                    </View>
                                );
                            })
                        )}

                        {/* Results tab */}
                        {activeTab === 'results' && (
                            results.length === 0 ? (
                                <EmptyState icon="📭" title="No Results Yet" sub="Marks will appear here when entered by your teachers" />
                            ) : results.slice(0, 10).map((r: any, i: number) => {
                                const pct = Number(r.percentage || r.score || 0);
                                const color = pct >= 75 ? T.green : pct >= 50 ? T.amber : T.red;
                                const bg = pct >= 75 ? T.greenLight : pct >= 50 ? T.amberLight : T.redLight;
                                return (
                                    <View key={i} style={styles.resultCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.resultSubject}>{r.subject_name || 'Subject'}</Text>
                                            <Text style={styles.resultExam}>{r.exam_name || r.term_name || 'Exam'}</Text>
                                            <ProgressBar pct={pct} color={color} height={6} />
                                        </View>
                                        <View style={[styles.resultScore, { backgroundColor: bg }]}>
                                            <Text style={[styles.resultScoreText, { color }]}>{pct}%</Text>
                                            <Text style={[styles.resultGrade, { color }]}>
                                                {pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'E'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}

                        {/* Past papers tab */}
                        {activeTab === 'papers' && (
                            papers.length === 0 ? (
                                <EmptyState icon="📄" title="No Past Papers" sub="Past papers will appear here when uploaded by teachers" />
                            ) : papers.slice(0, 8).map((p: any, i: number) => (
                                <View key={i} style={styles.paperCard}>
                                    <LinearGradient colors={T.gradBlue} style={styles.paperIcon}>
                                        <Text style={{ fontSize: 18 }}>📄</Text>
                                    </LinearGradient>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.paperTitle} numberOfLines={1}>{p.title || 'Past Paper'}</Text>
                                        <Text style={styles.paperMeta}>{p.subject_name || ''} · {p.year || ''}</Text>
                                    </View>
                                    <Text style={styles.paperArrow}>→</Text>
                                </View>
                            ))
                        )}

                        <View style={{ height: 36 }} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Top bar
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 12, backgroundColor: T.bg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: {
        width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        shadowColor: T.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
    greeting: { fontSize: 11, color: T.textSub, fontWeight: '600' },
    name: { fontSize: 16, fontWeight: '900', color: T.text, maxWidth: W * 0.45 },
    topRight: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: T.bgSoft,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, position: 'relative',
    },
    notifBadge: {
        position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 8,
        backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg,
    },
    notifBadgeText: { fontSize: 8, color: '#fff', fontWeight: '900' },

    scroll: { padding: 20, paddingTop: 12 },

    // Hero
    hero: {
        borderRadius: 24, marginBottom: 20, overflow: 'hidden',
        shadowColor: T.teal, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
    },
    heroDecor1: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
    heroDecor2: { position: 'absolute', bottom: 0, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
    termPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86efac' },
    termText: { fontSize: 11, color: '#fff', fontWeight: '700' },
    heroDate: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    heroKpiRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
    heroKpiItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    heroKpiVal: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 3 },
    heroKpiLbl: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

    // Now playing card
    nowPlayingCard: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 12,
        borderWidth: 1.5, borderColor: '#FDD835',
        shadowColor: '#FDD835', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
    },
    nowPlayingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.red, marginRight: 12, shadowColor: T.red, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
    nowPlayingLabel: { fontSize: 9, fontWeight: '900', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
    nowPlayingSubject: { fontSize: 17, fontWeight: '900', color: '#1E293B', marginBottom: 2 },
    nowPlayingMeta: { fontSize: 11, color: '#78716C', fontWeight: '600' },

    // Periods scroll
    periodsScroll: { marginBottom: 20, marginHorizontal: -20 },
    periodCard: {
        width: 90, marginLeft: 10, borderRadius: 16, padding: 12,
        backgroundColor: T.bgCard, borderWidth: 1.5, borderColor: T.border,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    periodCardCurrent: { backgroundColor: T.teal, borderColor: T.teal, shadowColor: T.teal, shadowOpacity: 0.3, elevation: 6 },
    periodCardPast: { opacity: 0.5 },
    periodTime: { fontSize: 11, fontWeight: '800', color: T.textSub, marginBottom: 8 },
    periodSubject: { fontSize: 12, fontWeight: '800', color: T.text, textAlign: 'center', marginBottom: 4 },
    periodTeacher: { fontSize: 10, color: T.textSub, textAlign: 'center' },
    periodLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86efac', marginTop: 6 },

    // Quick actions
    qaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },

    // Fee card
    feeCard: {
        backgroundColor: T.bgCard, borderRadius: 20, padding: 18, marginBottom: 20,
        borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    },
    feeCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    feeCardTitle: { fontSize: 13, fontWeight: '900', color: T.text, marginBottom: 4 },
    feeCardBal: { fontSize: 16, fontWeight: '900' },
    feePctBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
    feePctText: { fontSize: 18, fontWeight: '900' },
    feeCardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    feeCardFooterText: { fontSize: 11, color: T.textSub, fontWeight: '600' },

    // Tab bar
    tabBar: { flexDirection: 'row', backgroundColor: T.bgSoft, borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: T.border },
    tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 13 },
    tabBtnActive: { backgroundColor: T.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    tabText: { fontSize: 11, fontWeight: '700', color: T.textSub },
    tabTextActive: { color: T.teal, fontWeight: '900' },

    // Homework card
    hwCard: {
        backgroundColor: T.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
        borderLeftWidth: 4, borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    hwTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    hwSubject: { fontSize: 12, fontWeight: '800', color: T.textSub, textTransform: 'uppercase', letterSpacing: 0.3 },
    hwStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    hwStatusText: { fontSize: 10, fontWeight: '800' },
    hwTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 6, lineHeight: 20 },
    hwDue: { fontSize: 11, color: T.textSub, fontWeight: '600' },

    // Result card
    resultCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: T.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    resultSubject: { fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 2 },
    resultExam: { fontSize: 11, color: T.textSub, marginBottom: 8, fontWeight: '500' },
    resultScore: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    resultScoreText: { fontSize: 15, fontWeight: '900' },
    resultGrade: { fontSize: 11, fontWeight: '800' },

    // Paper card
    paperCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: T.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    paperIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    paperTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 3 },
    paperMeta: { fontSize: 11, color: T.textSub, fontWeight: '500' },
    paperArrow: { fontSize: 18, color: T.teal, fontWeight: '800' },
});
