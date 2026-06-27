// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Academic Report — 8-4-4 & CBC Analytics
// Grade distribution · Subject performance · Student rankings
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { COLORS, SHADOWS, fmt, fmtPct } from '../../components/ultra/UltraTheme';
import { LineChart, BarChart, DoughnutChart, ProgressRing, ProgressBar } from '../../components/ultra/UltraCharts';
import { KPICard, SectionHeader, ChartPanel, FilterBar, TabSwitcher, DataGrid, StatusBadge } from '../../components/ultra/UltraComponents';
import ScreenHeader from '../../components/ScreenHeader';

const W = Dimensions.get('window').width;
const CW = W - 60;

// 8-4-4 Grade mapping
const getGrade = (pct: number) => {
  if (pct >= 80) return 'A'; if (pct >= 75) return 'A-'; if (pct >= 70) return 'B+';
  if (pct >= 65) return 'B'; if (pct >= 60) return 'B-'; if (pct >= 55) return 'C+';
  if (pct >= 50) return 'C'; if (pct >= 45) return 'C-'; if (pct >= 40) return 'D+';
  if (pct >= 35) return 'D'; if (pct >= 30) return 'D-'; return 'E';
};
const GRADE_ORDER = ['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'];
const GRADE_COLORS: Record<string, string> = { A: '#059669', 'A-': '#10b981', 'B+': '#0891b2', B: '#3b82f6', 'B-': '#6366f1', 'C+': '#8b5cf6', C: '#a855f7', 'C-': '#d946ef', 'D+': '#f59e0b', D: '#d97706', 'D-': '#ea580c', E: '#ef4444' };

// CBC Rubric mapping
const getRubric = (pct: number) => {
  if (pct >= 75) return 'EE'; if (pct >= 50) return 'ME'; if (pct >= 25) return 'AE'; return 'BE';
};
const RUBRIC_COLORS = { EE: '#059669', ME: '#3b82f6', AE: '#f59e0b', BE: '#ef4444' };

export default function AcademicReportScreen() {
    const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('performance');
  const [data, setData] = useState<any>(null);
  const [curriculum, setCurriculum] = useState('844');
  const [filters, setFilters] = useState({ term: 'All', form: 'All', stream: 'All' });
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [marksR, studentsR, formsR, streamsR, subjectsR, teachersR, stR] = await Promise.all([
        supabase.from('school_exam_marks').select('*'),
        supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id, stream_id, status, gender'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*'),
        supabase.from('school_subjects').select('*'),
        supabase.from('school_teachers').select('id, first_name, last_name, is_active'),
        supabase.from('school_subject_teachers').select('*'),
      ]);
      const marks = marksR.data || [];
      const students = studentsR.data || [];
      const forms = formsR.data || [];
      const streams = streamsR.data || [];
      const subjects = subjectsR.data || [];
      const teachers = teachersR.data || [];
      const subjectTeachers = stR.data || [];

      // Overall stats
      const totalMarks = marks.reduce((s: number, m: any) => s + Number(m.marks_obtained || 0), 0);
      const totalOutOf = marks.reduce((s: number, m: any) => s + Number(m.out_of || 100), 0);
      const meanPct = totalOutOf > 0 ? Math.round((totalMarks / totalOutOf) * 100) : 0;
      const highest = marks.length > 0 ? Math.max(...marks.map((m: any) => Number(m.marks_obtained || 0))) : 0;
      const marksEntryRate = marks.length > 0 ? Math.min(100, Math.round((marks.length / (students.length * Math.max(subjects.length, 1))) * 100)) : 0;

      // Grade distribution
      const gradeDist: Record<string, number> = {};
      GRADE_ORDER.forEach(g => gradeDist[g] = 0);
      marks.forEach((m: any) => {
        const pct = Number(m.out_of || 100) > 0 ? (Number(m.marks_obtained || 0) / Number(m.out_of || 100)) * 100 : 0;
        const g = getGrade(pct);
        gradeDist[g] = (gradeDist[g] || 0) + 1;
      });

      // CBC rubric distribution
      const rubricDist: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      marks.forEach((m: any) => {
        const pct = Number(m.out_of || 100) > 0 ? (Number(m.marks_obtained || 0) / Number(m.out_of || 100)) * 100 : 0;
        rubricDist[getRubric(pct)]++;
      });

      // Form performance
      const formPerf = forms.map((f: any) => {
        const formStudents = students.filter((s: any) => s.form_id === f.id);
        const fMarks = marks.filter((m: any) => formStudents.some((s: any) => s.id === m.student_id));
        const fTotal = fMarks.reduce((s: number, m: any) => s + Number(m.marks_obtained || 0), 0);
        const fOutOf = fMarks.reduce((s: number, m: any) => s + Number(m.out_of || 100), 0);
        const mean = fOutOf > 0 ? Math.round((fTotal / fOutOf) * 100) : 0;
        return { form: f.form_name?.replace('Form ', 'F') || `F${f.form_level}`, mean, count: formStudents.length, entries: fMarks.length };
      });

      // Subject performance
      const subjectPerf = subjects.map((sub: any) => {
        const sMarks = marks.filter((m: any) => m.subject_id === sub.id);
        const sTotal = sMarks.reduce((s: number, m: any) => s + Number(m.marks_obtained || 0), 0);
        const sOutOf = sMarks.reduce((s: number, m: any) => s + Number(m.out_of || 100), 0);
        const mean = sOutOf > 0 ? Math.round((sTotal / sOutOf) * 100) : 0;
        const hi = sMarks.length > 0 ? Math.max(...sMarks.map((m: any) => Number(m.marks_obtained || 0))) : 0;
        const lo = sMarks.length > 0 ? Math.min(...sMarks.map((m: any) => Number(m.marks_obtained || 0))) : 0;
        const aCount = sMarks.filter((m: any) => { const p = Number(m.out_of || 100) > 0 ? (Number(m.marks_obtained) / Number(m.out_of || 100)) * 100 : 0; return p >= 80; }).length;
        const st = subjectTeachers.find((t: any) => t.subject_id === sub.id);
        const teacher = st ? teachers.find((t: any) => t.id === st.teacher_id) : null;
        return {
          subject: sub.subject_name || sub.name || 'Unknown',
          mean, highest: hi, lowest: lo, aCount, entries: sMarks.length,
          teacher: teacher ? `${teacher.last_name}, ${teacher.first_name}` : '—',
        };
      }).sort((a: any, b: any) => b.mean - a.mean);

      // Student rankings
      const studentScores = students.map((s: any) => {
        const sMarks = marks.filter((m: any) => m.student_id === s.id);
        const total = sMarks.reduce((sum: number, m: any) => sum + Number(m.marks_obtained || 0), 0);
        const outOf = sMarks.reduce((sum: number, m: any) => sum + Number(m.out_of || 100), 0);
        const mean = outOf > 0 ? Math.round((total / outOf) * 100) : 0;
        const form = forms.find((f: any) => f.id === s.form_id);
        const stream = streams.find((st: any) => st.id === s.stream_id);
        return {
          admNo: s.admission_number || `${s.id}`,
          student: `${s.last_name || ''}, ${s.first_name || ''}`,
          form: form?.form_name || '—',
          stream: stream?.stream_name || '',
          total, mean, grade: getGrade(mean), subjects: sMarks.length,
        };
      }).filter((s: any) => s.subjects > 0).sort((a: any, b: any) => b.mean - a.mean);
      
      // Add rank
      studentScores.forEach((s: any, i: number) => s.rank = i + 1);

      // Teacher performance
      const teacherPerf = teachers.filter((t: any) => t.is_active).map((t: any) => {
        const tSubjects = subjectTeachers.filter((st: any) => st.teacher_id === t.id);
        const tMarks = marks.filter((m: any) => tSubjects.some((ts: any) => ts.subject_id === m.subject_id));
        const tTotal = tMarks.reduce((s: number, m: any) => s + Number(m.marks_obtained || 0), 0);
        const tOutOf = tMarks.reduce((s: number, m: any) => s + Number(m.out_of || 100), 0);
        const mean = tOutOf > 0 ? Math.round((tTotal / tOutOf) * 100) : 0;
        const aCount = tMarks.filter((m: any) => (Number(m.marks_obtained || 0) / Number(m.out_of || 100)) * 100 >= 80).length;
        const subjectNames = tSubjects.map((ts: any) => subjects.find((s: any) => s.id === ts.subject_id)?.subject_name || '').filter(Boolean).join(', ');
        return {
          teacher: `${t.last_name || ''}, ${t.first_name || ''}`,
          subject: subjectNames || '—',
          examined: tMarks.length, mean, aCount,
          entryRate: students.length > 0 ? Math.min(100, Math.round((tMarks.length / students.length) * 100)) : 0,
        };
      }).sort((a: any, b: any) => b.mean - a.mean);

      setData({
        meanPct, highest, studentsExamined: studentScores.length, marksEntryRate,
        gradeDist, rubricDist, formPerf, subjectPerf, studentScores, teacherPerf,
        totalStudents: students.length,
        formNames: forms.map((f: any) => f.form_name || `Form ${f.form_level}`),
        streamNames: streams.map((s: any) => s.stream_name),
        aCount: gradeDist['A'] + gradeDist['A-'],
        bCount: gradeDist['B+'] + gradeDist['B'] + gradeDist['B-'],
        cCount: gradeDist['C+'] + gradeDist['C'] + gradeDist['C-'],
        belowC: gradeDist['D+'] + gradeDist['D'] + gradeDist['D-'] + gradeDist['E'],
      });
    } catch (e) { console.error('Academic fetch:', e); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <View style={{ flex: 1 }}><LinearGradient colors={['#f8fafc', '#eef2ff']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 32 }}>📚</Text>
      <ActivityIndicator size="large" color={COLORS.purple} style={{ marginTop: 12 }} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>Loading Academic Analytics...</Text>
    </LinearGradient></View>
  );
  if (!data) return null;

  const filterConfig = [
    { key: 'curriculum', label: 'Mode', options: ['8-4-4', 'CBC'], value: curriculum === '844' ? '8-4-4' : 'CBC' },
    { key: 'term', label: 'Term', options: ['All', 'Term 1', 'Term 2', 'Term 3'], value: filters.term },
    { key: 'form', label: 'Form', options: ['All', ...data.formNames], value: filters.form },
    { key: 'stream', label: 'Stream', options: ['All', ...data.streamNames], value: filters.stream },
  ];

  const filteredStudents = search
    ? data.studentScores.filter((s: any) => s.admNo.toLowerCase().includes(search.toLowerCase()) || s.student.toLowerCase().includes(search.toLowerCase()))
    : data.studentScores;

  const is844 = curriculum === '844';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6c5ce7" translucent={false} />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.purple]} />} contentContainerStyle={{ paddingBottom: 30 }}>
        <ScreenHeader
                title="📊 Academic Report"
                onBack={() => navigation.goBack()}
                gradient={['#4F46E5','#7C3AED']}
            />

        <View style={styles.content}>
          <FilterBar
            filters={filterConfig}
            onFilterChange={(k, v) => {
              if (k === 'curriculum') setCurriculum(v === 'CBC' ? 'cbc' : '844');
              else setFilters(prev => ({ ...prev, [k]: v }));
            }}
            showSearch searchPlaceholder="Search admission no or name..."
            onSearch={setSearch}
          />

          <TabSwitcher
            tabs={[
              { key: 'performance', label: 'Performance', icon: '📊' },
              { key: 'subjects', label: 'Subjects', icon: '📖' },
              { key: 'students', label: 'Students', icon: '👨‍🎓' },
              { key: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
            ]}
            active={tab} onChange={setTab}
          />

          {/* ══ PERFORMANCE TAB ══ */}
          {tab === 'performance' && <>
            <View style={styles.kpiGrid}>
              {[
                { label: 'School Mean', value: `${data.meanPct}%`, icon: '🎯', color: COLORS.purple, sub: `Grade: ${getGrade(data.meanPct)}`, progress: data.meanPct, trend: `${data.meanPct}%`, trendUp: data.meanPct >= 50 },
                { label: 'Highest Score', value: data.highest, icon: '🏆', color: COLORS.green, sub: 'Top mark obtained' },
                { label: 'Examined', value: data.studentsExamined, icon: '👨‍🎓', color: COLORS.blue, sub: `of ${data.totalStudents} students` },
                { label: 'Marks Entry', value: `${data.marksEntryRate}%`, icon: '✏️', color: COLORS.amber, progress: data.marksEntryRate },
                ...(is844 ? [
                  { label: 'A/A- Count', value: data.aCount, icon: '⭐', color: '#059669', sub: 'Top grades' },
                  { label: 'B+/B/B-', value: data.bCount, icon: '📈', color: COLORS.blue, sub: 'Above average' },
                  { label: 'C+/C/C-', value: data.cCount, icon: '📊', color: COLORS.amber, sub: 'Average' },
                  { label: 'Below C-', value: data.belowC, icon: '⚠️', color: COLORS.red, sub: 'Needs improvement', trend: `${data.belowC}`, trendUp: false },
                ] : [
                  { label: 'EE Count', value: data.rubricDist.EE, icon: '⭐', color: '#059669', sub: 'Exceeds Expectations' },
                  { label: 'ME Count', value: data.rubricDist.ME, icon: '✅', color: COLORS.blue, sub: 'Meets Expectations' },
                  { label: 'AE Count', value: data.rubricDist.AE, icon: '📊', color: COLORS.amber, sub: 'Approaches' },
                  { label: 'BE Count', value: data.rubricDist.BE, icon: '⚠️', color: COLORS.red, sub: 'Below Expectations' },
                ]),
              ].map((c, i) => <View key={i} style={styles.kpiItem}><KPICard {...c} compact /></View>)}
            </View>

            {is844 ? (
              <ChartPanel title="📊 Grade Distribution" subtitle="8-4-4 System">
                <BarChart
                  data={[GRADE_ORDER.map(g => data.gradeDist[g] || 0)]}
                  labels={GRADE_ORDER}
                  colors={GRADE_ORDER.map(g => GRADE_COLORS[g])}
                  width={CW} height={160}
                />
              </ChartPanel>
            ) : (
              <ChartPanel title="📊 CBC Rubric Distribution">
                <DoughnutChart
                  data={[data.rubricDist.EE, data.rubricDist.ME, data.rubricDist.AE, data.rubricDist.BE]}
                  colors={[RUBRIC_COLORS.EE, RUBRIC_COLORS.ME, RUBRIC_COLORS.AE, RUBRIC_COLORS.BE]}
                  labels={['Exceeds (EE)', 'Meets (ME)', 'Approaches (AE)', 'Below (BE)']}
                  size={140} strokeWidth={20}
                  centerValue={`${data.studentsExamined}`} centerLabel="Assessed"
                />
              </ChartPanel>
            )}

            <ChartPanel title="📈 Form Performance" subtitle="Mean score by form">
              <BarChart
                data={[data.formPerf.map((f: any) => f.mean)]}
                labels={data.formPerf.map((f: any) => f.form)}
                colors={[COLORS.purple]}
                width={CW} height={140}
                formatY={(v: number) => `${v}%`}
              />
            </ChartPanel>
          </>}

          {/* ══ SUBJECTS TAB ══ */}
          {tab === 'subjects' && <>
            <ChartPanel title="📖 Subject Performance" subtitle="Mean score (sorted)">
              <BarChart
                data={[data.subjectPerf.slice(0, 10).map((s: any) => s.mean)]}
                labels={data.subjectPerf.slice(0, 10).map((s: any) => s.subject.substring(0, 8))}
                colors={COLORS.chart.slice(0, 10)}
                width={CW} height={180}
                horizontal
                formatY={(v: number) => `${v}%`}
              />
            </ChartPanel>
            <SectionHeader title="Subject Details" icon="📋" />
            <DataGrid
              columns={[
                { key: 'subject', label: 'Subject', width: 100 },
                { key: 'mean', label: 'Mean %', width: 60, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '800', color: v >= 60 ? '#059669' : v >= 40 ? '#f59e0b' : '#ef4444' }}>{v}%</Text> },
                { key: 'highest', label: 'High', width: 50, align: 'right' },
                { key: 'lowest', label: 'Low', width: 45, align: 'right' },
                { key: 'aCount', label: "A's", width: 40, align: 'center', render: (v: number) => <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>{v}</Text> },
                { key: 'entries', label: 'Entries', width: 55, align: 'center' },
                { key: 'teacher', label: 'Teacher', width: 110 },
              ]}
              data={data.subjectPerf}
            />
          </>}

          {/* ══ STUDENTS TAB ══ */}
          {tab === 'students' && <>
            <SectionHeader title="🏆 Top 10 Students" icon="⭐" />
            <DataGrid
              columns={[
                { key: 'rank', label: '#', width: 30, align: 'center', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '800', color: v <= 3 ? '#d97706' : '#475569' }}>{v <= 3 ? ['🥇','🥈','🥉'][v-1] : v}</Text> },
                { key: 'admNo', label: 'Adm No', width: 70 },
                { key: 'student', label: 'Student', width: 120 },
                { key: 'form', label: 'Form', width: 65 },
                { key: 'total', label: 'Total', width: 50, align: 'right' },
                { key: 'mean', label: 'Mean', width: 50, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>{v}%</Text> },
                { key: 'grade', label: 'Grade', width: 45, align: 'center', render: (v: string) => <View style={[styles.gradeBadge, { backgroundColor: (GRADE_COLORS[v] || '#94a3b8') + '20' }]}><Text style={{ fontSize: 9, fontWeight: '800', color: GRADE_COLORS[v] || '#475569' }}>{v}</Text></View> },
              ]}
              data={(search ? filteredStudents : data.studentScores).slice(0, 10)}
            />

            <SectionHeader title="⚠️ Bottom 10 Students" icon="📉" />
            <DataGrid
              columns={[
                { key: 'rank', label: '#', width: 30, align: 'center' },
                { key: 'admNo', label: 'Adm No', width: 70 },
                { key: 'student', label: 'Student', width: 120 },
                { key: 'form', label: 'Form', width: 65 },
                { key: 'mean', label: 'Mean', width: 50, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '800', color: '#ef4444' }}>{v}%</Text> },
                { key: 'grade', label: 'Grade', width: 45, align: 'center', render: (v: string) => <View style={[styles.gradeBadge, { backgroundColor: '#fef2f2' }]}><Text style={{ fontSize: 9, fontWeight: '800', color: '#ef4444' }}>{v}</Text></View> },
              ]}
              data={data.studentScores.slice(-10).reverse()}
            />
          </>}

          {/* ══ TEACHERS TAB ══ */}
          {tab === 'teachers' && <>
            <ChartPanel title="👨‍🏫 Teacher Performance" subtitle="Mean score by teacher">
              <BarChart
                data={[data.teacherPerf.slice(0, 8).map((t: any) => t.mean)]}
                labels={data.teacherPerf.slice(0, 8).map((t: any) => t.teacher.split(',')[0]?.substring(0, 8) || '—')}
                colors={COLORS.chart.slice(0, 8)}
                width={CW} height={160}
                horizontal
                formatY={(v: number) => `${v}%`}
              />
            </ChartPanel>
            <SectionHeader title="Teacher Details" icon="📋" />
            <DataGrid
              columns={[
                { key: 'teacher', label: 'Teacher', width: 110 },
                { key: 'subject', label: 'Subject', width: 90 },
                { key: 'examined', label: 'Examined', width: 65, align: 'center' },
                { key: 'mean', label: 'Mean %', width: 60, align: 'right', render: (v: number) => <Text style={{ fontSize: 11, fontWeight: '700', color: v >= 60 ? '#059669' : '#f59e0b' }}>{v}%</Text> },
                { key: 'aCount', label: "A's", width: 35, align: 'center' },
                { key: 'entryRate', label: 'Entry %', width: 60, align: 'right', render: (v: number) => <Text style={{ fontSize: 10, fontWeight: '600', color: v >= 80 ? '#059669' : '#ef4444' }}>{v}%</Text> },
              ]}
              data={data.teacherPerf}
            />
          </>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiItem: { width: (W - 40) / 2 },
  gradeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'center' },
});
