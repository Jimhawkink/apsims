import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import {
    getStudentFeePayments, getStudentFeeStructures,
    FeePayment, formatKES, formatDate,
} from '../../lib/supabase';

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#0d9488', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function FeeBalanceScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [payments, setPayments] = useState<FeePayment[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const studentId = session?.linked_student_id || 0;
    const formId = session?.student_form_id || 0;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [pays, structs] = await Promise.all([
                getStudentFeePayments(studentId),
                formId ? getStudentFeeStructures(formId) : Promise.resolve([]),
            ]);
            setPayments(pays);
            setStructures(structs);
        } catch (err: any) {
            console.error('FeeBalanceScreen error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, formId]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalDue = structures.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
    const balance = Math.max(0, totalDue - totalPaid);
    const fullyPaid = balance === 0 && totalDue > 0;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading fee balance…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#0d9488" />
            <LinearGradient colors={['#0d9488', '#059669']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>💰 Fee Balance</Text>
                    <Text style={styles.headerSub}>{session?.student_name || 'Student'}</Text>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Balance Card */}
                <View style={[styles.balanceCard, { borderColor: fullyPaid ? C.accent : C.danger }]}>
                    <Text style={styles.balanceLabel}>Outstanding Balance</Text>
                    <Text style={[styles.balanceAmount, { color: fullyPaid ? C.accent : C.danger }]}>
                        {formatKES(balance)}
                    </Text>
                    {fullyPaid && (
                        <View style={styles.paidBadge}>
                            <Text style={styles.paidBadgeText}>✅ Fees fully paid</Text>
                        </View>
                    )}
                </View>

                {/* KPI Row */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { borderLeftColor: C.primary }]}>
                        <Text style={styles.kpiEmoji}>📋</Text>
                        <Text style={[styles.kpiValue, { color: C.primary }]}>{formatKES(totalDue)}</Text>
                        <Text style={styles.kpiLabel}>Total Due</Text>
                    </View>
                    <View style={[styles.kpiCard, { borderLeftColor: C.accent }]}>
                        <Text style={styles.kpiEmoji}>💳</Text>
                        <Text style={[styles.kpiValue, { color: C.accent }]}>{formatKES(totalPaid)}</Text>
                        <Text style={styles.kpiLabel}>Total Paid</Text>
                    </View>
                </View>

                {/* Fee Structure */}
                {structures.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📋 Fee Structure</Text>
                        {structures.map((s: any, idx: number) => (
                            <View key={s.id} style={[styles.feeRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <Text style={styles.feeCategory}>{s.category || 'Fee'}</Text>
                                <Text style={[styles.feeAmount, { color: C.primary }]}>{formatKES(Number(s.amount))}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Payment History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💳 Payment History</Text>
                    {payments.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>💳</Text>
                            <Text style={styles.emptyText}>No payment records found.</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.gridHeader}>
                                <Text style={[styles.gridHText, { flex: 1.2 }]}>Date</Text>
                                <Text style={[styles.gridHText, { flex: 1 }]}>Amount</Text>
                                <Text style={[styles.gridHText, { flex: 1 }]}>Method</Text>
                                <Text style={[styles.gridHText, { flex: 1 }]}>Ref</Text>
                            </View>
                            {payments.map((p, idx) => (
                                <View key={p.id} style={[styles.gridRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                    <Text style={[styles.gridCell, { flex: 1.2 }]}>{formatDate(p.payment_date)}</Text>
                                    <Text style={[styles.gridCell, { flex: 1, fontWeight: '800', color: C.accent }]}>{formatKES(Number(p.amount))}</Text>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.methodBadge}>
                                            <Text style={styles.methodBadgeText}>{p.payment_method || 'Cash'}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.gridCell, { flex: 1, color: C.textDim }]} numberOfLines={1}>
                                        {p.mpesa_code || p.reference_number || '-'}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.totalRow}>
                                <Text style={[styles.totalLabel, { flex: 1.2 }]}>TOTAL PAID</Text>
                                <Text style={[styles.totalValue, { flex: 1 }]}>{formatKES(totalPaid)}</Text>
                                <View style={{ flex: 2 }} />
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    balanceCard: { backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 2 },
    balanceLabel: { fontSize: 12, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    balanceAmount: { fontSize: 36, fontWeight: '900', marginTop: 6 },
    paidBadge: { marginTop: 10, backgroundColor: C.accentLight, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    paidBadgeText: { fontSize: 13, fontWeight: '800', color: C.accent },
    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    kpiCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, alignItems: 'center', gap: 4 },
    kpiEmoji: { fontSize: 18 },
    kpiValue: { fontSize: 16, fontWeight: '900' },
    kpiLabel: { fontSize: 9, color: C.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    feeCategory: { fontSize: 12, color: C.text, fontWeight: '600' },
    feeAmount: { fontSize: 13, fontWeight: '800' },
    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
    gridHText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },
    methodBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    methodBadgeText: { fontSize: 9, fontWeight: '800', color: '#1d4ed8' },
    totalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderTopWidth: 2, borderTopColor: C.primary },
    totalLabel: { fontSize: 10, fontWeight: '900', color: C.text, textTransform: 'uppercase' },
    totalValue: { fontSize: 11, fontWeight: '900', color: C.accent },
    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 12, color: C.textSub },
});
