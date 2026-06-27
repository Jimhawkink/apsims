import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { getStudentHealthRecord, HealthRecord, HealthAllergy } from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    teal: '#0d9488', tealLight: '#ccfbf1',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function HealthRecordScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [record, setRecord] = useState<HealthRecord | null>(null);
    const [allergies, setAllergies] = useState<HealthAllergy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const studentId = session?.linked_student_id || 0;

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { record: r, allergies: a } = await getStudentHealthRecord(studentId);
            setRecord(r);
            setAllergies(a);
        } catch (err: any) {
            console.error('HealthRecordScreen error:', err.message);
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
                <Text style={styles.loadingText}>Loading health records…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
            <ScreenHeader
                title="🏥 Health Records"
                onBack={() => navigation.goBack()}
                gradient={['#059669','#047857']}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {!record ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🏥</Text>
                        <Text style={styles.emptyText}>No health records on file. Please contact the school office.</Text>
                    </View>
                ) : (
                    <>
                        {/* Info Cards */}
                        <View style={styles.infoGrid}>
                            <InfoCard emoji="🩸" label="Blood Group" value={record.blood_group || 'Not recorded'} color={C.danger} />
                            <InfoCard emoji="🧬" label="Genotype" value={record.genotype || 'Not recorded'} color={C.primary} />
                            <InfoCard emoji="📏" label="Height" value={record.height_cm ? `${record.height_cm} cm` : 'Not recorded'} color={C.teal} />
                            <InfoCard emoji="⚖️" label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : 'Not recorded'} color={C.accent} />
                        </View>

                        {/* Conditions */}
                        {record.chronic_conditions && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🫀 Chronic Conditions</Text>
                                <Text style={styles.sectionText}>{record.chronic_conditions}</Text>
                            </View>
                        )}

                        {record.current_medications && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>💊 Current Medications</Text>
                                <Text style={styles.sectionText}>{record.current_medications}</Text>
                            </View>
                        )}

                        {record.allergies && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>⚠️ Allergies (General)</Text>
                                <Text style={styles.sectionText}>{record.allergies}</Text>
                            </View>
                        )}

                        {record.disability_notes && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>♿ Special Needs / Disability</Text>
                                <Text style={styles.sectionText}>{record.disability_notes}</Text>
                            </View>
                        )}

                        {/* Allergy List */}
                        {allergies.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🚨 Known Allergies</Text>
                                {allergies.map((a, idx) => (
                                    <View key={a.id} style={[styles.allergyRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.allergenName}>{a.allergen}</Text>
                                            {a.reaction ? <Text style={styles.allergenReaction}>{a.reaction}</Text> : null}
                                            {a.management_plan ? <Text style={styles.allergenPlan}>Plan: {a.management_plan}</Text> : null}
                                        </View>
                                        <View style={[styles.severityChip, {
                                            backgroundColor: a.severity === 'severe' ? C.dangerLight : C.warningLight
                                        }]}>
                                            <Text style={[styles.severityText, {
                                                color: a.severity === 'severe' ? C.danger : C.warning
                                            }]}>
                                                {a.severity || 'mild'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.readOnlyNote}>
                            <Text style={styles.readOnlyText}>🔒 Health records are read-only. Contact the school office to update.</Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function InfoCard({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
    return (
        <View style={[styles.infoCard, { borderLeftColor: color }]}>
            <Text style={styles.infoEmoji}>{emoji}</Text>
            <Text style={[styles.infoValue, { color }]}>{value}</Text>
            <Text style={styles.infoLabel}>{label}</Text>
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
    content: { padding: 16, paddingBottom: 40 },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    infoCard: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, alignItems: 'center', gap: 4 },
    infoEmoji: { fontSize: 20 },
    infoValue: { fontSize: 16, fontWeight: '900' },
    infoLabel: { fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    section: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: C.text, padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    sectionText: { fontSize: 13, color: C.textSub, padding: 12, lineHeight: 20 },
    allergyRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    allergenName: { fontSize: 13, fontWeight: '700', color: C.text },
    allergenReaction: { fontSize: 11, color: C.textSub, marginTop: 2 },
    allergenPlan: { fontSize: 11, color: C.teal, marginTop: 2, fontWeight: '600' },
    severityChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    severityText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
    readOnlyNote: { backgroundColor: '#F8FAFF', borderRadius: 16, padding: 12, marginTop: 4 },
    readOnlyText: { fontSize: 11, color: C.textSub, textAlign: 'center' },
});
