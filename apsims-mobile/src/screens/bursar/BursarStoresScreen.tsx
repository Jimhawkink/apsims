import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, RefreshControl, ActivityIndicator, Modal,
    Alert, FlatList, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

// ── Exact same table names as web app ──────────────────────────
// school_store_items: id, item_name, item_code, category, unit, quantity, reorder_level, unit_price, location, supplier, notes
// school_store_issuances: id, item_id, item_name, issued_to, department, quantity, notes, created_at

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const CATEGORIES = ['Stationery', 'Cleaning', 'Laboratory', 'Kitchen', 'Sports', 'Uniforms', 'Toiletries', 'Maintenance', 'Office', 'First Aid', 'Electrical', 'Other'];
const UNITS = ['Pieces', 'Packets', 'Boxes', 'Reams', 'Litres', 'Kgs', 'Rolls', 'Pairs', 'Sets', 'Bottles', 'Cartons'];
const CAT_COLORS: Record<string, string> = {
    Stationery: '#f59e0b', Cleaning: '#10b981', Laboratory: '#6366f1', Kitchen: '#ef4444',
    Sports: '#0891b2', Uniforms: '#8b5cf6', Toiletries: '#ec4899', Maintenance: '#d97706',
    Office: '#64748b', 'First Aid': '#dc2626', Electrical: '#f97316', Other: '#94a3b8',
};

type TabKey = 'items' | 'issue' | 'low';

function StockBadge({ qty, reorder }: { qty: number; reorder: number }) {
    const isLow = qty <= reorder;
    const isEmpty = qty === 0;
    return (
        <View style={[styles.stockBadge, { backgroundColor: isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4' }]}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: isEmpty ? '#dc2626' : isLow ? '#d97706' : '#16a34a' }}>
                {isEmpty ? '🔴 EMPTY' : isLow ? '⚠️ LOW' : '✅ OK'}
            </Text>
        </View>
    );
}

function ItemCard({ item, onEdit, onIssue, onDelete }: { item: any; onEdit: () => void; onIssue: () => void; onDelete: () => void }) {
    const isLow = item.quantity <= (item.reorder_level || 5);
    const catColor = CAT_COLORS[item.category] || '#94a3b8';
    return (
        <View style={[styles.itemCard, isLow && { borderColor: '#fde68a', borderWidth: 1.5 }]}>
            <View style={styles.itemCardTop}>
                <View style={[styles.catBadge, { backgroundColor: catColor + '18', borderColor: catColor + '44' }]}>
                    <Text style={[styles.catBadgeText, { color: catColor }]}>{item.category}</Text>
                </View>
                <StockBadge qty={item.quantity} reorder={item.reorder_level || 5} />
            </View>
            <Text style={styles.itemName}>{item.item_name}</Text>
            {item.item_code && <Text style={styles.itemCode}>#{item.item_code}</Text>}

            <View style={styles.itemStats}>
                <View style={styles.itemStat}>
                    <Text style={styles.itemStatVal}>{item.quantity}</Text>
                    <Text style={styles.itemStatLbl}>{item.unit || 'Pcs'}</Text>
                </View>
                <View style={[styles.itemStat, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' }]}>
                    <Text style={styles.itemStatVal}>{fmt(item.unit_price || 0)}</Text>
                    <Text style={styles.itemStatLbl}>Unit Price</Text>
                </View>
                <View style={[styles.itemStat, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' }]}>
                    <Text style={[styles.itemStatVal, { color: '#16a34a' }]}>{fmt((item.quantity || 0) * (item.unit_price || 0))}</Text>
                    <Text style={styles.itemStatLbl}>Total Value</Text>
                </View>
            </View>

            {/* Stock bar */}
            <View style={styles.stockBarBg}>
                <View style={[styles.stockBarFill, {
                    width: `${Math.min(100, item.reorder_level > 0 ? Math.round((item.quantity / Math.max(item.reorder_level * 2, 1)) * 100) : 100)}%` as any,
                    backgroundColor: item.quantity === 0 ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
                }]} />
            </View>

            {item.location && <Text style={styles.itemLocation}>📍 {item.location} {item.supplier ? `· Supplier: ${item.supplier}` : ''}</Text>}

            <View style={styles.itemActions}>
                <TouchableOpacity onPress={onIssue} style={[styles.itemActionBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                    <Text style={[styles.itemActionText, { color: '#16a34a' }]}>📤 Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onEdit} style={styles.itemActionBtn}>
                    <Text style={styles.itemActionText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={[styles.itemActionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.itemActionText, { color: '#dc2626' }]}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function IssuanceRow({ iss, idx }: { iss: any; idx: number }) {
    return (
        <View style={[styles.issuanceRow, { backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }]}>
            <View style={styles.issuanceIcon}>
                <Text style={{ fontSize: 14 }}>📤</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.issuanceName}>{iss.item_name}</Text>
                <Text style={styles.issuanceMeta}>→ {iss.issued_to}{iss.department ? ` · ${iss.department}` : ''}</Text>
                <Text style={styles.issuanceDate}>{iss.created_at ? new Date(iss.created_at).toLocaleDateString('en-KE') : '—'}</Text>
            </View>
            <View style={styles.issuanceQtyBadge}>
                <Text style={styles.issuanceQty}>{iss.quantity}</Text>
                <Text style={styles.issuanceQtyLbl}>issued</Text>
            </View>
        </View>
    );
}

export default function BursarStoresScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [tab, setTab] = useState<TabKey>('items');
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [showItemModal, setShowItemModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [issueItem, setIssueItem] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [itemForm, setItemForm] = useState({
        item_name: '', item_code: '', category: 'Stationery', unit: 'Pieces',
        quantity: 0, reorder_level: 5, unit_price: 0, location: '', supplier: '', notes: '',
    });
    const [issueForm, setIssueForm] = useState({
        issued_to: '', department: '', quantity: 1, notes: '',
    });

    const fetchAll = useCallback(async () => {
        try {
            const [{ data: itemData }, { data: issData }] = await Promise.all([
                supabase.from('school_store_items').select('*').order('item_name'),
                supabase.from('school_store_issuances').select('*').order('created_at', { ascending: false }).limit(100),
            ]);
            setItems(itemData || []);
            setIssuances(issData || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        let d = items;
        if (filterCat) d = d.filter(i => i.category === filterCat);
        if (search) { const q = search.toLowerCase(); d = d.filter(i => i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q)); }
        return d;
    }, [items, filterCat, search]);

    const lowStock = useMemo(() => items.filter(i => i.quantity <= (i.reorder_level || 5)), [items]);
    const totalValue = useMemo(() => items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0), [items]);
    const totalQty = useMemo(() => items.reduce((s, i) => s + (i.quantity || 0), 0), [items]);

    const openCreate = () => {
        setEditItem(null);
        setItemForm({ item_name: '', item_code: '', category: 'Stationery', unit: 'Pieces', quantity: 0, reorder_level: 5, unit_price: 0, location: '', supplier: '', notes: '' });
        setShowItemModal(true);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setItemForm({ item_name: item.item_name, item_code: item.item_code || '', category: item.category, unit: item.unit || 'Pieces', quantity: item.quantity, reorder_level: item.reorder_level || 5, unit_price: item.unit_price || 0, location: item.location || '', supplier: item.supplier || '', notes: item.notes || '' });
        setShowItemModal(true);
    };

    const openIssue = (item: any) => {
        setIssueItem(item);
        setIssueForm({ issued_to: '', department: '', quantity: 1, notes: '' });
        setShowIssueModal(true);
    };

    const handleSaveItem = async () => {
        if (!itemForm.item_name.trim()) { Alert.alert('Error', 'Item name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                item_name: itemForm.item_name.trim(),
                item_code: itemForm.item_code.trim() || null,
                category: itemForm.category, unit: itemForm.unit,
                quantity: itemForm.quantity || 0, reorder_level: itemForm.reorder_level || 5,
                unit_price: itemForm.unit_price || 0,
                location: itemForm.location || null,
                supplier: itemForm.supplier || null,
                notes: itemForm.notes || null,
            };
            let error;
            if (editItem) { ({ error } = await supabase.from('school_store_items').update(payload).eq('id', editItem.id)); }
            else { ({ error } = await supabase.from('school_store_items').insert([payload])); }
            if (error) { Alert.alert('Error', error.message); return; }
            Alert.alert('✅ Success', editItem ? 'Item updated' : 'Item added to stores');
            setShowItemModal(false); fetchAll();
        } finally { setSaving(false); }
    };

    const handleIssue = async () => {
        if (!issueItem || !issueForm.issued_to.trim() || issueForm.quantity < 1) {
            Alert.alert('Error', 'Fill all required fields'); return;
        }
        if (issueItem.quantity < issueForm.quantity) {
            Alert.alert('Error', `Only ${issueItem.quantity} ${issueItem.unit || 'pcs'} available`); return;
        }
        setSaving(true);
        try {
            const { error: issErr } = await supabase.from('school_store_issuances').insert([{
                item_id: issueItem.id,
                item_name: issueItem.item_name,
                issued_to: issueForm.issued_to.trim(),
                department: issueForm.department || null,
                quantity: issueForm.quantity,
                notes: issueForm.notes || null,
            }]);
            if (issErr) { Alert.alert('Error', issErr.message); return; }
            // Update quantity
            await supabase.from('school_store_items').update({ quantity: issueItem.quantity - issueForm.quantity }).eq('id', issueItem.id);
            Alert.alert('✅ Issued', `${issueForm.quantity} ${issueItem.unit || 'pcs'} of ${issueItem.item_name} issued to ${issueForm.issued_to}`);
            setShowIssueModal(false); fetchAll();
        } finally { setSaving(false); }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Item', 'Remove this item from stores?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('school_store_items').delete().eq('id', id); fetchAll(); } },
        ]);
    };

    if (loading) return (
        <LinearGradient colors={['#92400e', '#d97706']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Loading Stores…</Text>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#92400e" translucent={false} />
            {/* HEADER */}
            <LinearGradient colors={['#92400e', '#d97706', '#f59e0b']} style={styles.header}>
                <View style={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={styles.headerTitle}>📦 Stores Management</Text>
                            <Text style={styles.headerSub}>Inventory · Issuances · Low Stock Alerts</Text>
                        </View>
                        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                            <Text style={styles.addBtnText}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    {/* KPI strip */}
                    <View style={styles.kpiStrip}>
                        {[
                            { l: 'Items', v: String(items.length), c: '#fff' },
                            { l: 'Stock Value', v: fmt(totalValue), c: '#fef9c3' },
                            { l: 'Low Stock', v: String(lowStock.length), c: lowStock.length > 0 ? '#fca5a5' : '#86efac' },
                            { l: 'Issuances', v: String(issuances.length), c: '#c4b5fd' },
                        ].map((s, i) => (
                            <View key={i} style={[styles.kpiItem, i < 3 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text style={[styles.kpiVal, { color: s.c }]}>{s.v}</Text>
                                <Text style={styles.kpiLbl}>{s.l}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    {[
                        { k: 'items', l: `📋 All Items (${items.length})` },
                        { k: 'issue', l: `📤 Issuances (${issuances.length})` },
                        { k: 'low', l: `⚠️ Low Stock (${lowStock.length})` },
                    ].map(t => (
                        <TouchableOpacity key={t.k} onPress={() => setTab(t.k as TabKey)}
                            style={[styles.tabBtn, tab === t.k && { backgroundColor: '#fff' }]}>
                            <Text style={[styles.tabText, tab === t.k && { color: '#d97706' }]}>{t.l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </LinearGradient>

            {/* ══ ITEMS TAB ══ */}
            {tab === 'items' && (
                <View style={{ flex: 1 }}>
                    {/* Search + category filter */}
                    <View style={styles.searchRow}>
                        <TextInput value={search} onChangeText={setSearch} placeholder="🔍 Search items…"
                            style={styles.searchInput} placeholderTextColor="#94a3b8" />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilter}>
                        <TouchableOpacity onPress={() => setFilterCat('')}
                            style={[styles.catChip, !filterCat && { backgroundColor: '#d97706', borderColor: '#d97706' }]}>
                            <Text style={[styles.catChipText, !filterCat && { color: '#fff' }]}>All</Text>
                        </TouchableOpacity>
                        {CATEGORIES.map(c => (
                            <TouchableOpacity key={c} onPress={() => setFilterCat(filterCat === c ? '' : c)}
                                style={[styles.catChip, filterCat === c && { backgroundColor: CAT_COLORS[c] || '#d97706', borderColor: CAT_COLORS[c] || '#d97706' }]}>
                                <Text style={[styles.catChipText, filterCat === c && { color: '#fff' }]}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.countText}>{filtered.length} items · Value: {fmt(filtered.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}</Text>

                    <FlatList
                        data={filtered}
                        keyExtractor={i => String(i.id)}
                        renderItem={({ item }) => (
                            <ItemCard item={item}
                                onEdit={() => openEdit(item)}
                                onIssue={() => openIssue(item)}
                                onDelete={() => handleDelete(item.id)} />
                        )}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#d97706" />}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No items found</Text>}
                        contentContainerStyle={{ padding: 12, gap: 10 }}
                    />
                </View>
            )}

            {/* ══ ISSUANCES TAB ══ */}
            {tab === 'issue' && (
                <FlatList
                    data={issuances}
                    keyExtractor={i => String(i.id)}
                    renderItem={({ item, index }) => <IssuanceRow iss={item} idx={index} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#d97706" />}
                    ListHeaderComponent={
                        <View style={styles.issuanceHeader}>
                            <Text style={[styles.issuanceHeaderCell, { flex: 2 }]}>Item</Text>
                            <Text style={styles.issuanceHeaderCell}>Issued To</Text>
                            <Text style={styles.issuanceHeaderCell}>Qty</Text>
                            <Text style={styles.issuanceHeaderCell}>Date</Text>
                        </View>
                    }
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No issuances recorded</Text>}
                    style={{ backgroundColor: '#fff', margin: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' }}
                />
            )}

            {/* ══ LOW STOCK TAB ══ */}
            {tab === 'low' && (
                <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#d97706" />}>
                    {lowStock.length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center' }}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#16a34a' }}>All items adequately stocked!</Text>
                        </View>
                    ) : (
                        <View style={{ margin: 12, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#fde68a' }}>
                            <View style={{ backgroundColor: '#fef3c7', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 16 }}>⚠️</Text>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400e' }}>{lowStock.length} ITEMS NEED RESTOCKING</Text>
                            </View>
                            {lowStock.map((item, i) => {
                                const shortfall = Math.max(0, (item.reorder_level || 5) - item.quantity);
                                return (
                                    <View key={item.id} style={[{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#fef9c3', alignItems: 'center', gap: 10 }, { backgroundColor: i % 2 === 0 ? '#fff' : '#fffbeb' }]}>
                                        <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[item.category] || '#94a3b8') + '18' }]}>
                                            <Text style={[styles.catBadgeText, { color: CAT_COLORS[item.category] || '#94a3b8' }]}>{item.category?.slice(0, 3)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>{item.item_name}</Text>
                                            <Text style={{ fontSize: 10, color: '#94a3b8' }}>{item.supplier || 'No supplier'}</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 18, fontWeight: '900', color: item.quantity === 0 ? '#dc2626' : '#d97706' }}>{item.quantity}</Text>
                                            <Text style={{ fontSize: 9, color: '#94a3b8' }}>current</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#dc2626' }}>-{shortfall}</Text>
                                            <Text style={{ fontSize: 9, color: '#94a3b8' }}>shortfall</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => openEdit(item)} style={{ backgroundColor: '#d97706', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Restock</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* ══ ADD/EDIT ITEM MODAL ══ */}
            <Modal visible={showItemModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <LinearGradient colors={['#92400e', '#d97706']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editItem ? '✏️ Edit Store Item' : '📦 Add Store Item'}</Text>
                        </LinearGradient>
                        <ScrollView style={{ padding: 20 }}>
                            <Text style={styles.modalLabel}>Item Name *</Text>
                            <TextInput value={itemForm.item_name} onChangeText={v => setItemForm({ ...itemForm, item_name: v })}
                                placeholder="e.g. A4 Printing Paper" style={styles.textInput} placeholderTextColor="#94a3b8" />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalLabel}>Item Code</Text>
                                    <TextInput value={itemForm.item_code} onChangeText={v => setItemForm({ ...itemForm, item_code: v })}
                                        placeholder="STA-001" style={styles.textInput} placeholderTextColor="#94a3b8" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalLabel}>Quantity</Text>
                                    <TextInput value={String(itemForm.quantity)} onChangeText={v => setItemForm({ ...itemForm, quantity: Number(v) || 0 })}
                                        keyboardType="numeric" style={styles.textInput} placeholderTextColor="#94a3b8" />
                                </View>
                            </View>

                            <Text style={styles.modalLabel}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {CATEGORIES.map(c => (
                                    <TouchableOpacity key={c} onPress={() => setItemForm({ ...itemForm, category: c })}
                                        style={[styles.catChip, itemForm.category === c && { backgroundColor: CAT_COLORS[c] || '#d97706', borderColor: CAT_COLORS[c] || '#d97706' }]}>
                                        <Text style={[styles.catChipText, itemForm.category === c && { color: '#fff' }]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.modalLabel}>Unit</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                {UNITS.map(u => (
                                    <TouchableOpacity key={u} onPress={() => setItemForm({ ...itemForm, unit: u })}
                                        style={[styles.unitChip, itemForm.unit === u && { backgroundColor: '#d97706', borderColor: '#d97706' }]}>
                                        <Text style={[styles.unitChipText, itemForm.unit === u && { color: '#fff' }]}>{u}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalLabel}>Unit Price (KES)</Text>
                                    <TextInput value={String(itemForm.unit_price)} onChangeText={v => setItemForm({ ...itemForm, unit_price: Number(v) || 0 })}
                                        keyboardType="numeric" style={styles.textInput} placeholderTextColor="#94a3b8" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalLabel}>Reorder Level</Text>
                                    <TextInput value={String(itemForm.reorder_level)} onChangeText={v => setItemForm({ ...itemForm, reorder_level: Number(v) || 5 })}
                                        keyboardType="numeric" style={styles.textInput} placeholderTextColor="#94a3b8" />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalLabel}>Location</Text>
                                    <TextInput value={itemForm.location} onChangeText={v => setItemForm({ ...itemForm, location: v })}
                                        placeholder="Store room A" style={styles.textInput} placeholderTextColor="#94a3b8" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalLabel}>Supplier</Text>
                                    <TextInput value={itemForm.supplier} onChangeText={v => setItemForm({ ...itemForm, supplier: v })}
                                        placeholder="Supplier name" style={styles.textInput} placeholderTextColor="#94a3b8" />
                                </View>
                            </View>

                            <TouchableOpacity onPress={handleSaveItem} disabled={saving}
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
                                <LinearGradient colors={['#92400e', '#d97706']} style={styles.saveBtnInner}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editItem ? '✅ Update Item' : '✅ Add to Stores'}</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowItemModal(false)} style={{ padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ══ ISSUE MODAL ══ */}
            <Modal visible={showIssueModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { maxHeight: '65%' }]}>
                        <LinearGradient colors={['#1e1b4b', '#6366f1']} style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📤 Issue Store Item</Text>
                            {issueItem && (
                                <Text style={styles.modalSub}>{issueItem.item_name} · Available: {issueItem.quantity} {issueItem.unit || 'pcs'}</Text>
                            )}
                        </LinearGradient>
                        <View style={{ padding: 20 }}>
                            <Text style={styles.modalLabel}>Quantity to Issue</Text>
                            <TextInput value={String(issueForm.quantity)} onChangeText={v => setIssueForm({ ...issueForm, quantity: Number(v) || 1 })}
                                keyboardType="numeric" style={[styles.textInput, { fontSize: 24, fontWeight: '900', textAlign: 'center', color: '#6366f1' }]} />
                            {issueItem && (
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    {[1, 5, 10, issueItem.quantity].map(q => (
                                        <TouchableOpacity key={q} onPress={() => setIssueForm({ ...issueForm, quantity: q })}
                                            style={{ flex: 1, backgroundColor: '#eef2ff', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#6366f1' }}>{q}{q === issueItem.quantity ? ' All' : ''}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <Text style={styles.modalLabel}>Issued To *</Text>
                            <TextInput value={issueForm.issued_to} onChangeText={v => setIssueForm({ ...issueForm, issued_to: v })}
                                placeholder="Teacher / Department name" style={styles.textInput} placeholderTextColor="#94a3b8" />
                            <Text style={styles.modalLabel}>Department</Text>
                            <TextInput value={issueForm.department} onChangeText={v => setIssueForm({ ...issueForm, department: v })}
                                placeholder="e.g. Science, Admin" style={styles.textInput} placeholderTextColor="#94a3b8" />

                            <TouchableOpacity onPress={handleIssue} disabled={saving}
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
                                <LinearGradient colors={['#1e1b4b', '#6366f1']} style={styles.saveBtnInner}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>📤 Confirm Issuance</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowIssueModal(false)} style={{ padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {},
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 10 },
    addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    kpiStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden', marginBottom: 0 },
    kpiItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    kpiVal: { fontSize: 13, fontWeight: '900' },
    kpiLbl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 1 },
    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 10 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    searchInput: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
    catFilter: { maxHeight: 50, paddingLeft: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    catChip: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    catChipText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    countText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', paddingHorizontal: 16, marginVertical: 8 },
    itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    itemCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
    catBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    stockBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    itemName: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
    itemCode: { fontSize: 10, color: '#d97706', fontWeight: '700', fontFamily: 'monospace', marginBottom: 8 },
    itemStats: { flexDirection: 'row', marginBottom: 10 },
    itemStat: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    itemStatVal: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
    itemStatLbl: { fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
    stockBarBg: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
    stockBarFill: { height: '100%', borderRadius: 99 },
    itemLocation: { fontSize: 10, color: '#94a3b8', marginBottom: 10 },
    itemActions: { flexDirection: 'row', gap: 8 },
    itemActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', alignItems: 'center' },
    itemActionText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    issuanceHeader: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 12 },
    issuanceHeaderCell: { flex: 1, fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', textAlign: 'center' },
    issuanceRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 10 },
    issuanceIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
    issuanceName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
    issuanceMeta: { fontSize: 10, color: '#64748b', marginTop: 1 },
    issuanceDate: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
    issuanceQtyBadge: { alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    issuanceQty: { fontSize: 16, fontWeight: '900', color: '#d97706' },
    issuanceQtyLbl: { fontSize: 8, color: '#92400e', fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
    modalHeader: { padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
    modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
    modalLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
    textInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, backgroundColor: '#fafbff', color: '#1e293b' },
    unitChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    unitChipText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    saveBtn: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
    saveBtnInner: { padding: 16, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
