// ═══════════════════════════════════════════════════════════════════════
// APSIMS Ultra — Parent Health Record Screen v2.0
// Full health profile + clinic visits history
// Super-modern light theme matching web app exactly
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import {
    getStudentHealthRecord,
    HealthRecord, HealthAllergy, ClinicVisit,
} from '../../lib/supabase';
import { cacheData, getCachedData, formatCacheTimestamp } from '../../lib/offline';
import { useNetworkStatus } from '../../lib/netinfo';

// ── Web-app matching colors ───────────────────────────────────────────
const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', primaryLight: '#ede9fe',
    teal: '#0d9488', tealLight: '#ccfbf1',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    info: '#3b82f6', infoLight: '#eff6ff',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

function fmt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Vital Card ────────────────────────────────────────────────────────
function VitalCard({ emoji, label, value, color, bg }: {
    emoji: string; label: string; value: string; color: string; bg: string;
}) {
    return (
        <View style={[styles.vitalCard, { backgroundColor: bg, borderColor: color + '40' }]}>
            <Text style={styles.vitalEmoji}>{emoji}</Text>
            <Text style={[styles.vitalValue, { color }]}>{value || '—'}</Text>
            <Text style={[styles.vitalLabel, { color }]}>{label}</Text>
        </View>
    );
}

// ── Section Card ──────────────────────────────────────────────────────
function SectionCard({ emoji, title, children, accent = C.primary }: {
    emoji: string; title: string; children: React.ReactNode; accent?: string;
}) {
    return (
        <View style={styles.sectionCard}>
            <View style={[styles.sectionHeader, { borderLeftColor: accent }]}>
                <Text style={styles.sectionEmoji}>{emoji}</Text>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

// ── Clinic Visit Card ─────────────────────────────────────────────────
function VisitCard({ visit }: { visit: ClinicVisit }) {
    const [open, setOpen] = useState(false);
    return (
        <TouchableOpacity style={styles.visitCard} onPress={() => setOpen(!open)} activeOpacity={0.85}>
            <View style={styles.visitHeader}>
                <View style={styles.visitDateWrap}>
                    <Text style={styles.visitDateDay}>{new Date(visit.visit_date).getDate()}</Text>
                    <Text style={styles.visitDateMonth}>
                        {new Date(visit.visit_date).toLocaleString('en', { month: 'short' })}
                    </Text>
                    <Text style={styles.visitDateYear}>{new Date(visit.visit_date).getFullYear()}</Text>
                </View>
                <View style={styles.visitMain}>
                    <Text style={styles.visitComplaint} numberOfLines={open ? undefined : 1}>
                        {visit.complaint || 'General visit'}
                    </Text>
                    {visit.diagnosis ? (
                        <Text style={styles.visitDiagnosis} numberOfLines={open ? undefined : 1}>
                            Dx: {visit.diagnosis}
                        </Text>
                    ) : null}
                </View>
                <View style={[
                    styles.visitStatus,
                    { backgroundColor: visit.discharged ? C.accentLight : C.warningLight }
                ]}>
                    <Text style={[
                        styles.visitStatusText,
                        { color: visit.discharged ? C.accent : C.warning }
                    ]}>
                        {visit.discharged ? '✅ Done' : '⏳ Active'}
                    </Text>
                </View>
            </View>

            {open && (
                <View style={styles.visitDetails}>
                    <View style={styles.detailDivider} />
                    {[
                        ['💊 Treatment', visit.treatment],
                        ['🧴 Medication Given', visit.medication_given],
                        ['🌡️ Temperature', visit.temperature ? `${visit.temperature}°C` : null],
                        ['💓 Blood Pressure', visit.blood_pressure],
                        ['🏥 Referred To', visit.referred_to],
                        ['🕐 Discharge Time', visit.discharge_time],
                        ['👨‍⚕️ Attended By', visit.attended_by],
                        ['📝 Notes', visit.notes],
                        ['📚 Term', visit.term_id],
                    ].filter(([, v]) => v).map(([label, value]) => (
                        <View key={String(label)} style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{label}</Text>
                            <Text style={styles.detailValue}>{String(value)}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Text style={styles.visitToggle}>{open ? '▲ Less' : '▼ Details'}</Text>
        </TouchableOpacity>
    );
}

// ── Row Item inside section ───────────────────────────────────────────
function DataRow({ label, value, accent = C.textSub }: { label: string; value: string | null; accent?: string }) {
    return (
        <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>{label}</Text>
            <Text style={[styles.dataValue, { color: value ? C.text : C.textDim }]}>{value || 'Not recorded'}</Text>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function HealthRecordScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const { isConnected } = useNetworkStatus();

    const studentId = session?.linked_student_id || 0;
    const studentName = session?.student_name || 'Student';
    const cacheKey = `parent_${session?.portal_user_id}_health`;

    const [record, setRecord] = useState<HealthRecord | null>(null);
    const [allergies, setAllergies] = useState<HealthAllergy[]>([]);
    const [clinicVisits, setClinicVisits] = useState<ClinicVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cacheLabel, setCacheLabel] = useState('');
    const [tab, setTab] = useState<'profile' | 'visits'>('profile');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (isConnected) {
                const { record: r, allergies: a, clinicVisits: cv } = await getStudentHealthRecord(studentId);
                setRecord(r);
                setAllergies(a);
                setClinicVisits(cv);
                await cacheData(cacheKey, { record: r, allergies: a, clinicVisits: cv });
                setCacheLabel('');
            } else {
                const { data, timestamp } = await getCachedData<{ record: HealthRecord | null; allergies: HealthAllergy[]; clinicVisits: ClinicVisit[] }>(cacheKey);
                setRecord(data?.record || null);
                setAllergies(data?.allergies || []);
                setClinicVisits(data?.clinicVisits || []);
                setCacheLabel(formatCacheTimestamp(timestamp));
            }
        } catch {
            const { data, timestamp } = await getCachedData<any>(cacheKey);
            setRecord(data?.record || null);
            setAllergies(data?.allergies || []);
            setClinicVisits(data?.clinicVisits || []);
            setCacheLabel(formatCacheTimestamp(timestamp));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, isConnected, cacheKey]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(true); };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.teal} />

            {/* Header */}
            <LinearGradient colors={['#0d9488', '#059669']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>🏥 Health Records</Text>
                    <Text style={styles.headerSub}>{studentName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {/* Offline */}
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>📵 Offline {cacheLabel ? `· ${cacheLabel}` : ''}</Text>
                </View>
            )}

            {/* Tab switcher */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'profile' && styles.tabBtnActive]}
                    onPress={() => setTab('profile')}
                >
                    <Text style={[styles.tabText, tab === 'profile' && styles.tabTextActive]}>
                        🩺 Health Profile
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'visits' && styles.tabBtnActive]}
                    onPress={() => setTab('visits')}
                >
                    <Text style={[styles.tabText, tab === 'visits' && styles.tabTextActive]}>
                        🏥 Clinic Visits ({clinicVisits.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={C.teal} />
                        <Text style={styles.loadingText}>Loading health records…</Text>
                    </View>
                ) : tab === 'profile' ? (
                    <>
                        {!record ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🏥</Text>
                                <Text style={styles.emptyTitle}>No Health Profile</Text>
                                <Text style={styles.emptySub}>No health record on file for {studentName}. Please contact the school clinic.</Text>
                            </View>
                        ) : (
                            <>
                                {/* Vitals grid */}
                                <Text style={styles.groupTitle}>📊 Vitals</Text>
                                <View style={styles.vitalsGrid}>
                                    <VitalCard emoji="🩸" label="Blood Group" value={record.blood_group || '—'} color={C.danger} bg={C.dangerLight} />
                                    <VitalCard emoji="🧬" label="Genotype" value={record.genotype || '—'} color={C.primary} bg={C.primaryLight} />
                                    <VitalCard emoji="📏" label="Height" value={record.height_cm ? `${record.height_cm} cm` : '—'} color={C.teal} bg={C.tealLight} />
                                    <VitalCard emoji="⚖️" label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : '—'} color={C.accent} bg={C.accentLight} />
                                </View>

                                {/* Sensory */}
                                <SectionCard emoji="👁️" title="Sensory & Dental" accent={C.info}>
                                    <DataRow label="Vision Left" value={record.vision_left} />
                                    <DataRow label="Vision Right" value={record.vision_right} />
                                    <DataRow label="Hearing" value={record.hearing} />
                                    <DataRow label="Dental Notes" value={record.dental_notes} />
                                </SectionCard>

                                {/* Medical */}
                                <SectionCard emoji="💊" title="Medical Information" accent={C.danger}>
                                    <DataRow label="Chronic Conditions" value={record.chronic_conditions} />
                                    <DataRow label="Current Medications" value={record.current_medications} />
                                    <DataRow label="Immunization Status" value={record.immunization_status} />
                                    <DataRow label="Allergies" value={record.allergies} />
                                    <DataRow label="Disability / Special Needs" value={record.disability_notes} />
                                </SectionCard>

                                {/* Allergies from allergies table */}
                                {allergies.length > 0 && (
                                    <SectionCard emoji="🚨" title={`Known Allergies (${allergies.length})`} accent={C.danger}>
                                        {allergies.map((a, i) => (
                                            <View key={a.id} style={[styles.allergyRow, i < allergies.length - 1 && styles.allergyRowBorder]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.allergenName}>{a.allergen}</Text>
                                                    {a.reaction ? <Text style={styles.allergenReaction}>Reaction: {a.reaction}</Text> : null}
                                                    {a.management_plan ? <Text style={styles.allergenPlan}>Plan: {a.management_plan}</Text> : null}
                                                </View>
                                                <View style={[styles.severityBadge, {
                                                    backgroundColor: a.severity === 'severe' ? C.dangerLight : C.warningLight
                                                }]}>
                                                    <Text style={[styles.severityText, {
                                                        color: a.severity === 'severe' ? C.danger : C.warning
                                                    }]}>{a.severity || 'mild'}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </SectionCard>
                                )}

                                {/* Last updated */}
                                {record.updated_at && (
                                    <View style={styles.updatedNote}>
                                        <Text style={styles.updatedText}>
                                            🕐 Last updated: {fmt(record.updated_at)}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.readonlyNote}>
                                    <Text style={styles.readonlyText}>🔒 Records are read-only. Contact the school clinic to update information.</Text>
                                </View>
                            </>
                        )}
                    </>
                ) : (
                    /* CLINIC VISITS TAB */
                    <>
                        {clinicVisits.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🏥</Text>
                                <Text style={styles.emptyTitle}>No Clinic Visits</Text>
                                <Text style={styles.emptySub}>{studentName} has no recorded clinic visits.</Text>
                            </View>
                        ) : (
                            <>
                                {/* Visit stats */}
                                <View style={styles.statsRow}>
                                    <View style={[styles.statBox, { backgroundColor: C.tealLight, borderColor: C.teal + '33' }]}>
                                        <Text style={[styles.statNum, { color: C.teal }]}>{clinicVisits.length}</Text>
                                        <Text style={[styles.statLbl, { color: C.teal }]}>Total Visits</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: C.accentLight, borderColor: C.accent + '33' }]}>
                                        <Text style={[styles.statNum, { color: C.accent }]}>
                                            {clinicVisits.filter(v => v.discharged).length}
                                        </Text>
                                        <Text style={[styles.statLbl, { color: C.accent }]}>Discharged</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: C.warningLight, borderColor: C.warning + '33' }]}>
                                        <Text style={[styles.statNum, { color: C.warning }]}>
                                            {clinicVisits.filter(v => v.referred_to).length}
                                        </Text>
                                        <Text style={[styles.statLbl, { color: C.warning }]}>Referred</Text>
                                    </View>
                                </View>

                                <Text style={styles.groupTitle}>Recent Visits</Text>
                                {clinicVisits.map(v => <VisitCard key={v.id} visit={v} />)}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.teal },
    scroll: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 40 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#ffffff22' },
    backIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
    headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', marginTop: 2 },

    // Offline
    offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
    offlineText: { color: '#92400e', fontSize: 12, fontWeight: '600' },

    // Tab bar
    tabBar: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: C.teal },
    tabText: { fontSize: 13, fontWeight: '600', color: C.textDim },
    tabTextActive: { color: C.teal, fontWeight: '800' },

    // Loading
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { color: C.textDim, marginTop: 12, fontSize: 14, fontWeight: '500' },

    // Group title
    groupTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10, marginTop: 4 },

    // Vitals grid
    vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    vitalCard: {
        flex: 1, minWidth: '44%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
        borderRadius: 16, borderWidth: 1,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    vitalEmoji: { fontSize: 24, marginBottom: 6 },
    vitalValue: { fontSize: 20, fontWeight: '900' },
    vitalLabel: { fontSize: 10, fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Section cards
    sectionCard: {
        backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
        marginBottom: 12, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, borderLeftWidth: 4 },
    sectionEmoji: { fontSize: 16, marginRight: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    sectionBody: { padding: 4 },

    // Data rows
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dataLabel: { fontSize: 12, fontWeight: '600', color: C.textDim, flex: 1 },
    dataValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1 },

    // Allergies
    allergyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    allergyRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    allergenName: { fontSize: 13, fontWeight: '700', color: C.text },
    allergenReaction: { fontSize: 11, color: C.textSub, marginTop: 2 },
    allergenPlan: { fontSize: 11, color: C.teal, marginTop: 2, fontWeight: '600' },
    severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    severityText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },

    // Clinic visit cards
    visitCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    visitHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    visitDateWrap: {
        backgroundColor: C.tealLight, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10,
        alignItems: 'center', minWidth: 50,
    },
    visitDateDay: { fontSize: 22, fontWeight: '900', color: C.teal, lineHeight: 24 },
    visitDateMonth: { fontSize: 11, fontWeight: '700', color: C.teal, textTransform: 'uppercase' },
    visitDateYear: { fontSize: 10, color: C.teal, fontWeight: '500' },
    visitMain: { flex: 1 },
    visitComplaint: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 20 },
    visitDiagnosis: { fontSize: 12, color: C.textSub, marginTop: 3, fontWeight: '500' },
    visitStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
    visitStatusText: { fontSize: 11, fontWeight: '700' },
    visitDetails: { marginTop: 8 },
    detailDivider: { height: 1, backgroundColor: C.border, marginBottom: 10 },
    detailRow: { marginBottom: 8 },
    detailLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    detailValue: { fontSize: 13, color: C.text, fontWeight: '500', lineHeight: 18 },
    visitToggle: { fontSize: 12, color: C.teal, fontWeight: '700', textAlign: 'center', marginTop: 10 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statBox: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
    statNum: { fontSize: 24, fontWeight: '900' },
    statLbl: { fontSize: 11, fontWeight: '700', marginTop: 2 },

    // Empty
    emptyCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 36, alignItems: 'center',
        borderWidth: 1, borderColor: C.border, marginTop: 8,
    },
    emptyIcon: { fontSize: 52, marginBottom: 14 },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptySub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

    // Footer notes
    updatedNote: { backgroundColor: C.tealLight, borderRadius: 12, padding: 10, marginBottom: 8, alignItems: 'center' },
    updatedText: { fontSize: 12, color: C.teal, fontWeight: '600' },
    readonlyNote: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, marginTop: 4, alignItems: 'center' },
    readonlyText: { fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: 18 },
});
