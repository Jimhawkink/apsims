import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { TeacherTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// ── Tab Screens ─────────────────────────────────────────────
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import AttendanceTakingScreen from '../screens/teacher/AttendanceTakingScreen';
import MarksHubScreen from '../screens/teacher/MarksHubScreen';
import ExamScheduleScreen from '../screens/teacher/ExamScheduleScreen';
import CBCTeacherHubScreen from '../screens/teacher/CBCTeacherHubScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const C = {
    primary844: '#2563eb',
    primaryCBC: '#7c3aed',
    primarySchedule: '#2563eb',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
    activeBg844: '#dbeafe',
    activeBgCBC: '#ede9fe',
    activeBgSchedule: '#dbeafe',
};

function TabIcon({
    emoji, focused, color844, colorCBC, is844, isCBC, isSchedule
}: {
    emoji: string; focused: boolean;
    color844: string; colorCBC: string;
    is844?: boolean; isCBC?: boolean; isSchedule?: boolean;
}) {
    const activeBg = isCBC ? colorCBC + '22' : (is844 || isSchedule) ? color844 + '22' : 'rgba(0,0,0,0.06)';
    const dotColor = isCBC ? colorCBC : color844;
    return (
        <View style={[styles.iconWrap, focused && { backgroundColor: activeBg }]}>
            <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
            {focused && (
                <View style={[styles.activeDot, { backgroundColor: dotColor }]} />
            )}
        </View>
    );
}

export default function TeacherTabNavigator() {
    const { session } = useSession();
    const portalUserId = session?.portal_user_id || 0;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: route.name === 'CBC' ? C.primaryCBC : C.primary844,
                tabBarInactiveTintColor: C.inactive,
                tabBarStyle: {
                    backgroundColor: C.bg,
                    borderTopColor: C.border,
                    borderTopWidth: 1,
                    height: 68,
                    paddingBottom: 10,
                    paddingTop: 6,
                    elevation: 16,
                    shadowColor: '#4f46e5',
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '800',
                    marginTop: 1,
                },
                tabBarIcon: ({ focused }) => {
                    const icons: Record<string, string> = {
                        Dashboard: '🏠',
                        Attendance: '📋',
                        Marks: '📝',
                        Schedule: '📅',
                        CBC: '🎓',
                        More: '⋯',
                    };
                    return (
                        <TabIcon
                            emoji={icons[route.name] || '•'}
                            focused={focused}
                            color844={C.primary844}
                            colorCBC={C.primaryCBC}
                            is844={route.name === 'Marks'}
                            isCBC={route.name === 'CBC'}
                            isSchedule={route.name === 'Schedule'}
                        />
                    );
                },
                headerRight: () => <NotificationBell portalUserId={portalUserId} />,
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={TeacherDashboard}
                options={{ title: 'Home' }}
            />
            <Tab.Screen
                name="Attendance"
                component={AttendanceTakingScreen}
                options={{ title: 'Attendance' }}
            />
            <Tab.Screen
                name="Marks"
                component={MarksHubScreen}
                options={{
                    title: '8-4-4',
                    tabBarLabel: '8-4-4 Marks',
                }}
            />
            <Tab.Screen
                name="Schedule"
                component={ExamScheduleScreen}
                options={{
                    title: 'Schedule',
                    tabBarLabel: '📅 Schedule',
                }}
            />
            <Tab.Screen
                name="CBC"
                component={CBCTeacherHubScreen}
                options={{
                    title: 'CBC Hub',
                    tabBarLabel: 'CBC Hub',
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreScreen}
                options={{ title: 'More' }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconWrap: {
        width: 40,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        position: 'absolute',
        bottom: -4,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
});
