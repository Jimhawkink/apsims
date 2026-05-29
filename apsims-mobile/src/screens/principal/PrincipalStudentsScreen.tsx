// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — Principal Students Screen
// Full student directory: search, filter by form/stream/gender,
// view individual profiles, track status
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', primaryLight: '#ede9fe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    blue: '#2563eb', blueLight: '#dbeafe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    admission_number: string;
    gender: string;
    status: string;
    form_id: number;
    stream_id: number;
    form_name?: string;
    stream_name?: string;
    date_of_birth?: string;
    guardian_name?: string;
    guardian_phone?: string;
}

export default function PrincipalStudentsScreen() {
    const navigation = useNavigation<NavProp>();
    const [students, setStudents] = useState<Student[]>([]);
    const [filtered, setFiltered] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedForm, setSelectedForm] = useState<number | null>(null);
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('Active');
    const [forms, setForms] = useState<{ id: number; form_name: string }[]>([]);
    const [stats, setStats] = useState({ total: 0, male: 0, female: 0, active: 0 });

    const fetchData = useCallback(async () => {
        try {
            const [studRes, formRes] = await Promise.all([
                supabase
                    .from('school_students')
                    .select(`
                        id, first_name, last_name, admission_number,
                        gender, status, form_id, stream_id, date_of_birth,
                        guardian_name, guardian_phone,
                        school_forms(form_name),
                        school_streams(stream_name)
                    `)
                    .order('admission_number'),
                supabase.from('school_forms').select('id, form_name').order('form_level'),
            ]);

            const raw = (studRes.data || []).map((s: any) => ({
                ...s,
                form_name: s.school_forms?.form_name || '—',
                stream_name: s.school_streams?.stream_name || '—',
            }));

            setStudents(raw);
            setForms(formRes.data || []);

            const active = raw.filter(s => s.status === 'Active');
            setStats({
                total: raw.length,
                male: active.filter(s => s.gender?.toLowerCase() === 'male').length,
                female: active.filter(s => s.gender?.toLowerCase() !== 'male').length,
                active: active.length,
            });
        } catch (e) {
            console.error('Students fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        let f = students;
        if (selectedStatus) f = f.filter(s => s.status === selectedStatus);
        if (selectedForm) f = f.filter(s => s.form_id === selectedForm);
        if (selectedGender) f = f.filter(s => s.gender?.toLowerCase() === selectedGender.toLowerCase());
        if (search.trim()) {
            const q = search.toLowerCase();
            f = f.filter(s =>
                s.first_name?.toLowerCase().includes(q) ||
                s.last_name?.toLowerCase().includes(q) ||
                s.admission_number?.toLowerCase().includes(q)
            );
        }
        setFiltered(f);
    }, [students, search, selectedForm, selectedGender, selectedStatus]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const GenderBadge = ({ gender }: { gender: string }) => {
        const isMale = gender?.toLowerCase() === 'male';
        return (
            <View style={[s.genderBadge, { backgroundColor: isMale ? C.blueLight : '#fce7f3' }]}>
                <Text style={[s.genderText, { color: isMale ? C.blue : '#db2777' }]}>
                    {isMale ? '♂' : '♀'}
                </Text>
            </View>
        );
    };

    const renderStudent = ({ item, index }: { item: Student; index: number }) => (
        <TouchableOpacity
            style={[s.studentCard, index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}
            onPress={() => navigation.navigate('StudentProfile', { studentId: item.id })}
            activeOpacity={0.7}
        >
            <View style={s.studentAvatar}>
                <Text style={s.studentAvatarText}>
                    {(item.first_name?.[0] || '?').toUpperCase()}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={s.studentName}>{item.first_name} {item.last_name}</Text>
                <Text style={s.studentMeta}>
                    📋 {item.admission_number} · {item.form_name} {item.stream_name !== '—' ? `· ${item.stream_name}` : ''}
                </Text>
                {item.guardian_name ? (
                    <Text style={s.studentGuardian} numberOfLines={1}>
                        👤 {item.guardian_name}
                    </Text>
                ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <GenderBadge gender={item.gender} />
                <View style={[s.statusBadge, {
                    backgroundColor: item.status === 'Active' ? C.accentLight : C.dangerLight
                }]}>
                    <Text style={[s.statusText, {
                        color: item.status === 'Active' ? C.accent : C.danger
                    }]}>{item.status}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading students…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#7c3aed', '#4f46e5']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>👨‍🎓 Students</Text>
                            <Text style={s.headerSub}>{filtered.length} of {students.length} students</Text>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={s.statsRow}>
                        {[
                            { label: 'Total', value: stats.total, color: '#fff' },
                            { label: 'Active', value: stats.active, color: '#86efac' },
                            { label: 'Male', value: stats.male, color: '#93c5fd' },
                            { label: 'Female', value: stats.female, color: '#f9a8d4' },
                        ].map(st => (
                            <View key={st.label} style={s.statChip}>
                                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                                <Text style={s.statLabel}>{st.label}</Text>
                            </View>
                        ))}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Search Bar */}
            <View style={s.searchWrap}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                    style={s.searchInput}
                    placeholder="Search by name or admission no…"
                    placeholderTextColor={C.textDim}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Text style={{ fontSize: 16, color: C.textDim }}>✕</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Filters */}
            <View style={s.filterRow}>
                {/* Status filter */}
                {['Active', 'Inactive', 'All'].map(st => (
                    <TouchableOpacity
                        key={st}
                        style={[s.filterChip, selectedStatus === st && s.filterChipActive]}
                        onPress={() => setSelectedStatus(st === 'All' ? '' : st)}
                    >
                        <Text style={[s.filterChipText, selectedStatus === st && s.filterChipTextActive]}>{st}</Text>
                    </TouchableOpacity>
                ))}
                {/* Gender filter */}
                {['Male', 'Female'].map(g => (
                    <TouchableOpacity
                        key={g}
                        style={[s.filterChip, selectedGender === g && { borderColor: '#3b82f6', backgroundColor: '#dbeafe' }]}
                        onPress={() => setSelectedGender(selectedGender === g ? null : g)}
                    >
                        <Text style={[s.filterChipText, selectedGender === g && { color: '#3b82f6' }]}>
                            {g === 'Male' ? '♂' : '♀'} {g}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Form filter */}
            <FlatList
                horizontal
                data={[{ id: null as any, form_name: 'All Forms' }, ...forms]}
                keyExtractor={item => String(item.id)}
                style={s.formFilter}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[s.formChip, selectedForm === item.id && s.formChipActive]}
                        onPress={() => setSelectedForm(item.id)}
                    >
                        <Text style={[s.formChipText, selectedForm === item.id && s.formChipTextActive]}>
                            {item.form_name}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Student List */}
            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                renderItem={renderStudent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                ListEmptyComponent={
                    <View style={s.emptyBox}>
                        <Text style={{ fontSize: 40 }}>👨‍🎓</Text>
                        <Text style={s.emptyText}>No students found</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 30 }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 44, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 8, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        margin: 12, backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
    filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 8, flexWrap: 'wrap' },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
    filterChipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
    filterChipText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    filterChipTextActive: { color: C.primary },
    formFilter: { maxHeight: 38, marginBottom: 4 },
    formChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
    formChipActive: { borderColor: C.primary, backgroundColor: C.primary },
    formChipText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    formChipTextActive: { color: '#fff' },
    studentCard: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
    },
    studentAvatar: {
        width: 42, height: 42, borderRadius: 13,
        backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    studentAvatarText: { fontSize: 17, fontWeight: '900', color: C.primary },
    studentName: { fontSize: 14, fontWeight: '800', color: C.text },
    studentMeta: { fontSize: 11, color: C.textSub, marginTop: 2 },
    studentGuardian: { fontSize: 10, color: C.textDim, marginTop: 2 },
    genderBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    genderText: { fontSize: 12, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 14, color: C.textSub },
});
