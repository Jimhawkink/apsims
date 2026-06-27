// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Principal Attendance Overview
// School-wide attendance trends, by-form breakdown, absenteeism alerts
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, formatDate } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const W = Dimensions.get('window').width;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryLight: '#dbeafe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

interface AttendanceSummary {
    form_name: string;
    form_id: number;
    total_students: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
}

export default function PrincipalAttendanceScreen() {
    const navigation = useNavigation<NavProp>();
    const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [overallStats, setOverallStats] = useState({ present: 0, absent: 0, late: 0, rate: 0, total: 0 });
    const [recentAbsentees, setRecentAbsentees] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
            // Get all active students by form
            const { data: formsData } = await supabase
                .from('school_forms')
                .select('id, form_name, form_level')
                .order('form_level');

            const { data: studentsData } = await supabase
                .from('school_students')
                .select('id, form_id');

            // Get attendance for selected date
            const { data: attendanceData } = await supabase
                .from('school_attendance')
                .select('student_id, status, school_students(form_id)')
                .eq('attendance_date', selectedDate);

            const forms = formsData || [];
            const students = studentsData || [];
            const attendance = attendanceData || [];

            // Build per-form summaries
            const summaryList: AttendanceSummary[] = forms.map((form: any) => {
                const formStudents = students.filter((s: any) => s.form_id === form.id);
                const total = formStudents.length;
                const studentIds = new Set(formStudents.map((s: any) => s.id));

                const formAttendance = attendance.filter((a: any) =>
                    studentIds.has(a.student_id)
                );

                const present = formAttendance.filter((a: any) => a.status === 'Present').length;
                const absent = formAttendance.filter((a: any) => a.status === 'Absent').length;
                const late = formAttendance.filter((a: any) => a.status === 'Late').length;
                const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

                return {
                    form_id: form.id,
                    form_name: form.form_name,
                    total_students: total,
                    present,
                    absent,
                    late,
                    rate,
                };
            });

            setSummaries(summaryList);

            // Overall
            const totalPresent = summaryList.reduce((s, f) => s + f.present, 0);
            const totalAbsent = summaryList.reduce((s, f) => s + f.absent, 0);
            const totalLate = summaryList.reduce((s, f) => s + f.late, 0);
            const totalStudents = summaryList.reduce((s, f) => s + f.total_students, 0);
            const overallRate = totalStudents > 0
                ? Math.round(((totalPresent + totalLate) / totalStudents) * 100)
                : 0;

            setOverallStats({ present: totalPresent, absent: totalAbsent, late: totalLate, rate: overallRate, total: totalStudents });

            // Recent absentees
            const { data: absentees } = await supabase
                .from('school_attendance')
                .select(`
                    id, attendance_date, notes,
                    school_students(first_name, last_name, admission_number, school_forms(form_name))
                `)
                .eq('status', 'Absent')
                .order('attendance_date', { ascending: false })
                .limit(5000);

            setRecentAbsentees(absentees || []);
        } catch (e) {
            console.error('Attendance fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, [selectedDate]);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const RateBar = ({ rate, color }: { rate: number; color: string }) => (
        <View style={s.rateBarBg}>
            <View style={[s.rateBarFill, { width: `${rate}%`, backgroundColor: color }]} />
        </View>
    );

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading attendance data…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>

            {/* ── PREMIUM BACK NAVIGATION ── */}
            <ScreenHeader
                title="📋 Attendance"
                onBack={() => navigation.goBack()}
                gradient={['#2563EB','#1D4ED8']}
            />
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#2563eb', '#4f46e5']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>📋 Attendance Overview</Text>
                            <Text style={s.headerSub}>{formatDate(selectedDate)} · {overallStats.rate}% school-wide</Text>
                        </View>
                    </View>

                    {/* Overall Rate Ring */}
                    <View style={s.overallRow}>
                        <View style={s.overallRing}>
                            <Text style={s.overallRingValue}>{overallStats.rate}%</Text>
                            <Text style={s.overallRingLabel}>Present</Text>
                        </View>
                        <View style={s.overallStats}>
                            {[
                                { label: 'Present', value: overallStats.present, color: '#86efac' },
                                { label: 'Absent', value: overallStats.absent, color: '#fca5a5' },
                                { label: 'Late', value: overallStats.late, color: '#fcd34d' },
                                { label: 'Total', value: overallStats.total, color: '#fff' },
                            ].map(st => (
                                <View key={st.label} style={s.overallStat}>
                                    <Text style={[s.overallStatValue, { color: st.color }]}>{st.value}</Text>
                                    <Text style={s.overallStatLabel}>{st.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
            >
                {/* By Form Breakdown */}
                <Text style={s.sectionTitle}>📊 Attendance by Form</Text>
                {summaries.map(form => (
                    <View key={form.form_id} style={s.formCard}>
                        <View style={s.formCardHeader}>
                            <Text style={s.formName}>{form.form_name}</Text>
                            <Text style={s.formTotal}>{form.total_students} students</Text>
                            <View style={[s.rateBadge, {
                                backgroundColor: form.rate >= 90 ? C.accentLight
                                    : form.rate >= 75 ? C.warningLight : C.dangerLight
                            }]}>
                                <Text style={[s.rateText, {
                                    color: form.rate >= 90 ? C.accent
                                        : form.rate >= 75 ? C.warning : C.danger
                                }]}>{form.rate}%</Text>
                            </View>
                        </View>
                        <RateBar
                            rate={form.rate}
                            color={form.rate >= 90 ? C.accent : form.rate >= 75 ? C.warning : C.danger}
                        />
                        <View style={s.formStats}>
                            <Text style={s.formStat}>✅ {form.present} Present</Text>
                            <Text style={[s.formStat, { color: C.danger }]}>❌ {form.absent} Absent</Text>
                            <Text style={[s.formStat, { color: C.warning }]}>⏰ {form.late} Late</Text>
                        </View>
                    </View>
                ))}

                {/* Alert: Low Attendance Forms */}
                {summaries.filter(f => f.rate < 85 && f.total_students > 0).length > 0 && (
                    <View style={s.alertBox}>
                        <Text style={s.alertTitle}>⚠️ Low Attendance Alert</Text>
                        {summaries
                            .filter(f => f.rate < 85 && f.total_students > 0)
                            .map(f => (
                                <Text key={f.form_id} style={s.alertItem}>
                                    {f.form_name}: {f.rate}% ({f.absent} absent)
                                </Text>
                            ))}
                    </View>
                )}

                {/* Recent Absentees */}
                {recentAbsentees.length > 0 && (
                    <View style={{ marginTop: 16 }}>
                        <Text style={s.sectionTitle}>📋 Recent Absentees</Text>
                        {recentAbsentees.map((a: any, i: number) => (
                            <View key={a.id} style={[s.absenteeCard, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <View style={s.absenteeAvatar}>
                                    <Text style={{ fontSize: 14, color: C.danger, fontWeight: '900' }}>
                                        {(a.school_students?.first_name?.[0] || '?').toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.absenteeName}>
                                        {a.school_students?.first_name} {a.school_students?.last_name}
                                    </Text>
                                    <Text style={s.absenteeMeta}>
                                        📋 {a.school_students?.admission_number} · {a.school_students?.school_forms?.form_name}
                                    </Text>
                                </View>
                                <Text style={s.absenteeDate}>{formatDate(a.attendance_date)}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14 },
    header: { paddingTop: 44, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    overallRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    overallRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center', justifyContent: 'center',
    },
    overallRingValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
    overallRingLabel: { fontSize: 8, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
    overallStats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    overallStat: { alignItems: 'center', minWidth: 55 },
    overallStatValue: { fontSize: 18, fontWeight: '900' },
    overallStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10, marginTop: 4 },
    formCard: {
        backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, elevation: 1,
    },
    formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    formName: { flex: 1, fontSize: 14, fontWeight: '800', color: C.text },
    formTotal: { fontSize: 11, color: C.textSub },
    rateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    rateText: { fontSize: 13, fontWeight: '900' },
    rateBarBg: { height: 8, backgroundColor: '#F8FAFF', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    rateBarFill: { height: '100%', borderRadius: 4 },
    formStats: { flexDirection: 'row', gap: 12 },
    formStat: { fontSize: 11, color: C.accent, fontWeight: '700' },
    alertBox: {
        backgroundColor: C.dangerLight, borderRadius: 18, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#fca5a5',
    },
    alertTitle: { fontSize: 13, fontWeight: '800', color: C.danger, marginBottom: 8 },
    alertItem: { fontSize: 12, color: C.danger, fontWeight: '600', marginBottom: 4 },
    absenteeCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 12, borderRadius: 10, marginBottom: 4,
        borderWidth: 1, borderColor: C.border,
    },
    absenteeAvatar: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.dangerLight, alignItems: 'center', justifyContent: 'center',
    },
    absenteeName: { fontSize: 13, fontWeight: '800', color: C.text },
    absenteeMeta: { fontSize: 10, color: C.textSub, marginTop: 2 },
    absenteeDate: { fontSize: 10, color: C.textDim, fontWeight: '600' },
});
