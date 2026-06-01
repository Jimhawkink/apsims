import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { BursarTabParamList } from './types';
import { useSession } from '../context/SessionContext';
import NotificationBell from '../components/NotificationBell';

// ── Tab screens ────────────────────────────────────────────────
import BursarDashboard from '../screens/bursar/BursarDashboard';
import BursarFeesScreen from '../screens/bursar/BursarFeesScreen';
import BursarExpensesScreen from '../screens/bursar/BursarExpensesScreen';
import BursarIncomeScreen from '../screens/bursar/BursarIncomeScreen';

// ── More stack screens ─────────────────────────────────────────
import BursarMoreScreen from '../screens/bursar/BursarMoreScreen';
import BursarReportsScreen from '../screens/bursar/BursarReportsScreen';
import BursarAccountsScreen from '../screens/bursar/BursarAccountsScreen';
import BursarStoresScreen from '../screens/bursar/BursarStoresScreen';

const Tab = createBottomTabNavigator<BursarTabParamList>();
const MoreStack = createNativeStackNavigator();

const C = {
    primary: '#0891b2',
    inactive: '#94a3b8',
    bg: '#ffffff',
    border: '#e2e8f0',
    activeBg: '#ecfeff',
};

// ── Nested stack navigator for "More" tab ─────────────────────
function BursarMoreStack() {
    return (
        <MoreStack.Navigator screenOptions={{ headerShown: false }}>
            <MoreStack.Screen name="BursarMoreHub" component={BursarMoreScreen} />
            <MoreStack.Screen name="BursarReports" component={BursarReportsScreen} />
            <MoreStack.Screen name="BursarAccounts" component={BursarAccountsScreen} />
            <MoreStack.Screen name="BursarStores" component={BursarStoresScreen} />
        </MoreStack.Navigator>
    );
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return (
        <View style={[styles.iconWrap, focused && { backgroundColor: C.activeBg }]}>
            <Text style={{ fontSize: focused ? 20 : 17, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
        </View>
    );
}

export default function BursarTabNavigator() {
    const { session } = useSession();
    const portalUserId = session?.portal_user_id || 0;

    const ICONS: Record<string, string> = {
        Dashboard: '🏦',
        Fees: '💳',
        Expenses: '📉',
        Income: '📈',
        More: '⚡',
    };

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
                    elevation: 16,
                    shadowColor: '#0891b2',
                    shadowOpacity: 0.12,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
                tabBarIcon: ({ focused }) => (
                    <TabIcon emoji={ICONS[route.name] || '•'} focused={focused} />
                ),
                headerRight: () => <NotificationBell portalUserId={portalUserId} />,
            })}
        >
            <Tab.Screen name="Dashboard" component={BursarDashboard} options={{ title: 'Dashboard' }} />
            <Tab.Screen name="Fees" component={BursarFeesScreen} options={{ title: 'Fees' }} />
            <Tab.Screen name="Expenses" component={BursarExpensesScreen} options={{ title: 'Expenses' }} />
            <Tab.Screen name="Income" component={BursarIncomeScreen} options={{ title: 'Income' }} />
            <Tab.Screen name="More" component={BursarMoreStack} options={{ title: 'More' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconWrap: {
        width: 36, height: 28, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
});
