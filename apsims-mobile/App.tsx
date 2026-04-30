import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { UserSession } from './src/lib/supabase';
import { getSession, clearSession } from './src/lib/security';
import LoginScreen from './src/screens/LoginScreen';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import MarksEntryScreen from './src/screens/teacher/MarksEntryScreen';
import TimetableScreen from './src/screens/teacher/TimetableScreen';
import ParentDashboard from './src/screens/parent/ParentDashboard';
import PayFeesScreen from './src/screens/parent/PayFeesScreen';
import StudentDashboard from './src/screens/student/StudentDashboard';

// ============================================================
// ULTRA APSIMS — Root Application
// ============================================================

type AppScreen =
    | 'loading'
    | 'login'
    | 'teacher_dashboard'
    | 'teacher_marks'
    | 'teacher_timetable'
    | 'parent_dashboard'
    | 'parent_pay'
    | 'student_dashboard';

interface MarksParams {
    subject_id: number;
    subject_name: string;
    form_id: number;
    form_name: string;
    stream_id: number;
    stream_name: string;
}

export default function App() {
    const [screen, setScreen] = useState<AppScreen>('loading');
    const [session, setSession] = useState<UserSession | null>(null);
    const [marksParams, setMarksParams] = useState<MarksParams | null>(null);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const saved = await getSession();
        if (saved) {
            setSession(saved);
            navigateToRole(saved);
        } else {
            setScreen('login');
        }
    };

    const navigateToRole = (s: UserSession) => {
        switch (s.user_type) {
            case 'teacher':
                setScreen('teacher_dashboard');
                break;
            case 'parent':
                setScreen('parent_dashboard');
                break;
            case 'student':
                setScreen('student_dashboard');
                break;
            default:
                setScreen('login');
        }
    };

    const handleLogin = (s: UserSession) => {
        setSession(s);
        navigateToRole(s);
    };

    const handleLogout = async () => {
        await clearSession();
        setSession(null);
        setScreen('login');
    };

    const handleOpenMarks = (params: MarksParams) => {
        setMarksParams(params);
        setScreen('teacher_marks');
    };

    // ── Loading ──
    if (screen === 'loading') {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingCard}>
                    <Text style={styles.loadingEmoji}>🏫</Text>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading APSIMS…</Text>
                </View>
            </View>
        );
    }

    // ── Login ──
    if (screen === 'login') {
        return <LoginScreen onLoginSuccess={handleLogin} />;
    }

    if (!session) {
        setScreen('login');
        return null;
    }

    // ── Teacher Screens ──
    if (screen === 'teacher_dashboard') {
        return (
            <TeacherDashboard
                session={session}
                onLogout={handleLogout}
                onOpenMarks={handleOpenMarks}
                onOpenTimetable={() => setScreen('teacher_timetable')}
            />
        );
    }

    if (screen === 'teacher_marks' && marksParams) {
        return (
            <MarksEntryScreen
                session={session}
                params={marksParams}
                onBack={() => setScreen('teacher_dashboard')}
            />
        );
    }

    if (screen === 'teacher_timetable') {
        return (
            <TimetableScreen
                session={session}
                onBack={() => setScreen('teacher_dashboard')}
            />
        );
    }

    // ── Parent Screens ──
    if (screen === 'parent_dashboard') {
        return (
            <ParentDashboard
                session={session}
                onLogout={handleLogout}
                onPayFees={() => setScreen('parent_pay')}
            />
        );
    }

    if (screen === 'parent_pay') {
        return (
            <PayFeesScreen
                session={session}
                onBack={() => setScreen('parent_dashboard')}
                onPaymentComplete={() => setScreen('parent_dashboard')}
            />
        );
    }

    // ── Student Screen ──
    if (screen === 'student_dashboard') {
        return (
            <StudentDashboard
                session={session}
                onLogout={handleLogout}
            />
        );
    }

    return null;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingCard: {
        alignItems: 'center',
        gap: 16,
    },
    loadingEmoji: { fontSize: 48 },
    loadingText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },
});
