import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { publishAnnouncement, getPortalNotifications, AnnouncementInput, formatDate } from '../../lib/supabase';

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};

type Audience = 'all' | 'parents' | 'students' | 'teachers';

export default function AnnouncementScreen() {
    const { session } = useSession();
    const navigation = useNavigation();

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState<Audience>('all');
    const [publishing, setPublishing] = useState(false);
    const [toast, setToast] = useState('');
    const [errors, setErrors] = useState<{ title?: string; message?: string }>({});
    const [recent, setRecent] = useState<any[]>([]);

    const portalUserId = session?.portal_user_id || 0;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 4000);
    };

    const loadRecent = useCallback(async () => {
        const all = await getPortalNotifications(portalUserId);
        setRecent(all.filter(n => n.type === 'announcement').slice(0, 10));
    }, [portalUserId]);

    useEffect(() => { loadRecent(); }, [loadRecent]);

    const validate = () => {
        const errs: { title?: string; message?: string } = {};
        if (!title.trim()) errs.title = 'Title is required';
        else if (title.length > 100) errs.title = 'Max 100 characters';
        if (!message.trim()) errs.message = 'Message is required';
        else if (message.length > 500) errs.message = 'Max 500 characters';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handlePublish = async () => {
        if (!validate()) return;
        setPublishing(true);
        try {
            const data: AnnouncementInput = {
                title: title.trim(),
                message: message.trim(),
                audience,
                published_by_portal_user_id: portalUserId,
            };
            const result = await publishAnnouncement(data);
            if (result.success) {
                showToast(`📢 Announcement published to ${result.count} users.`);
                setTitle(''); setMessage(''); setErrors({});
                await loadRecent();
            } else {
                showToast(`❌ Error: ${result.error}`);
            }
        } catch (err: any) {
            showToast(`❌ Error: ${err.message}`);
        } finally {
            setPublishing(false);
        }
    };

    const AUDIENCE_OPTIONS: { key: Audience; label: string; emoji: string }[] = [
        { key: 'all', label: 'All', emoji: '👥' },
        { key: 'parents', label: 'Parents', emoji: '👨‍👩‍👧' },
        { key: 'students', label: 'Students', emoji: '🎓' },
        { key: 'teachers', label: 'Teachers', emoji: '👩‍🏫' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>📢 Announcements</Text>
                    <Text style={styles.headerSub}>Broadcast to parents and students</Text>
                </SafeAreaView>
            </LinearGradient>

            {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Audience */}
                    <Text style={styles.label}>👥 Audience</Text>
                    <View style={styles.audienceRow}>
                        {AUDIENCE_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                onPress={() => setAudience(opt.key)}
                                style={[styles.audienceBtn, audience === opt.key && styles.audienceBtnActive]}
                                accessibilityLabel={`Select audience: ${opt.label}`}
                            >
                                <Text style={styles.audienceEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.audienceBtnText, audience === opt.key && styles.audienceBtnTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Title */}
                    <View style={styles.fieldGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>📌 Title *</Text>
                            <Text style={[styles.charCount, title.length > 90 && { color: C.danger }]}>
                                {title.length}/100
                            </Text>
                        </View>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            value={title}
                            onChangeText={t => { setTitle(t); setErrors(e => ({ ...e, title: undefined })); }}
                            placeholder="e.g. School Closure Notice"
                            placeholderTextColor={C.textDim}
                            maxLength={100}
                            accessibilityLabel="Announcement title"
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Message */}
                    <View style={styles.fieldGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>📄 Message *</Text>
                            <Text style={[styles.charCount, message.length > 450 && { color: C.danger }]}>
                                {message.length}/500
                            </Text>
                        </View>
                        <TextInput
                            style={[styles.input, styles.textArea, errors.message && styles.inputError]}
                            value={message}
                            onChangeText={t => { setMessage(t); setErrors(e => ({ ...e, message: undefined })); }}
                            placeholder="Write your announcement here…"
                            placeholderTextColor={C.textDim}
                            multiline
                            numberOfLines={5}
                            maxLength={500}
                            accessibilityLabel="Announcement message"
                        />
                        {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
                    </View>

                    {/* Publish Button */}
                    <TouchableOpacity onPress={handlePublish} disabled={publishing} accessibilityLabel="Publish announcement">
                        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.publishBtn}>
                            {publishing ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.publishBtnText}>📢 Publish Announcement</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Recent */}
                    {recent.length > 0 && (
                        <View style={styles.recentSection}>
                            <Text style={styles.recentTitle}>📋 Recent Announcements</Text>
                            {recent.map((n: any) => (
                                <View key={n.id} style={styles.recentItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recentItemTitle}>{n.title}</Text>
                                        <Text style={styles.recentItemMsg} numberOfLines={1}>{n.message}</Text>
                                    </View>
                                    <Text style={styles.recentItemTime}>{formatDate(n.created_at)}</Text>
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
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    toast: { backgroundColor: '#1e293b', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12 },
    toastText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    charCount: { fontSize: 11, color: C.textDim, fontWeight: '600' },
    audienceRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    audienceBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 2 },
    audienceBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    audienceEmoji: { fontSize: 18 },
    audienceBtnText: { fontSize: 11, fontWeight: '800', color: C.textSub },
    audienceBtnTextActive: { color: '#fff' },
    fieldGroup: { marginBottom: 16 },
    input: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: C.text },
    inputError: { borderColor: C.danger },
    textArea: { height: 120, textAlignVertical: 'top' },
    errorText: { fontSize: 11, color: C.danger, fontWeight: '600', marginTop: 4 },
    publishBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
    publishBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
    recentSection: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    recentTitle: { fontSize: 13, fontWeight: '800', color: C.text, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    recentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    recentItemTitle: { fontSize: 12, fontWeight: '700', color: C.text },
    recentItemMsg: { fontSize: 11, color: C.textSub, marginTop: 2 },
    recentItemTime: { fontSize: 10, color: C.textDim, fontWeight: '600' },
});
