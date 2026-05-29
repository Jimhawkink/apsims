// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Remedials / Intervention Tracker (Teacher)
// Students flagged for intervention: status, type, resolution
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, getCurrentTerm, formatDate } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    primary: '#f59e0b', primaryLight: '#fef3c7',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    blue: '#2563eb', blueLight: '#dbeafe',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    open: { bg: C.dangerLight, text: C.danger },
    in_progress: { bg: C.primaryLight, text: C.primary },
    resolved: { bg: C.accentLight, text: C.accent },
    escalated: { bg: C.purpleLight, text: C.purple },
};

const TYPE_LABELS: Record<string, string> = {
    academic_support: '📚 Academic Support',
    remedial_classes: '🏫 Remedial Classes',
    peer_tutoring: '🤝 Peer Tutoring',
    parent_meeting: '👨‍👩‍👧 Parent Meeting',
    counseling: '💬 Counseling',
    special_needs_referral: '🏥 Special Needs',
    other: '📋 Other',
};

interface FlaggedStudent {
    id: number;
    student_name: string;
    admission_number: string;
    form_name: string;
    stream_name: string;
    subject_name: string;
    rubric_level: string;
    flag_reason: string;
    intervention_type: string;
    status: string;
    created_at: string;
    intervention_notes?: string;
}

export default function RemedialsScreen() {
    const navigation = useNavigation<NavProp>();
    const { session } = useSession();
    const [flags, setFlags] = useState<FlaggedStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>('open');
    const [termName, setTermName] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const term = await getCurrentTerm();
            setTermName(term?.term_name || '');

            const query = supabase
                .from('cbc_intervention_flags')
                .select(`
                    id, rubric_level_at_flag, flag_reason, intervention_type,
                    intervention_notes, status, created_at,
                    school_students(
                        first_name, last_name, admission_number,
                        school_forms(form_name),
                        school_streams(stream_name)
                    ),
                    school_subjects(subject_name),
                    school_terms(term_name)
                `)
                .order('created_at', { ascending: false });

            if (term?.id) {
                // Show all terms for broader visibility, not just current
            }

            const { data } = await query;

            const mapped: FlaggedStudent[] = (data || []).map((f: any) => ({
                id: f.id,
                student_name: f.school_students
                    ? `${f.school_students.first_name} ${f.school_students.last_name}`
                    : 'Unknown',
                admission_number: f.school_students?.admission_number || '—',
                form_name: f.school_students?.school_forms?.form_name || '—',
                stream_name: f.school_students?.school_streams?.stream_name || '—',
                subject_name: f.school_subjects?.subject_name || '—',
                rubric_level: f.rubric_level_at_flag || 'BE',
                flag_reason: f.flag_reason || 'Below Expectation',
                intervention_type: f.intervention_type || 'academic_support',
                status: f.status || 'open',
                created_at: f.created_at,
                intervention_notes: f.intervention_notes,
            }));

            setFlags(mapped);
        } catch (e) {
            console.error('Remedials fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const filtered = selectedStatus
        ? flags.filter(f => f.status === selectedStatus)
        : flags;

    const stats = {
        total: flags.length,
        open: flags.filter(f => f.status === 'open').length,
        inProgress: flags.filter(f => f.status === 'in_progress').length,
        resolved: flags.filter(f => f.status === 'resolved').length,
    };

    const renderItem = ({ item, index }: { item: FlaggedStudent; index: number }) => {
        const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.open;
        return (
            <View style={[s.card, { backgroundColor: index % 2 === 0 ? '#fff' : '#fafbfc' }]}>
                <View style={s.cardHeader}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>
                            {(item.student_name[0] || '?').toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.studentName}>{item.student_name}</Text>
                        <Text style={s.studentMeta}>
                            {item.form_name} · {item.admission_number}
                        </Text>
                        <Text style={s.subjectName}>📚 {item.subject_name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[s.levelBadge, { backgroundColor: '#fee2e2' }]}>
                            <Text style={[s.levelText, { color: C.danger }]}>{item.rubric_level}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                            <Text style={[s.statusText, { color: statusColor.text }]}>
                                {item.status.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={s.typeRow}>
                    <Text style={s.typeLabel}>
                        {TYPE_LABELS[item.intervention_type] || '📋 Intervention'}
                    </Text>
                    <Text style={s.dateLabel}>{formatDate(item.created_at)}</Text>
                </View>

                <Text style={s.reason} numberOfLines={2}>{item.flag_reason}</Text>

                {item.intervention_notes && (
                    <View style={s.noteBox}>
                        <Text style={s.noteText}>📝 {item.intervention_notes}</Text>
                    </View>
                )}

                {/* Action button for teacher */}
                <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() => navigation.navigate('CBCProgress', {
                        studentId: 0, // would need proper student ID here
                        studentName: item.student_name,
                        formLevel: 10,
                    })}
                >
                    <Text style={s.viewBtnText}>View Full CBC Progress →</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading remedial cases…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#f59e0b', '#d97706']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>⚡ Remedials & Interventions</Text>
                            <Text style={s.headerSub}>{stats.open} open · {stats.inProgress} in progress</Text>
                        </View>
                    </View>
                    <View style={s.statsRow}>
                        {[
                            { label: 'Total', value: stats.total, color: '#fff' },
                            { label: 'Open', value: stats.open, color: '#fca5a5' },
                            { label: 'Active', value: stats.inProgress, color: '#fcd34d' },
                            { label: 'Resolved', value: stats.resolved, color: '#86efac' },
                        ].map(st => (
                            <View key={st.label} style={s.statChip}>
                                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                                <Text style={s.statLabel}>{st.label}</Text>
                            </View>
                        ))}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Status filters */}
            <View style={s.filterRow}>
                {[null, 'open', 'in_progress', 'resolved', 'escalated'].map(st => (
                    <TouchableOpacity
                        key={String(st)}
                        style={[s.filterChip, selectedStatus === st && s.filterChipActive]}
                        onPress={() => setSelectedStatus(st)}
                    >
                        <Text style={[s.filterChipText, selectedStatus === st && s.filterChipTextActive]}>
                            {st ? st.replace('_', ' ') : 'All'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                ListEmptyComponent={
                    <View style={s.emptyBox}>
                        <Text style={{ fontSize: 40 }}>🌟</Text>
                        <Text style={s.emptyText}>
                            {selectedStatus === 'open' ? 'No open cases — excellent!' : 'No cases found'}
                        </Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 30 }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14 },
    header: { paddingTop: 44, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 8, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
    filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    filterChipTextActive: { color: '#fff' },
    card: {
        padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
        marginHorizontal: 12, marginBottom: 4, borderRadius: 12,
        borderWidth: 1, borderColor: C.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '900', color: C.primary },
    studentName: { fontSize: 14, fontWeight: '800', color: C.text },
    studentMeta: { fontSize: 10, color: C.textSub, marginTop: 1 },
    subjectName: { fontSize: 11, color: C.blue, fontWeight: '700', marginTop: 2 },
    levelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    levelText: { fontSize: 12, fontWeight: '900' },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 8, fontWeight: '900' },
    typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    typeLabel: { fontSize: 11, color: C.primary, fontWeight: '700' },
    dateLabel: { fontSize: 10, color: C.textDim },
    reason: { fontSize: 12, color: C.text, lineHeight: 18, marginBottom: 6 },
    noteBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, marginBottom: 6, borderWidth: 1, borderColor: C.border },
    noteText: { fontSize: 11, color: C.textSub, lineHeight: 16 },
    viewBtn: { backgroundColor: C.primaryLight, borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 4 },
    viewBtnText: { fontSize: 11, color: C.primary, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 14, color: C.textSub },
});
