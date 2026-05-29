import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { ParentTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// Screens
import ParentDashboard from '../screens/parent/ParentDashboard';
import ParentAttendanceScreen from '../screens/parent/AttendanceScreen';
import HomeworkScreen from '../screens/parent/HomeworkScreen';
import CircularScreen from '../screens/parent/CircularScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator<ParentTabParamList>();

const C = {
    primary: '#7c3aed',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
    activeBg: '#ede9fe',
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return (
        <View style={[styles.iconWrap, focused && { backgroundColor: C.activeBg }]}>
            <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
        </View>
    );
}

export default function ParentTabNavigator() {
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
                    shadowColor: '#7c3aed',
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
                tabBarIcon: ({ focused }) => {
                    const icons: Record<string, string> = {
                        Home: '🏠',
                        Attendance: '📅',
                        Homework: '📋',
                        Circulars: '📢',
                        More: '⋯',
                    };
                    return <TabIcon emoji={icons[route.name] || '•'} focused={focused} />;
                },
                headerRight: () => <NotificationBell portalUserId={portalUserId} />,
            })}
        >
            <Tab.Screen name="Home" component={ParentDashboard} options={{ title: 'Home' }} />
            <Tab.Screen name="Attendance" component={ParentAttendanceScreen} options={{ title: 'Attendance' }} />
            <Tab.Screen name="Homework" component={HomeworkScreen} options={{ title: 'Homework' }} />
            <Tab.Screen name="Circulars" component={CircularScreen} options={{ title: 'Circulars' }} />
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
