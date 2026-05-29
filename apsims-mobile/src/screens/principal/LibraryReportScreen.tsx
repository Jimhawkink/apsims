// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Library Report — Book & Lending Analytics
// Availability · Categories · Overdue · Transactions
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { COLORS, fmt } from '../../components/ultra/UltraTheme';
import { BarChart, DoughnutChart, LineChart } from '../../components/ultra/UltraCharts';
import { KPICard, SectionHeader, ChartPanel, TabSwitcher, DataGrid, StatusBadge, FilterBar } from '../../components/ultra/UltraComponents';

const W = Dimensions.get('window').width;
const CW = W - 60;

export default function LibraryReportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [booksR, loansR, studentsR, formsR] = await Promise.all([
        supabase.from('school_library_books').select('*'),
        supabase.from('school_library_loans').select('*').order('created_at', { ascending: false }),
        supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id').eq('status', 'Active'),
        supabase.from('school_forms').select('*').order('form_level'),
      ]);
      const books = booksR.data || [];
      const loans = loansR.data || [];
      const students = studentsR.data || [];
      const forms = formsR.data || [];

      const totalBooks = books.length;
      const totalCopies = books.reduce((s: number, b: any) => s + Number(b.copies || b.total_copies || 1), 0);
      const availableCopies = books.reduce((s: number, b: any) => s + Number(b.available_copies || b.copies || 1), 0);
      const lentOut = totalCopies - availableCopies;
      const now = new Date();
      const overdueLoans = loans.filter((l: any) => !l.returned_at && l.due_date && new Date(l.due_date) < now);
      const activeLoans = loans.filter((l: any) => !l.returned_at);
      const totalTransactions = loans.length;

      // Category breakdown
      const catCounts: Record<string, number> = {};
      books.forEach((b: any) => { const c = b.category || b.genre || 'General'; catCounts[c] = (catCounts[c] || 0) + 1; });
      const catBreakdown = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

      // Monthly lending trend
      const monthlyLoans: { month: string; issued: number; returned: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const mo = d.toLocaleString('en', { month: 'short' });
        const y = d.getFullYear(), m = d.getMonth();
        const mIssued = loans.filter((l: any) => { const ld = new Date(l.created_at || l.issued_at); return ld.getFullYear() === y && ld.getMonth() === m; }).length;
        const mReturned = loans.filter((l: any) => l.returned_at && (() => { const rd = new Date(l.returned_at); return rd.getFullYear() === y && rd.getMonth() === m; })()).length;
        monthlyLoans.push({ month: mo, issued: mIssued, returned: mReturned });
      }

      // Overdue books detail
      const overdueDetails = overdueLoans.slice(0, 20).map((l: any) => {
        const book = books.find((b: any) => b.id === l.book_id);
        const student = students.find((s: any) => s.id === l.student_id);
        const form = student ? forms.find((f: any) => f.id === student.form_id) : null;
        const daysOverdue = l.due_date ? Math.floor((now.getTime() - new Date(l.due_date).getTime()) / 86400000) : 0;
        return {
          book: book?.title || book?.book_title || '—',
          admNo: student?.admission_number || '—',
          student: student ? `${student.last_name}, ${student.first_name}` : '—',
          form: form?.form_name || '—',
          dueDate: l.due_date ? new Date(l.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—',
          daysOverdue,
          status: daysOverdue > 30 ? 'Critical' : daysOverdue > 14 ? 'Overdue' : 'Notice Sent',
        };
      });

      // Recent transactions
      const recentLoans = loans.slice(0, 20).map((l: any) => {
        const book = books.find((b: any) => b.id === l.book_id);
        const student = students.find((s: any) => s.id === l.student_id);
        return {
          date: (l.created_at || l.issued_at) ? new Date(l.created_at || l.issued_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—',
          book: book?.title || book?.book_title || '—',
          admNo: student?.admission_number || '—',
          student: student ? `${student.last_name}, ${student.first_name}` : '—',
          type: l.returned_at ? 'Return' : 'Issue',
          dueDate: l.due_date ? new Date(l.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—',
        };
      });

      // Most borrowed books
      const bookBorrows: Record<number, number> = {};
      loans.forEach((l: any) => { bookBorrows[l.book_id] = (bookBorrows[l.book_id] || 0) + 1; });
      const popularBooks = Object.entries(bookBorrows)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([id, count]) => {
          const book = books.find((b: any) => b.id === Number(id));
          return { title: book?.title || book?.book_title || '—', category: book?.category || book?.genre || '—', borrows: count as number, available: Number(book?.available_copies || 0) };
        });

      setData({
        totalBooks, totalCopies, availableCopies, lentOut, overdueCount: overdueLoans.length,
        activeLoansCount: activeLoans.length, totalTransactions,
        availabilityPct: totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0,
        catBreakdown, monthlyLoans, overdueDetails, recentLoans, popularBooks,
      });
    } catch (e) { console.error('Library fetch:', e); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <View style={{ flex: 1 }}><LinearGradient colors={['#f8fafc', '#eff6ff']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 32 }}>📖</Text>
      <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 12 }} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>Loading Library Analytics...</Text>
    </LinearGradient></View>
  );
  if (!data) return null;

  const filteredOverdue = search
    ? data.overdueDetails.filter((d: any) => d.admNo.toLowerCase().includes(search.toLowerCase()) || d.student.toLowerCase().includes(search.toLowerCase()))
    : data.overdueDetails;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.blue]} />} contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={['#2563eb', '#3b82f6', '#60a5fa']} style={styles.header}>
          <Text style={styles.headerTitle}>📖 Library Report</Text>
          <Text style={styles.headerSub}>Book availability · Lending analytics · Overdue tracking</Text>
        </LinearGradient>

        <View style={styles.content}>
          <TabSwitcher tabs={[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'transactions', label: 'Transactions', icon: '🔄' },
            { key: 'overdue', label: 'Overdue', icon: '⚠️' },
            { key: 'popular', label: 'Popular', icon: '⭐' },
          ]} active={tab} onChange={setTab} />

          {tab === 'overview' && <>
            <View style={styles.kpiGrid}>
              {[
                { label: 'Total Titles', value: data.totalBooks, icon: '📚', color: COLORS.blue, sub: `${data.totalCopies} total copies` },
                { label: 'Available', value: data.availableCopies, icon: '✅', color: COLORS.green, sub: `${data.availabilityPct}% available`, progress: data.availabilityPct },
                { label: 'Lent Out', value: data.lentOut, icon: '📤', color: COLORS.purple, sub: `${data.activeLoansCount} active loans` },
                { label: 'Overdue', value: data.overdueCount, icon: '⚠️', color: COLORS.red, sub: 'Books not returned', trend: `${data.overdueCount}`, trendUp: false },
              ].map((c, i) => <View key={i} style={styles.kpiItem}><KPICard {...c} compact /></View>)}
            </View>

            <View style={styles.chartRow}>
              <ChartPanel title="📖 Availability" style={{ flex: 1 }}>
                <DoughnutChart data={[data.availableCopies, data.lentOut]} colors={['#10b981', '#6366f1']} labels={['Available', 'Lent Out']} size={110} strokeWidth={14} centerValue={`${data.availabilityPct}%`} centerLabel="Available" />
              </ChartPanel>
              <ChartPanel title="📚 By Category" style={{ flex: 1 }}>
                <DoughnutChart data={data.catBreakdown.slice(0, 5).map((c: any) => c[1])} colors={COLORS.chart.slice(0, 5)} labels={data.catBreakdown.slice(0, 5).map((c: any) => c[0])} size={110} strokeWidth={14} centerValue={`${data.catBreakdown.length}`} centerLabel="Categories" />
              </ChartPanel>
            </View>

            <ChartPanel title="📈 Monthly Lending Trend" subtitle="Last 6 months">
              <LineChart
                data={[data.monthlyLoans.map((m: any) => m.issued), data.monthlyLoans.map((m: any) => m.returned)]}
                labels={data.monthlyLoans.map((m: any) => m.month)}
                colors={[COLORS.blue, '#10b981']}
                width={CW} height={160}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: COLORS.blue }} />
                  <Text style={{ fontSize: 9, color: '#64748b' }}>Issued</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: '#10b981' }} />
                  <Text style={{ fontSize: 9, color: '#64748b' }}>Returned</Text>
                </View>
              </View>
            </ChartPanel>
          </>}

          {tab === 'transactions' && <>
            <SectionHeader title="Recent Transactions" subtitle={`${data.recentLoans.length} records`} icon="🔄" />
            <DataGrid columns={[
              { key: 'date', label: 'Date', width: 60 },
              { key: 'book', label: 'Book', width: 130 },
              { key: 'admNo', label: 'Adm No', width: 65 },
              { key: 'student', label: 'Student', width: 110 },
              { key: 'type', label: 'Type', width: 55, render: (v: string) => <View style={{ backgroundColor: v === 'Return' ? '#dcfce7' : '#dbeafe', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 8, fontWeight: '700', color: v === 'Return' ? '#16a34a' : '#2563eb' }}>{v}</Text></View> },
              { key: 'dueDate', label: 'Due', width: 60 },
            ]} data={data.recentLoans} />
          </>}

          {tab === 'overdue' && <>
            <FilterBar filters={[]} onFilterChange={() => {}} showSearch searchPlaceholder="Search admission no or name..." onSearch={setSearch} />
            <SectionHeader title="⚠️ Overdue Books" subtitle={`${filteredOverdue.length} overdue`} icon="📕" />
            <DataGrid columns={[
              { key: 'book', label: 'Book', width: 120 },
              { key: 'admNo', label: 'Adm No', width: 65 },
              { key: 'student', label: 'Student', width: 110 },
              { key: 'form', label: 'Form', width: 60 },
              { key: 'dueDate', label: 'Due', width: 55 },
              { key: 'daysOverdue', label: 'Days', width: 40, align: 'center', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '800', color: v > 30 ? '#ef4444' : '#f59e0b' }}>{v}</Text> },
              { key: 'status', label: 'Status', width: 80, render: (v: string) => <StatusBadge status={v} /> },
            ]} data={filteredOverdue} />
          </>}

          {tab === 'popular' && <>
            <ChartPanel title="⭐ Most Borrowed Books">
              <BarChart data={[data.popularBooks.map((b: any) => b.borrows)]} labels={data.popularBooks.map((b: any) => b.title.substring(0, 12))} colors={COLORS.chart.slice(0, 10)} width={CW} height={180} horizontal />
            </ChartPanel>
            <SectionHeader title="Popular Books Details" icon="📋" />
            <DataGrid columns={[
              { key: 'title', label: 'Book Title', width: 140 },
              { key: 'category', label: 'Category', width: 80 },
              { key: 'borrows', label: 'Borrows', width: 60, align: 'center', render: (v: number) => <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.purple }}>{v}</Text> },
              { key: 'available', label: 'Avail', width: 50, align: 'center', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '700', color: v > 0 ? '#059669' : '#ef4444' }}>{v}</Text> },
            ]} data={data.popularBooks} />
          </>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiItem: { width: (W - 40) / 2 },
  chartRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
});
