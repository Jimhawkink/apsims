// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Principal Staff Screen
// Full teacher directory: TSC, subjects, roles, status
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#0d9488', primaryLight: '#ccfbf1',
    accent: '#7c3aed', accentLight: '#ede9fe',
    blue: '#2563eb', blueLight: '#dbeafe',
    danger: '#ef4444', dangerLight: '#fee2e2',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

interface Teacher {
    id: number;
    first_name: string;
    last_name: string;
    tsc_number: string;
    email: string;
    phone: string;
    is_active: boolean;
    is_class_teacher: boolean;
    class_teacher_form?: string;
    subjects?: string[];
}

const roleColors: Record<string, string> = {
    'Principal': '#7c3aed',
    'Deputy': '#2563eb',
    'HOD': '#0d9488',
    'Teacher': '#059669',
};

export default function PrincipalStaffScreen() {
    const navigation = useNavigation<NavProp>();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [filtered, setFiltered] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            // Fetch teachers with their subject assignments
            const { data: teachersData } = await supabase
                .from('school_teachers')
                .select(`
                    id, first_name, last_name, tsc_number, email, phone, is_active,
                    is_class_teacher,
                    school_subject_teachers(
                        school_subjects(subject_name),
                        school_forms(form_name)
                    )
                `)
                .order('first_name');

            const mapped: Teacher[] = (teachersData || []).map((t: any) => {
                const assignments = t.school_subject_teachers || [];
                const subjectSet = new Set<string>();
                assignments.forEach((a: any) => {
                    const sn = a.school_subjects?.subject_name;
                    const fn = a.school_forms?.form_name;
                    if (sn) subjectSet.add(fn ? `${sn} (${fn})` : sn);
                });
                return {
                    id: t.id,
                    first_name: t.first_name,
                    last_name: t.last_name,
                    tsc_number: t.tsc_number || '—',
                    email: t.email || '',
                    phone: t.phone || '',
                    is_active: t.is_active,
                    is_class_teacher: t.is_class_teacher,
                    subjects: [...subjectSet].slice(0, 4),
                };
            });

            setTeachers(mapped);
        } catch (e) {
            console.error('Staff fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        let f = teachers;
        if (activeOnly) f = f.filter(t => t.is_active);
        if (search.trim()) {
            const q = search.toLowerCase();
            f = f.filter(t =>
                t.first_name?.toLowerCase().includes(q) ||
                t.last_name?.toLowerCase().includes(q) ||
                t.tsc_number?.toLowerCase().includes(q) ||
                t.subjects?.some(s => s.toLowerCase().includes(q))
            );
        }
        setFiltered(f);
    }, [teachers, search, activeOnly]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const renderTeacher = ({ item, index }: { item: Teacher; index: number }) => (
        <View style={[s.card, index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
            <View style={s.cardAvatar}>
                <Text style={s.cardAvatarText}>
                    {(item.first_name?.[0] || '?').toUpperCase()}
                </Text>
            </View>
            <View style={{ flex: 1 }}>

            {/* ── PREMIUM BACK NAVIGATION ── */}
            <ScreenHeader
                title="👩‍🏫 Staff"
                onBack={() => navigation.goBack()}
                gradient={['#0D9488','#059669']}
            />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.cardName}>{item.first_name} {item.last_name}</Text>
                    {item.is_class_teacher && (
                        <View style={s.classBadge}>
                            <Text style={s.classBadgeText}>Class Teacher</Text>
                        </View>
                    )}
                </View>
                <Text style={s.cardTsc}>🪪 TSC: {item.tsc_number}</Text>
                {item.phone ? <Text style={s.cardContact}>📞 {item.phone}</Text> : null}
                {item.subjects && item.subjects.length > 0 && (
                    <View style={s.subjectRow}>
                        {item.subjects.map((sub, i) => (
                            <View key={i} style={s.subjectChip}>
                                <Text style={s.subjectChipText} numberOfLines={1}>{sub}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            <View style={[s.statusDot, { backgroundColor: item.is_active ? '#10b981' : '#ef4444' }]} />
        </View>
    );

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading staff…</Text>
        </View>
    );

    const activeCount = teachers.filter(t => t.is_active).length;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#0d9488', '#059669']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>👩‍🏫 Teaching Staff</Text>
                            <Text style={s.headerSub}>{activeCount} active · {teachers.length} total</Text>
                        </View>
                    </View>
                    <View style={s.statsRow}>
                        {[
                            { label: 'Total Staff', value: teachers.length },
                            { label: 'Active', value: activeCount },
                            { label: 'Class Teachers', value: teachers.filter(t => t.is_class_teacher).length },
                            { label: 'Subjects', value: new Set(teachers.flatMap(t => t.subjects || [])).size },
                        ].map(st => (
                            <View key={st.label} style={s.statChip}>
                                <Text style={s.statValue}>{st.value}</Text>
                                <Text style={s.statLabel}>{st.label}</Text>
                            </View>
                        ))}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Search + Filter */}
            <View style={s.searchWrap}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
                <TextInput
                    style={s.searchInput}
                    placeholder="Search by name, TSC or subject…"
                    placeholderTextColor={C.textDim}
                    value={search}
                    onChangeText={setSearch}
                />
                <TouchableOpacity
                    onPress={() => setActiveOnly(!activeOnly)}
                    style={[s.toggleBtn, activeOnly && s.toggleBtnActive]}
                >
                    <Text style={[s.toggleText, activeOnly && { color: '#fff' }]}>
                        {activeOnly ? '● Active' : '○ All'}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                renderItem={renderTeacher}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                ListEmptyComponent={
                    <View style={s.emptyBox}>
                        <Text style={{ fontSize: 40 }}>👩‍🏫</Text>
                        <Text style={s.emptyText}>No staff found</Text>
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
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 8, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
    statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        margin: 12, backgroundColor: '#fff', borderRadius: 18,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: C.border,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: C.text },
    toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    toggleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    toggleText: { fontSize: 10, fontWeight: '800', color: C.textSub },
    card: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
    },
    cardAvatar: {
        width: 44, height: 44, borderRadius: 18,
        backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    cardAvatarText: { fontSize: 18, fontWeight: '900', color: C.primary },
    cardName: { fontSize: 14, fontWeight: '800', color: C.text },
    cardTsc: { fontSize: 11, color: C.textSub, marginTop: 2 },
    cardContact: { fontSize: 11, color: C.textDim, marginTop: 1 },
    classBadge: { backgroundColor: C.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    classBadgeText: { fontSize: 9, fontWeight: '800', color: C.accent },
    subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    subjectChip: { backgroundColor: '#F8FAFF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    subjectChipText: { fontSize: 9, fontWeight: '700', color: C.textSub, maxWidth: 120 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 14, color: C.textSub },
});
