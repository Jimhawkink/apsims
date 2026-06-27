import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    RefreshControl, ActivityIndicator, Share, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(Math.round(n));

type Period = 'month' | 'term' | 'year';

function PnLRow({ label, value, isTotal, isNegative, indent }: { label: string; value: number; isTotal?: boolean; isNegative?: boolean; indent?: boolean }) {
    return (
        <View style={[styles.plRow, isTotal && { backgroundColor: '#f8faff', borderTopWidth: 1.5, borderTopColor: '#c7d2fe' }]}>
            <Text style={[styles.plLabel, isTotal && { fontWeight: '900', color: '#1e293b' }, indent && { paddingLeft: 16, color: '#64748b' }]}>{label}</Text>
            <Text style={[styles.plValue, {
                color: isTotal ? (value >= 0 ? '#059669' : '#dc2626') : isNegative ? '#dc2626' : '#374151',
                fontWeight: isTotal ? '900' : '700',
            }]}>
                {isNegative && value > 0 ? '-' : ''}{fmt(value)}
            </Text>
        </View>
    );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
    return (
        <View style={[styles.sectionHeader, { backgroundColor: color }]}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
    );
}

export default function BursarReportsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<Period>('term');
    const [activeReport, setActiveReport] = useState<'pnl' | 'fees' | 'cash'>('pnl');
    const currentYear = new Date().getFullYear();

    const [data, setData] = useState({
        feesCollected: 0, otherIncome: 0,
        salaries: 0, utilities: 0, stationery: 0, maintenance: 0, transport: 0,
        otherExpenses: 0,
        payments: [] as any[], expenses: [] as any[], income: [] as any[],
        formBreakdown: [] as any[],
        monthlyFees: [] as number[],
        monthlyExp: [] as number[],
    });
    const [currentTerm, setCurrentTerm] = useState<any>(null);
    const [schoolName, setSchoolName] = useState('APSIMS School');

    const getDateRange = useCallback(() => {
        const now = new Date();
        if (period === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            return { from: start, to: now.toISOString().split('T')[0] };
        }
        if (period === 'year') return { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };
        if (currentTerm) return { from: currentTerm.start_date || `${currentYear}-01-01`, to: currentTerm.end_date || now.toISOString().split('T')[0] };
        return { from: `${currentYear}-01-01`, to: now.toISOString().split('T')[0] };
    }, [period, currentTerm, currentYear]);

    const fetchData = useCallback(async () => {
        try {
            const [
                { data: payments }, { data: expenses }, { data: income },
                { data: forms }, { data: structs }, { data: students },
                { data: terms }, { data: school },
            ] = await Promise.all([
                supabase.from('school_fee_payments').select('*').eq('year', currentYear),
                supabase.from('school_expenses').select('*').eq('year', currentYear),
                supabase.from('school_income').select('*').eq('year', currentYear),
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_fee_structures').select('form_id,amount').eq('year', currentYear),
                supabase.from('school_students').select('id,form_id'),
                supabase.from('school_terms').select('*').eq('year', currentYear),
                supabase.from('school_details').select('school_name').single(),
            ]);

            if (school?.school_name) setSchoolName(school.school_name);
            const ct = (terms || []).find((t: any) => t.is_current);
            setCurrentTerm(ct);

            const { from, to } = getDateRange();
            const pays = (payments || []).filter(p => p.payment_date >= from && p.payment_date <= to);
            const exps = (expenses || []).filter(e => e.status !== 'rejected' && e.expense_date >= from && e.expense_date <= to);
            const incs = (income || []).filter(i => i.income_date >= from && i.income_date <= to);
            const fms = forms || [];
            const studs = students || [];
            const strs = structs || [];

            const feesCollected = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
            const otherIncome = incs.filter(i => !i.source?.toLowerCase().includes('fee')).reduce((s, i) => s + Number(i.amount || 0), 0);
            const expByCategory = (cat: string) => exps.filter(e => e.category?.toLowerCase().includes(cat)).reduce((s, e) => s + Number(e.amount || 0), 0);
            const salaries = expByCategory('salar') + expByCategory('wage');
            const utilities = expByCategory('utilit') + expByCategory('water') + expByCategory('electr');
            const stationery = expByCategory('station') + expByCategory('suppli');
            const maintenance = expByCategory('mainten') + expByCategory('repair');
            const transport = expByCategory('transport') + expByCategory('travel');
            const knownExp = salaries + utilities + stationery + maintenance + transport;
            const otherExp = exps.reduce((s, e) => s + Number(e.amount || 0), 0) - knownExp;

            // Per-form breakdown
            const paidByStudent = new Map<number, number>();
            pays.forEach(p => paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) || 0) + Number(p.amount || 0)));
            const feeByForm = new Map<number, number>();
            fms.forEach(f => {
                feeByForm.set(f.id, strs.filter(s => !s.form_id || s.form_id === f.id).reduce((a, b) => a + Number(b.amount || 0), 0));
            });
            const formBreakdown = fms.map(f => {
                const formStuds = studs.filter(s => s.form_id === f.id);
                const expected = (feeByForm.get(f.id) || 0) * formStuds.length;
                const paid = formStuds.reduce((s, st) => s + (paidByStudent.get(st.id) || 0), 0);
                return { ...f, expected, paid, balance: Math.max(0, expected - paid), students: formStuds.length };
            });

            // Monthly trend (last 6 months)
            const monthlyFees: number[] = [];
            const monthlyExp: number[] = [];
            for (let m = 5; m >= 0; m--) {
                const d = new Date(); d.setMonth(d.getMonth() - m);
                const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthlyFees.push((payments || []).filter(p => p.payment_date?.startsWith(prefix)).reduce((s, p) => s + Number(p.amount || 0), 0));
                monthlyExp.push((expenses || []).filter(e => e.expense_date?.startsWith(prefix)).reduce((s, e) => s + Number(e.amount || 0), 0));
            }

            setData({ feesCollected, otherIncome, salaries, utilities, stationery, maintenance, transport, otherExpenses: Math.max(0, otherExp), payments: pays, expenses: exps, income: incs, formBreakdown, monthlyFees, monthlyExp });
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [currentYear, getDateRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalIncome = data.feesCollected + data.otherIncome;
    const totalExpenses = data.salaries + data.utilities + data.stationery + data.maintenance + data.transport + data.otherExpenses;
    const netSurplus = totalIncome - totalExpenses;

    const handleShare = async () => {
        const report = `
${schoolName} - Financial Report (${period.toUpperCase()})
Generated: ${new Date().toLocaleDateString('en-KE')}

INCOME
Fees Collected: ${fmt(data.feesCollected)}
Other Income: ${fmt(data.otherIncome)}
TOTAL INCOME: ${fmt(totalIncome)}

EXPENDITURE
Salaries & Wages: ${fmt(data.salaries)}
Utilities: ${fmt(data.utilities)}
Stationery: ${fmt(data.stationery)}
Maintenance: ${fmt(data.maintenance)}
Transport: ${fmt(data.transport)}
Other Expenses: ${fmt(data.otherExpenses)}
TOTAL EXPENSES: ${fmt(totalExpenses)}

NET ${netSurplus >= 0 ? 'SURPLUS' : 'DEFICIT'}: ${fmt(Math.abs(netSurplus))}

Powered by APSIMS - Kenya's #1 School System
`.trim();
        await Share.share({ message: report, title: 'Financial Report' });
    };

    if (loading) return (
        <LinearGradient colors={['#1e1b4b', '#4338ca']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Building Reports…</Text>
        </LinearGradient>
    );

    const maxBar = Math.max(...data.monthlyFees, ...data.monthlyExp, 1);
    const monthLabels = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return d.toLocaleDateString('en', { month: 'short' });
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />
            <ScreenHeader
                title="📊 Reports"
                onBack={() => navigation.goBack()}
                gradient={['#6366F1','#4F46E5']}
            />

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#6366f1" />}>

                {/* ══ P&L REPORT ══ */}
                {activeReport === 'pnl' && (
                    <View style={styles.reportCard}>
                        <Text style={styles.reportTitle}>Income & Expenditure Statement</Text>
                        <Text style={styles.reportPeriod}>{schoolName} · {period === 'month' ? new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' }) : period === 'term' ? currentTerm?.term_name || 'Current Term' : `FY ${currentYear}`}</Text>

                        <SectionHeader title="INCOME" color="#059669" />
                        <PnLRow label="School Fees Collected" value={data.feesCollected} indent />
                        <PnLRow label="Donations & Grants" value={data.otherIncome} indent />
                        <PnLRow label="TOTAL INCOME" value={totalIncome} isTotal />

                        <SectionHeader title="EXPENDITURE" color="#dc2626" />
                        <PnLRow label="Salaries & Wages" value={data.salaries} isNegative indent />
                        <PnLRow label="Utilities" value={data.utilities} isNegative indent />
                        <PnLRow label="Stationery & Supplies" value={data.stationery} isNegative indent />
                        <PnLRow label="Maintenance & Repairs" value={data.maintenance} isNegative indent />
                        <PnLRow label="Transport & Travel" value={data.transport} isNegative indent />
                        <PnLRow label="Other Expenses" value={data.otherExpenses} isNegative indent />
                        <PnLRow label="TOTAL EXPENDITURE" value={totalExpenses} isTotal isNegative />

                        <View style={[styles.netRow, { backgroundColor: netSurplus >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: netSurplus >= 0 ? '#86efac' : '#fecaca' }]}>
                            <Text style={[styles.netRowLabel, { color: netSurplus >= 0 ? '#14532d' : '#7f1d1d' }]}>
                                NET {netSurplus >= 0 ? '✅ SURPLUS' : '⚠️ DEFICIT'}
                            </Text>
                            <Text style={[styles.netRowValue, { color: netSurplus >= 0 ? '#059669' : '#dc2626' }]}>
                                {fmt(Math.abs(netSurplus))}
                            </Text>
                        </View>

                        {/* Expense breakdown doughnut simulation */}
                        <Text style={[styles.reportTitle, { marginTop: 20 }]}>Expense Breakdown</Text>
                        {[
                            { l: 'Salaries', v: data.salaries, c: '#6366f1' },
                            { l: 'Utilities', v: data.utilities, c: '#0891b2' },
                            { l: 'Stationery', v: data.stationery, c: '#f59e0b' },
                            { l: 'Maintenance', v: data.maintenance, c: '#10b981' },
                            { l: 'Transport', v: data.transport, c: '#ec4899' },
                            { l: 'Other', v: data.otherExpenses, c: '#94a3b8' },
                        ].filter(e => e.v > 0).map((e, i) => (
                            <View key={i} style={styles.expBreakRow}>
                                <View style={[styles.expBreakDot, { backgroundColor: e.c }]} />
                                <Text style={styles.expBreakLabel}>{e.l}</Text>
                                <View style={{ flex: 1, height: 7, backgroundColor: '#F8FAFF', borderRadius: 99, marginHorizontal: 10 }}>
                                    <View style={[styles.expBreakBar, { width: `${totalExpenses > 0 ? Math.round((e.v / totalExpenses) * 100) : 0}%` as any, backgroundColor: e.c }]} />
                                </View>
                                <Text style={styles.expBreakAmt}>{fmtShort(e.v)}</Text>
                                <Text style={styles.expBreakPct}>{totalExpenses > 0 ? Math.round((e.v / totalExpenses) * 100) : 0}%</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ══ FEES REPORT ══ */}
                {activeReport === 'fees' && (
                    <View style={styles.reportCard}>
                        <Text style={styles.reportTitle}>Fee Collection Analysis</Text>
                        <Text style={styles.reportPeriod}>{period.toUpperCase()} · {data.formBreakdown.reduce((s, f) => s + f.students, 0)} students</Text>

                        {/* Summary cards */}
                        <View style={styles.feeKpiRow}>
                            {[
                                { l: 'Collected', v: fmt(data.feesCollected), c: '#059669', bg: '#f0fdf4' },
                                { l: 'Outstanding', v: fmt(data.formBreakdown.reduce((s, f) => s + f.balance, 0)), c: '#dc2626', bg: '#fef2f2' },
                                { l: 'Collection %', v: `${data.formBreakdown.reduce((s, f) => s + f.expected, 0) > 0 ? Math.round((data.feesCollected / data.formBreakdown.reduce((s, f) => s + f.expected, 0)) * 100) : 0}%`, c: '#4338ca', bg: '#eef2ff' },
                            ].map((s, i) => (
                                <View key={i} style={[styles.feeKpiCard, { backgroundColor: s.bg }]}>
                                    <Text style={[styles.feeKpiVal, { color: s.c }]}>{s.v}</Text>
                                    <Text style={styles.feeKpiLbl}>{s.l}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Form-by-form table */}
                        <View style={styles.feeTable}>
                            <View style={[styles.feeTableHeader, { backgroundColor: '#1e293b' }]}>
                                <Text style={[styles.feeTableHead, { flex: 1.5 }]}>Form/Grade</Text>
                                <Text style={styles.feeTableHead}>Studs</Text>
                                <Text style={styles.feeTableHead}>Collected</Text>
                                <Text style={styles.feeTableHead}>Balance</Text>
                                <Text style={styles.feeTableHead}>Rate</Text>
                            </View>
                            {data.formBreakdown.map((f, i) => {
                                const rate = f.expected > 0 ? Math.round((f.paid / f.expected) * 100) : 0;
                                const isCbc = f.form_level >= 7;
                                return (
                                    <View key={f.id} style={[styles.feeTableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }]}>
                                        <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                            <View style={[styles.curricDot, { backgroundColor: isCbc ? '#0891b2' : '#6366f1' }]} />
                                            <Text style={styles.feeTableCell} numberOfLines={1}>{f.form_name}</Text>
                                        </View>
                                        <Text style={styles.feeTableCell}>{f.students}</Text>
                                        <Text style={[styles.feeTableCell, { color: '#059669' }]}>{fmtShort(f.paid)}</Text>
                                        <Text style={[styles.feeTableCell, { color: f.balance > 0 ? '#dc2626' : '#059669' }]}>{fmtShort(f.balance)}</Text>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <View style={[styles.ratePill, { backgroundColor: rate >= 90 ? '#f0fdf4' : rate >= 60 ? '#fffbeb' : '#fef2f2' }]}>
                                                <Text style={{ fontSize: 9, fontWeight: '800', color: rate >= 90 ? '#16a34a' : rate >= 60 ? '#d97706' : '#dc2626' }}>{rate}%</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                            {/* Grand Total */}
                            <View style={[styles.feeTableRow, { backgroundColor: '#1e293b' }]}>
                                <Text style={[styles.feeTableCell, { flex: 1.5, color: '#fff', fontWeight: '900' }]}>TOTAL</Text>
                                <Text style={[styles.feeTableCell, { color: '#94a3b8' }]}>{data.formBreakdown.reduce((s, f) => s + f.students, 0)}</Text>
                                <Text style={[styles.feeTableCell, { color: '#34d399', fontWeight: '900' }]}>{fmtShort(data.feesCollected)}</Text>
                                <Text style={[styles.feeTableCell, { color: '#fca5a5', fontWeight: '900' }]}>{fmtShort(data.formBreakdown.reduce((s, f) => s + f.balance, 0))}</Text>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>
                                        {data.formBreakdown.reduce((s, f) => s + f.expected, 0) > 0 ? Math.round((data.feesCollected / data.formBreakdown.reduce((s, f) => s + f.expected, 0)) * 100) : 0}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* ══ TREND REPORT ══ */}
                {activeReport === 'cash' && (
                    <View style={styles.reportCard}>
                        <Text style={styles.reportTitle}>6-Month Income vs Expenses Trend</Text>
                        <Text style={styles.reportPeriod}>Monthly comparison · {currentYear}</Text>

                        {/* Legend */}
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#10b981' }} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>Income</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#ef4444' }} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>Expenses</Text>
                            </View>
                        </View>

                        {/* Bar chart */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 }}>
                            {data.monthlyFees.map((fee, i) => {
                                const exp = data.monthlyExp[i] || 0;
                                const feeH = Math.max(4, (fee / maxBar) * 90);
                                const expH = Math.max(4, (exp / maxBar) * 90);
                                return (
                                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 90 }}>
                                            <View style={{ width: 10, height: feeH, backgroundColor: '#10b981', borderRadius: 3 }} />
                                            <View style={{ width: 10, height: expH, backgroundColor: '#ef4444', borderRadius: 3 }} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 6 }}>
                            {monthLabels.map((m, i) => (
                                <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#94a3b8', fontWeight: '600' }}>{m}</Text>
                            ))}
                        </View>

                        {/* Monthly table */}
                        <View style={[styles.feeTable, { marginTop: 20 }]}>
                            <View style={[styles.feeTableHeader, { backgroundColor: '#1e293b' }]}>
                                <Text style={[styles.feeTableHead, { flex: 1.2 }]}>Month</Text>
                                <Text style={styles.feeTableHead}>Income</Text>
                                <Text style={styles.feeTableHead}>Expenses</Text>
                                <Text style={styles.feeTableHead}>Net</Text>
                            </View>
                            {monthLabels.map((m, i) => {
                                const net = (data.monthlyFees[i] || 0) - (data.monthlyExp[i] || 0);
                                return (
                                    <View key={i} style={[styles.feeTableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }]}>
                                        <Text style={[styles.feeTableCell, { flex: 1.2, fontWeight: '700' }]}>{m}</Text>
                                        <Text style={[styles.feeTableCell, { color: '#059669' }]}>{fmtShort(data.monthlyFees[i] || 0)}</Text>
                                        <Text style={[styles.feeTableCell, { color: '#dc2626' }]}>{fmtShort(data.monthlyExp[i] || 0)}</Text>
                                        <Text style={[styles.feeTableCell, { color: net >= 0 ? '#059669' : '#dc2626', fontWeight: '800' }]}>{fmtShort(Math.abs(net))}{net < 0 ? '▼' : '▲'}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFF' },
    header: {},
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
    shareBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    netCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 14, marginTop: 12, alignItems: 'center' },
    netLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
    netValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
    netSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    periodRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, marginTop: 12, marginBottom: 4 },
    periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
    periodText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)' },
    tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
    tabText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    scroll: { flex: 1 },
    reportCard: { margin: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
    reportTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginBottom: 2 },
    reportPeriod: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 14 },
    sectionHeader: { padding: '10px 14px' as any, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 4, marginTop: 8 },
    sectionHeaderText: { fontSize: 10, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 },
    plRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    plLabel: { fontSize: 12, color: '#374151', fontWeight: '600', flex: 1 },
    plValue: { fontSize: 13, fontWeight: '700' },
    netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1.5 },
    netRowLabel: { fontSize: 13, fontWeight: '900' },
    netRowValue: { fontSize: 18, fontWeight: '900' },
    expBreakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    expBreakDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    expBreakLabel: { fontSize: 11, fontWeight: '600', color: '#374151', width: 80 },
    expBreakBar: { height: '100%', borderRadius: 99 },
    expBreakAmt: { fontSize: 10, fontWeight: '700', color: '#374151', width: 48, textAlign: 'right' },
    expBreakPct: { fontSize: 10, color: '#94a3b8', width: 30, textAlign: 'right' },
    feeKpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    feeKpiCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
    feeKpiVal: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
    feeKpiLbl: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    feeTable: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    feeTableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
    feeTableHead: { flex: 1, fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', textAlign: 'center' },
    feeTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
    feeTableCell: { flex: 1, fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },
    curricDot: { width: 6, height: 6, borderRadius: 3 },
    ratePill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
});
