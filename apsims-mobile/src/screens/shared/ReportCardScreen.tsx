import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView, Share,
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

// ─────────────────────────── Colors ───────────────────────────
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

// ─────────────────────────── Helpers ──────────────────────────
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

function getRemarks(grade: string): string {
    const g = grade?.charAt(0) || '';
    if (g === 'A') return 'Excellent';
    if (g === 'B') return 'Good';
    if (g === 'C') return 'Average';
    if (g === 'D') return 'Below Average';
    return 'Poor';
}

function getMeanGrade(avgScore: number): string {
    if (avgScore >= 80) return 'A';
    if (avgScore >= 75) return 'A-';
    if (avgScore >= 70) return 'B+';
    if (avgScore >= 65) return 'B';
    if (avgScore >= 60) return 'B-';
    if (avgScore >= 55) return 'C+';
    if (avgScore >= 50) return 'C';
    if (avgScore >= 45) return 'C-';
    if (avgScore >= 40) return 'D+';
    if (avgScore >= 35) return 'D';
    if (avgScore >= 30) return 'D-';
    return 'E';
}

function getOverallRemarks(grade: string): string {
    const g = grade?.charAt(0) || '';
    if (g === 'A') return 'Outstanding performance! Keep up the excellent work.';
    if (g === 'B') return 'Good performance. Continue working hard for improvement.';
    if (g === 'C') return 'Average performance. More effort required in weak subjects.';
    if (g === 'D') return 'Below average. Needs significant improvement in all subjects.';
    return 'Very poor. Requires urgent attention and intervention.';
}

// ─────────────────────────── Screen ───────────────────────────
export default function ReportCardScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { studentId, formId, formLevel, isParent } = route.params;

    const isCBC = formLevel >= 10;
    const primaryColor = isParent ? C.teal : C.primary;
    const gradientColors: [string, string] = isParent ? ['#0d9488', '#0f766e'] : ['#2563eb', '#1d4ed8'];

    const [terms, setTerms] = useState<{ id: number; term_name: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<number>(0);
    const [selectedExamType, setSelectedExamType] = useState('End-Term');
    const [cbcData, setCbcData] = useState<CBCCompetencySummary[]>([]);
    const [results844, setResults844] = useState<any[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [schoolDetails, setSchoolDetails] = useState<{ school_name: string; motto: string; address: string } | null>(null);
    const [studentInfo, setStudentInfo] = useState<{ full_name: string; admission_no: string; form: string; stream: string; gender: string } | null>(null);
    const [classAvg, setClassAvg] = useState<number | null>(null);
    const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const EXAM_TYPES = ['End-Term', 'Mid-Term', 'CAT 1', 'CAT 2', 'Mock'];

    // ── Load school details + student info
    const loadMeta = useCallback(async () => {
        try {
            const [schoolRes, studentRes] = await Promise.all([
                supabase.from('school_details').select('school_name, motto, address').limit(1).single(),
                supabase.from('school_students').select(`
                    first_name, last_name, admission_number, gender,
                    school_forms(form_name),
                    school_streams(stream_name)
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
                setStudentInfo({
                    full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                    admission_no: s.admission_number || '',
                    form: s.school_forms?.form_name || '',
                    stream: s.school_streams?.stream_name || '',
                    gender: s.gender || '',
                });
            }
        } catch (err: any) {
            console.error('ReportCard loadMeta error:', err.message);
        }
    }, [studentId]);

    const loadTerms = useCallback(async () => {
        try {
            // Load ALL terms so parent can browse previous term report cards
            const { data: allTerms } = await supabase
                .from('school_terms')
                .select('id, term_name, is_current')
                .order('id', { ascending: false });

            if (allTerms && allTerms.length > 0) {
                setTerms(allTerms as { id: number; term_name: string }[]);
                // Default to current term if found, else latest
                const cur = (allTerms as any[]).find((t: any) => t.is_current) || allTerms[0];
                setSelectedTermId(cur.id);
            } else {
                // Fallback to getCurrentTerm
                const term = await getCurrentTerm();
                if (term) { setTerms([term]); setSelectedTermId(term.id); }
            }
        } catch {
            const term = await getCurrentTerm();
            if (term) { setTerms([term]); setSelectedTermId(term.id); }
        }
    }, []);

    const loadData = useCallback(async (termId: number, examType: string, silent = false) => {
        if (!termId) return;
        if (!silent) setLoading(true);
        try {
            if (isCBC) {
                const data = await getCBCCompetencySummaries(studentId, termId);
                setCbcData(data);
            } else {
                // 8-4-4 — filtered by exam type
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
                        id: m.id,
                        subject_id: m.subject_id,
                        subject_name: m.school_subjects?.subject_name || 'Unknown',
                        subject_code: m.school_subjects?.subject_code || '',
                        score,
                        grade,
                        points: gradeToPoints(grade),
                        is_best7: best7Ids.has(m.subject_id),
                    };
                });
                mapped.sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
                setResults844(mapped);

                // ── Class average & rank
                if (formId) {
                    try {
                        const { data: formStudents } = await supabase
                            .from('school_students')
                            .select('id')
                            .eq('form_id', formId)
                            .eq('status', 'Active');

                        const sids = (formStudents || []).map((s: any) => s.id);
                        if (sids.length > 0) {
                            const { data: allMarks } = await supabase
                                .from('school_exam_marks')
                                .select('student_id, score')
                                .eq('term_id', termId)
                                .eq('exam_type', examType)
                                .in('student_id', sids);

                            const totals: Record<number, { total: number; count: number }> = {};
                            (allMarks || []).forEach((m: any) => {
                                if (!totals[m.student_id]) totals[m.student_id] = { total: 0, count: 0 };
                                totals[m.student_id].total += Number(m.score || 0);
                                totals[m.student_id].count += 1;
                            });

                            const avgList = Object.entries(totals).map(([sid, v]) => ({ sid: Number(sid), avg: v.count > 0 ? v.total / v.count : 0 }));
                            const classAvgTotal = avgList.reduce((s, a) => s + a.avg, 0);
                            setClassAvg(avgList.length > 0 ? classAvgTotal / avgList.length : null);

                            const myAvg = mapped.length > 0 ? mapped.reduce((s: number, r: any) => s + r.score, 0) / mapped.length : 0;
                            avgList.sort((a, b) => b.avg - a.avg);
                            const myRankIdx = avgList.findIndex(a => a.sid === studentId);
                            setRank({ rank: myRankIdx >= 0 ? myRankIdx + 1 : avgList.length + 1, total: sids.length });
                        }
                    } catch { /* optional */ }
                }
            }

            const delivery = await getReportCardDelivery(studentId, termId);
            setPdfUrl(delivery?.pdf_url || null);
            if (isParent && delivery) {
                await markReportCardViewed(studentId, termId);
            }
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
                    ? `📄 Report Card: ${studentInfo?.full_name || 'Student'}\n${pdfUrl}`
                    : `📄 Report Card: ${studentInfo?.full_name || 'Student'} — No PDF available yet.`,
                title: 'Share Report Card',
            });
        } catch { /* ignore */ }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={styles.loadingText}>Loading report card…</Text>
            </View>
        );
    }

    const hasData = isCBC ? cbcData.length > 0 : results844.length > 0;
    const avgScore = results844.length > 0 ? results844.reduce((s: number, r: any) => s + r.score, 0) / results844.length : 0;
    const meanGrade = results844.length > 0 ? getMeanGrade(avgScore) : '-';
    const best7Points = results844.filter((r: any) => r.is_best7).reduce((s: number, r: any) => s + r.points, 0);
    const overallRemarks = meanGrade !== '-' ? getOverallRemarks(meanGrade) : '';
    const meanGradeColors = meanGrade !== '-' ? gradeColors(meanGrade) : { bg: '#F8FAFF', color: C.textSub };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={gradientColors[1]} />

            {/* ── HEADER */}
            <ScreenHeader
                title="📄 Report Card"
                onBack={() => navigation.goBack()}
                gradient={['#2563EB','#1D4ED8']}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {/* ── SCHOOL HEADER CARD */}
                {schoolDetails && (
                    <LinearGradient colors={gradientColors} style={styles.schoolCard}>
                        <Text style={styles.schoolName}>{schoolDetails.school_name}</Text>
                        {schoolDetails.motto ? <Text style={styles.schoolMotto}>"{schoolDetails.motto}"</Text> : null}
                        {schoolDetails.address ? <Text style={styles.schoolAddress}>📍 {schoolDetails.address}</Text> : null}
                        <Text style={styles.schoolSystem}>{isCBC ? '🎓 CBC Senior School' : '📚 8-4-4 Curriculum'}</Text>
                    </LinearGradient>
                )}

                {/* ── STUDENT INFO CARD */}
                {studentInfo && (
                    <View style={styles.studentCard}>
                        <Text style={styles.studentCardTitle}>🎓 Student Information</Text>
                        <View style={styles.studentInfoGrid}>
                            <View style={styles.studentInfoItem}>
                                <Text style={styles.infoLabel}>Admission No.</Text>
                                <Text style={[styles.infoValue, { color: primaryColor }]}>{studentInfo.admission_no || '-'}</Text>
                            </View>
                            <View style={styles.studentInfoItem}>
                                <Text style={styles.infoLabel}>Full Name</Text>
                                <Text style={styles.infoValue}>{studentInfo.full_name || '-'}</Text>
                            </View>
                            <View style={styles.studentInfoItem}>
                                <Text style={styles.infoLabel}>Form/Class</Text>
                                <Text style={styles.infoValue}>{studentInfo.form || '-'}</Text>
                            </View>
                            <View style={styles.studentInfoItem}>
                                <Text style={styles.infoLabel}>Stream</Text>
                                <Text style={styles.infoValue}>{studentInfo.stream || '-'}</Text>
                            </View>
                            {studentInfo.gender ? (
                                <View style={styles.studentInfoItem}>
                                    <Text style={styles.infoLabel}>Gender</Text>
                                    <Text style={styles.infoValue}>{studentInfo.gender}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                )}

                {/* ── TERM SELECTOR */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.termScroll}>
                    {terms.map(t => (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setSelectedTermId(t.id)}
                            style={[styles.termPill, selectedTermId === t.id && { ...styles.termPillActive, backgroundColor: primaryColor, borderColor: primaryColor }]}
                            accessibilityLabel={`Select ${t.term_name}`}
                        >
                            <Text style={[styles.termPillText, selectedTermId === t.id && styles.termPillTextActive]}>
                                {t.term_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── EXAM TYPE TABS (8-4-4 only) */}
                {!isCBC && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examTypeScroll}>
                        {EXAM_TYPES.map(et => (
                            <TouchableOpacity
                                key={et}
                                onPress={() => setSelectedExamType(et)}
                                style={[styles.examTypePill, selectedExamType === et && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                                accessibilityLabel={`Select ${et}`}
                            >
                                <Text style={[styles.examTypePillText, selectedExamType === et && { color: '#fff' }]}>{et}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* ── ACTION BUTTONS */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: primaryColor }]}
                        onPress={onShare}
                        accessibilityLabel="Share PDF report card"
                    >
                        <Text style={[styles.actionBtnText, { color: primaryColor }]}>📤 Share PDF</Text>
                    </TouchableOpacity>
                    {pdfUrl && (
                        <TouchableOpacity
                            style={[styles.actionBtnFilled, { backgroundColor: primaryColor }]}
                            onPress={() => onShare()}
                            accessibilityLabel="Print report card"
                        >
                            <Text style={styles.actionBtnFilledText}>🖨️ Print</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {!hasData ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📄</Text>
                        <Text style={styles.emptyTitle}>No Results Available</Text>
                        <Text style={styles.emptyText}>No report card data available for this term and exam type.</Text>
                    </View>
                ) : isCBC ? (
                    // ── CBC VIEW
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎓 CBC Competency Levels</Text>
                        <View style={styles.gridHeader}>
                            <Text style={[styles.gridHText, { flex: 2 }]}>Subject</Text>
                            <Text style={[styles.gridHText, { flex: 1, textAlign: 'center' }]}>Form.</Text>
                            <Text style={[styles.gridHText, { flex: 1, textAlign: 'center' }]}>Sum.</Text>
                            <Text style={[styles.gridHText, { flex: 1, textAlign: 'center' }]}>Overall</Text>
                        </View>
                        {cbcData.map((s, idx) => (
                            <View key={s.id} style={[styles.gridRow, idx % 2 === 0 ? { backgroundColor: C.row0 } : { backgroundColor: C.row1 }]}>
                                <Text style={[styles.gridCell, { flex: 2, fontWeight: '700' }]}>{s.subject_name}</Text>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <CBCLevelBadge level={s.formative_level} size="sm" />
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <CBCLevelBadge level={s.summative_level} size="sm" />
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <CBCLevelBadge level={s.overall_level} size="sm" />
                                </View>
                            </View>
                        ))}
                        {/* Legend */}
                        <View style={styles.legend}>
                            {[
                                { level: 'EE', label: 'Exceeds Expectation', color: '#059669' },
                                { level: 'ME', label: 'Meets Expectation', color: '#2563eb' },
                                { level: 'AE', label: 'Approaches Expectation', color: '#f59e0b' },
                                { level: 'BE', label: 'Below Expectation', color: '#ef4444' },
                            ].map(l => (
                                <View key={l.level} style={styles.legendRow}>
                                    <Text style={[styles.legendLevel, { color: l.color }]}>{l.level}</Text>
                                    <Text style={styles.legendLabel}>{l.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    // ── 8-4-4 VIEW — PREMIUM TABLE
                    <>
                        {/* Academic Table */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>📋 Academic Performance</Text>
                                {results844.filter((r: any) => r.is_best7).length > 0 && (
                                    <View style={styles.best7Badge}>
                                        <Text style={styles.best7BadgeText}>⭐ Best 7</Text>
                                    </View>
                                )}
                            </View>

                            {/* Table Header */}
                            <View style={[styles.gridHeader, { backgroundColor: '#F8FAFF' }]}>
                                <Text style={[styles.gridHText, { flex: 2.2 }]}>Subject</Text>
                                <Text style={[styles.gridHText, { flex: 0.9, textAlign: 'center' }]}>Score</Text>
                                <Text style={[styles.gridHText, { flex: 0.8, textAlign: 'center' }]}>Grade</Text>
                                <Text style={[styles.gridHText, { flex: 0.7, textAlign: 'center' }]}>Pts</Text>
                                <Text style={[styles.gridHText, { flex: 1.4 }]}>Remarks</Text>
                            </View>

                            {results844.map((r: any, idx: number) => {
                                const score = Number(r.score || 0);
                                const grade = r.grade || getGrade(score);
                                const gc = gradeColors(grade);
                                const remarks = getRemarks(grade);
                                return (
                                    <View
                                        key={r.id}
                                        style={[
                                            styles.gridRow,
                                            idx % 2 === 0 ? { backgroundColor: C.row0 } : { backgroundColor: C.row1 },
                                            r.is_best7 && styles.best7Row,
                                        ]}
                                    >
                                        <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            {r.is_best7 && <Text style={{ fontSize: 10 }}>⭐</Text>}
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.gridCell, { fontWeight: '700' }]} numberOfLines={1}>{r.subject_name}</Text>
                                                {r.subject_code ? <Text style={{ fontSize: 8, color: C.textDim, fontWeight: '600' }}>{r.subject_code}</Text> : null}
                                            </View>
                                        </View>
                                        <View style={{ flex: 0.9, alignItems: 'center' }}>
                                            <Text style={[styles.gridCell, { fontWeight: '900', color: gc.color, fontSize: 14 }]}>{score}</Text>
                                        </View>
                                        <View style={{ flex: 0.8, alignItems: 'center' }}>
                                            <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                                                <Text style={[styles.gradeBadgeText, { color: gc.color }]}>{grade}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 0.7, alignItems: 'center' }}>
                                            <Text style={[styles.gridCell, { fontWeight: '800', color: C.textSub }]}>{r.points}</Text>
                                        </View>
                                        <Text style={[styles.gridCell, { flex: 1.4, color: gc.color, fontWeight: '600', fontSize: 10 }]} numberOfLines={1}>
                                            {remarks}
                                        </Text>
                                    </View>
                                );
                            })}

                            {/* Total row */}
                            <View style={styles.totalRow}>
                                <Text style={[styles.totalLabel, { flex: 2.2 }]}>TOTAL (Best 7)</Text>
                                <Text style={[styles.totalValue, { flex: 0.9, textAlign: 'center' }]}>
                                    {avgScore.toFixed(1)}%
                                </Text>
                                <View style={{ flex: 0.8 }} />
                                <Text style={[styles.totalValue, { flex: 0.7, textAlign: 'center' }]}>{best7Points}</Text>
                                <View style={{ flex: 1.4 }} />
                            </View>
                        </View>

                        {/* Summary KPI section */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>📊 Performance Summary</Text>
                            <View style={styles.summaryGrid}>
                                {/* Mean Grade — BIG */}
                                <View style={[styles.summaryMeanBadge, { backgroundColor: meanGradeColors.bg, borderColor: meanGradeColors.color + '40' }]}>
                                    <Text style={styles.summaryMeanLabel}>Mean Grade</Text>
                                    <Text style={[styles.summaryMeanGrade, { color: meanGradeColors.color }]}>{meanGrade}</Text>
                                </View>
                                <View style={styles.summaryKpiGrid}>
                                    <View style={styles.summaryKpiItem}>
                                        <Text style={styles.summaryKpiLabel}>Total Pts (Best 7)</Text>
                                        <Text style={[styles.summaryKpiValue, { color: C.gold }]}>{best7Points}</Text>
                                    </View>
                                    <View style={styles.summaryKpiItem}>
                                        <Text style={styles.summaryKpiLabel}>Class Rank</Text>
                                        <Text style={[styles.summaryKpiValue, { color: C.purple }]}>
                                            {rank ? `${rank.rank} / ${rank.total}` : '-'}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryKpiItem}>
                                        <Text style={styles.summaryKpiLabel}>Class Average</Text>
                                        <Text style={[styles.summaryKpiValue, { color: C.primary }]}>
                                            {classAvg !== null ? `${classAvg.toFixed(1)}%` : '-'}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryKpiItem}>
                                        <Text style={styles.summaryKpiLabel}>Subjects Sat</Text>
                                        <Text style={[styles.summaryKpiValue, { color: C.accent }]}>{results844.length}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Overall Remarks */}
                            {overallRemarks && (
                                <View style={[styles.remarksBox, { borderLeftColor: meanGradeColors.color }]}>
                                    <Text style={styles.remarksLabel}>Overall Remarks</Text>
                                    <Text style={[styles.remarksText, { color: meanGradeColors.color }]}>{overallRemarks}</Text>
                                </View>
                            )}
                        </View>

                        {/* Teacher / Principal Comment boxes */}
                        <View style={styles.commentSection}>
                            <View style={styles.commentBox}>
                                <Text style={styles.commentBoxTitle}>👨‍🏫 Class Teacher's Comment</Text>
                                <View style={styles.commentBoxBody}>
                                    <Text style={styles.commentBoxPlaceholder}>
                                        {meanGrade !== '-' ? getOverallRemarks(meanGrade) : 'No comment available.'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.commentBox}>
                                <Text style={styles.commentBoxTitle}>🏫 Principal's Comment</Text>
                                <View style={styles.commentBoxBody}>
                                    <Text style={styles.commentBoxPlaceholder}>
                                        {'Keep up the hard work and continue to strive for excellence.'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },

    header: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 },
    backBtn: { marginBottom: 8 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '600' },

    content: { padding: 16, paddingBottom: 48 },

    schoolCard: { borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 14, gap: 4 },
    schoolName: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center' },
    schoolMotto: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontStyle: 'italic', fontWeight: '600' },
    schoolAddress: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '500' },
    schoolSystem: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '800', marginTop: 4 },

    studentCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
    studentCardTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
    studentInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    studentInfoItem: { width: '45%' },
    infoLabel: { fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 13, color: C.text, fontWeight: '700', marginTop: 2 },

    termScroll: { marginBottom: 10 },
    termPill: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#F8FAFF', marginRight: 8,
        borderWidth: 1, borderColor: C.border,
    },
    termPillActive: { backgroundColor: C.primary, borderColor: C.primary },
    termPillText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    termPillTextActive: { color: '#fff' },

    examTypeScroll: { marginBottom: 14 },
    examTypePill: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18,
        backgroundColor: '#F8FAFF', marginRight: 8,
        borderWidth: 1, borderColor: C.border,
    },
    examTypePillText: { fontSize: 11, fontWeight: '700', color: C.textSub },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 2, alignItems: 'center' },
    actionBtnText: { fontSize: 13, fontWeight: '800' },
    actionBtnFilled: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
    actionBtnFilledText: { fontSize: 13, fontWeight: '800', color: '#fff' },

    section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 14 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    best7Badge: { backgroundColor: C.goldLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
    best7BadgeText: { fontSize: 11, fontWeight: '800', color: C.gold },

    gridHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F8FAFF', borderBottomWidth: 1, borderBottomColor: C.border },
    gridHText: { fontSize: 9, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
    gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    best7Row: { borderLeftWidth: 3, borderLeftColor: '#d97706' },
    gridCell: { fontSize: 11, color: C.text, fontWeight: '500' },
    gradeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
    gradeBadgeText: { fontSize: 11, fontWeight: '900' },

    totalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F8FAFF', borderTopWidth: 2, borderTopColor: C.border },
    totalLabel: { fontSize: 10, fontWeight: '900', color: C.text, textTransform: 'uppercase' },
    totalValue: { fontSize: 12, fontWeight: '900', color: C.accent },

    summaryCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
    summaryTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 14 },
    summaryGrid: { flexDirection: 'row', gap: 14, marginBottom: 14, alignItems: 'center' },
    summaryMeanBadge: {
        width: 80, height: 80, borderRadius: 20, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    summaryMeanLabel: { fontSize: 8, fontWeight: '800', color: C.textDim, textTransform: 'uppercase' },
    summaryMeanGrade: { fontSize: 34, fontWeight: '900' },
    summaryKpiGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summaryKpiItem: { width: '45%' },
    summaryKpiLabel: { fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryKpiValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },

    remarksBox: { backgroundColor: '#fafbfc', borderRadius: 10, padding: 12, borderLeftWidth: 4 },
    remarksLabel: { fontSize: 10, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
    remarksText: { fontSize: 13, fontWeight: '700', lineHeight: 20 },

    commentSection: { gap: 10, marginBottom: 14 },
    commentBox: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    commentBoxTitle: { fontSize: 13, fontWeight: '800', color: C.text, padding: 12, backgroundColor: '#F8FAFF', borderBottomWidth: 1, borderBottomColor: C.border },
    commentBoxBody: { padding: 12, minHeight: 60 },
    commentBoxPlaceholder: { fontSize: 12, color: C.textSub, lineHeight: 18, fontStyle: 'italic' },

    emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    emptyEmoji: { fontSize: 44 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    emptyText: { fontSize: 12, color: C.textSub, textAlign: 'center', paddingHorizontal: 24 },

    legend: { padding: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendLevel: { fontSize: 11, fontWeight: '900', width: 28 },
    legendLabel: { fontSize: 11, color: C.textSub },
});
