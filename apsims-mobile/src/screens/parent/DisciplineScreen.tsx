// ═══════════════════════════════════════════════════════════════════════
// APSIMS Ultra — Parent Discipline Screen
// Super-modern light theme matching the web app aesthetics perfectly
// Reads live from school_discipline_records with offline cache support
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
    Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../lib/supabase';
import { cacheData, getCachedData, formatCacheTimestamp } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';
import ScreenHeader from '../../components/ScreenHeader';

const { width } = Dimensions.get('window');

// ── Color palette (matches web app exactly) ──────────────────────────
const C = {
    bg: '#F8FAFF',
    card: '#ffffff',
    border: '#e2e8f0',
    primary: '#7c3aed',
    primaryLight: '#ede9fe',
    primaryDark: '#6d28d9',
    accent: '#059669',
    accentLight: '#d1fae5',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    critical: '#dc2626',
    criticalLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#eff6ff',
    text: '#0f172a',
    textSub: '#64748b',
    textDim: '#94a3b8',
    shadow: '#7c3aed14',
};

// ── Severity config (matches web app badges) ─────────────────────────
const SEVERITY: Record<string, { bg: string; text: string; icon: string }> = {
    Minor:    { bg: '#eff6ff', text: '#1d4ed8', icon: '🔵' },
    Moderate: { bg: '#fef3c7', text: '#92400e', icon: '🟡' },
    Major:    { bg: '#fee2e2', text: '#b91c1c', icon: '🔴' },
    Critical: { bg: '#fecdd3', text: '#9f1239', icon: '🚨' },
};

const STATUS: Record<string, { bg: string; text: string }> = {
    Open:         { bg: '#fef3c7', text: '#92400e' },
    Resolved:     { bg: '#d1fae5', text: '#065f46' },
    'Under Review': { bg: '#eff6ff', text: '#1e40af' },
    Escalated:    { bg: '#fee2e2', text: '#991b1b' },
};

export interface DisciplineRecord {
    id: number;
    student_id: number;
    incident_date: string;
    category: string;
    severity: string;
    description: string;
    action_taken: string;
    action_details: string | null;
    reported_by: string;
    parent_notified: boolean;
    counseling_referred: boolean;
    status: string;
    term: string;
    year: number;
    created_at: string;
}

function formatDate(d: string) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Stat Badge Component ─────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon }: { label: string; value: number; color: string; bg: string; icon: string }) {
    return (
        <View style={[styles.statCard, { backgroundColor: bg, borderColor: color + '33' }]}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={[styles.statLabel, { color }]}>{label}</Text>
        </View>
    );
}

// ── Discipline Record Card ────────────────────────────────────────────
function RecordCard({ record }: { record: DisciplineRecord }) {
    const [expanded, setExpanded] = useState(false);
    const sev = SEVERITY[record.severity] || SEVERITY.Minor;
    const sta = STATUS[record.status] || STATUS.Open;

    return (
        <TouchableOpacity
            style={styles.recordCard}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.85}
        >
            {/* Top row */}
            <View style={styles.recordHeader}>
                <View style={styles.recordHeaderLeft}>
                    <Text style={styles.recordIcon}>{sev.icon}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.recordCategory} numberOfLines={1}>{record.category}</Text>
                        <Text style={styles.recordDate}>📅 {formatDate(record.incident_date)}</Text>
                    </View>
                </View>
                <View style={styles.recordBadges}>
                    <View style={[styles.badge, { backgroundColor: sev.bg }]}>
                        <Text style={[styles.badgeText, { color: sev.text }]}>{record.severity}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sta.bg, marginTop: 4 }]}>
                        <Text style={[styles.badgeText, { color: sta.text }]}>{record.status}</Text>
                    </View>
                </View>
            </View>

            {/* Description preview */}
            <Text style={styles.recordDesc} numberOfLines={expanded ? undefined : 2}>
                {record.description}
            </Text>

            {/* Expanded details */}
            {expanded && (
                <View style={styles.expandedBlock}>
                    <View style={styles.detailDivider} />
                    {record.action_taken ? (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>⚖️ Action Taken</Text>
                            <Text style={styles.detailValue}>{record.action_taken}</Text>
                        </View>
                    ) : null}
                    {record.action_details ? (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>📝 Details</Text>
                            <Text style={styles.detailValue}>{record.action_details}</Text>
                        </View>
                    ) : null}
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>👤 Reported By</Text>
                        <Text style={styles.detailValue}>{record.reported_by || 'Admin'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>📚 Term</Text>
                        <Text style={styles.detailValue}>{record.term} · {record.year}</Text>
                    </View>
                    <View style={styles.pillRow}>
                        {record.parent_notified && (
                            <View style={[styles.pill, { backgroundColor: C.accentLight }]}>
                                <Text style={[styles.pillText, { color: C.accent }]}>✅ Parent Notified</Text>
                            </View>
                        )}
                        {record.counseling_referred && (
                            <View style={[styles.pill, { backgroundColor: C.infoLight }]}>
                                <Text style={[styles.pillText, { color: C.info }]}>🧠 Counseling Referred</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Expand toggle */}
            <Text style={styles.expandToggle}>{expanded ? '▲ Show less' : '▼ Show more'}</Text>
        </TouchableOpacity>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function DisciplineScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const { isConnected } = useNetworkStatus();

    const studentId = session?.linked_student_id || 0;
    const studentName = session?.student_name || 'Student';
    const cacheKey = `parent_${session?.portal_user_id}_discipline`;

    const [records, setRecords] = useState<DisciplineRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cacheLabel, setCacheLabel] = useState('');
    const [filterSeverity, setFilterSeverity] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (isConnected) {
                const { data, error } = await supabase
                    .from('school_discipline_records')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('incident_date', { ascending: false });
                if (!error) {
                    setRecords(data || []);
                    await cacheData(cacheKey, data || []);
                    setCacheLabel('');
                }
            } else {
                const { data, timestamp } = await getCachedData<DisciplineRecord[]>(cacheKey);
                setRecords(data || []);
                setCacheLabel(formatCacheTimestamp(timestamp));
            }
        } catch {
            const { data, timestamp } = await getCachedData<DisciplineRecord[]>(cacheKey);
            setRecords(data || []);
            setCacheLabel(formatCacheTimestamp(timestamp));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, isConnected, cacheKey]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    // Stats
    const minor = records.filter(r => r.severity === 'Minor').length;
    const moderate = records.filter(r => r.severity === 'Moderate').length;
    const major = records.filter(r => r.severity === 'Major').length;
    const critical = records.filter(r => r.severity === 'Critical').length;
    const resolved = records.filter(r => r.status === 'Resolved').length;
    const open = records.filter(r => r.status === 'Open').length;

    // Filter
    const filtered = records.filter(r => {
        const sevOk = filterSeverity === 'All' || r.severity === filterSeverity;
        const staOk = filterStatus === 'All' || r.status === filterStatus;
        return sevOk && staOk;
    });

    const severityFilters = ['All', 'Minor', 'Moderate', 'Major', 'Critical'];
    const statusFilters = ['All', 'Open', 'Resolved', 'Under Review', 'Escalated'];

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Header gradient */}
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.headerGrad}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>🚨 Discipline Records</Text>
                    <Text style={styles.headerSub}>{studentName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {/* Offline banner */}
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>📵 Offline {cacheLabel ? `· ${cacheLabel}` : ''}</Text>
                </View>
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={C.primary} />
                        <Text style={styles.loadingText}>Loading records…</Text>
                    </View>
                ) : (
                    <>
                        {/* Summary stats */}
                        <View style={styles.sectionLabel}>
                            <Text style={styles.sectionTitle}>📊 Summary</Text>
                            <Text style={styles.sectionSub}>{records.length} total incident{records.length !== 1 ? 's' : ''}</Text>
                        </View>

                        {records.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>✅</Text>
                                <Text style={styles.emptyTitle}>No Disciplinary Records</Text>
                                <Text style={styles.emptySub}>{studentName} has an excellent behaviour record</Text>
                            </View>
                        ) : (
                            <>
                                {/* Stat grid */}
                                <View style={styles.statRow}>
                                    <StatCard label="Minor" value={minor} color="#1d4ed8" bg="#eff6ff" icon="🔵" />
                                    <StatCard label="Moderate" value={moderate} color="#92400e" bg="#fef3c7" icon="🟡" />
                                    <StatCard label="Major" value={major} color="#b91c1c" bg="#fee2e2" icon="🔴" />
                                    <StatCard label="Critical" value={critical} color="#9f1239" bg="#fecdd3" icon="🚨" />
                                </View>
                                <View style={[styles.statRow, { marginTop: 8 }]}>
                                    <StatCard label="Open" value={open} color="#92400e" bg="#fef3c7" icon="⏳" />
                                    <StatCard label="Resolved" value={resolved} color="#065f46" bg="#d1fae5" icon="✅" />
                                    <StatCard label="Total" value={records.length} color={C.primary} bg={C.primaryLight} icon="📋" />
                                    <View style={{ flex: 1 }} />
                                </View>

                                {/* Severity filter */}
                                <View style={styles.sectionLabel}>
                                    <Text style={styles.sectionTitle}>🔍 Filter by Severity</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
                                    {severityFilters.map(f => (
                                        <TouchableOpacity
                                            key={f}
                                            style={[styles.filterChip, filterSeverity === f && styles.filterChipActive]}
                                            onPress={() => setFilterSeverity(f)}
                                        >
                                            <Text style={[styles.filterChipText, filterSeverity === f && styles.filterChipTextActive]}>{f}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Status filter */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: 4 }]} contentContainerStyle={styles.filterRow}>
                                    {statusFilters.map(f => (
                                        <TouchableOpacity
                                            key={f}
                                            style={[styles.filterChip, filterStatus === f && { ...styles.filterChipActive, backgroundColor: C.accent }]}
                                            onPress={() => setFilterStatus(f)}
                                        >
                                            <Text style={[styles.filterChipText, filterStatus === f && styles.filterChipTextActive]}>{f}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Records */}
                                <View style={styles.sectionLabel}>
                                    <Text style={styles.sectionTitle}>📋 Incidents</Text>
                                    <Text style={styles.sectionSub}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</Text>
                                </View>

                                {filtered.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Text style={styles.emptyIcon}>🔍</Text>
                                        <Text style={styles.emptySub}>No records match the selected filter</Text>
                                    </View>
                                ) : (
                                    filtered.map(r => <RecordCard key={r.id ?? r.incident_date + r.category} record={r} />)
                                )}

                                {/* Good behaviour note */}
                                {resolved === records.length && records.length > 0 && (
                                    <View style={[styles.noteCard, { backgroundColor: C.accentLight }]}>
                                        <Text style={styles.noteText}>🎉 All past incidents have been resolved. Keep up the great behaviour!</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.primary },
    scroll: { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: 16, paddingBottom: 40 },

    // Header
    headerGrad: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#ffffff22' },
    backIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
    headerSub: { color: '#ede9fe', fontSize: 13, fontWeight: '500', marginTop: 2 },

    // Offline
    offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
    offlineText: { color: '#92400e', fontSize: 12, fontWeight: '600' },

    // Loading
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { color: C.textDim, marginTop: 12, fontSize: 14, fontWeight: '500' },

    // Section labels
    sectionLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
    sectionSub: { fontSize: 12, color: C.textDim, fontWeight: '500' },

    // Stats
    statRow: { flexDirection: 'row', gap: 8 },
    statCard: {
        flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
        borderRadius: 14, borderWidth: 1,
        shadowColor: C.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statIcon: { fontSize: 18, marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },

    // Filters
    filterScroll: { marginBottom: 0 },
    filterRow: { paddingRight: 16, gap: 8, flexDirection: 'row' },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText: { fontSize: 13, fontWeight: '600', color: C.textSub },
    filterChipTextActive: { color: '#fff' },

    // Record cards
    recordCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    recordHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    recordIcon: { fontSize: 26, marginTop: 2 },
    recordCategory: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
    recordDate: { fontSize: 12, color: C.textDim, marginTop: 3, fontWeight: '500' },
    recordBadges: { alignItems: 'flex-end' },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    recordDesc: { fontSize: 13, color: C.textSub, lineHeight: 20, marginBottom: 4 },

    // Expanded
    expandedBlock: { marginTop: 8 },
    detailDivider: { height: 1, backgroundColor: C.border, marginBottom: 10 },
    detailRow: { marginBottom: 8 },
    detailLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 14, color: C.text, fontWeight: '500', lineHeight: 20 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    pillText: { fontSize: 12, fontWeight: '600' },

    expandToggle: { fontSize: 12, color: C.primary, fontWeight: '700', textAlign: 'center', marginTop: 8 },

    // Empty state
    emptyCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 32, alignItems: 'center',
        borderWidth: 1, borderColor: C.border, marginBottom: 16,
    },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
    emptySub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

    // Note card
    noteCard: { borderRadius: 14, padding: 14, marginTop: 8 },
    noteText: { fontSize: 13, fontWeight: '600', color: '#065f46', lineHeight: 20 },
});
