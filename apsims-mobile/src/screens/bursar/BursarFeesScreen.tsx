import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, RefreshControl, ActivityIndicator, Dimensions,
    Modal, Alert, FlatList, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

const { width: W } = Dimensions.get('window');
const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// Curriculum type detection
const isCBC = (formLevel: number) => formLevel >= 7; // Grades 7-12 are CBC Senior/Junior
const getCurriculumLabel = (formLevel: number) => {
    if (formLevel <= 6) return '8-4-4';
    if (formLevel <= 9) return 'CBC JSS'; // Junior Secondary School Grades 7-9
    return 'CBC SSS'; // Senior Secondary School Grades 10-12
};
const getFormLabel = (formName: string, formLevel: number) => {
    if (formLevel <= 6) return formName; // Form 1-4 (844)
    if (formLevel <= 9) return `Grade ${formLevel - 0} (JSS)`; // Grades 7-9
    return `Grade ${formLevel - 0} (SSS)`; // Grades 10-12
};

// ─── Circular progress ring ────────────────────────────────────────
function Ring({ pct: p, size = 44, color }: { pct: number; size?: number; color: string }) {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (p / 100) * circ;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ position: 'absolute', fontSize: size * 0.22, fontWeight: '900', color }}>{p}%</Text>
        </View>
    );
}

// ─── Form/Grade Summary Card ───────────────────────────────────────
function FormCard({ form, onPress, selected }: { form: any; onPress: () => void; selected: boolean }) {
    const colRate = pct(form.paid, form.expected);
    const isCbc = isCBC(form.form_level);
    const label = getCurriculumLabel(form.form_level);
    const colors = isCbc ? ['#0c4a6e', '#0891b2'] : ['#1e1b4b', '#6366f1'];
    const badgeColor = isCbc ? '#06b6d4' : '#6366f1';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.82}
            style={[styles.formCard, selected && { borderColor: badgeColor, borderWidth: 2 }]}>
            <LinearGradient colors={colors as any} style={styles.formCardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.formCardName}>{getFormLabel(form.form_name, form.form_level)}</Text>
                        <View style={[styles.curricBadge, { backgroundColor: badgeColor }]}>
                            <Text style={styles.curricBadgeText}>{label}</Text>
                        </View>
                    </View>
                    <Text style={styles.formCardCount}>{form.students} students · {form.streams} streams</Text>
                </View>
                <View style={styles.formRingWrap}>
                    <Text style={styles.formRingPct}>{colRate}%</Text>
                    <Text style={styles.formRingLbl}>collected</Text>
                </View>
            </LinearGradient>
            <View style={styles.formCardBody}>
                {[
                    { l: 'Expected', v: fmt(form.expected), c: '#374151' },
                    { l: 'Collected', v: fmt(form.paid), c: '#10b981' },
                    { l: 'Balance', v: fmt(form.balance), c: form.balance > 0 ? '#ef4444' : '#10b981' },
                    { l: 'Defaulters', v: String(form.defaulters), c: '#f59e0b' },
                ].map((s, i) => (
                    <View key={i} style={styles.formStat}>
                        <Text style={styles.formStatLbl}>{s.l}</Text>
                        <Text style={[styles.formStatVal, { color: s.c }]}>{s.v}</Text>
                    </View>
                ))}
            </View>
            {/* Collection bar */}
            <View style={styles.formBarBg}>
                <View style={[styles.formBarFill, {
                    width: `${colRate}%` as any,
                    backgroundColor: colRate >= 90 ? '#10b981' : colRate >= 60 ? '#f59e0b' : '#ef4444',
                }]} />
            </View>
        </TouchableOpacity>
    );
}

// ─── Stream Row in Datagrid ────────────────────────────────────────
function StreamRow({ stream, idx }: { stream: any; idx: number }) {
    const colRate = pct(stream.paid, stream.expected);
    return (
        <View style={[styles.streamRow, { backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }]}>
            <View style={{ flex: 2 }}>
                <Text style={styles.streamName}>{stream.stream_name}</Text>
                <Text style={styles.streamStudents}>{stream.students} students</Text>
            </View>
            <Text style={[styles.streamCell, { color: '#374151' }]}>{fmt(stream.expected)}</Text>
            <Text style={[styles.streamCell, { color: '#10b981', fontWeight: '800' }]}>{fmt(stream.paid)}</Text>
            <Text style={[styles.streamCell, { color: stream.balance > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }]}>{fmt(stream.balance)}</Text>
            <View style={{ width: 44, alignItems: 'center' }}>
                <View style={[styles.streamRateBadge, {
                    backgroundColor: colRate >= 90 ? '#f0fdf4' : colRate >= 60 ? '#fffbeb' : '#fef2f2',
                }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colRate >= 90 ? '#16a34a' : colRate >= 60 ? '#d97706' : '#dc2626' }}>{colRate}%</Text>
                </View>
            </View>
        </View>
    );
}

// ─── Student Row ───────────────────────────────────────────────────
function StudentRow({ student, onCollect }: { student: any; onCollect: () => void }) {
    const status = student.balance <= 0 ? 'cleared' : student.balance < student.expected * 0.5 ? 'partial' : 'owing';
    const statusColors: Record<string, { bg: string; text: string; label: string }> = {
        cleared: { bg: '#f0fdf4', text: '#16a34a', label: '✅ Cleared' },
        partial: { bg: '#fffbeb', text: '#d97706', label: '⚠️ Partial' },
        owing: { bg: '#fef2f2', text: '#dc2626', label: '🔴 Owing' },
    };
    const s = statusColors[status];
    return (
        <View style={styles.studentRow}>
            <View style={styles.studentAvatar}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>
                    {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                <Text style={styles.studentAdm}>{student.admission_no || student.admission_number || '—'} · {student.stream_name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: s.text }}>{s.label}</Text>
                </View>
                <Text style={[styles.studentBalance, { color: status === 'cleared' ? '#10b981' : '#ef4444' }]}>
                    {status === 'cleared' ? '✓ Clear' : `Bal: ${fmt(student.balance)}`}
                </Text>
            </View>
            {status !== 'cleared' && (
                <TouchableOpacity onPress={onCollect} style={styles.collectBtn}>
                    <Text style={styles.collectBtnText}>Collect</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function BursarFeesScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'datagrid' | 'students'>('overview');
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [selectedForm, setSelectedForm] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'cleared' | 'partial' | 'owing'>('all');
    const [filterCurriculum, setFilterCurriculum] = useState<'all' | '844' | 'cbc'>('all');
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [collectStudent, setCollectStudent] = useState<any>(null);
    const [collectAmount, setCollectAmount] = useState('');
    const [collectMethod, setCollectMethod] = useState('Cash');
    const [collectRef, setCollectRef] = useState('');
    const [saving, setSaving] = useState(false);
    const currentYear = new Date().getFullYear();

    const fetchData = useCallback(async () => {
        try {
            const [
                { data: formData },
                { data: streamData },
                { data: payData },
                { data: structData },
                { data: studentData },
            ] = await Promise.all([
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_streams').select('*').order('stream_name'),
                supabase.from('school_fee_payments').select('student_id,amount,year').eq('year', currentYear),
                supabase.from('school_fee_structures').select('form_id,amount').eq('year', currentYear),
                supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id,status,gender').order('first_name', { ascending: true }).limit(5000),
            ]);

            const pays = payData || [];
            const structs = structData || [];
            const studs = studentData || [];
            const fms = formData || [];
            const stms = streamData || [];

            // Per-student fees map
            const paidByStudent = new Map<number, number>();
            pays.forEach(p => paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) || 0) + Number(p.amount || 0)));

            // Per-form expected fee (sum of all vote heads for that form)
            const feeByForm = new Map<number, number>();
            fms.forEach(f => {
                const total = structs.filter(s => !s.form_id || s.form_id === f.id).reduce((a, b) => a + Number(b.amount || 0), 0);
                feeByForm.set(f.id, total);
            });

            // Enrich forms with financial stats
            const enrichedForms = fms.map(f => {
                const formStuds = studs.filter(s => s.form_id === f.id);
                const expectedPerStudent = feeByForm.get(f.id) || 0;
                const totalExpected = expectedPerStudent * formStuds.length;
                const totalPaid = formStuds.reduce((s, st) => s + (paidByStudent.get(st.id) || 0), 0);
                const totalBalance = Math.max(0, totalExpected - totalPaid);
                const defaulters = formStuds.filter(s => (paidByStudent.get(s.id) || 0) < expectedPerStudent * 0.5).length;
                const formStreams = [...new Set(formStuds.map(s => s.stream_id).filter(Boolean))].length;
                return {
                    ...f,
                    students: formStuds.length,
                    streams: formStreams,
                    expected: totalExpected,
                    paid: totalPaid,
                    balance: totalBalance,
                    defaulters,
                    expectedPerStudent,
                };
            });

            // Enrich streams with financial stats
            const enrichedStreams = stms.map(sm => {
                const smStuds = studs.filter(s => s.stream_id === sm.id);
                const formId = smStuds[0]?.form_id;
                const expectedPerStudent = formId ? (feeByForm.get(formId) || 0) : 0;
                const totalExpected = expectedPerStudent * smStuds.length;
                const totalPaid = smStuds.reduce((s, st) => s + (paidByStudent.get(st.id) || 0), 0);
                return {
                    ...sm,
                    students: smStuds.length,
                    expected: totalExpected,
                    paid: totalPaid,
                    balance: Math.max(0, totalExpected - totalPaid),
                    form_id: formId,
                };
            });

            // Enrich students
            const enrichedStudents = studs.map(s => {
                const expectedPerStudent = feeByForm.get(s.form_id) || 0;
                const paid = paidByStudent.get(s.id) || 0;
                const stream = stms.find(sm => sm.id === s.stream_id);
                return {
                    ...s,
                    paid,
                    expected: expectedPerStudent,
                    balance: Math.max(0, expectedPerStudent - paid),
                    stream_name: stream?.stream_name || '—',
                };
            });

            setForms(enrichedForms);
            setStreams(enrichedStreams);
            setStudents(enrichedStudents);
            if (!selectedForm && enrichedForms.length > 0) setSelectedForm(enrichedForms[0]);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Filter forms by curriculum
    const visibleForms = useMemo(() => forms.filter(f => {
        if (filterCurriculum === '844') return !isCBC(f.form_level);
        if (filterCurriculum === 'cbc') return isCBC(f.form_level);
        return true;
    }), [forms, filterCurriculum]);

    // Filter students
    const visibleStudents = useMemo(() => {
        let s = students;
        if (selectedForm) s = s.filter(st => st.form_id === selectedForm.id);
        if (filterStatus !== 'all') {
            if (filterStatus === 'cleared') s = s.filter(st => st.balance <= 0);
            if (filterStatus === 'partial') s = s.filter(st => st.balance > 0 && st.balance < st.expected * 0.5);
            if (filterStatus === 'owing') s = s.filter(st => st.balance >= st.expected * 0.5);
        }
        if (search) {
            const q = search.toLowerCase();
            s = s.filter(st => `${st.first_name} ${st.last_name}`.toLowerCase().includes(q) || (st.admission_no || '').toLowerCase().includes(q));
        }
        return s;
    }, [students, selectedForm, filterStatus, search]);

    const selectedFormStreams = useMemo(() => streams.filter(sm => sm.form_id === selectedForm?.id), [streams, selectedForm]);

    // Grand totals
    const totals = useMemo(() => ({
        expected: visibleForms.reduce((s, f) => s + f.expected, 0),
        paid: visibleForms.reduce((s, f) => s + f.paid, 0),
        balance: visibleForms.reduce((s, f) => s + f.balance, 0),
    }), [visibleForms]);

    const handleCollect = async () => {
        if (!collectStudent || !collectAmount || Number(collectAmount) <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
        setSaving(true);
        try {
            const receipt = `RCT${Date.now().toString().slice(-6)}`;
            const { error } = await supabase.from('school_fee_payments').insert([{
                student_id: collectStudent.id,
                amount: Number(collectAmount),
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: collectMethod,
                reference_number: collectRef || receipt,
                receipt_number: receipt,
                year: currentYear,
            }]);
            if (error) { Alert.alert('Error', error.message); return; }
            Alert.alert('✅ Success', `Receipt ${receipt} generated for ${fmt(Number(collectAmount))}`);
            setShowCollectModal(false); setCollectAmount(''); setCollectRef('');
            fetchData();
        } finally { setSaving(false); }
    };

    if (loading) return (
        <LinearGradient colors={['#0c4a6e', '#0891b2']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Loading Fee Data…</Text>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0c4a6e" translucent={false} />
            {/* ── HEADER ── */}
            <LinearGradient colors={['#0c4a6e', '#0891b2', '#0e7490']} style={styles.header}>
                <View style={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 12 }}>
                    <Text style={styles.headerTitle}>💳 Fee Management</Text>
                    <Text style={styles.headerSub}>CBC & 8-4-4 — Full Balance Overview</Text>
                    {/* Grand totals strip */}
                    <View style={styles.totalStrip}>
                        {[
                            { l: 'Expected', v: fmt(totals.expected), c: '#fff' },
                            { l: 'Collected', v: fmt(totals.paid), c: '#34d399' },
                            { l: 'Balance', v: fmt(totals.balance), c: '#fca5a5' },
                        ].map((s, i) => (
                            <View key={i} style={[styles.totalItem, i < 2 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text style={[styles.totalVal, { color: s.c }]}>{s.v}</Text>
                                <Text style={styles.totalLbl}>{s.l}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Curriculum filter */}
                <View style={styles.curricFilter}>
                    {[
                        { key: 'all', label: '🌐 All' },
                        { key: '844', label: '📚 8-4-4' },
                        { key: 'cbc', label: '🎓 CBC' },
                    ].map(f => (
                        <TouchableOpacity key={f.key} onPress={() => setFilterCurriculum(f.key as any)}
                            style={[styles.curricBtn, filterCurriculum === f.key && styles.curricBtnActive]}>
                            <Text style={[styles.curricBtnText, filterCurriculum === f.key && { color: '#0891b2' }]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab bar */}
                <View style={styles.tabBar}>
                    {[
                        { key: 'overview', label: '📋 Overview' },
                        { key: 'datagrid', label: '📊 Datagrid' },
                        { key: 'students', label: '👥 Students' },
                    ].map(t => (
                        <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key as any)}
                            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}>
                            <Text style={[styles.tabBtnText, activeTab === t.key && { color: '#0891b2' }]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </LinearGradient>

            {/* ══════════════ OVERVIEW TAB ══════════════ */}
            {activeTab === 'overview' && (
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#0891b2" />}>

                    {/* 8-4-4 Section */}
                    {visibleForms.filter(f => !isCBC(f.form_level)).length > 0 && (
                        <>
                            <View style={styles.curriculumDivider}>
                                <View style={[styles.curricDivLine, { backgroundColor: '#6366f1' }]} />
                                <View style={[styles.curricDivBadge, { backgroundColor: '#6366f1' }]}>
                                    <Text style={styles.curricDivText}>📚 8-4-4 Curriculum</Text>
                                </View>
                                <View style={[styles.curricDivLine, { backgroundColor: '#6366f1' }]} />
                            </View>
                            {visibleForms.filter(f => !isCBC(f.form_level)).map(f => (
                                <FormCard key={f.id} form={f} selected={selectedForm?.id === f.id}
                                    onPress={() => { setSelectedForm(f); setActiveTab('datagrid'); }} />
                            ))}
                        </>
                    )}

                    {/* CBC Section */}
                    {visibleForms.filter(f => isCBC(f.form_level)).length > 0 && (
                        <>
                            <View style={styles.curriculumDivider}>
                                <View style={[styles.curricDivLine, { backgroundColor: '#0891b2' }]} />
                                <View style={[styles.curricDivBadge, { backgroundColor: '#0891b2' }]}>
                                    <Text style={styles.curricDivText}>🎓 CBC Curriculum</Text>
                                </View>
                                <View style={[styles.curricDivLine, { backgroundColor: '#0891b2' }]} />
                            </View>
                            {/* CBC sub-labels */}
                            {[
                                { label: 'Junior Secondary School (JSS)', levels: [7, 8, 9] },
                                { label: 'Senior Secondary School (SSS)', levels: [10, 11, 12] },
                            ].map(grp => {
                                const grpForms = visibleForms.filter(f => grp.levels.includes(f.form_level));
                                if (grpForms.length === 0) return null;
                                return (
                                    <View key={grp.label}>
                                        <Text style={styles.cbcGroupLabel}>{grp.label}</Text>
                                        {grpForms.map(f => (
                                            <FormCard key={f.id} form={f} selected={selectedForm?.id === f.id}
                                                onPress={() => { setSelectedForm(f); setActiveTab('datagrid'); }} />
                                        ))}
                                    </View>
                                );
                            })}
                        </>
                    )}

                    {/* Combined Summary Table */}
                    <View style={styles.summaryTable}>
                        <LinearGradient colors={['#1e293b', '#334155']} style={styles.summaryHeader}>
                            <Text style={styles.summaryHeaderText}>📊 Combined Summary</Text>
                        </LinearGradient>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryCol}>Form/Grade</Text>
                            <Text style={styles.summaryCol}>Studs</Text>
                            <Text style={styles.summaryCol}>Expected</Text>
                            <Text style={styles.summaryCol}>Paid</Text>
                            <Text style={styles.summaryCol}>Bal</Text>
                            <Text style={styles.summaryCol}>Rate</Text>
                        </View>
                        {forms.map((f, i) => {
                            const rate = pct(f.paid, f.expected);
                            return (
                                <TouchableOpacity key={f.id} onPress={() => { setSelectedForm(f); setActiveTab('datagrid'); }}
                                    style={[styles.summaryDataRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }]}>
                                    <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={[styles.curricDot, { backgroundColor: isCBC(f.form_level) ? '#0891b2' : '#6366f1' }]} />
                                        <Text style={[styles.summaryDataCol, { fontWeight: '700', flex: 0 }]} numberOfLines={1}>
                                            {getFormLabel(f.form_name, f.form_level).replace(' (JSS)', '').replace(' (SSS)', '')}
                                        </Text>
                                    </View>
                                    <Text style={styles.summaryDataCol}>{f.students}</Text>
                                    <Text style={styles.summaryDataCol}>{(f.expected / 1000).toFixed(0)}K</Text>
                                    <Text style={[styles.summaryDataCol, { color: '#10b981' }]}>{(f.paid / 1000).toFixed(0)}K</Text>
                                    <Text style={[styles.summaryDataCol, { color: f.balance > 0 ? '#ef4444' : '#10b981' }]}>{(f.balance / 1000).toFixed(0)}K</Text>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <View style={[styles.ratePill, {
                                            backgroundColor: rate >= 90 ? '#f0fdf4' : rate >= 60 ? '#fffbeb' : '#fef2f2',
                                        }]}>
                                            <Text style={{ fontSize: 9, fontWeight: '800', color: rate >= 90 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626' }}>{rate}%</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        {/* Grand Total Row */}
                        <View style={[styles.summaryDataRow, { backgroundColor: '#1e293b' }]}>
                            <Text style={[styles.summaryDataCol, { flex: 1.5, color: '#fff', fontWeight: '900' }]}>TOTAL</Text>
                            <Text style={[styles.summaryDataCol, { color: '#94a3b8' }]}>{forms.reduce((s, f) => s + f.students, 0)}</Text>
                            <Text style={[styles.summaryDataCol, { color: '#94a3b8' }]}>{(totals.expected / 1000000).toFixed(1)}M</Text>
                            <Text style={[styles.summaryDataCol, { color: '#34d399', fontWeight: '900' }]}>{(totals.paid / 1000000).toFixed(1)}M</Text>
                            <Text style={[styles.summaryDataCol, { color: '#fca5a5', fontWeight: '900' }]}>{(totals.balance / 1000000).toFixed(1)}M</Text>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{pct(totals.paid, totals.expected)}%</Text>
                            </View>
                        </View>
                    </View>
                    <View style={{ height: 30 }} />
                </ScrollView>
            )}

            {/* ══════════════ DATAGRID TAB ══════════════ */}
            {activeTab === 'datagrid' && (
                <View style={{ flex: 1 }}>
                    {/* Form selector */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formPillBar}>
                        {forms.map(f => (
                            <TouchableOpacity key={f.id} onPress={() => setSelectedForm(f)}
                                style={[styles.formPill, selectedForm?.id === f.id && {
                                    backgroundColor: isCBC(f.form_level) ? '#0891b2' : '#6366f1',
                                }]}>
                                <Text style={[styles.formPillText, selectedForm?.id === f.id && { color: '#fff' }]}>
                                    {isCBC(f.form_level) ? `Gr.${f.form_level}` : f.form_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {selectedForm && (
                        <ScrollView showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#0891b2" />}>
                            {/* Selected form summary */}
                            <LinearGradient colors={isCBC(selectedForm.form_level) ? ['#0c4a6e', '#0891b2'] : ['#1e1b4b', '#6366f1'] as any} style={styles.dgFormHeader}>
                                <Text style={styles.dgFormName}>{getFormLabel(selectedForm.form_name, selectedForm.form_level)}</Text>
                                <Text style={styles.dgFormCurric}>{getCurriculumLabel(selectedForm.form_level)} · {selectedForm.students} students · {selectedForm.streams} streams</Text>
                                <View style={styles.dgFormStats}>
                                    {[
                                        { l: 'Expected', v: fmt(selectedForm.expected) },
                                        { l: 'Collected', v: fmt(selectedForm.paid) },
                                        { l: 'Balance', v: fmt(selectedForm.balance) },
                                        { l: 'Collection', v: `${pct(selectedForm.paid, selectedForm.expected)}%` },
                                    ].map((s, i) => (
                                        <View key={i} style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>{s.v}</Text>
                                            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>{s.l}</Text>
                                        </View>
                                    ))}
                                </View>
                            </LinearGradient>

                            {/* Stream Datagrid */}
                            <Text style={[styles.dgSectionTitle, { paddingHorizontal: 16, marginTop: 14 }]}>📊 Stream-by-Stream Breakdown</Text>
                            <View style={styles.dgGrid}>
                                <View style={styles.dgGridHeader}>
                                    <Text style={[styles.dgHeaderCell, { flex: 2 }]}>Stream</Text>
                                    <Text style={styles.dgHeaderCell}>Expected</Text>
                                    <Text style={styles.dgHeaderCell}>Collected</Text>
                                    <Text style={styles.dgHeaderCell}>Balance</Text>
                                    <Text style={[styles.dgHeaderCell, { width: 44 }]}>Rate</Text>
                                </View>
                                {selectedFormStreams.length === 0 ? (
                                    <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 12 }}>No streams found</Text>
                                ) : selectedFormStreams.map((sm, i) => <StreamRow key={sm.id} stream={sm} idx={i} />)}
                                {/* Stream totals */}
                                <View style={[styles.streamRow, { backgroundColor: '#f0f4ff', borderTopWidth: 2, borderTopColor: '#c7d2fe' }]}>
                                    <View style={{ flex: 2 }}>
                                        <Text style={[styles.streamName, { color: '#4338ca', fontWeight: '900' }]}>TOTAL</Text>
                                    </View>
                                    <Text style={[styles.streamCell, { color: '#4338ca', fontWeight: '900' }]}>{fmt(selectedForm.expected)}</Text>
                                    <Text style={[styles.streamCell, { color: '#059669', fontWeight: '900' }]}>{fmt(selectedForm.paid)}</Text>
                                    <Text style={[styles.streamCell, { color: selectedForm.balance > 0 ? '#dc2626' : '#059669', fontWeight: '900' }]}>{fmt(selectedForm.balance)}</Text>
                                    <View style={{ width: 44, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#4338ca' }}>{pct(selectedForm.paid, selectedForm.expected)}%</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Defaulters Section */}
                            <Text style={[styles.dgSectionTitle, { paddingHorizontal: 16, marginTop: 14 }]}>⚠️ Top Defaulters — {selectedForm.form_name}</Text>
                            <View style={{ marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#fee2e2', marginBottom: 20 }}>
                                {students.filter(s => s.form_id === selectedForm.id && s.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8).map((s, i) => (
                                    <StudentRow key={s.id} student={s} onCollect={() => { setCollectStudent(s); setShowCollectModal(true); }} />
                                ))}
                            </View>
                            <View style={{ height: 30 }} />
                        </ScrollView>
                    )}
                </View>
            )}

            {/* ══════════════ STUDENTS TAB ══════════════ */}
            {activeTab === 'students' && (
                <View style={{ flex: 1 }}>
                    {/* Search + filters */}
                    <View style={styles.searchBar}>
                        <TextInput value={search} onChangeText={setSearch} placeholder="🔍  Search student or admission no…" placeholderTextColor="#94a3b8"
                            style={styles.searchInput} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, paddingLeft: 12 }}>
                        {[
                            { key: 'all', label: '📋 All' },
                            { key: 'owing', label: '🔴 Owing' },
                            { key: 'partial', label: '⚠️ Partial' },
                            { key: 'cleared', label: '✅ Cleared' },
                        ].map(f => (
                            <TouchableOpacity key={f.key} onPress={() => setFilterStatus(f.key as any)}
                                style={[styles.statusFilterBtn, filterStatus === f.key && { backgroundColor: '#0891b2', borderColor: '#0891b2' }]}>
                                <Text style={[styles.statusFilterText, filterStatus === f.key && { color: '#fff' }]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                        {forms.map(f => (
                            <TouchableOpacity key={f.id} onPress={() => setSelectedForm(selectedForm?.id === f.id ? null : f)}
                                style={[styles.statusFilterBtn, selectedForm?.id === f.id && { backgroundColor: isCBC(f.form_level) ? '#0891b2' : '#6366f1', borderColor: '#0891b2' }]}>
                                <Text style={[styles.statusFilterText, selectedForm?.id === f.id && { color: '#fff' }]}>
                                    {isCBC(f.form_level) ? `Gr.${f.form_level}` : f.form_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
                        {visibleStudents.length} students · Balance: {fmt(visibleStudents.reduce((s, st) => s + st.balance, 0))}
                    </Text>
                    <FlatList
                        data={visibleStudents}
                        keyExtractor={s => String(s.id)}
                        renderItem={({ item }) => (
                            <StudentRow student={item} onCollect={() => { setCollectStudent(item); setShowCollectModal(true); }} />
                        )}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#0891b2" />}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No students found</Text>}
                        style={{ backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 14, marginTop: 4 }}
                    />
                </View>
            )}

            {/* ══════════════ COLLECT MODAL ══════════════ */}
            <Modal visible={showCollectModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <LinearGradient colors={['#0c4a6e', '#0891b2']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>💳 Collect Fee Payment</Text>
                            {collectStudent && (
                                <Text style={styles.modalSub}>{collectStudent.first_name} {collectStudent.last_name} · Balance: {fmt(collectStudent.balance)}</Text>
                            )}
                        </LinearGradient>
                        <ScrollView style={{ padding: 20 }}>
                            <Text style={styles.modalLabel}>Amount (KES) *</Text>
                            <TextInput value={collectAmount} onChangeText={setCollectAmount} keyboardType="numeric" placeholder="0"
                                style={styles.modalBigInput} placeholderTextColor="#94a3b8" />
                            {collectStudent && (
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                    {[100, 500, 1000, collectStudent.balance].map((q, i) => (
                                        <TouchableOpacity key={i} onPress={() => setCollectAmount(String(q))}
                                            style={styles.quickAmt}>
                                            <Text style={styles.quickAmtText}>{q >= 1000 ? `${q / 1000}K` : q}{i === 3 ? ' Full' : ''}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <Text style={styles.modalLabel}>Payment Method</Text>
                            <View style={styles.methodGrid}>
                                {['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'KCB PesaLink', 'RTGS'].map(m => (
                                    <TouchableOpacity key={m} onPress={() => setCollectMethod(m)}
                                        style={[styles.methodBtn, collectMethod === m && { backgroundColor: '#0891b2', borderColor: '#0891b2' }]}>
                                        <Text style={[styles.methodBtnText, collectMethod === m && { color: '#fff' }]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.modalLabel}>Reference No (optional)</Text>
                            <TextInput value={collectRef} onChangeText={setCollectRef} placeholder="e.g. MPESA code, slip no"
                                style={styles.modalInput} placeholderTextColor="#94a3b8" />

                            <TouchableOpacity onPress={handleCollect} disabled={saving}
                                style={[styles.collectSubmitBtn, saving && { opacity: 0.6 }]}>
                                <LinearGradient colors={['#0c4a6e', '#0891b2']} style={styles.collectSubmitBtnInner}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.collectSubmitText}>✅ Record Payment & Generate Receipt</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowCollectModal(false)} style={{ marginTop: 10, padding: 14, alignItems: 'center' }}>
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
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 0 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 10 },
    totalStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
    totalItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    totalVal: { fontSize: 13, fontWeight: '900' },
    totalLbl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 1 },
    curricFilter: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 10 },
    curricBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    curricBtnActive: { backgroundColor: '#fff' },
    curricBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 0 },
    tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
    tabBtnActive: { backgroundColor: '#fff', borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    tabBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    scroll: { flex: 1 },
    formCard: { marginHorizontal: 12, marginBottom: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    formCardHeader: { padding: 14, flexDirection: 'row', alignItems: 'center' },
    formCardName: { fontSize: 15, fontWeight: '900', color: '#fff' },
    formCardCount: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    curricBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    curricBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    formRingWrap: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, minWidth: 64 },
    formRingPct: { fontSize: 18, fontWeight: '900', color: '#fff' },
    formRingLbl: { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
    formCardBody: { flexDirection: 'row', padding: 12, justifyContent: 'space-between' },
    formStat: { alignItems: 'center', flex: 1 },
    formStatLbl: { fontSize: 9, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
    formStatVal: { fontSize: 12, fontWeight: '800', marginTop: 2 },
    formBarBg: { height: 4, backgroundColor: '#f1f5f9', marginHorizontal: 12, marginBottom: 12, borderRadius: 99, overflow: 'hidden' },
    formBarFill: { height: '100%', borderRadius: 99 },
    curriculumDivider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 12, gap: 8 },
    curricDivLine: { flex: 1, height: 1.5, borderRadius: 1 },
    curricDivBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    curricDivText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    cbcGroupLabel: { fontSize: 11, fontWeight: '800', color: '#0891b2', marginHorizontal: 16, marginBottom: 6, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryTable: { margin: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    summaryHeader: { padding: 12 },
    summaryHeaderText: { fontSize: 13, fontWeight: '800', color: '#fff' },
    summaryRow: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    summaryCol: { flex: 1, fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' },
    summaryDataRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
    summaryDataCol: { flex: 1, fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
    curricDot: { width: 7, height: 7, borderRadius: 4 },
    ratePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    formPillBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10, paddingLeft: 12, maxHeight: 52 },
    formPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    formPillText: { fontSize: 12, fontWeight: '700', color: '#374151' },
    dgFormHeader: { padding: 18 },
    dgFormName: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
    dgFormCurric: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 12 },
    dgFormStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
    dgSectionTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    dgGrid: { marginHorizontal: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    dgGridHeader: { flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 12 },
    dgHeaderCell: { flex: 1, fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', textAlign: 'center' },
    streamRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
    streamName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
    streamStudents: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
    streamCell: { flex: 1, fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
    streamRateBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    studentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 10 },
    studentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0891b2', alignItems: 'center', justifyContent: 'center' },
    studentName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    studentAdm: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
    statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    studentBalance: { fontSize: 11, fontWeight: '800' },
    collectBtn: { backgroundColor: '#0891b2', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
    collectBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    searchBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    searchInput: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
    statusFilterBtn: { marginRight: 8, marginVertical: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
    statusFilterText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden' },
    modalHeader: { padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
    modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    modalLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
    modalBigInput: { fontSize: 32, fontWeight: '900', color: '#0891b2', textAlign: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, backgroundColor: '#f0fdfe' },
    modalInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, backgroundColor: '#fafbff', color: '#1e293b' },
    quickAmt: { flex: 1, backgroundColor: '#f0fdfe', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#a5f3fc' },
    quickAmtText: { fontSize: 11, fontWeight: '800', color: '#0891b2' },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    methodBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    methodBtnText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    collectSubmitBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
    collectSubmitBtnInner: { padding: 16, alignItems: 'center' },
    collectSubmitText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
