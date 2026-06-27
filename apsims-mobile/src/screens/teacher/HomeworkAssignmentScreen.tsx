import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '../../context/SessionContext';
import {
    getTeacherSubjectCards, createHomework, getTeacherHomework,
    getCurrentTerm, HomeworkInput, formatDate,
} from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

export default function HomeworkAssignmentScreen() {
    const navigation = useNavigation();
    const { session } = useSession();
    const [subjects, setSubjects] = useState<{ subject_id: number; subject_name: string; form_id: number; form_name: string }[]>([]);
    const [recentHw, setRecentHw] = useState<any[]>([]);
    const [termId, setTermId] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    // Form state
    const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});

    const teacherId = session?.linked_teacher_id || 0;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [cards, term, hw] = await Promise.all([
                getTeacherSubjectCards(teacherId),
                getCurrentTerm(),
                getTeacherHomework(teacherId),
            ]);
            // Deduplicate by subject+form
            const seen = new Set<string>();
            const unique = cards.filter(c => {
                const key = `${c.subject_id}-${c.form_id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setSubjects(unique.map(c => ({ subject_id: c.subject_id, subject_name: c.subject_name, form_id: c.form_id, form_name: c.form_name })));
            if (term) setTermId(term.id);
            setRecentHw(hw);
        } catch (err: any) {
            console.error('HomeworkAssignmentScreen error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [teacherId]);

    useEffect(() => { loadData(); }, [loadData]);

    const validate = () => {
        const errs: { title?: string; dueDate?: string } = {};
        if (!title.trim()) errs.title = 'Title is required';
        if (!dueDate.trim()) errs.dueDate = 'Due date is required';
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errs.dueDate = 'Use format YYYY-MM-DD';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleAssign = async () => {
        if (!validate()) return;
        if (subjects.length === 0) { showToast('⚠️ No subjects assigned'); return; }

        setSaving(true);
        try {
            const subject = subjects[selectedSubjectIdx];
            const data: HomeworkInput = {
                subject_id: subject.subject_id,
                form_id: subject.form_id,
                teacher_id: teacherId,
                title: title.trim(),
                description: description.trim() || undefined,
                due_date: dueDate,
                term_id: termId,
            };
            const result = await createHomework(data);
            if (result.success) {
                showToast(`✅ Homework assigned to ${subject.form_name}.`);
                setTitle(''); setDescription(''); setDueDate(''); setErrors({});
                const hw = await getTeacherHomework(teacherId);
                setRecentHw(hw);
            } else {
                showToast(`❌ Error: ${result.error}`);
            }
        } catch (err: any) {
            showToast(`❌ Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading…</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <ScreenHeader
                title="📝 Homework"
                onBack={() => navigation.goBack()}
                gradient={['#059669','#047857']}
            />

            {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Subject Selector */}
                    <Text style={styles.label}>📚 Subject & Class</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                        {subjects.map((s, i) => (
                            <TouchableOpacity
                                key={`${s.subject_id}-${s.form_id}`}
                                onPress={() => setSelectedSubjectIdx(i)}
                                style={[styles.subjectPill, selectedSubjectIdx === i && styles.subjectPillActive]}
                                accessibilityLabel={`Select ${s.subject_name} ${s.form_name}`}
                            >
                                <Text style={[styles.subjectPillText, selectedSubjectIdx === i && styles.subjectPillTextActive]}>
                                    {s.subject_name} • {s.form_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Title */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>📌 Title *</Text>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            value={title}
                            onChangeText={t => { setTitle(t); setErrors(e => ({ ...e, title: undefined })); }}
                            placeholder="e.g. Chapter 3 Questions"
                            placeholderTextColor={C.textDim}
                            accessibilityLabel="Homework title"
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Description */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>📄 Description (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Instructions or details…"
                            placeholderTextColor={C.textDim}
                            multiline
                            numberOfLines={3}
                            accessibilityLabel="Homework description"
                        />
                    </View>

                    {/* Due Date */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>📅 Due Date * (YYYY-MM-DD)</Text>
                        <TextInput
                            style={[styles.input, errors.dueDate && styles.inputError]}
                            value={dueDate}
                            onChangeText={t => { setDueDate(t); setErrors(e => ({ ...e, dueDate: undefined })); }}
                            placeholder="2026-03-15"
                            placeholderTextColor={C.textDim}
                            keyboardType="numeric"
                            maxLength={10}
                            accessibilityLabel="Due date input"
                        />
                        {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate}</Text>}
                    </View>

                    {/* Assign Button */}
                    <TouchableOpacity onPress={handleAssign} disabled={saving} accessibilityLabel="Assign homework">
                        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.assignBtn}>
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.assignBtnText}>✅ Assign Homework</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Recent Homework */}
                    {recentHw.length > 0 && (
                        <View style={styles.recentSection}>
                            <Text style={styles.recentTitle}>📋 Recently Assigned</Text>
                            {recentHw.map((h: any) => (
                                <View key={h.id} style={styles.recentItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recentItemTitle}>{h.title}</Text>
                                        <Text style={styles.recentItemMeta}>
                                            {h.school_subjects?.subject_name} • {h.school_forms?.form_name}
                                        </Text>
                                    </View>
                                    <Text style={styles.recentItemDue}>
                                        📅 {h.due_date ? formatDate(h.due_date) : 'No date'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: C.textSub, fontSize: 14, fontWeight: '500' },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    toast: { backgroundColor: '#1e293b', marginHorizontal: 16, marginTop: 8, borderRadius: 16, padding: 12 },
    toastText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
    subjectScroll: { marginBottom: 16 },
    subjectPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFF', marginRight: 8, borderWidth: 1, borderColor: C.border },
    subjectPillActive: { backgroundColor: C.primary, borderColor: C.primary },
    subjectPillText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    subjectPillTextActive: { color: '#fff' },
    fieldGroup: { marginBottom: 16 },
    input: { backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: C.text },
    inputError: { borderColor: C.danger },
    textArea: { height: 80, textAlignVertical: 'top' },
    errorText: { fontSize: 11, color: C.danger, fontWeight: '600', marginTop: 4 },
    assignBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
    assignBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
    recentSection: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    recentTitle: { fontSize: 13, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    recentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    recentItemTitle: { fontSize: 12, fontWeight: '700', color: C.text },
    recentItemMeta: { fontSize: 10, color: C.textSub, marginTop: 2 },
    recentItemDue: { fontSize: 10, color: C.textDim, fontWeight: '600' },
});
