import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { getStudentLeaveOuts, LeaveOutRecord, formatDate } from '../../lib/supabase';

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; emoji: string }> = {
    Returned: { bg: C.accentLight, color: C.accent, emoji: '✅' },
    Approved: { bg: '#dbeafe', color: '#1d4ed8', emoji: '✔️' },
    Pending: { bg: C.warningLight, color: C.warning, emoji: '⏳' },
    Out: { bg: C.dangerLight, color: C.danger, emoji: '🚪' },
};

export default function LeaveOutScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [records, setRecords] = useState<LeaveOutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const studentId = session?.linked_student_id || 0;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await getStudentLeaveOuts(studentId);
            setRecords(data);
        } catch (err: any) {
            console.error('LeaveOutScreen error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading leave-out records…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>🚪 Leave Outs</Text>
                    <Text style={styles.headerSub}>{session?.student_name || 'Student'}</Text>
                </SafeAreaView>
            </LinearGradient>

            <FlatList
                data={records}
                keyExtractor={item => String(item.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🚪</Text>
                        <Text style={styles.emptyText}>No leave-out records found.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const statusKey = item.status || 'Pending';
                    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.Pending;
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardReason}>{item.reason}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                    <Text style={[styles.statusText, { color: cfg.color }]}>
                                        {cfg.emoji} {statusKey}
                                    </Text>
                                </View>
                            </View>
                            {item.reason_details ? (
                                <Text style={styles.cardDetails}>{item.reason_details}</Text>
                            ) : null}
                            <View style={styles.timeRow}>
                                <View style={styles.timeItem}>
                                    <Text style={styles.timeLabel}>🕐 Left</Text>
                                    <Text style={styles.timeValue}>{formatDate(item.time_left)}</Text>
                                </View>
                                <View style={styles.timeDivider} />
                                <View style={styles.timeItem}>
                                    <Text style={styles.timeLabel}>🕐 Returned</Text>
                                    <Text style={[styles.timeValue, !item.time_returned && { color: C.warning }]}>
                                        {item.time_returned ? formatDate(item.time_returned) : 'Not yet returned'}
                                    </Text>
                                </View>
                            </View>
                            {item.qr_code && (
                                <View style={styles.qrRow}>
                                    <Text style={styles.qrText}>📱 QR Ref: {item.qr_code.slice(0, 16)}…</Text>
                                </View>
                            )}
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    listContent: { padding: 16, paddingBottom: 40 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub },
    card: {
        backgroundColor: C.card, borderRadius: 16, padding: 14,
        marginBottom: 12, borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardReason: { fontSize: 14, fontWeight: '800', color: C.text, flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: '800' },
    cardDetails: { fontSize: 12, color: C.textSub, marginBottom: 10, lineHeight: 18 },
    timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10 },
    timeItem: { flex: 1, alignItems: 'center' },
    timeLabel: { fontSize: 10, color: C.textDim, fontWeight: '600', marginBottom: 2 },
    timeValue: { fontSize: 11, color: C.text, fontWeight: '700', textAlign: 'center' },
    timeDivider: { width: 1, height: 30, backgroundColor: C.border },
    qrRow: { marginTop: 8, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 8 },
    qrText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
});
