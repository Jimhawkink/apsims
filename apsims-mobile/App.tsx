import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UserSession } from './src/lib/supabase';
import { getSession, clearSession } from './src/lib/security';
import { onConnectivityChange } from './src/lib/netinfo';
import { syncOfflineQueue } from './src/lib/offline';
import { SessionContext } from './src/context/SessionContext';
import { RootStackParamList } from './src/navigation/types';

// Tab Navigators
import TeacherTabNavigator from './src/navigation/TeacherTabNavigator';
import ParentTabNavigator from './src/navigation/ParentTabNavigator';
import StudentTabNavigator from './src/navigation/StudentTabNavigator';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import NotificationScreen from './src/screens/shared/NotificationScreen';
import ReportCardScreen from './src/screens/shared/ReportCardScreen';
import CBCAssessmentScreen from './src/screens/student/CBCAssessmentScreen';
import StudentProfileScreen from './src/screens/teacher/StudentProfileScreen';
import ClassPerformanceScreen from './src/screens/teacher/ClassPerformanceScreen';
import CBCMarksEntryScreen from './src/screens/teacher/CBCMarksEntryScreen';
import PayFeesScreen from './src/screens/parent/PayFeesScreen';
import MarksEntryScreen from './src/screens/teacher/MarksEntryScreen';
import TimetableScreen from './src/screens/teacher/TimetableScreen';
import ExportScreen from './src/screens/shared/ExportScreen';
import AnnouncementScreen from './src/screens/shared/AnnouncementScreen';
import HealthRecordScreen from './src/screens/parent/HealthRecordScreen';
import LeaveOutScreen from './src/screens/parent/LeaveOutScreen';
import FeeBalanceScreen from './src/screens/student/FeeBalanceScreen';

// Enable react-native-screens for better performance
enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    const [session, setSession] = useState<UserSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        getSession().then(saved => {
            setSession(saved);
            setLoading(false);
        });

        // Wire connectivity change to trigger offline sync
        const unsubscribe = onConnectivityChange((connected) => {
            if (connected) {
                syncOfflineQueue().catch(console.error);
            }
        });

        return unsubscribe;
    }, []);

    const handleSetSession = useCallback((s: UserSession | null) => {
        setSession(s);
        if (!s) clearSession();
    }, []);

    if (loading) {
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

    return (
        <SafeAreaProvider>
            <SessionContext.Provider value={{ session, setSession: handleSetSession }}>
                <NavigationContainer>
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                        {!session ? (
                            <Stack.Screen name="Login" component={LoginScreen} />
                        ) : session.user_type === 'teacher' ? (
                            <Stack.Screen name="TeacherTabs" component={TeacherTabNavigator} />
                        ) : session.user_type === 'parent' ? (
                            <Stack.Screen name="ParentTabs" component={ParentTabNavigator} />
                        ) : (
                            <Stack.Screen name="StudentTabs" component={StudentTabNavigator} />
                        )}

                        {/* Modal / pushed screens accessible from any tab */}
                        <Stack.Screen
                            name="Notifications"
                            component={NotificationScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ReportCard"
                            component={ReportCardScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="CBCAssessment"
                            component={CBCAssessmentScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="StudentProfile"
                            component={StudentProfileScreen}
                            options={{ presentation: 'modal', headerShown: false }}
                        />
                        <Stack.Screen
                            name="ClassPerformance"
                            component={ClassPerformanceScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="CBCMarksEntry"
                            component={CBCMarksEntryScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="PayFees"
                            component={PayFeesScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="MarksEntry"
                            component={MarksEntryScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="TeacherTimetable"
                            component={TimetableScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="Export"
                            component={ExportScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="Announcement"
                            component={AnnouncementScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="HealthRecord"
                            component={HealthRecordScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="LeaveOut"
                            component={LeaveOutScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="FeeBalance"
                            component={FeeBalanceScreen}
                            options={{ headerShown: false }}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </SessionContext.Provider>
        </SafeAreaProvider>
    );
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
