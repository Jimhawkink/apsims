/**
 * APSIMS Push Notification Service — v2.0 ULTRA
 * ─────────────────────────────────────────────────────────────────────────────
 * Channels (Android):
 *   apsims-urgent   → School announcements   — MAX importance, full vibration, loud
 *   apsims-chat     → Chat messages          — MAX importance, vibration, loud pop
 *   apsims-fees     → Fee alerts / M-Pesa    → HIGH, tri-vibration
 *   apsims-results  → Academic results        → HIGH, pulse vibration
 *   apsims-default  → Everything else         → HIGH, standard
 *
 * Call setupAllChannels() ONCE at app startup (before registerForPushNotifications)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/* ═══ Storage keys ═══ */
const PUSH_TOKEN_KEY   = 'apsims_push_token';
const NOTIF_PREFS_KEY  = 'apsims_notif_prefs';

/* ═══ Notification preferences ═══ */
export interface NotifPrefs {
    feeReminders:     boolean;
    newResults:       boolean;
    attendance:       boolean;
    announcements:    boolean;
    homework:         boolean;
    disciplineAlerts: boolean;
    chatMessages:     boolean;
}
export const DEFAULT_PREFS: NotifPrefs = {
    feeReminders:     true,
    newResults:       true,
    attendance:       true,
    announcements:    true,
    homework:         true,
    disciplineAlerts: false,
    chatMessages:     true,
};

/* ═══════════════════════════════════════════════════════════════════════════
   0.  FOREGROUND HANDLER — show banners even when app is open
═══════════════════════════════════════════════════════════════════════════ */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
        shouldShowBanner: true,    // iOS foreground banner
        shouldShowList:   true,
    }),
});

/* ═══════════════════════════════════════════════════════════════════════════
   1.  SETUP ALL ANDROID CHANNELS — call ONCE at app boot
═══════════════════════════════════════════════════════════════════════════ */
export async function setupAllChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    // 🔴 URGENT — School broadcast / emergency (LOUDEST)
    await Notifications.setNotificationChannelAsync('apsims-urgent', {
        name: '📢 School Announcements',
        description: 'Important school-wide announcements',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400, 200, 800],
        lightColor: '#dc2626',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // 💬 CHAT — Real-time messages (loud pop, strong vibration)
    await Notifications.setNotificationChannelAsync('apsims-chat', {
        name: '💬 Chat Messages',
        description: 'Real-time school chat messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 150, 100, 150],
        lightColor: '#6366f1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // 💳 FEES — M-Pesa, fee reminders (urgent, loud)
    await Notifications.setNotificationChannelAsync('apsims-fees', {
        name: '💳 Fee Alerts',
        description: 'Fee reminders and M-Pesa payment confirmations',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#dc2626',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // 📊 RESULTS — Academic marks published
    await Notifications.setNotificationChannelAsync('apsims-results', {
        name: '📊 Academic Results',
        description: 'Results, report cards, and academic updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: '#059669',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
    });

    // 🔔 DEFAULT — General notifications
    await Notifications.setNotificationChannelAsync('apsims-default', {
        name: '🔔 APSIMS Notifications',
        description: 'General school notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f46e5',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
    });

    console.log('✅ All 5 APSIMS notification channels registered (MAX importance)');
}

/* ═══════════════════════════════════════════════════════════════════════════
   2.  REGISTER DEVICE FOR PUSH NOTIFICATIONS
═══════════════════════════════════════════════════════════════════════════ */
export async function registerForPushNotifications(
    userId?: number,
    userRole?: string
): Promise<string | null> {
    try {
        if (!Device.isDevice) {
            console.warn('⚠️  Push notifications only work on physical devices');
            return null;
        }

        // Always setup channels first
        await setupAllChannels();

        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync({
                ios: { allowAlert: true, allowBadge: true, allowSound: true, allowCriticalAlerts: true },
            });
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.warn('❌ Push permission denied');
            return null;
        }

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined,
        });
        const token = tokenData.data;

        // Cache locally
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        // Save to Supabase
        if (userId) {
            await supabase.from('school_push_tokens').upsert({
                user_id:     userId,
                push_token:  token,
                platform:    Platform.OS,
                role:        userRole || 'unknown',
                device_name: Device.deviceName || 'Unknown Device',
                updated_at:  new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }

        console.log('✅ Push token registered:', token.slice(0, 30) + '…');
        return token;
    } catch (error) {
        console.error('Push registration error:', error);
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3.  SEND LOCAL NOTIFICATION (immediate, on-device)
═══════════════════════════════════════════════════════════════════════════ */
export async function sendLocalNotification({
    title, body, data = {}, channel = 'apsims-default', delay = 0,
}: {
    title:    string;
    body:     string;
    data?:    Record<string, any>;
    channel?: string;
    delay?:   number;
}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            ...(Platform.OS === 'android' ? { channelId: channel } : {}),
        },
        trigger: delay > 0
            ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delay, repeats: false }
            : null,
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   4.  PRE-BUILT NOTIFICATION TEMPLATES
═══════════════════════════════════════════════════════════════════════════ */

/** 💬 New chat message */
export async function notifyChatMessage(
    senderName: string,
    roomName: string,
    preview: string,
    roomId: number,
) {
    const prefs = await getNotifPrefs();
    if (!prefs.chatMessages) return;
    await sendLocalNotification({
        title: `💬 ${roomName}`,
        body:  `${senderName.split(' ')[0]}: ${preview.slice(0, 100)}`,
        data:  { type: 'chat_message', roomId },
        channel: 'apsims-chat',
    });
}

/** 📢 School announcement / broadcast */
export async function notifyAnnouncement(
    title: string,
    message: string,
    priority: 'high' | 'normal' = 'normal',
) {
    const prefs = await getNotifPrefs();
    if (!prefs.announcements) return;
    await sendLocalNotification({
        title:   priority === 'high' ? `🚨 URGENT: ${title}` : `📢 ${title}`,
        body:    message,
        data:    { type: 'announcement', priority },
        channel: priority === 'high' ? 'apsims-urgent' : 'apsims-default',
    });
}

/** 💳 Fee balance reminder */
export async function notifyFeeBalance(
    studentName: string,
    balance: number,
    dueDate?: string,
) {
    const prefs = await getNotifPrefs();
    if (!prefs.feeReminders) return;
    await sendLocalNotification({
        title: '💳 Fee Balance Reminder',
        body:  `${studentName} has KES ${balance.toLocaleString('en-KE')} outstanding${dueDate ? ` due ${dueDate}` : ''}. Pay via M-Pesa now.`,
        data:  { type: 'fee_reminder', balance },
        channel: 'apsims-fees',
    });
}

/** ✅ M-Pesa payment confirmed */
export async function notifyPaymentConfirmed(
    amount: number,
    mpesaRef: string,
    newBalance: number,
) {
    await sendLocalNotification({
        title: '✅ M-Pesa Payment Confirmed!',
        body:  `KES ${amount.toLocaleString('en-KE')} received. Ref: ${mpesaRef}. Balance: KES ${newBalance.toLocaleString('en-KE')}.`,
        data:  { type: 'payment_confirmed', amount, mpesaRef },
        channel: 'apsims-fees',
    });
}

/** 📲 STK push sent */
export async function notifySTKPushSent(amount: number, phone: string) {
    await sendLocalNotification({
        title: '📲 Check Your Phone Now!',
        body:  `Enter M-Pesa PIN to pay KES ${amount.toLocaleString('en-KE')} from ${phone}. Expires in 2 minutes.`,
        data:  { type: 'stk_push', amount },
        channel: 'apsims-fees',
        delay: 1,
    });
}

/** 📊 New results published */
export async function notifyNewResults(
    studentName: string,
    subject: string,
    score: number,
    grade: string,
) {
    const prefs = await getNotifPrefs();
    if (!prefs.newResults) return;
    await sendLocalNotification({
        title: '📊 New Results Published!',
        body:  `${studentName}: ${score}% (Grade ${grade}) in ${subject}. Tap to view report card.`,
        data:  { type: 'results', subject, score, grade },
        channel: 'apsims-results',
    });
}

/** 🎓 Term results ready */
export async function notifyTermResultsReady(
    termName: string,
    avgScore: number,
    position: number,
    total: number,
) {
    const prefs = await getNotifPrefs();
    if (!prefs.newResults) return;
    await sendLocalNotification({
        title: `🎓 ${termName} Results Ready!`,
        body:  `Average: ${avgScore.toFixed(1)}% | Position ${position} of ${total} students. Tap to view.`,
        data:  { type: 'term_results', termName, avgScore },
        channel: 'apsims-results',
    });
}

/** 📝 Homework reminder */
export async function notifyHomeworkReminder(
    subject: string,
    dueDate: string,
    teacherName?: string,
) {
    const prefs = await getNotifPrefs();
    if (!prefs.homework) return;
    await sendLocalNotification({
        title: '📝 Homework Due Soon!',
        body:  `${subject} due ${dueDate}${teacherName ? ` (${teacherName})` : ''}. Don't forget to submit!`,
        data:  { type: 'homework', subject, dueDate },
        channel: 'apsims-default',
    });
}

/** ⚠️ Absence recorded */
export async function notifyAbsence(
    studentName: string,
    date: string,
    period?: string,
) {
    const prefs = await getNotifPrefs();
    if (!prefs.attendance) return;
    await sendLocalNotification({
        title: '⚠️ Absence Recorded',
        body:  `${studentName} was absent${period ? ` during ${period}` : ''} on ${date}. Contact school if incorrect.`,
        data:  { type: 'attendance', date },
        channel: 'apsims-fees', // urgent channel
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   5.  NOTIFICATION PREFERENCES
═══════════════════════════════════════════════════════════════════════════ */
export async function getNotifPrefs(): Promise<NotifPrefs> {
    try {
        const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
    } catch {
        return DEFAULT_PREFS;
    }
}
export async function saveNotifPrefs(prefs: Partial<NotifPrefs>): Promise<void> {
    const current = await getNotifPrefs();
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   6.  NOTIFICATION LISTENERS (call in App.tsx)
═══════════════════════════════════════════════════════════════════════════ */
export function setupNotificationListeners(
    onNotification?: (notif: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void,
) {
    const receivedSub = Notifications.addNotificationReceivedListener(notif => {
        console.log('📩 Notification received:', notif.request.content.title);
        onNotification?.(notif);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as any;
        console.log('👆 Notification tapped:', data?.type);
        onResponse?.(response);
    });
    return () => { receivedSub.remove(); responseSub.remove(); };
}

/* ═══════════════════════════════════════════════════════════════════════════
   7.  BADGE MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */
export async function setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
}
export async function clearBadge() {
    await Notifications.setBadgeCountAsync(0);
}
export async function getPushToken(): Promise<string | null> {
    return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}
