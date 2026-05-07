import React, { useState, useEffect, useCallback } from 'react';
import {
    TouchableOpacity, Text, View, StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getUnreadNotificationCount } from '../lib/supabase';

interface Props {
    portalUserId: number;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationBell({ portalUserId }: Props) {
    const [unreadCount, setUnreadCount] = useState(0);
    const navigation = useNavigation<NavProp>();

    const fetchCount = useCallback(async () => {
        if (!portalUserId) return;
        const count = await getUnreadNotificationCount(portalUserId);
        setUnreadCount(count);
    }, [portalUserId]);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    // Refresh count every time this screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchCount();
        }, [fetchCount])
    );

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate('Notifications', { portalUserId })}
            style={styles.container}
            accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            accessibilityRole="button"
        >
            <Text style={styles.bell}>🔔</Text>
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    bell: {
        fontSize: 22,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
        lineHeight: 12,
    },
});
