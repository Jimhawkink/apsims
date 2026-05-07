import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { clearSession } from '../../lib/security';
import {
    FeePayment, DisciplineRecord,
    getStudentFeePayments, getStudentFeeStructures,
    getStudentDiscipline, getStudentResults, formatKES, formatDate, getGrade,
    getUnreadNotificationCount,
} from '../../lib/supabase';
import { cacheData } from '../../lib/offline';
import OfflineBanner from '../../components/OfflineBanner';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryLight: '#dbeafe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

type Tab = 'fees' | 'academics' | 'discipline';

export default function ParentDashboard() {
    const { session, setSession } = useSession();
    const navigation = useNavigation<NavProp>();
    const [tab, setTab] = useState<Tab>('fees');
    const [payments, setPayments] = useState<FeePayment[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [discipline, setDiscipline] = useState<DisciplineRecord[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const studentId = session?.linked_student_id || 0;
    const formId = session?.student_form_id || 0;
    const portalUserId = session?.portal_user_id || 0;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [pays, structs, disc, res] = await Promise.all([
                getStudentFeePayments(studentId),
                formId ? getStudentFeeStructures(formId) : Promise.resolve([]),
                getStudentDiscipline(studentId),
                getStudentResults(studentId),
            ]);
            setPayments(pays);
            setStructures(structs);
            setDiscipline(disc);
            setResults(res);
            await cacheData(`parent_${session?.portal_user_id}_dashboard`, { pays, structs, disc, res });
            // Refresh notification count
            if (portalUserId) {
                const count = await getUnreadNotificationCount(portalUserId);
                setUnreadCount(count);
            }
        } catch (err: any) {
            console.error('Parent load error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, formId]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalDue = structures.reduce((s, f) => s + Number(f.amount || 0), 0);
    const balance = Math.max(0, totalDue - totalPaid);
    const avgMarks = results.length > 0
        ? Math.round(results.reduce((s: number, r: any) => s + Number(r.score || 0), 0) / results.length) : 0;

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
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(session?.student_name || 'S').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerName}>{session?.student_name || 'Student'}</Text>
                            <Text style={styles.headerSub}>
                                🎓 Adm: {session?.student_admission || 'N/A'} • {session?.student_form || 'N/A'}
                            </Text>
                            <Text style={styles.headerParent}>👨‍👩‍👧 Parent: {session?.full_name}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setSession(null); clearSession(); }} style={styles.logoutBtn}>
                            <Text style={styles.logoutText}>🚪</Text>
                        </TouchableOpacity>
                        {/* Notification Bell */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications', { portalUserId })}
                            style={styles.bellBtn}
                            accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                        >
                            <Text style={styles.bellText}>🔔</Text>
                            {unreadCount > 0 && (
                                <View style={styles.bellBadge}>
                                    <Text style={styles.bellBadgeText}>
                                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                                    </Text>
                                </View>
                            )}
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
                {/* KPI Grid */}
                <View style={styles.kpiGrid}>
                    <KPI emoji="💰" label="Total Paid" value={formatKES(totalPaid)} color={C.accent} />
                    <KPI emoji="⚠️" label="Balance" value={formatKES(balance)} color={balance > 0 ? C.danger : C.accent} />
                    <KPI emoji="📋" label="Total Due" value={formatKES(totalDue)} color={C.primary} />
                    <KPI emoji="📊" label="Avg Marks" value={`${avgMarks}%`} color={C.purple} />
                </View>

                {/* Quick Nav */}
                <View style={styles.quickNavGrid}>
                    {[
                        { emoji: '📅', label: 'Attendance', color: C.purple, onPress: () => {} },
                        { emoji: '📋', label: 'Homework', color: C.primary, onPress: () => {} },
                        { emoji: '🏥', label: 'Health', color: C.accent, onPress: () => navigation.navigate('HealthRecord') },
                        { emoji: '🚪', label: 'Leave Outs', color: '#f97316', onPress: () => navigation.navigate('LeaveOut') },
                        { emoji: '📄', label: 'Report Card', color: C.primary, onPress: () => navigation.navigate('ReportCard', { studentId, formId, formLevel: 0, isParent: true }) },
                    ].map(item => (
                        <TouchableOpacity key={item.label} onPress={item.onPress} style={styles.quickNavCard} accessibilityLabel={item.label}>
                            <Text style={styles.quickNavEmoji}>{item.emoji}</Text>
                            <Text style={[styles.quickNavLabel, { color: item.color }]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Pay Fees CTA — Always visible, supports prepayments */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('PayFees', {
                        studentId,
                        studentName: session?.student_name || 'Student',
                        formId,
                    })}
                    activeOpacity={0.85}
                    style={{ marginBottom: 16 }}
                    accessibilityLabel="Pay school fees"
                >
                    <LinearGradient colors={['#059669', '#047857']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <View style={styles.ctaDecor} />
                        <Text style={styles.ctaEmoji}>💳</Text>
                        <View>
                            <Text style={styles.ctaText}>Pay School Fees</Text>
                            <Text style={styles.ctaSub}>
                                {balance > 0
                                    ? `Balance: ${formatKES(balance)} outstanding`
                                    : 'Make a payment or prepayment'}
                            </Text>
                        </View>
                        <Text style={styles.ctaArrow}>→</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Fee Progress */}
                <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>📈 Fee Payment Progress</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                        {totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}% paid
                    </Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    {[
                        { key: 'fees' as Tab, label: '💰 Fees', count: payments.length },
                        { key: 'academics' as Tab, label: '📊 Academics', count: results.length },
                        { key: 'discipline' as Tab, label: '📋 Discipline', count: discipline.length },
                    ].map(t => (
                        <TouchableOpacity
                            key={t.key}
                            onPress={() => setTab(t.key)}
                            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
                                {t.label}
                            </Text>
                            <View style={[styles.tabCount, tab === t.key && styles.tabCountActive]}>
                                <Text style={[styles.tabCountText, tab === t.key && styles.tabCountTextActive]}>
                                    {t.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ══════ FEES TAB ══════ */}
                {tab === 'fees' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💳 Payment History</Text>
                        {/* DataGrid Header */}
                        <View style={styles.gridHeader}>
                            <Text style={[styles.gridHeaderText, { flex: 1.2 }]}>Date</Text>
                            <Text style={[styles.gridHeaderText, { flex: 1 }]}>Amount</Text>
                            <Text style={[styles.gridHeaderText, { flex: 1 }]}>Method</Text>
                            <Text style={[styles.gridHeaderText, { flex: 1 }]}>Receipt</Text>
                        </View>
                        {payments.length === 0 ? (
                            <Empty emoji="💰" text="No fee payments recorded" />
                        ) : (
                            payments.map((p, idx) => (
                                <View key={p.id} style={[styles.gridRow, idx % 2 === 0 ? styles.gridRowEven : styles.gridRowOdd]}>
                                    <Text style={[styles.gridCell, { flex: 1.2 }]}>{formatDate(p.payment_date)}</Text>
                                    <Text style={[styles.gridCell, styles.gridCellBold, { flex: 1, color: C.accent }]}>
                                        {formatKES(Number(p.amount))}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.methodBadge}>
                                            <Text style={styles.methodBadgeText}>{p.payment_method || 'Cash'}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.gridCell, { flex: 1, color: C.textDim }]} numberOfLines={1}>
                                        {p.mpesa_code || p.reference_number || '-'}
                                    </Text>
                                </View>
                            ))
                        )}
                        {/* Totals */}
                        {payments.length > 0 && (
                            <View style={styles.gridTotals}>
                                <Text style={[styles.gridTotalLabel, { flex: 1.2 }]}>TOTAL</Text>
                                <Text style={[styles.gridTotalValue, { flex: 1 }]}>{formatKES(totalPaid)}</Text>
                                <View style={{ flex: 2 }} />
                            </View>
                        )}
                    </View>
                )}

                {/* ══════ ACADEMICS TAB ══════ */}
                {tab === 'academics' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📊 Exam Results</Text>
                        <View style={styles.gridHeader}>
                            <Text style={[styles.gridHeaderText, { flex: 2 }]}>Subject</Text>
                            <Text style={[styles.gridHeaderText, { flex: 1 }]}>Exam</Text>
                            <Text style={[styles.gridHeaderText, { flex: 0.6 }]}>Score</Text>
                            <Text style={[styles.gridHeaderText, { flex: 0.5 }]}>Grade</Text>
                        </View>
                        {results.length === 0 ? (
                            <Empty emoji="📊" text="No exam results yet" />
                        ) : (
                            results.map((r: any, idx: number) => {
                                const score = Number(r.score || 0);
                                const grade = getGrade(score);
                                const gc = score >= 50 ? C.accent : C.danger;
                                return (
                                    <View key={r.id} style={[styles.gridRow, idx % 2 === 0 ? styles.gridRowEven : styles.gridRowOdd]}>
                                        <Text style={[styles.gridCell, styles.gridCellBold, { flex: 2 }]}>
                                            {r.school_subjects?.subject_name || '-'}
                                        </Text>
                                        <Text style={[styles.gridCell, { flex: 1, color: C.textSub }]}>{r.exam_type || '-'}</Text>
                                        <Text style={[styles.gridCell, styles.gridCellBold, { flex: 0.6, color: gc }]}>{score}%</Text>
                                        <View style={{ flex: 0.5 }}>
                                            <View style={[styles.gradeBadge, { backgroundColor: gc + '18' }]}>
                                                <Text style={[styles.gradeText, { color: gc }]}>{grade}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                {/* ══════ DISCIPLINE TAB ══════ */}
                {tab === 'discipline' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📋 Discipline Records</Text>
                        {discipline.length === 0 ? (
                            <Empty emoji="🌟" text="No discipline records — Great behavior!" />
                        ) : (
                            discipline.map((d, idx) => (
                                <View key={d.id} style={styles.disciplineCard}>
                                    <View style={styles.disciplineHeader}>
                                        <View style={[styles.severityBadge, {
                                            backgroundColor: d.severity === 'Major' ? C.dangerLight : C.warningLight
                                        }]}>
                                            <Text style={styles.severityEmoji}>
                                                {d.severity === 'Major' ? '🚨' : '⚠️'}
                                            </Text>
                                            <Text style={[styles.severityText, {
                                                color: d.severity === 'Major' ? C.danger : C.warning
                                            }]}>
                                                {d.severity || 'Minor'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: d.status === 'Resolved' ? C.accentLight : C.warningLight
                                        }]}>
                                            <Text style={[styles.statusText, {
                                                color: d.status === 'Resolved' ? C.accent : C.warning
                                            }]}>
                                                {d.status || 'Open'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.disciplineDesc}>{d.description || 'No description'}</Text>
                                    <Text style={styles.disciplineMeta}>
                                        📅 {formatDate(d.incident_date || d.created_at)} • Action: {d.action_taken || 'N/A'}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function KPI({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
    return (
        <View style={[styles.kpiCard, { borderLeftColor: color }]}>
            <Text style={styles.kpiEmoji}>{emoji}</Text>
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </View>
    );
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
    return (
        <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>{emoji}</Text>
            <Text style={styles.emptyText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    scroll: { flex: 1 }, content: { padding: 16, paddingBottom: 40 },

    header: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerName: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    headerParent: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
    logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    logoutText: { fontSize: 18 },
    bellBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    bellText: { fontSize: 20 },
    bellBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
    bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' as const },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    kpiEmoji: { fontSize: 18, marginBottom: 6 },
    kpiValue: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
    kpiLabel: { fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 20, overflow: 'hidden', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    ctaDecor: { position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
    ctaEmoji: { fontSize: 28 },
    ctaText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    ctaSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    ctaArrow: { marginLeft: 'auto', fontSize: 22, color: '#fff', fontWeight: '700' },

    progressCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    progressTitle: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 },
    progressBarBg: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
    progressBarFill: { height: '100%', borderRadius: 5, backgroundColor: C.accent },
    progressLabel: { fontSize: 10, color: C.textSub, fontWeight: '600' },

    tabRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border },
    tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    tabBtnText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    tabBtnTextActive: { color: '#fff' },
    tabCount: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabCountText: { fontSize: 9, fontWeight: '900', color: C.textSub },
    tabCountTextActive: { color: '#fff' },

    section: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },

    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
    gridHeaderText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
    gridRowEven: { backgroundColor: '#fff' },
    gridRowOdd: { backgroundColor: '#fafbfc' },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },
    gridCellBold: { fontWeight: '800' },
    gridTotals: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderTopWidth: 2, borderTopColor: C.primary },
    gridTotalLabel: { fontSize: 10, fontWeight: '900', color: C.text, textTransform: 'uppercase' },
    gridTotalValue: { fontSize: 11, fontWeight: '900', color: C.accent },

    methodBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    methodBadgeText: { fontSize: 9, fontWeight: '800', color: C.primary },
    gradeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignItems: 'center' },
    gradeText: { fontSize: 11, fontWeight: '900' },

    disciplineCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    disciplineHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    severityEmoji: { fontSize: 12 },
    severityText: { fontSize: 10, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
    disciplineDesc: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 4 },
    disciplineMeta: { fontSize: 10, color: C.textSub },

    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 12, color: C.textSub },
    quickNavGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    quickNavCard: { width: '30%', backgroundColor: C.card, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 4 },
    quickNavEmoji: { fontSize: 22 },
    quickNavLabel: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
