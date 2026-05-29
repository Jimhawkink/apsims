// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra — More Screen (Full Feature Grid per Role)
// Premium card grid with all extra features per user type
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, SafeAreaView, Linking, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';
import { clearSession } from '../../lib/security';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', purple: '#7c3aed',
    teal: '#0d9488', orange: '#f97316', red: '#ef4444',
    text: '#0f172a', textSub: '#64748b',
};

interface MenuItem {
    emoji: string;
    title: string;
    subtitle: string;
    gradient: [string, string];
    onPress: () => void;
    badge?: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

export default function MoreScreen() {
    const { session, setSession } = useSession();
    const navigation = useNavigation<NavProp>();

    const userType = session?.user_type;
    const studentId = session?.linked_student_id || 0;
    const formId = session?.student_form_id || 0;
    const streamId = session?.student_stream_id || 0;
    const portalUserId = session?.portal_user_id || 0;

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => { setSession(null); clearSession(); } },
        ]);
    };

    // ── TEACHER SECTIONS ────────────────────────────────────────
    const teacherSections: MenuSection[] = [
        {
            title: '📝 8-4-4 System',
            items: [
                {
                    emoji: '📝', title: '8-4-4 Marks Hub',
                    subtitle: 'Full marks entry, grade analysis & rankings',
                    gradient: ['#1d4ed8', '#2563eb'],
                    onPress: () => navigation.navigate('MarksHub'),
                    badge: 'FULL',
                },
                {
                    emoji: '📊', title: 'Class Performance',
                    subtitle: 'Subject scores & mean analysis',
                    gradient: ['#0284c7', '#0369a1'],
                    onPress: () => navigation.navigate('MarksHub'),
                },
            ],
        },
        {
            title: '🎓 CBC System',
            items: [
                {
                    emoji: '🎓', title: 'CBC Teacher Hub',
                    subtitle: 'Competency matrix, rubric guide & flags',
                    gradient: ['#6d28d9', '#7c3aed'],
                    onPress: () => navigation.navigate('CBCTeacherHub'),
                    badge: 'ULTRA',
                },
                {
                    emoji: '⚡', title: 'Remedial Cases',
                    subtitle: 'Students flagged for intervention',
                    gradient: ['#f59e0b', '#d97706'],
                    onPress: () => navigation.navigate('Remedials'),
                },
            ],
        },
        {
            title: '📋 Tools',
            items: [
                {
                    emoji: '🗓️', title: 'My Timetable',
                    subtitle: 'View your weekly teaching schedule',
                    gradient: ['#0d9488', '#059669'],
                    onPress: () => navigation.navigate('TeacherTimetable'),
                },
                {
                    emoji: '📤', title: 'Data Exports',
                    subtitle: 'NEMIS CSV & KCSE marks export',
                    gradient: ['#475569', '#334155'],
                    onPress: () => navigation.navigate('Export'),
                },
            ],
        },
        {
            title: '📢 Communication',
            items: [
                {
                    emoji: '📢', title: 'Announcements',
                    subtitle: 'Broadcast messages to parents & students',
                    gradient: ['#7c3aed', '#6d28d9'],
                    onPress: () => navigation.navigate('Announcement'),
                },
                {
                    emoji: '🔔', title: 'Notifications',
                    subtitle: 'View all your notifications',
                    gradient: ['#ec4899', '#db2777'],
                    onPress: () => navigation.navigate('Notifications', { portalUserId }),
                },
            ],
        },
    ];

    // ── PARENT SECTIONS ─────────────────────────────────────────
    const parentSections: MenuSection[] = [
        {
            title: '👶 Child Info',
            items: [
                {
                    emoji: '📄', title: 'Report Card',
                    subtitle: "View your child's academic report",
                    gradient: ['#2563eb', '#1d4ed8'],
                    onPress: () => navigation.navigate('ReportCard', { studentId, formId, formLevel: 0, isParent: true }),
                },
                {
                    emoji: '🗓️', title: "Child's Timetable",
                    subtitle: 'See the weekly class schedule',
                    gradient: ['#7c3aed', '#6d28d9'],
                    onPress: () => navigation.navigate('ChildTimetable', { studentId, formId, streamId }),
                },
                {
                    emoji: '🏥', title: 'Health Records',
                    subtitle: "View your child's health information",
                    gradient: ['#059669', '#047857'],
                    onPress: () => navigation.navigate('HealthRecord'),
                },
                {
                    emoji: '🚪', title: 'Leave Outs',
                    subtitle: "Track your child's leave-out records",
                    gradient: ['#f97316', '#ea580c'],
                    onPress: () => navigation.navigate('LeaveOut'),
                },
            ],
        },
        {
            title: '💰 Fees',
            items: [
                {
                    emoji: '💳', title: 'Fee Balance',
                    subtitle: 'View outstanding balance & history',
                    gradient: ['#0d9488', '#0f766e'],
                    onPress: () => navigation.navigate('FeeBalance'),
                },
            ],
        },
        {
            title: '📢 School',
            items: [
                {
                    emoji: '🔔', title: 'Notifications',
                    subtitle: 'View all your alerts',
                    gradient: ['#ec4899', '#db2777'],
                    onPress: () => navigation.navigate('Notifications', { portalUserId }),
                },
            ],
        },
    ];

    // ── STUDENT SECTIONS ────────────────────────────────────────
    const studentSections: MenuSection[] = [
        {
            title: '📊 Academics',
            items: [
                {
                    emoji: '📄', title: 'Report Card',
                    subtitle: 'View your academic report card',
                    gradient: ['#2563eb', '#1d4ed8'],
                    onPress: () => navigation.navigate('ReportCard', { studentId, formId, formLevel: 0, isParent: false }),
                },
                {
                    emoji: '🎓', title: 'CBC Levels',
                    subtitle: 'View your competency assessments',
                    gradient: ['#7c3aed', '#6d28d9'],
                    onPress: () => navigation.navigate('CBCAssessment', { studentId }),
                },
            ],
        },
        {
            title: '📢 School',
            items: [
                {
                    emoji: '🔔', title: 'Notifications',
                    subtitle: 'View all your alerts',
                    gradient: ['#ec4899', '#db2777'],
                    onPress: () => navigation.navigate('Notifications', { portalUserId }),
                },
                {
                    emoji: '📢', title: 'School Circulars',
                    subtitle: 'News and notices from school',
                    gradient: ['#f59e0b', '#d97706'],
                    onPress: () => navigation.navigate('Circular'),
                },
            ],
        },
    ];

    // ── PRINCIPAL SECTIONS ──────────────────────────────────────
    const principalSections: MenuSection[] = [
        {
            title: '🏫 School Management',
            items: [
                {
                    emoji: '👨‍🎓', title: 'Student Directory',
                    subtitle: 'Search & manage all students',
                    gradient: ['#7c3aed', '#6d28d9'],
                    onPress: () => navigation.navigate('PrincipalStudents'),
                },
                {
                    emoji: '👩‍🏫', title: 'Staff Directory',
                    subtitle: 'Teachers, TSC numbers & roles',
                    gradient: ['#0d9488', '#059669'],
                    onPress: () => navigation.navigate('PrincipalStaff'),
                },
                {
                    emoji: '📋', title: 'Attendance Overview',
                    subtitle: 'School-wide attendance trends',
                    gradient: ['#2563eb', '#1d4ed8'],
                    onPress: () => navigation.navigate('PrincipalAttendance'),
                },
                {
                    emoji: '🚨', title: 'Discipline Records',
                    subtitle: 'Incidents, severity & resolutions',
                    gradient: ['#ef4444', '#dc2626'],
                    onPress: () => navigation.navigate('PrincipalDiscipline'),
                },
            ],
        },
        {
            title: '📦 Inventory & Library',
            items: [
                {
                    emoji: '📦', title: 'Stores & Assets',
                    subtitle: 'Inventory and stock levels',
                    gradient: ['#f59e0b', '#d97706'],
                    onPress: () => navigation.navigate('StoresReport'),
                },
                {
                    emoji: '📖', title: 'Library Reports',
                    subtitle: 'Books, loans and overdue',
                    gradient: ['#ec4899', '#db2777'],
                    onPress: () => navigation.navigate('LibraryReport'),
                },
            ],
        },
        {
            title: '📢 Communication',
            items: [
                {
                    emoji: '📢', title: 'Announcements',
                    subtitle: 'Broadcast to parents & students',
                    gradient: ['#6366f1', '#4f46e5'],
                    onPress: () => navigation.navigate('Announcement'),
                },
                {
                    emoji: '🔔', title: 'Notifications',
                    subtitle: 'View all school notifications',
                    gradient: ['#ec4899', '#db2777'],
                    onPress: () => navigation.navigate('Notifications', { portalUserId }),
                },
            ],
        },
    ];

    const sections =
        userType === 'teacher' ? teacherSections
        : userType === 'parent' ? parentSections
        : userType === 'principal' ? principalSections
        : studentSections;

    const headerGradient: [string, string] =
        userType === 'teacher' ? ['#2563eb', '#1d4ed8']
        : userType === 'parent' ? ['#7c3aed', '#6d28d9']
        : userType === 'principal' ? ['#4f46e5', '#7c3aed']
        : ['#0d9488', '#059669'];

    const userEmoji =
        userType === 'teacher' ? '👩‍🏫'
        : userType === 'parent' ? '👨‍👩‍👧'
        : userType === 'principal' ? '🏫'
        : '🎓';

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={headerGradient} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerContent}>
                        <View style={s.avatarWrap}>
                            <Text style={s.avatarEmoji}>{userEmoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerName}>{session?.full_name || 'User'}</Text>
                            <Text style={s.headerRole}>
                                {userType === 'teacher' ? '👩‍🏫 Teacher'
                                : userType === 'parent' ? '👨‍👩‍👧 Parent'
                                : userType === 'principal' ? '🏫 Principal'
                                : '🎓 Student'}
                                {session?.teacher_tsc ? ` · TSC: ${session.teacher_tsc}` : ''}
                                {session?.student_admission ? ` · Adm: ${session.student_admission}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
                            <Text style={{ fontSize: 20 }}>🚪</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.content}
            >
                {sections.map((section, si) => (
                    <View key={si} style={s.section}>
                        <Text style={s.sectionTitle}>{section.title}</Text>
                        <View style={s.grid}>
                            {section.items.map((item, ii) => (
                                <TouchableOpacity
                                    key={ii}
                                    style={s.gridCard}
                                    onPress={item.onPress}
                                    activeOpacity={0.8}
                                    accessibilityLabel={item.title}
                                >
                                    <LinearGradient
                                        colors={item.gradient}
                                        style={s.gridCardGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <View style={s.decor} />
                                        <Text style={s.gridEmoji}>{item.emoji}</Text>
                                        <Text style={s.gridTitle}>{item.title}</Text>
                                        <Text style={s.gridSub} numberOfLines={2}>{item.subtitle}</Text>
                                        {item.badge && (
                                            <View style={s.badge}>
                                                <Text style={s.badgeText}>{item.badge}</Text>
                                            </View>
                                        )}
                                        <Text style={s.arrow}>→</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Support & App Info */}
                <View style={s.appInfo}>
                    <View style={s.appInfoCard}>
                        <Text style={s.appInfoTitle}>💎 Ultra APSIMS</Text>
                        <Text style={s.appInfoSub}>Kenya's #1 School Management System</Text>
                        <Text style={s.appInfoVersion}>v1.8.0 · Powered by Hawkinsoft Solutions</Text>
                        <View style={s.supportRow}>
                            <TouchableOpacity
                                style={s.supportBtn}
                                onPress={() => Linking.openURL('tel:+254700000000')}
                            >
                                <Text style={s.supportBtnText}>📞 Support</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.supportBtn, { backgroundColor: '#fee2e2' }]}
                                onPress={handleLogout}
                            >
                                <Text style={[s.supportBtnText, { color: '#ef4444' }]}>🚪 Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 44, paddingBottom: 20, paddingHorizontal: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrap: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarEmoji: { fontSize: 24 },
    headerName: { fontSize: 17, fontWeight: '900', color: '#fff' },
    headerRole: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },
    logoutBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    content: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: C.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridCard: {
        width: '47%', borderRadius: 18, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
    },
    gridCardGradient: { padding: 16, minHeight: 110, justifyContent: 'flex-end', position: 'relative' },
    decor: {
        position: 'absolute', top: -15, right: -15,
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    gridEmoji: { fontSize: 26, marginBottom: 6 },
    gridTitle: { fontSize: 13, fontWeight: '900', color: '#fff', marginBottom: 3 },
    gridSub: { fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 13 },
    arrow: { position: 'absolute', top: 14, right: 14, fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
    badge: {
        position: 'absolute', top: 10, left: 10,
        backgroundColor: '#ef4444', borderRadius: 8,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    badgeText: { fontSize: 8, color: '#fff', fontWeight: '900' },
    appInfo: { marginTop: 8 },
    appInfoCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: C.border, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
    },
    appInfoTitle: { fontSize: 16, fontWeight: '900', color: C.text },
    appInfoSub: { fontSize: 12, color: C.textSub, marginTop: 4, textAlign: 'center' },
    appInfoVersion: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
    supportRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    supportBtn: {
        flex: 1, backgroundColor: '#dbeafe', borderRadius: 12,
        paddingVertical: 10, alignItems: 'center',
    },
    supportBtnText: { fontSize: 12, fontWeight: '800', color: C.primary },
});
