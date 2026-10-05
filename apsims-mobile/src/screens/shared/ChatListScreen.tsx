import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface ChatRoom {
    id: number;
    room_type: 'staff' | 'class' | 'parent_teacher' | 'broadcast' | 'direct';
    room_name: string;
    created_at: string;
    lastMessage?: string;
    lastSender?: string;
    lastTime?: string;
    unreadCount?: number;
}

const ROOM_ICONS: Record<string, string> = {
    staff: '👩‍🏫', class: '🏫', parent_teacher: '👨‍👩‍👧', broadcast: '📢', direct: '💬',
};
const ROOM_GRADIENTS: Record<string, [string, string]> = {
    staff:          ['#6366f1', '#8b5cf6'],
    class:          ['#0891b2', '#06b6d4'],
    parent_teacher: ['#059669', '#10b981'],
    broadcast:      ['#dc2626', '#ef4444'],
    direct:         ['#d97706', '#f59e0b'],
};

function formatTime(ts?: string) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function ChatListScreen() {
    const navigation = useNavigation<NavProp>();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const loadRooms = useCallback(async () => {
        const { data, error } = await supabase
            .from('school_chat_rooms')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Fetch last message for each room
            const enriched = await Promise.all(data.map(async (room) => {
                const { data: msgs } = await supabase
                    .from('school_chat_messages')
                    .select('message, sender_name, created_at')
                    .eq('room_id', room.id)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(1);
                const last = msgs?.[0];
                return {
                    ...room,
                    lastMessage: last?.message || 'No messages yet',
                    lastSender: last?.sender_name,
                    lastTime: last?.created_at,
                } as ChatRoom;
            }));
            setRooms(enriched);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { loadRooms(); }, [loadRooms]);

    const onRefresh = () => { setRefreshing(true); loadRooms(); };

    const filtered = rooms.filter(r => r.room_name?.toLowerCase().includes(search.toLowerCase()));

    const renderRoom = ({ item }: { item: ChatRoom }) => (
        <TouchableOpacity
            style={styles.roomItem}
            onPress={() => (navigation as any).navigate('ChatRoom', { room: item })}
            activeOpacity={0.75}
        >
            <LinearGradient
                colors={ROOM_GRADIENTS[item.room_type] || ['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.roomIcon}
            >
                <Text style={styles.roomIconText}>{ROOM_ICONS[item.room_type]}</Text>
            </LinearGradient>
            <View style={styles.roomInfo}>
                <View style={styles.roomRow}>
                    <Text style={styles.roomName} numberOfLines={1}>{item.room_name}</Text>
                    <Text style={styles.roomTime}>{formatTime(item.lastTime)}</Text>
                </View>
                <View style={styles.roomRow}>
                    <Text style={styles.roomLast} numberOfLines={1}>
                        {item.lastSender ? `${item.lastSender.split(' ')[0]}: ` : ''}{item.lastMessage}
                    </Text>
                    <Text style={styles.roomType}>{item.room_type.replace('_', ' ')}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

            {/* Header */}
            <LinearGradient
                colors={['#0f0c29', '#1e1b6b', '#24243e']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>💬 School Chat</Text>
                        <Text style={styles.headerSub}>Real-time school communication</Text>
                    </View>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>

                {/* Search bar */}
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search rooms…"
                        placeholderTextColor="rgba(165,180,252,0.5)"
                        style={styles.searchInput}
                    />
                </View>
            </LinearGradient>

            {/* Room list */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading chats…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderRoom}
                    contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyEmoji}>💬</Text>
                            <Text style={styles.emptyTitle}>No rooms yet</Text>
                            <Text style={styles.emptySub}>Rooms are created by the administrator</Text>
                        </View>
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faff' },
    header: { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 16, paddingHorizontal: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    headerTitle: { color: '#fff', fontWeight: '900', fontSize: 20, fontFamily: 'System' },
    headerSub: { color: 'rgba(199,210,254,0.7)', fontSize: 12, marginTop: 1 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    liveText: { color: '#10b981', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
    listContent: { paddingBottom: 20 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    roomItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', gap: 14 },
    roomIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    roomIconText: { fontSize: 24 },
    roomInfo: { flex: 1, minWidth: 0 },
    roomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
    roomName: { fontWeight: '800', fontSize: 14, color: '#0f172a', flex: 1 },
    roomTime: { fontSize: 11, color: '#94a3b8', flexShrink: 0 },
    roomLast: { fontSize: 12, color: '#64748b', flex: 1, fontWeight: '500' },
    roomType: { fontSize: 10, color: '#6366f1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: 'rgba(99,102,241,0.08)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 82 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 64, marginBottom: 12 },
    emptyTitle: { fontWeight: '800', fontSize: 18, color: '#1e293b', marginBottom: 6 },
    emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
