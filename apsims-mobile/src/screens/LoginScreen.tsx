import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, TextInput,
    ActivityIndicator, Animated, StatusBar, SafeAreaView,
    KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { RootStackParamList } from '../navigation/types';
import { loginUser } from '../lib/supabase';
import { useSession } from '../context/SessionContext';
import {
    validateUsername, validatePassword, isRateLimited,
    recordFailedAttempt, clearRateLimit, saveSession,
} from '../lib/security';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const BIOMETRIC_CREDS_KEY = 'apsims_biometric_creds';
const BIOMETRIC_ENABLED_KEY = 'apsims_biometric_enabled';

const C = {
    bg: '#F8FAFF',           // Ultra-light blue-white
    card: '#ffffff',
    cardBorder: '#E0E7FF',
    primary: '#4F46E5',      // Indigo (premium)
    primaryDark: '#3730A3',
    primaryLight: '#818CF8',
    accent: '#059669',
    accentLight: '#10b981',
    danger: '#EF4444',
    gold: '#F59E0B',
    text: '#0F172A',
    textSub: '#475569',
    textDim: '#94A3B8',
    inputBg: '#F0F4FF',      // Soft indigo tint
    inputBorder: '#C7D2FE',  // Indigo border
};

export default function LoginScreen() {
    const { setSession } = useSession();
    const navigation = useNavigation<NavProp>();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [lockoutSeconds, setLockoutSeconds] = useState(0);
    const [rememberBiometrics, setRememberBiometrics] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const bioScaleAnim = useRef(new Animated.Value(1)).current;
    const lockoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
        checkLockout();
        checkBiometricAvailability();
        return () => { if (lockoutRef.current) clearInterval(lockoutRef.current); };
    }, []);

    const checkBiometricAvailability = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            const available = hasHardware && isEnrolled;
            setBiometricAvailable(available);

            if (available) {
                const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
                setBiometricEnabled(enabled === 'true');
                setRememberBiometrics(enabled === 'true');
            }
        } catch {
            setBiometricAvailable(false);
        }
    };

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

    const pulseBiometricBtn = () => {
        Animated.sequence([
            Animated.timing(bioScaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
            Animated.spring(bioScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }),
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

                // Save credentials for biometric login if opted in
                if (rememberBiometrics && biometricAvailable) {
                    await AsyncStorage.setItem(BIOMETRIC_CREDS_KEY, JSON.stringify({ username, password }));
                    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
                    setBiometricEnabled(true);
                } else if (!rememberBiometrics) {
                    // User explicitly unchecked — disable biometric
                    await AsyncStorage.removeItem(BIOMETRIC_CREDS_KEY);
                    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
                    setBiometricEnabled(false);
                }

                setSession(user);
                // Navigation is handled by App.tsx based on session state
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
    }, [username, password, isLoading, lockoutSeconds, rememberBiometrics, biometricAvailable]);

    const handleBiometricLogin = useCallback(async () => {
        if (biometricLoading || lockoutSeconds > 0) return;
        pulseBiometricBtn();

        try {
            setBiometricLoading(true);
            setError('');

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Login to APSIMS',
                fallbackLabel: 'Use Password',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (result.success) {
                const credsRaw = await AsyncStorage.getItem(BIOMETRIC_CREDS_KEY);
                if (!credsRaw) {
                    setError('No saved credentials. Please login with password first.');
                    return;
                }

                const { username: savedUser, password: savedPass } = JSON.parse(credsRaw);
                const { limited, secondsLeft } = await isRateLimited();
                if (limited) { startLockoutCountdown(secondsLeft); return; }

                setIsLoading(true);
                const user = await loginUser(savedUser, savedPass);
                if (user) {
                    await clearRateLimit();
                    await saveSession(user);
                    setSession(user);
                } else {
                    triggerShake();
                    setError('Biometric login failed. Credentials may have changed. Please login with password.');
                    // Clear saved creds since they're no longer valid
                    await AsyncStorage.removeItem(BIOMETRIC_CREDS_KEY);
                    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
                    setBiometricEnabled(false);
                }
            } else if (result.error === 'user_cancel' || result.error === 'system_cancel') {
                // Silently ignore cancellation
            } else {
                setError('Biometric authentication failed. Try again or use password.');
            }
        } catch {
            setError('Biometric authentication unavailable.');
        } finally {
            setBiometricLoading(false);
            setIsLoading(false);
        }
    }, [biometricLoading, lockoutSeconds]);

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

                            {/* Biometrics toggle — only show if hardware available */}
                            {biometricAvailable && (
                                <TouchableOpacity
                                    style={styles.biometricToggleRow}
                                    onPress={() => setRememberBiometrics(v => !v)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.biometricToggleLeft}>
                                        <Text style={styles.biometricToggleIcon}>🔐</Text>
                                        <View>
                                            <Text style={styles.biometricToggleLabel}>Remember with biometrics</Text>
                                            <Text style={styles.biometricToggleSub}>Enable fingerprint / Face ID login</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={rememberBiometrics}
                                        onValueChange={setRememberBiometrics}
                                        trackColor={{ false: C.inputBorder, true: 'rgba(37,99,235,0.35)' }}
                                        thumbColor={rememberBiometrics ? C.primary : '#f4f3f4'}
                                        ios_backgroundColor={C.inputBorder}
                                    />
                                </TouchableOpacity>
                            )}

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

                        {/* Biometric Login Button — only if enabled (creds saved) */}
                        {biometricAvailable && biometricEnabled && (
                            <Animated.View style={[styles.bioButtonWrap, { transform: [{ scale: bioScaleAnim }] }]}>
                                <TouchableOpacity
                                    onPress={handleBiometricLogin}
                                    disabled={biometricLoading || isLoading || lockoutSeconds > 0}
                                    activeOpacity={0.88}
                                    style={styles.bioBtn}
                                >
                                    {/* Glass shine overlay */}
                                    <View style={styles.bioGlassShine} />
                                    <View style={styles.bioBtnInner}>
                                        {biometricLoading ? (
                                            <>
                                                <ActivityIndicator color="#3b82f6" size="small" />
                                                <Text style={styles.bioBtnText}>Authenticating…</Text>
                                            </>
                                        ) : (
                                            <>
                                                <View style={styles.bioIconWrap}>
                                                    <Text style={styles.bioIconEmoji}>👆</Text>
                                                </View>
                                                <View style={styles.bioBtnTextWrap}>
                                                    <Text style={styles.bioBtnTitle}>Quick Biometric Login</Text>
                                                    <Text style={styles.bioBtnSub}>Fingerprint · Face ID · PIN</Text>
                                                </View>
                                                <View style={styles.bioBtnArrowWrap}>
                                                    <Text style={styles.bioBtnArrow}>→</Text>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

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
        marginBottom: 16,
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

    // Biometric toggle
    biometricToggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(37,99,235,0.05)', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(37,99,235,0.12)',
    },
    biometricToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    biometricToggleIcon: { fontSize: 20 },
    biometricToggleLabel: { fontSize: 12, fontWeight: '700', color: C.text },
    biometricToggleSub: { fontSize: 10, color: C.textDim, marginTop: 1 },

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

    // ── Biometric Button ─────────────────────────────────────
    bioButtonWrap: { width: '100%', maxWidth: 380, marginBottom: 16 },
    bioBtn: {
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 1.5,
        borderColor: 'rgba(37,99,235,0.25)',
        overflow: 'hidden',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
    },
    bioGlassShine: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '50%',
        backgroundColor: 'rgba(255,255,255,0.45)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    bioBtnInner: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 20, gap: 14,
    },
    bioIconWrap: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: 'rgba(37,99,235,0.1)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    },
    bioIconEmoji: { fontSize: 26 },
    bioBtnTextWrap: { flex: 1 },
    bioBtnTitle: { fontSize: 14, fontWeight: '800', color: C.primary, letterSpacing: 0.2 },
    bioBtnSub: { fontSize: 10, color: C.textSub, marginTop: 2, fontWeight: '500' },
    bioBtnArrowWrap: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: 'rgba(37,99,235,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    bioBtnArrow: { fontSize: 16, color: C.primary, fontWeight: '800' },
    bioBtnText: { fontSize: 14, fontWeight: '700', color: C.primary, marginLeft: 8 },

    // Footer
    footer: { alignItems: 'center', paddingBottom: 24, gap: 4 },
    footerDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    divLine: { width: 30, height: 1, backgroundColor: C.textDim },
    divText: { fontSize: 10, color: C.textDim, fontWeight: '500' },
    footerTitle: { fontSize: 13, color: C.textSub, fontWeight: '700' },
    footerSub: { fontSize: 10, color: C.textDim },
    version: { fontSize: 10, color: C.textDim, marginTop: 4 },
});
