import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { UserSession } from './src/lib/supabase';
import { getSession, clearSession } from './src/lib/security';
import { onConnectivityChange } from './src/lib/netinfo';
import { syncOfflineQueue } from './src/lib/offline';
import { SessionContext } from './src/context/SessionContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { registerForPushNotifications, setupNotificationListeners, clearBadge } from './src/services/PushNotificationService';
import { RootStackParamList } from './src/navigation/types';

// ── Tab Navigators ───────────────────────────────────────────
import TeacherTabNavigator from './src/navigation/TeacherTabNavigator';
import ParentTabNavigator from './src/navigation/ParentTabNavigator';
import StudentTabNavigator from './src/navigation/StudentTabNavigator';
import PrincipalTabNavigator from './src/navigation/PrincipalTabNavigator';
import BursarTabNavigator from './src/navigation/BursarTabNavigator';

// ── Auth ─────────────────────────────────────────────────────
import LoginScreen from './src/screens/LoginScreen';

// ── Shared ───────────────────────────────────────────────────
import NotificationScreen from './src/screens/shared/NotificationScreen';
import ReportCardScreen from './src/screens/shared/ReportCardScreen';
import ExportScreen from './src/screens/shared/ExportScreen';
import AnnouncementScreen from './src/screens/shared/AnnouncementScreen';

// ── Teacher ──────────────────────────────────────────────────
import StudentProfileScreen from './src/screens/teacher/StudentProfileScreen';
import ClassPerformanceScreen from './src/screens/teacher/ClassPerformanceScreen';
import CBCMarksEntryScreen from './src/screens/teacher/CBCMarksEntryScreen';
import MarksEntryScreen from './src/screens/teacher/MarksEntryScreen';
import TimetableScreen from './src/screens/teacher/TimetableScreen';
import CBCProgressScreen from './src/screens/teacher/CBCProgressScreen';
import RemedialsScreen from './src/screens/teacher/RemedialsScreen';
import CBCTeacherHubScreen from './src/screens/teacher/CBCTeacherHubScreen';
import MarksHubScreen from './src/screens/teacher/MarksHubScreen';

// ── Student ──────────────────────────────────────────────────
import CBCAssessmentScreen from './src/screens/student/CBCAssessmentScreen';
import FeeBalanceScreen from './src/screens/student/FeeBalanceScreen';
import ResultsScreen from './src/screens/student/ResultsScreen';

// ── Parent ───────────────────────────────────────────────────
import PayFeesScreen from './src/screens/parent/PayFeesScreen';
import HealthRecordScreen from './src/screens/parent/HealthRecordScreen';
import LeaveOutScreen from './src/screens/parent/LeaveOutScreen';
import CircularScreen from './src/screens/parent/CircularScreen';
import ChildTimetableScreen from './src/screens/parent/ChildTimetableScreen';
import ParentAttendanceScreen from './src/screens/parent/AttendanceScreen';
import ParentHomeworkScreen from './src/screens/parent/HomeworkScreen';

// ── Principal ────────────────────────────────────────────────
import PrincipalStudentsScreen from './src/screens/principal/PrincipalStudentsScreen';
import PrincipalStaffScreen from './src/screens/principal/PrincipalStaffScreen';
import PrincipalDisciplineScreen from './src/screens/principal/PrincipalDisciplineScreen';
import PrincipalAttendanceScreen from './src/screens/principal/PrincipalAttendanceScreen';
import StoresReportScreen from './src/screens/principal/StoresReportScreen';
import LibraryReportScreen from './src/screens/principal/LibraryReportScreen';
import AcademicReportScreen from './src/screens/principal/AcademicReportScreen';
import FinanceReportScreen from './src/screens/principal/FinanceReportScreen';

enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Animated Splash ───────────────────────────────────────────
function SplashScreen() {
    const scale = React.useRef(new Animated.Value(0.8)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
            Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <LinearGradient colors={['#1e1b4b', '#4f46e5', '#7c3aed', '#0d9488']} style={styles.splashContainer}>
            {/* Decorative circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <Animated.View style={[styles.splashCard, { transform: [{ scale }], opacity }]}>
                <View style={styles.splashLogoWrap}>
                    <Text style={styles.splashEmoji}>🏫</Text>
                </View>
                <Text style={styles.splashTitle}>APSIMS</Text>
                <Text style={styles.splashSubtitle}>Ultra School Management</Text>
                <View style={styles.splashDivider} />
                <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 4 }} />
                <Text style={styles.splashLoading}>Initializing…</Text>
            </Animated.View>

            <View style={styles.splashFooter}>
                <Text style={styles.splashBrand}>🇰🇪 Kenya's #1 School System</Text>
                <Text style={styles.splashVersion}>v1.8.0 · Hawkinsoft Solutions</Text>
            </View>
        </LinearGradient>
    );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
    const [session, setSession] = useState<UserSession | null>(null);
    const [loading, setLoading] = useState(true);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        getSession().then(saved => {
            setSession(saved);
            setLoading(false);
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 600, useNativeDriver: true,
            }).start();
        });

        const unsubscribe = onConnectivityChange((connected) => {
            if (connected) syncOfflineQueue().catch(console.error);
        });
        return unsubscribe;
    }, []);

    // ── Push Notifications: register token when session is available ──────────
    useEffect(() => {
        if (!session) return;
        // Register device for push notifications
        registerForPushNotifications(session.portal_user_id, session.user_type).catch(console.error);
        // Clear badge when app opens
        clearBadge().catch(() => {});
        // Setup notification listeners (navigate on tap)
        const cleanup = setupNotificationListeners(
            (notif) => { /* notification received while app open — could show in-app banner */ },
            (response) => {
                const data = response.notification.request.content.data as any;
                // Navigation based on notification type handled in each screen
                console.log('Push tapped:', data?.type);
            }
        );
        return cleanup;
    }, [session]);

    const handleSetSession = useCallback((s: UserSession | null) => {
        setSession(s);
        if (!s) clearSession();
    }, []);

    if (loading) return <SplashScreen />;

    return (
        <SafeAreaProvider>
            <ThemeProvider>
            <SessionContext.Provider value={{ session, setSession: handleSetSession }}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                    <NavigationContainer>
                        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>

                            {/* ── Auth ──────────────────────────────────── */}
                            {!session ? (
                                <Stack.Screen name="Login" component={LoginScreen} />
                            ) : session.user_type === 'principal' ? (
                                <Stack.Screen name="PrincipalTabs" component={PrincipalTabNavigator} />
                            ) : session.user_type === 'bursar' ? (
                                <Stack.Screen name="BursarTabs" component={BursarTabNavigator} />
                            ) : session.user_type === 'teacher' ? (
                                <Stack.Screen name="TeacherTabs" component={TeacherTabNavigator} />
                            ) : session.user_type === 'parent' ? (
                                <Stack.Screen name="ParentTabs" component={ParentTabNavigator} />
                            ) : (
                                <Stack.Screen name="StudentTabs" component={StudentTabNavigator} />
                            )}

                            {/* ── Shared ────────────────────────────────── */}
                            <Stack.Screen name="Notifications" component={NotificationScreen} />
                            <Stack.Screen name="ReportCard" component={ReportCardScreen} />
                            <Stack.Screen name="Export" component={ExportScreen} />
                            <Stack.Screen name="Announcement" component={AnnouncementScreen} />

                            {/* ── Teacher ───────────────────────────────── */}
                            <Stack.Screen name="CBCAssessment" component={CBCAssessmentScreen} />
                            <Stack.Screen name="StudentProfile" component={StudentProfileScreen}
                                options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                            <Stack.Screen name="ClassPerformance" component={ClassPerformanceScreen} />
                            <Stack.Screen name="CBCMarksEntry" component={CBCMarksEntryScreen} />
                            <Stack.Screen name="MarksEntry" component={MarksEntryScreen} />
                            <Stack.Screen name="TeacherTimetable" component={TimetableScreen} />
                            <Stack.Screen name="CBCProgress" component={CBCProgressScreen} />
                            <Stack.Screen name="Remedials" component={RemedialsScreen} />
                            <Stack.Screen name="CBCTeacherHub" component={CBCTeacherHubScreen} />
                            <Stack.Screen name="MarksHub" component={MarksHubScreen} />

                            {/* ── Student Results ─────────────────────── */}
                            <Stack.Screen name="StudentResults" component={ResultsScreen} options={{ headerShown: false }} />

                            {/* ── Parent ────────────────────────────────── */}
                            <Stack.Screen name="PayFees" component={PayFeesScreen} />
                            <Stack.Screen name="HealthRecord" component={HealthRecordScreen} />
                            <Stack.Screen name="LeaveOut" component={LeaveOutScreen} />
                            <Stack.Screen name="FeeBalance" component={FeeBalanceScreen} />
                            <Stack.Screen name="Circular" component={CircularScreen} />
                            <Stack.Screen name="ChildTimetable" component={ChildTimetableScreen} />
                            <Stack.Screen name="ParentAttendance" component={ParentAttendanceScreen} options={{ headerShown: false }} />
                            <Stack.Screen name="ParentHomework" component={ParentHomeworkScreen} options={{ headerShown: false }} />

                            {/* ── Principal ─────────────────────────────── */}
                            <Stack.Screen name="PrincipalStudents" component={PrincipalStudentsScreen} />
                            <Stack.Screen name="PrincipalStaff" component={PrincipalStaffScreen} />
                            <Stack.Screen name="PrincipalDiscipline" component={PrincipalDisciplineScreen} />
                            <Stack.Screen name="PrincipalAttendance" component={PrincipalAttendanceScreen} />
                            <Stack.Screen name="StoresReport" component={StoresReportScreen} />
                            <Stack.Screen name="LibraryReport" component={LibraryReportScreen} />
                            <Stack.Screen name="AcademicReport" component={AcademicReportScreen} />
                            <Stack.Screen name="FinanceReport" component={FinanceReportScreen} />

                        </Stack.Navigator>
                    </NavigationContainer>
                </Animated.View>
            </SessionContext.Provider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    // Splash
    splashContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
    },
    circle1: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.04)', top: -80, right: -80,
    },
    circle2: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.05)', bottom: 60, left: -60,
    },
    circle3: {
        position: 'absolute', width: 150, height: 150, borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.04)', top: 120, left: 20,
    },
    splashCard: {
        alignItems: 'center', gap: 6,
    },
    splashLogoWrap: {
        width: 100, height: 100, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
    },
    splashEmoji: { fontSize: 52 },
    splashTitle: {
        fontSize: 48, fontWeight: '900', color: '#fff',
        letterSpacing: -2,
    },
    splashSubtitle: {
        fontSize: 14, color: 'rgba(255,255,255,0.75)',
        fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase',
    },
    splashDivider: {
        width: 60, height: 3, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 12,
    },
    splashLoading: {
        fontSize: 12, color: 'rgba(255,255,255,0.5)',
        marginTop: 8, fontWeight: '600',
    },
    splashFooter: {
        position: 'absolute', bottom: 40, alignItems: 'center', gap: 4,
    },
    splashBrand: {
        fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700',
    },
    splashVersion: {
        fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500',
    },
});
