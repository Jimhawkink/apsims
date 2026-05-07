import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../lib/netinfo';

interface Props {
    pendingCount?: number;
}

export default function OfflineBanner({ pendingCount = 0 }: Props) {
    const { isConnected } = useNetworkStatus();

    if (isConnected) return null;

    return (
        <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.text}>
                📡 Offline
                {pendingCount > 0 ? ` — ${pendingCount} record${pendingCount !== 1 ? 's' : ''} pending sync` : ''}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#fef3c7',
        borderBottomWidth: 1,
        borderBottomColor: '#f59e0b',
        paddingVertical: 6,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    text: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400e',
    },
});
