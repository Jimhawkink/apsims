import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CBCLevel } from '../lib/supabase';

interface Props {
    level: CBCLevel | null | undefined;
    size?: 'sm' | 'md' | 'lg';
}

const LEVEL_CONFIG: Record<CBCLevel, { bg: string; text: string; label: string }> = {
    EE: { bg: '#d1fae5', text: '#065f46', label: 'EE' },
    ME: { bg: '#dbeafe', text: '#1e40af', label: 'ME' },
    AE: { bg: '#fef3c7', text: '#92400e', label: 'AE' },
    BE: { bg: '#fee2e2', text: '#991b1b', label: 'BE' },
};

export default function CBCLevelBadge({ level, size = 'md' }: Props) {
    if (!level) {
        return (
            <View style={[styles.badge, styles.empty, size === 'sm' && styles.sm, size === 'lg' && styles.lg]}>
                <Text style={[styles.text, styles.emptyText, size === 'sm' && styles.textSm, size === 'lg' && styles.textLg]}>
                    —
                </Text>
            </View>
        );
    }

    const config = LEVEL_CONFIG[level];
    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: config.bg },
                size === 'sm' && styles.sm,
                size === 'lg' && styles.lg,
            ]}
            accessibilityLabel={`CBC Level: ${level}`}
        >
            <Text style={[
                styles.text,
                { color: config.text },
                size === 'sm' && styles.textSm,
                size === 'lg' && styles.textLg,
            ]}>
                {config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 36,
    },
    sm: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        minWidth: 28,
    },
    lg: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        minWidth: 48,
    },
    empty: {
        backgroundColor: '#f1f5f9',
    },
    text: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    textSm: {
        fontSize: 10,
    },
    textLg: {
        fontSize: 15,
    },
    emptyText: {
        color: '#94a3b8',
    },
});
