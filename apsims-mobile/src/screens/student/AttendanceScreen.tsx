import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { getStudentAttendance, AttendanceRecord, formatDate } from '../../lib/supabase';
import { cacheData, getCachedData, formatCacheTimestamp } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#0d9488', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StudentAttendanceScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const { isConnected } = useNetworkStatus();

    const studentId = session?.linked_student_id || 0;
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear] = useState(now.getFullYear());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cacheLabel, setCacheLabel] = useState('');

    const cacheKey = `student_${session?.portal_user_id}_attendance`;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (isConnected) {
                const data = await getStudentAttendance(studentId, selectedMonth, selectedYear);
                setRecords(data);
                await cacheData(cacheKey, data);
                setCacheLabel('');
            } else {
                const { data, timestamp } = await getCachedData<AttendanceRecord[]>(cacheKey);
                setRecords(data || []);
                setCacheLabel(formatCacheTimestamp(timestamp));
            }
        } catch {
            const { data, timestamp } = await getCachedData<AttendanceRecord[]>(cacheKey);
            setRecords(data || []);
            setCacheLabel(formatCacheTimestamp(timestamp));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, selectedMonth, selectedYear, isConnected, cacheKey]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const total = records.length;
    const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
    const showWarning = total > 0 && percentage < 75;

    // Calendar
    const calendarMap = new Map<string, 'Present' | 'Absent' | 'Late'>();
    records.forEach(r => {
        const day = r.attendance_date?.split('T')[0] || r.attendance_date;
        calendarMap.set(day, r.status);
    });
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const calendarCells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading attendance…</Text>
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
                    <Text style={styles.headerTitle}>📅 My Attendance</Text>
                    <Text style={styles.headerSub}>{session?.student_name || 'Student'}</Text>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {cacheLabel ? (
                    <View style={styles.cacheLabel}><Text style={styles.cacheLabelText}>{cacheLabel}</Text></View>
                ) : null}

                {/* Attendance Percentage */}
                <View style={[styles.percentCard, { borderColor: showWarning ? C.danger : C.accent }]}>
                    <Text style={[styles.percentNum, { color: showWarning ? C.danger : C.accent }]}>
                        {percentage}%
                    </Text>
                    <Text style={styles.percentLabel}>Attendance Rate</Text>
                    <Text style={styles.percentSub}>{present} of {total} school days</Text>
                </View>

                {/* Warning */}
                {showWarning && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            ⚠️ Attendance below 75% — please attend school regularly.
                        </Text>
                    </View>
                )}

                {/* Month Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                    {MONTHS.map((m, i) => (
                        <TouchableOpacity
                            key={m}
                            onPress={() => setSelectedMonth(i + 1)}
                            style={[styles.monthPill, selectedMonth === i + 1 && styles.monthPillActive]}
                            accessibilityLabel={`Select ${m}`}
                        >
                            <Text style={[styles.monthPillText, selectedMonth === i + 1 && styles.monthPillTextActive]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Summary */}
                <View style={styles.summaryRow}>
                    {[
                        { emoji: '✅', label: 'Present', count: present, color: C.accent },
                        { emoji: '❌', label: 'Absent', count: absent, color: C.danger },
                        { emoji: '⏰', label: 'Late', count: late, color: C.warning },
                    ].map(s => (
                        <View key={s.label} style={[styles.summaryCard, { borderLeftColor: s.color }]}>
                            <Text style={styles.summaryEmoji}>{s.emoji}</Text>
                            <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
                            <Text style={styles.summaryLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar */}
                <View style={styles.calendarCard}>
                    <Text style={styles.calendarTitle}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
                    <View style={styles.calendarRow}>
                        {DAYS.map(d => <Text key={d} style={styles.calendarDayHeader}>{d}</Text>)}
                    </View>
                    <View style={styles.calendarGrid}>
                        {calendarCells.map((day, idx) => {
                            if (!day) return <View key={idx} style={styles.calendarCell} />;
                            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const status = calendarMap.get(dateStr);
                            const dotColor = status === 'Present' ? C.accent : status === 'Absent' ? C.danger : status === 'Late' ? C.warning : null;
                            return (
                                <View key={idx} style={styles.calendarCell}>
                                    <Text style={styles.calendarDayNum}>{day}</Text>
                                    {dotColor && <View style={[styles.calendarDot, { backgroundColor: dotColor }]} />}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Record List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Records</Text>
                    {records.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text style={styles.emptyText}>No attendance records found.</Text>
                        </View>
                    ) : records.map((r, idx) => (
                        <View key={r.id} style={[styles.recordRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                            <Text style={styles.recordDate}>{formatDate(r.attendance_date)}</Text>
                            <View style={[styles.statusBadge, {
                                backgroundColor: r.status === 'Present' ? C.accentLight : r.status === 'Absent' ? C.dangerLight : C.warningLight
                            }]}>
                                <Text style={[styles.statusText, {
                                    color: r.status === 'Present' ? C.accent : r.status === 'Absent' ? C.danger : C.warning
                                }]}>
                                    {r.status === 'Present' ? '✅' : r.status === 'Absent' ? '❌' : '⏰'} {r.status}
                                </Text>
                            </View>
                            <Text style={styles.recordTerm}>{r.term_name || ''}</Text>
                        </View>
                    ))}
                </View>
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
    cacheLabel: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#f59e0b' },
    cacheLabelText: { fontSize: 11, color: '#92400e', fontWeight: '600', textAlign: 'center' },
    percentCard: { backgroundColor: C.card, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 12, borderWidth: 2 },
    percentNum: { fontSize: 48, fontWeight: '900' },
    percentLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 4 },
    percentSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
    warningBanner: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5' },
    warningText: { fontSize: 12, color: C.danger, fontWeight: '700', textAlign: 'center' },
    monthScroll: { marginBottom: 16 },
    monthPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: C.border },
    monthPillActive: { backgroundColor: C.primary, borderColor: C.primary },
    monthPillText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    monthPillTextActive: { color: '#fff' },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, alignItems: 'center', gap: 2 },
    summaryEmoji: { fontSize: 18 },
    summaryCount: { fontSize: 22, fontWeight: '900' },
    summaryLabel: { fontSize: 9, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    calendarCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    calendarTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 12, textAlign: 'center' },
    calendarRow: { flexDirection: 'row', marginBottom: 4 },
    calendarDayHeader: { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '800', color: C.textDim, textTransform: 'uppercase' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    calendarDayNum: { fontSize: 12, fontWeight: '600', color: C.text },
    calendarDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
    recordDate: { flex: 1.5, fontSize: 11, color: C.text, fontWeight: '600' },
    recordTerm: { flex: 1, fontSize: 10, color: C.textDim, textAlign: 'right' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 12, color: '#64748b', textAlign: 'center' },
});
