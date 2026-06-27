// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Finance Report — Cutting-Edge Financial Analytics
// Fees, Expenses, Payments, Defaulters · Filters · Charts · Grids
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { COLORS, SHADOWS, fmt, fmtFull } from '../../components/ultra/UltraTheme';
import { LineChart, BarChart, DoughnutChart, ProgressBar } from '../../components/ultra/UltraCharts';
import { KPICard, SectionHeader, ChartPanel, FilterBar, TabSwitcher, DataGrid, StatusBadge, LiveBadge } from '../../components/ultra/UltraComponents';
import ScreenHeader from '../../components/ScreenHeader';

const W = Dimensions.get('window').width;
const CW = W - 60;

export default function FinanceReportScreen() {
    const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState({ term: 'All', form: 'All', stream: 'All' });
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [paymentsR, structuresR, studentsR, formsR, streamsR, expensesR] = await Promise.all([
        supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('school_fee_structures').select('*'),
        supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id, stream_id, status, gender'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*'),
        supabase.from('school_expenses').select('*').order('expense_date', { ascending: false }),
      ]);
      const payments = paymentsR.data || [];
      const structures = structuresR.data || [];
      const students = studentsR.data || [];
      const forms = formsR.data || [];
      const streams = streamsR.data || [];
      const expenses = expensesR.data || [];

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

      const perStudentFee = structures.reduce((s: number, f: any) => s + Number(f.amount || 0), 0) || 45000;
      const totalCollected = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const targetAmount = perStudentFee * students.length;
      const feeArrears = Math.max(0, targetAmount - totalCollected);
      const collectionRate = targetAmount > 0 ? Math.round((totalCollected / targetAmount) * 100) : 0;
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      const todayPayments = payments.filter((p: any) => p.payment_date?.startsWith(today));
      const todayCollection = todayPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const weekPayments = payments.filter((p: any) => p.payment_date >= weekAgo);
      const weekCollection = weekPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

      // Monthly trend
      const monthlyFees: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const mo = d.toLocaleString('en', { month: 'short' });
        const y = d.getFullYear(), m = d.getMonth();
        const mP = payments.filter((p: any) => { const pd = new Date(p.payment_date); return pd.getFullYear() === y && pd.getMonth() === m; });
        const mE = expenses.filter((e: any) => { const ed = new Date(e.expense_date); return ed.getFullYear() === y && ed.getMonth() === m; });
        monthlyFees.push({ month: mo, fees: mP.reduce((s: number, p: any) => s + Number(p.amount || 0), 0), expenses: mE.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), target: targetAmount / 12 });
      }

      // Payment methods
      const methodTotals: Record<string, number> = {};
      payments.forEach((p: any) => {
        const m = (p.payment_method || 'Cash');
        const key = m.toLowerCase().includes('pesa') ? 'M-Pesa' : m.toLowerCase().includes('bank') ? 'Bank' : m.toLowerCase().includes('helb') ? 'HELB' : 'Cash';
        methodTotals[key] = (methodTotals[key] || 0) + Number(p.amount || 0);
      });
      const paymentMethods = Object.entries(methodTotals).sort((a, b) => b[1] - a[1]);

      // Form positions
      const studentPaid: Record<number, number> = {};
      payments.forEach((p: any) => { studentPaid[p.student_id] = (studentPaid[p.student_id] || 0) + Number(p.amount || 0); });
      const formPositions = forms.map((f: any) => {
        const fs = students.filter((s: any) => s.form_id === f.id);
        const expected = perStudentFee * fs.length;
        const paid = fs.reduce((s: number, st: any) => s + (studentPaid[st.id] || 0), 0);
        return { form: f.form_name?.replace('Form ', 'F') || `F${f.form_level}`, expected, paid, arrears: Math.max(0, expected - paid), pct: expected > 0 ? Math.round((paid / expected) * 100) : 0 };
      });

      // Expense breakdown
      const expByCat: Record<string, number> = {};
      expenses.forEach((e: any) => { const c = e.category || e.vote_head || 'Other'; expByCat[c] = (expByCat[c] || 0) + Number(e.amount || 0); });
      const expenseBreakdown = Object.entries(expByCat).sort((a, b) => b[1] - a[1]).slice(0, 6);

      // Debtors
      const debtors = students
        .map((s: any) => {
          const paid = studentPaid[s.id] || 0;
          const balance = Math.max(0, perStudentFee - paid);
          const form = forms.find((f: any) => f.id === s.form_id);
          const stream = streams.find((st: any) => st.id === s.stream_id);
          const lastPayment = payments.filter((p: any) => p.student_id === s.id)[0];
          const daysSince = lastPayment ? Math.floor((now.getTime() - new Date(lastPayment.payment_date).getTime()) / 86400000) : 90;
          return {
            admNo: s.admission_number || `${s.id}`,
            student: `${s.last_name || ''}, ${s.first_name || ''}`,
            form: form?.form_name || '—',
            stream: stream?.stream_name || '',
            invoiced: perStudentFee, paid, balance, days: daysSince,
            status: balance > 20000 ? 'Critical' : daysSince > 60 ? 'Overdue' : balance > 0 ? 'Notice Sent' : 'Cleared',
          };
        })
        .filter((d: any) => d.balance > 0)
        .sort((a: any, b: any) => b.balance - a.balance);

      // Latest payments for grid
      const latestPayments = payments.slice(0, 20).map((p: any) => {
        const st = students.find((s: any) => s.id === p.student_id);
        const form = forms.find((f: any) => f.id === st?.form_id);
        return {
          date: p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—',
          admNo: st?.admission_number || '—',
          student: st ? `${st.last_name}, ${st.first_name}` : 'Unknown',
          form: form?.form_name || '—',
          amount: Number(p.amount || 0),
          method: (p.payment_method || 'Cash').includes('pesa') ? 'M-Pesa' : (p.payment_method || 'Cash'),
          reference: p.mpesa_reference || p.bank_reference || '—',
          receipt: p.receipt_number || `APM-${String(p.id || 0).padStart(4, '0')}`,
        };
      });

      // Latest expenses
      const latestExpenses = expenses.slice(0, 15).map((e: any) => ({
        date: e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—',
        description: e.description || e.item_name || '—',
        category: e.category || e.vote_head || 'Other',
        amount: Number(e.amount || 0),
        status: e.status || 'Approved',
      }));

      setData({
        todayCollection, weekCollection, totalCollected, feeArrears, collectionRate,
        totalExpenses, netPosition: totalCollected - totalExpenses,
        criticalDebtors: debtors.filter((d: any) => d.status === 'Critical').length,
        todayCount: todayPayments.length, targetAmount,
        monthlyFees, paymentMethods, formPositions, expenseBreakdown,
        debtors, latestPayments, latestExpenses,
        formNames: forms.map((f: any) => f.form_name || `Form ${f.form_level}`),
        streamNames: streams.map((s: any) => s.stream_name),
      });
    } catch (e) { console.error('Finance fetch error:', e); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <View style={styles.loadingWrap}>
      <LinearGradient colors={['#f8fafc', '#ecfdf5']} style={styles.loadingBg}>
        <Text style={{ fontSize: 32 }}>💰</Text>
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 12 }} />
        <Text style={styles.loadingText}>Loading Finance Analytics...</Text>
      </LinearGradient>
    </View>
  );
  if (!data) return null;

  // Filter options
  const filterConfig = [
    { key: 'term', label: 'Term', options: ['All', 'Term 1', 'Term 2', 'Term 3'], value: filters.term },
    { key: 'form', label: 'Form', options: ['All', ...data.formNames], value: filters.form },
    { key: 'stream', label: 'Stream', options: ['All', ...data.streamNames], value: filters.stream },
  ];

  // Filter debtors by search
  const filteredDebtors = search
    ? data.debtors.filter((d: any) => d.admNo.toLowerCase().includes(search.toLowerCase()) || d.student.toLowerCase().includes(search.toLowerCase()))
    : data.debtors;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" translucent={false} />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.green]} />} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Header */}
        <ScreenHeader
                title="💰 Finance Report"
                onBack={() => navigation.goBack()}
                gradient={['#0D9488','#059669']}
            />

        <View style={styles.content}>
          {/* Filters */}
          <FilterBar filters={filterConfig} onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} showSearch searchPlaceholder="Search admission no or name..." onSearch={setSearch} />

          {/* Tabs */}
          <TabSwitcher
            tabs={[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'payments', label: 'Payments', icon: '💳' },
              { key: 'expenses', label: 'Expenses', icon: '💸' },
              { key: 'defaulters', label: 'Defaulters', icon: '⚠️' },
            ]}
            active={tab} onChange={setTab}
          />

          {/* ══ OVERVIEW TAB ══ */}
          {tab === 'overview' && <>
            <View style={styles.kpiGrid}>
              {[
                { label: "Today's Collection", value: fmt(data.todayCollection), icon: '📅', color: COLORS.green, sub: `${data.todayCount} payments`, trend: `${data.todayCount}`, trendUp: true },
                { label: 'Week Collection', value: fmt(data.weekCollection), icon: '📆', color: COLORS.blue, sub: 'Last 7 days' },
                { label: 'Total Collected', value: fmt(data.totalCollected), icon: '💰', color: COLORS.purple, sub: `${data.collectionRate}% of target`, progress: data.collectionRate },
                { label: 'Fee Arrears', value: fmt(data.feeArrears), icon: '⚠️', color: COLORS.amber, sub: 'Outstanding balance', trend: 'Due', trendUp: false },
                { label: 'Collection Rate', value: `${data.collectionRate}%`, icon: '🎯', color: COLORS.indigo, sub: `Target: ${fmt(data.targetAmount)}`, progress: data.collectionRate },
                { label: 'Total Expenses', value: fmt(data.totalExpenses), icon: '💸', color: COLORS.red, sub: `${data.latestExpenses.length} entries` },
                { label: 'Net Position', value: fmt(data.netPosition), icon: '📊', color: data.netPosition >= 0 ? COLORS.cyan : COLORS.red, sub: data.netPosition >= 0 ? 'Surplus' : 'Deficit', trend: data.netPosition >= 0 ? 'Surplus' : 'Deficit', trendUp: data.netPosition >= 0 },
                { label: 'Critical Debtors', value: data.criticalDebtors, icon: '🚨', color: COLORS.red, sub: `${data.debtors.length} total debtors`, trend: `${data.criticalDebtors}`, trendUp: false },
              ].map((c, i) => <View key={i} style={styles.kpiItem}><KPICard {...c} compact /></View>)}
            </View>

            <ChartPanel title="📈 Fee Collection Trend" subtitle="Last 6 months">
              <LineChart data={[data.monthlyFees.map((m: any) => m.fees), data.monthlyFees.map((m: any) => m.target)]} labels={data.monthlyFees.map((m: any) => m.month)} colors={[COLORS.purple, '#10b981']} width={CW} height={180} formatY={(v: number) => v >= 1000000 ? `${(v/1e6).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
            </ChartPanel>

            <View style={styles.chartRow}>
              <ChartPanel title="💳 Payment Methods" style={{ flex: 1 }}>
                <DoughnutChart data={data.paymentMethods.map((m: any) => m[1])} colors={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']} labels={data.paymentMethods.map((m: any) => m[0])} size={110} strokeWidth={14} centerValue={data.paymentMethods.length.toString()} centerLabel="Methods" />
              </ChartPanel>
              <ChartPanel title="📊 Fee by Form" style={{ flex: 1 }}>
                {data.formPositions.map((f: any, i: number) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>{f.form}</Text>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.purple }}>{f.pct}%</Text>
                    </View>
                    <ProgressBar value={f.pct} color={f.pct >= 80 ? '#10b981' : f.pct >= 50 ? '#f59e0b' : '#ef4444'} height={5} showLabel={false} />
                  </View>
                ))}
              </ChartPanel>
            </View>
          </>}

          {/* ══ PAYMENTS TAB ══ */}
          {tab === 'payments' && <>
            <SectionHeader title="Recent Payments" subtitle={`${data.latestPayments.length} records`} icon="💳" />
            <DataGrid
              columns={[
                { key: 'date', label: 'Date', width: 65 },
                { key: 'admNo', label: 'Adm No', width: 70 },
                { key: 'student', label: 'Student', width: 120 },
                { key: 'form', label: 'Form', width: 70 },
                { key: 'amount', label: 'Amount', width: 80, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>{fmt(v)}</Text> },
                { key: 'method', label: 'Method', width: 65, render: (v: string) => <View style={[styles.methodBadge, { backgroundColor: v === 'M-Pesa' ? '#dcfce7' : v === 'Bank' ? '#dbeafe' : '#fef9c3' }]}><Text style={{ fontSize: 8, fontWeight: '700', color: v === 'M-Pesa' ? '#16a34a' : v === 'Bank' ? '#2563eb' : '#ca8a04' }}>{v}</Text></View> },
                { key: 'reference', label: 'Ref', width: 80 },
              ]}
              data={data.latestPayments}
            />
          </>}

          {/* ══ EXPENSES TAB ══ */}
          {tab === 'expenses' && <>
            <ChartPanel title="💸 Expense Breakdown" subtitle="By category">
              <DoughnutChart data={data.expenseBreakdown.map((e: any) => e[1])} colors={['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899']} labels={data.expenseBreakdown.map((e: any) => e[0])} size={130} strokeWidth={18} centerValue={fmt(data.totalExpenses)} centerLabel="Total" />
            </ChartPanel>
            <SectionHeader title="Recent Expenses" icon="📋" />
            <DataGrid
              columns={[
                { key: 'date', label: 'Date', width: 65 },
                { key: 'description', label: 'Description', width: 140 },
                { key: 'category', label: 'Category', width: 90 },
                { key: 'amount', label: 'Amount', width: 85, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>{fmt(v)}</Text> },
                { key: 'status', label: 'Status', width: 75, render: (v: string) => <StatusBadge status={v} /> },
              ]}
              data={data.latestExpenses}
            />
          </>}

          {/* ══ DEFAULTERS TAB ══ */}
          {tab === 'defaulters' && <>
            <ChartPanel title="📊 Fee Arrears by Form">
              <BarChart data={[data.formPositions.map((f: any) => f.arrears)]} labels={data.formPositions.map((f: any) => f.form)} colors={['#ef4444']} width={CW} height={150} formatY={(v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
            </ChartPanel>
            <SectionHeader title="Aged Debtors" subtitle={`${filteredDebtors.length} students`} icon="⚠️" />
            <DataGrid
              columns={[
                { key: 'admNo', label: 'Adm No', width: 70 },
                { key: 'student', label: 'Student', width: 120 },
                { key: 'form', label: 'Form', width: 70 },
                { key: 'invoiced', label: 'Invoiced', width: 75, align: 'right', render: (v: number) => <Text style={{ fontSize: 10, color: '#475569' }}>{fmt(v)}</Text> },
                { key: 'paid', label: 'Paid', width: 70, align: 'right', render: (v: number) => <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>{fmt(v)}</Text> },
                { key: 'balance', label: 'Balance', width: 80, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '800', color: '#ef4444' }}>{fmt(v)}</Text> },
                { key: 'days', label: 'Days', width: 45, align: 'center' },
                { key: 'status', label: 'Status', width: 80, render: (v: string) => <StatusBadge status={v} /> },
              ]}
              data={filteredDebtors.slice(0, 30)}
            />
          </>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  loadingWrap: { flex: 1 },
  loadingBg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 10 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiItem: { width: (W - 40) / 2 },
  chartRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  methodBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
});
