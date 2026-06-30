// APSIMS Ultra — Report Card Screen v3.0
// Auto-detects CBC (Grade 10+) vs 8-4-4 from DB
// CBC: Full printable report card matching web app design
// 8-4-4: Academic marks table with grade, points, rank
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import {
    getCBCCompetencySummaries, getStudentResults, getReportCardDelivery,
    markReportCardViewed, getCurrentTerm, getGrade,
    supabase, CBCCompetencySummary,
} from '../../lib/supabase';
import CBCLevelBadge from '../../components/CBCLevelBadge';
import ScreenHeader from '../../components/ScreenHeader';

type RouteProps = RouteProp<RootStackParamList, 'ReportCard'>;

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', primaryLight: '#dbeafe',
    teal: '#0d9488', tealLight: '#ccfbf1',
    accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    gold: '#d97706', goldLight: '#fef3c7',
    purple: '#7c3aed', purpleLight: '#ede9fe',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
    row0: '#ffffff', row1: '#f8fafc',
};

function gradeToPoints(grade: string): number {
    const map: Record<string, number> = { A: 12, 'A-': 11, 'B+': 10, B: 9, 'B-': 8, 'C+': 7, C: 6, 'C-': 5, 'D+': 4, D: 3, 'D-': 2, E: 1 };
    return map[grade] || (grade?.charAt(0) === 'A' ? 12 : grade?.charAt(0) === 'B' ? 9 : grade?.charAt(0) === 'C' ? 6 : grade?.charAt(0) === 'D' ? 3 : 1);
}
function gradeColors(grade: string): { bg: string; color: string } {
    const g = grade?.charAt(0) || '';
    if (g === 'A') return { bg: C.accentLight, color: C.accent };
    if (g === 'B') return { bg: C.primaryLight, color: C.primary };
    if (g === 'C') return { bg: C.tealLight, color: C.teal };
    if (g === 'D') return { bg: C.warningLight, color: C.warning };
    return { bg: C.dangerLight, color: C.danger };
}
function getMeanGrade(avg: number): string {
    if (avg >= 80) return 'A'; if (avg >= 75) return 'A-'; if (avg >= 70) return 'B+';
    if (avg >= 65) return 'B'; if (avg >= 60) return 'B-'; if (avg >= 55) return 'C+';
    if (avg >= 50) return 'C'; if (avg >= 45) return 'C-'; if (avg >= 40) return 'D+';
    if (avg >= 35) return 'D'; if (avg >= 30) return 'D-'; return 'E';
}

// CBC level color helpers
function cbcLevelColor(level: string | null): { bg: string; color: string } {
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

    // isCBC starts from param but can be updated from DB
    const [isCBC, setIsCBC] = useState(formLevel >= 10);
    const primaryColor = isParent ? C.teal : C.primary;
    const gradientColors: [string, string] = isCBC
        ? ['#4f46e5', '#6d28d9']
        : isParent ? ['#0d9488', '#0f766e'] : ['#2563eb', '#1d4ed8'];

    const [terms, setTerms] = useState<{ id: number; term_name: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<number>(0);
    const [selectedExamType, setSelectedExamType] = useState('End-Term');
    const [cbcData, setCbcData] = useState<CBCCompetencySummary[]>([]);
    const [results844, setResults844] = useState<any[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [schoolDetails, setSchoolDetails] = useState<{
        school_name: string; motto: string; address: string;
    } | null>(null);
    const [studentInfo, setStudentInfo] = useState<{
        full_name: string; admission_no: string; form: string;
        stream: string; gender: string; guardian: string; pathway: string;
    } | null>(null);
    const [comments, setComments] = useState<{ teacher: string; principal: string }>({ teacher: '', principal: '' });
    const [classAvg, setClassAvg] = useState<number | null>(null);
    const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const EXAM_TYPES = ['End-Term', 'Mid-Term', 'CAT 1', 'CAT 2', 'Mock'];

    // ── Load school + student meta (auto-detect CBC from DB)
    const loadMeta = useCallback(async () => {
        try {
            const [schoolRes, studentRes] = await Promise.all([
                supabase.from('school_details').select('school_name, motto, address').limit(1).single(),
                supabase.from('school_students').select(`
                    first_name, last_name, admission_number, gender,
                    school_forms(form_name, form_level),
                    school_streams(stream_name),
                    parent_name, guardian_name, guardian_phone
                `).eq('id', studentId).single(),
            ]);

            if (schoolRes.data) {
                setSchoolDetails({
                    school_name: schoolRes.data.school_name || 'APSIMS School',
                    motto: schoolRes.data.motto || '',
                    address: schoolRes.data.address || '',
                });
            }
            if (studentRes.data) {
                const s = studentRes.data as any;
                // Auto-detect CBC from actual form level in DB
                const dbFormLevel = Number(s.school_forms?.form_level || 0);
                if (dbFormLevel >= 10) setIsCBC(true);

                setStudentInfo({
                    full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                    admission_no: s.admission_number || '',
                    form: s.school_forms?.form_name || '',
                    stream: s.school_streams?.stream_name || '',
                    gender: s.gender || '',
                    guardian: s.parent_name || s.guardian_name || '',
                    pathway: 'STEM', // Can be queried from cbc_student_subjects if needed
                });
            }
        } catch (err: any) {
            console.error('ReportCard loadMeta error:', err.message);
        }
    }, [studentId]);

    // ── Load ALL terms
    const loadTerms = useCallback(async () => {
        try {
            const { data: allTerms } = await supabase
                .from('school_terms')
                .select('id, term_name, is_current')
                .order('id', { ascending: false });

            if (allTerms && allTerms.length > 0) {
                setTerms(allTerms as { id: number; term_name: string }[]);
                const cur = (allTerms as any[]).find((t: any) => t.is_current) || allTerms[0];
                setSelectedTermId(cur.id);
            } else {
                const term = await getCurrentTerm();
                if (term) { setTerms([term]); setSelectedTermId(term.id); }
            }
        } catch {
            const term = await getCurrentTerm();
            if (term) { setTerms([term]); setSelectedTermId(term.id); }
        }
    }, []);

    // ── Load marks/CBC data + comments
    const loadData = useCallback(async (termId: number, examType: string, silent = false) => {
        if (!termId) return;
        if (!silent) setLoading(true);
        try {
            if (isCBC) {
                // CBC: compute from cbc_mark_scores (same as web app)
                const data = await getCBCCompetencySummaries(studentId, termId);
                setCbcData(data);

                // Load teacher/principal comments
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
                // 8-4-4 marks
                const { data: marksData } = await supabase
                    .from('school_exam_marks')
                    .select(`id, student_id, subject_id, exam_type, score, grade, term_id, school_subjects(id, subject_name, subject_code)`)
                    .eq('student_id', studentId)
                    .eq('term_id', termId)
                    .eq('exam_type', examType);

                const rawMarks = marksData || [];
                const sorted = [...rawMarks].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
                const best7Ids = new Set(sorted.slice(0, 7).map((m: any) => m.subject_id));
                const mapped = rawMarks.map((m: any) => {
                    const score = Number(m.score || 0);
                    const grade = m.grade || getGrade(score);
                    return {
                        id: m.id, subject_id: m.subject_id,
                        subject_name: m.school_subjects?.subject_name || 'Unknown',
                        subject_code: m.school_subjects?.subject_code || '',
                        score, grade,
                        points: gradeToPoints(grade),
                        is_best7: best7Ids.has(m.subject_id),
                    };
                });
                mapped.sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
                setResults844(mapped);

                // Class avg + rank
                if (formId) {
                    const { data: formStudents } = await supabase
                        .from('school_students').select('id').eq('form_id', formId).eq('status', 'Active');
                    const sids = (formStudents || []).map((s: any) => s.id);
                    if (sids.length > 0) {
                        const { data: allMarks } = await supabase
                            .from('school_exam_marks').select('student_id, score')
                            .eq('term_id', termId).eq('exam_type', examType).in('student_id', sids);
                        const totals: Record<number, { total: number; count: number }> = {};
                        (allMarks || []).forEach((m: any) => {
                            if (!totals[m.student_id]) totals[m.student_id] = { total: 0, count: 0 };
                            totals[m.student_id].total += Number(m.score || 0);
                            totals[m.student_id].count += 1;
                        });
                        const avgList = Object.entries(totals).map(([sid, v]) => ({ sid: Number(sid), avg: v.count > 0 ? v.total / v.count : 0 }));
                        setClassAvg(avgList.length > 0 ? avgList.reduce((s, a) => s + a.avg, 0) / avgList.length : null);
                        avgList.sort((a, b) => b.avg - a.avg);
                        const myRankIdx = avgList.findIndex(a => a.sid === studentId);
                        setRank({ rank: myRankIdx >= 0 ? myRankIdx + 1 : avgList.length + 1, total: sids.length });
                    }
                }
            }

            const delivery = await getReportCardDelivery(studentId, termId);
            setPdfUrl(delivery?.pdf_url || null);
            if (isParent && delivery) await markReportCardViewed(studentId, termId);
        } catch (err: any) {
            console.error('ReportCardScreen loadData error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId, formId, isCBC, isParent]);

    useEffect(() => { loadMeta(); loadTerms(); }, [loadMeta, loadTerms]);
    useEffect(() => { if (selectedTermId) loadData(selectedTermId, selectedExamType); }, [selectedTermId, selectedExamType, loadData]);

    const onRefresh = () => { setRefreshing(true); loadData(selectedTermId, selectedExamType, true); };
    const onShare = async () => {
        try {
            await Share.share({
                message: pdfUrl
                    ? `📄 Report Card: ${studentInfo?.full_name}\n${pdfUrl}`
                    : `📄 Report Card: ${studentInfo?.full_name} — View in APSIMS app.`,
            });
        } catch { /* ignore */ }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={isCBC ? C.purple : primaryColor} />
                <Text style={styles.loadingText}>Loading report card…</Text>
            </View>
        );
    }

    const selTermName = terms.find(t => t.id === selectedTermId)?.term_name || '';
    const hasData = isCBC ? cbcData.length > 0 : results844.length > 0;
    const avgScore = results844.length > 0 ? results844.reduce((s: number, r: any) => s + r.score, 0) / results844.length : 0;
    const meanGrade = results844.length > 0 ? getMeanGrade(avgScore) : '-';
    const best7Points = results844.filter((r: any) => r.is_best7).reduce((s: number, r: any) => s + r.points, 0);
    const meanGradeColors = meanGrade !== '-' ? gradeColors(meanGrade) : { bg: '#F8FAFF', color: C.textSub };

    // CBC overall summary
    const cbcOverall = cbcData.length > 0
        ? cbcData.filter(s => s.overall_level).reduce((acc, s) => {
            const w = s.overall_level === 'EE' ? 4 : s.overall_level === 'ME' ? 3 : s.overall_level === 'AE' ? 2 : 1;
            return acc + w;
        }, 0) / cbcData.filter(s => s.overall_level).length
        : 0;
    const cbcOverallLevel = cbcOverall >= 3.5 ? 'EE' : cbcOverall >= 2.5 ? 'ME' : cbcOverall >= 1.5 ? 'AE' : cbcOverall > 0 ? 'BE' : null;

    const headerGrad: [string, string] = isCBC ? ['#4f46e5', '#6d28d9'] : (isParent ? ['#0d9488', '#0f766e'] : ['#2563eb', '#1d4ed8']);

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <ScreenHeader
                title={isCBC ? '🎓 CBC Report Card' : '📄 Report Card'}
                onBack={() => navigation.goBack()}
                gradient={headerGrad}
            />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isCBC ? C.purple : primaryColor} />}
                showsVerticalScrollIndicator={false}>

                {/* ── TERM SELECTOR */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.termScroll}
                    contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexDirection: 'row' }}>
                    {terms.map(t => (
                        <TouchableOpacity key={t.id} onPress={() => setSelectedTermId(t.id)}
                            style={[styles.termPill, selectedTermId === t.id && { backgroundColor: isCBC ? C.purple : primaryColor, borderColor: isCBC ? C.purple : primaryColor }]}>
                            <Text style={[styles.termPillText, selectedTermId === t.id && { color: '#fff' }]}>{t.term_name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── 8-4-4 EXAM TYPE TABS */}
                {!isCBC && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examTypeScroll}
                        contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexDirection: 'row' }}>
                        {EXAM_TYPES.map(et => (
                            <TouchableOpacity key={et} onPress={() => setSelectedExamType(et)}
                                style={[styles.examTypePill, selectedExamType === et && { backgroundColor: primaryColor, borderColor: primaryColor }]}>
                                <Text style={[styles.examTypePillText, selectedExamType === et && { color: '#fff' }]}>{et}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* ══════════ CBC REPORT CARD ══════════════════════════════ */}
                {isCBC ? (
                    !hasData ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>📄</Text>
                            <Text style={styles.emptyTitle}>No CBC Results Yet</Text>
                            <Text style={styles.emptyText}>No assessments found for {selTermName}.</Text>
                            <Text style={styles.emptyText}>Teachers publish results after assessment period.</Text>
                        </View>
                    ) : (
                        <>
                            {/* ── School Header Card (matches web design) */}
                            <LinearGradient colors={['#3730a3', '#4f46e5', '#6d28d9']} style={styles.schoolCard}>
                                <Text style={styles.schoolName}>{schoolDetails?.school_name?.toUpperCase() || 'ALPHA SCHOOL'}</Text>
                                <View style={styles.schoolDivider} />
                                <Text style={styles.schoolSubTitle}>STUDENT PROGRESS REPORT</Text>
                                <Text style={styles.schoolTermLabel}>{selTermName} · CBC Senior School Curriculum</Text>
                                {schoolDetails?.motto ? <Text style={styles.schoolMotto}>"{schoolDetails.motto}"</Text> : null}
                            </LinearGradient>

                            {/* ── CBC KPI Strip */}
                            <View style={styles.cbcKpiStrip}>
                                {[
                                    { label: 'GRADE LEVEL', value: cbcOverallLevel || '—', sub: cbcLevelText(cbcOverallLevel), isBadge: true },
                                    { label: 'SUBJECTS', value: `${cbcData.length}`, sub: 'Assessed', isBadge: false },
                                    { label: 'TOP LEVEL', value: `${cbcData.filter(s => s.overall_level === 'EE').length} EE`, sub: 'Exceeds Exp.', isBadge: false },
                                ].map(k => (
                                    <View key={k.label} style={styles.cbcKpiCard}>
                                        <Text style={styles.cbcKpiLabel}>{k.label}</Text>
                                        {k.isBadge ? (
                                            <View style={[styles.cbcLevelBig, { backgroundColor: cbcLevelColor(cbcOverallLevel).bg }]}>
                                                <Text style={[styles.cbcLevelBigText, { color: cbcLevelColor(cbcOverallLevel).color }]}>{k.value}</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.cbcKpiValue}>{k.value}</Text>
                                        )}
                                        <Text style={styles.cbcKpiSub}>{k.sub}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* ── Student Info Card */}
                            {studentInfo && (
                                <View style={styles.studentCard}>
                                    <View style={styles.studentInfoGrid}>
                                        {[
                                            { label: 'Student Name', value: studentInfo.full_name },
                                            { label: 'Adm Number', value: studentInfo.admission_no },
                                            { label: 'Grade / Stream', value: `${studentInfo.form}${studentInfo.stream ? ' / ' + studentInfo.stream : ''}` },
                                            { label: 'Term', value: selTermName },
                                            { label: 'Guardian', value: studentInfo.guardian || '—' },
                                            { label: 'System', value: 'CBC Senior School' },
                                        ].map(item => (
                                            <View key={item.label} style={styles.studentInfoItem}>
                                                <Text style={styles.infoLabel}>{item.label}</Text>
                                                <Text style={styles.infoValue}>{item.value || '—'}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* ── CBC Academic Performance Table */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📊 Academic Performance — Formative · Summative · Overall</Text>

                                {/* Table Header */}
                                <View style={[styles.gridHeader, { backgroundColor: '#1e1b4b' }]}>
                                    <Text style={[styles.gridHText, { flex: 2.5, color: '#fff' }]}>SUBJECT</Text>
                                    <Text style={[styles.gridHText, { flex: 1, textAlign: 'center', color: '#a5b4fc' }]}>FORM.</Text>
                                    <Text style={[styles.gridHText, { flex: 1, textAlign: 'center', color: '#a5b4fc' }]}>SUMM.</Text>
                                    <Text style={[styles.gridHText, { flex: 1.2, textAlign: 'center', color: '#fbbf24' }]}>OVERALL</Text>
                                    <Text style={[styles.gridHText, { flex: 1.5, color: '#94a3b8' }]}>REMARKS</Text>
                                </View>

                                {cbcData.map((row, idx) => {
                                    const oc = cbcLevelColor(row.overall_level);
                                    return (
                                        <View key={row.id} style={[
                                            styles.gridRow,
                                            idx % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#fafbfc' }
                                        ]}>
                                            <Text style={[styles.gridCell, { flex: 2.5, fontWeight: '700' }]} numberOfLines={2}>
                                                {idx + 1}. {row.subject_name}
                                            </Text>
                                            <View style={{ flex: 1, alignItems: 'center' }}>
                                                <CBCLevelBadge level={row.formative_level} size="sm" />
                                            </View>
                                            <View style={{ flex: 1, alignItems: 'center' }}>
                                                <CBCLevelBadge level={row.summative_level} size="sm" />
                                            </View>
                                            <View style={{ flex: 1.2, alignItems: 'center' }}>
                                                <View style={[styles.overallBadge, { backgroundColor: oc.bg }]}>
                                                    <Text style={[styles.overallBadgeText, { color: oc.color }]}>
                                                        {row.overall_level || '—'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.gridCell, { flex: 1.5, fontSize: 9, color: oc.color, fontWeight: '600' }]} numberOfLines={2}>
                                                {cbcLevelText(row.overall_level)}
                                            </Text>
                                        </View>
                                    );
                                })}

                                {/* Overall Competency Row */}
                                {cbcOverallLevel && (
                                    <View style={[styles.gridRow, { backgroundColor: '#f0f9ff', borderTopWidth: 2, borderTopColor: '#c7d2fe' }]}>
                                        <Text style={[styles.gridCell, { flex: 2.5, fontWeight: '900', color: C.text }]}>OVERALL COMPETENCY</Text>
                                        <View style={{ flex: 1 }} />
                                        <View style={{ flex: 1 }} />
                                        <View style={{ flex: 1.2, alignItems: 'center' }}>
                                            <View style={[styles.overallBadge, { backgroundColor: cbcLevelColor(cbcOverallLevel).bg, borderWidth: 2, borderColor: cbcLevelColor(cbcOverallLevel).color }]}>
                                                <Text style={[styles.overallBadgeText, { color: cbcLevelColor(cbcOverallLevel).color, fontSize: 13 }]}>{cbcOverallLevel}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.gridCell, { flex: 1.5, fontSize: 9, color: cbcLevelColor(cbcOverallLevel).color, fontWeight: '700' }]}>
                                            {cbcLevelText(cbcOverallLevel)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* ── CBC Legend */}
                            <View style={styles.legendCard}>
                                <Text style={styles.legendTitle}>Competency Level Key</Text>
                                <View style={styles.legendGrid}>
                                    {[
                                        { level: 'EE', label: 'Exceeds Expectation', color: '#059669', bg: '#d1fae5' },
                                        { level: 'ME', label: 'Meets Expectation', color: '#1d4ed8', bg: '#dbeafe' },
                                        { level: 'AE', label: 'Approaches Expectation', color: '#d97706', bg: '#fef3c7' },
                                        { level: 'BE', label: 'Below Expectation', color: '#dc2626', bg: '#fee2e2' },
                                    ].map(l => (
                                        <View key={l.level} style={styles.legendItem}>
                                            <View style={[styles.legendBadge, { backgroundColor: l.bg }]}>
                                                <Text style={[styles.legendBadgeText, { color: l.color }]}>{l.level}</Text>
                                            </View>
                                            <Text style={styles.legendLabel}>{l.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* ── Comments */}
                            <View style={styles.commentSection}>
                                <View style={styles.commentBox}>
                                    <Text style={styles.commentBoxTitle}>👨‍🏫 Class Teacher's Comment</Text>
                                    <View style={styles.commentBoxBody}>
                                        <Text style={styles.commentBoxText}>
                                            {comments.teacher || cbcLevelText(cbcOverallLevel) + '. Keep up the good work.'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.commentBox}>
                                    <Text style={styles.commentBoxTitle}>🏫 Principal's Comment</Text>
                                    <View style={styles.commentBoxBody}>
                                        <Text style={styles.commentBoxText}>
                                            {comments.principal || 'Continue to strive for excellence in all competency areas.'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Share button */}
                            <TouchableOpacity style={[styles.shareBtn, { borderColor: C.purple }]} onPress={onShare}>
                                <Text style={[styles.shareBtnText, { color: C.purple }]}>📤 Share Report Card</Text>
                            </TouchableOpacity>
                        </>
                    )
                ) : (
                    /* ══════════ 8-4-4 REPORT CARD ══════════════════════════════ */
                    <>
                        {/* School Header */}
                        {schoolDetails && (
                            <LinearGradient colors={gradientColors} style={styles.schoolCard}>
                                <Text style={styles.schoolName}>{schoolDetails.school_name}</Text>
                                {schoolDetails.motto ? <Text style={styles.schoolMotto}>"{schoolDetails.motto}"</Text> : null}
                                {schoolDetails.address ? <Text style={styles.schoolAddressText}>📍 {schoolDetails.address}</Text> : null}
                                <Text style={styles.schoolSubTitle}>📚 8-4-4 Curriculum</Text>
                            </LinearGradient>
                        )}

                        {/* Student info */}
                        {studentInfo && (
                            <View style={styles.studentCard}>
                                <View style={styles.studentInfoGrid}>
                                    {[
                                        { label: 'Admission No.', value: studentInfo.admission_no },
                                        { label: 'Full Name', value: studentInfo.full_name },
                                        { label: 'Form/Class', value: studentInfo.form },
                                        { label: 'Stream', value: studentInfo.stream },
                                        { label: 'Term', value: selTermName },
                                        { label: 'Gender', value: studentInfo.gender },
                                    ].map(item => (
                                        <View key={item.label} style={styles.studentInfoItem}>
                                            <Text style={styles.infoLabel}>{item.label}</Text>
                                            <Text style={styles.infoValue}>{item.value || '—'}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {!hasData ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyEmoji}>📄</Text>
                                <Text style={styles.emptyTitle}>No Results Available</Text>
                                <Text style={styles.emptyText}>No marks for {selectedExamType} · {selTermName}.</Text>
                            </View>
                        ) : (
                            <>
                                {/* 8-4-4 Table */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.sectionTitle}>📋 Academic Performance</Text>
                                        {results844.filter((r: any) => r.is_best7).length > 0 && (
                                            <View style={styles.best7Badge}>
                                                <Text style={styles.best7BadgeText}>⭐ Best 7</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.gridHeader, { backgroundColor: '#F8FAFF' }]}>
                                        <Text style={[styles.gridHText, { flex: 2.2 }]}>Subject</Text>
                                        <Text style={[styles.gridHText, { flex: 0.9, textAlign: 'center' }]}>Score</Text>
                                        <Text style={[styles.gridHText, { flex: 0.8, textAlign: 'center' }]}>Grade</Text>
                                        <Text style={[styles.gridHText, { flex: 0.7, textAlign: 'center' }]}>Pts</Text>
                                        <Text style={[styles.gridHText, { flex: 1.4 }]}>Remarks</Text>
                                    </View>
                                    {results844.map((r: any, idx: number) => {
                                        const score = Number(r.score || 0);
                                        const gc = gradeColors(r.grade);
                                        return (
                                            <View key={r.id} style={[
                                                styles.gridRow,
                                                idx % 2 === 0 ? { backgroundColor: C.row0 } : { backgroundColor: C.row1 },
                                                r.is_best7 && { borderLeftWidth: 3, borderLeftColor: '#d97706' }
                                            ]}>
                                                <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    {r.is_best7 && <Text style={{ fontSize: 10 }}>⭐</Text>}
                                                    <Text style={[styles.gridCell, { fontWeight: '700' }]} numberOfLines={1}>{r.subject_name}</Text>
                                                </View>
                                                <Text style={[styles.gridCell, { flex: 0.9, textAlign: 'center', fontWeight: '900', color: gc.color, fontSize: 14 }]}>{score}</Text>
                                                <View style={{ flex: 0.8, alignItems: 'center' }}>
                                                    <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                                                        <Text style={[styles.gradeBadgeText, { color: gc.color }]}>{r.grade}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.gridCell, { flex: 0.7, textAlign: 'center', fontWeight: '800', color: C.textSub }]}>{r.points}</Text>
                                                <Text style={[styles.gridCell, { flex: 1.4, color: gc.color, fontWeight: '600', fontSize: 10 }]} numberOfLines={1}>
                                                    {score >= 80 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Average' : score >= 40 ? 'Below Avg' : 'Poor'}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={styles.totalRow}>
                                        <Text style={[styles.totalLabel, { flex: 2.2 }]}>TOTAL (Best 7)</Text>
                                        <Text style={[styles.totalValue, { flex: 0.9, textAlign: 'center' }]}>{avgScore.toFixed(1)}%</Text>
                                        <View style={{ flex: 0.8 }} />
                                        <Text style={[styles.totalValue, { flex: 0.7, textAlign: 'center' }]}>{best7Points}</Text>
                                        <View style={{ flex: 1.4 }} />
                                    </View>
                                </View>

                                {/* 8-4-4 Summary */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>📊 Performance Summary</Text>
                                    <View style={styles.summaryGrid}>
                                        <View style={[styles.summaryMeanBadge, { backgroundColor: meanGradeColors.bg, borderColor: meanGradeColors.color + '40' }]}>
                                            <Text style={styles.summaryMeanLabel}>Mean Grade</Text>
                                            <Text style={[styles.summaryMeanGrade, { color: meanGradeColors.color }]}>{meanGrade}</Text>
                                        </View>
                                        <View style={styles.summaryKpiGrid}>
                                            {[
                                                { label: 'Total Pts (Best 7)', value: `${best7Points}`, color: C.gold },
                                                { label: 'Class Rank', value: rank ? `${rank.rank} / ${rank.total}` : '-', color: C.purple },
                                                { label: 'Class Average', value: classAvg !== null ? `${classAvg.toFixed(1)}%` : '-', color: primaryColor },
                                                { label: 'Subjects Sat', value: `${results844.length}`, color: C.accent },
                                            ].map(r => (
                                                <View key={r.label} style={styles.summaryKpiItem}>
                                                    <Text style={styles.summaryKpiLabel}>{r.label}</Text>
                                                    <Text style={[styles.summaryKpiValue, { color: r.color }]}>{r.value}</Text>
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

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    content: { padding: 14, paddingBottom: 48 },

    termScroll: { marginBottom: 10 },
    termPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFF', marginRight: 8, borderWidth: 1, borderColor: C.border },
    termPillText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    examTypeScroll: { marginBottom: 12 },
    examTypePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: '#F8FAFF', marginRight: 8, borderWidth: 1, borderColor: C.border },
    examTypePillText: { fontSize: 11, fontWeight: '700', color: C.textSub },

    // School header
    schoolCard: { borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 14, gap: 6 },
    schoolName: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 1 },
    schoolDivider: { width: 60, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1, marginVertical: 4 },
    schoolSubTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 2, textAlign: 'center' },
    schoolTermLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textAlign: 'center' },
    schoolMotto: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
    schoolAddressText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

    // CBC KPI strip
    cbcKpiStrip: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    cbcKpiCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
    cbcKpiLabel: { fontSize: 8, fontWeight: '800', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
    cbcKpiValue: { fontSize: 18, fontWeight: '900', color: C.text },
    cbcKpiSub: { fontSize: 8, color: C.textSub, fontWeight: '600', textAlign: 'center' },
    cbcLevelBig: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cbcLevelBigText: { fontSize: 16, fontWeight: '900' },

    // Student info
    studentCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
    studentInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    studentInfoItem: { width: '47%' },
    infoLabel: { fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 13, color: C.text, fontWeight: '700', marginTop: 2 },

    // Section
    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    best7Badge: { backgroundColor: C.goldLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
    best7BadgeText: { fontSize: 11, fontWeight: '800', color: C.gold },

    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    gridHText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },
    overallBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    overallBadgeText: { fontSize: 11, fontWeight: '900' },

    // Legend
    legendCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
    legendTitle: { fontSize: 12, fontWeight: '800', color: C.text, marginBottom: 10 },
    legendGrid: { gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 40, alignItems: 'center' },
    legendBadgeText: { fontSize: 11, fontWeight: '900' },
    legendLabel: { fontSize: 12, color: C.textSub, fontWeight: '500' },

    // Comments
    commentSection: { gap: 10, marginBottom: 14 },
    commentBox: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    commentBoxTitle: { fontSize: 12, fontWeight: '800', color: C.text, padding: 12, backgroundColor: '#F8FAFF', borderBottomWidth: 1, borderBottomColor: C.border },
    commentBoxBody: { padding: 12, minHeight: 56 },
    commentBoxText: { fontSize: 12, color: C.textSub, lineHeight: 18, fontStyle: 'italic' },

    shareBtn: { borderWidth: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
    shareBtnText: { fontSize: 14, fontWeight: '800' },

    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: C.text },
    emptyText: { fontSize: 12, color: C.textSub, textAlign: 'center', paddingHorizontal: 20 },

    // 8-4-4 specific
    gradeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
    gradeBadgeText: { fontSize: 11, fontWeight: '900' },
    totalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F8FAFF', borderTopWidth: 2, borderTopColor: C.border },
    totalLabel: { fontSize: 10, fontWeight: '900', color: C.text, textTransform: 'uppercase' },
    totalValue: { fontSize: 12, fontWeight: '900', color: C.accent },
    summaryCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
    summaryTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 14 },
    summaryGrid: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    summaryMeanBadge: { width: 80, height: 80, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
    summaryMeanLabel: { fontSize: 8, fontWeight: '800', color: C.textDim, textTransform: 'uppercase' },
    summaryMeanGrade: { fontSize: 34, fontWeight: '900' },
    summaryKpiGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summaryKpiItem: { width: '45%' },
    summaryKpiLabel: { fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryKpiValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },
});
