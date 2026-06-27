// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — ScreenHeader Component v2.0
// Universal navigation header for ALL non-tab screens
// Ultra-light bright theme with gradient accent strip
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RightAction {
    icon: string;
    label?: string;
    onPress: () => void;
    badge?: string;
}

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    onLogout?: () => void;
    rightActions?: RightAction[];
    gradient?: [string, string];
    /** If true uses a light/white style instead of gradient header */
    light?: boolean;
}

export default function ScreenHeader({
    title,
    subtitle,
    onBack,
    onLogout,
    rightActions = [],
    gradient = ['#4F46E5', '#6366F1'],
    light = false,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    if (light) {
        // ─── Pure white light header style ──────────────────────
        return (
            <View style={[lightStyles.header, { paddingTop: insets.top + 10 }]}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <View style={lightStyles.row}>
                    {/* Back button */}
                    {onBack && (
                        <TouchableOpacity
                            onPress={onBack}
                            style={lightStyles.backBtn}
                            accessibilityLabel="Go back"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={lightStyles.backIcon}>←</Text>
                        </TouchableOpacity>
                    )}

                    {/* Title */}
                    <View style={{ flex: 1 }}>
                        <Text style={lightStyles.title} numberOfLines={1}>{title}</Text>
                        {subtitle ? <Text style={lightStyles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
                    </View>

                    {/* Right actions */}
                    {rightActions.map((action, i) => (
                        <TouchableOpacity key={i} onPress={action.onPress} style={lightStyles.actionBtn} accessibilityLabel={action.label}>
                            <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                            {action.badge && (
                                <View style={lightStyles.badge}>
                                    <Text style={lightStyles.badgeText}>{action.badge}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}

                    {/* Logout button */}
                    {onLogout && (
                        <TouchableOpacity onPress={onLogout} style={[lightStyles.actionBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]} accessibilityLabel="Logout">
                            <Text style={{ fontSize: 18 }}>🚪</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {/* Bottom accent strip */}
                <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={lightStyles.accentStrip}
                />
            </View>
        );
    }

    // ─── Gradient header style (default) ────────────────────────
    return (
        <View>
            <StatusBar barStyle="light-content" backgroundColor={gradient[0]} />
            <LinearGradient
                colors={gradient}
                style={[gradStyles.header, { paddingTop: insets.top + 10 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
                {/* Decorative circles */}
                <View style={gradStyles.decor1} />
                <View style={gradStyles.decor2} />

                <View style={gradStyles.row}>
                    {/* Back button */}
                    {onBack && (
                        <TouchableOpacity
                            onPress={onBack}
                            style={gradStyles.backBtn}
                            accessibilityLabel="Go back"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={gradStyles.backIcon}>←</Text>
                        </TouchableOpacity>
                    )}

                    {/* Title + subtitle */}
                    <View style={{ flex: 1, marginLeft: onBack ? 10 : 0 }}>
                        <Text style={gradStyles.title} numberOfLines={1}>{title}</Text>
                        {subtitle ? (
                            <Text style={gradStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
                        ) : null}
                    </View>

                    {/* Right actions */}
                    {rightActions.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={action.onPress}
                            style={gradStyles.actionBtn}
                            accessibilityLabel={action.label || action.icon}
                        >
                            <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                            {action.badge && (
                                <View style={gradStyles.badge}>
                                    <Text style={gradStyles.badgeText}>{action.badge}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}

                    {/* Logout button */}
                    {onLogout && (
                        <TouchableOpacity
                            onPress={onLogout}
                            style={[gradStyles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.4)' }]}
                            accessibilityLabel="Logout"
                        >
                            <Text style={{ fontSize: 18 }}>🚪</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
}

// ─── Light header styles ─────────────────────────────────────────
const lightStyles = StyleSheet.create({
    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingBottom: 0,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 14,
        gap: 8,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: '#F0F4FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E0E7FF',
    },
    backIcon: {
        fontSize: 20, color: '#4F46E5', fontWeight: '800', lineHeight: 22,
    },
    title: {
        fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 1,
    },
    actionBtn: {
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: '#F0F4FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E0E7FF',
        position: 'relative',
    },
    badge: {
        position: 'absolute', top: 4, right: 4,
        minWidth: 14, height: 14, borderRadius: 7,
        backgroundColor: '#EF4444',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#fff',
    },
    badgeText: { fontSize: 7, color: '#fff', fontWeight: '900' },
    accentStrip: { height: 3, borderRadius: 2 },
});

// ─── Gradient header styles ───────────────────────────────────────
const gradStyles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    decor1: {
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    decor2: {
        position: 'absolute', top: 20, right: 70,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    backIcon: {
        fontSize: 20, color: '#fff', fontWeight: '800', lineHeight: 22,
    },
    title: {
        fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 1,
    },
    actionBtn: {
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        position: 'relative',
    },
    badge: {
        position: 'absolute', top: 4, right: 4,
        minWidth: 14, height: 14, borderRadius: 7,
        backgroundColor: '#EF4444',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#fff',
    },
    badgeText: { fontSize: 7, color: '#fff', fontWeight: '900' },
});
