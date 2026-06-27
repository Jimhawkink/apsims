// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Premium — Shared UI Components
// Reusable building blocks used across all screens
// Ultra-light bright theme
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme/PremiumTheme';

// ─── KPI Metric Card ─────────────────────────────────────────────
interface MetricCardProps {
    icon: string;
    label: string;
    value: string;
    sub?: string;
    gradient: [string, string];
    onPress?: () => void;
    badge?: string;
    trend?: { value: string; up: boolean };
}
export function MetricCard({ icon, label, value, sub, gradient, onPress, badge, trend }: MetricCardProps) {
    const content = (
        <LinearGradient colors={gradient} style={metricStyles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {/* Decorative circles */}
            <View style={metricStyles.decor1} />
            <View style={metricStyles.decor2} />
            {badge && (
                <View style={metricStyles.badge}>
                    <Text style={metricStyles.badgeText}>{badge}</Text>
                </View>
            )}
            <View style={metricStyles.iconBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
            </View>
            <Text style={metricStyles.value}>{value}</Text>
            <Text style={metricStyles.label}>{label}</Text>
            {sub && <Text style={metricStyles.sub} numberOfLines={1}>{sub}</Text>}
            {trend && (
                <View style={[metricStyles.trend, { backgroundColor: trend.up ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
                    <Text style={metricStyles.trendText}>{trend.up ? '↑' : '↓'} {trend.value}</Text>
                </View>
            )}
        </LinearGradient>
    );
    if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{content}</TouchableOpacity>;
    return content;
}

// ─── Light Info Card ─────────────────────────────────────────────
interface InfoCardProps {
    icon: string;
    label: string;
    value: string;
    color?: string;
    bg?: string;
    onPress?: () => void;
    rightContent?: React.ReactNode;
}
export function InfoCard({ icon, label, value, color = T.indigo, bg = T.indigoLight, onPress, rightContent }: InfoCardProps) {
    const content = (
        <View style={[infoStyles.card]}>
            <View style={[infoStyles.iconBox, { backgroundColor: bg }]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={infoStyles.label}>{label}</Text>
                <Text style={[infoStyles.value, { color }]}>{value}</Text>
            </View>
            {rightContent}
        </View>
    );
    if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{content}</TouchableOpacity>;
    return content;
}

// ─── Section Header ──────────────────────────────────────────────
export function SectionLabel({ title, subtitle, action, onAction }: {
    title: string; subtitle?: string; action?: string; onAction?: () => void;
}) {
    return (
        <View style={sectionStyles.row}>
            <View>
                <Text style={sectionStyles.title}>{title}</Text>
                {subtitle && <Text style={sectionStyles.sub}>{subtitle}</Text>}
            </View>
            {action && (
                <TouchableOpacity onPress={onAction}>
                    <Text style={sectionStyles.action}>{action} →</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Pill / Chip ─────────────────────────────────────────────────
export function Chip({ label, color, bg, onPress, active }: {
    label: string; color?: string; bg?: string; onPress?: () => void; active?: boolean;
}) {
    const c = color || T.indigo;
    const b = bg || T.indigoLight;
    const chip = (
        <View style={[chipStyles.chip, { backgroundColor: active ? c : b, borderColor: c }]}>
            <Text style={[chipStyles.text, { color: active ? '#fff' : c }]}>{label}</Text>
        </View>
    );
    if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{chip}</TouchableOpacity>;
    return chip;
}

// ─── Status Badge ────────────────────────────────────────────────
export function StatusBadge({ label, type }: { label: string; type: 'success' | 'warning' | 'error' | 'info' | 'neutral' }) {
    const map = {
        success: { bg: T.greenLight, color: T.green },
        warning: { bg: T.amberLight, color: T.amber },
        error:   { bg: T.redLight,   color: T.red   },
        info:    { bg: T.blueLight,  color: T.blue  },
        neutral: { bg: T.borderSoft, color: T.textSub },
    };
    const { bg, color } = map[type];
    return (
        <View style={[badgeStyles.badge, { backgroundColor: bg }]}>
            <Text style={[badgeStyles.text, { color }]}>{label}</Text>
        </View>
    );
}

// ─── Progress Bar ─────────────────────────────────────────────────
export function ProgressBar({ pct, color = T.indigo, height = 8 }: {
    pct: number; color?: string; height?: number;
}) {
    const safe = Math.min(100, Math.max(0, pct || 0));
    return (
        <View style={[progressStyles.track, { height }]}>
            <View style={[progressStyles.fill, { width: `${safe}%` as any, backgroundColor: color, height }]} />
        </View>
    );
}

// ─── Premium Button ──────────────────────────────────────────────
export function PremiumButton({ label, onPress, gradient, loading, icon, style }: {
    label: string; onPress: () => void; gradient?: [string, string];
    loading?: boolean; icon?: string; style?: ViewStyle;
}) {
    return (
        <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.88} style={style}>
            <LinearGradient
                colors={gradient || T.gradPrimary}
                style={btnStyles.btn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                        {icon && <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text>}
                        <Text style={btnStyles.label}>{label}</Text>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
}

// ─── Empty State ──────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, action, onAction }: {
    icon: string; title: string; sub?: string; action?: string; onAction?: () => void;
}) {
    return (
        <View style={emptyStyles.box}>
            <View style={emptyStyles.iconBox}>
                <Text style={{ fontSize: 40 }}>{icon}</Text>
            </View>
            <Text style={emptyStyles.title}>{title}</Text>
            {sub && <Text style={emptyStyles.sub}>{sub}</Text>}
            {action && onAction && (
                <TouchableOpacity onPress={onAction} style={emptyStyles.btn}>
                    <Text style={emptyStyles.btnText}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Skeleton Loader ─────────────────────────────────────────────
export function SkeletonCard({ rows = 3, style }: { rows?: number; style?: ViewStyle }) {
    return (
        <View style={[skelStyles.card, style]}>
            {Array.from({ length: rows }).map((_, i) => (
                <View key={i} style={[skelStyles.line, { width: i === 0 ? '60%' : i % 3 === 0 ? '40%' : '85%' }]} />
            ))}
        </View>
    );
}

export function SkeletonRow() {
    return (
        <View style={skelStyles.row}>
            <View style={skelStyles.circle} />
            <View style={{ flex: 1, gap: 6 }}>
                <View style={[skelStyles.line, { width: '70%' }]} />
                <View style={[skelStyles.line, { width: '45%', height: 10 }]} />
            </View>
        </View>
    );
}

// ─── Divider ─────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
    return <View style={[{ height: 1, backgroundColor: T.borderSoft, marginVertical: 12 }, style]} />;
}

// ─── Quick Action Row Item ────────────────────────────────────────
export function QuickActionItem({ icon, label, gradient, onPress, badge }: {
    icon: string; label: string; gradient: [string, string]; onPress: () => void; badge?: string;
}) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={qaStyles.item}>
            <LinearGradient colors={gradient} style={qaStyles.iconGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                {badge && (
                    <View style={qaStyles.badge}>
                        <Text style={qaStyles.badgeText}>{badge}</Text>
                    </View>
                )}
            </LinearGradient>
            <Text style={qaStyles.label} numberOfLines={2}>{label}</Text>
        </TouchableOpacity>
    );
}

// ─── Styles ──────────────────────────────────────────────────────
const metricStyles = StyleSheet.create({
    card: {
        borderRadius: T.r20, padding: 18, minHeight: 140,
        justifyContent: 'flex-end', overflow: 'hidden',
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 6,
    },
    decor1: {
        position: 'absolute', top: -20, right: -20,
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    decor2: {
        position: 'absolute', top: 30, right: 30,
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    badge: {
        position: 'absolute', top: 12, right: 12,
        backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    badgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
    iconBox: {
        width: 44, height: 44, borderRadius: T.r12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    value: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
    label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 },
    sub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    trend: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
    trendText: { fontSize: 10, fontWeight: '800', color: '#fff' },
});

const infoStyles = StyleSheet.create({
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: T.bgCard, borderRadius: T.r16,
        padding: 14, borderWidth: 1, borderColor: T.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        marginBottom: 8,
    },
    iconBox: { width: 46, height: 46, borderRadius: T.r12, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 11, color: T.textSub, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 },
    value: { fontSize: 15, fontWeight: '800', color: T.text },
});

const sectionStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '900', color: T.text },
    sub: { fontSize: 11, color: T.textSub, marginTop: 2 },
    action: { fontSize: 12, fontWeight: '700', color: T.indigo },
});

const chipStyles = StyleSheet.create({
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    text: { fontSize: 12, fontWeight: '700' },
});

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    text: { fontSize: 11, fontWeight: '800' },
});

const progressStyles = StyleSheet.create({
    track: { backgroundColor: T.borderSoft, borderRadius: 99, overflow: 'hidden' },
    fill: { borderRadius: 99 },
});

const btnStyles = StyleSheet.create({
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15, paddingHorizontal: 24, borderRadius: T.r16,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
    },
    label: { fontSize: 15, fontWeight: '900', color: '#fff' },
});

const emptyStyles = StyleSheet.create({
    box: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
    iconBox: {
        width: 80, height: 80, borderRadius: T.r24,
        backgroundColor: T.indigoLight,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    title: { fontSize: 18, fontWeight: '900', color: T.text, textAlign: 'center' },
    sub: { fontSize: 13, color: T.textSub, textAlign: 'center', lineHeight: 20 },
    btn: { marginTop: 16, backgroundColor: T.indigo, borderRadius: T.r12, paddingHorizontal: 24, paddingVertical: 12 },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

const skelStyles = StyleSheet.create({
    card: {
        backgroundColor: T.bgCard, borderRadius: T.r16, padding: 16,
        borderWidth: 1, borderColor: T.border, gap: 10, marginBottom: 10,
    },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderBottomWidth: 1, borderBottomColor: T.borderSoft,
    },
    circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.borderSoft },
    line: { height: 12, backgroundColor: T.borderSoft, borderRadius: 6 },
});

const qaStyles = StyleSheet.create({
    item: { alignItems: 'center', gap: 8, flex: 1 },
    iconGrad: {
        width: 60, height: 60, borderRadius: T.r20,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
        position: 'relative',
    },
    label: { fontSize: 11, fontWeight: '700', color: T.textMd, textAlign: 'center' },
    badge: {
        position: 'absolute', top: -4, right: -4,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: T.red, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    badgeText: { fontSize: 9, color: '#fff', fontWeight: '900' },
});
