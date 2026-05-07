import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {
    getPortalNotifications, markNotificationRead, markAllNotificationsRead,
    PortalNotification, formatDate,
} from '../../lib/supabase';
import { cacheData, getCachedData } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';

type RouteProps = RouteProp<RootStackParamList, 'Notifications'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryLight: '#dbeafe',
    accent: '#059669', danger: '#ef4444', warning: '#f59e0b',
    purple: '#7c3aed', teal: '#0d9488',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const TYPE_ICONS: Record<string, string> = {
    fee_reminder: '💰',
    report_card: '📄',
    discipline: '⚠️',
    attendance: '📅',
    announcement: '📢',
    homework: '📝',
    info: 'ℹ️',
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(iso);
}

export default function NotificationScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { portalUserId } = route.params;
    const { isConnected } = useNetworkStatus();

    const [notifications, setNotifications] = useState<PortalNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const cacheKey = `notifications_${portalUserId}`;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (isConnected) {
                const data = await getPortalNotifications(portalUserId);
                setNotifications(data);
                await cacheData(cacheKey, data);
            } else {
                const { data } = await getCachedData<PortalNotification[]>(cacheKey);
                setNotifications(data || []);
            }
        } catch {
            const { data } = await getCachedData<PortalNotification[]>(cacheKey);
            setNotifications(data || []);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [portalUserId, isConnected, cacheKey]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const handleTap = async (n: PortalNotification) => {
        if (!n.is_read) {
            await markNotificationRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        }
        // Navigate to relevant screen
        switch (n.type) {
            case 'fee_reminder':
                // Navigate to fee screen — handled by parent/student dashboard
                break;
            case 'report_card':
                // Navigate to report card
                break;
            default:
                break;
        }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        await markAllNotificationsRead(portalUserId);
        setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
        setMarkingAll(false);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading notifications…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                onPress={handleMarkAll}
                                disabled={markingAll}
                                style={styles.markAllBtn}
                                accessibilityLabel="Mark all notifications as read"
                            >
                                <Text style={styles.markAllText}>
                                    {markingAll ? 'Marking…' : '✓ Mark all read'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.headerTitle}>🔔 Notifications</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.headerSub}>{unreadCount} unread</Text>
                    )}
                </SafeAreaView>
            </LinearGradient>

            <FlatList
                data={notifications}
                keyExtractor={item => String(item.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🔔</Text>
                        <Text style={styles.emptyText}>No notifications yet.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleTap(item)}
                        style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
                        accessibilityLabel={`${item.is_read ? '' : 'Unread: '}${item.title}`}
                    >
                        {!item.is_read && <View style={styles.unreadBar} />}
                        <View style={styles.notifIcon}>
                            <Text style={styles.notifIconText}>
                                {TYPE_ICONS[item.type] || 'ℹ️'}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>
                                {item.title}
                            </Text>
                            <Text style={styles.notifMessage} numberOfLines={2}>
                                {item.message}
                            </Text>
                            <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    markAllBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    markAllText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    listContent: { padding: 16, paddingBottom: 40 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub },
    notifCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: C.card, borderRadius: 16, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    notifCardUnread: { borderColor: C.primary + '40', backgroundColor: '#f0f7ff' },
    unreadBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.primary, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
    notifIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    notifIconText: { fontSize: 20 },
    notifTitle: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 3 },
    notifTitleUnread: { fontWeight: '900' },
    notifMessage: { fontSize: 12, color: C.textSub, lineHeight: 18, marginBottom: 4 },
    notifTime: { fontSize: 10, color: C.textDim, fontWeight: '600' },
});
