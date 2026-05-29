// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Child Timetable (Parent View)
// Parents see their child's weekly class schedule
// Shows today's classes prominently + full weekly grid
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, TimetableEntry } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ChildTimetable'>;

const W = Dimensions.get('window').width;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const C = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', primaryLight: '#ede9fe',
    accent: '#059669', accentLight: '#d1fae5',
    teal: '#0d9488', tealLight: '#ccfbf1',
    blue: '#2563eb', blueLight: '#dbeafe',
    orange: '#f97316', orangeLight: '#ffedd5',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const SUBJECT_COLORS = [
    '#dbeafe', '#ede9fe', '#d1fae5', '#fef3c7', '#ffedd5',
    '#fce7f3', '#ccfbf1', '#e0f2fe', '#f0fdf4', '#fdf4ff',
];
const SUBJECT_TEXT_COLORS = [
    '#1d4ed8', '#6d28d9', '#047857', '#92400e', '#c2410c',
    '#9d174d', '#0f766e', '#0369a1', '#166534', '#7e22ce',
];

export default function ChildTimetableScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { session } = useSession();
    const { studentId, formId, streamId } = route.params;

    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDay, setSelectedDay] = useState(() => {
        const d = new Date().getDay();
        // 0=Sun, 1=Mon ... 5=Fri, 6=Sat → clamp to Mon-Fri
        return Math.max(0, Math.min(4, d - 1));
    });

    const fetchTimetable = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('school_timetable_entries')
                .select(`
                    id, day_of_week, period_id, room, is_double,
                    school_timetable_periods(id, period_name, start_time, end_time, period_type),
                    school_subjects(id, subject_name),
                    school_forms(id, form_name),
                    school_streams(id, stream_name),
                    school_teachers(id, first_name, last_name)
                `)
                .eq('form_id', formId)
                .eq('stream_id', streamId)
                .order('day_of_week')
                .order('period_id');

            const entries: TimetableEntry[] = (data || []).map((e: any) => ({
                id: e.id,
                day_of_week: e.day_of_week,
                period_id: e.period_id,
                period_name: e.school_timetable_periods?.period_name || '',
                start_time: e.school_timetable_periods?.start_time || '',
                end_time: e.school_timetable_periods?.end_time || '',
                period_type: e.school_timetable_periods?.period_type || 'lesson',
                subject_name: e.school_subjects?.subject_name || null,
                form_name: e.school_forms?.form_name || null,
                stream_name: e.school_streams?.stream_name || null,
                room: e.room,
                is_double: e.is_double,
                teacher_name: e.school_teachers
                    ? `${e.school_teachers.first_name} ${e.school_teachers.last_name}`
                    : null,
            }));

            setTimetable(entries);
        } catch (e) {
            console.error('Child timetable error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, [formId, streamId]);

    useEffect(() => { fetchTimetable(); }, [fetchTimetable]);
    const onRefresh = () => { setRefreshing(true); fetchTimetable(); };

    // Subject color map for consistent colors
    const subjectColorMap: Record<string, number> = {};
    let colorIdx = 0;
    timetable.forEach(e => {
        if (e.subject_name && !subjectColorMap[e.subject_name]) {
            subjectColorMap[e.subject_name] = colorIdx++ % SUBJECT_COLORS.length;
        }
    });

    const todayEntries = timetable.filter(e =>
        e.day_of_week?.toLowerCase() === DAYS[selectedDay].toLowerCase()
    );

    // Current time for highlighting active class
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isToday = selectedDay === Math.max(0, Math.min(4, now.getDay() - 1));

    const isCurrentPeriod = (entry: TimetableEntry) => {
        if (!isToday || !entry.start_time || !entry.end_time) return false;
        return entry.start_time <= currentTimeStr && currentTimeStr <= entry.end_time;
    };

    const fmt12h = (t: string) => {
        if (!t) return '';
        const [h, m] = t.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading timetable…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#7c3aed', '#0d9488']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>🗓️ Class Timetable</Text>
                            <Text style={s.headerSub}>
                                {session?.student_name} · {session?.student_form}
                            </Text>
                        </View>
                    </View>

                    {/* Day Selector */}
                    <View style={s.dayRow}>
                        {DAYS.map((day, i) => {
                            const isActive = selectedDay === i;
                            const isCurrentDay = Math.max(0, Math.min(4, now.getDay() - 1)) === i;
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        s.dayBtn,
                                        isActive && s.dayBtnActive,
                                        isCurrentDay && !isActive && s.dayBtnToday,
                                    ]}
                                    onPress={() => setSelectedDay(i)}
                                >
                                    <Text style={[s.dayLabel, isActive && s.dayLabelActive]}>
                                        {DAY_SHORT[i]}
                                    </Text>
                                    {isCurrentDay && (
                                        <View style={[s.todayDot, { backgroundColor: isActive ? '#fff' : C.primary }]} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
            >
                <Text style={s.dayHeading}>{DAYS[selectedDay]}'s Schedule</Text>

                {todayEntries.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Text style={{ fontSize: 44 }}>🌴</Text>
                        <Text style={s.emptyTitle}>No Classes</Text>
                        <Text style={s.emptySub}>No classes scheduled for {DAYS[selectedDay]}</Text>
                    </View>
                ) : (
                    todayEntries.map((entry, idx) => {
                        const isBreak = entry.period_type === 'break' || entry.period_type === 'lunch';
                        const isActive = isCurrentPeriod(entry);
                        const colorI = entry.subject_name ? (subjectColorMap[entry.subject_name] ?? 0) : 0;
                        const bg = isBreak ? '#f8fafc' : SUBJECT_COLORS[colorI];
                        const tc = isBreak ? C.textSub : SUBJECT_TEXT_COLORS[colorI];

                        return (
                            <View
                                key={entry.id}
                                style={[
                                    s.periodCard,
                                    { borderLeftColor: tc, borderLeftWidth: 4 },
                                    isActive && s.periodCardActive,
                                ]}
                            >
                                {isActive && (
                                    <View style={s.liveBanner}>
                                        <View style={s.liveDot} />
                                        <Text style={s.liveText}>NOW IN SESSION</Text>
                                    </View>
                                )}
                                <View style={s.periodRow}>
                                    <View style={[s.periodTime, { backgroundColor: bg }]}>
                                        <Text style={[s.timeStart, { color: tc }]}>{fmt12h(entry.start_time)}</Text>
                                        <Text style={[s.timeSep, { color: tc }]}>–</Text>
                                        <Text style={[s.timeEnd, { color: tc }]}>{fmt12h(entry.end_time)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        {isBreak ? (
                                            <Text style={s.breakLabel}>
                                                {entry.period_type === 'lunch' ? '🍽️ Lunch Break' : '☕ Break'}
                                            </Text>
                                        ) : (
                                            <>
                                                <Text style={[s.subjectLabel, { color: C.text }]}>
                                                    {entry.subject_name || entry.period_name || '—'}
                                                </Text>
                                                {(entry as any).teacher_name && (
                                                    <Text style={s.teacherLabel}>
                                                        👩‍🏫 {(entry as any).teacher_name}
                                                    </Text>
                                                )}
                                                {entry.room && (
                                                    <Text style={s.roomLabel}>🏫 Room: {entry.room}</Text>
                                                )}
                                            </>
                                        )}
                                    </View>
                                    <View style={[s.periodBadge, { backgroundColor: bg }]}>
                                        <Text style={[s.periodBadgeText, { color: tc }]}>
                                            {entry.period_name || `P${entry.period_id}`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Weekly compact overview */}
                <Text style={[s.dayHeading, { marginTop: 24 }]}>📅 Weekly Overview</Text>
                <View style={s.weekGrid}>
                    {DAYS.map((day, i) => {
                        const dayEntries = timetable.filter(e =>
                            e.day_of_week?.toLowerCase() === day.toLowerCase() &&
                            e.period_type !== 'break' && e.period_type !== 'lunch'
                        );
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[s.weekDayCard, selectedDay === i && { borderColor: C.primary, borderWidth: 2 }]}
                                onPress={() => setSelectedDay(i)}
                            >
                                <Text style={[s.weekDayName, selectedDay === i && { color: C.primary }]}>
                                    {DAY_SHORT[i]}
                                </Text>
                                <Text style={s.weekDayCount}>{dayEntries.length}</Text>
                                <Text style={s.weekDayLabel}>lessons</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14 },
    header: { paddingTop: 44, paddingBottom: 14, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    dayRow: { flexDirection: 'row', gap: 6 },
    dayBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
    dayBtnActive: { backgroundColor: '#fff' },
    dayBtnToday: { backgroundColor: 'rgba(255,255,255,0.25)' },
    dayLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
    dayLabelActive: { color: C.primary, fontWeight: '900' },
    todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
    dayHeading: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },
    periodCard: {
        backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3,
        borderWidth: 1, borderColor: C.border,
    },
    periodCardActive: { borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.15 },
    liveBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.accentLight, paddingHorizontal: 12, paddingVertical: 5,
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
    liveText: { fontSize: 9, fontWeight: '900', color: C.accent, letterSpacing: 1 },
    periodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    periodTime: { alignItems: 'center', borderRadius: 10, padding: 8, minWidth: 70 },
    timeStart: { fontSize: 12, fontWeight: '800' },
    timeSep: { fontSize: 10, opacity: 0.6 },
    timeEnd: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
    subjectLabel: { fontSize: 15, fontWeight: '800' },
    teacherLabel: { fontSize: 10, color: C.textSub, marginTop: 3 },
    roomLabel: { fontSize: 10, color: C.textDim, marginTop: 1 },
    breakLabel: { fontSize: 14, color: C.textSub, fontWeight: '600' },
    periodBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, alignItems: 'center' },
    periodBadgeText: { fontSize: 10, fontWeight: '800' },
    weekGrid: { flexDirection: 'row', gap: 6 },
    weekDayCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center',
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 1,
    },
    weekDayName: { fontSize: 11, fontWeight: '900', color: C.textSub },
    weekDayCount: { fontSize: 20, fontWeight: '900', color: C.primary, marginTop: 4 },
    weekDayLabel: { fontSize: 8, color: C.textDim, fontWeight: '600' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub },
});
