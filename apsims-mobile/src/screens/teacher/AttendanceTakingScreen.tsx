import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import ScreenHeader from '../../components/ScreenHeader';
import {
    getStudentsForMarksEntry, saveAttendance, getClassAttendance,
    getCurrentTerm, AttendanceInput, formatDate,
} from '../../lib/supabase';
import { queueOfflineRecord, getQueueCount } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';
import OfflineBanner from '../../components/OfflineBanner';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type AttendanceStatus = 'Present' | 'Absent' | 'Late';

interface StudentAttendance {
    student_id: number;
    student_name: string;
    admission_number: string;
    status: AttendanceStatus;
}

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function AttendanceTakingScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();
    const { isConnected } = useNetworkStatus();

    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [termId, setTermId] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [toast, setToast] = useState('');

    // Use first assigned subject's form/stream
    const teacherId = session?.linked_teacher_id || 0;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const term = await getCurrentTerm();
            if (term) setTermId(term.id);

            // Get teacher's first form/stream assignment
            // For now use a default — in production this would come from teacher's assignments
            const studentList = await getStudentsForMarksEntry(0, 0, 0);
            const count = await getQueueCount();
            setPendingCount(count);

            // Initialize all as Present
            setStudents(studentList.map(s => ({
                student_id: s.student_id,
                student_name: s.student_name,
                admission_number: s.admission_number,
                status: 'Present' as AttendanceStatus,
            })));
        } catch (err: any) {
            console.error('AttendanceTakingScreen error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [teacherId]);

    useEffect(() => { loadData(); }, [loadData]);

    const setStatus = (studentId: number, status: AttendanceStatus) => {
        setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status } : s));
    };

    const markAll = (status: AttendanceStatus) => {
        Alert.alert(
            `Mark All ${status}`,
            `Mark all ${students.length} students as ${status}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes', onPress: () => setStudents(prev => prev.map(s => ({ ...s, status }))) },
            ]
        );
    };

    const handleSave = async () => {
        if (students.length === 0) return;
        setSaving(true);
        try {
            const records: AttendanceInput[] = students.map(s => ({
                student_id: s.student_id,
                attendance_date: selectedDate,
                status: s.status,
                term_id: termId,
                recorded_by: session?.full_name || '',
            }));

            if (isConnected) {
                const result = await saveAttendance(records);
                if (result.success) {
                    showToast(`✅ Attendance saved for ${formatDate(selectedDate)}`);
                } else {
                    showToast(`❌ Error: ${result.error}`);
                }
            } else {
                await queueOfflineRecord('attendance', records);
                const count = await getQueueCount();
                setPendingCount(count);
                showToast('📡 Saved offline — will sync when connected.');
            }
        } catch (err: any) {
            showToast(`❌ Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading students…</Text>
            </View>
        );
    }

    const presentCount = students.filter(s => s.status === 'Present').length;
    const absentCount = students.filter(s => s.status === 'Absent').length;
    const lateCount = students.filter(s => s.status === 'Late').length;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {/* Premium ScreenHeader with back button */}
            <ScreenHeader
                title="📋 Attendance"
                subtitle={formatDate(selectedDate)}
                onBack={() => navigation.goBack()}
                rightActions={[{
                    icon: '✅',
                    label: 'Mark All Present',
                    onPress: () => markAll('Present'),
                }]}
                gradient={['#2563eb', '#1d4ed8']}
            />

            <OfflineBanner pendingCount={pendingCount} />

            {toast ? (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{toast}</Text>
                </View>
            ) : null}

            {/* Quick Mark Buttons */}
            <View style={styles.quickMarkRow}>
                {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(s => (
                    <TouchableOpacity
                        key={s}
                        onPress={() => markAll(s)}
                        style={[styles.quickMarkBtn, {
                            backgroundColor:
                                s === 'Present' ? '#d1fae5' :
                                s === 'Absent' ? '#fee2e2' : '#fef3c7',
                            borderColor:
                                s === 'Present' ? '#059669' :
                                s === 'Absent' ? '#ef4444' : '#f59e0b',
                        }]}
                        accessibilityLabel={`Mark all ${s}`}
                    >
                        <Text style={{ fontSize: 9, fontWeight: '800', color:
                            s === 'Present' ? '#065f46' :
                            s === 'Absent' ? '#991b1b' : '#92400e'
                        }}>All {s.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {students.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyEmoji}>📋</Text>
                    <Text style={styles.emptyText}>No students found. Please check your class assignment in the web portal.</Text>
                </View>
            ) : (
                <>
                    <View style={styles.statsRow}>
                        <View style={[styles.statChip, { backgroundColor: '#d1fae5', borderColor: '#059669' }]}>
                            <Text style={[styles.statChipText, { color: '#065f46' }]}>✅ {presentCount} Present</Text>
                        </View>
                        <View style={[styles.statChip, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
                            <Text style={[styles.statChipText, { color: '#991b1b' }]}>❌ {absentCount} Absent</Text>
                        </View>
                        <View style={[styles.statChip, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                            <Text style={[styles.statChipText, { color: '#92400e' }]}>⏰ {lateCount} Late</Text>
                        </View>
                    </View>

                    <FlatList
                        data={students}
                        keyExtractor={item => String(item.student_id)}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                onLongPress={() => navigation.navigate('StudentProfile', { studentId: item.student_id })}
                                style={[styles.studentRow, index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}
                                accessibilityLabel={`${item.student_name} attendance`}
                            >
                                <View style={styles.studentInfo}>
                                    <Text style={styles.studentName}>{item.student_name}</Text>
                                    <Text style={styles.studentAdm}>{item.admission_number}</Text>
                                </View>
                                <View style={styles.statusBtns}>
                                    {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => setStatus(item.student_id, s)}
                                            style={[
                                                styles.statusBtn,
                                                item.status === s && s === 'Present' && styles.statusBtnPresent,
                                                item.status === s && s === 'Absent' && styles.statusBtnAbsent,
                                                item.status === s && s === 'Late' && styles.statusBtnLate,
                                            ]}
                                            accessibilityLabel={`Mark ${item.student_name} as ${s}`}
                                        >
                                            <Text style={[
                                                styles.statusBtnText,
                                                item.status === s && styles.statusBtnTextActive,
                                            ]}>
                                                {s === 'Present' ? 'P' : s === 'Absent' ? 'A' : 'L'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        )}
                    />

                    <View style={styles.saveBar}>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={styles.saveBtn}
                            accessibilityLabel="Save attendance"
                        >
                            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.saveBtnGrad}>
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveBtnText}>
                                        {isConnected ? '💾 Save Attendance' : '📡 Save Offline'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    quickMarkRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
    quickMarkBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
    statsRow: { flexDirection: 'row', gap: 8, backgroundColor: C.card, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    statChip: { flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
    statChipText: { fontSize: 11, fontWeight: '800' },
    listContent: { paddingBottom: 100 },
    studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 13, fontWeight: '700', color: C.text },
    studentAdm: { fontSize: 10, color: C.textDim, marginTop: 1 },
    statusBtns: { flexDirection: 'row', gap: 6 },
    statusBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    statusBtnPresent: { backgroundColor: '#d1fae5', borderColor: '#059669' },
    statusBtnAbsent: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
    statusBtnLate: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
    statusBtnText: { fontSize: 11, fontWeight: '900', color: C.textSub },
    statusBtnTextActive: { color: C.text },
    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
    saveBtn: { borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
    toast: { backgroundColor: '#1e293b', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12 },
    toastText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});
