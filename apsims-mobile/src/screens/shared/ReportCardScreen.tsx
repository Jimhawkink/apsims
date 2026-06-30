// APSIMS Ultra — Report Card Screen v4.0
// FIXED: Sequential init — detects CBC FIRST then loads data (no race condition)
// CBC: Full report card matching web app, NO exam type tabs
// 8-4-4: Marks table with grade/points/rank
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import {
    getCBCCompetencySummaries, getStudentResults, getReportCardDelivery,
    markReportCardViewed, getGrade,
    supabase, CBCCompetencySummary,
} from '../../lib/supabase';
import CBCLevelBadge from '../../components/CBCLevelBadge';
import ScreenHeader from '../../components/ScreenHeader';

type RouteProps = RouteProp<RootStackParamList, 'ReportCard'>;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryLight: '#dbeafe',
    teal: '#0d9488',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    gold: '#d97706', goldLight: '#fef3c7',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const EXAM_TYPES_844 = ['End-Term', 'Mid-Term', 'CAT 1', 'CAT 2', 'Mock'];

function gradeToPoints(grade: string): number {
    const map: Record<string, number> = { A: 12, 'A-': 11, 'B+': 10, B: 9, 'B-': 8, 'C+': 7, C: 6, 'C-': 5, 'D+': 4, D: 3, 'D-': 2, E: 1 };
    return map[grade] || 1;
}
function gradeColors(grade: string) {
    const g = grade?.charAt(0) || '';
    if (g === 'A') return { bg: '#d1fae5', color: '#059669' };
    if (g === 'B') return { bg: '#dbeafe', color: '#1d4ed8' };
    if (g === 'C') return { bg: '#ccfbf1', color: '#0d9488' };
    if (g === 'D') return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#fee2e2', color: '#ef4444' };
}
function getMeanGrade(avg: number): string {
    if (avg >= 80) return 'A'; if (avg >= 75) return 'A-'; if (avg >= 70) return 'B+';
    if (avg >= 65) return 'B'; if (avg >= 60) return 'B-'; if (avg >= 55) return 'C+';
    if (avg >= 50) return 'C'; if (avg >= 45) return 'C-'; if (avg >= 40) return 'D+';
    if (avg >= 35) return 'D'; if (avg >= 30) return 'D-'; return 'E';
}
function cbcLevelColor(level: string | null) {
    if (level === 'EE') return { bg: '#d1fae5', color: '#059669' };
    if (level === 'ME') return { bg: '#dbeafe', color: '#1d4ed8' };
    if (level === 'AE') return { bg: '#fef3c7', color: '#d97706' };
    if (level === 'BE') return { bg: '#fee2e2', color: '#dc2626' };
    return { bg: '#f1f5f9', color: '#94a3b8' };
}
function cbcLevelText(level: string | null): string {
    if (level === 'EE') return 'Exceeds Expectation';
    if (level === 'ME') return 'Meets Expectation';
    if (level === 'AE') return 'Approaches Expectation';
    if (level === 'BE') return 'Below Expectation';
    return 'Not Assessed';
}

export default function ReportCardScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { studentId, formId, formLevel, isParent } = route.params;

    // Use ref so loadData always reads latest isCBC without stale closures
    const isCBCRef = useRef(formLevel >= 10);
    const [isCBC, setIsCBC] = useState(formLevel >= 10);

    const [terms, setTerms] = useState<{ id: number; term_name: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<number>(0);
    const [selectedExamType, setSelectedExamType] = useState('End-Term');
    const [cbcData, setCbcData] = useState<CBCCompetencySummary[]>([]);
    const [results844, setResults844] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<{ school_name: string; motto: string } | null>(null);
    const [studentInfo, setStudentInfo] = useState<{
        full_name: string; admission_no: string; form: string;
        stream: string; guardian: string;
    } | null>(null);
    const [comments, setComments] = useState({ teacher: '', principal: '' });
    const [classAvg, setClassAvg] = useState<number | null>(null);
    const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const selTermName = terms.find(t => t.id === selectedTermId)?.term_name || '';

    // ── Load CBC or 8-4-4 data (uses explicit cbcFlag to avoid stale closure)
    const loadCoreData = useCallback(async (termId: number, examType: string, cbcFlag: boolean) => {
        if (!termId) return;
        try {
            if (cbcFlag) {
                // ── CBC: query cbc_mark_scores, compute levels (matches web app)
                const data = await getCBCCompetencySummaries(studentId, termId);
                setCbcData(data);
                // Comments from cbc_report_card_comments
                const { data: cmt } = await supabase
                    .from('cbc_report_card_comments')
                    .select('teacher_comment, principal_comment')
                    .eq('student_id', studentId)
                    .eq('term_id', termId)
                    .maybeSingle();
                setComments({
                    teacher: cmt?.teacher_comment || '',
                    principal: cmt?.principal_comment || '',
                });
            } else {
                // ── 8-4-4: query school_exam_marks
                const { data: marksData } = await supabase
                    .from('school_exam_marks')
                    .select('id, student_id, subject_id, exam_type, score, grade, term_id, school_subjects(id, subject_name, subject_code)')
                    .eq('student_id', studentId)
                    .eq('term_id', termId)
                    .eq('exam_type', examType);
                const rawMarks = marksData || [];
                const sorted = [...rawMarks].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
                const best7Ids = new Set(sorted.slice(0, 7).map((m: any) => m.subject_id));
                const mapped = rawMarks.map((m: any) => {
                    const score = Number(m.score || 0);
                    const grade = m.grade || getGrade(score);
                    return { id: m.id, subject_id: m.subject_id, subject_name: (m.school_subjects as any)?.subject_name || 'Unknown', subject_code: (m.school_subjects as any)?.subject_code || '', score, grade, points: gradeToPoints(grade), is_best7: best7Ids.has(m.subject_id) };
                });
                mapped.sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
                setResults844(mapped);
                // Rank
                if (formId) {
                    const { data: fs } = await supabase.from('school_students').select('id').eq('form_id', formId).eq('status', 'Active');
                    const sids = (fs || []).map((s: any) => s.id);
                    if (sids.length) {
                        const { data: am } = await supabase.from('school_exam_marks').select('student_id, score').eq('term_id', termId).eq('exam_type', examType).in('student_id', sids);
                        const totals: Record<number, { t: number; c: number }> = {};
                        (am || []).forEach((m: any) => { if (!totals[m.student_id]) totals[m.student_id] = { t: 0, c: 0 }; totals[m.student_id].t += Number(m.score || 0); totals[m.student_id].c++; });
                        const avgs = Object.entries(totals).map(([sid, v]) => ({ sid: Number(sid), avg: v.c > 0 ? v.t / v.c : 0 }));
                        setClassAvg(avgs.length ? avgs.reduce((s, a) => s + a.avg, 0) / avgs.length : null);
                        avgs.sort((a, b) => b.avg - a.avg);
                        const ri = avgs.findIndex(a => a.sid === studentId);
                        setRank({ rank: ri >= 0 ? ri + 1 : avgs.length + 1, total: sids.length });
                    }
                }
            }
        } catch (err: any) { console.error('loadCoreData error:', err.message); }
    }, [studentId, formId]);

    // ── SEQUENTIAL INIT: detect CBC → load terms → load data (no race condition)
    const initialize = useCallback(async () => {
        setLoading(true);
        let cbcDetected = formLevel >= 10;

        // Step 1: Load school + student info, detect CBC from DB
        try {
            const [schoolRes, studentRes] = await Promise.all([
                supabase.from('school_details').select('school_name, motto').limit(1).single(),
                supabase.from('school_students').select('first_name, last_name, admission_number, school_forms(form_name, form_level), school_streams(stream_name), parent_name, guardian_name').eq('id', studentId).single(),
            ]);
            if (schoolRes.data) {
                setSchoolDetails({ school_name: schoolRes.data.school_name || 'Alpha School', motto: schoolRes.data.motto || '' });
            }
            if (studentRes.data) {
                const s = studentRes.data as any;
                const dbLevel = Number(s.school_forms?.form_level || 0);
                cbcDetected = dbLevel >= 10;
                isCBCRef.current = cbcDetected;
                setIsCBC(cbcDetected);
                setStudentInfo({
                    full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                    admission_no: s.admission_number || '',
                    form: s.school_forms?.form_name || '',
                    stream: s.school_streams?.stream_name || '',
                    guardian: s.parent_name || s.guardian_name || '',
                });
            }
        } catch (e: any) { console.error('init meta error:', e.message); }

        // Step 2: Load ALL terms
        let termId = 0;
        try {
            const { data: allTerms } = await supabase.from('school_terms').select('id, term_name, is_current').order('id', { ascending: false });
            if (allTerms && allTerms.length > 0) {
                setTerms(allTerms as any);
                const cur = (allTerms as any[]).find(t => t.is_current) || allTerms[0];
                termId = cur.id;
                setSelectedTermId(cur.id);
            }
        } catch (e: any) { console.error('init terms error:', e.message); }

        // Step 3: Load data using cbcDetected (NOT stale state)
        if (termId) {
            await loadCoreData(termId, 'End-Term', cbcDetected);
            if (isParent) {
                const delivery = await getReportCardDelivery(studentId, termId);
                if (delivery) await markReportCardViewed(studentId, termId);
            }
        }

        setLoading(false);
    }, [studentId, formId, formLevel, isParent, loadCoreData]);

    useEffect(() => { initialize(); }, [initialize]);

    // When user switches term or exam type (after init)
    const handleTermChange = useCallback(async (termId: number) => {
        setSelectedTermId(termId);
        setLoading(true);
        await loadCoreData(termId, selectedExamType, isCBCRef.current);
        setLoading(false);
    }, [loadCoreData, selectedExamType]);

    const handleExamTypeChange = useCallback(async (et: string) => {
        setSelectedExamType(et);
        setLoading(true);
        await loadCoreData(selectedTermId, et, isCBCRef.current);
        setLoading(false);
    }, [loadCoreData, selectedTermId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCoreData(selectedTermId, selectedExamType, isCBCRef.current);
        setRefreshing(false);
    }, [loadCoreData, selectedTermId, selectedExamType]);

    const onShare = async () => {
        try { await Share.share({ message: `📄 CBC Report Card: ${studentInfo?.full_name} — ${selTermName}` }); } catch {}
    };

    // ── Derived values
    const hasData = isCBC ? cbcData.length > 0 : results844.length > 0;
    const avgScore = results844.length > 0 ? results844.reduce((s: number, r: any) => s + r.score, 0) / results844.length : 0;
    const meanGrade = results844.length > 0 ? getMeanGrade(avgScore) : '-';
    const best7Points = results844.filter((r: any) => r.is_best7).reduce((s: number, r: any) => s + r.points, 0);
    const meanGC = meanGrade !== '-' ? gradeColors(meanGrade) : { bg: '#F8FAFF', color: C.textSub };

    // CBC overall
    const cbcWithLevel = cbcData.filter(s => s.overall_level);
    const cbcAvgWeight = cbcWithLevel.length > 0
        ? cbcWithLevel.reduce((acc, s) => { const w = s.overall_level === 'EE' ? 4 : s.overall_level === 'ME' ? 3 : s.overall_level === 'AE' ? 2 : 1; return acc + w; }, 0) / cbcWithLevel.length
        : 0;
    const cbcOverallLevel = cbcAvgWeight >= 3.5 ? 'EE' : cbcAvgWeight >= 2.5 ? 'ME' : cbcAvgWeight >= 1.5 ? 'AE' : cbcAvgWeight > 0 ? 'BE' : null;
    const headerGrad: [string, string] = isCBC ? ['#4f46e5', '#6d28d9'] : ['#0d9488', '#0f766e'];

    if (loading) {
        return (
            <View style={st.center}>
                <ActivityIndicator size="large" color={isCBC ? C.purple : C.teal} />
                <Text style={st.loadingText}>Loading report card…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <ScreenHeader
                title={isCBC ? '🎓 CBC Report Card' : '📄 Report Card'}
                onBack={() => navigation.goBack()}
                gradient={headerGrad}
            />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={st.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isCBC ? C.purple : C.teal} />}
                showsVerticalScrollIndicator={false}>

                {/* ── TERM SELECTOR (all terms, no exam type for CBC) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 10 }}>
                    {terms.map(t => (
                        <TouchableOpacity key={t.id} onPress={() => handleTermChange(t.id)}
                            style={[st.pill, selectedTermId === t.id && { backgroundColor: isCBC ? C.purple : C.teal, borderColor: isCBC ? C.purple : C.teal }]}>
                            <Text style={[st.pillText, selectedTermId === t.id && { color: '#fff' }]}>{t.term_name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── EXAM TYPE TABS — 8-4-4 ONLY, never for CBC */}
                {!isCBC && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 12 }}>
                        {EXAM_TYPES_844.map(et => (
                            <TouchableOpacity key={et} onPress={() => handleExamTypeChange(et)}
                                style={[st.pill, selectedExamType === et && { backgroundColor: C.teal, borderColor: C.teal }]}>
                                <Text style={[st.pillText, selectedExamType === et && { color: '#fff' }]}>{et}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* ══ CBC REPORT CARD ═══════════════════════════════════════ */}
                {isCBC ? (!hasData ? (
                    <View style={st.emptyBox}>
                        <Text style={{ fontSize: 48 }}>📄</Text>
                        <Text style={st.emptyTitle}>No CBC Results Yet</Text>
                        <Text style={st.emptyText}>No assessments found for {selTermName}.</Text>
                        <Text style={st.emptyText}>Teachers publish results after assessment.</Text>
                    </View>
                ) : (
                    <>
                        {/* School Header */}
                        <LinearGradient colors={['#3730a3', '#4f46e5', '#6d28d9']} style={st.schoolCard}>
                            <Text style={st.schoolName}>{schoolDetails?.school_name?.toUpperCase() || 'ALPHA SCHOOL'}</Text>
                            <View style={{ width: 60, height: 2, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 1, marginVertical: 6 }} />
                            <Text style={st.schoolSub}>STUDENT PROGRESS REPORT</Text>
                            <Text style={st.schoolTerm}>{selTermName}  ·  CBC Senior School Curriculum</Text>
                            {schoolDetails?.motto ? <Text style={st.schoolMotto}>"{schoolDetails.motto}"</Text> : null}
                        </LinearGradient>

                        {/* KPI strip */}
                        <View style={st.kpiStrip}>
                            {[
                                { label: 'GRADE LEVEL', badge: cbcOverallLevel },
                                { label: 'SUBJECTS', value: `${cbcData.length}`, sub: 'Total' },
                                { label: 'TOP LEVEL', value: `${cbcData.filter(s => s.overall_level === 'EE').length}`, sub: 'Exceeds EE' },
                                { label: 'AVG SCORE', value: `${cbcAvgWeight > 0 ? cbcAvgWeight.toFixed(1) : '—'}/4`, sub: 'Competency' },
                            ].map(k => (
                                <View key={k.label} style={st.kpiCard}>
                                    <Text style={st.kpiLabel}>{k.label}</Text>
                                    {k.badge !== undefined ? (
                                        <View style={[st.levelBadgeLg, { backgroundColor: cbcLevelColor(k.badge).bg }]}>
                                            <Text style={[st.levelBadgeLgText, { color: cbcLevelColor(k.badge).color }]}>{k.badge || '—'}</Text>
                                        </View>
                                    ) : (
                                        <Text style={st.kpiValue}>{k.value}</Text>
                                    )}
                                    {k.sub ? <Text style={st.kpiSub}>{k.sub}</Text> : null}
                                </View>
                            ))}
                        </View>

                        {/* Student info */}
                        {studentInfo && (
                            <View style={st.infoCard}>
                                {[
                                    ['Student Name', studentInfo.full_name],
                                    ['Adm Number', studentInfo.admission_no],
                                    ['Grade / Stream', `${studentInfo.form}${studentInfo.stream ? ' / ' + studentInfo.stream : ''}`],
                                    ['Term', selTermName],
                                    ['Guardian', studentInfo.guardian || '—'],
                                    ['Curriculum', 'CBC Senior School'],
                                ].map(([lbl, val]) => (
                                    <View key={lbl} style={st.infoItem}>
                                        <Text style={st.infoLbl}>{lbl}</Text>
                                        <Text style={st.infoVal}>{val}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* CBC Competency Table */}
                        <View style={st.section}>
                            <Text style={st.secTitle}>📊 Academic Performance — Formative · Summative · Overall</Text>
                            <View style={[st.tableHead, { backgroundColor: '#1e1b4b' }]}>
                                <Text style={[st.tableHCell, { flex: 2.5, color: '#fff' }]}>SUBJECT</Text>
                                <Text style={[st.tableHCell, { flex: 1, textAlign: 'center', color: '#a5b4fc' }]}>FORM.</Text>
                                <Text style={[st.tableHCell, { flex: 1, textAlign: 'center', color: '#a5b4fc' }]}>SUMM.</Text>
                                <Text style={[st.tableHCell, { flex: 1.2, textAlign: 'center', color: '#fbbf24' }]}>OVERALL</Text>
                                <Text style={[st.tableHCell, { flex: 1.5, color: '#94a3b8' }]}>REMARKS</Text>
                            </View>
                            {cbcData.map((row, idx) => {
                                const oc = cbcLevelColor(row.overall_level);
                                return (
                                    <View key={row.id} style={[st.tableRow, { backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }]}>
                                        <Text style={[st.tableCell, { flex: 2.5, fontWeight: '700' }]} numberOfLines={2}>{idx + 1}. {row.subject_name}</Text>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <CBCLevelBadge level={row.formative_level} size="sm" />
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <CBCLevelBadge level={row.summative_level} size="sm" />
                                        </View>
                                        <View style={{ flex: 1.2, alignItems: 'center' }}>
                                            <View style={[st.levelBadge, { backgroundColor: oc.bg }]}>
                                                <Text style={[st.levelBadgeText, { color: oc.color }]}>{row.overall_level || '—'}</Text>
                                            </View>
                                        </View>
                                        <Text style={[st.tableCell, { flex: 1.5, fontSize: 9, color: oc.color, fontWeight: '600' }]} numberOfLines={2}>
                                            {cbcLevelText(row.overall_level)}
                                        </Text>
                                    </View>
                                );
                            })}
                            {/* Overall row */}
                            {cbcOverallLevel && (
                                <View style={[st.tableRow, { backgroundColor: '#eef2ff', borderTopWidth: 2, borderTopColor: '#c7d2fe' }]}>
                                    <Text style={[st.tableCell, { flex: 2.5, fontWeight: '900' }]}>OVERALL COMPETENCY</Text>
                                    <View style={{ flex: 1 }} /><View style={{ flex: 1 }} />
                                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                                        <View style={[st.levelBadge, { backgroundColor: cbcLevelColor(cbcOverallLevel).bg, borderWidth: 2, borderColor: cbcLevelColor(cbcOverallLevel).color }]}>
                                            <Text style={[st.levelBadgeText, { color: cbcLevelColor(cbcOverallLevel).color, fontSize: 13 }]}>{cbcOverallLevel}</Text>
                                        </View>
                                    </View>
                                    <Text style={[st.tableCell, { flex: 1.5, fontSize: 9, color: cbcLevelColor(cbcOverallLevel).color, fontWeight: '800' }]}>{cbcLevelText(cbcOverallLevel)}</Text>
                                </View>
                            )}
                        </View>

                        {/* Legend */}
                        <View style={st.legendCard}>
                            <Text style={st.legendTitle}>Competency Level Key</Text>
                            <View style={{ gap: 8 }}>
                                {[['EE', 'Exceeds Expectation', '#059669', '#d1fae5'], ['ME', 'Meets Expectation', '#1d4ed8', '#dbeafe'], ['AE', 'Approaches Expectation', '#d97706', '#fef3c7'], ['BE', 'Below Expectation', '#dc2626', '#fee2e2']].map(([l, label, color, bg]) => (
                                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={[st.levelBadge, { backgroundColor: bg }]}><Text style={[st.levelBadgeText, { color }]}>{l}</Text></View>
                                        <Text style={{ fontSize: 12, color: C.textSub }}>{label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Comments */}
                        {[['👨‍🏫 Class Teacher\'s Comment', comments.teacher], ['🏫 Principal\'s Comment', comments.principal]].map(([title, text]) => (
                            <View key={title} style={st.commentBox}>
                                <Text style={st.commentTitle}>{title}</Text>
                                <Text style={st.commentText}>{text || 'No comment provided.'}</Text>
                            </View>
                        ))}

                        <TouchableOpacity style={[st.shareBtn, { borderColor: C.purple }]} onPress={onShare}>
                            <Text style={[st.shareBtnText, { color: C.purple }]}>📤 Share Report Card</Text>
                        </TouchableOpacity>
                    </>
                )) : (
                    /* ══ 8-4-4 ═══════════════════════════════════════════════ */
                    <>
                        {schoolDetails && (
                            <LinearGradient colors={['#0d9488', '#0f766e']} style={st.schoolCard}>
                                <Text style={st.schoolName}>{schoolDetails.school_name}</Text>
                                {schoolDetails.motto ? <Text style={st.schoolMotto}>"{schoolDetails.motto}"</Text> : null}
                                <Text style={st.schoolTerm}>📚 8-4-4 Curriculum</Text>
                            </LinearGradient>
                        )}
                        {studentInfo && (
                            <View style={st.infoCard}>
                                {[['Student Name', studentInfo.full_name], ['Adm No.', studentInfo.admission_no], ['Form', studentInfo.form], ['Stream', studentInfo.stream], ['Term', selTermName]].map(([l, v]) => (
                                    <View key={l} style={st.infoItem}><Text style={st.infoLbl}>{l}</Text><Text style={st.infoVal}>{v}</Text></View>
                                ))}
                            </View>
                        )}
                        {!hasData ? (
                            <View style={st.emptyBox}>
                                <Text style={{ fontSize: 48 }}>📄</Text>
                                <Text style={st.emptyTitle}>No Results Available</Text>
                                <Text style={st.emptyText}>No marks for {selectedExamType} · {selTermName}.</Text>
                            </View>
                        ) : (
                            <>
                                <View style={st.section}>
                                    <Text style={st.secTitle}>📋 Academic Performance</Text>
                                    <View style={[st.tableHead, { backgroundColor: '#F8FAFF' }]}>
                                        {['Subject', 'Score', 'Grade', 'Pts', 'Remarks'].map((h, i) => (
                                            <Text key={h} style={[st.tableHCell, { flex: i === 0 ? 2.2 : i === 4 ? 1.4 : 0.8, textAlign: i > 0 && i < 4 ? 'center' : 'left' }]}>{h}</Text>
                                        ))}
                                    </View>
                                    {results844.map((r: any, idx: number) => {
                                        const gc = gradeColors(r.grade);
                                        return (
                                            <View key={r.id} style={[st.tableRow, { backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfc' }, r.is_best7 && { borderLeftWidth: 3, borderLeftColor: '#d97706' }]}>
                                                <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    {r.is_best7 && <Text style={{ fontSize: 9 }}>⭐</Text>}
                                                    <Text style={[st.tableCell, { fontWeight: '700' }]} numberOfLines={1}>{r.subject_name}</Text>
                                                </View>
                                                <Text style={[st.tableCell, { flex: 0.8, textAlign: 'center', fontWeight: '900', color: gc.color, fontSize: 14 }]}>{r.score}</Text>
                                                <View style={{ flex: 0.8, alignItems: 'center' }}>
                                                    <View style={[st.levelBadge, { backgroundColor: gc.bg }]}><Text style={[st.levelBadgeText, { color: gc.color }]}>{r.grade}</Text></View>
                                                </View>
                                                <Text style={[st.tableCell, { flex: 0.8, textAlign: 'center', fontWeight: '800', color: C.textSub }]}>{r.points}</Text>
                                                <Text style={[st.tableCell, { flex: 1.4, fontSize: 10, color: gc.color }]} numberOfLines={1}>
                                                    {r.score >= 80 ? 'Excellent' : r.score >= 70 ? 'Good' : r.score >= 50 ? 'Average' : r.score >= 40 ? 'Below Avg' : 'Poor'}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={[st.tableRow, { backgroundColor: '#1e1b4b' }]}>
                                        <Text style={[st.tableCell, { flex: 2.2, color: 'rgba(255,255,255,0.7)', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }]}>Best 7 Total</Text>
                                        <Text style={[st.tableCell, { flex: 0.8, textAlign: 'center', color: '#fff', fontWeight: '900' }]}>{avgScore.toFixed(0)}%</Text>
                                        <View style={{ flex: 0.8 }} />
                                        <Text style={[st.tableCell, { flex: 0.8, textAlign: 'center', color: '#fff', fontWeight: '900' }]}>{best7Points}</Text>
                                        <View style={{ flex: 1.4 }} />
                                    </View>
                                </View>
                                <View style={st.summaryCard}>
                                    <Text style={st.secTitle}>📊 Summary</Text>
                                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                                        <View style={[st.meanBadge, { backgroundColor: meanGC.bg, borderColor: meanGC.color + '60' }]}>
                                            <Text style={{ fontSize: 8, fontWeight: '800', color: C.textDim, textTransform: 'uppercase' }}>Mean</Text>
                                            <Text style={{ fontSize: 32, fontWeight: '900', color: meanGC.color }}>{meanGrade}</Text>
                                        </View>
                                        <View style={{ flex: 1, flexWrap: 'wrap', flexDirection: 'row', gap: 10 }}>
                                            {[['Total Pts', `${best7Points}`, C.gold], ['Class Rank', rank ? `${rank.rank}/${rank.total}` : '-', C.purple], ['Class Avg', classAvg !== null ? `${classAvg.toFixed(1)}%` : '-', C.teal], ['Subjects', `${results844.length}`, C.accent]].map(([l, v, col]) => (
                                                <View key={l} style={{ width: '45%' }}>
                                                    <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase' }}>{l}</Text>
                                                    <Text style={{ fontSize: 16, fontWeight: '900', color: col }}>{v}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#F8FAFF', alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
    content: { padding: 14, paddingBottom: 48 },
    pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#e2e8f0' },
    pillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    schoolCard: { borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 14, gap: 4 },
    schoolName: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 1 },
    schoolSub: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 2, textAlign: 'center' },
    schoolTerm: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textAlign: 'center' },
    schoolMotto: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', textAlign: 'center' },
    kpiStrip: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
    kpiLabel: { fontSize: 7, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
    kpiValue: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    kpiSub: { fontSize: 8, color: '#64748b', fontWeight: '600' },
    levelBadgeLg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    levelBadgeLgText: { fontSize: 14, fontWeight: '900' },
    infoCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    infoItem: { width: '47%' },
    infoLbl: { fontSize: 9, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoVal: { fontSize: 13, color: '#0f172a', fontWeight: '700', marginTop: 2 },
    section: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 14, elevation: 2 },
    secTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tableHead: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tableHCell: { fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tableCell: { fontSize: 11, color: '#0f172a', fontWeight: '500' },
    levelBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
    levelBadgeText: { fontSize: 11, fontWeight: '900' },
    legendCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 14 },
    legendTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
    commentBox: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, overflow: 'hidden' },
    commentTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', padding: 12, backgroundColor: '#F8FAFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    commentText: { fontSize: 12, color: '#64748b', padding: 12, lineHeight: 18, fontStyle: 'italic' },
    shareBtn: { borderWidth: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
    shareBtnText: { fontSize: 14, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    emptyText: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
    summaryCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 14 },
    meanBadge: { width: 76, height: 76, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
