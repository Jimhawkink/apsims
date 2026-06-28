import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import {
    getHomeworkWithSubmissions, acknowledgeHomework,
    HomeworkWithSubmission, formatDate,
} from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    teal: '#0d9488', tealLight: '#ccfbf1',
    text: '#0f172a', textSub: '#64748b',
};

export default function HomeworkScreen() {
    const { session } = useSession();
    const navigation = useNavigation<any>();
    const [homework, setHomework] = useState<HomeworkWithSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const formId = session?.student_form_id || 0;
    const studentId = session?.linked_student_id || 0;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await getHomeworkWithSubmissions(formId, studentId);
            setHomework(data);
        } catch (err: any) {
            console.error('HomeworkScreen error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [formId, studentId]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const handleAcknowledge = async (submissionId: number) => {
        await acknowledgeHomework(submissionId);
        setHomework(prev => prev.map(h =>
            h.submission_id === submissionId ? { ...h, acknowledged_by_parent: true } : h
        ));
    };

    // ── Single return — ScreenHeader ALWAYS renders so back always works ──
    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <ScreenHeader
                title="📝 Homework"
                onBack={() => { if (navigation.canGoBack()) navigation.goBack(); }}
                gradient={['#2563EB', '#1D4ED8']}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loadingText}>Loading homework…</Text>
                </View>
            ) : (
                <FlatList
                    data={homework}
                    keyExtractor={item => String(item.id)}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                    contentContainerStyle={homework.length === 0 ? styles.emptyContainer : styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>📋</Text>
                            <Text style={styles.emptyText}>No homework assigned at this time.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isOverdue = item.status === 'Overdue';
                        const isSubmitted = item.submission_status === 'Submitted';
                        return (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.subjectBadge, { backgroundColor: C.tealLight }]}>
                                        <Text style={[styles.subjectBadgeText, { color: C.teal }]}>
                                            📚 {item.subject_name}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusChip, {
                                        backgroundColor: isOverdue ? C.dangerLight : isSubmitted ? C.accentLight : C.warningLight
                                    }]}>
                                        <Text style={[styles.statusChipText, {
                                            color: isOverdue ? C.danger : isSubmitted ? C.accent : C.warning
                                        }]}>
                                            {isOverdue ? '⏰ Overdue' : isSubmitted ? '✅ Submitted' : '📝 Pending'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                {item.description ? (
                                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                                ) : null}
                                <View style={styles.cardFooter}>
                                    <Text style={styles.cardMeta}>👩‍🏫 {item.teacher_name}</Text>
                                    <Text style={[styles.cardDue, { color: isOverdue ? C.danger : C.textSub }]}>
                                        📅 Due: {item.due_date ? formatDate(item.due_date) : 'No date'}
                                    </Text>
                                </View>
                                {isSubmitted && !item.acknowledged_by_parent && item.submission_id && (
                                    <TouchableOpacity
                                        onPress={() => handleAcknowledge(item.submission_id!)}
                                        style={styles.ackBtn}
                                    >
                                        <Text style={styles.ackBtnText}>👍 Acknowledge Submission</Text>
                                    </TouchableOpacity>
                                )}
                                {item.acknowledged_by_parent && (
                                    <Text style={styles.ackLabel}>✅ Acknowledged by parent</Text>
                                )}
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    listContent: { padding: 16, paddingBottom: 40 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center' },
    card: {
        backgroundColor: C.card, borderRadius: 16, padding: 14,
        marginBottom: 12, borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    subjectBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    subjectBadgeText: { fontSize: 11, fontWeight: '800' },
    statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    statusChipText: { fontSize: 10, fontWeight: '800' },
    cardTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 },
    cardDesc: { fontSize: 12, color: C.textSub, lineHeight: 18, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardMeta: { fontSize: 11, color: C.textSub },
    cardDue: { fontSize: 11, fontWeight: '700' },
    ackBtn: {
        marginTop: 10, backgroundColor: C.accentLight, borderRadius: 10,
        paddingVertical: 8, alignItems: 'center',
        borderWidth: 1, borderColor: C.accent + '40',
    },
    ackBtnText: { fontSize: 12, fontWeight: '800', color: C.accent },
    ackLabel: { marginTop: 8, fontSize: 11, color: C.accent, fontWeight: '700', textAlign: 'center' },
});
