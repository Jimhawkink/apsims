import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, TextInput,
    ActivityIndicator, Animated, StatusBar, SafeAreaView,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loginUser, UserSession } from '../lib/supabase';
import {
    validateUsername, validatePassword, isRateLimited,
    recordFailedAttempt, clearRateLimit, saveSession,
} from '../lib/security';

interface Props {
    onLoginSuccess: (session: UserSession) => void;
}

const C = {
    bg: '#f8fafc',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primaryLight: '#60a5fa',
    accent: '#059669',
    accentLight: '#10b981',
    danger: '#ef4444',
    gold: '#f59e0b',
    text: '#0f172a',
    textSub: '#64748b',
    textDim: '#94a3b8',
    inputBg: '#f1f5f9',
    inputBorder: '#cbd5e1',
};

export default function LoginScreen({ onLoginSuccess }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [lockoutSeconds, setLockoutSeconds] = useState(0);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const lockoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
        checkLockout();
        return () => { if (lockoutRef.current) clearInterval(lockoutRef.current); };
    }, []);

    const checkLockout = async () => {
        const { limited, secondsLeft } = await isRateLimited();
        if (limited) startLockoutCountdown(secondsLeft);
    };

    const startLockoutCountdown = (seconds: number) => {
        setLockoutSeconds(seconds);
        setError(`Too many attempts. Wait ${seconds}s`);
        if (lockoutRef.current) clearInterval(lockoutRef.current);
        lockoutRef.current = setInterval(() => {
            setLockoutSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(lockoutRef.current!);
                    setError('');
                    clearRateLimit();
                    return 0;
                }
                const next = prev - 1;
                setError(`Too many attempts. Wait ${next}s`);
                return next;
            });
        }, 1000);
    };

    const triggerShake = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = useCallback(async () => {
        if (isLoading || lockoutSeconds > 0) return;

        const { limited, secondsLeft } = await isRateLimited();
        if (limited) { startLockoutCountdown(secondsLeft); return; }

        const { valid: uValid, error: uErr } = validateUsername(username);
        if (!uValid) { setError(uErr || 'Invalid username'); triggerShake(); return; }

        const { valid: pValid, error: pErr } = validatePassword(password);
        if (!pValid) { setError(pErr || 'Invalid password'); triggerShake(); return; }

        setIsLoading(true);
        setError('');

        try {
            const user = await loginUser(username, password);
            if (user) {
                await clearRateLimit();
                await saveSession(user);
                onLoginSuccess(user);
            } else {
                triggerShake();
                const { locked, attemptsLeft, lockoutMs } = await recordFailedAttempt();
                if (locked) {
                    startLockoutCountdown(Math.ceil(lockoutMs / 1000));
                } else {
                    setError(attemptsLeft > 0
                        ? `Invalid credentials — ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left`
                        : 'Invalid credentials'
                    );
                }
            }
        } catch {
            setError('Connection error. Please try again.');
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    }, [username, password, isLoading, lockoutSeconds]);

    const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

            {/* Decorative elements */}
            <View style={styles.decor1} />
            <View style={styles.decor2} />

            <Animated.Text style={[styles.floatIcon, styles.fi1, { transform: [{ translateY: floatY }] }]}>📚</Animated.Text>
            <Animated.Text style={[styles.floatIcon, styles.fi2, { transform: [{ translateY: floatY }] }]}>🎓</Animated.Text>
            <Animated.Text style={[styles.floatIcon, styles.fi3, { transform: [{ translateY: floatY }] }]}>✏️</Animated.Text>

            <SafeAreaView style={styles.safe}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Logo */}
                        <View style={styles.header}>
                            <Animated.View style={[styles.logoWrap, { transform: [{ translateY: floatY }] }]}>
                                <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.logoGrad}>
                                    <Text style={styles.logoEmoji}>🏫</Text>
                                </LinearGradient>
                                <View style={styles.logoBadge}>
                                    <Text style={styles.logoBadgeText}>APSIMS</Text>
                                </View>
                            </Animated.View>
                            <Text style={styles.title}>Ultra APSIMS</Text>
                            <Text style={styles.subtitle}>Alpha School Management</Text>
                            <View style={styles.secBadge}>
                                <Text style={styles.secIcon}>🔒</Text>
                                <Text style={styles.secText}>Secure Portal Login</Text>
                            </View>
                        </View>

                        {/* Login Form */}
                        <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
                            {/* Username */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>👤 Username</Text>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={(t) => { setUsername(t); setError(''); }}
                                    placeholder="Enter your username"
                                    placeholderTextColor={C.textDim}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isLoading && lockoutSeconds === 0}
                                />
                            </View>

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>🔑 Password</Text>
                                <View style={styles.passwordWrap}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                                        value={password}
                                        onChangeText={(t) => { setPassword(t); setError(''); }}
                                        placeholder="Enter your password"
                                        placeholderTextColor={C.textDim}
                                        secureTextEntry={!showPw}
                                        autoCapitalize="none"
                                        editable={!isLoading && lockoutSeconds === 0}
                                        onSubmitEditing={handleLogin}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPw(!showPw)}
                                        style={styles.eyeBtn}
                                    >
                                        <Text style={styles.eyeText}>{showPw ? '🙈' : '👁️'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Error */}
                            {error ? (
                                <View style={styles.errorRow}>
                                    <Text style={styles.errorIcon}>⚠️</Text>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {/* Role indicator */}
                            <View style={styles.rolesRow}>
                                <View style={styles.roleChip}>
                                    <Text style={styles.roleIcon}>👩‍🏫</Text>
                                    <Text style={styles.roleLabel}>Teacher</Text>
                                </View>
                                <View style={styles.roleChip}>
                                    <Text style={styles.roleIcon}>👨‍👩‍👧</Text>
                                    <Text style={styles.roleLabel}>Parent</Text>
                                </View>
                                <View style={styles.roleChip}>
                                    <Text style={styles.roleIcon}>🎓</Text>
                                    <Text style={styles.roleLabel}>Student</Text>
                                </View>
                            </View>

                            {/* Login Button */}
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={isLoading || lockoutSeconds > 0 || !username.trim() || !password.trim()}
                                activeOpacity={0.85}
                                style={styles.loginBtnWrap}
                            >
                                <LinearGradient
                                    colors={username.trim() && password.trim() && lockoutSeconds === 0
                                        ? ['#2563eb', '#1d4ed8']
                                        : ['#94a3b8', '#64748b']}
                                    style={styles.loginBtn}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {isLoading ? (
                                        <>
                                            <ActivityIndicator color="#fff" size="small" />
                                            <Text style={styles.loginBtnText}> Signing in…</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.loginBtnEmoji}>🚀</Text>
                                            <Text style={styles.loginBtnText}>Sign In to Portal</Text>
                                            <Text style={styles.loginBtnArrow}>→</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <View style={styles.footerDivider}>
                                <View style={styles.divLine} />
                                <Text style={styles.divText}>Powered by</Text>
                                <View style={styles.divLine} />
                            </View>
                            <Text style={styles.footerTitle}>💎 Alpha Solutions</Text>
                            <Text style={styles.footerSub}>Developed by Jimhawkins Korir · 0720316175</Text>
                            <Text style={styles.version}>APSIMS Mobile v1.0 • {new Date().getFullYear()}</Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    scrollContent: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
    decor1: {
        position: 'absolute', top: -80, right: -60,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(37,99,235,0.08)',
    },
    decor2: {
        position: 'absolute', bottom: -60, left: -80,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: 'rgba(124,58,237,0.06)',
    },
    floatIcon: { position: 'absolute', fontSize: 28, opacity: 0.15 },
    fi1: { top: 120, left: '8%' },
    fi2: { top: 200, right: '10%' },
    fi3: { bottom: 260, left: '15%' },

    // Header
    header: { alignItems: 'center', marginTop: 56, marginBottom: 28 },
    logoWrap: { alignItems: 'center', marginBottom: 14 },
    logoGrad: {
        width: 76, height: 76, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
    logoEmoji: { fontSize: 36 },
    logoBadge: {
        marginTop: -10, backgroundColor: C.gold,
        paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10,
        shadowColor: C.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6,
    },
    logoBadgeText: { color: '#1f2937', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    title: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
    subtitle: { fontSize: 13, color: C.textSub, fontWeight: '500', marginBottom: 10 },
    secBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(5,150,105,0.1)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)',
    },
    secIcon: { fontSize: 12 },
    secText: { fontSize: 11, color: C.accent, fontWeight: '700' },

    // Form Card
    formCard: {
        width: '100%', maxWidth: 380,
        backgroundColor: C.card,
        borderRadius: 24, padding: 24,
        borderWidth: 1, borderColor: C.cardBorder,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
        marginBottom: 24,
    },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
    input: {
        backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: C.text, fontWeight: '500',
    },
    passwordWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
        borderRadius: 14, overflow: 'hidden',
    },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
    eyeText: { fontSize: 18 },

    // Error
    errorRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
    },
    errorIcon: { fontSize: 14 },
    errorText: { fontSize: 12, color: C.danger, fontWeight: '600', flex: 1 },

    // Roles
    rolesRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
    roleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(37,99,235,0.06)', borderRadius: 12,
        paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(37,99,235,0.1)',
    },
    roleIcon: { fontSize: 14 },
    roleLabel: { fontSize: 10, fontWeight: '700', color: C.primary },

    // Login Button
    loginBtnWrap: { borderRadius: 16, overflow: 'hidden' },
    loginBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, paddingHorizontal: 24, gap: 8,
    },
    loginBtnEmoji: { fontSize: 18 },
    loginBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
    loginBtnArrow: { fontSize: 18, color: '#fff', fontWeight: '700' },

    // Footer
    footer: { alignItems: 'center', paddingBottom: 24, gap: 4 },
    footerDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    divLine: { width: 30, height: 1, backgroundColor: C.textDim },
    divText: { fontSize: 10, color: C.textDim, fontWeight: '500' },
    footerTitle: { fontSize: 13, color: C.textSub, fontWeight: '700' },
    footerSub: { fontSize: 10, color: C.textDim },
    version: { fontSize: 10, color: C.textDim, marginTop: 4 },
});
