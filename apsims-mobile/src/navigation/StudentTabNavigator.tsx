import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StudentTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import StudentAttendanceScreen from '../screens/student/AttendanceScreen';
import StudentTimetableScreen from '../screens/student/TimetableScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator<StudentTabParamList>();

const C = {
    primary: '#0d9488',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
};

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
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 4,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                },
                tabBarIcon: ({ focused }) => {
                    const icons: Record<string, string> = {
                        Home: '🏠',
                        Attendance: '📅',
                        Timetable: '🗓️',
                        More: '⋯',
                    };
                    return (
                        <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>
                            {icons[route.name] || '•'}
                        </Text>
                    );
                },
                headerRight: () => <NotificationBell portalUserId={portalUserId} />,
            })}
        >
            <Tab.Screen name="Home" component={StudentDashboard} options={{ title: 'Home' }} />
            <Tab.Screen name="Attendance" component={StudentAttendanceScreen} options={{ title: 'Attendance' }} />
            <Tab.Screen name="Timetable" component={StudentTimetableScreen} options={{ title: 'Timetable' }} />
            <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
        </Tab.Navigator>
    );
}
