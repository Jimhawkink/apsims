// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Principal Discipline Dashboard
// School-wide discipline: incidents, severity, trends, top offenders
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, formatDate } from '../../lib/supabase';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    primary: '#ef4444', primaryLight: '#fee2e2',
    accent: '#f59e0b', accentLight: '#fef3c7',
    blue: '#2563eb', blueLight: '#dbeafe',
    green: '#059669', greenLight: '#d1fae5',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

interface Incident {
    id: number;
    student_name: string;
    admission_number: string;
    form_name: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    action_taken: string;
    incident_date: string;
}

const SEVERITY_COLORS: Record<string, string> = {
    Major: C.primary,
    Minor: C.accent,
    Moderate: '#f97316',
};

export default function PrincipalDisciplineScreen() {
    const navigation = useNavigation<NavProp>();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, major: 0, minor: 0 });

    const fetchData = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('school_discipline_records')
                .select(`
                    id, description, category, severity, status, action_taken, incident_date, created_at,
                    school_students(
                        first_name, last_name, admission_number,
                        school_forms(form_name)
                    )
                `)
                .order('incident_date', { ascending: false })
                .limit(200);

            const mapped: Incident[] = (data || []).map((d: any) => ({
                id: d.id,
                student_name: d.school_students
                    ? `${d.school_students.first_name} ${d.school_students.last_name}`
                    : 'Unknown',
                admission_number: d.school_students?.admission_number || '—',
                form_name: d.school_students?.school_forms?.form_name || '—',
                description: d.description || '',
                category: d.category || 'General',
                severity: d.severity || 'Minor',
                status: d.status || 'Open',
                action_taken: d.action_taken || 'Pending',
                incident_date: d.incident_date || d.created_at,
            }));

            setIncidents(mapped);
            setStats({
                total: mapped.length,
                open: mapped.filter(i => i.status === 'Open').length,
                resolved: mapped.filter(i => i.status === 'Resolved').length,
                major: mapped.filter(i => i.severity === 'Major').length,
                minor: mapped.filter(i => i.severity === 'Minor').length,
            });
        } catch (e) {
            console.error('Discipline fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const filtered = incidents.filter(i => {
        if (selectedSeverity && i.severity !== selectedSeverity) return false;
        if (selectedStatus && i.status !== selectedStatus) return false;
        return true;
    });

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    incidents.forEach(i => {
        categoryMap[i.category] = (categoryMap[i.category] || 0) + 1;
    });
    const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading discipline records…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#ef4444', '#dc2626']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>🚨 Discipline</Text>
                            <Text style={s.headerSub}>{stats.total} records · {stats.open} open cases</Text>
                        </View>
                    </View>
                    <View style={s.statsRow}>
                        {[
                            { label: 'Total', value: stats.total, color: '#fff' },
                            { label: 'Open', value: stats.open, color: '#fca5a5' },
                            { label: 'Resolved', value: stats.resolved, color: '#86efac' },
                            { label: 'Major', value: stats.major, color: '#fcd34d' },
                        ].map(st => (
                            <View key={st.label} style={s.statChip}>
                                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                                <Text style={s.statLabel}>{st.label}</Text>
                            </View>
                        ))}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                contentContainerStyle={{ paddingBottom: 30 }}
            >
                {/* Category Breakdown */}
                {categories.length > 0 && (
                    <View style={s.categorySection}>
                        <Text style={s.sectionTitle}>📊 By Category</Text>
                        <View style={s.categoryGrid}>
                            {categories.map(([cat, count]) => (
                                <View key={cat} style={s.categoryCard}>
                                    <Text style={s.categoryCount}>{count}</Text>
                                    <Text style={s.categoryName} numberOfLines={2}>{cat}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Filters */}
                <View style={s.filterSection}>
                    <Text style={s.filterLabel}>Filter by Severity:</Text>
                    <View style={s.filterRow}>
                        {[null, 'Major', 'Moderate', 'Minor'].map(sev => (
                            <TouchableOpacity
                                key={String(sev)}
                                style={[s.filterChip, selectedSeverity === sev && {
                                    backgroundColor: sev ? SEVERITY_COLORS[sev] + '22' : C.primaryLight,
                                    borderColor: sev ? SEVERITY_COLORS[sev] : C.primary,
                                }]}
                                onPress={() => setSelectedSeverity(sev)}
                            >
                                <Text style={[s.filterChipText, selectedSeverity === sev && {
                                    color: sev ? SEVERITY_COLORS[sev] : C.primary,
                                }]}>{sev || 'All'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={[s.filterRow, { marginTop: 6 }]}>
                        {[null, 'Open', 'In Progress', 'Resolved'].map(st => (
                            <TouchableOpacity
                                key={String(st)}
                                style={[s.filterChip, selectedStatus === st && { borderColor: C.blue, backgroundColor: C.blueLight }]}
                                onPress={() => setSelectedStatus(st)}
                            >
                                <Text style={[s.filterChipText, selectedStatus === st && { color: C.blue }]}>{st || 'All Status'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Incidents List */}
                <View style={s.listSection}>
                    <Text style={s.sectionTitle}>📋 Incidents ({filtered.length})</Text>
                    {filtered.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={{ fontSize: 40 }}>✅</Text>
                            <Text style={s.emptyText}>No incidents found</Text>
                        </View>
                    ) : (
                        filtered.map((item, index) => (
                            <View key={item.id} style={[s.incidentCard, index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <View style={s.incidentHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.incidentStudent}>{item.student_name}</Text>
                                        <Text style={s.incidentMeta}>
                                            📋 {item.admission_number} · {item.form_name}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <View style={[s.severityBadge, { backgroundColor: SEVERITY_COLORS[item.severity] + '20' }]}>
                                            <Text style={[s.severityText, { color: SEVERITY_COLORS[item.severity] || C.textSub }]}>
                                                {item.severity === 'Major' ? '🚨' : '⚠️'} {item.severity}
                                            </Text>
                                        </View>
                                        <View style={[s.statusBadge, {
                                            backgroundColor: item.status === 'Resolved' ? C.greenLight : C.accentLight
                                        }]}>
                                            <Text style={[s.statusText, {
                                                color: item.status === 'Resolved' ? C.green : C.accent
                                            }]}>{item.status}</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={s.incidentDesc} numberOfLines={2}>{item.description}</Text>
                                <View style={s.incidentFooter}>
                                    <Text style={s.incidentCategory}>🏷️ {item.category}</Text>
                                    <Text style={s.incidentDate}>📅 {formatDate(item.incident_date)}</Text>
                                </View>
                                {item.action_taken && item.action_taken !== 'Pending' && (
                                    <Text style={s.actionTaken}>⚡ Action: {item.action_taken}</Text>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14 },
    header: { paddingTop: 44, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 8, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
    categorySection: { padding: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 12,
        alignItems: 'center', minWidth: 90, flex: 1,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 1,
    },
    categoryCount: { fontSize: 22, fontWeight: '900', color: C.primary },
    categoryName: { fontSize: 10, color: C.textSub, fontWeight: '600', textAlign: 'center', marginTop: 4 },
    filterSection: { paddingHorizontal: 16, marginBottom: 8 },
    filterLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, marginBottom: 6 },
    filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
    filterChipText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    listSection: { paddingHorizontal: 16 },
    incidentCard: {
        borderRadius: 12, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, elevation: 1,
    },
    incidentHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    incidentStudent: { fontSize: 14, fontWeight: '800', color: C.text },
    incidentMeta: { fontSize: 11, color: C.textSub, marginTop: 2 },
    severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    severityText: { fontSize: 10, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '800' },
    incidentDesc: { fontSize: 12, color: C.text, lineHeight: 18, marginBottom: 8 },
    incidentFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    incidentCategory: { fontSize: 10, color: C.textSub, fontWeight: '600' },
    incidentDate: { fontSize: 10, color: C.textDim },
    actionTaken: { fontSize: 10, color: C.blue, fontWeight: '700', marginTop: 6 },
    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 14, color: C.textSub },
});
