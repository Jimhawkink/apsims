// ═══════════════════════════════════════════════════════════════════
// APSIMS Ultra — Parent Leave Out Screen v2.0
// Full leave details: teacher, time, expected return, leave days
// Super-modern orange/teal light theme
// ═══════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { getStudentLeaveOuts, LeaveOutRecord } from '../../lib/supabase';
import { cacheData, getCachedData, formatCacheTimestamp } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';

// ── Colors ────────────────────────────────────────────────────────
const C = {
    bg: '#FFF8F5', card: '#ffffff', border: '#fed7aa',
    orange: '#F97316', orangeLight: '#FFF7ED', orangeDark: '#EA580C',
    teal: '#0d9488', tealLight: '#CCFBF1',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    blue: '#3b82f6', blueLight: '#eff6ff',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; emoji: string; label: string }> = {
    Returned:  { bg: C.accentLight,  color: C.accent,   emoji: '✅', label: 'Returned'  },
    Approved:  { bg: C.blueLight,    color: C.blue,     emoji: '✔️', label: 'Approved'  },
    Pending:   { bg: C.warningLight, color: C.warning,  emoji: '⏳', label: 'Pending'   },
    Out:       { bg: C.dangerLight,  color: C.danger,   emoji: '🚪', label: 'Still Out' },
    Cancelled: { bg: '#f1f5f9',      color: '#64748b',  emoji: '❌', label: 'Cancelled' },
};

// ── Helpers ───────────────────────────────────────────────────────
function fmtDateTime(ts: string | null) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(ts: string | null) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(ts: string | null) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function isOverdue(record: LeaveOutRecord) {
    if (record.status === 'Returned') return false;
    if (!record.expected_return) return false;
    return new Date(record.expected_return) < new Date();
}

// ── Stat Box ──────────────────────────────────────────────────────
function StatBox({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
    return (
        <View style={[styles.statBox, { backgroundColor: bg, borderColor: color + '33' }]}>
            <Text style={[styles.statNum, { color }]}>{value}</Text>
            <Text style={[styles.statLbl, { color }]}>{label}</Text>
        </View>
    );
}

// ── Leave Card ────────────────────────────────────────────────────
function LeaveCard({ item }: { item: LeaveOutRecord }) {
    const [expanded, setExpanded] = useState(false);
    const statusKey = item.status || 'Pending';
    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.Pending;
    const overdue = isOverdue(item);

    return (
        <TouchableOpacity style={[styles.card, overdue && styles.cardOverdue]} onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
            {/* Overdue banner */}
            {overdue && (
                <View style={styles.overdueBanner}>
                    <Text style={styles.overdueText}>⚠️ OVERDUE — Expected return passed</Text>
                </View>
            )}

            {/* Card Header */}
            <View style={styles.cardTop}>
                {/* Date badge */}
                <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeDay}>{new Date(item.time_left).getDate()}</Text>
                    <Text style={styles.dateBadgeMonth}>{new Date(item.time_left).toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
                    <Text style={styles.dateBadgeYear}>{new Date(item.time_left).getFullYear()}</Text>
                </View>

                {/* Main info */}
                <View style={styles.cardMain}>
                    <Text style={styles.cardReason}>{item.reason}</Text>
                    {item.reason_details ? (
                        <Text style={styles.cardDetails} numberOfLines={expanded ? undefined : 2}>
                            {item.reason_details}
                        </Text>
                    ) : null}
                </View>

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
                </View>
            </View>

            {/* Time Strip */}
            <View style={styles.timeStrip}>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>🕐 Time Left</Text>
                    <Text style={styles.timeBlockTime}>{fmtTime(item.time_left)}</Text>
                    <Text style={styles.timeBlockDate}>{fmtDate(item.time_left)}</Text>
                </View>
                <View style={styles.timeArrow}>
                    <View style={styles.timeArrowLine} />
                    <Text style={styles.timeArrowText}>
                        {item.leave_days ? `${item.leave_days}d` : '→'}
                    </Text>
                    <View style={styles.timeArrowLine} />
                </View>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>
                        {item.time_returned ? '✅ Returned' : '📅 Expected'}
                    </Text>
                    <Text style={[
                        styles.timeBlockTime,
                        !item.time_returned && overdue && { color: C.danger }
                    ]}>
                        {item.time_returned ? fmtTime(item.time_returned) : (item.expected_return ? fmtTime(item.expected_return) : '—')}
                    </Text>
                    <Text style={[
                        styles.timeBlockDate,
                        !item.time_returned && overdue && { color: C.danger }
                    ]}>
                        {item.time_returned ? fmtDate(item.time_returned) : (item.expected_return ? fmtDate(item.expected_return) : 'Not specified')}
                    </Text>
                </View>
            </View>

            {/* Teacher row always visible */}
            {item.teacher_name && (
                <View style={styles.teacherRow}>
                    <Text style={styles.teacherLabel}>👨‍🏫 Issued by:</Text>
                    <Text style={styles.teacherName}>{item.teacher_name}</Text>
                    {item.sms_sent && (
                        <View style={styles.smsBadge}>
                            <Text style={styles.smsText}>📱 SMS Sent</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Expanded details */}
            {expanded && (
                <View style={styles.expandedSection}>
                    <View style={styles.expandDivider} />
                    {[
                        ['🗓️ Left At', fmtDateTime(item.time_left)],
                        ['🗓️ Returned At', item.time_returned ? fmtDateTime(item.time_returned) : '—'],
                        ['📅 Expected Return', item.expected_return ? fmtDateTime(item.expected_return) : '—'],
                        ['📆 Leave Days', item.leave_days ? `${item.leave_days} day(s)` : '—'],
                        ['✅ Authorized By', item.authorized_by || '—'],
                        ['👤 Created By', item.created_by || '—'],
                        ['📱 SMS Phone', item.sms_phone || '—'],
                        ['📱 QR Code', item.qr_code || '—'],
                    ].map(([label, value]) => (
                        <View key={String(label)} style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{label}</Text>
                            <Text style={styles.detailValue}>{String(value)}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Text style={styles.expandToggle}>{expanded ? '▲ Less' : '▼ More Details'}</Text>
        </TouchableOpacity>
    );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function LeaveOutScreen() {
    const { session } = useSession();
    const navigation = useNavigation<any>();
    const { isConnected } = useNetworkStatus();

    const studentId = session?.linked_student_id || 0;
    const studentName = session?.student_name || 'Student';
    const cacheKey = `parent_${session?.portal_user_id}_leaveouts`;

    const [records, setRecords] = useState<LeaveOutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cacheLabel, setCacheLabel] = useState('');
    const [filter, setFilter] = useState<'All' | 'Out' | 'Returned' | 'Pending'>('All');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (isConnected) {
                const data = await getStudentLeaveOuts(studentId);
                setRecords(data);
                await cacheData(cacheKey, data);
                setCacheLabel('');
            } else {
                const { data, timestamp } = await getCachedData<LeaveOutRecord[]>(cacheKey);
                setRecords(data || []);
                setCacheLabel(formatCacheTimestamp(timestamp));
            }
        } catch {
            const { data, timestamp } = await getCachedData<LeaveOutRecord[]>(cacheKey);
            setRecords(data || []);
            setCacheLabel(formatCacheTimestamp(timestamp));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, isConnected, cacheKey]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalOut = records.filter(r => r.status === 'Out').length;
    const totalReturned = records.filter(r => r.status === 'Returned').length;
    const totalDays = records.reduce((s, r) => s + (r.leave_days || 0), 0);
    const overdueCount = records.filter(r => isOverdue(r)).length;

    const FILTERS: Array<'All' | 'Out' | 'Returned' | 'Pending'> = ['All', 'Out', 'Returned', 'Pending'];
    const filtered = filter === 'All' ? records : records.filter(r => r.status === filter);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.orangeDark} />

            {/* Header */}
            <LinearGradient colors={['#F97316', '#EA580C']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>🚸 Leave Outs</Text>
                    <Text style={styles.headerSub}>{studentName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {/* Offline */}
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>📵 Offline {cacheLabel ? `· ${cacheLabel}` : ''}</Text>
                </View>
            )}

            {/* Overdue alert */}
            {overdueCount > 0 && (
                <View style={styles.alertBanner}>
                    <Text style={styles.alertText}>⚠️ {overdueCount} overdue leave out{overdueCount > 1 ? 's' : ''} — student not yet returned!</Text>
                </View>
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.orange]} tintColor={C.orange} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={C.orange} />
                        <Text style={styles.loadingText}>Loading leave records…</Text>
                    </View>
                ) : (
                    <>
                        {/* Stats */}
                        <View style={styles.statsGrid}>
                            <StatBox label="Total" value={records.length} color={C.orange} bg={C.orangeLight} />
                            <StatBox label="Still Out" value={totalOut} color={C.danger} bg={C.dangerLight} />
                            <StatBox label="Returned" value={totalReturned} color={C.accent} bg={C.accentLight} />
                            <StatBox label="Days Total" value={totalDays} color={C.teal} bg={C.tealLight} />
                        </View>

                        {/* Filter tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
                            {FILTERS.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterChip, filter === f && styles.filterChipActive]}
                                    onPress={() => setFilter(f)}
                                >
                                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                        {f === 'All' ? `All (${records.length})` : f === 'Out' ? `Out (${totalOut})` : f === 'Returned' ? `Returned (${totalReturned})` : `Pending (${records.filter(r => r.status === 'Pending').length})`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {filtered.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🚸</Text>
                                <Text style={styles.emptyTitle}>No Records Found</Text>
                                <Text style={styles.emptySub}>{filter === 'All' ? `${studentName} has no leave-out records.` : `No ${filter} records found.`}</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.groupTitle}>
                                    {filtered.length} Record{filtered.length !== 1 ? 's' : ''} {filter !== 'All' ? `· ${filter}` : ''}
                                </Text>
                                {filtered.map(item => <LeaveCard key={item.id} item={item} />)}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.orange },
    scroll: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 40 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#ffffff22' },
    backIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', marginTop: 2 },

    // Banners
    offlineBanner: { backgroundColor: '#fef3c7', padding: 8, alignItems: 'center' },
    offlineText: { color: '#92400e', fontSize: 12, fontWeight: '600' },
    alertBanner: { backgroundColor: '#fee2e2', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#fca5a5' },
    alertText: { color: '#991b1b', fontSize: 12, fontWeight: '700', textAlign: 'center' },

    // Loading / empty
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { color: C.textDim, marginTop: 12, fontSize: 14, fontWeight: '500' },
    emptyCard: { backgroundColor: C.card, borderRadius: 16, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 8 },
    emptyIcon: { fontSize: 52, marginBottom: 14 },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptySub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

    // Stats
    statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    statBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    statNum: { fontSize: 20, fontWeight: '900' },
    statLbl: { fontSize: 9, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },

    // Filters
    filterScroll: { marginBottom: 14 },
    filterRow: { gap: 8, paddingRight: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    filterChipActive: { backgroundColor: C.orange, borderColor: C.orange },
    filterText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    filterTextActive: { color: '#fff' },

    // Group label
    groupTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },

    // Leave card
    card: {
        backgroundColor: C.card, borderRadius: 18, marginBottom: 12,
        borderWidth: 1, borderColor: C.border, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    },
    cardOverdue: { borderColor: '#fca5a5', borderWidth: 2 },
    overdueBanner: { backgroundColor: '#fee2e2', paddingVertical: 6, paddingHorizontal: 14 },
    overdueText: { color: '#991b1b', fontSize: 11, fontWeight: '700', textAlign: 'center' },

    cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
    dateBadge: { backgroundColor: C.orangeLight, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', minWidth: 50, borderWidth: 1, borderColor: C.border },
    dateBadgeDay: { fontSize: 20, fontWeight: '900', color: C.orange, lineHeight: 22 },
    dateBadgeMonth: { fontSize: 10, fontWeight: '800', color: C.orange, textTransform: 'uppercase' },
    dateBadgeYear: { fontSize: 9, color: C.orange, fontWeight: '500' },

    cardMain: { flex: 1 },
    cardReason: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 },
    cardDetails: { fontSize: 12, color: C.textSub, lineHeight: 18 },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
    statusText: { fontSize: 10, fontWeight: '800' },

    // Time strip
    timeStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 10, paddingHorizontal: 14 },
    timeBlock: { flex: 1, alignItems: 'center' },
    timeBlockLabel: { fontSize: 10, color: C.textDim, fontWeight: '600', marginBottom: 3 },
    timeBlockTime: { fontSize: 13, fontWeight: '800', color: C.text },
    timeBlockDate: { fontSize: 10, color: C.textSub, fontWeight: '500', marginTop: 1 },
    timeArrow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, gap: 4 },
    timeArrowLine: { flex: 1, height: 1, backgroundColor: C.border, width: 12 },
    timeArrowText: { fontSize: 11, fontWeight: '800', color: C.orange, paddingHorizontal: 4 },

    // Teacher row
    teacherRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6, backgroundColor: '#FFFBF7' },
    teacherLabel: { fontSize: 11, color: C.textDim, fontWeight: '600' },
    teacherName: { fontSize: 12, fontWeight: '800', color: C.text, flex: 1 },
    smsBadge: { backgroundColor: C.blueLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    smsText: { fontSize: 10, color: C.blue, fontWeight: '700' },

    // Expanded
    expandedSection: { paddingHorizontal: 14, paddingBottom: 10 },
    expandDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
    detailRow: { flexDirection: 'row', marginBottom: 7, alignItems: 'flex-start' },
    detailLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, width: 130 },
    detailValue: { fontSize: 12, color: C.text, fontWeight: '500', flex: 1, lineHeight: 17 },
    expandToggle: { textAlign: 'center', paddingVertical: 10, fontSize: 12, color: C.orange, fontWeight: '700', borderTopWidth: 1, borderTopColor: C.border },
});
