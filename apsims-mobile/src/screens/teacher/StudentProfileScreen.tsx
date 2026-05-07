import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import {
    getStudentDetail, getStudentFeePayments, getStudentFeeStructures,
    formatKES, StudentDetail,
} from '../../lib/supabase';

type RouteProps = RouteProp<RootStackParamList, 'StudentProfile'>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function StudentProfileScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { studentId } = route.params;

    const [student, setStudent] = useState<StudentDetail | null>(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [detail, pays, structs] = await Promise.all([
                    getStudentDetail(studentId),
                    getStudentFeePayments(studentId),
                    getStudentFeeStructures(0), // Will be updated with form_id
                ]);
                setStudent(detail);
                if (detail) {
                    const [pays2, structs2] = await Promise.all([
                        getStudentFeePayments(studentId),
                        getStudentFeeStructures(detail.form_id),
                    ]);
                    const totalPaid = pays2.reduce((s, p) => s + Number(p.amount || 0), 0);
                    const totalDue = structs2.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
                    setBalance(Math.max(0, totalDue - totalPaid));
                }
            } catch (err: any) {
                console.error('StudentProfileScreen error:', err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [studentId]);

    const callGuardian = () => {
        if (student?.guardian_phone) {
            Linking.openURL(`tel:${student.guardian_phone}`);
        }
    };

    const initials = student
        ? `${student.first_name[0]}${student.last_name[0]}`.toUpperCase()
        : '??';

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading profile…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>👤 Student Profile</Text>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.closeBtn}
                            accessibilityLabel="Close profile"
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {!student ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>👤</Text>
                        <Text style={styles.emptyText}>Student not found.</Text>
                    </View>
                ) : (
                    <>
                        {/* Avatar */}
                        <View style={styles.avatarSection}>
                            {student.photo_url ? (
                                <Image source={{ uri: student.photo_url }} style={styles.photo} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{initials}</Text>
                                </View>
                            )}
                            <Text style={styles.studentName}>
                                {student.first_name} {student.last_name}
                            </Text>
                            <Text style={styles.studentAdm}>{student.admission_number}</Text>
                        </View>

                        {/* Info Cards */}
                        <View style={styles.infoGrid}>
                            <InfoRow emoji="🎓" label="Form" value={student.form_name} />
                            <InfoRow emoji="🏫" label="Stream" value={student.stream_name} />
                            <InfoRow emoji="⚧" label="Gender" value={student.gender} />
                        </View>

                        {/* Guardian */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>👨‍👩‍👧 Guardian</Text>
                            <View style={styles.guardianRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.guardianName}>{student.guardian_name || 'Not recorded'}</Text>
                                    {student.guardian_phone && (
                                        <Text style={styles.guardianPhone}>{student.guardian_phone}</Text>
                                    )}
                                </View>
                                {student.guardian_phone && (
                                    <TouchableOpacity
                                        onPress={callGuardian}
                                        style={styles.callBtn}
                                        accessibilityLabel={`Call ${student.guardian_name}`}
                                    >
                                        <LinearGradient colors={['#059669', '#047857']} style={styles.callBtnGrad}>
                                            <Text style={styles.callBtnText}>📞 Call</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Fee Balance */}
                        <View style={[styles.section, { borderLeftWidth: 4, borderLeftColor: balance > 0 ? C.danger : C.accent }]}>
                            <Text style={styles.sectionTitle}>💰 Fee Balance</Text>
                            <Text style={[styles.balanceAmount, { color: balance > 0 ? C.danger : C.accent }]}>
                                {formatKES(balance)}
                            </Text>
                            {balance === 0 && (
                                <Text style={styles.paidLabel}>✅ Fees fully paid</Text>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function InfoRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>{emoji}</Text>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value || '—'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    content: { padding: 20, paddingBottom: 40 },
    avatarSection: { alignItems: 'center', marginBottom: 20 },
    photo: { width: 80, height: 80, borderRadius: 20, marginBottom: 10 },
    avatarCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
    studentName: { fontSize: 20, fontWeight: '900', color: C.text },
    studentAdm: { fontSize: 12, color: C.textSub, marginTop: 2 },
    infoGrid: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    infoEmoji: { fontSize: 18, width: 28 },
    infoLabel: { flex: 1, fontSize: 12, color: C.textSub, fontWeight: '600' },
    infoValue: { fontSize: 13, color: C.text, fontWeight: '700' },
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
    guardianRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    guardianName: { fontSize: 14, fontWeight: '700', color: C.text },
    guardianPhone: { fontSize: 12, color: C.textSub, marginTop: 2 },
    callBtn: { borderRadius: 12, overflow: 'hidden' },
    callBtnGrad: { paddingHorizontal: 16, paddingVertical: 10 },
    callBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
    balanceAmount: { fontSize: 28, fontWeight: '900' },
    paidLabel: { fontSize: 12, color: C.accent, fontWeight: '700', marginTop: 4 },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub },
});
