import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { getStudentAttendance, AttendanceRecord, formatDate } from '../../lib/supabase';
import { cacheData, getCachedData, formatCacheTimestamp } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', primaryLight: '#ede9fe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const { isConnected } = useNetworkStatus();

    const studentId = session?.linked_student_id || 0;
    const studentName = session?.student_name || 'Student';

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear] = useState(now.getFullYear());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [cacheLabel, setCacheLabel] = useState('');

    const cacheKey = `parent_${session?.portal_user_id}_attendance`;

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

    // Monthly stats
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;

    // Build calendar map
    const calendarMap = new Map<string, 'Present' | 'Absent' | 'Late'>();
    records.forEach(r => {
        const day = r.attendance_date?.split('T')[0] || r.attendance_date;
        calendarMap.set(day, r.status);
    });

    // Build calendar grid
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const calendarCells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const getDotColor = (day: number | null): string | null => {
        if (!day) return null;
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status = calendarMap.get(dateStr);
        if (status === 'Present') return C.accent;
        if (status === 'Absent') return C.danger;
        if (status === 'Late') return C.warning;
        return null;
    };

    const getSelectedRecord = () => {
        if (!selectedDay) return null;
        return records.find(r => (r.attendance_date?.split('T')[0] || r.attendance_date) === selectedDay);
    };

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
            <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />

            <ScreenHeader
                title="📋 Attendance"
                onBack={() => navigation.goBack()}
                gradient={['#7C3AED','#6D28D9']}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {cacheLabel ? (
                    <View style={styles.cacheLabel}>
                        <Text style={styles.cacheLabelText}>{cacheLabel}</Text>
                    </View>
                ) : null}

                {/* Month Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                    {MONTHS.map((m, i) => (
                        <TouchableOpacity
                            key={m}
                            onPress={() => setSelectedMonth(i + 1)}
                            style={[styles.monthPill, selectedMonth === i + 1 && styles.monthPillActive]}
                            accessibilityLabel={`Select ${m}`}
                        >
                            <Text style={[styles.monthPillText, selectedMonth === i + 1 && styles.monthPillTextActive]}>
                                {m}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Monthly Summary */}
                <View style={styles.summaryRow}>
                    <SummaryCard emoji="✅" label="Present" count={present} color={C.accent} />
                    <SummaryCard emoji="❌" label="Absent" count={absent} color={C.danger} />
                    <SummaryCard emoji="⏰" label="Late" count={late} color={C.warning} />
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarCard}>
                    <Text style={styles.calendarTitle}>
                        {MONTHS[selectedMonth - 1]} {selectedYear}
                    </Text>
                    {/* Day headers */}
                    <View style={styles.calendarRow}>
                        {DAYS.map(d => (
                            <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
                        ))}
                    </View>
                    {/* Calendar cells */}
                    <View style={styles.calendarGrid}>
                        {calendarCells.map((day, idx) => {
                            const dotColor = getDotColor(day);
                            const dateStr = day
                                ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                : null;
                            const isSelected = dateStr === selectedDay;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.calendarCell, isSelected && styles.calendarCellSelected]}
                                    onPress={() => day && dateStr && setSelectedDay(isSelected ? null : dateStr)}
                                    disabled={!day}
                                    accessibilityLabel={day ? `Day ${day}` : undefined}
                                >
                                    {day ? (
                                        <>
                                            <Text style={[styles.calendarDayNum, isSelected && { color: '#fff' }]}>
                                                {day}
                                            </Text>
                                            {dotColor && (
                                                <View style={[styles.calendarDot, { backgroundColor: dotColor }]} />
                                            )}
                                        </>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected day detail */}
                    {selectedDay && (
                        <View style={styles.dayDetail}>
                            {(() => {
                                const rec = getSelectedRecord();
                                if (!rec) return <Text style={styles.dayDetailText}>No record for {selectedDay}</Text>;
                                return (
                                    <>
                                        <Text style={styles.dayDetailText}>
                                            📅 {formatDate(rec.attendance_date)}
                                        </Text>
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: rec.status === 'Present' ? C.accentLight
                                                : rec.status === 'Absent' ? C.dangerLight : C.warningLight
                                        }]}>
                                            <Text style={[styles.statusText, {
                                                color: rec.status === 'Present' ? C.accent
                                                    : rec.status === 'Absent' ? C.danger : C.warning
                                            }]}>
                                                {rec.status === 'Present' ? '✅' : rec.status === 'Absent' ? '❌' : '⏰'} {rec.status}
                                            </Text>
                                        </View>
                                        {rec.notes ? <Text style={styles.dayDetailNotes}>{rec.notes}</Text> : null}
                                    </>
                                );
                            })()}
                        </View>
                    )}
                </View>

                {/* Record List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Attendance Records</Text>
                    {records.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text style={styles.emptyText}>No attendance records found for this student.</Text>
                        </View>
                    ) : (
                        records.map((r, idx) => (
                            <View key={r.id} style={[styles.recordRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <Text style={styles.recordDate}>{formatDate(r.attendance_date)}</Text>
                                <View style={[styles.statusBadge, {
                                    backgroundColor: r.status === 'Present' ? C.accentLight
                                        : r.status === 'Absent' ? C.dangerLight : C.warningLight
                                }]}>
                                    <Text style={[styles.statusText, {
                                        color: r.status === 'Present' ? C.accent
                                            : r.status === 'Absent' ? C.danger : C.warning
                                    }]}>
                                        {r.status === 'Present' ? '✅' : r.status === 'Absent' ? '❌' : '⏰'} {r.status}
                                    </Text>
                                </View>
                                <Text style={styles.recordTerm}>{r.term_name || ''}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function SummaryCard({ emoji, label, count, color }: { emoji: string; label: string; count: number; color: string }) {
    return (
        <View style={[styles.summaryCard, { borderLeftColor: color }]}>
            <Text style={styles.summaryEmoji}>{emoji}</Text>
            <Text style={[styles.summaryCount, { color }]}>{count}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    cacheLabel: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#f59e0b' },
    cacheLabelText: { fontSize: 11, color: '#92400e', fontWeight: '600', textAlign: 'center' },
    monthScroll: { marginBottom: 16 },
    monthPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFF', marginRight: 8, borderWidth: 1, borderColor: C.border },
    monthPillActive: { backgroundColor: C.primary, borderColor: C.primary },
    monthPillText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    monthPillTextActive: { color: '#fff' },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, alignItems: 'center', gap: 2 },
    summaryEmoji: { fontSize: 18 },
    summaryCount: { fontSize: 22, fontWeight: '900' },
    summaryLabel: { fontSize: 9, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    calendarCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    calendarTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 12, textAlign: 'center' },
    calendarRow: { flexDirection: 'row', marginBottom: 4 },
    calendarDayHeader: { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '800', color: C.textDim, textTransform: 'uppercase' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    calendarCellSelected: { backgroundColor: C.primary },
    calendarDayNum: { fontSize: 12, fontWeight: '600', color: C.text },
    calendarDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
    dayDetail: { marginTop: 12, padding: 12, backgroundColor: '#F8FAFF', borderRadius: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    dayDetailText: { fontSize: 12, color: C.text, fontWeight: '600' },
    dayDetailNotes: { fontSize: 11, color: C.textSub, width: '100%', marginTop: 4 },
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
    recordDate: { flex: 1.5, fontSize: 11, color: C.text, fontWeight: '600' },
    recordTerm: { flex: 1, fontSize: 10, color: C.textDim, textAlign: 'right' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 12, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },
});
