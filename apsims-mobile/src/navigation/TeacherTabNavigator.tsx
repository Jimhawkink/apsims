import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { TeacherTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// Screens
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import AttendanceTakingScreen from '../screens/teacher/AttendanceTakingScreen';
import HomeworkAssignmentScreen from '../screens/teacher/HomeworkAssignmentScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const C = {
    primary: '#2563eb',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
};

export default function TeacherTabNavigator() {
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
                tabBarIcon: ({ color, focused }) => {
                    const icons: Record<string, string> = {
                        Dashboard: '🏠',
                        Attendance: '📋',
                        Homework: '📝',
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
            <Tab.Screen name="Dashboard" component={TeacherDashboard} options={{ title: 'Dashboard' }} />
            <Tab.Screen name="Attendance" component={AttendanceTakingScreen} options={{ title: 'Attendance' }} />
            <Tab.Screen name="Homework" component={HomeworkAssignmentScreen} options={{ title: 'Homework' }} />
            <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
        </Tab.Navigator>
    );
}
