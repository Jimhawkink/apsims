// APSIMS Ultra — Student Results Screen v2.0
// Detects CBC (Grade 10+) vs 8-4-4 automatically
// CBC: Shows competency levels (EE / ME / AE / BE) — no exam type tabs
// 8-4-4: Shows marks, grades, points with End-Term/Mid-Term/CAT tabs
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import {
    supabase, getCBCCompetencySummaries, CBCCompetencySummary,
} from '../../lib/supabase';
import CBCLevelBadge from '../../components/CBCLevelBadge';
import ScreenHeader from '../../components/ScreenHeader';

const W = Dimensions.get('window').width;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#0d9488', primaryLight: '#ccfbf1',
    accent: '#059669', accentLight: '#d1fae5',
    blue: '#1d4ed8', blueLight: '#dbeafe',
    amber: '#d97706', amberLight: '#fef3c7',
    danger: '#dc2626', dangerLight: '#fee2e2',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const EXAM_TYPES_844 = ['End-Term', 'Mid-Term', 'CAT 1', 'CAT 2', 'Mock', 'KCSE Trial'];

function gradeColor(grade: string) {
    if (!grade) return { bg: C.textDim, text: '#fff' };
    if (grade === 'A') return { bg: '#059669', text: '#fff' };
    if (grade === 'A-') return { bg: '#10b981', text: '#fff' };
    if (grade.startsWith('B')) return { bg: '#1d4ed8', text: '#fff' };
    if (grade.startsWith('C')) return { bg: '#d97706', text: '#fff' };
    if (grade.startsWith('D')) return { bg: '#dc2626', text: '#fff' };
    return { bg: '#991b1b', text: '#fff' };
}

function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
    const gc = gradeColor(grade);
    const sz = size === 'sm' ? { w: 32, h: 22, fs: 10 } : size === 'lg' ? { w: 52, h: 36, fs: 18 } : { w: 40, h: 28, fs: 13 };
    return (
        <View style={{ width: sz.w, height: sz.h, borderRadius: 7, backgroundColor: gc.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: sz.fs, fontWeight: '900', color: gc.text }}>{grade || '—'}</Text>
        </View>
    );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
    return (
        <View style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
            <View style={{ height: 6, width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color, borderRadius: 3 }} />
        </View>
    );
}

export default function ResultsScreen() {
    const { session } = useSession();
    const navigation = useNavigation();

    const [terms, setTerms] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [cbcData, setCbcData] = useState<CBCCompetencySummary[]>([]);
    const [studentInfo, setStudentInfo] = useState<any>(null);
    const [isCBC, setIsCBC] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selTermId, setSelTermId] = useState<number | null>(null);
    const [selExamType, setSelExamType] = useState('End-Term');

    const studentId = session?.linked_student_id || 0;

    const loadBase = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes, gRes, stRes] = await Promise.all([
                supabase.from('school_terms').select('*').order('id', { ascending: false }),
                supabase.from('school_subjects').select('id, subject_name, subject_code').eq('is_active', true).order('subject_name'),
                supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
                supabase.from('school_students')
                    .select('id, first_name, last_name, admission_no, form_id, stream_id, school_forms(form_name, form_level)')
                    .eq('id', studentId)
                    .single(),
            ]);
            const termsData = tRes.data || [];
            setTerms(termsData);
            setSubjects(sRes.data || []);
            setGrading(gRes.data || []);
            if (stRes.data) {
                setStudentInfo(stRes.data);
                // CBC if form_level >= 10 (Senior School: Grade 10, 11, 12)
                const formLevel = (stRes.data as any)?.school_forms?.form_level;
                setIsCBC(Number(formLevel) >= 10);
            }
            const cur = termsData.find((t: any) => t.is_current) || termsData[0];
            if (cur) setSelTermId(cur.id);
        } catch (e: any) { console.error('ResultsScreen base:', e.message); }
        setLoading(false);
    }, [studentId]);

    const loadMarks = useCallback(async () => {
        if (!selTermId || !studentId) return;
        if (isCBC) {
            // CBC — load competency summaries
            const data = await getCBCCompetencySummaries(studentId, selTermId);
            setCbcData(data);
        } else {
            // 8-4-4 — load exam marks
            const { data } = await supabase
                .from('school_exam_marks')
                .select('id, student_id, subject_id, term_id, exam_type, score')
                .eq('student_id', studentId)
                .eq('term_id', selTermId)
                .eq('exam_type', selExamType);
            setMarks(data || []);
        }
    }, [studentId, selTermId, selExamType, isCBC]);

    useEffect(() => { loadBase(); }, [loadBase]);
    useEffect(() => { if (selTermId !== null) loadMarks(); }, [loadMarks, selTermId, selExamType]);

    const onRefresh = () => { setRefreshing(true); loadMarks().then(() => setRefreshing(false)); };

    const getGrade = useCallback((score: number): any => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score)
            || { grade: 'E', points: 1, remarks: 'Very Poor' };
    }, [grading]);

    // Build subject results (8-4-4 only)
    const subjectResults = useMemo(() => {
        return marks.map(m => {
            const subj = subjects.find(s => s.id === m.subject_id);
            const g = getGrade(Number(m.score));
            return {
                id: m.id,
                subjectName: subj?.subject_name || 'Unknown',
                subjectCode: subj?.subject_code || '',
                score: Number(m.score),
                grade: g.grade,
                points: g.points,
                remarks: g.remarks,
            };
        }).sort((a, b) => b.score - a.score);
    }, [marks, subjects, getGrade]);

    const best7Ids = useMemo(() => {
        const sorted = [...subjectResults].sort((a, b) => b.points - a.points || b.score - a.score);
        return new Set(sorted.slice(0, 7).map(s => s.id));
    }, [subjectResults]);

    const totalPoints = useMemo(() => {
        return subjectResults.filter(s => best7Ids.has(s.id)).reduce((a, b) => a + b.points, 0);
    }, [subjectResults, best7Ids]);

    const avgScore = subjectResults.length > 0
        ? subjectResults.reduce((a, b) => a + b.score, 0) / subjectResults.length : 0;
    const meanGradeObj = subjectResults.length > 0 ? getGrade(avgScore) : { grade: '—', points: 0 };
    const selTermName = terms.find(t => t.id === selTermId)?.term_name || '';

    // CBC counts
    const cbcCounts = useMemo(() => ({
        EE: cbcData.filter(s => s.overall_level === 'EE').length,
        ME: cbcData.filter(s => s.overall_level === 'ME').length,
        AE: cbcData.filter(s => s.overall_level === 'AE').length,
        BE: cbcData.filter(s => s.overall_level === 'BE').length,
    }), [cbcData]);

    if (loading) {
        return (
            <View style={s.loader}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={s.loaderText}>Loading results…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <ScreenHeader
                title={isCBC ? '🎓 My CBC Results' : '📊 My Results'}
                onBack={() => navigation.goBack()}
                gradient={isCBC ? ['#7c3aed', '#6d28d9'] : ['#2563EB', '#1D4ED8']}
            />
            <StatusBar barStyle="light-content" />

            {/* Compact student header */}
            <LinearGradient colors={isCBC ? ['#7c3aed', '#6d28d9'] : ['#0f766e', '#0d9488']} style={s.subHeader}>
                <Text style={s.subHeaderName}>
                    {studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : session?.student_name || 'Student'}
                </Text>
                <Text style={s.subHeaderInfo}>
                    {selTermName}{isCBC ? '  ·  CBC Senior School' : '  ·  8-4-4 Curriculum'}
                </Text>
            </LinearGradient>

            {/* Term Selector */}
            <View style={s.termBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8, gap: 6, flexDirection: 'row' }}>
                    {terms.map(t => (
                        <TouchableOpacity key={t.id} onPress={() => setSelTermId(t.id)}
                            style={[s.termPill, selTermId === t.id && { ...s.termPillActive, backgroundColor: isCBC ? C.purple : C.primary, borderColor: isCBC ? C.purple : C.primary }]}>
                            <Text style={[s.termPillText, selTermId === t.id && s.termPillTextActive]}>
                                {t.term_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Exam Type tabs — 8-4-4 ONLY */}
            {!isCBC && (
                <View style={{ backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' }}>
                        {EXAM_TYPES_844.map(et => (
                            <TouchableOpacity key={et} onPress={() => setSelExamType(et)}
                                style={[s.examTypePill, selExamType === et && s.examTypePillActive]}>
                                <Text style={[s.examTypePillText, selExamType === et && s.examTypePillTextActive]}>{et}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isCBC ? C.purple : C.primary} />}
                showsVerticalScrollIndicator={false}>

                {/* ══ CBC VIEW ════════════════════════════════════════════════ */}
                {isCBC ? (
                    cbcData.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={s.emptyEmoji}>🎓</Text>
                            <Text style={s.emptyTitle}>No Results Yet</Text>
                            <Text style={s.emptyText}>No CBC assessments found for {selTermName}.</Text>
                            <Text style={s.emptyText}>Teachers will publish results after assessments.</Text>
                        </View>
                    ) : (
                        <>
                            {/* CBC KPI Strip */}
                            <View style={s.cbcKpiRow}>
                                {[
                                    { level: 'EE', label: 'Exceeds', count: cbcCounts.EE, bg: '#d1fae5', color: '#059669' },
                                    { level: 'ME', label: 'Meets', count: cbcCounts.ME, bg: '#dbeafe', color: '#1d4ed8' },
                                    { level: 'AE', label: 'Approaches', count: cbcCounts.AE, bg: '#fef3c7', color: '#d97706' },
                                    { level: 'BE', label: 'Below', count: cbcCounts.BE, bg: '#fee2e2', color: '#dc2626' },
                                ].map(k => (
                                    <View key={k.level} style={[s.cbcKpiCard, { backgroundColor: k.bg, borderColor: k.color + '40' }]}>
                                        <Text style={[s.cbcKpiLevel, { color: k.color }]}>{k.level}</Text>
                                        <Text style={[s.cbcKpiCount, { color: k.color }]}>{k.count}</Text>
                                        <Text style={[s.cbcKpiLabel, { color: k.color }]}>{k.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* CBC Subjects Table */}
                            <View style={s.section}>
                                <View style={s.sectionHeader}>
                                    <Text style={s.sectionTitle}>🎓 CBC Competency Levels</Text>
                                    <View style={{ backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: C.purple }}>{cbcData.length} Subjects</Text>
                                    </View>
                                </View>

                                {/* Table Header */}
                                <View style={[s.gridHeader, { backgroundColor: '#F8FAFF' }]}>
                                    <Text style={[s.gridHText, { flex: 2.5 }]}>Subject</Text>
                                    <Text style={[s.gridHText, { flex: 1, textAlign: 'center' }]}>Formative</Text>
                                    <Text style={[s.gridHText, { flex: 1, textAlign: 'center' }]}>Summative</Text>
                                    <Text style={[s.gridHText, { flex: 1, textAlign: 'center' }]}>Overall</Text>
                                </View>

                                {cbcData.map((row, idx) => (
                                    <View key={row.id} style={[s.gridRow, idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }]}>
                                        <Text style={[s.gridCell, { flex: 2.5, fontWeight: '700' }]} numberOfLines={2}>{row.subject_name}</Text>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <CBCLevelBadge level={row.formative_level} size="sm" />
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <CBCLevelBadge level={row.summative_level} size="sm" />
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <CBCLevelBadge level={row.overall_level} size="sm" />
                                        </View>
                                    </View>
                                ))}

                                {/* CBC Legend */}
                                <View style={s.legend}>
                                    {[
                                        { level: 'EE', label: 'Exceeds Expectation', color: '#059669' },
                                        { level: 'ME', label: 'Meets Expectation', color: '#1d4ed8' },
                                        { level: 'AE', label: 'Approaches Expectation', color: '#d97706' },
                                        { level: 'BE', label: 'Below Expectation', color: '#dc2626' },
                                    ].map(l => (
                                        <View key={l.level} style={s.legendRow}>
                                            <Text style={[s.legendLevel, { color: l.color }]}>{l.level}</Text>
                                            <Text style={s.legendLabel}>{l.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </>
                    )
                ) : (
                    /* ══ 8-4-4 VIEW ══════════════════════════════════════════════ */
                    subjectResults.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={s.emptyEmoji}>📊</Text>
                            <Text style={s.emptyTitle}>No Results Yet</Text>
                            <Text style={s.emptyText}>No marks found for {selExamType} · {selTermName}</Text>
                        </View>
                    ) : (
                        <>
                            {/* 8-4-4 KPI Strip */}
                            <View style={s.kpiRow}>
                                {[
                                    { icon: '📈', label: 'Average', value: `${avgScore.toFixed(1)}%`, color: C.primary },
                                    { icon: '🎯', label: 'Mean Grade', value: meanGradeObj.grade, color: gradeColor(meanGradeObj.grade).bg },
                                    { icon: '⭐', label: 'Total Pts', value: `${totalPoints}`, color: C.purple },
                                    { icon: '📚', label: 'Subjects', value: `${subjectResults.length}`, color: C.amber },
                                ].map(k => (
                                    <View key={k.label} style={s.kpiCard}>
                                        <Text style={s.kpiEmoji}>{k.icon}</Text>
                                        <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
                                        <Text style={s.kpiLabel}>{k.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* 8-4-4 Subject Results Table */}
                            <View style={s.section}>
                                <View style={s.sectionHeader}>
                                    <Text style={s.sectionTitle}>Subject Results</Text>
                                    <View style={s.best7Legend}>
                                        <Text style={s.best7LegendText}>⭐ = Best 7</Text>
                                    </View>
                                </View>
                                {subjectResults.map((sr, idx) => {
                                    const isB7 = best7Ids.has(sr.id);
                                    const barColor = sr.score >= 70 ? C.accent : sr.score >= 50 ? C.blue : sr.score >= 40 ? C.amber : C.danger;
                                    return (
                                        <View key={sr.id} style={[
                                            s.subjectRow,
                                            idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' },
                                            isB7 && { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }
                                        ]}>
                                            <View style={s.subjectLeft}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    {isB7 && <Text style={{ fontSize: 11 }}>⭐</Text>}
                                                    <Text style={s.subjectName} numberOfLines={1}>{sr.subjectName}</Text>
                                                </View>
                                                {sr.subjectCode ? <Text style={s.subjectCode}>{sr.subjectCode}</Text> : null}
                                                <ProgressBar pct={sr.score} color={barColor} />
                                            </View>
                                            <View style={s.subjectRight}>
                                                <Text style={s.scoreText}>{sr.score}</Text>
                                                <Text style={s.scoreDen}>/100</Text>
                                            </View>
                                            <View style={s.subjectGrade}>
                                                <GradeBadge grade={sr.grade} size="md" />
                                                <Text style={s.pointsText}>{sr.points}pts</Text>
                                            </View>
                                        </View>
                                    );
                                })}

                                {/* Total row */}
                                <View style={s.totalRow}>
                                    <Text style={s.totalLabel}>BEST 7 TOTAL POINTS</Text>
                                    <Text style={s.totalValue}>{totalPoints} pts</Text>
                                    <GradeBadge grade={meanGradeObj.grade} size="lg" />
                                </View>
                            </View>

                            {/* 8-4-4 Performance summary */}
                            <View style={s.analysisCard}>
                                <Text style={s.analysisTitle}>📋 Performance Summary</Text>
                                {[
                                    { label: 'Highest Score', value: `${Math.max(...subjectResults.map(s => s.score))}%`, color: C.accent },
                                    { label: 'Lowest Score', value: `${Math.min(...subjectResults.map(s => s.score))}%`, color: C.danger },
                                    { label: 'Class Average', value: `${avgScore.toFixed(1)}%`, color: C.primary },
                                    { label: 'Mean Grade', value: `${meanGradeObj.grade} (${meanGradeObj.points || 0} pts)`, color: gradeColor(meanGradeObj.grade).bg },
                                ].map(r => (
                                    <View key={r.label} style={s.analysisRow}>
                                        <Text style={s.analysisLabel}>{r.label}</Text>
                                        <Text style={[s.analysisValue, { color: r.color }]}>{r.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    loader: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loaderText: { color: C.textSub, fontSize: 13, fontWeight: '500' },
    subHeader: { paddingVertical: 10, paddingHorizontal: 18 },
    subHeaderName: { fontSize: 15, fontWeight: '900', color: '#fff' },
    subHeaderInfo: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
    termBar: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    termPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    termPillActive: {},
    termPillText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    termPillTextActive: { color: '#fff' },
    examTypePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    examTypePillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
    examTypePillText: { fontSize: 10, fontWeight: '700', color: C.textSub },
    examTypePillTextActive: { color: '#fff' },
    content: { padding: 14, paddingBottom: 40 },

    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: C.text },
    emptyText: { fontSize: 12, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },

    // CBC KPI
    cbcKpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    cbcKpiCard: { flex: 1, borderRadius: 16, padding: 10, alignItems: 'center', gap: 2, borderWidth: 1 },
    cbcKpiLevel: { fontSize: 13, fontWeight: '900' },
    cbcKpiCount: { fontSize: 22, fontWeight: '900' },
    cbcKpiLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    // 8-4-4 KPI
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    kpiCard: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 10, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
    kpiEmoji: { fontSize: 16 },
    kpiValue: { fontSize: 16, fontWeight: '900' },
    kpiLabel: { fontSize: 8, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

    // Section
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#F8FAFF' },
    sectionTitle: { fontSize: 13, fontWeight: '900', color: C.text },
    best7Legend: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    best7LegendText: { fontSize: 10, fontWeight: '700', color: '#92400e' },

    // Grid
    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    gridHText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },

    // 8-4-4 subject rows
    subjectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8 },
    subjectLeft: { flex: 1 },
    subjectName: { fontSize: 12, fontWeight: '800', color: C.text },
    subjectCode: { fontSize: 9, color: C.textDim, fontWeight: '600', marginTop: 1 },
    subjectRight: { alignItems: 'flex-end', width: 48 },
    scoreText: { fontSize: 20, fontWeight: '900', color: C.text, lineHeight: 22 },
    scoreDen: { fontSize: 9, color: C.textDim, fontWeight: '600' },
    subjectGrade: { alignItems: 'center', gap: 3 },
    pointsText: { fontSize: 9, color: C.textSub, fontWeight: '700' },

    totalRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#1e1b4b', gap: 10 },
    totalLabel: { flex: 1, fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
    totalValue: { fontSize: 16, fontWeight: '900', color: '#fff' },

    analysisCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
    analysisTitle: { fontSize: 13, fontWeight: '900', color: C.text, marginBottom: 12 },
    analysisRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    analysisLabel: { fontSize: 12, color: C.textSub, fontWeight: '600' },
    analysisValue: { fontSize: 13, fontWeight: '900' },

    // Legend
    legend: { padding: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendLevel: { fontSize: 11, fontWeight: '900', width: 28 },
    legendLabel: { fontSize: 11, color: C.textSub },
});
