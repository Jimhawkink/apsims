import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { getStudentTimetable, TimetableEntry } from '../../lib/supabase';

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#0d9488', primaryLight: '#ccfbf1',
    accent: '#059669', purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const PERIOD_COLORS = [
    '#dbeafe', '#d1fae5', '#ede9fe', '#fef3c7', '#fee2e2',
    '#ccfbf1', '#fce7f3', '#e0f2fe',
];

export default function StudentTimetableScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDay, setSelectedDay] = useState(() => {
        const day = new Date().getDay();
        // 0=Sun, 1=Mon...5=Fri, 6=Sat — default to Mon if weekend
        return day >= 1 && day <= 5 ? DAYS[day - 1] : 'Monday';
    });

    const formId = session?.student_form_id || 0;
    const streamId = session?.student_stream_id || 0;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await getStudentTimetable(formId, streamId);
            setEntries(data);
        } catch (err: any) {
            console.error('TimetableScreen error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [formId, streamId]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const dayEntries = entries.filter(e =>
        e.day_of_week?.toLowerCase() === selectedDay.toLowerCase()
    ).sort((a, b) => a.period_id - b.period_id);

    const currentDayName = DAYS[new Date().getDay() - 1] || '';

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading timetable…</Text>
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
                    <Text style={styles.headerTitle}>🗓️ My Timetable</Text>
                    <Text style={styles.headerSub}>{session?.student_form || 'Class Schedule'}</Text>
                </SafeAreaView>
            </LinearGradient>

            {/* Day Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dayTabScroll}
                contentContainerStyle={styles.dayTabContent}
            >
                {DAYS.map((day, i) => {
                    const isToday = day === currentDayName;
                    const isSelected = day === selectedDay;
                    return (
                        <TouchableOpacity
                            key={day}
                            onPress={() => setSelectedDay(day)}
                            style={[
                                styles.dayTab,
                                isSelected && styles.dayTabActive,
                                isToday && !isSelected && styles.dayTabToday,
                            ]}
                            accessibilityLabel={`Select ${day}`}
                        >
                            <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                                {DAY_SHORT[i]}
                            </Text>
                            {isToday && <View style={[styles.todayDot, isSelected && { backgroundColor: '#fff' }]} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {entries.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🗓️</Text>
                        <Text style={styles.emptyText}>No timetable available. Please check with your class teacher.</Text>
                    </View>
                ) : dayEntries.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🎉</Text>
                        <Text style={styles.emptyText}>No classes on {selectedDay}.</Text>
                    </View>
                ) : (
                    dayEntries.map((entry, idx) => {
                        const colorBg = PERIOD_COLORS[idx % PERIOD_COLORS.length];
                        const isBreak = entry.period_type === 'break';
                        return (
                            <View key={entry.id} style={[styles.periodCard, { borderLeftColor: isBreak ? '#94a3b8' : C.primary }]}>
                                <View style={[styles.periodTime, { backgroundColor: isBreak ? '#f1f5f9' : colorBg }]}>
                                    <Text style={styles.periodName}>{entry.period_name}</Text>
                                    <Text style={styles.periodTimeText}>
                                        {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}
                                    </Text>
                                </View>
                                <View style={styles.periodInfo}>
                                    {isBreak ? (
                                        <Text style={styles.breakLabel}>☕ Break</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.subjectName}>
                                                {entry.subject_name || 'Free Period'}
                                            </Text>
                                            {(entry as any).teacher_name && (
                                                <Text style={styles.teacherName}>
                                                    👩‍🏫 {(entry as any).teacher_name}
                                                </Text>
                                            )}
                                            {entry.room && (
                                                <Text style={styles.roomName}>🏫 {entry.room}</Text>
                                            )}
                                        </>
                                    )}
                                </View>
                            </View>
                        );
                    })
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
    dayTabScroll: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    dayTabContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', minWidth: 52 },
    dayTabActive: { backgroundColor: C.primary },
    dayTabToday: { borderWidth: 2, borderColor: C.primary },
    dayTabText: { fontSize: 12, fontWeight: '800', color: C.textSub },
    dayTabTextActive: { color: '#fff' },
    todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary, marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    periodCard: {
        flexDirection: 'row', backgroundColor: C.card, borderRadius: 14,
        marginBottom: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4,
        overflow: 'hidden',
    },
    periodTime: { width: 80, padding: 12, alignItems: 'center', justifyContent: 'center' },
    periodName: { fontSize: 10, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    periodTimeText: { fontSize: 10, color: C.text, fontWeight: '700', marginTop: 2, textAlign: 'center' },
    periodInfo: { flex: 1, padding: 12, justifyContent: 'center' },
    subjectName: { fontSize: 14, fontWeight: '800', color: C.text },
    teacherName: { fontSize: 11, color: C.textSub, marginTop: 3 },
    roomName: { fontSize: 11, color: C.textDim, marginTop: 2 },
    breakLabel: { fontSize: 13, color: C.textSub, fontWeight: '600' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },
});
