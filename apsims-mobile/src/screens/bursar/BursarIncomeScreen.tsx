import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, RefreshControl, ActivityIndicator,
    Modal, Alert, FlatList, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const INCOME_SOURCES = ['School Fees','Donations','Government Grants','NEMIS Capitation','Boarding Fees','Transport Fees','Exam Fees','School Farm','Hire of Facilities','Bank Interest','NG-CDF','Bursary','Other'];
const METHODS = ['Cash','M-Pesa','Bank Transfer','Cheque','RTGS','EFT'];

function IncomeCard({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: () => void }) {
    const isFee = item.source?.toLowerCase().includes('fee');
    return (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={[styles.iconBadge, { backgroundColor: isFee ? '#ecfdf5' : '#eef2ff' }]}>
                    <Text style={{ fontSize: 18 }}>{isFee ? '💳' : '💵'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardSource}>{item.source}</Text>
                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
                    <Text style={styles.cardMeta}>{item.income_date} · {item.payment_method || 'Cash'} · {item.reference_number || '—'}</Text>
                </View>
                <Text style={styles.cardAmount}>{fmt(Number(item.amount))}</Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
                    <Text style={styles.actionText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.actionText, { color: '#dc2626' }]}>🗑️ Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function BursarIncomeScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [income, setIncome] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const currentYear = new Date().getFullYear();
    const [form, setForm] = useState({
        income_date: new Date().toISOString().split('T')[0],
        source: '', description: '', amount: '',
        payment_method: 'Cash', reference_number: '',
        received_by: '', notes: '', year: currentYear,
    });

    const fetchData = useCallback(async () => {
        try {
            const { data } = await supabase.from('school_income').select('*').eq('year', currentYear).order('income_date', { ascending: false });
            setIncome(data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(() => {
        let d = income;
        if (filterSource !== 'all') d = d.filter(i => i.source === filterSource);
        if (search) { const q = search.toLowerCase(); d = d.filter(i => (i.source || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)); }
        return d;
    }, [income, filterSource, search]);

    // By-source breakdown
    const bySource = useMemo(() => {
        const map = new Map<string, number>();
        income.forEach(i => map.set(i.source, (map.get(i.source) || 0) + Number(i.amount || 0)));
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
    }, [income]);

    const totalIncome = useMemo(() => income.reduce((s, i) => s + Number(i.amount || 0), 0), [income]);
    const thisMonth = useMemo(() => {
        const prefix = new Date().toISOString().slice(0, 7);
        return income.filter(i => (i.income_date || '').startsWith(prefix)).reduce((s, i) => s + Number(i.amount || 0), 0);
    }, [income]);

    const openAdd = () => {
        setEditId(null);
        setForm({ income_date: new Date().toISOString().split('T')[0], source: '', description: '', amount: '', payment_method: 'Cash', reference_number: '', received_by: '', notes: '', year: currentYear });
        setShowModal(true);
    };
    const openEdit = (item: any) => {
        setEditId(item.id);
        setForm({ income_date: item.income_date || '', source: item.source || '', description: item.description || '', amount: String(item.amount || ''), payment_method: item.payment_method || 'Cash', reference_number: item.reference_number || '', received_by: item.received_by || '', notes: item.notes || '', year: item.year || currentYear });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.source) { Alert.alert('Error', 'Select an income source'); return; }
        if (!form.amount || Number(form.amount) <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
        setSaving(true);
        try {
            const payload = { ...form, amount: Number(form.amount) };
            let error;
            if (editId) { ({ error } = await supabase.from('school_income').update(payload).eq('id', editId)); }
            else { ({ error } = await supabase.from('school_income').insert([payload])); }
            if (error) { Alert.alert('Error', error.message); return; }
            Alert.alert('✅ Success', editId ? 'Income updated' : 'Income recorded');
            setShowModal(false); fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Income', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('school_income').delete().eq('id', id); fetchData(); } },
        ]);
    };

    if (loading) return (
        <LinearGradient colors={['#14532d', '#16a34a']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Loading Income…</Text>
        </LinearGradient>
    );

    const maxSource = bySource.length > 0 ? bySource[0][1] : 1;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />
            <ScreenHeader
                title="💵 Income"
                onBack={() => navigation.goBack()}
                gradient={['#059669','#047857']}
            />

            <ScrollView showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#16a34a" />}>

                {/* Source Breakdown Chart */}
                <Text style={styles.sectionTitle}>📊 Income by Source</Text>
                <View style={styles.chartCard}>
                    {bySource.slice(0, 6).map(([src, amt], i) => (
                        <TouchableOpacity key={src} onPress={() => setFilterSource(filterSource === src ? 'all' : src)}
                            style={[styles.sourceRow, filterSource === src && { backgroundColor: '#f0fdf4' }]}>
                            <View style={[styles.sourceDot, { backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#0891b2', '#8b5cf6'][i % 6] }]} />
                            <Text style={styles.sourceName} numberOfLines={1}>{src}</Text>
                            <View style={{ flex: 1, height: 6, backgroundColor: '#F8FAFF', borderRadius: 99, marginHorizontal: 10 }}>
                                <View style={[styles.sourceBar, {
                                    width: `${Math.round((amt / maxSource) * 100)}%` as any,
                                    backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#0891b2', '#8b5cf6'][i % 6],
                                }]} />
                            </View>
                            <Text style={styles.sourceAmt}>{fmt(amt)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
                    <TextInput value={search} onChangeText={setSearch} placeholder="🔍 Search income records…"
                        style={styles.searchInput} placeholderTextColor="#94a3b8" />
                </View>

                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', paddingHorizontal: 16, marginTop: 10, marginBottom: 6 }}>
                    {filtered.length} records · {fmt(filtered.reduce((s, i) => s + Number(i.amount || 0), 0))}
                </Text>

                <View style={{ paddingHorizontal: 12, gap: 8 }}>
                    {filtered.map(item => (
                        <IncomeCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
                    ))}
                    {filtered.length === 0 && (
                        <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No income records found</Text>
                    )}
                </View>
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <LinearGradient colors={['#14532d', '#16a34a']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editId ? '✏️ Edit Income' : '➕ Record Income'}</Text>
                        </LinearGradient>
                        <ScrollView style={{ padding: 20 }}>
                            <Text style={styles.modalLabel}>Income Source *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {INCOME_SOURCES.map(s => (
                                    <TouchableOpacity key={s} onPress={() => setForm({ ...form, source: s })}
                                        style={[styles.srcChip, form.source === s && { backgroundColor: '#16a34a', borderColor: '#16a34a' }]}>
                                        <Text style={[styles.srcChipText, form.source === s && { color: '#fff' }]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Text style={styles.modalLabel}>Amount (KES) *</Text>
                            <TextInput value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} keyboardType="numeric" placeholder="0"
                                style={styles.amtInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Description</Text>
                            <TextInput value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholder="Details of income"
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Date</Text>
                            <TextInput value={form.income_date} onChangeText={v => setForm({ ...form, income_date: v })}
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Payment Method</Text>
                            <View style={styles.methodGrid}>
                                {METHODS.map(m => (
                                    <TouchableOpacity key={m} onPress={() => setForm({ ...form, payment_method: m })}
                                        style={[styles.methodBtn, form.payment_method === m && { backgroundColor: '#16a34a', borderColor: '#16a34a' }]}>
                                        <Text style={[styles.methodText, form.payment_method === m && { color: '#fff' }]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.modalLabel}>Reference No</Text>
                            <TextInput value={form.reference_number} onChangeText={v => setForm({ ...form, reference_number: v })} placeholder="Cheque/slip/M-Pesa ref"
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Received By</Text>
                            <TextInput value={form.received_by} onChangeText={v => setForm({ ...form, received_by: v })} placeholder="Name of receiver"
                                style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <TouchableOpacity onPress={handleSave} disabled={saving}
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
                                <LinearGradient colors={['#14532d', '#16a34a']} style={styles.saveBtnInner}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editId ? '✅ Update Income' : '✅ Record Income'}</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 14, alignItems: 'center', marginTop: 6 }}>
                                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFF' },
    header: { paddingBottom: 0 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 10 },
    kpiStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden' },
    kpiItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    kpiVal: { fontSize: 13, fontWeight: '900' },
    kpiLbl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 1 },
    addBtn: { backgroundColor: 'rgba(255,255,255,0.15)', margin: 16, marginTop: 8, borderRadius: 16, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 14, marginBottom: 8, paddingHorizontal: 16 },
    chartCard: { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', gap: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    sourceRow: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8 },
    sourceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    sourceName: { fontSize: 11, fontWeight: '700', color: '#374151', width: 90 },
    sourceBar: { height: '100%', borderRadius: 99 },
    sourceAmt: { fontSize: 11, fontWeight: '800', color: '#374151', width: 80, textAlign: 'right' },
    searchInput: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
    card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    cardTop: { flexDirection: 'row', padding: 14, gap: 10, alignItems: 'flex-start' },
    iconBadge: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    cardSource: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    cardDesc: { fontSize: 11, color: '#64748b', marginTop: 1 },
    cardMeta: { fontSize: 9, color: '#94a3b8', marginTop: 2 },
    cardAmount: { fontSize: 15, fontWeight: '900', color: '#16a34a' },
    cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#e2e8f0' },
    actionText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
    modalHeader: { padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
    modalLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
    srcChip: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#F8FAFF' },
    srcChipText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    amtInput: { fontSize: 28, fontWeight: '900', color: '#16a34a', textAlign: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 18, padding: 12, backgroundColor: '#f0fdf4' },
    textInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, backgroundColor: '#fafbff', color: '#1e293b' },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    methodBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#F8FAFF' },
    methodText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    saveBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
    saveBtnInner: { padding: 16, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
