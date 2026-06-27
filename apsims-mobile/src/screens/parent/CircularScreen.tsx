// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — School Circulars & Communication Feed (Parent)
// Announcements, circulars, notices — rich feed with categories
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, formatDate } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';
import ScreenHeader from '../../components/ScreenHeader';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', primaryLight: '#ede9fe',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    blue: '#2563eb', blueLight: '#dbeafe',
    teal: '#0d9488', tealLight: '#ccfbf1',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
    'General':     { emoji: '📢', color: C.blue,    bg: C.blueLight },
    'Fees':        { emoji: '💰', color: C.accent,  bg: C.accentLight },
    'Academic':    { emoji: '📚', color: C.primary, bg: C.primaryLight },
    'Sports':      { emoji: '⚽', color: '#16a34a', bg: '#dcfce7' },
    'Health':      { emoji: '🏥', color: '#dc2626', bg: C.dangerLight },
    'Events':      { emoji: '🎉', color: '#7c3aed', bg: C.primaryLight },
    'Reminder':    { emoji: '⏰', color: C.warning,  bg: C.warningLight },
    'Holiday':     { emoji: '🌴', color: C.teal,    bg: C.tealLight },
    'Exam':        { emoji: '✏️', color: '#9333ea',  bg: '#f3e8ff' },
    'Emergency':   { emoji: '🚨', color: C.danger,  bg: C.dangerLight },
};

interface Circular {
    id: number;
    title: string;
    message: string;
    category: string;
    is_pinned: boolean;
    created_at: string;
    sender_name?: string;
    target_audience?: string;
}

export default function CircularScreen() {
    const navigation = useNavigation<NavProp>();
    const { session } = useSession();
    const [circulars, setCirculars] = useState<Circular[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('school_announcements')
                .select('id, title, message, category, is_pinned, created_at, sender_name, target_audience')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(100);

            setCirculars(data || []);
        } catch (e) {
            console.error('Circulars fetch error:', e);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const filtered = selectedCategory
        ? circulars.filter(c => c.category === selectedCategory)
        : circulars;

    const categories = [...new Set(circulars.map(c => c.category).filter(Boolean))];

    const renderItem = ({ item, index }: { item: Circular; index: number }) => {
        const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['General'];
        const isExpanded = expanded === item.id;
        const isNew = new Date(item.created_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        return (
            <TouchableOpacity
                style={[
                    s.card,
                    item.is_pinned && s.pinnedCard,
                    { backgroundColor: index % 2 === 0 ? '#fff' : '#fafbfc' }
                ]}
                onPress={() => setExpanded(isExpanded ? null : item.id)}
                activeOpacity={0.8}
            >
                {item.is_pinned && (
                    <View style={s.pinnedBanner}>
                        <Text style={s.pinnedText}>📌 Pinned Notice</Text>
                    </View>
                )}

                <View style={s.cardHeader}>
                    <View style={[s.categoryIcon, { backgroundColor: config.bg }]}>
                        <Text style={{ fontSize: 18 }}>{config.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>

            {/* ── PREMIUM BACK NAVIGATION ── */}
            <ScreenHeader
                title="📰 Circulars"
                onBack={() => navigation.goBack()}
                gradient={['#F59E0B','#D97706']}
            />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.cardTitle} numberOfLines={isExpanded ? undefined : 2}>
                                {item.title}
                            </Text>
                            {isNew && (
                                <View style={s.newBadge}>
                                    <Text style={s.newText}>NEW</Text>
                                </View>
                            )}
                        </View>
                        <View style={s.cardMeta}>
                            <View style={[s.catBadge, { backgroundColor: config.bg }]}>
                                <Text style={[s.catBadgeText, { color: config.color }]}>
                                    {item.category || 'General'}
                                </Text>
                            </View>
                            <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
                        </View>
                    </View>
                    <Text style={[s.chevron, { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }]}>›</Text>
                </View>

                {isExpanded && (
                    <View style={s.messageBox}>
                        <Text style={s.messageText}>{item.message}</Text>
                        {item.sender_name && (
                            <Text style={s.senderText}>— {item.sender_name}</Text>
                        )}
                        {item.target_audience && (
                            <View style={s.audienceTag}>
                                <Text style={s.audienceText}>👥 {item.target_audience}</Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) return (
        <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading circulars…</Text>
        </View>
    );

    const newCount = circulars.filter(c =>
        new Date(c.created_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    ).length;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>📢 School Circulars</Text>
                            <Text style={s.headerSub}>
                                {circulars.length} notices · {newCount > 0 ? `${newCount} new this week` : 'All up to date'}
                            </Text>
                        </View>
                    </View>

                    {/* Category pills */}
                    <FlatList
                        horizontal
                        data={[null, ...categories]}
                        keyExtractor={item => String(item)}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, paddingRight: 8 }}
                        renderItem={({ item: cat }) => {
                            const cfg = cat ? (CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['General']) : null;
                            const isActive = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    style={[
                                        s.catPill,
                                        isActive && { backgroundColor: '#fff' },
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    {cfg && <Text>{cfg.emoji} </Text>}
                                    <Text style={[s.catPillText, isActive && { color: C.primary }]}>
                                        {cat || 'All'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </SafeAreaView>
            </LinearGradient>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                ListEmptyComponent={
                    <View style={s.emptyBox}>
                        <Text style={{ fontSize: 44 }}>📭</Text>
                        <Text style={s.emptyTitle}>No Circulars Yet</Text>
                        <Text style={s.emptySub}>School notices will appear here</Text>
                    </View>
                }
                contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
        </View>
    );
}

const s = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14 },
    header: { paddingTop: 44, paddingBottom: 14, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    catPill: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    catPillText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    card: {
        backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 2,
    },
    pinnedCard: { borderColor: '#c4b5fd', borderWidth: 1.5 },
    pinnedBanner: {
        backgroundColor: C.primaryLight, paddingHorizontal: 14, paddingVertical: 5,
        borderBottomWidth: 1, borderBottomColor: '#c4b5fd',
    },
    pinnedText: { fontSize: 10, color: C.primary, fontWeight: '800' },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
    categoryIcon: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 14, fontWeight: '800', color: C.text, lineHeight: 20 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    catBadgeText: { fontSize: 9, fontWeight: '800' },
    cardDate: { fontSize: 10, color: C.textDim },
    chevron: { fontSize: 22, color: C.primary, fontWeight: '700', marginTop: 2 },
    newBadge: { backgroundColor: C.dangerLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    newText: { fontSize: 8, color: C.danger, fontWeight: '900' },
    messageBox: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
    messageText: { fontSize: 13, color: C.text, lineHeight: 20 },
    senderText: { fontSize: 11, color: C.textSub, fontStyle: 'italic', marginTop: 8 },
    audienceTag: { backgroundColor: C.blueLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 },
    audienceText: { fontSize: 10, color: C.blue, fontWeight: '700' },
    emptyBox: { alignItems: 'center', paddingVertical: 80, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptySub: { fontSize: 12, color: C.textSub },
});
