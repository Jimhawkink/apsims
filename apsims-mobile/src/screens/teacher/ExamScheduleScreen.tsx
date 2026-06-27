// APSIMS Ultra — Teacher Exam Schedule Screen v1.0
// Calendar-style exam schedule with status badges, marks-entry shortcut
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const W = Dimensions.get('window').width;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryLight: '#dbeafe',
    accent: '#059669', accentLight: '#d1fae5',
    amber: '#d97706', amberLight: '#fef3c7',
    danger: '#dc2626', dangerLight: '#fee2e2',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    gray: '#64748b', grayLight: '#f1f5f9',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type FilterType = 'all' | 'upcoming' | 'today' | 'completed';

function statusInfo(status: string, examDate: string) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(examDate); d.setHours(0,0,0,0);
    if (status === 'completed' || d < today) return { label: 'Completed', bg: '#F8FAFF', text: C.gray };
    if (d.getTime() === today.getTime()) return { label: 'Today', bg: '#d1fae5', text: '#065f46' };
    return { label: 'Upcoming', bg: '#dbeafe', text: '#1d4ed8' };
}

function DateCard({ d }: { d: Date }) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dClean = new Date(d); dClean.setHours(0,0,0,0);
    const isToday = dClean.getTime() === today.getTime();
    return (
        <View style={[dateS.wrap, isToday && dateS.todayWrap]}>
            <Text style={[dateS.dayLabel, isToday && dateS.todayText]}>{DAYS_SHORT[d.getDay()]}</Text>
            <Text style={[dateS.dateNum, isToday && dateS.todayText]}>{d.getDate()}</Text>
            <Text style={[dateS.mon, isToday && dateS.todayText]}>{MONTHS[d.getMonth()]}</Text>
        </View>
    );
}

const dateS = StyleSheet.create({
    wrap: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, minWidth: 52 },
    todayWrap: { backgroundColor: C.primary, borderColor: C.primary },
    dayLabel: { fontSize: 9, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    dateNum: { fontSize: 20, fontWeight: '900', color: C.text, lineHeight: 24 },
    mon: { fontSize: 9, fontWeight: '700', color: C.textSub },
    todayText: { color: '#fff' },
});

export default function ExamScheduleScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();

    const [exams, setExams] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selTermId, setSelTermId] = useState<number | null>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [eRes, fRes, stRes, subRes, tRes] = await Promise.all([
                supabase.from('school_exams').select('*').order('exam_date', { ascending: true }),
                supabase.from('school_forms').select('id, form_name, form_level').order('form_level'),
                supabase.from('school_streams').select('id, stream_name, form_id'),
                supabase.from('school_subjects').select('id, subject_name, subject_code').eq('is_active', true),
                supabase.from('school_terms').select('*').order('id', { ascending: false }),
            ]);
            setExams(eRes.data || []);
            setForms(fRes.data || []);
            setStreams(stRes.data || []);
            setSubjects(subRes.data || []);
            const termsData = tRes.data || [];
            setTerms(termsData);
            const cur = termsData.find((t: any) => t.is_current) || termsData[0];
            if (cur && !selTermId) setSelTermId(cur.id);
        } catch (e: any) { console.error('ExamSchedule:', e.message); }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const getForm = (id: number) => forms.find(f => f.id === id);
    const getStream = (id: number) => streams.find(s => s.id === id);
    const getSubject = (id: number) => subjects.find(s => s.id === id);

    const filtered = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        let list = exams;
        if (selTermId) list = list.filter(e => e.term_id === selTermId);
        switch (filter) {
            case 'today': return list.filter(e => { const d = new Date(e.exam_date); d.setHours(0,0,0,0); return d.getTime() === today.getTime(); });
            case 'upcoming': return list.filter(e => { const d = new Date(e.exam_date); d.setHours(0,0,0,0); return d.getTime() >= today.getTime() && e.status !== 'completed'; });
            case 'completed': return list.filter(e => { const d = new Date(e.exam_date); d.setHours(0,0,0,0); return e.status === 'completed' || d < today; });
            default: return list;
        }
    }, [exams, filter, selTermId]);

    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = exams.filter(e => { const d = new Date(e.exam_date); d.setHours(0,0,0,0); return d.getTime() === today.getTime(); }).length;
    const upcomingCount = exams.filter(e => { const d = new Date(e.exam_date); d.setHours(0,0,0,0); return d >= today && e.status !== 'completed'; }).length;
    const completedCount = exams.filter(e => e.status === 'completed').length;

    if (loading) return (
        <View style={s.loader}><ActivityIndicator size="large" color={C.primary} /><Text style={s.loaderText}>Loading schedule…</Text></View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>

            {/* ── PREMIUM BACK NAVIGATION ── */}
            <ScreenHeader
                title="📅 Exam Schedule"
                onBack={() => navigation.goBack()}
                gradient={['#2563EB','#1D4ED8']}
            />
            <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />
            <LinearGradient colors={['#1e1b4b', '#1d4ed8', '#3b82f6']} style={s.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={s.backBtn}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>📅 Exam Schedule</Text>
                    <Text style={s.headerSub}>{session?.username || 'Teacher'} · {terms.find(t => t.id === selTermId)?.term_name || ''}</Text>
                </SafeAreaView>
            </LinearGradient>

            {/* KPI strip */}
            <View style={s.kpiStrip}>
                {[
                    { icon: '📋', val: exams.length, label: 'Total', color: C.primary },
                    { icon: '📅', val: todayCount, label: "Today", color: '#059669' },
                    { icon: '⏳', val: upcomingCount, label: 'Upcoming', color: C.amber },
                    { icon: '✅', val: completedCount, label: 'Done', color: C.gray },
                ].map(k => (
                    <View key={k.label} style={s.kpiPill}>
                        <Text style={s.kpiEmoji}>{k.icon}</Text>
                        <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
                        <Text style={s.kpiLabel}>{k.label}</Text>
                    </View>
                ))}
            </View>

            {/* Term selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.termBar} contentContainerStyle={{ padding: 8, gap: 6, flexDirection: 'row' }}>
                {terms.map(t => (
                    <TouchableOpacity key={t.id} onPress={() => setSelTermId(t.id)}
                        style={[s.tPill, selTermId === t.id && s.tPillActive]}>
                        <Text style={[s.tPillText, selTermId === t.id && s.tPillTextActive]}>{t.term_name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Filter tabs */}
            <View style={s.filterRow}>
                {(['all', 'today', 'upcoming', 'completed'] as FilterType[]).map(f => (
                    <TouchableOpacity key={f} onPress={() => setFilter(f)}
                        style={[s.filterTab, filter === f && s.filterTabActive]}>
                        <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={s.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {filtered.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Text style={s.emptyEmoji}>📅</Text>
                        <Text style={s.emptyTitle}>No Exams</Text>
                        <Text style={s.emptyText}>No exams found for this filter</Text>
                    </View>
                ) : (
                    filtered.map(exam => {
                        const si = statusInfo(exam.status || '', exam.exam_date);
                        const form = getForm(exam.form_id);
                        const stream = getStream(exam.stream_id);
                        const subj = getSubject(exam.subject_id);
                        const examDate = exam.exam_date ? new Date(exam.exam_date) : new Date();
                        const isPast = examDate < today;
                        return (
                            <View key={exam.id} style={s.examCard}>
                                <View style={s.examRow}>
                                    <DateCard d={examDate} />
                                    <View style={s.examInfo}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <Text style={s.examName} numberOfLines={1}>{exam.exam_name || 'Exam'}</Text>
                                            <View style={[s.badge, { backgroundColor: si.bg }]}>
                                                <Text style={[s.badgeText, { color: si.text }]}>{si.label}</Text>
                                            </View>
                                        </View>
                                        {subj && <Text style={s.examSub}>📚 {subj.subject_name}</Text>}
                                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                            {form && <Text style={s.metaTag}>🏫 {form.form_name}</Text>}
                                            {stream && <Text style={s.metaTag}>📋 {stream.stream_name}</Text>}
                                            {exam.duration_minutes && <Text style={s.metaTag}>⏱ {exam.duration_minutes}min</Text>}
                                            {exam.start_time && <Text style={s.metaTag}>🕐 {exam.start_time}</Text>}
                                        </View>
                                    </View>
                                </View>
                                {!isPast && (
                                    <TouchableOpacity style={s.enterMarksBtn}
                                        onPress={() => navigation.navigate('MarksHub' as any)}>
                                        <Text style={s.enterMarksBtnText}>✏️ Enter Marks</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    loader: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loaderText: { color: C.textSub, fontSize: 13, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 18, paddingHorizontal: 20 },
    backBtn: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },
    kpiStrip: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 10 },
    kpiPill: { flex: 1, alignItems: 'center', gap: 2 },
    kpiEmoji: { fontSize: 14 },
    kpiVal: { fontSize: 17, fontWeight: '900' },
    kpiLabel: { fontSize: 8, color: C.textDim, fontWeight: '700', textTransform: 'uppercase' },
    termBar: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 48 },
    tPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    tPillActive: { backgroundColor: C.primary, borderColor: C.primary },
    tPillText: { fontSize: 10, fontWeight: '700', color: C.textSub },
    tPillTextActive: { color: '#fff' },
    filterRow: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    filterTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    filterTabActive: { borderBottomColor: C.primary },
    filterTabText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    filterTabTextActive: { color: C.primary },
    content: { padding: 14, paddingBottom: 40, gap: 10 },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: C.text },
    emptyText: { fontSize: 12, color: C.textSub },
    examCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    examRow: { flexDirection: 'row', gap: 12, padding: 14 },
    examInfo: { flex: 1 },
    examName: { fontSize: 14, fontWeight: '900', color: C.text },
    examSub: { fontSize: 11, color: C.textSub, fontWeight: '600', marginTop: 3 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    metaTag: { fontSize: 10, color: C.textSub, fontWeight: '600', backgroundColor: C.grayLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    enterMarksBtn: { margin: 10, marginTop: 0, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    enterMarksBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
