import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { PrincipalTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// Screens
import PrincipalDashboard from '../screens/principal/PrincipalDashboard';
import PrincipalStudentsScreen from '../screens/principal/PrincipalStudentsScreen';
import FinanceReportScreen from '../screens/principal/FinanceReportScreen';
import AcademicReportScreen from '../screens/principal/AcademicReportScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator<PrincipalTabParamList>();

const C = {
    primary: '#7c3aed',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
    activeBg: '#ede9fe',
};

function TabIcon({ emoji, focused, label }: { emoji: string; focused: boolean; label: string }) {
    return (
        <View style={[styles.iconWrap, focused && { backgroundColor: C.activeBg }]}>
            <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
        </View>
    );
}

export default function PrincipalTabNavigator() {
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
                        Dashboard: '📊',
                        Students: '👨‍🎓',
                        Finance: '💰',
                        Reports: '📚',
                        More: '⋯',
                    };
                    return <TabIcon emoji={icons[route.name] || '•'} focused={focused} label={route.name} />;
                },
                headerRight: () => <NotificationBell portalUserId={portalUserId} />,
            })}
        >
            <Tab.Screen name="Dashboard" component={PrincipalDashboard} options={{ title: 'Dashboard' }} />
            <Tab.Screen name="Students" component={PrincipalStudentsScreen} options={{ title: 'Students' }} />
            <Tab.Screen name="Finance" component={FinanceReportScreen} options={{ title: 'Finance' }} />
            <Tab.Screen name="Reports" component={AcademicReportScreen} options={{ title: 'Academic' }} />
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
