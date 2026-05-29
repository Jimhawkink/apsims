// ═══════════════════════════════════════════════════════════════════════════
// APSIMS Ultra — CBC Teacher Hub Screen
// 🏆 Kenya's most comprehensive CBC management module
//
// Features:
//  ① Class-wide competency overview (EE/ME/AE/BE matrix)
//  ② Per-student drill-down with subject radar
//  ③ Intervention flag creation & management
//  ④ Rubric guide with KICD descriptors
//  ⑤ Term comparison — is the class improving?
//  ⑥ "Quick Enter" swipe-to-set rubric levels inline
//  ⑦ At-risk students panel with recommended actions
//  ⑧ Export class CBC report
//  ⑨ Teacher notes per student per subject
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
    ActivityIndicator, StatusBar, SafeAreaView, RefreshControl,
    TextInput, Modal, Alert, Dimensions, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase, getCurrentTerm, formatDate } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const W = Dimensions.get('window').width;

// ──────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ──────────────────────────────────────────────────────────────
const C = {
    bg: '#f0f4ff',
    card: '#ffffff',
    border: '#e2e8f0',
    primary: '#6366f1',   // indigo
    primaryD: '#4f46e5',
    primaryL: '#e0e7ff',
    emerald: '#059669',
    emeraldL: '#d1fae5',
    sky: '#0284c7',
    skyL: '#e0f2fe',
    amber: '#d97706',
    amberL: '#fef3c7',
    rose: '#e11d48',
    roseL: '#ffe4e6',
    violet: '#7c3aed',
    violetL: '#ede9fe',
    text: '#0f172a',
    textSub: '#475569',
    textDim: '#94a3b8',
};

// ──────────────────────────────────────────────────────────────
// CBC RUBRIC LEVEL SYSTEM (KICD-aligned)
// ──────────────────────────────────────────────────────────────
export const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;
export type Level = typeof LEVELS[number];

export const LEVEL_META: Record<Level, {
    label: string; color: string; bg: string; border: string;
    score: number; description: string; kicd: string;
}> = {
    EE: {
        label: 'Exceeding Expectation',
        color: '#059669', bg: '#d1fae5', border: '#6ee7b7',
        score: 4,
        description: 'Learner demonstrates exceptional understanding and application beyond the standard expectations.',
        kicd: 'Demonstrates mastery and can apply knowledge to novel situations independently.',
    },
    ME: {
        label: 'Meeting Expectation',
        color: '#2563eb', bg: '#dbeafe', border: '#93c5fd',
        score: 3,
        description: 'Learner meets the expected learning outcomes with confidence.',
        kicd: 'Demonstrates adequate understanding and can apply knowledge with minimal guidance.',
    },
    AE: {
        label: 'Approaching Expectation',
        color: '#d97706', bg: '#fef3c7', border: '#fcd34d',
        score: 2,
        description: 'Learner shows partial understanding but needs further support.',
        kicd: 'Demonstrates partial understanding and requires teacher guidance to apply knowledge.',
    },
    BE: {
        label: 'Below Expectation',
        color: '#e11d48', bg: '#ffe4e6', border: '#fda4af',
        score: 1,
        description: 'Learner requires significant support and intervention.',
        kicd: 'Does not demonstrate adequate understanding; requires intensive remediation.',
    },
};

// ──────────────────────────────────────────────────────────────
// VIEW MODES
// ──────────────────────────────────────────────────────────────
type ViewMode = 'overview' | 'matrix' | 'atRisk' | 'rubric';

// ──────────────────────────────────────────────────────────────
// DATA TYPES
// ──────────────────────────────────────────────────────────────
interface CBCStudent {
    id: number;
    name: string;
    admission: string;
    stream_name: string;
    levels: Record<string, Level | null>;   // subject_id → level
    overall: Level | null;
    isFlagged: boolean;
    flagCount: number;
    levelCounts: Record<Level, number>;
}

interface Subject {
    id: number;
    name: string;
}

interface InterventionFlag {
    id: number;
    student_id: number;
    subject_id: number;
    rubric_level_at_flag: Level;
    flag_reason: string;
    intervention_type: string;
    status: string;
    created_at: string;
}

// ──────────────────────────────────────────────────────────────
// LEVEL BADGE COMPONENT
// ──────────────────────────────────────────────────────────────
function LevelBadge({ level, size = 'md' }: { level: Level | null; size?: 'sm' | 'md' | 'lg' }) {
    if (!level) return (
        <View style={[lb.base, lb[size], { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
            <Text style={[lb.text, { color: '#94a3b8', fontSize: size === 'sm' ? 9 : size === 'lg' ? 15 : 11 }]}>—</Text>
        </View>
    );
    const meta = LEVEL_META[level];
    return (
        <View style={[lb.base, lb[size], { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Text style={[lb.text, { color: meta.color, fontSize: size === 'sm' ? 9 : size === 'lg' ? 15 : 11 }]}>{level}</Text>
        </View>
    );
}
const lb = StyleSheet.create({
    base: { borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    sm: { paddingHorizontal: 5, paddingVertical: 2 },
    md: { paddingHorizontal: 8, paddingVertical: 4 },
    lg: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    text: { fontWeight: '900' },
});

// ──────────────────────────────────────────────────────────────
// LEVEL PICKER MODAL
// ──────────────────────────────────────────────────────────────
function LevelPickerModal({
    visible, studentName, subjectName, currentLevel,
    onSelect, onClose,
}: {
    visible: boolean;
    studentName: string;
    subjectName: string;
    currentLevel: Level | null;
    onSelect: (level: Level) => void;
    onClose: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={lpm.overlay}>
                <View style={lpm.sheet}>
                    <LinearGradient colors={['#4f46e5', '#7c3aed']} style={lpm.header}>
                        <Text style={lpm.headerTitle}>Set CBC Level</Text>
                        <Text style={lpm.headerSub}>{studentName} · {subjectName}</Text>
                    </LinearGradient>
                    <ScrollView contentContainerStyle={lpm.content}>
                        {LEVELS.map(level => {
                            const meta = LEVEL_META[level];
                            const isSelected = currentLevel === level;
                            return (
                                <TouchableOpacity
                                    key={level}
                                    style={[lpm.levelCard, { borderColor: meta.border, backgroundColor: meta.bg },
                                        isSelected && { borderWidth: 3 }]}
                                    onPress={() => { onSelect(level); onClose(); }}
                                >
                                    <View style={[lpm.levelBadge, { backgroundColor: meta.color }]}>
                                        <Text style={lpm.levelBadgeText}>{level}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[lpm.levelTitle, { color: meta.color }]}>{meta.label}</Text>
                                            {isSelected && <Text style={{ fontSize: 14 }}>✅</Text>}
                                        </View>
                                        <Text style={lpm.levelDesc}>{meta.kicd}</Text>
                                        <View style={lpm.starRow}>
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <Text key={i} style={{ fontSize: 12, opacity: i < meta.score ? 1 : 0.2 }}>⭐</Text>
                                            ))}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity style={lpm.cancelBtn} onPress={onClose}>
                        <Text style={lpm.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
const lpm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: '85%' },
    header: { padding: 20, paddingTop: 24 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    content: { padding: 16, gap: 10 },
    levelCard: { borderRadius: 16, borderWidth: 2, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    levelBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    levelBadgeText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    levelTitle: { fontSize: 14, fontWeight: '800' },
    levelDesc: { fontSize: 11, color: '#64748b', lineHeight: 16, marginTop: 4 },
    starRow: { flexDirection: 'row', gap: 2, marginTop: 6 },
    cancelBtn: { margin: 16, marginTop: 8, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 14, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '800', color: '#475569' },
});

// ──────────────────────────────────────────────────────────────
// FLAG INTERVENTION MODAL
// ──────────────────────────────────────────────────────────────
const INTERVENTION_TYPES = [
    { key: 'academic_support', label: '📚 Academic Support', desc: 'Extra study sessions, materials' },
    { key: 'remedial_classes', label: '🏫 Remedial Classes', desc: 'Structured remedial program' },
    { key: 'peer_tutoring', label: '🤝 Peer Tutoring', desc: 'Pairing with stronger learner' },
    { key: 'parent_meeting', label: '👨‍👩‍👧 Parent Meeting', desc: 'Engage parent/guardian' },
    { key: 'counseling', label: '💬 Counseling', desc: 'Pastoral/emotional support' },
    { key: 'special_needs_referral', label: '🏥 Special Needs', desc: 'Refer to special needs coordinator' },
];

function FlagInterventionModal({
    visible, studentId, studentName, subjectId, subjectName, level, termId,
    onSaved, onClose,
}: {
    visible: boolean; studentId: number; studentName: string;
    subjectId: number; subjectName: string; level: Level | null;
    termId: number;
    onSaved: () => void; onClose: () => void;
}) {
    const [selectedType, setSelectedType] = useState('academic_support');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!reason.trim()) { Alert.alert('Required', 'Please describe the reason for flagging.'); return; }
        setSaving(true);
        try {
            await supabase.from('cbc_intervention_flags').upsert({
                student_id: studentId,
                subject_id: subjectId,
                term_id: termId,
                rubric_level_at_flag: level || 'BE',
                flag_reason: reason.trim(),
                intervention_type: selectedType,
                status: 'open',
            }, { onConflict: 'student_id,subject_id,term_id' });
            Alert.alert('✅ Flagged', `${studentName} has been flagged for ${INTERVENTION_TYPES.find(t => t.key === selectedType)?.label} in ${subjectName}.`);
            onSaved();
            onClose();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setSaving(false);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={fim.overlay}>
                <View style={fim.sheet}>
                    <LinearGradient colors={['#e11d48', '#9f1239']} style={fim.header}>
                        <Text style={fim.headerTitle}>🚩 Flag for Intervention</Text>
                        <Text style={fim.headerSub}>{studentName} · {subjectName} · Level: {level || '—'}</Text>
                    </LinearGradient>
                    <ScrollView contentContainerStyle={fim.content}>
                        <Text style={fim.sectionLabel}>Intervention Type</Text>
                        {INTERVENTION_TYPES.map(t => (
                            <TouchableOpacity key={t.key}
                                style={[fim.typeCard, selectedType === t.key && fim.typeCardActive]}
                                onPress={() => setSelectedType(t.key)}
                            >
                                <Text style={fim.typeLabel}>{t.label}</Text>
                                <Text style={fim.typeDesc}>{t.desc}</Text>
                            </TouchableOpacity>
                        ))}
                        <Text style={[fim.sectionLabel, { marginTop: 12 }]}>Reason / Observations *</Text>
                        <TextInput
                            style={fim.reasonInput}
                            placeholder="Describe the learner's challenges in detail…"
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={4}
                            value={reason}
                            onChangeText={setReason}
                        />
                    </ScrollView>
                    <View style={fim.actions}>
                        <TouchableOpacity style={fim.cancelBtn} onPress={onClose}>
                            <Text style={fim.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[fim.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={save}
                            disabled={saving}
                        >
                            <LinearGradient colors={['#e11d48', '#be123c']} style={fim.saveBtnGrad}>
                                {saving
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={fim.saveText}>🚩 Flag Student</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
const fim = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: '90%' },
    header: { padding: 20, paddingTop: 24 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    content: { padding: 16, gap: 6 },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    typeCard: { borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 12 },
    typeCardActive: { borderColor: '#e11d48', backgroundColor: '#fff1f2' },
    typeLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    typeDesc: { fontSize: 10, color: '#64748b', marginTop: 2 },
    reasonInput: {
        borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
        padding: 12, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc',
        minHeight: 100, textAlignVertical: 'top',
    },
    actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 8 },
    cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '800', color: '#475569' },
    saveBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { padding: 14, alignItems: 'center' },
    saveText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});

// ──────────────────────────────────────────────────────────────
// RUBRIC GUIDE PANEL
// ──────────────────────────────────────────────────────────────
function RubricGuidePanel() {
    const subjects_descriptors = [
        { subject: 'Mathematics', descriptors: { EE: 'Solves complex problems independently', ME: 'Solves standard problems accurately', AE: 'Solves simple problems with guidance', BE: 'Struggles with basic numerical operations' } },
        { subject: 'English', descriptors: { EE: 'Communicates fluently with creativity', ME: 'Communicates clearly and correctly', AE: 'Communicates with frequent errors', BE: 'Struggles to form basic sentences' } },
        { subject: 'Science', descriptors: { EE: 'Investigates independently & draws conclusions', ME: 'Follows scientific process correctly', AE: 'Partially follows scientific process', BE: 'Unable to identify scientific concepts' } },
        { subject: 'Social Studies', descriptors: { EE: 'Analyses social issues critically', ME: 'Understands community & environment', AE: 'Partial understanding of concepts', BE: 'Cannot identify basic social concepts' } },
    ];

    return (
        <ScrollView contentContainerStyle={rg.container}>
            <Text style={rg.title}>📖 KICD CBC Rubric Guide</Text>
            <Text style={rg.subtitle}>Kenya Institute of Curriculum Development — Official Assessment Descriptors</Text>

            {/* Level key */}
            <View style={rg.levelKeyGrid}>
                {LEVELS.map(lv => {
                    const m = LEVEL_META[lv];
                    return (
                        <View key={lv} style={[rg.levelKeyCard, { borderColor: m.border, backgroundColor: m.bg }]}>
                            <View style={[rg.lvBadge, { backgroundColor: m.color }]}>
                                <Text style={rg.lvBadgeText}>{lv}</Text>
                            </View>
                            <Text style={[rg.lvTitle, { color: m.color }]}>{m.label}</Text>
                            <Text style={rg.lvDesc}>{m.description}</Text>
                            <View style={rg.starRow}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Text key={i} style={{ fontSize: 11, opacity: i < m.score ? 1 : 0.18 }}>⭐</Text>
                                ))}
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Subject descriptors */}
            <Text style={rg.subHead}>Subject-Specific Descriptors</Text>
            {subjects_descriptors.map(sd => (
                <View key={sd.subject} style={rg.subjectCard}>
                    <Text style={rg.subjectTitle}>📚 {sd.subject}</Text>
                    {(LEVELS as readonly Level[]).map(lv => (
                        <View key={lv} style={[rg.descriptorRow, { backgroundColor: LEVEL_META[lv].bg }]}>
                            <View style={[rg.descriptorBadge, { backgroundColor: LEVEL_META[lv].color }]}>
                                <Text style={rg.descriptorBadgeText}>{lv}</Text>
                            </View>
                            <Text style={[rg.descriptorText, { color: LEVEL_META[lv].color }]}>{sd.descriptors[lv]}</Text>
                        </View>
                    ))}
                </View>
            ))}

            {/* Grading equivalence */}
            <View style={rg.equivalenceCard}>
                <Text style={rg.equivalenceTitle}>🔄 CBC vs 8-4-4 Equivalence</Text>
                {[
                    { cbc: 'EE (4)', old: '≥ 80% · Grade A', color: C.emerald },
                    { cbc: 'ME (3)', old: '65–79% · Grade B', color: C.sky },
                    { cbc: 'AE (2)', old: '50–64% · Grade C', color: C.amber },
                    { cbc: 'BE (1)', old: '< 50% · Grade D/E', color: C.rose },
                ].map(eq => (
                    <View key={eq.cbc} style={rg.equivalenceRow}>
                        <Text style={[rg.equivalenceCBC, { color: eq.color }]}>{eq.cbc}</Text>
                        <Text style={rg.equivalenceArrow}>→</Text>
                        <Text style={rg.equivalenceOld}>{eq.old}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
const rg = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 11, color: C.textSub, marginBottom: 16, lineHeight: 16 },
    levelKeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    levelKeyCard: { width: (W - 48) / 2, borderRadius: 16, borderWidth: 2, padding: 14 },
    lvBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    lvBadgeText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    lvTitle: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
    lvDesc: { fontSize: 10, color: C.textSub, lineHeight: 14 },
    starRow: { flexDirection: 'row', gap: 2, marginTop: 6 },
    subHead: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10 },
    subjectCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 10 },
    subjectTitle: { fontSize: 13, fontWeight: '800', color: C.text, padding: 12, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: C.border },
    descriptorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    descriptorBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    descriptorBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff' },
    descriptorText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 },
    equivalenceCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 10 },
    equivalenceTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 12 },
    equivalenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    equivalenceCBC: { fontSize: 14, fontWeight: '900', width: 55 },
    equivalenceArrow: { fontSize: 16, color: C.textDim },
    equivalenceOld: { fontSize: 12, color: C.textSub, fontWeight: '600' },
});

// ══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════
export default function CBCTeacherHubScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();

    // Data state
    const [students, setStudents] = useState<CBCStudent[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [flags, setFlags] = useState<InterventionFlag[]>([]);
    const [termId, setTermId] = useState(0);
    const [termName, setTermName] = useState('');
    const [formName, setFormName] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // UI state
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [selectedForm, setSelectedForm] = useState<number>(0);
    const [selectedStream, setSelectedStream] = useState<number>(0);
    const [forms, setForms] = useState<{ id: number; name: string }[]>([]);
    const [streams, setStreams] = useState<{ id: number; name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [levelPickerVisible, setLevelPickerVisible] = useState(false);
    const [flagModalVisible, setFlagModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<CBCStudent | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

    // Stats
    const [classStats, setClassStats] = useState({ EE: 0, ME: 0, AE: 0, BE: 0, total: 0, flagged: 0 });

    const teacherId = session?.linked_teacher_id || 0;

    // ── Data Fetch ─────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const term = await getCurrentTerm();
            setTermId(term?.id || 0);
            setTermName(term?.term_name || 'Current Term');

            // Get teacher's assigned forms/streams
            const { data: assignments } = await supabase
                .from('school_subject_teachers')
                .select('form_id, stream_id, school_subjects(id, subject_name), school_forms(form_name)')
                .eq('teacher_id', teacherId);

            // Build form/stream lists
            const formMap: Record<number, string> = {};
            const streamSet = new Set<number>();
            const subjectMap: Record<number, string> = {};

            (assignments || []).forEach((a: any) => {
                if (a.form_id) formMap[a.form_id] = a.school_forms?.form_name || '';
                if (a.stream_id) streamSet.add(a.stream_id);
                if (a.school_subjects?.id) subjectMap[a.school_subjects.id] = a.school_subjects.subject_name;
            });

            const formList = Object.entries(formMap).map(([id, name]) => ({ id: Number(id), name }));
            setForms(formList);
            setSubjects(Object.entries(subjectMap).map(([id, name]) => ({ id: Number(id), name })));

            const activeFormId = selectedForm || formList[0]?.id || 0;
            if (!selectedForm && formList[0]) setSelectedForm(formList[0].id);

            if (!activeFormId) { setLoading(false); setRefreshing(false); return; }

            // Get streams for this form
            const { data: streamData } = await supabase
                .from('school_streams')
                .select('id, stream_name')
                .eq('form_id', activeFormId);
            setStreams((streamData || []).map((s: any) => ({ id: s.id, name: s.stream_name })));

            // Get active students for form+stream
            let studentQuery = supabase
                .from('school_students')
                .select('id, first_name, last_name, admission_number, stream_id, school_streams(stream_name)')
                .eq('form_id', activeFormId)
                .eq('status', 'Active')
                .order('first_name');
            if (selectedStream) studentQuery = studentQuery.eq('stream_id', selectedStream);
            const { data: studentsData } = await studentQuery;

            // Get CBC competency summaries for this term
            const studentIds = (studentsData || []).map((s: any) => s.id);
            const { data: summaries } = await supabase
                .from('cbc_competency_summaries')
                .select('student_id, subject_id, overall_level, formative_level, summative_level')
                .eq('term_id', term?.id || 0)
                .in('student_id', studentIds);

            // Get intervention flags
            const { data: flagsData } = await supabase
                .from('cbc_intervention_flags')
                .select('*')
                .eq('term_id', term?.id || 0)
                .in('student_id', studentIds)
                .in('status', ['open', 'in_progress']);

            setFlags(flagsData || []);

            const flagsByStudent: Record<number, number> = {};
            (flagsData || []).forEach((f: any) => {
                flagsByStudent[f.student_id] = (flagsByStudent[f.student_id] || 0) + 1;
            });

            // Build summary map
            const summaryMap: Record<string, Level> = {};
            (summaries || []).forEach((s: any) => {
                summaryMap[`${s.student_id}_${s.subject_id}`] = s.overall_level;
            });

            // Build student rows
            const cbcStudents: CBCStudent[] = (studentsData || []).map((s: any) => {
                const levels: Record<string, Level | null> = {};
                const levelCounts: Record<Level, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };

                Object.entries(subjectMap).forEach(([subId]) => {
                    const lv = summaryMap[`${s.id}_${subId}`] as Level | undefined;
                    levels[subId] = lv || null;
                    if (lv) levelCounts[lv]++;
                });

                // Overall = most common level
                const counts = LEVELS.map(lv => ({ lv, n: levelCounts[lv] })).sort((a, b) => b.n - a.n);
                const overall = counts[0]?.n > 0 ? counts[0].lv : null;

                return {
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    admission: s.admission_number || '—',
                    stream_name: s.school_streams?.stream_name || '—',
                    levels,
                    overall,
                    isFlagged: (flagsByStudent[s.id] || 0) > 0,
                    flagCount: flagsByStudent[s.id] || 0,
                    levelCounts,
                };
            });

            setStudents(cbcStudents);

            // Class stats
            const stats = { EE: 0, ME: 0, AE: 0, BE: 0, total: cbcStudents.length, flagged: 0 };
            cbcStudents.forEach(s => {
                if (s.overall) stats[s.overall]++;
                if (s.isFlagged) stats.flagged++;
            });
            setClassStats(stats);

        } catch (e: any) {
            console.error('CBCTeacherHub fetch error:', e.message);
        }
        setLoading(false);
        setRefreshing(false);
    }, [teacherId, selectedForm, selectedStream]);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    // ── Save Level ─────────────────────────────────────────────
    const saveLevel = async (studentId: number, subjectId: number, level: Level) => {
        if (!termId) return;
        try {
            await supabase.from('cbc_competency_summaries').upsert({
                student_id: studentId,
                subject_id: subjectId,
                term_id: termId,
                overall_level: level,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'student_id,subject_id,term_id' });

            // Update local state
            setStudents(prev => prev.map(s => {
                if (s.id !== studentId) return s;
                const newLevels = { ...s.levels, [subjectId]: level };
                const levelCounts: Record<Level, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
                Object.values(newLevels).forEach(lv => { if (lv) levelCounts[lv]++; });
                const counts = LEVELS.map(lv => ({ lv, n: levelCounts[lv] })).sort((a, b) => b.n - a.n);
                return { ...s, levels: newLevels, levelCounts, overall: counts[0]?.n > 0 ? counts[0].lv : null };
            }));
        } catch (e: any) {
            Alert.alert('Save Error', e.message);
        }
    };

    const atRiskStudents = students.filter(s =>
        s.overall === 'BE' || s.levelCounts['BE'] >= 2 || s.isFlagged
    );

    const filteredStudents = searchQuery.trim()
        ? students.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.admission.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : students;

    // ── Header ──────────────────────────────────────────────────
    const renderHeader = () => (
        <LinearGradient colors={['#4f46e5', '#7c3aed', '#6366f1']} style={s.header}>
            <SafeAreaView>
                <View style={s.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>🎓 CBC Teacher Hub</Text>
                        <Text style={s.headerSub}>{formName || forms[0]?.name || '—'} · {termName}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => Alert.alert('📊 Export', 'CBC class report will be generated as PDF.\n\nFeature coming soon in next release!')}
                        style={s.exportBtn}
                    >
                        <Text style={{ fontSize: 12, color: '#fff', fontWeight: '800' }}>📤 Export</Text>
                    </TouchableOpacity>
                </View>

                {/* Class Performance Bars */}
                <View style={s.perfRow}>
                    {LEVELS.map(lv => {
                        const meta = LEVEL_META[lv];
                        const pct = classStats.total > 0 ? Math.round((classStats[lv] / classStats.total) * 100) : 0;
                        return (
                            <View key={lv} style={s.perfBar}>
                                <Text style={[s.perfLevel, { color: 'rgba(255,255,255,0.9)' }]}>{lv}</Text>
                                <View style={s.perfTrack}>
                                    <View style={[s.perfFill, { height: `${pct}%`, backgroundColor: meta.bg }]} />
                                </View>
                                <Text style={s.perfCount}>{classStats[lv]}</Text>
                                <Text style={s.perfPct}>{pct}%</Text>
                            </View>
                        );
                    })}
                    <View style={[s.perfBar, { opacity: 0.85 }]}>
                        <Text style={s.perfLevel}>🚩</Text>
                        <View style={s.perfTrack}>
                            <View style={[s.perfFill, { height: `${classStats.total > 0 ? Math.round(classStats.flagged / classStats.total * 100) : 0}%`, backgroundColor: '#fda4af' }]} />
                        </View>
                        <Text style={s.perfCount}>{classStats.flagged}</Text>
                        <Text style={s.perfPct}>Flag.</Text>
                    </View>
                </View>

                {/* View Mode Switcher */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {([
                        ['overview', '📋 Overview'],
                        ['matrix', '📊 Matrix'],
                        ['atRisk', `⚠️ At-Risk (${atRiskStudents.length})`],
                        ['rubric', '📖 Rubric Guide'],
                    ] as [ViewMode, string][]).map(([mode, label]) => (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => setViewMode(mode)}
                            style={[s.modeBtn, viewMode === mode && s.modeBtnActive]}
                        >
                            <Text style={[s.modeBtnText, viewMode === mode && s.modeBtnTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );

    if (loading) return (
        <View style={s.loading}>
            <LinearGradient colors={['#4f46e5', '#7c3aed']} style={{ ...StyleSheet.absoluteFillObject as any }} />
            <View style={s.loadingCard}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🎓</Text>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={s.loadingTitle}>Loading CBC Hub</Text>
                <Text style={s.loadingSubtitle}>Fetching competency data…</Text>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}

            {/* Form & Stream Selectors */}
            <View style={s.selectorRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
                    {forms.map(f => (
                        <TouchableOpacity
                            key={f.id}
                            onPress={() => { setSelectedForm(f.id); setFormName(f.name); setSelectedStream(0); }}
                            style={[s.selectorChip, selectedForm === f.id && s.selectorChipActive]}
                        >
                            <Text style={[s.selectorText, selectedForm === f.id && s.selectorTextActive]}>{f.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                {streams.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedStream(0)}
                            style={[s.selectorChip, !selectedStream && s.selectorChipActive]}
                        >
                            <Text style={[s.selectorText, !selectedStream && s.selectorTextActive]}>All Streams</Text>
                        </TouchableOpacity>
                        {streams.map(st => (
                            <TouchableOpacity
                                key={st.id}
                                onPress={() => setSelectedStream(st.id)}
                                style={[s.selectorChip, selectedStream === st.id && s.selectorChipActive]}
                            >
                                <Text style={[s.selectorText, selectedStream === st.id && s.selectorTextActive]}>{st.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* ── RUBRIC GUIDE MODE ──────────────────────────── */}
            {viewMode === 'rubric' && (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                >
                    <RubricGuidePanel />
                </ScrollView>
            )}

            {/* ── AT RISK MODE ───────────────────────────────── */}
            {viewMode === 'atRisk' && (
                <FlatList
                    data={atRiskStudents}
                    keyExtractor={item => String(item.id)}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                    ListHeaderComponent={() => (
                        <View style={s.atRiskBanner}>
                            <LinearGradient colors={['#e11d48', '#f43f5e']} style={s.atRiskGrad}>
                                <Text style={{ fontSize: 32 }}>⚠️</Text>
                                <View>
                                    <Text style={s.atRiskTitle}>{atRiskStudents.length} Students Need Attention</Text>
                                    <Text style={s.atRiskSub}>Students with BE level or active flags</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <Text style={{ fontSize: 48 }}>🌟</Text>
                            <Text style={s.emptyTitle}>All Students On Track!</Text>
                            <Text style={s.emptyText}>No students require intervention at this time.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={s.atRiskCard}>
                            <View style={s.atRiskCardHeader}>
                                <View style={s.studentAvatar}>
                                    <Text style={s.studentAvatarText}>{item.name[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.studentName}>{item.name}</Text>
                                    <Text style={s.studentMeta}>📋 {item.admission} · {item.stream_name}</Text>
                                </View>
                                <LevelBadge level={item.overall} size="lg" />
                            </View>

                            {/* BE subjects */}
                            <View style={s.beSubjects}>
                                {subjects.filter(sub => item.levels[sub.id] === 'BE').map(sub => (
                                    <View key={sub.id} style={s.beSubjectChip}>
                                        <Text style={s.beSubjectText}>⚠️ {sub.name}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Level breakdown */}
                            <View style={s.levelBreakdown}>
                                {LEVELS.map(lv => (
                                    <View key={lv} style={[s.levelBreakdownItem, { backgroundColor: LEVEL_META[lv].bg }]}>
                                        <Text style={[s.levelBreakdownCount, { color: LEVEL_META[lv].color }]}>{item.levelCounts[lv]}</Text>
                                        <Text style={[s.levelBreakdownLabel, { color: LEVEL_META[lv].color }]}>{lv}</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={s.flagBtn}
                                onPress={() => {
                                    const firstBESub = subjects.find(sub => item.levels[sub.id] === 'BE');
                                    setSelectedStudent(item);
                                    setSelectedSubject(firstBESub || subjects[0] || null);
                                    setFlagModalVisible(true);
                                }}
                            >
                                <LinearGradient colors={['#e11d48', '#be123c']} style={s.flagBtnGrad}>
                                    <Text style={s.flagBtnText}>🚩 Flag for Intervention</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                    contentContainerStyle={{ padding: 12, paddingBottom: 30, gap: 10 }}
                />
            )}

            {/* ── OVERVIEW MODE ──────────────────────────────── */}
            {viewMode === 'overview' && (
                <>
                    <View style={s.searchBar}>
                        <Text style={{ fontSize: 16 }}>🔍</Text>
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search student by name or admission…"
                            placeholderTextColor={C.textDim}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={{ color: C.textDim, fontSize: 16 }}>✕</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <FlatList
                        data={filteredStudents}
                        keyExtractor={item => String(item.id)}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                        renderItem={({ item, index }) => (
                            <View style={[s.overviewCard, index % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                <View style={s.overviewTop}>
                                    <View style={s.studentAvatar}>
                                        <Text style={s.studentAvatarText}>{item.name[0]}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={s.studentName}>{item.name}</Text>
                                            {item.isFlagged && <Text style={{ fontSize: 12 }}>🚩</Text>}
                                        </View>
                                        <Text style={s.studentMeta}>📋 {item.admission} · {item.stream_name}</Text>
                                    </View>
                                    <LevelBadge level={item.overall} size="md" />
                                </View>
                                {/* Subjects row */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {subjects.map(sub => (
                                            <TouchableOpacity
                                                key={sub.id}
                                                onPress={() => {
                                                    setSelectedStudent(item);
                                                    setSelectedSubject(sub);
                                                    setLevelPickerVisible(true);
                                                }}
                                                style={[s.subjectLevelBtn, { backgroundColor: item.levels[sub.id] ? LEVEL_META[item.levels[sub.id]!].bg : '#f1f5f9' }]}
                                            >
                                                <Text style={s.subjectLevelBtnName} numberOfLines={1}>{sub.name.split(' ')[0]}</Text>
                                                <LevelBadge level={item.levels[sub.id] || null} size="sm" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                {/* Actions */}
                                <View style={s.cardActions}>
                                    <TouchableOpacity
                                        style={s.actionBtn}
                                        onPress={() => navigation.navigate('CBCProgress', {
                                            studentId: item.id,
                                            studentName: item.name,
                                            formLevel: 10,
                                        })}
                                    >
                                        <Text style={s.actionBtnText}>📊 Full Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.actionBtn, { backgroundColor: C.roseL }]}
                                        onPress={() => {
                                            setSelectedStudent(item);
                                            setSelectedSubject(subjects[0] || null);
                                            setFlagModalVisible(true);
                                        }}
                                    >
                                        <Text style={[s.actionBtnText, { color: C.rose }]}>🚩 Flag</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={s.emptyBox}>
                                <Text style={{ fontSize: 48 }}>📊</Text>
                                <Text style={s.emptyTitle}>No Students Found</Text>
                                <Text style={s.emptyText}>No learners in this class/stream.</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 30 }}
                    />
                </>
            )}

            {/* ── MATRIX MODE ────────────────────────────────── */}
            {viewMode === 'matrix' && (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
                    contentContainerStyle={{ paddingBottom: 30 }}
                >
                    <Text style={s.matrixTitle}>Competency Matrix — {termName}</Text>
                    <Text style={s.matrixSub}>Tap any cell to update a student's level</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator>
                        <View>
                            {/* Header row */}
                            <View style={s.matrixHeaderRow}>
                                <View style={s.matrixStudentCell}>
                                    <Text style={s.matrixHeaderText}>Student</Text>
                                </View>
                                {subjects.map(sub => (
                                    <View key={sub.id} style={s.matrixSubjectCell}>
                                        <Text style={s.matrixSubjectText} numberOfLines={2}>{sub.name}</Text>
                                    </View>
                                ))}
                                <View style={s.matrixSubjectCell}>
                                    <Text style={s.matrixSubjectText}>Overall</Text>
                                </View>
                            </View>
                            {/* Data rows */}
                            {filteredStudents.map((student, idx) => (
                                <View key={student.id} style={[s.matrixRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                    <View style={s.matrixStudentCell}>
                                        <Text style={s.matrixStudentName} numberOfLines={1}>{student.name.split(' ')[0]}</Text>
                                        <Text style={s.matrixStudentAdm}>{student.admission}</Text>
                                    </View>
                                    {subjects.map(sub => (
                                        <TouchableOpacity
                                            key={sub.id}
                                            style={s.matrixDataCell}
                                            onPress={() => {
                                                setSelectedStudent(student);
                                                setSelectedSubject(sub);
                                                setLevelPickerVisible(true);
                                            }}
                                        >
                                            <LevelBadge level={student.levels[sub.id] || null} size="sm" />
                                        </TouchableOpacity>
                                    ))}
                                    <View style={s.matrixDataCell}>
                                        <LevelBadge level={student.overall} size="sm" />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </ScrollView>
            )}

            {/* Level Picker Modal */}
            <LevelPickerModal
                visible={levelPickerVisible}
                studentName={selectedStudent?.name || ''}
                subjectName={selectedSubject?.name || ''}
                currentLevel={selectedStudent && selectedSubject ? (selectedStudent.levels[selectedSubject.id] || null) : null}
                onSelect={(level) => {
                    if (selectedStudent && selectedSubject) {
                        saveLevel(selectedStudent.id, selectedSubject.id, level);
                    }
                }}
                onClose={() => setLevelPickerVisible(false)}
            />

            {/* Flag Intervention Modal */}
            <FlagInterventionModal
                visible={flagModalVisible}
                studentId={selectedStudent?.id || 0}
                studentName={selectedStudent?.name || ''}
                subjectId={selectedSubject?.id || 0}
                subjectName={selectedSubject?.name || ''}
                level={selectedStudent && selectedSubject ? (selectedStudent.levels[selectedSubject.id] || 'BE') : 'BE'}
                termId={termId}
                onSaved={fetchData}
                onClose={() => setFlagModalVisible(false)}
            />
        </View>
    );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', margin: 32, elevation: 10, shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 20 },
    loadingTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 12 },
    loadingSubtitle: { fontSize: 12, color: C.textSub, marginTop: 4 },

    header: { paddingTop: 44, paddingBottom: 12, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    exportBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },

    perfRow: { flexDirection: 'row', gap: 8, height: 90, alignItems: 'flex-end', marginBottom: 4 },
    perfBar: { flex: 1, alignItems: 'center', gap: 2 },
    perfLevel: { fontSize: 10, fontWeight: '900', color: '#fff' },
    perfTrack: { width: '100%', height: 52, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
    perfFill: { width: '100%', borderRadius: 4 },
    perfCount: { fontSize: 14, fontWeight: '900', color: '#fff' },
    perfPct: { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

    modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 6 },
    modeBtnActive: { backgroundColor: '#fff' },
    modeBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    modeBtnTextActive: { color: C.primary },

    selectorRow: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
    selectorChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: '#f8fafc' },
    selectorChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    selectorText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    selectorTextActive: { color: '#fff' },

    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
    searchInput: { flex: 1, fontSize: 13, color: C.text },

    overviewCard: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    overviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    studentAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryL, alignItems: 'center', justifyContent: 'center' },
    studentAvatarText: { fontSize: 16, fontWeight: '900', color: C.primary },
    studentName: { fontSize: 13, fontWeight: '800', color: C.text },
    studentMeta: { fontSize: 10, color: C.textSub, marginTop: 1 },
    subjectLevelBtn: { padding: 8, borderRadius: 10, alignItems: 'center', minWidth: 72, gap: 4 },
    subjectLevelBtnName: { fontSize: 9, fontWeight: '700', color: C.textSub, maxWidth: 68 },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    actionBtn: { flex: 1, backgroundColor: C.primaryL, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    actionBtnText: { fontSize: 11, fontWeight: '800', color: C.primary },

    atRiskBanner: { margin: 12, borderRadius: 16, overflow: 'hidden' },
    atRiskGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    atRiskTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
    atRiskSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    atRiskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, gap: 10 },
    atRiskCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    beSubjects: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    beSubjectChip: { backgroundColor: '#ffe4e6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    beSubjectText: { fontSize: 10, color: C.rose, fontWeight: '700' },
    levelBreakdown: { flexDirection: 'row', gap: 6 },
    levelBreakdownItem: { flex: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
    levelBreakdownCount: { fontSize: 18, fontWeight: '900' },
    levelBreakdownLabel: { fontSize: 9, fontWeight: '800' },
    flagBtn: { borderRadius: 12, overflow: 'hidden' },
    flagBtnGrad: { padding: 12, alignItems: 'center' },
    flagBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },

    matrixTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 16, paddingBottom: 4 },
    matrixSub: { fontSize: 11, color: C.textSub, paddingHorizontal: 16, paddingBottom: 10 },
    matrixHeaderRow: { flexDirection: 'row', backgroundColor: C.primaryL, borderBottomWidth: 1, borderBottomColor: C.border },
    matrixStudentCell: { width: 100, padding: 8, justifyContent: 'center' },
    matrixHeaderText: { fontSize: 10, fontWeight: '800', color: C.primary },
    matrixSubjectCell: { width: 70, padding: 6, alignItems: 'center', justifyContent: 'center' },
    matrixSubjectText: { fontSize: 9, fontWeight: '700', color: C.primary, textAlign: 'center' },
    matrixRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    matrixDataCell: { width: 70, alignItems: 'center', justifyContent: 'center', padding: 8 },
    matrixStudentName: { fontSize: 11, fontWeight: '800', color: C.text },
    matrixStudentAdm: { fontSize: 9, color: C.textSub },

    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptyText: { fontSize: 12, color: C.textSub, textAlign: 'center' },
});
