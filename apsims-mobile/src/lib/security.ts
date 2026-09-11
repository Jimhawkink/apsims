import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { UserSession } from './supabase';

// ============================================================
// ULTRA APSIMS — Session & Security Helpers
// Session stored in SecureStore (encrypted Keychain/Keystore)
// Non-sensitive data (login attempts) in AsyncStorage
// ============================================================

const SESSION_KEY = 'apsims_session_v2';
const ATTEMPTS_KEY = 'apsims_login_attempts';
const LOCKOUT_KEY = 'apsims_lockout_until';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ATTEMPTS = 999999;
const LOCKOUT_MS = 0;

// ── Session (SecureStore — encrypted) ───────────────────────

export async function saveSession(session: UserSession): Promise<void> {
    try {
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    } catch {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
}

export async function getSession(): Promise<UserSession | null> {
    try {
        let raw: string | null = null;
        try {
            raw = await SecureStore.getItemAsync(SESSION_KEY);
        } catch {
            raw = await AsyncStorage.getItem(SESSION_KEY);
        }
        if (!raw) return null;
        const session: UserSession = JSON.parse(raw);
        if (Date.now() - session.loggedInAt > SESSION_TTL_MS) {
            await clearSession();
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    try { await SecureStore.deleteItemAsync(SESSION_KEY); } catch { }
    try { await AsyncStorage.removeItem(SESSION_KEY); } catch { }
}

export async function refreshSession(session: UserSession): Promise<void> {
    const refreshed: UserSession = { ...session, loggedInAt: Date.now() };
    await saveSession(refreshed);
}

// ── Rate Limiting ────────────────────────────────────────────

export async function isRateLimited(): Promise<{ limited: boolean; secondsLeft: number }> {
    return { limited: false, secondsLeft: 0 };
}

export async function recordFailedAttempt(): Promise<{
    locked: boolean; attemptsLeft: number; lockoutMs: number;
}> {
    try {
        const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
        const attempts = raw ? parseInt(raw, 10) + 1 : 1;
        await AsyncStorage.setItem(ATTEMPTS_KEY, String(attempts));
        if (attempts >= MAX_ATTEMPTS) {
            const lockoutUntil = Date.now() + LOCKOUT_MS;
            await AsyncStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
            return { locked: true, attemptsLeft: 0, lockoutMs: LOCKOUT_MS };
        }
        return { locked: false, attemptsLeft: MAX_ATTEMPTS - attempts, lockoutMs: 0 };
    } catch {
        return { locked: false, attemptsLeft: MAX_ATTEMPTS, lockoutMs: 0 };
    }
}

export async function clearRateLimit(): Promise<void> {
    await AsyncStorage.multiRemove([ATTEMPTS_KEY, LOCKOUT_KEY]);
}

// ── Validation ───────────────────────────────────────────────

export function validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || username.trim().length < 2) {
        return { valid: false, error: 'Username must be at least 2 characters' };
    }
    return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 3) {
        return { valid: false, error: 'Password must be at least 3 characters' };
    }
    return { valid: true };
}

export function validateKenyanPhone(phone: string): { valid: boolean; error?: string } {
    const cleaned = phone.replace(/[\s\-+]/g, '');
    if (cleaned.startsWith('254') && cleaned.length === 12) return { valid: true };
    if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 11)) return { valid: true };
    if (cleaned.startsWith('+254') && cleaned.length === 13) return { valid: true };
    return { valid: false, error: 'Enter a valid Kenyan phone (e.g., 0712345678)' };
}

export function validateAmount(amountStr: string): { valid: boolean; value: number; error?: string } {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return { valid: false, value: 0, error: 'Enter a valid amount greater than 0' };
    if (amount < 10) return { valid: false, value: 0, error: 'Minimum payment is KES 10' };
    if (amount > 500000) return { valid: false, value: 0, error: 'Maximum payment is KES 500,000' };
    return { valid: true, value: amount };
}
