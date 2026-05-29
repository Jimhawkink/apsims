// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Components — Premium UI widgets
// KPI Cards, Filter Bar, Data Grid, Section Headers
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkline, ProgressBar } from './UltraCharts';
import { COLORS, SHADOWS, fmt, STATUS_COLORS } from './UltraTheme';

const W = Dimensions.get('window').width;

// ── Ultra KPI Card (with sparkline, trend, progress) ──
export function KPICard({ label, value, icon, sub, color, trend, trendUp, sparkData, progress, compact }: {
  label: string; value: string | number; icon: string; sub?: string; color: string;
  trend?: string; trendUp?: boolean; sparkData?: number[]; progress?: number; compact?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, compact && { padding: 10 }]}>
      <View style={[styles.kpiAccent, { backgroundColor: color }]} />
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
          <Text style={{ fontSize: compact ? 14 : 16 }}>{icon}</Text>
        </View>
        {trend && (
          <View style={[styles.kpiBadge, { backgroundColor: trendUp ? '#dcfce7' : '#fef2f2' }]}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: trendUp ? '#16a34a' : '#dc2626' }}>
              {trendUp ? '▲' : '▼'} {trend}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, compact && { fontSize: 18 }]}>{value}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
      {progress !== undefined && <View style={{ marginTop: 6 }}><ProgressBar value={progress} color={color} /></View>}
      {sparkData && <View style={{ marginTop: 4 }}><Sparkline data={sparkData} color={color} width={W / 2 - 50} height={24} /></View>}
    </View>
  );
}

// ── Filter Bar (Term, Form, Stream, Year dropdowns + Search) ──
export function FilterBar({ filters, onFilterChange, showSearch, searchPlaceholder, onSearch }: {
  filters: { key: string; label: string; options: string[]; value: string }[];
  onFilterChange: (key: string, value: string) => void;
  showSearch?: boolean; searchPlaceholder?: string; onSearch?: (q: string) => void;
}) {
  const [searchText, setSearchText] = useState('');

  return (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {filters.map(f => (
          <View key={f.key} style={styles.filterChipContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {f.options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.filterChip, f.value === opt && styles.filterChipActive]}
                  onPress={() => onFilterChange(f.key, opt)}
                >
                  <Text style={[styles.filterChipText, f.value === opt && styles.filterChipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
      {showSearch && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder || 'Search admission no...'}
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={(t) => { setSearchText(t); onSearch?.(t); }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); onSearch?.(''); }}>
              <Text style={{ fontSize: 14, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Section Header ──
export function SectionHeader({ title, subtitle, icon, action }: {
  title: string; subtitle?: string; icon?: string; action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action && (
        <TouchableOpacity style={styles.sectionAction} onPress={action.onPress}>
          <Text style={styles.sectionActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Chart Panel (card wrapper for charts) ──
export function ChartPanel({ title, subtitle, children, style }: {
  title: string; subtitle?: string; children: React.ReactNode; style?: any;
}) {
  return (
    <View style={[styles.chartPanel, style]}>
      <View style={styles.chartPanelHeader}>
        <Text style={styles.chartPanelTitle}>{title}</Text>
        {subtitle && <View style={styles.chartPanelBadge}><Text style={styles.chartPanelBadgeText}>{subtitle}</Text></View>}
      </View>
      {children}
    </View>
  );
}

// ── Data Grid (scrollable table) ──
export function DataGrid({ columns, data, onRowPress }: {
  columns: { key: string; label: string; width?: number; align?: 'left' | 'center' | 'right'; render?: (val: any, row: any) => React.ReactNode }[];
  data: any[];
  onRowPress?: (row: any) => void;
}) {
  if (!data || data.length === 0) return (
    <View style={styles.emptyGrid}><Text style={styles.emptyGridText}>No records found</Text></View>
  );

  return (
    <View style={styles.gridContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={styles.gridHeader}>
            {columns.map((col, i) => (
              <View key={i} style={[styles.gridHeaderCell, { width: col.width || 100 }]}>
                <Text style={[styles.gridHeaderText, col.align === 'right' && { textAlign: 'right' }]}>{col.label}</Text>
              </View>
            ))}
          </View>
          {/* Rows */}
          {data.map((row, ri) => (
            <TouchableOpacity
              key={ri}
              style={[styles.gridRow, ri % 2 === 0 && { backgroundColor: '#fafbff' }]}
              onPress={() => onRowPress?.(row)}
              activeOpacity={0.7}
            >
              {columns.map((col, ci) => (
                <View key={ci} style={[styles.gridCell, { width: col.width || 100 }]}>
                  {col.render ? col.render(row[col.key], row) : (
                    <Text style={[styles.gridCellText, col.align === 'right' && { textAlign: 'right' }]} numberOfLines={1}>
                      {row[col.key] ?? '—'}
                    </Text>
                  )}
                </View>
              ))}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Status Badge ──
export function StatusBadge({ status }: { status: string }) {
  const sc = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
      <Text style={[styles.statusBadgeText, { color: sc.text }]}>{status}</Text>
    </View>
  );
}

// ── Tab Switcher ──
export function TabSwitcher({ tabs, active, onChange }: {
  tabs: { key: string; label: string; icon?: string }[]; active: string; onChange: (key: string) => void;
}) {
  return (
    <View style={styles.tabContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, active === t.key && styles.tabActive]}
            onPress={() => onChange(t.key)}
          >
            {t.icon && <Text style={{ fontSize: 12 }}>{t.icon}</Text>}
            <Text style={[styles.tabText, active === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Live Badge ──
export function LiveBadge() {
  return (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>Live</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // KPI Card
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  kpiAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  kpiBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  kpiLabel: { fontSize: 9, color: '#94a3b8', letterSpacing: 0.8, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  kpiSub: { fontSize: 10, color: '#94a3b8' },

  // Filter
  filterContainer: { marginBottom: 12 },
  filterScroll: { gap: 6, paddingHorizontal: 2 },
  filterChipContainer: { marginBottom: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  filterChipText: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, marginTop: 6, height: 36 },
  searchIcon: { fontSize: 12, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 12, color: '#1e293b' },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  sectionSubtitle: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  sectionAction: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f1f5f9' },
  sectionActionText: { fontSize: 9, fontWeight: '600', color: '#6366f1' },

  // Chart Panel
  chartPanel: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  chartPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartPanelTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
  chartPanelBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chartPanelBadgeText: { fontSize: 9, color: '#64748b', fontWeight: '600' },

  // Data Grid
  gridContainer: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', ...SHADOWS.sm },
  gridHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  gridHeaderCell: { paddingHorizontal: 10, paddingVertical: 8 },
  gridHeaderText: { fontSize: 9, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  gridCell: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  gridCellText: { fontSize: 11, color: '#334155' },
  emptyGrid: { paddingVertical: 30, alignItems: 'center' },
  emptyGridText: { fontSize: 11, color: '#94a3b8' },

  // Status Badge
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 8, fontWeight: '700' },

  // Tab Switcher
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', ...SHADOWS.sm },
  tabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#6366f1' },

  // Live Badge
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a' },
  liveText: { fontSize: 9, fontWeight: '700', color: '#16a34a' },
});
