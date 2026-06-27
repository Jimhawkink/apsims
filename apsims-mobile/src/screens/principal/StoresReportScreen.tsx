// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Stores Report — Inventory & Asset Analytics
// Stock levels · Category breakdown · Movements · Low stock alerts
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { COLORS, fmt } from '../../components/ultra/UltraTheme';
import { BarChart, DoughnutChart, ProgressBar } from '../../components/ultra/UltraCharts';
import { KPICard, SectionHeader, ChartPanel, TabSwitcher, DataGrid, StatusBadge } from '../../components/ultra/UltraComponents';
import ScreenHeader from '../../components/ScreenHeader';

const W = Dimensions.get('window').width;
const CW = W - 60;

export default function StoresReportScreen() {
    const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [itemsR, movR, catsR] = await Promise.all([
        supabase.from('school_store_items').select('*'),
        supabase.from('school_store_movements').select('*').order('created_at', { ascending: false }),
        supabase.from('school_store_categories').select('*'),
      ]);
      const items = itemsR.data || [];
      const movements = movR.data || [];
      const categories = catsR.data || [];

      const totalItems = items.length;
      const totalValue = items.reduce((s: number, i: any) => s + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
      const lowStock = items.filter((i: any) => Number(i.quantity || 0) <= Number(i.reorder_level || 5));
      const outOfStock = items.filter((i: any) => Number(i.quantity || 0) === 0);

      // Category breakdown
      const catTotals: Record<string, { count: number; value: number }> = {};
      items.forEach((i: any) => {
        const cat = categories.find((c: any) => c.id === i.category_id)?.name || i.category || 'Uncategorized';
        if (!catTotals[cat]) catTotals[cat] = { count: 0, value: 0 };
        catTotals[cat].count++;
        catTotals[cat].value += Number(i.quantity || 0) * Number(i.unit_price || 0);
      });
      const catBreakdown = Object.entries(catTotals).sort((a, b) => b[1].value - a[1].value);

      // Recent movements
      const recentMov = movements.slice(0, 20).map((m: any) => {
        const item = items.find((i: any) => i.id === m.item_id);
        return {
          date: m.created_at ? new Date(m.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—',
          item: item?.item_name || m.item_name || '—',
          type: m.movement_type || m.type || 'Issue',
          quantity: m.quantity || 0,
          by: m.issued_to || m.received_from || '—',
          balance: m.balance_after || '—',
        };
      });

      // All items for grid
      const allItems = items.map((i: any) => {
        const cat = categories.find((c: any) => c.id === i.category_id)?.name || i.category || '—';
        const qty = Number(i.quantity || 0);
        const reorder = Number(i.reorder_level || 5);
        return {
          name: i.item_name || i.name || '—',
          category: cat,
          quantity: qty,
          unit: i.unit || 'pcs',
          unitPrice: Number(i.unit_price || 0),
          value: qty * Number(i.unit_price || 0),
          reorderLevel: reorder,
          status: qty === 0 ? 'Out of Stock' : qty <= reorder ? 'Low Stock' : 'In Stock',
        };
      }).sort((a: any, b: any) => a.quantity - b.quantity);

      setData({
        totalItems, totalValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length,
        totalMovements: movements.length, catBreakdown, recentMov, allItems, lowStockItems: allItems.filter((i: any) => i.status !== 'In Stock'),
      });
    } catch (e) { console.error('Stores fetch:', e); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <View style={{ flex: 1 }}><LinearGradient colors={['#f8fafc', '#fffbeb']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 32 }}>📦</Text>
      <ActivityIndicator size="large" color={COLORS.amber} style={{ marginTop: 12 }} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>Loading Stores Analytics...</Text>
    </LinearGradient></View>
  );
  if (!data) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#d97706" translucent={false} />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.amber]} />} contentContainerStyle={{ paddingBottom: 30 }}>
        <ScreenHeader
                title="📦 Stores"
                onBack={() => navigation.goBack()}
                gradient={['#F59E0B','#D97706']}
            />

        <View style={styles.content}>
          <TabSwitcher tabs={[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'items', label: 'All Items', icon: '📋' },
            { key: 'movements', label: 'Movements', icon: '🔄' },
            { key: 'alerts', label: 'Alerts', icon: '⚠️' },
          ]} active={tab} onChange={setTab} />

          {tab === 'overview' && <>
            <View style={styles.kpiGrid}>
              {[
                { label: 'Total Items', value: data.totalItems, icon: '📦', color: COLORS.blue, sub: 'Inventory items' },
                { label: 'Total Value', value: fmt(data.totalValue), icon: '💰', color: COLORS.green, sub: 'Stock valuation' },
                { label: 'Low Stock', value: data.lowStockCount, icon: '⚠️', color: COLORS.amber, sub: 'Below reorder level', trend: `${data.lowStockCount}`, trendUp: false },
                { label: 'Out of Stock', value: data.outOfStockCount, icon: '🚨', color: COLORS.red, sub: 'Needs replenishment', trend: `${data.outOfStockCount}`, trendUp: false },
              ].map((c, i) => <View key={i} style={styles.kpiItem}><KPICard {...c} compact /></View>)}
            </View>

            <ChartPanel title="📊 Stock by Category" subtitle={`${data.catBreakdown.length} categories`}>
              {data.catBreakdown.length > 0 ? (
                <BarChart data={[data.catBreakdown.map((c: any) => c[1].value)]} labels={data.catBreakdown.map((c: any) => c[0].substring(0, 10))} colors={COLORS.chart.slice(0, data.catBreakdown.length)} width={CW} height={160} horizontal formatY={(v: number) => fmt(v)} />
              ) : <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, paddingVertical: 20 }}>No categories</Text>}
            </ChartPanel>

            <ChartPanel title="📊 Stock Value Distribution">
              <DoughnutChart data={data.catBreakdown.slice(0, 6).map((c: any) => c[1].value)} colors={COLORS.chart.slice(0, 6)} labels={data.catBreakdown.slice(0, 6).map((c: any) => c[0])} size={130} strokeWidth={18} centerValue={fmt(data.totalValue)} centerLabel="Total Value" />
            </ChartPanel>
          </>}

          {tab === 'items' && <>
            <SectionHeader title="All Inventory Items" subtitle={`${data.allItems.length} items`} icon="📋" />
            <DataGrid columns={[
              { key: 'name', label: 'Item', width: 120 },
              { key: 'category', label: 'Category', width: 80 },
              { key: 'quantity', label: 'Qty', width: 45, align: 'right', render: (v: number, row: any) => <Text style={{ fontSize: 11, fontWeight: '700', color: row.status === 'In Stock' ? '#059669' : '#ef4444' }}>{v}</Text> },
              { key: 'unit', label: 'Unit', width: 40 },
              { key: 'value', label: 'Value', width: 75, align: 'right', render: (v: number) => <Text style={{ fontSize: 10, color: '#475569' }}>{fmt(v)}</Text> },
              { key: 'status', label: 'Status', width: 80, render: (v: string) => <StatusBadge status={v === 'In Stock' ? 'Active' : v === 'Low Stock' ? 'Pending' : 'Critical'} /> },
            ]} data={data.allItems} />
          </>}

          {tab === 'movements' && <>
            <SectionHeader title="Recent Stock Movements" icon="🔄" />
            <DataGrid columns={[
              { key: 'date', label: 'Date', width: 65 },
              { key: 'item', label: 'Item', width: 120 },
              { key: 'type', label: 'Type', width: 60, render: (v: string) => <View style={{ backgroundColor: v === 'Receipt' || v === 'In' ? '#dcfce7' : '#fef2f2', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 8, fontWeight: '700', color: v === 'Receipt' || v === 'In' ? '#16a34a' : '#dc2626' }}>{v}</Text></View> },
              { key: 'quantity', label: 'Qty', width: 40, align: 'right' },
              { key: 'by', label: 'By', width: 90 },
              { key: 'balance', label: 'Balance', width: 55, align: 'right' },
            ]} data={data.recentMov} />
          </>}

          {tab === 'alerts' && <>
            <SectionHeader title="⚠️ Low Stock Alerts" subtitle={`${data.lowStockItems.length} items need attention`} icon="🚨" />
            {data.lowStockItems.length > 0 ? (
              <DataGrid columns={[
                { key: 'name', label: 'Item', width: 130 },
                { key: 'quantity', label: 'Current', width: 60, align: 'center', render: (v: number) => <Text style={{ fontSize: 12, fontWeight: '800', color: v === 0 ? '#ef4444' : '#f59e0b' }}>{v}</Text> },
                { key: 'reorderLevel', label: 'Reorder At', width: 70, align: 'center' },
                { key: 'category', label: 'Category', width: 80 },
                { key: 'status', label: 'Status', width: 85, render: (v: string) => <StatusBadge status={v === 'Out of Stock' ? 'Critical' : 'Pending'} /> },
              ]} data={data.lowStockItems} />
            ) : <View style={{ padding: 30, alignItems: 'center' }}><Text style={{ fontSize: 24 }}>✅</Text><Text style={{ fontSize: 13, fontWeight: '700', color: '#059669', marginTop: 8 }}>All items in stock!</Text></View>}
          </>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiItem: { width: (W - 40) / 2 },
});
