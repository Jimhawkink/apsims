import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { TimetableEntry, getTeacherTimetable } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', teal: '#0d9488',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_COLORS: Record<string, string[]> = {
    Monday: ['#2563eb', '#1d4ed8'],
    Tuesday: ['#7c3aed', '#6d28d9'],
    Wednesday: ['#0d9488', '#0f766e'],
    Thursday: ['#ea580c', '#c2410c'],
    Friday: ['#059669', '#047857'],
};

export default function TimetableScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());

    function getCurrentDay(): string {
        const day = new Date().getDay();
        return DAYS[Math.max(0, Math.min(4, day - 1))] || 'Monday';
    }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (session?.linked_teacher_id) {
                const data = await getTeacherTimetable(session.linked_teacher_id);
                setEntries(data);
            }
        } catch (err: any) {
            console.error('TimetableScreen error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [session?.linked_teacher_id]);

    useEffect(() => { loadData(); }, [loadData]);

    const dayEntries = entries.filter(e => e.day_of_week === selectedDay)
        .sort((a, b) => a.period_id - b.period_id);

    const totalLessons = entries.filter(e => e.period_type === 'lesson').length;
    const todayLessons = dayEntries.filter(e => e.period_type === 'lesson').length;

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

            <ScreenHeader
                title="🗓️ My Timetable"
                onBack={() => navigation.goBack()}
                gradient={['#0D9488','#059669']}
            />

            {/* Day Selector */}
            <View style={styles.daySelector}>
                {DAYS.map(day => {
                    const isActive = selectedDay === day;
                    const isToday = day === getCurrentDay();
                    const count = entries.filter(e => e.day_of_week === day && e.period_type === 'lesson').length;
                    return (
                        <TouchableOpacity
                            key={day}
                            onPress={() => setSelectedDay(day)}
                            style={[styles.dayBtn, isActive && styles.dayBtnActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dayBtnText, isActive && styles.dayBtnTextActive]}>
                                {day.slice(0, 3)}
                            </Text>
                            <Text style={[styles.dayCount, isActive && styles.dayCountActive]}>
                                {count}
                            </Text>
                            {isToday && <View style={styles.todayDot} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>📅 {selectedDay}</Text>
                    <Text style={styles.daySubtitle}>{todayLessons} lesson{todayLessons !== 1 ? 's' : ''}</Text>
                </View>

                {dayEntries.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🏖️</Text>
                        <Text style={styles.emptyTitle}>No Lessons</Text>
                        <Text style={styles.emptySub}>You have no scheduled lessons on {selectedDay}</Text>
                    </View>
                ) : (
                    dayEntries.map((entry, idx) => {
                        const isBreak = entry.period_type === 'break' || entry.period_type === 'assembly';
                        const colors: [string, string] = (DAY_COLORS[selectedDay] || ['#2563eb', '#1d4ed8']) as [string, string];

                        if (isBreak) {
                            return (
                                <View key={entry.id || idx} style={styles.breakCard}>
                                    <Text style={styles.breakEmoji}>
                                        {entry.period_type === 'assembly' ? '🏫' : '☕'}
                                    </Text>
                                    <View>
                                        <Text style={styles.breakName}>{entry.period_name}</Text>
                                        <Text style={styles.breakTime}>{formatTime(entry.start_time)} — {formatTime(entry.end_time)}</Text>
                                    </View>
                                </View>
                            );
                        }

                        return (
                            <View key={entry.id || idx} style={styles.lessonCard}>
                                <LinearGradient colors={colors} style={styles.lessonAccent} />
                                <View style={styles.lessonTime}>
                                    <Text style={styles.lessonTimeStart}>{formatTime(entry.start_time)}</Text>
                                    <Text style={styles.lessonTimeEnd}>{formatTime(entry.end_time)}</Text>
                                </View>
                                <View style={styles.lessonInfo}>
                                    <Text style={styles.lessonSubject}>{entry.subject_name || 'Free Period'}</Text>
                                    <Text style={styles.lessonMeta}>
                                        {entry.form_name}{entry.stream_name ? ` ${entry.stream_name}` : ''}
                                        {entry.room ? ` • 📍 ${entry.room}` : ''}
                                    </Text>
                                    <Text style={styles.lessonPeriod}>{entry.period_name}</Text>
                                </View>
                                {entry.is_double && (
                                    <View style={styles.doubleBadge}>
                                        <Text style={styles.doubleBadgeText}>2x</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

function formatTime(time: string): string {
    if (!time) return '';
    try {
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch { return time; }
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },

    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    daySelector: {
        flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border,
    },
    dayBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16,
        backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: C.border,
    },
    dayBtnActive: { backgroundColor: C.teal, borderColor: C.teal },
    dayBtnText: { fontSize: 11, fontWeight: '800', color: C.textSub },
    dayBtnTextActive: { color: '#fff' },
    dayCount: { fontSize: 14, fontWeight: '900', color: C.text, marginTop: 2 },
    dayCountActive: { color: '#fff' },
    todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#f59e0b', marginTop: 3 },

    dayHeader: { marginBottom: 12 },
    dayTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    daySubtitle: { fontSize: 12, color: C.textSub, marginTop: 2 },

    emptyBox: {
        alignItems: 'center', paddingVertical: 40, gap: 8,
        backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: C.border,
    },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub },

    breakCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#fef3c7', borderRadius: 16, padding: 10, marginBottom: 8,
        borderWidth: 1, borderColor: '#fde68a', borderStyle: 'dashed',
    },
    breakEmoji: { fontSize: 20 },
    breakName: { fontSize: 12, fontWeight: '700', color: '#92400e' },
    breakTime: { fontSize: 10, color: '#b45309' },

    lessonCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
        borderWidth: 1, borderColor: C.border, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4, elevation: 1,
    },
    lessonAccent: { width: 5, alignSelf: 'stretch' },
    lessonTime: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', minWidth: 70 },
    lessonTimeStart: { fontSize: 12, fontWeight: '800', color: C.text },
    lessonTimeEnd: { fontSize: 10, color: C.textDim, marginTop: 2 },
    lessonInfo: { flex: 1, paddingVertical: 12, paddingRight: 12 },
    lessonSubject: { fontSize: 14, fontWeight: '800', color: C.text },
    lessonMeta: { fontSize: 11, color: C.textSub, fontWeight: '500', marginTop: 2 },
    lessonPeriod: { fontSize: 10, color: C.textDim, marginTop: 4, fontWeight: '600' },
    doubleBadge: {
        backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, marginRight: 12,
    },
    doubleBadgeText: { fontSize: 10, fontWeight: '900', color: '#92400e' },
});
