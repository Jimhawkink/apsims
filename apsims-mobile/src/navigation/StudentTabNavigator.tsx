import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { StudentTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import StudentAttendanceScreen from '../screens/student/AttendanceScreen';
import ResultsScreen from '../screens/student/ResultsScreen';
import StudentTimetableScreen from '../screens/student/TimetableScreen';
import FeeBalanceScreen from '../screens/student/FeeBalanceScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator<StudentTabParamList>();

const C = {
    primary: '#0d9488',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
    activeBg: '#ccfbf1',
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return (
        <View style={[styles.iconWrap, focused && { backgroundColor: C.activeBg }]}>
            <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
        </View>
    );
}

export default function StudentTabNavigator() {
    const { session } = useSession();
    const portalUserId = session?.portal_user_id || 0;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: C.primary,
                tabBarInactiveTintColor: C.inactive,
                tabBarStyle: {
                    backgroundColor: C.bg,
                    borderTopColor: C.border,
                    borderTopWidth: 1,
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 6,
                    elevation: 12,
                    shadowColor: '#0d9488',
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
                tabBarIcon: ({ focused }) => {
                    const icons: Record<string, string> = {
                        Home: '🏠',
                        Attendance: '📋',
                        Timetable: '📅',
                        Results: '📊',
                        Library: '💰',
                        More: '⋯',
                    };
                    return <TabIcon emoji={icons[route.name] || '•'} focused={focused} />;
                },
                headerRight: () => <NotificationBell portalUserId={portalUserId} />,
            })}
        >
            <Tab.Screen name="Home" component={StudentDashboard} options={{ title: 'Home' }} />
            <Tab.Screen name="Attendance" component={StudentAttendanceScreen} options={{ title: 'Attendance' }} />
            <Tab.Screen name="Timetable" component={StudentTimetableScreen} options={{ title: 'Timetable' }} />
            <Tab.Screen name="Results" component={ResultsScreen} options={{ title: 'Results', tabBarLabel: '📊 Results' }} />
            <Tab.Screen name="Library" component={FeeBalanceScreen} options={{ title: 'Fee Balance', tabBarLabel: '💰 Fees' }} />
            <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconWrap: {
        width: 36, height: 28, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
});
