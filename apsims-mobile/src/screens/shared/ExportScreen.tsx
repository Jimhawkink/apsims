import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportNEMISData, exportKCSEMarks, getExamTypes, ExamType, NEMISStudent, KCSEMarkRow } from '../../lib/supabase';
import { useNetworkStatus } from '../../lib/netinfo';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', warning: '#f59e0b',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

const FORMS = [
    { id: 3, name: 'Form 3' },
    { id: 4, name: 'Form 4' },
];

export default function ExportScreen() {
    const navigation = useNavigation();
    const { isConnected } = useNetworkStatus();
    const [examTypes, setExamTypes] = useState<ExamType[]>([]);
    const [selectedFormId, setSelectedFormId] = useState(3);
    const [selectedExamTypeId, setSelectedExamTypeId] = useState(0);
    const [exportingNEMIS, setExportingNEMIS] = useState(false);
    const [exportingKCSE, setExportingKCSE] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 4000);
    };

    useEffect(() => {
        getExamTypes().then(types => {
            setExamTypes(types);
            if (types.length > 0) setSelectedExamTypeId(types[0].id);
        });
    }, []);

    const arrayToCSV = (rows: Record<string, any>[], headers: string[]): string => {
        const headerRow = headers.join(',');
        const dataRows = rows.map(row =>
            headers.map(h => {
                const val = row[h] ?? '';
                const str = String(val).replace(/"/g, '""');
                return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
            }).join(',')
        );
        return [headerRow, ...dataRows].join('\n');
    };

    const shareFile = async (content: string, filename: string) => {
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: `Share ${filename}` });
        } else {
            Alert.alert('Export', `File saved to: ${path}`);
        }
    };

    const handleNEMISExport = async () => {
        if (!isConnected) { showToast('Cannot export — no network connection.'); return; }
        setExportingNEMIS(true);
        try {
            const data = await exportNEMISData();
            if (data.length === 0) { showToast('No active students found.'); return; }
            const headers = ['admission_number', 'first_name', 'last_name', 'date_of_birth', 'gender', 'nemis_no', 'birth_cert_no', 'form_name', 'stream_name'];
            const csv = arrayToCSV(data as any[], headers);
            const date = new Date().toISOString().split('T')[0];
            await shareFile(csv, `NEMIS_Export_${date}.csv`);
            showToast(`✅ NEMIS export ready — ${data.length} students`);
        } catch (err: any) {
            showToast(`❌ Export failed: ${err.message}`);
        } finally {
            setExportingNEMIS(false);
        }
    };

    const handleKCSEExport = async () => {
        if (!isConnected) { showToast('Cannot export — no network connection.'); return; }
        if (!selectedExamTypeId) { showToast('Please select an exam type.'); return; }
        setExportingKCSE(true);
        try {
            const data = await exportKCSEMarks(selectedFormId, selectedExamTypeId);
            if (data.length === 0) {
                showToast('No marks found for the selected form and exam type.');
                return;
            }
            const headers = ['admission_number', 'student_name', 'subject_name', 'score', 'grade'];
            const csv = arrayToCSV(data as any[], headers);
            const formName = FORMS.find(f => f.id === selectedFormId)?.name.replace(' ', '') || 'Form';
            const examName = examTypes.find(e => e.id === selectedExamTypeId)?.exam_name.replace(/\s+/g, '_') || 'Exam';
            const date = new Date().toISOString().split('T')[0];
            await shareFile(csv, `KCSE_Marks_${formName}_${examName}_${date}.csv`);
            showToast(`✅ KCSE export ready — ${data.length} records`);
        } catch (err: any) {
            showToast(`❌ Export failed: ${err.message}`);
        } finally {
            setExportingKCSE(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <ScreenHeader
                title="📤 Data Export"
                onBack={() => navigation.goBack()}
                gradient={['#475569','#334155']}
            />

            {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineBannerText}>📡 Offline — exports require network connection</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* NEMIS Export */}
                <View style={styles.exportCard}>
                    <View style={styles.exportCardHeader}>
                        <View style={styles.exportIcon}>
                            <Text style={styles.exportIconText}>🏛️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.exportTitle}>NEMIS Student Export</Text>
                            <Text style={styles.exportDesc}>
                                Export all active students in NEMIS-compatible CSV format for government submission.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.exportColumns}>
                        <Text style={styles.exportColumnsLabel}>Columns:</Text>
                        <Text style={styles.exportColumnsText}>
                            Admission No, Name, DOB, Gender, NEMIS No, Birth Cert No, Form, Stream
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleNEMISExport}
                        disabled={exportingNEMIS || !isConnected}
                        style={styles.exportBtn}
                        accessibilityLabel="Export NEMIS CSV"
                    >
                        <LinearGradient
                            colors={isConnected ? ['#059669', '#047857'] : ['#94a3b8', '#64748b']}
                            style={styles.exportBtnGrad}
                        >
                            {exportingNEMIS ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.exportBtnText}>📥 Export NEMIS CSV</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* KCSE Marks Export */}
                <View style={styles.exportCard}>
                    <View style={styles.exportCardHeader}>
                        <View style={styles.exportIcon}>
                            <Text style={styles.exportIconText}>📊</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.exportTitle}>KCSE Marks Export</Text>
                            <Text style={styles.exportDesc}>
                                Export exam marks for Form 3/4 in KNEC-compatible CSV format.
                            </Text>
                        </View>
                    </View>

                    {/* Form Selector */}
                    <Text style={styles.selectorLabel}>Select Form:</Text>
                    <View style={styles.selectorRow}>
                        {FORMS.map(f => (
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => setSelectedFormId(f.id)}
                                style={[styles.selectorBtn, selectedFormId === f.id && styles.selectorBtnActive]}
                                accessibilityLabel={`Select ${f.name}`}
                            >
                                <Text style={[styles.selectorBtnText, selectedFormId === f.id && styles.selectorBtnTextActive]}>
                                    {f.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Exam Type Selector */}
                    <Text style={styles.selectorLabel}>Select Exam Type:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examTypeScroll}>
                        {examTypes.map(e => (
                            <TouchableOpacity
                                key={e.id}
                                onPress={() => setSelectedExamTypeId(e.id)}
                                style={[styles.examTypePill, selectedExamTypeId === e.id && styles.examTypePillActive]}
                                accessibilityLabel={`Select ${e.exam_name}`}
                            >
                                <Text style={[styles.examTypePillText, selectedExamTypeId === e.id && styles.examTypePillTextActive]}>
                                    {e.exam_name} ({e.year})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.exportColumns}>
                        <Text style={styles.exportColumnsLabel}>Columns:</Text>
                        <Text style={styles.exportColumnsText}>
                            Admission No, Student Name, Subject, Score, Grade
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleKCSEExport}
                        disabled={exportingKCSE || !isConnected || !selectedExamTypeId}
                        style={styles.exportBtn}
                        accessibilityLabel="Export KCSE marks CSV"
                    >
                        <LinearGradient
                            colors={isConnected && selectedExamTypeId ? ['#2563eb', '#1d4ed8'] : ['#94a3b8', '#64748b']}
                            style={styles.exportBtnGrad}
                        >
                            {exportingKCSE ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.exportBtnText}>📥 Export KCSE Marks CSV</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    toast: { backgroundColor: '#1e293b', marginHorizontal: 16, marginTop: 8, borderRadius: 16, padding: 12 },
    toastText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    offlineBanner: { backgroundColor: '#fef3c7', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f59e0b' },
    offlineBannerText: { fontSize: 12, color: '#92400e', fontWeight: '700' },
    exportCard: {
        backgroundColor: C.card, borderRadius: 20, padding: 16,
        marginBottom: 16, borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    },
    exportCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    exportIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#F8FAFF', alignItems: 'center', justifyContent: 'center' },
    exportIconText: { fontSize: 24 },
    exportTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 },
    exportDesc: { fontSize: 12, color: C.textSub, lineHeight: 18 },
    exportColumns: { backgroundColor: '#F8FAFF', borderRadius: 10, padding: 10, marginBottom: 12 },
    exportColumnsLabel: { fontSize: 10, fontWeight: '800', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    exportColumnsText: { fontSize: 11, color: C.textSub },
    exportBtn: { borderRadius: 18, overflow: 'hidden' },
    exportBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    exportBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
    selectorLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 },
    selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    selectorBtn: { flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: '#F8FAFF', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    selectorBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    selectorBtnText: { fontSize: 13, fontWeight: '800', color: C.textSub },
    selectorBtnTextActive: { color: '#fff' },
    examTypeScroll: { marginBottom: 12 },
    examTypePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFF', marginRight: 8, borderWidth: 1, borderColor: C.border },
    examTypePillActive: { backgroundColor: C.primary, borderColor: C.primary },
    examTypePillText: { fontSize: 11, fontWeight: '700', color: C.textSub },
    examTypePillTextActive: { color: '#fff' },
});
