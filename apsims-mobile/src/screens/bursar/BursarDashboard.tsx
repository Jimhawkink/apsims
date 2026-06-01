import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    RefreshControl, ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';

const { width: W } = Dimensions.get('window');
const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const fmtShort = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n || 0);

// ─── Mini Sparkline ─────────────────────────────────────────────
function MiniBar({ values, color }: { values: number[]; color: string }) {
    if (!values.length) return null;
    const max = Math.max(...values, 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 24 }}>
            {values.map((v, i) => (
                <View key={i} style={{
                    width: 6, height: Math.max(3, (v / max) * 24),
                    backgroundColor: color, borderRadius: 2,
                    opacity: i === values.length - 1 ? 1 : 0.4 + (i / values.length) * 0.4,
                }} />
            ))}
        </View>
    );
}

// ─── KPI Card ───────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, bg, sparkValues, trend, onPress }: {
    icon: string; label: string; value: string; sub?: string;
    color: string; bg: string; sparkValues?: number[];
    trend?: number; onPress?: () => void;
}) {
    const trendUp = (trend ?? 0) >= 0;
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.kpiCard, { borderColor: color + '22' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                </View>
                {sparkValues && sparkValues.length > 1 && (
                    <MiniBar values={sparkValues} color={color} />
                )}
            </View>
            <Text style={[styles.kpiValue, { color: '#0f172a' }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
            {sub && <Text style={styles.kpiSub}>{sub}</Text>}
            {trend !== undefined && (
                <View style={[styles.trendBadge, { backgroundColor: trendUp ? '#f0fdf4' : '#fef2f2' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: trendUp ? '#16a34a' : '#dc2626' }}>
                        {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Quick Action Button ─────────────────────────────────────────
function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: color + '18' }]}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

// ─── Transaction Row ─────────────────────────────────────────────
function TxRow({ tx }: { tx: any }) {
    const isIn = tx.type === 'income' || tx.type === 'fee';
    return (
        <View style={styles.txRow}>
            <View style={[styles.txDot, { backgroundColor: isIn ? '#10b981' : '#ef4444' }]} />
            <View style={{ flex: 1 }}>
                <Text style={styles.txName} numberOfLines={1}>{tx.name}</Text>
                <Text style={styles.txSub}>{tx.sub} · {tx.date}</Text>
            </View>
            <Text style={[styles.txAmount, { color: isIn ? '#10b981' : '#ef4444' }]}>
                {isIn ? '+' : '-'}{fmt(tx.amount)}
            </Text>
        </View>
    );
}

export default function BursarDashboard() {
    const navigation = useNavigation<any>();
    const { session } = useSession();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const [kpi, setKpi] = useState({
        feesCollected: 0, feesExpected: 0, feeBalance: 0, collectionRate: 0,
        expenses: 0, income: 0, netPosition: 0,
        todayFees: 0, thisWeekFees: 0, thisMonthFees: 0,
        defaulters: 0, clearedStudents: 0, totalStudents: 0,
    });
    const [monthlyTrend, setMonthlyTrend] = useState<number[]>([]);
    const [recentTx, setRecentTx] = useState<any[]>([]);
    const [schoolName, setSchoolName] = useState('APSIMS School');
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
    const monthStart = new Date(currentYear, new Date().getMonth(), 1).toISOString().split('T')[0];

    const fetchData = useCallback(async () => {
        try {
            const [
                { data: payments },
                { data: structures },
                { data: students },
                { data: expenses },
                { data: income },
                { data: school },
            ] = await Promise.all([
                supabase.from('school_fee_payments').select('id,amount,payment_date,payment_method,student_id').eq('year', currentYear).order('payment_date', { ascending: false }),
                supabase.from('school_fee_structures').select('amount,form_id').eq('year', currentYear),
                supabase.from('school_students').select('id,form_id,status').eq('status', 'Active'),
                supabase.from('school_expenses').select('amount,expense_date,category,status').eq('year', currentYear),
                supabase.from('school_income').select('amount,income_date,source').eq('year', currentYear),
                supabase.from('school_details').select('school_name').single(),
            ]);

            if (school?.school_name) setSchoolName(school.school_name);

            const pays = payments || [];
            const structs = structures || [];
            const studs = students || [];
            const exps = expenses || [];
            const incs = income || [];

            const feesCollected = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
            const totalStuds = studs.length;
            const avgFees = totalStuds > 0 ? structs.reduce((s, st) => s + Number(st.amount || 0), 0) / Math.max(1, [...new Set(structs.map(s => s.form_id))].length) : 0;
            const feesExpected = avgFees * totalStuds;
            const feeBalance = Math.max(0, feesExpected - feesCollected);
            const collectionRate = feesExpected > 0 ? Math.round((feesCollected / feesExpected) * 100) : 0;

            const todayFees = pays.filter(p => p.payment_date?.startsWith(today)).reduce((s, p) => s + Number(p.amount || 0), 0);
            const thisWeekFees = pays.filter(p => p.payment_date >= weekStart).reduce((s, p) => s + Number(p.amount || 0), 0);
            const thisMonthFees = pays.filter(p => p.payment_date >= monthStart).reduce((s, p) => s + Number(p.amount || 0), 0);

            const totalExpenses = exps.filter(e => e.status !== 'rejected').reduce((s, e) => s + Number(e.amount || 0), 0);
            const totalIncome = incs.reduce((s, i) => s + Number(i.amount || 0), 0);

            // Monthly trend (last 6 months)
            const months: number[] = [];
            for (let m = 5; m >= 0; m--) {
                const d = new Date(); d.setMonth(d.getMonth() - m);
                const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                months.push(pays.filter(p => p.payment_date?.startsWith(prefix)).reduce((s, p) => s + Number(p.amount || 0), 0));
            }
            setMonthlyTrend(months);

            // Per-student payment map for defaulters
            const paidByStudent = new Map<number, number>();
            pays.forEach(p => paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) || 0) + Number(p.amount || 0)));
            const defaulters = studs.filter(s => !paidByStudent.has(s.id) || paidByStudent.get(s.id)! < avgFees * 0.5).length;
            const cleared = studs.filter(s => (paidByStudent.get(s.id) || 0) >= avgFees * 0.9).length;

            setKpi({
                feesCollected, feesExpected, feeBalance, collectionRate,
                expenses: totalExpenses, income: feesCollected + totalIncome,
                netPosition: (feesCollected + totalIncome) - totalExpenses,
                todayFees, thisWeekFees, thisMonthFees,
                defaulters, clearedStudents: cleared, totalStudents: totalStuds,
            });

            // Recent transactions
            const txFees = pays.slice(0, 5).map(p => ({ type: 'fee', name: `Fee Payment`, sub: p.payment_method || 'Cash', amount: Number(p.amount), date: p.payment_date?.slice(0, 10) || '' }));
            const txExp = exps.slice(0, 3).map(e => ({ type: 'expense', name: e.category || 'Expense', sub: 'Expenditure', amount: Number(e.amount), date: e.expense_date?.slice(0, 10) || '' }));
            const allTx = [...txFees, ...txExp].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
            setRecentTx(allTx);

        } catch (e) { console.error(e); }
        finally {
            setLoading(false); setRefreshing(false);
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
    }, [currentYear, today, weekStart, monthStart]);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    if (loading) return (
        <LinearGradient colors={['#0c4a6e', '#0891b2', '#06b6d4']} style={styles.loadWrap}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Loading Bursar Dashboard…</Text>
        </LinearGradient>
    );

    const collPct = Math.min(100, kpi.collectionRate);

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />}>

                {/* ── HERO HEADER ── */}
                <LinearGradient colors={['#0c4a6e', '#0891b2', '#0e7490']} style={styles.hero}>
                    <View style={styles.heroOrb1} /><View style={styles.heroOrb2} />
                    <View style={styles.heroContent}>
                        <View>
                            <Text style={styles.heroGreeting}>🏦 Bursar Portal</Text>
                            <Text style={styles.heroName}>{schoolName}</Text>
                            <Text style={styles.heroSub}>Financial Year {currentYear} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                        </View>
                        <View style={styles.heroBadge}>
                            <Text style={styles.heroBadgeText}>{collPct}%</Text>
                            <Text style={styles.heroBadgeSub}>Collected</Text>
                        </View>
                    </View>

                    {/* Collection progress bar */}
                    <View style={{ marginTop: 14, paddingHorizontal: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' }}>Fee Collection Progress</Text>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{fmt(kpi.feesCollected)} / {fmt(kpi.feesExpected)}</Text>
                        </View>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${collPct}%` as any }]} />
                        </View>
                    </View>

                    {/* Today / Week / Month strip */}
                    <View style={styles.heroStrip}>
                        {[
                            { l: "Today's Fees", v: fmt(kpi.todayFees) },
                            { l: 'This Week', v: fmt(kpi.thisWeekFees) },
                            { l: 'This Month', v: fmt(kpi.thisMonthFees) },
                        ].map((s, i) => (
                            <View key={i} style={[styles.heroStripItem, i < 2 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text style={styles.heroStripVal}>{s.v}</Text>
                                <Text style={styles.heroStripLbl}>{s.l}</Text>
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                <View style={styles.body}>
                    {/* ── KPI GRID ── */}
                    <Text style={styles.sectionTitle}>📊 Financial Overview</Text>
                    <View style={styles.kpiGrid}>
                        <KpiCard icon="💰" label="Fees Collected" value={`KES ${fmtShort(kpi.feesCollected)}`}
                            sub={`${kpi.collectionRate}% collection rate`} color="#10b981" bg="#f0fdf4"
                            sparkValues={monthlyTrend} trend={monthlyTrend.length >= 2 ? Math.round(((monthlyTrend[monthlyTrend.length - 1] - monthlyTrend[monthlyTrend.length - 2]) / Math.max(1, monthlyTrend[monthlyTrend.length - 2])) * 100) : 0}
                            onPress={() => navigation.navigate('Fees')} />
                        <KpiCard icon="⚠️" label="Outstanding Balance" value={`KES ${fmtShort(kpi.feeBalance)}`}
                            sub={`${kpi.defaulters} defaulters`} color="#ef4444" bg="#fef2f2"
                            onPress={() => navigation.navigate('Fees')} />
                        <KpiCard icon="📉" label="Total Expenses" value={`KES ${fmtShort(kpi.expenses)}`}
                            sub="Approved expenses" color="#f59e0b" bg="#fffbeb"
                            onPress={() => navigation.navigate('Expenses')} />
                        <KpiCard icon="📈" label="Net Position" value={`KES ${fmtShort(Math.abs(kpi.netPosition))}`}
                            sub={kpi.netPosition >= 0 ? '✅ Surplus' : '⚠️ Deficit'} color={kpi.netPosition >= 0 ? '#6366f1' : '#dc2626'} bg={kpi.netPosition >= 0 ? '#eef2ff' : '#fef2f2'}
                            onPress={() => navigation.navigate('Reports')} />
                    </View>

                    {/* ── STUDENT FEE STATUS ── */}
                    <Text style={styles.sectionTitle}>👨‍🎓 Student Fee Status</Text>
                    <View style={styles.statusRow}>
                        {[
                            { l: 'Total Students', v: kpi.totalStudents, color: '#6366f1', bg: '#eef2ff', icon: '👥' },
                            { l: 'Cleared', v: kpi.clearedStudents, color: '#10b981', bg: '#f0fdf4', icon: '✅' },
                            { l: 'Defaulters', v: kpi.defaulters, color: '#ef4444', bg: '#fef2f2', icon: '⚠️' },
                        ].map((s, i) => (
                            <View key={i} style={[styles.statusCard, { backgroundColor: s.bg, borderColor: s.color + '30' }]}>
                                <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                                <Text style={[styles.statusVal, { color: s.color }]}>{s.v}</Text>
                                <Text style={styles.statusLbl}>{s.l}</Text>
                            </View>
                        ))}
                    </View>

                    {/* ── QUICK ACTIONS ── */}
                    <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
                    <View style={styles.quickGrid}>
                        <QuickAction icon="💳" label="Collect Fee" color="#10b981" onPress={() => navigation.navigate('Fees')} />
                        <QuickAction icon="📝" label="Add Expense" color="#ef4444" onPress={() => navigation.navigate('Expenses')} />
                        <QuickAction icon="💵" label="Record Income" color="#6366f1" onPress={() => navigation.navigate('Income')} />
                        <QuickAction icon="📊" label="P&L Report" color="#f59e0b" onPress={() => navigation.navigate('Reports')} />
                        <QuickAction icon="📱" label="Send Reminders" color="#0891b2" onPress={() => {}} />
                        <QuickAction icon="📥" label="Export Data" color="#7c3aed" onPress={() => {}} />
                    </View>

                    {/* ── MONTHLY TREND ── */}
                    <Text style={styles.sectionTitle}>📈 6-Month Fee Collection Trend</Text>
                    <View style={styles.trendCard}>
                        {monthlyTrend.length > 0 && (() => {
                            const max = Math.max(...monthlyTrend, 1);
                            const months = ['', '', '', '', '', ''].map((_, i) => {
                                const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
                                return d.toLocaleDateString('en', { month: 'short' });
                            });
                            return (
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, paddingHorizontal: 4 }}>
                                        {monthlyTrend.map((v, i) => {
                                            const h = Math.max(6, (v / max) * 70);
                                            const isLast = i === monthlyTrend.length - 1;
                                            return (
                                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>{fmtShort(v)}</Text>
                                                    <View style={{ width: '100%', height: h, borderRadius: 5, backgroundColor: isLast ? '#0891b2' : '#e0f2fe' }} />
                                                </View>
                                            );
                                        })}
                                    </View>
                                    <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginTop: 6 }}>
                                        {months.map((m, i) => (
                                            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#94a3b8', fontWeight: '600' }}>{m}</Text>
                                        ))}
                                    </View>
                                </View>
                            );
                        })()}
                    </View>

                    {/* ── RECENT TRANSACTIONS ── */}
                    <Text style={styles.sectionTitle}>🕐 Recent Transactions</Text>
                    <View style={styles.txCard}>
                        {recentTx.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>No transactions yet</Text>
                        ) : recentTx.map((tx, i) => <TxRow key={i} tx={tx} />)}
                        <TouchableOpacity onPress={() => navigation.navigate('Reports')} style={styles.viewAllBtn}>
                            <Text style={styles.viewAllText}>View All Transactions →</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── PAYMENT METHODS BREAKDOWN ── */}
                    <Text style={styles.sectionTitle}>💳 Payment Method Summary</Text>
                    <View style={styles.methodsCard}>
                        {[
                            { method: 'Cash', icon: '💵', color: '#10b981' },
                            { method: 'M-Pesa', icon: '📱', color: '#16a34a' },
                            { method: 'Bank Transfer', icon: '🏦', color: '#2563eb' },
                            { method: 'Cheque', icon: '📝', color: '#d97706' },
                        ].map((m, i) => (
                            <View key={i} style={styles.methodRow}>
                                <Text style={{ fontSize: 18 }}>{m.icon}</Text>
                                <Text style={styles.methodName}>{m.method}</Text>
                                <View style={{ flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 99, marginHorizontal: 10 }}>
                                    <View style={{ width: `${25 + i * 15}%` as any, height: '100%', backgroundColor: m.color, borderRadius: 99 }} />
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: m.color }}>—</Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 30 }} />
                </View>
            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hero: { paddingTop: 56, paddingBottom: 0 },
    heroOrb1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
    heroOrb2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 40, left: -40 },
    heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20 },
    heroGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
    heroName: { fontSize: 20, color: '#fff', fontWeight: '900', marginTop: 2 },
    heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
    heroBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 12, minWidth: 64 },
    heroBadgeText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    heroBadgeSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: 2 },
    progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#34d399', borderRadius: 99 },
    heroStrip: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
    heroStripItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    heroStripVal: { fontSize: 13, fontWeight: '900', color: '#fff' },
    heroStripLbl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },
    body: { padding: 16, gap: 4 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 16, marginBottom: 10 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpiCard: {
        width: (W - 48) / 2, backgroundColor: '#fff',
        borderRadius: 16, padding: 14, borderWidth: 1.5,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    kpiIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    kpiValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    kpiSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
    trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
    statusRow: { flexDirection: 'row', gap: 10 },
    statusCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, gap: 4 },
    statusVal: { fontSize: 22, fontWeight: '900' },
    statusLbl: { fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickAction: { width: (W - 52) / 3, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    quickActionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickActionLabel: { fontSize: 10, fontWeight: '700', color: '#374151', textAlign: 'center' },
    trendCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    txCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    txDot: { width: 8, height: 8, borderRadius: 4 },
    txName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    txSub: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
    txAmount: { fontSize: 13, fontWeight: '800' },
    viewAllBtn: { padding: 14, alignItems: 'center' },
    viewAllText: { fontSize: 12, fontWeight: '700', color: '#0891b2' },
    methodsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    methodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    methodName: { fontSize: 12, fontWeight: '600', color: '#374151', width: 90 },
});
