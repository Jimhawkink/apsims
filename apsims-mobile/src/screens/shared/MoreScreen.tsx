import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useSession } from '../../context/SessionContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    primary: '#2563eb', accent: '#059669', purple: '#7c3aed', teal: '#0d9488',
    text: '#0f172a', textSub: '#64748b',
};

interface MenuItem {
    emoji: string;
    title: string;
    subtitle: string;
    color: string;
    onPress: () => void;
}

export default function MoreScreen() {
    const { session } = useSession();
    const navigation = useNavigation<NavProp>();

    const userType = session?.user_type;
    const studentId = session?.linked_student_id || 0;
    const formId = session?.student_form_id || 0;
    const formLevel = 0; // Will be determined from form data

    const teacherItems: MenuItem[] = [
        {
            emoji: '📤',
            title: 'Data Exports',
            subtitle: 'NEMIS CSV & KCSE marks export',
            color: C.primary,
            onPress: () => navigation.navigate('Export'),
        },
        {
            emoji: '📢',
            title: 'Announcements',
            subtitle: 'Broadcast to parents and students',
            color: C.accent,
            onPress: () => navigation.navigate('Announcement'),
        },
        {
            emoji: '🗓️',
            title: 'My Timetable',
            subtitle: 'View your weekly teaching schedule',
            color: C.teal,
            onPress: () => {}, // Timetable is in teacher screens
        },
    ];

    const parentItems: MenuItem[] = [
        {
            emoji: '🏥',
            title: 'Health Records',
            subtitle: "View your child's health information",
            color: C.accent,
            onPress: () => navigation.navigate('HealthRecord'),
        },
        {
            emoji: '🚪',
            title: 'Leave Outs',
            subtitle: "Track your child's leave-out records",
            color: C.purple,
            onPress: () => navigation.navigate('LeaveOut'),
        },
        {
            emoji: '📄',
            title: 'Report Card',
            subtitle: "View your child's academic report",
            color: C.primary,
            onPress: () => navigation.navigate('ReportCard', {
                studentId,
                formId,
                formLevel,
                isParent: true,
            }),
        },
    ];

    const studentItems: MenuItem[] = [
        {
            emoji: '💰',
            title: 'Fee Balance',
            subtitle: 'View your fee balance and payments',
            color: C.accent,
            onPress: () => navigation.navigate('FeeBalance'),
        },
        {
            emoji: '📄',
            title: 'Report Card',
            subtitle: 'View your academic report card',
            color: C.primary,
            onPress: () => navigation.navigate('ReportCard', {
                studentId,
                formId,
                formLevel,
                isParent: false,
            }),
        },
        {
            emoji: '🎓',
            title: 'CBC Levels',
            subtitle: 'View your CBC competency levels',
            color: C.teal,
            onPress: () => navigation.navigate('CBCAssessment', { studentId }),
        },
    ];

    const items = userType === 'teacher' ? teacherItems
        : userType === 'parent' ? parentItems
        : studentItems;

    const gradientColors: [string, string] = userType === 'teacher'
        ? ['#2563eb', '#1d4ed8']
        : userType === 'parent'
        ? ['#7c3aed', '#6d28d9']
        : ['#0d9488', '#059669'];

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={gradientColors} style={styles.header}>
                <SafeAreaView>
                    <Text style={styles.headerTitle}>⋯ More</Text>
                    <Text style={styles.headerSub}>Additional features and tools</Text>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {items.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        onPress={item.onPress}
                        style={styles.menuItem}
                        activeOpacity={0.8}
                        accessibilityLabel={item.title}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                            <Text style={styles.menuIconText}>{item.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                        </View>
                        <Text style={[styles.menuArrow, { color: item.color }]}>→</Text>
                    </TouchableOpacity>
                ))}

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appInfoTitle}>💎 Ultra APSIMS</Text>
                    <Text style={styles.appInfoSub}>Powered by Hawkinsoft Solutions</Text>
                    <Text style={styles.appInfoVersion}>Version 1.5.0 • {new Date().getFullYear()}</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.card, borderRadius: 16, padding: 16,
        marginBottom: 10, borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    menuIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    menuIconText: { fontSize: 24 },
    menuTitle: { fontSize: 15, fontWeight: '800', color: C.text },
    menuSubtitle: { fontSize: 12, color: C.textSub, marginTop: 2 },
    menuArrow: { fontSize: 20, fontWeight: '700' },
    appInfo: { alignItems: 'center', marginTop: 24, gap: 4 },
    appInfoTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    appInfoSub: { fontSize: 11, color: C.textSub },
    appInfoVersion: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
});
